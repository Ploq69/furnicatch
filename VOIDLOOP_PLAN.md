# Plan: 3D Voidloop — Mining Roguelite with Our Assets

## Game Overview

**Voidloop** is a fast-paced mining roguelite with incremental progression. The player is a lonely Void Spirit who descends into procedural caves, mines terrain, fights enemies, collects gems/resources, and races to reach floor 20. Between runs, they return to a camp hub to upgrade gear, craft items, and unlock skills with the help of a Blacksmith, Shopkeeper, and Witch.

We will build this as a **3D third-person action game** in Three.js, reusing the existing FurniCatch engine (player controller, chunk-based world generation, asset loading, collision, UI system) while pivoting the core loop from "furniture capture" to "mining + combat + incremental progression."

---

## Camera & Perspective

- **Third-person over-the-shoulder** (~3.5m behind, 1.5m up), similar to FurniCatch current setup
- **Lock-on target system** (Right Click) for combat focus
- **Mining reticle** crosshair for targeting blocks/resources
- Free mouse-look with optional snap-to-target during combat

---

## Core Mechanics

### 1. Mining
- Left Click with Pickaxe equipped = mine strike on targeted block/resource node
- Blocks have HP (1-3 hits depending on material: dirt=1, stone=2, crystal=3)
- Mined blocks drop resources (Ore chunks, gems) that are auto-collected on proximity
- Resource nodes glow faintly to indicate rarity

### 2. Combat
- **Melee**: Click with Sword/Axe equipped = swing animation + hitbox sweep arc
- **Ranged**: Click with Pistol/Rifle equipped = projectile firing with aim reticle
- **Dodge**: Space = dodge roll (iframe 0.4s) — reuse FurniCatch dodge
- **Skills**: Q/E/R hotkeys for unlocked active skills (combat abilities, buffs, AoE attacks)
- Enemies have simple AI: Idle wander → Alert on proximity → Chase/Attack → Flee on low HP

### 3. Cave Descent
- Procedurally generated floors using Cube World blocks as tiles
- Each floor has: entry ladder, scattered resources, enemies, treasure chests, exit ladder to next floor
- 5 biomes with distinct block palettes and enemy types
- Optional timer mechanic (soft time limit per floor for bonus rewards)

### 4. Camp Hub (Meta Layer)
- Between runs, player spawns in camp with 3 NPCs
- **Blacksmith**: Upgrade pickaxe tier (Wood→Stone→Iron→Gold→Diamond), upgrade weapon damage
- **Shopkeeper**: Buy consumables (health potions, orb-refills), sell resources for coins
- **Witch**: Unlock/upgrade skills (27 skill tree), apply temporary buffs for next run
- **Skill Tree**: 3 branches — Mining (faster mining, better drops), Combat (damage, crit, dodge), Spirit (HP, stamina, regen)

---

## Asset Mapping — Full List

### PLAYER CHARACTER — "Void Spirit"

| Asset | Pack | Role | Animations Used |
|-------|------|------|-----------------|
| **Ninja_Male** | Ultimate Animated Character Pack | **Default Void Spirit** — hooded, mysterious, fits "void" theme | Idle, Walk, Run, Attack (sword swing as pickaxe/weapon swing), Death, HitRecieve, Jump |
| **Ninja_Female** | Ultimate Animated Character Pack | Unlockable skin | Same anims |
| **Witch** | Ultimate Animated Character Pack | Unlockable skin — thematic for void magic | Same anims |
| **Wizard** | Ultimate Animated Character Pack | Unlockable skin | Same anims |
| **Knight_Male** | Ultimate Animated Character Pack | Heavy armor unlock | Same anims |
| **Elf** | Ultimate Animated Character Pack | Agile void walker unlock | Same anims |
| **Goblin_Male/Female** | Ultimate Animated Character Pack | Funny unlock | Same anims |

> All 52 characters from Ultimate Animated Character Pack are available as unlockable skins, each with 16-17 animations (Idle, Walk, Run, Jump, Attack, Death, HitRecieve, etc.).

---

### WEAPONS — Tool Models Equipped to Hand Socket

| Weapon | Asset | Pack | Attack Style | SFX | VFX |
|--------|-------|------|--------------|-----|-----|
| **Wood Pickaxe** | Pickaxe_Wood | Cube World | Melee swing, 1 block damage | DSGNTonl_USABLE-Generic Item | Small dust puff (particles/opaque/dirt_01) |
| **Stone Pickaxe** | Pickaxe_Stone | Cube World | Melee swing, 2 block damage | DSGNTonl_USABLE-Metallic Item | Dust puff + spark |
| **Iron Pickaxe** | Axe_Stone (reskinned) / Pirate Weapon_Axe | Cube World / Pirate Kit | Melee swing, 2 block damage | FGHTImpt_MELEE-Clap Slapper | Brackeys impact_white |
| **Gold Pickaxe** | Pickaxe_Gold | Cube World | Melee swing, 3 block damage | MAGSpel_CAST-Zap Up | Brackeys electric_ring + wavy_yellow |
| **Diamond Pickaxe** | Pickaxe_Diamond | Cube World | Melee swing, 3 block damage, AoE | DSGNSynth_BUFF-Bonus Crit Chance | Brackeys vortex + star_explosion |
| **Void Sword** | Sword_Diamond | Cube World | Fast melee, 15 dmg | DSGNTonl_MELEE-Sword Critical | Brackeys blood_impact |
| **Pirate Cutlass** | Weapon_Cutlass | Pirate Kit | Medium melee, 20 dmg | SWSH_MOVEMENT-Bamboo Whip | Brackeys big_hit |
| **Combat Rifle** | Weapon_Rifle | Pirate Kit | Ranged projectile, 25 dmg | DSGNImpt_EXPLOSION-Mecha Engine Blast | Brackeys fire_point + muzzle flash (particles/opaque/muzzle_01) |
| **Pistol** | Weapon_Pistol | Pirate Kit | Fast ranged, 12 dmg | DSGNImpt_EXPLOSION-Smaller Flare | Small muzzle flash |
| **Double Shotgun** | Weapon_DoubleShotgun | Pirate Kit | Spread shot, 8×8 dmg | DSGNImpt_EXPLOSION-Bit Bomb | Brackeys explosion_6x5 |
| **Rocket Launcher** | RocketLauncher | Toon Shooter | Slow explosive projectile, 50 dmg AoE | DSGNImpt_EXPLOSION-Crunchy Burst | Brackeys explosion_6x5 + Super Pixel epic_explosion_001 |
| **SMG** | SMG | Toon Shooter | Rapid fire, 5 dmg | DSGNImpt_EXPLOSION-Mecha Multiple Bangs | Rapid muzzle flashes |
| **Sniper** | Sniper | Toon Shooter | Charge-up, 60 dmg | DSGNImpt_EXPLOSION-Phoenix Spark | Brackeys lightstreaks + charge_7x6 |
| **Magic Staff** | Wizard (character holds built-in) / Prop_Cannon | Pirate Kit | Magic projectile, 30 dmg | MAGSpel_CAST-Aura Rise | Super Pixel spell_attack_up + Brackeys wavy_purple |
| **Grenade** | Grenade | Toon Shooter | Thrown AoE, 40 dmg | DSGNImpt_EXPLOSION-Thud | Brackeys explosion_02_8x8 flipbook |

---

### ENEMIES — Cave Dwellers

| Enemy | Asset | Pack | Biome | Behavior | Animations |
|-------|-------|------|-------|----------|------------|
| **Slime Miner** | GreenBlob / PinkBlob | Ultimate Monsters | All (common) | Slow hop chase, bump damage | 8-14 built-in anims (Idle, Walk, Attack, Death) |
| **Cave Bat** | Ghost / Ghost_Skull | Ultimate Monsters (Flying) | All | Dive attack from above, fast | Fly, Attack, Death |
| **Goblin Scout** | Goblin | Cube World Enemies | Grass/Stone caves | Ambush, quick melee | Attack, Idle, Run, Walk, Death |
| **Skeleton Warrior** | Skeleton | Cube World Enemies | Deep/Attic caves | Medium speed, sword swing | Attack, Idle, Run, Walk, Death |
| **Demon Brute** | Demon | Cube World Enemies | Crystal/Fire caves | Heavy slow hitter | Attack, Idle, Run, Walk, Death |
| **Yeti Guard** | Yeti | Cube World Enemies | Ice caves | Charge attack, high HP | Attack, Idle, Run, Walk, Death |
| **Space Drone** | Any Space Kit Character | Ultimate Space Kit | Space biome | Ranged laser | ~15 built-in anims |
| **Pirate Raider** | Pirate_Male/Female | Ultimate Animated | Pirate Cove | Melee + pistol | 17 anims |
| **Zombie Miner** | Zombie_Male/Female | Ultimate Animated | Deep caves | Slow persistent chase | 17 anims |
| **Big Boss: Magma Golem** | Big/Red monster from Ultimate Monsters Big | Ultimate Monsters | Floor 20 boss | Heavy slam, fire projectiles | Built-in anims |
| **Big Boss: Void Wyrm** | Flying/Large dragon-like | Ultimate Monsters Flying | Floor 20 boss | Sweeping breath attack | Built-in anims |

> **Total enemy variety**: 10 base types + 2 bosses, all using existing animated models. Ultimate Monsters alone provides 50 monsters across 3 size classes.

---

### ENVIRONMENT / CAVE BIOMES

#### Biome 1: Grassland Caves (Floors 1-4)
| Element | Asset | Pack |
|---------|-------|------|
| Floor blocks | Block_Grass, Block_Dirt, Block_Stone | Cube World |
| Walls | Block_Brick, Block_GreyBricks, Block_Blank | Cube World |
| Decoration | Tree_1/2/3, Bush, Rock1/2, Grass_Small/Big, Flowers_1/2 | Cube World |
| Structures | Fence_*, Rail_* | Cube World |
| Treasure | Chest_Closed, Chest_Open | Cube World |
| Ore nodes | Block_Coal, Block_Metal | Cube World |

#### Biome 2: Sushi Temple Caves (Floors 5-8)
| Element | Asset | Pack |
|---------|-------|------|
| Floor blocks | Block_WoodPlanks, Block_Stone (reskinned via material) | Cube World |
| Structures | Environment_* walls, counters, buildings | Sushi Restaurant |
| Decoration | Bamboo, Bamboo_Small/Mid | Cube World |
| Food loot | Sushi food items | Sushi Restaurant |
| Characters | Rabbit_* (as friendly NPCs), Panda | Sushi Restaurant |

#### Biome 3: Pirate Cove Caves (Floors 9-12)
| Element | Asset | Pack |
|---------|-------|------|
| Sand floor | Block_Blank with sand material / Pixel Blocks | Cube World |
| Structures | Environment_House*, cliffs, palm trees | Pirate Kit |
| Ships | Ship_Small, Ship_Large | Pirate Kit |
| Props | Prop_Barrel, Prop_Chest_*, Prop_Cannon, Prop_Anchor, Prop_Skull | Pirate Kit |
| Loot | Prop_Coins, Prop_GoldBag, UI_Gold, UI_Gem_* | Pirate Kit |
| Weapons (drops) | Weapon_Cutlass, Weapon_Pistol, Weapon_Rifle, Weapon_DoubleShotgun | Pirate Kit |

#### Biome 4: Toon City Ruins (Floors 13-16)
| Element | Asset | Pack |
|---------|-------|------|
| Ruin walls | BrickWall_*, Debris_*, MetalFence | Toon Shooter |
| Props | TrashContainer_*, GasTank, CardboardBoxes_*, WoodPlanks | Toon Shooter |
| Furniture | Sofa, Sofa_Small | Toon Shooter |
| Enemies | Character_Enemy, Character_Hazmat, Character_Soldier | Toon Shooter |
| Gun drops | AK, SMG, Sniper, RocketLauncher, GrenadeLauncher | Toon Shooter |

#### Biome 5: Space Station / Void Depths (Floors 17-20)
| Element | Asset | Pack |
|---------|-------|------|
| Floor/Platform | Environment dome structures, metal platforms | Ultimate Space Kit |
| Alien flora | Alien plants from Environment | Ultimate Space Kit |
| Vehicles | Space rovers, ships | Ultimate Space Kit |
| Characters | Space characters (12 variants) | Ultimate Space Kit |
| Items | Space items (7 variants) | Ultimate Space Kit |
| Crystal ore | Block_Crystal, Block_Diamond | Cube World |
| Void blocks | Block_Ice, Block_Snow | Cube World |
| Planets (skybox decoration) | Planet models | Ultimate Space Kit |

#### The Camp Hub (Between Runs)
| Element | Asset | Pack |
|---------|-------|------|
| Ground | Block_Grass, Block_Dirt | Cube World |
| Blacksmith tent | Environment_House3 (Pirate) or Sushi building | Pirate Kit / Sushi |
| Shopkeeper stall | Table_RoundSmall + Umbrella (if available) | Ultimate House Interior |
| Witch hut | DeadTree_1/2/3 + Crystal decorations | Cube World |
| Campfire | Procedural particles + Block_Blank logs | — |
| Storage chests | Chest_Closed/Open, Prop_Chest_* | Cube World / Pirate Kit |
| Player bed | Bed_Single | Ultimate House Interior |
| Decor | Houseplant_*, Light_*, Carpet_* | Ultimate House Interior |

---

### LOOT / RESOURCES / ITEMS

| Item | Asset | Pack | Purpose |
|------|-------|------|---------|
| Gold Coin | UI_Gold | Pirate Kit | Currency |
| Gem (blue) | UI_Gem_Blue | Pirate Kit | Premium currency / craft mat |
| Gem (green) | UI_Gem_Green | Pirate Kit | Craft material |
| Gem (pink) | UI_Gem_Pink | Pirate Kit | Rare craft material |
| Ore Chunk | Block_Coal / Block_Metal / Block_Stone | Cube World | Crafting base material |
| Crystal | Block_Crystal / Block_Diamond | Cube World | Rare crafting material |
| Gold Bag | Prop_GoldBag | Pirate Kit | Big loot drop |
| Health Potion | Prop_Bottle_1/2 | Pirate Kit | Healing consumable |
| Key | Key | Cube World | Unlock treasure rooms |
| Treasure Chest | Prop_Chest_Closed / Chest_Closed | Pirate Kit / Cube World | Loot containers |
| Furniture (decorative loot) | 123 House Interior models | Ultimate House Interior | Camp decoration unlocks |

---

### VISUAL EFFECTS — Full VFX Mapping

#### Combat VFX
| Event | VFX Asset | Source |
|-------|-----------|--------|
| Sword swing trail | Brackeys `lightstreaks_6x5` (predrawn spritesheet, billboard) | brackeys_vfx_bundle |
| Melee hit impact | Brackeys `impact_white_6x4` or `big_hit_6x5` | brackeys_vfx_bundle |
| Blood/creature hit | Brackeys `blood_impact_6x5` | brackeys_vfx_bundle |
| Gun muzzle flash | Brackeys `particles/opaque/muzzle_01`–`muzzle_05` | brackeys_vfx_bundle |
| Projectile trail | Brackeys `particles/alpha/trace_01_a`–`trace_06_a` | brackeys_vfx_bundle |
| Explosion (small) | Brackeys `explosion_6x5` (predrawn) OR `explosion_01_8x8` flipbook | brackeys_vfx_bundle |
| Explosion (large) | Super Pixel `epic_explosion_001` spritesheet | Super Pixel Effects |
| Magic projectile | Brackeys `wavy_purple_6x5` or `wavy_blue_6x5` | brackeys_vfx_bundle |
| Magic hit | Super Pixel `spell_attack_up_001` | Super Pixel Effects |
| Charge-up effect | Brackeys `charge_7x6` | brackeys_vfx_bundle |
| Electric damage | Brackeys `electric_ring_6x5` + Super Pixel `lightning_burst_001` | Both |
| Fire damage | Brackeys `fire_ring_6x5` + `fire_point_6x5` | brackeys_vfx_bundle |
| Enemy death poof | Brackeys `dithered_fire_6x5` or Super Pixel `smoke_burst` | Both |
| Critical hit sparkle | Super Pixel `magic_burst` / `round_sparkle_burst` | Super Pixel Effects |
| Skill AoE burst | Brackeys `star_explosion_6x5` + `vortex_6x5` | brackeys_vfx_bundle |

#### Mining VFX
| Event | VFX Asset | Source |
|-------|-----------|--------|
| Block crack | Brackeys `particles/opaque/scratch_01` + `scorch_01` | brackeys_vfx_bundle |
| Block break dust | Brackeys `particles/opaque/dirt_01`–`dirt_03` | brackeys_vfx_bundle |
| Ore sparkle (rare) | Brackeys `particles/opaque/spark_01`–`spark_07` | brackeys_vfx_bundle |
| Gem pickup glow | Brackeys `particles/opaque/magic_01`–`magic_05` | brackeys_vfx_bundle |

#### Environment VFX
| Event | VFX Asset | Source |
|-------|-----------|--------|
| Campfire | Brackeys `fire_01_8x8` flipbook + `flame_01_16x4` | brackeys_vfx_bundle |
| Torch light flicker | Brackeys `fire_point_6x5` | brackeys_vfx_bundle |
| Cave fog | Brackeys `wispy_smoke_01_8x8` flipbook (particle field) | brackeys_vfx_bundle |
| Lava/fire biome | Brackeys `fire_02_8x8`, `fire_03_8x8`, `flame_02_15x4` | brackeys_vfx_bundle |
| Smoke from destroyed block | Brackeys `explosion_smoke_01_8x8` | brackeys_vfx_bundle |
| Crystal glow pulse | Brackeys `particles/opaque/flare_01` + `star_01` | brackeys_vfx_bundle |
| Space stars | Procedural particle field (custom) | Custom |

#### UI / Status VFX
| Event | VFX Asset | Source |
|-------|-----------|--------|
| Level up | Super Pixel `magic_burst_001` / `round_heart_burst` | Super Pixel Effects |
| Upgrade sparkle | Super Pixel `symbol_alert_001` | Super Pixel Effects |
| Damage taken red flash | Brackeys `blood_impact_6x5` (full-screen overlay) | brackeys_vfx_bundle |
| Healing green pulse | Super Pixel `directional_bubble_burst_001` | Super Pixel Effects |
| Buff activated | Super Pixel `spell_attack_up_001` | Super Pixel Effects |

---

### SOUND EFFECTS — Full SFX Mapping

#### Combat SFX
| Event | Sound Category | Specific Sounds |
|-------|---------------|-----------------|
| Sword swing | SWSH / WHSH | `MOVEMENT-Bamboo Whip`, `MOVEMENT-Bubble Laser Swish` |
| Sword hit | FGHTImpt | `HIT-Smack`, `HIT-Strong Punch`, `MELEE-Clap Slapper` |
| Gun shot | DSGNImpt | `EXPLOSION-Bit Bomb`, `EXPLOSION-Smaller Flare`, `EXPLOSION-Mecha Engine Blast` |
| Explosion | DSGNImpt | `EXPLOSION-Crunchy Burst`, `EXPLOSION-Bass Hit`, `EXPLOSION-Electric Hit` |
| Magic cast | MAGSpel | `CAST-Aura Rise`, `CAST-Zap Up`, `CAST-Strong Energy` |
| Magic hit | DSGNTonl | `SKILL IMPACT-Magic Sparkles`, `SKILL IMPACT-Star Sparkle` |
| Enemy hurt | DSGNMisc | `HIT-Bitcrusher`, `HIT-Fleeting Hit`, `HIT-Noisy Hit` |
| Enemy death | DSGNImpt | `EXPLOSION-Flare Extinguish`, `EXPLOSION-Forced Interruption` |
| Critical hit | DSGNSynth | `BUFF-Bonus Crit Chance` |
| Skill activation | MAGSpel / MAGAngl | `CAST-High Powering Up`, `BUFF-Buff Pickup` |
| Dodge roll | WHSH | `MOVEMENT-Simple Whoosh`, `MOVEMENT-Wind Sweep Swish` |

#### Mining SFX
| Event | Sound Category | Specific Sounds |
|-------|---------------|-----------------|
| Pickaxe swing | SWSH / WHSH | `MOVEMENT-Bamboo Whip` |
| Block hit (stone) | FGHTImpt | `HIT-Swish Clap`, `HIT-Synth Hit` |
| Block hit (metal) | DSGNTonl | `SKILL IMPACT-Metallic Bubble` |
| Block break | DSGNImpt | `EXPLOSION-Grainy Burst`, `EXPLOSION-Thud` |
| Ore collect | DSGNTonl | `USABLE-Coin Toss`, `USABLE-Coin Zap`, `USABLE-Magic Coin` |
| Gem collect | MAGSpel | `CAST-Tweety Cast`, `CAST-Zippy Particle` |
| Rare drop | MAGAngl | `BUFF-Buff Drop` |

#### Movement / Environment SFX
| Event | Sound Category | Specific Sounds |
|-------|---------------|-----------------|
| Footstep grass | FEETMisc | `STEP-Boots on Generic Ground` |
| Footstep stone | FEETMisc | `STEP-Boots on Concrete`, `STEP-Boots on Concrete Dungeon` |
| Footstep wood | FEETMisc | `STEP-Boots on Wood` (if exists, else generic) |
| Jump | WHSH | `MOVEMENT-Simple Whoosh` |
| Land | DSGNImpt | `EXPLOSION-Thud` |
| Enemy alert | DSGNMisc | `CAST-Noise Summon`, `CAST-Panicked` |
| Enemy chase | DSGNMisc | `MOVEMENT-Sparkling By` |

#### UI / Meta SFX
| Event | Sound Category | Specific Sounds |
|-------|---------------|-----------------|
| Menu click | UIClick | `INTERFACE-Metallic Click`, `INTERFACE-Positive Click` |
| Menu denied | UIMisc | `INTERFACE-Denied`, `INTERFACE-Lock` |
| Upgrade purchased | DSGNTonl | `USABLE-Mecha Upgrade Equip`, `USABLE-Magic Item` |
| Item crafted | UIGlitch | `USABLE-Mecha Repair`, `USABLE-Glassy Click` |
| Level up | MAGSpel | `CAST-Skill Ready`, `CAST-Growing Strength` |
| Coin pickup | DSGNTonl | `USABLE-Coin Spend`, `USABLE-Zappy Coin` |
| Chest open | DSGNTonl | `USABLE-Generic Item`, `USABLE-Metallic Item` |
| Timer warning | DSGNSynth | `BUFF-Bird Buff` (urgent chirp) |
| Game over / retreat | UIMisc | `INTERFACE-Denied` + DSGNImpt `EXPLOSION-Forced Shutdown` |

#### Ambient (layered loops)
| Biome | SFX Sources |
|-------|-------------|
| Grassland | DSGNMisc `CAST-Birdsong` (sparse), WHSH wind passbys |
| Temple | DSGNMisc `CAST-Underwater` (muffled), MAGSpel ambient casts |
| Pirate | WHSH `MOVEMENT-Mecha Ship Passby` (distant), DSGNMisc watery sounds |
| City Ruins | DSGNMisc `HIT-Noise` industrial ambience, DSGNSynth drone |
| Space/Void | DSGNSynth drones, MAGSpel ethereal casts, silence gaps |
| Camp | DSGNMisc `CAST-Critter Transformation` (friendly), fire crackle (synth) |

---

## Development Plan — 4 Phases

### Phase 1: Core Loop — Mining + Combat (Week 1)
- [ ] Fork FurniCatch engine: strip vocab/orb capture, keep player controller, camera, collision
- [ ] Block mining system: raycast from camera, block HP, break animation, resource drop
- [ ] Weapon equipping: attach tool/weapon model to player hand socket
- [ ] Melee combat: swing animation + arc hitbox detection + damage
- [ ] Ranged combat: projectile spawn, trajectory, collision, damage
- [ ] Basic enemy: Goblin (Cube World) with Idle→Chase→Attack AI
- [ ] Death/respawn: return to camp on 0 HP
- [ ] SFX integration: map 20 key sounds via AudioManager
- [ ] VFX integration: hit impacts, mining dust, muzzle flashes via ParticleSystem

### Phase 2: Cave Generation + Biomes (Week 2)
- [ ] Procedural floor generator: room-and-corridor or cellular automata using Cube World blocks
- [ ] 5 biome palettes with distinct block types, enemy spawns, loot tables
- [ ] Ladder descent system: find exit, load next floor
- [ ] Resource spawning: ore nodes, gems, chests with proper rarity weights
- [ ] All enemy types integrated with biome-appropriate spawns
- [ ] Post-processing per biome: fog color, bloom, lighting
- [ ] VFX: biome atmosphere (smoke, fire, crystals), enemy death effects

### Phase 3: Camp Hub + Incremental Progression (Week 3)
- [ ] Camp scene with 3 NPCs (Blacksmith=Knight_Male, Shopkeeper=Casual_Male, Witch=Witch character)
- [ ] Upgrade system: pickaxe tiers, weapon damage, HP/stamina upgrades
- [ ] Skill tree: 3 branches (Mining/Combat/Spirit), ~27 skills total
- [ ] Crafting: combine resources into items/buffs
- [ ] Save/load: localStorage for player progress, unlocked skins, upgrades
- [ ] Collection log: enemies defeated, items found, floors reached
- [ ] NPC dialog UI with character portraits (CharPreview reuse)

### Phase 4: Polish + Content (Week 4)
- [ ] All 52 character skins unlockable (achievements, gem purchases)
- [ ] All weapons integrated with full SFX/VFX mapping
- [ ] Boss fights: Floor 20 Magma Golem + Void Wyrm with unique attack patterns
- [ ] Full SFX library mapped (~100 sounds actively used)
- [ ] Full VFX library mapped (all Brackeys + Super Pixel effects)
- [ ] Music: synthesized ambient loops per biome (Web Audio API)
- [ ] Mobile touch controls
- [ ] Tutorial run
- [ ] Performance pass: instancing, culling, LOD

---

## Technical Architecture (Reuses FurniCatch)

| System | FurniCatch Component | Voidloop Adaptation |
|--------|---------------------|---------------------|
| Renderer | `Game.js` Three.js setup | Keep + add post-processing per biome |
| Asset Loading | `AssetLoader.js` + `assets.json` | Add weapon/tool entries, FBXLoader for House Interior |
| Player Controller | `Player.js` | Add weapon states, mining raycast, combat hitboxes |
| Input | `InputManager.js` | Add weapon hotkeys (1-4), skill hotkeys (Q/E/R) |
| World Gen | `World.js` chunk system | Pivot from surface terrain to cave room generation |
| Camera | `AimController.js` | Keep lock-on, add mining reticle mode |
| UI | `UIManager.js` | Replace vocab modal with HUD (HP, stamina, resources, minimap) |
| Particles | `ParticleSystem.js` | Expand with Brackeys flipbook + sprite support |
| Audio | `AudioManager.js` | Map all 13 SFX categories |
| Collision | Custom AABB + sphere | Add weapon swing arc collision |
| State | `CollectionStore.js` | Expand to full progression save |

---

## Performance Budget

- Target: 60fps on mid-tier laptops
- Max blocks rendered: ~5,000 (instanced Cube World blocks)
- Max enemies per floor: 15
- Max particles per effect: 32 (Brackeys spritesheets are efficient)
- Shadow map: 1024×1024, PCFSoft
- Pixel ratio capped at 2
- Reuse: One geometry/material per block type, one per enemy type

---

## Why This Approach Works

1. **Asset completeness**: Every system has mapped assets — no placeholders needed. We have 565 glTF models, 2,100 sounds, 200+ VFX sprites, and 52 animated characters.
2. **Engine reuse**: FurniCatch already has player controller, world generation, collision, asset loading, UI, and audio. We pivot the game loop, not rebuild the engine.
3. **Progressive scope**: Phase 1 is playable (mine + fight). Each phase adds depth without breaking previous work.
4. **Visual cohesion**: All assets are low-poly (Cube World, Ultimate packs, Pirate Kit share similar poly counts and style).
5. **Audio richness**: 13 categories of pixel-combat SFX map perfectly to mining/hitting/shooting/exploding gameplay.
