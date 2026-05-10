#!/usr/bin/env python3
import re
import sys
from audit_common import ROOT, all_source, ok, fail, read


def main():
    print("RUNTIME MODEL USAGE")
    source = all_source()
    errors = 0
    checks = [
        ("GLTFLoader is used for Thai assets", "GLTFLoader" in read(ROOT / "js" / "ThaiAssetLoader.js")),
        ("Thai loader uses GLB model root", "assets/thai/glb" in read(ROOT / "js" / "ThaiAssetLoader.js")),
        ("Quiz creates ThaiModelPreview", "new ThaiModelPreview" in read(ROOT / "js" / "UIManager.js")),
        ("Quiz preview canvases are audited", "data-thai-model-preview" in source),
        ("Pets clone Thai GLB models", "cloneItem(item.id)" in read(ROOT / "js" / "PetSystem.js")),
        ("Discovery moment clones Thai GLB models", "_showDiscoveryModel" in read(ROOT / "js" / "Game.js") and "cloneItem(item.id)" in read(ROOT / "js" / "Game.js")),
        ("Test hooks expose model audit", "getModelAudit" in read(ROOT / "js" / "Game.js")),
    ]
    for label, passed in checks:
        if passed:
            ok(label)
        else:
            fail(label)
            errors += 1
    if re.search(r"quiz-choice[^`]+<span>\$\{choice\.glyph\}</span>", source, re.S) and "ThaiModelPreview" not in source:
        fail("quiz appears text-only")
        errors += 1
    else:
        ok("quiz is not text-only")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
