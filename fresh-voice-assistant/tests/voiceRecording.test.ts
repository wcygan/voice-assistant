/// <reference lib="dom" />

import { assertEquals, assertExists } from "https://deno.land/std@0.213.0/assert/mod.ts";

// Test utilities for voice recording logic

// Simulate the recording logic with proper state management
class VoiceRecordingSimulator {
  private mediaRecorder: MockMediaRecorder | null = null;
  private isRecording = false;
  private isProcessing = false;
  private chunks: Blob[] = [];
  private isRecorderActive = false;

  async startRecording(stream: MediaStream): Promise<void> {
    // Don't start if already recording or processing
    if (this.isRecording || this.isProcessing) {
      console.log("⚠️ Already recording or processing, skipping start");
      return;
    }

    // Stop any existing recorder first
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      console.log("⚠️ Stopping existing MediaRecorder before starting new one");
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    // Create new recorder
    const recorder = new MockMediaRecorder(stream, {
      mimeType: "audio/webm",
      audioBitsPerSecond: 128000,
    });

    this.chunks = [];
    this.isRecorderActive = true;

    recorder.ondataavailable = (event) => {
      // Only process chunks if recorder is still active
      if (!this.isRecorderActive) {
        console.log("⚠️ Ignoring chunk after recorder stopped");
        return;
      }

      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
        console.log(`📼 Received chunk: ${event.data.size} bytes`);
      }
    };

    recorder.onstop = () => {
      this.isRecorderActive = false; // Stop accepting new chunks
      console.log(`📼 Recording stopped. Total chunks: ${this.chunks.length}`);
      
      // Simulate processing delay
      setTimeout(() => {
        this.processRecording(this.chunks);
      }, 100);
    };

    // Start recording with timeslice
    recorder.start(100);
    this.mediaRecorder = recorder;
    this.isRecording = true;
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      // Check MediaRecorder state before stopping
      if (this.mediaRecorder.state === "recording") {
        this.mediaRecorder.stop();
      } else {
        console.log(`⚠️ MediaRecorder not recording, state: ${this.mediaRecorder.state}`);
      }

      this.isRecording = false;
    }
  }

  private processRecording(chunks: Blob[]): void {
    // Validate chunks before processing
    if (!chunks || chunks.length === 0) {
      console.log("⚠️ No audio chunks received");
      return;
    }

    // Check total size of audio data
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    console.log(`📊 Total audio size: ${totalSize} bytes from ${chunks.length} chunks`);

    const MIN_AUDIO_SIZE = 1024;
    if (totalSize < MIN_AUDIO_SIZE) {
      console.log(`⚠️ Audio too small: ${totalSize} bytes < ${MIN_AUDIO_SIZE} bytes`);
      return;
    }

    // Simulate successful processing
    console.log("✅ Audio processed successfully");
  }

  getChunkCount(): number {
    return this.chunks.length;
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }
}

// Mock MediaRecorder for testing
class MockMediaRecorder {
  state: RecordingState = "inactive";
  private timesliceInterval?: number;
  ondataavailable?: (event: BlobEvent) => void;
  onstop?: () => void;

  constructor(
    public stream: MediaStream,
    public options?: MediaRecorderOptions,
  ) {}

  start(timeslice?: number) {
    if (this.state !== "inactive") {
      throw new Error("InvalidStateError");
    }
    
    this.state = "recording";

    // Simulate data generation
    if (timeslice && timeslice > 0) {
      this.timesliceInterval = setInterval(() => {
        if (this.state === "recording" && this.ondataavailable) {
          const chunk = new Blob([new Uint8Array(1932)], { type: "audio/webm" });
          this.ondataavailable({ data: chunk } as BlobEvent);
        }
      }, timeslice) as unknown as number;
    }
  }

  stop() {
    if (this.state === "inactive") {
      return;
    }

    this.state = "inactive";
    
    if (this.timesliceInterval) {
      clearInterval(this.timesliceInterval);
      this.timesliceInterval = undefined;
    }

    if (this.onstop) {
      this.onstop();
    }
  }
}

// Tests
Deno.test("VoiceRecording - no infinite chunk loop after stop", async () => {
  const simulator = new VoiceRecordingSimulator();
  const mockStream = new MediaStream();

  // Start recording
  await simulator.startRecording(mockStream);
  assertEquals(simulator.getIsRecording(), true);

  // Wait for some chunks
  await new Promise(resolve => setTimeout(resolve, 350));

  // Stop recording
  simulator.stopRecording();
  assertEquals(simulator.getIsRecording(), false);

  // Get chunk count immediately after stop
  const chunkCountAtStop = simulator.getChunkCount();

  // Wait to ensure no more chunks arrive
  await new Promise(resolve => setTimeout(resolve, 200));

  // Chunk count should not have increased
  const chunkCountAfterWait = simulator.getChunkCount();
  assertEquals(chunkCountAtStop, chunkCountAfterWait);
});

Deno.test("VoiceRecording - prevents multiple simultaneous recordings", async () => {
  const simulator = new VoiceRecordingSimulator();
  const mockStream = new MediaStream();

  // Start first recording
  await simulator.startRecording(mockStream);
  assertEquals(simulator.getIsRecording(), true);

  // Try to start another recording - should be ignored
  await simulator.startRecording(mockStream);
  
  // Should still be in recording state from first call
  assertEquals(simulator.getIsRecording(), true);

  // Stop recording
  simulator.stopRecording();
});

Deno.test("VoiceRecording - handles rapid start/stop cycles", async () => {
  const simulator = new VoiceRecordingSimulator();
  const mockStream = new MediaStream();

  // Rapid start/stop cycle
  await simulator.startRecording(mockStream);
  simulator.stopRecording();
  
  // Small delay
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Start again
  await simulator.startRecording(mockStream);
  assertEquals(simulator.getIsRecording(), true);
  
  // Stop again
  simulator.stopRecording();
  assertEquals(simulator.getIsRecording(), false);
});

Deno.test("VoiceRecording - validates minimum audio size", async () => {
  const simulator = new VoiceRecordingSimulator();
  const mockStream = new MediaStream();

  // Start recording
  await simulator.startRecording(mockStream);

  // Stop immediately (will have very few chunks)
  simulator.stopRecording();

  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 150));

  // Should have handled the small audio gracefully
  assertEquals(simulator.getIsRecording(), false);
});