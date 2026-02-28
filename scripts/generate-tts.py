#!/usr/bin/env python3
"""Generate MP3 audio for blog posts with `audio: true` frontmatter using Kokoro TTS."""

import argparse
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

CONTENT_DIR = Path(__file__).resolve().parent.parent / "content"
DOCS_DIR = Path(__file__).resolve().parent.parent / "docs"
AUDIO_DIR = DOCS_DIR / "audio"
COLLECTIONS = ["", "the-mirror-room/", "chats/", "notes/"]
SKIP_FILES = {"index.js", "index.md", "README.md", "404.md", "tags.js", "audio.md", "scratch.md"}


def parse_frontmatter(text: str) -> dict | None:
    m = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
    if not m:
        return None
    fm = {}
    for line in m.group(1).splitlines():
        kv = line.split(":", 1)
        if len(kv) == 2:
            key = kv[0].strip()
            val = kv[1].strip()
            if val.lower() == "true":
                val = True
            elif val.lower() == "false":
                val = False
            fm[key] = val
    return fm


def strip_frontmatter(text: str) -> str:
    return re.sub(r"^---\n.*?\n---\n", "", text, count=1, flags=re.DOTALL)


def strip_markdown(text: str) -> str:
    """Strip markdown to plain text suitable for TTS."""
    # Remove MDX imports and JSX components
    text = re.sub(r"^import\s+.*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"<[A-Z][^>]*>.*?</[A-Z][^>]*>", "", text, flags=re.DOTALL)
    text = re.sub(r"<[A-Z][^>]*/\s*>", "", text)

    # Remove fenced code blocks
    text = re.sub(r"```[\s\S]*?```", "", text)
    # Remove inline code
    text = re.sub(r"`[^`]+`", "", text)

    # Remove images
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", text)

    # Convert wiki links [[page]] or [[page|text]] to text
    text = re.sub(r"\[\[([^|\]]*\|)?([^\]]+)\]\]", r"\2", text)
    # Convert markdown links [text](url) to text
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)

    # Remove HTML tags
    text = re.sub(r"<[^>]+>", "", text)

    # Remove tables (lines starting with |)
    text = re.sub(r"^\|.*$", "", text, flags=re.MULTILINE)

    # Remove heading markers but keep text
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)

    # Remove blockquote markers but keep text
    text = re.sub(r"^>\s?", "", text, flags=re.MULTILINE)

    # Remove bold/italic markers
    text = re.sub(r"\*{1,3}([^*]+)\*{1,3}", r"\1", text)
    text = re.sub(r"_{1,3}([^_]+)_{1,3}", r"\1", text)

    # Remove horizontal rules
    text = re.sub(r"^[-*_]{3,}\s*$", "", text, flags=re.MULTILINE)

    # Remove footnote definitions
    text = re.sub(r"^\[\^[^\]]+\]:.*$", "", text, flags=re.MULTILINE)
    # Remove footnote references
    text = re.sub(r"\[\^[^\]]+\]", "", text)

    # Collapse multiple blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def chunk_text(text: str, max_chars: int = 4000) -> list[str]:
    """Split text at paragraph/sentence boundaries."""
    paragraphs = text.split("\n\n")
    chunks = []
    current = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        if len(current) + len(para) + 2 <= max_chars:
            current = current + "\n\n" + para if current else para
        else:
            if current:
                chunks.append(current)
            # If a single paragraph exceeds max_chars, split by sentence
            if len(para) > max_chars:
                sentences = re.split(r"(?<=[.!?])\s+", para)
                current = ""
                for sent in sentences:
                    if len(current) + len(sent) + 1 <= max_chars:
                        current = current + " " + sent if current else sent
                    else:
                        if current:
                            chunks.append(current)
                        current = sent
            else:
                current = para

    if current:
        chunks.append(current)
    return chunks


def find_audio_posts() -> list[dict]:
    """Find all posts with audio: true in frontmatter."""
    posts = []
    for collection in COLLECTIONS:
        content_path = CONTENT_DIR / collection
        if not content_path.is_dir():
            continue
        for entry in sorted(content_path.iterdir()):
            if entry.suffix not in (".md", ".mdx"):
                continue
            if entry.name in SKIP_FILES:
                continue
            text = entry.read_text(encoding="utf-8")
            fm = parse_frontmatter(text)
            if fm and fm.get("audio") is True:
                slug = entry.stem
                posts.append({
                    "path": entry,
                    "slug": slug,
                    "collection": collection,
                    "title": fm.get("title", slug),
                    "content": strip_frontmatter(text),
                })
    return posts


def generate_audio(posts: list[dict], *, force: bool, dry_run: bool, voice: str, speed: float):
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    to_generate = []
    for post in posts:
        mp3_path = AUDIO_DIR / f"{post['slug']}.mp3"
        if mp3_path.exists() and not force:
            print(f"  skip (exists): {post['slug']}")
            continue
        to_generate.append(post)

    if not to_generate:
        print("Nothing to generate.")
        return

    if dry_run:
        print(f"\nWould generate {len(to_generate)} file(s):")
        for post in to_generate:
            plain = strip_markdown(post["content"])
            print(f"  {post['slug']}  ({len(plain)} chars, ~{len(chunk_text(plain))} chunks)")
        return

    # Lazy import so --dry-run works without kokoro installed
    from kokoro import KPipeline

    pipeline = KPipeline(lang_code="a")

    for post in to_generate:
        plain = strip_markdown(post["content"])
        chunks = chunk_text(plain)
        print(f"\n  generating: {post['slug']}  ({len(plain)} chars, {len(chunks)} chunks)")

        all_audio = []
        for i, chunk in enumerate(chunks):
            print(f"    chunk {i + 1}/{len(chunks)}...", end=" ", flush=True)
            for _result in pipeline(chunk, voice=voice, speed=speed):
                if _result.audio is not None:
                    all_audio.append(_result.audio.numpy() if hasattr(_result.audio, "numpy") else np.array(_result.audio))
            print("done")

        if not all_audio:
            print(f"    WARNING: no audio generated for {post['slug']}")
            continue

        combined = np.concatenate(all_audio)
        mp3_path = AUDIO_DIR / f"{post['slug']}.mp3"

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_wav = tmp.name
        try:
            sf.write(tmp_wav, combined, 24000)
            subprocess.run(
                ["ffmpeg", "-y", "-i", tmp_wav, "-b:a", "128k", str(mp3_path)],
                check=True,
                capture_output=True,
            )
        finally:
            os.unlink(tmp_wav)

        print(f"    saved: {mp3_path.relative_to(DOCS_DIR.parent)}")


def main():
    parser = argparse.ArgumentParser(description="Generate TTS audio for blog posts")
    parser.add_argument("--force", action="store_true", help="Regenerate even if MP3 exists")
    parser.add_argument("--dry-run", action="store_true", help="List posts without generating")
    parser.add_argument("--voice", default="af_heart", help="Kokoro voice (default: af_heart)")
    parser.add_argument("--speed", type=float, default=1.0, help="Speech speed multiplier")
    args = parser.parse_args()

    print("Scanning for posts with audio: true...")
    posts = find_audio_posts()
    print(f"Found {len(posts)} post(s) with audio enabled.")

    if not posts:
        return

    for post in posts:
        print(f"  {post['collection']}{post['path'].name}  →  {post['slug']}.mp3")

    generate_audio(posts, force=args.force, dry_run=args.dry_run, voice=args.voice, speed=args.speed)


if __name__ == "__main__":
    main()
