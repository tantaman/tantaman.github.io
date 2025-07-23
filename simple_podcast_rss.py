#!/usr/bin/env python3
"""
Simple Podcast RSS Generator - No external dependencies
"""

import os
from pathlib import Path
from datetime import datetime, timezone

def create_simple_rss():
    # Audio files
    audio_files = [
        "the_consistent_man.mp3",
        "the_mirror_room.mp3", 
        "the_meeting.mp3",
        "the_paradox_of_becoming.mp3",
        "the_readers_crisis.mp3"
    ]
    
    base_url = "https://tantaman.github.io/audio_output"
    
    # Get file sizes
    audio_dir = Path("audio_output")
    file_info = []
    
    for filename in audio_files:
        filepath = audio_dir / filename
        if filepath.exists():
            size = filepath.stat().st_size
            # Clean title
            title = filename.replace('_', ' ').replace('.mp3', '').title()
            file_info.append({
                'filename': filename,
                'title': title,
                'size': size
            })
    
    # Story descriptions
    descriptions = {
        "The Consistent Man": "Daniel discovers that true consistency isn't about rigid habits, but about becoming someone you can count on. A story about forging identity through disciplined choice and the unexpected freedom that follows.",
        "The Mirror Room": "Sarah encounters a mysterious room filled with mirrors, each showing a different version of herself. A philosophical exploration of identity, choice, and the courage to exist without fixed labels.",
        "The Meeting": "Two strangers meet at an intersection—Daniel, who has mastered consistency, and Sarah, who has transcended fixed identity. Their conversation with a provocative teacher challenges them to move beyond philosophical paralysis toward purposeful action.",
        "The Paradox Of Becoming": "A reflection on the fundamental challenge of authentic existence: how do we choose to become ourselves before we know who we are? An exploration of the courage required for genuine self-creation.",
        "The Readers Crisis": "Maya, a committed activist, grapples with how her political consciousness has become a prison. A story about the tension between systemic awareness and personal agency, and the radical act of taking responsibility for one's own existence."
    }
    
    # Generate RSS
    rss_content = '''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
    <title>The Mirror Room: A Philosophical Short Story Collection</title>
    <description><![CDATA[A collection of philosophical short stories exploring themes of identity, authenticity, choice, and the courage to exist as oneself. Through characters like Daniel (who masters consistency) and Sarah (who transcends fixed identity), these stories examine the fundamental challenges of becoming human in a world that offers no guarantees.]]></description>
    <link>https://tantaman.github.io</link>
    <language>en-us</language>
    <copyright>© 2025 The Mirror Room</copyright>
    <managingEditor>hello@themirrorroom.com</managingEditor>
    <webMaster>hello@themirrorroom.com</webMaster>
    <pubDate>''' + datetime.now(timezone.utc).strftime('%a, %d %b %Y %H:%M:%S %z') + '''</pubDate>
    <lastBuildDate>''' + datetime.now(timezone.utc).strftime('%a, %d %b %Y %H:%M:%S %z') + '''</lastBuildDate>
    <generator>The Mirror Room Podcast Generator</generator>
    
    <itunes:subtitle>Philosophical Stories About Becoming Human</itunes:subtitle>
    <itunes:author>The Mirror Room</itunes:author>
    <itunes:summary><![CDATA[A collection of philosophical short stories exploring identity, choice, and authentic existence through compelling characters facing fundamental questions about what it means to be human.]]></itunes:summary>
    <itunes:category text="Arts">
        <itunes:category text="Books"/>
    </itunes:category>
    <itunes:category text="Society &amp; Culture">
        <itunes:category text="Philosophy"/>
    </itunes:category>
    <itunes:explicit>no</itunes:explicit>
    <itunes:owner>
        <itunes:name>The Mirror Room</itunes:name>
        <itunes:email>hello@themirrorroom.com</itunes:email>
    </itunes:owner>
    
'''
    
    # Add episodes (reverse order for newest first)
    episode_num = len(file_info)
    
    for info in file_info:
        pub_date = datetime.now(timezone.utc)
        pub_date = pub_date.replace(day=max(1, pub_date.day - (len(file_info) - episode_num)))
        
        description = descriptions.get(info['title'], f"A philosophical short story exploring themes of identity, choice, and authentic existence.")
        
        rss_content += f'''    <item>
        <title>{episode_num}: {info['title']}</title>
        <description><![CDATA[{description}]]></description>
        <itunes:summary><![CDATA[{description}]]></itunes:summary>
        <pubDate>{pub_date.strftime('%a, %d %b %Y %H:%M:%S %z')}</pubDate>
        <enclosure url="{base_url}/{info['filename']}" length="{info['size']}" type="audio/mpeg"/>
        <guid isPermaLink="false">mirror-room-{episode_num:02d}</guid>
        <itunes:author>The Mirror Room</itunes:author>
        <itunes:explicit>no</itunes:explicit>
        <itunes:episode>{episode_num}</itunes:episode>
        <itunes:episodeType>full</itunes:episodeType>
    </item>
    
'''
        episode_num -= 1
    
    rss_content += '''</channel>
</rss>'''
    
    # Write RSS file
    with open('podcast.rss', 'w', encoding='utf-8') as f:
        f.write(rss_content)
    
    print("✅ Podcast RSS feed created: podcast.rss")
    print(f"📁 Found {len(file_info)} audio files")
    print(f"🔗 Base URL: {base_url}")
    print("\n📋 Next steps:")
    print("1. Upload audio files to: https://tantaman.github.io/audio_output/")
    print("2. Upload podcast.rss to: https://tantaman.github.io/")
    print("3. Test RSS feed at: https://podcastcheck.app/")
    print("4. Submit to directories with URL: https://tantaman.github.io/podcast.rss")
    
    return True

if __name__ == "__main__":
    create_simple_rss()