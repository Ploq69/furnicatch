# Rapier Physics Migration Guide

This document is the source of truth for moving Katamari Alphabet from hand-rolled motion into a Rapier-backed physics model. Every required feature has a stable `KA-RAPIER-*` ID. When implementation starts, add that ID as a nearby code comment in the touched JavaScript file. The scripts in `katamari-alphabet/scripts/` use these IDs to report progress and prevent quiet skips.

## Why Rapier

Rapier is a good fit because our biggest problems are physical rather than visual:

- The katamari should roll from angular velocity and contacts, not direct position nudges.
- Terrain, ramps, walls, and oversized objects should be actual fixed colliders.
- The growing clump needs separate concepts of rolling core, visible bounds, pickup bounds, mass, and center-of-mass offset.
- Newly attached props should make rolling awkward until the clump smooths out.

Official docs to keep open while implementing:

- Getting started: `https://rapier.rs/docs/user_guides/javascript/getting_started_js`
- Rigid bodies: `https://rapier.rs/docs/user_guides/javascript/rigid_bodies/`
- Colliders: `https://rapier.rs/docs/user_guides/javascript/colliders`
- Collider creation: `https://rapier.rs/docs/user_guides/javascript/collider_creation_and_insertion/`

## Target Architecture

Add one physics layer between level content and rendering:

- `js/physics.js` owns Rapier import/init, world creation, stepping, collider helpers, and handle-to-game-object lookup.
- `js/game.js` stops moving `this.ball.position` directly. It applies torque/impulses to the katamari rigid body, then copies Rapier transforms back to Three.js objects.
- `js/levels.js` gains explicit physics metadata for Level 1 recipes: `pickupSize`, `physicsShape`, `physicsSize`, `density`, `roughness`, `lopsidedness`, `isScenery`, and optional `stickMode`.
- Visual objects remain Three.js meshes. Rapier only owns simplified colliders.
- The prototype remains static/Live Server friendly. Use browser import maps or dynamic import for `@dimforge/rapier3d-compat`; do not introduce a bundler unless the project is deliberately converted.

## Core Model

Represent the player as:

- A dynamic Rapier rigid body.
- One sphere collider for the stable rolling core.
- A separate Three.js clump group containing attached visuals.
- Computed clump bounds from attached visuals.
- Temporary lopsidedness impulses from newly attached objects.

Use four size values:

- `coreRadius`: sphere collider radius used for stable rolling.
- `clumpMinRadius`: smallest useful rolling radius from accumulated bounds.
- `clumpMaxRadius`: largest visual/pickup reach from accumulated bounds.
- `clumpAverageRadius`: UI/progress size, usually `(clumpMinRadius + clumpMaxRadius) / 2`.

Pickup eligibility should use authored `pickupSize` first, then measured fallback. Do not rely only on alphabet phase gates.

## Implementation Checklist

- [x] **KA-RAPIER-001** Add `@dimforge/rapier3d-compat` to `index.html` import map or a documented dynamic import path.
- [x] **KA-RAPIER-002** Create `js/physics.js` with async Rapier initialization, `World` creation, fixed timestep stepping, and cleanup/reset.
- [x] **KA-RAPIER-003** Add a fixed-step accumulator in `game.js` so physics runs at deterministic increments independent of render FPS.
- [x] **KA-RAPIER-004** Replace direct ball translation with torque/impulse based rolling input on a dynamic rigid body.
- [x] **KA-RAPIER-005** Keep rendering synchronized from Rapier to Three.js after each physics step.
- [x] **KA-RAPIER-006** Create fixed colliders for floor, bedroom rug lip, bed platform, pillow ramp, desk ramp/tabletop, blackboard stage, and boundary walls.
- [x] **KA-RAPIER-007** Use fixed cuboid or trimesh-free compound colliders for terrain; avoid dynamic trimesh colliders.
- [x] **KA-RAPIER-008** Add static or fixed colliders for oversized scenery so large props physically block the katamari before pickup.
- [x] **KA-RAPIER-009** Convert collectable props into sensor/contact candidates with simplified collider shapes.
- [x] **KA-RAPIER-010** Track collider handles back to collectable records for pickup resolution.
- [x] **KA-RAPIER-011** Add explicit `pickupSize` values to every Level 1 recipe.
- [x] **KA-RAPIER-012** Add explicit `physicsShape` and `physicsSize` values to every Level 1 recipe.
- [x] **KA-RAPIER-013** Compute measured fallback pickup size from object bounds when authored metadata is missing.
- [x] **KA-RAPIER-014** Pickups must occur at contact/overlap side, not randomized anchors.
- [x] **KA-RAPIER-015** Preserve attached object world scale when it sticks to the ball.
- [x] **KA-RAPIER-016** Parent attached visuals to the katamari clump group with local transforms derived from the contact point.
- [x] **KA-RAPIER-017** Recompute clump bounds after every pickup from attached visual bounds.
- [x] **KA-RAPIER-018** Split `coreRadius`, `clumpMinRadius`, `clumpMaxRadius`, and `clumpAverageRadius`.
- [x] **KA-RAPIER-019** Use `coreRadius` for the Rapier rolling sphere collider.
- [x] **KA-RAPIER-020** Use `clumpMaxRadius` for pickup eligibility and camera distance.
- [x] **KA-RAPIER-021** Use `clumpAverageRadius` for HUD growth/progress.
- [x] **KA-RAPIER-022** Grow the rolling core collider only at controlled thresholds so physics stays stable.
- [x] **KA-RAPIER-023** Add mass to the katamari on pickup based on object `density`/mass metadata.
- [x] **KA-RAPIER-024** Add temporary lopsided center-of-mass/torque bias after pickups.
- [x] **KA-RAPIER-025** Make long/flat items produce stronger roll wobble than compact items of the same volume.
- [x] **KA-RAPIER-026** Decay lopsidedness over time and/or after additional pickups so the ball gradually smooths out.
- [x] **KA-RAPIER-027** Make oversized collisions shove, slow, and shake the object/ball instead of silently failing.
- [x] **KA-RAPIER-028** Enable continuous collision detection or equivalent safeguards on the katamari body if fast movement tunnels through small props.
- [x] **KA-RAPIER-029** Add slope-aware movement feel through real contact physics, not manual `terrainHeightAt` snapping.
- [x] **KA-RAPIER-030** Remove or quarantine old manual terrain height movement once Rapier terrain is active.
- [x] **KA-RAPIER-031** Camera distance and look target must use clump bounds, not the clean base sphere.
- [x] **KA-RAPIER-032** Latest pickup UI should show object/letter name and count so growth feels legible.
- [x] **KA-RAPIER-033** Collectible objects should have a clear affordance: eligible pulse, nearly eligible shake, too-large thud.
- [x] **KA-RAPIER-034** Letters must attach at contact points and remain readable when practical.
- [x] **KA-RAPIER-035** Level completion must still require at least one each of `A`, `B`, `C`, and `D`.
- [x] **KA-RAPIER-036** Voidloop-style drill flow must remain unchanged after physics migration.
- [x] **KA-RAPIER-037** Audio events must be preserved for roll, prop pickup, letter pickup, bump, growth, and level complete.
- [x] **KA-RAPIER-038** Add a debug overlay toggle showing core radius, max radius, mass, active contacts, and last pickup size.
- [x] **KA-RAPIER-039** Add a no-browser static verifier script that checks feature IDs and required source markers.
- [x] **KA-RAPIER-040** Add a manual QA checklist specifically for Rapier behavior.

## Suggested File Changes

Keep the migration staged:

1. Infrastructure pass:
   - Add Rapier import.
   - Add `js/physics.js`.
   - Add fixed timestep loop.
   - Keep old movement behind a feature flag such as `USE_RAPIER_PHYSICS`.

2. Terrain pass:
   - Convert authored Level 1 primitives to fixed colliders.
   - Keep their visual meshes unchanged.
   - Remove manual height snapping only after terrain contact is stable.

3. Player pass:
   - Create dynamic katamari body and sphere collider.
   - Apply camera-relative torque.
   - Sync Three.js ball and clump group from Rapier.

4. Pickup pass:
   - Build collider records for every collectable.
   - Use contact/overlap checks for pickup.
   - Attach visuals at contact side.
   - Recompute clump bounds.

5. Katamari feel pass:
   - Add mass changes.
   - Add lopsided torque/center-of-mass approximation.
   - Add oversized shove/shake.
   - Tune damping, friction, restitution, and pickup sizes.

6. UX preservation pass:
   - Restore all letter capture behavior.
   - Restore drill transition.
   - Restore audio.
   - Add debug overlay and latest-pickup feedback.

## Physics Defaults

Initial tuning targets:

- World gravity: `{ x: 0, y: -18, z: 0 }`.
- Fixed timestep: `1 / 60`.
- Katamari body: dynamic, CCD enabled if available, angular damping around `0.35`, linear damping around `0.12`.
- Core sphere collider: friction `1.0`, restitution `0.05`.
- Floor/ramps: friction `0.9`, restitution `0`.
- Oversized props: fixed colliders or static sensor+manual shove depending on stability.
- Pickup sensors: use simple ball/cuboid/capsule approximations; avoid per-mesh dynamic colliders.

## Manual QA Checklist

Run this after each migration stage in Live Server:

- The game loads without a bundler.
- Rapier initializes before `Start Rolling` becomes playable.
- Ball rests on the floor without falling through or hovering.
- WASD/arrow input rolls by rotation, not sliding.
- Ball can climb the pillow ramp and desk ramp through physical contact.
- Ball slows uphill and accelerates downhill.
- Small props stick exactly where contacted.
- Props preserve readable scale after attachment.
- A pencil or long object visibly protrudes and makes rolling awkward.
- The awkward roll decays after time or additional pickups.
- Big objects block/shove before they become collectible.
- Collectible affordances are readable.
- `A`, `B`, `C`, and `D` still capture and attach.
- Capturing all required letters still opens the drill.
- Drill still has at least 10 questions.
- Word audio and speech fallback still work.

## Completion Definition

The Rapier migration is complete only when:

- `python3 katamari-alphabet/scripts/rapier_progress_report.py --strict` passes.
- Every `KA-RAPIER-*` checklist item is checked in this guide.
- Every checked feature ID appears as a source marker near the implementation.
- Manual QA checklist has been run by the browser tester.
- No old manual movement path is active during normal gameplay.
