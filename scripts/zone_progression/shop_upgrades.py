#!/usr/bin/env python3
"""
Validation: pick_tier and mine_speed upgrades actually modify Player stats.
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

    # Check mineDamage is set from pick_tier
    if "mineDamage = 1 + pickTier" not in player_content:
        errors.append("mineDamage not set from pick_tier")

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
    print("PASS: shop_upgrades — pick_tier and mine_speed modify Player stats")
    return 0

if __name__ == '__main__':
    sys.exit(main())
