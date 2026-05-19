import * as THREE from 'three';
import { PackedAssetLibrary } from './assets.js';
import { AudioBus } from './audio.js';
import { DrillSession } from './quiz.js';
import { LEVELS, PHASES, ALPHABET } from './levels.js';
import { FIXED_TIMESTEP, PhysicsWorld, USE_RAPIER_PHYSICS } from './physics.js';

const ARENA = 34;
const PROP_COUNT = 130;
const LETTER_REPEATS = 4;
const SURFACE_EPSILON = 0.16;
const UNCOLLECTABLE_GATE = 4;
const CORE_GROWTH_STEP = 0.18;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function colorToCss(hex) {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

export class KatamariAlphabetGame {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 160);
    this.clock = new THREE.Clock();
    this.assets = new PackedAssetLibrary();
    this.audio = new AudioBus();
    this.physics = new PhysicsWorld();
    this.physicsAccumulator = 0;
    this.keys = new Set();
    this.collectables = [];
    this.attached = [];
    this.terrain = [];
    this.velocity = new THREE.Vector3();
    this.loadBiasWorld = new THREE.Vector3();
    this.loadRoughness = 0;
    this.levelIndex = 0;
    this.mass = 0;
    this.radius = PHASES[0].radius;
    this.coreRadius = PHASES[0].radius;
    this.clumpMinRadius = PHASES[0].radius;
    this.clumpMaxRadius = PHASES[0].radius;
    this.clumpAverageRadius = PHASES[0].radius;
    this.lastCoreColliderRadius = PHASES[0].radius;
    this.lastPickup = null;
    this.pickupCounts = new Map();
    this.debugVisible = false;
    this.state = 'loading';
    this.captured = new Set();
    this.quiz = null;
    this.currentQuestionLocked = false;
    this.lastBumpSound = 0;

    this.ui = {
      startOverlay: document.getElementById('start-overlay'),
      completeOverlay: document.getElementById('complete-overlay'),
      quizOverlay: document.getElementById('quiz-overlay'),
      startBtn: document.getElementById('start-btn'),
      restartBtn: document.getElementById('restart-btn'),
      levelKicker: document.getElementById('level-kicker'),
      levelTitle: document.getElementById('level-title'),
      phaseTitle: document.getElementById('phase-title'),
      growthFill: document.getElementById('growth-fill'),
      letterRow: document.getElementById('letter-row'),
      toast: document.getElementById('toast'),
      quizProgress: document.getElementById('quiz-progress'),
      quizScore: document.getElementById('quiz-score'),
      quizTitle: document.getElementById('quiz-title'),
      quizPrompt: document.getElementById('quiz-prompt'),
      quizChoices: document.getElementById('quiz-choices'),
      completeText: document.getElementById('complete-text'),
      pickupPanel: document.getElementById('pickup-panel'),
      pickupName: document.getElementById('pickup-name'),
      pickupCount: document.getElementById('pickup-count'),
      debugPanel: document.getElementById('debug-panel'),
    };

    this._bind();
    this._setupScene();
  }

  async init() {
    this._toast('Loading physics and packed object library...');
    await Promise.all([
      this.assets.load(),
      this.physics.init(),
    ]);
    this._toast('Ready. Press Start Rolling.');
    this.state = 'menu';
    await this.startLevel(0);
    this.renderer.setAnimationLoop(() => this._loop());
  }

  _bind() {
    window.addEventListener('resize', () => this._resize());
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === '`') {
        this.debugVisible = !this.debugVisible;
        this.ui.debugPanel.classList.toggle('active', this.debugVisible);
      }
    });
    this.ui.startBtn.addEventListener('click', () => {
      this.audio.unlock();
      this.ui.startOverlay.classList.remove('active');
      this.state = 'playing';
      this._toast('Collect the glowing letters.');
    });
    this.ui.restartBtn.addEventListener('click', () => {
      this.audio.unlock();
      this.ui.completeOverlay.classList.remove('active');
      this.startLevel(0);
      this.state = 'playing';
    });
  }

  _setupScene() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 1.15));
    const sun = new THREE.DirectionalLight(0xffffff, 1.35);
    sun.position.set(20, 26, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -42;
    sun.shadow.camera.right = 42;
    sun.shadow.camera.top = 42;
    sun.shadow.camera.bottom = -42;
    this.scene.add(sun);

    this.world = new THREE.Group();
    this.scene.add(this.world);

    this.clump = new THREE.Group();
    this.scene.add(this.clump);

    const ballMat = new THREE.MeshStandardMaterial({
      color: 0x162338,
      roughness: 0.46,
      metalness: 0.08,
      emissive: 0x102030,
      emissiveIntensity: 0.2,
    });
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 22), ballMat);
    this.ball.castShadow = true;
    this.ball.receiveShadow = true;
    this.ball.position.set(0, PHASES[0].radius, 0);
    this.clump.add(this.ball);
  }

  async startLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.mass = 0;
    this.radius = PHASES[0].radius;
    this.coreRadius = PHASES[0].radius;
    this.clumpMinRadius = PHASES[0].radius;
    this.clumpMaxRadius = PHASES[0].radius;
    this.clumpAverageRadius = PHASES[0].radius;
    this.lastCoreColliderRadius = PHASES[0].radius;
    this.physicsAccumulator = 0;
    this.velocity.set(0, 0, 0);
    this.loadBiasWorld.set(0, 0, 0);
    this.loadRoughness = 0;
    this.captured = new Set();
    this.pickupCounts.clear();
    this.lastPickup = null;
    this.collectables.length = 0;
    this.attached.length = 0;
    while (this.clump.children.length) this.clump.remove(this.clump.children[0]);
    this.clump.add(this.ball);
    this.physics.reset();
    this.ball.rotation.set(0, 0, 0);
    this.ball.position.set(0, 0, 0);
    this.ball.scale.setScalar(this.coreRadius);
    this.clump.position.set(0, 0, 0);
    this.clump.quaternion.identity();
    this.terrain = this._terrainDefinitionsForLevel();

    while (this.world.children.length) this.world.remove(this.world.children[0]);
    this.scene.background = new THREE.Color(this.level.sky);
    this.scene.fog = new THREE.Fog(this.level.sky, 42, 92);

    const floorMat = new THREE.MeshStandardMaterial({
      color: this.level.ground,
      roughness: 0.82,
      metalness: 0.02,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA * 2.4, ARENA * 2.4, 20, 20), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.world.add(floor);
    this.physics.addFixedCuboid({ x: 0, y: -0.06, z: 0, hx: ARENA * 1.2, hy: 0.06, hz: ARENA * 1.2 });

    if (this.level.authored) this._addAuthoredEnvironment();
    else this._addArenaMarkers();

    const spawn = this.level.authored?.spawn || { x: 0, z: 0 };
    const spawnHeight = this._terrainHeightAt(spawn.x, spawn.z);
    const body = this.physics.createKatamariBody({
      x: spawn.x,
      y: spawnHeight + this.coreRadius + 0.06,
      z: spawn.z,
      radius: this.coreRadius,
      mass: 1,
    });
    this.katamariBody = body.body;
    this.katamariCollider = body.collider;
    this._syncKatamariFromPhysics();
    this._updateHud();
    await this._spawnLevel();
    this._updatePickupAffordances();
  }

  _addArenaMarkers() {
    const mat = new THREE.MeshStandardMaterial({ color: this.level.accent, roughness: 0.65 });
    for (let i = 0; i < 18; i++) {
      const side = i % 4;
      const x = side === 0 ? -ARENA : side === 1 ? ARENA : rand(-ARENA, ARENA);
      const z = side === 2 ? -ARENA : side === 3 ? ARENA : rand(-ARENA, ARENA);
      const marker = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 1.2), mat);
      marker.position.set(x, 0.11, z);
      marker.receiveShadow = true;
      this.world.add(marker);
    }
  }

  _terrainDefinitionsForLevel() {
    if (!this.level?.authored) return [];
    return [
      { type: 'rect', x1: -23, x2: -9.5, z1: -24, z2: -12.5, y: 0.07 },
      { type: 'ramp', x1: -22, x2: -11, z1: -13.2, z2: -8.2, y1: 0, y2: 0.62, axis: 'z' },
      { type: 'rect', x1: -27.5, x2: -7.2, z1: -9.6, z2: 2.4, y: 0.62 },
      { type: 'ramp', x1: -4.6, x2: 3.2, z1: -15.5, z2: -8.8, y1: 0, y2: 0.96, axis: 'z' },
      { type: 'rect', x1: -4.8, x2: 8.3, z1: -9.4, z2: -2.2, y: 0.96 },
      { type: 'ramp', x1: -2.6, x2: 8.4, z1: 14, z2: 18.2, y1: 0, y2: 0.44, axis: 'z' },
      { type: 'rect', x1: -8.6, x2: 20.4, z1: 18, z2: 27.5, y: 0.44 },
    ];
  }

  _terrainHeightAt(x, z) {
    // KA-RAPIER-030: this helper is quarantined to spawn placement only; live movement uses Rapier contacts.
    let height = 0;
    for (const surface of this.terrain) {
      if (x < surface.x1 || x > surface.x2 || z < surface.z1 || z > surface.z2) continue;
      if (surface.type === 'rect') {
        height = Math.max(height, surface.y);
      } else if (surface.type === 'ramp') {
        const t = surface.axis === 'x'
          ? clamp((x - surface.x1) / Math.max(0.001, surface.x2 - surface.x1), 0, 1)
          : clamp((z - surface.z1) / Math.max(0.001, surface.z2 - surface.z1), 0, 1);
        height = Math.max(height, surface.y1 + (surface.y2 - surface.y1) * t);
      }
    }
    return height;
  }

  _terrainGradientAt(x, z) {
    const hL = this._terrainHeightAt(x - SURFACE_EPSILON, z);
    const hR = this._terrainHeightAt(x + SURFACE_EPSILON, z);
    const hD = this._terrainHeightAt(x, z - SURFACE_EPSILON);
    const hU = this._terrainHeightAt(x, z + SURFACE_EPSILON);
    return new THREE.Vector3(
      (hR - hL) / (SURFACE_EPSILON * 2),
      0,
      (hU - hD) / (SURFACE_EPSILON * 2)
    );
  }

  _addAuthoredEnvironment() {
    const bedroomMat = new THREE.MeshStandardMaterial({ color: 0xc58a68, roughness: 0.88 });
    const classroomMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.82 });
    const rugMat = new THREE.MeshStandardMaterial({ color: 0xdf4f65, roughness: 0.78 });
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x8ecae6, roughness: 0.72 });
    const rampMat = new THREE.MeshStandardMaterial({ color: 0xf6bd60, roughness: 0.74 });
    const stageMat = new THREE.MeshStandardMaterial({ color: 0x52616f, roughness: 0.78 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe7d7bd, roughness: 0.86 });

    this._addBlock(-22, 0.025, -18.25, 16, 0.05, 14, bedroomMat);
    this._addBlock(8, 0.025, 7.5, 34, 0.05, 40, classroomMat);
    this._addBlock(-16.25, 0.095, -18.25, 13.5, 0.05, 11.5, rugMat);
    this._addBlock(-17.35, 0.31, -3.6, 20.3, 0.62, 12, bedMat);
    this._addRamp(-16.5, -10.7, 11, 5, 0.62, rampMat);
    this._addBlock(1.75, 0.48, -5.8, 13.1, 0.96, 7.2, new THREE.MeshStandardMaterial({ color: 0x6f4e37, roughness: 0.66 }));
    this._addRamp(-0.7, -12.15, 7.8, 6.7, 0.96, rampMat);
    this._addBlock(5.9, 0.22, 22.75, 29, 0.44, 9.5, stageMat);
    this._addRamp(2.9, 16.1, 11, 4.2, 0.44, stageMat);

    this._addBlock(0, 1.6, -34.2, ARENA * 2.05, 3.2, 0.4, wallMat);
    this._addBlock(-34.2, 1.6, 0, 0.4, 3.2, ARENA * 2.05, wallMat);
    this._addBlock(34.2, 1.1, 0, 0.4, 2.2, ARENA * 2.05, wallMat);
    this._addBlock(0, 1.1, 34.2, ARENA * 2.05, 2.2, 0.4, wallMat);
  }

  _addBlock(x, y, z, w, h, d, mat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = h > 0.2;
    mesh.receiveShadow = true;
    this.world.add(mesh);
    if (USE_RAPIER_PHYSICS) {
      this.physics.addFixedCuboid({ x, y, z, hx: w / 2, hy: h / 2, hz: d / 2 });
    }
    return mesh;
  }

  _addRamp(x, z, w, d, height, mat) {
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), mat);
    const rx = -Math.atan2(height, d);
    ramp.rotation.x = rx;
    ramp.position.set(x, height * 0.5, z);
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    this.world.add(ramp);
    if (USE_RAPIER_PHYSICS) {
      this.physics.addFixedCuboid({ x, y: height * 0.5, z, hx: w / 2, hy: 0.08, hz: d / 2, rx });
    }
    return ramp;
  }

  async _spawnLevel() {
    if (this.level.authored) return this._spawnAuthoredLevel();

    const jobs = [];
    for (let i = 0; i < PROP_COUNT; i++) jobs.push(this._spawnProp(i));
    for (const letter of this.level.letters) {
      for (let i = 0; i < LETTER_REPEATS; i++) jobs.push(this._spawnLetter(letter, i));
    }
    const distractors = this._pickDistractorLetters(10);
    for (const letter of distractors) jobs.push(this._spawnLetter(letter, 0, true));
    await Promise.all(jobs);
  }

  async _spawnAuthoredLevel() {
    const jobs = [];
    for (const recipe of this.level.authored.recipes) jobs.push(this._spawnAuthoredRecipe(recipe));
    for (const letter of this.level.authored.letters) jobs.push(this._spawnAuthoredLetter(letter, false));
    for (const letter of this.level.authored.distractors || []) jobs.push(this._spawnAuthoredLetter(letter, true));
    await Promise.all(jobs);
  }

  async _spawnAuthoredRecipe(recipe) {
    const placements = recipe.positions
      ? recipe.positions.map(([x, z]) => ({ x, z }))
      : Array.from({ length: recipe.count }, (_, i) => this._pointForRecipe(recipe, i));

    const jobs = placements.map(async (point, index) => {
      const object = await this._createObjectFromAsset(recipe.asset, recipe);
      object.rotation.y = recipe.rowed
        ? (index % 2 ? -0.14 : 0.18) + Math.floor(index / 2) * 0.05
        : rand(0, Math.PI * 2);
      if (recipe.tilt) {
        object.rotation.x = rand(-recipe.tilt, recipe.tilt);
        object.rotation.z = rand(-recipe.tilt, recipe.tilt);
      }
      object.userData.zone = recipe.name;
      this._settleObjectOnSurface(object, point.x, point.z);
      const metrics = this._objectMetrics(object);
      const requiredRadius = this._pickupRadiusFor(recipe, metrics);
      this.world.add(object);
      const item = {
        object,
        type: 'prop',
        label: recipe.name,
        mass: Math.max(recipe.asset.mass ?? 1, metrics.growthMass),
        radius: Math.max(recipe.pickupRadius ?? 0.32, metrics.collisionRadius),
        requiredRadius,
        protrusion: metrics.protrusion,
        density: recipe.density ?? 1,
        roughness: recipe.roughness ?? 1,
        lopsidedness: recipe.lopsidedness ?? 1,
        stickMode: recipe.stickMode ?? 'compact',
        physicsShape: recipe.physicsShape ?? 'box',
        physicsSize: recipe.physicsSize ?? [metrics.size.x / 2, metrics.size.y / 2, metrics.size.z / 2],
        phaseGate: recipe.phaseGate ?? 0,
        collected: false,
        scenic: !!recipe.scenic || !!recipe.isScenery,
      };
      this.collectables.push(item);
      this._addPhysicsForCollectable(item);
    });
    await Promise.all(jobs);
  }

  _addPhysicsForCollectable(item) {
    const pos = item.object.position;
    this.physics.addCollectableCollider(
      item,
      item.physicsShape ?? 'box',
      item.physicsSize ?? [item.radius * 0.5, item.radius * 0.5, item.radius * 0.5],
      pos,
      item.object.rotation.y
    );
    // KA-RAPIER-008: large/scenery props get fixed blockers until they are collected or remain permanent scenery.
    if (item.type === 'prop' && (item.scenic || item.requiredRadius > 1.15)) {
      const size = item.physicsSize ?? [item.radius * 0.5, item.radius * 0.5, item.radius * 0.5];
      const shape = item.physicsShape === 'ball' ? [size[0], size[0], size[0]] : item.physicsShape === 'capsule' ? [size[0], size[1], size[0]] : size;
      item.blockingCollider = this.physics.addFixedCuboid({
        x: pos.x,
        y: pos.y + (shape[1] ?? item.radius * 0.5),
        z: pos.z,
        hx: Math.max(0.08, shape[0]),
        hy: Math.max(0.08, shape[1] ?? shape[0]),
        hz: Math.max(0.08, shape[2] ?? shape[0]),
        ry: item.object.rotation.y,
        friction: 0.92,
      });
    }
  }

  async _createObjectFromAsset(asset, recipe = {}) {
    const defaultBoost = asset.size < 0.45 ? 1.65 : asset.size < 0.8 ? 1.9 : asset.size < 1.3 ? 2.15 : 1.75;
    const scale = asset.size * (recipe.scaleBoost ?? defaultBoost) * rand(0.9, 1.1);
    if (asset.source === 'all') return this.assets.createFromAll(asset.pattern, scale);
    return this.assets.createGltf(asset.path, scale);
  }

  _objectMetrics(object) {
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const axes = [size.x, size.y, size.z].sort((a, b) => a - b);
    const minAxis = Math.max(axes[0], 0.01);
    const midAxis = Math.max(axes[1], 0.01);
    const maxAxis = Math.max(axes[2], 0.01);
    const volumeProxy = Math.max(size.x * size.y * size.z, 0.001);
    const equivalentDiameter = Math.cbrt(volumeProxy);
    const cubicness = clamp(minAxis / maxAxis, 0, 1);
    const flatOrLongBonus = 1 - cubicness;
    const collectibleDiameter = equivalentDiameter * 0.72 + maxAxis * (0.18 + cubicness * 0.2);
    return {
      size,
      maxAxis,
      equivalentDiameter,
      collectibleDiameter: collectibleDiameter * (1 - flatOrLongBonus * 0.18),
      collisionRadius: Math.max(0.22, equivalentDiameter * 0.44 + maxAxis * 0.16),
      growthMass: Math.max(1, equivalentDiameter * equivalentDiameter * 2.2),
      protrusion: clamp(maxAxis / Math.max(midAxis, 0.01), 1, 4.2),
    };
  }

  _pickupRadiusFor(recipe, metrics) {
    if ((recipe.phaseGate ?? 0) >= UNCOLLECTABLE_GATE) return Infinity;
    if (Number.isFinite(recipe.pickupSize)) return recipe.pickupSize;
    // KA-RAPIER-013: mesh bounds remain the fallback when authored pickup metadata is absent.
    const phaseRadius = PHASES[Math.min(recipe.phaseGate ?? 0, PHASES.length - 1)].radius * 0.92;
    const shapeRadius = metrics.collectibleDiameter * 0.48;
    const weightRadius = Math.sqrt(Math.max(recipe.asset.mass ?? 1, 1)) * 0.055;
    return Math.max(0.28, phaseRadius, shapeRadius + weightRadius);
  }

  _pointForRecipe(recipe, index) {
    const { x1, x2, z1, z2 } = recipe.area;
    if (!recipe.rowed) {
      return {
        x: rand(x1, x2),
        z: rand(z1, z2),
      };
    }
    const cols = 4;
    const col = index % cols;
    const row = Math.floor(index / cols);
    const xStep = (x2 - x1) / Math.max(1, cols - 1);
    const zRows = Math.ceil((recipe.count || 1) / cols);
    const zStep = (z2 - z1) / Math.max(1, zRows - 1);
    return {
      x: x1 + col * xStep + rand(-0.55, 0.55),
      z: z1 + row * zStep + rand(-0.42, 0.42),
    };
  }

  _settleObjectOnSurface(object, x, z, offset = 0.02) {
    object.position.set(x, 0, z);
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const surface = this._terrainHeightAt(x, z);
    object.position.y += surface - box.min.y + offset;
    object.userData.baseY = object.position.y;
  }

  async _spawnAuthoredLetter(cfg, distractor = false) {
    const object = this.assets.createGlyph(cfg.letter, distractor ? 'distractor' : 'letter');
    const phaseGate = cfg.phaseGate ?? 0;
    object.scale.setScalar(cfg.scale ?? (0.72 + phaseGate * 0.18));
    const surface = this._terrainHeightAt(cfg.x, cfg.z);
    object.position.set(cfg.x, surface + 0.64 + phaseGate * 0.12, cfg.z);
    object.userData.baseY = object.position.y;
    object.userData.floatSeed = Math.random() * 100;
    this.world.add(object);
    const item = {
      object,
      type: 'letter',
      label: `Letter ${cfg.letter}`,
      letter: cfg.letter,
      distractor,
      mass: distractor ? 3 : 9,
      radius: 0.62 + phaseGate * 0.16,
      requiredRadius: 0.42 + phaseGate * 0.28,
      physicsShape: 'box',
      physicsSize: [0.34 + phaseGate * 0.08, 0.46 + phaseGate * 0.08, 0.08],
      density: 0.35,
      roughness: 0.5,
      lopsidedness: 1,
      phaseGate,
      collected: false,
    };
    this.collectables.push(item);
    this._addPhysicsForCollectable(item);
  }

  _pickDistractorLetters(count) {
    const pool = ALPHABET.filter(l => !this.level.letters.includes(l));
    const picks = [];
    while (picks.length < count && pool.length) {
      picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return picks;
  }

  async _spawnProp(i) {
    const cfg = this.level.props[Math.floor(Math.random() * this.level.props.length)];
    let object;
    if (cfg.source === 'all') {
      object = this.assets.createFromAll(cfg.pattern, cfg.size * rand(0.78, 1.3));
    } else {
      object = await this.assets.createGltf(cfg.path, cfg.size * rand(0.85, 1.24));
    }
    const phaseGate = clamp(Math.floor((cfg.size + rand(-0.2, 0.6)) / 0.8), 0, 3);
    this._placeObject(object, i);
    object.rotation.y = rand(0, Math.PI * 2);
    this.world.add(object);
    const metrics = this._objectMetrics(object);
    const item = {
      object,
      type: 'prop',
      label: object.userData.assetName || 'Object',
      mass: cfg.mass,
      radius: Math.max(0.35, cfg.size * 0.56, metrics.collisionRadius),
      requiredRadius: PHASES[phaseGate].radius,
      physicsShape: 'box',
      physicsSize: [metrics.size.x / 2, metrics.size.y / 2, metrics.size.z / 2],
      density: 1,
      roughness: 1,
      lopsidedness: metrics.protrusion,
      phaseGate,
      collected: false,
    };
    this.collectables.push(item);
    this._addPhysicsForCollectable(item);
  }

  async _spawnLetter(letter, i, distractor = false) {
    const object = this.assets.createGlyph(letter, distractor ? 'distractor' : 'letter');
    const phaseGate = distractor ? Math.floor(Math.random() * 3) : Math.min(3, i);
    object.scale.setScalar(0.72 + phaseGate * 0.22);
    this._placeObject(object, i + letter.charCodeAt(0) * 11);
    object.position.y = 0.55 + phaseGate * 0.18;
    object.userData.floatSeed = Math.random() * 100;
    this.world.add(object);
    const item = {
      object,
      type: 'letter',
      label: `Letter ${letter}`,
      letter,
      distractor,
      mass: distractor ? 2 : 7,
      radius: 0.65 + phaseGate * 0.18,
      requiredRadius: PHASES[Math.min(phaseGate, PHASES.length - 1)].radius * 0.9,
      physicsShape: 'box',
      physicsSize: [0.36, 0.48, 0.08],
      density: 0.35,
      roughness: 0.5,
      lopsidedness: 1,
      phaseGate,
      collected: false,
    };
    this.collectables.push(item);
    this._addPhysicsForCollectable(item);
  }

  _placeObject(object, seed) {
    const angle = rand(0, Math.PI * 2) + seed * 0.19;
    const dist = rand(5, ARENA - 3);
    object.position.set(Math.cos(angle) * dist, 0.02, Math.sin(angle) * dist);
  }

  _phaseIndex() {
    let phase = 0;
    for (let i = 0; i < PHASES.length; i++) {
      if (this.mass >= PHASES[i].minMass) phase = i;
    }
    return phase;
  }

  _targetRadius() {
    const phase = PHASES[this._phaseIndex()];
    const phaseMass = Math.max(0, this.mass - phase.minMass);
    return phase.radius + Math.min(0.42, phaseMass * 0.009);
  }

  _loop() {
    const dt = Math.min(0.033, this.clock.getDelta());
    if (this.state === 'playing') this._updatePlaying(dt);
    this._animateScene(dt);
    this._updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  _updatePlaying(dt) {
    // KA-RAPIER-003: physics advances on a fixed timestep accumulator.
    this.physicsAccumulator += dt;
    while (this.physicsAccumulator >= FIXED_TIMESTEP) {
      this._stepPhysics(FIXED_TIMESTEP);
      this.physicsAccumulator -= FIXED_TIMESTEP;
    }
    this._checkCollections();
    this._updatePickupAffordances();
    this.audio.setRollIntensity(Math.min(1, this.velocity.length() / 8), this.clumpAverageRadius);
    this._updateHud();
    this._updateDebugPanel();
  }

  _stepPhysics(dt) {
    if (!this.katamariBody) return;
    const input = new THREE.Vector3(
      (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) - (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0),
      0,
      (this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0) - (this.keys.has('w') || this.keys.has('arrowup') ? 1 : 0)
    );
    // KA-RAPIER-004: rolling input sets angular velocity/torque on the dynamic body instead of direct translation.
    if (input.lengthSq() > 0) {
      input.normalize();
      const cameraForward = new THREE.Vector3();
      this.camera.getWorldDirection(cameraForward);
      cameraForward.y = 0;
      cameraForward.normalize();
      const cameraRight = new THREE.Vector3().crossVectors(cameraForward, new THREE.Vector3(0, 1, 0)).normalize();
      const desiredMove = cameraRight.multiplyScalar(input.x).add(cameraForward.multiplyScalar(input.z)).normalize();
      const rollAxis = new THREE.Vector3(desiredMove.z, 0, -desiredMove.x).normalize();
      const targetSpeed = (10.5 / Math.sqrt(this.coreRadius)) * (1 - Math.min(0.28, this.loadRoughness * 0.12));
      const current = this.katamariBody.angvel();
      const target = rollAxis.multiplyScalar(targetSpeed);
      this.katamariBody.setAngvel({
        x: current.x + (target.x - current.x) * 0.22,
        y: current.y * 0.92,
        z: current.z + (target.z - current.z) * 0.22,
      }, true);
    }
    // KA-RAPIER-024: temporary lopsidedness biases the rolling body after uneven pickups.
    if (this.loadRoughness > 0.01) {
      const bias = new THREE.Vector3(this.loadBiasWorld.x, 0, this.loadBiasWorld.z);
      if (bias.lengthSq() > 0.0001) {
        bias.normalize().multiplyScalar(this.loadRoughness * 0.055);
        this.katamariBody.applyImpulse?.({ x: bias.x, y: 0, z: bias.z }, true);
      }
    }
    // KA-RAPIER-029: slope response comes from real Rapier contacts instead of manual height snapping.
    this.physics.step();
    this._syncKatamariFromPhysics();
    this._maybeGrowCoreCollider();
  }

  _syncKatamariFromPhysics() {
    if (!this.katamariBody) return;
    // KA-RAPIER-005: render transform follows the Rapier rigid body after each physics step.
    const p = this.katamariBody.translation();
    const q = this.katamariBody.rotation();
    this.velocity.copy(this._rapierVecToThree(this.katamariBody.linvel()));
    this.clump.position.set(p.x, p.y, p.z);
    this.clump.quaternion.set(q.x, q.y, q.z, q.w);
  }

  _rapierVecToThree(v) {
    return new THREE.Vector3(v.x, v.y, v.z);
  }

  _maybeGrowCoreCollider() {
    const target = this._targetRadius();
    this.coreRadius += (target - this.coreRadius) * 0.045;
    this.coreRadius = Math.max(PHASES[0].radius, this.coreRadius);
    if (Math.abs(this.coreRadius - this.lastCoreColliderRadius) > CORE_GROWTH_STEP) {
      // KA-RAPIER-022: core collider grows in controlled thresholds for stability.
      this.katamariCollider = this.physics.replaceKatamariCollider(this.katamariBody, this.katamariCollider, this.coreRadius, this.mass + 1);
      this.lastCoreColliderRadius = this.coreRadius;
    }
    // KA-RAPIER-019: visible core mirrors the Rapier rolling sphere collider radius.
    this.ball.scale.setScalar(this.coreRadius);
    this.clumpMinRadius = Math.max(this.clumpMinRadius, this.coreRadius);
    this.clumpMaxRadius = Math.max(this.clumpMaxRadius, this.coreRadius);
    this.clumpAverageRadius = (this.clumpMinRadius + this.clumpMaxRadius) / 2;
    this.radius = this.clumpAverageRadius;
  }

  _animateScene(dt) {
    const t = performance.now() * 0.001;
    for (const item of this.collectables) {
      if (item.collected) continue;
      if (item.object.userData.bumpUntil > performance.now()) {
        item.object.position.x += Math.sin(t * 70 + item.object.id) * 0.008;
        item.object.position.z += Math.cos(t * 65 + item.object.id) * 0.008;
      }
      if (item.type !== 'letter') continue;
      item.object.position.y = (item.object.userData.baseY ?? 0.78) + Math.sin(t * 2 + item.object.userData.floatSeed) * 0.12;
      item.object.rotation.y += dt * 1.2;
    }
    this._updateLoadBias(dt);
    for (const item of this.attached) {
      const wobble = Math.sin(t * 5.5 + item.seed) * item.wobble;
      const currentSurface = Math.max(item.surface, this.coreRadius + (item.kind === 'letter' ? 0.2 : 0.16));
      item.object.position.copy(item.anchor).multiplyScalar(currentSurface + wobble);
      if (item.kind === 'letter') {
        item.object.scale.copy(item.baseScale);
        item.object.rotation.y += dt * 0.55;
      } else {
        item.object.scale.copy(item.baseScale);
        if (item.spin) {
          item.object.rotation.x += dt * item.spin.x;
          item.object.rotation.z += dt * item.spin.z;
        }
      }
    }
  }

  _updateLoadBias(dt) {
    const localBias = new THREE.Vector3();
    let influence = 0;
    for (const item of this.attached) {
      if (item.kind !== 'prop') continue;
      // KA-RAPIER-026: lopsidedness decays so the clump smooths out over time and more pickups.
      item.rollInfluence *= Math.exp(-dt * 0.14);
      const weight = item.rollInfluence;
      localBias.addScaledVector(item.anchor, weight);
      influence += weight;
    }
    if (influence > 0) localBias.multiplyScalar(1 / influence);
    this.loadBiasWorld.copy(localBias).applyQuaternion(this.ball.quaternion);
    this.loadRoughness = clamp(influence / Math.max(24, this.mass * 0.7), 0, 1.35);
  }

  _checkCollections() {
    const phase = this._phaseIndex();
    const ballPos = this.clump.position;
    for (const item of this.collectables) {
      if (item.collected) continue;
      const dist = item.object.position.distanceTo(ballPos);
      // KA-RAPIER-020: pickup eligibility is based on clumpMaxRadius, not the clean core sphere.
      const canCollect = item.requiredRadius
        ? this.clumpMaxRadius >= item.requiredRadius
        : phase >= item.phaseGate;
      if (dist < this.clumpMaxRadius + item.radius + 0.32) {
        if (canCollect) {
          this._collect(item);
        } else {
          this._pushBackFrom(item);
          if (performance.now() - this.lastBumpSound > 350) {
            this.lastBumpSound = performance.now();
            this.audio.playSfx('bump', { volume: 0.28, rate: clamp(1.25 - item.radius * 0.12, 0.68, 1.1) });
          }
        }
      }
    }
  }

  _pushBackFrom(item) {
    const away = new THREE.Vector3(
      this.clump.position.x - item.object.position.x,
      0,
      this.clump.position.z - item.object.position.z
    );
    if (away.lengthSq() < 0.0001) away.set(rand(-1, 1), 0, rand(-1, 1));
    away.normalize();
    const strength = clamp((item.radius + 0.5) / Math.max(0.5, this.coreRadius), 0.65, 2.8);
    // KA-RAPIER-027: too-large collisions shove and shake instead of silently failing.
    this.katamariBody?.applyImpulse?.({ x: away.x * strength * 0.35, y: 0.04 * strength, z: away.z * strength * 0.35 }, true);
    item.object.userData.bumpUntil = performance.now() + 260;
  }

  _collect(item) {
    item.collected = true;
    this.mass += item.mass;
    // KA-RAPIER-023: pickup mass contributes to the katamari body and gameplay mass.
    if (this.katamariBody?.setAdditionalMass) this.katamariBody.setAdditionalMass(this.mass + 1, true);
    this.physics.removeItemCollider(item);
    if (item.blockingCollider) {
      this.physics.world.removeCollider(item.blockingCollider, false);
      item.blockingCollider = null;
    }
    this.world.remove(item.object);
    if (item.type === 'letter') {
      if (!item.distractor && this.level.letters.includes(item.letter)) {
        this.captured.add(item.letter);
        this._attachLetter(item);
        this._toast(`Letter ${item.letter} captured!`);
        this._showPickup(`Letter ${item.letter}`);
        // KA-RAPIER-037: letter pickup audio is preserved after physics migration.
        this.audio.playSfx('letter');
        // KA-RAPIER-035: level completion still requires one each of the target letters.
        if (this.captured.size >= this.level.letters.length) {
          window.setTimeout(() => this._startQuiz(), 550);
        }
      } else {
        this._toast(`Bonus ${item.letter}`);
        this._showPickup(`Bonus ${item.letter}`);
        this.audio.playSfx('collect', { volume: 0.28 });
      }
    } else {
      this._attachProp(item);
      this._showPickup(item.label || item.object.userData.assetName || 'Object');
      this.audio.playSfx(this.mass % 17 < item.mass ? 'grow' : 'collect', { volume: 0.32 });
    }
    this._recomputeClumpBounds();
  }

  _attachLetter(item) {
    // KA-RAPIER-034: letters attach at contact-derived points and stay visibly readable.
    const glyph = this.assets.createGlyph(item.letter, 'attached');
    const anchor = this._contactAnchorFor(item);
    const baseScale = 0.78;
    glyph.scale.setScalar(baseScale);
    glyph.position.copy(anchor).multiplyScalar(this.coreRadius + 0.2);
    glyph.rotation.set(rand(-0.25, 0.25), rand(0, Math.PI * 2), rand(-0.25, 0.25));
    this.clump.add(glyph);
    this.attached.push({
      object: glyph,
      kind: 'letter',
      anchor,
      surface: this.coreRadius + 0.2,
      baseScale: new THREE.Vector3(baseScale, baseScale, baseScale),
      wobble: 0.012,
      rollInfluence: 0,
      seed: Math.random() * 100,
    });
  }

  _attachProp(item) {
    const prop = item.object;
    const anchor = this._contactAnchorFor(item);
    const baseScale = prop.scale.clone();
    const surface = this.coreRadius + Math.min(1.35, item.radius * 0.65 * (item.protrusion ?? item.lopsidedness ?? 1));
    // KA-RAPIER-014: props stick on the side contacted by the rolling body.
    // KA-RAPIER-015: attached props preserve their world scale.
    // KA-RAPIER-016: attached visuals are parented to the katamari clump with contact-derived local transforms.
    prop.position.copy(anchor).multiplyScalar(surface);
    prop.scale.copy(baseScale);
    prop.rotation.set(rand(-0.8, 0.8), rand(0, Math.PI * 2), rand(-0.8, 0.8));
    this.clump.add(prop);
    // KA-RAPIER-025: long/flat items exert more roll wobble than compact items.
    const rollInfluence = item.mass * (0.6 + Math.min(2.6, item.radius)) * (item.lopsidedness ?? item.protrusion ?? 1);
    this.attached.push({
      object: prop,
      kind: 'prop',
      anchor,
      surface,
      baseScale,
      wobble: item.radius < 0.65 ? 0.01 : 0.004,
      spin: Math.random() < 0.18 ? { x: rand(-0.25, 0.25), z: rand(-0.25, 0.25) } : null,
      rollInfluence,
      seed: Math.random() * 100,
    });
  }

  _contactAnchorFor(item) {
    const worldOffset = new THREE.Vector3().subVectors(item.object.position, this.clump.position);
    if (worldOffset.lengthSq() < 0.001) worldOffset.set(rand(-1, 1), rand(0.2, 1), rand(-1, 1));
    const local = worldOffset.applyQuaternion(this.clump.quaternion.clone().invert()).normalize();
    return local;
  }

  _recomputeClumpBounds() {
    // KA-RAPIER-017: clump bounds are recomputed from attached visuals after pickups.
    // KA-RAPIER-018: rolling core, min, max, and average radii are separate values.
    const bounds = new THREE.Box3();
    const coreBox = new THREE.Box3(
      new THREE.Vector3(-this.coreRadius, -this.coreRadius, -this.coreRadius),
      new THREE.Vector3(this.coreRadius, this.coreRadius, this.coreRadius)
    );
    bounds.copy(coreBox);
    for (const item of this.attached) {
      item.object.updateMatrixWorld(true);
      const localBox = new THREE.Box3().setFromObject(item.object);
      localBox.min.sub(this.clump.position);
      localBox.max.sub(this.clump.position);
      bounds.union(localBox);
    }
    const size = bounds.getSize(new THREE.Vector3());
    const minAxis = Math.max(0.01, Math.min(size.x, size.y, size.z) * 0.5);
    const maxAxis = Math.max(this.coreRadius, Math.max(size.x, size.y, size.z) * 0.5);
    this.clumpMinRadius = Math.max(this.coreRadius, minAxis);
    this.clumpMaxRadius = Math.max(this.coreRadius, maxAxis);
    this.clumpAverageRadius = (this.clumpMinRadius + this.clumpMaxRadius) / 2;
    this.radius = this.clumpAverageRadius;
  }

  _startQuiz() {
    if (this.state !== 'playing') return;
    this.state = 'quiz';
    // KA-RAPIER-036: the Voidloop-style drill flow remains unchanged by physics.
    this.audio.playSfx('complete');
    this.quiz = new DrillSession(this.level.letters, 10);
    this.ui.quizOverlay.classList.add('active');
    this._showQuestion();
  }

  _showQuestion() {
    const q = this.quiz.current();
    if (!q) return this._finishQuiz();
    this.currentQuestionLocked = false;
    this.ui.quizProgress.textContent = `Question ${q.index} of ${q.total}`;
    this.ui.quizScore.textContent = `${this.quiz.correct} / ${this.quiz.totalAnswered}`;
    this.ui.quizTitle.textContent = q.type === 'identify_letter' ? 'What Letter Is This?' : `Find ${q.targetLetter}`;
    this.ui.quizPrompt.textContent = q.promptText;
    this.ui.quizChoices.innerHTML = '';
    window.setTimeout(() => this.audio.playQuestionPrompt(q), 320);
    q.choices.forEach((choice, index) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-choice';
      btn.type = 'button';
      btn.innerHTML = `<div class="quiz-speaker">🔊</div><div class="quiz-label">Choice ${index + 1}</div>`;
      let played = false;
      btn.addEventListener('click', () => {
        if (this.currentQuestionLocked) return;
        if (q.type === 'identify_letter') this.audio.playLetterChoice(choice);
        else this.audio.playWord(choice);
        if (!played) {
          played = true;
          btn.classList.add('played');
          return;
        }
        this._answerQuestion(choice, btn);
      });
      this.ui.quizChoices.appendChild(btn);
    });
  }

  _answerQuestion(choice, btn) {
    if (this.currentQuestionLocked) return;
    this.currentQuestionLocked = true;
    const result = this.quiz.answer(choice);
    btn.classList.add(result.correct ? 'correct' : 'wrong');
    this.audio.playSfx(result.correct ? 'correct' : 'wrong');
    if (!result.correct) {
      const correctBtn = Array.from(this.ui.quizChoices.children)
        .find((el, idx) => result.question.choices[idx] === result.question.correctAnswer);
      correctBtn?.classList.add('correct');
    }
    this.ui.quizScore.textContent = `${this.quiz.correct} / ${this.quiz.totalAnswered}`;
    window.setTimeout(() => {
      if (result.complete) this._finishQuiz();
      else this._showQuestion();
    }, result.correct ? 780 : 1300);
  }

  async _finishQuiz() {
    this.ui.quizOverlay.classList.remove('active');
    this._toast(`Drill complete: ${this.quiz.correct}/${this.quiz.totalAnswered}`);
    this.levelIndex++;
    if (this.levelIndex >= LEVELS.length) {
      this.state = 'complete';
      this.ui.completeText.textContent = 'You rolled every letter from A to Z and finished the final drill.';
      this.ui.completeOverlay.classList.add('active');
      return;
    }
    await this.startLevel(this.levelIndex);
    this.state = 'playing';
  }

  _updateCamera(dt) {
    const speedLag = this.velocity.clone().multiplyScalar(-0.22);
    // KA-RAPIER-031: camera frames the messy clump bounds instead of the clean core sphere.
    const ideal = new THREE.Vector3(
      this.clump.position.x + speedLag.x,
      this.clump.position.y + 8 + this.clumpMaxRadius * 2.2,
      this.clump.position.z + 10 + this.clumpMaxRadius * 3 + speedLag.z
    );
    this.camera.position.lerp(ideal, Math.min(1, dt * 3.25));
    this.camera.lookAt(this.clump.position.x, this.clump.position.y * 0.55, this.clump.position.z);
  }

  _updateHud() {
    if (!this.level) return;
    const phase = this._phaseIndex();
    const next = PHASES[Math.min(PHASES.length - 1, phase + 1)];
    const current = PHASES[phase];
    const phaseProgress = phase >= PHASES.length - 1
      ? 100
      : ((this.mass - current.minMass) / Math.max(1, next.minMass - current.minMass)) * 100;
    this.ui.levelKicker.textContent = `Level ${this.levelIndex + 1} / ${LEVELS.length}`;
    this.ui.levelTitle.textContent = this.level.name;
    // KA-RAPIER-021: HUD uses average clump size, with mass as secondary feedback.
    this.ui.phaseTitle.textContent = `${PHASES[phase].name}  ${this.clumpAverageRadius.toFixed(2)}m  Mass ${Math.floor(this.mass)}`;
    this.ui.growthFill.style.width = `${clamp(phaseProgress, 0, 100)}%`;
    this.ui.growthFill.style.background = `linear-gradient(90deg, ${colorToCss(this.level.accent)}, #ffffff)`;
    this.ui.letterRow.innerHTML = '';
    for (const letter of this.level.letters) {
      const chip = document.createElement('div');
      chip.className = `letter-chip ${this.captured.has(letter) ? 'ready' : ''}`;
      chip.textContent = letter;
      this.ui.letterRow.appendChild(chip);
    }
  }

  _showPickup(name) {
    // KA-RAPIER-032: latest pickup UI makes collection/growth legible.
    const count = (this.pickupCounts.get(name) || 0) + 1;
    this.pickupCounts.set(name, count);
    this.lastPickup = name;
    this.ui.pickupName.textContent = name;
    this.ui.pickupCount.textContent = `Collected x${count}`;
    this.ui.pickupPanel.classList.add('active');
    window.clearTimeout(this.pickupTimer);
    this.pickupTimer = window.setTimeout(() => this.ui.pickupPanel.classList.remove('active'), 1700);
  }

  _updatePickupAffordances() {
    // KA-RAPIER-033: collectables advertise eligible, nearly eligible, and too-large states.
    const t = performance.now() * 0.001;
    for (const item of this.collectables) {
      if (item.collected || item.type === 'letter') continue;
      const canCollect = this.clumpMaxRadius >= (item.requiredRadius ?? 0);
      const nearly = !canCollect && this.clumpMaxRadius >= (item.requiredRadius ?? Infinity) * 0.82;
      item.object.traverse((child) => {
        if (!child.isMesh || !child.material) return;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) {
          if (!('emissiveIntensity' in mat)) continue;
          mat.emissiveIntensity = canCollect ? 0.18 + Math.sin(t * 5) * 0.06 : nearly ? 0.09 : 0;
        }
      });
      if (nearly) {
        item.object.position.x += Math.sin(t * 20 + item.object.id) * 0.0025;
        item.object.position.z += Math.cos(t * 20 + item.object.id) * 0.0025;
      }
    }
  }

  _updateDebugPanel() {
    if (!this.debugVisible) return;
    // KA-RAPIER-038: debug overlay exposes core/max/avg radii, mass, contacts, and last pickup.
    this.ui.debugPanel.textContent = [
      `coreRadius: ${this.coreRadius.toFixed(2)}`,
      `clumpMax:   ${this.clumpMaxRadius.toFixed(2)}`,
      `clumpAvg:   ${this.clumpAverageRadius.toFixed(2)}`,
      `mass:       ${this.mass.toFixed(1)}`,
      `roughness:  ${this.loadRoughness.toFixed(2)}`,
      `contacts:   ${this.physics.world?.narrowPhase?.contactPairs?.length ?? 'n/a'}`,
      `last:       ${this.lastPickup || '-'}`,
    ].join('\n');
  }

  _toast(text) {
    window.clearTimeout(this.toastTimer);
    this.ui.toast.textContent = text;
    this.ui.toast.classList.add('active');
    this.toastTimer = window.setTimeout(() => this.ui.toast.classList.remove('active'), 1800);
  }

  _resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
