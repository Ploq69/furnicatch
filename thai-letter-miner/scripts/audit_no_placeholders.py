#!/usr/bin/env python3
import sys
from pathlib import Path
from audit_common import ROOT, ok, fail

FORBIDDEN = [
    "placeholder",
    "createFallback",
    "CanvasTexture",
    "CapsuleGeometry",
    "Model load failed",
    "procedural fallback",
    "minimal_glb",
    "fake",
]

ALLOWED_FILES = {
    "scripts/audit_no_placeholders.py",
    "scripts/audit_all.py",
    "scripts/audit_thai_model_geometry.py",
    "scripts/audit_voidloop_fidelity.py",
}


def main():
    print("NO PLACEHOLDERS")
    errors = 0
    hits = []
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file() or path.suffix not in {".js", ".html", ".py"}:
            continue
        rel = path.relative_to(ROOT).as_posix()
        if rel in ALLOWED_FILES:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for token in FORBIDDEN:
            if token.lower() in text.lower():
                hits.append((rel, token))
    if hits:
        fail(f"forbidden placeholder/fallback tokens found: {hits[:20]}")
        errors += 1
    else:
        ok("no placeholder, fallback, canvas substitute, or capsule-player code remains")

    if (ROOT / "scripts" / "create_minimal_glb_artifacts.py").exists():
        fail("minimal GLB artifact generator still exists")
        errors += 1
    else:
        ok("minimal GLB artifact generator is deleted")

    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
