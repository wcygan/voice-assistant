// Voice Activity Detection (VAD) utility
export class VoiceActivityDetector {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array;
  private isListening = false;
  private silenceTimeout: number | null = null;
  private voiceStartCallback: () => void;
  private voiceEndCallback: () => void;

  // Configuration
  private config = {
    // Threshold for voice detection (0-255)
    voiceThreshold: 30,
    // Time in ms to wait before considering silence
    silenceDelay: 1500,
    // Minimum time in ms for valid speech
    minSpeechDuration: 300,
    // Smoothing factor for volume changes
    smoothingTimeConstant: 0.8,
    // FFT size for frequency analysis
    fftSize: 2048,
  };

  private speechStartTime: number | null = null;
  private isSpeaking = false;

  constructor(
    audioContext: AudioContext,
    onVoiceStart: () => void,
    onVoiceEnd: () => void,
    customConfig?: Partial<typeof VoiceActivityDetector.prototype.config>,
  ) {
    this.audioContext = audioContext;
    this.voiceStartCallback = onVoiceStart;
    this.voiceEndCallback = onVoiceEnd;

    // Apply custom configuration
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    // Create analyser node
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.config.fftSize;
    this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;

    // Create data array for frequency data
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  start(stream: MediaStream): void {
    try {
      // Create microphone source
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);

      this.isListening = true;
      this.detectVoice();
    } catch (error) {
      console.error("Failed to start VAD:", error);
      throw error;
    }
  }

  stop(): void {
    this.isListening = false;

    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }

    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    // If we were speaking, trigger end callback
    if (this.isSpeaking) {
      this.isSpeaking = false;
      this.voiceEndCallback();
    }
  }

  private detectVoice(): void {
    if (!this.isListening) return;

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);

    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const averageVolume = sum / this.dataArray.length;

    // Check if voice is detected
    const isVoiceDetected = averageVolume > this.config.voiceThreshold;

    if (isVoiceDetected && !this.isSpeaking) {
      // Voice started
      this.handleVoiceStart();
    } else if (!isVoiceDetected && this.isSpeaking) {
      // Voice might have stopped
      this.handlePotentialVoiceEnd();
    } else if (isVoiceDetected && this.isSpeaking) {
      // Voice continues, clear any silence timeout
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
        this.silenceTimeout = null;
      }
    }

    // Continue detection
    requestAnimationFrame(() => this.detectVoice());
  }

  private handleVoiceStart(): void {
    this.isSpeaking = true;
    this.speechStartTime = Date.now();
    this.voiceStartCallback();

    // Clear any existing silence timeout
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }

  private handlePotentialVoiceEnd(): void {
    // Only set timeout if we don't already have one
    if (!this.silenceTimeout) {
      this.silenceTimeout = setTimeout(() => {
        // Check if speech was long enough to be valid
        if (
          this.speechStartTime &&
          Date.now() - this.speechStartTime >= this.config.minSpeechDuration
        ) {
          this.isSpeaking = false;
          this.voiceEndCallback();
        } else {
          // Too short, ignore it
          this.isSpeaking = false;
        }
        this.silenceTimeout = null;
      }, this.config.silenceDelay);
    }
  }

  // Get current volume level (0-255)
  getCurrentVolume(): number {
    if (!this.isListening) return 0;

    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    return sum / this.dataArray.length;
  }

  // Update configuration
  updateConfig(
    newConfig: Partial<typeof VoiceActivityDetector.prototype.config>,
  ): void {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.fftSize && this.analyser) {
      this.analyser.fftSize = newConfig.fftSize;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }

    if (newConfig.smoothingTimeConstant && this.analyser) {
      this.analyser.smoothingTimeConstant = newConfig.smoothingTimeConstant;
    }
  }
}
