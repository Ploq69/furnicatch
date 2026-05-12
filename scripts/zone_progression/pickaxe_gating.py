#!/usr/bin/env python3
"""
Validation: Each zone's pickaxe tier correctly gates block mineability.
Checks that Game.js mining targeting checks pickaxe tier against block tier.
"""
import sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent / 'voidloop' / 'js'
GAME_FILE = ROOT / 'Game.js'
SHOP_FILE = ROOT / 'ShopManager.js'

def main():
    game_content = GAME_FILE.read_text()
    shop_content = SHOP_FILE.read_text()
    errors = []

    # Check Game.js checks pickaxe tier
    checks = [
        ("getPickaxeTier" in game_content, "Game.js calls getPickaxeTier"),
        ("blockDef.tier" in game_content, "Game.js checks blockDef.tier"),
        ("zonePickaxeTier < blockTier" in game_content or "zonePickaxeTier < blockDef.tier" in game_content, "Game.js compares pickaxe tier to block tier"),
    ]

    for check, desc in checks:
        if not check:
            errors.append(desc)

    # Check ShopManager.js has pickaxe tier upgrades for all 7 zones
    for zone in ['forest', 'fire', 'ice', 'desert', 'steelworks', 'mire', 'citadel']:
        if f"zoneId: '{zone}'" not in shop_content:
            errors.append(f"ShopManager missing pickaxe tier upgrades for '{zone}'")

    # Check getPickaxeTier method exists
    if "getPickaxeTier(zoneId)" not in shop_content:
        errors.append("ShopManager missing getPickaxeTier method")

    if errors:
        print("FAIL: pickaxe_gating")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("PASS: pickaxe_gating — pickaxe tiers gate block mineability correctly")
    return 0

if __name__ == '__main__':
    sys.exit(main())
