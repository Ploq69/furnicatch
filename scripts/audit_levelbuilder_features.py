#!/usr/bin/env python3
"""Feature completeness checker for level builder."""
import os, re, sys

ROOT = os.path.join(os.path.dirname(__file__), '..', 'voidloop', 'js', 'levelbuilder')
REQUIRED_FILES = [
    'LevelSchema.js',
    'LevelCatalog.js',
    'LevelEditorState.js',
    'LevelRenderer.js',
    'LevelTools.js',
    'LevelBuilderApp.js',
    'LevelStorage.js',
    'LevelValidation.js',
    'LevelTemplates.js',
]

MANDATORY_FEATURES = [
    ('undo', r'undo\('),
    ('redo', r'redo\('),
    ('paint tool', r'paint'),
    ('raise tool', r'raise'),
    ('lower tool', r'lower'),
    ('erase tool', r'erase'),
    ('fill tool', r'fill'),
    ('prop tool', r'prop'),
    ('token tool', r'token'),
    ('start tool', r'start'),
    ('exit tool', r'exit'),
    ('enemy tool', r'enemy'),
    ('floating block tool', r'floatblock'),
    ('playtest', r'playtest'),
    ('template', r'template'),
    ('ghost preview', r'showGhost|ghost'),
    ('magic fix', r'magic.?fix|autoFix'),
    ('export', r'exportJSON|export'),
    ('import', r'importJSON|import'),
    ('save', r'saveLevel|save\('),
    ('load', r'loadLevel|load\('),
    ('validate', r'validate'),
    ('A\* pathfinding', r'reachable|_reachable'),
    ('budget enforcement', r'MAX_TILES|MAX_PROPS|MAX_ENEMIES|MAX_TOKENS|MAX_FLOAT_BLOCKS'),
    ('brush configuration', r'brushType|brushProp|brushFloatBlock|brushToken|brushEnemy'),
    ('autosave', r'autosave|_performAutosave'),
    ('Block.js loads GLTF models', r'assetLoader\.loadGLTF'),
    ('LevelRenderer awaits prop sync', r'await.*syncProps|async\s+sync\s*\('),
    ('OrbitControls disabled during tool use', r'controls\.enabled\s*=\s*false'),
    ('Playtest URL points to Voidloop', r'\./index\.html\?playtest'),
    ('Block.js handles GLTF groups', r'_getMeshMaterials'),
    ('Floating blocks in schema', r'floatingBlocks'),
    ('Floating block bobbing', r'bobPhase|Math\.sin.*bob'),
]

EXIT = 0

# Check files exist
for rf in REQUIRED_FILES:
    p = os.path.join(ROOT, rf)
    if not os.path.exists(p):
        print(f"[MISSING FILE] {rf}")
        EXIT = 1
    else:
        print(f"[OK] {rf}")

# Check features across all files
all_text = ''
for f in os.listdir(ROOT):
    if f.endswith('.js'):
        with open(os.path.join(ROOT, f), 'r', encoding='utf-8', errors='ignore') as fh:
            all_text += fh.read() + '\n'
# Also check parent js dir for shared game files (Block.js, etc.)
PARENT_JS = os.path.join(os.path.dirname(ROOT), '..', 'js')
for f in ['Block.js']:
    p = os.path.join(PARENT_JS, f)
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8', errors='ignore') as fh:
            all_text += fh.read() + '\n'

for name, pat in MANDATORY_FEATURES:
    if not re.search(pat, all_text, re.IGNORECASE):
        print(f"[MISSING FEATURE] {name}")
        EXIT = 1
    else:
        print(f"[OK] Feature: {name}")

if EXIT == 0:
    print("[PASS] All level builder features present.")
else:
    print("[FAIL] Some level builder features missing.")
sys.exit(EXIT)
