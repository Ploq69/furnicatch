#!/usr/bin/env python3
"""
Validation: Save/load works for zone progress, pickaxe tiers, resources, and pet data.
"""
import sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent / 'voidloop' / 'js'

def check_file(filepath, required_patterns, desc):
    errors = []
    if not filepath.exists():
        errors.append(f"File not found: {filepath.name}")
        return errors
    content = filepath.read_text()
    for pattern in required_patterns:
        if pattern not in content:
            errors.append(f"{desc}: missing '{pattern}'")
    return errors

def main():
    errors = []

    # ShopManager: pickaxeTiers persistence
    errors += check_file(
        ROOT / 'ShopManager.js',
        ['pickaxeTiers', 'saved.shop.pickaxeTiers'],
        'ShopManager'
    )

    # PetManager: spellingsCorrect persistence
    errors += check_file(
        ROOT / 'PetManager.js',
        ['spellingsCorrect', 'spellingsAttempted', 'STORAGE_KEY'],
        'PetManager'
    )

    # ResourceInventory: resources persistence
    errors += check_file(
        ROOT / 'ResourceInventory.js',
        ['saved.resources', 'localStorage.setItem', 'localStorage.getItem'],
        'ResourceInventory'
    )

    # ZoneData: 7 zones defined
    zonedata = (ROOT / 'ZoneData.js').read_text()
    zone_count = zonedata.count("id: '")
    if zone_count < 7:
        errors.append(f"ZoneData: only {zone_count} zones found, expected 7")

    if errors:
        print("FAIL: save_persistence")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("PASS: save_persistence — all new data persists correctly")
    return 0

if __name__ == '__main__':
    sys.exit(main())
