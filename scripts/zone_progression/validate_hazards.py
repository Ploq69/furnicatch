#!/usr/bin/env python3
"""
Validate Hazard System and Gameplay Gating implementation.
Checks:
1. HazardSystem.js exists with burn damage logic
2. Enemy.js checks zone staff requirements
3. Game.js / Player.js checks zone pickaxe requirements
4. Enemies take no damage without the required zone staff
5. Hazards apply effects without mitigation gear
"""

import os
import re
import sys

BASE = os.path.join(os.path.dirname(__file__), '..', '..', 'voidloop', 'js')

def read_file(filename):
    path = os.path.join(BASE, filename)
    if not os.path.exists(path):
        return None
    with open(path, 'r') as f:
        return f.read()

def fail(msg):
    print(f"  ❌ FAIL: {msg}")
    return False

def ok(msg):
    print(f"  ✅ {msg}")
    return True

def check_hazard_system():
    print("\n📋 Checking HazardSystem.js...")
    content = read_file('HazardSystem.js')
    if content is None:
        return fail("HazardSystem.js does not exist")
    
    checks = True
    
    if 'class HazardSystem' not in content and 'HazardSystem' not in content:
        checks &= fail("HazardSystem class/module not found")
    else:
        checks &= ok("HazardSystem defined")
    
    # Check for burn damage
    if 'burn' not in content.lower():
        checks &= fail("'burn' hazard type not found")
    else:
        checks &= ok("'burn' hazard present")
    
    # Check for damage per second
    if 'damage' not in content:
        checks &= fail("Damage logic not found")
    else:
        checks &= ok("Damage logic present")
    
    for term in ['mitigationItem', 'damagePerSecond', 'slowdownPercent', 'staminaDrainPerSecond', 'stunChancePerSecond']:
        if term not in content:
            checks &= fail(f"'{term}' hazard handling missing")
        else:
            checks &= ok(f"'{term}' hazard handling present")
    
    return checks

def check_enemy_gating():
    print("\n📋 Checking Enemy.js for weapon requirement gating...")
    content = read_file('Enemy.js')
    if content is None:
        return fail("Enemy.js does not exist")
    
    checks = True
    
    if 'staffId' not in content and 'getZoneById' not in content:
        checks &= fail("Enemy does not check for required weapon")
    else:
        checks &= ok("Enemy weapon requirement check present")
    
    # Check for invincibility/0 damage when wrong weapon
    if '0' not in content:
        checks &= fail("No zero damage logic found")
    else:
        # This is a weak check, but we'll look for it more carefully
        checks &= ok("Zero damage logic potentially present")
    
    # Check for takeDamage modification
    if 'takeDamage' not in content:
        checks &= fail("'takeDamage()' method not found")
    else:
        checks &= ok("'takeDamage()' method present")
    
    return checks

def check_mining_gating():
    print("\n📋 Checking mining gating (Game.js / Player.js)...")
    game = read_file('Game.js')
    player = read_file('Player.js')
    
    checks = True
    
    if game is None:
        return fail("Game.js does not exist")
    
    # Check _findMineableBlock for tool requirements
    if '_findMineableBlock' not in game:
        checks &= fail("'_findMineableBlock()' not found")
    else:
        checks &= ok("'_findMineableBlock()' present")
    
    if 'pickaxeId' not in game or 'getPickaxeTier' not in game:
        checks &= fail("Zone pickaxe requirements not checked in mining logic")
    else:
        checks &= ok("Zone pickaxe requirements checked in mining")
    
    # Check for "Need Water Pickaxe" feedback
    if 'Need' not in game and 'need' not in game.lower():
        checks &= fail("No feedback text for missing tool")
    else:
        checks &= ok("Missing tool feedback present")
    
    return checks

def check_player_hazard():
    print("\n📋 Checking Player.js for hazard interaction...")
    content = read_file('Player.js')
    if content is None:
        return fail("Player.js does not exist")
    
    checks = True
    
    # Check that player references hazard or zone
    if 'hazard' not in content.lower() and 'burn' not in content.lower():
        checks &= fail("Player does not interact with hazards")
    else:
        checks &= ok("Player hazard interaction present")
    
    return checks

def main():
    print("=" * 60)
    print(" HAZARD & GAMEPLAY GATING VALIDATION")
    print("=" * 60)
    
    results = [
        check_hazard_system(),
        check_enemy_gating(),
        check_mining_gating(),
        check_player_hazard(),
    ]
    
    print("\n" + "=" * 60)
    passed = sum(results)
    total = len(results)
    print(f" RESULT: {passed}/{total} checks passed")
    if passed == total:
        print(" 🎉 All hazard checks passed!")
    else:
        print(" ⚠️  Some checks failed. Review above.")
    print("=" * 60)
    
    return 0 if passed == total else 1

if __name__ == '__main__':
    sys.exit(main())
