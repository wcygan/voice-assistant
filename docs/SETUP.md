# Setup Guide

This guide will help you set up the voice assistant on your machine.

## Prerequisites

### System Requirements
- **macOS, Linux, or Windows** (WSL recommended for Windows)
- **4GB+ RAM** (8GB+ recommended)
- **10GB free disk space** for models
- **GPU** (optional but recommended for Chatterbox TTS)

### Software Requirements

1. **Deno** (JavaScript/TypeScript runtime)
   ```bash
   curl -fsSL https://deno.land/install.sh | sh
   ```

2. **Python 3.11** (Required - 3.12+ has compatibility issues with Coqui TTS)
   ```bash
   # macOS with Homebrew
   brew install python@3.11
   
   # Ubuntu/Debian
   sudo apt install python3.11 python3.11-venv
   ```

3. **FFmpeg** (Audio processing)
   ```bash
   # macOS
   brew install ffmpeg
   
   # Ubuntu/Debian
   sudo apt install ffmpeg
   ```

## Quick Setup

The easiest way to set up is using the interactive setup script:

```bash
# Clone the repository
git clone https://github.com/yourusername/voice-assistant.git
cd voice-assistant

# Run interactive setup
deno task setup
```

This will guide you through installing the models you need.

## Manual Setup




















### 1. Python Virtual Environment

```bash
# Create virtual environment
python3.11 -m venv venv

# Activate it
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate     # On Windows
```

### 2. Speech-to-Text (STT)

#### Whisper (Recommended)
```bash
pip install -U openai-whisper
```

#### Vosk (Lightweight)
```bash
pip install vosk
# Download a model
mkdir -p models && cd models
curl -LO https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
unzip vosk-model-small-en-us-0.15.zip
cd ..
```

### 3. Text-to-Speech (TTS)

#### Coqui TTS (High Quality)
```bash
pip install TTS
```

#### Piper (Fast)
```bash
# macOS
curl -L -o piper.tar.gz https://github.com/rhasspy/piper/releases/latest/download/piper_macOS_arm64.tar.gz
tar -xf piper.tar.gz

# Linux
curl -L -o piper.tar.gz https://github.com/rhasspy/piper/releases/latest/download/piper_linux_x86_64.tar.gz
tar -xf piper.tar.gz
```

### 4. Language Model (LLM)

#### Ollama
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# In another terminal, pull a model
ollama pull mistral
ollama pull llama2
```

## Verification

After setup, verify everything works:

```bash
# Test the complete pipeline
deno task test:roundtrip

# Check system health
curl http://localhost:8001/api/health  # If using Fresh UI
```

## Troubleshooting

### Common Issues

1. **Python version conflicts**
   - Ensure you're using Python 3.11 specifically
   - Check with: `python --version`

2. **FFmpeg not found**
   - Add FFmpeg to your PATH
   - Verify with: `ffmpeg -version`

3. **Ollama connection refused**
   - Make sure Ollama is running: `ollama serve`
   - Check if port 11434 is available

4. **Audio permission denied**
   - Browser may need microphone permissions
   - Check browser settings for localhost

### Getting Help

- Check the [Troubleshooting Guide](TROUBLESHOOTING.md)
- Open an issue on GitHub
- Review logs: `deno task logs` (Fresh UI)

## Next Steps

1. Try the web interface: `deno task web`
2. Run demos: `deno task demo:conversation`
3. Read the [API Reference](API.md)
4. Explore [available models](MODELS.md)