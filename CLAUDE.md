# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a voice assistant project that implements a three-stage pipeline:

1. **Speech to Text (STT)**: Converts voice input to text using lightweight models
2. **Text to Text (LLM)**: Processes transcribed text using powerful language models (like DeepSeek R1)
3. **Text to Speech (TTS)**: Converts LLM responses back to audio

## Quick Start

```bash
# 1. Install Deno (if not already installed)
curl -fsSL https://deno.land/install.sh | sh

# 2. Install system dependencies
brew install ffmpeg python@3.11

# 3. Set up models (interactive menu)
deno task setup

# 4. Try the demos
deno task web                    # 🌐 Web interface (easiest!)
deno task demo:conversation      # Complete voice assistant
deno task demo:realtime          # Live microphone input
deno task demo:tts --showcase    # See TTS in action
deno task demo:stt --sample      # Try STT with sample audio
```

## Development Environment Setup

### Prerequisites
- **Deno**: JavaScript/TypeScript runtime
- **Python 3.11**: Required for ML models (Coqui TTS has compatibility issues with 3.12+)
- **FFmpeg**: Audio processing
- **macOS**: Scripts are optimized for macOS (adaptable to other platforms)

### Quick Setup Commands
```bash
# Set up specific models
deno task setup whisper      # Whisper STT
deno task setup coqui-tts    # Coqui TTS
deno task setup ollama       # Ollama LLM

# Set up all models at once
deno task setup:all

# Test the complete pipeline
deno task test:roundtrip
```

## Available Models

### STT (Speech-to-Text)
- **Whisper**: OpenAI's robust STT (CPU/GPU)
- **Vosk**: Lightweight offline recognition
- **Coqui STT**: Customizable STT
- **DeepSpeech**: Mozilla's offline STT

### TTS (Text-to-Speech)
- **Coqui TTS**: High-quality neural TTS
- **Piper**: Fast neural synthesis
- **espeak-ng**: Traditional lightweight TTS
- **Chatterbox**: Emotion-controlled TTS with voice cloning (GPU recommended)
  - Unique ability to control emotional expression
  - Voice cloning with reference audio
  - Neural watermarking for responsible AI
- **Dia**: Multi-speaker dialogue synthesis (GPU required)

### LLM (Large Language Models)
- **Ollama**: Local LLM runner (supports Mistral, Llama, etc.)

## Architecture

The voice assistant follows this flow:
- User provides voice input → STT model transcribes to text → LLM processes and generates response → TTS synthesizes audio output

## Demos & Testing

### Quick Demos
Showcase technologies to users:
```bash
# 🌐 Web Interface (Recommended!)
deno task web                          # Browser-based voice assistant
# Open http://localhost:8000 in your browser

# Complete Voice Assistant - Voice to Voice  
deno task demo:conversation            # Full AI conversation
deno task demo:conversation --input question.wav  # Use your audio
deno task demo:conversation --model llama2-uncensored:7b  # Different AI
deno task demo:conversation --use-chatterbox  # With emotion control!

# Chatterbox TTS - Emotion Control
deno task demo:chatterbox --showcase   # See all emotions
deno task demo:chatterbox --text "Hello!" --emotion happy
deno task demo:chatterbox --interactive  # Try different emotions
deno task demo:chatterbox --voice ref.wav  # Voice cloning

# Real-time Voice Assistant
deno task demo:realtime                # Live microphone input
deno task demo:realtime --whisper large  # High accuracy mode

# Individual Component Demos
deno task demo:tts --showcase          # Multiple TTS examples
deno task demo:tts --interactive       # Interactive mode
deno task demo:stt --sample            # Generate & transcribe sample
deno task demo:stt --input audio.wav   # Transcribe your audio
```

### Round-Trip Testing
Test the complete STT→TTS pipeline:
```bash
# Basic test
deno task test:roundtrip

# Test with custom text
deno task test:roundtrip --text "Your custom message"

# Test with existing audio
deno task test:roundtrip --input your_audio.wav

# Use different models
deno task test:roundtrip --whisper small --tts tts_models/en/ljspeech/glow-tts
```

## Common Development Tasks

### Build and Check
```bash
deno task fmt      # Format code
deno task lint     # Lint code
deno task check    # Type check
```

### Model Management
- All models are downloaded via setup scripts
- Virtual environment is automatically created
- Large model files are gitignored
- Use `venv/` for Python dependencies

## Implementation Notes

- **Python 3.11**: Required for Coqui TTS compatibility
- **Virtual Environment**: Located in `venv/` directory
- **Model Storage**: Models downloaded to user cache directories
- **Audio Formats**: WAV preferred, auto-conversion supported
- **Real-time Performance**: STT/TTS optimized for speed, LLM for quality

## Chatterbox Integration

Chatterbox brings emotion-controlled speech synthesis to the voice assistant:

### Features
- **Emotion Control**: 8 preset emotions (neutral, happy, excited, sad, calm, serious, empathetic, curious)
- **Voice Cloning**: Clone any voice with a reference audio sample
- **LLM Integration**: Automatic emotion detection based on response context
- **Neural Watermarking**: Built-in responsible AI features

### Usage Examples
```bash
# Setup Chatterbox
deno task setup chatterbox

# Demo with emotions
deno task demo:chatterbox --text "I'm so happy!" --emotion excited
deno task demo:chatterbox --showcase  # See all emotions

# Voice conversation with emotions
deno task demo:conversation --use-chatterbox

# Web interface with Chatterbox
# The web UI automatically detects emotions when Chatterbox is available
```

### GPU Requirements
- **Recommended**: NVIDIA GPU with 10-13GB VRAM
- **Supported**: CPU mode (slower but functional)
- **Model Size**: ~2GB download on first run

## Known Issues & Limitations

### Performance
- **10-18 second end-to-end latency** for full pipeline (STT→LLM→TTS)
- **Base64 encoding overhead** for audio transport - consider binary alternatives
- **Sequential processing** prevents parallelization opportunities

### Code Organization
- **VoiceRecorder.tsx is too large (1159 lines)** - needs refactoring into:
  - VAD component
  - Audio processing utilities
  - Recording state management
  - UI components
- **Orphaned MediaRecorder tracking** is a workaround for deeper state issues

### Security & Stability
- **No request validation** on API endpoints
- **No rate limiting** - vulnerable to abuse
- **Missing authentication** for production deployment
- **Potential memory leaks** with long-running audio contexts

## Architecture Details

### Frontend (Fresh)
- **Islands Architecture**: Interactive components in `islands/`
- **State Management**: Preact Signals in `signals/voiceState.ts`
- **Components**: Static UI in `components/`, interactive in `islands/`
- **Routes**: API endpoints in `routes/api/`, pages in `routes/`

### Audio Processing Pipeline
```
[Microphone] → [MediaRecorder] → [VAD] → [Base64 Encoding] → [API]
     ↓                                                           ↓
[TTS Audio] ← [Base64 Decoding] ← [API Response] ← [LLM] ← [STT]
```

### Key Files
- `islands/VoiceRecorder.tsx`: Main recording interface (needs refactoring)
- `routes/api/voice.ts`: Voice processing endpoint
- `utils/voiceActivityDetection.ts`: VAD implementation
- `scripts/demo/*.ts`: Individual component demos

## Testing Guidelines

### Running Tests
```bash
# Unit tests
deno test

# Specific test files
deno test tests/mediaRecorder.test.ts
deno test utils/voiceActivityDetection.test.ts

# Integration test (full pipeline)
deno task test:roundtrip
```

### Test Coverage Gaps
- No API endpoint tests
- Missing integration tests for web interface
- No performance benchmarks
- Limited error scenario testing

## Common Development Pitfalls

1. **MediaRecorder State**: Always check recorder state before operations
2. **Audio Context**: Must be created after user interaction (browser security)
3. **Python Dependencies**: Use Python 3.11 specifically (3.12+ breaks Coqui TTS)
4. **CORS Issues**: Test with actual browser, not just API clients
5. **Temporary Files**: Clean up `temp_*` directories regularly

## Refactoring Priorities

### High Priority
1. Split VoiceRecorder.tsx into smaller components
2. Implement WebSocket streaming for real-time processing
3. Replace Base64 with binary transport (ArrayBuffer/Blob)
4. Add request validation middleware
5. Create comprehensive integration tests

### Medium Priority
1. Implement caching for TTS responses
2. Add authentication system
3. Create shared audio utilities module
4. Implement proper error recovery
5. Add performance monitoring

### Future Improvements
- WebRTC for peer-to-peer audio streaming
- GPU acceleration for on-device models
- Multi-language support
- Conversation context persistence
- Voice customization options