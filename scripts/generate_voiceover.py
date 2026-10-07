import os
import asyncio
import shutil
import subprocess
import edge_tts
import imageio_ffmpeg

VOICES_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio', 'maya')
ALT_VOICES_DIR = os.path.join(os.path.dirname(__file__), '..', 'audio', 'maya')
DIST_VOICES_DIR = os.path.join(os.path.dirname(__file__), '..', 'dist', 'audio', 'maya')

for d in [VOICES_DIR, ALT_VOICES_DIR, DIST_VOICES_DIR]:
    os.makedirs(d, exist_ok=True)

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

# Cute, loving young wife voice: en-US-AvaNeural (Expressive, Caring, Pleasant, Friendly young woman)
VOICE_NAME = "en-US-AvaNeural"

# Pure, clean dialogue scripts (no XML tags)
VOICEOVER_SCRIPTS = {
    'intro': (
        "Hey... are you still staring at that glowing monitor, sweetheart? It's past midnight. "
        "Pack your warm jacket, okay? Tomorrow morning, we're taking the old winding highway up to the cliffs. "
        "Just you, me, and the sunrise."
    ),
    'shard0_red': (
        "Do you remember that thunderstorm when the lights went out? "
        "You were so stressed over lost code, and I lit seven little candles across the floor. "
        "You looked up, and you finally smiled... That was the exact moment I knew I loved you with all my heart."
    ),
    'shard1_orange': (
        "Look at the tall grass! Remember our camping trip by the lake, chasing fireflies in your bare feet? "
        "You whispered that you wished we could stay in that golden twilight forever... "
        "I'm still right here in the grass with you, my love."
    ),
    'shard2_yellow_1': (
        "Still stuck at work, babe? Hey, remember our deal: no tech talk once we hit the interstate! "
        "I bought those ridiculous sour peach gummies you pretend not to like. Hurry home, okay?"
    ),
    'shard2_yellow_2': (
        "I packed my old 35 millimeter camera for the cliff overlook. "
        "The weather radio says the sunset is going to paint the whole canyon in gold tonight. "
        "I can't wait to see it with you."
    ),
    'shard2_yellow_3': (
        "I love you so much. Don't drive too fast tonight, sweetheart. "
        "I'll see you at home soon... so much love."
    ),
    'shard3_green': (
        "Stop looking down at where the tires skidded, love. Look up at the stars with me. "
        "Remember lying on the hood of our beat-up car, picking out constellations that didn't exist? "
        "That's where I am now. Keep your eyes on the stars with me."
    ),
    'shard4_blue': (
        "Breathe with me, sweetheart. Deep breath in... and slow breath out. "
        "Just like that night at the hospital when the panic set in. "
        "I held your cold hands against my chest until your heartbeat matched mine. "
        "Be completely still right now. Let my peace wash over you."
    ),
    'shard5_indigo': (
        "It was never your fault. Please hear me, my love: the black ice... the steering locked. "
        "When the headlights blinded us, I held you close because you are my whole world. "
        "I chose to protect you. Forgive yourself, please. Live with joy for both of us."
    ),
    'shard6_violet': (
        "Do you remember our third date at the seaside carnival? "
        "You pointed at the carved wooden carousel and joked that one day we'd fly over the mountains on a unicorn. "
        "Well... look at him! He's waiting for you. Mount up, my brave adventurer!"
    ),
    'finale': (
        "You did it, my love. Look at the valley... all our colors have returned. "
        "I didn't save your life on that cliff road so you'd live in greyscale and grief. "
        "Chase fireflies again. Laugh until your chest hurts. Love this beautiful world. "
        "Whenever a rainbow breaks through the clouds, know that I am smiling. "
        "I love you forever. Now fly!"
    )
}

async def generate_audio():
    print(f"Generating Maya voiceovers with cute young wife voice ({VOICE_NAME})...")
    for key, text in VOICEOVER_SCRIPTS.items():
        raw_mp3 = os.path.join(VOICES_DIR, f"{key}_raw.mp3")
        final_mp3 = os.path.join(VOICES_DIR, f"{key}.mp3")
        
        # Pure clean text with gentle, tender, loving wife pacing and subtle sweet pitch
        comm = edge_tts.Communicate(text, voice=VOICE_NAME, rate="-4%", pitch="+1Hz")
        await comm.save(raw_mp3)
        
        # Warm, intimate studio vocal mastering:
        # - Highpass 80Hz (cleans sub-rumble)
        # - Natural chest body warmth boost at 190Hz (+1.8dB)
        # - Sweet presence clarity polish at 3300Hz (+1.0dB)
        # - Transparent optical leveling compression
        filter_str = (
            "highpass=f=80,"
            "bass=g=1.8:f=190,"
            "equalizer=f=3300:t=q:w=1.2:g=1.0,"
            "acompressor=threshold=-16dB:ratio=2.2:attack=10:release=110,"
            "volume=1.35"
        )
        cmd = [
            FFMPEG_EXE, "-y",
            "-i", raw_mp3,
            "-af", filter_str,
            "-b:a", "160k",
            final_mp3
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode == 0:
            if os.path.exists(raw_mp3):
                os.remove(raw_mp3)
            shutil.copyfile(final_mp3, os.path.join(ALT_VOICES_DIR, f"{key}.mp3"))
            shutil.copyfile(final_mp3, os.path.join(DIST_VOICES_DIR, f"{key}.mp3"))
            size = os.path.getsize(final_mp3)
            print(f"  [OK] Generated {key}.mp3 ({size} bytes, voice='{VOICE_NAME}')")
        else:
            print(f"  [Error] FFmpeg failed for {key}: {res.stderr.decode('utf-8', errors='ignore')}")

if __name__ == '__main__':
    asyncio.run(generate_audio())
