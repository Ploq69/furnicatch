#!/usr/bin/env python3
"""
Master validation runner for zone progression implementation.
Runs all validation scripts and reports a combined result.
"""

import os
import sys
import subprocess
import importlib.util

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

VALIDATIONS = [
    ('Zone System', 'validate_zones.py'),
    ('Shop System', 'validate_shop.py'),
    ('Inventory & Equipment', 'validate_inventory.py'),
    ('Hazards & Gating', 'validate_hazards.py'),
    ('VFX Integration', 'validate_vfx.py'),
    ('Persistence', 'validate_persistence.py'),
    ('UI Changes', 'validate_ui.py'),
    ('Spelling System', 'validate_spelling.py'),
    ('No Placeholders', 'validate_no_placeholders.py'),
]

def run_script(name, filename):
    """Run a validation script and return success/failure."""
    path = os.path.join(SCRIPT_DIR, filename)
    if not os.path.exists(path):
        print(f"\n{'='*60}")
        print(f" {name}")
        print(f"{'='*60}")
        print(f"  ❌ FAIL: Script not found: {filename}")
        return False
    
    try:
        result = subprocess.run(
            [sys.executable, path],
            capture_output=False,
            text=True,
            timeout=30,
        )
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print(f"  ❌ FAIL: Script timed out")
        return False
    except Exception as e:
        print(f"  ❌ FAIL: Error running script: {e}")
        return False

def main():
    print("=" * 60)
    print(" ZONE PROGRESSION IMPLEMENTATION VALIDATION")
    print("=" * 60)
    print(" Running all validation scripts...\n")
    
    results = []
    for name, filename in VALIDATIONS:
        passed = run_script(name, filename)
        results.append((name, passed))
    
    print("\n" + "=" * 60)
    print(" FINAL SUMMARY")
    print("=" * 60)
    
    passed_count = sum(1 for _, p in results if p)
    total_count = len(results)
    
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {status} — {name}")
    
    print("-" * 60)
    print(f" TOTAL: {passed_count}/{total_count} validations passed")
    
    if passed_count == total_count:
        print("\n 🎉🎉🎉 ALL VALIDATIONS PASSED! 🎉🎉🎉")
        print(" Implementation is complete and adheres to the plan.")
        print("=" * 60)
        return 0
    else:
        print(f"\n ⚠️  {total_count - passed_count} validation(s) failed.")
        print(" Please review the failures above before merging.")
        print("=" * 60)
        return 1

if __name__ == '__main__':
    sys.exit(main())
