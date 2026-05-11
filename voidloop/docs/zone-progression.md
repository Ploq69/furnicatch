# Voidloop — Zone Progression System Design Document

> **Version:** 1.0  
> **Last Updated:** 2026-05-10  
> **Purpose:** Source of truth for all zone, block, pickaxe, resource, and progression definitions.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Zone Definitions](#2-zone-definitions)
3. [Zone Progression Gates](#3-zone-progression-gates)
4. [Pickaxe Tier System](#4-pickaxe-tier-system)
5. [Resource System](#5-resource-system)
6. [Letter & Pet System](#6-letter--pet-system)
7. [Enemy System](#7-enemy-system)
8. [Hazard System](#8-hazard-system)
9. [Save Data Schema](#9-save-data-schema)
10. [Asset Mapping](#10-asset-mapping)
11. [Implementation Phases](#11-implementation-phases)

---

## 1. Overview

The game has **7 zones** in a linear progression, covering all 26 letters of the alphabet:

| Zone | Name | Letters | Theme Color |
|------|------|---------|-------------|
| 1 | Whispering Forest | **A–D** | Green |
| 2 | Ember Wastes | **E–H** | Red |
| 3 | Frostpeak | **I–L** | Blue |
| 4 | Sandscape | **M–P** | Gold |
| 5 | Steelworks | **Q–T** | Steel Grey |
| 6 | Mire | **U–X** | Moss Green |
| 7 | Citadel | **Y–Z** | Sandstone Gold |

Each zone contains:
- **4 letters** of the alphabet (spelling challenge content)
- **4 unique floating block types** (core mining loop), gated by pickaxe tier
- **2 enemy types**
- **1 zone-specific pickaxe** (bought in shop after unlocking the zone)
- **1 environmental hazard** (starting Zone 2)
- **4 unique resources** dropped by floating blocks

### Core Loop per Zone

1. Enter zone with base pickaxe → can only mine Tier 1 floating blocks
2. Mine Tier 1 blocks → collect resources + coins + letters (25% drop chance)
3. Spell words → earn coins, progress toward pet unlocks (10 correct per letter)
4. Sell resources / grind coins → buy pickaxe upgrade in shop
5. Upgrade pickaxe → unlock Tier 2 blocks → better resources
6. Repeat T2→T3→T4
7. Mine all block tiers, spell all 4 letters, defeat enemies → zone complete
8. Next zone unlocks in shop → buy its pickaxe → repeat

---

## 2. Zone Definitions

### Zone 1: Whispering Forest

| Property | Value |
|----------|-------|
| **Order** | 1 |
| **Letters** | A, B, C, D |
| **Fog Color** | `0x87ceeb` (sky blue) |
| **Bounds** | x: -60 to 0, z: -60 to 60 |
| **Spawn Point** | (-30, 0, 0) |
| **Ground Blocks** | grass, dirt, stone, wood |
| **Enemies** | Goblin Scout, Slime Miner |
| **Hazard** | None |
| **Gateway** | At x = -2, leads to Zone 2 |

**Floating Blocks:**

| Tier | Block Name | HP | Pickaxe | Resource | Coins |
|------|-----------|-----|---------|----------|-------|
| 1 | Mossy Stone | 5 | Forest T1 | Moss Chip | 5 |
| 2 | Forest Crystal | 7 | Forest T2 | Crystal Shard | 10 |
| 3 | Amber Ore | 10 | Forest T3 | Amber | 20 |
| 4 | Ancient Wood | 12 | Forest T4 | Ancient Bark | 35 |

**Shop:**
- Forest Pickaxe T1 — **Free (starter)**
- Forest Pickaxe T2 — 150 coins
- Forest Pickaxe T3 — 400 coins
- Forest Pickaxe T4 — 800 coins

---

### Zone 2: Ember Wastes

| Property | Value |
|----------|-------|
| **Order** | 2 |
| **Letters** | E, F, G, H |
| **Fog Color** | `0x2a1a1a` (dark red) |
| **Bounds** | x: 0 to 60, z: -60 to 60 |
| **Spawn Point** | (10, 0, 0) |
| **Ground Blocks** | lava, stone_dark, coal, brick |
| **Enemies** | Demon Brute, Cave Bat |
| **Hazard** | Burn: 5 HP/s without Fire Suit |
| **Gateway** | At x = 0, requires Zone 1 complete |

**Floating Blocks:**

| Tier | Block Name | HP | Pickaxe | Resource | Coins |
|------|-----------|-----|---------|----------|-------|
| 1 | Scorched Rock | 5 | Fire T1 | Ash | 8 |
| 2 | Magma Crystal | 7 | Fire T2 | Magma Shard | 15 |
| 3 | Obsidian | 10 | Fire T3 | Obsidian Fragment | 30 |
| 4 | Ember Core | 12 | Fire T4 | Ember Essence | 50 |

**Shop:**
- Fire Pickaxe T1 — 300 coins
- Fire Pickaxe T2 — 500 coins
- Fire Pickaxe T3 — 1000 coins
- Fire Pickaxe T4 — 2000 coins
- Fire Suit — 800 coins
- Fire Staff — 600 coins

---

### Zone 3: Frostpeak

| Property | Value |
|----------|-------|
| **Order** | 3 |
| **Letters** | I, J, K, L |
| **Fog Color** | `0xaaddff` (ice blue) |
| **Bounds** | x: -60 to 60, z: -180 to -60 |
| **Spawn Point** | (0, 0, -120) |
| **Ground Blocks** | ice, snow, stone, water |
| **Enemies** | Yeti Guard, Ice Bat |
| **Hazard** | Freeze: movement -30% without Ice Suit |
| **Gateway** | At z = -60, requires Zone 2 complete |

**Floating Blocks:**

| Tier | Block Name | HP | Pickaxe | Resource | Coins |
|------|-----------|-----|---------|----------|-------|
| 1 | Packed Ice | 5 | Ice T1 | Ice Chunk | 10 |
| 2 | Frost Crystal | 7 | Ice T2 | Frost Shard | 20 |
| 3 | Glacial Ore | 10 | Ice T3 | Glacial Metal | 40 |
| 4 | Blizzard Core | 12 | Ice T4 | Blizzard Essence | 65 |

**Shop:**
- Ice Pickaxe T1 — 600 coins
- Ice Pickaxe T2 — 1000 coins
- Ice Pickaxe T3 — 2000 coins
- Ice Pickaxe T4 — 4000 coins
- Ice Suit — 1200 coins
- Ice Staff — 900 coins

---

### Zone 4: Sandscape

| Property | Value |
|----------|-------|
| **Order** | 4 |
| **Letters** | M, N, O, P |
| **Fog Color** | `0xe6c288` (sand gold) |
| **Bounds** | x: -60 to 60, z: 60 to 180 |
| **Spawn Point** | (0, 0, 120) |
| **Ground Blocks** | sand_A, sand_B, stone, brick |
| **Enemies** | Scorpion, Sand Wraith |
| **Hazard** | Heat: stamina -10/s without Desert Suit |
| **Gateway** | At z = 60, requires Zone 3 complete |

**Floating Blocks:**

| Tier | Block Name | HP | Pickaxe | Resource | Coins |
|------|-----------|-----|---------|----------|-------|
| 1 | Sandstone | 5 | Desert T1 | Sand | 12 |
| 2 | Desert Crystal | 7 | Desert T2 | Desert Shard | 25 |
| 3 | Gold Ore | 10 | Desert T3 | Gold Nugget | 50 |
| 4 | Sun Core | 12 | Desert T4 | Solar Essence | 80 |

**Shop:**
- Desert Pickaxe T1 — 1000 coins
- Desert Pickaxe T2 — 2000 coins
- Desert Pickaxe T3 — 4000 coins
- Desert Pickaxe T4 — 8000 coins
- Desert Suit — 2000 coins
- Desert Staff — 1500 coins

---

### Zone 5: Steelworks

| Property | Value |
|----------|-------|
| **Order** | 5 |
| **Letters** | Q, R, S, T |
| **Fog Color** | `0x4a5568` (steel blue-grey) |
| **Bounds** | x: 60 to 180, z: -60 to 60 |
| **Spawn Point** | (120, 0, 0) |
| **Ground Blocks** | prototype, metal, stone_dark, gravel |
| **Enemies** | Rust Golem, Gear Bat |
| **Hazard** | Toxic fumes: 4 HP/s without Ventilator Suit |
| **Gateway** | At x = 60, requires Zone 4 complete |

**Floating Blocks:**

| Tier | Block Name | HP | Pickaxe | Resource | Coins |
|------|-----------|-----|---------|----------|-------|
| 1 | Rusted Scrap | 5 | Steel T1 | Rust Chunk | 15 |
| 2 | Factory Crystal | 7 | Steel T2 | Gear Shard | 30 |
| 3 | Alloy Ore | 10 | Steel T3 | Alloy Ingot | 60 |
| 4 | Furnace Core | 12 | Steel T4 | Furnace Ember | 100 |

**Shop:**
- Steel Pickaxe T1 — 2000 coins
- Steel Pickaxe T2 — 4000 coins
- Steel Pickaxe T3 — 8000 coins
- Steel Pickaxe T4 — 15000 coins
- Ventilator Suit — 3000 coins
- Tesla Staff — 2500 coins

---

### Zone 6: Mire

| Property | Value |
|----------|-------|
| **Order** | 6 |
| **Letters** | U, V, W, X |
| **Fog Color** | `0x5a7a5a` (moss green) |
| **Bounds** | x: 60 to 180, z: -180 to -60 |
| **Spawn Point** | (120, 0, -120) |
| **Ground Blocks** | dirt, wood, water, gravel |
| **Enemies** | Bog Ogre, Swamp Bat |
| **Hazard** | Quicksand: movement slow + stamina drain without Wading Boots |
| **Gateway** | At z = -60, requires Zone 5 complete |

**Floating Blocks:**

| Tier | Block Name | HP | Pickaxe | Resource | Coins |
|------|-----------|-----|---------|----------|-------|
| 1 | Mud Clump | 5 | Mire T1 | Mud Pie | 18 |
| 2 | Moss Crystal | 7 | Mire T2 | Moss Clump | 35 |
| 3 | Petrified Log | 10 | Mire T3 | Petrified Bark | 70 |
| 4 | Heart of the Mire | 12 | Mire T4 | Mire Essence | 120 |

**Shop:**
- Mire Pickaxe T1 — 3500 coins
- Mire Pickaxe T2 — 7000 coins
- Mire Pickaxe T3 — 14000 coins
- Mire Pickaxe T4 — 25000 coins
- Wading Boots — 5000 coins
- Vine Staff — 4000 coins

---

### Zone 7: Citadel

| Property | Value |
|----------|-------|
| **Order** | 7 |
| **Letters** | Y, Z |
| **Fog Color** | `0xd4a574` (warm sandstone gold) |
| **Bounds** | x: 60 to 180, z: 60 to 180 |
| **Spawn Point** | (120, 0, 120) |
| **Ground Blocks** | bricks_A, bricks_B, stone, stone_dark |
| **Enemies** | Castle Knight, Griffin |
| **Hazard** | Curse: random stuns without Royal Shield |
| **Gateway** | At z = 60, requires Zone 6 complete |

**Floating Blocks:**

| Tier | Block Name | HP | Pickaxe | Resource | Coins |
|------|-----------|-----|---------|----------|-------|
| 1 | Castle Brick | 5 | Royal T1 | Brick Chip | 20 |
| 2 | Royal Crystal | 7 | Royal T2 | Royal Shard | 40 |
| 3 | Gold Ore | 10 | Royal T3 | Gold Nugget | 80 |
| 4 | Crown Core | 12 | Royal T4 | Crown Jewel | 150 |

**Shop:**
- Royal Pickaxe T1 — 5000 coins
- Royal Pickaxe T2 — 10000 coins
- Royal Pickaxe T3 — 20000 coins
- Royal Pickaxe T4 — 40000 coins
- Royal Shield — 8000 coins
- Scepter — 6000 coins

---

## 3. Zone Progression Gates

| To Unlock | Requirement |
|-----------|-------------|
| Zone 2 | Spell all 4 Forest letters + defeat all Forest enemies |
| Zone 3 | Spell all 4 Fire letters + defeat all Fire enemies |
| Zone 4 | Spell all 4 Ice letters + defeat all Ice enemies |
| Zone 5 | Spell all 4 Desert letters + defeat all Desert enemies |
| Zone 6 | Spell all 4 Steelworks letters + defeat all Steelworks enemies |
| Zone 7 | Spell all 4 Mire letters + defeat all Mire enemies |

Zone 1 (Forest) is available from the start. Forest Pickaxe T1 is starting equipment.

---

## 4. Pickaxe Tier System

Each zone has its own pickaxe line. Upgrades are bought in the shop with coins.

| Tier | Damage | Blocks Mineable |
|------|--------|-----------------|
| T1 | Base (1) | Tier 1 only |
| T2 | +1 (2 total) | Tier 1–2 |
| T3 | +2 (3 total) | Tier 1–3 |
| T4 | +4 (5 total) | All tiers (1-hit T1, 2-hit T2, 3-hit T3, 3-hit T4) |

**Global Mining Speed Upgrade:**
- Max level 5, +10% per level
- Affects swing cooldown for ALL zones
- Base: 0.35s → L5: 0.23s

---

## 5. Resource System

Each floating block drops **1 resource unit** + coins on break.

| Zone | T1 Resource | T2 Resource | T3 Resource | T4 Resource |
|------|-------------|-------------|-------------|-------------|
| Forest | Moss Chip | Crystal Shard | Amber | Ancient Bark |
| Fire | Ash | Magma Shard | Obsidian Fragment | Ember Essence |
| Ice | Ice Chunk | Frost Shard | Glacial Metal | Blizzard Essence |
| Desert | Sand | Desert Shard | Gold Nugget | Solar Essence |
| Steelworks | Rust Chunk | Gear Shard | Alloy Ingot | Furnace Ember |
| Mire | Mud Pie | Moss Clump | Petrified Bark | Mire Essence |
| Citadel | Brick Chip | Royal Shard | Gold Nugget | Crown Jewel |

**Resource Uses:**
- Sell for coins at camp
- Future crafting system (out of scope)

---

## 6. Letter & Pet System

### Letter Drops
- **Floating blocks:** 25% chance to drop a zone letter
- **Ground blocks:** 5% chance (or no drops — TBD)
- **Enemy kills:** 15% chance
- Each zone only drops its own letters

### Pet Unlock
- Each letter has a pet (A through Z)
- **Unlock gate: 10 correct spellings** for that letter
- Pet levels after unlock: based on additional correct spellings
  - L1: 0 after unlock
  - L2: 5 after unlock
  - L3: 12 after unlock
  - L4: 25 after unlock
  - L5: 45 after unlock

---

## 7. Enemy System

| Zone | Enemy 1 | HP | Dmg | Enemy 2 | HP | Dmg |
|------|---------|-----|-----|---------|-----|-----|
| Forest | Goblin | 45 | 8 | Slime | 30 | 5 |
| Fire | Demon | 80 | 14 | Bat | 20 | 6 |
| Ice | Yeti | 100 | 18 | Ice Bat | 25 | 7 |
| Desert | Scorpion | 70 | 12 | Sand Wraith | 55 | 10 |
| Steelworks | Rust Golem | 90 | 16 | Gear Bat | 30 | 8 |
| Mire | Bog Ogre | 120 | 20 | Swamp Bat | 65 | 12 |
| Citadel | Castle Knight | 110 | 18 | Griffin | 80 | 14 |

Starting Zone 2, enemies require the zone-specific staff to damage.

---

## 8. Hazard System

| Zone | Hazard | Effect | Mitigation Item |
|------|--------|--------|-----------------|
| Forest | None | — | — |
| Fire | Burn | 5 HP/s | Fire Suit |
| Ice | Freeze | Movement -30% | Ice Suit |
| Desert | Heat | Stamina -10/s | Desert Suit |
| Steelworks | Toxic Fumes | 4 HP/s | Ventilator Suit |
| Mire | Quicksand | Movement slow + stamina drain | Wading Boots |
| Citadel | Curse | Random stuns | Royal Shield |

---

## 9. Save Data Schema

```json
{
  "zones": {
    "forest": { "unlocked": true, "completed": false },
    "fire": { "unlocked": false, "completed": false },
    "ice": { "unlocked": false, "completed": false },
    "desert": { "unlocked": false, "completed": false },
    "steelworks": { "unlocked": false, "completed": false },
    "mire": { "unlocked": false, "completed": false },
    "citadel": { "unlocked": false, "completed": false }
  },
  "pickaxes": {
    "forest": { "tier": 1 },
    "fire": { "tier": 0 },
    "ice": { "tier": 0 },
    "desert": { "tier": 0 },
    "steelworks": { "tier": 0 },
    "mire": { "tier": 0 },
    "citadel": { "tier": 0 }
  },
  "resources": {
    "moss_chip": 0, "crystal_shard": 0, "amber": 0, "ancient_bark": 0,
    "ash": 0, "magma_shard": 0, "obsidian_fragment": 0, "ember_essence": 0,
    "ice_chunk": 0, "frost_shard": 0, "glacial_metal": 0, "blizzard_essence": 0,
    "sand": 0, "desert_shard": 0, "gold_nugget": 0, "solar_essence": 0,
    "rust_chunk": 0, "gear_shard": 0, "alloy_ingot": 0, "furnace_ember": 0,
    "mud_pie": 0, "moss_clump": 0, "petrified_bark": 0, "mire_essence": 0,
    "brick_chip": 0, "royal_shard": 0, "crown_jewel": 0
  },
  "pets": {
    "A": { "unlocked": false, "spellingsCorrect": 0, "spellingsAttempted": 0, "level": 1 },
    ...
  },
  "shop": {
    "upgradeLevels": { "mine_speed": 0, "pick_tier": 0 },
    "coins": 0
  }
}
```

---

## 10. Asset Mapping

### KayKit BlockBits (primary block source)

| Zone | Ground Blocks | Floating Blocks |
|------|--------------|-----------------|
| Forest | grass, dirt, stone, wood | tree, decorative_block_green, stone_with_gold, colored_block_green |
| Fire | lava, stone_dark, bricks_A, gravel | lava, decorative_block_red, stone_with_copper, colored_block_red |
| Ice | snow, stone, dirt_with_snow, water | snow, decorative_block_blue, stone_with_silver, colored_block_blue |
| Desert | sand_A, sand_B, stone, gravel | sand_A, decorative_block_yellow, stone_with_gold, colored_block_yellow |
| Steelworks | prototype, metal, stone_dark, gravel | metal, glass, prototype, striped_block_blue |
| Mire | dirt, wood, water, gravel | tree, dirt, colored_block_green, stone_with_copper |
| Citadel | bricks_A, bricks_B, stone, stone_dark | stone_with_gold, decorative_block_red, bricks_A, striped_block_yellow |

### Enemy Models

| Enemy | Model Source |
|-------|-------------|
| Goblin | KayKit Adventurers / Rogue |
| Slime | Ultimate Monsters / Blob / GreenBlob |
| Demon | KayKit Adventurers / Barbarian |
| Bat | Ultimate Monsters / Flying / Ghost |
| Yeti | KayKit Adventurers / Barbarian (scaled) |
| Ice Bat | Ultimate Monsters / Flying / Ghost (recolored) |
| Scorpion | TBD — may reuse existing model |
| Sand Wraith | TBD — may reuse existing model |
| Rust Golem | KayKit Adventurers / Barbarian (recolored) |
| Gear Bat | Ultimate Monsters / Flying / Ghost (recolored) |
| Bog Ogre | KayKit Adventurers / Barbarian (scaled) |
| Swamp Bat | Ultimate Monsters / Flying / Ghost (recolored) |
| Castle Knight | KayKit Adventurers / Rogue_Hooded |
| Griffin | Ultimate Monsters / Flying / Ghost (scaled) |

---

## 11. Implementation Phases

### Phase 1: Foundation
- Implement 7-zone definitions in `ZoneData.js`
- Add all 28 floating block types to `BLOCK_TYPES` with proper HP
- Add zone-specific pickaxes as shop items
- Add resource inventory system
- Configure fog colors, bounds, spawn points, ground blocks, enemies, hazards

### Phase 2: Core Loop
- Wire pickaxe tier to block mineability
- Implement 25% letter drop from floating blocks
- Implement 10-spelling pet unlock with progress tracking
- Make shop upgrades apply to player stats
- Wire zone progression gates

### Phase 3: Polish
- Balance coin costs and drop rates
- Add resource sell UI
- Add pet unlock progress UI in Pet Den

### Phase 4: Validation Scripts (MANDATORY)

Python scripts in `scripts/zone_progression/`:

1. `zone_definitions.py` — All 7 zones exist with correct data
2. `block_types.py` — All 28 floating blocks exist with correct HP
3. `pickaxe_gating.py` — Pickaxe tiers correctly gate blocks
4. `letter_drops.py` — 25% drop rate, zone-locked letters
5. `pet_unlock.py` — 10-spelling unlock gate
6. `shop_upgrades.py` — Upgrades modify Player stats
7. `progression_gates.py` — Gates check spelling + enemies
8. `no_placeholders.py` — No TODO/FIXME/placeholder strings
9. `save_persistence.py` — Save/load works for all new data

**All 9 scripts must pass.**
