# LOCAL Testing on Macbook Pro M1

This guide provides every command needed to try the STT, TTS and LLM models mentioned in the README on a macOS M1 machine. Replace file paths with your own audio files where necessary.

## Prerequisites

1. Install [Homebrew](https://brew.sh/):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. Install the Xcode Command Line Tools:
   ```bash
   xcode-select --install
   ```
3. (Optional) Install Python from Homebrew if needed:
   ```bash
   brew install python
   ```
4. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install --upgrade pip wheel
   ```

## Speech-to-Text (STT)

### Whisper
1. Install FFmpeg for audio processing:
   ```bash
   brew install ffmpeg
   ```
2. Install the Whisper package:
   ```bash
   pip install git+https://github.com/openai/whisper.git
   ```
3. Transcribe an audio file:
   ```bash
   whisper path/to/audio.wav --model base --fp16 False
   ```
   The transcript text appears in the terminal and a text file is saved next to the audio.

### Vosk
1. Install the library:
   ```bash
   pip install vosk
   ```
2. Download a small English model:
   ```bash
   mkdir -p models && cd models
   curl -LO https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
   unzip vosk-model-small-en-us-0.15.zip
   cd ..
   ```
3. Run recognition on a WAV file:
   ```bash
   python -m vosk test.wav models/vosk-model-small-en-us-0.15
   ```

### Coqui STT
1. Install Coqui STT:
   ```bash
   pip install stt
   ```
2. Download a TFLite model (for example `tiny.en.tflite`) from the Coqui website:
   ```bash
   curl -L -o coqui.tflite https://coqui.gateway.url/tiny.en.tflite
   ```
3. Transcribe audio:
   ```bash
   stt --model coqui.tflite --audio your_audio.wav
   ```

## Text-to-Speech (TTS)

### Coqui TTS
1. Install the package:
   ```bash
   pip install TTS
   ```
2. Generate speech with a default model:
   ```bash
   tts --text "Hello world" --model_name tts_models/en/ljspeech/tacotron2-DDC --out_path output.wav
   ```

### Piper
1. Download the macOS arm64 build and extract it:
   ```bash
   curl -L -o piper.tar.gz https://github.com/rhasspy/piper/releases/latest/download/piper_macOS_arm64.tar.gz
   tar -xf piper.tar.gz
   ```
2. List available voices:
   ```bash
   ./piper --list-voices
   ```
3. Synthesize speech:
   ```bash
   ./piper --model voices/en/en_US-libritts-high.onnx --text "Testing piper" --output_file piper.wav
   ```

### espeak-ng
1. Install via Homebrew:
   ```bash
   brew install espeak-ng
   ```
2. Convert text to speech:
   ```bash
   espeak-ng "This is a test" --stdout > espeak.wav
   ```

## Running a Small LLM with Ollama
1. Install [Ollama](https://github.com/ollama/ollama):
   ```bash
   brew install ollama
   ```
2. Start the Ollama service (leave this running):
   ```bash
   ollama serve
   ```
3. In another terminal, pull a model and chat with it (example using Mistral):
   ```bash
   ollama pull mistral
   ollama run mistral
   ```
   Type your prompt and press `Ctrl+C` to exit when done.
