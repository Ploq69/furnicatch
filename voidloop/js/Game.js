import * as THREE from 'three';
import { SkyGradient, createSkyGradientPreset } from './SkyGradient.js';
import { assetLoader } from './AssetLoader.js';
import { input } from './InputManager.js';
import { audio } from './AudioManager.js';
import { ParticleSystem } from './ParticleSystem.js';
import { FlipbookVFX, FLIPBOOK_EFFECTS } from './FlipbookVFX.js';
import { ShaderParticleFX } from './ShaderParticleFX.js';
import { preloadAllTextures, updateWeaponEmitters, playWeaponBurst } from './ElementalVFX.js';
import { Player } from './Player.js';
import { World } from './World.js';
import { UIManager } from './UIManager.js';
import { SFXMapper } from './SFXMapper.js';
import { TouchControls } from './TouchControls.js';
import { LootDrop, LOOT_CONFIG } from './LootDrop.js';
import { GAME, BIOMES, BLOCK_TYPES, BLOCK_LOOT_TABLES, ENEMY_LOOT_TABLES, ZONE_BLOCK_LOOT_TABLES, ZONE_ENEMY_LOOT_TABLES } from './constants.js';
import { ZoneManager } from './ZoneManager.js';
import { ZONES, getZoneById, getZoneAtPosition } from './ZoneData.js';
import { Inventory } from './Inventory.js';
import { ProgressionManager } from './ProgressionManager.js';
import { getKayKitItem, getKayKitPaths, getKayKitCharacter, KAYKIT_ANIMATIONS } from './KayKitLoadout.js';
import { LetterPool, SPELLING_WORDS } from './SpellingData.js';
import { SpellingChallenge } from './SpellingEngine.js';
import { LetterDrop } from './LetterDrop.js';
import { glyph3D } from '../../js/Glyph3DManager.js';
import { PetManager } from './PetManager.js';
import { PetLetter } from './PetLetter.js';
import { RemotePlayer } from './RemotePlayer.js';
import { Enemy } from './Enemy.js';
import { settings } from './SettingsManager.js';
import { ResourceInventory, RESOURCE_META } from './ResourceInventory.js';
import { getBlockProperties } from './BlockProperties.js';
import { gamepadManager } from './GamepadManager.js';

const STATES = {
  LOADING: 'loading',
  PLAYING: 'playing',
  CAMP: 'camp',
  SPELLING: 'spelling',
};

const ISO_UNDERGROUND_VIEW = {
  DEPTH_START: 0.8,
  DEPTH_FULL: 7.0,
  HORIZONTAL_SCALE: 0.9,
  VERTICAL_SCALE: 1.05,
  TARGET_Y_BIAS: 0.15,
  TARGET_FORWARD_BIAS: 0,
  BACKDROP_DARKNESS: 0.16,
  BACKDROP_SATURATION: 0.42,
  AMBIENT_BOOST: 0.34,
  FOG_NEAR: 18,
  FOG_FAR: 56,
};

const VOXEL_SKY = {
  TOP: 0x63b8ff,
  HORIZON: 0xd7f4ff,
  CLOUD: 0xffffff,
  FOG_NEAR: 64,
  FOG_FAR: 260,
  TP_FOG_NEAR: 30,
  TP_FOG_FAR: 70,
};

const ZONE_ATMOSPHERE = {
  forest: { skyTop: 0x77c7ff, horizon: 0xd8f6ff, fog: 0xbde8d5, sunColor: 0xfff5cf, ambientColor: 0x8abf8a, cloudOpacity: 0.32, hazeStrength: 0.25, groundTint: 0x355f3b, silhouette: 0x17351f },
  fire: { skyTop: 0x2b1d23, horizon: 0xff8158, fog: 0x5a2a22, sunColor: 0xffb05f, ambientColor: 0xb0694a, cloudOpacity: 0.18, hazeStrength: 0.72, groundTint: 0x4b241c, silhouette: 0x130d0b },
  ice: { skyTop: 0xa7dbff, horizon: 0xf2fbff, fog: 0xd8f3ff, sunColor: 0xeaffff, ambientColor: 0x9ebfd8, cloudOpacity: 0.42, hazeStrength: 0.38, groundTint: 0xb8dff0, silhouette: 0x47687a },
  desert: { skyTop: 0x71b7e6, horizon: 0xffdf9b, fog: 0xe8c27e, sunColor: 0xffd17a, ambientColor: 0xc99d62, cloudOpacity: 0.12, hazeStrength: 0.58, groundTint: 0xc28b45, silhouette: 0x6f4720 },
  steelworks: { skyTop: 0x4f7fa4, horizon: 0xc4d1d4, fog: 0x7b8790, sunColor: 0xffb05c, ambientColor: 0x7f8f9d, cloudOpacity: 0.52, hazeStrength: 0.82, groundTint: 0x4d5961, silhouette: 0x1c2328 },
  mire: { skyTop: 0x5f8874, horizon: 0xaec6a1, fog: 0x748b6a, sunColor: 0xe8d69a, ambientColor: 0x668b62, cloudOpacity: 0.46, hazeStrength: 0.68, groundTint: 0x314a35, silhouette: 0x142317 },
  citadel: { skyTop: 0x8fb9de, horizon: 0xf0d3a4, fog: 0xd8b77d, sunColor: 0xffdf9a, ambientColor: 0xb89969, cloudOpacity: 0.24, hazeStrength: 0.34, groundTint: 0x8a7356, silhouette: 0x3f3427 },
  default: { skyTop: VOXEL_SKY.TOP, horizon: VOXEL_SKY.HORIZON, fog: VOXEL_SKY.HORIZON, sunColor: 0xfff5e6, ambientColor: 0x8888aa, cloudOpacity: 0.28, hazeStrength: 0.3, groundTint: 0x4d6b55, silhouette: 0x263344 },
};

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothstep = (edge0, edge1, value) => {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const easeOutCubic = (value) => 1 - Math.pow(1 - clamp01(value), 3);
const easeInOutSine = (value) => -(Math.cos(Math.PI * clamp01(value)) - 1) / 2;
const smoothFactor = (dt, halfLife) => 1 - Math.pow(2, -dt / Math.max(0.0001, halfLife));
const shortestAngle = (from, to) => {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
};
const dampAngle = (from, to, dt, halfLife) => from + shortestAngle(from, to) * smoothFactor(dt, halfLife);

const TP_FOV = 65;
const TP_DISTANCE = 4.8;
const TP_HEIGHT = 1.25;
const TP_SHOULDER_X = 0.2;
const TP_SHOULDER_Y = 0.05;
const TP_PITCH_DEFAULT = 0.22;
const TP_PITCH_MIN = -0.55;
const TP_PITCH_MAX = 0.75;
const TP_LOOKAHEAD = 0.9;
const TP_VERTICAL_DEAD_ZONE = 0.15;
const TP_HORIZONTAL_HALF_LIFE = 0.1;
const TP_VERTICAL_HALF_LIFE = 0.35;
const TP_LOOKAHEAD_HALF_LIFE = 0.16;
const TP_POSITION_HALF_LIFE = 0.14;
const TP_YAW_HALF_LIFE = 0.09;
const TP_COLLISION_EXTEND_HALF_LIFE = 0.24;
const TP_RECENTER_DELAY = 1.25;
const TP_COLLISION_REFRESH_MS = 125;
const TP_COLLISION_MOVE_EPS = 0.35;
const TOP_DOWN_HEIGHT = 42;
const TOP_DOWN_TARGET_Y = 0.75;
const MIN_RENDER_SCALE = 0.75;

export class Game {
  constructor(container, options = {}) {
    this.container = container;
    this._startZoneId = options.startZoneId || null;
    this.state = STATES.LOADING;
    this.clock = new THREE.Clock();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Keep the main game at native CSS resolution. On Retina displays a 1.5x
    // render scale is a large fragment-cost jump and makes 60fps fragile.
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
    this.container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);
    this.renderer.setClearColor(this.scene.background);
    this.skyGradient = null;
    this.cloudGroup = null;
    this.cloudMaterial = null;
    this.boundaryEnvironment = null;
    this._createSky();

    // Camera — Orthographic isometric by default, with a toggleable third-person mining view
    this.cameraZoom = 3.0;
    this.baseD = 18;
    const aspect = window.innerWidth / window.innerHeight;
    const d = this.baseD / this.cameraZoom;
    this.isoCamera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 200);
    this.isoCamera.position.set(20, 20, 20);
    this.isoCamera.lookAt(0, 0, 0);
    this.thirdPersonCamera = new THREE.PerspectiveCamera(TP_FOV, aspect, 0.05, 450);
    this.scene.add(this.thirdPersonCamera);
    this.camera = this.isoCamera;
    this.cameraMode = 'iso';
    this.cameraTarget = new THREE.Vector3();
    this._cameraTargetReady = false;
    this.camYaw = 0;
    this.camPitch = TP_PITCH_DEFAULT;
    this.camPos = new THREE.Vector3();
    this.tpCamera = {
      subjectTarget: new THREE.Vector3(),
      lookTarget: new THREE.Vector3(),
      lookahead: new THREE.Vector3(),
      previousPlayerPos: new THREE.Vector3(),
      desiredYaw: 0,
      displayYaw: 0,
      pitch: TP_PITCH_DEFAULT,
      distance: TP_DISTANCE,
      collisionDistance: TP_DISTANCE,
      manualRecenteringTimer: 0,
      initialized: false,
    };
    this.tpCameraTuning = {
      fov: TP_FOV,
      distance: TP_DISTANCE,
      height: TP_HEIGHT,
      shoulderX: TP_SHOULDER_X,
      shoulderY: TP_SHOULDER_Y,
      pitchDefault: TP_PITCH_DEFAULT,
      pitchMin: TP_PITCH_MIN,
      pitchMax: TP_PITCH_MAX,
      lookahead: TP_LOOKAHEAD,
      verticalDeadZone: TP_VERTICAL_DEAD_ZONE,
      horizontalHalfLife: TP_HORIZONTAL_HALF_LIFE,
      verticalHalfLife: TP_VERTICAL_HALF_LIFE,
      lookaheadHalfLife: TP_LOOKAHEAD_HALF_LIFE,
      positionHalfLife: TP_POSITION_HALF_LIFE,
      yawHalfLife: TP_YAW_HALF_LIFE,
      collisionExtendHalfLife: TP_COLLISION_EXTEND_HALF_LIFE,
      recenterDelay: TP_RECENTER_DELAY,
    };
    this.tpCameraDebug = false;
    this._renderScaleMax = Math.min(window.devicePixelRatio || 1, 1.25);
    this._renderScale = Math.min(1, this._renderScaleMax);
    this._renderScaleLowTime = 0;
    this._renderScaleHighTime = 0;
    this._objectiveHudRefreshTimer = 0;
    this._perfFrame = {};
    this._rewardFeedbackQueue = [];
    this._tpCollision = {
      lastAt: -Infinity,
      lastDesired: new THREE.Vector3(),
      lastPivot: new THREE.Vector3(),
      actualDist: TP_DISTANCE,
      rayDist: TP_DISTANCE,
      nearHit: false,
      initialized: false,
    };

    // Lighting
    this.ambient = new THREE.AmbientLight(0xbbccdd, 0.9);
    this.scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xfff5e6, 2.2);
    this.sun.position.set(10, 30, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(512, 512);
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 80;
    this.sun.shadow.camera.left = -20;
    this.sun.shadow.camera.right = 20;
    this.sun.shadow.camera.top = 20;
    this.sun.shadow.camera.bottom = -20;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun);
    this._applyGraphicsSettings();

    // Torch lights (added per floor)
    this.torches = [];

    // Floor plane (dark ground)
    const floorGeo = new THREE.PlaneGeometry(300, 300);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 0.9 });
    this.floorPlane = new THREE.Mesh(floorGeo, floorMat);
    this.floorPlane.rotation.x = -Math.PI / 2;
    this.floorPlane.position.y = -160;
    this.floorPlane.receiveShadow = false;
    this.scene.add(this.floorPlane);
    this._createBoundaryEnvironment();

    // Progression (needed before timer init)
    this.progression = new ProgressionManager();

    // Systems
    this.particles = new ParticleSystem(this.scene);
    this.flipbooks = new FlipbookVFX(this.scene);
    this.shaderFX = new ShaderParticleFX(this.scene);
    this.world = new World(this.scene, this.renderer);
    this.player = new Player(this.scene);
    this.player.world = this.world;
    this.ui = new UIManager(this);
    // Sync sky button displays with saved settings
    const savedSunIntensity = parseFloat(settings.get('sunIntensity')) || 4.0;
    const savedSunDiscSize = parseFloat(settings.get('sunDiscSize')) || 0.06;
    if (this.ui.elSunIntensityVal) this.ui.elSunIntensityVal.textContent = savedSunIntensity.toFixed(1);
    if (this.ui.elSunSizeVal) this.ui.elSunSizeVal.textContent = savedSunDiscSize.toFixed(2);
    this.aimReticle = document.createElement('div');
    this.aimReticle.textContent = '+';
    this.aimReticle.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);color:#e8fff2;text-shadow:0 1px 4px #000;font-size:22px;font-weight:700;z-index:20;pointer-events:none;display:none;';
    document.body.appendChild(this.aimReticle);
    this.ui.onSunIntensityChange = (val) => {
      const v = parseFloat(val) || 0.5;
      if (this.skyGradient) {
        this.skyGradient.sunStrength = v;
        this.skyGradient._updateUniforms();
      }
      settings.set('sunIntensity', v);
    };
    this.ui.onSunSizeChange = (val) => {
      const v = parseFloat(val) || 0.06;
      if (this.skyGradient) {
        this.skyGradient.sunDiscSize = v;
        this.skyGradient._updateUniforms();
      }
      settings.set('sunDiscSize', v);
    };
    this.ui.onAuroraToggle = (enabled) => {
      if (this.skyGradient) {
        this.skyGradient.auroraEnabled = enabled;
        this.skyGradient._updateUniforms();
      }
      settings.set('auroraEnabled', enabled);
    };
    this.ui.onSunLock = () => this._lockSunSettings();
    this.ui.onCameraZoomChange = (val) => {
      this.cameraZoom = val;
      this._updateCameraZoom();
    };
    // Spelling UI callbacks
    this.ui.onSpellingPlay = () => this._onSpellingPlay();
    this.ui.onSpellingCheck = (input) => this._onSpellingCheck(input);
    this.ui.onSpellingReveal = () => this._onSpellingReveal();
    this.ui.onSpellingClose = () => this._onSpellingClose();
    this.ui.onSpellingPlayWord = (word) => this._onSpellingPlayWord(word);

    // Timer — countdown
    this.floorTimer = this.progression.getRoundStartTime(GAME.COUNTDOWN_BASE);
    this.totalTime = 0;
    this.killCount = 0;
    this.level = 1;
    this.exitOpen = false;

    // Loot
    this.loot = new LootDrop(this.scene);

    // Spelling / Letter drops
    this.letterPool = new LetterPool();
    this.letterDrops = new LetterDrop(this.scene);
    this.spellingChallenge = null;
    this.spellingGlyphMesh = null;
    this.spellingReturnCameraMode = null;

    // Pet system
    this.petManager = new PetManager();
    this.pet = null;

    // Screen shake
    this.shakeIntensity = 0;
    this.shakeDuration = 0;

    // Resize
    window.addEventListener('resize', () => this._onResize());
    this.renderer.domElement.addEventListener('click', () => {
      if (this.cameraMode === 'thirdPerson' && document.pointerLockElement !== this.renderer.domElement) {
        this.renderer.domElement.requestPointerLock?.();
      }
    });

    // Listen for settings changes
    this._settingsUnsub = settings.onChange((key, value) => {
      if (key === 'graphicsQuality' || key === 'shadowQuality') this._applyGraphicsSettings();
      if (key === 'masterVolume' || key === 'sfxVolume' || key === 'musicVolume') {
        settings.applyToAudio(audio);
      }
      if (key === 'skyCycleEnabled' && this.skyGradient) {
        this.skyGradient.autoTick = value;
      }
      if (key === 'skyCycleSpeed' && this.skyGradient) {
        this.skyGradient.cycleSpeed = value;
      }
      if (key === 'starfieldEnabled' && this.skyGradient) {
        this.skyGradient.starsEnabled = value;
        this.skyGradient._updateUniforms();
      }
      if (key === 'sunIntensity' && this.skyGradient) {
        const v = parseFloat(value) || 0.5;
        this.skyGradient.sunStrength = v;
        this.skyGradient._updateUniforms();
        if (this.sun) this.sun.intensity = v * 0.5;
        this.world?.terrainMesh?.unifiedRenderer?.setLightIntensity?.(v * 0.5);
        if (this.ui.elSunIntensityVal) this.ui.elSunIntensityVal.textContent = v.toFixed(1);
      }
      if (key === 'sunDiscSize' && this.skyGradient) {
        const v = parseFloat(value) || 0.06;
        this.skyGradient.sunDiscSize = v;
        this.skyGradient._updateUniforms();
        if (this.ui.elSunSizeVal) this.ui.elSunSizeVal.textContent = v.toFixed(2);
      }
    });

    // Playtest mode detection
    const params = new URLSearchParams(location.search);
    this.playtestKey = params.get('playtest');
    this.isTimedMode = !!this.playtestKey;
    this.tpCameraDebug = params.has('camdebug') || params.has('cameraDebug');

    // Score tracking for timed mode
    this.lettersCollected = 0;
    this.blocksMined = 0;
    this.enemiesDefeated = 0;
    this.tokensGathered = 0;

    // Mining combo system
    this.mineCombo = 0;
    this.mineComboTimer = 0;
    this._lastCollectSfxAt = 0;

    // Resource floating-text batcher (type → { count, timer, color, displayName })
    this._resourceTextBatcher = new Map();
    this._RESOURCE_TEXT_FLUSH_DELAY = 0.8; // seconds of inactivity before flush
    this._RESOURCE_TEXT_IMMEDIATE_FLUSH = 1000; // flush instantly at this threshold

    // Missile strike special attack
    this.activeMissiles = [];
    this.missileStrikeCooldown = 0;

    // Zone progression systems
    this.zoneManager = new ZoneManager();
    this.inventory = new Inventory();
    this.resources = new ResourceInventory();
    this.hazards = null;
    this._blockHazardTimer = 0;
    this.currentLetterQuiz = null;
    this.pendingLetterLevelUp = null;
    this._gatewayMeshes = [];
    this._gatewayLabels = [];
    this._isTransitioning = false;

    // Touch controls for iPad/tablet
    this.touchControls = new TouchControls();

    // Gamepad manager
    this.gamepadManager = gamepadManager;
    this.elGamepadIndicator = document.getElementById('gamepad-indicator');
    gamepadManager.onConnect = (id) => {
      if (this.elGamepadIndicator) {
        this.elGamepadIndicator.classList.add('active');
        this.elGamepadIndicator.title = `Controller: ${id}`;
      }
      this.ui?.showFloatingText?.('🎮 Controller connected', 0x4ade80);
    };
    gamepadManager.onDisconnect = () => {
      if (this.elGamepadIndicator) {
        this.elGamepadIndicator.classList.remove('active');
      }
      this.ui?.showFloatingText?.('Controller disconnected', 0xf87171);
    };
    // Initial state
    if (gamepadManager.connected && this.elGamepadIndicator) {
      this.elGamepadIndicator.classList.add('active');
    }

    // Pause state
    this.paused = false;
    this._pauseBind = null;
    this._bindPauseMenu();

    // Multiplayer sync state
    this.isMultiplayer = false;
    this.isHost = false;
    this.net = null;
    this._worldSeed = null;
    this._syncSendTimer = 0;
    this._remotePlayer = null;

    // Start loading
    this._loadAssets();
  }

  async _loadAssets() {
    const priority = [
      'KayKit_BlockBits_1.0_FREE/Assets/gltf/dirt.gltf',
      'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone.gltf',
      'KayKit_BlockBits_1.0_FREE/Assets/gltf/dirt_with_grass.gltf',
      'KayKit_BlockBits_1.0_FREE/Assets/gltf/stone_dark.gltf',
      'KayKit_BlockBits_1.0_FREE/Assets/gltf/metal.gltf',
      'KayKit_BlockBits_1.0_FREE/Assets/gltf/decorative_block_blue.gltf',
      'KayKit_Adventurers_2.0_FREE/Characters/gltf/Rogue.glb',
      'KayKit_Adventurers_2.0_FREE/Characters/gltf/Rogue_Hooded.glb',
      'KayKit_Adventurers_2.0_FREE/Characters/gltf/Barbarian.glb',
      ...getKayKitPaths(),
    ];

    assetLoader.onProgress = (loaded, total) => {
      this.ui.setLoadingProgress(loaded, total);
    };

    await assetLoader.preloadBatch(priority);

    // Preload VFX textures
    await this.particles.preloadTextures();
    await preloadAllTextures();
    // Preload loot models
    await this.loot.preloadModels();
    // Preload alphabet glyphs for letter drops
    await glyph3D.load();
    await this.letterDrops.preload();

    this._initAudioOnInteraction();
    await this.player.spawn();
    await this.player.equipWeapon(0);

    // Multiplayer: host generates and shares world seed, guest waits for it
    if (this.isMultiplayer && this.net) {
      if (this.isHost) {
        this._worldSeed = Math.floor(Math.random() * 1000000);
        this.net.syncWorldSeed(this._worldSeed);
      } else {
        try {
          this._worldSeed = await this._waitForWorldSeed();
        } catch (err) {
          console.error('[Game] Failed to get world seed:', err);
        }
      }
      // Set up network listeners
      this.net.onPlayerState((state) => this._updateRemotePlayer(state));
      this.net.onEvent(({ type, data }) => this._handleNetEvent(type, data));
    }

    if (this.playtestKey) {
      await this._loadPlaytestLevel();
    } else {
      await this._generateZones(this._worldSeed, this._startZoneId);
    }

    // Create remote player for multiplayer
    if (this.isMultiplayer) {
      this._createRemotePlayer();
    }

    // Progression replaces the old zone-specific shop; loadout stays cosmetic.
    this._syncFunctionalEquipment();

    this.ui.hideLoading();
    this.state = STATES.PLAYING;
    window._game = this;
    this.renderer.setAnimationLoop(() => this._loop());
  }

  async _waitForWorldSeed(timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const seed = await this.net.getWorldSeed();
      if (seed != null) return seed;
      await new Promise(r => setTimeout(r, 500));
    }
    throw new Error('Timed out waiting for world seed from host');
  }

  _syncFunctionalEquipment() {
    this.player.equipTool(this.inventory.getEquippedTool());
    this.player.equipArmor(this.inventory.getEquippedArmor());
    this.player.equipFunctionalWeapon(this.inventory.getEquippedWeapon());
    // Sync rocket boots from progression save
    if (this.progression.hasRocketBoots()) {
      if (!this.inventory.hasItem('rocket_boots')) {
        this.inventory.addItem('rocket_boots');
      }
      if (!this.inventory.getEquippedBoots()) {
        this.inventory.equip('rocket_boots', 'boots');
      }
      this.player.setRocketBootsLevel(this.progression.getRocketBootsFuelLevel());
    }
    this.player.equipBoots(this.inventory.getEquippedBoots());
  }

  buyProgressionUpgrade(upgradeId) {
    const result = this.progression.purchase(upgradeId, this.player.coins);
    if (result.success) {
      if (this.player.coins !== Infinity) this.player.coins = result.coins;
      // Handle rocket boots purchase/equip
      if (upgradeId === 'rocket_boots_unlock') {
        this.inventory.addItem('rocket_boots');
        this.inventory.equip('rocket_boots', 'boots');
        this._syncFunctionalEquipment();
      }
      if (upgradeId === 'rocket_boots_fuel') {
        this.player.setRocketBootsLevel(this.progression.getRocketBootsFuelLevel());
      }
      this.ui.updateStats();
      this.ui.updateObjectiveHud?.(this._getObjectiveState());
    }
    return result;
  }

  resetPickaxeUpgrades() {
    const refund = this.progression.resetPickaxe();
    if (refund > 0) {
      this.player.coins += refund;
      this.ui.showFloatingText(`Pickaxe reset! +${refund} coins refunded`, 0xfbbf24);
    } else {
      this.ui.showFloatingText('Pickaxe reset!', 0xfbbf24);
    }
    this.ui.updateStats();
    this.ui.updateObjectiveHud?.(this._getObjectiveState());
  }

  sellResource(resourceType, amount = 1) {
    const earned = this.resources.sell(resourceType, amount);
    if (earned <= 0) return { success: false, coins: 0 };
    this.player.coins += earned;
    this.ui.updateStats();
    return { success: true, coins: earned };
  }

  _canUseWeapon(weapon) {
    if (!weapon) return false;
    if (weapon.cooldown <= 0) return true;
    return weapon.data?.type === 'thrown' && this.progression.state.grenade.unlocked && this.progression.state.grenade.charges > 0;
  }

  _prepareGrenadeThrow(weapon) {
    if (!this.progression.state.grenade.unlocked) {
      return { allowed: false, message: 'Unlock grenades first' };
    }
    if (weapon.cooldown > 0) {
      if (!this.progression.spendGrenadeCharge()) {
        return { allowed: false, message: `${weapon.cooldown.toFixed(1)}s` };
      }
      weapon.cooldown = 0;
      return { allowed: true, charged: true };
    }
    return { allowed: true, charged: false };
  }

  async _generateZones(seed, zoneId = null) {
    this.world.clear();
    const worldSeed = seed != null ? seed : Math.floor(Math.random() * 1000000);
    this._worldSeed = worldSeed;

    // Independent levels: only generate the active zone
    const targetZoneId = zoneId || this.zoneManager.currentZoneId;
    if (zoneId) {
      this.zoneManager.setCurrentZone(targetZoneId);
    }
    const zone = getZoneById(targetZoneId);
    if (!zone) throw new Error(`Unknown zone: ${targetZoneId}`);

    const zoneSeed = worldSeed + zone.order * 7919;
    await this.world.generateZone(zone.id, zoneSeed, true);
    await this.world.buildTerrainMesh();

    // Spawn player at current zone's spawn point
    if (zone) {
      this.player.position.set(zone.spawnPoint.x, 1, zone.spawnPoint.z);
    } else {
      this.player.position.set(0, 1, 0);
    }
    this.player.hp = this.player.maxHp;
    this.exitOpen = false;
    this.floorTimer = GAME.COUNTDOWN_BASE;
    this.killCount = 0;
    this.loot.clear();
    this.letterDrops.clear();
    this.shaderFX.clear();
    this._clearPet();
    this.letterPool.reset();

    // Set up letter pool for current zone
    if (zone) {
      this.letterPool.setLetters(zone.letters, zone.id);
    }

    const letters = this.letterPool.getCurrentLetters().join(' ');
    this.ui.setFloorText(`ZONE: ${zone?.name?.toUpperCase() || 'UNKNOWN'} — Letters: ${letters}`);
    this.ui.updateObjectiveHud?.(this._getObjectiveState(zone?.id));
    this.ui.showExitOpen(false);
    this._spawnPet();
    this._updateTorches();
    this._createGateways();
    this._setupHazards();
  }

  async _generateFloor(floorNum, seed) {
    // Backward compatibility
    return this._generateZones(seed);
  }

  async _loadPlaytestLevel() {
    this._clearExitPortal();
    // Load draft from localStorage
    const draftKey = `voidloopLevelBuilderDraft:${this.playtestKey}`;
    const draftJson = localStorage.getItem(draftKey);
    if (!draftJson) {
      console.error('[Game] Playtest draft not found:', this.playtestKey);
      // Fall back to procedural
      await this._generateFloor(1);
      return;
    }
    let levelDoc;
    try {
      levelDoc = JSON.parse(draftJson);
    } catch (e) {
      console.error('[Game] Failed to parse playtest draft:', e);
      await this._generateFloor(1);
      return;
    }

    await this.world.loadAuthoredLevel(levelDoc, { scene: this.scene, letterDrop: this.letterDrops });

    // Spawn player at authored start position
    if (this.world.startPosition) {
      this.player.position.copy(this.world.startPosition);
    } else {
      this.player.position.set(0, 0, 0);
    }
    this.player.hp = this.player.maxHp;
    this.exitOpen = false;
    this.floorTimer = levelDoc.gameplay?.timerSeconds || 120;
    this.killCount = 0;
    this.loot.clear();
    this.letterDrops.clear();
    this.shaderFX.clear();
    this._clearPet();

    // Reset score tracking
    this.lettersCollected = 0;
    this.blocksMined = 0;
    this.enemiesDefeated = 0;
    this.tokensGathered = 0;
    this.mineCombo = 0;
    this.mineComboTimer = 0;

    this.letterPool.reset();
    const letters = this.letterPool.getCurrentLetters().join(' ');
    this.ui.setFloorText(`PLAYTEST — ${levelDoc.title || 'Custom Level'} — Letters: ${letters}`);
    this.ui.showExitOpen(false);
    this._spawnPet();
  }

  _updateTorches() {
    // Clear old torches
    for (const t of this.torches) {
      this.scene.remove(t);
    }
    this.torches = [];
  }

  _initAudioOnInteraction() {
    if (this._audioInitialized) return;
    const init = () => {
      if (this._audioInitialized) return;
      this._audioInitialized = true;
      audio.init();
      settings.applyToAudio(audio);
      SFXMapper.preloadGameplay?.();
      window.removeEventListener('click', init);
      window.removeEventListener('keydown', init);
    };
    window.addEventListener('click', init);
    window.addEventListener('keydown', init);
  }

  async startDescent(fromDeath = false) {
    this.state = STATES.PLAYING;
    if (fromDeath) {
      // Reset player for new run
      this.player.hp = this.player.maxHp;
      this.player.position.set(0, 0, 0);
      this.killCount = 0;
      this.totalTime = 0;
      await this._generateFloor(1);
    } else {
      const nextFloor = this.world.floor + 1;
      if (this.isHost && this.net) {
        this.net.syncEvent('floor_changed', { floorNum: nextFloor, seed: this._worldSeed });
      }
      await this._generateFloor(nextFloor, this._worldSeed);
    }
  }

  _loop() {
    const dt = Math.min(this.clock.getDelta(), 0.05);

    // Poll gamepad input at the very start of the frame so all systems see it
    gamepadManager.update(dt);

    this._perfFrame = {
      worldMs: 0,
      renderMs: 0,
      cameraCollisionMs: 0,
      uiMs: 0,
    };
    this.world?.terrainMesh?.resetPerfStats?.();

    if (this.state === STATES.PLAYING) {
      // Escape handling: pause takes priority, then loadout/petden close
      if (input.pressed('Escape')) {
        if (this.ui.progressionOpen) {
          this.ui.hideShop();
        } else if (this.ui.loadoutOpen) {
          this.ui.hideLoadout();
        } else if (this.ui.petDenOpen) {
          this.ui.hidePetDenOverlay();
        } else {
          this._togglePause();
        }
      }

      if (input.pressed('KeyI') && !this.paused && !this.ui.progressionOpen) {
        this.ui.toggleLoadout();
      }

      if (input.pressed('KeyP') && !this.paused && !this.ui.progressionOpen) {
        this.ui.togglePetDen();
      }

      if (input.pressed('KeyB') && !this.paused && !this.ui.loadoutOpen && !this.ui.petDenOpen) {
        this.ui.showShop();
      }

      if (input.pressed('KeyV') && !this.paused && !this.ui.loadoutOpen && !this.ui.petDenOpen && !this.ui.progressionOpen) {
        this._toggleCameraMode();
      }

      if (!this.ui.loadoutOpen && !this.ui.petDenOpen && !this.paused && !this.ui.progressionOpen) {
        this._updatePlaying(dt);
      }
    }

    if (this.state === STATES.SPELLING) {
      if (input.pressed('Escape')) {
        this._onSpellingClose();
      }
      // Spelling uses the isometric camera so the glyph is visible.
      this._setCameraMode('iso', false);
      const offset = 20 / this.cameraZoom;
      this.isoCamera.position.set(
        this.player.position.x + offset,
        this.player.position.y + offset,
        this.player.position.z + offset
      );
      this.isoCamera.lookAt(this.player.position.x, this.player.position.y, this.player.position.z);
      // Bob the 3D glyph mesh if present
      if (this.spellingGlyphMesh) {
        this.spellingGlyphMesh.position.y = 1.5 + Math.sin(Date.now() * 0.003) * 0.15;
        this.spellingGlyphMesh.rotation.y += dt * 1.5;
      }
    }

    this.particles.update(dt, this.camera);
    this.flipbooks.update(dt, this.camera);
    this.shaderFX.update(dt);
    updateWeaponEmitters(dt, this.camera);
    const uiStart = performance.now();
    this.ui.update(dt);
    this._perfFrame.uiMs += performance.now() - uiStart;
    const renderStart = performance.now();
    this._updateSky(dt);
    // Render terrain first (writes depth + color), then THREE.js scene on top
    this.renderer.autoClear = false;
    this.renderer.clear();
    this.world.terrainMesh.render(this.camera);
    // Prevent THREE.js from drawing a fullscreen background quad over terrain
    const savedBg = this.scene.background;
    this.scene.background = null;
    this.renderer.render(this.scene, this.camera);
    this.scene.background = savedBg;
    this._perfFrame.renderMs = performance.now() - renderStart;
    input.update();
  }

  _updatePlaying(dt) {
    // Multiplayer: send player state every 100ms
    if (this.isMultiplayer && this.net) {
      this._syncSendTimer += dt;
      if (this._syncSendTimer >= 0.1) {
        this._syncSendTimer = 0;
        this.net.syncPlayerState({
          x: this.player.position.x,
          y: this.player.position.y,
          z: this.player.position.z,
          r: this.player.rotation,
          characterId: this.player.loadout?.characterId || 'ranger',
        });
      }
    }

    // Timer — countdown
    this.floorTimer -= dt;
    this.totalTime += dt;
    if (this.floorTimer <= 0) {
      this.floorTimer = 0;
      this.player.hp = 0; // Time's up = death
    }
    this.ui.setTimer(this.floorTimer);

    // Combo timer decay
    if (this.mineComboTimer > 0) {
      this.mineComboTimer -= dt;
      if (this.mineComboTimer <= 0) {
        this.mineCombo = 0;
      }
    }

    if (this.cameraMode === 'thirdPerson') {
      this._updateThirdPersonControls(dt);
    }

    // Update shared sun direction for fake shadows
    const sunDir = this._getSunDirection();

    // Player update
    this.player.setFluidState(this.world.getFluidStateAt(this.player.position));
    this.player.setSurfaceState(this.world.getSurfaceStateAt(this.player.position));
    this.player.sunDirection = sunDir;
    this.player.update(dt, input);
    this._applyBlockHazards(dt);
    if (this.player.jumpStartedThisFrame) {
      const pos = this.player.position.clone().add(new THREE.Vector3(0, 0.08, 0));
      this.particles.dust(pos, 5);
      this.particles.spark(pos, this.player.jumpsRemaining === 0 ? 4 : 2);
      if (this.player.wallJumpedThisFrame) {
        this.particles.spark(pos, 10);
        this._screenShake(0.7, 0.22);
      }
    }
    if (this.player.landedThisFrame) {
      const pos = this.player.position.clone().add(new THREE.Vector3(0, 0.04, 0));
      this.particles.dust(pos, 4);
      gamepadManager.vibrate(0.25, 60);
    }

    // Rocket boots VFX
    if (this.player.rocketBootsActive) {
      const forward = new THREE.Vector3(Math.sin(this.player.rotation), 0, Math.cos(this.player.rotation));
      const leftBoot = this.player.position.clone().add(new THREE.Vector3(-forward.z * 0.2, 0.15, forward.x * 0.2)).sub(forward.clone().multiplyScalar(0.25));
      const rightBoot = this.player.position.clone().add(new THREE.Vector3(forward.z * 0.2, 0.15, -forward.x * 0.2)).sub(forward.clone().multiplyScalar(0.25));
      this.particles.spawnRocketTrail(leftBoot, forward, 3);
      this.particles.spawnRocketTrail(rightBoot, forward, 3);
    }

    // Wall-slide VFX
    if (this.player.isWallSliding) {
      const pos = this.player.position.clone().add(new THREE.Vector3(
        this.player.wallSlideNormalX * 0.25,
        0.4 + Math.random() * 0.4,
        this.player.wallSlideNormalZ * 0.25
      ));
      this.particles.dust(pos, 1);
    }

    // Update remote player animation
    if (this._remotePlayer) {
      this._remotePlayer.update(dt);
    }

    // Camera solve happens after player movement so small terrain corrections are filtered from the current frame.
    const isoDepthFactor = this._getIsoUndergroundFactor();
    const offset = 20 / this.cameraZoom;
    let shakeX = 0, shakeY = 0, shakeZ = 0;
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      const decay = this.shakeDuration > 0 ? Math.max(0, this.shakeDuration / 0.3) : 0;
      shakeX = (Math.random() - 0.5) * this.shakeIntensity * decay;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity * decay * 0.5;
      shakeZ = (Math.random() - 0.5) * this.shakeIntensity * decay;
      if (this.shakeDuration <= 0) this.shakeIntensity = 0;
    }
    this._updateCamera(dt, offset, shakeX, shakeY, shakeZ, isoDepthFactor);

    // Update weapon cooldowns
    for (const w of this.player.weapons) w.update(dt);
    this.missileStrikeCooldown = Math.max(0, this.missileStrikeCooldown - dt);

    if (input.pressed('KeyQ')) {
      this._tryCallMissileStrike();
    }

    // Contextual J button — mine block or attack enemy
    const minePressed = input.pressed('KeyJ') || (this.cameraMode === 'thirdPerson' && input.buttonPressed?.('left'));
    const activeWeapon = this.player.weapons[this.player.currentSlot];
    if (minePressed && this._canUseWeapon(activeWeapon)) {
      const weapon = activeWeapon;
      if (weapon.data.type === 'thrown') {
        const prep = this._prepareGrenadeThrow(weapon);
        if (!prep.allowed) {
          this.ui.showFloatingText(prep.message, 0xffaa00);
          SFXMapper.swingMiss();
          return;
        }
        const aim = this._getMiningAim();
        const thrown = this.player.attack(aim.origin, aim.direction, this.scene, audio, this.particles, this.world.enemies);
        if (thrown) {
          const grenade = weapon.projectiles[weapon.projectiles.length - 1];
          if (grenade?.explosive) {
            grenade.radius = this.progression.getGrenadeRadius();
          }
          weapon.cooldown = this.progression.getGrenadeCooldown();
          this.player.playAttackAnim();
          // third-person uses full-body attack animation, no viewmodel swing needed
        } else {
          SFXMapper.swingMiss();
        }
      } else {

      // Check for nearby enemy first (combat priority)
      const nearestEnemy = this._findNearestEnemy(2.5);
      if (nearestEnemy) {
        const equippedWeapon = this.player.getEquippedWeapon();
        this.player.playAttackAnim();
        nearestEnemy.takeDamage(weapon.data.damage, equippedWeapon);
        // Attack VFX
        const handPos = new THREE.Vector3();
        this.player.equipmentHolders.rightHand?.getWorldPosition(handPos);
        const hitPos = nearestEnemy.position.clone().add(new THREE.Vector3(0, 0.5, 0));
        this.particles.spawn({ pos: hitPos, count: 6, color: 0xff4444, speed: 4, life: 0.3, size: 0.2, texture: 'slash' });
        this.particles.spark(hitPos, 4);
        this.flipbooks.spawn({ pos: hitPos, ...FLIPBOOK_EFFECTS.impact });
        // Weapon elemental burst
        const equippedItemId = this.player.loadout?.rightHand;
        if (equippedItemId) playWeaponBurst(this.scene, this.camera, hitPos, equippedItemId);
        SFXMapper.meleeSwing('sword');
        SFXMapper.meleeHit();
        weapon.cooldown = GAME.ATTACK_COOLDOWN;
      } else {
        // Mine nearest block
        const miningTarget = this._findMiningTarget(GAME.MINE_RANGE);
        const nearestBlock = miningTarget?.block;
        if (miningTarget && !miningTarget.allowed) {
          this.ui.showMiningBlocked(miningTarget, nearestBlock ? BLOCK_TYPES[nearestBlock.typeKey] : null);
          this.player.playAttackAnim();
          SFXMapper.swingMiss();
          weapon.cooldown = this.player.getSwingCooldown();
          return;
        }
        if (nearestBlock && !nearestBlock.destroyed) {
          // Use the same weapon attack animation for mining
          this.player.playAttackAnim();
          SFXMapper.mineSwing();
          // Mine VFX
          const handPos2 = new THREE.Vector3();
          this.player.equipmentHolders.rightHand?.getWorldPosition(handPos2);
          const blockPos = nearestBlock.position.clone();
          blockPos.y += 0.3;
          this.particles.dust(blockPos, 5);
          this.particles.spark(blockPos, 3);
          // Weapon elemental burst on mine swing
          const mineItemId = this.player.loadout?.rightHand;
          if (mineItemId) playWeaponBurst(this.scene, this.camera, blockPos, mineItemId);

          let destroyed = false;
          let typeKey = nearestBlock.typeKey;
          let zoneId = nearestBlock.zoneId;
          const isFloat = nearestBlock.isFloating;
          let terrainResult = null;

          if (miningTarget.isTerrain) {
            // ── Terrain block mining ──
            const g = miningTarget.gridPos;
            const result = this.world.mineTerrainBlock(g.x, g.y, g.z, this._getMiningDamage(nearestBlock), {
              center: miningTarget.brushCenter,
              zoneId,
              type: typeKey,
              radius: this._getTerrainBrushRadius(zoneId),
            });
            terrainResult = result;
            destroyed = result.destroyed;
            typeKey = result.cell?.type || typeKey;
            zoneId = result.cell?.zoneId || zoneId;
          } else {
            // ── Floating block mining ──
            destroyed = nearestBlock.takeDamage(this._getMiningDamage(nearestBlock));
          }

          if (destroyed) {
            // Fluid bubble burst when digging terrain inside a fluid cell
            if (miningTarget.isTerrain) {
              const fluid = this.world.getFluidStateAt(blockPos);
              if (fluid?.type === 'water' && blockPos.y < fluid.surfaceY - 0.15) {
                this.particles.spawn({
                  pos: blockPos.clone().setY(fluid.surfaceY - 0.1),
                  count: 4,
                  color: 0xcffff5,
                  speed: 0.6,
                  life: 0.7,
                  size: 0.09,
                  texture: 'circle',
                });
              }
            }
            // Sync block destruction in multiplayer
            if (this.isMultiplayer && this.net) {
              this.net.syncEvent('block_broken', {
                x: blockPos.x,
                y: blockPos.y - 0.3,
                z: blockPos.z,
              });
            }

            // Combo tracking
            if (this.mineComboTimer > 0) {
              this.mineCombo++;
            } else {
              this.mineCombo = 1;
            }
            this.mineComboTimer = 2.0;
            this.blocksMined++;
            this.progression.recordMined(zoneId || this.zoneManager.currentZoneId, 1);

            // Block break VFX + screen shake (stronger for floating blocks)
            this.particles.dust(blockPos, isFloat ? 10 : 8);
            this.particles.spark(blockPos, isFloat ? 8 : 6);
            this._screenShake(isFloat ? 0.8 : 0.5, 0.25);
            gamepadManager.vibrate(isFloat ? 0.5 : 0.3, 80);

            if (!miningTarget.isTerrain) {
              this.world.mineBlock(nearestBlock, this.particles, audio);
            }

            if (miningTarget.isTerrain) {
              this._awardTerrainDigRewards(terrainResult, blockPos, zoneId);
            } else {
              // enemyLoot: spawn loot on enemy death from block table
              const table = BLOCK_LOOT_TABLES[typeKey];
              if (table) {
                this.loot.spawnFromTable(blockPos, table);
              }

              // Floating blocks keep the strongest letter/resource rewards.
              if (Math.random() < this.progression.getLetterDropChance('floating')) {
                const letter = this._pickLetterForZone(zoneId || this.zoneManager.currentZoneId);
                if (letter) {
                  this.letterDrops.spawn(blockPos, letter);
                  this.ui.showFloatingText(`Letter ${letter}!`, 0xfacc15);
                }
              }
              const blockDef = BLOCK_TYPES[typeKey];
              if (blockDef && blockDef.resource) {
                this.resources.add(blockDef.resource, 1);
                this.batchResourceText(blockDef.resource, 1, 0x88ccff);
              }
            }

            // Mining combo tracked silently (no floating text spam)

            // timeBonus for mining (combo bonus)
            this.floorTimer += GAME.TIME_BONUS_MINING + (isFloat ? this.mineCombo : 0);
            const extraBudget = this.progression.getPickaxeWidth() - 1;
            if (extraBudget > 0) {
              const extraMined = miningTarget.isTerrain
                ? this._mineExtraTerrainBlocks(miningTarget, zoneId, extraBudget)
                : this._mineExtraFloatingBlocks(nearestBlock, zoneId, extraBudget);
              // Pickaxe width bonus applied silently (no floating text spam)
            }
            SFXMapper.collectOre();
          }
        } else {
          // Swing at nothing
          this.player.playAttackAnim();
          SFXMapper.swingMiss();
        }
        // Dynamic swing cooldown based on mineSpeed upgrade
        weapon.cooldown = this.player.getSwingCooldown();
      }
      }
    }

    // Hotbar
    for (let i = 0; i < 4; i++) {
      if (input.pressed(`Digit${i + 1}`)) {
        this.player.equipWeapon(i);
        this.ui.setHotbarSlot(i);
        SFXMapper.hotbarSelect();
      }
    }

    // Update projectiles
    this.player.updateProjectiles(dt, {
      scene: this.scene,
      particles: this.particles,
      enemies: this.world.enemies,
      world: this.world,
      game: this,
    });
    this._updateActiveMissiles(dt);

    // World update (enemies + blocks)
    const worldStart = performance.now();
    this.world.update(dt, this.player.position, this.particles, audio, this.player, {
      cameraMode: this.cameraMode,
      camera: this.camera,
      currentZoneId: this.zoneManager.currentZoneId,
      sunDirection: sunDir,
    });
    this._perfFrame.worldMs = performance.now() - worldStart;

    // Loot update (hoover, magnet, collect)
    this.loot.update(dt, this.player.position, (type, value, color) => {
      this._onLootCollect(type, value, color);
    });

    this._syncCurrentZoneFromPosition();
    this._checkZoneCompletion();

    // Letter drops update
    const collectedLetter = this.letterDrops.update(dt, this.player.position);
    if (collectedLetter) {
      const letter = typeof collectedLetter === 'string' ? collectedLetter : collectedLetter.letter;
      const pickupPosition = typeof collectedLetter === 'string' ? null : collectedLetter.position;
      this._collectLetterForMastery(letter, pickupPosition);
    }

    // Pet update
    if (this.pet) {
      this.pet.sunDirection = sunDir;
      this.pet.update(dt, this.player, this.world);
      // Sync pet light to terrain shader so the ground glows
      if (this.pet.glowLight) {
        this.world?.terrainMesh?.setPetLight(
          this.pet.container.position,
          this.pet.glowLight.color,
          this.pet.glowLight.intensity,
          this.pet.glowLight.distance
        );
      }
    } else {
      // No pet equipped — turn off terrain point light
      this.world?.terrainMesh?.setPetLight({ x: 0, y: -1000, z: 0 }, 0x000000, 0, 1);
    }

    // Check enemy deaths and spawn loot
    for (const enemy of this.world.enemies) {
      if (enemy.justDied) {
        enemy.justDied = false;
        // Sync enemy death in multiplayer
        if (this.isMultiplayer && this.net && enemy._netId != null) {
          this.net.syncEvent('enemy_died', { id: enemy._netId });
        }
        this.killCount++;
        // timeBonus for kill
        this.floorTimer += GAME.TIME_BONUS_KILL;
        this.ui.showTimeBonus(`+${GAME.TIME_BONUS_KILL}s KILL!`);
        // Spawn loot
        const table = ENEMY_LOOT_TABLES[enemy.typeKey];
        if (table) {
          this.loot.spawnFromTable(enemy.position, table);
        }
      }
    }

    // Check gateways
    this._checkGateways();

    // Update hazards
    if (this.hazards) {
      this.hazards.update(dt);
    }

    this._processRewardFeedbackQueue();
    this._flushResourceTexts(dt);

    this._updateZoneAtmosphere(isoDepthFactor);

    // Check death
    if (this.player.hp <= 0) {
      SFXMapper.playerDeath();
      this.state = STATES.CAMP;
      this.ui.showCamp(true);
      return;
    }

    // Update UI. Objective/zone-letter HUD work includes DOM mutation, so keep
    // it responsive without doing it every animation frame.
    const uiStart = performance.now();
    this.ui.updateStats();
    this._objectiveHudRefreshTimer += dt;
    if (this._objectiveHudRefreshTimer >= 0.2) {
      this._objectiveHudRefreshTimer = 0;
      this.ui.updateObjectiveHud?.(this._getObjectiveState());
    }
    this._perfFrame.uiMs += performance.now() - uiStart;

    // FPS counter
    this.frameCount = (this.frameCount || 0) + 1;
    const now = performance.now();
    if (now - (this.lastFpsTime || 0) >= 1000) {
      this.ui.setFPS(this.frameCount, this._getPerfDebugStats());
      this._updateDynamicRenderScale(this.frameCount);
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  _getPerfDebugStats() {
    const enabled = window.location.search.includes('perf=1')
      || window.localStorage?.getItem('voidloopPerfDebug') === '1';
    if (!enabled) return null;
    const terrain = this.world?.terrainMesh?.getStats?.() || {};
    const terrainPerf = this.world?.terrainMesh?.perfStats || {};
    const audioStats = audio.getStats?.() || {};
    return {
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      sceneChildren: this.scene.children.length,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      visibleChunks: terrain.visibleChunks || 0,
      liveChunks: terrain.liveChunks || terrain.chunks || 0,
      dirtyChunks: terrain.dirtyChunks || 0,
      modifiedCells: terrain.blocks || 0,
      terrainTruncatedSlots: terrain.unifiedTruncatedSlots || 0,
      terrainMaxUploadedVertices: terrain.unifiedMaxUploadedVertices || 0,
      rebuildMs: terrain.rebuildMs || 0,
      worldMs: this._perfFrame.worldMs || 0,
      terrainVisibilityMs: terrainPerf.visibilityMs || 0,
      terrainRebuildMs: terrainPerf.rebuildMs || 0,
      cameraCollisionMs: this._perfFrame.cameraCollisionMs || 0,
      uiMs: this._perfFrame.uiMs || 0,
      renderMs: this._perfFrame.renderMs || 0,
      raycasts: terrainPerf.raycasts || 0,
      raycastMs: terrainPerf.raycastMs || 0,
      visibilityRecomputed: terrainPerf.visibilityRecomputed || 0,
      renderScale: this._renderScale || 1,
      shaderEffects: this.shaderFX?.effects?.length || 0,
      audioBuffers: audioStats.buffers || 0,
      audioLoading: audioStats.loading || 0,
      flyers: typeof document !== 'undefined' ? document.querySelectorAll('.letter-pickup-flyer,.floating-loot,.damage-number').length : 0,
    };
  }

  _applyBlockHazards(dt) {
    const fluid = this.world?.getFluidStateAt?.(this.player.position);
    const hazard = fluid?.hazard;
    if (!hazard?.damagePerSecond) {
      this._blockHazardTimer = 0;
      return;
    }

    this._blockHazardTimer += dt;
    if (this._blockHazardTimer < 0.5) return;
    const damage = Math.max(1, Math.round(hazard.damagePerSecond * this._blockHazardTimer));
    this._blockHazardTimer = 0;
    this.player.takeDamage(damage);
    this.ui?.showHazardWarning?.(hazard.type || 'hazard', true);
    this.ui?.showFloatingText?.(`-${damage}`, 0xff4422);
  }

  _updateDynamicRenderScale(fps) {
    if (this.cameraMode !== 'thirdPerson') {
      this._renderScaleLowTime = 0;
      this._renderScaleHighTime = 0;
      if (this._renderScale < Math.min(1, this._renderScaleMax)) {
        this._setRenderScale(Math.min(1, this._renderScaleMax));
      }
      return;
    }

    if (fps < 55) {
      this._renderScaleLowTime += 1;
      this._renderScaleHighTime = 0;
    } else if (fps >= 59) {
      this._renderScaleHighTime += 1;
      this._renderScaleLowTime = 0;
    } else {
      this._renderScaleLowTime = 0;
      this._renderScaleHighTime = 0;
    }

    if (this._renderScaleLowTime >= 2 && this._renderScale > MIN_RENDER_SCALE) {
      this._setRenderScale(Math.max(MIN_RENDER_SCALE, this._renderScale - 0.05));
      this._renderScaleLowTime = 0;
    } else if (this._renderScaleHighTime >= 3 && this._renderScale < Math.min(1, this._renderScaleMax)) {
      this._setRenderScale(Math.min(Math.min(1, this._renderScaleMax), this._renderScale + 0.03));
      this._renderScaleHighTime = 0;
    }
  }

  _setRenderScale(scale) {
    this._renderScale = Math.max(MIN_RENDER_SCALE, Math.min(Math.min(1, this._renderScaleMax), scale));
    this.renderer.setPixelRatio(this._renderScale);
  }

  _createSky() {
    const cycleEnabled = settings.get('skyCycleEnabled');
    const cycleSpeed = settings.get('skyCycleSpeed');
    const starsEnabled = settings.get('starfieldEnabled');
    const sunIntensity = parseFloat(settings.get('sunIntensity')) || 4.0;
    const sunDiscSize = parseFloat(settings.get('sunDiscSize')) || 0.06;
    const auroraEnabled = settings.get('auroraEnabled') !== false;
    this.skyGradient = new SkyGradient(this.scene, null, {
      scale: 800,
      autoTick: cycleEnabled,
      cycleSpeed: cycleSpeed,
      starsEnabled: starsEnabled,
      sunStrength: sunIntensity,
      sunDiscSize: sunDiscSize,
      auroraEnabled: auroraEnabled,
    });
    this._createCloudLayer();
  }

  _updateSky(dt) {
    if (this.skyGradient) {
      this.skyGradient.mesh.position.copy(this.camera.position);
      // Use fixed scale similar to old horizonMesh (185) — within far plane
      // and close enough that nearby terrain occludes the sky
      this.skyGradient.mesh.scale.setScalar(185);
      // Update star twinkle / minor animations even when autoTick is off
      this.skyGradient.update(Math.min(dt, 0.1));

      // Sync directional light and terrain lighting with orbiting sun
      const sunDir = this.skyGradient.sunDir;
      const sunFactor = this.skyGradient.getSunIntensityFactor();
      const userSunIntensity = parseFloat(settings.get('sunIntensity')) || 4.0;
      const darkness = this.skyGradient.material.uniforms.darkness.value;
      const adjustedIntensity = userSunIntensity * 0.5 * sunFactor * (1.0 - darkness * 0.5);

      if (this.sun) {
        this.sun.position.set(sunDir.x * 50, sunDir.y * 50, sunDir.z * 50);
        this.sun.intensity = adjustedIntensity;
      }
      this.world?.terrainMesh?.unifiedRenderer?.setLightDir?.(sunDir.x, sunDir.y, sunDir.z);
      this.world?.terrainMesh?.unifiedRenderer?.setLightIntensity?.(adjustedIntensity);
    }
    if (this.cloudGroup) {
      this.cloudGroup.position.x = this.camera.position.x;
      this.cloudGroup.position.z = this.camera.position.z;
    }
  }

  _setSkyAtmosphere({ visible = true, topColor, horizonColor, fogColor, sunColor, cloudOpacity = 0.32, darkness = 0, hazeStrength = 0.3 }) {
    if (!this.skyGradient) return;
    this.skyGradient.setVisible(visible);
    this.skyGradient.setDarkness(darkness);

    // Build gradient preset from current zone colors
    const preset = ZONE_ATMOSPHERE[this.zoneManager?.currentZoneId] || ZONE_ATMOSPHERE.default;
    const builders = createSkyGradientPreset({
      skyTop: topColor ?? preset.skyTop,
      horizon: horizonColor ?? preset.horizon,
      fog: fogColor ?? preset.fog,
      sunColor: sunColor ?? preset.sunColor,
    });
    this.skyGradient.setBuilders(builders);

    // Sync directional light with sky sun so shadows align with visible sun
    const sunDir = this.skyGradient.getSunDirection();
    const sunFactor = this.skyGradient.getSunIntensityFactor();
    const userSunIntensity = parseFloat(settings.get('sunIntensity')) || 4.0;
    const userSunDiscSize = parseFloat(settings.get('sunDiscSize')) || 0.06;
    const adjustedIntensity = userSunIntensity * 0.5 * sunFactor * (1.0 - darkness * 0.5);
    if (this.sun) {
      this.sun.color.copy(sunColor ?? new THREE.Color(preset.sunColor)).lerp(new THREE.Color(0x9fb6ff), darkness * 0.25);
      // Position the directional light so it shines FROM the sun direction
      this.sun.position.set(sunDir.x * 50, sunDir.y * 50, sunDir.z * 50);
      this.sun.intensity = adjustedIntensity;
    }

    this.skyGradient.setSun({
      color: sunColor ?? new THREE.Color(preset.sunColor),
      strength: userSunIntensity * sunFactor * (1.0 - darkness * 0.5),
      sharpness: 16.0,
      glowStrength: 0.6,
      discSize: userSunDiscSize,
    });
    this.world?.terrainMesh?.unifiedRenderer?.setLightDir?.(sunDir.x, sunDir.y, sunDir.z);
    this.world?.terrainMesh?.unifiedRenderer?.setLightIntensity?.(adjustedIntensity);

    // Tick the gradient once so colors update immediately
    this.skyGradient.update(0);

    if (this.cloudMaterial) {
      this.cloudMaterial.opacity = cloudOpacity * (1 - darkness);
      this.cloudMaterial.color.copy(new THREE.Color(VOXEL_SKY.CLOUD).lerp(fogColor || horizonColor, hazeStrength * 0.28));
    }
    if (this.cloudGroup) this.cloudGroup.visible = visible && cloudOpacity > 0.03 && darkness < 0.96;
  }

  _lockSunSettings() {
    const intensity = settings.get('sunIntensity');
    const discSize = settings.get('sunDiscSize');
    fetch('/api/lock-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sunIntensity: intensity, sunDiscSize: discSize }),
    })
      .then(r => r.json())
      .then((res) => {
        if (res.ok) {
          this.ui?.showFloatingText?.(`🔒 Sun locked: ${intensity} / ${discSize}`, 0x4ade80);
        } else {
          this.ui?.showFloatingText?.('Lock failed — check server', 0xf87171);
        }
      })
      .catch(() => {
        this.ui?.showFloatingText?.('Lock failed — check server', 0xf87171);
      });
  }

  _createCloudLayer() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0.0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.30, 'rgba(255,255,255,0.78)');
    grad.addColorStop(0.56, 'rgba(255,255,255,0.92)');
    grad.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    for (let i = 0; i < 9; i++) {
      const x = 20 + i * 26 + (i % 2) * 8;
      const y = 52 + Math.sin(i * 1.7) * 13;
      ctx.fillRect(x, y, 34 + (i % 3) * 10, 10 + (i % 2) * 6);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearFilter;
    this.cloudMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      color: VOXEL_SKY.CLOUD,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide,
    });
    this.cloudGroup = new THREE.Group();
    this.cloudGroup.name = 'stylized_cloud_layer';
    const cloudGeo = new THREE.PlaneGeometry(38, 12);
    for (let i = 0; i < 18; i++) {
      const mesh = new THREE.Mesh(cloudGeo, this.cloudMaterial);
      const angle = (i / 18) * Math.PI * 2;
      const radius = 55 + (i % 4) * 12;
      mesh.position.set(Math.cos(angle) * radius, 38 + (i % 3) * 8, Math.sin(angle) * radius);
      mesh.rotation.set(-0.22, -angle + Math.PI * 0.5, 0);
      mesh.scale.setScalar(0.9 + (i % 5) * 0.18);
      mesh.renderOrder = -960;
      this.cloudGroup.add(mesh);
    }
    this.scene.add(this.cloudGroup);
  }

  _createBoundaryEnvironment() {
    this.boundaryEnvironment = new THREE.Group();
    this.boundaryEnvironment.name = 'distant_boundary_environment';
    for (const zone of ZONES) {
      this._addZoneApron(zone);
      this._addZoneSilhouettes(zone);
    }
    this.scene.add(this.boundaryEnvironment);
  }

  _addZoneApron(zone) {
    const preset = ZONE_ATMOSPHERE[zone.id] || ZONE_ATMOSPHERE.default;
    const b = zone.bounds;
    const width = 26;
    const yInner = -0.25;
    const yOuter = -5.5;
    const mat = new THREE.MeshLambertMaterial({
      color: preset.groundTint,
      transparent: true,
      opacity: 0.82,
      fog: true,
      side: THREE.DoubleSide,
    });
    const strips = [
      [[b.minX, yInner, b.minZ], [b.maxX, yInner, b.minZ], [b.maxX, yOuter, b.minZ - width], [b.minX, yOuter, b.minZ - width]],
      [[b.maxX, yInner, b.minZ], [b.maxX, yInner, b.maxZ], [b.maxX + width, yOuter, b.maxZ], [b.maxX + width, yOuter, b.minZ]],
      [[b.maxX, yInner, b.maxZ], [b.minX, yInner, b.maxZ], [b.minX, yOuter, b.maxZ + width], [b.maxX, yOuter, b.maxZ + width]],
      [[b.minX, yInner, b.maxZ], [b.minX, yInner, b.minZ], [b.minX - width, yOuter, b.minZ], [b.minX - width, yOuter, b.maxZ]],
    ];
    for (const points of strips) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
      geo.setIndex([0, 1, 2, 0, 2, 3]);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `${zone.id}_terrain_apron`;
      mesh.receiveShadow = false;
      this.boundaryEnvironment.add(mesh);
    }
  }

  _addZoneSilhouettes(zone) {
    const preset = ZONE_ATMOSPHERE[zone.id] || ZONE_ATMOSPHERE.default;
    const b = zone.bounds;
    const mat = new THREE.MeshLambertMaterial({
      color: preset.silhouette,
      transparent: true,
      opacity: zone.id === 'steelworks' ? 0.88 : 0.72,
      fog: true,
    });
    const group = new THREE.Group();
    group.name = `${zone.id}_horizon_silhouette`;
    const cx = (b.minX + b.maxX) * 0.5;
    const cz = (b.minZ + b.maxZ) * 0.5;
    const longX = b.maxX - b.minX;
    const longZ = b.maxZ - b.minZ;

    if (zone.id === 'steelworks') {
      for (let i = 0; i < 7; i++) {
        const stack = new THREE.Mesh(new THREE.BoxGeometry(2.2, 12 + (i % 3) * 5, 2.2), mat);
        stack.position.set(b.maxX + 15 + (i % 2) * 7, stack.geometry.parameters.height * 0.5 - 0.5, b.minZ + 12 + i * 14);
        group.add(stack);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.4, 4.5), mat);
        cap.position.set(stack.position.x, stack.position.y + stack.geometry.parameters.height * 0.5 + 0.7, stack.position.z);
        group.add(cap);
      }
      const gantry = new THREE.Mesh(new THREE.BoxGeometry(8, 2.2, longZ * 0.72), mat);
      gantry.position.set(b.maxX + 20, 8, cz);
      group.add(gantry);
    } else if (zone.id === 'citadel') {
      for (let i = 0; i < 5; i++) {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(5, 15 + i % 2 * 5, 5), mat);
        tower.position.set(b.maxX + 14, tower.geometry.parameters.height * 0.5, b.minZ + 14 + i * 24);
        group.add(tower);
      }
      const wall = new THREE.Mesh(new THREE.BoxGeometry(5, 7, longZ * 0.82), mat);
      wall.position.set(b.maxX + 12, 3.5, cz);
      group.add(wall);
    } else if (zone.id === 'forest' || zone.id === 'mire') {
      const count = zone.id === 'mire' ? 18 : 24;
      for (let i = 0; i < count; i++) {
        const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 7 + (i % 4), 1.2), mat);
        trunk.position.set(b.minX + (i / count) * longX, trunk.geometry.parameters.height * 0.5 - 0.8, b.maxZ + 10 + (i % 3) * 2);
        const crown = new THREE.Mesh(new THREE.ConeGeometry(4 + (i % 2), 9, 5), mat);
        crown.position.set(trunk.position.x, trunk.position.y + trunk.geometry.parameters.height * 0.5 + 4, trunk.position.z);
        group.add(trunk, crown);
      }
    } else if (zone.id === 'desert' || zone.id === 'ice') {
      for (let i = 0; i < 8; i++) {
        const ridge = new THREE.Mesh(new THREE.ConeGeometry(9 + (i % 3) * 3, 7 + (i % 4) * 2, 4), mat);
        ridge.position.set(b.minX + 8 + i * (longX / 7), ridge.geometry.parameters.height * 0.5 - 1, b.maxZ + 13 + (i % 2) * 5);
        ridge.rotation.y = Math.PI * 0.25;
        group.add(ridge);
      }
    } else {
      for (let i = 0; i < 8; i++) {
        const rock = new THREE.Mesh(new THREE.BoxGeometry(4 + (i % 3), 5 + (i % 4), 4 + (i % 2)), mat);
        rock.position.set(b.minX + 8 + i * (longX / 7), rock.geometry.parameters.height * 0.5 - 0.8, b.maxZ + 12);
        group.add(rock);
      }
    }

    this.boundaryEnvironment.add(group);
  }

  _syncTerrainFog() {
    const fog = this.scene.fog;
    if (fog) {
      this.world?.terrainMesh?.setFog?.({
        enabled: true,
        color: fog.color,
        near: fog.near,
        far: fog.far,
      });
    } else {
      this.world?.terrainMesh?.setFog?.({ enabled: false });
    }
  }

  _getIsoUndergroundFactor() {
    if (this.cameraMode !== 'iso' || !this.world || !this.player) return 0;
    const depth = this.world.getTerrainDepthAtPlayer?.(this.player.position) || 0;
    return smoothstep(ISO_UNDERGROUND_VIEW.DEPTH_START, ISO_UNDERGROUND_VIEW.DEPTH_FULL, depth);
  }

  _updateZoneAtmosphere(isoDepthFactor = 0) {
    const currentZone = getZoneAtPosition(this.player.position.x, this.player.position.z);
    const preset = ZONE_ATMOSPHERE[currentZone?.id] || ZONE_ATMOSPHERE.default;
    const baseBackground = new THREE.Color(preset.fog ?? currentZone?.fogColor ?? 0x0a0a0a);
    const skyTop = new THREE.Color(preset.skyTop);
    const skyHorizon = new THREE.Color(preset.horizon);
    const fogBase = new THREE.Color(preset.fog).lerp(skyHorizon, 0.22);
    const baseAmbient = new THREE.Color(preset.ambientColor);
    const sunColor = new THREE.Color(preset.sunColor);
    const undergroundT = clamp01(isoDepthFactor);

    if (undergroundT > 0) {
      const hsl = {};
      baseBackground.getHSL(hsl);
      const caveBackground = new THREE.Color().setHSL(
        hsl.h,
        hsl.s * ISO_UNDERGROUND_VIEW.BACKDROP_SATURATION,
        Math.max(0.06, hsl.l * ISO_UNDERGROUND_VIEW.BACKDROP_DARKNESS)
      );
      this.scene.background = baseBackground.clone().lerp(caveBackground, undergroundT);
      this.renderer.setClearColor(this.scene.background);

      const fogColor = this.scene.background.clone().lerp(new THREE.Color(0x111820), 0.22);
      const fogNear = currentZone?.fogNear || ISO_UNDERGROUND_VIEW.FOG_NEAR;
      const fogFar = currentZone?.fogFar || ISO_UNDERGROUND_VIEW.FOG_FAR;
      this.scene.fog = new THREE.Fog(
        fogColor,
        fogNear + (ISO_UNDERGROUND_VIEW.FOG_NEAR - fogNear) * undergroundT,
        fogFar + (ISO_UNDERGROUND_VIEW.FOG_FAR - fogFar) * undergroundT
      );

      this._setSkyAtmosphere({
        visible: undergroundT < 0.98,
        topColor: skyTop,
        horizonColor: skyHorizon,
        fogColor,
        sunColor,
        cloudOpacity: preset.cloudOpacity * 0.55 * (1 - undergroundT),
        darkness: undergroundT,
        hazeStrength: preset.hazeStrength,
      });
      this.ambient.color.copy(baseAmbient).lerp(new THREE.Color(0xd9e4d0), ISO_UNDERGROUND_VIEW.AMBIENT_BOOST * undergroundT);
    } else if (this.cameraMode === 'thirdPerson') {
      this.scene.background = fogBase;
      this.renderer.setClearColor(fogBase);
      const zoneFogNear = Number.isFinite(currentZone?.fogNear) ? currentZone.fogNear + 10 : VOXEL_SKY.TP_FOG_NEAR;
      const zoneFogFar = Number.isFinite(currentZone?.fogFar) ? currentZone.fogFar + 24 : VOXEL_SKY.TP_FOG_FAR;
      const fogNear = Math.max(18, Math.min(VOXEL_SKY.TP_FOG_NEAR, zoneFogNear - preset.hazeStrength * 8));
      const fogFar = Math.max(fogNear + 24, Math.min(VOXEL_SKY.TP_FOG_FAR, zoneFogFar - preset.hazeStrength * 6));
      this.scene.fog = new THREE.Fog(fogBase, fogNear, fogFar);
      this._setSkyAtmosphere({
        visible: true,
        topColor: skyTop,
        horizonColor: skyHorizon,
        fogColor: fogBase,
        sunColor,
        cloudOpacity: preset.cloudOpacity,
        darkness: 0,
        hazeStrength: preset.hazeStrength,
      });
      this.ambient.color.copy(baseAmbient);
    } else {
      this.scene.background = fogBase;
      this.renderer.setClearColor(fogBase);
      const near = currentZone?.fogNear ? currentZone.fogNear + 18 : VOXEL_SKY.FOG_NEAR;
      const far = currentZone?.fogFar ? currentZone.fogFar + 88 : VOXEL_SKY.FOG_FAR;
      this.scene.fog = new THREE.Fog(fogBase, near, far);
      this._setSkyAtmosphere({
        visible: true,
        topColor: skyTop,
        horizonColor: skyHorizon,
        fogColor: fogBase,
        sunColor,
        cloudOpacity: preset.cloudOpacity * 0.85,
        darkness: 0,
        hazeStrength: preset.hazeStrength,
      });
      this.ambient.color.copy(baseAmbient);
    }

    this._syncTerrainFog();
  }

  _updateCamera(dt, isoOffset, shakeX = 0, shakeY = 0, shakeZ = 0, isoDepthFactor = 0) {
    this.world?.terrainMesh?.setRenderMode?.(this.cameraMode, this._renderScale || 1);
    if (this.cameraMode === 'thirdPerson') {
      this._updateThirdPersonCamera(dt, shakeX, shakeY, shakeZ);
      if (this.player.mesh) this.player.mesh.visible = true;
      this._updateShadowCamera(dt);
      return;
    }
    if (this.cameraMode === 'topDown') {
      this._updateTopDownCamera(dt, shakeX, shakeY, shakeZ);
      if (this.player.mesh) this.player.mesh.visible = true;
      this._updateShadowCamera(dt);
      return;
    }

    this.player.controlYaw = null;
    if (this.player.mesh) this.player.mesh.visible = true;
    this.isoCamera.up.set(0, 1, 0);
    const undergroundT = clamp01(isoDepthFactor);
    const horizontalScale = 1 + (ISO_UNDERGROUND_VIEW.HORIZONTAL_SCALE - 1) * undergroundT;
    const verticalScale = 1 + (ISO_UNDERGROUND_VIEW.VERTICAL_SCALE - 1) * undergroundT;
    const targetForwardBias = ISO_UNDERGROUND_VIEW.TARGET_FORWARD_BIAS * undergroundT;
    const targetYBias = ISO_UNDERGROUND_VIEW.TARGET_Y_BIAS * undergroundT;
    const desiredTarget = this.player.position.clone();
    desiredTarget.y += 0.55 + targetYBias;
    desiredTarget.x += targetForwardBias;
    desiredTarget.z += targetForwardBias;
    if (!this._cameraTargetReady) {
      this.cameraTarget.copy(desiredTarget);
      this._cameraTargetReady = true;
    } else {
      const horizontalT = 1 - Math.exp(-10 * dt);
      const verticalT = 1 - Math.exp(-6 * dt);
      this.cameraTarget.x += (desiredTarget.x - this.cameraTarget.x) * horizontalT;
      this.cameraTarget.y += (desiredTarget.y - this.cameraTarget.y) * verticalT;
      this.cameraTarget.z += (desiredTarget.z - this.cameraTarget.z) * horizontalT;
    }
    this.isoCamera.position.set(
      this.cameraTarget.x + isoOffset * horizontalScale + shakeX,
      this.cameraTarget.y + isoOffset * verticalScale + shakeY,
      this.cameraTarget.z + isoOffset * horizontalScale + shakeZ
    );
    this.isoCamera.lookAt(this.cameraTarget.x, this.cameraTarget.y, this.cameraTarget.z);
    this._updateShadowCamera(dt);
  }

  _updateTopDownCamera(dt, shakeX = 0, shakeY = 0, shakeZ = 0) {
    this.player.controlYaw = null;
    const desiredTarget = this.player.position.clone();
    desiredTarget.y += TOP_DOWN_TARGET_Y;
    if (!this._cameraTargetReady) {
      this.cameraTarget.copy(desiredTarget);
      this._cameraTargetReady = true;
    } else {
      this.cameraTarget.lerp(desiredTarget, 1 - Math.exp(-12 * dt));
    }

    this.isoCamera.up.set(0, 0, -1);
    this.isoCamera.position.set(
      this.cameraTarget.x + shakeX * 0.25,
      this.cameraTarget.y + TOP_DOWN_HEIGHT + shakeY * 0.25,
      this.cameraTarget.z + shakeZ * 0.25
    );
    this.isoCamera.lookAt(this.cameraTarget.x, this.cameraTarget.y, this.cameraTarget.z);
  }

  _updateShadowCamera(dt) {
    if (!this.sun || !this.player) return;
    const cam = this.sun.shadow.camera;
    const target = this.player.position;
    // Smoothly follow player; tighter frustum = sharper shadows
    const bounds = this.cameraMode === 'thirdPerson' ? 14.0 : 20.0;
    const speed = 1.0 - Math.exp(-4.0 * dt);
    const cx = cam.left + (cam.right - cam.left) * 0.5;
    const cz = cam.top + (cam.bottom - cam.top) * 0.5;
    const desiredX = target.x;
    const desiredZ = target.z;
    const newCx = cx + (desiredX - cx) * speed;
    const newCz = cz + (desiredZ - cz) * speed;
    cam.left = newCx - bounds;
    cam.right = newCx + bounds;
    cam.top = newCz + bounds;
    cam.bottom = newCz - bounds;
    cam.updateProjectionMatrix();
  }

  _updateThirdPersonControls(dt) {
    const rig = this.tpCamera;
    const tune = this.tpCameraTuning;
    const sensitivity = 0.0022;
    const mouseMoved = input.mouse.locked && (Math.abs(input.mouse.dx) > 0.01 || Math.abs(input.mouse.dy) > 0.01);
    const gamepadLook = Math.abs(input.gamepad?.rightX) > 0.01 || Math.abs(input.gamepad?.rightY) > 0.01;
    if (mouseMoved) {
      rig.desiredYaw -= input.mouse.dx * sensitivity;
      rig.pitch += input.mouse.dy * sensitivity;
      rig.pitch = Math.max(tune.pitchMin, Math.min(tune.pitchMax, rig.pitch));
      rig.manualRecenteringTimer = tune.recenterDelay;
    } else if (gamepadLook) {
      const lookSpeed = 2.2;
      rig.desiredYaw -= input.gamepad.rightX * lookSpeed;
      rig.pitch += input.gamepad.rightY * lookSpeed;
      rig.pitch = Math.max(tune.pitchMin, Math.min(tune.pitchMax, rig.pitch));
      rig.manualRecenteringTimer = tune.recenterDelay;
    } else {
      rig.manualRecenteringTimer = Math.max(0, rig.manualRecenteringTimer - dt);
    }

    if (input.pressed('KeyR')) {
      rig.desiredYaw = this.player.rotation;
      rig.manualRecenteringTimer = 0;
    }

    let forwardMove = 0;
    let strafeMove = 0;
    if (input.gamepad && (Math.abs(input.gamepad.leftX) > 0.01 || Math.abs(input.gamepad.leftY) > 0.01)) {
      forwardMove = -input.gamepad.leftY;
      strafeMove = input.gamepad.leftX;
    } else {
      if (input.isDown('KeyW') || input.isDown('ArrowUp')) forwardMove += 1;
      if (input.isDown('KeyS') || input.isDown('ArrowDown')) forwardMove -= 1;
      if (input.isDown('KeyA') || input.isDown('ArrowLeft')) strafeMove -= 1;
      if (input.isDown('KeyD') || input.isDown('ArrowRight')) strafeMove += 1;
    }

    if (rig.manualRecenteringTimer <= 0 && (forwardMove !== 0 || strafeMove !== 0)) {
      const moveYaw = Math.atan2(
        Math.sin(rig.desiredYaw) * forwardMove - Math.cos(rig.desiredYaw) * strafeMove,
        Math.cos(rig.desiredYaw) * forwardMove + Math.sin(rig.desiredYaw) * strafeMove
      );
      const recenterHalfLife = input.isDown('ShiftLeft') ? 0.42 : 0.75;
      rig.desiredYaw = dampAngle(rig.desiredYaw, moveYaw, dt, recenterHalfLife);
    }

    this.camYaw = rig.desiredYaw;
    this.camPitch = rig.pitch;
    this.player.controlYaw = rig.desiredYaw;
  }

  _updateThirdPersonCamera(dt, shakeX = 0, shakeY = 0, shakeZ = 0) {
    const rig = this.tpCamera;
    const tune = this.tpCameraTuning;
    const playerPos = this.player.position;
    const rawSubject = new THREE.Vector3(playerPos.x, playerPos.y + tune.height, playerPos.z);

    if (!rig.initialized) {
      rig.subjectTarget.copy(rawSubject);
      rig.lookTarget.copy(rawSubject);
      rig.lookahead.set(0, 0, 0);
      rig.previousPlayerPos.copy(playerPos);
      rig.desiredYaw = this.camYaw;
      rig.displayYaw = this.camYaw;
      rig.pitch = this.camPitch;
      rig.distance = tune.distance;
      rig.collisionDistance = tune.distance;
      this.camPos.copy(this._getThirdPersonDesiredPosition(rawSubject, rig.displayYaw, rig.pitch, tune.distance));
      rig.initialized = true;
    }

    rig.distance = tune.distance;

    // Dynamic FOV based on jet speed / rocket boot activity
    let targetFov = tune.fov;
    const jetSpeed = this.player.jetVelocity ? Math.sqrt(this.player.jetVelocity.x ** 2 + this.player.jetVelocity.y ** 2) : 0;
    if (this.player.rocketBootsActive) {
      targetFov = tune.fov + 5 + Math.min(6, jetSpeed * 1.2);
    } else if (jetSpeed > 2.5) {
      targetFov = tune.fov + Math.min(4, (jetSpeed - 2.5) * 0.8);
    }
    const fovT = smoothFactor(dt, 0.1);
    this.thirdPersonCamera.fov += (targetFov - this.thirdPersonCamera.fov) * fovT;
    if (Math.abs(this.thirdPersonCamera.fov - tune.fov) > 0.01 || this.player.rocketBootsActive) {
      this.thirdPersonCamera.updateProjectionMatrix();
    }

    const horizontalT = smoothFactor(dt, tune.horizontalHalfLife);
    rig.subjectTarget.x += (rawSubject.x - rig.subjectTarget.x) * horizontalT;
    rig.subjectTarget.z += (rawSubject.z - rig.subjectTarget.z) * horizontalT;

    const verticalDelta = rawSubject.y - rig.subjectTarget.y;
    if (Math.abs(verticalDelta) > tune.verticalDeadZone) {
      const targetY = rawSubject.y - Math.sign(verticalDelta) * tune.verticalDeadZone;
      rig.subjectTarget.y += (targetY - rig.subjectTarget.y) * smoothFactor(dt, tune.verticalHalfLife);
    }

    const planarDelta = new THREE.Vector3(
      playerPos.x - rig.previousPlayerPos.x,
      0,
      playerPos.z - rig.previousPlayerPos.z
    );
    const planarSpeed = dt > 0 ? planarDelta.length() / dt : 0;
    let desiredLookahead = new THREE.Vector3();
    if (planarSpeed > 0.08) {
      desiredLookahead.copy(planarDelta).normalize();
      const manualScale = rig.manualRecenteringTimer > 0 ? 0.45 : 1;
      desiredLookahead.multiplyScalar(tune.lookahead * Math.min(1, planarSpeed / GAME.PLAYER_SPEED) * manualScale);
    }
    rig.lookahead.lerp(desiredLookahead, smoothFactor(dt, tune.lookaheadHalfLife));

    const desiredLookTarget = rig.subjectTarget.clone().add(rig.lookahead);
    const lookHorizontalT = smoothFactor(dt, tune.horizontalHalfLife);
    rig.lookTarget.x += (desiredLookTarget.x - rig.lookTarget.x) * lookHorizontalT;
    rig.lookTarget.z += (desiredLookTarget.z - rig.lookTarget.z) * lookHorizontalT;
    rig.lookTarget.y += (desiredLookTarget.y - rig.lookTarget.y) * smoothFactor(dt, tune.verticalHalfLife);

    const yawHalfLife = rig.manualRecenteringTimer > 0 ? 0.04 : tune.yawHalfLife;
    rig.displayYaw = dampAngle(rig.displayYaw, rig.desiredYaw, dt, yawHalfLife);
    this.camYaw = rig.desiredYaw;
    this.camPitch = rig.pitch;

    const fullDistanceDesired = this._getThirdPersonDesiredPosition(rig.lookTarget, rig.displayYaw, rig.pitch, rig.distance);
    const direction = fullDistanceDesired.clone().sub(rig.lookTarget).normalize();
    const rayDist = rig.lookTarget.distanceTo(fullDistanceDesired);
    const actualDist = this._getThirdPersonCameraDistance(rig.lookTarget, fullDistanceDesired, direction, rayDist);
    if (actualDist < rig.collisionDistance) {
      rig.collisionDistance = actualDist;
    } else {
      rig.collisionDistance += (actualDist - rig.collisionDistance) * smoothFactor(dt, tune.collisionExtendHalfLife);
    }

    const resolvedDesired = rig.lookTarget.clone().add(direction.multiplyScalar(rig.collisionDistance));
    const positionT = smoothFactor(dt, tune.positionHalfLife);
    this.camPos.x += (resolvedDesired.x - this.camPos.x) * positionT;
    this.camPos.y += (resolvedDesired.y - this.camPos.y) * positionT;
    this.camPos.z += (resolvedDesired.z - this.camPos.z) * positionT;

    this.thirdPersonCamera.position.set(
      this.camPos.x + shakeX * 0.2,
      this.camPos.y + shakeY * 0.2,
      this.camPos.z + shakeZ * 0.2
    );
    this.thirdPersonCamera.lookAt(rig.lookTarget.x, rig.lookTarget.y, rig.lookTarget.z);
    rig.previousPlayerPos.copy(playerPos);
    this._updateShadowCamera(dt);

    if (this.tpCameraDebug && typeof window !== 'undefined') {
      window.__voidloopThirdPersonCameraTuning = tune;
      window.__voidloopThirdPersonCamera = {
        desiredYaw: rig.desiredYaw,
        displayYaw: rig.displayYaw,
        pitch: rig.pitch,
        collisionDistance: rig.collisionDistance,
        subjectTarget: rig.subjectTarget.toArray(),
        lookTarget: rig.lookTarget.toArray(),
        lookahead: rig.lookahead.toArray(),
      };
    }
  }

  _getThirdPersonDesiredPosition(target, yaw, pitch, distance) {
    const tune = this.tpCameraTuning;
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    return target.clone().add(new THREE.Vector3(
      -sinYaw * distance * cosPitch + cosYaw * tune.shoulderX,
      sinPitch * distance + tune.shoulderY,
      -cosYaw * distance * cosPitch - sinYaw * tune.shoulderX
    ));
  }

  _getThirdPersonCameraDistance(pivot, desired, direction, rayDist) {
    const start = performance.now();
    const terrain = this.world?.terrainMesh;
    let actualDist = rayDist;

    if (!terrain) {
      this._perfFrame.cameraCollisionMs = performance.now() - start;
      return actualDist;
    }

    const now = performance.now();
    const cache = this._tpCollision;
    const desiredMoved = !cache.initialized || cache.lastDesired.distanceToSquared(desired) > TP_COLLISION_MOVE_EPS * TP_COLLISION_MOVE_EPS;
    const pivotMoved = !cache.initialized || cache.lastPivot.distanceToSquared(pivot) > 0.25 * 0.25;
    const desiredBlocked = terrain.isSolidAt?.(desired.x, desired.y, desired.z);
    const shouldRefresh = desiredMoved
      || pivotMoved
      || desiredBlocked
      || cache.nearHit
      || now - cache.lastAt >= TP_COLLISION_REFRESH_MS;

    if (shouldRefresh) {
      const hit = terrain.raycastVoxel?.(pivot, direction, rayDist + 0.35, { solidOnly: true });
      actualDist = hit?.point ? Math.max(0.6, pivot.distanceTo(hit.point) - 0.3) : rayDist;
      if (!hit?.point && desiredBlocked) actualDist = Math.min(actualDist, 1.1);
      cache.lastAt = now;
      cache.lastDesired.copy(desired);
      cache.lastPivot.copy(pivot);
      cache.actualDist = actualDist;
      cache.rayDist = rayDist;
      cache.nearHit = actualDist < rayDist - 0.2;
      cache.initialized = true;
    } else {
      const cachedRatio = cache.rayDist > 0.001 ? cache.actualDist / cache.rayDist : 1;
      actualDist = Math.min(rayDist, rayDist * cachedRatio);
    }

    this._perfFrame.cameraCollisionMs = performance.now() - start;
    return actualDist;
  }

  _findNearestEnemy(range) {
    let nearest = null;
    let nearestDist = range;
    for (const enemy of this.world.enemies) {
      if (enemy.dead) continue;
      const dist = this.player.position.distanceTo(enemy.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }
    return nearest;
  }

  _findMiningTarget(range) {
    let nearest = null;
    let nearestDist = range;
    const playerPos = this.player.position;
    const aim = this._getMiningAim();
    const forward = new THREE.Vector3(aim.direction.x, 0, aim.direction.z);
    if (forward.lengthSq() < 0.001) forward.set(Math.sin(this.player.rotation), 0, Math.cos(this.player.rotation));
    forward.normalize();

    const weaponId = this.player.weapons[this.player.currentSlot]?.data?.id || 'unknown';
    const isPickaxe = weaponId === 'pickaxe';

    // ── 1. Floating blocks (original behaviour) ──
    for (const block of this.world.blocks.values()) {
      if (block.destroyed) continue;

      const blockIsFloating = block.isFloating === true;
      if (!blockIsFloating) continue;

      // Forward cone check — only blocks in front of the player
      const toBlock = block.position.clone().sub(playerPos);
      toBlock.y = 0;
      const dist = toBlock.length();
      if (dist > range) continue;

      toBlock.normalize();
      const dot = Math.max(-1, Math.min(1, forward.dot(toBlock)));
      const angle = Math.acos(dot);
      if (angle > Math.PI / 2.5) continue; // ~72° forward cone

      // Block must be at or above ankle level
      if (block.position.y + 0.5 < playerPos.y - 0.5) continue;

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = block;
      }
    }

    if (nearest) {
      return this._getMiningStatusForBlock(nearest, { isPickaxe });
    }

    // ── 2. Terrain blocks — raycast against unified mesh ──
    if (isPickaxe) {
      const terrainTarget = this._findTerrainMiningTarget(aim, forward, range, isPickaxe);
      if (terrainTarget) return terrainTarget;
    }

    return null;
  }

  _findTerrainMiningTarget(aim, forward, range, isPickaxe) {
    if (!this.world?.terrainMesh?.raycast) return null;

    const playerFocus = this.player.position.clone().add(new THREE.Vector3(0, 0.65, 0));
    const attempts = [];

    if (this.cameraMode === 'thirdPerson') {
      // Precision pass: camera/crosshair aim, but long enough to travel from
      // the camera to the player's reachable mining bubble.
      const cameraToPlayer = Math.max(0, aim.origin.distanceTo(playerFocus));
      attempts.push({
        origin: aim.origin.clone(),
        dirs: [aim.direction.clone().normalize()],
        rayRange: cameraToPlayer + range + 2.5,
        maxPlayerDistance: range + 1.0,
      });

      // Auto-target pass: swing straight from the player like isometric mode,
      // with a little vertical fan so walls, ceilings, and floor lips all work.
      attempts.push({
        origin: playerFocus,
        dirs: [
          forward.clone().setY(0.05).normalize(),
          forward.clone().setY(0.28).normalize(),
          forward.clone().setY(-0.35).normalize(),
          forward.clone().multiplyScalar(0.85).add(new THREE.Vector3(0, -0.65, 0)).normalize(),
        ],
        rayRange: range + 1.35,
        maxPlayerDistance: range + 0.85,
      });
    } else {
      attempts.push({
        origin: aim.origin,
        dirs: [
          aim.direction.clone(),
          aim.direction.clone().multiplyScalar(0.75).add(new THREE.Vector3(0, -0.65, 0)).normalize(),
          new THREE.Vector3(0, -1, 0),
        ],
        rayRange: range,
        maxPlayerDistance: range + 0.5,
      });
    }

    for (const attempt of attempts) {
      for (const dir of attempt.dirs) {
        if (!dir || dir.lengthSq() < 0.001) continue;
        const raycaster = new THREE.Raycaster(attempt.origin, dir.normalize(), 0.05, attempt.rayRange);
        const hit = this.world.terrainMesh.raycast(raycaster, attempt.origin, attempt.rayRange + 2);
        if (!hit?.point) continue;
        if (hit.point.distanceTo(playerFocus) > attempt.maxPlayerDistance) continue;
        const target = this._buildTerrainMiningStatusFromHit(hit, isPickaxe);
        if (target) return target;
      }
    }

    if (this.cameraMode === 'iso' || this.cameraMode === 'topDown') {
      const underfootTarget = this._findUnderfootTerrainMiningTarget(isPickaxe);
      if (underfootTarget) return underfootTarget;
    }

    return null;
  }

  _findUnderfootTerrainMiningTarget(isPickaxe) {
    if (!this.world?.terrainMesh) return null;
    const base = this.player.position;
    const offsets = [
      [0, 0],
      [0.34, 0],
      [-0.34, 0],
      [0, 0.34],
      [0, -0.34],
    ];

    for (const [ox, oz] of offsets) {
      const x = base.x + ox;
      const z = base.z + oz;
      const zone = getZoneAtPosition(x, z);
      if (!zone) continue;

      const groundY = this.world.getGroundHeightAt(x, z, base.y + 0.4);
      if (!Number.isFinite(groundY) || groundY <= -998) continue;

      const center = new THREE.Vector3(x, groundY - 0.45, z);
      if (!this.world.terrainMesh.isSolidAt(center.x, center.y, center.z)) {
        center.y = groundY - 0.85;
      }
      if (!this.world.terrainMesh.isSolidAt(center.x, center.y, center.z)) continue;

      return this._buildTerrainMiningStatusFromCenter(center, zone.id, isPickaxe);
    }

    return null;
  }

  _buildTerrainMiningStatusFromHit(hit, isPickaxe) {
    const zone = getZoneAtPosition(hit.point.x, hit.point.z);
    if (!zone) return null;
    const normal = hit.face?.normal?.clone() || new THREE.Vector3(0, 1, 0);
    normal.transformDirection(hit.object.matrixWorld).normalize();
    let brushCenter = hit.point.clone().addScaledVector(normal, -0.45);
    if (!this.world.terrainMesh.isSolidAt(brushCenter.x, brushCenter.y, brushCenter.z)) {
      brushCenter = hit.point.clone().addScaledVector(normal, 0.45);
    }
    return this._buildTerrainMiningStatusFromCenter(brushCenter, zone.id, isPickaxe, hit.point.clone());
  }

  _buildTerrainMiningStatusFromCenter(brushCenter, zoneId, isPickaxe, hitPoint = brushCenter.clone()) {
    const cellX = Math.floor(brushCenter.x);
    const cellY = Math.floor(brushCenter.y);
    const cellZ = Math.floor(brushCenter.z);
    const cellState = this.world.terrainMesh.getCellState?.(cellX, cellY, cellZ);
    const typeKey = cellState?.type || 'dirt';
    const proxy = {
      typeKey,
      position: hitPoint.clone(),
      zoneId,
      isFloating: false,
      isTerrain: true,
      mineable: cellState?.properties?.mineable !== false,
      destroyed: false,
      tier: 1,
    };
    const status = this._getMiningStatusForBlock(proxy, { isPickaxe });
    status.isTerrain = true;
    status.gridPos = { x: brushCenter.x, y: brushCenter.y, z: brushCenter.z };
    status.hitPoint = hitPoint.clone();
    status.brushCenter = brushCenter;
    status.terrainCell = { type: typeKey, zoneId };
    return status;
  }

  _getMiningStatusForBlock(block, options = {}) {
    const isPickaxe = options.isPickaxe ?? (this.player.weapons[this.player.currentSlot]?.data?.id === 'pickaxe');

    if (block.isFloating && !isPickaxe) {
      return {
        allowed: false,
        block,
        reason: 'wrong_weapon',
        icon: '⛏',
        requiredTier: 1,
        currentTier: this.progression.getPickaxeWidth(),
      };
    }

    const properties = getBlockProperties(block.typeKey);
    if (block.mineable === false || properties.mineable === false) {
      return {
        allowed: false,
        block,
        reason: 'not_mineable',
        icon: '',
        requiredTier: 1,
        currentTier: this.progression.getPickaxeWidth(),
      };
    }

    return {
      allowed: true,
      block,
      reason: 'ok',
      requiredTier: 1,
      currentTier: this.progression.getPickaxeWidth(),
    };
  }

  _getMiningDamage(block) {
    return 999;
  }

  _getTerrainBrushRadius(zoneId) {
    const width = this.progression.getPickaxeWidth();
    // Scale brush radius with pickaxe width — gets ridiculous
    return Math.min(20, 0.85 + width * 0.25);
  }

  _mineExtraTerrainBlocks(miningTarget, zoneId, budget) {
    if (!miningTarget?.brushCenter || budget <= 0) return 0;
    // Cap extra blocks for performance even at ridiculous widths
    budget = Math.min(budget, 500);
    const base = miningTarget.brushCenter;
    const radius = this._getTerrainBrushRadius(zoneId);
    const brushes = [];
    for (let i = 0; i < budget; i++) {
      const angle = (Math.PI * 2 * i) / Math.max(1, budget);
      const ring = 0.85 + Math.floor(i / 6) * 0.45;
      const center = base.clone().add(new THREE.Vector3(Math.cos(angle) * ring, 0, Math.sin(angle) * ring));
      brushes.push({
        center,
        zoneId,
        type: miningTarget.terrainCell?.type || 'dirt',
        radius,
      });
    }

    const batch = this.world.mineTerrainBrushes(brushes, {
      zoneId,
      type: miningTarget.terrainCell?.type || 'dirt',
      radius,
    });

    let mined = 0;
    for (const result of batch.brushResults || []) {
      if (!result?.meaningful) continue;
      mined++;
      const hitPos = result.center.clone();
      this.blocksMined++;
      this.progression.recordMined(result.zoneId || zoneId || this.zoneManager.currentZoneId, 1);
      this.particles.dust(hitPos, 4);
      this._awardTerrainDigRewards(result, hitPos, result.zoneId || zoneId);
    }
    if (mined > 0) {
      this.floorTimer += GAME.TIME_BONUS_MINING * mined;
    }
    return mined;
  }

  _mineExtraFloatingBlocks(originBlock, zoneId, budget) {
    if (!originBlock || budget <= 0) return 0;
    budget = Math.min(budget, 500);
    const candidates = [];
    for (const block of this.world.blocks.values()) {
      if (!block || block === originBlock || block.destroyed || !block.isFloating) continue;
      const dist = block.position.distanceTo(originBlock.position);
      if (dist <= 3.25) candidates.push({ block, dist });
    }
    candidates.sort((a, b) => a.dist - b.dist);

    let mined = 0;
    for (const { block } of candidates) {
      if (mined >= budget) break;
      const status = this._getMiningStatusForBlock(block, { isPickaxe: true });
      if (!status.allowed) continue;
      if (!block.takeDamage(999)) continue;

      const blockPos = block.position.clone();
      blockPos.y += 0.3;
      const typeKey = block.typeKey;
      const blockZoneId = block.zoneId || zoneId || this.zoneManager.currentZoneId;
      this.world.mineBlock(block, this.particles, audio);
      this.blocksMined++;
      this.progression.recordMined(blockZoneId, 1);
      mined++;

      this.particles.dust(blockPos, 8);
      this.particles.spark(blockPos, 5);
      const table = BLOCK_LOOT_TABLES[typeKey];
      if (table) this.loot.spawnFromTable(blockPos, table);

      if (Math.random() < this.progression.getLetterDropChance('floating')) {
        const letter = this._pickLetterForZone(blockZoneId);
        if (letter) {
          this.letterDrops.spawn(blockPos, letter);
          this.ui.showFloatingText(`Letter ${letter}!`, 0xfacc15);
        }
      }

      const blockDef = BLOCK_TYPES[typeKey];
      if (blockDef?.resource) {
        this.resources.add(blockDef.resource, 1);
      }
    }
    if (mined > 0) {
      this.floorTimer += GAME.TIME_BONUS_MINING * mined;
    }
    return mined;
  }

  _awardTerrainDigRewards(result, hitPos, zoneId) {
    if (!result?.meaningful) return;

    const width = this.progression.getPickaxeWidth();
    const depth = result.depth || 0;
    const luck = this.progression.state.letterDropLevel || 0;
    const volumeBonus = Math.min(3, Math.floor((result.removedVolume || 0) / 10));
    const amount = Math.max(1, Math.min(4, 1 + Math.floor((width - 1) / 2) + volumeBonus));
    const resourceType = this._pickDigJunkResource(depth, width, luck);

    if (this.resources.add(resourceType, amount)) {
      this.batchResourceText(resourceType, amount, 0x9bd47a);
    }

    for (const node of result.revealedLetters || []) {
      const spawnPos = node.position.clone();
      this._enqueueRewardFeedback({ kind: 'letterDrop', position: spawnPos, letter: node.letter });
      this._enqueueRewardFeedback({ kind: 'text', text: `Letter ${node.letter}!`, color: 0xfacc15 });
    }

    if (Math.random() < this.progression.getLetterDropChance('terrain')) {
      const letter = this._pickLetterForZone(zoneId || result.zoneId || this.zoneManager.currentZoneId);
      if (letter) {
        this._enqueueRewardFeedback({ kind: 'letterDrop', position: hitPos.clone(), letter });
        this._enqueueRewardFeedback({ kind: 'text', text: `Letter ${letter}!`, color: 0xfacc15 });
      }
    }
  }

  _enqueueRewardFeedback(job) {
    if (!job) return;
    const readyAt = (performance.now?.() || Date.now()) + 45;
    this._rewardFeedbackQueue.push({ ...job, readyAt });
    if (this._rewardFeedbackQueue.length > 32) {
      this._rewardFeedbackQueue.splice(0, this._rewardFeedbackQueue.length - 32);
    }
  }

  _processRewardFeedbackQueue(maxJobs = 3) {
    if (!this._rewardFeedbackQueue.length) return;
    const now = performance.now?.() || Date.now();
    let processed = 0;
    for (let i = 0; i < this._rewardFeedbackQueue.length && processed < maxJobs;) {
      const job = this._rewardFeedbackQueue[i];
      if (job.readyAt > now) {
        i++;
        continue;
      }
      this._rewardFeedbackQueue.splice(i, 1);
      processed++;
      if (job.kind === 'text') {
        this.ui.showFloatingText(job.text, job.color);
      } else if (job.kind === 'letterDrop') {
        this.letterDrops.spawn(job.position, job.letter);
      }
    }
  }

  batchResourceText(type, amount = 1, color = 0x88ccff, displayName = null) {
    const entry = this._resourceTextBatcher.get(type);
    if (entry) {
      entry.count += amount;
      entry.timer = this._RESOURCE_TEXT_FLUSH_DELAY;
      if (entry.count >= this._RESOURCE_TEXT_IMMEDIATE_FLUSH) {
        this._flushResourceType(type);
      }
    } else {
      this._resourceTextBatcher.set(type, {
        count: amount,
        timer: this._RESOURCE_TEXT_FLUSH_DELAY,
        color,
        displayName,
      });
    }
  }

  _flushResourceType(type) {
    const entry = this._resourceTextBatcher.get(type);
    if (!entry) return;
    const name = entry.displayName || entry.count + ' ' + type.replace(/_/g, ' ');
    const text = entry.displayName ? `+${entry.count} ${entry.displayName}` : `+${name}`;
    this.ui.showFloatingText(text, entry.color);
    this._resourceTextBatcher.delete(type);
  }

  _flushResourceTexts(dt) {
    for (const [type, entry] of this._resourceTextBatcher) {
      entry.timer -= dt;
      if (entry.timer <= 0) {
        this._flushResourceType(type);
      }
    }
  }

  _explodeGrenade(position, config = {}) {
    return this._explodeBlast(position, {
      kind: 'grenade',
      radius: config.radius || GAME.GRENADE_RADIUS,
      damage: config.damage || GAME.GRENADE_DAMAGE,
      attackerWeaponId: config.attackerWeaponId || 'grenade',
      remote: !!config.remote,
      syncEventType: 'grenade_exploded',
      maxTerrainCells: GAME.GRENADE_MAX_TERRAIN_CELLS,
      floatingBlockCap: GAME.GRENADE_FLOATING_BLOCK_CAP,
      terrainCenterOffsetY: 0,
      terrainMinedCap: 12,
      lootBudget: 5,
      letterBudget: 2,
    });
  }

  _explodeMissile(position, config = {}) {
    return this._explodeBlast(position, {
      kind: 'missile',
      radius: config.radius || GAME.MISSILE_STRIKE_RADIUS,
      damage: config.damage || GAME.MISSILE_STRIKE_DAMAGE,
      attackerWeaponId: config.attackerWeaponId || 'missile_strike',
      remote: !!config.remote,
      maxTerrainCells: GAME.MISSILE_STRIKE_MAX_TERRAIN_CELLS,
      floatingBlockCap: GAME.MISSILE_STRIKE_FLOATING_BLOCK_CAP,
      terrainCenterOffsetY: -0.85,
      terrainMinedCap: 24,
      lootBudget: 7,
      letterBudget: 2,
    });
  }

  _explodeBlast(position, config = {}) {
    const radius = config.radius || GAME.GRENADE_RADIUS;
    const damage = config.damage || GAME.GRENADE_DAMAGE;
    const radiusSq = radius * radius;
    const isRemote = !!config.remote;
    const attackerWeaponId = config.attackerWeaponId || 'grenade';
    const isMissile = config.kind === 'missile';

    if (isMissile) {
      SFXMapper.missileImpact();
      this.particles.burst(position, 0xff8a00, 40);
      this.particles.spark(position, 26);
      this.particles.spawn({ pos: position, count: 34, color: 0x4f453c, speed: 7.5, life: 1.1, size: 0.52, texture: 'smoke' });
      this.particles.spawn({ pos: position, count: 24, color: 0x9a6b35, speed: 7, life: 0.9, size: 0.36, texture: 'dirt' });
      this.flipbooks.spawn({ ...FLIPBOOK_EFFECTS.explosion, pos: position.clone().add(new THREE.Vector3(0, 0.35, 0)), scale: 5.6, fps: 20 });
      this._spawnShockwave(position, radius, 0xffaa33);
      this._spawnImpactLight(position, 0xff8a33, 4.8, 0.28);
      this._screenShake(2.35, 0.56);
    } else {
      SFXMapper.grenadeExplosion();
      this.particles.burst(position, 0xff6600, 22);
      this.particles.spark(position, 14);
      this.particles.spawn({ pos: position, count: 18, color: 0x6f6254, speed: 5, life: 0.75, size: 0.34, texture: 'smoke' });
      this.flipbooks.spawn({ pos: position.clone().add(new THREE.Vector3(0, 0.2, 0)), ...FLIPBOOK_EFFECTS.explosion });
      this._screenShake(1.15, 0.32);
    }

    if (this.isMultiplayer && this.net && !isRemote && config.syncEventType) {
      this.net.syncEvent(config.syncEventType, {
        x: position.x,
        y: position.y,
        z: position.z,
        radius,
        damage,
        attackerWeaponId,
      });
    }

    for (const enemy of this.world.enemies) {
      if (enemy.dead) continue;
      const hitPos = enemy.position.clone().add(new THREE.Vector3(0, 0.45, 0));
      const distSq = hitPos.distanceToSquared(position);
      if (distSq > radiusSq) continue;
      const dist = Math.sqrt(distSq);
      const falloff = Math.max(0.25, 1 - dist / radius);
      enemy.takeDamage(Math.round(damage * falloff), attackerWeaponId);
      this.particles.spark(hitPos, 3);
    }

    const zone = getZoneAtPosition(position.x, position.z);
    const terrainCenter = position.clone();
    terrainCenter.y += config.terrainCenterOffsetY || 0;
    const depth = Math.max(0, 1 - terrainCenter.y);
    const typeKey = depth > 12 ? 'stone_dark' : depth > 4 ? 'stone' : 'dirt';
    const terrainResult = this.world.explodeTerrain(terrainCenter, {
      radius,
      zoneId: zone?.id || null,
      type: typeKey,
      maxCells: config.maxTerrainCells || GAME.GRENADE_MAX_TERRAIN_CELLS,
    });
    if (terrainResult.meaningful && !isRemote) {
      this.blocksMined += Math.max(1, Math.min(config.terrainMinedCap || 12, Math.round((terrainResult.removedCells || 1) / 24)));
      this._awardTerrainDigRewards(terrainResult, terrainCenter, terrainResult.zoneId);
    }

    const candidates = [];
    for (const block of this.world.floatingBlocks) {
      if (!block || block.destroyed) continue;
      const blockCenter = block.position.clone().add(new THREE.Vector3(0.5, 0.5, 0.5));
      const distSq = blockCenter.distanceToSquared(position);
      if (distSq <= radiusSq) candidates.push({ block, distSq, blockCenter });
    }
    candidates.sort((a, b) => a.distSq - b.distSq);

    let destroyedFloating = 0;
    let lootBudget = config.lootBudget ?? 5;
    let letterBudget = config.letterBudget ?? 2;
    const resourceRewards = new Map();
    const maxFloating = config.floatingBlockCap || GAME.GRENADE_FLOATING_BLOCK_CAP;

    for (const { block, blockCenter } of candidates) {
      if (destroyedFloating >= maxFloating) break;
      const status = this._getMiningStatusForBlock(block, { isPickaxe: true });
      if (!status.allowed) continue;

      const blockType = block.typeKey;
      const blockZoneId = block.zoneId;
      this.world.mineBlock(block, this.particles, audio);
      destroyedFloating++;

      if (isRemote) continue;

      if (lootBudget > 0) {
        const table = BLOCK_LOOT_TABLES[blockType];
        if (table) {
          this.loot.spawnFromTable(blockCenter, table);
          lootBudget--;
        }
      }

      if (letterBudget > 0 && Math.random() < 0.18) {
        const letter = this._pickLetterForZone(blockZoneId || this.zoneManager.currentZoneId);
        if (letter) {
          this.letterDrops.spawn(blockCenter, letter);
          letterBudget--;
        }
      }

      const blockDef = BLOCK_TYPES[blockType];
      if (blockDef?.resource) {
        resourceRewards.set(blockDef.resource, (resourceRewards.get(blockDef.resource) || 0) + 1);
      }
    }

    if (!isRemote && destroyedFloating > 0) {
      this.blocksMined += destroyedFloating;
      this.ui.showFloatingText(`${isMissile ? 'Strike' : 'Blast'} broke ${destroyedFloating}`, 0xffaa00);
      for (const [resource, amount] of resourceRewards) {
        if (this.resources.add(resource, amount)) {
          this.batchResourceText(resource, amount, 0x88ccff);
        }
      }
    }
  }

  _tryCallMissileStrike() {
    if (!this.progression.state.missile.unlocked) {
      this.ui.showFloatingText('Unlock missile strike first', 0xffaa00);
      SFXMapper.swingMiss();
      return false;
    }
    if (this.missileStrikeCooldown > 0) {
      if (!this.progression.spendMissileCharge()) {
        this.ui.showFloatingText(`${this.missileStrikeCooldown.toFixed(1)}s`, 0xffaa00);
        SFXMapper.swingMiss();
        return false;
      }
    }

    const payload = this._buildMissileStrikePayload();
    if (!payload) {
      this.ui.showFloatingText('No strike target', 0xff4444);
      SFXMapper.swingMiss();
      return false;
    }

    this.missileStrikeCooldown = this.progression.getMissileCooldown();
    this._callMissileStrike(payload, { sync: true });
    this.ui.showFloatingText('Missile strike', 0xffaa00);
    return true;
  }

  _buildMissileStrikePayload() {
    const center = this._getMissileStrikeCenter();
    if (!center) return null;

    const range = this.progression.getMissileCountRange();
    const min = range.min || GAME.MISSILE_STRIKE_MIN || 3;
    const max = range.max || GAME.MISSILE_STRIKE_MAX || min;
    const count = min + Math.floor(Math.random() * (max - min + 1));
    const missiles = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spread = i === 0 ? Math.random() * 0.8 : 1.9 + Math.random() * 4.3;
      const x = center.x + Math.cos(angle) * spread;
      const z = center.z + Math.sin(angle) * spread;
      const target = this._getGroundedStrikePoint(x, z, center.y);
      const start = target.clone().add(new THREE.Vector3(
        -5 + Math.random() * 10,
        28 + Math.random() * 12,
        -5 + Math.random() * 10
      ));

      missiles.push({
        sx: start.x,
        sy: start.y,
        sz: start.z,
        tx: target.x,
        ty: target.y,
        tz: target.z,
        delay: i * 0.14 + Math.random() * 0.12,
        duration: 0.42 + Math.random() * 0.18,
      });
    }

    return {
      radius: this.progression.getMissileRadius(),
      damage: GAME.MISSILE_STRIKE_DAMAGE,
      missiles,
    };
  }

  _getMissileStrikeCenter() {
    const aim = this._getMiningAim();
    const terrain = this.world?.terrainMesh;
    if (terrain?.raycast) {
      const dirs = this.cameraMode === 'thirdPerson'
        ? [aim.direction.clone()]
        : [
          aim.direction.clone().normalize(),
          aim.direction.clone().multiplyScalar(0.75).add(new THREE.Vector3(0, -0.55, 0)).normalize(),
          new THREE.Vector3(0, -1, 0),
        ];
      for (const dir of dirs) {
        const raycaster = new THREE.Raycaster(aim.origin, dir, 0.05, 70);
        const hit = terrain.raycast(raycaster);
        if (hit?.point) return hit.point.clone();
      }
    }

    const forward = aim.direction.clone();
    forward.y = 0;
    if (forward.lengthSq() < 0.001) forward.set(Math.sin(this.player.rotation), 0, Math.cos(this.player.rotation));
    forward.normalize();
    const fallback = this.player.position.clone().addScaledVector(forward, 7.5);
    return this._getGroundedStrikePoint(fallback.x, fallback.z, fallback.y);
  }

  _getGroundedStrikePoint(x, z, fallbackY = 0) {
    const groundY = this.world?.getGroundHeightAt?.(x, z, 80);
    const y = Number.isFinite(groundY) && groundY > -998 ? groundY + 0.12 : fallbackY;
    return new THREE.Vector3(x, y, z);
  }

  _callMissileStrike(payload, options = {}) {
    if (!payload?.missiles?.length) return;

    if (this.isMultiplayer && this.net && options.sync) {
      this.net.syncEvent('missile_strike', payload);
    }

    for (const spec of payload.missiles) {
      const start = new THREE.Vector3(spec.sx, spec.sy, spec.sz);
      const target = new THREE.Vector3(spec.tx, spec.ty, spec.tz);
      const visual = this._createMissileVisual(start, target);
      this.activeMissiles.push({
        ...spec,
        start,
        target,
        mesh: visual.mesh,
        marker: visual.marker,
        age: 0,
        trailTimer: 0,
        started: false,
        remote: !!options.remote,
        radius: payload.radius || GAME.MISSILE_STRIKE_RADIUS,
        damage: payload.damage || GAME.MISSILE_STRIKE_DAMAGE,
      });
    }
  }

  _createMissileVisual(start, target) {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2f3338,
      metalness: 0.45,
      roughness: 0.42,
      emissive: 0x331100,
      emissiveIntensity: 0.55,
    });
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xff6a22,
      emissive: 0xff3b00,
      emissiveIntensity: 1.4,
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.82, 10), bodyMat);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.32, 10), noseMat);
    nose.position.y = -0.56;
    nose.rotation.x = Math.PI;
    group.add(body, nose);
    group.position.copy(start);
    const dir = target.clone().sub(start).normalize();
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    group.visible = false;
    this.scene.add(group);

    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xff3b00,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const marker = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.025, 8, 48), markerMat);
    marker.rotation.x = Math.PI / 2;
    marker.position.copy(target).add(new THREE.Vector3(0, 0.05, 0));
    this.scene.add(marker);

    return { mesh: group, marker };
  }

  _updateActiveMissiles(dt) {
    for (let i = this.activeMissiles.length - 1; i >= 0; i--) {
      const missile = this.activeMissiles[i];
      missile.age += dt;

      if (missile.marker) {
        const pulse = 1 + Math.sin(missile.age * 18) * 0.12;
        missile.marker.scale.setScalar(pulse);
        missile.marker.material.opacity = 0.35 + Math.max(0, Math.sin(missile.age * 18)) * 0.28;
      }

      if (missile.age < missile.delay) continue;

      if (!missile.started) {
        missile.started = true;
        missile.mesh.visible = true;
        SFXMapper.missileIncoming();
      }

      const rawT = Math.min(1, (missile.age - missile.delay) / Math.max(0.05, missile.duration));
      const t = 1 - Math.pow(1 - rawT, 2.4);
      missile.mesh.position.lerpVectors(missile.start, missile.target, t);

      missile.trailTimer -= dt;
      if (missile.trailTimer <= 0) {
        missile.trailTimer = 0.035;
        const trailPos = missile.mesh.position.clone();
        this.particles.spawn({ pos: trailPos, count: 2, color: 0x3b352f, speed: 1.1, life: 0.45, size: 0.32, texture: 'smoke' });
        this.particles.spawn({ pos: trailPos, count: 1, color: 0xff7a18, speed: 0.8, life: 0.24, size: 0.2, texture: 'flare' });
      }

      if (rawT >= 1) {
        const impact = this._getGroundedStrikePoint(missile.target.x, missile.target.z, missile.target.y);
        this._removeMissileVisual(missile);
        this._explodeMissile(impact, {
          radius: missile.radius,
          damage: missile.damage,
          remote: missile.remote,
        });
        this.activeMissiles.splice(i, 1);
      }
    }
  }

  _removeMissileVisual(missile) {
    for (const obj of [missile.mesh, missile.marker]) {
      if (!obj) continue;
      this.scene.remove(obj);
      obj.traverse?.((child) => {
        child.geometry?.dispose?.();
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose?.());
        } else {
          child.material?.dispose?.();
        }
      });
      obj.geometry?.dispose?.();
      obj.material?.dispose?.();
    }
  }

  _spawnShockwave(position, radius, color = 0xffaa33) {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.035, 8, 64), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(position).add(new THREE.Vector3(0, 0.08, 0));
    this.scene.add(ring);

    const start = performance.now();
    const duration = 360;
    const animate = () => {
      const t = Math.min(1, (performance.now() - start) / duration);
      ring.scale.setScalar(1 + t * radius * 1.15);
      mat.opacity = 0.72 * (1 - t);
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(ring);
        ring.geometry.dispose();
        mat.dispose();
      }
    };
    animate();
  }

  _spawnImpactLight(position, color = 0xff8a33, intensity = 4, duration = 0.25) {
    const light = new THREE.PointLight(color, intensity, 18, 2);
    light.position.copy(position).add(new THREE.Vector3(0, 1.2, 0));
    this.scene.add(light);
    const start = performance.now();
    const total = duration * 1000;
    const animate = () => {
      const t = Math.min(1, (performance.now() - start) / total);
      light.intensity = intensity * (1 - t);
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(light);
      }
    };
    animate();
  }

  _pickDigJunkResource(depth, tier, luck) {
    const roll = Math.random() + luck * 0.02 + tier * 0.015;
    if (depth > 12 && roll > 0.82) return 'old_junk';
    if (depth > 5 && roll > 0.55) return 'scrap_stone';
    if (roll > 0.45) return 'gravel_bits';
    return 'loose_dirt';
  }

  _findMineableBlock(range) {
    // Deprecated: kept for compatibility, delegates to two-stage mining target.
    const result = this._findMiningTarget(range);
    return result?.allowed ? result.block : null;
  }

  _findNearestBlock(range) {
    return this._findMineableBlock(range);
  }

  _syncCurrentZoneFromPosition() {
    // With independent levels, zone is managed by gateway transitions, not position.
    // Keep this as a no-op to avoid accidental zone switching.
  }

  _checkZoneCompletion() {
    const zone = this.zoneManager.getCurrentZone();
    if (!zone || this.zoneManager.isZoneCompleted(zone.id)) return;
    const allLettersPassed = this.progression.allLettersPassed(zone.letters || []);
    const mined = this.progression.getZoneMined(zone.id);
    const miningTarget = this.progression.getZoneMiningTarget(zone);
    if (allLettersPassed && mined >= miningTarget) {
      this.zoneManager.markZoneCompleted(zone.id);
      this.exitOpen = true;
      this.ui.showExitOpen(true);
      this.ui.showFloatingText('Zone mastered', 0x4ade80);
      SFXMapper.floorComplete();
      this._createGateways();
      this.ui.updateObjectiveHud?.(this._getObjectiveState(zone.id));
    }
  }

  _getObjectiveState(zoneId = this.zoneManager.currentZoneId) {
    const zone = getZoneById(zoneId);
    if (!zone) return null;
    const width = this.progression.getPickaxeWidth();
    const mined = this.progression.getZoneMined(zone.id);
    const miningTarget = this.progression.getZoneMiningTarget(zone);
    const aliveEnemies = this.world.enemies.filter(e => e.zoneId === zone.id && !e.dead).length;
    const passedLetters = (zone.letters || []).filter(letter => this.progression.hasPassedLetter(letter)).length;
    return {
      zoneId: zone.id,
      letters: { done: passedLetters, total: zone.letters.length },
      enemies: { done: true, remaining: 0, optionalRemaining: aliveEnemies },
      mining: { done: mined >= miningTarget, current: mined, target: miningTarget },
      grenade: {
        unlocked: this.progression.state.grenade.unlocked,
        charges: this.progression.state.grenade.charges,
        cap: this.progression.getGrenadeChargeCap(),
        cooldown: this.player.weapons[3]?.cooldown || 0,
      },
      missile: {
        unlocked: this.progression.state.missile.unlocked,
        charges: this.progression.state.missile.charges,
        cooldown: this.missileStrikeCooldown || 0,
      },
      pickaxeTier: width,
      completed: this.zoneManager.isZoneCompleted(zone.id),
    };
  }

  _clearExitPortal() {
    if (this.exitMesh) {
      this.scene.remove(this.exitMesh);
      this.exitMesh = null;
    }
  }

  _spawnExitPortal() {
    this._clearExitPortal();
    if (!this.world.exitPosition) return;
    const geo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x22ff22,
      emissive: 0x22ff22,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.7,
    });
    this.exitMesh = new THREE.Mesh(geo, mat);
    this.exitMesh.position.copy(this.world.exitPosition);
    this.exitMesh.position.y = 0.6;
    this.scene.add(this.exitMesh);

    // Animate
    const animate = () => {
      if (!this.exitMesh) return;
      this.exitMesh.rotation.y += 0.02;
      this.exitMesh.position.y = 0.6 + Math.sin(Date.now() * 0.003) * 0.2;
      requestAnimationFrame(animate);
    };
    animate();
  }

  // ===== Zone Gateway System =====

  _createGateways() {
    this._clearGateways();
    const currentZone = this.zoneManager.getCurrentZone();
    if (!currentZone || !currentZone.exitGateway) return;

    const gw = currentZone.exitGateway;
    const targetZone = getZoneById(gw.targetZone);
    if (!targetZone) return;

    // Create barrier mesh
    const geo = new THREE.PlaneGeometry(4, 4);
    const isUnlocked = this.zoneManager.isZoneUnlocked(targetZone.id);
    const color = isUnlocked ? 0x44ff44 : 0xff4444;
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(gw.x, 2, gw.z);
    mesh.rotation.y = Math.PI / 2;
    this.scene.add(mesh);
    this._gatewayMeshes.push(mesh);

    // Floating label
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(0, 0, 512, 128, 16);
    ctx.fill();
    ctx.fillStyle = isUnlocked ? '#4ade80' : '#f87171';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    const label = isUnlocked ? `✅ ${targetZone.name}` : `🔒 ${targetZone.name}`;
    ctx.fillText(label, 256, 80);
    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(4, 1, 1);
    sprite.position.set(gw.x, 5, gw.z);
    this.scene.add(sprite);
    this._gatewayLabels.push(sprite);
  }

  _clearGateways() {
    for (const m of this._gatewayMeshes) {
      this.scene.remove(m);
      if (m.geometry) m.geometry.dispose();
      if (m.material) m.material.dispose();
    }
    for (const s of this._gatewayLabels) {
      this.scene.remove(s);
      if (s.material && s.material.map) s.material.map.dispose();
      if (s.material) s.material.dispose();
    }
    this._gatewayMeshes = [];
    this._gatewayLabels = [];
  }

  _checkGateways() {
    const currentZone = this.zoneManager.getCurrentZone();
    if (!currentZone || !currentZone.exitGateway) return;

    const gw = currentZone.exitGateway;
    const targetZone = getZoneById(gw.targetZone);
    if (!targetZone) return;

    const dist = this.player.position.distanceTo(new THREE.Vector3(gw.x, this.player.position.y, gw.z));
    if (dist < 5) {
      const isUnlocked = this.zoneManager.isZoneUnlocked(targetZone.id);
      if (isUnlocked) {
        // Zone is unlocked — offer transition
        this._transitionToZone(targetZone.id);
        return;
      }

      const previousZoneId = this.zoneManager.getPreviousZoneId(targetZone.id);
      const canEnter = !previousZoneId || this.zoneManager.isZoneCompleted(previousZoneId);
      if (canEnter) {
        this.zoneManager.unlockZone(targetZone.id);
        this.ui.showFloatingText(`${targetZone.name} unlocked!`, 0x4ade80);
        this._createGateways();
        this._transitionToZone(targetZone.id);
      } else {
        this.ui.showGatewayIndicator(targetZone.name, true, ['ABC', '⛏']);
        this.ui.showFloatingText('Master this zone first', 0xff4444);
      }
    }
  }

  async _transitionToZone(targetZoneId) {
    if (this._isTransitioning) return;
    this._isTransitioning = true;

    const targetZone = getZoneById(targetZoneId);
    this.ui.showLoading(`Entering ${targetZone?.name || 'Unknown Zone'}...`);

    // Small delay to let the loading screen render
    await new Promise(r => setTimeout(r, 150));

    this.zoneManager.setCurrentZone(targetZoneId);
    await this._generateZones(this._worldSeed, targetZoneId);

    this.ui.hideLoading();
    this._isTransitioning = false;
  }

  _respawnZoneEnemies(zoneId) {
    // Enemies for newly unlocked zone are spawned on unlock
    // This is handled by regenerating the zone with enemies
    const zone = getZoneById(zoneId);
    if (!zone) return;
    const seed = this._worldSeed + zone.order * 7919;
    // We can't easily regenerate just enemies, so we'll spawn them manually
    const rng = { random: () => Math.random(), choice: (arr) => arr[Math.floor(Math.random() * arr.length)] };
    const b = zone.bounds;
    const size = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) / 2;
    const enemyCount = Math.min(Math.floor(5 + size / 8), 25);
    const enemyTypes = zone.enemyTypes;
    const sp = zone.spawnPoint;
    for (let i = 0; i < enemyCount; i++) {
      const et = rng.choice(enemyTypes);
      let ex, ez, attempts = 0;
      do {
        const angle = rng.random() * Math.PI * 2;
        const dist = 4 + rng.random() * (size - 7);
        ex = sp.x + Math.cos(angle) * dist;
        ez = sp.z + Math.sin(angle) * dist;
        attempts++;
      } while ((this.world.getBlock(ex, 0, ez) || this.world._hasGround(ex, ez)) && attempts < 20);
      const enemy = new Enemy(et, ex, ez);
      enemy.world = this.world;
      enemy._netId = this.world._nextEnemyId++;
      enemy.spawn(this.scene).then(() => {
        this.world.enemies.push(enemy);
      });
    }
  }

  _setupHazards() {
    this.hazards = null;
  }

  _updateCameraZoom() {
    const aspect = window.innerWidth / window.innerHeight;
    const d = this.baseD / this.cameraZoom;
    this.isoCamera.left = -d * aspect;
    this.isoCamera.right = d * aspect;
    this.isoCamera.top = d;
    this.isoCamera.bottom = -d;
    this.isoCamera.updateProjectionMatrix();
    this.thirdPersonCamera.aspect = aspect;
    this.thirdPersonCamera.updateProjectionMatrix();
  }

  _toggleCameraMode() {
    const next = this.cameraMode === 'iso'
      ? 'thirdPerson'
      : this.cameraMode === 'thirdPerson'
        ? 'topDown'
        : 'iso';
    this._setCameraMode(next);
  }

  _setCameraMode(mode, showToast = true) {
    if (mode === this.cameraMode && this.camera === (mode === 'thirdPerson' ? this.thirdPersonCamera : this.isoCamera)) return;

    this.cameraMode = mode;
    if (mode === 'thirdPerson') {
      this.camera = this.thirdPersonCamera;
      const tune = this.tpCameraTuning;
      this.camYaw = this.player.rotation;
      this.camPitch = tune.pitchDefault;
      this.thirdPersonCamera.fov = tune.fov;
      this.thirdPersonCamera.updateProjectionMatrix();
      const rig = this.tpCamera;
      const subject = new THREE.Vector3(this.player.position.x, this.player.position.y + tune.height, this.player.position.z);
      rig.subjectTarget.copy(subject);
      rig.lookTarget.copy(subject);
      rig.lookahead.set(0, 0, 0);
      rig.previousPlayerPos.copy(this.player.position);
      rig.desiredYaw = this.camYaw;
      rig.displayYaw = this.camYaw;
      rig.pitch = this.camPitch;
      rig.distance = tune.distance;
      rig.collisionDistance = tune.distance;
      rig.manualRecenteringTimer = 0;
      rig.initialized = true;
      this.camPos.copy(this._getThirdPersonDesiredPosition(subject, rig.displayYaw, rig.pitch, rig.distance));
      this.thirdPersonCamera.position.copy(this.camPos);
      this.thirdPersonCamera.lookAt(subject.x, subject.y, subject.z);
      this._tpCollision.initialized = false;
      this._tpCollision.nearHit = false;
      this.renderer.domElement.requestPointerLock?.();
      if (this.aimReticle) this.aimReticle.style.display = 'block';
      if (showToast) this.ui.showFloatingText('Third-person view', 0x7dd3fc);
    } else if (mode === 'topDown') {
      this.camera = this.isoCamera;
      if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock?.();
      this.player.controlYaw = null;
      this._cameraTargetReady = false;
      this.isoCamera.up.set(0, 0, -1);
      if (this.player.mesh) this.player.mesh.visible = true;
      if (this.aimReticle) this.aimReticle.style.display = 'none';
      if (showToast) this.ui.showFloatingText('Top-down view', 0x7dd3fc);
    } else {
      this.camera = this.isoCamera;
      if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock?.();
      this.player.controlYaw = null;
      this._cameraTargetReady = false;
      this.isoCamera.up.set(0, 1, 0);
      if (this.player.mesh) this.player.mesh.visible = true;
      if (this.aimReticle) this.aimReticle.style.display = 'none';
      if (showToast) this.ui.showFloatingText('Isometric view', 0x7dd3fc);
    }
  }

  _getMiningAim() {
    if (this.cameraMode === 'thirdPerson') {
      const direction = new THREE.Vector3();
      this.thirdPersonCamera.getWorldDirection(direction);
      return {
        origin: this.thirdPersonCamera.position.clone(),
        direction: direction.normalize(),
      };
    }

    return {
      origin: this.player.position.clone().add(new THREE.Vector3(0, 0.65, 0)),
      direction: new THREE.Vector3(Math.sin(this.player.rotation), 0, Math.cos(this.player.rotation)),
    };
  }

  _togglePause() {
    this.paused = !this.paused;
    if (this.paused) {
      this.ui.showPauseMenu();
    } else {
      this.ui.hidePauseMenu();
    }
  }

  _bindPauseMenu() {
    const onResume = () => {
      if (this.paused) this._togglePause();
    };
    const onSettings = () => {
      document.dispatchEvent(new CustomEvent('show-settings'));
    };
    const onQuit = () => {
      this.ui.hidePauseMenu();
      this.paused = false;
      if (this.mainMenu) {
        this.mainMenu.returnToMenu();
      }
    };
    document.addEventListener('pause-resume', onResume);
    document.addEventListener('pause-settings', onSettings);
    document.addEventListener('pause-quit', onQuit);
    this._pauseBind = { onResume, onSettings, onQuit };
  }

  _screenShake(intensity, duration) {
    if (!settings.get('cameraShake')) return;
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  // ===== Multiplayer Remote Player =====

  async _createRemotePlayer() {
    this._remotePlayer = new RemotePlayer(this.scene);
    await this._remotePlayer.init('ranger');

    // Nametag sprite
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(0, 0, 256, 64, 16);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.isHost ? 'Guest' : 'Dad', 128, 42);
    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex });
    const label = new THREE.Sprite(spriteMat);
    label.scale.set(2, 0.5, 1);
    label.position.y = 2.2;
    this._remotePlayer.mesh.add(label);
  }

  _updateRemotePlayer(state) {
    if (!this._remotePlayer) return;
    this._remotePlayer.setState(state);
    if (state.characterId && state.characterId !== this._remotePlayer.characterId) {
      this._remotePlayer.setCharacter(state.characterId);
    }
  }

  _handleNetEvent(type, data) {
    if (type === 'block_broken') {
      const key = `${Math.round(data.x)},${Math.round(data.y)},${Math.round(data.z)}`;
      const block = this.world.blocks.get(key);
      if (block && !block.destroyed) {
        block.destroy(this.scene, this.particles);
        this.world.blocks.delete(key);
        // Recompute column height
        const colKey = `${block.position.x},${block.position.z}`;
        let maxY = -999;
        for (const [bk, b] of this.world.blocks) {
          if (b.position.x === block.position.x && b.position.z === block.position.z) {
            const top = b.position.y + 1;
            if (top > maxY) maxY = top;
          }
        }
        if (maxY > -999) {
          this.world.columnHeights.set(colKey, maxY);
        } else {
          this.world.columnHeights.delete(colKey);
        }
      }
    } else if (type === 'enemy_died') {
      const enemy = this.world.enemies.find(e => e._netId === data.id);
      if (enemy && !enemy.dead) {
        enemy.hp = 0;
        enemy.dead = true;
        enemy.justDied = true;
      }
    } else if (type === 'grenade_exploded') {
      this._explodeGrenade(new THREE.Vector3(data.x, data.y, data.z), {
        radius: data.radius || GAME.GRENADE_RADIUS,
        damage: data.damage || GAME.GRENADE_DAMAGE,
        attackerWeaponId: data.attackerWeaponId || 'grenade',
        remote: true,
      });
    } else if (type === 'missile_strike') {
      this._callMissileStrike(data, { remote: true });
    } else if (type === 'floor_changed') {
      if (!this.isHost && data.floorNum && data.seed != null) {
        this._worldSeed = data.seed;
        this._generateFloor(data.floorNum, this._worldSeed);
      }
    }
  }

  _onLootCollect(type, value, color) {
    const cfg = LOOT_CONFIG[type];
    if (type === 'health_meat' || type === 'health_scifi') {
      // Heal
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
    } else if (type === 'key') {
      this.player.keys = (this.player.keys || 0) + 1;
    } else {
      // Coin/gem/ore
      if (value > 0) {
        this.player.coins += value;
        this.batchResourceText(type, value, color, '💰');
      }
    }
    const now = performance.now?.() || Date.now();
    if (now - this._lastCollectSfxAt > 70) {
      this._lastCollectSfxAt = now;
      SFXMapper.collectOre();
    }
  }

  _pickLetterForZone(zoneId) {
    const zone = getZoneById(zoneId);
    if (!zone || !zone.letters || zone.letters.length === 0) {
      return this.letterPool.pickRandomLetter();
    }
    if (this.zoneManager.currentZoneId !== zone.id) {
      return zone.letters[Math.floor(Math.random() * zone.letters.length)];
    }
    return this.letterPool.pickRandomLetter();
  }

  // ==========================================
  // Spelling Challenge Methods
  // ==========================================

  _collectLetterForMastery(letter, pickupPosition = null) {
    const result = this.progression.collectLetter(letter);
    const state = result.state;
    if (!state) return;
    const effectPos = pickupPosition || this.player.position.clone();
    SFXMapper.letterPickup();
    const needed = this.progression.getQuizThreshold(letter);
    const progress = Number.isFinite(needed) ? `${state.dropsTowardQuiz}/${needed}` : 'mastered';
    this.lettersCollected++;
    this.ui.updateZoneLetterHud?.(this.zoneManager.currentZoneId);
    const pickupAnimMs = this.ui.animateLetterPickup?.(state.letter, effectPos, this.zoneManager.currentZoneId) || 0;
    this.ui.showFloatingText(`${state.letter} ${progress}`, result.queued ? 0x4ade80 : 0xfacc15);
    if (result.queued && pickupAnimMs > 0) {
      setTimeout(() => this._tryStartQueuedLetterQuiz(), pickupAnimMs + 120);
    } else {
      this._tryStartQueuedLetterQuiz();
    }
  }

  _tryStartQueuedLetterQuiz() {
    if (this.state !== STATES.PLAYING || this.currentLetterQuiz) return false;
    const queued = this.progression.peekQuiz();
    if (!queued) return false;
    const zone = this.zoneManager.getCurrentZone();
    this._enterLetterSoundQuiz(
      queued.letter,
      this.progression.makeQuizChoices(queued.letter, zone?.letters || undefined)
    );
    return true;
  }

  _enterLetterSoundQuiz(letter, choices) {
    this._rememberSpellingCameraMode();
    this.state = STATES.SPELLING;
    this.currentLetterQuiz = { letter, choices };

    if (this.spellingGlyphMesh) {
      this.scene.remove(this.spellingGlyphMesh);
      this.spellingGlyphMesh = null;
    }

    const glyph = glyph3D.createGlyph(letter, 'reward');
    if (glyph) {
      glyph.scale.setScalar(1.2);
      glyph.position.set(this.player.position.x, 1.5, this.player.position.z);
      this.scene.add(glyph);
      this.spellingGlyphMesh = glyph;
    }

    const zoneLetters = this.zoneManager.getCurrentZone()?.letters || [];
    const progressText = zoneLetters
      .map(l => {
        const passed = this.progression.hasPassedLetter(l);
        const state = this.progression.getLetter(l);
        return `<span class="${passed ? 'spelled' : 'pending'}">${l}${passed ? '✓' : ` Lv${state?.level || 1}`}</span>`;
      })
      .join(' ');

    const state = this.progression.getLetter(letter);
    const threshold = this.progression.getQuizThreshold(letter);
    const subtitle = `Listen, then choose ${letter}. Meter ${state?.dropsTowardQuiz || 0}/${threshold}.`;
    this.ui.showSoundQuiz(letter, choices, progressText, subtitle);
    setTimeout(() => this._onSpellingPlay(), 250);
  }

  _resolveLetterSoundQuiz(choice) {
    if (!this.currentLetterQuiz) return;
    const target = this.currentLetterQuiz.letter;
    const correct = String(choice || '').toUpperCase() === target;

    if (!correct) {
      this.progression.resolveQuiz(target, false);
      this.ui.setSpellingFeedback('Listen again and try one more time.', false);
      SFXMapper.swingMiss();
      this._speakLetter(target);
      return;
    }

    const result = this.progression.resolveQuiz(target, true);
    this.letterPool.markSpelled(target);
    this.petManager.recordMastery?.(target, result.state);
    if (result.levelUp) {
      const levelUpPos = new THREE.Vector3();
      if (this.spellingGlyphMesh) {
        this.spellingGlyphMesh.getWorldPosition(levelUpPos);
      } else {
        levelUpPos.copy(this.player.position).add(new THREE.Vector3(0, 0.75, 0));
      }
      this.pendingLetterLevelUp = {
        letter: target,
        oldLevel: result.oldLevel,
        newLevel: result.newLevel,
        position: levelUpPos,
      };
    }
    if (this.pet?.letter === target && result.levelUp) {
      this.pet.setLevel(result.newLevel);
      this.pet.playLevelUp();
    }
    this.player.coins += 10;
    this.floorTimer += 3;
    this.ui.setSpellingFeedback(`Correct! +${result.xpGained} XP`, true);
    if (!result.levelUp) {
      this.ui.showFloatingText(`${target} Lv.${result.newLevel}`, 0xfacc15);
    }
    this.batchResourceText('coins', 10, 0xfacc15, '💰');
    this.ui.showTimeBonus('+3s LETTER!');
    if (!result.levelUp) SFXMapper.collectOre();
    this.ui.updateZoneLetterHud?.(this.zoneManager.currentZoneId);
    setTimeout(() => this._exitLetterSoundQuiz(), 650);
  }

  _exitLetterSoundQuiz() {
    this.currentLetterQuiz = null;
    if (this.spellingGlyphMesh) {
      this.scene.remove(this.spellingGlyphMesh);
      this.spellingGlyphMesh.traverse((child) => {
        if (child.isMesh && child.material && child.material.dispose) child.material.dispose();
      });
      this.spellingGlyphMesh = null;
    }
    this.ui.hideSpellingChallenge();
    this.state = STATES.PLAYING;
    this._restoreSpellingCameraMode();
    this.ui.updateObjectiveHud?.(this._getObjectiveState());
    this._playPendingLetterLevelUp();
    this._checkZoneCompletion();
    this._tryStartQueuedLetterQuiz();
  }

  _rememberSpellingCameraMode() {
    if (this.spellingReturnCameraMode) return;
    this.spellingReturnCameraMode = this.cameraMode;
  }

  _restoreSpellingCameraMode() {
    const mode = this.spellingReturnCameraMode;
    this.spellingReturnCameraMode = null;
    if (mode && mode !== this.cameraMode) {
      this._setCameraMode(mode, false);
    }
  }

  _playPendingLetterLevelUp() {
    if (!this.pendingLetterLevelUp) return;
    const event = this.pendingLetterLevelUp;
    this.pendingLetterLevelUp = null;
    this.shaderFX.playLetterLevelUp(event.letter, event.position, event.oldLevel, event.newLevel);
    this.ui.showFloatingText(`${event.letter} Lv.${event.newLevel}!`, 0x4ade80);
    SFXMapper.levelUp();
  }

  _speakLetter(letter) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`Letter ${letter}`);
      utterance.rate = 0.8;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  }

  _enterSpellingChallenge(letter) {
    if (this.state === STATES.SPELLING) return;
    const wordObj = this.letterPool.pickWordForLetter(letter);
    if (!wordObj) return;

    this._rememberSpellingCameraMode();
    this.state = STATES.SPELLING;
    this.spellingChallenge = new SpellingChallenge(wordObj);

    // Spawn a 3D glyph floating above the player
    if (this.spellingGlyphMesh) {
      this.scene.remove(this.spellingGlyphMesh);
      this.spellingGlyphMesh = null;
    }
    const glyph = glyph3D.createGlyph(letter, 'reward');
    if (glyph) {
      glyph.scale.setScalar(1.2);
      glyph.position.set(this.player.position.x, 1.5, this.player.position.z);
      this.scene.add(glyph);
      this.spellingGlyphMesh = glyph;
    }

    // Build progress text
    const progressText = this.letterPool.getProgressText()
      .split(' ')
      .map(token => {
        const isSpelled = token.includes('✓');
        return `<span class="${isSpelled ? 'spelled' : 'pending'}">${token}</span>`;
      })
      .join(' ');

    // Build word list for current level (all words for current letters)
    const currentLetters = this.letterPool.getCurrentLetters();
    const wordList = [];
    for (const l of currentLetters) {
      const words = SPELLING_WORDS[l];
      if (words) {
        for (const w of words) wordList.push(w.word);
      }
    }

    this.ui.showSpellingChallenge(letter, wordObj, progressText, wordList);

    // Auto-play audio after short delay
    setTimeout(() => {
      this._onSpellingPlay();
    }, 400);
  }

  async _onSpellingPlay() {
    if (this.currentLetterQuiz) {
      this._speakLetter(this.currentLetterQuiz.letter);
      return;
    }
    if (!this.spellingChallenge) return;
    this.ui.elSpellingPlayBtn.disabled = true;
    await this.spellingChallenge.playAudio();
    this.ui.elSpellingPlayBtn.disabled = false;
    this.ui.enableSpellingInput();
  }

  _onSpellingPlayWord(word) {
    // Play audio for a specific word from the preview list
    const path = `audio/spelling/${word.toLowerCase().replace(/[^a-z0-9]/g, '_')}_en_word.wav`;
    const player = new Audio(path);
    player.play().catch(() => {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(word);
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      }
    });
  }

  _onSpellingCheck(input) {
    if (this.currentLetterQuiz) {
      this._resolveLetterSoundQuiz(input);
      return;
    }
    if (!this.spellingChallenge) return;
    const correct = this.spellingChallenge.checkAnswer(input);
    if (correct) {
      this.ui.setSpellingFeedback('Correct! 🎉', true);
      this.ui.setSpellingRevealVisible(false);
      SFXMapper.collectOre(); // reuse positive sound
      // Confetti / floating text
      this.ui.showFloatingText('SPELLED!', 0x4ade80);
      setTimeout(() => this._exitSpellingChallenge(true), 1200);
    } else {
      this.ui.setSpellingFeedback('Try again!', false);
      SFXMapper.swingMiss(); // reuse negative sound
      const hintLevel = this.spellingChallenge.getCurrentHintLevel();
      if (hintLevel >= 1) {
        this.ui.updateSpellingHint(
          this.spellingChallenge.getHintDisplay(),
          this.spellingChallenge.getLetterCountHint()
        );
        this.ui.setSpellingRevealVisible(this.spellingChallenge.canRevealMore());
      }
      // Shake the input
      this.ui.elSpellingInput.style.animation = 'none';
      this.ui.elSpellingInput.offsetHeight;
      this.ui.elSpellingInput.style.animation = 'shake 0.3s';
    }
  }

  _onSpellingReveal() {
    if (!this.spellingChallenge) return;
    const revealed = this.spellingChallenge.revealNextLetter();
    if (revealed) {
      this.ui.updateSpellingHint(
        this.spellingChallenge.getHintDisplay(),
        this.spellingChallenge.getLetterCountHint()
      );
      this.ui.setSpellingRevealVisible(this.spellingChallenge.canRevealMore());
    }
  }

  _onSpellingClose() {
    if (this.currentLetterQuiz) {
      this.currentLetterQuiz = null;
      if (this.spellingGlyphMesh) {
        this.scene.remove(this.spellingGlyphMesh);
        this.spellingGlyphMesh.traverse((child) => {
          if (child.isMesh && child.material && child.material.dispose) child.material.dispose();
        });
        this.spellingGlyphMesh = null;
      }
      this.ui.hideSpellingChallenge();
      this.state = STATES.PLAYING;
      this._restoreSpellingCameraMode();
      this.ui.updateObjectiveHud?.(this._getObjectiveState());
      return;
    }
    if (!this.spellingChallenge) return;
    this._exitSpellingChallenge(false);
  }

  _exitSpellingChallenge(success) {
    if (this.spellingChallenge) {
      this.spellingChallenge.stopAudio();
      if (success) {
        const letter = this.spellingChallenge.word[0].toUpperCase();
        this.letterPool.markSpelled(letter);
        // Pet spelling progress
        const result = this.petManager.recordSpelling(letter, true);
        if (result.unlocked && !result.wasUnlocked) {
          // First time unlock — big celebration!
          this.ui.showFloatingText(`Pet ${letter} Joined You!`, 0xfacc15);
          this.particles.spark(this.player.position.clone().add(new THREE.Vector3(0, 1, 0)), 20);
          SFXMapper.upgradeBuy();
        } else if (!result.unlocked) {
          // Show progress
          const progress = result.spellingsCorrect;
          const needed = result.spellingsNeeded;
          this.ui.showFloatingText(`Pet ${letter}: ${progress}/${needed}`, 0x88ccff);
        } else {
          // Already unlocked — level up check
          if (result.levelUp && this.pet && this.pet.letter === letter) {
            this.pet.setLevel(result.newLevel);
            this.pet.playLevelUp();
            this.ui.showFloatingText(`Pet ${letter} ➜ Lv${result.newLevel}!`, 0x4ade80);
          }
        }
        // Bonus rewards
        this.player.coins += 10;
        this.floorTimer += 5;
        this.ui.showTimeBonus('+5s SPELLING!');
        this.batchResourceText('coins', 10, 0xfacc15, '💰');
      }
      this.spellingChallenge = null;
    }

    if (this.spellingGlyphMesh) {
      this.scene.remove(this.spellingGlyphMesh);
      this.spellingGlyphMesh.traverse((child) => {
        if (child.isMesh && child.material && child.material.dispose) {
          child.material.dispose();
        }
      });
      this.spellingGlyphMesh = null;
    }

    this.ui.hideSpellingChallenge();
    this.state = STATES.PLAYING;
    this._restoreSpellingCameraMode();

    // Update progress text on HUD if needed
    if (this.letterPool.allSpelledForLevel()) {
      this.ui.showFloatingText('All letters found!', 0x4ade80);
    }
    this.ui.updateObjectiveHud?.(this._getObjectiveState());
    this._checkZoneCompletion();
  }

  _applyGraphicsSettings() {
    const size = settings.getShadowMapSize();
    this.renderer.setPixelRatio(this._renderScale || 1);
    this.sun.shadow.mapSize.set(size, size);
    this.sun.shadow.mapSize.needsUpdate = true;

    const shadowType = settings.getShadowType();
    const targetType = shadowType === 'basic' ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
    if (this.renderer.shadowMap.type !== targetType) {
      this.renderer.shadowMap.type = targetType;
    }

    // Update terrain shader shadow quality
    const sq = settings.get('shadowQuality');
    const shaderQ = sq === 'low' ? 0.5 : sq === 'medium' ? 0.75 : 1.0;
    if (this.world?.terrainMesh?.unifiedRenderer) {
      this.world.terrainMesh.unifiedRenderer.setShaderQuality(shaderQ);
    }

    // On Low quality, disable expensive Three.js shadow maps and rely on fake decals
    const enableShadowMaps = sq !== 'low';
    if (this.renderer.shadowMap.enabled !== enableShadowMaps) {
      this.renderer.shadowMap.enabled = enableShadowMaps;
      // Force material updates
      this.scene.traverse((c) => {
        if (c.material) {
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          mats.forEach(m => { m.needsUpdate = true; });
        }
      });
    }
  }

  _getSunDirection() {
    // DirectionalLight shines from its position toward target (default 0,0,0)
    const dir = new THREE.Vector3().subVectors(this.sun.target.position, this.sun.position).normalize();
    return dir;
  }

  _onResize() {
    // Use documentElement clientWidth/Height for more stable sizing on iOS Safari
    const w = document.documentElement.clientWidth || window.innerWidth;
    const h = document.documentElement.clientHeight || window.innerHeight;
    const aspect = w / h;
    const d = this.baseD / this.cameraZoom;
    this.isoCamera.left = -d * aspect;
    this.isoCamera.right = d * aspect;
    this.isoCamera.top = d;
    this.isoCamera.bottom = -d;
    this.isoCamera.updateProjectionMatrix();
    this.thirdPersonCamera.aspect = aspect;
    this.thirdPersonCamera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.ui.preview?.resize();
  }

  // ===== Pet System =====

  async _loadEvolvedAlphabet() {
    // No-op: evolved FBX approach scrapped in favor of rainbow breathing effect at level 7
  }

  _spawnPet() {
    const equipped = this.petManager.getEquippedPet();
    if (!equipped) return;

    this._clearPet();

    const pet = new PetLetter(this.scene, equipped.letter, equipped.level, {
      onBlockDestroyed: (block) => this._onPetBlockDestroyed(block),
      canMineBlock: (block) => this._getMiningStatusForBlock(block).allowed,
      initialPosition: this.player.position.clone().add(new THREE.Vector3(-1.2, 0.5, -1.2)),
      getGroundHeight: (x, z) => this.world?.getGroundHeightAt?.(x, z, this.player.position.y) ?? null,
      sunDirection: this._getSunDirection(),
    });

    this.pet = pet;
  }

  _clearPet() {
    if (this.pet) {
      this.pet.dispose();
      this.pet = null;
    }
  }

  _onPetBlockDestroyed(block) {
    const blockPos = block.position.clone();
    this.particles.dust(blockPos, 8);
    this.particles.spark(blockPos, 6);
    const drop = this.world.mineBlock(block, this.particles, audio);
    const table = BLOCK_LOOT_TABLES[block.typeKey];
    if (table) {
      this.loot.spawnFromTable(blockPos, table);
    }
    // Letter drop chance (~10%)
    if (Math.random() < 0.10) {
      const letter = this.letterPool.pickRandomLetter();
      if (letter) {
        this.letterDrops.spawn(blockPos, letter);
        this.ui.showFloatingText(`Letter ${letter}!`, 0xfacc15);
      }
    }
    this.floorTimer += GAME.TIME_BONUS_MINING;
    SFXMapper.collectOre();
  }
}
