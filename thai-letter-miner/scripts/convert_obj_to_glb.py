#!/usr/bin/env python3
"""Convert extracted Thai OBJ files to GLB with obj2gltf.

Requires the Node CLI package:
  npx obj2gltf -i source.obj -o dest.glb
"""
import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "js" / "thaiManifest.js"
OBJ_ROOT = ROOT / "assets" / "thai" / "obj"
GLB_ROOT = ROOT / "assets" / "thai" / "glb"


def parse_manifest():
    text = MANIFEST.read_text(encoding="utf-8")
    for body in re.findall(r"\{([^{}]+)\}", text, re.S):
        id_match = re.search(r"id:\s*'([^']+)'", body)
        model_match = re.search(r"modelFile:\s*'([^']+)'", body)
        if id_match and model_match:
            yield id_match.group(1), model_match.group(1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="overwrite existing GLB files")
    args = parser.parse_args()
    if shutil.which("npx") is None:
        print("npx not found; cannot run obj2gltf", file=sys.stderr)
        return 1
    GLB_ROOT.mkdir(parents=True, exist_ok=True)
    failures = []
    for item_id, model_file in parse_manifest():
        src = OBJ_ROOT / model_file
        dst = GLB_ROOT / f"{item_id}.glb"
        if dst.exists() and not args.force:
            continue
        print(f"convert {src.name} -> {dst.name}")
        result = subprocess.run(["npx", "-y", "obj2gltf", "-i", str(src), "-o", str(dst)])
        if result.returncode:
            failures.append(item_id)
    if failures:
        print(f"failed conversions: {failures}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
