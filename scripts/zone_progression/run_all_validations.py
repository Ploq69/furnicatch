#!/usr/bin/env python3
"""
Run all zone progression validation scripts.
All must pass.
"""
import sys, subprocess, pathlib

SCRIPTS = [
    'zone_definitions.py',
    'block_types.py',
    'pickaxe_gating.py',
    'letter_drops.py',
    'pet_unlock.py',
    'shop_upgrades.py',
    'progression_gates.py',
    'no_placeholders.py',
    'save_persistence.py',
]

def main():
    here = pathlib.Path(__file__).resolve().parent
    passed = 0
    failed = 0

    print("=" * 60)
    print("Voidloop Zone Progression Validation Suite")
    print("=" * 60)

    for script in SCRIPTS:
        print(f"\nRunning {script}...")
        result = subprocess.run(
            [sys.executable, str(here / script)],
            capture_output=True,
            text=True
        )
        output = result.stdout.strip()
        if result.stderr:
            output += "\n" + result.stderr.strip()
        print(output)
        if result.returncode == 0:
            passed += 1
        else:
            failed += 1

    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {failed} failed out of {len(SCRIPTS)}")
    print("=" * 60)

    return 0 if failed == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
