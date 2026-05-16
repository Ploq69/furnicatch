# Voidloop — Agent Guide

## Project Overview

**Voidloop** is a browser-based 3D mining roguelite with a spelling-game twist. Players mine voxel terrain, fight enemies with melee/ranged weapons, collect letters to complete spelling challenges, unlock pets, upgrade pickaxes, and progress through 7 themed zones. Optional multiplayer via Firebase.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Renderer** | Three.js v0.160.0 (CDN importmap, no bundler) |
| **Language** | Vanilla ES Modules (JavaScript), no TypeScript |
| **Build System** | **None** — pure static files. Use `python3 serve.py` for local dev |
| **Backend** | Firebase Realtime Database (optional, CDN-loaded) |
| **Deployment** | Static hosting (Netlify-ready; `.netlify/` at repo root) |
| **Assets** | KayKit GLTF/GLB models, WAV audio, PNG textures |

## Architecture

### Hybrid Renderer (Critical)
The game uses a **two-pass rendering system**:
1. **Custom WebGL2 terrain shader** (`UnifiedTerrainRenderer.js`) — renders voxel terrain with raymarched soft shadows directly to the canvas
2. **Three.js scene** — renders entities (player, enemies, blocks, pets, particles) on top with `renderer.autoClear = false`

The custom terrain renderer runs first each frame, then Three.js renders the scene. Both share the same canvas. This is a performance-critical path — **target is 60fps on mid-range hardware**.

### Key Entry Points
- `index.html` → `js/main.js` → `MainMenu` → `Game`
- `levelbuilder.html` → `js/levelbuilder/LevelBuilderApp.js`
- `sfx-picker.html` → `js/sfx-picker.js`

### Module Patterns
- **ES Modules** with `import`/`export`; no bundler
- **Class-based OOP** — `Game`, `Player`, `World`, `Enemy`, `TerrainMesh`, etc.
- **Singleton instances** — `assetLoader`, `input`, `audio`, `settings` exported from modules
- **Asset cloning** — GLTF models loaded once via `AssetLoader`, then `cloneModel()` for instances
- **localStorage persistence** — `SettingsManager`, `ProgressionManager`, `Inventory`
- **Seeded RNG** — `SeededRNG.js` for deterministic procedural generation

## Directory Layout

```
voidloop/
├── index.html              # Main game entry (embeds all UI CSS)
├── js/
│   ├── main.js             # Entry point: MainMenu + SettingsMenu
│   ├── Game.js             # ~3500 lines — renderer, cameras, game loop, combat, mining
│   ├── Player.js           # Character controller, animations, equipment, movement
│   ├── World.js            # Zone generation, enemy spawning, block placement
│   ├── TerrainMesh.js      # Custom SDF voxel terrain (greedy meshing, chunk streaming)
│   ├── UnifiedTerrainRenderer.js  # WebGL2 terrain shader with raymarched shadows
│   ├── Enemy.js            # Enemy AI with KayKit animation states
│   ├── Block.js / BlockInstancer.js   # Voxel block entities
│   ├── InputManager.js / TouchControls.js
│   ├── UIManager.js        # HUD, floating text, shop, loadout, pet den
│   ├── AudioManager.js / SFXMapper.js
│   ├── ParticleSystem.js / FlipbookVFX.js / ShaderParticleFX.js / ElementalVFX.js
│   ├── AssetLoader.js      # GLTF/GLB preloading and cloning
│   ├── NetworkManager.js / RemotePlayer.js   # Firebase multiplayer
│   ├── SettingsManager.js / SettingsMenu.js
│   ├── ProgressionManager.js / Inventory.js / ResourceInventory.js
│   ├── ZoneManager.js / ZoneData.js
│   ├── SpellingData.js / SpellingEngine.js / LetterDrop.js / Glyph3DManager.js
│   ├── PetManager.js / PetLetter.js
│   ├── Weapon.js
│   ├── HazardSystem.js
│   ├── StructureGenerator.js
│   ├── constants.js        # All game constants: blocks, enemies, biomes, loot
│   ├── SeededRNG.js
│   └── levelbuilder/       # Level editor modules
├── assets/
│   └── textures/           # Texture atlas, block textures
├── audio/
│   ├── sfx/                # Pixel combat SFX (Helton Yan's pack)
│   └── spelling/           # ~260 WAV spelling files
├── docs/
│   ├── zone-progression.md # Full GDD: 7 zones, tiers, enemies, pets, save schema
│   └── meshing-optimization.md  # Terrain meshing engineering doc
├── serve.py                # Dev server (Python3, port 8000, no-cache headers)
├── database.rules.json     # Firebase rules (open read/write)
├── firebase-config.js      # Firebase init (fallback)
└── firebase-config.local.js # Local Firebase config (gitignored)
```

## Performance Constraints

- **Target: 60fps on mid-range hardware**
- Point lights **do not cast shadows** — the terrain shadowing is done in the custom fragment shader, and Three.js shadow maps are only for directional light (sun). Adding `castShadow` to point lights will tank performance.
- Shadow map resolution dynamically scales (256–2048) based on `shadowQuality` setting
- Terrain shadow raymarching steps adapt (10–22) based on quality setting
- Particle systems use instancing and atlas textures

## Coding Conventions

- Use `THREE` imported from the CDN importmap (`import * as THREE from 'three'`)
- Dispose Three.js objects in `dispose()` methods: `geometry.dispose()`, `material.dispose()`, `texture.dispose()`, `light.dispose()`
- When disposing a container, traverse and dispose meshes AND lights
- Asset paths are relative to `voidloop/` root (e.g., `KayKit_Adventurers_2.0_FREE/Assets/gltf/...`)
- Constants live in `js/constants.js`; do not hardcode game values elsewhere
- Settings persist via `SettingsManager` (localStorage) and apply instantly without restart

## Shadow System (Recently Implemented)

Three-tier shadow system:
1. **Terrain voxel shadows** — raymarched in `UnifiedTerrainRenderer` fragment shader via `voxelShadow()`
2. **Three.js directional shadow map** — `PCFSoftShadowMap`, tight ortho frustum following player, dynamic resolution
3. **Character/enemy shadows** — entities cast shadows; player casts but does not receive

`SettingsManager` has `shadowQuality` (Low/Medium/High/Ultra) that controls both terrain shader steps and shadow map size. See `Game._applyGraphicsSettings()`.

## Common Pitfalls

- **Do not use `**` glob patterns** at the repo root — the asset directories are huge and will explode context
- The project has **no build step** — do not add `npm`, `webpack`, `vite`, etc. without explicit user approval
- **Do not modify git history** — no `git commit`, `git push`, `git rebase` without explicit user approval
- Firebase config is injected via `firebase-config.local.js` (gitignored) — the game gracefully degrades when missing
- The custom terrain renderer manages its own WebGL state — be careful when mixing raw GL calls with Three.js

## Firebase / Multiplayer

Multiplayer is optional. If `firebase-config.local.js` exists, it exports `firebaseConfig`. If missing, multiplayer is disabled. See `NetworkManager.js`.

## Asset Packs (Pre-installed)

KayKit packs, Ultimate Monsters, Ultimate Space Kit, Styloo packs, etc. are in repo root directories. Do not commit new asset packs without checking `.gitignore`. Asset packs are referenced by path in `constants.js` and `AssetLoader.js`.
