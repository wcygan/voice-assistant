# Voice Assistant Refactor Plan: Fresh + Transformers.js

## Overview
This plan outlines the refactoring of the current voice assistant web UI to use Fresh framework and integrate Transformers.js for client-side text-to-speech capabilities.

## Phase 1: Fresh Framework Migration (4-6 weeks)

### 1.1 Fresh Project Setup
- **Objective**: Migrate from standalone Deno server to Fresh framework
- **Timeline**: Week 1
- **Tasks**:
  - Initialize Fresh project: `deno run -A -r https://fresh.deno.dev/`
  - Configure project structure following Fresh conventions
  - Set up TypeScript configuration and imports
  - Integrate existing dax dependency for shell operations

### 1.2 Route Architecture Design
- **Objective**: Convert current single-page app to Fresh routing system
- **Timeline**: Week 1-2
- **Routes Structure**:
  ```
  routes/
  ├── index.tsx           # Main voice assistant page
  ├── api/
  │   ├── voice.ts        # Voice processing API endpoint
  │   ├── models.ts       # Available models endpoint
  │   └── health.ts       # Health check endpoint
  └── demo/
      ├── stt.tsx         # STT demo page
      ├── tts.tsx         # TTS demo page
      └── conversation.tsx # Conversation demo page
  ```

### 1.3 Component Refactoring
- **Objective**: Convert current vanilla JS to Preact components
- **Timeline**: Week 2-3
- **Components Structure**:
  ```
  components/
  ├── VoiceInterface.tsx     # Main voice recording interface
  ├── ConversationHistory.tsx # Chat history display
  ├── AudioVisualizer.tsx    # Recording visualization (Island)
  ├── SettingsPanel.tsx      # Model and prompt configuration
  ├── StatusIndicator.tsx    # Processing status display
  └── islands/
      ├── VoiceRecorder.tsx  # Interactive recording component
      ├── AudioPlayer.tsx    # Audio playback component
      └── ModelSelector.tsx  # Dynamic model selection
  ```

### 1.4 State Management
- **Objective**: Implement Preact Signals for reactive state
- **Timeline**: Week 3-4
- **State Structure**:
  ```typescript
  // signals/voiceState.ts
  export const isRecording = signal(false);
  export const isProcessing = signal(false);
  export const currentTranscript = signal("");
  export const conversationHistory = signal([]);
  export const selectedModels = signal({
    llm: "mistral-small3.1:latest",
    whisper: "base",
    tts: "browser" // Will switch between server and client TTS
  });
  ```

### 1.5 Server Integration
- **Objective**: Maintain existing voice processing pipeline
- **Timeline**: Week 4
- **Tasks**:
  - Migrate voice processing logic to Fresh API routes
  - Preserve existing Whisper + LLM + TTS server pipeline
  - Add graceful fallback mechanisms
  - Implement proper error handling and logging

## Phase 2: Transformers.js Integration (3-4 weeks)

### 2.1 Client-Side TTS Research & Selection
- **Objective**: Evaluate and select optimal TTS models
- **Timeline**: Week 5
- **Model Evaluation Criteria**:
  - Browser compatibility (WASM vs WebGPU)
  - Model size and loading time
  - Audio quality and naturalness
  - Language support

- **Candidate Models**:
  ```typescript
  const ttsModels = {
    lightweight: "Xenova/speecht5_tts",      // ~50MB, fast
    quality: "Xenova/mms-tts-eng",           // ~100MB, better quality  
    multilingual: "Xenova/vits-ljs",         // ~150MB, multiple voices
  };
  ```

### 2.2 Progressive Enhancement Architecture
- **Objective**: Implement hybrid TTS system (server + client)
- **Timeline**: Week 6-7
- **Strategy**:
  ```typescript
  // services/ttsService.ts
  class TTSService {
    private clientTTS: TransformersTTS | null = null;
    private fallbackMode: 'server' | 'client' = 'server';
    
    async initialize() {
      try {
        this.clientTTS = await TransformersTTS.load();
        this.fallbackMode = 'client';
      } catch (error) {
        console.warn('Client TTS unavailable, using server fallback');
      }
    }
    
    async synthesize(text: string): Promise<AudioBuffer> {
      return this.fallbackMode === 'client' 
        ? await this.clientTTS.generate(text)
        : await this.serverTTS(text);
    }
  }
  ```

### 2.3 Streaming and Performance Optimization
- **Objective**: Implement efficient client-side audio processing
- **Timeline**: Week 7-8
- **Features**:
  - Progressive model loading with loading indicators
  - Audio streaming for long responses
  - Model caching and persistence
  - Background model warming

### 2.4 Browser Compatibility Layer
- **Objective**: Ensure cross-browser functionality
- **Timeline**: Week 8
- **Tasks**:
  - Feature detection for WebGPU, WASM, Web Audio API
  - Polyfills for older browsers
  - Fallback strategies for unsupported features
  - Performance monitoring and metrics

## Phase 3: Enhanced Features & Polish (2-3 weeks)

### 3.1 Advanced Voice Features
- **Timeline**: Week 9-10
- **Features**:
  - Voice selection and customization
  - Speaking rate and pitch control
  - Real-time audio effects and filters
  - Voice activity detection improvements

### 3.2 Offline Capabilities
- **Timeline**: Week 10-11
- **Features**:
  - Service Worker for offline functionality
  - Local model storage and management
  - Offline conversation history
  - Progressive Web App (PWA) features

### 3.3 Performance Optimization
- **Timeline**: Week 11
- **Tasks**:
  - Bundle size optimization
  - Lazy loading of non-critical components
  - Audio compression and optimization
  - Memory usage optimization

## Implementation Roadmap

### Milestone 1: Fresh Migration (Week 4)
- **Deliverables**:
  - Working Fresh application with existing features
  - Improved developer experience and build process
  - Better SEO and performance metrics
  - Component-based architecture

### Milestone 2: Hybrid TTS System (Week 8)
- **Deliverables**:
  - Client-side TTS working in modern browsers
  - Seamless fallback to server TTS
  - Improved response times for short texts
  - Model selection UI

### Milestone 3: Production Ready (Week 11)
- **Deliverables**:
  - Cross-browser compatibility
  - Offline functionality
  - Performance optimized
  - Comprehensive error handling

## Technical Considerations

### Fresh Framework Benefits
- **Zero-config TypeScript**: Improved developer experience
- **Islands Architecture**: Better performance with minimal JavaScript
- **Server-Side Rendering**: Improved SEO and initial load times
- **Deno Integration**: Consistent runtime environment

### Transformers.js Benefits
- **Reduced Server Load**: TTS processing moves to client
- **Lower Latency**: No network round-trip for audio generation
- **Better Privacy**: Audio processing stays local
- **Offline Support**: Works without internet connection

### Challenges & Mitigations

1. **Model Size and Loading**:
   - **Challenge**: TTS models can be 50-200MB
   - **Mitigation**: Progressive loading, quantized models, caching

2. **Browser Compatibility**:
   - **Challenge**: WebGPU and WASM support varies
   - **Mitigation**: Feature detection, graceful fallbacks

3. **Performance**:
   - **Challenge**: Client-side processing can be slow
   - **Mitigation**: Model optimization, background processing, hybrid approach

4. **Memory Usage**:
   - **Challenge**: Large models consume significant memory
   - **Mitigation**: Model unloading, memory monitoring, size limits

## Success Metrics

### Performance Metrics
- **Time to First Byte**: < 200ms (Fresh SSR)
- **First Contentful Paint**: < 1s
- **TTS Latency**: < 2s for short texts (client-side)
- **Model Loading**: < 10s for initial load

### User Experience Metrics
- **Cross-browser Support**: 95%+ modern browsers
- **Offline Functionality**: Core features work offline
- **Error Recovery**: Graceful fallbacks for all failure modes
- **Accessibility**: WCAG 2.1 AA compliance

## Dependencies & Requirements

### Development Dependencies
```typescript
// Fresh framework
"fresh": "^1.6.0",
"preact": "^10.19.0",
"@preact/signals": "^1.2.0",

// Transformers.js
"@xenova/transformers": "^2.6.0",

// Existing dependencies
"dax": "^0.39.2",
// Python/Whisper/TTS remain server-side
```

### Browser Requirements
- **Minimum**: Chrome 90+, Firefox 90+, Safari 15+
- **Optimal**: Chrome 110+ (WebGPU), Firefox 110+, Safari 16+
- **Features**: WebAssembly, Web Audio API, ES2022

## Migration Strategy

### Phase 1: Parallel Development
- Keep existing system running
- Develop Fresh version alongside
- A/B testing capabilities

### Phase 2: Gradual Rollout
- Feature flags for Fresh UI
- Progressive enhancement with Transformers.js
- Monitoring and rollback capabilities

### Phase 3: Full Migration
- Complete transition to Fresh
- Deprecate old system
- Performance optimization and monitoring

This plan provides a comprehensive roadmap for modernizing the voice assistant with Fresh framework and client-side TTS capabilities while maintaining the existing functionality and ensuring a smooth migration path.