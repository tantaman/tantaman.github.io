#!/usr/bin/env python3
"""Generate MP3 audio for religion book chapters using Kokoro TTS."""

import argparse
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

# Add scripts dir so we can import from generate-tts
sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module

_tts = import_module("generate-tts")
strip_frontmatter = _tts.strip_frontmatter
strip_markdown = _tts.strip_markdown
chunk_text = _tts.chunk_text

REPO_ROOT = Path(__file__).resolve().parent.parent
BOOK_DIR = REPO_ROOT / "_drafts" / "religion-book"
AUDIO_DIR = BOOK_DIR / "audio"


def find_chapters(chapter_filter: str | None = None) -> list[dict]:
    """Find book chapters, optionally filtered by chapter number."""
    chapters = []
    for path in sorted(BOOK_DIR.glob("chapter-*.md")):
        if chapter_filter and not path.name.startswith(f"chapter-{chapter_filter}"):
            continue
        text = path.read_text(encoding="utf-8")
        content = strip_frontmatter(text)
        chapters.append({
            "path": path,
            "slug": path.stem,
            "content": content,
        })
    return chapters


def generate_audio(chapters: list[dict], *, force: bool, dry_run: bool, voice: str, speed: float):
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    to_generate = []
    for ch in chapters:
        mp3_path = AUDIO_DIR / f"{ch['slug']}.mp3"
        if mp3_path.exists() and not force:
            print(f"  skip (exists): {ch['slug']}")
            continue
        to_generate.append(ch)

    if not to_generate:
        print("Nothing to generate.")
        return

    if dry_run:
        print(f"\nWould generate {len(to_generate)} file(s):")
        for ch in to_generate:
            plain = strip_markdown(ch["content"])
            print(f"  {ch['slug']}  ({len(plain)} chars, ~{len(chunk_text(plain))} chunks)")
        return

    from kokoro import KPipeline

    pipeline = KPipeline(lang_code="a")

    for ch in to_generate:
        plain = strip_markdown(ch["content"])
        chunks = chunk_text(plain)
        print(f"\n  generating: {ch['slug']}  ({len(plain)} chars, {len(chunks)} chunks)")

        all_audio = []
        for i, chunk in enumerate(chunks):
            print(f"    chunk {i + 1}/{len(chunks)}...", end=" ", flush=True)
            for _result in pipeline(chunk, voice=voice, speed=speed):
                if _result.audio is not None:
                    all_audio.append(_result.audio.numpy() if hasattr(_result.audio, "numpy") else np.array(_result.audio))
            print("done")

        if not all_audio:
            print(f"    WARNING: no audio generated for {ch['slug']}")
            continue

        combined = np.concatenate(all_audio)
        mp3_path = AUDIO_DIR / f"{ch['slug']}.mp3"

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

        print(f"    saved: {mp3_path.relative_to(REPO_ROOT)}")


def main():
    parser = argparse.ArgumentParser(description="Generate TTS audio for religion book chapters")
    parser.add_argument("--force", action="store_true", help="Regenerate even if MP3 exists")
    parser.add_argument("--dry-run", action="store_true", help="List chapters without generating")
    parser.add_argument("--voice", default="af_heart", help="Kokoro voice (default: af_heart)")
    parser.add_argument("--speed", type=float, default=1.0, help="Speech speed multiplier")
    parser.add_argument("--chapter", type=str, default=None, help="Generate a single chapter by number (e.g. 01)")
    args = parser.parse_args()

    print("Scanning for book chapters...")
    chapters = find_chapters(args.chapter)
    print(f"Found {len(chapters)} chapter(s).")

    if not chapters:
        return

    for ch in chapters:
        print(f"  {ch['path'].name}  ->  {ch['slug']}.mp3")

    generate_audio(chapters, force=args.force, dry_run=args.dry_run, voice=args.voice, speed=args.speed)


if __name__ == "__main__":
    main()
