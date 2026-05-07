#!/usr/bin/env python3
"""
Voidloop Asset Auditor
Verifies all 3D models, textures, and other assets referenced in the plan exist on disk.
"""
import os, sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent

# Loot glTF models from the plan
LOOT_ASSETS = [
    ("Pirate Kit - Nov 2023/glTF/Prop_Coins.gltf", "Coin pile"),
    ("Pirate Kit - Nov 2023/glTF/UI_Gem_Blue.gltf", "Blue gem"),
    ("Pirate Kit - Nov 2023/glTF/UI_Gem_Green.gltf", "Green gem"),
    ("Pirate Kit - Nov 2023/glTF/UI_Gem_Pink.gltf", "Pink gem"),
    ("Pirate Kit - Nov 2023/glTF/Prop_GoldBag.gltf", "Gold bag"),
    ("Cube World - Aug 2023/Environment/glTF/Crystal_Small.gltf", "Crystal chunk"),
    ("Pirate Kit - Nov 2023/glTF/UI_ChickenLeg.gltf", "Health (meat)"),
    ("Ultimate Space Kit - March 2023/Items/GLTF/Pickup_Health.gltf", "Health (sci-fi)"),
    ("Cube World - Aug 2023/Environment/glTF/Key.gltf", "Key"),
    ("Cube World - Aug 2023/Pixel Blocks/glTF/Coal.gltf", "Ore chunk (coal)"),
    ("Cube World - Aug 2023/Environment/glTF/Rock1.gltf", "Ore chunk (stone)"),
    ("Cube World - Aug 2023/Blocks/glTF/Block_Metal.gltf", "Ore chunk (metal)"),
    ("Ultimate Space Kit - March 2023/Items/GLTF/Pickup_Sphere.gltf", "Energy orb"),
]

# Weapon models
WEAPON_ASSETS = [
    ("Cube World - Aug 2023/Tools/glTF/Pickaxe_Wood.gltf", "Pickaxe"),
    ("Cube World - Aug 2023/Tools/glTF/Sword_Diamond.gltf", "Sword"),
    ("Pirate Kit - Nov 2023/glTF/Weapon_Pistol.gltf", "Pistol"),
    ("Toon Shooter Game Kit - Dec 2022/Guns/glTF/Grenade.gltf", "Grenade"),
]

# Character / enemy models
CHARACTER_ASSETS = [
    ("Ultimate Animated Character Pack - Nov 2019/glTF/Ninja_Male.gltf", "Player (Ninja)"),
    ("Cube World - Aug 2023/Enemies/glTF/Goblin.gltf", "Goblin enemy"),
    ("Cube World - Aug 2023/Enemies/glTF/Skeleton.gltf", "Skeleton enemy"),
    ("Cube World - Aug 2023/Enemies/glTF/Demon.gltf", "Demon enemy"),
    ("Cube World - Aug 2023/Enemies/glTF/Yeti.gltf", "Yeti enemy"),
]

# Block models
BLOCK_ASSETS = [
    ("Cube World - Aug 2023/Blocks/glTF/Block_Dirt.gltf", "Dirt block"),
    ("Cube World - Aug 2023/Blocks/glTF/Block_Stone.gltf", "Stone block"),
    ("Cube World - Aug 2023/Blocks/glTF/Block_Grass.gltf", "Grass block"),
    ("Cube World - Aug 2023/Blocks/glTF/Block_Coal.gltf", "Coal block"),
    ("Cube World - Aug 2023/Blocks/glTF/Block_Metal.gltf", "Metal block"),
    ("Cube World - Aug 2023/Blocks/glTF/Block_Crystal.gltf", "Crystal block"),
    ("Cube World - Aug 2023/Blocks/glTF/Block_Diamond.gltf", "Diamond block"),
]

# VFX textures
VFX_TEXTURES = [
    ("brackeys_vfx_bundle/particles/alpha/spark_01_a.png", "Spark particle"),
    ("brackeys_vfx_bundle/particles/alpha/slash_01_a.png", "Slash particle"),
    ("brackeys_vfx_bundle/particles/alpha/smoke_01_a.png", "Smoke particle"),
    ("brackeys_vfx_bundle/particles/alpha/muzzle_01_a.png", "Muzzle flash"),
    ("brackeys_vfx_bundle/particles/alpha/dirt_01_a.png", "Dirt particle"),
]

def check_assets(category, assets):
    print(f"\n{'-' * 60}")
    print(f"{category} ({len(assets)} items)")
    print(f"{'-' * 60}")
    found = 0
    for path, desc in assets:
        full = PROJECT_ROOT / path
        exists = full.exists()
        status = "✅" if exists else "❌ MISSING"
        print(f"  {status} {path:<65} — {desc}")
        if exists:
            found += 1
    return found, len(assets)

def main():
    print("=" * 60)
    print("VOIDLOOP ASSET AUDIT")
    print("=" * 60)

    total_found = 0
    total = 0

    f, t = check_assets("LOOT ASSETS", LOOT_ASSETS)
    total_found += f; total += t

    f, t = check_assets("WEAPON ASSETS", WEAPON_ASSETS)
    total_found += f; total += t

    f, t = check_assets("CHARACTER/ENEMY ASSETS", CHARACTER_ASSETS)
    total_found += f; total += t

    f, t = check_assets("BLOCK ASSETS", BLOCK_ASSETS)
    total_found += f; total += t

    f, t = check_assets("VFX TEXTURES", VFX_TEXTURES)
    total_found += f; total += t

    print()
    print("=" * 60)
    pct = total_found / total * 100 if total else 0
    print(f"TOTAL: {total_found}/{total} assets found ({pct:.0f}%)")
    print("=" * 60)

    if total_found < total:
        print(f"\n⚠️  {total - total_found} assets are missing!")
        sys.exit(1)
    else:
        print("\n🎉 All assets are present!")
        sys.exit(0)

if __name__ == "__main__":
    main()
