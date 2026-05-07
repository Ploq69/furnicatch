#!/usr/bin/env python3
"""
Voidloop Gameplay Structure Auditor
Inspects key JS files to verify structural compliance with the gameplay plan.
"""
import os, sys, re
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
JS_DIR = PROJECT_ROOT / "voidloop" / "js"

def read_file(name):
    path = JS_DIR / name
    if not path.exists():
        return None
    return path.read_text(encoding="utf-8")

def check_pattern(text, pattern, desc):
    found = bool(re.search(pattern, text, re.MULTILINE | re.DOTALL))
    status = "✅" if found else "❌ MISSING"
    print(f"  {status} {desc}")
    return found

def audit_game_js():
    text = read_file("Game.js")
    if text is None:
        print("  ❌ Game.js not found!")
        return 0, 0

    checks = [
        (r"flipbooks\.update", "Game loop calls flipbooks.update()"),
        (r"particles\.update", "Game loop calls particles.update()"),
        (r"camera\.position\.set\s*\(", "Camera position is set (follows player)"),
        (r"camera\.lookAt", "Camera lookAt is called"),
        (r"_findNearestEnemy", "Has nearest enemy search"),
        (r"_findNearestBlock", "Has nearest block search"),
        (r"KeyJ", "J key attack/mine binding"),
        (r"_spawnExitPortal", "Exit portal spawning"),
        (r"showCamp", "Camp UI shown on death/floor 20"),
        (r"startDescent", "Has startDescent method"),
        (r"OrthographicCamera", "Uses orthographic camera (isometric)"),
    ]

    passed = 0
    for pattern, desc in checks:
        if check_pattern(text, pattern, desc):
            passed += 1

    # Check timer direction
    if re.search(r"countdown|timer.*-=|timeRemaining", text, re.IGNORECASE):
        print("  ✅ Timer appears to be countdown-based")
        passed += 1
    elif re.search(r"floorTimer\s*\+\=|count.*up", text, re.IGNORECASE):
        print("  ⚠️  Timer is count-up (should be countdown per plan)")
    else:
        print("  ❌ Timer direction unclear")

    return passed, len(checks) + 1

def audit_block_js():
    text = read_file("Block.js")
    if text is None:
        print("  ❌ Block.js not found!")
        return 0, 0

    checks = [
        (r"takeDamage", "Block has takeDamage method"),
        (r"destroy", "Block has destroy method"),
        (r"emissive", "Block uses emissive for hit flash"),
        (r"MeshStandardMaterial", "Block uses MeshStandardMaterial"),
    ]

    passed = 0
    for pattern, desc in checks:
        if check_pattern(text, pattern, desc):
            passed += 1

    # Check for hit feedback (shake)
    if re.search(r"shake|position\.x.*sin|rotation\.z.*sin", text, re.IGNORECASE):
        print("  ✅ Block has shake/hit feedback")
        passed += 1
    else:
        print("  ❌ Block missing shake/hit feedback (plan requires this)")

    return passed, len(checks) + 1

def audit_world_js():
    text = read_file("World.js")
    if text is None:
        print("  ❌ World.js not found!")
        return 0, 0

    checks = [
        (r"generateFloor", "World has generateFloor method"),
        (r"setFloor", "World has setFloor method"),
        (r"BIOMES", "World references BIOMES"),
        (r"ENEMY_TYPES", "World references ENEMY_TYPES"),
        (r"_placeBlock|_spawnCluster", "World has block placement methods"),
    ]

    passed = 0
    for pattern, desc in checks:
        if check_pattern(text, pattern, desc):
            passed += 1

    # Check for dense generation vs scattered
    cluster_pattern = re.search(r"clusterCount|_spawnCluster", text)
    dense_pattern = re.search(r"dense|fill|wall|room|cave", text, re.IGNORECASE)

    if dense_pattern and not cluster_pattern:
        print("  ✅ World uses dense generation (not scattered clusters)")
        passed += 1
    elif cluster_pattern:
        print("  ⚠️  World still uses scattered cluster generation (plan requires dense caves)")
    else:
        print("  ❌ World generation pattern unclear")

    return passed, len(checks) + 1

def audit_player_js():
    text = read_file("Player.js")
    if text is None:
        print("  ❌ Player.js not found!")
        return 0, 0

    checks = [
        (r"AnimationMixer", "Player uses AnimationMixer"),
        (r"playAnim", "Player has playAnim method"),
        (r"equipWeapon", "Player has equipWeapon method"),
        (r"weaponHolder", "Player has weaponHolder (weapon in hand)"),
        (r"Fist\.R", "Player attaches to Fist.R bone"),
        (r"takeDamage", "Player has takeDamage method"),
        (r"mineDamage|mineSpeed", "Player has mining stats"),
    ]

    passed = 0
    for pattern, desc in checks:
        if check_pattern(text, pattern, desc):
            passed += 1

    return passed, len(checks)

def audit_enemy_js():
    text = read_file("Enemy.js")
    if text is None:
        print("  ❌ Enemy.js not found!")
        return 0, 0

    checks = [
        (r"AnimationMixer", "Enemy uses AnimationMixer"),
        (r"animMap", "Enemy uses animMap for per-type animations"),
        (r"takeDamage", "Enemy has takeDamage method"),
        (r"attackCooldown", "Enemy has attack cooldown"),
        (r"_createHPBar", "Enemy has HP bar"),
        (r"_updateHPBar", "Enemy updates HP bar"),
    ]

    passed = 0
    for pattern, desc in checks:
        if check_pattern(text, pattern, desc):
            passed += 1

    return passed, len(checks)

def audit_ui_manager_js():
    text = read_file("UIManager.js")
    if text is None:
        print("  ❌ UIManager.js not found!")
        return 0, 0

    checks = [
        (r"showCamp", "UI has showCamp method"),
        (r"hideCamp", "UI has hideCamp method"),
        (r"setTimer", "UI has setTimer method"),
        (r"updateStats", "UI has updateStats method"),
        (r"showExitOpen", "UI has showExitOpen method"),
    ]

    passed = 0
    for pattern, desc in checks:
        if check_pattern(text, pattern, desc):
            passed += 1

    return passed, len(checks)

def main():
    print("=" * 60)
    print("VOIDLOOP GAMEPLAY STRUCTURE AUDIT")
    print("=" * 60)

    total_passed = 0
    total_checks = 0

    sections = [
        ("Game.js", audit_game_js),
        ("Block.js", audit_block_js),
        ("World.js", audit_world_js),
        ("Player.js", audit_player_js),
        ("Enemy.js", audit_enemy_js),
        ("UIManager.js", audit_ui_manager_js),
    ]

    for name, audit_fn in sections:
        print(f"\n{'-' * 60}")
        print(f"Auditing {name}")
        print(f"{'-' * 60}")
        p, t = audit_fn()
        total_passed += p
        total_checks += t

    print()
    print("=" * 60)
    pct = total_passed / total_checks * 100 if total_checks else 0
    print(f"TOTAL: {total_passed}/{total_checks} checks passed ({pct:.0f}%)")
    print("=" * 60)

    if total_passed < total_checks:
        print(f"\n⚠️  {total_checks - total_passed} gameplay checks failed!")
        sys.exit(1)
    else:
        print("\n🎉 All gameplay structure checks passed!")
        sys.exit(0)

if __name__ == "__main__":
    main()
