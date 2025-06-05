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
  private lastVoiceEndTime = 0;
  private debugInterval: number | null = null;
  private volumeHistory: number[] = [];
  private historySize = 10;

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
      console.log("🎤 Starting VAD with stream:", stream);
      console.log("🎤 Audio tracks:", stream.getAudioTracks());

      // Create microphone source
      this.microphone = this.audioContext.createMediaStreamSource(stream);

      // Connect to analyser
      this.microphone.connect(this.analyser);

      // Also connect to destination to ensure audio flows
      // (disconnect later if we don't want to hear ourselves)
      // this.analyser.connect(this.audioContext.destination);

      console.log("🎤 Analyser connected, fftSize:", this.analyser.fftSize);
      console.log("🎤 Frequency bin count:", this.analyser.frequencyBinCount);

      this.isListening = true;

      // Reduced debug logging - only log significant events

      this.detectVoice();
    } catch (error) {
      console.error("Failed to start VAD:", error);
      throw error;
    }
  }

  stop(): void {
    this.isListening = false;

    if (this.debugInterval) {
      clearInterval(this.debugInterval);
      this.debugInterval = null;
    }

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

    // Calculate average volume with focus on voice frequencies (85Hz - 3kHz)
    let sum = 0;
    let voiceSum = 0;
    const nyquist = this.audioContext.sampleRate / 2;
    const binHz = nyquist / this.analyser.frequencyBinCount;

    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];

      // Focus on voice frequency range (human speech fundamentals)
      const freq = i * binHz;
      if (freq >= 85 && freq <= 3000) {
        // Apply frequency weighting for voice fundamentals (100-1000Hz)
        const weight = freq >= 100 && freq <= 1000 ? 1.5 : 1.0;
        voiceSum += this.dataArray[i] * weight;
      }
    }

    const averageVolume = sum / this.dataArray.length;
    const voiceAverage = voiceSum / (3000 / binHz); // Average in voice range

    // Use voice-focused average for better detection
    const effectiveVolume = Math.max(averageVolume, voiceAverage * 0.8);

    // Add to volume history for smoothing
    this.volumeHistory.push(effectiveVolume);
    if (this.volumeHistory.length > this.historySize) {
      this.volumeHistory.shift();
    }

    // Calculate smoothed volume (moving average)
    const smoothedVolume = this.volumeHistory.reduce((a, b) => a + b, 0) /
      this.volumeHistory.length;

    // Check if voice is detected using smoothed volume
    const isVoiceDetected = smoothedVolume > this.config.voiceThreshold;

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
    // Prevent rapid start after end (cooldown period)
    const timeSinceLastEnd = Date.now() - this.lastVoiceEndTime;
    if (timeSinceLastEnd < 1000) { // Increased cooldown to 1 second
      return;
    }

    this.isSpeaking = true;
    this.speechStartTime = Date.now();
    console.log("✅ Voice started at", new Date().toLocaleTimeString());
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
          this.lastVoiceEndTime = Date.now();
          console.log("✅ Voice ended at", new Date().toLocaleTimeString());
          this.voiceEndCallback();
        } else {
          // Too short, ignore it
          console.log("🚫 Speech too short, ignoring");
          this.isSpeaking = false;
        }
        this.silenceTimeout = null;
      }, this.config.silenceDelay);
    }
  }

  // Get current volume level (0-255)
  getCurrentVolume(): number {
    if (!this.isListening) return 0;

    // Try time domain data for debugging
    const timeData = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(timeData);

    // Calculate RMS volume from time domain
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const normalized = (timeData[i] - 128) / 128; // Normalize to -1 to 1
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / timeData.length);
    const _rmsVolume = rms * 255; // Scale to 0-255

    // Also try frequency data
    this.analyser.getByteFrequencyData(this.dataArray);
    let freqSum = 0;
    let maxFreq = 0;

    for (let i = 0; i < this.dataArray.length; i++) {
      freqSum += this.dataArray[i];
      maxFreq = Math.max(maxFreq, this.dataArray[i]);
    }

    const freqAverage = freqSum / this.dataArray.length;

    // Removed verbose logging - audio detection is working

    // Use frequency average for now
    return freqAverage;
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
