#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-net
import $ from "https://deno.land/x/dax@0.39.2/mod.ts";

console.log("🎵 Setting up Whisper STT...");

// Check if running on macOS
const os = Deno.build.os;
if (os !== "darwin") {
  console.error("❌ This script is designed for macOS. Please adapt for your platform.");
  Deno.exit(1);
}

try {
  // Install FFmpeg if not present
  console.log("📦 Installing FFmpeg...");
  await $`brew install ffmpeg`.noThrow();
  
  // Create Python virtual environment
  console.log("🐍 Setting up Python virtual environment...");
  await $`python3 -m venv venv`;
  
  // Install Whisper
  console.log("🔧 Installing Whisper...");
  await $`./venv/bin/pip install git+https://github.com/openai/whisper.git`;
  
  // Test installation
  console.log("🧪 Testing Whisper installation...");
  const result = await $`./venv/bin/python -c "import whisper; print('Whisper installed successfully')"`.text();
  console.log(result);
  
  console.log("✅ Whisper STT setup complete!");
  console.log("💡 Usage: ./venv/bin/whisper path/to/audio.wav --model base --fp16 False");
  
} catch (error) {
  console.error("❌ Whisper setup failed:", error.message);
  Deno.exit(1);
}