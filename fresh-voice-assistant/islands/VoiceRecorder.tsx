import { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { 
  isRecording, 
  isProcessing, 
  updateStatus, 
  addMessage, 
  setError,
  selectedModels,
  systemPrompts,
  audioResponse
} from "../signals/voiceState.ts";

export default function VoiceRecorder(): JSX.Element {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Check microphone permissions on component mount
  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  async function checkMicrophonePermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      updateStatus('✅ Microphone ready');
    } catch (error) {
      setError('❌ Microphone access denied. Please allow microphone access and refresh the page.');
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = () => {
        processRecording(chunks);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      isRecording.value = true;
      updateStatus('🔴 Recording... Click to stop');

    } catch (error) {
      setError('❌ Could not start recording: ' + error.message);
    }
  }

  function stopRecording() {
    if (mediaRecorder && isRecording.value) {
      mediaRecorder.stop();
      isRecording.value = false;
    }
  }

  async function processRecording(chunks: Blob[]) {
    isProcessing.value = true;
    updateStatus('🎯 Processing speech...');

    try {
      // Convert audio to base64
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64Audio = btoa(String.fromCharCode(...uint8Array));

      // Send to server
      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: base64Audio,
          model: selectedModels.value.llm,
          whisperModel: selectedModels.value.whisper,
          systemPrompt: systemPrompts.value.current
        })
      });

      const result = await response.json();

      if (result.success) {
        addMessage('user', result.transcript);
        addMessage('ai', result.response);
        
        if (result.audioResponse) {
          audioResponse.value = result.audioResponse;
          playAudioResponse(result.audioResponse);
        }
        
        updateStatus('✅ Response ready');
      } else {
        setError('❌ ' + (result.error || 'Processing failed'));
      }

    } catch (error) {
      setError('❌ Network error: ' + error.message);
    } finally {
      isProcessing.value = false;
    }
  }

  function playAudioResponse(base64Audio: string) {
    try {
      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < audioData.length; i++) {
        uint8Array[i] = audioData.charCodeAt(i);
      }
      
      const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play().then(() => {
          updateStatus('🔊 Playing response...');
        }).catch((error) => {
          console.error('Audio playback failed:', error);
        });
        
        audioRef.current.onended = () => {
          URL.revokeObjectURL(audioUrl);
          updateStatus('Ready to listen');
        };
      }
      
    } catch (error) {
      console.error('Audio processing failed:', error);
    }
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
    if (isProcessing.value) return 'record-button processing';
    if (isRecording.value) return 'record-button recording';
    return 'record-button';
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
      <button 
        class={getButtonClass()} 
        onClick={handleRecordClick}
        disabled={isProcessing.value}
      >
        {getButtonContent()}
      </button>
      
      <audio ref={audioRef} style={{ display: 'none' }} />
    </>
  );
}