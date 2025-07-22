#!/usr/bin/env python3
"""
High-Quality Text-to-Speech converter using Microsoft Edge TTS
Uses neural voices for natural, human-like speech generation
"""

import re
import os
import sys
import asyncio
from pathlib import Path
import subprocess
import edge_tts

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

def split_into_chunks(text, max_chars=800):
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

async def generate_tts_with_edge(text, output_file, voice="en-US-JennyNeural", rate="-10%"):
    """Generate TTS using Microsoft Edge TTS"""
    try:
        # Create TTS communication
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        
        # Save to file
        await communicate.save(output_file)
        
        print(f"Generated with Edge TTS ({voice}): {output_file}")
        return True
        
    except Exception as e:
        print(f"Error with Edge TTS: {e}")
        return False

async def get_available_voices():
    """Get list of available Edge TTS voices"""
    try:
        voices = await edge_tts.list_voices()
        return voices
    except Exception as e:
        print(f"Error getting voices: {e}")
        return []

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

async def main():
    # Read the markdown file
    input_file = Path("content/the-mirror-room/index.md")
    if not input_file.exists():
        print(f"File not found: {input_file}")
        return
    
    with open(input_file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Get available voices
    print("Getting available voices...")
    voices = await get_available_voices()
    
    # Best storytelling voices (neural, natural sounding)
    storytelling_voices = [
        "en-US-JennyNeural",      # Female, warm and conversational
        "en-US-DavisNeural",      # Male, warm and friendly  
        "en-US-AriaNeural",       # Female, cheerful and optimistic
        "en-US-GuyNeural",        # Male, relaxed and trusting
        "en-US-SaraNeural",       # Female, expressive
        "en-US-TonyNeural",       # Male, authoritative
        "en-GB-SoniaNeural",      # British Female, warm
        "en-GB-RyanNeural",       # British Male, friendly
    ]
    
    # Find best available voice
    available_voice_names = [v['Name'] for v in voices] if voices else []
    selected_voice = None
    
    for voice in storytelling_voices:
        if voice in available_voice_names:
            selected_voice = voice
            break
    
    if not selected_voice:
        selected_voice = "en-US-JennyNeural"  # Default fallback
    
    print(f"Using voice: {selected_voice}")
    
    # Speech rate adjustment (negative = slower, positive = faster)
    speech_rate = "-15%"  # Slightly slower for better comprehension
    
    # Extract stories
    stories = extract_stories(content)
    
    # Create output directory
    output_dir = Path("edge_tts_output")
    output_dir.mkdir(exist_ok=True)
    
    for story_title, story_content in stories.items():
        if not story_content.strip():
            continue
            
        print(f"\nProcessing: {story_title}")
        
        # Clean the text
        clean_content = clean_text(story_content)
        
        # Split into chunks
        chunks = split_into_chunks(clean_content, max_chars=1000)
        print(f"Split into {len(chunks)} chunks")
        
        # Generate audio for each chunk
        chunk_files = []
        story_dir = output_dir / story_title.replace(" ", "_").lower()
        story_dir.mkdir(exist_ok=True)
        
        for i, chunk in enumerate(chunks):
            chunk_file = story_dir / f"chunk_{i+1:03d}.mp3"
            if await generate_tts_with_edge(chunk, str(chunk_file), selected_voice, speech_rate):
                chunk_files.append(str(chunk_file))
        
        # Combine chunks into single file
        if chunk_files:
            final_file = output_dir / f"{story_title.replace(' ', '_').lower()}.mp3"
            combine_audio_files(chunk_files, str(final_file))
    
    print(f"\nHigh-quality audio files generated in: {output_dir}")
    print(f"Voice used: {selected_voice}")
    print(f"Speech rate: {speech_rate}")

if __name__ == "__main__":
    asyncio.run(main())