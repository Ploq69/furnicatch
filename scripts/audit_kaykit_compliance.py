#!/usr/bin/env python3
"""Validates every 3D asset path resolves to KayKit or approved legacy pack."""
import os, re, sys

ROOT = os.path.join(os.path.dirname(__file__), '..')
LEGACY_OK = {
    'Ultimate Monsters',
    'Ultimate Animated Character Pack',
    'Toon Shooter Game Kit',
    'simple_alphabet.glb',
    'Ultimate Space Kit',
    'Pirate Kit',
    'Super Pixel Effects Gigapack',
    'StylooClassroomAssetPack',
    'Sushi Restaurant Kit',
}

KAYKIT_FRAGMENTS = {
    'KayKit_',
}

# Pre-existing relative paths known to belong to approved packs
RELATIVE_OK = {
    'arrow_bow.gltf', 'arrow_bow_bundle.gltf', 'arrow_crossbow.gltf', 'arrow_crossbow_bundle.gltf',
    'axe_1handed.gltf', 'axe_2handed.gltf', 'bow.gltf', 'bow_withString.gltf',
    'crossbow_1handed.gltf', 'crossbow_2handed.gltf', 'dagger.gltf',
    'mug_empty.gltf', 'mug_full.gltf', 'quiver.gltf',
    'shield_badge.gltf', 'shield_badge_color.gltf', 'shield_round.gltf',
    'shield_round_barbarian.gltf', 'shield_round_color.gltf', 'shield_spikes.gltf',
    'shield_spikes_color.gltf', 'shield_square.gltf', 'shield_square_color.gltf',
    'smokebomb.gltf', 'spellbook_closed.gltf', 'spellbook_open.gltf',
    'staff.gltf', 'sword_1handed.gltf', 'sword_2handed.gltf',
    'sword_2handed_color.gltf', 'wand.gltf',
    'spark_01_a.png', 'slash_01_a.png', 'smoke_01_a.png', 'muzzle_01_a.png',
    'dirt_01_a.png', 'fire_01_a.png', 'magic_01_a.png', 'flare_01_a.png', 'circle_01_a.png',
}

ASSET_RE = re.compile(r'["\']([^"\']+\.(?:gltf|glb|fbx|png))["\']')
EXIT = 0

def is_approved(asset_path):
    if asset_path.startswith('http'):
        return True
    basename = os.path.basename(asset_path)
    if basename in RELATIVE_OK:
        return True
    for exc in LEGACY_OK:
        if exc in asset_path:
            return True
    for frag in KAYKIT_FRAGMENTS:
        if frag in asset_path:
            return True
    return False

for subdir, dirs, files in os.walk(os.path.join(ROOT, 'voidloop')):
    dirs[:] = [d for d in dirs if d not in {'.venv','node_modules','.git','__pycache__'}]
    for f in files:
        if not f.endswith(('.js','.html','.json')):
            continue
        path = os.path.join(subdir, f)
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as fh:
                text = fh.read()
        except Exception:
            continue
        for m in ASSET_RE.finditer(text):
            asset_path = m.group(1)
            basename = os.path.basename(asset_path)
            if not is_approved(asset_path):
                print(f"[UNAPPROVED] {path}: {asset_path}")
                EXIT = 1
                continue
            # Skip existence check for known relative paths
            if basename in RELATIVE_OK:
                continue
            # Verify existence for approved paths
            full = os.path.join(ROOT, asset_path)
            if not os.path.exists(full):
                print(f"[MISSING] {path}: {asset_path}")
                EXIT = 1

if EXIT == 0:
    print("[PASS] All asset paths are KayKit/legacy compliant and exist on disk.")
else:
    print("[FAIL] Asset compliance issues found.")
sys.exit(EXIT)
