# API Reference

## Fresh Voice Assistant API

The Fresh voice assistant provides RESTful API endpoints for voice processing.

### Base URL
```
http://localhost:8001
```

## Endpoints

### POST /api/voice

Process voice input and return AI response with synthesized audio.

#### Request

```json
{
  "audio": "base64_encoded_webm_audio",
  "model": "mistral-small3.1:latest",
  "whisperModel": "base",
  "systemPrompt": "You are a helpful assistant..."
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `audio` | string | Yes | Base64 encoded WebM audio data |
| `model` | string | No | Ollama model ID (default: mistral-small3.1:latest) |
| `whisperModel` | string | No | Whisper model size: tiny, base, small, medium, large |
| `systemPrompt` | string | No | Custom system prompt for the AI |

#### Response

```json
{
  "success": true,
  "transcript": "Hello, how are you?",
  "response": "I'm doing well, thank you for asking!",
  "audioResponse": "base64_encoded_wav_audio"
}
```

#### Error Response

```json
{
  "success": false,
  "error": "Error message here"
}
```

#### Example

```bash
curl -X POST http://localhost:8001/api/voice \
  -H "Content-Type: application/json" \
  -d '{
    "audio": "data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC...",
    "model": "llama2:latest"
  }'
```

### GET /api/models

List available Ollama models.

#### Response

```json
{
  "models": [
    {
      "name": "mistral-small3.1:latest",
      "size": "1.8GB",
      "modified": "2024-01-15T10:30:00Z"
    },
    {
      "name": "llama2:latest", 
      "size": "3.8GB",
      "modified": "2024-01-14T15:45:00Z"
    }
  ]
}
```

#### Example

```bash
curl http://localhost:8001/api/models
```

### GET /api/health

Check the health status of all dependencies.

#### Response

```json
{
  "status": "healthy",
  "checks": {
    "ffmpeg": {
      "status": "ok",
      "version": "6.0"
    },
    "python": {
      "status": "ok",
      "version": "3.11.7"
    },
    "whisper": {
      "status": "ok",
      "available": true
    },
    "tts": {
      "status": "ok",
      "available": true
    },
    "ollama": {
      "status": "ok",
      "running": true,
      "models": ["mistral-small3.1:latest", "llama2:latest"]
    }
  }
}
```

#### Example

```bash
curl http://localhost:8001/api/health
```

## JavaScript/TypeScript Client Example

```typescript
// Record audio using MediaRecorder
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const recorder = new MediaRecorder(stream);
const chunks: Blob[] = [];

recorder.ondataavailable = (e) => chunks.push(e.data);
recorder.onstop = async () => {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  const reader = new FileReader();
  
  reader.onloadend = async () => {
    const base64Audio = reader.result as string;
    
    const response = await fetch('/api/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio: base64Audio,
        model: 'mistral-small3.1:latest'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Transcript:', data.transcript);
      console.log('Response:', data.response);
      
      // Play audio response
      const audio = new Audio(data.audioResponse);
      await audio.play();
    }
  };
  
  reader.readAsDataURL(blob);
};

// Start recording
recorder.start();

// Stop after 5 seconds
setTimeout(() => recorder.stop(), 5000);
```

## WebSocket API (Coming Soon)

Future versions will support WebSocket connections for real-time streaming:

```javascript
const ws = new WebSocket('ws://localhost:8001/api/voice/stream');

ws.onopen = () => {
  // Send audio chunks as they're recorded
  recorder.ondataavailable = (e) => {
    ws.send(e.data);
  };
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'transcript') {
    console.log('Partial transcript:', data.text);
  } else if (data.type === 'response') {
    console.log('AI response:', data.text);
  } else if (data.type === 'audio') {
    // Play audio chunk
    playAudioChunk(data.audio);
  }
};
```

## Rate Limits

Currently, there are no rate limits, but for production use consider:

- Max request size: 10MB
- Concurrent requests: 10
- Requests per minute: 60

## Security Considerations

1. **CORS**: API allows localhost origins by default
2. **Authentication**: Not implemented (add for production)
3. **Input Validation**: Audio size and format validation
4. **HTTPS**: Recommended for production deployment

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid audio format or parameters |
| 500 | Internal Server Error - Processing failure |
| 503 | Service Unavailable - Dependency not available |