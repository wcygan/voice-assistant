#!/usr/bin/env python3
"""
Chatterbox TTS Example Usage
Run: ./venv/bin/python chatterbox_example.py [--voice reference_audio.wav]
"""
from chatterbox.tts import ChatterboxTTS
import torchaudio as ta
import torch
import sys
import os

def main():
    # Check for GPU
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")
    
    if device == "cpu":
        print("⚠️ Warning: Running on CPU. Consider using GPU for better performance.")
    
    # Check for voice reference file
    voice_ref_path = None
    if len(sys.argv) > 2 and sys.argv[1] == "--voice":
        voice_ref_path = sys.argv[2]
        if not os.path.exists(voice_ref_path):
            print(f"❌ Voice reference file not found: {voice_ref_path}")
            return
        print(f"🎤 Using voice reference: {voice_ref_path}")
    
    # Load model
    print("Loading Chatterbox model...")
    model = ChatterboxTTS.from_pretrained(device=device)
    
    # Emotion mapping for voice assistant context
    emotion_presets = {
        "neutral": {"exaggeration": 0.3, "cfg_weight": 1.0},
        "happy": {"exaggeration": 0.7, "cfg_weight": 1.2},
        "excited": {"exaggeration": 0.9, "cfg_weight": 1.5},
        "sad": {"exaggeration": 0.5, "cfg_weight": 0.7},
        "calm": {"exaggeration": 0.1, "cfg_weight": 0.8},
        "serious": {"exaggeration": 0.2, "cfg_weight": 1.3},
        "empathetic": {"exaggeration": 0.4, "cfg_weight": 0.9},
        "curious": {"exaggeration": 0.6, "cfg_weight": 1.1}
    }
    
    # Example texts with different emotions
    examples = [
        {
            "text": "Hello! I'm your voice assistant. How can I help you today?",
            "emotion": "neutral",
            "filename": "assistant_greeting.wav"
        },
        {
            "text": "That's fantastic news! I'm so happy to hear about your success!",
            "emotion": "excited",
            "filename": "assistant_excited.wav"
        },
        {
            "text": "I understand this might be difficult. Is there anything I can do to help?",
            "emotion": "empathetic",
            "filename": "assistant_empathetic.wav"
        },
        {
            "text": "Let me think about that for a moment... That's a really interesting question.",
            "emotion": "curious",
            "filename": "assistant_curious.wav"
        },
        {
            "text": "Please remain calm. Everything is going to be alright.",
            "emotion": "calm",
            "filename": "assistant_calm.wav"
        },
        {
            "text": "Warning: This action cannot be undone. Please proceed with caution.",
            "emotion": "serious",
            "filename": "assistant_serious.wav"
        }
    ]
    
    # Generate examples
    for i, example in enumerate(examples, 1):
        emotion = example["emotion"]
        settings = emotion_presets[emotion]
        
        print(f"\nGenerating example {i}: {emotion.upper()} emotion")
        print(f"Text: '{example['text'][:50]}...'")
        print(f"Settings: exaggeration={settings['exaggeration']}, cfg_weight={settings['cfg_weight']}")
        
        # Generate with or without voice reference
        if voice_ref_path:
            wav = model.generate(
                example["text"],
                audio_prompt_path=voice_ref_path,
                exaggeration=settings["exaggeration"],
                cfg_weight=settings["cfg_weight"]
            )
        else:
            wav = model.generate(
                example["text"],
                exaggeration=settings["exaggeration"],
                cfg_weight=settings["cfg_weight"]
            )
        
        ta.save(example["filename"], wav, model.sr)
        print(f"Saved: {example['filename']}")
    
    print("\n✅ All examples generated successfully!")
    print("\n🎭 Emotion Presets Available:")
    for emotion, settings in emotion_presets.items():
        print(f"  • {emotion}: exaggeration={settings['exaggeration']}, cfg_weight={settings['cfg_weight']}")
    
    print("\n💡 Tips:")
    print("- Use --voice <file.wav> to clone a specific voice")
    print("- Lower cfg_weight + higher exaggeration = more dramatic emotion")
    print("- Higher cfg_weight + lower exaggeration = more neutral tone")
    print("- Combine with LLM emotion detection for automatic emotion selection")

if __name__ == "__main__":
    main()
