#!/usr/bin/env python3
"""Scans voidloop/ for remaining Cube World asset references."""
import os, re, sys

PATTERNS = [
    r'Cube World', r'CubeWorld',
    r'dirt_cube', r'grass_cube', r'stone_cube', r'stonebrick_cube',
    r'brick_cube', r'cobblestone_cube', r'snow_cube', r'ice_cube',
    r'pickaxe_wood', r'pickaxe_stone', r'pickaxe_iron', r'pickaxe_gold', r'pickaxe_diamond',
    r'goblin\.glb', r'skeleton\.glb', r'demon\.glb', r'yeti\.glb',
    r'crystal\.gltf', r'key\.gltf',
    r'ANIM_CUBEWORLD',
]

ROOT = os.path.join(os.path.dirname(__file__), '..', 'voidloop')
EXIT = 0

for subdir, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in {'.venv','node_modules','.git','__pycache__'}]
    for f in files:
        if not f.endswith(('.js','.html','.json','.css')):
            continue
        path = os.path.join(subdir, f)
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as fh:
                text = fh.read()
        except Exception:
            continue
        for pat in PATTERNS:
            if re.search(pat, text, re.IGNORECASE):
                print(f"[CUBEWORLD] {path}: matches /{pat}/")
                EXIT = 1

if EXIT == 0:
    print("[PASS] No Cube World references found.")
else:
    print("[FAIL] Cube World references still present.")
sys.exit(EXIT)
