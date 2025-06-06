# Model Guide

This guide covers all available models for STT, LLM, and TTS components.

## Speech-to-Text (STT) Models

### OpenAI Whisper

Whisper is the recommended STT model for accuracy and language support.

#### Available Models

| Model | Size | Speed | Accuracy | Use Case |
|-------|------|-------|----------|----------|
| `tiny` | 74MB | Fastest | Good | Quick demos, low resources |
| `base` | 142MB | Fast | Better | **Default - balanced choice** |
| `small` | 466MB | Moderate | Very Good | Better accuracy needed |
| `medium` | 1.5GB | Slow | Excellent | High accuracy required |
| `large` | 2.9GB | Slowest | Best | Maximum accuracy |

#### Language Support
- 99+ languages supported
- Automatic language detection
- Specify language: `--language en`

### Vosk

Lightweight alternative for offline use.

#### English Models
- `vosk-model-small-en-us-0.15` (40MB) - Fast, decent accuracy
- `vosk-model-en-us-0.22` (1.8GB) - Better accuracy
- `vosk-model-en-us-0.22-lgraph` (128MB) - Good balance

### Coqui STT

Open source STT with custom model training support.

#### Pre-trained Models
- English: Multiple accents available
- Supports fine-tuning on custom data

## Language Models (LLM)

### Ollama Models

All models run locally through Ollama.

#### Recommended Models

| Model | Size | Speed | Use Case |
|-------|------|-------|----------|
| `mistral-small3.1:latest` | 1.8GB | Fast | **Default - general purpose** |
| `llama2:7b` | 3.8GB | Moderate | Better reasoning |
| `llama2-uncensored:7b` | 3.8GB | Moderate | Less filtered responses |
| `deepseek-r1:8b` | 4.5GB | Moderate | Complex reasoning tasks |
| `phi-2` | 1.7GB | Fast | Lightweight, good quality |

#### Pulling Models

```bash
# Start Ollama
ollama serve

# Pull models
ollama pull mistral-small3.1:latest
ollama pull llama2:7b
ollama pull deepseek-r1:8b
```

#### Model Configuration

Models can be customized with parameters:

```json
{
  "model": "mistral-small3.1:latest",
  "temperature": 0.7,      // 0-1, higher = more creative
  "top_p": 0.9,           // Nucleus sampling
  "max_tokens": 500,      // Response length limit
  "system": "Custom system prompt..."
}
```

## Text-to-Speech (TTS) Models

### Coqui TTS

High-quality neural TTS with multiple voices.

#### Recommended Models

| Model | Quality | Speed | Voice |
|-------|---------|-------|-------|
| `tts_models/en/ljspeech/tacotron2-DDC` | Good | Fast | Female, clear |
| `tts_models/en/ljspeech/glow-tts` | Better | Moderate | Female, natural |
| `tts_models/en/vctk/vits` | Best | Slow | Multiple speakers |
| `tts_models/en/jenny/jenny` | Excellent | Moderate | Female, expressive |

#### List Available Models

```bash
tts --list_models
```

### Piper

Fast neural TTS, good for real-time applications.

#### Voice Models
- `en_US-libritts-high` - High quality
- `en_US-libritts-medium` - Balanced
- `en_US-ryan-high` - Male voice
- `en_US-kathleen-low` - Fast female voice

### Chatterbox (Advanced)

Emotion-controlled TTS with voice cloning.

#### Features
- 8 emotion presets
- Voice cloning from reference audio
- Real-time emotion detection
- Neural watermarking

#### Emotions
- `neutral` - Default tone
- `happy` - Cheerful, upbeat
- `excited` - Energetic, enthusiastic  
- `sad` - Somber, melancholic
- `calm` - Soothing, relaxed
- `serious` - Professional, formal
- `empathetic` - Understanding, caring
- `curious` - Inquisitive, interested

#### Requirements
- GPU with 10-13GB VRAM (recommended)
- ~2GB model download
- Python 3.11

## Model Selection Guidelines

### For Development/Testing
- STT: Whisper `base`
- LLM: Mistral Small 3.1
- TTS: Coqui `tacotron2-DDC`

### For Production
- STT: Whisper `small` or `medium`
- LLM: Llama2 7B or DeepSeek R1
- TTS: Coqui `glow-tts` or Piper

### For Low Resources
- STT: Vosk small model
- LLM: Phi-2
- TTS: espeak-ng

### For Best Quality
- STT: Whisper `large`
- LLM: DeepSeek R1 or larger Llama2
- TTS: Chatterbox or Coqui VITS

## Performance Considerations

### STT Performance
```
Whisper tiny:   ~1s per 10s audio
Whisper base:   ~2s per 10s audio
Whisper small:  ~4s per 10s audio
Whisper medium: ~8s per 10s audio
```

### LLM Performance
```
Mistral 1.8B: ~5 tokens/sec
Llama2 7B:    ~3 tokens/sec
DeepSeek 8B:  ~2 tokens/sec
```

### TTS Performance
```
Coqui Tacotron2: ~0.5s per sentence
Coqui GlowTTS:   ~1s per sentence
Piper:           ~0.3s per sentence
Chatterbox:      ~2s per sentence
```

## Custom Models

### Training Custom STT
- Use Coqui STT for custom vocabulary
- Fine-tune Whisper for domain-specific accuracy

### Custom LLM Prompts
Create domain-specific system prompts:

```javascript
const prompts = {
  technical: "You are a technical expert. Provide detailed, accurate answers about programming and technology.",
  creative: "You are a creative writer. Respond with imagination and artistic flair.",
  concise: "You are a concise assistant. Keep responses brief and to the point."
};
```

### Custom TTS Voices
- Clone voices with Chatterbox
- Fine-tune Coqui TTS models
- Train Piper voices