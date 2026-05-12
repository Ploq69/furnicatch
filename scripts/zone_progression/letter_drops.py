#!/usr/bin/env python3
"""
Validation: Floating blocks have 25% letter drop chance, only drop zone's letters.
Ground blocks are visual terrain and must not drop letters.
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

    # Check no old 5% ground block drop remains.
    if "Math.random() < 0.05" not in content:
        pass
    else:
        errors.append("Ground blocks must not drop letters; progression mining is floating-block only")

    if "_pickLetterForZone" not in content:
        errors.append("Letter drops must select from the mined block/current zone")

    # Check floating block vs ground block distinction
    if "if (isFloat) {" not in content:
        errors.append("Missing floating block distinction for drops")

    if errors:
        print("FAIL: letter_drops")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("PASS: letter_drops — 25% floating-only, zone-locked letters")
    return 0

if __name__ == '__main__':
    sys.exit(main())
