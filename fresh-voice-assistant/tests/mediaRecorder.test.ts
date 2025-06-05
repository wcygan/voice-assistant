/// <reference lib="dom" />

import { assertEquals, assertExists } from "https://deno.land/std@0.213.0/assert/mod.ts";

// Mock MediaStream if not available
if (typeof MediaStream === 'undefined') {
  // @ts-ignore - Mocking for tests
  globalThis.MediaStream = class MockMediaStream {
    id = crypto.randomUUID();
    active = true;
    
    getAudioTracks() {
      return [{
        kind: "audio",
        id: crypto.randomUUID(),
        label: "Mock Audio Track",
        enabled: true,
        muted: false,
        stop: () => {},
      }];
    }
    
    getTracks() {
      return this.getAudioTracks();
    }
  };
}

// Mock MediaRecorder for testing
class MockMediaRecorder {
  state: RecordingState = "inactive";
  private chunks: Blob[] = [];
  private timesliceInterval?: number;
  ondataavailable?: (event: BlobEvent) => void;
  onstop?: () => void;
  onerror?: (event: Event) => void;
  onstart?: () => void;

  constructor(
    public stream: MediaStream,
    public options?: MediaRecorderOptions,
  ) {}

  start(timeslice?: number) {
    if (this.state !== "inactive") {
      throw new Error("InvalidStateError");
    }
    
    this.state = "recording";
    this.chunks = [];
    
    if (this.onstart) {
      this.onstart();
    }

    // Simulate data generation
    if (timeslice && timeslice > 0) {
      this.timesliceInterval = setInterval(() => {
        if (this.state === "recording") {
          this.generateChunk();
        }
      }, timeslice) as unknown as number;
    }
  }

  stop() {
    if (this.state === "inactive") {
      throw new Error("InvalidStateError");
    }

    this.state = "inactive";
    
    if (this.timesliceInterval) {
      clearInterval(this.timesliceInterval);
      this.timesliceInterval = undefined;
    }

    // Generate final chunk
    this.generateChunk();

    if (this.onstop) {
      this.onstop();
    }
  }

  private generateChunk() {
    const chunk = new Blob([new Uint8Array(1932)], { type: "audio/webm" });
    if (this.ondataavailable) {
      this.ondataavailable({ data: chunk } as BlobEvent);
    }
  }

  static isTypeSupported(type: string): boolean {
    return type.includes("audio/webm");
  }
}

// Tests
Deno.test("MediaRecorder - basic lifecycle", () => {
  const mockStream = new MediaStream();
  const recorder = new MockMediaRecorder(mockStream, {
    mimeType: "audio/webm",
    audioBitsPerSecond: 128000,
  });

  assertEquals(recorder.state, "inactive");

  // Start recording
  recorder.start();
  assertEquals(recorder.state, "recording");

  // Stop recording
  recorder.stop();
  assertEquals(recorder.state, "inactive");
});

Deno.test("MediaRecorder - cannot start when already recording", () => {
  const mockStream = new MediaStream();
  const recorder = new MockMediaRecorder(mockStream);

  recorder.start();
  assertEquals(recorder.state, "recording");

  // Try to start again - should throw
  let errorThrown = false;
  try {
    recorder.start();
  } catch (e) {
    errorThrown = true;
    assertEquals(e.message, "InvalidStateError");
  }
  
  assertEquals(errorThrown, true);
});

Deno.test("MediaRecorder - data chunks with timeslice", async () => {
  const mockStream = new MediaStream();
  const recorder = new MockMediaRecorder(mockStream);
  
  const chunks: Blob[] = [];
  let chunkCount = 0;
  
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
      chunkCount++;
    }
  };

  // Start with 100ms timeslice
  recorder.start(100);
  
  // Wait for some chunks
  await new Promise(resolve => setTimeout(resolve, 350));
  
  // Stop recording
  recorder.stop();
  
  // Should have received at least 3 chunks (300ms / 100ms)
  assertEquals(chunkCount >= 3, true);
});

Deno.test("MediaRecorder - stop prevents further chunks", async () => {
  const mockStream = new MediaStream();
  const recorder = new MockMediaRecorder(mockStream);
  
  const chunks: Blob[] = [];
  let isRecorderActive = true;
  
  recorder.ondataavailable = (event) => {
    if (!isRecorderActive) {
      throw new Error("Should not receive chunks after stop");
    }
    
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  recorder.onstop = () => {
    isRecorderActive = false;
  };

  // Start recording
  recorder.start(50);
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // Stop recording
  recorder.stop();
  
  // Wait to ensure no more chunks arrive
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // Test passes if no error was thrown
  assertExists(chunks);
});

Deno.test("MediaRecorder - multiple start/stop cycles", () => {
  const mockStream = new MediaStream();
  let recorder = new MockMediaRecorder(mockStream);
  
  // First cycle
  recorder.start();
  assertEquals(recorder.state, "recording");
  recorder.stop();
  assertEquals(recorder.state, "inactive");
  
  // Create new recorder for second cycle (simulating cleanup)
  recorder = new MockMediaRecorder(mockStream);
  
  // Second cycle
  recorder.start();
  assertEquals(recorder.state, "recording");
  recorder.stop();
  assertEquals(recorder.state, "inactive");
});

Deno.test("MediaRecorder - MIME type support", () => {
  assertEquals(MockMediaRecorder.isTypeSupported("audio/webm"), true);
  assertEquals(MockMediaRecorder.isTypeSupported("audio/webm;codecs=opus"), true);
  assertEquals(MockMediaRecorder.isTypeSupported("video/mp4"), false);
});