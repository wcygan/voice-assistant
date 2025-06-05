import { JSX } from "preact";
import { useEffect } from "preact/hooks";
import { conversationHistory } from "../signals/voiceState.ts";

export default function ConversationHistory(): JSX.Element {
  // Force re-render when conversation changes
  useEffect(() => {
    const container = document.querySelector(".conversation");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [conversationHistory.value]);

  return (
    <div class="conversation">
      {conversationHistory.value.map((message, index) => (
        <div
          key={`${message.timestamp.getTime()}-${index}`}
          class={`message ${message.type}-message`}
        >
          <span class="message-prefix">
            {message.type === "user" ? "👤 You: " : "🤖 AI: "}
          </span>
          {message.text}
        </div>
      ))}
    </div>
  );
}
