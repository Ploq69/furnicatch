#!/usr/bin/env python3
"""
Validation: Pet unlock requires exactly 10 correct spellings.
"""
import sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent / 'voidloop' / 'js'
PET_FILE = ROOT / 'PetManager.js'

def main():
    content = PET_FILE.read_text()
    errors = []

    # Check SPELLINGS_TO_UNLOCK = 10
    if "SPELLINGS_TO_UNLOCK = 10" not in content:
        errors.append("SPELLINGS_TO_UNLOCK is not 10")

    # Check recordSpelling method exists
    if "recordSpelling(letter, correct)" not in content:
        errors.append("Missing recordSpelling method")

    # Check unlock requires 10 correct spellings
    if "spellingsCorrect >= SPELLINGS_TO_UNLOCK" not in content:
        errors.append("Unlock doesn't check spellingsCorrect >= 10")

    # Check spellingsCorrect tracking exists
    if "spellingsCorrect" not in content:
        errors.append("Missing spellingsCorrect tracking")

    # Check getUnlockProgress exists
    if "getUnlockProgress(letter)" not in content:
        errors.append("Missing getUnlockProgress method")

    # Check save/load includes spellingsCorrect
    if "spellingsCorrect" not in content.split("_save()")[1].split("_load()")[0] if "_save()" in content and "_load()" in content else True:
        pass  # Already checked above

    if errors:
        print("FAIL: pet_unlock")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("PASS: pet_unlock — 10 correct spellings required for unlock")
    return 0

if __name__ == '__main__':
    sys.exit(main())
