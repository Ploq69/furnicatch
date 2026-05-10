#!/usr/bin/env python3
"""Generate all audio files for the Grade 3 Spelling Game using Kokoro TTS."""

import os
import torch
from kokoro import KPipeline
import soundfile as sf

DEVICE = "mps" if torch.backends.mps.is_available() else "cpu"
VOICE = "af_heart"
SAMPLE_RATE = 24000

CATEGORIES = [
    {
        "id": "col01",
        "title": "Suffixes –ment and –ness",
        "words": [
            {"word": "enjoyment", "def": "Enjoyment. The state of feeling great pleasure."},
            {"word": "amazement", "def": "Amazement. A feeling of great surprise."},
            {"word": "illness", "def": "Illness. The state of being sick."},
            {"word": "kindness", "def": "Kindness. The quality of being friendly and caring."},
            {"word": "argument", "def": "Argument. A disagreement between people."},
            {"word": "excitement", "def": "Excitement. A feeling of eager enthusiasm."},
            {"word": "measurement", "def": "Measurement. The size or amount of something."},
            {"word": "foolishness", "def": "Foolishness. A lack of good sense."},
            {"word": "entertainment", "def": "Entertainment. Something that provides amusement."},
            {"word": "happiness", "def": "Happiness. The state of feeling great pleasure."},
        ]
    },
    {
        "id": "col02",
        "title": "Suffixes –ful and –less",
        "words": [
            {"word": "fearless", "def": "Fearless. Without fear; brave."},
            {"word": "beautiful", "def": "Beautiful. Pleasing to look at."},
            {"word": "careless", "def": "Careless. Not giving enough attention."},
            {"word": "thankful", "def": "Thankful. Feeling grateful."},
            {"word": "sleepless", "def": "Sleepless. Without sleep."},
            {"word": "powerful", "def": "Powerful. Having great strength."},
            {"word": "harmless", "def": "Harmless. Not able to cause harm."},
            {"word": "dreadful", "def": "Dreadful. Very bad or unpleasant."},
            {"word": "useless", "def": "Useless. Not able to be used."},
            {"word": "painful", "def": "Painful. Causing physical or emotional pain."},
        ]
    },
    {
        "id": "col03",
        "title": "Suffixes –ous and –ly",
        "words": [
            {"word": "brightly", "def": "Brightly. In a bright way."},
            {"word": "enormous", "def": "Enormous. Extremely large."},
            {"word": "curious", "def": "Curious. Eager to learn or know."},
            {"word": "quietly", "def": "Quietly. In a quiet manner."},
            {"word": "dangerous", "def": "Dangerous. Able to cause harm."},
            {"word": "bravely", "def": "Bravely. In a brave way."},
            {"word": "famous", "def": "Famous. Known by many people."},
            {"word": "angrily", "def": "Angrily. In an angry manner."},
            {"word": "happily", "def": "Happily. In a happy way."},
            {"word": "mostly", "def": "Mostly. For the most part."},
        ]
    },
    {
        "id": "col04",
        "title": "Prefixes un–, dis–, and mis–",
        "words": [
            {"word": "dismiss", "def": "Dismiss. To send away or remove from a job."},
            {"word": "disobey", "def": "Disobey. To refuse to follow rules."},
            {"word": "misfortune", "def": "Misfortune. Bad luck."},
            {"word": "unfair", "def": "Unfair. Not fair or just."},
            {"word": "unhappy", "def": "Unhappy. Not happy; sad."},
            {"word": "dishonest", "def": "Dishonest. Not truthful."},
            {"word": "dislike", "def": "Dislike. To not like something."},
            {"word": "unnecessary", "def": "Unnecessary. Not needed."},
            {"word": "unusual", "def": "Unusual. Not common or ordinary."},
            {"word": "mismanage", "def": "Mismanage. To manage badly."},
        ]
    },
    {
        "id": "col05",
        "title": "Irregular Plurals",
        "words": [
            {"word": "children", "singular": "child", "def": "Children. More than one young person."},
            {"word": "mice", "singular": "mouse", "def": "Mice. More than one small rodent."},
            {"word": "watches", "singular": "watch", "def": "Watches. More than one timepiece."},
            {"word": "roofs", "singular": "roof", "def": "Roofs. More than one top of a building."},
            {"word": "people", "singular": "person", "def": "People. More than one human being."},
            {"word": "teeth", "singular": "tooth", "def": "Teeth. More than one tooth."},
            {"word": "fish", "singular": "fish", "def": "Fish. More than one fish."},
            {"word": "feet", "singular": "foot", "def": "Feet. More than one foot."},
            {"word": "leaves", "singular": "leaf", "def": "Leaves. More than one leaf."},
            {"word": "men", "singular": "man", "def": "Men. More than one adult male."},
        ]
    },
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
    print(f"Using voice: {VOICE}\n")

    for cat in CATEGORIES:
        cat_dir = os.path.join("audio", cat["id"])
        os.makedirs(cat_dir, exist_ok=True)
        print(f"\n[{cat['title']}]")

        for w in cat["words"]:
            word = w["word"]
            base = safe_filename(word)

            if "singular" in w:
                singular = w["singular"]
                prompt_text = f"The plural of {singular} is... {word}."
                prompt_path = os.path.join(cat_dir, f"{base}_en_prompt.mp3")
                if not os.path.exists(prompt_path):
                    generate_audio(pipeline, prompt_text, prompt_path)
                else:
                    print(f"  ✓ (exists) {prompt_path}")

                plural_path = os.path.join(cat_dir, f"{base}_en_plural.mp3")
                if not os.path.exists(plural_path):
                    generate_audio(pipeline, word, plural_path)
                else:
                    print(f"  ✓ (exists) {plural_path}")
            else:
                word_path = os.path.join(cat_dir, f"{base}_en_word.mp3")
                if not os.path.exists(word_path):
                    generate_audio(pipeline, word, word_path)
                else:
                    print(f"  ✓ (exists) {word_path}")

            def_path = os.path.join(cat_dir, f"{base}_en_def.mp3")
            if not os.path.exists(def_path):
                generate_audio(pipeline, w["def"], def_path)
            else:
                print(f"  ✓ (exists) {def_path}")

    print("\n🎉 All audio files generated!")


if __name__ == "__main__":
    main()
