#!/usr/bin/env python3
"""Download ourCraft textures and build a new atlas for voidloop."""

import os
import sys
from io import BytesIO
from PIL import Image
import urllib.request

OUT_DIR = "voidloop/assets/textures"
RAW_DIR = os.path.join(OUT_DIR, "ourcraft_raw")
ATLAS_PATH = os.path.join(OUT_DIR, "ourcraft_atlas.png")

os.makedirs(RAW_DIR, exist_ok=True)

BASE_URL = "https://raw.githubusercontent.com/meemknight/ourCraft/master/resources/assets/blocks"

# Define textures to download from ourCraft
# Each entry: (filename, atlas_name)
OURCRAFT_TEXTURES = [
    # Terrain core
    ("grass_block_top.png", "grass_block_top"),
    ("grass_block_side.png", "grass_block_side"),
    ("dirt.png", "dirt"),
    ("stone.png", "stone"),
    ("cobblestone.png", "cobblestone"),
    ("gravel.png", "gravel"),
    ("sand.png", "sand"),
    ("red_sand.png", "red_sand"),
    ("bricks.png", "bricks"),
    ("ice.png", "ice"),
    ("snow.png", "snow"),
    ("coarse_dirt.png", "coarse_dirt"),
    # Ores
    ("coal_ore.png", "coal_ore"),
    ("iron_ore.png", "iron_ore"),
    ("gold_ore.png", "gold_ore"),
    ("diamond_ore.png", "diamond_ore"),
    # Trees - birch
    ("birch_log.png", "birch_log"),
    ("birch_log_top.png", "birch_log_top"),
    ("birch_leaves_original.png", "birch_leaves"),
    # Trees - oak
    ("oak_log.png", "oak_log"),
    ("oak_log_top.png", "oak_log_top"),
    ("oak_leaves.png", "oak_leaves"),
    # Trees - jungle
    ("jungle_log.png", "jungle_log"),
    ("jungle_log_top.png", "jungle_log_top"),
    ("jungle_leaves.png", "jungle_leaves"),
    # Trees - acacia
    ("acacia_log.png", "acacia_log"),
    ("acacia_log_top.png", "acacia_log_top"),
    ("acacia_leaves.png", "acacia_leaves"),
    # Trees - dark oak (will double as spruce/pine)
    ("dark_oak_log.png", "dark_oak_log"),
    ("dark_oak_log_top.png", "dark_oak_log_top"),
    ("dark_oak_leaves.png", "dark_oak_leaves"),
    # Desert
    ("cactus_side.png", "cactus_side"),
    ("cactus_top.png", "cactus_top"),
    ("dead_bush.png", "dead_bush"),
    # Mushroom
    ("mushroom_stem.png", "mushroom_stem"),
    ("brown_mushroom_block.png", "brown_mushroom"),
    # Extra stone variants
    ("chiseled_stone_bricks.png", "chiseled_stone_bricks"),
    ("cracked_stone_bricks.png", "cracked_stone_bricks"),
    ("mossy_stone_bricks.png", "mossy_stone_bricks"),
    ("stone_bricks.png", "stone_bricks"),
    # Blackstone (for fire/volcanic)
    ("blackstone.png", "blackstone"),
    ("blackstone_top.png", "blackstone_top"),
    # Nether bricks (for fire zone)
    ("nether_bricks.png", "nether_bricks"),
    ("cracked_nether_bricks.png", "cracked_nether_bricks"),
    # Blue ice
    ("blue_ice.png", "blue_ice"),
]

# Textures we will source from the existing Kenney atlas instead
# We need to extract these from kenney_tiles.png
KENNEY_TEXTURES = [
    ("water", 0, 768),
    ("lava", 640, 256),
    ("wood", 0, 128),
    ("wood_red", 0, 0),
    ("leaves_transparent", 512, 1024),
    ("leaves_orange_transparent", 512, 1152),
    ("leaves_orange", 640, 0),
    ("leaves", 640, 128),
    ("wheat_stage4", 0, 256),       # tall grass substitute
    ("mushroom_red", 512, 768),      # flower substitute
    ("mushroom_brown", 512, 896),    # flower substitute
    ("cotton_red", 896, 896),        # flower
    ("cotton_green", 896, 1024),     # flower
    ("cotton_blue", 896, 1152),      # flower
    ("cotton_tan", 896, 768),        # flower
    ("stone_grass", 256, 512),       # mossy stone
    ("stone_snow", 128, 1024),
    ("stone_dirt", 256, 896),
    ("stone_gold", 256, 768),
    ("stone_gold_alt", 256, 640),
    ("stone_silver", 128, 1152),
    ("stone_silver_alt", 128, 1024),
    ("stone_coal", 384, 128),
    ("stone_coal_alt", 384, 0),
    ("stone_diamond", 256, 1152),
    ("stone_diamond_alt", 256, 1024),
    ("stone_iron", 256, 384),
    ("stone_iron_alt", 256, 256),
    ("stone_browniron", 384, 384),
    ("stone_browniron_alt", 384, 256),
    ("greystone", 640, 896),
    ("greystone_sand", 640, 512),
    ("greystone_ruby", 640, 768),
    ("greystone_ruby_alt", 640, 640),
    ("greysand", 640, 1024),
    ("gravel_stone", 640, 1152),
    ("gravel_dirt", 768, 0),
    ("redstone_emerald", 512, 128),
    ("redstone_emerald_alt", 512, 0),
    ("redstone_sand", 384, 1152),
    ("redsand", 512, 384),
    ("rock_moss", 384, 896),
    ("rock", 384, 1024),
    ("dirt_snow", 896, 256),
    ("dirt_sand", 896, 384),
    ("dirt_grass", 896, 512),
    ("glass", 768, 1152),
    ("glass_frame", 768, 1024),
    ("cactus_inside", 1024, 256),
    ("brick_red", 1024, 384),
    ("brick_grey", 512, 256),
    ("trunk_white_side", 0, 1024),
    ("trunk_white_top", 0, 896),
    ("trunk_side", 128, 0),
    ("trunk_top", 0, 1152),
    ("trunk_mid", 128, 128),
    ("trunk_bottom", 128, 256),
    ("fence_wood", 896, 0),
    ("fence_stone", 896, 128),
    ("oven", 512, 512),
    ("track_straight", 128, 512),
    ("table", 128, 896),
]

TILE_SIZE = 64
ATLAS_COLS = 32
ATLAS_ROWS = 32
ATLAS_W = ATLAS_COLS * TILE_SIZE
ATLAS_H = ATLAS_ROWS * TILE_SIZE

def download(url, path):
    try:
        urllib.request.urlretrieve(url, path)
        return os.path.getsize(path) > 100
    except Exception as e:
        print(f"  FAILED: {e}")
        return False

def load_image(path):
    img = Image.open(path)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    return img.resize((TILE_SIZE, TILE_SIZE), Image.NEAREST)

def extract_kenney(name, x, y):
    kenney_path = "voidloop/assets/textures/kenney_tiles.png"
    if not os.path.exists(kenney_path):
        print(f"  Kenney atlas not found at {kenney_path}")
        return None
    atlas = Image.open(kenney_path)
    tile = atlas.crop((x, y, x + 128, y + 128))
    return tile.resize((TILE_SIZE, TILE_SIZE), Image.NEAREST)

def main():
    atlas = Image.new('RGBA', (ATLAS_W, ATLAS_H), (0, 0, 0, 0))
    tiles = []
    idx = 0

    print("=== Downloading ourCraft textures ===")
    for filename, atlas_name in OURCRAFT_TEXTURES:
        url = f"{BASE_URL}/{filename}"
        path = os.path.join(RAW_DIR, filename)
        if not os.path.exists(path) or os.path.getsize(path) < 100:
            print(f"Downloading {filename} ...")
            ok = download(url, path)
            if not ok:
                print(f"  SKIPPING {filename}")
                continue
        else:
            print(f"Using cached {filename}")

        try:
            img = load_image(path)
        except Exception as e:
            print(f"  ERROR loading {filename}: {e}")
            continue

        col = idx % ATLAS_COLS
        row = idx // ATLAS_COLS
        atlas.paste(img, (col * TILE_SIZE, row * TILE_SIZE))
        tiles.append({"name": atlas_name, "idx": idx, "x": col, "y": row})
        idx += 1

    print("\n=== Extracting Kenney textures ===")
    for name, x, y in KENNEY_TEXTURES:
        img = extract_kenney(name, x, y)
        if img is None:
            continue
        col = idx % ATLAS_COLS
        row = idx // ATLAS_COLS
        atlas.paste(img, (col * TILE_SIZE, row * TILE_SIZE))
        tiles.append({"name": name, "idx": idx, "x": col, "y": row})
        idx += 1

    # Save atlas
    atlas.save(ATLAS_PATH)
    print(f"\nSaved atlas: {ATLAS_PATH} ({ATLAS_W}x{ATLAS_H}, {idx} tiles)")

    # Generate JS atlas definition
    js_lines = []
    js_lines.append(f"const ATLAS_W = {ATLAS_W};")
    js_lines.append(f"const ATLAS_H = {ATLAS_H};")
    js_lines.append(f"const TILE_W = {TILE_SIZE};")
    js_lines.append(f"const TILE_H = {TILE_SIZE};")
    js_lines.append("")
    js_lines.append("function rect(x, y) {")
    js_lines.append("  return {")
    js_lines.append("    x: x / ATLAS_W,")
    js_lines.append("    y: 1 - ((y + TILE_H) / ATLAS_H),")
    js_lines.append("    w: TILE_W / ATLAS_W,")
    js_lines.append("    h: TILE_H / ATLAS_H,")
    js_lines.append("  };")
    js_lines.append("}")
    js_lines.append("")
    js_lines.append("export const TILES = [")
    for t in tiles:
        js_lines.append(f"  {{ name: '{t['name']}', ...rect({t['x'] * TILE_SIZE}, {t['y'] * TILE_SIZE}) }},")
    js_lines.append("];")
    js_lines.append("")
    js_lines.append("const NAME_TO_INDEX = new Map(TILES.map((t, i) => [t.name, i]));")
    js_lines.append("")
    js_lines.append("export function getTileIndex(name) {")
    js_lines.append("  return NAME_TO_INDEX.get(name) ?? 0;")
    js_lines.append("}")
    js_lines.append("")
    js_lines.append("export function buildAtlasRectArray() {")
    js_lines.append("  const arr = [];")
    js_lines.append("  for (let i = 0; i < TILES.length; i++) {")
    js_lines.append("    const t = TILES[i];")
    js_lines.append("    arr.push(new THREE.Vector4(t.x, t.y, t.w, t.h));")
    js_lines.append("  }")
    js_lines.append("  while (arr.length < 256) {")
    js_lines.append("    arr.push(new THREE.Vector4(0, 0, 0, 0));")
    js_lines.append("  }")
    js_lines.append("  return arr;")
    js_lines.append("}")

    js_path = os.path.join("voidloop/js", "TerrainAtlas.js")
    with open(js_path, 'w') as f:
        f.write("import * as THREE from 'three';\n\n")
        f.write('\n'.join(js_lines))
        f.write('\n')

    print(f"Generated JS atlas: {js_path}")

    # Print summary
    print(f"\nTotal tiles: {idx}")

if __name__ == '__main__':
    main()
