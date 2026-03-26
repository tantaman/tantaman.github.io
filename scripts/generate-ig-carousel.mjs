#!/usr/bin/env node

import satori from 'satori';
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const CAROUSEL_CACHE = join(ROOT, '.carousel-cache.json');
const MEME_CACHE = join(ROOT, '.meme-cache.json');
const MANIFEST = join(ROOT, 'docs/posts-manifest.json');
const FONT_CACHE_DIR = join(ROOT, '.font-cache');
const FONT_PATH = join(FONT_CACHE_DIR, 'inter-bold.ttf');

const WIDTH = 1080;
const HEIGHT = 1350;
const MAX_SLIDES = 10;

const FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@700';

// --- Helpers ---

function h(type, props, ...children) {
  const flat = children.flat().filter((c) => c != null);
  return {
    type,
    props: {
      ...(props || {}),
      children: flat.length === 1 ? flat[0] : flat.length === 0 ? undefined : flat,
    },
  };
}

async function loadFont() {
  if (existsSync(FONT_PATH)) {
    return readFile(FONT_PATH);
  }
  console.log('Fetching Inter Bold from Google Fonts...');
  const css = await fetch(FONT_CSS_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1',
    },
  }).then((r) => r.text());
  const urlMatch = css.match(/src:\s*url\(([^)]+)\)/);
  if (!urlMatch) throw new Error('Could not parse font URL from Google Fonts');
  const fontData = await fetch(urlMatch[1]).then((r) => r.arrayBuffer());
  await mkdir(FONT_CACHE_DIR, { recursive: true });
  await writeFile(FONT_PATH, Buffer.from(fontData));
  console.log('Font cached.');
  return Buffer.from(fontData);
}

async function fetchImageAsDataUri(url) {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TantamanBot/1.0)' },
    });
    if (!resp.ok) return null;
    const contentType = resp.headers.get('content-type') || 'image/png';
    if (contentType.includes('webp') || contentType.includes('svg')) return null;
    const buffer = await resp.arrayBuffer();
    if (buffer.byteLength > 2 * 1024 * 1024) return null;
    const b64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${b64}`;
  } catch {
    return null;
  }
}

function adaptFontSize(text, { large = 72, medium = 56, small = 48 } = {}) {
  if (text.length > 120) return small;
  if (text.length > 80) return medium;
  return large;
}

// --- Slide Components ---

function buildBackground(bgDataUri) {
  if (bgDataUri) {
    return h('img', {
      src: bgDataUri,
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: WIDTH,
        height: HEIGHT,
        objectFit: 'cover',
      },
    });
  }
  return h('div', {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'linear-gradient(180deg, #1a1a2e 0%, #0f3460 100%)',
    },
  });
}

function buildOverlay() {
  return h('div', {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
  });
}

function buildDots(current, total) {
  const dots = Array.from({ length: total }, (_, i) =>
    h('div', {
      style: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: i === current ? 'white' : 'rgba(255, 255, 255, 0.35)',
        margin: '0 4px',
      },
    }),
  );
  return h(
    'div',
    {
      style: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
      },
    },
    ...dots,
  );
}

function buildAttribution() {
  return h(
    'div',
    {
      style: {
        position: 'absolute',
        bottom: 70,
        right: 60,
        fontSize: 24,
        fontWeight: 700,
        color: 'rgba(255, 255, 255, 0.4)',
      },
    },
    'tantaman.com',
  );
}

function buildSlideWrapper(bgDataUri, slideIndex, totalSlides, ...contentChildren) {
  return h(
    'div',
    {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        position: 'relative',
        backgroundColor: '#1a1a2e',
      },
    },
    buildBackground(bgDataUri),
    buildOverlay(),
    ...contentChildren,
    buildAttribution(),
    buildDots(slideIndex, totalSlides),
  );
}

// --- Slide Builders ---

function buildTitleSlide(entry, bgDataUri, totalSlides) {
  const title = entry.title;
  const thesis = entry.thesis;
  const titleSize = adaptFontSize(title, { large: 64, medium: 56, small: 48 });

  const children = [
    h(
      'div',
      {
        style: {
          fontSize: titleSize,
          fontWeight: 700,
          color: 'white',
          textAlign: 'center',
          lineHeight: 1.3,
          maxWidth: '90%',
        },
      },
      title,
    ),
  ];

  if (thesis) {
    children.push(
      h('div', {
        style: {
          width: 200,
          height: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          marginTop: 40,
          marginBottom: 40,
        },
      }),
    );
    children.push(
      h(
        'div',
        {
          style: {
            fontSize: 32,
            color: 'rgba(255, 255, 255, 0.75)',
            textAlign: 'center',
            maxWidth: '85%',
            lineHeight: 1.4,
          },
        },
        thesis,
      ),
    );
  }

  const content = h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        width: '100%',
        height: '100%',
        padding: '80px 60px',
      },
    },
    ...children,
  );

  return buildSlideWrapper(bgDataUri, 0, totalSlides, content);
}

function buildContentSlide(bgDataUri, pointText, slideIndex, totalSlides) {
  const fontSize = adaptFontSize(pointText);

  // Alternate vertical positioning for visual variety
  const verticalPositions = ['center', 'flex-start', 'flex-end'];
  const justifyContent = verticalPositions[slideIndex % 3];

  // Adjust padding based on position to keep text in comfortable zone
  const paddingTop = justifyContent === 'flex-end' ? '200px' : '160px';
  const paddingBottom = justifyContent === 'flex-start' ? '200px' : '160px';

  const content = h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent,
        alignItems: 'center',
        position: 'relative',
        width: '100%',
        height: '100%',
        paddingTop,
        paddingBottom,
        paddingLeft: '60px',
        paddingRight: '60px',
      },
    },
    h(
      'div',
      {
        style: {
          fontSize,
          fontWeight: 700,
          color: 'white',
          textAlign: 'center',
          lineHeight: 1.35,
          maxWidth: '90%',
        },
      },
      pointText,
    ),
  );

  return buildSlideWrapper(bgDataUri, slideIndex, totalSlides, content);
}

function buildCtaSlide(entry, bgDataUri, totalSlides) {
  const slug = entry.slug;

  const content = h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        width: '100%',
        height: '100%',
        padding: '80px 60px',
      },
    },
    h(
      'div',
      {
        style: {
          fontSize: 44,
          fontWeight: 700,
          color: 'rgba(255, 255, 255, 0.7)',
          textAlign: 'center',
          lineHeight: 1.4,
          marginBottom: 48,
        },
      },
      'Read the full essay',
    ),
    h('div', {
      style: {
        width: 200,
        height: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginBottom: 48,
      },
    }),
    h(
      'div',
      {
        style: {
          fontSize: 36,
          fontWeight: 700,
          color: 'rgba(255, 255, 255, 0.85)',
          textAlign: 'center',
          maxWidth: '85%',
          lineHeight: 1.3,
          marginBottom: 32,
        },
      },
      entry.title,
    ),
    h(
      'div',
      {
        style: {
          fontSize: 40,
          fontWeight: 700,
          color: 'white',
          textAlign: 'center',
        },
      },
      `tantaman.com/${slug}`,
    ),
  );

  return buildSlideWrapper(bgDataUri, totalSlides - 1, totalSlides, content);
}

// --- Rendering ---

async function renderSlide(element, fontData) {
  const svg = await satori(element, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      {
        name: 'Inter',
        data: fontData,
        weight: 700,
        style: 'normal',
      },
    ],
  });
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const flags = process.argv.slice(2).filter((a) => a.startsWith('--'));
  const outputFlag = flags.find((f) => f.startsWith('--output='));

  if (args.length === 0) {
    console.error('Usage: node scripts/generate-ig-carousel.mjs <slug> [--output=dir]');
    process.exit(1);
  }

  const slug = args[0];
  const outputDir = outputFlag
    ? outputFlag.split('=')[1]
    : join(ROOT, 'ig-output', slug);

  // Load data
  const [carouselCache, memeCache, manifest, fontData] = await Promise.all([
    readFile(CAROUSEL_CACHE, 'utf-8').then(JSON.parse).catch(() => ({})),
    readFile(MEME_CACHE, 'utf-8').then(JSON.parse).catch(() => ({})),
    readFile(MANIFEST, 'utf-8').then(JSON.parse).catch(() => []),
    loadFont(),
  ]);

  // Find post
  const entry = manifest.find((p) => p.slug === slug);
  if (!entry) {
    console.error(`Post not found in manifest: ${slug}`);
    console.error('Available slugs:', manifest.slice(0, 10).map((p) => p.slug).join(', '), '...');
    process.exit(1);
  }

  // Get key points
  const points = carouselCache[entry.title];
  if (!points || points.length === 0) {
    console.error(`No carousel points found for "${entry.title}"`);
    console.error('Run: pnpm carousel-points');
    process.exit(1);
  }

  // Add thesis from meme cache if not already on entry
  entry.thesis = entry.thesis || memeCache[entry.title] || null;

  // Cap points so total slides (title + points + CTA) <= MAX_SLIDES
  const maxPoints = MAX_SLIDES - 2;
  const usedPoints = points.slice(0, maxPoints);
  const totalSlides = usedPoints.length + 2;

  console.log(`Generating ${totalSlides} slides for "${entry.title}"...`);

  // Fetch background image
  let bgDataUri = null;
  if (entry.image) {
    const imageUrl = entry.image.startsWith('http')
      ? entry.image
      : `https://tantaman.com${entry.image}`;
    console.log(`  Fetching background image: ${imageUrl}`);
    bgDataUri = await fetchImageAsDataUri(imageUrl);
    if (!bgDataUri) console.log('  Background image skipped (unsupported format or too large)');
  }
  if (!bgDataUri) {
    console.log('  Using gradient fallback background');
  }

  // Create output directory
  await mkdir(outputDir, { recursive: true });

  // Render all slides
  const slides = [];

  // Slide 0: Title
  slides.push({ name: 'slide-0-title', element: buildTitleSlide(entry, bgDataUri, totalSlides) });

  // Slides 1..N: Content
  for (let i = 0; i < usedPoints.length; i++) {
    slides.push({
      name: `slide-${i + 1}-content`,
      element: buildContentSlide(bgDataUri, usedPoints[i], i + 1, totalSlides),
    });
  }

  // Last slide: CTA
  slides.push({
    name: `slide-${totalSlides - 1}-cta`,
    element: buildCtaSlide(entry, bgDataUri, totalSlides),
  });

  for (const slide of slides) {
    const outPath = join(outputDir, `${slide.name}.png`);
    console.log(`  Rendering ${slide.name}...`);
    const png = await renderSlide(slide.element, fontData);
    await writeFile(outPath, png);
  }

  console.log(`\nDone! ${totalSlides} slides written to ${outputDir}/`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
