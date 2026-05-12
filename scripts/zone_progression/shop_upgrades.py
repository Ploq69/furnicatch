#!/usr/bin/env python3
"""
Validation: mine_speed upgrades modify Player stats; block unlocks come from zone pickaxe tiers.
"""
import sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent / 'voidloop' / 'js'
PLAYER_FILE = ROOT / 'Player.js'
GAME_FILE = ROOT / 'Game.js'

def main():
    player_content = PLAYER_FILE.read_text()
    game_content = GAME_FILE.read_text()
    errors = []

    # Check Player.js has applyUpgrades
    if "applyUpgrades(upgradeLevels)" not in player_content:
        errors.append("Player.js missing applyUpgrades method")

    if "pick_tier" in player_content:
        errors.append("Player should not use global pick_tier for block unlocking")

    if "_getMiningDamage" not in game_content:
        errors.append("Game.js should compute mining damage from zone pickaxe tier")

    # Check mineSpeed is set from mine_speed
    if "mineSpeed = 1.0 + (mineSpeedLevel * 0.1)" not in player_content:
        errors.append("mineSpeed not set from mine_speed level")

    # Check getSwingCooldown exists
    if "getSwingCooldown()" not in player_content:
        errors.append("Player missing getSwingCooldown method")

    # Check Game.js uses getSwingCooldown
    if "this.player.getSwingCooldown()" not in game_content:
        errors.append("Game.js doesn't use dynamic swing cooldown")

    # Check Game.js calls applyUpgrades
    if "this.player.applyUpgrades(this.shop.upgradeLevels)" not in game_content:
        errors.append("Game.js doesn't call applyUpgrades")

    if errors:
        print("FAIL: shop_upgrades")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("PASS: shop_upgrades — mine_speed modifies Player stats; zone pickaxe tiers drive mining")
    return 0

if __name__ == '__main__':
    sys.exit(main())
