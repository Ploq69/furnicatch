#!/usr/bin/env python3
"""
Voidloop Plan Compliance Auditor
Scans JS source files for keywords defined in the plan.
Reports which plan items are implemented vs missing.
"""
import os, sys, re
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
JS_DIR = PROJECT_ROOT / "voidloop" / "js"
PLAN_FILE = PROJECT_ROOT / ".kimi" / "plans" / "hellcat-rocket-starman.md"

# Plan keywords mapped to human-readable features
PLAN_CHECKS = {
    # Phase 1: Mining + Loot
    "LootDrop": "LootDrop.js exists (physical loot drops)",
    "lootSpawn": "Loot spawn method",
    "magnetRange": "Loot magnet/hoover range",
    "hoover": "Loot hoover/auto-collect",
    "despawn": "Loot despawn logic",
    "screenShake": "Screen shake on block break",
    "hitFeedback": "Block hit feedback (shake on every hit)",
    "denseCave": "Dense cave generation (not scattered clusters)",
    "blockHP": "Block HP bar indicator",
    "pool": "Loot mesh pooling",
    # Phase 2: Time Pressure
    "countdown": "Countdown timer (not count-up)",
    "timeBonus": "Time bonus for kills/mining",
    # Phase 3: Enemy
    "enemyLoot": "Enemy loot drops on death",
    # Phase 4: Items
    "inventoryGrid": "Inventory grid UI",
    "consumable": "Consumable item usage",
    # Assets / VFX
    "preloadTextures": "VFX texture preloading",
    "flipbooks": "Flipbook VFX system",
}

def scan_js_files():
    """Read all JS files into a single string for searching."""
    text = ""
    files = []
    if not JS_DIR.exists():
        print(f"ERROR: JS directory not found: {JS_DIR}")
        sys.exit(1)
    for fpath in sorted(JS_DIR.glob("*.js")):
        files.append(fpath.name)
        text += f"\n\n/* FILE: {fpath.name} */\n\n"
        text += fpath.read_text(encoding="utf-8")
    return text, files

def check_features(source_text):
    results = {}
    for keyword, description in PLAN_CHECKS.items():
        found = keyword in source_text
        results[keyword] = {
            "desc": description,
            "found": found,
        }
    return results

def check_file_exists(filename):
    return (JS_DIR / filename).exists()

def main():
    print("=" * 60)
    print("VOIDLOOP PLAN COMPLIANCE AUDIT")
    print("=" * 60)
    print(f"Scanning: {JS_DIR}")
    print()

    source_text, files = scan_js_files()
    print(f"Scanned {len(files)} JS files: {', '.join(files)}")
    print()

    # Check file existence
    print("-" * 60)
    print("FILE EXISTENCE CHECKS")
    print("-" * 60)
    required_files = [
        ("LootDrop.js", "Physical loot drop system"),
        ("FlipbookVFX.js", "Flipbook VFX system"),
        ("ParticleSystem.js", "Particle system"),
        ("SFXMapper.js", "SFX mapping"),
    ]
    for fname, desc in required_files:
        exists = check_file_exists(fname)
        status = "✅" if exists else "❌ MISSING"
        print(f"  {status} {fname:<20} — {desc}")
    print()

    # Check features in code
    results = check_features(source_text)
    implemented = [k for k, v in results.items() if v["found"]]
    missing = [k for k, v in results.items() if not v["found"]]

    print("-" * 60)
    print(f"FEATURE CHECKS — {len(implemented)}/{len(results)} implemented")
    print("-" * 60)

    if implemented:
        print("\n  ✅ IMPLEMENTED:")
        for kw in implemented:
            print(f"     • {results[kw]['desc']}")

    if missing:
        print("\n  ❌ MISSING:")
        for kw in missing:
            print(f"     • {results[kw]['desc']}")

    print()
    print("=" * 60)
    pct = len(implemented) / len(results) * 100 if results else 0
    print(f"COMPLIANCE: {pct:.0f}% ({len(implemented)}/{len(results)} features)")
    print("=" * 60)

    if missing:
        sys.exit(1)
    else:
        print("\n🎉 All plan features are implemented!")
        sys.exit(0)

if __name__ == "__main__":
    main()
