#!/usr/bin/env python3
"""Generate singular word audio for col05 Irregular Plurals using Kokoro TTS."""

import os
import torch
from kokoro import KPipeline
import soundfile as sf

DEVICE = "mps" if torch.backends.mps.is_available() else "cpu"
VOICE = "af_heart"
SAMPLE_RATE = 24000

SINGULAR_WORDS = [
    ("child", "children"),
    ("mouse", "mice"),
    ("watch", "watches"),
    ("roof", "roofs"),
    ("person", "people"),
    ("tooth", "teeth"),
    ("fish", "fish"),
    ("foot", "feet"),
    ("leaf", "leaves"),
    ("man", "men"),
]

print(f"Initializing Kokoro on device: {DEVICE}")
pipeline = KPipeline(lang_code='a', device=DEVICE)
print(f"Using voice: {VOICE}\n")

cat_dir = os.path.join("audio", "col05")
os.makedirs(cat_dir, exist_ok=True)

for singular, plural in SINGULAR_WORDS:
    out_path = os.path.join(cat_dir, f"{singular}_en_singular.mp3")
    if os.path.exists(out_path):
        print(f"  ✓ (exists) {out_path}")
        continue
    generator = pipeline(singular, voice=VOICE)
    for _, _, audio in generator:
        sf.write(out_path, audio, SAMPLE_RATE)
        break
    print(f"  ✓ {out_path}")

print("\n🎉 Singular audio files generated!")
