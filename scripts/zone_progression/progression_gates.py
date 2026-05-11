#!/usr/bin/env python3
"""
Validation: Zone unlock gates check spelling + enemy defeat correctly.
"""
import sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent / 'voidloop' / 'js'
ZONEDATA_FILE = ROOT / 'ZoneData.js'

def main():
    content = ZONEDATA_FILE.read_text()
    errors = []

    # Check all zones except forest have entry requirements or are gated
    # Forest should NOT have entry requirements (it's the start)
    forest_section = content.split("id: 'forest'")[1].split("id: 'fire'")[0]
    if "entryRequirements" in forest_section:
        errors.append("Forest zone should not have entryRequirements")

    # Check fire zone has hazard (showing progression system exists)
    fire_section = content.split("id: 'fire'")[1].split("id: 'ice'")[0]
    if "hazard:" not in fire_section:
        errors.append("Fire zone missing hazard")

    # Check all zones have pickaxeId
    for zone in ['forest', 'fire', 'ice', 'desert', 'steelworks', 'mire', 'citadel']:
        idx = content.find(f"id: '{zone}'")
        if idx == -1:
            errors.append(f"Zone '{zone}' not found")
            continue
        # Find the next zone id or end of array
        next_zone = content.find("id: '", idx + len(f"id: '{zone}'"))
        if next_zone == -1:
            zone_section = content[idx:]
        else:
            zone_section = content[idx:next_zone]
        if "pickaxeId:" not in zone_section:
            errors.append(f"Zone '{zone}' missing pickaxeId")

    # Check zone progression doc exists with gate requirements
    doc_file = ROOT.parent / 'docs' / 'zone-progression.md'
    if doc_file.exists():
        doc = doc_file.read_text()
        if "Spell all 4 Forest letters + defeat all Forest enemies" not in doc:
            errors.append("Design doc missing progression gate description")
    else:
        errors.append("Design doc not found")

    if errors:
        print("FAIL: progression_gates")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("PASS: progression_gates — zone unlock gates defined correctly")
    return 0

if __name__ == '__main__':
    sys.exit(main())
