# Coding Plan: Godot Voidloop Voxel Prototype

## Goal

Build a small Godot prototype that proves whether Voidloop can be remade in Godot using `JorisAR/GDVoxelPlayground` as the optimized voxel/block substrate.

This is not a full game port. The prototype should answer one question:

> Can Godot + GDVoxelPlayground support Voidloop's core feel: moving through a voxel cave, mining blocks, fighting around the terrain, collecting drops, and rendering Godot characters/props cleanly with the voxel renderer?

If the prototype passes the acceptance checks, the team can plan a full Voidloop Godot remake. If it fails, document exactly which technical constraint blocks adoption.

## Source Repositories And Local Layout

Create the prototype as a new folder in the existing workspace:

```text
/Users/johnrosplock/Projects/3dGames/
  voidloop-godot-prototype/
    project.godot
    addons/
      voxel_playground/
    src/
    scenes/
    scripts/
    assets/
    docs/
```

Do not modify the existing `voidloop/` Three.js game during this prototype unless explicitly requested.

Use GDVoxelPlayground as the reference implementation:

```text
https://github.com/JorisAR/GDVoxelPlayground
```

Important facts from inspection:

- It is a Godot 4.4+ GDExtension.
- It uses native C++ plus Godot `RenderingDevice` compute shaders.
- The demo renders through `VoxelCamera` into a `TextureRect`.
- Core extension classes include `VoxelWorld`, `VoxelCamera`, and `VoxelWorldCollider`.
- The `.gdextension` expects compiled native libraries in `addons/voxel_playground/bin/`.
- The upstream `.gitmodules` uses SSH URLs for `godot-cpp` and `src/gdcs`, so HTTPS rewrite may be needed for automated cloning.

## Prototype Scope

The prototype must include:

1. A Godot 4.4+ project that launches locally.
2. GDVoxelPlayground integrated as an addon.
3. A single playable scene with:
   - third-person or first-person movement,
   - a voxel cave/terrain volume,
   - mining/removing terrain with a pickaxe action,
   - block collision that updates around the player,
   - one simple enemy mesh moving near the player,
   - one collectible drop produced by mining,
   - a minimal HUD showing health, mined count, and FPS.
4. A short technical report in `docs/prototype_findings.md` explaining whether this stack is viable for a Godot Voidloop remake.

Out of scope:

- Full Voidloop progression.
- Multiplayer.
- Firebase or web persistence.
- Full asset migration.
- Full combat system.
- Full biome generation.
- Browser export.

## Success Criteria

The prototype is successful only if all required checks pass:

- The project runs from the Godot editor on macOS.
- The voxel world renders at an acceptable interactive frame rate on the target machine.
- The player can move, jump/fly or walk, and aim at terrain.
- Mining removes voxel material visibly within 250 ms of input.
- Collision updates near the player after terrain edits.
- A Godot mesh enemy and/or pickup appears in the same scene without unacceptable visual compositing issues.
- The player can mine a resource block and spawn a pickup.
- The prototype can run for 3 minutes without GPU/device errors, extension crashes, or memory growth that obviously spirals.

The prototype is inconclusive if Godot meshes cannot be depth-composited correctly with the voxel renderer. In that case, create a minimal reproduction and explain the issue in `docs/prototype_findings.md`.

## Major Technical Risks

### 1. Voxel Renderer Composition

GDVoxelPlayground's demo renders the voxel scene into a `TextureRect`, not as normal Godot mesh geometry. This may make ordinary Godot meshes, particles, characters, and pickups render on top of or behind voxel terrain incorrectly.

Prototype task:

- Place a Godot `MeshInstance3D` cube, a character mesh, and a pickup mesh inside/around voxel terrain.
- Verify whether they appear with correct depth relationships.
- If they do not, test options:
  - overlay-only gameplay elements,
  - custom depth texture integration,
  - rendering enemies/pickups as voxel data,
  - switching to a mesh-based voxel plugin instead.

### 2. Native Build Pipeline

The extension must be compiled for local platforms. Upstream includes `.gdextension` entries for many platforms, but binaries may not exist in a fresh clone.

Prototype task:

- Build only macOS debug first.
- Do not attempt web, iOS, Android, or Linux until the prototype works.

### 3. Material Model

The extension currently has a simple material model: air, solid, water, lava, sand, and color-packed voxels. Voidloop needs block IDs, HP, ores, terrain types, and biome-specific visuals.

Prototype task:

- Add the smallest possible resource/block ID layer.
- It can be a GDScript dictionary keyed by voxel coordinate at first.
- Do not redesign the extension data packing unless the prototype proves that is required.

### 4. Collision Freshness

`VoxelWorldCollider` fetches a local solid mask and rebuilds a concave collision shape around the player at intervals. This is promising, but mining feel depends on update latency.

Prototype task:

- Measure visible edit latency and collision update latency.
- Tune collider size and update interval.
- Record results.

### 5. Web Export

This prototype should target native desktop first. Godot web export with GDExtension and compute-heavy RenderingDevice code is likely high friction. Do not spend prototype time on browser export.

## Milestone 1: Project And Addon Bootstrap

Create a fresh Godot project:

```text
voidloop-godot-prototype/
  project.godot
  scenes/Main.tscn
  scripts/
  docs/
```

Recommended Godot version:

```text
Godot 4.4 or newer
```

Clone GDVoxelPlayground into a temp or vendor folder, then copy only the addon folder into the Godot project after building:

```text
addons/voxel_playground/
```

If submodules fail because `.gitmodules` uses SSH, rewrite locally to HTTPS:

```bash
git config submodule.godot-cpp.url https://github.com/godotengine/godot-cpp.git
git config submodule.src/gdcs.url https://github.com/JorisAR/gdcs.git
git submodule sync
git submodule update --init --recursive
```

Build target:

```bash
scons platform=macos target=template_debug
```

Expected output should satisfy the `.gdextension` macOS debug entry:

```text
addons/voxel_playground/bin/voxel_playground.macos.template_debug.framework
```

Acceptance checks:

- Godot editor opens the project.
- `VoxelWorld`, `VoxelCamera`, and `VoxelWorldCollider` are visible as custom classes.
- The demo scene or equivalent minimal scene runs.

## Milestone 2: Minimal Voxel Scene

Create `scenes/Main.tscn` with:

- `Node3D` root named `Main`.
- `VoxelWorld` child.
- `VoxelWorldCollider` child under `VoxelWorld`.
- `DirectionalLight3D`.
- `WorldEnvironment`.
- `Player` as `CharacterBody3D`.
- `VoxelCamera` attached to the player.
- `TextureRect` output wired to `VoxelCamera`.
- Minimal HUD `Control` layered over the output texture.

Start from the GDVoxelPlayground demo scene structure, but rename scripts and nodes for Voidloop clarity.

Create scripts:

```text
scripts/player_controller.gd
scripts/voxel_mining_controller.gd
scripts/prototype_hud.gd
scripts/prototype_game.gd
```

Acceptance checks:

- The scene renders voxel terrain.
- The player can move around.
- The player can aim from the camera.
- FPS appears on HUD.

## Milestone 3: Voidloop-Style Player Feel

Implement a simple controller that approximates Voidloop movement feel:

- WASD movement.
- Mouse look.
- Jump or fly toggle, depending on collision stability.
- Sprint optional.
- Left click mines.
- Right click can place a test block only if useful for debugging.

Suggested implementation:

- Start from GDVoxelPlayground `player_controller.gd`.
- Keep the first prototype first-person if third-person introduces camera/composition complexity.
- Add a later third-person camera only if the voxel renderer cooperates with Godot meshes.

Acceptance checks:

- Movement feels responsive.
- Camera aim lines up with mining.
- Mining uses the camera origin and forward vector.

## Milestone 4: Mining Interaction

Use `VoxelWorld.edit_world(camera_origin, camera_direction, radius, range, value)`.

Implement:

- `VoxelMiningController.selected_tool = "pickaxe"`.
- `mine_radius` initially `2` or `3`, not the demo's large `8`.
- `mine_range` initially `12`.
- `mine_cooldown` around `0.15` to `0.30` seconds.
- Material value `0` removes terrain.

Add basic block/resource tracking in GDScript:

```gdscript
var mined_count := 0
var resource_nodes := {}
```

For the first pass, resource nodes can be approximate:

- Place a few visible markers or known coordinates in the cave.
- If the player mines near one, spawn a pickup.

Acceptance checks:

- Mining visibly removes terrain.
- HUD mined count increments.
- Mining does not crash if aimed into empty space.
- Collision updates after digging.

## Milestone 5: Pickup And Resource Loop

Create a simple pickup scene:

```text
scenes/pickups/OrePickup.tscn
scripts/ore_pickup.gd
```

Pickup behavior:

- Mesh: simple sphere, cube, or imported gem model.
- Float/spin animation.
- Attract to player within a radius.
- On contact, increment `ore_count`.
- Remove itself.

Important compositing test:

- Place the pickup partly behind voxel terrain and move around it.
- Determine whether it renders correctly relative to the voxel output.

Acceptance checks:

- Mining can spawn at least one pickup.
- Player can collect it.
- HUD ore count updates.
- `docs/prototype_findings.md` notes whether the pickup renders correctly with voxels.

## Milestone 6: Enemy Mesh Integration Test

Create:

```text
scenes/enemies/PrototypeEnemy.tscn
scripts/prototype_enemy.gd
```

Enemy behavior:

- Use a simple `CharacterBody3D`, capsule, and placeholder mesh.
- Idle until player is within range.
- Move toward player on the XZ plane.
- Deal contact damage every 1 second.
- Die after taking one or two hits.

Combat can be crude:

- Left click while aiming at enemy damages enemy if raycast/angle is close.
- Or use a simple short-range sphere overlap.

The real purpose is rendering/physics validation, not enemy AI quality.

Acceptance checks:

- Enemy appears in the voxel scene.
- Enemy can move near terrain.
- Player can take damage.
- Enemy can be defeated.
- Visual ordering with voxel terrain is documented.

## Milestone 7: Collision And Terrain Edit Measurements

Add lightweight debug stats to HUD:

- FPS.
- Voxel edit count.
- Last edit time.
- Collider update interval.
- Approximate collision refresh status if available.

Test cases:

1. Mine a wall directly in front of the player.
2. Walk through the hole as soon as it visually opens.
3. Mine downward and test whether the player falls/steps correctly.
4. Mine near enemy/pickup and observe physics oddities.
5. Keep mining continuously for 60 seconds.

Record:

- Visual edit latency.
- Collision update latency.
- Any stutter or crash.
- Whether collider mesh feels too coarse.

Write results to:

```text
docs/prototype_findings.md
```

## Milestone 8: Voidloop Viability Report

Create `docs/prototype_findings.md` with these sections:

```markdown
# Prototype Findings

## Summary

## What Works

## What Does Not Work Yet

## Renderer Composition Result

## Collision Result

## Mining Feel Result

## Performance Notes

## Required Engine Changes

## Recommendation
```

Recommendation must be one of:

- `Proceed with Godot remake using GDVoxelPlayground`.
- `Proceed only after renderer/depth integration work`.
- `Do not use GDVoxelPlayground; use another Godot voxel solution`.
- `Stay with current Three.js/WebGL path`.

## Suggested File Structure

```text
voidloop-godot-prototype/
  addons/
    voxel_playground/
  assets/
    characters/
    pickups/
    ui/
  docs/
    prototype_findings.md
  scenes/
    Main.tscn
    Player.tscn
    pickups/
      OrePickup.tscn
    enemies/
      PrototypeEnemy.tscn
  scripts/
    prototype_game.gd
    player_controller.gd
    voxel_mining_controller.gd
    prototype_hud.gd
    ore_pickup.gd
    prototype_enemy.gd
  project.godot
```

## Implementation Notes

### Keep The Prototype Small

Avoid porting existing Voidloop systems directly. Recreate only the feel-critical loop:

```text
move -> mine -> terrain changes -> drop appears -> collect -> enemy pressure
```

### Prefer GDScript For Gameplay

Use GDScript for all prototype gameplay scripts. Only touch C++ extension code if a blocker cannot be worked around in GDScript.

### Avoid Premature Asset Migration

Use placeholder Godot primitives first:

- Capsule or simple mesh for player.
- Cube/sphere for pickup.
- Capsule/cylinder for enemy.

After the render-composition test passes, optionally import one KayKit or existing Voidloop GLB model.

### Keep A Debug Scene

Create a second scene if useful:

```text
scenes/RenderCompositionTest.tscn
```

It should contain:

- voxel wall,
- Godot cube in front,
- Godot cube behind,
- pickup partially occluded,
- enemy walking behind terrain.

This scene is valuable if the prototype fails due to depth/compositing.

## Agent Checklist

Use this checklist while implementing:

- [ ] Create `voidloop-godot-prototype/`.
- [ ] Add or clone GDVoxelPlayground.
- [ ] Fix submodule URLs if needed.
- [ ] Build macOS debug GDExtension.
- [ ] Confirm custom classes load in Godot.
- [ ] Create `Main.tscn`.
- [ ] Wire `VoxelWorld`, `VoxelCamera`, `VoxelWorldCollider`, and output `TextureRect`.
- [ ] Implement player movement.
- [ ] Implement camera aim.
- [ ] Implement mining.
- [ ] Implement HUD.
- [ ] Add pickup scene and collection.
- [ ] Add enemy scene and minimal AI.
- [ ] Test render composition with normal Godot meshes.
- [ ] Test collision after terrain edits.
- [ ] Run 3-minute stability test.
- [ ] Write `docs/prototype_findings.md`.

## Definition Of Done

The prototype is done when:

1. A user can open the Godot project and run `scenes/Main.tscn`.
2. The player can mine a voxel cave and collect at least one drop.
3. At least one enemy exists and interacts with the player.
4. The agent has documented whether Godot meshes and voxel terrain can coexist.
5. The findings doc gives a clear proceed/no-proceed recommendation.

Do not call the prototype done only because the addon compiles. The entire value is in proving the actual Voidloop gameplay loop around this renderer.
