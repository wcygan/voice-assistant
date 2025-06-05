# Fresh Voice Assistant - User Guide

## Overview

The Fresh Voice Assistant is a modern web-based AI voice interface built with
Deno Fresh framework. It provides seamless voice interactions with AI models
through a clean, responsive web interface.

## Features

- 🎤 **Voice Input**: Click-to-talk interface with real-time audio recording
- 🤖 **AI Processing**: Multiple LLM options (Mistral, Llama2) for intelligent
  responses
- 🔊 **Voice Output**: Natural text-to-speech synthesis for AI responses
- 💬 **Conversation History**: Visual chat log with auto-scrolling
- ⚙️ **Customizable**: Choose AI models, Whisper models, and system prompts
- 🎯 **Auto-playback**: Responses play automatically (with fallback controls)

## Getting Started

### Prerequisites

Ensure you have the following installed:

- Deno 1.40+
- Python 3.8-3.11 (with venv)
- FFmpeg
- Ollama (running locally)
- Whisper and Coqui TTS (in Python venv)

### Starting the Application

```bash
# Start the development server
deno task start

# The app will be available at http://localhost:8001
```

### First Time Setup

1. Open http://localhost:8001 in your browser
2. Allow microphone access when prompted
3. You'll see the voice interface with a large "Click to Talk" button

## How to Use

### Basic Voice Interaction

1. **Click the microphone button** (🎤 Click to Talk)
2. **Speak your question or command** clearly
3. **Click again to stop recording** (or it will auto-stop)
4. **Wait for processing** (~10-15 seconds total)
5. **Listen to the AI response** (plays automatically)

### Audio Playback

The system attempts to play audio responses automatically. If your browser
blocks autoplay:

- Click the green **"▶️ Play Response"** button
- Or use the audio controls that appear below
- The audio element will highlight with a green pulse when manual play is needed

### Settings & Customization

#### AI Model Selection

- Choose from available Ollama models
- Default: `mistral-small3.1:latest`
- Options update dynamically based on what's installed

#### Whisper Model

- Select transcription accuracy level
- Options: `tiny`, `base`, `small`, `medium`, `large`
- Default: `base` (good balance of speed/accuracy)

#### System Prompt

- Customize the AI's personality and behavior
- Default: Brief, conversational assistant
- Edit to change response style

### Test Functions

The interface includes test buttons for troubleshooting:

- **🔊 Test Audio**: Plays a test tone to verify audio output
- **🔧 Test Base64**: Tests the complete audio processing pipeline

## Troubleshooting

### Microphone Issues

- **"Microphone access denied"**: Refresh page and allow microphone access
- Check browser permissions: Settings → Privacy → Microphone

### Audio Playback Issues

- **No automatic playback**: Click "Play Response" button or audio controls
- **No sound**: Check system volume and browser tab audio settings
- **Audio controls highlighted**: Browser blocked autoplay, manual play required

### Processing Errors

- **"Dependencies not available"**: Ensure Python venv is set up with required
  packages
- **"Ollama service not running"**: Start Ollama with `ollama serve`
- **"No speech detected"**: Speak clearly and ensure microphone is working

### Performance

- Initial model loading may take extra time
- Typical end-to-end response: 10-18 seconds
- Whisper transcription: ~2-3 seconds
- LLM response: ~3-8 seconds (model dependent)
- TTS generation: ~5-7 seconds

## Browser Compatibility

| Browser | Auto-playback | Notes                           |
| ------- | ------------- | ------------------------------- |
| Chrome  | ✅ Good       | Works after first interaction   |
| Edge    | ✅ Good       | Similar to Chrome               |
| Firefox | ✅ Good       | May need manual play first time |
| Safari  | ⚠️ Limited    | Often requires manual play      |

## API Endpoints

The application exposes these endpoints:

- `POST /api/voice` - Main voice processing endpoint
- `GET /api/models` - List available Ollama models
- `GET /api/health` - Service health check

## Architecture

```
User Voice → Microphone → WebM Audio → Server
                                         ↓
                                    FFmpeg (WAV)
                                         ↓
                                    Whisper (Text)
                                         ↓
                                    Ollama (Response)
                                         ↓
                                    Coqui TTS (Audio)
                                         ↓
                                    Base64 Encoding
                                         ↓
Browser ← Audio Playback ← Response
```

## Privacy & Security

- All processing happens locally on your machine
- No audio or text data is sent to external services
- Microphone access is only active during recording
- Temporary files are cleaned up after processing

## Tips for Best Results

1. **Clear Speech**: Speak naturally but clearly
2. **Quiet Environment**: Reduce background noise
3. **Complete Thoughts**: Finish your sentence before stopping
4. **Browser Choice**: Use Chrome/Edge for best auto-playback
5. **First Interaction**: Click record button to enable audio

## Development

For developers wanting to modify or extend the assistant:

- Frontend code: `islands/VoiceRecorder.tsx`
- API endpoints: `routes/api/voice.ts`
- State management: `signals/voiceState.ts`
- Styles: `static/voice-assistant.css`

## Support

If you encounter issues:

1. Check the browser console (F12) for error messages
2. Verify all services are running (check `/api/health`)
3. Try the test buttons to isolate the problem
4. Ensure dependencies are properly installed
