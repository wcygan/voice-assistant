import { JSX } from "preact";
import { isRecording } from "../signals/voiceState.ts";

export default function AudioVisualizer(): JSX.Element {
  if (!isRecording.value) {
    return <div></div>;
  }

  return (
    <div class="audio-visualizer">
      {Array.from({ length: 8 }, (_, i) => <div key={i} class="bar"></div>)}
    </div>
  );
}
