# Voice Activity Detection (VAD) Implementation

## Overview

The Fresh Voice Assistant now features automatic voice detection that starts and
stops recording based on voice activity. This creates a more natural, hands-free
experience for users.

## Features

### 🎙️ Auto-Start Recording

- Automatically begins recording when voice is detected
- No need to click a button to start speaking
- Visual feedback shows when the system is listening

### 🔇 Auto-Stop Recording

- Stops recording after 1.5 seconds of silence
- Automatically processes the recording when speech ends
- Prevents recording of long silences

### 📊 Real-time Volume Monitoring

- Live volume meter shows current audio levels
- Visual threshold indicator for voice detection
- Helps users understand when their voice is being detected

### 🎛️ Adjustable Sensitivity

- Slider control to adjust voice detection threshold
- Works in different noise environments
- Real-time updates without restarting

## How to Use

1. **Enable Auto-Detect**: Click the "🎙️ Auto-Detect OFF" button to turn it ON
2. **Start Speaking**: Just speak naturally - recording starts automatically
3. **Stop Speaking**: Pause for 1.5 seconds and recording stops automatically
4. **Adjust Sensitivity**: Use the slider if detection is too sensitive or not
   sensitive enough

## Technical Details

### Voice Activity Detection Algorithm

- Uses Web Audio API's AnalyserNode for real-time frequency analysis
- Calculates average volume across frequency spectrum
- Triggers recording when volume exceeds threshold
- Filters out sounds shorter than 300ms (coughs, clicks, etc.)

### Configuration Options

```typescript
{
  voiceThreshold: 30,        // Detection threshold (0-255)
  silenceDelay: 1500,        // Ms to wait before stopping
  minSpeechDuration: 300,    // Minimum valid speech duration
  smoothingTimeConstant: 0.8, // Audio smoothing factor
  fftSize: 2048              // FFT size for analysis
}
```

### Browser Compatibility

- Works in all modern browsers with getUserMedia support
- Requires microphone permissions
- Best results with headphones to avoid feedback

## Visual Indicators

- **💤 Waiting for voice...**: VAD is active, waiting for speech
- **🔴 Listening...**: Voice detected, recording in progress
- **Volume Meter**: Green when voice detected, gray when below threshold
- **White Line**: Shows current sensitivity threshold on volume meter

## Tips for Best Results

1. **Quiet Environment**: Works best in environments with consistent background
   noise
2. **Speak Clearly**: Speak at normal volume, not too soft
3. **Adjust Sensitivity**: Lower values = more sensitive, higher values = less
   sensitive
4. **Headphones Recommended**: Prevents speaker audio from triggering VAD

## Troubleshooting

### Voice Not Detected

- Increase microphone volume in system settings
- Lower the sensitivity slider
- Check that microphone permissions are granted
- Ensure no other app is using the microphone

### Too Sensitive (Triggers on Background Noise)

- Increase the sensitivity slider value
- Enable noise suppression in browser settings
- Use in quieter environment
- Use directional microphone if available

### Recording Stops Too Soon

- Speak more continuously with fewer pauses
- Can be configured to increase silence delay (requires code change)

## Future Enhancements

- [ ] Adaptive threshold based on ambient noise
- [ ] Visual waveform display
- [ ] Customizable silence delay
- [ ] Pre-speech buffer to capture beginning of words
- [ ] Energy-based detection in addition to volume
- [ ] Machine learning-based voice detection
