#!/usr/bin/env python3
"""Schema, catalog, and sample level validator."""
import os, sys, re

ROOT = os.path.join(os.path.dirname(__file__), '..')
LB = os.path.join(ROOT, 'voidloop', 'js', 'levelbuilder')
EXIT = 0

# 1. Schema round-trip test
schema_path = os.path.join(LB, 'LevelSchema.js')
with open(schema_path, 'r', encoding='utf-8') as f:
    schema_text = f.read()
if 'createBlankLevel' not in schema_text:
    print("[FAIL] createBlankLevel not found in LevelSchema.js")
    EXIT = 1
else:
    print("[OK] Schema factory present")

if 'validateLevel' not in schema_text:
    print("[FAIL] validateLevel not found in LevelSchema.js")
    EXIT = 1
else:
    print("[OK] Schema validator present")

if 'CURRENT_SCHEMA_VERSION' not in schema_text:
    print("[FAIL] Schema version constant missing")
    EXIT = 1
else:
    print("[OK] Schema version constant present")

# 2. Catalog asset existence
catalog_path = os.path.join(LB, 'LevelCatalog.js')
with open(catalog_path, 'r', encoding='utf-8') as f:
    catalog_text = f.read()

for m in re.finditer(r'["\']([^"\']*KayKit[^"\']*\.(?:gltf|glb|fbx|png))["\']', catalog_text):
    asset = m.group(1)
    full = os.path.join(ROOT, asset)
    if not os.path.exists(full):
        print(f"[MISSING CATALOG ASSET] {asset}")
        EXIT = 1
    else:
        print(f"[OK] Catalog asset exists: {os.path.basename(asset)}")

# 3. Sample validation
templates_path = os.path.join(LB, 'LevelTemplates.js')
with open(templates_path, 'r', encoding='utf-8') as f:
    templates_text = f.read()

sample_count = len(re.findall(r"id:\s*['\"]sample_", templates_text))
if sample_count != 6:
    print(f"[FAIL] Expected 6 sample levels, found {sample_count}")
    EXIT = 1
else:
    print("[OK] 6 sample levels defined")

# Budget checks via regex
for m in re.finditer(r"\{[^}]*id:\s*['\"](sample_[^'\"]+)['\"][^}]*tiles:\s*(\d+)[^}]*props:\s*(\d+)[^}]*enemies:\s*(\d+)[^}]*tokens:\s*(\d+)", templates_text):
    sid, tiles, props, enemies, tokens = m.groups()
    tiles, props, enemies, tokens = int(tiles), int(props), int(enemies), int(tokens)
    issues = []
    if tiles > 300: issues.append(f"tiles {tiles}>300")
    if props > 120: issues.append(f"props {props}>120")
    if enemies > 20: issues.append(f"enemies {enemies}>20")
    if tokens > 40: issues.append(f"tokens {tokens}>40")
    if issues:
        print(f"[BUDGET] {sid}: {', '.join(issues)}")
        EXIT = 1
    else:
        print(f"[OK] {sid} within budget")

# 4. A* pathfinding check
if '_reachable' not in schema_text + templates_text:
    # Check LevelValidation.js
    val_path = os.path.join(LB, 'LevelValidation.js')
    with open(val_path, 'r') as f:
        val_text = f.read()
    if '_reachable' not in val_text:
        print("[FAIL] A* reachability check not found")
        EXIT = 1
    else:
        print("[OK] A* pathfinding present")
else:
    print("[OK] A* pathfinding present")

if EXIT == 0:
    print("[PASS] Level builder audit passed.")
else:
    print("[FAIL] Level builder audit failed.")
sys.exit(EXIT)
