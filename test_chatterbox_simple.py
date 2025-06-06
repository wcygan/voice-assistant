#!/usr/bin/env python3
"""Simple Chatterbox test - demonstrates emotion-controlled TTS"""

import torch
from chatterbox.tts import ChatterboxTTS
import torchaudio as ta
import os

# Check device
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")
print(f"PyTorch version: {torch.__version__}")

# Initialize model
print("\n🎭 Loading Chatterbox model (this may take a while on first run)...")
try:
    model = ChatterboxTTS.from_pretrained(device=device)
    print("✅ Model loaded successfully!")
except Exception as e:
    print(f"❌ Failed to load model: {e}")
    exit(1)

# Create output directory
os.makedirs("demo_output", exist_ok=True)

# Test different emotions
emotions = [
    {"text": "Hello! I'm so happy to meet you today!", "emotion": "happy", "exaggeration": 0.7, "cfg_weight": 1.2},
    {"text": "This is just a normal conversation.", "emotion": "neutral", "exaggeration": 0.3, "cfg_weight": 1.0},
    {"text": "I'm really sorry to hear that.", "emotion": "sad", "exaggeration": 0.5, "cfg_weight": 0.7},
    {"text": "That's absolutely amazing news!", "emotion": "excited", "exaggeration": 0.9, "cfg_weight": 1.5},
]

print("\n🎤 Generating speech with different emotions:")
for i, item in enumerate(emotions):
    print(f"\n{i+1}. {item['emotion'].upper()} - \"{item['text']}\"")
    print(f"   Settings: exaggeration={item['exaggeration']}, cfg_weight={item['cfg_weight']}")
    
    try:
        # Generate speech
        wav = model.generate(
            item["text"],
            exaggeration=item["exaggeration"],
            cfg_weight=item["cfg_weight"]
        )
        
        # Save audio
        filename = f"demo_output/chatterbox_{item['emotion']}.wav"
        ta.save(filename, wav, model.sr)
        print(f"   ✅ Saved to: {filename}")
        
    except Exception as e:
        print(f"   ❌ Failed: {e}")

print("\n🎧 To play the generated audio files:")
print("afplay demo_output/chatterbox_*.wav")