#!/usr/bin/env python3
"""Generate WAV audio files for Voidloop spelling words using Kokoro TTS."""

import os
import sys
import torch
from kokoro import KPipeline
import soundfile as sf

DEVICE = "mps" if torch.backends.mps.is_available() else "cpu"
VOICE = "af_heart"
SAMPLE_RATE = 24000

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "audio", "spelling")
os.makedirs(OUTPUT_DIR, exist_ok=True)

WORDS = [
    # A
    "apple", "ant", "ax", "arm", "add", "ask", "act", "aim", "ape", "and", "ate", "ace",
    # B
    "ball", "bat", "bed", "big", "box", "bug", "bag", "bad", "bit", "bus", "bun", "boy",
    # C
    "cat", "car", "cup", "cut", "can", "cap", "cot", "cow", "cob", "corn", "cake", "cold",
    # D
    "dog", "duck", "dig", "dad", "den", "did", "dot", "dip", "doll", "door", "dark", "desk",
    # E
    "egg", "ear", "eat", "end", "exit", "edge", "east", "easy", "elbow", "elephant", "empty", "enter",
    # F
    "fish", "fan", "fat", "foot", "fin", "fit", "fog", "fox", "fun", "fix", "far", "fall",
    # G
    "goat", "game", "gap", "gas", "get", "got", "gum", "gun", "gone", "good", "gold", "gift",
    # H
    "hat", "hen", "hog", "hop", "hot", "hug", "hum", "hut", "hay", "had", "hit", "hand",
    # I
    "ice", "igloo", "ill", "in", "ink", "inch", "is", "it", "if", "ivy", "iron", "idea",
    # J
    "jam", "jar", "jaw", "jet", "jig", "job", "jog", "joy", "jug", "jump", "just", "jeep",
    # K
    "kite", "key", "kid", "kick", "king", "kiss", "kit", "kiwi", "knee", "knife", "kangaroo", "kitchen",
    # L
    "lion", "lamp", "leaf", "leg", "let", "lid", "lip", "log", "lot", "low", "lake", "land",
    # M
    "monkey", "moon", "mouse", "man", "map", "mat", "mix", "mom", "mop", "mud", "milk", "mail",
    # N
    "nest", "nose", "nut", "nap", "net", "new", "nod", "not", "now", "nun", "nail", "neck",
    # O
    "octopus", "orange", "owl", "odd", "off", "oil", "old", "on", "one", "out", "open", "over",
    # P
    "pig", "pen", "pan", "pat", "paw", "pet", "pin", "pit", "pop", "pot", "pup", "park",
    # Q
    "queen", "quilt", "quiet", "quack", "quail", "quick", "quit", "quiz", "quill", "quote", "quest", "question",
    # R
    "rabbit", "rainbow", "rose", "rag", "ram", "rat", "red", "rid", "rip", "run", "rock", "road",
    # S
    "sun", "snake", "sock", "sad", "sat", "saw", "sit", "sob", "sip", "sand", "seal", "soap",
    # T
    "tiger", "table", "tree", "tag", "tan", "tap", "ten", "tin", "tip", "top", "tent", "tail",
    # U
    "umbrella", "unicorn", "up", "under", "unit", "upon", "upset", "use", "us", "ugly", "uncle", "uniform",
    # V
    "violin", "van", "vase", "vet", "very", "view", "vine", "vast", "vote", "vest", "voice", "visit",
    # W
    "whale", "worm", "window", "wag", "wax", "web", "wet", "wig", "win", "wish", "wind", "wolf",
    # X
    "box", "fox", "six", "ax", "ox", "taxi", "exit", "next", "text", "mix", "fix", "xray",
    # Y
    "yellow", "yarn", "yo-yo", "yak", "yard", "yam", "yell", "yes", "yet", "you", "young", "yawn",
    # Z
    "zebra", "zoo", "zero", "zap", "zip", "zone", "zoom", "zigzag", "zest", "zzz", "zipper", "zany",
]


def safe_filename(word):
    return word.lower().replace(" ", "_").replace("-", "_")


def generate_audio(pipeline, text, out_path):
    generator = pipeline(text, voice=VOICE)
    for _, _, audio in generator:
        sf.write(out_path, audio, SAMPLE_RATE)
        break
    print(f"  ✓ {out_path}")


def main():
    print(f"Initializing Kokoro on device: {DEVICE}")
    pipeline = KPipeline(lang_code='a', device=DEVICE)
    print(f"Using voice: {VOICE}")
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Total words: {len(WORDS)}\n")

    generated = 0
    skipped = 0

    for word in WORDS:
        base = safe_filename(word)
        out_path = os.path.join(OUTPUT_DIR, f"{base}_en_word.wav")

        if os.path.exists(out_path):
            print(f"  ✓ (exists) {out_path}")
            skipped += 1
            continue

        generate_audio(pipeline, f"How do you spell {word}?", out_path)
        generated += 1

    print(f"\n🎉 Done! Generated {generated} new files, skipped {skipped} existing files.")
    print(f"   Total: {generated + skipped} audio files in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
