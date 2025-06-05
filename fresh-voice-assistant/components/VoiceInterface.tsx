import { JSX } from "preact";
import { currentStatus, errorMessage } from "../signals/voiceState.ts";
import VoiceRecorder from "../islands/VoiceRecorder.tsx";
import AudioVisualizer from "../components/AudioVisualizer.tsx";

export default function VoiceInterface(): JSX.Element {
  return (
    <div class="voice-interface">
      <VoiceRecorder />

      <div class="status" id="status">
        {currentStatus.value}
      </div>

      <AudioVisualizer />

      {errorMessage.value && (
        <div class="error">
          ❌ {errorMessage.value}
        </div>
      )}
    </div>
  );
}
