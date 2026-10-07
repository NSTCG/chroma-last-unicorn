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

def apply_reverb(audio, decay=0.35, delay_ms=45):
    """Smooth multi-tap room acoustic reflection without metallic comb feedback"""
    if audio.ndim == 1:
        audio = np.column_stack([audio, audio])
    
    out = np.copy(audio)
    # Natural prime non-harmonic delays to prevent comb resonances
    taps_l = [(int(SR * 0.023), 0.22), (int(SR * 0.047), 0.15), (int(SR * 0.083), 0.09), (int(SR * 0.131), 0.05)]
    taps_r = [(int(SR * 0.029), 0.22), (int(SR * 0.053), 0.15), (int(SR * 0.089), 0.09), (int(SR * 0.137), 0.05)]
    
    for delay, gain in taps_l:
        if delay < len(audio):
            out[delay:, 0] += audio[:-delay, 0] * gain * decay
            
    for delay, gain in taps_r:
        if delay < len(audio):
            out[delay:, 1] += audio[:-delay, 1] * gain * decay
            
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
def warm_filter(audio, cutoff=2200):
    b, a = signal.butter(2, cutoff / (SR / 2), btype='low')
    if audio.ndim == 2:
        return np.column_stack([signal.lfilter(b, a, audio[:, 0]), signal.lfilter(b, a, audio[:, 1])])
    return signal.lfilter(b, a, audio)

def synth_note(freq, dur, type='rhodes', gain=0.35):
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    if type == 'rhodes':
        base = np.sin(2 * np.pi * freq * t) * np.exp(-t / (dur * 0.7))
        tine1 = np.sin(2 * np.pi * freq * 2.01 * t) * 0.22 * np.exp(-t / (dur * 0.4))
        trem = 1.0 + 0.08 * np.sin(2 * np.pi * 3.5 * t)
        return (base + tine1) * trem * gain
    elif type == 'acoustic':
        base = np.sin(2 * np.pi * freq * t) * np.exp(-t / (dur * 0.75))
        overtone = np.sin(2 * np.pi * freq * 2.0 * t) * 0.25 * np.exp(-t / (dur * 0.4))
        return (base + overtone) * gain * 0.8
    elif type == 'kalimba':
        base = np.sin(2 * np.pi * freq * t) * np.exp(-t / (dur * 0.55))
        overtone = np.sin(2 * np.pi * freq * 2.5 * t) * 0.25 * np.exp(-t / (dur * 0.2))
        return (base + overtone) * gain * 0.75
    elif type == 'pad':
        detune = [0.996, 1.0, 1.004]
        sig = np.zeros_like(t)
        env = np.sin(np.pi * (t / dur)) ** 1.8
        for d in detune:
            sig += np.sin(2 * np.pi * freq * d * t)
        return sig * env * gain * 0.65
    elif type == 'cello':
        vib = 1.0 + 0.008 * np.sin(2 * np.pi * 4.2 * t)
        env = (1 - np.exp(-t / 0.4)) * np.exp(-t / (dur * 0.9))
        sig = np.sin(2 * np.pi * freq * vib * t) + 0.22 * np.sin(2 * np.pi * freq * 2 * vib * t)
        return sig * env * gain * 0.65
    elif type == 'piano':
        base = np.sin(2 * np.pi * freq * t) * np.exp(-t / (dur * 0.75))
        h2 = np.sin(2 * np.pi * freq * 2.0 * t) * 0.28 * np.exp(-t / (dur * 0.45))
        h3 = np.sin(2 * np.pi * freq * 3.0 * t) * 0.1 * np.exp(-t / (dur * 0.25))
        h4 = np.sin(2 * np.pi * freq * 4.0 * t) * 0.04 * np.exp(-t / (dur * 0.15))
        hammer = np.random.randn(len(t)) * np.exp(-t / 0.005) * 0.05
        return (base + h2 + h3 + h4 + hammer) * gain * 0.85
    elif type == 'celesta':
        base = np.sin(2 * np.pi * freq * t) * np.exp(-t / (dur * 0.8))
        bell = np.sin(2 * np.pi * freq * 2.0 * t) * 0.2 * np.exp(-t / (dur * 0.35))
        return (base + bell) * gain * 0.65
    return np.sin(2 * np.pi * freq * t) * gain

def create_chord_progression(chords, bpm, note_type='pad', total_bars=4):
    """Render chord progression loop with smooth crossfade and warm mellow tone"""
    beat_dur = 60.0 / bpm
    bar_dur = beat_dur * 4
    total_dur = total_bars * bar_dur
    total_samples = int(SR * total_dur)
    mix = np.zeros(total_samples)
    
    for bar_idx, chord_notes in enumerate(chords):
        start_time = bar_idx * bar_dur
        start_idx = int(start_time * SR)
        for f in chord_notes:
            n = synth_note(f, bar_dur * 1.15, type=note_type, gain=0.22)
            end_idx = min(start_idx + len(n), total_samples)
            mix[start_idx:end_idx] += n[:end_idx - start_idx]
            
    # Apply reverb and warm lowpass filter to remove harshness
    stereo = apply_reverb(mix, decay=0.38, delay_ms=55)
    stereo = warm_filter(stereo, cutoff=2200)
    
    # Seamless loop crossfade
    fade_len = int(SR * 1.2)
    stereo[:fade_len] = stereo[:fade_len] * np.linspace(0, 1, fade_len)[:, None] + stereo[-fade_len:] * np.linspace(1, 0, fade_len)[:, None]
    return normalize(stereo, 0.65)

# Mood 0: Intro (Terminal / Rain & Midnight) - Melancholic Dm9 -> G13 -> Cmaj7 -> Am7
def make_intro_bgm():
    chords = [
        [146.8, 220.0, 261.6, 329.6],
        [196.0, 246.9, 329.6],
        [130.8, 196.0, 246.9, 329.6],
        [110.0, 164.8, 220.0]
    ]
    return create_chord_progression(chords, bpm=60, note_type='rhodes', total_bars=4)

# Mood 1: Red Shard (The Thunderstorm & Candles) - Warm C -> G/B -> Am -> Fmaj7
def make_red_bgm():
    chords = [
        [130.8, 196.0, 261.6],
        [123.5, 196.0, 246.9],
        [110.0, 164.8, 220.0],
        [174.6, 220.0, 261.6]
    ]
    return create_chord_progression(chords, bpm=66, note_type='acoustic', total_bars=4)

# Mood 2: Orange Shard (Firefly Meadow) - Sunlit Kalimba D -> G -> A -> Bm
def make_orange_bgm():
    chords = [
        [293.7, 369.9, 440.0],
        [196.0, 293.7, 392.0],
        [220.0, 277.2, 440.0],
        [246.9, 293.7, 369.9]
    ]
    return create_chord_progression(chords, bpm=72, note_type='kalimba', total_bars=4)

# Mood 3: Yellow Shard (Voicemail Road Trip) - Bittersweet indie F -> C -> Dm -> Bb
def make_yellow_bgm():
    chords = [
        [174.6, 220.0, 261.6],
        [130.8, 196.0, 261.6],
        [146.8, 220.0, 261.6],
        [116.5, 174.6, 233.1]
    ]
    return create_chord_progression(chords, bpm=64, note_type='acoustic', total_bars=4)

# Mood 4: Green Shard (Celestial Sky & Stargazing) - Cosmic Em7 -> Cmaj7 -> G -> D
def make_green_bgm():
    chords = [
        [164.8, 196.0, 246.9, 329.6],
        [130.8, 196.0, 246.9, 329.6],
        [196.0, 246.9, 293.7, 392.0],
        [146.8, 220.0, 293.7]
    ]
    return create_chord_progression(chords, bpm=56, note_type='pad', total_bars=4)

# Mood 5: Blue Shard (Breathe & Hospital Peace) - Deep meditative Ab -> Eb -> Fm -> Db
def make_blue_bgm():
    chords = [
        [103.8, 155.6, 207.7],
        [155.6, 233.1, 311.1],
        [87.3, 130.8, 174.6],
        [138.6, 207.7, 277.2]
    ]
    return create_chord_progression(chords, bpm=50, note_type='pad', total_bars=4)

# Mood 6: Indigo Shard (The Cliff Road & Catharsis) - Warm, Emotional Acoustic Piano (Bm -> G -> D -> A)
def make_indigo_bgm():
    chords = [
        [123.5, 146.8, 185.0, 220.0],  # Bm7
        [98.0, 146.8, 196.0, 246.9],   # Gmaj7
        [146.8, 185.0, 220.0, 293.7],  # D
        [110.0, 164.8, 220.0, 277.2]   # A
    ]
    return create_chord_progression(chords, bpm=60, note_type='piano', total_bars=4)

# Mood 7: Violet Shard (3rd Date Carousel & Unicorn) - Gentle Warm Music Box Waltz
def make_violet_bgm():
    chords = [
        [233.1, 293.7, 349.2],
        [155.6, 233.1, 311.1],
        [174.6, 220.0, 261.6],
        [196.0, 233.1, 293.7]
    ]
    return create_chord_progression(chords, bpm=68, note_type='celesta', total_bars=4)

# Finale: Awakened Rainbow Valley - Soothing, Emotional Acoustic Grand Piano & Warm Pad
def make_finale_bgm():
    bpm = 66
    beat_dur = 60.0 / bpm
    bar_dur = beat_dur * 4
    total_bars = 8
    total_dur = total_bars * bar_dur
    total_samples = int(SR * total_dur)
    mix = np.zeros(total_samples)

    chords = [
        [130.8, 196.0, 246.9, 261.6, 329.6],  # Cmaj7
        [123.5, 196.0, 246.9, 293.7, 392.0],  # G/B
        [110.0, 164.8, 220.0, 261.6, 329.6],  # Am7
        [98.0, 164.8, 196.0, 246.9, 329.6],   # Em/G
        [87.3, 174.6, 220.0, 261.6, 329.6],   # Fmaj7
        [82.4, 164.8, 196.0, 261.6, 329.6],   # C/E
        [146.8, 174.6, 220.0, 261.6, 349.2],  # Dm7 -> G
        [130.8, 196.0, 246.9, 261.6, 523.2]   # Cmaj7
    ]

    # 1. Warm Acoustic Piano Chords
    for bar_idx, chord_notes in enumerate(chords):
        start_time = bar_idx * bar_dur
        start_idx = int(start_time * SR)
        for f in chord_notes:
            n = synth_note(f, bar_dur * 1.05, type='piano', gain=0.22)
            end_idx = min(start_idx + len(n), total_samples)
            mix[start_idx:end_idx] += n[:end_idx - start_idx]

    # 2. Warm Sustained Background Pad
    for bar_idx, chord_notes in enumerate(chords):
        start_time = bar_idx * bar_dur
        start_idx = int(start_time * SR)
        for f in chord_notes[1:4]:
            t_pad = np.linspace(0, bar_dur * 1.15, int(SR * bar_dur * 1.15), endpoint=False)
            pad_sig = (np.sin(2 * np.pi * f * t_pad) + 0.2 * np.sin(2 * np.pi * 2 * f * t_pad)) * np.sin(np.pi * (t_pad / (bar_dur * 1.15))) * 0.08
            end_idx = min(start_idx + len(pad_sig), total_samples)
            mix[start_idx:end_idx] += pad_sig[:end_idx - start_idx]

    # 3. Soothing, Emotional Piano Melody
    melody = [
        (0.0 * bar_dur, 659.3, 1.8 * beat_dur),  # E5
        (0.5 * bar_dur, 784.0, 1.8 * beat_dur),  # G5
        (1.0 * bar_dur, 880.0, 2.0 * beat_dur),  # A5
        (1.5 * bar_dur, 987.8, 1.8 * beat_dur),  # B5
        (2.0 * bar_dur, 1046.5, 3.0 * beat_dur), # C6
        (3.0 * bar_dur, 987.8, 1.8 * beat_dur),  # B5
        (3.5 * bar_dur, 784.0, 1.8 * beat_dur),  # G5
        (4.0 * bar_dur, 659.3, 2.2 * beat_dur),  # E5
        (4.5 * bar_dur, 784.0, 1.8 * beat_dur),  # G5
        (5.0 * bar_dur, 880.0, 2.2 * beat_dur),  # A5
        (6.0 * bar_dur, 784.0, 1.8 * beat_dur),  # G5
        (6.5 * bar_dur, 587.3, 1.8 * beat_dur),  # D5
        (7.0 * bar_dur, 523.2, 3.5 * beat_dur)   # C5
    ]
    for m_time, m_freq, m_dur in melody:
        n = synth_note(m_freq, m_dur, type='piano', gain=0.24)
        s_idx = int(m_time * SR)
        e_idx = min(s_idx + len(n), total_samples)
        if s_idx < total_samples:
            mix[s_idx:e_idx] += n[:e_idx - s_idx]

    stereo = apply_reverb(mix, decay=0.32, delay_ms=45)
    stereo = warm_filter(stereo, cutoff=2600)

    fade_len = int(SR * 1.5)
    fade_in = np.linspace(0, 1, fade_len)[:, None]
    fade_out = np.linspace(1, 0, fade_len)[:, None]
    stereo[:fade_len] = stereo[:fade_len] * fade_in + stereo[-fade_len:] * fade_out
    return normalize(stereo, 0.68)

def main():
    print("Generating Normal & Soothing Mood Soundtracks...")
    music_items = {
        'bgm_level5_indigo': make_indigo_bgm,
        'bgm_finale': make_finale_bgm
    }

    import shutil
    alt_music_dir = os.path.join(os.path.dirname(__file__), '..', 'audio', 'music')
    os.makedirs(alt_music_dir, exist_ok=True)

    for name, func in music_items.items():
        audio = func()
        wav_path = os.path.join(MUSIC_DIR, f"{name}.wav")
        mp3_path = os.path.join(MUSIC_DIR, f"{name}.mp3")
        wavfile.write(wav_path, SR, (audio * 32767).astype(np.int16))
        to_mp3(wav_path, mp3_path, bitrate="128k")
        alt_mp3_path = os.path.join(alt_music_dir, f"{name}.mp3")
        shutil.copyfile(mp3_path, alt_mp3_path)
        print(f"  [BGM OK] {name}.mp3 (both dirs)")

if __name__ == '__main__':
    main()
