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
    
    # Test synthesis
    text = "Hello, this is a test of Chatterbox TTS with emotion exaggeration control."
    print(f"Generating speech for: {text}")
    wav = model.generate(text, exaggeration=0.5, cfg_weight=0.5)
    
    # Save test output
    import torchaudio as ta
    ta.save("chatterbox_test.wav", wav, model.sr)
    print("✅ Test synthesis completed - saved to chatterbox_test.wav")
    
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
Run: ./venv/bin/python chatterbox_example.py
"""
from chatterbox.tts import ChatterboxTTS
import torchaudio as ta
import torch

def main():
    # Check for GPU
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")
    
    if device == "cpu":
        print("⚠️ Warning: Running on CPU. Consider using GPU for better performance.")
    
    # Load model
    print("Loading Chatterbox model...")
    model = ChatterboxTTS.from_pretrained(device=device)
    
    # Example texts with different emotions
    examples = [
        {
            "text": "Hello! Welcome to Chatterbox TTS with emotion control.",
            "exaggeration": 0.3,
            "cfg_weight": 0.5,
            "filename": "neutral_greeting.wav"
        },
        {
            "text": "This is so exciting! I can't believe how amazing this sounds!",
            "exaggeration": 0.8,
            "cfg_weight": 0.3,
            "filename": "excited_speech.wav"
        },
        {
            "text": "This is a more subdued and calm example of speech synthesis.",
            "exaggeration": 0.1,
            "cfg_weight": 0.7,
            "filename": "calm_speech.wav"
        }
    ]
    
    # Generate examples
    for i, example in enumerate(examples, 1):
        print(f"\\nGenerating example {i}: {example['text']}")
        print(f"Settings: exaggeration={example['exaggeration']}, cfg_weight={example['cfg_weight']}")
        
        wav = model.generate(
            example["text"],
            exaggeration=example["exaggeration"],
            cfg_weight=example["cfg_weight"]
        )
        
        ta.save(example["filename"], wav, model.sr)
        print(f"Saved: {example['filename']}")
    
    print("\\n✅ All examples generated successfully!")
    print("\\n💡 Tips:")
    print("- Lower cfg_weight + higher exaggeration = more dramatic")
    print("- Higher cfg_weight + lower exaggeration = more neutral")
    print("- Experiment with values between 0.1-0.9 for best results")

if __name__ == "__main__":
    main()
`;
  
  await Deno.writeTextFile("chatterbox_example.py", exampleScript);
  await $`chmod +x chatterbox_example.py`;
  
  console.log("✅ Chatterbox TTS setup complete!");
  console.log("\n💡 Usage:");
  console.log("  • Basic: ./venv/bin/python chatterbox_example.py");
  console.log("  • Advanced: Check chatterbox_example.py for detailed usage");
  console.log("\n🎛️ Key Parameters:");
  console.log("  • exaggeration: 0.1-0.9 (emotion intensity)");
  console.log("  • cfg_weight: 0.1-0.9 (control strength)");
  console.log("\n⚠️ Requirements:");
  console.log("  • GPU recommended for optimal performance");
  console.log("  • ~10-13GB VRAM for model loading");
  console.log("  • First run downloads model weights");
  
} catch (error) {
  console.error("❌ Chatterbox TTS setup failed:", error.message);
  console.log("\n🔧 Troubleshooting:");
  console.log("  • Ensure you have a CUDA-compatible GPU");
  console.log("  • Check CUDA driver installation");
  console.log("  • Verify sufficient GPU memory (10GB+)");
  Deno.exit(1);
}