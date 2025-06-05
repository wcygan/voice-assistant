#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-net
import $ from "https://deno.land/x/dax@0.39.2/mod.ts";

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';

console.log(`${BOLD}${BLUE}🎤 Voice Assistant Model Setup${RESET}\n`);

// Available setup scripts
const setupScripts = {
  stt: {
    whisper: "scripts/setup/stt/whisper.ts",
    vosk: "scripts/setup/stt/vosk.ts",
    "coqui-stt": "scripts/setup/stt/coqui-stt.ts",
    deepspeech: "scripts/setup/stt/deepspeech.ts"
  },
  tts: {
    "coqui-tts": "scripts/setup/tts/coqui-tts.ts",
    piper: "scripts/setup/tts/piper.ts",
    "espeak-ng": "scripts/setup/tts/espeak-ng.ts",
    chatterbox: "scripts/setup/tts/chatterbox.ts",
    dia: "scripts/setup/tts/dia.ts"
  },
  llm: {
    ollama: "scripts/setup/llm/ollama.ts"
  }
};

function displayMenu() {
  console.log(`${BOLD}Available Models:${RESET}`);
  console.log(`\n${YELLOW}Speech-to-Text (STT):${RESET}`);
  console.log("  1. whisper     - OpenAI Whisper (accurate, GPU optional)");
  console.log("  2. vosk        - Offline recognition (lightweight)");
  console.log("  3. coqui-stt   - Coqui STT (customizable)");
  console.log("  4. deepspeech  - Mozilla DeepSpeech (offline, CPU-based)");
  
  console.log(`\n${YELLOW}Text-to-Speech (TTS):${RESET}`);
  console.log("  5. coqui-tts   - Coqui TTS (high quality)");
  console.log("  6. piper       - Fast neural TTS");
  console.log("  7. espeak-ng   - Traditional TTS (lightweight)");
  console.log("  8. chatterbox  - Emotion control TTS (GPU required)");
  console.log("  9. dia         - Dialogue TTS (GPU required, HF token)");
  
  console.log(`\n${YELLOW}Large Language Model (LLM):${RESET}`);
  console.log("  10. ollama     - Local LLM runner");
  
  console.log(`\n${YELLOW}Batch Options:${RESET}`);
  console.log("  11. stt-all    - Install all STT models");
  console.log("  12. tts-all    - Install all TTS models");
  console.log("  13. all        - Install all models");
  console.log("  0. exit        - Exit setup");
}

async function runSetupScript(scriptPath: string, modelName: string) {
  console.log(`\n${BOLD}${GREEN}Setting up ${modelName}...${RESET}`);
  try {
    await $`deno run --allow-run --allow-read --allow-write --allow-net ${scriptPath}`;
    console.log(`${GREEN}✅ ${modelName} setup completed${RESET}\n`);
  } catch (error) {
    console.error(`${YELLOW}❌ ${modelName} setup failed: ${error.message}${RESET}\n`);
  }
}

async function runBatchSetup(category: string) {
  const scripts = setupScripts[category as keyof typeof setupScripts];
  for (const [name, path] of Object.entries(scripts)) {
    await runSetupScript(path, name);
  }
}

async function runAllSetup() {
  console.log(`${BOLD}${BLUE}Installing all models...${RESET}\n`);
  
  for (const [category, scripts] of Object.entries(setupScripts)) {
    console.log(`${BOLD}${YELLOW}Setting up ${category.toUpperCase()} models...${RESET}`);
    for (const [name, path] of Object.entries(scripts)) {
      await runSetupScript(path, name);
    }
  }
}

// Main interactive loop
async function main() {
  const args = Deno.args;
  
  // Handle command line arguments
  if (args.length > 0) {
    const command = args[0];
    
    if (command === "all") {
      await runAllSetup();
      return;
    }
    
    if (command === "stt-all") {
      await runBatchSetup("stt");
      return;
    }
    
    if (command === "tts-all") {
      await runBatchSetup("tts");
      return;
    }
    
    // Check if it's a specific model
    for (const [category, scripts] of Object.entries(setupScripts)) {
      if (scripts[command as keyof typeof scripts]) {
        await runSetupScript(scripts[command as keyof typeof scripts], command);
        return;
      }
    }
    
    console.error(`Unknown command: ${command}`);
    console.log("Available commands: whisper, vosk, coqui-stt, deepspeech, coqui-tts, piper, espeak-ng, chatterbox, dia, ollama, stt-all, tts-all, all");
    Deno.exit(1);
  }
  
  // Interactive mode
  while (true) {
    displayMenu();
    
    const choice = prompt(`\n${BOLD}Enter your choice (0-13):${RESET}`);
    
    switch (choice) {
      case "1":
        await runSetupScript(setupScripts.stt.whisper, "whisper");
        break;
      case "2":
        await runSetupScript(setupScripts.stt.vosk, "vosk");
        break;
      case "3":
        await runSetupScript(setupScripts.stt["coqui-stt"], "coqui-stt");
        break;
      case "4":
        await runSetupScript(setupScripts.stt.deepspeech, "deepspeech");
        break;
      case "5":
        await runSetupScript(setupScripts.tts["coqui-tts"], "coqui-tts");
        break;
      case "6":
        await runSetupScript(setupScripts.tts.piper, "piper");
        break;
      case "7":
        await runSetupScript(setupScripts.tts["espeak-ng"], "espeak-ng");
        break;
      case "8":
        await runSetupScript(setupScripts.tts.chatterbox, "chatterbox");
        break;
      case "9":
        await runSetupScript(setupScripts.tts.dia, "dia");
        break;
      case "10":
        await runSetupScript(setupScripts.llm.ollama, "ollama");
        break;
      case "11":
        await runBatchSetup("stt");
        break;
      case "12":
        await runBatchSetup("tts");
        break;
      case "13":
        await runAllSetup();
        break;
      case "0":
        console.log(`${GREEN}Setup complete! 🎉${RESET}`);
        Deno.exit(0);
      default:
        console.log(`${YELLOW}Invalid choice. Please try again.${RESET}\n`);
    }
  }
}

if (import.meta.main) {
  await main();
}