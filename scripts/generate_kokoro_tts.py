#!/usr/bin/env python3
"""Generate cached Kokoro TTS WAV files for FurniCatch vocabulary."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import numpy as np


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
    parser.add_argument("--device", default="cpu", help="Torch device (cpu or mps).")
    parser.add_argument("--words", default="", help="Comma-separated list of specific words to generate.")
    parser.add_argument("--manifest", default="scripts/tts_manifest.json", help="Manifest for word list.")
    args = parser.parse_args()

    try:
        import soundfile as sf
        import torch
        from kokoro import KPipeline
    except Exception as exc:
        print("Kokoro TTS dependencies are not importable in this Python environment.")
        print("Expected packages: kokoro, torch, soundfile")
        print(f"Import error: {exc}")
        return 1

    root = Path.cwd()

    # Build word list
    if args.words:
        words = [w.strip().lower() for w in args.words.split(",") if w.strip()]
    elif Path(args.manifest).exists():
        manifest = json.loads(Path(args.manifest).read_text())
        words = sorted(manifest.keys())
    else:
        words = read_words(root / args.constants)

    out_dir = root / args.out
    out_dir.mkdir(parents=True, exist_ok=True)

    # Force CPU by default to avoid MPS quality degradation
    device = args.device
    if device == "mps" and not torch.backends.mps.is_available():
        print("MPS not available, falling back to CPU")
        device = "cpu"

    print(f"Using Kokoro on {device} with voice {args.voice}")
    pipeline = KPipeline(lang_code="a", device=device)

    # Validate voice exists
    try:
        pipeline.load_voice(args.voice)
        print(f"Voice '{args.voice}' loaded successfully")
    except Exception as exc:
        available = list(pipeline.voices.keys()) if hasattr(pipeline, "voices") else "unknown"
        print(f"ERROR: Failed to load voice '{args.voice}': {exc}")
        print(f"Available voices: {available}")
        return 1

    generated = 0
    skipped = 0
    failed = 0

    for word in words:
        output_path = out_dir / f"{word}.wav"
        if output_path.exists() and not args.force:
            skipped += 1
            continue

        try:
            generator = pipeline(word, voice=args.voice)
            for _, _, audio in generator:
                # CRITICAL: Convert torch tensor to numpy before writing
                if hasattr(audio, "numpy"):
                    audio_np = audio.numpy()
                else:
                    audio_np = np.array(audio)

                # Ensure float32 1D array
                audio_np = np.asarray(audio_np, dtype=np.float32).squeeze()
                if audio_np.ndim != 1:
                    audio_np = audio_np.flatten()

                sf.write(output_path, audio_np, 24000)
                generated += 1
                print(f"wrote {word}: {output_path}")
                break
        except Exception as exc:
            failed += 1
            print(f"FAILED {word}: {exc}")

    print(f"\nDone. Generated: {generated}, Skipped: {skipped}, Failed: {failed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
