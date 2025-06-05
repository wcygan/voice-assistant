#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-net
import $ from "https://deno.land/x/dax@0.39.2/mod.ts";

console.log("🎵 Setting up Mozilla DeepSpeech STT...");

// Check if running on macOS
const os = Deno.build.os;
if (os !== "darwin") {
  console.error("❌ This script is designed for macOS. Please adapt for your platform.");
  Deno.exit(1);
}

try {
  // Create Python virtual environment if it doesn't exist
  if (!await $`test -d venv`.noThrow()) {
    console.log("🐍 Setting up Python virtual environment...");
    await $`python3 -m venv venv`;
  }
  
  // Upgrade pip
  console.log("🔧 Upgrading pip...");
  await $`./venv/bin/pip install --upgrade pip`;
  
  // Install DeepSpeech
  console.log("📦 Installing Mozilla DeepSpeech...");
  await $`./venv/bin/pip install deepspeech`;
  
  // Create models directory
  console.log("📁 Creating models directory...");
  await $`mkdir -p models/deepspeech`;
  
  // Download pre-trained model and scorer
  const modelUrl = "https://github.com/mozilla/DeepSpeech/releases/download/v0.9.3/deepspeech-0.9.3-models.pbmm";
  const scorerUrl = "https://github.com/mozilla/DeepSpeech/releases/download/v0.9.3/deepspeech-0.9.3-models.scorer";
  
  const modelPath = "models/deepspeech/deepspeech-0.9.3-models.pbmm";
  const scorerPath = "models/deepspeech/deepspeech-0.9.3-models.scorer";
  
  if (!await $`test -f ${modelPath}`.noThrow()) {
    console.log("📥 Downloading DeepSpeech model (this may take a while)...");
    await $`curl -L -o ${modelPath} ${modelUrl}`;
  } else {
    console.log("📦 DeepSpeech model already exists");
  }
  
  if (!await $`test -f ${scorerPath}`.noThrow()) {
    console.log("📥 Downloading DeepSpeech scorer...");
    await $`curl -L -o ${scorerPath} ${scorerUrl}`;
  } else {
    console.log("📦 DeepSpeech scorer already exists");
  }
  
  // Install audio processing dependencies
  console.log("🔧 Installing audio processing dependencies...");
  await $`./venv/bin/pip install scipy soundfile librosa`;
  
  // Install FFmpeg for audio format conversion
  console.log("📦 Installing FFmpeg...");
  await $`brew install ffmpeg`.noThrow();
  
  // Test installation
  console.log("🧪 Testing DeepSpeech installation...");
  const testScript = `
import deepspeech
import numpy as np
import wave
import sys

def test_deepspeech():
    try:
        # Load model
        model_path = "models/deepspeech/deepspeech-0.9.3-models.pbmm"
        scorer_path = "models/deepspeech/deepspeech-0.9.3-models.scorer"
        
        print("Loading DeepSpeech model...")
        ds = deepspeech.Model(model_path)
        
        print("Loading language model scorer...")
        ds.enableExternalScorer(scorer_path)
        
        print("✅ DeepSpeech model loaded successfully")
        print(f"Sample rate: {ds.sampleRate()} Hz")
        print("Model is ready for inference")
        
        return ds
        
    except Exception as e:
        print(f"❌ DeepSpeech test failed: {e}")
        return None

if __name__ == "__main__":
    model = test_deepspeech()
    if model:
        print("\\n💡 DeepSpeech is ready to use!")
        print("Use the example script for audio transcription.")
`;
  
  await Deno.writeTextFile("test_deepspeech.py", testScript);
  await $`./venv/bin/python test_deepspeech.py`;
  await $`rm test_deepspeech.py`;
  
  // Create usage example script
  const exampleScript = `#!/usr/bin/env python3
"""
DeepSpeech STT Example Usage
Run: ./venv/bin/python deepspeech_example.py <audio_file>

Supported formats: WAV (16kHz, 16-bit, mono)
Other formats will be automatically converted using FFmpeg
"""
import sys
import wave
import numpy as np
import deepspeech
import subprocess
import tempfile
import os

def convert_audio_to_wav(input_file, output_file):
    """Convert audio file to WAV format suitable for DeepSpeech"""
    try:
        # Use FFmpeg to convert to 16kHz, 16-bit, mono WAV
        cmd = [
            'ffmpeg', '-i', input_file,
            '-ar', '16000',  # 16kHz sample rate
            '-ac', '1',      # mono
            '-sample_fmt', 's16',  # 16-bit
            '-y',            # overwrite output
            output_file
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Audio conversion failed: {e}")
        return False

def load_audio(file_path):
    """Load audio file and return numpy array"""
    try:
        with wave.open(file_path, 'rb') as w:
            frames = w.getnframes()
            buffer = w.readframes(frames)
            audio = np.frombuffer(buffer, dtype=np.int16)
            return audio, w.getframerate()
    except Exception as e:
        print(f"❌ Failed to load audio: {e}")
        return None, None

def transcribe_audio(model_path, scorer_path, audio_file):
    """Transcribe audio file using DeepSpeech"""
    print(f"Transcribing: {audio_file}")
    
    # Load DeepSpeech model
    print("Loading DeepSpeech model...")
    ds = deepspeech.Model(model_path)
    ds.enableExternalScorer(scorer_path)
    
    target_sample_rate = ds.sampleRate()
    print(f"Target sample rate: {target_sample_rate} Hz")
    
    # Convert audio if needed
    temp_wav = None
    if not audio_file.lower().endswith('.wav'):
        print("Converting audio to WAV format...")
        temp_wav = tempfile.mktemp(suffix='.wav')
        if not convert_audio_to_wav(audio_file, temp_wav):
            return None
        audio_file = temp_wav
    
    try:
        # Load audio
        audio, sample_rate = load_audio(audio_file)
        if audio is None:
            return None
        
        print(f"Audio loaded: {len(audio)} samples at {sample_rate} Hz")
        
        # Resample if necessary
        if sample_rate != target_sample_rate:
            print(f"⚠️ Warning: Audio sample rate ({sample_rate} Hz) != model rate ({target_sample_rate} Hz)")
            print("Consider converting audio to 16kHz for best results")
        
        # Transcribe
        print("Running speech recognition...")
        text = ds.stt(audio)
        
        return text
        
    finally:
        # Clean up temporary file
        if temp_wav and os.path.exists(temp_wav):
            os.remove(temp_wav)

def main():
    if len(sys.argv) != 2:
        print("Usage: python deepspeech_example.py <audio_file>")
        print("\\nExample audio formats supported:")
        print("  • WAV (preferred: 16kHz, 16-bit, mono)")
        print("  • MP3, M4A, FLAC (auto-converted)")
        print("\\nExample:")
        print("  python deepspeech_example.py recording.wav")
        return
    
    audio_file = sys.argv[1]
    
    if not os.path.exists(audio_file):
        print(f"❌ Audio file not found: {audio_file}")
        return
    
    model_path = "models/deepspeech/deepspeech-0.9.3-models.pbmm"
    scorer_path = "models/deepspeech/deepspeech-0.9.3-models.scorer"
    
    if not os.path.exists(model_path):
        print(f"❌ Model file not found: {model_path}")
        print("Run the setup script first to download the model")
        return
    
    if not os.path.exists(scorer_path):
        print(f"❌ Scorer file not found: {scorer_path}")
        print("Run the setup script first to download the scorer")
        return
    
    # Transcribe
    text = transcribe_audio(model_path, scorer_path, audio_file)
    
    if text:
        print(f"\\n🎯 Transcription: {text}")
        
        # Save to file
        output_file = os.path.splitext(audio_file)[0] + "_transcript.txt"
        with open(output_file, 'w') as f:
            f.write(text)
        print(f"💾 Saved transcript to: {output_file}")
    else:
        print("❌ Transcription failed")

if __name__ == "__main__":
    main()
`;
  
  await Deno.writeTextFile("deepspeech_example.py", exampleScript);
  await $`chmod +x deepspeech_example.py`;
  
  console.log("✅ Mozilla DeepSpeech STT setup complete!");
  console.log("\n💡 Usage:");
  console.log("  • Basic: ./venv/bin/python deepspeech_example.py audio.wav");
  console.log("  • Command line: ./venv/bin/deepspeech --model models/deepspeech/deepspeech-0.9.3-models.pbmm --scorer models/deepspeech/deepspeech-0.9.3-models.scorer --audio audio.wav");
  console.log("\n🎵 Audio Requirements:");
  console.log("  • Preferred: 16kHz, 16-bit, mono WAV");
  console.log("  • Auto-conversion supported for MP3, M4A, FLAC");
  console.log("  • FFmpeg required for format conversion");
  console.log("\n📁 Files Downloaded:");
  console.log("  • Model: models/deepspeech/deepspeech-0.9.3-models.pbmm");
  console.log("  • Scorer: models/deepspeech/deepspeech-0.9.3-models.scorer");
  console.log("\n⚡ Performance:");
  console.log("  • CPU-based (no GPU required)");
  console.log("  • Good for offline/embedded applications");
  console.log("  • Moderate accuracy, fast inference");
  
} catch (error) {
  console.error("❌ Mozilla DeepSpeech setup failed:", error.message);
  console.log("\n🔧 Troubleshooting:");
  console.log("  • Ensure stable internet connection for model downloads");
  console.log("  • Check available disk space (~1GB for models)");
  console.log("  • Install FFmpeg: brew install ffmpeg");
  Deno.exit(1);
}