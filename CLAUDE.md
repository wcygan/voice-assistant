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
deno task demo:tts --showcase    # See TTS in action
deno task demo:stt --sample      # Try STT with sample audio
deno task test:roundtrip         # Full pipeline test
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
- **Chatterbox**: Emotion-controlled TTS (GPU required)
- **Dia**: Multi-speaker dialogue synthesis (GPU required)

### LLM (Large Language Models)
- **Ollama**: Local LLM runner (supports Mistral, Llama, etc.)

## Architecture

The voice assistant follows this flow:
- User provides voice input → STT model transcribes to text → LLM processes and generates response → TTS synthesizes audio output

## Demos & Testing

### Quick Demos
Showcase individual technologies to users:
```bash
# TTS Demo - Text to Speech
deno task demo:tts --showcase           # Multiple examples
deno task demo:tts --interactive        # Interactive mode
deno task demo:tts --text "Hello!"      # Single synthesis

# STT Demo - Speech to Text  
deno task demo:stt --sample             # Generate & transcribe sample
deno task demo:stt --input audio.wav    # Transcribe your audio
deno task demo:stt --input audio.wav --model large  # High accuracy
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