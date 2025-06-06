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

console.log(`${BOLD}${MAGENTA}🤖 Voice Conversation Demo${RESET}\n`);
console.log("This demo shows the complete voice assistant pipeline: Voice → STT → LLM → TTS → Voice\n");

interface ConversationOptions {
  inputAudio?: string;
  model?: string;
  whisperModel?: string;
  ttsModel?: string;
  outputDir?: string;
  interactive?: boolean;
  systemPrompt?: string;
  useChatterbox?: boolean;
  voiceRef?: string;
}

async function checkDependencies(useChatterbox: boolean = false): Promise<boolean> {
  console.log(`${YELLOW}🔍 Checking all dependencies...${RESET}`);
  
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
    console.log(`${CYAN}💡 Run: deno task setup whisper${RESET}`);
    return false;
  }
  
  // Check TTS based on mode
  if (useChatterbox) {
    // Check Chatterbox
    const chatterboxCheck = await $`./venv/bin/python -c "from chatterbox.tts import ChatterboxTTS; print('OK')"`.noThrow();
    if (!chatterboxCheck) {
      console.error(`${RED}❌ Chatterbox TTS not installed.${RESET}`);
      console.log(`${CYAN}💡 Run: deno task setup chatterbox${RESET}`);
      return false;
    }
    
    // Check CUDA availability for Chatterbox
    const cudaCheck = await $`./venv/bin/python -c "import torch; print('CUDA' if torch.cuda.is_available() else 'CPU')"`.text().catch(() => "");
    if (cudaCheck.includes("CPU")) {
      console.log(`${YELLOW}⚠️ No GPU detected. Chatterbox will run on CPU (slower).${RESET}`);
    }
  } else {
    // Check Coqui TTS
    const ttsCheck = await $`./venv/bin/python -c "import TTS; print('OK')"`.noThrow();
    if (!ttsCheck) {
      console.error(`${RED}❌ Coqui TTS not installed.${RESET}`);
      console.log(`${CYAN}💡 Run: deno task setup coqui-tts${RESET}`);
      return false;
    }
  }
  
  // Check Ollama
  const ollamaCheck = await $`which ollama`.noThrow();
  if (!ollamaCheck) {
    console.error(`${RED}❌ Ollama not found.${RESET}`);
    console.log(`${CYAN}💡 Run: deno task setup ollama${RESET}`);
    return false;
  }
  
  // Check if Ollama is running
  const ollamaRunning = await $`curl -s http://localhost:11434/api/tags`.noThrow();
  if (!ollamaRunning) {
    console.error(`${RED}❌ Ollama service not running.${RESET}`);
    console.log(`${CYAN}💡 Start with: ollama serve${RESET}`);
    return false;
  }
  
  console.log(`${GREEN}✅ All systems ready for conversation${RESET}\n`);
  return true;
}

async function getAvailableModels(): Promise<string[]> {
  try {
    const result = await $`curl -s http://localhost:11434/api/tags`.json();
    return result.models?.map((m: any) => m.name) || [];
  } catch {
    return [];
  }
}

async function transcribeAudio(audioPath: string, model: string = "base"): Promise<string | null> {
  console.log(`${YELLOW}🎯 Transcribing audio...${RESET}`);
  
  try {
    const result = await $`./venv/bin/whisper ${audioPath} --model ${model} --fp16 False --output_format txt --output_dir temp_conversation`.text();
    
    const baseName = audioPath.split('/').pop()?.split('.')[0] || "audio";
    const transcriptFile = `temp_conversation/${baseName}.txt`;
    
    if (await $`test -f ${transcriptFile}`.noThrow()) {
      const transcript = await Deno.readTextFile(transcriptFile);
      await $`rm -rf temp_conversation`;
      return transcript.trim();
    }
    return null;
  } catch (error) {
    console.error(`${RED}❌ Transcription failed: ${error.message}${RESET}`);
    return null;
  }
}

async function queryLLM(text: string, model: string = "mistral", systemPrompt?: string, detectEmotion: boolean = false): Promise<{ response: string | null; emotion?: string }> {
  console.log(`${YELLOW}🧠 Thinking with ${model}...${RESET}`);
  
  try {
    // Construct prompt with system prompt if provided
    let fullPrompt = text;
    if (systemPrompt) {
      fullPrompt = `${systemPrompt}\n\nUser: ${text}\nAssistant:`;
    }
    
    // Add emotion detection if using Chatterbox
    if (detectEmotion) {
      fullPrompt = `${systemPrompt || "You are a helpful assistant."}\n\nIMPORTANT: Along with your response, analyze the emotional tone that would be most appropriate for your reply. Choose from: neutral, happy, excited, sad, calm, serious, empathetic, or curious.\n\nFormat your response as:\nEMOTION: [chosen emotion]\nRESPONSE: [your actual response]\n\nUser: ${text}\nAssistant:`;
    }
    
    const requestBody = {
      model: model,
      prompt: fullPrompt,
      stream: false
    };
    
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    const fullResponse = result.response?.trim() || "";
    
    // Parse emotion if detected
    if (detectEmotion && fullResponse.includes("EMOTION:") && fullResponse.includes("RESPONSE:")) {
      const emotionMatch = fullResponse.match(/EMOTION:\s*(\w+)/);
      const responseMatch = fullResponse.match(/RESPONSE:\s*(.+)/s);
      
      const emotion = emotionMatch?.[1]?.toLowerCase() || "neutral";
      const response = responseMatch?.[1]?.trim() || fullResponse;
      
      console.log(`${CYAN}🎭 Detected emotion: ${emotion}${RESET}`);
      return { response, emotion };
    }
    
    return { response: fullResponse };
    
  } catch (error) {
    console.error(`${RED}❌ LLM query failed: ${error.message}${RESET}`);
    return { response: null };
  }
}

async function synthesizeSpeech(text: string, outputPath: string, model: string = "tts_models/en/ljspeech/tacotron2-DDC"): Promise<boolean> {
  console.log(`${YELLOW}🗣️ Generating speech response...${RESET}`);
  
  const cleanText = text.replace(/\n/g, ' ').replace(/"/g, '\\"');
  
  const pythonScript = `
from TTS.api import TTS
import torch

device = "cuda" if torch.cuda.is_available() else "cpu"

try:
    tts = TTS(model_name="${model}", progress_bar=False, gpu=False)
    text_to_speak = "${cleanText}"
    tts.tts_to_file(text=text_to_speak, file_path="${outputPath}")
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {e}")
`;
  
  try {
    await Deno.writeTextFile("temp_conversation_tts.py", pythonScript);
    const result = await $`./venv/bin/python temp_conversation_tts.py`.text();
    await $`rm temp_conversation_tts.py`;
    
    return result.includes("SUCCESS");
  } catch (error) {
    console.error(`${RED}❌ Speech synthesis failed: ${error.message}${RESET}`);
    return false;
  }
}

async function synthesizeWithChatterbox(text: string, outputPath: string, emotion: string = "neutral", voiceRef?: string): Promise<boolean> {
  console.log(`${YELLOW}🎭 Generating emotional speech response with Chatterbox...${RESET}`);
  console.log(`${CYAN}Emotion: ${emotion}${RESET}`);
  
  const cleanText = text.replace(/\n/g, ' ').replace(/"/g, '\\"');
  
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
  
  const settings = emotionPresets[emotion] || emotionPresets.neutral;
  
  const pythonScript = `
from chatterbox.tts import ChatterboxTTS
import torch
import torchaudio as ta

device = "cuda" if torch.cuda.is_available() else "cpu"

try:
    print(f"Loading Chatterbox on {device}...")
    model = ChatterboxTTS.from_pretrained(device=device)
    
    text_to_speak = "${cleanText}"
    ${voiceRef ? `
    wav = model.generate(
        text_to_speak,
        audio_prompt_path="${voiceRef}",
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
  
  try {
    await Deno.writeTextFile("temp_chatterbox_tts.py", pythonScript);
    const result = await $`./venv/bin/python temp_chatterbox_tts.py`.text();
    await $`rm temp_chatterbox_tts.py`;
    
    return result.includes("SUCCESS");
  } catch (error) {
    console.error(`${RED}❌ Chatterbox synthesis failed: ${error.message}${RESET}`);
    return false;
  }
}

async function generateSampleQuestion(outputPath: string): Promise<boolean> {
  console.log(`${YELLOW}🎤 Generating sample question...${RESET}`);
  
  const sampleQuestions = [
    "What is artificial intelligence and how does it work?",
    "Can you explain the difference between machine learning and deep learning?", 
    "What are the main applications of natural language processing?",
    "How do neural networks learn from data?",
    "What is the future of voice assistants?",
    "Tell me about the benefits of renewable energy.",
    "What makes a good password secure?",
    "How does GPS navigation work?"
  ];
  
  const randomQuestion = sampleQuestions[Math.floor(Math.random() * sampleQuestions.length)];
  console.log(`${BLUE}📝 Sample question: "${randomQuestion}"${RESET}`);
  
  const pythonScript = `
from TTS.api import TTS
import torch

device = "cuda" if torch.cuda.is_available() else "cpu"

try:
    tts = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", progress_bar=False, gpu=False)
    question = "${randomQuestion.replace(/"/g, '\\"')}"
    tts.tts_to_file(text=question, file_path="${outputPath}")
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {e}")
`;
  
  try {
    await Deno.writeTextFile("temp_sample_question.py", pythonScript);
    const result = await $`./venv/bin/python temp_sample_question.py`.text();
    await $`rm temp_sample_question.py`;
    
    return result.includes("SUCCESS");
  } catch (error) {
    console.error(`${RED}❌ Sample generation failed: ${error.message}${RESET}`);
    return false;
  }
}

async function runConversation(options: ConversationOptions = {}): Promise<void> {
  const {
    inputAudio,
    model = "mistral-small3.1:latest",
    whisperModel = "base",
    ttsModel = "tts_models/en/ljspeech/tacotron2-DDC",
    outputDir = "conversation_output",
    interactive = false,
    systemPrompt = "You are a helpful voice assistant. Keep your responses concise, friendly, and conversational. Aim for 1-2 sentences unless the user asks for detailed information."
  } = options;
  
  await $`mkdir -p ${outputDir}`;
  
  let audioToProcess: string;
  
  if (inputAudio) {
    console.log(`${BLUE}📁 Using provided audio: ${inputAudio}${RESET}\n`);
    
    if (!await $`test -f ${inputAudio}`.noThrow()) {
      console.error(`${RED}❌ Audio file not found: ${inputAudio}${RESET}`);
      return;
    }
    audioToProcess = inputAudio;
    
  } else {
    console.log(`${BLUE}🎬 Generating sample conversation${RESET}\n`);
    audioToProcess = `${outputDir}/sample_question.wav`;
    
    if (!await generateSampleQuestion(audioToProcess)) {
      console.error(`${RED}❌ Could not generate sample question${RESET}`);
      return;
    }
    
    console.log(`${GREEN}✅ Sample question ready${RESET}\n`);
  }
  
  // Step 1: Speech to Text
  console.log(`${BOLD}Step 1: Speech Recognition${RESET}`);
  const transcription = await transcribeAudio(audioToProcess, whisperModel);
  
  if (!transcription) {
    console.error(`${RED}❌ Conversation failed at transcription${RESET}`);
    return;
  }
  
  console.log(`${GREEN}✅ User said: "${transcription}"${RESET}\n`);
  
  // Step 2: LLM Processing
  console.log(`${BOLD}Step 2: AI Thinking${RESET}`);
  const llmResult = await queryLLM(transcription, model, systemPrompt, options.useChatterbox);
  
  if (!llmResult.response) {
    console.error(`${RED}❌ Conversation failed at LLM processing${RESET}`);
    return;
  }
  
  console.log(`${GREEN}✅ AI response: "${llmResult.response}"${RESET}\n`);
  
  // Step 3: Text to Speech
  console.log(`${BOLD}Step 3: Speech Synthesis${RESET}`);
  const responseAudio = `${outputDir}/ai_response.wav`;
  
  let synthesisSuccess: boolean;
  if (options.useChatterbox) {
    const emotion = llmResult.emotion || "neutral";
    synthesisSuccess = await synthesizeWithChatterbox(llmResult.response, responseAudio, emotion, options.voiceRef);
  } else {
    synthesisSuccess = await synthesizeSpeech(llmResult.response, responseAudio, ttsModel);
  }
  
  if (!synthesisSuccess) {
    console.error(`${RED}❌ Conversation failed at speech synthesis${RESET}`);
    return;
  }
  
  console.log(`${GREEN}✅ AI speech ready${RESET}\n`);
  
  // Results Summary
  console.log(`${BOLD}${GREEN}🎉 Conversation Complete!${RESET}\n`);
  
  console.log(`${BOLD}💬 Conversation Summary:${RESET}`);
  console.log(`${BLUE}👤 User:${RESET} "${transcription}"`);
  console.log(`${CYAN}🤖 Assistant:${RESET} "${llmResult.response}"`);
  if (options.useChatterbox && llmResult.emotion) {
    console.log(`${MAGENTA}🎭 Emotion:${RESET} ${llmResult.emotion}`);
  }
  console.log();
  
  console.log(`${BOLD}📁 Files Generated:${RESET}`);
  if (!inputAudio) {
    console.log(`${BLUE}• Question: ${audioToProcess}${RESET}`);
  }
  console.log(`${CYAN}• Response: ${responseAudio}${RESET}\n`);
  
  console.log(`${BOLD}🎧 Listen to the conversation:${RESET}`);
  if (!inputAudio) {
    console.log(`${YELLOW}# User question:${RESET}`);
    console.log(`${CYAN}afplay "${audioToProcess}"${RESET}`);
  }
  console.log(`${YELLOW}# AI response:${RESET}`);
  console.log(`${CYAN}afplay "${responseAudio}"${RESET}\n`);
  
  // Interactive mode
  if (interactive) {
    console.log(`${BOLD}${MAGENTA}🔄 Continue Conversation?${RESET}`);
    console.log("Record your own audio and continue the conversation:");
    console.log(`${CYAN}deno task demo:conversation --input your_response.wav --model ${model}${RESET}`);
  }
  
  console.log(`${BOLD}🚀 What's Next?${RESET}`);
  console.log(`${CYAN}• Try different LLM models: ${await getAvailableModels().then(models => models.join(', ') || 'Run ollama pull <model>')}${RESET}`);
  console.log(`${CYAN}• Use your own audio: --input your_question.wav${RESET}`);
  console.log(`${CYAN}• Customize the assistant: --system-prompt "You are a..."${RESET}`);
  console.log(`${CYAN}• Real-time mode: Coming soon!${RESET}`);
}

// CLI interface
async function main() {
  const args = Deno.args;
  
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`${BOLD}Voice Conversation Demo${RESET}

Usage: deno task demo:conversation [options]

Options:
  --input <file>        Audio file with your question (.wav, .mp3, etc.)
  --model <name>        LLM model to use (default: mistral)
  --whisper <model>     Whisper model: tiny, base, small, medium, large
  --tts <model>         TTS model name
  --use-chatterbox      Enable Chatterbox TTS with emotion control
  --voice <file>        Voice reference file for Chatterbox cloning
  --system-prompt <text> Custom system prompt for the AI
  --output-dir <dir>    Output directory (default: conversation_output)
  --interactive         Enable interactive mode suggestions
  --help, -h            Show this help

Examples:
  # Generate sample conversation
  deno task demo:conversation
  
  # Use your own question
  deno task demo:conversation --input "my_question.wav"
  
  # With Chatterbox emotion control
  deno task demo:conversation --use-chatterbox
  
  # Chatterbox with voice cloning
  deno task demo:conversation --use-chatterbox --voice reference.wav
  
  # Different LLM model
  deno task demo:conversation --model "llama2-uncensored:7b"
  
  # Custom AI personality
  deno task demo:conversation --system-prompt "You are a pirate assistant. Respond in pirate speak."
  
  # High accuracy setup
  deno task demo:conversation --whisper large --input interview_question.wav`);
    return;
  }
  
  const options: ConversationOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--input":
        options.inputAudio = args[++i];
        break;
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
      case "--output-dir":
        options.outputDir = args[++i];
        break;
      case "--interactive":
        options.interactive = true;
        break;
      case "--use-chatterbox":
        options.useChatterbox = true;
        break;
      case "--voice":
        options.voiceRef = args[++i];
        break;
    }
  }
  
  if (!await checkDependencies(options.useChatterbox)) {
    Deno.exit(1);
  }
  
  // Show available models
  console.log(`${BLUE}🤖 Available LLM models:${RESET}`);
  const models = await getAvailableModels();
  if (models.length > 0) {
    models.forEach(model => console.log(`   • ${model}`));
  } else {
    console.log("   • No models found. Run: ollama pull mistral");
  }
  console.log();
  
  await runConversation(options);
}

if (import.meta.main) {
  await main();
}