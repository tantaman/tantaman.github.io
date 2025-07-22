#!/usr/bin/env python3
"""
macOS Text-to-Speech converter for The Mirror Room stories
Uses the built-in macOS 'say' command for high-quality local TTS
"""

import re
import os
import sys
from pathlib import Path
import subprocess
import tempfile

def extract_stories(markdown_content):
    """Extract individual stories from the markdown content"""
    stories = {}
    
    # Split content by story headers
    story_pattern = r'^## (.+?)$'
    sections = re.split(story_pattern, markdown_content, flags=re.MULTILINE)
    
    current_story = None
    for i, section in enumerate(sections):
        if i % 2 == 1:  # Odd indices are story titles
            current_story = section.strip()
            stories[current_story] = ""
        elif i % 2 == 0 and current_story:  # Even indices are content
            stories[current_story] = section.strip()
    
    return stories

def clean_text(text):
    """Remove markdown formatting and HTML tags"""
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    
    # Remove markdown formatting
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)  # Bold
    text = re.sub(r'\*(.*?)\*', r'\1', text)      # Italic
    text = re.sub(r'_(.*?)_', r'\1', text)        # Italic underscore
    text = re.sub(r'`([^`]+)`', r'\1', text)      # Code
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)  # Links
    text = re.sub(r'^#+\s*', '', text, flags=re.MULTILINE)  # Headers
    text = re.sub(r'^---+$', '', text, flags=re.MULTILINE)  # Horizontal rules
    text = re.sub(r'^❦$', '', text, flags=re.MULTILINE)    # Decorative symbols
    
    # Clean up whitespace
    text = re.sub(r'\n\s*\n', '\n\n', text)  # Multiple newlines
    text = re.sub(r'[ \t]+', ' ', text)       # Multiple spaces/tabs
    
    return text.strip()

def split_into_chunks(text, max_chars=1000):
    """Split text into chunks suitable for macOS say command"""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        if len(current_chunk) + len(sentence) + 1 > max_chars and current_chunk:
            chunks.append(current_chunk.strip())
            current_chunk = sentence
        else:
            current_chunk += (" " if current_chunk else "") + sentence
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks

def get_available_voices():
    """Get list of available voices on macOS"""
    try:
        result = subprocess.run(['say', '-v', '?'], capture_output=True, text=True, check=True)
        voices = []
        for line in result.stdout.strip().split('\n'):
            if line.strip():
                voice_name = line.split()[0]
                voices.append(voice_name)
        return voices
    except subprocess.CalledProcessError:
        return ['Alex']  # Default voice

def generate_tts_with_macos_say(text, output_file, voice="Alex", rate=200):
    """Generate TTS using macOS say command"""
    try:
        # Create temporary text file to avoid shell escaping issues
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(text)
            text_file = f.name
        
        # Use say command with file input
        cmd = [
            'say',
            '-v', voice,
            '-r', str(rate),  # Words per minute
            '-o', output_file,  # Output file
            '-f', text_file     # Read from file
        ]
        
        result = subprocess.run(cmd, capture_output=True, check=True)
        
        # Clean up temp file
        os.unlink(text_file)
        
        print(f"Generated with say ({voice}): {output_file}")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"macOS say error: {e}")
        if os.path.exists(text_file):
            os.unlink(text_file)
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def combine_audio_files(input_files, output_file):
    """Combine multiple audio files using ffmpeg"""
    try:
        # Create a temporary file list for ffmpeg
        file_list_path = "temp_file_list.txt"
        with open(file_list_path, "w") as f:
            for audio_file in input_files:
                f.write(f"file '{audio_file}'\n")
        
        # Use ffmpeg to concatenate
        cmd = [
            "ffmpeg", "-f", "concat", "-safe", "0", 
            "-i", file_list_path, "-c", "copy", output_file, "-y"
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
        os.remove(file_list_path)
        
        print(f"Combined audio saved: {output_file}")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e}")
        return False
    except FileNotFoundError:
        print("FFmpeg not found. Install with: brew install ffmpeg")
        return False

def main():
    # Read the markdown file
    input_file = Path("content/the-mirror-room/index.md")
    if not input_file.exists():
        print(f"File not found: {input_file}")
        return
    
    with open(input_file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Get available voices
    voices = get_available_voices()
    print(f"Available voices: {', '.join(voices[:10])}...")  # Show first 10
    
    # Recommended voices for storytelling
    storytelling_voices = ['Alex', 'Samantha', 'Victoria', 'Daniel', 'Karen', 'Moira']
    selected_voice = None
    
    for voice in storytelling_voices:
        if voice in voices:
            selected_voice = voice
            break
    
    if not selected_voice:
        selected_voice = voices[0] if voices else 'Alex'
    
    print(f"Using voice: {selected_voice}")
    
    # Extract stories
    stories = extract_stories(content)
    
    # Create output directory
    output_dir = Path("macos_audio_output")
    output_dir.mkdir(exist_ok=True)
    
    # Speech rate (words per minute) - slower for better comprehension
    speech_rate = 180
    
    for story_title, story_content in stories.items():
        if not story_content.strip():
            continue
            
        print(f"\nProcessing: {story_title}")
        
        # Clean the text
        clean_content = clean_text(story_content)
        
        # Split into chunks
        chunks = split_into_chunks(clean_content, max_chars=1200)
        print(f"Split into {len(chunks)} chunks")
        
        # Generate audio for each chunk
        chunk_files = []
        story_dir = output_dir / story_title.replace(" ", "_").lower()
        story_dir.mkdir(exist_ok=True)
        
        for i, chunk in enumerate(chunks):
            chunk_file = story_dir / f"chunk_{i+1:03d}.aiff"
            if generate_tts_with_macos_say(chunk, str(chunk_file), selected_voice, speech_rate):
                chunk_files.append(str(chunk_file))
        
        # Combine chunks into single file
        if chunk_files:
            final_file = output_dir / f"{story_title.replace(' ', '_').lower()}.aiff"
            combine_audio_files(chunk_files, str(final_file))
    
    print(f"\nmacOS audio files generated in: {output_dir}")
    print(f"Voice used: {selected_voice}")
    print(f"Speech rate: {speech_rate} WPM")
    print(f"\nTo convert to MP3, run:")
    print(f"cd {output_dir} && for file in *.aiff; do ffmpeg -i \"$file\" \"${{file%.aiff}}.mp3\"; done")

if __name__ == "__main__":
    main()