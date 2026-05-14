# Void Loop Meshing Optimization Strategy

## Short Answer

Yes, Vercidium's meshing project is a good technical reference for Void Loop, but it is not a drop-in dependency. The repo is a C# Silk.NET renderer, while Void Loop is a browser-first Three.js game. The right path is to port the useful meshing ideas into our existing `TerrainMesh.js` pipeline, then move expensive chunk generation off the main thread.

Void Loop already has the important first piece: browser-native greedy terrain meshing. `TerrainMesh.js` builds exposed solid/air faces per chunk, merges adjacent faces by material/face kind, streams visible chunks, limits dirty rebuilds per frame, unloads cold chunks, and exposes perf stats.

## What Vercidium Gives Us

The Vercidium repo is useful because it demonstrates a production-shaped greedy meshing loop:

- Per-face visitation state so each exposed face is emitted once.
- Neighbor-aware face checks across chunk boundaries.
- Per-column min/max height bounds to skip large empty vertical ranges.
- Direct vertex-buffer writes instead of many temporary objects.
- Front-to-back chunk traversal to reduce GPU overdraw.
- Dirty chunk rebuilding instead of full-world regeneration.

Source: <https://github.com/vercidium-patreon/meshing>

## What We Already Have

Void Loop currently has:

- Greedy meshing in `voidloop/js/TerrainMesh.js`.
- Chunk streaming with separate isometric and third-person visibility budgets.
- Dirty chunk queues after digging.
- Cold chunk unloading.
- Nearby-mesh raycast filtering.
- Shader-side material variation, so merged quads can still look textured.
- Dynamic render scale in third-person mode.

That means Vercidium should inform optimization work, not replace the renderer.

## Browser-First Architecture

For a huge draw distance at stable 60fps on midrange hardware, use three terrain tiers:

1. Near field: full editable voxel chunks, greedy meshed, collidable, raycastable.
2. Mid field: greedy meshed chunks, visible and shaded, but not always hot for collision/enemy logic.
3. Far field: non-editable horizon terrain generated as coarse heightfield or impostor mesh.

The browser should not try to keep every distant voxel chunk live. Huge draw distance comes from a far terrain tier plus aggressive near-field fidelity, not from rendering full editable chunks forever.

## Recommended Implementation Steps

1. Add a meshing worker.
   Move `_buildChunkGeometry` work into a Web Worker that returns transferable typed arrays. Main thread should only create/update `THREE.BufferGeometry`.

2. Add Vercidium-style chunk column bounds.
   Cache min/max solid Y ranges per chunk or per X/Z column, then skip empty vertical spans during meshing and visibility scoring.

3. Replace dynamic JS arrays with reusable typed buffers.
   Current geometry assembly pushes into normal arrays, then Three.js copies them into typed attributes. A Vercidium-inspired writer can preallocate or grow typed arrays and avoid much of that churn.

4. Add far terrain.
   Generate a coarse, non-diggable heightfield mesh for terrain outside the hot chunk radius. This is the key to "huge draw distance" without exploding live chunk count.

5. Tune visibility budgets by mode.
   Third-person should favor a look corridor plus nearby safety ring. Isometric should favor a denser local square. Both should keep far scenery separate from editable chunks.

6. Build a perf harness.
   Add an in-browser benchmark route or query mode that records FPS, render calls, triangles, live chunks, rebuild time, visibility time, raycast time, and render scale while flying a fixed camera path.

## Culled Meshing Option

A pure culled mesher emits only faces where a solid voxel borders air, without merging adjacent faces into larger quads. It can be faster to generate than greedy meshing, but it usually creates more geometry for the GPU to draw.

Open-source references:

- `max-mapper/voxel-engine`: a JavaScript/Three.js voxel engine whose default options use `voxel.meshers.culled`.
  Source: <https://github.com/max-mapper/voxel-engine>
- `max-mapper/voxel-mesh`: a small JavaScript/Three.js mesh generator extracted from Mikola Lysenko's voxel meshing demo.
  Source: <https://github.com/max-mapper/voxel-mesh>
- `Vercidium/voxel-mesh-generation`: an older C# implementation from Sector's Edge that combines faces in runs instead of full greedy meshing. Its README says it produces about 20% more triangles than greedy meshing, but runs about 390% faster.
  Source: <https://github.com/Vercidium/voxel-mesh-generation>
- `TanTanDev/binary_greedy_mesher_demo`: a Rust/Bevy demo with benchmarks comparing a simple culled mesher against binary greedy meshing.
  Source: <https://github.com/TanTanDev/binary_greedy_mesher_demo>

For Void Loop, culled meshing is attractive for chunks that rebuild constantly while digging, especially if the meshing work is still on the main thread. It is less attractive for huge draw distance, because far terrain is usually GPU-bound by triangle count and draw cost, where greedy or binary-greedy merged quads win.

Best-fit hybrid:

1. Use a simple culled or run-merged mesher for hot editable chunks if profiling shows rebuild spikes are the bottleneck.
2. Keep greedy or binary-greedy meshing for stable visible chunks and mid-distance chunks.
3. Use coarse far terrain for the horizon instead of culled voxel chunks.
4. Let the perf harness choose the winner by measuring rebuild time and rendered triangles separately.

## Practical Target

For midrange browser hardware, aim for:

- 60fps gameplay at 1.0 device-independent render scale, dropping no lower than 0.75 only under stress.
- Near editable terrain budget: roughly 40-80 live visible chunks depending on camera mode.
- Far horizon: one to a few coarse meshes, not hundreds of voxel chunks.
- Terrain rebuild budget: under 2-3ms of main-thread work per frame after the worker split.
- Render calls: keep terrain chunks visible but avoid per-block draws.

## Integration Verdict

Use Vercidium as a reference implementation for the mesher internals. Keep Void Loop's browser-native Three.js renderer, shader material, digging density field, and chunk streaming. The next big win is not copying C# into JS line-for-line; it is porting the algorithmic structure into a worker-backed typed-array mesher and adding a far-terrain LOD layer.
