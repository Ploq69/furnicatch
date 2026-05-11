#!/usr/bin/env python3
"""
Validation: All 7 zones exist in ZoneData.js with correct letters, bounds, fog colors.
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent / 'voidloop' / 'js'
ZONES_FILE = ROOT / 'ZoneData.js'

EXPECTED_ZONES = [
    {'id': 'forest',    'name': 'Whispering Forest', 'letters': ['A','B','C','D'], 'fogColor': '0x87ceeb'},
    {'id': 'fire',      'name': 'Ember Wastes',      'letters': ['E','F','G','H'], 'fogColor': '0x2a1a1a'},
    {'id': 'ice',       'name': 'Frostpeak',         'letters': ['I','J','K','L'], 'fogColor': '0xaaddff'},
    {'id': 'desert',    'name': 'Sandscape',         'letters': ['M','N','O','P'], 'fogColor': '0xe6c288'},
    {'id': 'steelworks','name': 'Steelworks',        'letters': ['Q','R','S','T'], 'fogColor': '0x4a5568'},
    {'id': 'mire',      'name': 'Mire',              'letters': ['U','V','W','X'], 'fogColor': '0x5a7a5a'},
    {'id': 'citadel',   'name': 'Citadel',           'letters': ['Y','Z'],         'fogColor': '0xd4a574'},
]

def main():
    content = ZONES_FILE.read_text()
    errors = []

    for zone in EXPECTED_ZONES:
        zid = zone['id']
        # Check zone object exists
        if f"id: '{zid}'" not in content:
            errors.append(f"Zone '{zid}' not found")
            continue
        # Check name
        if f"name: '{zone['name']}'" not in content:
            errors.append(f"Zone '{zid}' name mismatch: expected '{zone['name']}'")
        # Check fogColor
        if f"fogColor: {zone['fogColor']}" not in content:
            errors.append(f"Zone '{zid}' fogColor mismatch: expected {zone['fogColor']}")
        # Check letters
        letters_str = ', '.join(f"'{l}'" for l in zone['letters'])
        if letters_str not in content:
            errors.append(f"Zone '{zid}' letters mismatch: expected [{letters_str}]")
        # Check bounds exist
        zone_section = content.split(f"id: '{zid}'")[1].split("  },")[0]
        if 'bounds:' not in zone_section:
            errors.append(f"Zone '{zid}' missing bounds")
        # Check spawnPoint exists
        if 'spawnPoint:' not in zone_section:
            errors.append(f"Zone '{zid}' missing spawnPoint")
        # Check floatingBlockTypes exists
        if 'floatingBlockTypes:' not in zone_section:
            errors.append(f"Zone '{zid}' missing floatingBlockTypes")

    if errors:
        print("FAIL: zone_definitions")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("PASS: zone_definitions — all 7 zones defined correctly")
    return 0

if __name__ == '__main__':
    sys.exit(main())
