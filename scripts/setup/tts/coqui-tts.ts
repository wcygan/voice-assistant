#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-net
import $ from "https://deno.land/x/dax@0.39.2/mod.ts";

console.log("🔊 Setting up Coqui TTS...");

try {
  // Create Python virtual environment if it doesn't exist
  if (!await $`test -d venv`.noThrow()) {
    console.log("🐍 Setting up Python virtual environment...");
    await $`python3 -m venv venv`;
  }
  
  // Install Coqui TTS
  console.log("🔧 Installing Coqui TTS...");
  await $`./venv/bin/pip install TTS`;
  
  // Test installation and list available models
  console.log("🧪 Testing Coqui TTS installation...");
  const result = await $`./venv/bin/python -c "import TTS; print('Coqui TTS installed successfully')"`.text();
  console.log(result);
  
  // List available models
  console.log("📋 Available TTS models:");
  await $`./venv/bin/tts --list_models`.noThrow();
  
  // Test with a simple synthesis
  console.log("🎤 Testing speech synthesis...");
  await $`./venv/bin/tts --text "Hello world" --model_name tts_models/en/ljspeech/tacotron2-DDC --out_path test_output.wav`.noThrow();
  
  if (await $`test -f test_output.wav`.noThrow()) {
    console.log("✅ Test synthesis successful! Generated test_output.wav");
    await $`rm test_output.wav`;
  }
  
  console.log("✅ Coqui TTS setup complete!");
  console.log("💡 Usage: ./venv/bin/tts --text \"Hello world\" --model_name tts_models/en/ljspeech/tacotron2-DDC --out_path output.wav");
  
} catch (error) {
  console.error("❌ Coqui TTS setup failed:", error.message);
  Deno.exit(1);
}