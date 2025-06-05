#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-net
import $ from "https://deno.land/x/dax@0.39.2/mod.ts";

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';

console.log(`${BOLD}${BLUE}🎤 Voice Assistant Round-Trip Test${RESET}\n`);
console.log("This script tests the complete STT -> TTS pipeline using Whisper and Coqui TTS\n");

interface TestOptions {
  inputAudio?: string;
  testText?: string;
  whisperModel?: string;
  ttsModel?: string;
  outputDir?: string;
}

async function checkDependencies(): Promise<boolean> {
  console.log(`${YELLOW}🔍 Checking dependencies...${RESET}`);
  
  // Check if virtual environment exists
  if (!await $`test -d venv`.noThrow()) {
    console.error(`${RED}❌ Python virtual environment not found. Run setup scripts first.${RESET}`);
    return false;
  }
  
  // Check Whisper
  const whisperCheck = await $`./venv/bin/python -c "import whisper; print('OK')"`.noThrow();
  if (!whisperCheck) {
    console.error(`${RED}❌ Whisper not installed. Run: deno task setup whisper${RESET}`);
    return false;
  }
  
  // Check Coqui TTS
  const ttsCheck = await $`./venv/bin/python -c "import TTS; print('OK')"`.noThrow();
  if (!ttsCheck) {
    console.error(`${RED}❌ Coqui TTS not installed. Run: deno task setup coqui-tts${RESET}`);
    return false;
  }
  
  // Check FFmpeg
  const ffmpegCheck = await $`which ffmpeg`.noThrow();
  if (!ffmpegCheck) {
    console.error(`${RED}❌ FFmpeg not found. Install with: brew install ffmpeg${RESET}`);
    return false;
  }
  
  console.log(`${GREEN}✅ All dependencies found${RESET}\n`);
  return true;
}

async function createTestAudio(text: string, outputPath: string): Promise<boolean> {
  console.log(`${YELLOW}🎵 Generating test audio: "${text}"${RESET}`);
  
  const pythonScript = `
import sys
sys.path.append('.')
from TTS.api import TTS
import torch

# Check for available device
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

try:
    # Use a fast model for testing
    tts = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", vocoder_path=None, progress_bar=False, gpu=${Deno.build.os === "darwin" ? "False" : "device == 'cuda'"})
    tts.tts_to_file(text="${text}", file_path="${outputPath}")
    print("✅ Test audio generated successfully")
except Exception as e:
    print(f"❌ TTS generation failed: {e}")
    sys.exit(1)
`;
  
  try {
    await Deno.writeTextFile("temp_tts_test.py", pythonScript);
    await $`./venv/bin/python temp_tts_test.py`;
    await $`rm temp_tts_test.py`;
    return true;
  } catch (error) {
    console.error(`${RED}❌ Failed to generate test audio: ${error.message}${RESET}`);
    return false;
  }
}

async function transcribeAudio(audioPath: string, model: string = "base"): Promise<string | null> {
  console.log(`${YELLOW}🎯 Transcribing audio with Whisper (${model} model)...${RESET}`);
  
  try {
    const result = await $`./venv/bin/whisper ${audioPath} --model ${model} --fp16 False --output_format txt --output_dir temp_whisper`.text();
    
    // Read the generated transcript file
    const baseName = audioPath.split('/').pop()?.split('.')[0] || "audio";
    const transcriptFile = `temp_whisper/${baseName}.txt`;
    
    if (await $`test -f ${transcriptFile}`.noThrow()) {
      const transcript = await Deno.readTextFile(transcriptFile);
      await $`rm -rf temp_whisper`;
      return transcript.trim();
    } else {
      console.error(`${RED}❌ Transcript file not found: ${transcriptFile}${RESET}`);
      return null;
    }
  } catch (error) {
    console.error(`${RED}❌ Whisper transcription failed: ${error.message}${RESET}`);
    return null;
  }
}

async function synthesizeSpeech(text: string, outputPath: string, model?: string): Promise<boolean> {
  console.log(`${YELLOW}🗣️ Synthesizing speech: "${text.replace(/\n/g, ' ')}"${RESET}`);
  
  // Clean text: replace newlines with spaces and escape quotes
  const cleanText = text.replace(/\n/g, ' ').replace(/"/g, '\\"');
  
  const pythonScript = `
import sys
sys.path.append('.')
from TTS.api import TTS
import torch

# Check for available device
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

try:
    # Use the specified model or default
    model_name = "${model || 'tts_models/en/ljspeech/tacotron2-DDC'}"
    print(f"Loading TTS model: {model_name}")
    
    tts = TTS(model_name=model_name, progress_bar=False, gpu=${Deno.build.os === "darwin" ? "False" : "device == 'cuda'"})
    text_to_speak = "${cleanText}"
    tts.tts_to_file(text=text_to_speak, file_path="${outputPath}")
    print("✅ Speech synthesis completed")
except Exception as e:
    print(f"❌ TTS synthesis failed: {e}")
    sys.exit(1)
`;
  
  try {
    await Deno.writeTextFile("temp_tts_synth.py", pythonScript);
    await $`./venv/bin/python temp_tts_synth.py`;
    await $`rm temp_tts_synth.py`;
    return true;
  } catch (error) {
    console.error(`${RED}❌ Speech synthesis failed: ${error.message}${RESET}`);
    return false;
  }
}

async function runRoundTripTest(options: TestOptions = {}): Promise<void> {
  const {
    inputAudio,
    testText = "Hello, this is a test of the voice assistant round trip functionality. The text should be transcribed and then synthesized back to speech.",
    whisperModel = "base",
    ttsModel = "tts_models/en/ljspeech/tacotron2-DDC",
    outputDir = "test_output"
  } = options;
  
  // Create output directory
  await $`mkdir -p ${outputDir}`;
  
  let audioToTranscribe: string;
  
  if (inputAudio) {
    console.log(`${BLUE}📁 Using provided audio file: ${inputAudio}${RESET}`);
    audioToTranscribe = inputAudio;
    
    if (!await $`test -f ${inputAudio}`.noThrow()) {
      console.error(`${RED}❌ Input audio file not found: ${inputAudio}${RESET}`);
      return;
    }
  } else {
    console.log(`${BLUE}🎬 Creating test audio from text${RESET}`);
    audioToTranscribe = `${outputDir}/original.wav`;
    
    if (!await createTestAudio(testText, audioToTranscribe)) {
      return;
    }
    console.log(`${GREEN}✅ Test audio created: ${audioToTranscribe}${RESET}`);
  }
  
  // Step 1: Transcribe audio to text
  console.log(`\n${BOLD}Step 1: Speech-to-Text${RESET}`);
  const transcription = await transcribeAudio(audioToTranscribe, whisperModel);
  
  if (!transcription) {
    console.error(`${RED}❌ Round-trip test failed at transcription step${RESET}`);
    return;
  }
  
  console.log(`${GREEN}✅ Transcription: "${transcription}"${RESET}`);
  
  // Save transcription
  const transcriptFile = `${outputDir}/transcription.txt`;
  await Deno.writeTextFile(transcriptFile, transcription);
  console.log(`${BLUE}💾 Saved transcription: ${transcriptFile}${RESET}`);
  
  // Step 2: Synthesize text back to speech
  console.log(`\n${BOLD}Step 2: Text-to-Speech${RESET}`);
  const finalAudio = `${outputDir}/final_output.wav`;
  
  if (!await synthesizeSpeech(transcription, finalAudio, ttsModel)) {
    console.error(`${RED}❌ Round-trip test failed at synthesis step${RESET}`);
    return;
  }
  
  console.log(`${GREEN}✅ Final audio generated: ${finalAudio}${RESET}`);
  
  // Step 3: Compare results
  console.log(`\n${BOLD}Step 3: Results Summary${RESET}`);
  
  if (!inputAudio) {
    console.log(`${BLUE}📝 Original text:    "${testText}"${RESET}`);
  }
  console.log(`${BLUE}🎯 Transcription:    "${transcription}"${RESET}`);
  console.log(`${BLUE}📁 Files generated:${RESET}`);
  console.log(`   • ${transcriptFile}`);
  console.log(`   • ${finalAudio}`);
  if (!inputAudio) {
    console.log(`   • ${audioToTranscribe}`);
  }
  
  // Calculate basic similarity if we have original text
  if (!inputAudio) {
    const similarity = calculateSimilarity(testText.toLowerCase(), transcription.toLowerCase());
    console.log(`${BLUE}📊 Text similarity:  ${(similarity * 100).toFixed(1)}%${RESET}`);
  }
  
  console.log(`\n${GREEN}🎉 Round-trip test completed successfully!${RESET}`);
  console.log(`${YELLOW}💡 To test the audio output, play: ${finalAudio}${RESET}`);
}

function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  const allWords = new Set([...words1, ...words2]);
  
  let matches = 0;
  for (const word of allWords) {
    if (words1.includes(word) && words2.includes(word)) {
      matches++;
    }
  }
  
  return matches / allWords.size;
}

// CLI interface
async function main() {
  const args = Deno.args;
  
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`${BOLD}Voice Assistant Round-Trip Test${RESET}
    
Usage: deno run --allow-all scripts/test/roundtrip.ts [options]

Options:
  --input <file>     Input audio file to transcribe (optional)
  --text <text>      Test text to synthesize (default: sample text)
  --whisper <model>  Whisper model size (tiny, base, small, medium, large)
  --tts <model>      TTS model name (default: tacotron2)
  --output <dir>     Output directory (default: test_output)
  --help, -h         Show this help

Examples:
  # Basic round-trip test
  deno run --allow-all scripts/test/roundtrip.ts
  
  # Test with custom text
  deno run --allow-all scripts/test/roundtrip.ts --text "Custom test message"
  
  # Test with existing audio file
  deno run --allow-all scripts/test/roundtrip.ts --input my_audio.wav
  
  # Use different Whisper model
  deno run --allow-all scripts/test/roundtrip.ts --whisper small`);
    return;
  }
  
  if (!await checkDependencies()) {
    Deno.exit(1);
  }
  
  const options: TestOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--input":
        options.inputAudio = args[++i];
        break;
      case "--text":
        options.testText = args[++i];
        break;
      case "--whisper":
        options.whisperModel = args[++i];
        break;
      case "--tts":
        options.ttsModel = args[++i];
        break;
      case "--output":
        options.outputDir = args[++i];
        break;
    }
  }
  
  await runRoundTripTest(options);
}

if (import.meta.main) {
  await main();
}