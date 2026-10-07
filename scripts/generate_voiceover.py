import os
import asyncio
import subprocess
import edge_tts
import imageio_ffmpeg

VOICES_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio', 'maya')
os.makedirs(VOICES_DIR, exist_ok=True)
FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

VOICEOVER_SCRIPTS = {
    'intro': (
        "Hey... are you still staring at that glowing monitor? It is past midnight. "
        "Pack your jacket, okay? Tomorrow morning, we are taking the old winding highway up to the cliffs. "
        "Just you, me, and the sunrise."
    ),
    'shard0_red': (
        "Do you remember that heavy thunderstorm when the lights cut out? "
        "You were so stressed over lost code, and I lit seven little candles across the floor. "
        "You looked up, and you finally laughed. That was the exact moment I knew I loved you."
    ),
    'shard1_orange': (
        "Look at the tall grass! Remember our camping trip by the lake where you chased fireflies in your bare feet? "
        "You whispered that you wished we could stay in that golden twilight forever. "
        "I am still here in the grass with you."
    ),
    'shard2_yellow_1': (
        "Still stuck at work? Hey, remember: no IT talk once we hit the interstate! "
        "I bought those ridiculous sour peach gummies you pretend not to like."
    ),
    'shard2_yellow_2': (
        "I packed my old 35 millimeter camera for the cliff overlook. "
        "The weather radio says the sunset is going to paint the whole canyon in gold."
    ),
    'shard2_yellow_3': (
        "I love you so much. Don't drive too fast tonight. See you at home, my love."
    ),
    'shard3_green': (
        "Stop looking down at where the tires skidded. Look up at the stars, love. "
        "Remember lying on the hood of our beat-up car, picking out constellations that didn't exist? "
        "That is where I am now. Keep your eyes on the stars with me."
    ),
    'shard4_blue': (
        "Breathe with me. Deep breath in... and slow breath out. "
        "Just like that night at the hospital when the panic set in. "
        "I held your cold hands against my chest until your heartbeat matched mine. "
        "Be completely still right now. Let the peace wash over you."
    ),
    'shard5_indigo': (
        "It was never your fault. Please hear me: the black ice... the steering locked. "
        "When the headlights blinded us, I threw myself over you because you are my whole world. "
        "I chose to protect you. Forgive yourself, please. Live for both of us."
    ),
    'shard6_violet': (
        "Do you remember our third date at the seaside carnival? "
        "You pointed at the carved wooden carousel and joked that one day we would fly over the mountains on a unicorn. "
        "Well... look at him! He is waiting for you. Mount up, my brave adventurer."
    ),
    'finale': (
        "You did it. Look at the valley... all our colors have returned. "
        "I didn't save your life on that cliff road so you would live in greyscale and grief. "
        "Chase fireflies again. Laugh with your friends. Love this beautiful world. "
        "Whenever a rainbow breaks through the rain, know that I am smiling. "
        "I love you forever. Now fly!"
    )
}

async def generate_audio():
    print("Generating Maya voiceovers with Edge TTS (en-US-AvaNeural)...")
    for key, text in VOICEOVER_SCRIPTS.items():
        raw_mp3 = os.path.join(VOICES_DIR, f"{key}_raw.mp3")
        final_mp3 = os.path.join(VOICES_DIR, f"{key}.mp3")
        
        # 1. Synthesize expressive neural voice
        comm = edge_tts.Communicate(text, voice="en-US-AvaNeural", rate="-5%", pitch="+1Hz")
        await comm.save(raw_mp3)
        
        # 2. Apply warm telephone/radio acoustic filter via FFmpeg:
        # Telephone bandpass EQ (highpass 350Hz, lowpass 3400Hz) + light compression + slight warmth
        filter_str = (
            "highpass=f=340,lowpass=f=3400,"
            "volume=1.45,"
            "acompressor=threshold=-14dB:ratio=3:attack=5:release=50"
        )
        cmd = [
            FFMPEG_EXE, "-y",
            "-i", raw_mp3,
            "-af", filter_str,
            "-b:a", "96k",
            final_mp3
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode == 0:
            print(f"  [OK] Generated {key}.mp3")
            if os.path.exists(raw_mp3):
                os.remove(raw_mp3)
        else:
            print(f"  [Error] FFmpeg failed for {key}: {res.stderr.decode('utf-8', errors='ignore')}")

if __name__ == '__main__':
    asyncio.run(generate_audio())
