#!/usr/bin/env python3
"""Generate Thai quiz WAVs with local OmniVoice.

Usage:
  /path/to/omnivoice/python thai-letter-miner/scripts/generate_omnivoice_audio.py
"""
import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "js" / "thaiManifest.js"
OUT = ROOT / "assets" / "audio" / "thai"


def parse_manifest():
    text = MANIFEST.read_text(encoding="utf-8")
    items = []
    for body in re.findall(r"\{([^{}]+)\}", text, re.S):
        id_match = re.search(r"id:\s*'([^']+)'", body)
        text_match = re.search(r"audioText:\s*'([^']+)'", body)
        if id_match and text_match:
            items.append((id_match.group(1), text_match.group(1)))
    return items


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--voice", default="male", help="OmniVoice instruct prompt")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    import soundfile as sf
    import torch
    from omnivoice import OmniVoice

    OUT.mkdir(parents=True, exist_ok=True)
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Loading OmniVoice on {device}...")
    model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map=device, dtype=torch.float32)

    for item_id, audio_text in parse_manifest():
      path = OUT / f"{item_id}.wav"
      if path.exists() and not args.force:
        print(f"skip {item_id}")
        continue
      print(f"generate {item_id}: {audio_text}")
      audio = model.generate(text=audio_text, instruct=args.voice)
      sf.write(path, audio[0], 24000)
    print("done")


if __name__ == "__main__":
    main()
