#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-net
import $ from "https://deno.land/x/dax@0.39.2/mod.ts";

console.log("🎵 Setting up Vosk STT...");

try {
  // Create Python virtual environment if it doesn't exist
  if (!await $`test -d venv`.noThrow()) {
    console.log("🐍 Setting up Python virtual environment...");
    await $`python3 -m venv venv`;
  }
  
  // Install Vosk
  console.log("🔧 Installing Vosk...");
  await $`./venv/bin/pip install vosk`;
  
  // Create models directory
  console.log("📁 Creating models directory...");
  await $`mkdir -p models`;
  
  // Download English model if not present
  const modelPath = "models/vosk-model-small-en-us-0.15";
  if (!await $`test -d ${modelPath}`.noThrow()) {
    console.log("📥 Downloading Vosk English model...");
    await $`curl -LO https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip`.cwd("models");
    await $`unzip vosk-model-small-en-us-0.15.zip`.cwd("models");
    await $`rm vosk-model-small-en-us-0.15.zip`.cwd("models");
  } else {
    console.log("📦 Vosk model already exists");
  }
  
  // Test installation
  console.log("🧪 Testing Vosk installation...");
  const result = await $`./venv/bin/python -c "import vosk; print('Vosk installed successfully')"`.text();
  console.log(result);
  
  console.log("✅ Vosk STT setup complete!");
  console.log("💡 Usage: ./venv/bin/python -m vosk test.wav models/vosk-model-small-en-us-0.15");
  
} catch (error) {
  console.error("❌ Vosk setup failed:", error.message);
  Deno.exit(1);
}