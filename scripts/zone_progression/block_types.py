#!/usr/bin/env python3
"""
Validation: All 28 floating block types (4 per zone) exist in BLOCK_TYPES with correct HP.
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent / 'voidloop' / 'js'
CONSTANTS_FILE = ROOT / 'constants.js'

EXPECTED_BLOCKS = {
    # Forest
    'mossy_stone': 5, 'forest_crystal': 7, 'amber_ore': 10, 'ancient_wood': 12,
    # Fire
    'scorched_rock': 5, 'magma_crystal': 7, 'obsidian': 10, 'ember_core': 12,
    # Ice
    'packed_ice': 5, 'frost_crystal': 7, 'glacial_ore': 10, 'blizzard_core': 12,
    # Desert
    'sandstone_block': 5, 'desert_crystal': 7, 'desert_gold_ore': 10, 'sun_core': 12,
    # Steelworks
    'rusted_scrap': 5, 'factory_crystal': 7, 'alloy_ore': 10, 'furnace_core': 12,
    # Mire
    'mud_clump': 5, 'moss_crystal': 7, 'petrified_log': 10, 'heart_of_the_mire': 12,
    # Citadel
    'castle_brick': 5, 'royal_crystal': 7, 'citadel_gold_ore': 10, 'crown_core': 12,
}

def main():
    content = CONSTANTS_FILE.read_text()
    errors = []

    for block_id, expected_hp in EXPECTED_BLOCKS.items():
        # Find the block definition
        pattern = rf"{re.escape(block_id)}:\s*{{\s*hp:\s*(\d+)"
        match = re.search(pattern, content)
        if not match:
            errors.append(f"Block '{block_id}' not found in BLOCK_TYPES")
            continue
        actual_hp = int(match.group(1))
        if actual_hp != expected_hp:
            errors.append(f"Block '{block_id}' HP mismatch: expected {expected_hp}, got {actual_hp}")
        # Check zone and tier properties exist
        block_section = content[match.start():content.find('}', match.start()) + 1]
        if 'zone:' not in block_section:
            errors.append(f"Block '{block_id}' missing 'zone' property")
        if 'tier:' not in block_section:
            errors.append(f"Block '{block_id}' missing 'tier' property")
        if 'resource:' not in block_section:
            errors.append(f"Block '{block_id}' missing 'resource' property")

    if errors:
        print("FAIL: block_types")
        for e in errors:
            print(f"  - {e}")
        return 1
    print(f"PASS: block_types — all {len(EXPECTED_BLOCKS)} floating blocks defined correctly")
    return 0

if __name__ == '__main__':
    sys.exit(main())
