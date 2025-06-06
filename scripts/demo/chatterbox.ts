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

console.log(`${BOLD}${MAGENTA}🎭 Chatterbox TTS Demo - Emotion-Controlled Speech${RESET}\n`);
console.log("This demo showcases Chatterbox's unique ability to control emotional expression in synthesized speech.\n");

interface ChatterboxOptions {
  text?: string;
  emotion?: string;
  exaggeration?: number;
  cfgWeight?: number;
  voiceRef?: string;
  outputDir?: string;
  interactive?: boolean;
  showcase?: boolean;
}

// Emotion presets matching the Python example
const emotionPresets: Record<string, { exaggeration: number; cfgWeight: number; description: string }> = {
  "neutral": { exaggeration: 0.3, cfgWeight: 1.0, description: "Balanced, professional tone" },
  "happy": { exaggeration: 0.7, cfgWeight: 1.2, description: "Cheerful and upbeat" },
  "excited": { exaggeration: 0.9, cfgWeight: 1.5, description: "High energy and enthusiastic" },
  "sad": { exaggeration: 0.5, cfgWeight: 0.7, description: "Subdued and melancholic" },
  "calm": { exaggeration: 0.1, cfgWeight: 0.8, description: "Soothing and reassuring" },
  "serious": { exaggeration: 0.2, cfgWeight: 1.3, description: "Authoritative and firm" },
  "empathetic": { exaggeration: 0.4, cfgWeight: 0.9, description: "Understanding and caring" },
  "curious": { exaggeration: 0.6, cfgWeight: 1.1, description: "Inquisitive and thoughtful" }
};

async function checkDependencies(): Promise<boolean> {
  console.log(`${YELLOW}🔍 Checking Chatterbox TTS installation...${RESET}`);
  
  // Check virtual environment
  if (!await $`test -d venv`.noThrow()) {
    console.error(`${RED}❌ Python virtual environment not found.${RESET}`);
    console.log(`${CYAN}💡 Run: deno task setup chatterbox${RESET}`);
    return false;
  }
  
  // Check PyTorch and CUDA
  const torchCheck = await $`./venv/bin/python -c "import torch; print(f'CUDA: {torch.cuda.is_available()}')"`.noThrow();
  if (!torchCheck) {
    console.error(`${RED}❌ PyTorch not installed properly.${RESET}`);
    console.log(`${CYAN}💡 Run: deno task setup chatterbox${RESET}`);
    return false;
  }
  
  // Check Chatterbox
  const chatterboxCheck = await $`./venv/bin/python -c "from chatterbox.tts import ChatterboxTTS; print('OK')"`.noThrow();
  if (!chatterboxCheck) {
    console.error(`${RED}❌ Chatterbox TTS not installed.${RESET}`);
    console.log(`${CYAN}💡 Run: deno task setup chatterbox${RESET}`);
    return false;
  }
  
  console.log(`${GREEN}✅ Chatterbox TTS ready for emotion-controlled synthesis${RESET}\n`);
  return true;
}

async function synthesizeWithEmotion(
  text: string,
  outputPath: string,
  emotion: string = "neutral",
  customExaggeration?: number,
  customCfgWeight?: number,
  voiceRef?: string
): Promise<{ success: boolean; duration?: number }> {
  
  const settings = emotionPresets[emotion] || emotionPresets.neutral;
  const exaggeration = customExaggeration ?? settings.exaggeration;
  const cfgWeight = customCfgWeight ?? settings.cfgWeight;
  
  console.log(`${YELLOW}🎭 Synthesizing with ${emotion.toUpperCase()} emotion...${RESET}`);
  console.log(`${BLUE}📝 Text: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"${RESET}`);
  console.log(`${BLUE}🎛️ Settings: exaggeration=${exaggeration}, cfg_weight=${cfgWeight}${RESET}`);
  if (voiceRef) {
    console.log(`${BLUE}🎤 Voice reference: ${voiceRef}${RESET}`);
  }
  
  const cleanText = text.replace(/\n/g, ' ').replace(/"/g, '\\"');
  
  const pythonScript = `
import time
from chatterbox.tts import ChatterboxTTS
import torch
import torchaudio as ta

start_time = time.time()

# Initialize TTS
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

try:
    print("Loading Chatterbox model...")
    model = ChatterboxTTS.from_pretrained(device=device)
    
    load_time = time.time() - start_time
    print(f"Model loaded in {load_time:.2f}s")
    
    # Synthesize with emotion
    synthesis_start = time.time()
    text_to_speak = "${cleanText}"
    
    ${voiceRef ? `
    # Generate with voice cloning
    wav = model.generate(
        text_to_speak,
        audio_prompt_path="${voiceRef}",
        exaggeration=${exaggeration},
        cfg_weight=${cfgWeight}
    )
    ` : `
    # Generate with default voice
    wav = model.generate(
        text_to_speak,
        exaggeration=${exaggeration},
        cfg_weight=${cfgWeight}
    )
    `}
    
    # Save output
    ta.save("${outputPath}", wav, model.sr)
    
    synthesis_time = time.time() - synthesis_start
    total_time = time.time() - start_time
    
    # Calculate audio duration
    audio_duration = wav.shape[-1] / model.sr
    
    print(f"✅ Synthesis completed!")
    print(f"📊 Synthesis time: {synthesis_time:.2f}s")
    print(f"📊 Audio duration: {audio_duration:.2f}s")
    print(f"📊 Total time: {total_time:.2f}s")
    print(f"SUCCESS:{synthesis_time:.2f}:{audio_duration:.2f}")
    
except Exception as e:
    print(f"❌ Chatterbox synthesis failed: {e}")
    print("FAILED")
`;
  
  try {
    await Deno.writeTextFile("temp_chatterbox_demo.py", pythonScript);
    const result = await $`./venv/bin/python temp_chatterbox_demo.py`.text();
    await $`rm temp_chatterbox_demo.py`;
    
    // Parse results
    const lines = result.split('\n');
    const successLine = lines.find(line => line.startsWith('SUCCESS:'));
    
    if (successLine) {
      const [, synthTime, audioDuration] = successLine.split(':');
      return {
        success: true,
        duration: parseFloat(audioDuration) || undefined
      };
    } else {
      return { success: false };
    }
    
  } catch (error) {
    console.error(`${RED}❌ Speech synthesis failed: ${error.message}${RESET}`);
    return { success: false };
  }
}

async function runShowcase(outputDir: string): Promise<void> {
  console.log(`${BOLD}${MAGENTA}🎪 Chatterbox Emotion Showcase${RESET}\n`);
  
  const scenarios = [
    {
      name: "Customer Service - Greeting",
      text: "Hello! Welcome to our support center. I'm here to help you with any questions or concerns you might have today.",
      emotion: "happy",
      filename: "service_greeting.wav"
    },
    {
      name: "Breaking News Alert",
      text: "Breaking news: A major scientific breakthrough has been announced. Researchers have made an incredible discovery that could change everything!",
      emotion: "excited",
      filename: "news_alert.wav"
    },
    {
      name: "Empathetic Response",
      text: "I understand this must be really difficult for you. Please know that you're not alone, and I'm here to support you through this.",
      emotion: "empathetic",
      filename: "empathetic_response.wav"
    },
    {
      name: "Safety Warning",
      text: "Warning: Severe weather alert in your area. Please seek shelter immediately and stay away from windows. Your safety is our primary concern.",
      emotion: "serious",
      filename: "safety_warning.wav"
    },
    {
      name: "Meditation Guide",
      text: "Take a deep breath in... and slowly let it out. Allow your body to relax and your mind to find peace in this moment.",
      emotion: "calm",
      filename: "meditation_guide.wav"
    },
    {
      name: "Curious Assistant",
      text: "That's a fascinating question! Let me think about this for a moment... I wonder if we could explore this from a different angle?",
      emotion: "curious",
      filename: "curious_assistant.wav"
    },
    {
      name: "Sad News Delivery",
      text: "I'm sorry to inform you that your request could not be processed at this time. I understand this may be disappointing.",
      emotion: "sad",
      filename: "sad_news.wav"
    },
    {
      name: "Neutral Information",
      text: "Your account balance is three hundred and forty-two dollars and fifty cents. Would you like to perform any other transactions?",
      emotion: "neutral",
      filename: "neutral_info.wav"
    }
  ];
  
  await $`mkdir -p ${outputDir}`;
  
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    const outputPath = `${outputDir}/${scenario.filename}`;
    
    console.log(`${YELLOW}🎬 Scenario ${i + 1}/${scenarios.length}: ${scenario.name}${RESET}`);
    
    const result = await synthesizeWithEmotion(
      scenario.text,
      outputPath,
      scenario.emotion
    );
    
    if (result.success) {
      console.log(`${GREEN}✅ Generated: ${scenario.filename}${RESET}`);
      const preset = emotionPresets[scenario.emotion];
      console.log(`${CYAN}   ${preset.description}${RESET}`);
      
      // Auto-play the generated audio
      console.log(`${BOLD}🎧 Playing...${RESET}`);
      try {
        await $`afplay "${outputPath}"`;
      } catch (error) {
        console.log(`${YELLOW}⚠️ Could not auto-play audio${RESET}`);
      }
    } else {
      console.log(`${RED}❌ Failed: ${scenario.filename}${RESET}`);
    }
    console.log();
  }
  
  console.log(`${BOLD}${GREEN}🎪 Showcase Complete!${RESET}\n`);
  console.log(`${BOLD}📁 All audio files saved to: ${outputDir}/${RESET}`);
  console.log(`\n${BOLD}🎧 Play examples:${RESET}`);
  scenarios.forEach(s => {
    console.log(`${CYAN}afplay "${outputDir}/${s.filename}" # ${s.name} (${s.emotion})${RESET}`);
  });
}

async function runInteractiveMode(outputDir: string): Promise<void> {
  console.log(`${BOLD}${MAGENTA}🎙️ Interactive Chatterbox Mode${RESET}\n`);
  console.log("Control emotional expression in real-time!\n");
  
  await $`mkdir -p ${outputDir}`;
  let counter = 1;
  
  // Show available emotions
  console.log(`${BOLD}Available Emotions:${RESET}`);
  for (const [emotion, settings] of Object.entries(emotionPresets)) {
    console.log(`${CYAN}• ${emotion}: ${settings.description}${RESET}`);
  }
  console.log();
  
  while (true) {
    const text = prompt(`${CYAN}Enter text (or 'quit' to exit):${RESET} `);
    
    if (!text || text.toLowerCase().trim() === 'quit') {
      console.log(`${GREEN}👋 Goodbye!${RESET}`);
      break;
    }
    
    // Get emotion
    console.log(`${YELLOW}Available emotions: ${Object.keys(emotionPresets).join(', ')}${RESET}`);
    const emotion = prompt(`${CYAN}Choose emotion (default: neutral):${RESET} `) || "neutral";
    
    if (!emotionPresets[emotion]) {
      console.log(`${RED}Unknown emotion. Using neutral.${RESET}`);
    }
    
    // Optional: custom parameters
    const customParams = prompt(`${CYAN}Custom parameters? (y/N):${RESET} `);
    let exaggeration: number | undefined;
    let cfgWeight: number | undefined;
    
    if (customParams?.toLowerCase() === 'y') {
      const exagStr = prompt(`${CYAN}Exaggeration (0.1-0.9):${RESET} `);
      const cfgStr = prompt(`${CYAN}CFG Weight (0.1-1.5):${RESET} `);
      
      if (exagStr) exaggeration = parseFloat(exagStr);
      if (cfgStr) cfgWeight = parseFloat(cfgStr);
    }
    
    const outputPath = `${outputDir}/chatterbox_${counter.toString().padStart(3, '0')}_${emotion}.wav`;
    const result = await synthesizeWithEmotion(text, outputPath, emotion, exaggeration, cfgWeight);
    
    if (result.success) {
      console.log(`${GREEN}✅ Audio generated: ${outputPath}${RESET}`);
      console.log(`${BOLD}🎧 Playing audio...${RESET}`);
      try {
        await $`afplay "${outputPath}"`;
        console.log(`${GREEN}✅ Audio playback complete${RESET}\n`);
      } catch (error) {
        console.log(`${YELLOW}⚠️ Could not auto-play audio. To play manually:${RESET}`);
        console.log(`${CYAN}afplay "${outputPath}"${RESET}\n`);
      }
    } else {
      console.log(`${RED}❌ Generation failed${RESET}\n`);
    }
    
    counter++;
  }
}

async function runChatterboxDemo(options: ChatterboxOptions = {}): Promise<void> {
  const {
    text,
    emotion = "neutral",
    exaggeration,
    cfgWeight,
    voiceRef,
    outputDir = "demo_output",
    interactive = false,
    showcase = false
  } = options;
  
  // Create output directory
  await $`mkdir -p ${outputDir}`;
  
  if (showcase) {
    await runShowcase(outputDir);
    return;
  }
  
  if (interactive) {
    await runInteractiveMode(outputDir);
    return;
  }
  
  if (!text) {
    console.log(`${YELLOW}📝 No text provided. Here are your options:${RESET}\n`);
    console.log(`${CYAN}• Provide text: deno task demo:chatterbox --text "Your message" --emotion happy${RESET}`);
    console.log(`${CYAN}• Interactive mode: deno task demo:chatterbox --interactive${RESET}`);
    console.log(`${CYAN}• See showcase: deno task demo:chatterbox --showcase${RESET}`);
    console.log(`${CYAN}• Voice cloning: deno task demo:chatterbox --text "Hello" --voice reference.wav${RESET}`);
    console.log(`${CYAN}• Get help: deno task demo:chatterbox --help${RESET}\n`);
    
    // Show emotion presets
    console.log(`${BOLD}🎭 Available Emotions:${RESET}`);
    for (const [name, settings] of Object.entries(emotionPresets)) {
      console.log(`${CYAN}• ${name}: ${settings.description}${RESET}`);
      console.log(`  ${BLUE}exaggeration=${settings.exaggeration}, cfg_weight=${settings.cfgWeight}${RESET}`);
    }
    return;
  }
  
  const outputPath = `${outputDir}/chatterbox_${emotion}.wav`;
  
  // Synthesize with emotion
  const result = await synthesizeWithEmotion(text, outputPath, emotion, exaggeration, cfgWeight, voiceRef);
  
  if (result.success) {
    console.log(`\n${BOLD}${GREEN}🎉 Emotion-Controlled Speech Generated!${RESET}\n`);
    console.log(`${BOLD}📁 Audio File:${RESET} ${CYAN}${outputPath}${RESET}`);
    console.log(`${BOLD}🎭 Emotion:${RESET} ${emotion} - ${emotionPresets[emotion]?.description || 'Custom'}`);
    
    if (result.duration) {
      console.log(`${BOLD}📊 Duration:${RESET} ${result.duration.toFixed(2)}s`);
    }
    
    console.log(`\n${BOLD}🎧 Playing audio...${RESET}`);
    try {
      await $`afplay "${outputPath}"`;
      console.log(`${GREEN}✅ Audio playback complete${RESET}`);
    } catch (error) {
      console.log(`${YELLOW}⚠️ Could not auto-play audio. To play manually:${RESET}`);
      console.log(`${CYAN}afplay "${outputPath}"${RESET}`);
    }
    
    console.log(`\n${BOLD}🚀 What's Next?${RESET}`);
    console.log(`${CYAN}• Try different emotions: --emotion excited${RESET}`);
    console.log(`${CYAN}• Fine-tune parameters: --exaggeration 0.8 --cfg-weight 1.2${RESET}`);
    console.log(`${CYAN}• Clone a voice: --voice your_voice.wav${RESET}`);
    console.log(`${CYAN}• See all examples: deno task demo:chatterbox --showcase${RESET}`);
  }
}

// CLI interface
async function main() {
  const args = Deno.args;
  
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`${BOLD}Chatterbox TTS Demo - Emotion-Controlled Speech${RESET}

Usage: deno task demo:chatterbox [options]

Options:
  --text <text>         Text to synthesize with emotion
  --emotion <name>      Emotion preset (default: neutral)
  --exaggeration <0-1>  Custom emotion intensity
  --cfg-weight <0-1.5>  Custom control strength
  --voice <file>        Voice reference file for cloning
  --interactive         Interactive mode with emotion selection
  --showcase            Generate examples of all emotions
  --output-dir <dir>    Output directory (default: demo_output)
  --help, -h            Show this help

Available Emotions:
  neutral    - Balanced, professional tone
  happy      - Cheerful and upbeat
  excited    - High energy and enthusiastic
  sad        - Subdued and melancholic
  calm       - Soothing and reassuring
  serious    - Authoritative and firm
  empathetic - Understanding and caring
  curious    - Inquisitive and thoughtful

Examples:
  # Basic emotion synthesis
  deno task demo:chatterbox --text "Hello world!" --emotion happy
  
  # Custom emotion parameters
  deno task demo:chatterbox --text "Important message" --exaggeration 0.7 --cfg-weight 1.3
  
  # Voice cloning with emotion
  deno task demo:chatterbox --text "Clone my voice" --voice reference.wav --emotion excited
  
  # Interactive mode
  deno task demo:chatterbox --interactive
  
  # Showcase all emotions
  deno task demo:chatterbox --showcase`);
    return;
  }
  
  if (!await checkDependencies()) {
    Deno.exit(1);
  }
  
  const options: ChatterboxOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--text":
        options.text = args[++i];
        break;
      case "--emotion":
        options.emotion = args[++i];
        break;
      case "--exaggeration":
        options.exaggeration = parseFloat(args[++i]);
        break;
      case "--cfg-weight":
        options.cfgWeight = parseFloat(args[++i]);
        break;
      case "--voice":
        options.voiceRef = args[++i];
        break;
      case "--interactive":
        options.interactive = true;
        break;
      case "--showcase":
        options.showcase = true;
        break;
      case "--output-dir":
        options.outputDir = args[++i];
        break;
    }
  }
  
  await runChatterboxDemo(options);
}

if (import.meta.main) {
  await main();
}