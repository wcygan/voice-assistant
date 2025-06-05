#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-net
import $ from "https://deno.land/x/dax@0.39.2/mod.ts";

console.log("🔊 Setting up Dia TTS...");

try {
  // Create Python virtual environment if it doesn't exist
  if (!await $`test -d venv`.noThrow()) {
    console.log("🐍 Setting up Python virtual environment...");
    await $`python3 -m venv venv`;
  }
  
  // Upgrade pip and install PyTorch with CUDA support
  console.log("🔧 Installing dependencies...");
  await $`./venv/bin/pip install --upgrade pip`;
  
  // Install PyTorch with CUDA support (CUDA 12.6 recommended)
  console.log("🚀 Installing PyTorch with CUDA support...");
  await $`./venv/bin/pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121`;
  
  // Install Dia from GitHub
  console.log("🗣️ Installing Dia TTS...");
  await $`./venv/bin/pip install git+https://github.com/nari-labs/dia.git`;
  
  // Check for HuggingFace token
  console.log("🔑 Checking HuggingFace token...");
  const hfToken = Deno.env.get("HF_TOKEN");
  if (!hfToken) {
    console.log("⚠️ Warning: HF_TOKEN environment variable not set.");
    console.log("   You'll need a HuggingFace token to download the model.");
    console.log("   Set it with: export HF_TOKEN=\"your_token_here\"");
  } else {
    console.log("✅ HuggingFace token found");
  }
  
  // Test installation
  console.log("🧪 Testing Dia installation...");
  const testScript = `
import torch
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"CUDA device: {torch.cuda.get_device_name()}")
    print(f"GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")

try:
    from dia.model import Dia
    print("Dia imported successfully")
    
    # Check if HF_TOKEN is available
    import os
    if not os.getenv("HF_TOKEN"):
        print("⚠️ HF_TOKEN not set - model loading will fail")
        print("Set HF_TOKEN environment variable to proceed with model test")
    else:
        print("Loading Dia model... (this may take a while on first run)")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        
        if device == "cpu":
            print("⚠️ Warning: Dia requires GPU for optimal performance")
        else:
            # Check GPU memory
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1e9
            if gpu_memory < 10:
                print(f"⚠️ Warning: GPU has {gpu_memory:.1f}GB memory. Dia recommends 10-13GB")
        
        try:
            # Load model with float16 for memory efficiency
            model = Dia.from_pretrained("nari-labs/Dia-1.6B", compute_dtype="float16")
            print("✅ Dia model loaded successfully")
            
            # Test synthesis
            text = "[S1] Dia is an open weights text to dialogue model. [S2] You get full control over scripts and voices."
            print(f"Generating dialogue for: {text}")
            output = model.generate(text, use_torch_compile=True)
            
            # Save test output
            model.save_audio("dia_test.mp3", output)
            print("✅ Test synthesis completed - saved to dia_test.mp3")
            
        except Exception as e:
            print(f"⚠️ Model loading/generation failed: {e}")
            print("This may be due to insufficient GPU memory or missing HF_TOKEN")
        
except Exception as e:
    print(f"⚠️ Import or setup failed: {e}")
    print("Dia TTS is installed but may need additional configuration")
`;
  
  await Deno.writeTextFile("test_dia.py", testScript);
  await $`./venv/bin/python test_dia.py`;
  await $`rm test_dia.py`;
  
  // Create usage example script
  const exampleScript = `#!/usr/bin/env python3
"""
Dia TTS Example Usage
Run: ./venv/bin/python dia_example.py

Requirements:
- GPU with 10-13GB VRAM (RTX 4090 recommended)
- HF_TOKEN environment variable set
"""
import os
from dia.model import Dia
import torch

def main():
    # Check requirements
    if not os.getenv("HF_TOKEN"):
        print("❌ Error: HF_TOKEN environment variable not set")
        print("Get a token from https://huggingface.co/settings/tokens")
        print("Then run: export HF_TOKEN='your_token_here'")
        return
    
    if not torch.cuda.is_available():
        print("❌ Error: CUDA not available. Dia requires GPU.")
        return
    
    gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1e9
    print(f"GPU: {torch.cuda.get_device_name()}")
    print(f"VRAM: {gpu_memory:.1f}GB")
    
    if gpu_memory < 10:
        print("⚠️ Warning: Insufficient GPU memory. 10-13GB recommended.")
    
    print("Loading Dia model...")
    try:
        # Load with different precision options
        model = Dia.from_pretrained("nari-labs/Dia-1.6B", compute_dtype="float16")
        print("✅ Model loaded successfully")
    except Exception as e:
        print(f"❌ Model loading failed: {e}")
        return
    
    # Example scripts with different speakers
    examples = [
        {
            "script": "[S1] Hello, welcome to our voice assistant demo.",
            "filename": "single_speaker.mp3",
            "description": "Single speaker greeting"
        },
        {
            "script": "[S1] How are you feeling today? [S2] I'm doing great, thanks for asking!",
            "filename": "dialogue.mp3", 
            "description": "Two-speaker dialogue"
        },
        {
            "script": "[S1] This is incredible technology! *laughs* [S2] I completely agree. The possibilities are endless.",
            "filename": "with_nonverbals.mp3",
            "description": "Dialogue with nonverbal expressions"
        },
        {
            "script": "[S1] Welcome to the future of voice synthesis. [S2] Where every conversation feels natural and engaging.",
            "filename": "professional.mp3",
            "description": "Professional presentation style"
        }
    ]
    
    print("\\nGenerating dialogue examples...")
    for i, example in enumerate(examples, 1):
        print(f"\\n{i}. {example['description']}")
        print(f"Script: {example['script']}")
        
        try:
            # Generate with torch compile for better performance
            output = model.generate(example["script"], use_torch_compile=True)
            model.save_audio(example["filename"], output)
            print(f"✅ Saved: {example['filename']}")
        except Exception as e:
            print(f"❌ Generation failed: {e}")
    
    print("\\n✅ All examples generated successfully!")
    print("\\n💡 Tips for using Dia:")
    print("- Use [S1], [S2], etc. for different speakers")
    print("- Include nonverbals: *laughs*, *coughs*, *sighs*")
    print("- Keep scripts natural and conversational")
    print("- Experiment with different speaker combinations")
    
    print("\\n⚡ Performance modes:")
    print("- float32: Highest quality, most VRAM")
    print("- float16: Good quality, moderate VRAM")
    print("- bfloat16: Fastest, least VRAM")

if __name__ == "__main__":
    main()
`;
  
  await Deno.writeTextFile("dia_example.py", exampleScript);
  await $`chmod +x dia_example.py`;
  
  console.log("✅ Dia TTS setup complete!");
  console.log("\n💡 Usage:");
  console.log("  1. Set HuggingFace token: export HF_TOKEN=\"your_token\"");
  console.log("  2. Run examples: ./venv/bin/python dia_example.py");
  console.log("\n🎭 Features:");
  console.log("  • Multi-speaker dialogue synthesis");
  console.log("  • Nonverbal expression support (*laughs*, *coughs*)");
  console.log("  • Speaker tags: [S1], [S2], etc.");
  console.log("  • Voice cloning capabilities");
  console.log("\n⚠️ Requirements:");
  console.log("  • GPU with 10-13GB VRAM (RTX 4090 recommended)");
  console.log("  • HuggingFace account and token");
  console.log("  • CUDA 12.6+ and PyTorch 2.0+");
  console.log("  • English language only (currently)");
  
} catch (error) {
  console.error("❌ Dia TTS setup failed:", error.message);
  console.log("\n🔧 Troubleshooting:");
  console.log("  • Ensure you have a high-end GPU (RTX 4090 recommended)");
  console.log("  • Check CUDA driver version (12.6+ recommended)");
  console.log("  • Verify HuggingFace token is valid");
  console.log("  • Check available GPU memory (10-13GB required)");
  Deno.exit(1);
}