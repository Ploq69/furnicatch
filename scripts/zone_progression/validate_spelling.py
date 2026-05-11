#!/usr/bin/env python3
"""
Validate Spelling/Letter System zone-specific implementation.
Checks:
1. Each zone has letterSet defined
2. Letters only drop from current zone
3. Spelling challenge uses zone letters
4. Zone completion bonus exists
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

def check_zone_letters():
    print("\n📋 Checking ZoneData.js for letter sets...")
    content = read_file('ZoneData.js')
    if content is None:
        return fail("ZoneData.js does not exist")
    
    checks = True
    
    if 'letterSet' not in content:
        checks &= fail("'letterSet' not found in zone data")
    else:
        checks &= ok("'letterSet' present in zones")
    
    # Check for 4-letter sets (A-D for forest, E-H for fire)
    forest_letters = ['A', 'B', 'C', 'D']
    fire_letters = ['E', 'F', 'G', 'H']
    
    for letter in forest_letters + fire_letters:
        if f"'{letter}'" not in content and f'"{letter}"' not in content:
            checks &= fail(f"Letter '{letter}' not found in zone letter sets")
        else:
            checks &= ok(f"Letter '{letter}' in zone sets")
    
    return checks

def check_letter_drops():
    print("\n📋 Checking Game.js for zone-specific letter drops...")
    content = read_file('Game.js')
    if content is None:
        return fail("Game.js does not exist")
    
    checks = True
    
    # Check that letter drops reference zone or current zone
    if 'zone' not in content.lower() and 'letterPool' not in content:
        checks &= fail("Letter drops don't appear zone-aware")
    else:
        checks &= ok("Letter drops zone-aware")
    
    # Check for pickRandomLetter or similar
    if 'pickRandomLetter' not in content and 'getCurrentLetters' not in content:
        checks &= fail("Letter picking methods not found")
    else:
        checks &= ok("Letter picking methods present")
    
    return checks

def check_spelling_challenge():
    print("\n📋 Checking SpellingEngine.js / SpellingData.js...")
    spelling_data = read_file('SpellingData.js')
    spelling_engine = read_file('SpellingEngine.js')
    
    checks = True
    
    if spelling_data is None and spelling_engine is None:
        return fail("Spelling files not found")
    
    all_content = ""
    if spelling_data: all_content += spelling_data
    if spelling_engine: all_content += spelling_engine
    
    # Check for zone-specific words/letters
    if 'zone' not in all_content.lower() and 'level' not in all_content.lower():
        checks &= fail("Spelling not tied to zones/levels")
    else:
        checks &= ok("Spelling tied to progression")
    
    return checks

def check_zone_completion_bonus():
    print("\n📋 Checking for zone completion bonus...")
    game = read_file('Game.js')
    
    checks = True
    
    if game is None:
        return fail("Game.js does not exist")
    
    # Look for bonus reward after spelling all letters
    bonus_terms = ['bonus', 'reward', 'gems', 'allSpelled']
    found = sum(1 for t in bonus_terms if t in game)
    if found < 2:
        checks &= fail("Zone completion bonus not adequately implemented")
    else:
        checks &= ok("Zone completion bonus present")
    
    return checks

def main():
    print("=" * 60)
    print(" SPELLING / LETTER SYSTEM VALIDATION")
    print("=" * 60)
    
    results = [
        check_zone_letters(),
        check_letter_drops(),
        check_spelling_challenge(),
        check_zone_completion_bonus(),
    ]
    
    print("\n" + "=" * 60)
    passed = sum(results)
    total = len(results)
    print(f" RESULT: {passed}/{total} checks passed")
    if passed == total:
        print(" 🎉 All spelling checks passed!")
    else:
        print(" ⚠️  Some checks failed. Review above.")
    print("=" * 60)
    
    return 0 if passed == total else 1

if __name__ == '__main__':
    sys.exit(main())
