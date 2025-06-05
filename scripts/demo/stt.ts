#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-net
import $ from "https://deno.land/x/dax@0.39.2/mod.ts";

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';

console.log(`${BOLD}${BLUE}🎯 Speech-to-Text Demo with Whisper${RESET}\n`);
console.log("This demo shows how Whisper can transcribe audio files with high accuracy.\n");

interface DemoOptions {
  inputAudio?: string;
  model?: string;
  language?: string;
  outputDir?: string;
  generateSample?: boolean;
}

async function checkDependencies(): Promise<boolean> {
  console.log(`${YELLOW}🔍 Checking Whisper installation...${RESET}`);
  
  // Check if virtual environment exists
  if (!await $`test -d venv`.noThrow()) {
    console.error(`${RED}❌ Python virtual environment not found.${RESET}`);
    console.log(`${CYAN}💡 Run: deno task setup whisper${RESET}`);
    return false;
  }
  
  // Check Whisper
  const whisperCheck = await $`./venv/bin/python -c "import whisper; print('OK')"`.noThrow();
  if (!whisperCheck) {
    console.error(`${RED}❌ Whisper not installed.${RESET}`);
    console.log(`${CYAN}💡 Run: deno task setup whisper${RESET}`);
    return false;
  }
  
  console.log(`${GREEN}✅ Whisper ready for transcription${RESET}\n`);
  return true;
}

async function generateSampleAudio(outputPath: string): Promise<boolean> {
  console.log(`${YELLOW}🎵 Generating sample audio for demo...${RESET}`);
  
  // Check if we have TTS available
  const ttsCheck = await $`./venv/bin/python -c "import TTS; print('OK')"`.noThrow();
  
  if (ttsCheck) {
    // Use Coqui TTS if available
    const pythonScript = `
from TTS.api import TTS
import torch

device = "cuda" if torch.cuda.is_available() else "cpu"
tts = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", progress_bar=False, gpu=False)

sample_texts = [
    "Welcome to the Speech-to-Text demo using OpenAI Whisper.",
    "This technology can transcribe human speech with remarkable accuracy.",
    "Try speaking clearly into your microphone for best results.",
    "Whisper supports multiple languages and can handle various accents."
]

full_text = " ".join(sample_texts)
tts.tts_to_file(text=full_text, file_path="${outputPath}")
print("✅ Sample audio generated")
`;
    
    try {
      await Deno.writeTextFile("temp_demo_audio.py", pythonScript);
      await $`./venv/bin/python temp_demo_audio.py`;
      await $`rm temp_demo_audio.py`;
      return true;
    } catch (error) {
      console.log(`${YELLOW}⚠️ TTS not available, using system speech synthesis...${RESET}`);
    }
  }
  
  // Fallback to system speech synthesis
  try {
    const sampleText = "Welcome to the Speech-to-Text demo using OpenAI Whisper. This technology can transcribe human speech with remarkable accuracy. Try speaking clearly into your microphone for best results.";
    await $`say "${sampleText}" --output-file="${outputPath}" --data-format=LEF32@22050`;
    return true;
  } catch (error) {
    console.error(`${RED}❌ Could not generate sample audio: ${error.message}${RESET}`);
    return false;
  }
}

async function transcribeWithWhisper(
  audioPath: string, 
  model: string = "base", 
  language?: string,
  outputDir: string = "demo_output"
): Promise<{ text: string; details: any } | null> {
  
  console.log(`${YELLOW}🎯 Transcribing with Whisper...${RESET}`);
  console.log(`${BLUE}📁 Input: ${audioPath}${RESET}`);
  console.log(`${BLUE}🤖 Model: ${model}${RESET}`);
  if (language) console.log(`${BLUE}🌍 Language: ${language}${RESET}`);
  
  const languageFlag = language ? `--language ${language}` : "";
  
  try {
    // Create output directory
    await $`mkdir -p ${outputDir}`;
    
    // Run Whisper with verbose output to get timing information
    const whisperCmd = `./venv/bin/whisper "${audioPath}" --model ${model} ${languageFlag} --fp16 False --output_format json --output_format txt --output_dir ${outputDir} --verbose False`;
    
    console.log(`${CYAN}⏳ Processing audio... (this may take a moment)${RESET}`);
    await $`${whisperCmd}`.quiet();
    
    // Read the results
    const baseName = audioPath.split('/').pop()?.split('.')[0] || "audio";
    const txtFile = `${outputDir}/${baseName}.txt`;
    const jsonFile = `${outputDir}/${baseName}.json`;
    
    if (await $`test -f ${txtFile}`.noThrow() && await $`test -f ${jsonFile}`.noThrow()) {
      const transcriptText = await Deno.readTextFile(txtFile);
      const transcriptJson = JSON.parse(await Deno.readTextFile(jsonFile));
      
      return {
        text: transcriptText.trim(),
        details: transcriptJson
      };
    } else {
      console.error(`${RED}❌ Transcript files not found${RESET}`);
      return null;
    }
    
  } catch (error) {
    console.error(`${RED}❌ Whisper transcription failed: ${error.message}${RESET}`);
    return null;
  }
}

function displayResults(result: { text: string; details: any }, audioPath: string) {
  console.log(`\n${BOLD}${GREEN}🎉 Transcription Complete!${RESET}\n`);
  
  console.log(`${BOLD}📝 Transcript:${RESET}`);
  console.log(`${CYAN}"${result.text}"${RESET}\n`);
  
  // Show confidence and timing info if available
  if (result.details.segments && result.details.segments.length > 0) {
    console.log(`${BOLD}📊 Analysis:${RESET}`);
    console.log(`${BLUE}• Duration: ${result.details.segments[result.details.segments.length - 1].end.toFixed(1)}s${RESET}`);
    console.log(`${BLUE}• Language: ${result.details.language || 'auto-detected'}${RESET}`);
    console.log(`${BLUE}• Segments: ${result.details.segments.length}${RESET}`);
    
    // Show first few segments with timing
    console.log(`\n${BOLD}⏱️ Timed Segments:${RESET}`);
    result.details.segments.slice(0, 3).forEach((segment: any, i: number) => {
      const start = segment.start.toFixed(1);
      const end = segment.end.toFixed(1);
      const text = segment.text.trim();
      console.log(`${YELLOW}[${start}s → ${end}s]${RESET} ${text}`);
    });
    
    if (result.details.segments.length > 3) {
      console.log(`${YELLOW}... and ${result.details.segments.length - 3} more segments${RESET}`);
    }
  }
  
  console.log(`\n${BOLD}📁 Files saved to: demo_output/${RESET}`);
  console.log(`${BLUE}• Text: demo_output/${audioPath.split('/').pop()?.split('.')[0]}.txt${RESET}`);
  console.log(`${BLUE}• JSON: demo_output/${audioPath.split('/').pop()?.split('.')[0]}.json${RESET}`);
}

async function runSTTDemo(options: DemoOptions = {}): Promise<void> {
  const {
    inputAudio,
    model = "base",
    language,
    outputDir = "demo_output",
    generateSample = false
  } = options;
  
  let audioToTranscribe: string;
  
  if (inputAudio) {
    console.log(`${BLUE}📁 Using provided audio: ${inputAudio}${RESET}\n`);
    
    if (!await $`test -f ${inputAudio}`.noThrow()) {
      console.error(`${RED}❌ Audio file not found: ${inputAudio}${RESET}`);
      return;
    }
    audioToTranscribe = inputAudio;
    
  } else if (generateSample) {
    console.log(`${BLUE}🎬 Generating sample audio for demo${RESET}\n`);
    audioToTranscribe = `${outputDir}/demo_sample.wav`;
    await $`mkdir -p ${outputDir}`;
    
    if (!await generateSampleAudio(audioToTranscribe)) {
      console.error(`${RED}❌ Could not generate sample audio${RESET}`);
      return;
    }
    
    console.log(`${GREEN}✅ Sample audio ready: ${audioToTranscribe}${RESET}\n`);
    
  } else {
    console.log(`${YELLOW}🎤 Please provide an audio file or use --sample to generate one${RESET}`);
    console.log(`${CYAN}💡 Example: deno task demo:stt --input your_audio.wav${RESET}`);
    console.log(`${CYAN}💡 Or try: deno task demo:stt --sample${RESET}`);
    return;
  }
  
  // Transcribe the audio
  const result = await transcribeWithWhisper(audioToTranscribe, model, language, outputDir);
  
  if (!result) {
    console.error(`${RED}❌ STT demo failed${RESET}`);
    return;
  }
  
  // Display results
  displayResults(result, audioToTranscribe);
  
  // Show next steps
  console.log(`\n${BOLD}🚀 What's Next?${RESET}`);
  console.log(`${CYAN}• Try different models: tiny, small, medium, large${RESET}`);
  console.log(`${CYAN}• Test with different languages: --language es, fr, de, etc.${RESET}`);
  console.log(`${CYAN}• Record your own audio and test transcription accuracy${RESET}`);
  console.log(`${CYAN}• Run the full pipeline: deno task test:roundtrip${RESET}`);
}

// CLI interface
async function main() {
  const args = Deno.args;
  
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`${BOLD}Speech-to-Text Demo${RESET}

Usage: deno task demo:stt [options]

Options:
  --input <file>     Audio file to transcribe (.wav, .mp3, .m4a, etc.)
  --sample           Generate a sample audio file for demo
  --model <size>     Whisper model: tiny, base, small, medium, large (default: base)
  --language <code>  Language code: en, es, fr, de, etc. (auto-detect if not specified)
  --output <dir>     Output directory (default: demo_output)
  --help, -h         Show this help

Examples:
  # Generate sample and transcribe
  deno task demo:stt --sample
  
  # Transcribe your audio file  
  deno task demo:stt --input recording.wav
  
  # Use different model and language
  deno task demo:stt --input spanish.wav --model small --language es
  
  # High accuracy transcription
  deno task demo:stt --input interview.wav --model large`);
    return;
  }
  
  if (!await checkDependencies()) {
    Deno.exit(1);
  }
  
  const options: DemoOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--input":
        options.inputAudio = args[++i];
        break;
      case "--sample":
        options.generateSample = true;
        break;
      case "--model":
        options.model = args[++i];
        break;
      case "--language":
        options.language = args[++i];
        break;
      case "--output":
        options.outputDir = args[++i];
        break;
    }
  }
  
  await runSTTDemo(options);
}

if (import.meta.main) {
  await main();
}