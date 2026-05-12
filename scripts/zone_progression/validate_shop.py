#!/usr/bin/env python3
"""
Validate Shop System implementation against the plan.
Checks:
1. ShopManager.js exists with item definitions and purchase logic
2. ShopUI.js exists with tabbed interface
3. Zone pickaxes and required gear are defined from ZoneData ids
4. Zone pickaxe tier upgrades are visible in the shop
5. Existing non-unlock upgrades remain available where appropriate
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

def check_shop_manager():
    print("\n📋 Checking ShopManager.js...")
    content = read_file('ShopManager.js')
    if content is None:
        return fail("ShopManager.js does not exist")
    
    checks = True
    
    if 'class ShopManager' not in content:
        checks &= fail("ShopManager class not found")
    else:
        checks &= ok("ShopManager class defined")
    
    # Check for buy/purchase method
    if 'buy' not in content and 'purchase' not in content:
        checks &= fail("No buy/purchase method found")
    else:
        checks &= ok("Purchase method present")
    
    required_items = [
        'forest_pickaxe', 'fire_pickaxe', 'fire_suit', 'fire_staff',
        'ice_pickaxe', 'ice_suit', 'ice_staff',
        'desert_pickaxe', 'desert_suit', 'desert_staff',
    ]
    
    for item in required_items:
        if item not in content:
            checks &= fail(f"'{item}' not defined in shop")
        else:
            checks &= ok(f"'{item}' defined in shop")

    for term in ['PICKAXE_TIER_UPGRADES', 'upgradePickaxeTier', 'getPickaxeTier']:
        if term not in content:
            checks &= fail(f"'{term}' missing from zone pickaxe progression")
        else:
            checks &= ok(f"'{term}' present for zone pickaxe progression")
    
    # Check for item types/categories
    for cat in ['tool', 'armor', 'weapon', 'upgrade']:
        if cat not in content.lower():
            checks &= fail(f"'{cat}' category not found")
        else:
            checks &= ok(f"'{cat}' category present")
    
    # Check persistence
    if 'localStorage' not in content:
        checks &= fail("localStorage not used for shop persistence")
    else:
        checks &= ok("localStorage persistence present")
    
    return checks

def check_shop_ui():
    print("\n📋 Checking ShopUI.js...")
    content = read_file('ShopUI.js')
    if content is None:
        return fail("ShopUI.js does not exist")
    
    checks = True
    
    if 'class ShopUI' not in content and 'class Shop' not in content:
        checks &= fail("ShopUI class not found")
    else:
        checks &= ok("ShopUI class defined")
    
    # Check for tabbed interface
    tab_indicators = ['tab', 'Tabs', 'tools', 'armor', 'weapons', 'upgrades']
    tab_found = any(t.lower() in content.lower() for t in tab_indicators)
    if not tab_found:
        checks &= fail("Tabbed interface not detected")
    else:
        checks &= ok("Tabbed interface present")
    
    # Check for overlay
    if 'shop-overlay' not in content and 'shop' not in content.lower():
        checks &= fail("Shop overlay not found")
    else:
        checks &= ok("Shop overlay referenced")
    
    return checks

def check_ui_manager_shop():
    print("\n📋 Checking UIManager.js for shop integration...")
    content = read_file('UIManager.js')
    if content is None:
        return fail("UIManager.js does not exist")
    
    checks = True
    
    if 'ShopManager' not in content and 'ShopUI' not in content and 'shop' not in content.lower():
        checks &= fail("UIManager.js does not reference shop system")
    else:
        checks &= ok("UIManager.js references shop system")
    
    # Check that old inline upgrade buttons are replaced or augmented
    if 'blacksmith-upgrades' in content and 'shop' not in content.lower():
        checks &= fail("Still using old blacksmith upgrade buttons without shop")
    else:
        checks &= ok("Shop integration present in camp UI")
    
    return checks

def check_html_shop():
    print("\n📋 Checking index.html for shop overlay DOM...")
    content = read_file('../index.html')
    if content is None:
        # Try alternate path
        path = os.path.join(os.path.dirname(__file__), '..', '..', 'voidloop', 'index.html')
        if os.path.exists(path):
            with open(path, 'r') as f:
                content = f.read()
        else:
            return fail("index.html does not exist")
    
    checks = True
    
    if 'shop' not in content.lower():
        checks &= fail("No shop overlay in index.html")
    else:
        checks &= ok("Shop overlay present in index.html")
    
    return checks

def main():
    print("=" * 60)
    print(" SHOP SYSTEM VALIDATION")
    print("=" * 60)
    
    results = [
        check_shop_manager(),
        check_shop_ui(),
        check_ui_manager_shop(),
        check_html_shop(),
    ]
    
    print("\n" + "=" * 60)
    passed = sum(results)
    total = len(results)
    print(f" RESULT: {passed}/{total} checks passed")
    if passed == total:
        print(" 🎉 All shop system checks passed!")
    else:
        print(" ⚠️  Some checks failed. Review above.")
    print("=" * 60)
    
    return 0 if passed == total else 1

if __name__ == '__main__':
    sys.exit(main())
