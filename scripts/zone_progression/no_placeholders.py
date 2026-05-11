#!/usr/bin/env python3
"""
Validation: No TODO, FIXME, or placeholder strings in modified files.
"""
import sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent / 'voidloop' / 'js'
MODIFIED_FILES = [
    'constants.js',
    'ZoneData.js',
    'ShopManager.js',
    'PetManager.js',
    'Player.js',
    'Game.js',
    'World.js',
    'ResourceInventory.js',
]

PLACEHOLDER_PATTERNS = ['TODO', 'FIXME', 'HACK', 'XXX', 'placeholder', 'PLACEHOLDER']

def main():
    errors = []

    for filename in MODIFIED_FILES:
        filepath = ROOT / filename
        if not filepath.exists():
            errors.append(f"File not found: {filename}")
            continue
        content = filepath.read_text()
        lines = content.split('\n')
        for i, line in enumerate(lines, 1):
            for pattern in PLACEHOLDER_PATTERNS:
                if pattern in line:
                    # Allow patterns in comments if they are just describing the code
                    # But flag actual TODOs/FIXMEs
                    stripped = line.strip()
                    if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
                        if pattern in ('TODO', 'FIXME', 'HACK', 'XXX'):
                            errors.append(f"{filename}:{i}: {stripped[:80]}")
                    else:
                        errors.append(f"{filename}:{i}: {stripped[:80]}")

    if errors:
        print("FAIL: no_placeholders")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("PASS: no_placeholders — no TODO/FIXME/placeholder strings found")
    return 0

if __name__ == '__main__':
    sys.exit(main())
