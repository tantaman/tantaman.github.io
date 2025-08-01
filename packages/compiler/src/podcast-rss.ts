import fs from 'fs';
import path from 'path';
import RSS from 'rss';
import NodeID3 from 'node-id3';
import { VFile } from 'vfile';
import { matter } from 'vfile-matter';

interface PodcastEpisode {
  title: string;
  description?: string;
  date: Date;
  audio: string;
  audioUrl: string;
  duration?: number;
  fileSize?: number;
  guid: string;
  link: string;
}

interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  comment?: { language: string; text: string } | { text: string }[];
  length?: string | number;
}

async function extractAudioMetadata(audioFilePath: string): Promise<AudioMetadata> {
  try {
    const tags = NodeID3.read(audioFilePath);
    return {
      title: tags.title,
      artist: tags.artist,
      album: tags.album,
      year: tags.year,
      comment: tags.comment,
      length: tags.length
    };
  } catch (error) {
    console.warn(`Could not extract metadata from ${audioFilePath}:`, error);
    return {};
  }
}

async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.promises.stat(filePath);
    return stats.size;
  } catch (error) {
    console.warn(`Could not get file size for ${filePath}:`, error);
    return 0;
  }
}

async function findPodcastEpisodes(contentDir: string): Promise<PodcastEpisode[]> {
  const files = await fs.promises.readdir(contentDir);
  const episodes: PodcastEpisode[] = [];

  for (const file of files) {
    if (!file.endsWith('.md') && !file.endsWith('.mdx')) {
      continue;
    }

    const filePath = path.join(contentDir, file);
    const content = await fs.promises.readFile(filePath, 'utf8');
    
    const vfile = new VFile({ path: filePath, value: content });
    matter(vfile);
    
    const frontmatter = vfile.data.matter as any;
    
    // Check if this is a podcast episode
    const tags = Array.isArray(frontmatter?.tags) ? frontmatter.tags : 
                 typeof frontmatter?.tags === 'string' ? [frontmatter.tags] : [];
    if (!tags.includes('podcast')) {
      continue;
    }

    if (!frontmatter.audio) {
      console.warn(`Podcast episode ${file} missing audio field`);
      continue;
    }

    // Extract date from filename (YYYY-MM-DD-title.md format)
    const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? new Date(dateMatch[1]) : new Date();

    // Construct full audio file path and URL
    const audioPath = path.join('./docs', frontmatter.audio);
    const audioUrl = `https://tantaman.com${frontmatter.audio}`;

    // Get audio metadata
    let audioMetadata: AudioMetadata = {};
    if (await fs.promises.access(audioPath).then(() => true).catch(() => false)) {
      audioMetadata = await extractAudioMetadata(audioPath);
    }

    // Get file size
    const fileSize = await getFileSize(audioPath);

    // Extract comment text safely
    let commentText = '';
    if (audioMetadata.comment) {
      if (Array.isArray(audioMetadata.comment)) {
        commentText = audioMetadata.comment[0]?.text || '';
      } else {
        commentText = audioMetadata.comment.text || '';
      }
    }

    // Convert duration to number if it's a string
    let duration: number | undefined;
    if (typeof audioMetadata.length === 'string') {
      duration = parseInt(audioMetadata.length, 10);
    } else if (typeof audioMetadata.length === 'number') {
      duration = audioMetadata.length;
    }

    // Create episode
    const episode: PodcastEpisode = {
      title: frontmatter.title || audioMetadata.title || file.replace(/\.(md|mdx)$/, ''),
      description: frontmatter.description || commentText || '',
      date,
      audio: frontmatter.audio,
      audioUrl,
      duration,
      fileSize,
      guid: audioUrl,
      link: `https://tantaman.com/${file.replace(/\.(md|mdx)$/, '.html')}`
    };

    episodes.push(episode);
  }

  // Sort episodes by date (newest first)
  episodes.sort((a, b) => b.date.getTime() - a.date.getTime());

  return episodes;
}

export async function generatePodcastRSS(contentDir: string): Promise<string> {
  const episodes = await findPodcastEpisodes(contentDir);

  if (episodes.length === 0) {
    console.log('No podcast episodes found, skipping RSS generation');
    return '';
  }

  const feed = new RSS({
    title: 'Tantaman Podcast',
    description: 'Thoughts and conversations from tantaman.com',
    feed_url: 'https://tantaman.com/podcast.xml',
    site_url: 'https://tantaman.com',
    image_url: 'https://tantaman.com/podcast-artwork.jpg', // You may want to add this
    managingEditor: 'matt@tantaman.com',
    webMaster: 'matt@tantaman.com',
    copyright: `Copyright ${new Date().getFullYear()} Matt Wonlaw`,
    language: 'en-us',
    categories: ['Technology', 'Programming', 'Philosophy'],
    pubDate: episodes[0]?.date || new Date(),
    ttl: 60,
    custom_namespaces: {
      'itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd',
      'content': 'http://purl.org/rss/1.0/modules/content/',
      'googleplay': 'http://www.google.com/schemas/play-podcasts/1.0'
    },
    custom_elements: [
      {'itunes:author': 'Matt Wonlaw'},
      {'itunes:summary': 'Thoughts and conversations from tantaman.com'},
      {'itunes:owner': [
        {'itunes:name': 'Matt Wonlaw'},
        {'itunes:email': 'matt@tantaman.com'}
      ]},
      {'itunes:image': {
        _attr: {
          href: 'https://tantaman.com/podcast-artwork.jpg'
        }
      }},
      {'itunes:category': [
        {_attr: {text: 'Technology'}},
        {'itunes:category': {_attr: {text: 'Software How-To'}}}
      ]},
      {'itunes:explicit': 'false'}
    ]
  });

  // Add episodes to feed
  for (const episode of episodes) {
    const item: any = {
      title: episode.title,
      description: episode.description,
      url: episode.link,
      guid: episode.guid,
      date: episode.date,
      enclosure: {
        url: episode.audioUrl,
        type: 'audio/mpeg',
        size: episode.fileSize
      },
      custom_elements: [
        {'itunes:author': 'Matt Wonlaw'},
        {'itunes:subtitle': episode.description},
        {'itunes:summary': episode.description},
        {'itunes:explicit': 'false'}
      ]
    };

    if (episode.duration) {
      item.custom_elements.push({'itunes:duration': Math.floor(episode.duration)});
    }

    feed.item(item);
  }

  return feed.xml({ indent: true });
}