#!/usr/bin/env python3
"""
Validate Save/Load Persistence implementation.
Checks:
1. localStorage key 'voidloop_progress_v1' is used
2. Save function exists with all required fields
3. Load function exists and restores state
4. Reset option exists in settings
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

def check_save_functionality():
    print("\n📋 Checking save functionality...")
    
    files_to_check = ['ShopManager.js', 'Inventory.js', 'ZoneManager.js', 'Game.js']
    found_save = False
    checks = True
    
    for fname in files_to_check:
        content = read_file(fname)
        if content is None:
            continue
        if 'localStorage.setItem' in content or 'localStorage.save' in content:
            found_save = True
            checks &= ok(f"Save found in {fname}")
    
    if not found_save:
        checks &= fail("No localStorage.setItem found for saving progress")
    
    return checks

def check_load_functionality():
    print("\n📋 Checking load functionality...")
    
    files_to_check = ['main.js', 'Game.js', 'ShopManager.js', 'Inventory.js', 'ZoneManager.js']
    found_load = False
    checks = True
    
    for fname in files_to_check:
        content = read_file(fname)
        if content is None:
            continue
        if 'localStorage.getItem' in content or 'localStorage.load' in content:
            found_load = True
            checks &= ok(f"Load found in {fname}")
    
    if not found_load:
        checks &= fail("No localStorage.getItem found for loading progress")
    
    return checks

def check_save_schema():
    print("\n📋 Checking save data schema...")
    
    # Look for the key fields in any file
    all_content = ""
    for fname in os.listdir(BASE):
        if fname.endswith('.js'):
            content = read_file(fname)
            if content:
                all_content += content
    
    checks = True
    
    required_fields = [
        'unlockedZones',
        'coins',
        'inventory',
        'upgradeLevels',
    ]
    
    for field in required_fields:
        if field not in all_content:
            checks &= fail(f"'{field}' not found in save/load code")
        else:
            checks &= ok(f"'{field}' present in save schema")
    
    # Check for the specific localStorage key
    if 'voidloop_progress' not in all_content:
        checks &= fail("'voidloop_progress' save key not found")
    else:
        checks &= ok("'voidloop_progress' save key present")
    
    return checks

def check_reset_option():
    print("\n📋 Checking reset progress option...")
    
    settings = read_file('SettingsManager.js')
    settings_menu = read_file('SettingsMenu.js')
    
    checks = True
    
    all_content = ""
    if settings: all_content += settings
    if settings_menu: all_content += settings_menu
    
    if 'reset' not in all_content.lower():
        checks &= fail("No reset progress option found")
    else:
        checks &= ok("Reset progress option present")
    
    return checks

def main():
    print("=" * 60)
    print(" PERSISTENCE VALIDATION")
    print("=" * 60)
    
    results = [
        check_save_functionality(),
        check_load_functionality(),
        check_save_schema(),
        check_reset_option(),
    ]
    
    print("\n" + "=" * 60)
    passed = sum(results)
    total = len(results)
    print(f" RESULT: {passed}/{total} checks passed")
    if passed == total:
        print(" 🎉 All persistence checks passed!")
    else:
        print(" ⚠️  Some checks failed. Review above.")
    print("=" * 60)
    
    return 0 if passed == total else 1

if __name__ == '__main__':
    sys.exit(main())
