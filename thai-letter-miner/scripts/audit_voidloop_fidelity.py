#!/usr/bin/env python3
import sys
from audit_common import ROOT, read, ok, fail


def contains(path, token):
    return token in read(ROOT / path)


def main():
    print("VOIDLOOP FIDELITY")
    errors = 0
    checks = [
        ("Game imports Player", contains("js/Game.js", "import { Player }")),
        ("Game imports ParticleSystem", contains("js/Game.js", "ParticleSystem")),
        ("Game imports FlipbookVFX", contains("js/Game.js", "FlipbookVFX")),
        ("Game imports LootDrop", contains("js/Game.js", "LootDrop")),
        ("Game uses SFXMapper", contains("js/Game.js", "SFXMapper")),
        ("Game routes block breaks through World.mineBlock", contains("js/Game.js", "world.mineBlock")),
        ("Player uses real animated asset loader", contains("js/Player.js", "assetLoader.loadGLTF")),
        ("Weapon uses assetLoader cloneModel", contains("js/Weapon.js", "assetLoader.cloneModel")),
        ("Voidloop hotbar remains", contains("index.html", 'id="hotbar"')),
        ("Voidloop brightness control remains", contains("index.html", 'id="brightness-control"')),
        ("Voidloop zoom control remains", contains("index.html", 'id="zoom-control"')),
        ("Voidloop loading screen remains", contains("index.html", 'id="loading"')),
        ("Voidloop camp UI remains", contains("index.html", 'id="camp-ui"')),
    ]
    for label, passed in checks:
        if passed:
            ok(label)
        else:
            fail(label)
            errors += 1
    forbidden = [
        ("custom capsule player removed", "new THREE.CapsuleGeometry" not in read(ROOT / "js" / "Game.js")),
        ("handmade prototype World removed", "class MineBlock" not in read(ROOT / "js" / "World.js")),
        ("plain prototype UI removed", "Scrappy Quarry: clear every block" not in read(ROOT / "js" / "Game.js")),
    ]
    for label, passed in forbidden:
        if passed:
            ok(label)
        else:
            fail(label)
            errors += 1
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
