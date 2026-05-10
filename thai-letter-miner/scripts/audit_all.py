#!/usr/bin/env python3
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

AUDITS = [
    ("No Placeholders", "audit_no_placeholders.py"),
    ("Assets", "audit_thai_assets.py"),
    ("Thai Model Geometry", "audit_thai_model_geometry.py"),
    ("Audio", "audit_thai_audio.py"),
    ("Manifest", "audit_manifest_integrity.py"),
    ("Runtime Model Usage", "audit_runtime_model_usage.py"),
    ("Voidloop Fidelity", "audit_voidloop_fidelity.py"),
    ("Features", "audit_feature_plan.py"),
    ("Pacing", "audit_pacing_model.py"),
    ("Balance", "audit_progression_balance.py"),
    ("Browser Visual", "audit_browser_visual.py"),
]


def main():
    failures = []
    print("THAI LETTER MINER FINISH GATE")
    print("=" * 44)
    for label, script in AUDITS:
        print(f"\n[{label}] {script}")
        result = subprocess.run([sys.executable, str(HERE / script)], cwd=HERE)
        if result.returncode:
            failures.append(label)
    print("\n" + "=" * 44)
    if failures:
        print(f"FAILED: {', '.join(failures)}")
        sys.exit(1)
    print("PASSED: Assets, Audio, Manifest, Features, Pacing, Balance, Prestige")
    sys.exit(0)


if __name__ == "__main__":
    main()
