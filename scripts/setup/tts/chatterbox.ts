#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-net
import $ from "https://deno.land/x/dax@0.39.2/mod.ts";

console.log("🔊 Setting up Chatterbox TTS...");

try {
  // Create Python virtual environment if it doesn't exist
  if (!await $`test -d venv`.noThrow()) {
    console.log("🐍 Setting up Python virtual environment...");
    await $`python3 -m venv venv`;
  }
  
  // Upgrade pip and install PyTorch with CUDA support (for GPU acceleration)
  console.log("🔧 Installing dependencies...");
  await $`./venv/bin/pip install --upgrade pip`;
  
  // Install PyTorch with CUDA support (adjust for your CUDA version)
  console.log("🚀 Installing PyTorch with CUDA support...");
  await $`./venv/bin/pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121`;
  
  // Install Chatterbox TTS
  console.log("🗣️ Installing Chatterbox TTS...");
  await $`./venv/bin/pip install chatterbox-tts`;
  
  // Test installation
  console.log("🧪 Testing Chatterbox installation...");
  const testScript = `
import torch
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"CUDA device: {torch.cuda.get_device_name()}")

try:
    from chatterbox.tts import ChatterboxTTS
    print("Chatterbox TTS imported successfully")
    
    # Test model loading (this will download the model on first run)
    print("Loading Chatterbox model... (this may take a while on first run)")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")
    
    # Note: Model loading may take time and requires GPU memory
    model = ChatterboxTTS.from_pretrained(device=device)
    print("✅ Chatterbox model loaded successfully")
    
    # Test synthesis with different emotions
    examples = [
        ("Hello, this is a neutral test of Chatterbox.", 0.3, 1.0, "neutral"),
        ("I'm so excited to demonstrate emotion control!", 0.8, 1.5, "excited"),
        ("This is a calm and soothing voice example.", 0.1, 0.8, "calm")
    ]
    
    for text, exaggeration, cfg_weight, emotion in examples:
        print(f"\\nGenerating {emotion} speech: '{text}'")
        print(f"Parameters: exaggeration={exaggeration}, cfg_weight={cfg_weight}")
        wav = model.generate(text, exaggeration=exaggeration, cfg_weight=cfg_weight)
        
        # Save test output
        import torchaudio as ta
        ta.save(f"chatterbox_test_{emotion}.wav", wav, model.sr)
        print(f"✅ {emotion.capitalize()} synthesis completed - saved to chatterbox_test_{emotion}.wav")
    
except Exception as e:
    print(f"⚠️ Model test failed (may need GPU): {e}")
    print("Chatterbox TTS is installed but requires GPU for optimal performance")
`;
  
  await Deno.writeTextFile("test_chatterbox.py", testScript);
  await $`./venv/bin/python test_chatterbox.py`;
  await $`rm test_chatterbox.py`;
  
  // Create usage example script
  const exampleScript = `#!/usr/bin/env python3
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
        
        print(f"\\nGenerating example {i}: {emotion.upper()} emotion")
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
    
    print("\\n✅ All examples generated successfully!")
    print("\\n🎭 Emotion Presets Available:")
    for emotion, settings in emotion_presets.items():
        print(f"  • {emotion}: exaggeration={settings['exaggeration']}, cfg_weight={settings['cfg_weight']}")
    
    print("\\n💡 Tips:")
    print("- Use --voice <file.wav> to clone a specific voice")
    print("- Lower cfg_weight + higher exaggeration = more dramatic emotion")
    print("- Higher cfg_weight + lower exaggeration = more neutral tone")
    print("- Combine with LLM emotion detection for automatic emotion selection")

if __name__ == "__main__":
    main()
`;
  
  await Deno.writeTextFile("chatterbox_example.py", exampleScript);
  await $`chmod +x chatterbox_example.py`;
  
  console.log("✅ Chatterbox TTS setup complete!");
  console.log("\n💡 Usage:");
  console.log("  • Basic emotion control: ./venv/bin/python chatterbox_example.py");
  console.log("  • Voice cloning: ./venv/bin/python chatterbox_example.py --voice reference.wav");
  console.log("  • Demo integration: deno task demo:tts --tts chatterbox");
  console.log("\n🎭 Emotion Presets:");
  console.log("  • neutral: balanced tone for general responses");
  console.log("  • happy/excited: high energy, positive emotion");
  console.log("  • sad/empathetic: subdued, understanding tone");
  console.log("  • calm: soothing, reassuring voice");
  console.log("  • serious: authoritative, warning tone");
  console.log("\n🎛️ Key Parameters:");
  console.log("  • exaggeration: 0.1-0.9 (emotion intensity)");
  console.log("  • cfg_weight: 0.1-1.5 (speaking style/pace)");
  console.log("  • audio_prompt_path: voice reference for cloning");
  console.log("\n⚠️ Requirements:");
  console.log("  • GPU strongly recommended (10-13GB VRAM)");
  console.log("  • CPU mode available but slow");
  console.log("  • First run downloads model weights (~2GB)");
  console.log("  • Includes neural watermarking for responsible AI");
  
} catch (error) {
  console.error("❌ Chatterbox TTS setup failed:", error.message);
  console.log("\n🔧 Troubleshooting:");
  console.log("  • Ensure you have a CUDA-compatible GPU");
  console.log("  • Check CUDA driver installation");
  console.log("  • Verify sufficient GPU memory (10GB+)");
  Deno.exit(1);
}