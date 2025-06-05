# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a voice assistant project that implements a three-stage pipeline:

1. **Speech to Text (STT)**: Converts voice input to text using lightweight models
2. **Text to Text (LLM)**: Processes transcribed text using powerful language models (like DeepSeek R1)
3. **Text to Speech (TTS)**: Converts LLM responses back to audio

## Architecture

The voice assistant follows this flow:
- User provides voice input → STT model transcribes to text → LLM processes and generates response → TTS synthesizes audio output

## Development Environment Setup

Based on LOCAL-TESTING.md, the project targets macOS M1 development with these prerequisites:

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip wheel

# Install system dependencies
brew install ffmpeg ollama espeak-ng
```

## Model Testing Commands

### STT Models
- **Whisper**: `whisper path/to/audio.wav --model base --fp16 False`
- **Vosk**: `python -m vosk test.wav models/vosk-model-small-en-us-0.15`
- **Coqui STT**: `stt --model coqui.tflite --audio your_audio.wav`

### TTS Models
- **Coqui TTS**: `tts --text "Hello world" --model_name tts_models/en/ljspeech/tacotron2-DDC --out_path output.wav`
- **Piper**: `./piper --model voices/en/en_US-libritts-high.onnx --text "Testing piper" --output_file piper.wav`
- **espeak-ng**: `espeak-ng "This is a test" --stdout > espeak.wav`

### LLM
- **Ollama**: `ollama serve` (background) then `ollama pull mistral && ollama run mistral`

## Implementation Notes

- Focus on lightweight models for STT and TTS to ensure real-time performance
- Use powerful models (like DeepSeek R1) for the reasoning/LLM stage
- The project currently contains architecture documentation but no implementation code