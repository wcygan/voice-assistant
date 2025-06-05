import { JSX } from "preact";
import { conversationHistory } from "../signals/voiceState.ts";

export default function ConversationHistory(): JSX.Element {
  return (
    <div class="conversation">
      {conversationHistory.value.map((message, index) => (
        <div key={index} class={`message ${message.type}-message`}>
          <span class="message-prefix">
            {message.type === "user" ? "👤 You: " : "🤖 AI: "}
          </span>
          {message.text}
        </div>
      ))}
    </div>
  );
}