# Fresh Voice Assistant

The modern web interface for the voice assistant, built with Deno Fresh framework.

## Features

- **Server-side rendering** with Islands Architecture
- **Real-time voice recording** with WebRTC MediaRecorder
- **Visual feedback** during recording and processing
- **Conversation history** with auto-scroll
- **Model selection** for STT, LLM, and TTS
- **Customizable prompts** for different AI personalities

## Quick Start

```bash
# From the fresh-voice-assistant directory
deno task start

# Application runs on http://localhost:8001
```

## Prerequisites

Make sure you've completed the main setup:

```bash
# From the root directory
cd ..
deno task setup
```

## Architecture

```
fresh-voice-assistant/
├── routes/              # Pages and API endpoints
│   ├── index.tsx       # Main UI page
│   └── api/            # REST endpoints
├── islands/            # Interactive components
│   └── VoiceRecorder.tsx
├── components/         # Static UI components
├── signals/            # State management
└── static/             # CSS and assets
```

## API Endpoints

See the [API Reference](../docs/API.md) for detailed endpoint documentation:

- `POST /api/voice` - Process voice input
- `GET /api/models` - List available models
- `GET /api/health` - System health check

## Development

### Available Tasks

```bash
deno task start   # Start dev server with hot reload
deno task build   # Build for production
deno task check   # Format, lint, and type check
deno task logs    # View processing logs
```

### Debugging

- Browser console shows detailed debug logs
- Server logs: `tail -f /tmp/fresh_voice_logs.txt`
- Test audio system with built-in test buttons

## Improvements Over Original Web UI

- **Better performance** with server-side rendering
- **Modular architecture** with components and islands
- **Type safety** throughout the codebase
- **Better error handling** and user feedback
- **Cleaner UI** with modern design patterns

## Configuration

Models and settings can be configured through the UI:

1. **LLM Model**: Select from available Ollama models
2. **Whisper Model**: Choose STT accuracy vs speed
3. **System Prompt**: Customize AI personality
4. **Audio Settings**: Configured automatically

## Contributing

See the main [Development Guide](../docs/DEVELOPMENT.md) for contribution guidelines.
