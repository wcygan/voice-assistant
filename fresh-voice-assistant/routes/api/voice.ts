import { FreshContext } from "$fresh/server.ts";
import $ from "dax";

// Color constants for logging
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";

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

// Logging utility
function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);

  // Write to log file for easy access
  try {
    Deno.writeTextFileSync("/tmp/fresh_voice_logs.txt", logMessage + "\n", {
      append: true,
    });
  } catch {
    // Ignore write errors
  }
}

async function checkDependencies(): Promise<boolean> {
  // Check virtual environment
  if (!await $`test -d ../venv`.noThrow()) {
    log(`${RED}❌ Python virtual environment not found.${RESET}`);
    return false;
  }

  // Check Whisper
  const whisperCheck =
    await $`../venv/bin/python -c "import whisper; print('OK')"`.noThrow();
  if (!whisperCheck) {
    log(`${RED}❌ Whisper not installed.${RESET}`);
    return false;
  }

  // Check Coqui TTS
  const ttsCheck = await $`../venv/bin/python -c "import TTS; print('OK')"`
    .noThrow();
  if (!ttsCheck) {
    log(`${RED}❌ Coqui TTS not installed.${RESET}`);
    return false;
  }

  // Check Ollama
  const ollamaRunning = await $`curl -s http://localhost:11434/api/tags`
    .noThrow();
  if (!ollamaRunning) {
    log(`${RED}❌ Ollama service not running.${RESET}`);
    return false;
  }

  return true;
}

async function processVoiceRequest(
  request: VoiceRequest,
): Promise<VoiceResponse> {
  const {
    audio,
    model = "mistral-small3.1:latest",
    whisperModel = "base",
    ttsModel = "tts_models/en/ljspeech/tacotron2-DDC",
    systemPrompt =
      "You are a helpful voice assistant. Keep responses very brief and conversational, ideally 1-2 sentences.",
  } = request;

  log(
    `${YELLOW}📥 Received voice request: audio length=${audio.length}, model=${model}${RESET}`,
  );

  try {
    // Create temporary directory
    const tempDir = `temp_fresh_${Date.now()}`;
    await $`mkdir -p ${tempDir}`;

    // Decode base64 audio and save to file
    const audioData = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0));
    const webmPath = `${tempDir}/input.webm`;
    const inputPath = `${tempDir}/input.wav`;
    await Deno.writeFile(webmPath, audioData);

    log(`${CYAN}🔄 Converting WebM to WAV...${RESET}`);
    // Convert WebM to WAV using FFmpeg
    const convertResult =
      await $`ffmpeg -i ${webmPath} -ar 16000 -ac 1 -c:a pcm_s16le ${inputPath}`
        .noThrow();

    if (!convertResult || !await $`test -f ${inputPath}`.noThrow()) {
      log(`${RED}❌ Audio conversion failed${RESET}`);
      throw new Error("Audio conversion failed");
    }

    log(`${YELLOW}🎯 Processing voice request...${RESET}`);

    // Step 1: Transcribe audio
    log(`${YELLOW}🎯 Running Whisper transcription...${RESET}`);
    log(
      `${CYAN}Command: ../venv/bin/whisper ${inputPath} --model ${whisperModel} --fp16 False --output_format txt --output_dir ${tempDir}${RESET}`,
    );
    const transcriptResult =
      await $`../venv/bin/whisper ${inputPath} --model ${whisperModel} --fp16 False --output_format txt --output_dir ${tempDir}`
        .noThrow();
    log(
      `${CYAN}Whisper result: ${
        transcriptResult ? "SUCCESS" : "FAILED"
      }${RESET}`,
    );

    const transcriptFile = `${tempDir}/input.txt`;
    if (!await $`test -f ${transcriptFile}`.noThrow()) {
      log(`${RED}❌ Transcript file not found: ${transcriptFile}${RESET}`);
      // List what files were created
      const files = await $`ls -la ${tempDir}`.text().catch(() => "No files");
      log(`${YELLOW}📁 Files in ${tempDir}: ${files}${RESET}`);
      throw new Error("Transcription failed");
    }

    const transcript = (await Deno.readTextFile(transcriptFile)).trim();
    log(`${GREEN}✅ Transcript: "${transcript}"${RESET}`);

    if (!transcript || transcript.length < 2) {
      throw new Error("No speech detected");
    }

    // Step 2: Get LLM response
    log(`${YELLOW}🧠 Querying LLM with model: ${model}${RESET}`);
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
        stream: false,
      }),
    });

    if (!llmResponse.ok) {
      log(`${RED}❌ LLM response status: ${llmResponse.status}${RESET}`);
      throw new Error(`LLM request failed with status: ${llmResponse.status}`);
    }

    const llmResult = await llmResponse.json();
    const response = llmResult.response?.trim();
    log(`${CYAN}✅ AI Response: "${response}"${RESET}`);

    if (!response) {
      throw new Error("No AI response generated");
    }

    // Step 3: Generate speech
    log(`${YELLOW}🗣️ Generating speech with TTS model: ${ttsModel}${RESET}`);
    const outputPath = `${tempDir}/output.wav`;
    const cleanText = response.replace(/\\n/g, " ").replace(/"/g, '\\\\"');

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
    log(`${CYAN}Running TTS Python script...${RESET}`);
    const ttsOutput = await $`../venv/bin/python ${tempDir}/tts.py`.text()
      .catch(() => "");
    log(`${CYAN}TTS result: ${ttsOutput}${RESET}`);

    // Check if output file was created
    if (!await $`test -f ${outputPath}`.noThrow()) {
      log(`${RED}❌ TTS output file not found: ${outputPath}${RESET}`);
      log(`${RED}❌ TTS failed. Output: ${ttsOutput}${RESET}`);
      throw new Error("Speech synthesis failed");
    }

    log(`${GREEN}✅ TTS completed successfully${RESET}`);

    // Read generated audio and encode as base64
    const audioResponse = await Deno.readFile(outputPath);
    log(
      `${CYAN}Encoding audio response (${audioResponse.length} bytes)${RESET}`,
    );

    // Convert to base64 using Deno's built-in base64 encoding
    let base64Audio = "";
    try {
      // Convert Uint8Array to base64 using btoa with proper encoding
      base64Audio = btoa(
        Array.from(audioResponse, (byte) => String.fromCharCode(byte)).join(""),
      );

      log(
        `${CYAN}Base64 encoding completed, length: ${base64Audio.length}${RESET}`,
      );

      // Validate the base64 encoding
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(base64Audio)) {
        throw new Error("Invalid base64 encoding produced");
      }
    } catch (encodingError) {
      log(`${RED}❌ Base64 encoding failed: ${encodingError.message}${RESET}`);
      throw new Error("Audio encoding failed");
    }

    log(`${GREEN}✅ Voice response generated${RESET}`);

    // Cleanup
    await $`rm -rf ${tempDir}`;

    return {
      success: true,
      transcript,
      response,
      audioResponse: base64Audio,
    };
  } catch (error) {
    log(`${RED}❌ Processing error: ${error.message}${RESET}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

export const handler = {
  async POST(req: Request, _ctx: FreshContext): Promise<Response> {
    log(`${CYAN}🔄 Processing voice API request${RESET}`);

    // Check dependencies first
    if (!await checkDependencies()) {
      log(`${RED}❌ Dependencies check failed${RESET}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Dependencies not available",
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    try {
      const voiceRequest: VoiceRequest = await req.json();
      const response = await processVoiceRequest(voiceRequest);

      log(`${GREEN}✅ Voice API response: success=${response.success}${RESET}`);

      return new Response(JSON.stringify(response), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    } catch (error) {
      log(`${RED}❌ Voice API error: ${error.message}${RESET}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }
  },

  OPTIONS(_req: Request, _ctx: FreshContext): Response {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  },
};
