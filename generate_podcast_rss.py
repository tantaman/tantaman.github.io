#!/usr/bin/env python3
"""
Podcast RSS Feed Generator for The Mirror Room
Creates a standards-compliant podcast RSS feed from audio files
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timezone
import mimetypes
import hashlib
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom
import re

def get_audio_duration_ffprobe(audio_file):
    """Get audio duration using ffprobe"""
    try:
        import subprocess
        cmd = [
            'ffprobe', '-v', 'quiet', '-print_format', 'json', 
            '-show_format', str(audio_file)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        import json
        data = json.loads(result.stdout)
        duration_seconds = float(data['format']['duration'])
        
        # Convert to HH:MM:SS format
        hours = int(duration_seconds // 3600)
        minutes = int((duration_seconds % 3600) // 60)
        seconds = int(duration_seconds % 60)
        
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}", int(duration_seconds)
        
    except Exception as e:
        print(f"Warning: Could not get duration for {audio_file}: {e}")
        return "00:00:00", 0

def get_file_size(file_path):
    """Get file size in bytes"""
    try:
        return os.path.getsize(file_path)
    except:
        return 0

def clean_story_title(filename):
    """Convert filename to clean episode title"""
    # Remove extension
    name = Path(filename).stem
    
    # Convert underscores to spaces and title case
    title = name.replace('_', ' ').title()
    
    # Fix common title cases
    title = title.replace('The ', 'The ')
    
    return title

def get_story_description(title):
    """Get description for each story based on title"""
    descriptions = {
        "The Consistent Man": "Daniel discovers that true consistency isn't about rigid habits, but about becoming someone you can count on. A story about forging identity through disciplined choice and the unexpected freedom that follows.",
        
        "The Mirror Room": "Sarah encounters a mysterious room filled with mirrors, each showing a different version of herself. A philosophical exploration of identity, choice, and the courage to exist without fixed labels.",
        
        "The Meeting": "Two strangers meet at an intersection—Daniel, who has mastered consistency, and Sarah, who has transcended fixed identity. Their conversation with a provocative teacher challenges them to move beyond philosophical paralysis toward purposeful action.",
        
        "The Paradox Of Becoming": "A reflection on the fundamental challenge of authentic existence: how do we choose to become ourselves before we know who we are? An exploration of the courage required for genuine self-creation.",
        
        "The Readers Crisis": "Maya, a committed activist, grapples with how her political consciousness has become a prison. A story about the tension between systemic awareness and personal agency, and the radical act of taking responsibility for one's own existence."
    }
    
    return descriptions.get(title, f"A philosophical short story exploring themes of identity, choice, and authentic existence.")

def create_podcast_rss(audio_directory, base_url, output_file="podcast.rss"):
    """Create RSS feed for podcast"""
    
    audio_dir = Path(audio_directory)
    if not audio_dir.exists():
        print(f"Error: Audio directory {audio_directory} does not exist")
        return False
    
    # Find audio files (excluding chunk files)
    audio_files = []
    for ext in ['.mp3', '.m4a', '.wav', '.aiff']:
        for audio_file in audio_dir.glob(f"*{ext}"):
            # Skip chunk files and temporary files
            if 'chunk_' not in audio_file.name and not audio_file.name.startswith('.'):
                audio_files.append(audio_file)
    
    if not audio_files:
        print(f"No audio files found in {audio_directory}")
        return False
    
    # Sort files for consistent episode ordering
    audio_files.sort()
    
    print(f"Found {len(audio_files)} audio files")
    
    # Create RSS root element
    rss = Element('rss')
    rss.set('version', '2.0')
    rss.set('xmlns:itunes', 'http://www.itunes.com/dtds/podcast-1.0.dtd')
    rss.set('xmlns:content', 'http://purl.org/rss/1.0/modules/content/')
    
    channel = SubElement(rss, 'channel')
    
    # Podcast metadata
    SubElement(channel, 'title').text = 'The Mirror Room: A Philosophical Short Story Collection'
    SubElement(channel, 'description').text = """A collection of philosophical short stories exploring themes of identity, authenticity, choice, and the courage to exist as oneself. Through characters like Daniel (who masters consistency) and Sarah (who transcends fixed identity), these stories examine the fundamental challenges of becoming human in a world that offers no guarantees."""
    
    SubElement(channel, 'link').text = base_url
    SubElement(channel, 'language').text = 'en-us'
    SubElement(channel, 'copyright').text = f'© {datetime.now().year} The Mirror Room'
    SubElement(channel, 'managingEditor').text = 'hello@themirrorroom.com'
    SubElement(channel, 'webMaster').text = 'hello@themirrorroom.com'
    SubElement(channel, 'pubDate').text = datetime.now(timezone.utc).strftime('%a, %d %b %Y %H:%M:%S %z')
    SubElement(channel, 'lastBuildDate').text = datetime.now(timezone.utc).strftime('%a, %d %b %Y %H:%M:%S %z')
    SubElement(channel, 'generator').text = 'The Mirror Room Podcast Generator'
    
    # iTunes-specific tags
    SubElement(channel, '{http://www.itunes.com/dtds/podcast-1.0.dtd}subtitle').text = 'Philosophical Stories About Becoming Human'
    SubElement(channel, '{http://www.itunes.com/dtds/podcast-1.0.dtd}author').text = 'The Mirror Room'
    SubElement(channel, '{http://www.itunes.com/dtds/podcast-1.0.dtd}summary').text = 'A collection of philosophical short stories exploring identity, choice, and authentic existence through compelling characters facing fundamental questions about what it means to be human.'
    
    # iTunes categories
    category = SubElement(channel, '{http://www.itunes.com/dtds/podcast-1.0.dtd}category')
    category.set('text', 'Arts')
    subcategory = SubElement(category, '{http://www.itunes.com/dtds/podcast-1.0.dtd}category')
    subcategory.set('text', 'Books')
    
    category2 = SubElement(channel, '{http://www.itunes.com/dtds/podcast-1.0.dtd}category')
    category2.set('text', 'Society & Culture')
    subcategory2 = SubElement(category2, '{http://www.itunes.com/dtds/podcast-1.0.dtd}category')
    subcategory2.set('text', 'Philosophy')
    
    SubElement(channel, '{http://www.itunes.com/dtds/podcast-1.0.dtd}explicit').text = 'no'
    
    # Owner info
    owner = SubElement(channel, '{http://www.itunes.com/dtds/podcast-1.0.dtd}owner')
    SubElement(owner, '{http://www.itunes.com/dtds/podcast-1.0.dtd}name').text = 'The Mirror Room'
    SubElement(owner, '{http://www.itunes.com/dtds/podcast-1.0.dtd}email').text = 'hello@themirrorroom.com'
    
    # Podcast artwork (if it exists)
    artwork_path = audio_dir / 'artwork.jpg'
    if not artwork_path.exists():
        artwork_path = audio_dir / 'cover.png'
    
    if artwork_path.exists():
        image = SubElement(channel, 'image')
        SubElement(image, 'url').text = f"{base_url.rstrip('/')}/artwork.jpg"
        SubElement(image, 'title').text = 'The Mirror Room'
        SubElement(image, 'link').text = base_url
        
        SubElement(channel, '{http://www.itunes.com/dtds/podcast-1.0.dtd}image').set('href', f"{base_url.rstrip('/')}/artwork.jpg")
    
    # Generate episodes
    episode_number = len(audio_files)
    
    for i, audio_file in enumerate(audio_files):
        print(f"Processing episode: {audio_file.name}")
        
        # Create item (episode)
        item = SubElement(channel, 'item')
        
        # Episode metadata
        title = clean_story_title(audio_file.name)
        SubElement(item, 'title').text = f"{episode_number}: {title}"
        
        description = get_story_description(title)
        SubElement(item, 'description').text = description
        SubElement(item, '{http://www.itunes.com/dtds/podcast-1.0.dtd}summary').text = description
        
        # Use file modification time as publish date
        pub_date = datetime.fromtimestamp(audio_file.stat().st_mtime, tz=timezone.utc)
        # Adjust dates so episodes are published in order (most recent first)
        pub_date = pub_date.replace(day=min(28, pub_date.day - i))
        SubElement(item, 'pubDate').text = pub_date.strftime('%a, %d %b %Y %H:%M:%S %z')
        
        # Enclosure (audio file)
        file_size = get_file_size(audio_file)
        file_type = mimetypes.guess_type(str(audio_file))[0] or 'audio/mpeg'
        
        enclosure = SubElement(item, 'enclosure')
        enclosure.set('url', f"{base_url.rstrip('/')}/{audio_file.name}")
        enclosure.set('length', str(file_size))
        enclosure.set('type', file_type)
        
        # GUID (unique identifier)
        guid = SubElement(item, 'guid')
        guid.text = hashlib.md5(f"{base_url}/{audio_file.name}".encode()).hexdigest()
        guid.set('isPermaLink', 'false')
        
        # iTunes episode info
        SubElement(item, '{http://www.itunes.com/dtds/podcast-1.0.dtd}author').text = 'The Mirror Room'
        SubElement(item, '{http://www.itunes.com/dtds/podcast-1.0.dtd}explicit').text = 'no'
        SubElement(item, '{http://www.itunes.com/dtds/podcast-1.0.dtd}episode').text = str(episode_number)
        SubElement(item, '{http://www.itunes.com/dtds/podcast-1.0.dtd}episodeType').text = 'full'
        
        # Duration
        duration_str, duration_seconds = get_audio_duration_ffprobe(audio_file)
        if duration_seconds > 0:
            SubElement(item, '{http://www.itunes.com/dtds/podcast-1.0.dtd}duration').text = duration_str
        
        episode_number -= 1
    
    # Pretty print XML
    rough_string = tostring(rss, 'utf-8')
    reparsed = minidom.parseString(rough_string)
    pretty_xml = reparsed.toprettyxml(indent="  ", encoding='utf-8')
    
    # Write to file
    with open(output_file, 'wb') as f:
        f.write(pretty_xml)
    
    print(f"RSS feed generated: {output_file}")
    print(f"Episodes: {len(audio_files)}")
    print(f"\nTo test your podcast:")
    print(f"1. Upload audio files to: {base_url}")
    print(f"2. Upload {output_file} to: {base_url}/podcast.rss")
    print(f"3. Test RSS feed at: https://podcastcheck.app/")
    print(f"4. Submit to podcast directories with URL: {base_url}/podcast.rss")
    
    return True

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 generate_podcast_rss.py <audio_directory> <base_url> [output_file]")
        print("\nExample:")
        print("python3 generate_podcast_rss.py edge_tts_output https://yourdomain.com/podcasts/")
        print("python3 generate_podcast_rss.py audio_output https://tantaman.github.io/edge_tts_output/")
        return
    
    audio_directory = sys.argv[1]
    base_url = sys.argv[2]
    output_file = sys.argv[3] if len(sys.argv) > 3 else "podcast.rss"
    
    # Ensure base_url ends with slash
    if not base_url.endswith('/'):
        base_url += '/'
    
    success = create_podcast_rss(audio_directory, base_url, output_file)
    
    if success:
        print(f"\n✅ Podcast RSS feed created successfully!")
    else:
        print(f"\n❌ Failed to create RSS feed")
        sys.exit(1)

if __name__ == "__main__":
    main()