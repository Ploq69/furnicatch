#!/usr/bin/env python3
"""
Validation: Floating blocks have 25% letter drop chance, only drop zone's letters.
Ground blocks have 5% letter drop chance.
"""
import sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent / 'voidloop' / 'js'
GAME_FILE = ROOT / 'Game.js'

def main():
    content = GAME_FILE.read_text()
    errors = []

    # Check 25% letter drop for floating blocks
    if "Math.random() < 0.25" not in content:
        errors.append("Missing 25% letter drop chance for floating blocks")

    # Check 5% letter drop for ground blocks
    if "Math.random() < 0.05" not in content:
        errors.append("Missing 5% letter drop chance for ground blocks")

    # Check that letter drops use letterPool.pickRandomLetter (zone-locked)
    if "this.letterPool.pickRandomLetter()" not in content:
        errors.append("Letter drops don't use zone-locked letter pool")

    # Check floating block vs ground block distinction
    if "if (isFloat) {" not in content:
        errors.append("Missing floating block distinction for drops")

    if errors:
        print("FAIL: letter_drops")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("PASS: letter_drops — 25% floating, 5% ground, zone-locked letters")
    return 0

if __name__ == '__main__':
    sys.exit(main())
