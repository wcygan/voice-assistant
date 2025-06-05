#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-net
import $ from "https://deno.land/x/dax@0.39.2/mod.ts";

console.log("🔊 Setting up espeak-ng TTS...");

// Check if running on macOS
const os = Deno.build.os;
if (os !== "darwin") {
  console.error("❌ This script is designed for macOS. Please adapt for your platform.");
  Deno.exit(1);
}

try {
  // Install espeak-ng via Homebrew
  console.log("📦 Installing espeak-ng via Homebrew...");
  await $`brew install espeak-ng`;
  
  // Test installation
  console.log("🧪 Testing espeak-ng installation...");
  const version = await $`espeak-ng --version`.text();
  console.log("espeak-ng version:", version);
  
  // List available voices
  console.log("🎤 Available voices:");
  await $`espeak-ng --voices`.noThrow();
  
  // Test synthesis
  console.log("🎵 Testing speech synthesis...");
  await $`espeak-ng "This is a test" --stdout > test_espeak.wav`;
  
  if (await $`test -f test_espeak.wav`.noThrow()) {
    console.log("✅ Test synthesis successful! Generated test_espeak.wav");
    await $`rm test_espeak.wav`;
  }
  
  console.log("✅ espeak-ng TTS setup complete!");
  console.log("💡 Usage: espeak-ng \"This is a test\" --stdout > espeak.wav");
  console.log("🎛️  Advanced: espeak-ng -v en+f3 -s 150 \"Hello world\" --stdout > output.wav");
  
} catch (error) {
  console.error("❌ espeak-ng setup failed:", error.message);
  Deno.exit(1);
}