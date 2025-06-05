#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-net
import $ from "https://deno.land/x/dax@0.39.2/mod.ts";

console.log("🎵 Setting up Coqui STT...");

try {
  // Create Python virtual environment if it doesn't exist
  if (!await $`test -d venv`.noThrow()) {
    console.log("🐍 Setting up Python virtual environment...");
    await $`python3 -m venv venv`;
  }
  
  // Install Coqui STT
  console.log("🔧 Installing Coqui STT...");
  await $`./venv/bin/pip install stt`;
  
  // Create models directory
  console.log("📁 Creating models directory...");
  await $`mkdir -p models/coqui-stt`;
  
  // Download a sample model (this is a placeholder URL - update with actual model URL)
  const modelPath = "models/coqui-stt/tiny.en.tflite";
  if (!await $`test -f ${modelPath}`.noThrow()) {
    console.log("📥 Downloading Coqui STT model...");
    console.log("⚠️  Note: Update the model URL in the script with actual Coqui model download link");
    // Placeholder download - replace with actual model URL
    // await $`curl -L -o ${modelPath} https://coqui.gateway.url/tiny.en.tflite`;
    
    // Create a placeholder file for now
    await $`touch ${modelPath}`;
    console.log("📝 Created placeholder model file. Please download actual model manually.");
  } else {
    console.log("📦 Coqui STT model already exists");
  }
  
  // Test installation
  console.log("🧪 Testing Coqui STT installation...");
  const result = await $`./venv/bin/python -c "import stt; print('Coqui STT installed successfully')"`.text();
  console.log(result);
  
  console.log("✅ Coqui STT setup complete!");
  console.log("💡 Usage: ./venv/bin/stt --model models/coqui-stt/tiny.en.tflite --audio your_audio.wav");
  console.log("⚠️  Remember to download an actual model file!");
  
} catch (error) {
  console.error("❌ Coqui STT setup failed:", error.message);
  Deno.exit(1);
}