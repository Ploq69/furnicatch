#!/usr/bin/env python3
"""
Validate Zone System implementation against the plan.
Checks:
1. ZoneData.js exists with ZONES array containing 'forest' and 'fire'
2. ZoneManager.js exists with zone state, unlocks, gateway logic
3. Zone bounds, entryRequirements, hazards, letterSets are defined
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

def check_zone_data():
    print("\n📋 Checking ZoneData.js...")
    content = read_file('ZoneData.js')
    if content is None:
        return fail("ZoneData.js does not exist")
    
    checks = True
    
    if not re.search(r'export\s+(const|let|var)\s+ZONES', content):
        checks &= fail("ZONES array not exported")
    else:
        checks &= ok("ZONES array exported")
    
    for zone_id in ['forest', 'fire']:
        if zone_id not in content:
            checks &= fail(f"'{zone_id}' zone not found")
        else:
            checks &= ok(f"'{zone_id}' zone defined")
    
    for field in ['blockTypes', 'enemyTypes', 'letterSet']:
        if field not in content:
            checks &= fail(f"'{field}' field missing in zone data")
        else:
            checks &= ok(f"'{field}' field present")
    
    if 'entryRequirements' not in content:
        checks &= fail("'entryRequirements' not found (needed for fire zone gating)")
    else:
        checks &= ok("'entryRequirements' present for zone gating")
    
    if 'hazard' not in content:
        checks &= fail("'hazard' not found (needed for fire zone burn damage)")
    else:
        checks &= ok("'hazard' present for environmental damage")
    
    if 'bounds' not in content:
        checks &= fail("'bounds' not found (needed for zone positioning)")
    else:
        checks &= ok("'bounds' present for zone positioning")
    
    return checks

def check_zone_manager():
    print("\n📋 Checking ZoneManager.js...")
    content = read_file('ZoneManager.js')
    if content is None:
        return fail("ZoneManager.js does not exist")
    
    checks = True
    
    if 'class ZoneManager' not in content:
        checks &= fail("ZoneManager class not found")
    else:
        checks &= ok("ZoneManager class defined")
    
    for method in ['isZoneUnlocked', 'unlockZone', 'getCurrentZone', 'checkGateway']:
        if method not in content:
            checks &= fail(f"'{method}()' method missing")
        else:
            checks &= ok(f"'{method}()' method present")
    
    for item in ['water_pickaxe', 'water_suit', 'water_staff']:
        if item not in content:
            checks &= fail(f"'{item}' not referenced in ZoneManager")
        else:
            checks &= ok(f"'{item}' referenced")
    
    return checks

def check_world_zones():
    print("\n📋 Checking World.js for zone-based generation...")
    content = read_file('World.js')
    if content is None:
        return fail("World.js does not exist")
    
    checks = True
    
    if 'ZONES' not in content and 'zone' not in content.lower():
        checks &= fail("World.js does not reference zones")
    else:
        checks &= ok("World.js references zones")
    
    if 'generateFloor' in content and 'generateZone' not in content:
        checks &= fail("Still using generateFloor() without generateZone()")
    else:
        checks &= ok("Uses zone-based generation")
    
    if 'gateway' not in content.lower():
        checks &= fail("No gateway handling in World.js")
    else:
        checks &= ok("Gateway handling present")
    
    return checks

def check_game_zones():
    print("\n📋 Checking Game.js for zone initialization...")
    content = read_file('Game.js')
    if content is None:
        return fail("Game.js does not exist")
    
    checks = True
    
    if 'ZoneManager' not in content:
        checks &= fail("Game.js does not import ZoneManager")
    else:
        checks &= ok("Game.js imports ZoneManager")
    
    if '_generateFloor' in content and 'generateZone' not in content and 'ZoneManager' not in content:
        checks &= fail("Game.js still uses _generateFloor without zone system")
    else:
        checks &= ok("Game.js adapted for zones")
    
    return checks

def main():
    print("=" * 60)
    print(" ZONE SYSTEM VALIDATION")
    print("=" * 60)
    
    results = [
        check_zone_data(),
        check_zone_manager(),
        check_world_zones(),
        check_game_zones(),
    ]
    
    print("\n" + "=" * 60)
    passed = sum(results)
    total = len(results)
    print(f" RESULT: {passed}/{total} checks passed")
    if passed == total:
        print(" 🎉 All zone system checks passed!")
    else:
        print(" ⚠️  Some checks failed. Review above.")
    print("=" * 60)
    
    return 0 if passed == total else 1

if __name__ == '__main__':
    sys.exit(main())
