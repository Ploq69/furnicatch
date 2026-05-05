#!/usr/bin/env python3
"""Generate cached Kokoro TTS WAV files for FurniCatch vocabulary."""
from __future__ import annotations

import argparse
import re
from pathlib import Path


def read_words(constants_path: Path) -> list[str]:
    text = constants_path.read_text(encoding="utf-8")
    words = set(re.findall(r"word:\s*'([^']+)'", text))
    letter_block = re.search(r"export const LETTER_WORDS\s*=\s*\{(.*?)\n\};", text, re.S)
    if letter_block:
        words.update(re.findall(r"'([a-zA-Z][a-zA-Z-]*)'", letter_block.group(1)))
    return sorted(words)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate FurniCatch Kokoro TTS files.")
    parser.add_argument("--voice", default="af_heart", help="Kokoro voice name.")
    parser.add_argument("--out", default="audio/tts", help="Output directory for WAV files.")
    parser.add_argument("--constants", default="js/constants.js", help="Path to constants.js.")
    parser.add_argument("--force", action="store_true", help="Regenerate existing files.")
    args = parser.parse_args()

    try:
        import torch
        import soundfile as sf
        from kokoro import KPipeline
    except Exception as exc:
      print("Kokoro TTS dependencies are not importable in this Python environment.")
      print("Expected packages: kokoro, torch, soundfile")
      print(f"Import error: {exc}")
      return 1

    root = Path.cwd()
    words = read_words(root / args.constants)
    out_dir = root / args.out
    out_dir.mkdir(parents=True, exist_ok=True)

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Using Kokoro on {device} with voice {args.voice}")
    pipeline = KPipeline(lang_code="a", device=device)

    for word in words:
        output_path = out_dir / f"{word}.wav"
        if output_path.exists() and not args.force:
            print(f"skip {word}: {output_path}")
            continue
        generator = pipeline(word, voice=args.voice)
        for _, _, audio in generator:
            sf.write(output_path, audio, 24000)
            print(f"wrote {word}: {output_path}")
            break

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
