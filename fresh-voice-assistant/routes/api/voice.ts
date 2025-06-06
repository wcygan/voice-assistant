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
  useChatterbox?: boolean;
  voiceRef?: string; // base64 encoded voice reference for Chatterbox
}

interface VoiceResponse {
  success: boolean;
  transcript?: string;
  response?: string;
  audioResponse?: string; // base64 encoded audio
  error?: string;
  emotion?: string; // Detected emotion when using Chatterbox
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
  
  // Check Chatterbox if needed
  const chatterboxCheck = await $`../venv/bin/python -c "from chatterbox.tts import ChatterboxTTS; print('OK')"`
    .noThrow();
  if (!chatterboxCheck) {
    log(`${YELLOW}⚠️ Chatterbox TTS not installed. Regular TTS will work.${RESET}`);
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

  // Validate audio data
  if (!audio || audio.length === 0) {
    log(`${RED}❌ Empty audio data received${RESET}`);
    throw new Error("No audio data received");
  }

  // Check minimum base64 length (rough estimate: 1KB audio ~ 1366 chars in base64)
  const MIN_BASE64_LENGTH = 1000;
  if (audio.length < MIN_BASE64_LENGTH) {
    log(`${YELLOW}⚠️ Audio data too small: ${audio.length} chars${RESET}`);
    throw new Error("Audio recording too short - please speak longer");
  }

  try {
    // Create temporary directory
    const tempDir = `temp_fresh_${Date.now()}`;
    await $`mkdir -p ${tempDir}`;

    // Decode base64 audio and save to file
    const audioData = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0));
    const webmPath = `${tempDir}/input.webm`;
    const inputPath = `${tempDir}/input.wav`;
    await Deno.writeFile(webmPath, audioData);

    // Check if WebM file was written successfully and has content
    const webmFileInfo = await Deno.stat(webmPath);
    log(`${CYAN}WebM file size: ${webmFileInfo.size} bytes${RESET}`);

    if (webmFileInfo.size === 0) {
      log(`${RED}❌ Empty WebM file created${RESET}`);
      throw new Error("Empty audio file - no audio data recorded");
    }

    log(`${CYAN}🔄 Converting WebM to WAV...${RESET}`);
    // Convert WebM to WAV using FFmpeg with error capturing
    const convertResult =
      await $`ffmpeg -i ${webmPath} -ar 16000 -ac 1 -c:a pcm_s16le ${inputPath} 2>&1`
        .noThrow();

    if (!convertResult || !await $`test -f ${inputPath}`.noThrow()) {
      log(`${RED}❌ Audio conversion failed${RESET}`);
      if (convertResult) {
        log(`${RED}FFmpeg output: ${convertResult}${RESET}`);
      }
      throw new Error("Audio conversion failed - invalid audio format");
    }

    // Check converted WAV file size
    const wavFileInfo = await Deno.stat(inputPath);
    log(`${CYAN}WAV file size: ${wavFileInfo.size} bytes${RESET}`);

    if (wavFileInfo.size < 1024) { // Less than 1KB is too small for meaningful audio
      log(`${RED}❌ WAV file too small: ${wavFileInfo.size} bytes${RESET}`);
      throw new Error("Audio file too small - please speak longer");
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
    
    // Add emotion detection if using Chatterbox
    if (request.useChatterbox) {
      fullPrompt = `${systemPrompt || "You are a helpful assistant."}\\n\\nIMPORTANT: Along with your response, analyze the emotional tone that would be most appropriate for your reply. Choose from: neutral, happy, excited, sad, calm, serious, empathetic, or curious.\\n\\nFormat your response as:\\nEMOTION: [chosen emotion]\\nRESPONSE: [your actual response]\\n\\nUser: ${transcript}\\nAssistant:`;
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
    let response = llmResult.response?.trim();
    let detectedEmotion = "neutral";
    
    // Parse emotion if using Chatterbox
    if (request.useChatterbox && response?.includes("EMOTION:") && response.includes("RESPONSE:")) {
      const emotionMatch = response.match(/EMOTION:\s*(\w+)/);
      const responseMatch = response.match(/RESPONSE:\s*(.+)/s);
      
      detectedEmotion = emotionMatch?.[1]?.toLowerCase() || "neutral";
      response = responseMatch?.[1]?.trim() || response;
      
      log(`${CYAN}🎭 Detected emotion: ${detectedEmotion}${RESET}`);
    }
    
    log(`${CYAN}✅ AI Response: "${response}"${RESET}`);

    if (!response) {
      throw new Error("No AI response generated");
    }

    // Step 3: Generate speech
    const outputPath = `${tempDir}/output.wav`;
    const cleanText = response.replace(/\\n/g, " ").replace(/"/g, '\\\\"');

    if (request.useChatterbox) {
      log(`${YELLOW}🎭 Generating emotional speech with Chatterbox (emotion: ${detectedEmotion})${RESET}`);
      
      // Emotion presets
      const emotionPresets: Record<string, { exaggeration: number; cfgWeight: number }> = {
        "neutral": { exaggeration: 0.3, cfgWeight: 1.0 },
        "happy": { exaggeration: 0.7, cfgWeight: 1.2 },
        "excited": { exaggeration: 0.9, cfgWeight: 1.5 },
        "sad": { exaggeration: 0.5, cfgWeight: 0.7 },
        "calm": { exaggeration: 0.1, cfgWeight: 0.8 },
        "serious": { exaggeration: 0.2, cfgWeight: 1.3 },
        "empathetic": { exaggeration: 0.4, cfgWeight: 0.9 },
        "curious": { exaggeration: 0.6, cfgWeight: 1.1 }
      };
      
      const settings = emotionPresets[detectedEmotion] || emotionPresets.neutral;
      
      // Handle voice reference if provided
      let voiceRefPath = "";
      if (request.voiceRef) {
        voiceRefPath = `${tempDir}/voice_ref.wav`;
        const voiceData = Uint8Array.from(atob(request.voiceRef), (c) => c.charCodeAt(0));
        await Deno.writeFile(voiceRefPath, voiceData);
      }

      const pythonScript = `
from chatterbox.tts import ChatterboxTTS
import torch
import torchaudio as ta

try:
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading Chatterbox on {device}...")
    model = ChatterboxTTS.from_pretrained(device=device)
    
    text_to_speak = "${cleanText}"
    ${voiceRefPath ? `
    wav = model.generate(
        text_to_speak,
        audio_prompt_path="${voiceRefPath}",
        exaggeration=${settings.exaggeration},
        cfg_weight=${settings.cfgWeight}
    )
    ` : `
    wav = model.generate(
        text_to_speak,
        exaggeration=${settings.exaggeration},
        cfg_weight=${settings.cfgWeight}
    )
    `}
    
    ta.save("${outputPath}", wav, model.sr)
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {e}")
`;

      await Deno.writeTextFile(`${tempDir}/tts.py`, pythonScript);
    } else {
      log(`${YELLOW}🗣️ Generating speech with TTS model: ${ttsModel}${RESET}`);
      
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
    }

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
      const err = encodingError as Error;
      log(`${RED}❌ Base64 encoding failed: ${err.message}${RESET}`);
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
      ...(request.useChatterbox && { emotion: detectedEmotion }),
    };
  } catch (error) {
    const err = error as Error;
    log(`${RED}❌ Processing error: ${err.message}${RESET}`);
    return {
      success: false,
      error: err.message,
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
      const err = error as Error;
      log(`${RED}❌ Voice API error: ${err.message}${RESET}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: err.message,
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
