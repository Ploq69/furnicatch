#!/usr/bin/env python3
"""Master audit runner — executes all Voidloop compliance checks."""
import subprocess, sys

AUDITS = [
    ('Cube World purge', 'scripts/audit_no_cubeworld.py'),
    ('KayKit compliance', 'scripts/audit_kaykit_compliance.py'),
    ('Level builder features', 'scripts/audit_levelbuilder_features.py'),
    ('Level builder schema/catalog', 'scripts/audit_levelbuilder.py'),
]

results = []
for name, script in AUDITS:
    print(f"\n{'='*50}")
    print(f"Running: {name}")
    print('='*50)
    result = subprocess.run([sys.executable, script], cwd='.')
    results.append((name, result.returncode == 0))

print(f"\n{'='*50}")
print("AUDIT SUMMARY")
print('='*50)
all_pass = True
for name, passed in results:
    status = "PASS" if passed else "FAIL"
    print(f"  [{status}] {name}")
    if not passed:
        all_pass = False

print('='*50)
if all_pass:
    print("🎉 ALL AUDITS PASSED")
    sys.exit(0)
else:
    print("❌ SOME AUDITS FAILED")
    sys.exit(1)
