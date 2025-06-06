# Project Structure Guide

This document explains the organization of the voice assistant codebase.

## Directory Layout

```
voice-assistant/
├── docs/                    # 📚 Documentation
│   ├── API.md              # API reference
│   ├── DEVELOPMENT.md      # Development guide
│   ├── MODELS.md           # Available models
│   └── SETUP.md            # Setup instructions
│
├── fresh-voice-assistant/   # 🌟 Modern Web UI (Fresh)
│   ├── routes/             # Pages and API endpoints
│   │   ├── api/           # REST API handlers
│   │   └── index.tsx      # Main page
│   ├── islands/           # Interactive components
│   ├── components/        # Static UI components
│   ├── signals/           # State management
│   └── static/            # CSS and assets
│
├── scripts/                # 🔧 Core Functionality
│   ├── demo/              # Individual demos
│   │   ├── chatterbox.ts  # Emotion TTS demo
│   │   ├── conversation.ts # Full pipeline demo
│   │   ├── realtime.ts    # Live mic demo
│   │   ├── stt.ts         # STT demo
│   │   └── tts.ts         # TTS demo
│   ├── setup/             # Model installers
│   │   ├── llm/           # LLM setup
│   │   ├── stt/           # STT setup
│   │   └── tts/           # TTS setup
│   └── test/              # Testing utilities
│       └── roundtrip.ts   # Pipeline test
│
├── web/                    # 🌐 Original Web UI
│   ├── server.ts          # Simple web server
│   └── static/            # HTML interface
│
├── venv/                   # 🐍 Python Environment
│                          # (Created by setup)
│
├── deno.json              # 📋 Task definitions
├── deno.lock              # 🔒 Dependency lock
├── LICENSE                # ⚖️ MIT License
├── README.md              # 📖 Main documentation
└── CLAUDE.md              # 🤖 AI assistant guide
```

## Component Organization

### Web Interfaces

We maintain two web interfaces:

1. **Fresh UI** (`fresh-voice-assistant/`) - Modern, recommended
   - Server-side rendering
   - Better performance
   - Modular architecture

2. **Original UI** (`web/`) - Simple, lightweight
   - Single HTML file
   - Direct API calls
   - Minimal dependencies

### Scripts Organization

Scripts are organized by function:

- **`demo/`** - Runnable demonstrations
- **`setup/`** - Installation scripts
- **`test/`** - Testing utilities

### Model Organization

Models are downloaded to system directories:
- Whisper: `~/.cache/whisper/`
- Ollama: System service location
- Coqui TTS: `~/.local/share/tts/`
- Python packages: `venv/`

## File Naming Conventions

- **TypeScript/JavaScript**: `camelCase.ts`
- **React Components**: `PascalCase.tsx`
- **Documentation**: `UPPERCASE.md`
- **Config files**: `lowercase.json`

## Key Files

### Configuration
- `deno.json` - Project tasks and imports
- `fresh.config.ts` - Fresh framework config

### Entry Points
- `fresh-voice-assistant/main.ts` - Fresh server
- `web/server.ts` - Simple web server
- `scripts/setup.ts` - Setup menu

### Documentation
- `README.md` - Project overview
- `CLAUDE.md` - AI coding guidelines
- `docs/` - Detailed guides

## Development Workflow

1. **Setup**: Run `deno task setup`
2. **Development**: Use Fresh UI for features
3. **Testing**: Run demos and tests
4. **Documentation**: Update relevant docs

## Best Practices

### Code Organization
- Keep components small and focused
- Use TypeScript for type safety
- Follow Deno style guide

### Documentation
- Update docs with code changes
- Keep examples current
- Document new features

### Testing
- Test each component individually
- Run integration tests regularly
- Document test procedures

## Adding New Features

### New Model Support
1. Create setup script in `scripts/setup/`
2. Add demo in `scripts/demo/`
3. Update documentation in `docs/MODELS.md`

### New API Endpoint
1. Add route in `fresh-voice-assistant/routes/api/`
2. Update `docs/API.md`
3. Add TypeScript types

### New UI Component
1. Create component in appropriate directory
2. Use islands for interactivity
3. Update relevant documentation