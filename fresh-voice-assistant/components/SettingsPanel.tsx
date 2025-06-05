import { JSX } from "preact";
import {
  availableModels,
  selectedModels,
  systemPrompts,
} from "../signals/voiceState.ts";

export default function SettingsPanel(): JSX.Element {
  const handleLLMChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    selectedModels.value = {
      ...selectedModels.value,
      llm: target.value,
    };
  };

  const handleWhisperChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    selectedModels.value = {
      ...selectedModels.value,
      whisper: target.value,
    };
  };

  const handleSystemPromptChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    const selectedOption = systemPrompts.value.options.find((opt) =>
      opt.name === target.value
    );
    if (selectedOption) {
      systemPrompts.value = {
        ...systemPrompts.value,
        current: selectedOption.prompt,
      };
    }
  };

  return (
    <div class="settings">
      <div class="setting-group">
        <label for="llmModel">AI Model:</label>
        <select
          id="llmModel"
          value={selectedModels.value.llm}
          onChange={handleLLMChange}
        >
          {availableModels.value.length > 0
            ? (
              availableModels.value.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name} ({model.parameter_size || "Unknown"})
                </option>
              ))
            )
            : (
              <>
                <option value="mistral-small3.1:latest">
                  Mistral Small (Fast)
                </option>
                <option value="llama2-uncensored:7b">Llama2 Uncensored</option>
              </>
            )}
        </select>
      </div>

      <div class="setting-group">
        <label for="whisperModel">Speech Recognition:</label>
        <select
          id="whisperModel"
          value={selectedModels.value.whisper}
          onChange={handleWhisperChange}
        >
          <option value="base">Base (Fast)</option>
          <option value="small">Small (Better)</option>
          <option value="medium">Medium (Best)</option>
        </select>
      </div>

      <div class="setting-group">
        <label for="systemPrompt">AI Personality:</label>
        <select id="systemPrompt" onChange={handleSystemPromptChange}>
          {systemPrompts.value.options.map((option) => (
            <option key={option.name} value={option.name}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <div class="setting-group">
        <label for="ttsEngine">Text-to-Speech:</label>
        <span>Server TTS (Coqui) ✅</span>
      </div>
    </div>
  );
}
