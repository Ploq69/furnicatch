# Three.js Builder Skill

A Codex-ready framework for shipping elegant, performant Three.js web experiences with modern ES modules.

## When to Use

Use this skill whenever prompts mention:
- "three.js / threejs scene"
- "3D web background"
- "orbit controls"
- "WebGL demo"
- "GLTF / GLB loading"
- "3D game prototype"

## Philosophy: Start from Scene Intent

Three.js work lives inside a scene graph: parents transform children, and everything in `scene` is rendered.

**Before writing code, ask**:
- What is the core visual element or metaphor (hero object, particle field, data glyph)?
- How should visitors manipulate or perceive it (static hero, orbit control, camera-relative movement)?
- What level of hardware/performance do we target (mobile hero snippet vs. desktop interactive)?
- Which animation best communicates the story (continuous rotation, bobbing, interaction-driven)?

**Core principles**:
1. **Scene graph first** – model hierarchy and transforms before materials.
2. **Intent-driven primitives** – boxes, spheres, torus, planes cover 80% of hero cases; reach for GLTF only when fidelity demands it.
3. **Animation as transformation** – treat animation as evolving position/rotation/scale with `renderer.setAnimationLoop`.
4. **Performance through restraint** – reuse geometries/materials, clamp device pixel ratio, keep draw calls low.

## Foundational Principle: Lock a "Reference Frame Contract" First

Most Three.js bugs are not "rendering bugs" — they're **reference-frame bugs**: wrong origin, wrong up-axis assumption, wrong forward direction, wrong "ground = y=0" semantics, wrong color space, or wrong loading environment.

Treat your scene like a contract you must prove once, then never violate:
- **Axes**: which way is forward for gameplay, and how do models map to it?
- **Anchors**: what does "on the ground" mean for each asset class?
- **Units**: what is 1 unit (meter-ish? pixel-ish?) and how do imported assets fit?
- **Color**: are textures and output color space correct?

### The Calibration Pass
Do a 60-second calibration scene and lock constants (axes/anchors/scale/color) before shipping gameplay systems.

### Mesh Forward Verification (Do Not Guess)
Don't "eyeball rotate until it looks right" and don't assume "GLTF faces `-Z`".

```js
// In Three.js, an Object3D's "forward" is its local -Z axis.
const localForward = new THREE.Vector3(0, 0, -1);

// Attach a visible arrow to the model so you can *see* its forward.
const forwardArrow = new THREE.ArrowHelper(localForward, new THREE.Vector3(0, 1.2, 0), 1.2, 0xff00ff);
modelRoot.add(forwardArrow);

// Also log the current world-forward for debugging.
const worldForward = new THREE.Vector3();
modelRoot.getWorldDirection(worldForward);
console.log('model world forward (-Z):', worldForward.toArray());
```

### Coordinate System & Camera Awareness (Critical)
Three.js is right-handed: +X right, +Y up, +Z toward the camera.

```js
const forward = new THREE.Vector3();
camera.getWorldDirection(forward);
forward.y = 0;
forward.normalize();
// Right-handed basis: right = forward × up
const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
```

## Build Flow

### 1. Frame the Experience
Define vibe, interaction tier, and layout before coding.

### 2. Establish Runtime Foundations
Use modern ES modules — no global THREE. Minimal HTML template:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Three.js Scene</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{overflow:hidden;background:#000}canvas{display:block}</style>
</head>
<body>
  <script type="module">
    import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
    // Your Three.js code here
  </script>
</body>
</html>
```

### 3. Compose the Scene
- **Geometries**: Box, Sphere, Torus, Plane, Cone, Icosahedron
- **Materials**: MeshStandardMaterial (default), MeshPhysicalMaterial (glass), MeshBasicMaterial (unlit)
- **Lighting**: Ambient (0.3–0.5) + Directional key + colored fill

### 4. Animate & Interact
```js
renderer.setAnimationLoop((time) => {
  mesh.rotation.y = time * 0.001;
  renderer.render(scene, camera);
});
```

### 5. Polish & Performance
- Cap `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`
- Reuse geometries/materials
- Avoid instantiating inside animation loops

## Anti-Patterns to Avoid

❌ **Legacy global builds**: Use ES modules, not `<script src="three.min.js">`
❌ **Camera-blind controls**: Derive movement from camera orientation, not world axes
❌ **Floating/sinking fixes by "random y offsets"**: Normalize asset anchors at load time
❌ **Asset guessing**: Calibrate GLTF forward direction, scale, animation names
❌ **Geometry churn inside loops**: Create once, transform only

## GLTF / GLB Loading Patterns

### Basic Loading
```js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load('model.glb', (gltf) => {
  const model = gltf.scene;
  scene.add(model);

  // Animations
  const mixer = new THREE.AnimationMixer(model);
  const clips = gltf.animations;
  if (clips.length > 0) {
    mixer.clipAction(clips[0]).play();
  }
});
```

### Asset Index JSON (GLB Index)
Create a JSON manifest that lists all models, paths, and animations for batch loading:

```json
{
  "models": {
    "hero": { "url": "./models/hero.glb", "animations": ["Idle", "Run", "Attack"] },
    "enemy": { "url": "./models/enemy.glb", "animations": ["Idle", "Walk", "Death"] }
  }
}
```

```js
const cache = new Map();

async function loadFromIndex(indexUrl) {
  const res = await fetch(indexUrl);
  const index = await res.json();
  const loader = new GLTFLoader();

  for (const [key, entry] of Object.entries(index.models)) {
    loader.load(entry.url, (gltf) => {
      gltf.scene.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
      cache.set(key, gltf);
    });
  }
}

function cloneModel(key) {
  const gltf = cache.get(key);
  if (!gltf) return null;
  return {
    scene: gltf.scene.clone(true),
    animations: gltf.animations.slice(),
    mixer: new THREE.AnimationMixer(gltf.scene.clone(true))
  };
}
```

### Animation State Machine
```js
class Animator {
  constructor(mixer, animations) {
    this.mixer = mixer;
    this.animations = animations;
    this.currentAction = null;
  }

  play(name, opts = {}) {
    const clip = THREE.AnimationClip.findByName(this.animations, name);
    if (!clip) { console.warn('Missing anim:', name); return; }
    const action = this.mixer.clipAction(clip);
    action.reset();
    if (opts.loop === false) action.loop = THREE.LoopOnce;
    if (opts.clampWhenFinished) action.clampWhenFinished = true;
    action.fadeIn(opts.fade || 0.1).play();
    this.currentAction = action;
    return action;
  }

  crossFade(toName, duration = 0.2, opts = {}) {
    const next = this.play(toName, { ...opts, fade: 0 });
    if (this.currentAction && next) {
      this.currentAction.fadeOut(duration);
      next.fadeIn(duration);
    }
    return next;
  }
}
```

## Performance Checklist

- [ ] `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`
- [ ] Reuse `Geometry` and `Material` instances
- [ ] Use `InstancedMesh` for repeated static objects
- [ ] Frustum culling enabled by default (don't disable)
- [ ] Shadow map size appropriate (2048 max for most cases)
- [ ] Dispose geometries/materials/textures when removing objects
- [ ] Use `renderer.setAnimationLoop` instead of `requestAnimationFrame` for XR compat
