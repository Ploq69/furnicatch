#!/usr/bin/env python3
"""
Validate Item/Equipment System implementation.
Checks:
1. Inventory.js exists with owned/equipped tracking
2. Player.js has tool/armor/weapon functional slots
3. Two-layer equipment: visual (KayKit) + functional
4. Items integrate with existing loadout
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

def check_inventory():
    print("\n📋 Checking Inventory.js...")
    content = read_file('Inventory.js')
    if content is None:
        return fail("Inventory.js does not exist")
    
    checks = True
    
    if 'class Inventory' not in content:
        checks &= fail("Inventory class not found")
    else:
        checks &= ok("Inventory class defined")
    
    # Check for owned/equipped tracking
    if 'owned' not in content:
        checks &= fail("'owned' property not found for item tracking")
    else:
        checks &= ok("'owned' property present")
    
    if 'equipped' not in content:
        checks &= fail("'equipped' property not found for item tracking")
    else:
        checks &= ok("'equipped' property present")
    
    # Check for the 3 required items
    for item in ['water_pickaxe', 'water_suit', 'water_staff']:
        if item not in content:
            checks &= fail(f"'{item}' not tracked in inventory")
        else:
            checks &= ok(f"'{item}' tracked")
    
    return checks

def check_player_equipment():
    print("\n📋 Checking Player.js for equipment slots...")
    content = read_file('Player.js')
    if content is None:
        return fail("Player.js does not exist")
    
    checks = True
    
    # Check for functional equipment slots
    func_slots = ['tool', 'armor', 'weapon']
    for slot in func_slots:
        if slot not in content:
            checks &= fail(f"'{slot}' functional slot not found in Player")
        else:
            checks &= ok(f"'{slot}' functional slot present")
    
    # Check that existing loadout is still present (visual layer)
    if 'loadout' not in content:
        checks &= fail("Existing 'loadout' visual system removed")
    else:
        checks &= ok("Visual loadout system preserved")
    
    # Check for equip methods
    for method in ['equipTool', 'equipArmor', 'equipWeapon', 'hasItem']:
        if method not in content:
            checks &= fail(f"'{method}()' method missing")
        else:
            checks &= ok(f"'{method}()' method present")
    
    return checks

def check_constants_items():
    print("\n📋 Checking constants.js for item definitions...")
    content = read_file('constants.js')
    if content is None:
        return fail("constants.js does not exist")
    
    checks = True
    
    # Check for item definitions
    for item in ['water_pickaxe', 'water_suit', 'water_staff']:
        if item not in content:
            checks &= fail(f"'{item}' not defined in constants")
        else:
            checks &= ok(f"'{item}' defined in constants")
    
    # Check for zone-specific loot tables
    if 'forest' not in content or 'fire' not in content:
        checks &= fail("Zone-specific loot tables not found")
    else:
        checks &= ok("Zone loot tables present")
    
    return checks

def main():
    print("=" * 60)
    print(" INVENTORY & EQUIPMENT VALIDATION")
    print("=" * 60)
    
    results = [
        check_inventory(),
        check_player_equipment(),
        check_constants_items(),
    ]
    
    print("\n" + "=" * 60)
    passed = sum(results)
    total = len(results)
    print(f" RESULT: {passed}/{total} checks passed")
    if passed == total:
        print(" 🎉 All inventory checks passed!")
    else:
        print(" ⚠️  Some checks failed. Review above.")
    print("=" * 60)
    
    return 0 if passed == total else 1

if __name__ == '__main__':
    sys.exit(main())
