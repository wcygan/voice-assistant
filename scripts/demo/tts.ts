#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-net
import $ from "https://deno.land/x/dax@0.39.2/mod.ts";

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';

console.log(`${BOLD}${BLUE}🗣️ Text-to-Speech Demo with Coqui TTS${RESET}\n`);
console.log("This demo shows how Coqui TTS can generate natural-sounding speech from text.\n");

interface DemoOptions {
  text?: string;
  model?: string;
  outputFile?: string;
  outputDir?: string;
  interactive?: boolean;
  showcase?: boolean;
  play?: boolean;
}

async function checkDependencies(): Promise<boolean> {
  console.log(`${YELLOW}🔍 Checking Coqui TTS installation...${RESET}`);
  
  // Check if virtual environment exists
  if (!await $`test -d venv`.noThrow()) {
    console.error(`${RED}❌ Python virtual environment not found.${RESET}`);
    console.log(`${CYAN}💡 Run: deno task setup coqui-tts${RESET}`);
    return false;
  }
  
  // Check Coqui TTS
  const ttsCheck = await $`./venv/bin/python -c "import TTS; print('OK')"`.noThrow();
  if (!ttsCheck) {
    console.error(`${RED}❌ Coqui TTS not installed.${RESET}`);
    console.log(`${CYAN}💡 Run: deno task setup coqui-tts${RESET}`);
    return false;
  }
  
  console.log(`${GREEN}✅ Coqui TTS ready for speech synthesis${RESET}\n`);
  return true;
}

async function listAvailableModels(): Promise<void> {
  console.log(`${YELLOW}📋 Available TTS models...${RESET}`);
  
  const pythonScript = `
from TTS.api import TTS
import json

# Get list of available models
api = TTS()
models = api.list_models()

# Filter for English models that work well
recommended_models = [
    "tts_models/en/ljspeech/tacotron2-DDC",
    "tts_models/en/ljspeech/glow-tts", 
    "tts_models/en/ljspeech/speedy-speech",
    "tts_models/en/ljspeech/neural_hmm",
    "tts_models/en/ek1/tacotron2",
    "tts_models/en/jenny/jenny"
]

print("🎤 Recommended English Models:")
for model in recommended_models:
    if model in models.list_models():
        print(f"  • {model}")

print(f"\\n📊 Total available models: {len(models.list_models())}")
`;

  try {
    await Deno.writeTextFile("temp_list_models.py", pythonScript);
    await $`./venv/bin/python temp_list_models.py`;
    await $`rm temp_list_models.py`;
  } catch (error) {
    console.log(`${YELLOW}⚠️ Could not list models: ${error instanceof Error ? error.message : String(error)}${RESET}`);
  }
}

async function synthesizeSpeech(
  text: string, 
  outputPath: string, 
  model: string = "tts_models/en/ljspeech/tacotron2-DDC"
): Promise<{ success: boolean; duration?: number; rtf?: number }> {
  
  console.log(`${YELLOW}🎵 Synthesizing speech...${RESET}`);
  console.log(`${BLUE}📝 Text: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"${RESET}`);
  console.log(`${BLUE}🤖 Model: ${model}${RESET}`);
  console.log(`${BLUE}📁 Output: ${outputPath}${RESET}`);
  
  // Clean text for Python string
  const cleanText = text.replace(/\n/g, ' ').replace(/"/g, '\\"');
  
  const pythonScript = `
import time
from TTS.api import TTS
import torch
import librosa

start_time = time.time()

# Initialize TTS
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

try:
    print("Loading TTS model...")
    tts = TTS(model_name="${model}", progress_bar=False, gpu=False)
    
    load_time = time.time() - start_time
    print(f"Model loaded in {load_time:.2f}s")
    
    # Synthesize
    synthesis_start = time.time()
    text_to_speak = "${cleanText}"
    tts.tts_to_file(text=text_to_speak, file_path="${outputPath}")
    
    synthesis_time = time.time() - synthesis_start
    total_time = time.time() - start_time
    
    # Calculate audio duration for real-time factor
    try:
        import librosa
        audio_duration = librosa.get_duration(path="${outputPath}")
        rtf = synthesis_time / audio_duration
        print(f"✅ Synthesis completed!")
        print(f"📊 Synthesis time: {synthesis_time:.2f}s")
        print(f"📊 Audio duration: {audio_duration:.2f}s") 
        print(f"📊 Real-time factor: {rtf:.2f}x")
        print(f"SUCCESS:{synthesis_time:.2f}:{audio_duration:.2f}:{rtf:.2f}")
    except:
        print(f"✅ Synthesis completed in {synthesis_time:.2f}s")
        print(f"SUCCESS:{synthesis_time:.2f}:0:0")
        
except Exception as e:
    print(f"❌ TTS synthesis failed: {e}")
    print("FAILED")
`;
  
  try {
    await Deno.writeTextFile("temp_tts_demo.py", pythonScript);
    const result = await $`./venv/bin/python temp_tts_demo.py`.text();
    await $`rm temp_tts_demo.py`;
    
    // Parse results
    const lines = result.split('\n');
    const successLine = lines.find(line => line.startsWith('SUCCESS:'));
    
    if (successLine) {
      const [, synthTime, audioDuration, rtf] = successLine.split(':');
      return {
        success: true,
        duration: parseFloat(audioDuration) || undefined,
        rtf: parseFloat(rtf) || undefined
      };
    } else {
      return { success: false };
    }
    
  } catch (error) {
    console.error(`${RED}❌ Speech synthesis failed: ${error instanceof Error ? error.message : String(error)}${RESET}`);
    return { success: false };
  }
}

async function playAudio(filePath: string): Promise<void> {
  try {
    console.log(`\n${YELLOW}🔊 Playing audio...${RESET}`);
    await $`afplay ${filePath}`;
    console.log(`${GREEN}✅ Audio playback complete${RESET}`);
  } catch (error) {
    console.error(`${RED}❌ Failed to play audio: ${error instanceof Error ? error.message : String(error)}${RESET}`);
    console.log(`${CYAN}💡 You can manually play it with: afplay "${filePath}"${RESET}`);
  }
}

function displayResults(outputPath: string, result: { success: boolean; duration?: number; rtf?: number }) {
  if (!result.success) {
    console.error(`${RED}❌ Synthesis failed${RESET}`);
    return;
  }
  
  console.log(`\n${BOLD}${GREEN}🎉 Speech Generated Successfully!${RESET}\n`);
  
  console.log(`${BOLD}📁 Audio File:${RESET} ${CYAN}${outputPath}${RESET}`);
  
  if (result.duration) {
    console.log(`${BOLD}📊 Performance:${RESET}`);
    console.log(`${BLUE}• Audio duration: ${result.duration.toFixed(2)}s${RESET}`);
    if (result.rtf) {
      const performance = result.rtf < 1 ? "faster than real-time" : "slower than real-time";
      console.log(`${BLUE}• Real-time factor: ${result.rtf.toFixed(2)}x (${performance})${RESET}`);
    }
  }
  
  console.log(`\n${BOLD}🎧 To play the audio:${RESET}`);
  console.log(`${CYAN}afplay "${outputPath}"${RESET}  # macOS`);
  console.log(`${CYAN}open "${outputPath}"${RESET}    # macOS (default app)`);
}

async function runShowcase(outputDir: string, autoPlay: boolean = false): Promise<void> {
  console.log(`${BOLD}${MAGENTA}🎪 TTS Showcase - Multiple Examples${RESET}\n`);
  
  const examples = [
    {
      name: "Welcome Message",
      text: "Welcome to the Text-to-Speech showcase! This demonstrates the natural voice synthesis capabilities of Coqui TTS.",
      filename: "welcome.wav"
    },
    {
      name: "Technical Explanation", 
      text: "Text-to-speech technology converts written text into spoken words using neural networks and deep learning algorithms.",
      filename: "technical.wav"
    },
    {
      name: "Emotional Expression",
      text: "Isn't it amazing how technology can give voice to our thoughts and ideas? The future of human-computer interaction is truly exciting!",
      filename: "emotional.wav"
    },
    {
      name: "Numbers and Pronunciation",
      text: "Today is December 25th, 2024. The temperature is 72.5 degrees Fahrenheit, and there are 1,234 people attending the conference.",
      filename: "numbers.wav"
    },
    {
      name: "Complex Sentence Structure",
      text: "Although artificial intelligence has made tremendous progress in recent years, the nuanced art of human communication—with all its subtlety, emotion, and cultural context—remains a fascinating challenge.",
      filename: "complex.wav"
    }
  ];
  
  await $`mkdir -p ${outputDir}`;
  
  for (let i = 0; i < examples.length; i++) {
    const example = examples[i];
    const outputPath = `${outputDir}/${example.filename}`;
    
    console.log(`${YELLOW}🎬 Example ${i + 1}/${examples.length}: ${example.name}${RESET}`);
    console.log(`${BLUE}"${example.text.substring(0, 60)}${example.text.length > 60 ? '...' : ''}"${RESET}`);
    
    const result = await synthesizeSpeech(example.text, outputPath);
    
    if (result.success) {
      console.log(`${GREEN}✅ Generated: ${example.filename}${RESET}`);
      if (result.rtf) {
        console.log(`${BLUE}   Real-time factor: ${result.rtf.toFixed(2)}x${RESET}`);
      }
      
      // Auto-play if requested
      if (autoPlay) {
        await playAudio(outputPath);
      }
    } else {
      console.log(`${RED}❌ Failed: ${example.filename}${RESET}`);
    }
    console.log();
  }
  
  console.log(`${BOLD}${GREEN}🎪 Showcase Complete!${RESET}\n`);
  console.log(`${BOLD}📁 All audio files saved to: ${outputDir}/${RESET}`);
  console.log(`\n${BOLD}🎧 Play all examples:${RESET}`);
  examples.forEach(ex => {
    console.log(`${CYAN}afplay "${outputDir}/${ex.filename}"${RESET}`);
  });
}

async function runInteractiveMode(outputDir: string): Promise<void> {
  console.log(`${BOLD}${MAGENTA}🎙️ Interactive TTS Mode${RESET}\n`);
  console.log("Enter text to synthesize (type 'quit' to exit):\n");
  
  await $`mkdir -p ${outputDir}`;
  let counter = 1;
  
  while (true) {
    const input = prompt(`${CYAN}Enter text:${RESET} `);
    
    if (!input || input.toLowerCase().trim() === 'quit') {
      console.log(`${GREEN}👋 Goodbye!${RESET}`);
      break;
    }
    
    const outputPath = `${outputDir}/interactive_${counter.toString().padStart(3, '0')}.wav`;
    const result = await synthesizeSpeech(input, outputPath);
    
    if (result.success) {
      console.log(`${GREEN}✅ Audio generated: ${outputPath}${RESET}`);
      
      // Ask if user wants to play the audio
      const playNow = prompt(`${CYAN}Play audio now? (y/n):${RESET} `);
      if (playNow?.toLowerCase().startsWith('y')) {
        await playAudio(outputPath);
      } else {
        console.log(`${CYAN}💡 Play later with: afplay "${outputPath}"${RESET}`);
      }
      console.log();
    } else {
      console.log(`${RED}❌ Generation failed${RESET}\n`);
    }
    
    counter++;
  }
}

async function runTTSDemo(options: DemoOptions = {}): Promise<void> {
  const {
    text,
    model = "tts_models/en/ljspeech/tacotron2-DDC",
    outputFile,
    outputDir = "demo_output",
    interactive = false,
    showcase = false,
    play = false
  } = options;
  
  // Create output directory
  await $`mkdir -p ${outputDir}`;
  
  if (showcase) {
    await runShowcase(outputDir, play);
    return;
  }
  
  if (interactive) {
    await runInteractiveMode(outputDir);
    return;
  }
  
  if (!text) {
    console.log(`${YELLOW}📝 No text provided. Here are your options:${RESET}\n`);
    console.log(`${CYAN}• Provide text: deno task demo:tts --text "Hello world"${RESET}`);
    console.log(`${CYAN}• Interactive mode: deno task demo:tts --interactive${RESET}`);
    console.log(`${CYAN}• See showcase: deno task demo:tts --showcase${RESET}`);
    console.log(`${CYAN}• Get help: deno task demo:tts --help${RESET}\n`);
    
    // Show available models
    await listAvailableModels();
    return;
  }
  
  const outputPath = outputFile || `${outputDir}/tts_output.wav`;
  
  // Synthesize speech
  const result = await synthesizeSpeech(text, outputPath, model);
  
  // Display results
  displayResults(outputPath, result);
  
  if (result.success) {
    // Auto-play if requested
    if (play) {
      await playAudio(outputPath);
    }
    
    console.log(`\n${BOLD}🚀 What's Next?${RESET}`);
    console.log(`${CYAN}• Try different models: --model tts_models/en/ljspeech/glow-tts${RESET}`);
    console.log(`${CYAN}• See the showcase: deno task demo:tts --showcase${RESET}`);
    console.log(`${CYAN}• Try interactive mode: deno task demo:tts --interactive${RESET}`);
    console.log(`${CYAN}• Test the full pipeline: deno task test:roundtrip${RESET}`);
  }
}

// CLI interface
async function main() {
  const args = Deno.args;
  
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`${BOLD}Text-to-Speech Demo${RESET}

Usage: deno task demo:tts [options]

Options:
  --text <text>      Text to synthesize into speech
  --interactive      Interactive mode - enter text repeatedly  
  --showcase         Generate multiple examples showcasing TTS capabilities
  --model <name>     TTS model to use (default: tacotron2-DDC)
  --output <file>    Output audio file path
  --output-dir <dir> Output directory (default: demo_output)
  --play             Automatically play the generated audio
  --help, -h         Show this help

Examples:
  # Basic synthesis
  deno task demo:tts --text "Hello, this is a TTS demo!"
  
  # Synthesize and play automatically
  deno task demo:tts --text "Hello, world!" --play
  
  # Interactive mode
  deno task demo:tts --interactive
  
  # Showcase multiple examples
  deno task demo:tts --showcase
  
  # Use different model
  deno task demo:tts --text "Testing voice quality" --model tts_models/en/ljspeech/glow-tts
  
  # Custom output with auto-play
  deno task demo:tts --text "Save me here" --output my_speech.wav --play`);
    return;
  }
  
  if (!await checkDependencies()) {
    Deno.exit(1);
  }
  
  const options: DemoOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--text":
        options.text = args[++i];
        break;
      case "--interactive":
        options.interactive = true;
        break;
      case "--showcase":
        options.showcase = true;
        break;
      case "--model":
        options.model = args[++i];
        break;
      case "--output":
        options.outputFile = args[++i];
        break;
      case "--output-dir":
        options.outputDir = args[++i];
        break;
      case "--play":
        options.play = true;
        break;
    }
  }
  
  await runTTSDemo(options);
}

if (import.meta.main) {
  await main();
}