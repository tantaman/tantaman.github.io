export interface AlbumMetadata {
  title: string;
  artist: string;
  year: string;
  coverUrl: string;
  itunesId: number;
  genre: string;
}

interface ItunesAlbumResult {
  collectionId: number;
  collectionName?: string;
  artistName?: string;
  releaseDate?: string;
  artworkUrl100?: string;
  primaryGenreName?: string;
}

function upscaleArtwork(url: string): string {
  return url.replace(/\/\d+x\d+bb\.(jpg|png)$/, '/600x600bb.$1');
}

function toAlbumMetadata(r: ItunesAlbumResult): AlbumMetadata | null {
  if (!r.artworkUrl100) return null;
  return {
    title: r.collectionName ?? '',
    artist: r.artistName ?? '',
    year: r.releaseDate ? r.releaseDate.slice(0, 4) : '',
    coverUrl: upscaleArtwork(r.artworkUrl100),
    itunesId: r.collectionId,
    genre: r.primaryGenreName ?? '',
  };
}

export async function lookupAlbum(title: string): Promise<AlbumMetadata | null> {
  try {
    const url = `https://itunes.apple.com/search?media=music&entity=album&limit=1&term=${encodeURIComponent(title)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: ItunesAlbumResult[] };
    const result = data.results?.[0];
    return result ? toAlbumMetadata(result) : null;
  } catch {
    return null;
  }
}

export async function fetchAlbumById(itunesId: number): Promise<AlbumMetadata | null> {
  try {
    const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(String(itunesId))}&entity=album`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: ItunesAlbumResult[] };
    const result = data.results?.find((r) => r.collectionId === itunesId) ?? data.results?.[0];
    return result ? toAlbumMetadata(result) : null;
  } catch {
    return null;
  }
}
