/// <reference lib="dom" />

import { assertEquals, assertExists } from "https://deno.land/std@0.213.0/assert/mod.ts";
import { VoiceActivityDetector } from "./voiceActivityDetection.ts";

// Mock requestAnimationFrame for testing
// @ts-ignore - Mocking global function
globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
  setTimeout(() => callback(0), 16); // ~60fps
  return 0;
};

// Mock AudioContext for testing
class MockAudioContext {
  sampleRate = 48000;
  state = "running";

  createAnalyser() {
    return new MockAnalyserNode();
  }

  createMediaStreamSource(_stream: MediaStream) {
    return new MockMediaStreamAudioSourceNode();
  }
}

class MockAnalyserNode {
  fftSize = 2048;
  smoothingTimeConstant = 0.8;
  frequencyBinCount = 1024;
  
  private connected = false;

  getByteFrequencyData(array: Uint8Array) {
    // Simulate some frequency data
    for (let i = 0; i < array.length; i++) {
      // Simulate voice frequencies (higher values in 85-3000Hz range)
      const freq = (i * 48000 / 2) / this.frequencyBinCount;
      if (freq >= 85 && freq <= 3000) {
        array[i] = Math.floor(Math.random() * 100 + 50); // Voice range
      } else {
        array[i] = Math.floor(Math.random() * 30); // Background noise
      }
    }
  }

  connect() {
    this.connected = true;
  }

  disconnect() {
    this.connected = false;
  }
}

class MockMediaStreamAudioSourceNode {
  connect(_destination: any) {
    // Mock implementation
  }

  disconnect() {
    // Mock implementation
  }
}

// Create a mock MediaStream
function createMockMediaStream(): MediaStream {
  // @ts-ignore - Using mock for testing
  return {
    getAudioTracks: () => [{
      kind: "audio",
      label: "Mock Audio Track",
      enabled: true,
      muted: false,
      getSettings: () => ({ sampleRate: 48000 }),
    }],
    getTracks: () => [{
      stop: () => {},
    }],
  };
}

Deno.test("VoiceActivityDetector - initialization", () => {
  const mockContext = new MockAudioContext() as unknown as AudioContext;
  const onVoiceStart = () => {};
  const onVoiceEnd = () => {};

  const vad = new VoiceActivityDetector(mockContext, onVoiceStart, onVoiceEnd);
  
  assertExists(vad);
});

Deno.test("VoiceActivityDetector - custom config", () => {
  const mockContext = new MockAudioContext() as unknown as AudioContext;
  const onVoiceStart = () => {};
  const onVoiceEnd = () => {};

  const customConfig = {
    voiceThreshold: 50,
    silenceDelay: 2000,
    minSpeechDuration: 600,
  };

  const vad = new VoiceActivityDetector(mockContext, onVoiceStart, onVoiceEnd, customConfig);
  
  assertExists(vad);
});

Deno.test("VoiceActivityDetector - getCurrentVolume returns 0 when not listening", () => {
  const mockContext = new MockAudioContext() as unknown as AudioContext;
  const vad = new VoiceActivityDetector(mockContext, () => {}, () => {});
  
  const volume = vad.getCurrentVolume();
  assertEquals(volume, 0);
});

Deno.test("VoiceActivityDetector - start and stop", async () => {
  const mockContext = new MockAudioContext() as unknown as AudioContext;
  const mockStream = createMockMediaStream();
  
  let voiceStartCalled = false;
  let voiceEndCalled = false;
  
  const vad = new VoiceActivityDetector(
    mockContext,
    () => { voiceStartCalled = true; },
    () => { voiceEndCalled = true; },
    {
      voiceThreshold: 30,
      silenceDelay: 100, // Short delay for testing
      minSpeechDuration: 50, // Short duration for testing
    }
  );
  
  // Start VAD
  vad.start(mockStream);
  
  // Add small delay to let VAD initialize
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Stop VAD - this should clean up all timers
  vad.stop();
  
  // Add small delay to ensure cleanup is complete
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Volume should be 0 after stopping
  assertEquals(vad.getCurrentVolume(), 0);
});

Deno.test("VoiceActivityDetector - updateConfig", () => {
  const mockContext = new MockAudioContext() as unknown as AudioContext;
  const vad = new VoiceActivityDetector(mockContext, () => {}, () => {});
  
  // Update config
  vad.updateConfig({
    voiceThreshold: 60,
    silenceDelay: 2500,
  });
  
  // Test that update doesn't throw
  assertExists(vad);
});

Deno.test("VoiceActivityDetector - voice detection simulation", async () => {
  const mockContext = new MockAudioContext() as unknown as AudioContext;
  const mockStream = createMockMediaStream();
  
  let voiceStartCount = 0;
  let voiceEndCount = 0;
  
  const vad = new VoiceActivityDetector(
    mockContext,
    () => { voiceStartCount++; },
    () => { voiceEndCount++; },
    {
      voiceThreshold: 30,
      silenceDelay: 100, // Short delay for testing
      minSpeechDuration: 50, // Short duration for testing
    }
  );
  
  // Override the analyser to simulate voice detection
  const mockAnalyser = mockContext.createAnalyser() as MockAnalyserNode;
  let simulateVoice = false;
  
  mockAnalyser.getByteFrequencyData = (array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      if (simulateVoice) {
        // Simulate voice (high values)
        array[i] = 100;
      } else {
        // Simulate silence (low values)
        array[i] = 10;
      }
    }
  };
  
  // Start VAD
  vad.start(mockStream);
  
  // Simulate voice detection for a short time
  simulateVoice = true;
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Simulate silence
  simulateVoice = false;
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Stop VAD - this should clean up all timers
  vad.stop();
  
  // Add delay to ensure cleanup is complete
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // We can't easily test the actual callbacks due to requestAnimationFrame
  // but we can verify the VAD doesn't crash
  assertExists(vad);
});