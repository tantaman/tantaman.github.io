# Local Text-to-Speech for The Mirror Room

Convert your stories to audio using local TTS models - completely free and private!

## Quick Start (macOS)

**Easiest option - uses built-in macOS voices:**

```bash
python3 macos_tts_converter.py
```

This will:
- Use your built-in macOS `say` command (no installation needed!)
- Automatically select the best voice for storytelling
- Generate high-quality AIFF files
- Combine chunks into complete stories

**Output:** Files in `macos_audio_output/` directory

## Advanced Local TTS Options

### Option 1: Coqui TTS (Highest Quality)

```bash
pip install -r local_requirements.txt
python3 local_tts_converter.py
```

**Pros:**
- Neural network-based, very natural sounding
- Multiple voice models available
- Works offline after initial model download

**Cons:**
- Large download (~1GB for models)
- Requires Python dependencies
- Slower processing

### Option 2: Cross-Platform (pyttsx3)

```bash
pip install pyttsx3
python3 local_tts_converter.py
```

**Pros:**
- Works on Windows, macOS, Linux
- Lightweight
- Uses system voices

**Cons:**
- Quality depends on system voices
- Less natural than neural TTS

## Voice Quality Comparison

| Engine | Quality | Speed | Setup | Cost |
|--------|---------|-------|-------|------|
| macOS `say` | ⭐⭐⭐⭐ | Fast | None | Free |
| Coqui TTS | ⭐⭐⭐⭐⭐ | Slow | Complex | Free |
| pyttsx3 | ⭐⭐⭐ | Fast | Easy | Free |
| OpenAI API | ⭐⭐⭐⭐⭐ | Fast | API Key | ~$0.78 |

## macOS Voice Recommendations

**Best voices for storytelling:**
- **Alex** - Default, clear and natural
- **Samantha** - Warm, engaging female voice
- **Victoria** - Professional, clear
- **Daniel** - Deep, authoritative male voice
- **Karen** - Expressive female voice
- **Moira** - Irish accent, distinctive

To see all available voices:
```bash
say -v ?
```

## Processing Time Estimates

For your ~52,000 character collection:

- **macOS say**: ~5-10 minutes
- **Coqui TTS**: ~30-60 minutes (first run includes model download)
- **pyttsx3**: ~10-15 minutes

## File Formats

- **macOS say**: AIFF files (convert to MP3 with ffmpeg)
- **Others**: WAV files

**To convert AIFF to MP3:**
```bash
cd macos_audio_output
for file in *.aiff; do 
    ffmpeg -i "$file" "${file%.aiff}.mp3"
done
```

## Troubleshooting

### macOS Permission Issues
If you get permission errors:
```bash
# Grant Terminal access to speech recognition
System Preferences > Security & Privacy > Privacy > Speech Recognition
```

### FFmpeg Not Found
```bash
brew install ffmpeg
```

### Python Dependencies
```bash
# For Coqui TTS
pip3 install TTS torch torchaudio

# For cross-platform
pip3 install pyttsx3
```

## Customization

Edit the scripts to:
- Change speech rate (`speech_rate` variable)
- Select different voices (`selected_voice`)
- Adjust chunk sizes (`max_chars` in `split_into_chunks`)
- Modify audio format settings

## Privacy & Offline Use

All local TTS options work completely offline after initial setup:
- No data sent to external servers
- No internet connection required for conversion
- All processing happens on your machine

## Performance Tips

1. **For fastest results**: Use `macos_tts_converter.py`
2. **For best quality**: Use Coqui TTS with a good GPU
3. **For batch processing**: Split stories into separate runs to save memory
4. **Storage**: Each story ~10-50MB depending on format and quality