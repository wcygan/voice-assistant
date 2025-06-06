# Changelog

## [Unreleased] - 2025-01-06

### Added
- Comprehensive documentation in `docs/` directory
  - `SETUP.md` - Detailed setup instructions
  - `API.md` - Complete API reference
  - `MODELS.md` - Model configuration guide
  - `DEVELOPMENT.md` - Development and contribution guide
- `PROJECT_STRUCTURE.md` - Clear explanation of repository organization
- Better task organization in `deno.json` with categories
- Utility tasks for cleaning and logs

### Changed
- Consolidated main README.md with clearer structure
- Updated Fresh app README to reference main docs
- Improved deno.json task organization with comments
- Simplified project structure for better clarity

### Removed
- Redundant documentation files:
  - `LOCAL-TESTING.md` (merged into docs/SETUP.md)
  - `REFACTOR_PLAN.md` (completed)
  - `fresh-voice-assistant/PROGRESS.md`
  - `fresh-voice-assistant/VAD_IMPLEMENTATION.md`
  - `fresh-voice-assistant/VOICE_ASSISTANT_GUIDE.md`
- Temporary directories (temp_web_*, temp_fresh_*)
- Old conversation logs

### Fixed
- Documentation inconsistencies
- Unclear project organization
- Missing setup instructions

## [0.2.0] - Fresh UI Implementation

### Added
- Fresh framework web interface
- Islands architecture for better performance
- Preact Signals for state management
- Real-time logging system

## [0.1.0] - Initial Release

### Added
- Basic voice assistant pipeline
- Multiple STT model support (Whisper, Vosk, etc.)
- Ollama LLM integration
- Multiple TTS model support
- Simple web interface
- Demo scripts