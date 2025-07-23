#!/usr/bin/env python3
"""
Text-to-Speech converter for The Mirror Room stories
Extracts clean text and generates audio files using OpenAI's TTS API
"""

import re
import os
import sys
from pathlib import Path
import json

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
    
    return {
        'The Meeting': stories.get('The Meeting', ''),
        'The Reader\'s Crisis': stories.get('The Reader\'s Crisis', ''),
    }

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

def split_into_chunks(text, max_chars=4000):
    """Split text into chunks suitable for TTS processing"""
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

def generate_tts_with_openai(text, output_file, voice="alloy"):
    """Generate TTS using OpenAI API"""
    try:
        from openai import OpenAI
        client = OpenAI()
        
        response = client.audio.speech.create(
            model="tts-1-hd",  # Higher quality model
            voice=voice,
            input=text,
            response_format="mp3"
        )
        
        with open(output_file, "wb") as f:
            f.write(response.content)
        
        print(f"Generated: {output_file}")
        return True
        
    except ImportError:
        print("OpenAI library not installed. Run: pip install openai")
        return False
    except Exception as e:
        print(f"Error generating TTS: {e}")
        return False

def combine_audio_files(input_files, output_file):
    """Combine multiple audio files using ffmpeg"""
    try:
        import subprocess
        
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
        print("FFmpeg not found. Please install ffmpeg.")
        return False

def main():
    # Read the markdown file
    input_file = Path("content/the-mirror-room/index.md")
    if not input_file.exists():
        print(f"File not found: {input_file}")
        return
    
    with open(input_file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Extract stories
    stories = extract_stories(content)
    
    # Create output directory
    output_dir = Path("audio_output")
    output_dir.mkdir(exist_ok=True)
    
    # Voice options: alloy, echo, fable, onyx, nova, shimmer
    voice = "nova"  # Good for storytelling
    
    for story_title, story_content in stories.items():
        if not story_content.strip():
            continue
            
        print(f"\nProcessing: {story_title}")
        
        # Clean the text
        clean_content = clean_text(story_content)
        
        # Split into chunks
        chunks = split_into_chunks(clean_content)
        print(f"Split into {len(chunks)} chunks")
        
        # Generate audio for each chunk
        chunk_files = []
        story_dir = output_dir / story_title.replace(" ", "_").lower()
        story_dir.mkdir(exist_ok=True)
        
        for i, chunk in enumerate(chunks):
            chunk_file = story_dir / f"chunk_{i+1:03d}.mp3"
            if generate_tts_with_openai(chunk, str(chunk_file), voice):
                chunk_files.append(str(chunk_file))
        
        # Combine chunks into single file
        if chunk_files:
            final_file = output_dir / f"{story_title.replace(' ', '_').lower()}.mp3"
            combine_audio_files(chunk_files, str(final_file))
    
    print(f"\nAudio files generated in: {output_dir}")

if __name__ == "__main__":
    main()