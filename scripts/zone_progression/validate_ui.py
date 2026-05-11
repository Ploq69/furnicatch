#!/usr/bin/env python3
"""
Validate UI Changes implementation.
Checks:
1. Shop overlay DOM exists in index.html
2. Gateway indicator UI exists
3. Equipment panel in HUD
4. Burn warning indicator
"""

import os
import re
import sys

BASE = os.path.join(os.path.dirname(__file__), '..', '..', 'voidloop', 'js')
HTML_BASE = os.path.join(os.path.dirname(__file__), '..', '..', 'voidloop')

def read_file(filename, base=BASE):
    path = os.path.join(base, filename)
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

def check_html_shop():
    print("\n📋 Checking index.html for shop overlay...")
    content = read_file('index.html', HTML_BASE)
    if content is None:
        return fail("index.html does not exist")
    
    checks = True
    
    if 'shop' not in content.lower():
        checks &= fail("No shop overlay in index.html")
    else:
        checks &= ok("Shop overlay present")
    
    return checks

def check_gateway_ui():
    print("\n📋 Checking gateway indicator UI...")
    ui = read_file('UIManager.js')
    game = read_file('Game.js')
    
    checks = True
    
    if ui is None:
        return fail("UIManager.js does not exist")
    
    # Check for gateway indicator methods
    if 'gateway' not in ui.lower():
        checks &= fail("No gateway UI methods in UIManager")
    else:
        checks &= ok("Gateway UI methods present")
    
    # Check for lock/requires text
    if 'requires' not in ui.lower() and 'locked' not in ui.lower():
        checks &= fail("No 'Requires' or 'Locked' indicator text")
    else:
        checks &= ok("Lock/Requires indicator text present")
    
    return checks

def check_equipment_panel():
    print("\n📋 Checking equipment panel in HUD...")
    content = read_file('UIManager.js')
    if content is None:
        return fail("UIManager.js does not exist")
    
    checks = True
    
    # Check for equipment display
    equip_terms = ['equipment', 'equipped', 'tool', 'armor', 'weapon']
    found = sum(1 for t in equip_terms if t in content.lower())
    if found < 3:
        checks &= fail("Equipment panel not adequately implemented")
    else:
        checks &= ok("Equipment panel present")
    
    return checks

def check_burn_warning():
    print("\n📋 Checking burn warning indicator...")
    content = read_file('UIManager.js')
    if content is None:
        return fail("UIManager.js does not exist")
    
    checks = True
    
    if 'burn' not in content.lower():
        checks &= fail("Burn warning indicator not found")
    else:
        checks &= ok("Burn warning indicator present")
    
    return checks

def main():
    print("=" * 60)
    print(" UI VALIDATION")
    print("=" * 60)
    
    results = [
        check_html_shop(),
        check_gateway_ui(),
        check_equipment_panel(),
        check_burn_warning(),
    ]
    
    print("\n" + "=" * 60)
    passed = sum(results)
    total = len(results)
    print(f" RESULT: {passed}/{total} checks passed")
    if passed == total:
        print(" 🎉 All UI checks passed!")
    else:
        print(" ⚠️  Some checks failed. Review above.")
    print("=" * 60)
    
    return 0 if passed == total else 1

if __name__ == '__main__':
    sys.exit(main())
