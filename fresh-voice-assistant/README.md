# 🎤 Voice Assistant - Fresh Edition

A modern AI-powered voice assistant built with Fresh framework, featuring speech recognition, LLM conversation, and text-to-speech synthesis.

## ✨ Features

- **🎯 Fresh Framework**: Server-side rendering with Islands Architecture
- **🗣️ Voice Recognition**: OpenAI Whisper for accurate speech-to-text
- **🤖 AI Conversations**: Local LLM integration with Ollama (Mistral, Llama2)
- **🔊 Text-to-Speech**: Coqui TTS for natural voice synthesis
- **⚡ Real-time Processing**: WebM → WAV conversion with FFmpeg
- **📱 Responsive UI**: Modern design with visual feedback
- **🔧 Health Monitoring**: Comprehensive dependency checking

## 🚀 Quick Start

### Prerequisites
- Deno 2.0+
- Python virtual environment with Whisper and Coqui TTS
- Ollama running locally with models
- FFmpeg for audio conversion

### Running the Application

```bash
# Start the development server
deno task start

# View logs in real-time
deno task logs

# Check system health
curl http://localhost:8001/api/health

# View available models
curl http://localhost:8001/api/models
```

The application will be available at: **http://localhost:8001**

## 📊 System Architecture

### Fresh Framework Structure
```
fresh-voice-assistant/
├── routes/
│   ├── index.tsx          # Main voice assistant page
│   └── api/
│       ├── voice.ts       # Voice processing endpoint
│       ├── models.ts      # Available models API
│       └── health.ts      # Health check endpoint
├── components/
│   ├── VoiceInterface.tsx # Main UI component
│   ├── ConversationHistory.tsx
│   └── SettingsPanel.tsx
├── islands/
│   └── VoiceRecorder.tsx  # Interactive recording component
└── signals/
    └── voiceState.ts      # Centralized state management
```

### Voice Processing Pipeline
1. **Browser Recording**: WebRTC → WebM audio
2. **Server Processing**: WebM → WAV → Whisper → LLM → TTS
3. **Audio Response**: Base64 encoded audio → Browser playback

## 🛠️ API Endpoints

### POST `/api/voice`
Process voice input and return AI response with audio.

**Request:**
```json
{
  "audio": "base64_encoded_webm_audio",
  "model": "mistral-small3.1:latest",
  "whisperModel": "base",
  "systemPrompt": "You are a helpful assistant..."
}
```

**Response:**
```json
{
  "success": true,
  "transcript": "Hello there",
  "response": "Hi! How can I help you?",
  "audioResponse": "base64_encoded_wav_audio"
}
```

### GET `/api/health`
Check system dependencies and service status.

### GET `/api/models`
List available Ollama models.

## 🔧 Configuration

### Model Settings
- **LLM Models**: Mistral Small, Llama2 Uncensored
- **Whisper Models**: base (fast), small (better), medium (best)
- **System Prompts**: Helpful Assistant, Coding Assistant, Creative Writer, Wise Mentor

### Logging
All voice processing activities are logged to `/tmp/fresh_voice_logs.txt` with timestamps and color-coded status messages.

## 🏗️ Development Roadmap

### ✅ Phase 1: Fresh Migration (COMPLETED)
- Fresh framework implementation
- Component-based architecture
- API route conversion
- Feature parity with original

### 🚧 Phase 2: Transformers.js Integration (IN PROGRESS)
- Client-side TTS with browser models
- Hybrid server/client processing
- Performance optimization

### 📋 Phase 3: Enhanced Features (PLANNED)
- Offline PWA capabilities
- Advanced voice customization
- Cross-browser optimization

## 📈 Performance Metrics

- **First Contentful Paint**: < 1s (Fresh SSR)
- **Voice Processing**: 2-5s end-to-end
- **TTS Generation**: 0.8-3s depending on text length
- **Model Loading**: Instant (server-side models)

## 🔍 Monitoring & Debugging

```bash
# Real-time log monitoring
deno task logs

# Health check with detailed status
curl -s http://localhost:8001/api/health | jq .

# Manual voice processing test
curl -X POST http://localhost:8001/api/voice \
  -H "Content-Type: application/json" \
  -d '{"audio":"<base64_audio>","model":"mistral-small3.1:latest"}'
```

## 🤝 Contributing

This application demonstrates modern web development with:
- Fresh framework for optimal performance
- Islands Architecture for minimal JavaScript
- Preact Signals for reactive state management
- TypeScript for type safety
- Comprehensive error handling and logging

Built with ❤️ using Fresh, Deno, and AI technologies.