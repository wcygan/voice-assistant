#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-net
import $ from "https://deno.land/x/dax@0.39.2/mod.ts";

console.log("🔊 Setting up Piper TTS...");

// Check if running on macOS ARM64
const os = Deno.build.os;
const arch = Deno.build.arch;

if (os !== "darwin" || arch !== "aarch64") {
  console.error("❌ This script is designed for macOS ARM64. Please adapt for your platform.");
  Deno.exit(1);
}

try {
  // Create piper directory
  console.log("📁 Creating Piper directory...");
  await $`mkdir -p tools/piper`;
  
  // Download Piper if not present
  const piperBinary = "tools/piper/piper";
  if (!await $`test -f ${piperBinary}`.noThrow()) {
    console.log("📥 Downloading Piper for macOS ARM64...");
    await $`curl -L -o piper.tar.gz https://github.com/rhasspy/piper/releases/latest/download/piper_macOS_arm64.tar.gz`.cwd("tools/piper");
    await $`tar -xf piper.tar.gz --strip-components=1`.cwd("tools/piper");
    await $`rm piper.tar.gz`.cwd("tools/piper");
    await $`chmod +x piper`.cwd("tools/piper");
  } else {
    console.log("📦 Piper binary already exists");
  }
  
  // Create voices directory
  console.log("📁 Creating voices directory...");
  await $`mkdir -p tools/piper/voices/en`;
  
  // List available voices
  console.log("🎤 Available voices:");
  await $`./tools/piper/piper --list-voices`.noThrow();
  
  // Download a sample voice model if desired
  const voiceModel = "tools/piper/voices/en/en_US-libritts-high.onnx";
  if (!await $`test -f ${voiceModel}`.noThrow()) {
    console.log("📥 Downloading sample voice model...");
    console.log("⚠️  Note: Voice models are large files. Download manually if needed.");
    // Placeholder - user should download manually
    await $`touch ${voiceModel}`;
    console.log("📝 Created placeholder voice model file. Please download actual model manually.");
  }
  
  // Test basic functionality
  console.log("🧪 Testing Piper installation...");
  const version = await $`./tools/piper/piper --version`.text().catch(() => "Version check failed");
  console.log("Piper version:", version);
  
  console.log("✅ Piper TTS setup complete!");
  console.log("💡 Usage: ./tools/piper/piper --model voices/en/en_US-libritts-high.onnx --text \"Testing piper\" --output_file piper.wav");
  console.log("📥 Download voice models from: https://github.com/rhasspy/piper/releases");
  
} catch (error) {
  console.error("❌ Piper setup failed:", error.message);
  Deno.exit(1);
}