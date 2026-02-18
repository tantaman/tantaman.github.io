import { access, mkdir } from 'node:fs/promises';
import { join, basename, extname, dirname } from 'node:path';
import sharp from 'sharp';

export function extractFirstImage(markdownBody: string): string | null {
  const match = markdownBody.match(/!\[[^\]]*\]\(([^)]+)\)/);
  return match ? match[1] : null;
}

export async function generateThumbnail(
  imagePath: string | null,
  thumbDir: string,
  thumbUrlPrefix: string,
  thumbWidth: number,
): Promise<string | null> {
  if (!imagePath) return imagePath;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://'))
    return imagePath;
  if (extname(imagePath).toLowerCase() === '.svg') return imagePath;

  // Resolve local path to file on disk
  const source = join('docs', imagePath);

  const dir = basename(dirname(source));
  const name = basename(source, extname(source));
  const thumbName = `${dir}-${name}.webp`;
  const thumbPath = join(thumbDir, thumbName);
  const thumbUrl = `${thumbUrlPrefix}/${thumbName}`;

  try {
    await access(thumbPath);
    return thumbUrl;
  } catch {
    // Thumbnail doesn't exist yet — generate it
  }

  try {
    await mkdir(thumbDir, { recursive: true });
    await sharp(source)
      .resize({ width: thumbWidth, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(thumbPath);
    return thumbUrl;
  } catch (err: any) {
    console.warn(
      `[image-utils] Failed to generate thumbnail for ${imagePath}:`,
      err.message,
    );
    return imagePath;
  }
}
