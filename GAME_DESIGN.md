# 🪑 FURNICATCH — Game Design Document
## Incremental English Furniture Vocabulary ARPG

> **Inspiration:** Pokémon Legends: Arceus (3rd-person real-time capture ARPG)
> **Core Hook:** Hunt down animated furniture creatures in procedural zones, capture them by correctly typing their English names, and build your furniture empire back at base.

---

## 1. CONCEPT ELEVATOR PITCH

You are a **Furniture Hunter** in a world where everyday furniture has come to life and fled into the wild. Your job: venture into themed biomes (living rooms, kitchens, gardens, space stations), track down rogue furniture, and toss **Capture Orbs** at them. When an orb connects, the furniture freezes and challenges you to type its English name correctly. Get it right — you capture it, earn coins, and add it to your collection. Get it wrong — it flees or attacks!

Between runs, you return to your **Home Base** (incremental idle layer), where your captured furniture generates passive income, you upgrade your hunter gear, and unlock harder biomes with rarer furniture.

---

## 2. THE GAME LOOP

### 2.1 Core Loop (60–180 seconds per encounter)

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   SPAWN     │───▶│   EXPLORE    │───▶│  ENCOUNTER  │───▶│   CAPTURE    │
│  into Zone  │    │ 3rd-person   │    │ Aim & Toss  │    │ Type Vocab   │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
       ▲                                                                  │
       └──────────────────────────────────────────────────────────────────┘
                              (repeat until stamina/orbs depleted)
                                          │
                                          ▼
                              ┌──────────────────────┐
                              │   RETURN TO BASE     │
                              │  Sell / Display /    │
                              │  Upgrade / Unlock    │
                              └──────────────────────┘
```

### 2.2 Meta Loop (Idle/Incremental Layer)

```
1. PLACE captured furniture in your Home Base showroom
2. EARN passive Coins per second from displayed furniture
3. SPEND Coins on:
   - Better Capture Orbs (higher catch rate, multi-toss)
   - Larger Orb Satchel (more throws per run)
   - Stamina Boots (faster movement, longer runs)
   - Vocab Scanner (reveals first letter of rare furniture)
   - Base Expansions (unlock room themes: Kitchen, Bedroom, Garden, Space)
4. UNLOCK new Biomes with harder furniture & bigger rewards
5. COMPLETE Collection Pages for bonus multipliers
```

---

## 3. CORE MECHANICS

### 3.1 Third-Person Controls

| Input | Action |
|-------|--------|
| WASD / Left Stick | Move character |
| Mouse / Right Stick | Camera orbit |
| Shift | Sprint (drains stamina) |
| Space | Dodge roll (iframe, 0.4s) |
| Left Click / RT | Toss Capture Orb |
| Right Click / LT | Lock-on target nearest furniture |
| E / X | Interact / Pick up item |
| Tab / Select | Open inventory / collection |

**Camera:** Over-the-shoulder 3rd person, ~2.5m behind player, slight pitch-down (like PLA/BotW).

### 3.2 Furniture Creature AI States

Furniture in the world is not static — it behaves like wild Pokémon:

| State | Behavior |
|-------|----------|
| **Idle** | Wanders slowly in a radius, occasional hop/bob |
| **Alert** | Player entered detection radius — furniture stops, wiggles, exclamation mark appears |
| **Flee** | If player approaches without crouching, furniture runs away from player |
| **Aggro** *(rare)* | Some furniture (e.g., broken chairs, cursed lamps) chase and bump the player |
| **Trapped** | Orb hit — furniture is surrounded by energy field, vocabulary prompt appears |
| **Captured** | Shrinks, sucked into orb, orb falls to ground for pickup |
| **Escaped** | Orb breaks, furniture dashes away at high speed, invulnerable for 3s |

### 3.3 The Capture System (The "Pokéball" Mechanic)

1. **Aim:** Reticle appears. Orbs have a slight arc (projectile physics). Lead moving targets.
2. **Toss:** Orb flies out from player hand, follows arc trajectory.
3. **Hit Detection:** Sphere collider check against furniture bounding box.
4. **Catch Rate Calculation:**
   - Base rate: 40% for common, 15% for rare, 5% for legendary
   - Distance bonus: closer = higher rate
   - Sneak bonus: hitting while furniture is Idle = +20%
   - Orb tier bonus: Wood → Iron → Gold → Diamond Orb tiers
   - **If the orb "catches" (RNG pass):** → Vocabulary Challenge**
   - **If the orb "fails":** furniture enters Flee state

### 3.4 Vocabulary Challenge (The Learning Moment)

When an orb successfully traps furniture, the game pauses (time scale 0.1) and a UI overlay appears:

```
┌─────────────────────────────────────────┐
│  ✨ A wild CHAIR has been trapped!      │
│                                         │
│     [ 3D model rotates here ]           │
│                                         │
│  Type the English word to capture:      │
│                                         │
│     ┌─────────────────────┐             │
│     │  C _ A _ I _ R      │             │
│     └─────────────────────┘             │
│                                         │
│  Timer: ████████░░  8s                  │
│  Streak: x4  |  Bonus: +25%             │
└─────────────────────────────────────────┘
```

**Typing Rules:**
- Player types the full word with keyboard
- Correct letters fill in green with a *ding* sound
- Wrong letter: screen shake, red flash, -1 second penalty, buzz sound
- Timer runs out = escape
- Correct completion = capture success!

**Difficulty Scaling:**
- **Easy (Tier 1):** 3–5 letter words (bed, chair, lamp, rug, stool)
- **Medium (Tier 2):** 6–8 letter words (couch, closet, mirror, carpet, bookshelf)
- **Hard (Tier 3):** 9–12 letter words (chandelier, nightstand, washingmachine)
- **Legendary (Tier 4):** Compound or tricky words (refrigerator, grandfatherclock)

### 3.5 Stamina & Run Limits

Each expedition has limiting factors:
- **Stamina Bar:** Depletes while sprinting. Slowly recovers. Forces strategic movement.
- **Orb Count:** You carry a limited satchel (starts at 10 orbs). Pick up orb-material nodes in the world to craft more mid-run.
- **Run Timer:** Optional 5-minute soft limit for a complete expedition.
- **HP:** Some aggressive furniture can bump you, reducing HP. 0 HP = forced retreat, lose uncollected loot.

---

## 4. WORLDS / BIOMES (Run Types)

Procedurally generated zones using tile-based block placement. Each biome pulls from different furniture sets and environment assets.

| Biome | Theme | Environment Assets | Furniture Pool | Difficulty |
|-------|-------|-------------------|----------------|------------|
| **Cozy Meadows** | Starter grassland | Cube World: Grass, Dirt, Trees, Flowers, Fences, Rocks | Houseplants, Chairs, Stools, Small Tables, Lamps | ⭐ |
| **Sushi Village** | Japanese village | Sushi Restaurant: Buildings, Shoji walls, bamboo, counters | Sushi furniture: Chairs, Tables, Sofas, Cabinets, Benches | ⭐⭐ |
| **Pirate Cove** | Tropical island | Pirate Kit: Sand, cliffs, palm trees, ships, water | Barrels, Crates, Cannon (decorative), Treasure chests | ⭐⭐ |
| **Toon City** | Urban decay | Toon Shooter: Barriers, rubble, buildings | Sofas, Desks, Office chairs, Shelves | ⭐⭐⭐ |
| **Space Station** | Sci-fi outpost | Space Kit: Geodesic domes, metal platforms, planets, alien plants | Futuristic furniture (glowing variants) | ⭐⭐⭐⭐ |
| **The Attic** *(nightmare)* | Haunted/dark | Cube World: Dead trees, crystals, dark blocks | Cursed furniture: Grandfather clocks, broken mirrors, creepy dolls | ⭐⭐⭐⭐⭐ |

**Procedural Generation:**
- Use Cube World blocks as terrain tiles (Block_Grass, Block_Dirt, Block_Stone, etc.)
- Place environment props (trees, rocks, buildings) as static decoration
- Spawn furniture creatures in "nests" (3–5 per cluster) with wandering radii
- Scatter orb-material nodes and currency pickups

---

## 5. ASSET MAPPING

### 5.1 Player Character

| Asset | Role | Notes |
|-------|------|-------|
| `Cube World/Characters/Character_Male_1` or `Character_Female_1` | Default Hunter | 18 animations (Idle, Run, Walk, Jump, Punch, Duck, etc.). Voxel style fits low-poly aesthetic. |
| `Ultimate Animated Character Pack/Casual_Male` or `Casual_Female` | Unlockable Skins | 16 anims. More human-like for players who prefer that. |
| `Sushi Restaurant Kit/Characters/Panda` | Unlockable Skin | ~25 anims. Kawaii appeal for younger students. |

**Animations Used:**
- `Idle` — standing still
- `Run` / `Walk` — movement
- `Jump` / `Jump_Idle` / `Jump_Land` — traversal
- `Punch` — toss orb (reused as throw animation)
- `Duck` / `Roll` — dodge
- `HitReact` — taking damage
- `Victory` — successful capture celebration

### 5.2 Furniture Creatures (The "Pokémon")

**Primary Source:** `Ultimate House Interior Pack` (123 FBX models, static)

Since these are static FBX models, we animate them *procedurally* in Three.js:
- **Hop locomotion:** sine-wave Y-offset + slight rotation wiggle per hop
- **Alert wiggle:** rapid small rotation oscillation when player detected
- **Flee:** faster hops + particle dust trail
- **Trapped:** freeze rotation, add capture energy shader effect (pulsing glow)
- **Captured:** shrink scale to 0.1 + rise upward + spin fast (sucked into orb)

**Furniture by Tier:**

| Tier | Examples (from asset pack) | Catch Rate | Reward |
|------|---------------------------|------------|--------|
| Common | Chair_1, Stool, Table_RoundSmall, Carpet_1, Houseplant_1, Trashcan_Small1 | 45% | 10 coins |
| Uncommon | Couch_Small1, Bookshelf, NightStand_1, Drawer_2, Light_Desk, Shelf_1 | 30% | 25 coins |
| Rare | Bed_Single, Kitchen_Fridge, Couch_Large1, Bathroom_Bathtub, Light_Chandelier, Wardrobe_* | 15% | 60 coins |
| Epic | Bed_King, Kitchen_Oven_Large, Fireplace, Couch_L, Light_Ceiling6 | 8% | 150 coins |
| Legendary | Bed_Bunk, Bathroom_WashingMachine, Kitchen_Fridge (shiny reskin), Fireplace (golden) | 3% | 500 coins |

> **Note:** We have ~123 interior models. Map roughly 60–80 of them with English vocabulary words. The rest can be reskins (color variants = "shiny" versions with 2x rewards).

**Secondary Sources for Themed Zones:**
- Sushi Restaurant: Environment_Chair1/2, Environment_Table, Environment_Stool, Environment_Sofa, Environment_Cabinet_*
- Toon Shooter: Sofa, Sofa_Small
- Pirate Kit: Prop_Crate, Prop_Barrel equivalents (use as "wild decor" that can also be captured)

### 5.3 Environment / Terrain

| Asset | Use |
|-------|-----|
| `Cube World/Blocks/Block_Grass`, `Block_Dirt`, `Block_Stone`, `Block_WoodPlanks`, `Block_Brick`, `Block_Snow` | Terrain tiles for biomes |
| `Cube World/Blocks/Block_Crystal`, `Block_Diamond`, `Block_Ice` | Rare tile variants / resource nodes |
| `Cube World/Environment/Tree_1/2/3`, `Bush`, `Rock1/2`, `Grass_Small/Big`, `Flowers_1/2` | Nature decoration |
| `Cube World/Environment/Fence_*`, `Rail_*` | Boundaries, paths |
| `Cube World/Environment/Chest_Closed`, `Chest_Open` | Loot containers (orb materials, coin bags) |
| `Pirate Kit/Environment_*` (houses, cliffs, palm trees) | Pirate Cove biome structures |
| `Sushi Restaurant/Environment_*` (walls, counters, buildings) | Sushi Village structures |
| `Ultimate Space Kit/Environment/*` (domes, platforms, planets) | Space Station biome |

### 5.4 Enemies / Aggressive Furniture

Some furniture fights back! We use monster assets as "possessed furniture spirits" or simply animate aggressive furniture to chase the player.

| Asset | Role | Behavior |
|-------|------|----------|
| `Ultimate Monsters/Blob/GreenBlob`, `PinkBlob` | Living Slime Couch — disguised as furniture until approached | Slow chase, bump damage |
| `Cube World/Enemies/Hedgehog` | Cursed Ottoman — rolls at player | Charge attack |
| `Ultimate Monsters/Flying/Ghost`, `Ghost_Skull` | Haunted Lamp — floats above | Ranged "boo" projectile (slow orb) |
| `Cube World/Enemies/Goblin` | Gremlin hiding in drawers — jumps out | Ambush from furniture nest |

### 5.5 Capture Orb Visual

No direct Pokéball asset exists. We build one procedurally:
- **Geometry:** `IcosahedronGeometry` (radius 0.15, detail 1)
- **Material:** `MeshStandardMaterial` with emissive color per tier
  - Wood Orb: brown, no emissive
  - Iron Orb: silver, slight white emissive
  - Gold Orb: gold, yellow emissive pulse
  - Diamond Orb: cyan, strong cyan emissive + bloom
- **Trail:** Particle trail using small spheres that fade out
- **Impact Effect:** Burst of particles matching orb color on hit

### 5.6 Currency & Loot Visuals

| Asset | Use |
|-------|-----|
| `Pirate Kit/UI_Gold` | Coin pickup mesh (spinning, bobbing) |
| `Pirate Kit/UI_Gem_Blue` | Premium gem / upgrade material |
| `Pirate Kit/Prop_GoldBag` | Large loot drop from legendary captures |
| `Cube World/Environment/Key` | "Vocab Key" — unlocks hint for one letter |

---

## 6. VISUAL EFFECTS PLAN

All effects built with Three.js (particles, shaders, post-processing).

### 6.1 Capture Effects

| Effect | Technique |
|--------|-----------|
| **Orb Toss Trail** | TrailRenderer or instanced small spheres with fading opacity, colored by orb tier |
| **Orb Glow** | Emissive material + point light attached to orb mesh |
| **Hit Impact** | 8–12 particles burst outward (orb color), 0.3s lifespan |
| **Capture Energy Field** | Shader: vertical energy beams (sinusoid offset) around trapped furniture, color = rarity |
| **Shrink & Suck** | Scale lerp to 0.05 over 0.5s, position lerp upward 2 units, rotation speed x10 |
| **Successful Capture Burst** | Radial particle explosion (gold/white), screen flash, floating "+CAPTURED!" text |
| **Escape Burst** | Orb shatter particles (grey fragments), furniture dashes away with motion blur trail |

### 6.2 Furniture Creature Effects

| Effect | Technique |
|--------|-----------|
| **Idle Bob** | Sine wave Y offset: `y = base + sin(time * 2) * 0.05` |
| **Hop Locomotion** | Periodic Y impulse + slight squash/stretch scale on land |
| **Alert Exclamation** | Billboard sprite (2D canvas texture) pops above furniture: "!" |
| **Flee Dust Trail** | 2–3 small dust puff particles per hop behind furniture |
| **Aggro Red Glow** | Emissive tint pulse red on furniture material |
| **Detection Radius** | Optional debug-like faint ring on ground when crouching (stealth indicator) |

### 6.3 Environment Effects

| Effect | Technique |
|--------|-----------|
| **Biome Atmosphere** | Fog color per biome (meadow = light blue, attic = dark purple, space = black/star particle field) |
| **Day/Night Cycle** | Directional light angle + skybox color gradient (simple) |
| **Loot Sparkle** | Rotating star particle above coin/gem pickups |
| **Nest Indicator** | Faint colored mist where furniture clusters spawn |

### 6.4 UI Effects

| Effect | Technique |
|--------|-----------|
| **Typing Correct** | Letter pop-in with green flash, slight bounce |
| **Typing Wrong** | Screen shake (camera offset 0.05 for 0.1s), red vignette flash |
| **Timer Warning** | Last 3 seconds: UI pulses red, tick-tock visual shake |
| **Streak Counter** | Combo number scales up with each success, trails behind in opacity |
| **Level Up** | Full-screen radial wipe, fanfare text "BASE UPGRADED!" |

### 6.5 Post-Processing Stack

- **Bloom:** For orb glows, capture fields, shiny furniture highlights (threshold 0.8, strength 0.5)
- **Tone Mapping:** ACESFilmic for saturated low-poly look
- **Vignette:** Subtle darkening at edges for focus
- **Color Grading:** Per-biome LUT (warm for meadow, cool for space, desaturated for attic)

---

## 7. SOUND EFFECTS PLAN

Since no audio assets are in the inventory, we generate or source the following:

### 7.1 Gameplay SFX (synthesize with Web Audio API or use free CC0 assets)

| Event | Sound Description |
|-------|-------------------|
| **Orb Toss** | Quick "swoosh" + airy whistle, pitch varies by orb tier |
| **Orb Hit** | Soft "thwack" or "bonk" |
| **Capture Success** | Magical chime ascending scale (C-E-G-C), sparkly shimmer |
| **Escape** | Glass shatter + descending sad trombone "womp-womp" |
| **Type Correct** | Pleasant "blip" (pentatonic scale, pitch rises with streak) |
| **Type Wrong** | Low buzzer "bzzzt" + subtle error ding |
| **Timer Tick** | Clock tick for last 3 seconds |
| **Furniture Alert** | Spring "boing" exclamation sound |
| **Furniture Flee** | Rapid scuttling / scraping sound (wood on wood) |
| **Coin Pickup** | Classic coin "ding" (Mario-like) |
| **Level Up / Upgrade** | Triumphant brass fanfare (3-note ascending) |
| **Footsteps** | Light "tap-tap" on grass, "clack-clack" on wood, "thud" on stone |
| **Dodge Roll** | Quick air "whoosh" |
| **Damage Taken** | Cartoon "bonk" or "oof" |

### 7.2 Ambient Audio

| Biome | Ambient Loop |
|-------|-------------|
| Cozy Meadows | Gentle wind, distant birds, rustling grass |
| Sushi Village | Light bamboo wind chimes, distant water stream |
| Pirate Cove | Ocean waves, seagull cries, flag flapping |
| Toon City | Distant traffic hum, wind through alleys |
| Space Station | Low sci-fi drone, computer beeps, air vent hiss |
| The Attic | Creaking wood, howling wind, distant clock ticking |

### 7.3 Music (lo-fi/chiptune style, loopable)

| Track | Mood | BPM |
|-------|------|-----|
| **Base Theme** | Cozy, relaxing, homey — idle/upgrade time | 80 |
| **Exploration 1** | Upbeat, curious, adventurous | 110 |
| **Exploration 2** | Tense, faster, rare furniture nearby | 130 |
| **Capture Battle** | Focused, rhythmic — typing challenge | 100 |
| **Victory Jingle** | 5-second celebration sting | — |
| **Boss/Attic** | Spooky, dissonant, heartbeat bass | 90 |

> **Audio Engine:** Use Web Audio API with synthesized sounds (oscillators + noise buffers) to avoid external dependencies. For music, simple tracker-style chiptune loops using OscillatorNode sequences.

---

## 8. PROGRESSION & INCREMENTAL SYSTEMS

### 8.1 Currency

| Currency | Source | Use |
|----------|--------|-----|
| **Coins** | Captures, coin pickups, passive generation | Upgrades, base expansion |
| **Gems** | Rare captures, daily login, achievements | Premium skins, orb tiers, instant unlocks |
| **Vocab XP** | Correct words typed, streak bonuses | Hunter Rank (cosmetic + satchel size) |

### 8.2 Upgrade Tree

```
HUNTER GEAR
├── Orb Satchel      (starts 10, max 50)        — more throws per run
├── Orb Tier         (Wood→Iron→Gold→Diamond)  — higher catch rate, better arc
├── Stamina Boots    (run longer, faster regen)  — quality of life
├── Stealth Cloak    (smaller detection radius)  — approach rare furniture easier
├── Vocab Scanner    (reveals 1st letter)        — learning aid for hard words
└── Lucky Charm      (+% shiny spawn rate)       — collection completion

BASE BUILDINGS
├── Living Room      (unlocked at start)         — displays living room furniture
├── Kitchen Wing     (500 coins)                 — kitchen furniture passively generate
├── Bedroom Wing     (1,500 coins)               — bedroom furniture
├── Garden Wing      (5,000 coins)               — outdoor/plant furniture
├── Space Hangar     (15,000 coins + 10 gems)    — sci-fi themed display
└── The Attic        (50,000 coins + 50 gems)    — cursed furniture, highest income
```

### 8.3 Collection Book

- Every unique furniture captured is logged in a "FurnitureDex"
- Shows: 3D model spin, English name, rarity, times captured, best capture streak
- Completion bonuses per category (e.g., capture all chairs → "Chair Master" title + 2x chair income)
- Shiny variants tracked separately (random 1/64 chance for alternate color furniture)

### 8.4 Daily & Weekly Challenges

- "Capture 5 Chairs today" → bonus coins
- "Spell 'refrigerator' correctly 3 times" → gem reward
- "Complete a Space Station run without missing a word" → exclusive skin

---

## 9. TECHNICAL ARCHITECTURE

### 9.1 Stack (per skill.md)

- **Renderer:** Three.js r160+ (ES modules, no build step)
- **Loading:** GLTFLoader for glTF assets, FBXLoader for Ultimate House Interior Pack
- **Physics:** Simple custom AABB + sphere collision (no heavy physics engine needed)
- **Animation:** Three.js AnimationMixer for characters, custom tweening for furniture
- **Input:** Keyboard + Mouse (Pointer Lock optional)
- **Audio:** Web Audio API (synthesized SFX + simple sequencer for music)
- **State:** Plain JS classes (GameState, PlayerState, Inventory, Collection)
- **Persistence:** localStorage (save progress, collection, base layout)

### 9.2 Scene Graph Structure

```
Scene
├── CameraRig
│   ├── Camera (PerspectiveCamera)
│   └── CameraTarget (follows player with lerp)
├── Lighting
│   ├── AmbientLight
│   ├── DirectionalLight (sun/moon, casts shadows)
│   └── PointLights (orb glows, lamp furniture)
├── World
│   ├── Terrain (InstancedMesh of block tiles)
│   ├── Props (static environment meshes)
│   └── LootNodes (coins, materials)
├── FurnitureLayer
│   └── [FurnitureEntity x N]
│       ├── Model (FBX-loaded mesh)
│       ├── Hitbox (invisible sphere)
│       └── StateMachine (AI controller)
├── PlayerRig
│   ├── CharacterModel (GLTF skinned mesh)
│   ├── AnimationMixer
│   ├── Collider (capsule)
│   └── HandSocket (orb spawn point)
├── Projectiles
│   └── [OrbEntity x active]
├── Particles
│   └── [ParticleSystem x active]
└── UI (HTML overlay, pointer-events: auto)
```

### 9.3 Asset Loading Strategy

```js
// 1. Load index from assets.json
// 2. Priority load:
//    - Player character + anims
//    - First biome terrain blocks (Grass, Dirt, Stone)
//    - First 20 furniture models (common tier)
//    - Orb mesh + materials
// 3. Background stream:
//    - Remaining furniture by tier
//    - Biome-specific environment props
//    - Character skins
```

### 9.4 Performance Budget

- Target: 60fps on mid-tier laptops / tablets
- Shadow map: 1024×1024, PCFSoft
- Max furniture on screen: 20 (frustum cull + LOD)
- Max particles per effect: 32
- Reuse: One geometry/material per furniture type (instanced if possible)
- Pixel ratio capped at 2

---

## 10. DEVELOPMENT PHASES

### Phase 1: Core Loop (Week 1)
- [ ] Three.js scene setup with calibration pass
- [ ] Player controller (WASD + camera)
- [ ] Load 1 character + 5 furniture models
- [ ] Orb toss physics + collision
- [ ] Basic vocabulary UI + typing check
- [ ] Capture / escape state transitions

### Phase 2: Content & AI (Week 2)
- [ ] Furniture AI states (Idle, Alert, Flee, Trapped)
- [ ] Procedural terrain generation (block grid)
- [ ] Load 30 furniture models with vocabulary mapping
- [ ] Biome theming (2 biomes: Meadows, Sushi)
- [ ] Particle effects for capture/escape

### Phase 3: Meta & Progression (Week 3)
- [ ] Home Base scene (incremental layer)
- [ ] Furniture placement in base
- [ ] Passive coin generation
- [ ] Upgrade shop UI
- [ ] Collection book / FurnitureDex
- [ ] Save/load with localStorage

### Phase 4: Polish (Week 4)
- [ ] All 60+ furniture models loaded
- [ ] 4 biomes complete
- [ ] Sound effects (Web Audio synthesis)
- [ ] Music loops
- [ ] Post-processing (bloom, color grading)
- [ ] Mobile touch controls
- [ ] Tutorial flow

---

## 11. VOCABULARY MASTER LIST (Sample — 60 Words)

Mapped from Ultimate House Interior Pack assets:

| Word | Model | Tier | Category |
|------|-------|------|----------|
| bed | Bed_Single | Common | Bedroom |
| chair | Chair_1 | Common | Living |
| table | Table_RoundSmall | Common | Living |
| lamp | Light_Desk | Common | Living |
| rug | Carpet_1 | Common | Living |
| stool | Stool | Common | Kitchen |
| shelf | Shelf_1 | Common | Living |
| couch | Couch_Small1 | Uncommon | Living |
| desk | Drawer_2 | Uncommon | Office |
| mirror | Bathroom_Mirror1 | Uncommon | Bathroom |
| closet | Kitchen_Cabinet1 | Uncommon | Kitchen |
| bathtub | Bathroom_Bathtub | Rare | Bathroom |
| fridge | Kitchen_Fridge | Rare | Kitchen |
| oven | Kitchen_Oven | Rare | Kitchen |
| sofa | Couch_Large1 | Rare | Living |
| bookshelf | Bookshelf | Rare | Office |
| chandelier | Light_Chandelier | Epic | Dining |
| fireplace | Fireplace | Epic | Living |
| bunkbed | Bed_Bunk | Legendary | Bedroom |
| washer | Bathroom_WashingMachine | Legendary | Bathroom |
| ... | (expand to 60–80 words) | | |

---

## 12. RISK & MITIGATION

| Risk | Mitigation |
|------|------------|
| FBX models need conversion for Three.js | Use `FBXLoader` from three/examples, or batch-convert to glTF using `fbx2gltf` CLI |
| 123 furniture models = long load time | Lazy-load by tier; only common models needed for first biome |
| Typing in 3D is awkward | UI overlay freezes/pauses time; no 3D input during challenge |
| Mobile touch controls for typing | On-screen keyboard auto-opens; tap-to-toss for orbs |
| No audio assets | Synthesize everything with Web Audio API — keeps file size tiny |

---

*Document Version: 1.0*
*Designed for: Three.js + ES Modules (per skill.md)*
