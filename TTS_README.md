# Text-to-Speech Conversion for The Mirror Room

This script converts your short story collection to high-quality audio using OpenAI's TTS API.

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Install ffmpeg (for audio combining):**
   ```bash
   # macOS
   brew install ffmpeg
   
   # Ubuntu/Debian
   sudo apt install ffmpeg
   
   # Windows
   # Download from https://ffmpeg.org/download.html
   ```

3. **Set up OpenAI API key:**
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```
   
   Or create a `.env` file:
   ```
   OPENAI_API_KEY=your-api-key-here
   ```

## Usage

Run the conversion script:
```bash
python tts_converter.py
```

This will:
- Extract each story from `content/the-mirror-room/index.md`
- Clean up markdown formatting
- Split long stories into manageable chunks
- Generate MP3 files using OpenAI's TTS
- Combine chunks into complete story audio files

## Output

Audio files will be created in the `audio_output/` directory:
- `the_consistent_man.mp3`
- `the_mirror_room.mp3`
- `the_meeting.mp3`
- `the_paradox_of_becoming.mp3`
- `the_readers_crisis.mp3`

## Voice Options

The script uses OpenAI's "nova" voice by default (good for storytelling). You can change the voice by editing the `voice` variable in `tts_converter.py`:

Available voices:
- `alloy` - Neutral, balanced
- `echo` - Clear, articulate  
- `fable` - Warm, engaging
- `onyx` - Deep, authoritative
- `nova` - Versatile, expressive
- `shimmer` - Bright, energetic

## Cost Estimate

OpenAI TTS pricing: $15.00 per 1M characters
Your story collection (~52,000 characters) ≈ $0.78

## Alternative TTS Services

If you prefer other services, modify the `generate_tts_with_openai()` function:

- **ElevenLabs**: More realistic voices, higher cost
- **Google Cloud TTS**: Good quality, competitive pricing  
- **Azure Speech**: Natural voices with emotion control
- **Local TTS**: Free but lower quality (Coqui TTS, Tortoise TTS)