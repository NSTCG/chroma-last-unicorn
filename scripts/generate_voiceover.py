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

# Emotional, compassionate, and loving memories spoken by Maya
VOICEOVER_SCRIPTS = {
    'intro': {
        'style': 'affectionate',
        'rate': '-5%',
        'text': (
            "Hey... are you still staring at that glowing monitor, sweetheart? It's way past midnight. "
            "Pack your warm jacket, okay? Tomorrow morning, we're taking the old winding highway up to the cliffs. "
            "Just you, me, and the sunrise."
        )
    },
    'shard0_red': {
        'style': 'affectionate',
        'rate': '-5%',
        'text': (
            "Do you remember that thunderstorm when the lights went out? "
            "You were so stressed over lost code, and I lit seven little candles across the floor. "
            "You looked up, and you finally smiled... That was the exact moment I knew I loved you with all my heart."
        )
    },
    'shard1_orange': {
        'style': 'hopeful',
        'rate': '-4%',
        'text': (
            "Look at the tall grass! Remember our camping trip by the lake, chasing fireflies in your bare feet? "
            "You whispered that you wished we could stay in that golden twilight forever... "
            "I'm still right here with you, my love."
        )
    },
    'shard2_yellow_1': {
        'style': 'affectionate',
        'rate': '-4%',
        'text': (
            "Still stuck at work, babe? Hey, remember our deal: no tech talk once we hit the interstate! "
            "I bought those ridiculous sour peach gummies you pretend not to like. Hurry home, okay?"
        )
    },
    'shard2_yellow_2': {
        'style': 'affectionate',
        'rate': '-4%',
        'text': (
            "I packed my old 35 millimeter camera for the cliff overlook. "
            "The weather radio says the sunset is going to paint the whole canyon in gold tonight. "
            "I can't wait to see it with you."
        )
    },
    'shard2_yellow_3': {
        'style': 'gentle',
        'rate': '-6%',
        'text': (
            "I love you so much. Don't drive too fast tonight, sweetheart. "
            "I'll see you at home soon... so much love."
        )
    },
    'shard3_green': {
        'style': 'gentle',
        'rate': '-5%',
        'text': (
            "Stop looking down at where the tires skidded, love. Look up at the stars with me. "
            "Remember lying on the hood of our beat-up car, picking out constellations that didn't exist? "
            "That's where I am now. Keep your eyes on the stars with me."
        )
    },
    'shard4_blue': {
        'style': 'calm',
        'rate': '-7%',
        'text': (
            "Breathe with me, sweetheart. Deep breath in... and slow breath out. "
            "Just like that night at the hospital when the panic set in. "
            "I held your cold hands against my chest until your heartbeat matched mine. "
            "Be completely still right now. Let my peace wash over you."
        )
    },
    'shard5_indigo': {
        'style': 'gentle',
        'rate': '-6%',
        'text': (
            "It was never your fault. Please hear me, my love: the black ice... the steering locked. "
            "When the headlights blinded us, I held you close because you are my whole world. "
            "I chose to protect you. Forgive yourself, please. Live with joy for both of us."
        )
    },
    'shard6_violet': {
        'style': 'affectionate',
        'rate': '-4%',
        'text': (
            "Do you remember our third date at the seaside carnival? "
            "You pointed at the carved wooden carousel and joked that one day we'd fly over the mountains on a unicorn. "
            "Well... look at him! He's waiting for you. Mount up, my brave adventurer."
        )
    },
    'finale': {
        'style': 'hopeful',
        'rate': '-4%',
        'text': (
            "You did it, my love. Look at the valley... all our colors have returned. "
            "I didn't save your life on that cliff road so you'd live in greyscale and grief. "
            "Chase fireflies again. Laugh until your chest hurts. Love this beautiful world. "
            "Whenever a rainbow breaks through the clouds, know that I am smiling. "
            "I love you forever. Now fly!"
        )
    }
}

async def generate_audio():
    print("Generating Compassionate & Loving Maya Voiceovers (en-US-JennyNeural with Neural SSML Emotion)...")
    for key, data in VOICEOVER_SCRIPTS.items():
        raw_mp3 = os.path.join(VOICES_DIR, f"{key}_raw.mp3")
        final_mp3 = os.path.join(VOICES_DIR, f"{key}.mp3")
        
        # Build SSML with emotional expression and tender prosody
        ssml = f"""<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
            <voice name="en-US-JennyNeural">
                <mstts:express-as style="{data['style']}">
                    <prosody rate="{data['rate']}" pitch="+0Hz">
                        {data['text']}
                    </prosody>
                </mstts:express-as>
            </voice>
        </speak>"""

        comm = edge_tts.Communicate(ssml, voice="en-US-JennyNeural")
        await comm.save(raw_mp3)
        
        # Warm, intimate studio vocal mastering:
        # - Highpass 75Hz (cleans sub-rumble)
        # - Gentle chest warmth boost at 180Hz (+2.0dB)
        # - Smooth presence polish at 3200Hz (+1.2dB)
        # - Transparent optical vocal leveling compression
        # - Subtle intimate room presence
        filter_str = (
            "highpass=f=75,"
            "bass=g=2.0:f=180,"
            "equalizer=f=3200:t=q:w=1.2:g=1.2,"
            "acompressor=threshold=-16dB:ratio=2.2:attack=12:release=120,"
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
            # Copy to alternative directories
            shutil.copyfile(final_mp3, os.path.join(ALT_VOICES_DIR, f"{key}.mp3"))
            shutil.copyfile(final_mp3, os.path.join(DIST_VOICES_DIR, f"{key}.mp3"))
            size = os.path.getsize(final_mp3)
            print(f"  [OK] Generated {key}.mp3 ({size} bytes, style='{data['style']}')")
        else:
            print(f"  [Error] FFmpeg failed for {key}: {res.stderr.decode('utf-8', errors='ignore')}")

if __name__ == '__main__':
    asyncio.run(generate_audio())
