import { useEffect } from "preact/hooks";
import { Head } from "$fresh/runtime.ts";
import VoiceInterface from "../components/VoiceInterface.tsx";
import ConversationHistory from "../components/ConversationHistory.tsx";
import SettingsPanel from "../components/SettingsPanel.tsx";
import { availableModels } from "../signals/voiceState.ts";

export default function Home() {
  // Load available models on page load
  useEffect(() => {
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          availableModels.value = data.models;
        }
      })
      .catch(console.error);
  }, []);

  return (
    <>
      <Head>
        <title>🎤 Voice Assistant - Fresh</title>
        <meta name="description" content="AI-powered voice assistant with speech recognition and synthesis" />
        <link rel="stylesheet" href="/voice-assistant.css" />
      </Head>
      
      <div class="container">
        <h1>🎤 Voice Assistant</h1>
        <p class="subtitle">Speak naturally and get AI-powered responses</p>

        <VoiceInterface />
        <ConversationHistory />
        <SettingsPanel />

        <div class="instructions">
          <strong>How to use:</strong><br />
          1. Click the microphone button<br />
          2. Speak your question clearly<br />
          3. Click again to stop recording<br />
          4. Listen to the AI response<br />
          <br />
          <strong>Tips:</strong> Speak clearly, minimize background noise, and keep questions concise for best results.
        </div>
      </div>
    </>
  );
}
