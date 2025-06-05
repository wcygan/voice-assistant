#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-net
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.208.0/http/file_server.ts";
import $ from "https://deno.land/x/dax@0.39.2/mod.ts";

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';

console.log(`${BOLD}${CYAN}🌐 Voice Assistant Web Server${RESET}\n`);

interface VoiceRequest {
  audio: string; // base64 encoded audio
  model?: string;
  whisperModel?: string;
  ttsModel?: string;
  systemPrompt?: string;
}

interface VoiceResponse {
  success: boolean;
  transcript?: string;
  response?: string;
  audioResponse?: string; // base64 encoded audio
  error?: string;
}

async function checkDependencies(): Promise<boolean> {
  // Check virtual environment
  if (!await $`test -d venv`.noThrow()) {
    console.error(`${RED}❌ Python virtual environment not found.${RESET}`);
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
    return false;
  }
  
  return true;
}

async function processVoiceRequest(request: VoiceRequest): Promise<VoiceResponse> {
  const {
    audio,
    model = "mistral-small3.1:latest",
    whisperModel = "base",
    ttsModel = "tts_models/en/ljspeech/tacotron2-DDC",
    systemPrompt = "You are a helpful voice assistant. Keep responses very brief and conversational, ideally 1-2 sentences."
  } = request;
  
  try {
    // Create temporary directory
    const tempDir = `temp_web_${Date.now()}`;
    await $`mkdir -p ${tempDir}`;
    
    // Decode base64 audio and save to file
    const audioData = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    const inputPath = `${tempDir}/input.wav`;
    await Deno.writeFile(inputPath, audioData);
    
    console.log(`${YELLOW}🎯 Processing voice request...${RESET}`);
    
    // Step 1: Transcribe audio
    const transcriptResult = await $`./venv/bin/whisper ${inputPath} --model ${whisperModel} --fp16 False --output_format txt --output_dir ${tempDir}`.noThrow();
    
    const transcriptFile = `${tempDir}/input.txt`;
    if (!await $`test -f ${transcriptFile}`.noThrow()) {
      throw new Error("Transcription failed");
    }
    
    const transcript = (await Deno.readTextFile(transcriptFile)).trim();
    console.log(`${GREEN}✅ Transcript: "${transcript}"${RESET}`);
    
    if (!transcript || transcript.length < 2) {
      throw new Error("No speech detected");
    }
    
    // Step 2: Get LLM response
    let fullPrompt = transcript;
    if (systemPrompt) {
      fullPrompt = `${systemPrompt}\\n\\nUser: ${transcript}\\nAssistant:`;
    }
    
    const llmResponse = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        prompt: fullPrompt,
        stream: false
      }),
    });
    
    if (!llmResponse.ok) {
      throw new Error("LLM request failed");
    }
    
    const llmResult = await llmResponse.json();
    const response = llmResult.response?.trim();
    console.log(`${CYAN}✅ AI Response: "${response}"${RESET}`);
    
    if (!response) {
      throw new Error("No AI response generated");
    }
    
    // Step 3: Generate speech
    const outputPath = `${tempDir}/output.wav`;
    const cleanText = response.replace(/\\n/g, ' ').replace(/"/g, '\\\\"');
    
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
    
    await Deno.writeTextFile(`${tempDir}/tts.py`, pythonScript);
    const ttsResult = await $`./venv/bin/python ${tempDir}/tts.py`.noThrow();
    
    if (!ttsResult || !ttsResult.includes("SUCCESS")) {
      throw new Error("Speech synthesis failed");
    }
    
    // Read generated audio and encode as base64
    const audioResponse = await Deno.readFile(outputPath);
    const base64Audio = btoa(String.fromCharCode(...audioResponse));
    
    console.log(`${GREEN}✅ Voice response generated${RESET}`);
    
    // Cleanup
    await $`rm -rf ${tempDir}`;
    
    return {
      success: true,
      transcript,
      response,
      audioResponse: base64Audio
    };
    
  } catch (error) {
    console.error(`${RED}❌ Processing error: ${error.message}${RESET}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  // API endpoint for voice processing
  if (url.pathname === "/api/voice" && request.method === "POST") {
    try {
      const voiceRequest: VoiceRequest = await request.json();
      const response = await processVoiceRequest(voiceRequest);
      
      return new Response(JSON.stringify(response), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  }
  
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
  
  // Serve static files
  return serveDir(request, {
    fsRoot: "web/static",
    urlRoot: "",
  });
}

async function startServer(port: number = 8000): Promise<void> {
  console.log(`${YELLOW}🔍 Checking dependencies...${RESET}`);
  
  if (!await checkDependencies()) {
    console.error(`${RED}❌ Dependencies check failed${RESET}`);
    Deno.exit(1);
  }
  
  console.log(`${GREEN}✅ All systems ready${RESET}`);
  console.log(`${BOLD}${BLUE}🚀 Starting web server on http://localhost:${port}${RESET}`);
  console.log(`${CYAN}📱 Open your browser and go to: http://localhost:${port}${RESET}\n`);
  
  await serve(handler, { port });
}

if (import.meta.main) {
  const port = parseInt(Deno.args[0]) || 8000;
  await startServer(port);
}