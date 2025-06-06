#!/usr/bin/env python3
"""Quick Chatterbox test with audio playback"""

import os
import sys
import subprocess

# Simple test without loading the full model
print("🎭 Chatterbox Quick Test\n")

# Check if we have any existing Chatterbox audio files
demo_files = [
    "demo_output/chatterbox_happy.wav",
    "demo_output/chatterbox_neutral.wav", 
    "demo_output/tts_output.wav"
]

found_files = []
for f in demo_files:
    if os.path.exists(f):
        found_files.append(f)
        print(f"✅ Found: {f}")

if found_files:
    print("\n🎧 Playing existing audio files:")
    for f in found_files:
        print(f"\nPlaying: {f}")
        subprocess.run(["afplay", f])
else:
    print("❌ No audio files found yet.")
    print("\nThe Chatterbox model is still downloading in the background.")
    print("This is a ~2GB model, so it may take some time.\n")
    
    # Try generating with Coqui TTS as a fallback
    print("💡 Let's try the standard TTS instead:")
    print("Running: deno task demo:tts --text 'Hello world! I am happy to help you today!' --play")
    subprocess.run(["deno", "task", "demo:tts", "--text", "Hello world! I am happy to help you today!", "--play"])