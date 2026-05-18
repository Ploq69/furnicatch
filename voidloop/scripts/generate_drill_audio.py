#!/usr/bin/env python3
"""Generate WAV audio files for Voidloop letter drill system using Kokoro TTS."""

import os
import sys
import torch
from kokoro import KPipeline
import soundfile as sf

DEVICE = "mps" if torch.backends.mps.is_available() else "cpu"
VOICE = "af_heart"
SAMPLE_RATE = 24000

BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
DRILL_DIR = os.path.join(BASE_DIR, "audio", "drill")
WORDS_DIR = os.path.join(DRILL_DIR, "words")
PHONEME_DIR = os.path.join(DRILL_DIR, "phoneme")

os.makedirs(DRILL_DIR, exist_ok=True)
os.makedirs(WORDS_DIR, exist_ok=True)
os.makedirs(PHONEME_DIR, exist_ok=True)

# Word lists per letter (mirrors js/DrillWordData.js)
STARTS_WITH_WORDS = {
    'A': ['apple', 'ant', 'arm', 'ask', 'add', 'act', 'aim', 'ape', 'and', 'axe'],
    'B': ['ball', 'bat', 'bed', 'big', 'box', 'bug', 'bag', 'bad', 'bit', 'bus'],
    'C': ['cat', 'car', 'cup', 'cut', 'can', 'cap', 'cot', 'cow', 'cake', 'cold'],
    'D': ['dog', 'duck', 'dig', 'dad', 'den', 'did', 'dot', 'dip', 'doll', 'door'],
    'E': ['egg', 'ear', 'eat', 'end', 'exit', 'edge', 'east', 'easy', 'elbow', 'empty'],
    'F': ['fish', 'fan', 'fat', 'foot', 'fin', 'fit', 'fog', 'fox', 'fun', 'fix'],
    'G': ['goat', 'game', 'gap', 'gas', 'get', 'got', 'gum', 'gun', 'good', 'gift'],
    'H': ['hat', 'hen', 'hog', 'hop', 'hot', 'hug', 'hum', 'hut', 'hay', 'hand'],
    'I': ['ice', 'igloo', 'ill', 'in', 'ink', 'inch', 'is', 'it', 'ivy', 'iron'],
    'J': ['jam', 'jar', 'jaw', 'jet', 'jig', 'job', 'jog', 'joy', 'jug', 'jump'],
    'K': ['kite', 'key', 'kid', 'kick', 'king', 'kiss', 'kit', 'kiwi', 'knee', 'knife'],
    'L': ['lion', 'lamp', 'leaf', 'leg', 'let', 'lid', 'lip', 'log', 'lot', 'lake'],
    'M': ['monkey', 'moon', 'mouse', 'man', 'map', 'mat', 'mix', 'mom', 'mop', 'mud'],
    'N': ['nest', 'nose', 'nut', 'nap', 'net', 'new', 'nod', 'not', 'now', 'nun'],
    'O': ['octopus', 'orange', 'owl', 'off', 'oil', 'old', 'on', 'one', 'out', 'open'],
    'P': ['pig', 'pen', 'pan', 'pat', 'paw', 'pet', 'pin', 'pit', 'pop', 'pot'],
    'Q': ['queen', 'quilt', 'quiet', 'quack', 'quail', 'quick', 'quit', 'quiz', 'quill', 'quest'],
    'R': ['rabbit', 'rainbow', 'rose', 'rag', 'ram', 'rat', 'red', 'run', 'rock', 'road'],
    'S': ['sun', 'snake', 'sock', 'sad', 'sat', 'saw', 'sit', 'sand', 'seal', 'soap'],
    'T': ['tiger', 'table', 'tree', 'tag', 'tan', 'tap', 'ten', 'tin', 'tip', 'top'],
    'U': ['umbrella', 'unicorn', 'up', 'under', 'unit', 'upon', 'use', 'ugly', 'uncle', 'uniform'],
    'V': ['violin', 'van', 'vase', 'vet', 'very', 'view', 'vine', 'vast', 'vote', 'vest'],
    'W': ['whale', 'worm', 'window', 'wag', 'wax', 'web', 'wet', 'wig', 'win', 'wish'],
    'Y': ['yellow', 'yarn', 'yak', 'yard', 'yam', 'yell', 'yes', 'yet', 'you', 'young'],
}

CONTAINS_WORDS = {
    'X': ['box', 'fox', 'six', 'ax', 'ox', 'taxi', 'exit', 'next', 'text', 'mix'],
    'Z': ['zebra', 'zoo', 'zero', 'zap', 'zip', 'zone', 'zoom', 'zigzag', 'zest', 'zany'],
}

LETTER_QUIZ_MODE = {
    'X': 'contains',
    'Z': 'contains',
}

LETTER_CHOICE_DIR = os.path.join(DRILL_DIR, "letter_choice")
os.makedirs(LETTER_CHOICE_DIR, exist_ok=True)


def safe_filename(text):
    return text.lower().replace(" ", "_").replace("-", "_")


def generate_audio(pipeline, text, out_path):
    generator = pipeline(text, voice=VOICE)
    for _, _, audio in generator:
        sf.write(out_path, audio, SAMPLE_RATE)
        break
    print(f"  ✓ {out_path}")


def generate_question_prompts(pipeline):
    print("\n=== Question Prompts ===")
    generated = 0
    skipped = 0
    for letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
        mode = LETTER_QUIZ_MODE.get(letter, 'starts_with')
        # starts_with prompt
        if mode == 'starts_with':
            text = f"Which word starts with the letter {letter}."
            out = os.path.join(DRILL_DIR, f"q_starts_with_{letter}.wav")
        else:
            text = f"What word has the letter {letter} in it."
            out = os.path.join(DRILL_DIR, f"q_contains_{letter}.wav")
        if os.path.exists(out):
            skipped += 1
        else:
            generate_audio(pipeline, text, out)
            generated += 1

    # identify_letter prompt (one global file)
    out_identify = os.path.join(DRILL_DIR, "q_identify_letter.wav")
    if os.path.exists(out_identify):
        skipped += 1
    else:
        generate_audio(pipeline, "What letter is this.", out_identify)
        generated += 1
    print(f"Prompts: {generated} generated, {skipped} skipped")
    return generated, skipped


def generate_word_audio(pipeline):
    print("\n=== Word Audio ===")
    generated = 0
    skipped = 0
    all_words = {}
    for letter, words in STARTS_WITH_WORDS.items():
        all_words[letter] = words
    for letter, words in CONTAINS_WORDS.items():
        all_words[letter] = words

    for letter, words in all_words.items():
        letter_dir = os.path.join(WORDS_DIR, letter)
        os.makedirs(letter_dir, exist_ok=True)
        for word in words:
            out = os.path.join(letter_dir, f"{safe_filename(word)}.wav")
            if os.path.exists(out):
                skipped += 1
            else:
                generate_audio(pipeline, f"{word}.", out)
                generated += 1
    print(f"Words: {generated} generated, {skipped} skipped")
    return generated, skipped


def generate_letter_choice_audio(pipeline):
    print("\n=== Letter Choice Audio ===")
    generated = 0
    skipped = 0
    for letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
        out = os.path.join(LETTER_CHOICE_DIR, f"{letter}.wav")
        if os.path.exists(out):
            skipped += 1
        else:
            generate_audio(pipeline, f"Letter {letter}.", out)
            generated += 1
    print(f"Letter choices: {generated} generated, {skipped} skipped")
    return generated, skipped


def main():
    print(f"Initializing Kokoro on device: {DEVICE}")
    pipeline = KPipeline(lang_code='a', device=DEVICE)
    print(f"Using voice: {VOICE}")
    print(f"Output directory: {DRILL_DIR}")

    total_gen = 0
    total_skip = 0

    g, s = generate_question_prompts(pipeline)
    total_gen += g
    total_skip += s

    g, s = generate_word_audio(pipeline)
    total_gen += g
    total_skip += s

    g, s = generate_letter_choice_audio(pipeline)
    total_gen += g
    total_skip += s

    print(f"\n🎉 Done! Generated {total_gen} new files, skipped {total_skip} existing.")
    print(f"   Total: {total_gen + total_skip} audio files in {DRILL_DIR}")


if __name__ == "__main__":
    main()
