import { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import {
  addMessage,
  audioResponse,
  isProcessing,
  isRecording,
  selectedModels,
  setError,
  systemPrompts,
  updateStatus,
} from "../signals/voiceState.ts";
import { VoiceActivityDetector } from "../utils/voiceActivityDetection.ts";

// Type declarations for browser APIs
declare global {
  interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}

export default function VoiceRecorder(): JSX.Element {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const [_audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [vad, setVad] = useState<VoiceActivityDetector | null>(null);
  const [isVadEnabled, setIsVadEnabled] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [vadSensitivity, setVadSensitivity] = useState(40); // Increased default for better noise rejection
  const [stream, setStream] = useState<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const volumeIntervalRef = useRef<number | null>(null);
  const recordingStartTime = useRef<number | null>(null);

  // Check microphone permissions on component mount
  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
      }
      if (vad) {
        vad.stop();
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [vad, stream]);

  async function checkMicrophonePermission() {
    try {
      const testStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      testStream.getTracks().forEach((track) => track.stop());
      updateStatus("✅ Microphone ready");
    } catch (_error) {
      setError(
        "❌ Microphone access denied. Please allow microphone access and refresh the page.",
      );
    }
  }

  async function toggleVAD() {
    if (isVadEnabled) {
      // Disable VAD
      stopVAD();
    } else {
      // Enable VAD
      await startVAD();
    }
  }

  async function startVAD() {
    try {
      if (isProcessing.value || isRecording.value) {
        return;
      }

      // Initialize audio context if needed
      if (!audioContext) {
        const win = globalThis as unknown as Window;
        const ctx = new (win.AudioContext || win.webkitAudioContext)();
        setAudioContext(ctx);

        if (ctx.state === "suspended") {
          await ctx.resume();
        }
      }

      // Get microphone stream with simpler constraints
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Microphone stream obtained successfully

      setStream(micStream);

      // Create VAD instance with improved settings
      const vadInstance = new VoiceActivityDetector(
        audioContext!,
        () => {
          if (!isRecording.value && !isProcessing.value) {
            console.log("🎙️ VAD: Voice detected, starting recording");
            startRecording();
          }
        },
        () => {
          if (isRecording.value && !isProcessing.value) {
            console.log("🎙️ VAD: Voice ended, stopping recording");
            stopRecording();
          }
        },
        {
          voiceThreshold: vadSensitivity,
          silenceDelay: 1500,
          minSpeechDuration: 500, // Increased from 300ms to 500ms
        },
      );

      vadInstance.start(micStream);
      setVad(vadInstance);
      setIsVadEnabled(true);

      // Start monitoring volume levels with faster updates
      volumeIntervalRef.current = setInterval(() => {
        if (vadInstance) {
          const volume = vadInstance.getCurrentVolume();
          setCurrentVolume(volume);
        }
      }, 50); // Update every 50ms for smoother visualization

      updateStatus("🎙️ Auto-detect ON - Start speaking...");
    } catch (error) {
      const err = error as Error;
      setError("❌ Could not start voice detection: " + err.message);
    }
  }

  function stopVAD() {
    if (vad) {
      vad.stop();
      setVad(null);
    }

    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    setIsVadEnabled(false);
    setCurrentVolume(0);
    updateStatus("🎙️ Auto-detect OFF");
  }

  async function startRecording() {
    try {
      // Don't start if already recording or processing
      if (isRecording.value || isProcessing.value) {
        return;
      }

      // Initialize audio context on first user interaction
      if (!audioContext) {
        const win = globalThis as unknown as Window;
        const ctx = new (win.AudioContext || win.webkitAudioContext)();
        setAudioContext(ctx);
        // Resume audio context if suspended
        if (ctx.state === "suspended") {
          await ctx.resume();
        }
      }

      // Use existing stream if VAD is enabled, otherwise create new one
      let recordingStream = stream;
      if (!recordingStream) {
        recordingStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
      }

      const recorder = new MediaRecorder(recordingStream, {
        mimeType: "audio/webm",
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
          console.log(`📼 Received chunk: ${event.data.size} bytes`);
        } else {
          console.log("⚠️ Received empty data chunk");
        }
      };

      recorder.onstop = () => {
        // Add a delay to ensure all chunks are collected
        setTimeout(() => {
          processRecording(chunks);
          // Only stop tracks if not using VAD
          if (!isVadEnabled) {
            recordingStream!.getTracks().forEach((track) => track.stop());
          }
        }, 100); // 100ms delay to collect final chunks
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      isRecording.value = true;
      recordingStartTime.current = Date.now();
      updateStatus(
        isVadEnabled
          ? "🔴 Recording voice..."
          : "🔴 Recording... Click to stop",
      );
    } catch (error) {
      const err = error as Error;
      setError("❌ Could not start recording: " + err.message);
    }
  }

  function stopRecording() {
    if (mediaRecorder && isRecording.value) {
      // Check minimum recording duration
      const recordingDuration = recordingStartTime.current
        ? Date.now() - recordingStartTime.current
        : 0;

      const MIN_RECORDING_DURATION = 500; // 500ms minimum

      if (recordingDuration < MIN_RECORDING_DURATION && !isVadEnabled) {
        // For manual recording, warn about short duration
        console.log(`⚠️ Recording too short: ${recordingDuration}ms`);
        updateStatus("⚠️ Recording too short - please hold longer");
        // Continue recording
        return;
      }

      mediaRecorder.stop();
      isRecording.value = false;
      recordingStartTime.current = null;
      updateStatus(
        isVadEnabled
          ? "🎙️ Auto-detect ON - Waiting..."
          : "✅ Recording stopped",
      );
    }
  }

  async function processRecording(chunks: Blob[]) {
    // Validate chunks before processing
    if (!chunks || chunks.length === 0) {
      console.log("⚠️ No audio chunks received");
      updateStatus("⚠️ No audio recorded");
      isProcessing.value = false;
      isRecording.value = false;
      if (isVadEnabled) {
        updateStatus("🎙️ Auto-detect ON - Start speaking...");
      }
      return;
    }

    // Check total size of audio data
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    console.log(
      `📊 Total audio size: ${totalSize} bytes from ${chunks.length} chunks`,
    );

    // Minimum size threshold (e.g., 1KB for meaningful audio)
    const MIN_AUDIO_SIZE = 1024;
    if (totalSize < MIN_AUDIO_SIZE) {
      console.log(
        `⚠️ Audio too small: ${totalSize} bytes < ${MIN_AUDIO_SIZE} bytes`,
      );
      updateStatus("⚠️ Audio too short - please speak longer");
      isProcessing.value = false;
      isRecording.value = false;
      if (isVadEnabled) {
        updateStatus("🎙️ Auto-detect ON - Start speaking...");
      }
      return;
    }

    isProcessing.value = true;
    updateStatus("🎯 Processing speech...");

    try {
      // Convert audio to base64
      const audioBlob = new Blob(chunks, { type: "audio/webm" });
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64Audio = btoa(String.fromCharCode(...uint8Array));

      // Send to server
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio: base64Audio,
          model: selectedModels.value.llm,
          whisperModel: selectedModels.value.whisper,
          systemPrompt: systemPrompts.value.current,
        }),
      });

      const result = await response.json();

      if (result.success) {
        addMessage("user", result.transcript);
        addMessage("ai", result.response);

        // Scroll to bottom after adding messages
        setTimeout(() => {
          const conversation = document.querySelector(".conversation");
          if (conversation) {
            conversation.scrollTop = conversation.scrollHeight;
          }
        }, 100);

        // Play server TTS audio response
        if (result.audioResponse) {
          console.log("🔍 DEBUG: Received audioResponse from server");
          console.log(
            "🔍 DEBUG: audioResponse type:",
            typeof result.audioResponse,
          );
          console.log(
            "🔍 DEBUG: audioResponse length:",
            result.audioResponse.length,
          );
          console.log(
            "🔍 DEBUG: audioResponse starts with:",
            result.audioResponse.substring(0, 50),
          );

          // Add additional validation
          const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
          if (!base64Regex.test(result.audioResponse)) {
            console.error("🔍 DEBUG: Invalid base64 format in audioResponse");
            updateStatus("❌ Invalid audio format received");
            return;
          }

          audioResponse.value = result.audioResponse;

          // Add a small delay to ensure DOM is ready
          setTimeout(() => {
            playAudioResponse(result.audioResponse);
          }, 100);
        } else {
          console.error("🔍 DEBUG: No audioResponse received from server");
          console.log("🔍 DEBUG: Full result object:", result);
          updateStatus("❌ No audio data received from server");
        }

        updateStatus("✅ Response ready");
      } else {
        setError("❌ " + (result.error || "Processing failed"));
      }
    } catch (error) {
      const err = error as Error;
      setError("❌ Network error: " + err.message);
    } finally {
      isProcessing.value = false;
      isRecording.value = false; // Ensure recording state is reset

      // Reset status for VAD mode
      if (isVadEnabled) {
        updateStatus("🎙️ Auto-detect ON - Start speaking...");
      }
    }
  }

  async function playAudioResponse(base64Audio: string) {
    try {
      console.log("🔍 DEBUG: Starting audio playback");
      console.log("🔍 DEBUG: Base64 audio length:", base64Audio.length);
      console.log("🔍 DEBUG: Audio context state:", audioContext?.state);

      updateStatus("🔊 Processing audio response...");

      // Validate base64 string
      if (!base64Audio || base64Audio.length === 0) {
        console.error("❌ Empty base64 audio string");
        updateStatus("❌ No audio data received");
        return;
      }

      // Clean base64 string
      const cleanedBase64 = base64Audio.replace(/\s/g, "");

      // Decode base64
      let audioData;
      try {
        audioData = atob(cleanedBase64);
        console.log("🔍 DEBUG: Decoded audio data length:", audioData.length);
      } catch (decodeError) {
        console.error("❌ Base64 decode failed:", decodeError);
        updateStatus("❌ Invalid audio data format");
        return;
      }

      // Convert to array buffer
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        uint8Array[i] = audioData.charCodeAt(i);
      }

      // Create blob
      const blob = new Blob([arrayBuffer], { type: "audio/wav" });
      console.log("🔍 DEBUG: Blob created, size:", blob.size);

      if (!audioRef.current) {
        console.error("❌ Audio element not available");
        updateStatus("❌ Audio element not available");
        return;
      }

      // Create object URL
      const audioUrl = URL.createObjectURL(blob);

      // Ensure audio context is active
      if (audioContext && audioContext.state === "suspended") {
        await audioContext.resume();
        console.log("🔍 DEBUG: Audio context resumed for playback");
      }

      // Reset audio element
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      // Simple event handlers
      audioRef.current.onloadeddata = async () => {
        console.log("🔍 DEBUG: Audio data loaded, playing immediately");
        try {
          // Force immediate playback
          await audioRef.current!.play();
          console.log("✅ Audio playback started");
          updateStatus("🔊 AI is speaking...");
        } catch (error) {
          const err = error as Error;
          console.error("❌ Playback failed:", err.name, err.message);
          if (err.name === "NotAllowedError") {
            updateStatus("🔊 Click play button or audio controls ▶️");
            // Highlight audio element
            audioRef.current!.style.border = "2px solid #4CAF50";
            audioRef.current!.style.animation = "audioPulse 1s infinite";
          } else {
            updateStatus("❌ Audio playback error");
          }
        }
      };

      audioRef.current.onended = () => {
        console.log("✅ Audio playback finished");
        URL.revokeObjectURL(audioUrl);
        updateStatus("✅ Ready for your next question");
        // Remove highlight
        if (audioRef.current) {
          audioRef.current.style.border = "";
          audioRef.current.style.animation = "";
        }
      };

      audioRef.current.onerror = (error) => {
        console.error("❌ Audio error:", error);
        updateStatus("❌ Audio playback error");
        URL.revokeObjectURL(audioUrl);
      };

      // Set source and load
      audioRef.current.src = audioUrl;
      audioRef.current.load();

      updateStatus("🔊 Loading audio...");
    } catch (error) {
      const err = error as Error;
      console.error("❌ Audio processing exception:", err);
      updateStatus("❌ Audio processing failed: " + err.message);
    }
  }

  function testAudioPlayback() {
    console.log("🔍 DEBUG: Testing audio playback with test tone");
    updateStatus("🔊 Testing audio playback...");

    if (!audioRef.current) {
      console.error("❌ DEBUG: No audio element for test");
      updateStatus("❌ Audio element not available for test");
      return;
    }

    // Create a simple test tone (440Hz sine wave for 1 second)
    const win = globalThis as unknown as Window;
    const audioContext = new (win.AudioContext || win.webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 1; // 1 second
    const frequency = 440; // A4 note

    const buffer = audioContext.createBuffer(
      1,
      sampleRate * duration,
      sampleRate,
    );
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < channelData.length; i++) {
      channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3; // 30% volume
    }

    // Convert to WAV format
    const wav = audioBufferToWav(buffer);
    const blob = new Blob([wav], { type: "audio/wav" });
    const audioUrl = URL.createObjectURL(blob);

    console.log("🔍 DEBUG: Test audio blob created, size:", blob.size);

    audioRef.current.src = audioUrl;
    audioRef.current.onended = () => {
      URL.revokeObjectURL(audioUrl);
      updateStatus("✅ Audio test completed");
    };

    audioRef.current.play().then(() => {
      console.log("✅ DEBUG: Test audio playing");
      updateStatus("🔊 Playing test tone...");
    }).catch((error) => {
      console.error("❌ DEBUG: Test audio failed:", error);
      const err = error as Error;
      updateStatus("❌ Test audio failed: " + err.message);
    });
  }

  function testBase64AudioProcessing() {
    console.log("🔍 DEBUG: Testing base64 audio processing");
    updateStatus("🔧 Testing base64 processing...");

    // Create a test WAV file
    const win = globalThis as unknown as Window;
    const audioContext = new (win.AudioContext || win.webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 0.5; // 0.5 seconds
    const frequency = 880; // Higher pitch

    const buffer = audioContext.createBuffer(
      1,
      sampleRate * duration,
      sampleRate,
    );
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < channelData.length; i++) {
      channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.2;
    }

    // Convert to WAV format
    const wav = audioBufferToWav(buffer);

    // Convert to base64 (simulate server response)
    const uint8Array = new Uint8Array(wav);
    const binaryString = Array.from(uint8Array).map((byte) =>
      String.fromCharCode(byte)
    ).join("");
    const testBase64 = btoa(binaryString);

    console.log("🔍 DEBUG: Test base64 created, length:", testBase64.length);
    console.log("🔍 DEBUG: Test base64 sample:", testBase64.substring(0, 100));

    // Test our audio processing function
    try {
      playAudioResponse(testBase64);
      console.log("✅ DEBUG: Base64 audio processing test passed");
    } catch (error) {
      console.error("❌ DEBUG: Base64 audio processing test failed:", error);
      updateStatus("❌ Base64 processing test failed");
    }
  }

  function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    const channelData = buffer.getChannelData(0);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, length * 2, true);

    // Convert audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }

    return arrayBuffer;
  }

  function handleRecordClick() {
    if (isProcessing.value) return;

    if (isRecording.value) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  function getButtonClass() {
    if (isProcessing.value) return "record-button processing";
    if (isRecording.value) return "record-button recording";
    return "record-button";
  }

  function getButtonContent() {
    if (isProcessing.value) {
      return (
        <>
          <div>⏳</div>
          <div>Processing...</div>
        </>
      );
    }
    if (isRecording.value) {
      return (
        <>
          <div>⏹️</div>
          <div>Stop Recording</div>
        </>
      );
    }
    return (
      <>
        <div>🎤</div>
        <div>Click to Talk</div>
      </>
    );
  }

  return (
    <>
      {/* Voice Activity Detection Controls */}
      <div
        style={{
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: "10px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
            marginBottom: "10px",
          }}
        >
          <button
            type="button"
            onClick={toggleVAD}
            style={{
              padding: "10px 20px",
              backgroundColor: isVadEnabled ? "#4CAF50" : "#666",
              color: "white",
              border: "none",
              borderRadius: "25px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
              transition: "all 0.3s ease",
            }}
            disabled={isProcessing.value}
          >
            {isVadEnabled ? "🎙️ Auto-Detect ON" : "🎙️ Auto-Detect OFF"}
          </button>

          {isVadEnabled && (
            <div style={{ flex: 1, fontSize: "14px", opacity: 0.9 }}>
              {isRecording.value
                ? "🔴 Listening..."
                : "💤 Waiting for voice..."}
            </div>
          )}
        </div>

        {/* Volume Meter */}
        {isVadEnabled && (
          <div style={{ marginTop: "10px" }}>
            {/* Voice Level Bars */}
            <div style={{ marginBottom: "15px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "12px",
                  marginBottom: "5px",
                }}
              >
                <span>Voice Level:</span>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "2px",
                    height: "40px",
                    padding: "0 10px",
                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                    borderRadius: "5px",
                  }}
                >
                  {/* Create 20 bars for visualization */}
                  {Array.from({ length: 20 }, (_, i) => {
                    const barActive = (currentVolume / 255) * 20 > i;
                    const isThresholdBar =
                      Math.floor((vadSensitivity / 255) * 20) === i;
                    return (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: `${((i + 1) / 20) * 100}%`,
                          backgroundColor: isThresholdBar
                            ? "#FFF"
                            : barActive
                            ? (currentVolume > vadSensitivity
                              ? "#4CAF50"
                              : "#FFA500")
                            : "rgba(255, 255, 255, 0.1)",
                          borderRadius: "2px",
                          transition: "background-color 0.1s ease",
                        }}
                      />
                    );
                  })}
                </div>
                <span
                  style={{
                    minWidth: "40px",
                    textAlign: "right",
                    fontWeight: currentVolume > vadSensitivity
                      ? "bold"
                      : "normal",
                    color: currentVolume > vadSensitivity
                      ? "#4CAF50"
                      : "inherit",
                  }}
                >
                  {Math.round(currentVolume)}
                </span>
              </div>

              {/* Status text */}
              <div
                style={{
                  fontSize: "11px",
                  opacity: 0.7,
                  textAlign: "center",
                }}
              >
                {currentVolume === 0
                  ? "No audio detected"
                  : currentVolume > vadSensitivity
                  ? "Voice detected! 🎤"
                  : "Background noise"}
              </div>
            </div>

            {/* Original volume bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "12px",
                marginBottom: "5px",
              }}
            >
              <span>Threshold:</span>
              <div
                style={{
                  flex: 1,
                  height: "10px",
                  backgroundColor: "rgba(0, 0, 0, 0.3)",
                  borderRadius: "5px",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${(currentVolume / 255) * 100}%`,
                    backgroundColor: currentVolume > vadSensitivity
                      ? "#4CAF50"
                      : "#666",
                    transition: "width 0.05s ease, background-color 0.2s ease",
                  }}
                >
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: `${(vadSensitivity / 255) * 100}%`,
                    top: 0,
                    bottom: 0,
                    width: "2px",
                    backgroundColor: "#FFF",
                    opacity: 0.9,
                  }}
                >
                </div>
              </div>
              <span>{Math.round(currentVolume)}</span>
            </div>

            {/* Sensitivity Control */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "12px",
              }}
            >
              <span>Sensitivity:</span>
              <input
                type="range"
                min="20"
                max="80"
                value={vadSensitivity}
                onChange={(e) => {
                  const newValue = parseInt(e.currentTarget.value);
                  setVadSensitivity(newValue);
                  if (vad) {
                    vad.updateConfig({ voiceThreshold: newValue });
                  }
                }}
                style={{ flex: 1 }}
              />
              <span>{vadSensitivity}</span>
            </div>
          </div>
        )}
      </div>

      {/* Regular Recording Button (disabled when VAD is on) */}
      {!isVadEnabled && (
        <button
          type="button"
          class={getButtonClass()}
          onClick={handleRecordClick}
          disabled={isProcessing.value}
        >
          {getButtonContent()}
        </button>
      )}

      <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
        <button
          type="button"
          onClick={testAudioPlayback}
          style={{
            padding: "8px 16px",
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
          }}
          title="Test audio playback with a simple tone"
        >
          🔊 Test Audio
        </button>

        <button
          type="button"
          onClick={testBase64AudioProcessing}
          style={{
            padding: "8px 16px",
            backgroundColor: "#FF9800",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
          }}
          title="Test base64 audio processing pipeline"
        >
          🔧 Test Base64
        </button>

        {audioResponse.value && (
          <button
            type="button"
            onClick={() => playAudioResponse(audioResponse.value)}
            style={{
              padding: "8px 16px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
            title="Manually play the last AI response"
          >
            ▶️ Play Response
          </button>
        )}
      </div>

      <audio
        ref={audioRef}
        controls
        style={{
          width: "100%",
          marginTop: "10px",
          borderRadius: "8px",
          backgroundColor: "#f0f0f0",
        }}
        preload="auto"
        autoplay={!!audioContext && audioContext.state === "running"}
        title="AI Response Audio - Click to play if it doesn't start automatically"
      />
    </>
  );
}
