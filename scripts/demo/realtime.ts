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

console.log(`${BOLD}${MAGENTA}🎙️ Real-time Voice Assistant${RESET}\n`);
console.log("This demo provides live microphone input with real-time voice conversation.\n");

interface RealtimeOptions {
  model?: string;
  whisperModel?: string;
  ttsModel?: string;
  systemPrompt?: string;
  vadThreshold?: number;
  maxRecordingTime?: number;
  outputDir?: string;
}

let isListening = false;
let currentRecording: Deno.ChildProcess | null = null;

async function checkDependencies(): Promise<boolean> {
  console.log(`${YELLOW}🔍 Checking real-time dependencies...${RESET}`);
  
  // Check virtual environment
  if (!await $`test -d venv`.noThrow()) {
    console.error(`${RED}❌ Python virtual environment not found.${RESET}`);
    console.log(`${CYAN}💡 Run: deno task setup${RESET}`);
    return false;
  }
  
  // Check Whisper
  const whisperCheck = await $`./venv/bin/python -c "import whisper; print('OK')"`.noThrow();
  if (!whisperCheck) {
    console.error(`${RED}❌ Whisper not installed.${RESET}`);
    return false;
  }
  
  // Check Coqui TTS
  const ttsCheck = await $`./venv/bin/python -c "import TTS; print('OK')"`.noThrow();
  if (!ttsCheck) {
    console.error(`${RED}❌ Coqui TTS not installed.${RESET}`);
    return false;
  }
  
  // Check Ollama
  const ollamaRunning = await $`curl -s http://localhost:11434/api/tags`.noThrow();
  if (!ollamaRunning) {
    console.error(`${RED}❌ Ollama service not running.${RESET}`);
    console.log(`${CYAN}💡 Start with: ollama serve${RESET}`);
    return false;
  }
  
  // Check for SoX (audio recording)
  const soxCheck = await $`which sox`.noThrow();
  if (!soxCheck) {
    console.log(`${YELLOW}⚠️ SoX not found. Installing via Homebrew...${RESET}`);
    try {
      await $`brew install sox`;
      console.log(`${GREEN}✅ SoX installed${RESET}`);
    } catch {
      console.error(`${RED}❌ Could not install SoX. Install manually: brew install sox${RESET}`);
      return false;
    }
  }
  
  console.log(`${GREEN}✅ All real-time systems ready${RESET}\n`);
  return true;
}

async function startRecording(outputPath: string): Promise<Deno.ChildProcess> {
  console.log(`${YELLOW}🎤 Starting live recording... (Press Ctrl+C to stop speaking)${RESET}`);
  
  // Use SoX to record from default microphone
  const process = $`sox -d -r 16000 -c 1 -b 16 ${outputPath}`.spawn();
  
  return process;
}

async function detectVoiceActivity(audioPath: string, threshold: number = 0.02): Promise<boolean> {
  try {
    // Simple energy-based VAD using SoX
    const result = await $`sox ${audioPath} -n stat 2>&1 | grep "RMS amplitude" || echo "0.000000"`.text();
    const rmsMatch = result.match(/RMS amplitude:\s+([\d.]+)/);
    const rms = rmsMatch ? parseFloat(rmsMatch[1]) : 0;
    
    return rms > threshold;
  } catch {
    return false;
  }
}

async function transcribeAudio(audioPath: string, model: string = "base"): Promise<string | null> {
  try {
    const result = await $`./venv/bin/whisper ${audioPath} --model ${model} --fp16 False --output_format txt --output_dir temp_realtime 2>/dev/null`.text();
    
    const baseName = audioPath.split('/').pop()?.split('.')[0] || "audio";
    const transcriptFile = `temp_realtime/${baseName}.txt`;
    
    if (await $`test -f ${transcriptFile}`.noThrow()) {
      const transcript = await Deno.readTextFile(transcriptFile);
      await $`rm -rf temp_realtime`;
      return transcript.trim();
    }
    return null;
  } catch {
    return null;
  }
}

async function queryLLM(text: string, model: string, systemPrompt?: string): Promise<string | null> {
  try {
    let fullPrompt = text;
    if (systemPrompt) {
      fullPrompt = `${systemPrompt}\n\nUser: ${text}\nAssistant:`;
    }
    
    const requestBody = {
      model: model,
      prompt: fullPrompt,
      stream: false
    };
    
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) return null;
    
    const result = await response.json();
    return result.response?.trim() || null;
  } catch {
    return null;
  }
}

async function synthesizeAndPlaySpeech(text: string, outputPath: string, ttsModel: string): Promise<boolean> {
  const cleanText = text.replace(/\n/g, ' ').replace(/"/g, '\\"');
  
  const pythonScript = `
from TTS.api import TTS
import torch

try:
    tts = TTS(model_name="${ttsModel}", progress_bar=False, gpu=False)
    text_to_speak = "${cleanText}"
    tts.tts_to_file(text=text_to_speak, file_path="${outputPath}")
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {e}")
`;
  
  try {
    await Deno.writeTextFile("temp_realtime_tts.py", pythonScript);
    const result = await $`./venv/bin/python temp_realtime_tts.py 2>/dev/null`.text();
    await $`rm temp_realtime_tts.py`;
    
    if (result.includes("SUCCESS")) {
      // Play the audio
      await $`afplay ${outputPath}`;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function waitForKeyPress(): Promise<void> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  
  // Set terminal to raw mode for immediate input
  const originalMode = await $`stty -g`.text();
  await $`stty raw -echo`;
  
  try {
    while (true) {
      const buffer = new Uint8Array(1);
      await Deno.stdin.read(buffer);
      
      const char = decoder.decode(buffer);
      
      // Handle Ctrl+C (character code 3)
      if (char.charCodeAt(0) === 3) {
        break;
      }
      
      // Handle Enter/Return
      if (char.charCodeAt(0) === 13 || char.charCodeAt(0) === 10) {
        break;
      }
      
      // Handle spacebar
      if (char === ' ') {
        break;
      }
    }
  } finally {
    // Restore terminal mode
    await $`stty ${originalMode.trim()}`;
  }
}

async function runRealtimeConversation(options: RealtimeOptions = {}): Promise<void> {
  const {
    model = "mistral-small3.1:latest",
    whisperModel = "base", 
    ttsModel = "tts_models/en/ljspeech/tacotron2-DDC",
    systemPrompt = "You are a helpful voice assistant. Keep responses very brief and conversational, ideally 1-2 sentences. Be friendly and natural.",
    vadThreshold = 0.02,
    maxRecordingTime = 10,
    outputDir = "realtime_output"
  } = options;
  
  await $`mkdir -p ${outputDir}`;
  
  console.log(`${BOLD}${GREEN}🎙️ Real-time Voice Assistant Active${RESET}\n`);
  console.log(`${BLUE}🤖 AI Model: ${model}${RESET}`);
  console.log(`${BLUE}🎯 STT Model: ${whisperModel}${RESET}`);
  console.log(`${BLUE}🗣️ TTS Model: ${ttsModel}${RESET}\n`);
  
  console.log(`${BOLD}Instructions:${RESET}`);
  console.log(`${CYAN}• Press SPACE to start recording your question${RESET}`);
  console.log(`${CYAN}• Press SPACE again to stop recording${RESET}`);
  console.log(`${CYAN}• Press Ctrl+C to exit${RESET}\n`);
  
  let conversationCount = 0;
  
  // Setup signal handlers
  const handleInterrupt = () => {
    console.log(`\n${YELLOW}🛑 Stopping voice assistant...${RESET}`);
    if (currentRecording) {
      currentRecording.kill("SIGTERM");
    }
    Deno.exit(0);
  };
  
  // Handle Ctrl+C
  Deno.addSignalListener("SIGINT", handleInterrupt);
  
  try {
    while (true) {
      console.log(`${BOLD}${YELLOW}🎤 Press SPACE to start recording...${RESET}`);
      await waitForKeyPress();
      
      conversationCount++;
      const recordingPath = `${outputDir}/recording_${conversationCount}.wav`;
      const responsePath = `${outputDir}/response_${conversationCount}.wav`;
      
      console.log(`${GREEN}🔴 Recording... Press SPACE to stop${RESET}`);
      
      // Start recording
      currentRecording = await startRecording(recordingPath);
      
      // Wait for stop signal
      await waitForKeyPress();
      
      console.log(`${YELLOW}⏹️ Stopping recording...${RESET}`);
      
      // Stop recording
      if (currentRecording) {
        currentRecording.kill("SIGTERM");
        await currentRecording.status; // Wait for process to finish
        currentRecording = null;
      }
      
      // Wait a moment for file to be written
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if recording has voice activity
      console.log(`${YELLOW}🔍 Analyzing audio...${RESET}`);
      const hasVoice = await detectVoiceActivity(recordingPath, vadThreshold);
      
      if (!hasVoice) {
        console.log(`${RED}❌ No voice detected. Try speaking louder or closer to microphone.${RESET}\n`);
        continue;
      }
      
      // Transcribe
      console.log(`${YELLOW}🎯 Transcribing...${RESET}`);
      const transcript = await transcribeAudio(recordingPath, whisperModel);
      
      if (!transcript || transcript.length < 3) {
        console.log(`${RED}❌ Could not understand speech. Please try again.${RESET}\n`);
        continue;
      }
      
      console.log(`${GREEN}✅ You said: "${transcript}"${RESET}`);
      
      // Get AI response
      console.log(`${YELLOW}🧠 AI thinking...${RESET}`);
      const response = await queryLLM(transcript, model, systemPrompt);
      
      if (!response) {
        console.log(`${RED}❌ AI response failed. Please try again.${RESET}\n`);
        continue;
      }
      
      console.log(`${CYAN}🤖 AI: "${response}"${RESET}`);
      
      // Synthesize and play response
      console.log(`${YELLOW}🗣️ Speaking response...${RESET}`);
      const speechSuccess = await synthesizeAndPlaySpeech(response, responsePath, ttsModel);
      
      if (speechSuccess) {
        console.log(`${GREEN}✅ Response played${RESET}\n`);
      } else {
        console.log(`${RED}❌ Speech synthesis failed${RESET}\n`);
      }
      
      console.log(`${MAGENTA}💬 Conversation ${conversationCount} complete!${RESET}\n`);
    }
    
  } catch (error) {
    console.error(`${RED}❌ Real-time error: ${error.message}${RESET}`);
  } finally {
    if (currentRecording) {
      currentRecording.kill("SIGTERM");
    }
  }
}

// CLI interface
async function main() {
  const args = Deno.args;
  
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`${BOLD}Real-time Voice Assistant${RESET}

Usage: deno task demo:realtime [options]

Options:
  --model <name>        LLM model (default: mistral-small3.1:latest)
  --whisper <model>     Whisper model: tiny, base, small, medium, large
  --tts <model>         TTS model name
  --system-prompt <text> Custom system prompt
  --vad-threshold <num> Voice activity threshold (0.01-0.1, default: 0.02)
  --max-time <seconds>  Max recording time (default: 10)
  --output-dir <dir>    Output directory (default: realtime_output)
  --help, -h            Show this help

Controls:
  SPACE                 Start/stop recording
  Ctrl+C                Exit assistant

Examples:
  # Basic real-time assistant
  deno task demo:realtime
  
  # More sensitive voice detection
  deno task demo:realtime --vad-threshold 0.01
  
  # Different AI personality
  deno task demo:realtime --system-prompt "You are a helpful coding assistant"
  
  # High accuracy transcription
  deno task demo:realtime --whisper large`);
    return;
  }
  
  if (!await checkDependencies()) {
    Deno.exit(1);
  }
  
  const options: RealtimeOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--model":
        options.model = args[++i];
        break;
      case "--whisper":
        options.whisperModel = args[++i];
        break;
      case "--tts":
        options.ttsModel = args[++i];
        break;
      case "--system-prompt":
        options.systemPrompt = args[++i];
        break;
      case "--vad-threshold":
        options.vadThreshold = parseFloat(args[++i]);
        break;
      case "--max-time":
        options.maxRecordingTime = parseInt(args[++i]);
        break;
      case "--output-dir":
        options.outputDir = args[++i];
        break;
    }
  }
  
  await runRealtimeConversation(options);
}

if (import.meta.main) {
  await main();
}