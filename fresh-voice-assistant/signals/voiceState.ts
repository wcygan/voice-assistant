import { signal } from "@preact/signals";

// Voice recording state
export const isRecording = signal(false);
export const isProcessing = signal(false);
export const currentStatus = signal("Ready to listen");

// Audio and conversation state
export const currentTranscript = signal("");
export const currentResponse = signal("");
export const audioResponse = signal<string | null>(null);

// Conversation history
export interface ConversationMessage {
  type: "user" | "ai";
  text: string;
  timestamp: Date;
}

export const conversationHistory = signal<ConversationMessage[]>([
  {
    type: "ai",
    text:
      "👋 Hi! I'm your voice assistant. Click the microphone button and start speaking to have a conversation with me.",
    timestamp: new Date(),
  },
]);

// Model and configuration state
export const selectedModels = signal({
  llm: "mistral-small3.1:latest",
  whisper: "base",
  tts: "server", // Only server TTS (Coqui) for now
});

export const systemPrompts = signal({
  current:
    "You are a helpful voice assistant. Keep responses very brief and conversational, ideally 1-2 sentences.",
  options: [
    {
      name: "Helpful Assistant",
      prompt:
        "You are a helpful voice assistant. Keep responses very brief and conversational, ideally 1-2 sentences.",
    },
    {
      name: "Coding Assistant",
      prompt:
        "You are a friendly coding assistant. Help with programming questions and keep responses concise.",
    },
    {
      name: "Creative Writer",
      prompt:
        "You are a creative writing assistant. Help with stories, ideas, and creative projects.",
    },
    {
      name: "Wise Mentor",
      prompt:
        "You are a wise mentor. Provide thoughtful advice and insights in 1-2 sentences.",
    },
  ],
});

// Available models (populated from API)
export const availableModels = signal<{ name: string; modified_at: string }[]>(
  [],
);

// Error state
export const errorMessage = signal<string | null>(null);

// Helper functions
export function addMessage(type: "user" | "ai", text: string) {
  const newMessage: ConversationMessage = {
    type,
    text,
    timestamp: new Date(),
  };

  conversationHistory.value = [...conversationHistory.value, newMessage];
}

export function clearError() {
  errorMessage.value = null;
}

export function setError(message: string) {
  errorMessage.value = message;
  setTimeout(clearError, 5000);
}

export function updateStatus(status: string) {
  currentStatus.value = status;
}

export function resetVoiceState() {
  isRecording.value = false;
  isProcessing.value = false;
  currentStatus.value = "Ready to listen";
  currentTranscript.value = "";
  currentResponse.value = "";
  audioResponse.value = null;
  clearError();
}
