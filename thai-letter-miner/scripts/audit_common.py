#!/usr/bin/env python3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
JS = ROOT / "js"
ASSETS = ROOT / "assets"
AUDIO = ASSETS / "audio" / "thai"
OBJ_ROOT = ASSETS / "thai" / "obj"
GLB_ROOT = ASSETS / "thai" / "glb"

REQUIRED_COUNTS = {
    "consonant": 44,
    "vowel": 7,
    "symbol": 5,
    "tone": 1,
    "number": 10,
}


def read(path):
    return Path(path).read_text(encoding="utf-8")


def manifest_text():
    return read(JS / "thaiManifest.js")


def parse_manifest():
    text = manifest_text()
    items = []
    for body in re.findall(r"\{([^{}]+)\}", text, re.S):
        if "id:" not in body or "modelFile:" not in body:
            continue
        item = {}
        for key in ["id", "glyph", "category", "thaiName", "romanizedName", "audioText", "modelFile", "confuserGroup"]:
            match = re.search(rf"{key}:\s*'([^']*)'", body)
            if match:
                item[key] = match.group(1)
        tier = re.search(r"unlockTier:\s*(\d+)", body)
        if tier:
            item["unlockTier"] = int(tier.group(1))
        if item:
            items.append(item)
    return items


def all_source():
    chunks = []
    for path in sorted(JS.glob("*.js")):
        chunks.append(f"\n/* {path.name} */\n")
        chunks.append(read(path))
    chunks.append("\n/* index.html */\n")
    chunks.append(read(ROOT / "index.html"))
    return "\n".join(chunks)


def ok(message):
    print(f"  OK   {message}")


def fail(message):
    print(f"  FAIL {message}")
