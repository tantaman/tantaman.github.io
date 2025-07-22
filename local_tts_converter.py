#!/usr/bin/env python3
"""
Local Text-to-Speech converter for The Mirror Room stories
Uses local TTS models for privacy and cost-free conversion
"""

import re
import os
import sys
from pathlib import Path
import json
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

def split_into_chunks(text, max_chars=500):
    """Split text into smaller chunks for local TTS (they handle shorter text better)"""
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

def generate_tts_with_coqui(text, output_file):
    """Generate TTS using Coqui TTS"""
    try:
        import torch
        from TTS.api import TTS
        
        # Initialize TTS with a good English model
        # This will download the model on first use
        tts = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", progress_bar=False)
        
        # Generate speech
        tts.tts_to_file(text=text, file_path=output_file)
        
        print(f"Generated with Coqui: {output_file}")
        return True
        
    except ImportError:
        print("Coqui TTS not installed. Run: pip install TTS")
        return False
    except Exception as e:
        print(f"Error with Coqui TTS: {e}")
        return False

def generate_tts_with_espeak(text, output_file, voice="en", speed=175):
    """Generate TTS using espeak (fast, basic quality)"""
    try:
        # Use espeak to generate audio
        cmd = [
            "espeak", 
            "-v", voice,
            "-s", str(speed),  # Speed in words per minute
            "-w", output_file,  # Write to file
            text
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print(f"Generated with espeak: {output_file}")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"espeak error: {e}")
        return False
    except FileNotFoundError:
        print("espeak not found. Install with: brew install espeak (macOS) or sudo apt install espeak (Linux)")
        return False

def generate_tts_with_festival(text, output_file):
    """Generate TTS using Festival"""
    try:
        # Create temporary text file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(text)
            text_file = f.name
        
        # Use festival to generate audio
        cmd = f'echo "({text})" | festival --tts --otype wav > {output_file}'
        
        result = subprocess.run(cmd, shell=True, capture_output=True)
        
        os.unlink(text_file)  # Clean up temp file
        
        if result.returncode == 0:
            print(f"Generated with Festival: {output_file}")
            return True
        else:
            print(f"Festival error: {result.stderr.decode()}")
            return False
        
    except Exception as e:
        print(f"Festival error: {e}")
        return False

def generate_tts_with_pyttsx3(text, output_file):
    """Generate TTS using pyttsx3 (cross-platform)"""
    try:
        import pyttsx3
        
        engine = pyttsx3.init()
        
        # Set properties
        rate = engine.getProperty('rate')
        engine.setProperty('rate', rate - 50)  # Slower speech
        
        voices = engine.getProperty('voices')
        if voices:
            # Try to find a good voice
            for voice in voices:
                if 'english' in voice.name.lower() or 'en' in voice.id.lower():
                    engine.setProperty('voice', voice.id)
                    break
        
        # Save to file
        engine.save_to_file(text, output_file)
        engine.runAndWait()
        
        print(f"Generated with pyttsx3: {output_file}")
        return True
        
    except ImportError:
        print("pyttsx3 not installed. Run: pip install pyttsx3")
        return False
    except Exception as e:
        print(f"Error with pyttsx3: {e}")
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
        print("FFmpeg not found. Please install ffmpeg.")
        return False

def detect_available_tts():
    """Detect which TTS engines are available"""
    available = []
    
    # Check for Coqui TTS
    try:
        import TTS
        available.append("coqui")
    except ImportError:
        pass
    
    # Check for espeak
    try:
        subprocess.run(["espeak", "--version"], capture_output=True, check=True)
        available.append("espeak")
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass
    
    # Check for festival
    try:
        subprocess.run(["festival", "--version"], capture_output=True, check=True)
        available.append("festival")
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass
    
    # Check for pyttsx3
    try:
        import pyttsx3
        available.append("pyttsx3")
    except ImportError:
        pass
    
    return available

def main():
    # Read the markdown file
    input_file = Path("content/the-mirror-room/index.md")
    if not input_file.exists():
        print(f"File not found: {input_file}")
        return
    
    with open(input_file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Detect available TTS engines
    available_tts = detect_available_tts()
    
    if not available_tts:
        print("No TTS engines found!")
        print("Install options:")
        print("- pip install TTS (Coqui TTS - best quality)")
        print("- pip install pyttsx3 (cross-platform)")
        print("- brew install espeak (macOS) or sudo apt install espeak (Linux)")
        print("- sudo apt install festival (Linux)")
        return
    
    print(f"Available TTS engines: {', '.join(available_tts)}")
    
    # Choose TTS engine (prioritize by quality)
    if "coqui" in available_tts:
        tts_engine = "coqui"
        generate_tts = generate_tts_with_coqui
        file_ext = ".wav"
    elif "pyttsx3" in available_tts:
        tts_engine = "pyttsx3"
        generate_tts = generate_tts_with_pyttsx3
        file_ext = ".wav"
    elif "espeak" in available_tts:
        tts_engine = "espeak"
        generate_tts = generate_tts_with_espeak
        file_ext = ".wav"
    elif "festival" in available_tts:
        tts_engine = "festival"
        generate_tts = generate_tts_with_festival
        file_ext = ".wav"
    
    print(f"Using TTS engine: {tts_engine}")
    
    # Extract stories
    stories = extract_stories(content)
    
    # Create output directory
    output_dir = Path("local_audio_output")
    output_dir.mkdir(exist_ok=True)
    
    for story_title, story_content in stories.items():
        if not story_content.strip():
            continue
            
        print(f"\nProcessing: {story_title}")
        
        # Clean the text
        clean_content = clean_text(story_content)
        
        # Split into chunks
        chunks = split_into_chunks(clean_content, max_chars=800 if tts_engine == "coqui" else 500)
        print(f"Split into {len(chunks)} chunks")
        
        # Generate audio for each chunk
        chunk_files = []
        story_dir = output_dir / story_title.replace(" ", "_").lower()
        story_dir.mkdir(exist_ok=True)
        
        for i, chunk in enumerate(chunks):
            chunk_file = story_dir / f"chunk_{i+1:03d}{file_ext}"
            if generate_tts(chunk, str(chunk_file)):
                chunk_files.append(str(chunk_file))
        
        # Combine chunks into single file
        if chunk_files:
            final_file = output_dir / f"{story_title.replace(' ', '_').lower()}{file_ext}"
            combine_audio_files(chunk_files, str(final_file))
    
    print(f"\nLocal audio files generated in: {output_dir}")
    print(f"Used TTS engine: {tts_engine}")

if __name__ == "__main__":
    main()