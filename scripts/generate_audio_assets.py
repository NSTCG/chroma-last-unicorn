import os
import math
import subprocess
import numpy as np
import scipy.io.wavfile as wavfile
import scipy.signal as signal
import imageio_ffmpeg

SR = 44100
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

SFX_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio', 'sfx')
MUSIC_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio', 'music')
os.makedirs(SFX_DIR, exist_ok=True)
os.makedirs(MUSIC_DIR, exist_ok=True)

def to_mp3(wav_path, mp3_path, bitrate="128k"):
    cmd = [FFMPEG, "-y", "-i", wav_path, "-b:a", bitrate, mp3_path]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    if os.path.exists(wav_path):
        os.remove(wav_path)

def normalize(audio, peak=0.92):
    m = np.max(np.abs(audio))
    if m > 1e-6:
        return (audio / m) * peak
    return audio

def apply_reverb(audio, decay=0.45, delay_ms=45):
    """Simple stereo feedback comb/allpass reverb for ambient depth"""
    delay_samples = int(SR * (delay_ms / 1000.0))
    out = np.zeros_like(audio)
    if audio.ndim == 1:
        audio = np.column_stack([audio, audio])
        out = np.zeros_like(audio)
    
    # Left and right slightly decorrelated delays
    dl = delay_samples
    dr = int(delay_samples * 1.33)
    
    # Simple comb filter
    out[:, 0] = audio[:, 0]
    out[:, 1] = audio[:, 1]
    for i in range(dl, len(audio)):
        out[i, 0] += out[i - dl, 0] * decay
    for i in range(dr, len(audio)):
        out[i, 1] += out[i - dr, 1] * (decay * 0.9)
    return normalize(out)

# ─────────────────────────────────────────────────────────────
# 1. SFX GENERATION
# ─────────────────────────────────────────────────────────────

def generate_wind():
    """Ambient looping atmospheric wind with gentle gusting and warmth"""
    dur = 12.0
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    # Generate pink/brownian noise
    white = np.random.randn(len(t))
    b, a = signal.butter(1, 400 / (SR / 2), btype='low')
    pink = signal.lfilter(b, a, white)
    
    # Modulate wind gusts with slow LFOs
    lfo1 = 0.5 + 0.5 * np.sin(2 * np.pi * 0.18 * t)
    lfo2 = 0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * t + 1.2)
    gust = (lfo1 * 0.6 + lfo2 * 0.4) ** 1.8
    
    # Whistling breeze layer
    whistle_freq = 600 + 350 * np.sin(2 * np.pi * 0.25 * t)
    whistle = np.sin(2 * np.pi * whistle_freq * t) * (gust * 0.15)
    
    audio_l = pink * (0.35 + 0.65 * gust) + whistle
    # Stereo phase offset
    audio_r = np.roll(audio_l, int(SR * 0.035))
    
    stereo = np.column_stack([audio_l, audio_r])
    # Smooth loop crossfade (first/last 1.0s)
    fade_len = int(SR * 1.0)
    fade_in = np.linspace(0, 1, fade_len)
    fade_out = np.linspace(1, 0, fade_len)
    stereo[:fade_len] = stereo[:fade_len] * fade_in[:, None] + stereo[-fade_len:] * fade_out[:, None]
    
    return normalize(stereo, 0.85)

def generate_grass_woosh():
    """Organic gust of wind wooshing through tall dense meadow grass"""
    dur = 1.4
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    noise = np.random.randn(len(t))
    
    # Bandpass filter around 1200Hz - 4200Hz for crisp blade rustling
    sos = signal.butter(4, [1000 / (SR / 2), 4500 / (SR / 2)], btype='bandpass', output='sos')
    filtered = signal.sosfilt(sos, noise)
    
    # Swell envelope (smooth bell curve)
    env = np.sin(np.pi * (t / dur)) ** 2.2
    
    # Low-end air displacement
    sub_sos = signal.butter(2, [80 / (SR / 2), 320 / (SR / 2)], btype='bandpass', output='sos')
    sub = signal.sosfilt(sub_sos, noise) * 0.45
    
    mono = (filtered * 1.0 + sub) * env
    stereo = np.column_stack([mono, np.roll(mono, int(SR * 0.015))])
    return normalize(stereo, 0.88)

def generate_brush_grass():
    """Soft vegetation brushing sound as player wades through blades"""
    dur = 0.28
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    noise = np.random.randn(len(t))
    
    # Crisp high frequency leafy rustle (2kHz - 7kHz)
    sos = signal.butter(3, [1800 / (SR / 2), 7000 / (SR / 2)], btype='bandpass', output='sos')
    leaf = signal.sosfilt(sos, noise)
    
    # Fast attack, smooth decay envelope with micro-transients
    env = (t / 0.03) * np.exp(-t / 0.06)
    # Add random blade clicks
    clicks = np.zeros_like(t)
    for _ in range(8):
        pos = int(np.random.rand() * len(t) * 0.7)
        clicks[pos:pos+120] += np.random.randn(min(120, len(t)-pos)) * 0.5
    
    mono = (leaf + clicks) * env
    stereo = np.column_stack([mono, np.roll(mono, int(SR * 0.008))])
    return normalize(stereo, 0.75)

def generate_footstep_grass():
    """Soft damp earth thud + grass compression"""
    dur = 0.32
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    
    # 1. Earth thump: decaying low pitch sine 110Hz -> 45Hz
    pitch_env = 110 * np.exp(-t / 0.04) + 45
    phase = np.cumsum(2 * np.pi * pitch_env / SR)
    thud = np.sin(phase) * np.exp(-t / 0.055) * 0.75
    
    # 2. Blade crush: bandpassed noise (1500Hz - 5000Hz)
    noise = np.random.randn(len(t))
    sos = signal.butter(3, [1400 / (SR / 2), 5200 / (SR / 2)], btype='bandpass', output='sos')
    crush = signal.sosfilt(sos, noise) * np.exp(-t / 0.07) * 0.45
    
    mono = thud + crush
    stereo = np.column_stack([mono, np.roll(mono, int(SR * 0.005))])
    return normalize(stereo, 0.88)

def generate_footstep_rock():
    """Solid stone boot impact with crisp grit and stone body resonance"""
    dur = 0.26
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    
    # 1. Hard stone transient click (2500Hz - 9000Hz)
    noise = np.random.randn(len(t))
    sos_click = signal.butter(4, [2500 / (SR / 2), 9500 / (SR / 2)], btype='bandpass', output='sos')
    click = signal.sosfilt(sos_click, noise) * np.exp(-t / 0.015) * 0.85
    
    # 2. Stone resonant ring (340Hz & 580Hz)
    body = (np.sin(2 * np.pi * 340 * t) * 0.6 + np.sin(2 * np.pi * 580 * t) * 0.4) * np.exp(-t / 0.04) * 0.5
    
    # 3. Fine gravel scatter
    grit = signal.sosfilt(sos_click, noise) * np.exp(-t / 0.065) * 0.3
    
    mono = click + body + grit
    stereo = np.column_stack([mono, np.roll(mono, int(SR * 0.004))])
    return normalize(stereo, 0.90)

def generate_unicorn_gallop():
    """Authentic rhythmic four-beat equine gallop on soft turf with heavy hoof impact"""
    dur = 0.52
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    mono = np.zeros_like(t)
    
    # 4 hoof strikes in gallop cadence: [0.0s, 0.06s, 0.14s, 0.22s]
    beats = [0.0, 0.065, 0.145, 0.225]
    weights = [0.75, 0.82, 0.95, 1.0] # Lead foot has highest impact
    
    for b_time, weight in zip(beats, weights):
        start_idx = int(b_time * SR)
        b_len = min(int(0.18 * SR), len(mono) - start_idx)
        if b_len <= 0: continue
        bt = np.linspace(0, 0.18, b_len, endpoint=False)
        
        # Hollow hoof 'clop' resonance (680Hz & 1350Hz)
        clop = (np.sin(2 * np.pi * 680 * bt) * 0.6 + np.sin(2 * np.pi * 1350 * bt) * 0.4) * np.exp(-bt / 0.025)
        # Deep ground turf thud (75Hz)
        thud = np.sin(2 * np.pi * 75 * bt) * np.exp(-bt / 0.045) * 0.85
        # Turf spray noise
        n = np.random.randn(b_len) * np.exp(-bt / 0.035) * 0.3
        
        mono[start_idx:start_idx+b_len] += (clop + thud + n) * weight
    
    stereo = np.column_stack([mono, np.roll(mono, int(SR * 0.006))])
    return normalize(stereo, 0.92)

# ─────────────────────────────────────────────────────────────
# 2. UNIQUE MOOD SOUNDTRACK GENERATION (SYNTHESIS ENGINE)
# ─────────────────────────────────────────────────────────────

def synth_note(freq, dur, type='rhodes', gain=0.5):
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    if type == 'rhodes':
        # Fundamental + gentle tines overtones + soft tremolo
        base = np.sin(2 * np.pi * freq * t) * np.exp(-t / (dur * 0.7))
        tine1 = np.sin(2 * np.pi * freq * 2.01 * t) * 0.35 * np.exp(-t / (dur * 0.4))
        tine2 = np.sin(2 * np.pi * freq * 3.02 * t) * 0.15 * np.exp(-t / (dur * 0.2))
        tine3 = np.sin(2 * np.pi * freq * 4.04 * t) * 0.08 * np.exp(-t / (dur * 0.1))
        trem = 1.0 + 0.12 * np.sin(2 * np.pi * 4.5 * t)
        return (base + tine1 + tine2 + tine3) * trem * gain
    elif type == 'acoustic':
        # Plucked acoustic guitar string simulation
        harmonics = [1.0, 0.55, 0.32, 0.18, 0.1, 0.05]
        sig = np.zeros_like(t)
        for i, h in enumerate(harmonics, 1):
            decay = dur * (0.8 / (i ** 0.6))
            sig += np.sin(2 * np.pi * freq * i * t) * h * np.exp(-t / decay)
        return sig * gain
    elif type == 'kalimba':
        # Marimba/kalimba wooden bell
        base = np.sin(2 * np.pi * freq * t) * np.exp(-t / (dur * 0.5))
        overtone = np.sin(2 * np.pi * freq * 3.14 * t) * 0.45 * np.exp(-t / (dur * 0.15))
        click = np.random.randn(len(t)) * np.exp(-t / 0.008) * 0.25
        return (base + overtone + click) * gain
    elif type == 'pad':
        # Lush detuned pad
        detune = [0.994, 1.0, 1.006]
        sig = np.zeros_like(t)
        # Slow attack and release envelope
        env = np.sin(np.pi * (t / dur)) ** 1.5
        for d in detune:
            sig += (np.sin(2 * np.pi * freq * d * t) + 0.3 * np.sin(2 * np.pi * freq * 2 * d * t))
        return sig * env * gain
    elif type == 'cello':
        # Warm bowing cello with vibrato
        vib = 1.0 + 0.015 * np.sin(2 * np.pi * 5.2 * t)
        env = (1 - np.exp(-t / 0.2)) * np.exp(-t / (dur * 0.95))
        sig = np.sin(2 * np.pi * freq * vib * t) + 0.4 * np.sin(2 * np.pi * freq * 2 * vib * t) + 0.2 * np.sin(2 * np.pi * freq * 3 * vib * t)
        return sig * env * gain
    elif type == 'celesta':
        # Music box / chime bell
        base = np.sin(2 * np.pi * freq * t) * np.exp(-t / (dur * 0.6))
        bell = np.sin(2 * np.pi * freq * 4.0 * t) * 0.5 * np.exp(-t / (dur * 0.25))
        sparkle = np.sin(2 * np.pi * freq * 8.0 * t) * 0.2 * np.exp(-t / (dur * 0.1))
        return (base + bell + sparkle) * gain
    return np.sin(2 * np.pi * freq * t) * gain

def create_chord_progression(chords, bpm, note_type='pad', total_bars=4):
    """Render chord progression loop with smooth crossfade"""
    beat_dur = 60.0 / bpm
    bar_dur = beat_dur * 4
    total_dur = total_bars * bar_dur
    total_samples = int(SR * total_dur)
    mix = np.zeros(total_samples)
    
    for bar_idx, chord_notes in enumerate(chords):
        start_time = bar_idx * bar_dur
        start_idx = int(start_time * SR)
        for f in chord_notes:
            n = synth_note(f, bar_dur * 1.15, type=note_type, gain=0.28)
            end_idx = min(start_idx + len(n), total_samples)
            mix[start_idx:end_idx] += n[:end_idx - start_idx]
            
    # Apply reverb for lush spacious atmosphere
    stereo = apply_reverb(mix, decay=0.45, delay_ms=50)
    # Seamless loop crossfade
    fade_len = int(SR * 1.2)
    stereo[:fade_len] = stereo[:fade_len] * np.linspace(0, 1, fade_len)[:, None] + stereo[-fade_len:] * np.linspace(1, 0, fade_len)[:, None]
    return normalize(stereo, 0.88)

# Mood 0: Intro (Terminal / Rain & Midnight) - Melancholic Dm9 -> G13 -> Cmaj7 -> Am7
def make_intro_bgm():
    chords = [
        [146.8, 220.0, 261.6, 329.6], # Dm9
        [196.0, 246.9, 329.6, 392.0], # G13
        [130.8, 196.0, 246.9, 329.6], # Cmaj7
        [110.0, 164.8, 220.0, 261.6]  # Am7
    ]
    return create_chord_progression(chords, bpm=68, note_type='rhodes', total_bars=4)

# Mood 1: Red Shard (The Thunderstorm & Candles) - Warm C -> G/B -> Am -> Fmaj7
def make_red_bgm():
    chords = [
        [130.8, 196.0, 261.6, 329.6], # C
        [123.5, 196.0, 246.9, 293.7], # G/B
        [110.0, 164.8, 220.0, 261.6], # Am
        [174.6, 220.0, 261.6, 349.2]  # Fmaj7
    ]
    return create_chord_progression(chords, bpm=74, note_type='acoustic', total_bars=4)

# Mood 2: Orange Shard (Firefly Meadow) - Sunlit Kalimba D -> G -> A -> Bm
def make_orange_bgm():
    chords = [
        [293.7, 369.9, 440.0, 587.3], # D
        [196.0, 293.7, 392.0, 493.9], # G
        [220.0, 277.2, 440.0, 554.4], # A
        [246.9, 293.7, 369.9, 440.0]  # Bm
    ]
    return create_chord_progression(chords, bpm=82, note_type='kalimba', total_bars=4)

# Mood 3: Yellow Shard (Voicemail Road Trip) - Bittersweet indie F -> C -> Dm -> Bb
def make_yellow_bgm():
    chords = [
        [174.6, 220.0, 261.6, 349.2], # F
        [130.8, 196.0, 261.6, 329.6], # C
        [146.8, 220.0, 261.6, 293.7], # Dm
        [116.5, 174.6, 233.1, 293.7]  # Bb
    ]
    return create_chord_progression(chords, bpm=78, note_type='acoustic', total_bars=4)

# Mood 4: Green Shard (Celestial Sky & Stargazing) - Cosmic Em7 -> Cmaj7 -> G -> D
def make_green_bgm():
    chords = [
        [164.8, 196.0, 246.9, 329.6, 493.9], # Em7
        [130.8, 196.0, 246.9, 329.6, 523.3], # Cmaj7
        [196.0, 246.9, 293.7, 392.0, 587.3], # G
        [146.8, 220.0, 293.7, 369.9, 440.0]  # D
    ]
    return create_chord_progression(chords, bpm=62, note_type='pad', total_bars=4)

# Mood 5: Blue Shard (Breathe & Hospital Peace) - Deep meditative Ab -> Eb -> Fm -> Db
def make_blue_bgm():
    chords = [
        [103.8, 155.6, 207.7, 261.6], # Ab
        [155.6, 233.1, 311.1, 392.0], # Eb
        [87.3, 130.8, 174.6, 207.7],  # Fm
        [138.6, 207.7, 277.2, 349.2]  # Db
    ]
    return create_chord_progression(chords, bpm=56, note_type='pad', total_bars=4)

# Mood 6: Indigo Shard (The Cliff Road & Catharsis) - Emotional Cello Bm -> G -> D -> A
def make_indigo_bgm():
    chords = [
        [123.5, 185.0, 220.0, 293.7], # Bm
        [98.0, 146.8, 196.0, 246.9],  # G
        [146.8, 220.0, 293.7, 369.9], # D
        [110.0, 164.8, 220.0, 277.2]  # A
    ]
    return create_chord_progression(chords, bpm=66, note_type='cello', total_bars=4)

# Mood 7: Violet Shard (3rd Date Carousel & Unicorn) - Magical Celesta Waltz Bb -> Eb -> F -> Gm
def make_violet_bgm():
    chords = [
        [233.1, 293.7, 349.2, 466.2], # Bb
        [155.6, 233.1, 311.1, 392.0], # Eb
        [174.6, 220.0, 261.6, 349.2], # F
        [196.0, 233.1, 293.7, 392.0]  # Gm
    ]
    return create_chord_progression(chords, bpm=88, note_type='celesta', total_bars=4)

# Finale: Awakened Rainbow Valley - Majestic Triumphant C -> F -> G -> C
def make_finale_bgm():
    chords = [
        [130.8, 196.0, 261.6, 329.6, 523.3], # C
        [174.6, 220.0, 261.6, 349.2, 523.3], # F
        [196.0, 246.9, 293.7, 392.0, 587.3], # G
        [130.8, 261.6, 329.6, 392.0, 523.3]  # C
    ]
    return create_chord_progression(chords, bpm=92, note_type='pad', total_bars=4)

def main():
    print("Generating Realistic Audio Effects...")
    sfx_items = {
        'wind': generate_wind,
        'grass_woosh': generate_grass_woosh,
        'brush_grass': generate_brush_grass,
        'footstep_grass': generate_footstep_grass,
        'footstep_rock': generate_footstep_rock,
        'unicorn_gallop': generate_unicorn_gallop
    }
    
    for name, func in sfx_items.items():
        audio = func()
        wav_path = os.path.join(SFX_DIR, f"{name}.wav")
        mp3_path = os.path.join(SFX_DIR, f"{name}.mp3")
        wavfile.write(wav_path, SR, (audio * 32767).astype(np.int16))
        to_mp3(wav_path, mp3_path, bitrate="96k")
        print(f"  [SFX OK] {name}.mp3")

    print("\nGenerating Unique Level Mood Soundtracks...")
    music_items = {
        'bgm_intro': make_intro_bgm,
        'bgm_level0_red': make_red_bgm,
        'bgm_level1_orange': make_orange_bgm,
        'bgm_level2_yellow': make_yellow_bgm,
        'bgm_level3_green': make_green_bgm,
        'bgm_level4_blue': make_blue_bgm,
        'bgm_level5_indigo': make_indigo_bgm,
        'bgm_level6_violet': make_violet_bgm,
        'bgm_finale': make_finale_bgm
    }

    for name, func in music_items.items():
        audio = func()
        wav_path = os.path.join(MUSIC_DIR, f"{name}.wav")
        mp3_path = os.path.join(MUSIC_DIR, f"{name}.mp3")
        wavfile.write(wav_path, SR, (audio * 32767).astype(np.int16))
        to_mp3(wav_path, mp3_path, bitrate="128k")
        print(f"  [BGM OK] {name}.mp3")

if __name__ == '__main__':
    main()
