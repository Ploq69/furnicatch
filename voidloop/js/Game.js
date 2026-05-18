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
import { LetterPool } from './SpellingData.js';
import { LetterDrop } from './LetterDrop.js';
import { RunBackpack } from './RunBackpack.js';
import { IconDrop } from './IconDrop.js';
import { CollectionBeacon } from './CollectionBeacon.js';
import { CashOutScreen } from './CashOutScreen.js';
import { glyph3D } from '../../js/Glyph3DManager.js';
import { PetManager } from './PetManager.js';
import { PetLetter } from './PetLetter.js';
import { RemotePlayer } from './RemotePlayer.js';
import { Enemy } from './Enemy.js';
import { settings } from './SettingsManager.js';
import { ResourceInventory, RESOURCE_META } from './ResourceInventory.js';
import { getBlockProperties } from './BlockProperties.js';
import { gamepadManager } from './GamepadManager.js';
import { BoundaryEnvironment } from './systems/BoundaryEnvironment.js';
import { ZoneGatewaySystem } from './systems/ZoneGatewaySystem.js';
import { MissileStrikeSystem } from './systems/MissileStrikeSystem.js';
import { ExplosionHandler } from './systems/ExplosionHandler.js';
import { MiningSystem } from './systems/MiningSystem.js';
import { SpellingQuizGlue } from './systems/SpellingQuizGlue.js';
import { ThirdPersonCamera } from './camera/ThirdPersonCamera.js';
import { VOXEL_SKY, ZONE_ATMOSPHERE } from './AtmosphereData.js';

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
    this.thirdPersonCamera = new THREE.PerspectiveCamera(65, aspect, 0.05, 450);
    this.scene.add(this.thirdPersonCamera);
    this.camera = this.isoCamera;
    this.cameraMode = 'iso';
    this.cameraTarget = new THREE.Vector3();
    this._cameraTargetReady = false;
    this.camYaw = 0;
    this.camPitch = 0.22;
    this.camPos = new THREE.Vector3();
    this.tpCamera = new ThirdPersonCamera(this);
    this._renderScaleMax = Math.min(window.devicePixelRatio || 1, 1.25);
    this._renderScale = Math.min(1, this._renderScaleMax);
    this._renderScaleLowTime = 0;
    this._renderScaleHighTime = 0;
    this._perfFrame = {};


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


    // Floor plane (dark ground)
    const floorGeo = new THREE.PlaneGeometry(300, 300);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 0.9 });
    this.floorPlane = new THREE.Mesh(floorGeo, floorMat);
    this.floorPlane.rotation.x = -Math.PI / 2;
    this.floorPlane.position.y = -160;
    this.floorPlane.receiveShadow = false;
    this.scene.add(this.floorPlane);
    this.boundaryEnv = new BoundaryEnvironment(this.scene);
    this.boundaryEnv.create();

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
    this.aimReticle = document.createElement('div');
    this.aimReticle.textContent = '+';
    this.aimReticle.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);color:#e8fff2;text-shadow:0 1px 4px #000;font-size:22px;font-weight:700;z-index:20;pointer-events:none;display:none;';
    document.body.appendChild(this.aimReticle);
    this.ui.onCameraZoomChange = (val) => {
      this.cameraZoom = val;
      this._updateCameraZoom();
    };
    // Drill quiz UI callbacks
    this.ui.onSpellingClose = () => this.spellingGlue.onSpellingClose();

    // Timer — countdown
    this.floorTimer = this.progression.getRoundStartTime(GAME.COUNTDOWN_BASE);
    this.totalTime = 0;
    this.killCount = 0;
    this.level = 1;
    this.exitOpen = false;

    // Loot & Resources
    this.loot = new LootDrop(this.scene);
    this.runBackpack = new RunBackpack();
    this.iconDrops = new IconDrop(this.scene);
    this.beacon = new CollectionBeacon(this.scene);
    this.cashOut = new CashOutScreen();
    this._cashOutActive = false;
    this.pendingLetters = new Set();

    // Spelling / Letter drops
    this.letterPool = new LetterPool();
    this.letterDrops = new LetterDrop(this.scene);

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
    });

    // Playtest mode detection
    const params = new URLSearchParams(location.search);
    this.playtestKey = params.get('playtest');
    this.isTimedMode = !!this.playtestKey;
    this.tpCamera.debug = params.has('camdebug') || params.has('cameraDebug');

    // Score tracking for timed mode
    this.lettersCollected = 0;
    this.blocksMined = 0;
    this.enemiesDefeated = 0;
    this.tokensGathered = 0;

    // Mining combo system
    this.mineCombo = 0;
    this.mineComboTimer = 0;
    this._lastCollectSfxAt = 0;

    // Missile strike special attack
    this.missileSystem = new MissileStrikeSystem(this);
    this.explosions = new ExplosionHandler(this);
    this.mining = new MiningSystem(this);

    // Zone progression systems
    this.zoneManager = new ZoneManager();
    this.inventory = new Inventory();
    this.resources = new ResourceInventory();
    this._blockHazardTimer = 0;
    this.spellingGlue = new SpellingQuizGlue(this);
    this.zoneGateway = new ZoneGatewaySystem(this);

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
    // Preload icon drops
    await this.iconDrops.preload();
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
    this.spawnPoint = zone ? new THREE.Vector3(zone.spawnPoint.x, 1, zone.spawnPoint.z) : new THREE.Vector3(0, 1, 0);
    this.player.position.copy(this.spawnPoint);
    this.beacon.setPosition(this.spawnPoint);
    this.player.hp = this.player.maxHp;
    this.exitOpen = false;
    this.floorTimer = GAME.COUNTDOWN_BASE;
    this.killCount = 0;
    this.pendingLetters.clear();
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
    this.ui.showExitOpen(false);
    this._spawnPet();
    this.zoneGateway.create();
  }

  async _loadPlaytestLevel() {
    this._clearExitPortal();
    // Load draft from localStorage
    const draftKey = `voidloopLevelBuilderDraft:${this.playtestKey}`;
    const draftJson = localStorage.getItem(draftKey);
    if (!draftJson) {
      console.error('[Game] Playtest draft not found:', this.playtestKey);
      // Fall back to procedural
      await this._generateZones(1);
      return;
    }
    let levelDoc;
    try {
      levelDoc = JSON.parse(draftJson);
    } catch (e) {
      console.error('[Game] Failed to parse playtest draft:', e);
      await this._generateZones(1);
      return;
    }

    await this.world.loadAuthoredLevel(levelDoc, { scene: this.scene, letterDrop: this.letterDrops });

    // Spawn player at authored start position
    this.spawnPoint = this.world.startPosition ? this.world.startPosition.clone() : new THREE.Vector3(0, 0, 0);
    this.player.position.copy(this.spawnPoint);
    this.beacon.setPosition(this.spawnPoint);
    this.player.hp = this.player.maxHp;
    this.exitOpen = false;
    this.floorTimer = levelDoc.gameplay?.timerSeconds || 120;
    this.killCount = 0;
    this.pendingLetters.clear();
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
      await this._generateZones(1);
    } else {
      const nextFloor = this.world.floor + 1;
      if (this.isHost && this.net) {
        this.net.syncEvent('floor_changed', { floorNum: nextFloor, seed: this._worldSeed });
      }
      await this._generateZones(this._worldSeed);
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

    if (this.state === STATES.PLAYING && !this._cashOutActive) {
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
        this.spellingGlue.onSpellingClose();
      }
    }

    this.particles.update(dt, this.camera);
    this.flipbooks.update(dt, this.camera);
    this.shaderFX.update(dt);
    updateWeaponEmitters(dt, this.camera);
    const uiStart = performance.now();
    this.ui.update(dt);
    this.ui.updateBackpack();
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
    if (this._cashOutActive) return; // paused during cash-out

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
      this.tpCamera.updateControls(dt);
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
    this._updateReticle();

    // Update weapon cooldowns
    for (const w of this.player.weapons) w.update(dt);
    this.missileSystem.missileStrikeCooldown = Math.max(0, this.missileSystem.missileStrikeCooldown - dt);

    if (input.pressed('KeyQ')) {
      this.missileSystem.tryFire();
    }

    // Contextual J button — mine block or attack enemy
    const minePressed = input.pressed('KeyJ') || (this.cameraMode === 'thirdPerson' && input.buttonPressed?.('left'));
    const activeWeapon = this.player.weapons[this.player.currentSlot];
    if (minePressed && this._canUseWeapon(activeWeapon)) {
      const weapon = activeWeapon;
      if (weapon.data.type === 'grapple') {
        const aim = this._getMiningAim();
        const handPos = new THREE.Vector3();
        this.player.equipmentHolders.rightHand?.getWorldPosition(handPos);
        const fired = this.player.ivyWhip.fire(handPos, aim.direction, this.world);
        if (fired) {
          this.player.playAttackAnim();
          SFXMapper.meleeSwing('sword');
        } else {
          SFXMapper.swingMiss();
        }
        weapon.cooldown = 0.35;
      } else if (weapon.data.type === 'thrown') {
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
      const nearestEnemy = this.mining.findNearestEnemy(2.5);
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
        const miningTarget = this.mining.findTarget(GAME.MINE_RANGE);
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
            const result = this.world.mineTerrainBlock(g.x, g.y, g.z, this.mining.getDamage(nearestBlock), {
              center: miningTarget.brushCenter,
              zoneId,
              type: typeKey,
              radius: this.mining.getBrushRadius(zoneId),
            });
            terrainResult = result;
            destroyed = result.destroyed;
            typeKey = result.cell?.type || typeKey;
            zoneId = result.cell?.zoneId || zoneId;
          } else {
            // ── Floating block mining ──
            destroyed = nearestBlock.takeDamage(this.mining.getDamage(nearestBlock));
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
              this.mining.awardTerrainDigRewards(terrainResult, blockPos, zoneId);
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
                this.iconDrops?.spawn(blockPos, blockDef.resource, 1);
              }
            }

            // Mining combo tracked silently (no floating text spam)

            // timeBonus for mining (combo bonus)
            this.floorTimer += GAME.TIME_BONUS_MINING + (isFloat ? this.mineCombo : 0);
            const extraBudget = this.progression.getPickaxeWidth() - 1;
            if (extraBudget > 0) {
              const extraMined = miningTarget.isTerrain
                ? this.mining.mineExtraTerrain(miningTarget, zoneId, extraBudget)
                : this.mining.mineExtraFloating(nearestBlock, zoneId, extraBudget);
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
    for (let i = 0; i < this.player.weapons.length; i++) {
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
    this.missileSystem.update(dt);

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

    // Icon drops update (resources into backpack)
    this.iconDrops.update(dt, this.player.position, (type, amount) => {
      this._onIconDropCollect(type, amount);
    });

    // Collection Beacon update + interact
    this._updateBeacon(dt);

    this._checkZoneCompletion();

    // Letter drops update
    const collectedLetter = this.letterDrops.update(dt, this.player.position);
    if (collectedLetter) {
      const letter = typeof collectedLetter === 'string' ? collectedLetter : collectedLetter.letter;
      const pickupPosition = typeof collectedLetter === 'string' ? null : collectedLetter.position;
      this.spellingGlue.collectLetter(letter, pickupPosition);
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

    this.mining.processRewardFeedbackQueue();
    this.mining.flushResourceTexts(dt);

    this._updateZoneAtmosphere(isoDepthFactor);

    // Check death / timer expiry → cash-out → camp
    if (this.player.hp <= 0) {
      SFXMapper.playerDeath();
      this._triggerCashOut();
      return;
    }

    // Update UI
    const uiStart = performance.now();
    this.ui.updateStats();
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
    this.skyGradient = new SkyGradient(this.scene, null, {
      scale: 800,
      autoTick: cycleEnabled,
      cycleSpeed: cycleSpeed,
      starsEnabled: starsEnabled,
      sunStrength: 4.0,
      sunDiscSize: 0.06,
      auroraEnabled: false,
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
      const darkness = this.skyGradient.material.uniforms.darkness.value;
      const adjustedIntensity = 4.0 * 0.5 * sunFactor * (1.0 - darkness * 0.5);

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
    const adjustedIntensity = 4.0 * 0.5 * sunFactor * (1.0 - darkness * 0.5);
    if (this.sun) {
      this.sun.color.copy(sunColor ?? new THREE.Color(preset.sunColor)).lerp(new THREE.Color(0x9fb6ff), darkness * 0.25);
      // Position the directional light so it shines FROM the sun direction
      this.sun.position.set(sunDir.x * 50, sunDir.y * 50, sunDir.z * 50);
      this.sun.intensity = adjustedIntensity;
    }

    this.skyGradient.setSun({
      color: sunColor ?? new THREE.Color(preset.sunColor),
      strength: 4.0 * sunFactor * (1.0 - darkness * 0.5),
      sharpness: 16.0,
      glowStrength: 0.6,
      discSize: 0.06,
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
      this.tpCamera.update(dt, shakeX, shakeY, shakeZ);
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
    return this.tpCamera.updateControls(dt);
  }

  _updateThirdPersonCamera(dt, shakeX = 0, shakeY = 0, shakeZ = 0) {
    return this.tpCamera.update(dt, shakeX, shakeY, shakeZ);
  }

  _getThirdPersonDesiredPosition(target, yaw, pitch, distance) {
    return this.tpCamera.getDesiredPosition(target, yaw, pitch, distance);
  }

  _getThirdPersonCameraDistance(pivot, desired, direction, rayDist) {
    return this.tpCamera.getCameraDistance(pivot, desired, direction, rayDist);
  }

  _findNearestEnemy(range) {
    return this.mining.findNearestEnemy(range);
  }

  _findMiningTarget(range) {
    return this.mining.findTarget(range);
  }

  _findTerrainMiningTarget(aim, forward, range, isPickaxe) {
    return this.mining.findTerrainTarget(aim, forward, range, isPickaxe);
  }

  _findUnderfootTerrainMiningTarget(isPickaxe) {
    return this.mining.findUnderfootTarget(isPickaxe);
  }

  _buildTerrainMiningStatusFromHit(hit, isPickaxe) {
    return this.mining._buildTerrainMiningStatusFromHit(hit, isPickaxe);
  }

  _buildTerrainMiningStatusFromCenter(brushCenter, zoneId, isPickaxe, hitPoint = brushCenter.clone()) {
    return this.mining._buildTerrainMiningStatusFromCenter(brushCenter, zoneId, isPickaxe, hitPoint);
  }

  _getMiningStatusForBlock(block, options = {}) {
    return this.mining.getStatus(block, options);
  }

  _getMiningDamage(block) {
    return this.mining.getDamage(block);
  }

  _getTerrainBrushRadius(zoneId) {
    return this.mining.getBrushRadius(zoneId);
  }

  _mineExtraTerrainBlocks(miningTarget, zoneId, budget) {
    return this.mining.mineExtraTerrain(miningTarget, zoneId, budget);
  }

  _mineExtraFloatingBlocks(originBlock, zoneId, budget) {
    return this.mining.mineExtraFloating(originBlock, zoneId, budget);
  }

  _awardTerrainDigRewards(result, hitPos, zoneId) {
    return this.mining.awardTerrainDigRewards(result, hitPos, zoneId);
  }

  _enqueueRewardFeedback(job) {
    return this.mining.enqueueRewardFeedback(job);
  }

  _processRewardFeedbackQueue(maxJobs = 3) {
    return this.mining.processRewardFeedbackQueue(maxJobs);
  }

  batchResourceText(type, amount = 1, color = 0x88ccff, displayName = null) {
    return this.mining.batchResourceText(type, amount, color, displayName);
  }

  _flushResourceType(type) {
    return this.mining.flushResourceType(type);
  }

  _flushResourceTexts(dt) {
    return this.mining.flushResourceTexts(dt);
  }

  _explodeGrenade(position, config = {}) {
    return this.explosions.grenade(position, config);
  }

  _explodeMissile(position, config = {}) {
    return this.explosions.missile(position, config);
  }

  _explodeBlast(position, config = {}) {
    return this.explosions.blast(position, config);
  }

  _spawnShockwave(position, radius, color = 0xffaa33) {
    return this.explosions.shockwave(position, radius, color);
  }

  _spawnImpactLight(position, color = 0xff8a33, intensity = 4, duration = 0.25) {
    return this.explosions.impactLight(position, color, intensity, duration);
  }

  _tryCallMissileStrike() {
    return this.missileSystem.tryFire();
  }

  _buildMissileStrikePayload() {
    return this.missileSystem._buildMissileStrikePayload();
  }

  _getMissileStrikeCenter() {
    return this.missileSystem._getMissileStrikeCenter();
  }

  _getGroundedStrikePoint(x, z, fallbackY = 0) {
    return this.missileSystem._getGroundedStrikePoint(x, z, fallbackY);
  }

  _callMissileStrike(payload, options = {}) {
    return this.missileSystem.call(payload, options);
  }

  _createMissileVisual(start, target) {
    return this.missileSystem._createMissileVisual(start, target);
  }

  _updateActiveMissiles(dt) {
    return this.missileSystem.update(dt);
  }

  _removeMissileVisual(missile) {
    return this.missileSystem._removeMissileVisual(missile);
  }

  _pickDigJunkResource(depth, tier, luck) {
    return this.mining._pickDigJunkResource(depth, tier, luck);
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
      this.zoneGateway.create();
    }
  }

  _clearExitPortal() {
    if (this.exitMesh) {
      this.scene.remove(this.exitMesh);
      this.exitMesh = null;
    }
  }

  // ===== Zone Gateway System =====

  _createGateways() {
    return this.zoneGateway.create();
  }

  _clearGateways() {
    return this.zoneGateway.clear();
  }

  _checkGateways() {
    return this.zoneGateway.check();
  }

  _transitionToZone(targetZoneId) {
    return this.zoneGateway.transition(targetZoneId);
  }

  _respawnZoneEnemies(zoneId) {
    return this.zoneGateway.respawnEnemies(zoneId);
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
      const tune = this.tpCamera.tuning;
      this.camYaw = this.player.rotation;
      this.camPitch = tune.pitchDefault;
      this.thirdPersonCamera.fov = tune.fov;
      this.thirdPersonCamera.updateProjectionMatrix();
      const rig = this.tpCamera.rig;
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
      rig.firstPersonBlend = 0;
      rig.firstPersonLocked = false;
      rig.firstPersonUnlockDelay = 0;
      rig.manualRecenteringTimer = 0;
      rig.initialized = true;
      this.camPos.copy(this.tpCamera.getDesiredPosition(subject, rig.displayYaw, rig.pitch, rig.distance));
      this.thirdPersonCamera.position.copy(this.camPos);
      this.thirdPersonCamera.lookAt(subject.x, subject.y, subject.z);
      this.tpCamera.collision.initialized = false;
      this.tpCamera.collision.nearHit = false;
      this.renderer.domElement.requestPointerLock?.();
      if (this.aimReticle) {
        this.aimReticle.style.display = 'block';
        this.aimReticle.style.opacity = '1';
      }
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

  _updateReticle() {
    if (this.cameraMode !== 'thirdPerson' || !this.aimReticle) return;

    const cam = this.thirdPersonCamera;
    const origin = cam.position.clone();
    const direction = new THREE.Vector3();
    cam.getWorldDirection(direction);

    let targetPoint = null;

    // Raycast against terrain
    const terrain = this.world?.terrainMesh;
    if (terrain?.raycastVoxel) {
      const hit = terrain.raycastVoxel(origin, direction, 40, { solidOnly: true });
      if (hit?.point) {
        targetPoint = hit.point.clone();
      }
    }

    // Fallback: raycast against floating blocks
    if (!targetPoint && this.world?.blocks) {
      let nearestBlock = null;
      let nearestDist = 40;
      for (const block of this.world.blocks.values()) {
        if (block.destroyed) continue;
        const toBlock = block.position.clone().sub(origin);
        const proj = toBlock.dot(direction);
        if (proj < 0.5 || proj > nearestDist) continue;
        const closest = origin.clone().addScaledVector(direction, proj);
        const distToCenter = closest.distanceTo(block.position);
        if (distToCenter < 0.8 && proj < nearestDist) {
          nearestDist = proj;
          nearestBlock = block;
        }
      }
      if (nearestBlock) {
        targetPoint = nearestBlock.position.clone();
      }
    }

    // If nothing hit, project to a point along the aim ray
    if (!targetPoint) {
      targetPoint = origin.clone().addScaledVector(direction, 25);
    }

    // Project 3D point to screen space
    const projected = targetPoint.clone().project(cam);

    // Check if behind camera
    if (projected.z > 1 || projected.z < 0) {
      this.aimReticle.style.opacity = '0';
      return;
    }

    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

    this.aimReticle.style.left = `${x}px`;
    this.aimReticle.style.top = `${y}px`;
    this.aimReticle.style.transform = 'translate(-50%, -50%)';
    this.aimReticle.style.opacity = '1';
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
      this.explosions.grenade(new THREE.Vector3(data.x, data.y, data.z), {
        radius: data.radius || GAME.GRENADE_RADIUS,
        damage: data.damage || GAME.GRENADE_DAMAGE,
        attackerWeaponId: data.attackerWeaponId || 'grenade',
        remote: true,
      });
    } else if (type === 'missile_strike') {
      this.missileSystem.call(data, { remote: true });
    } else if (type === 'floor_changed') {
      if (!this.isHost && data.floorNum && data.seed != null) {
        this._worldSeed = data.seed;
        this._generateZones(this._worldSeed);
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
        this.mining.batchResourceText(type, value, color, '💰');
      }
    }
    const now = performance.now?.() || Date.now();
    if (now - this._lastCollectSfxAt > 70) {
      this._lastCollectSfxAt = now;
      SFXMapper.collectOre();
    }
  }

  _onIconDropCollect(type, amount) {
    const result = this.runBackpack.add(type, amount);
    if (result.success && result.added > 0) {
      const meta = RESOURCE_META[type];
      const label = meta?.name || type;
      this.mining.batchResourceText(label, result.added, 0xfacc15, '🎒');
      const now = performance.now?.() || Date.now();
      if (now - this._lastCollectSfxAt > 70) {
        this._lastCollectSfxAt = now;
        SFXMapper.collectOre();
      }
    }
    if (!result.success) {
      this.ui.showFloatingText('Backpack full!', 0xff4444);
      return false; // Don't remove the drop — let it stay on the ground
    }
    return true;
  }

  _updateBeacon(dt) {
    this.beacon.update(dt);
    const nearBeacon = this.beacon.isPlayerNear(this.player.position, 3);
    const hasItems = this.runBackpack.getTotalItems() > 0;
    this.ui.showDepositPrompt(nearBeacon && hasItems);

    if (nearBeacon && hasItems && input.pressed('KeyE')) {
      this._triggerCashOut();
    }
  }

  _triggerCashOut() {
    if (this._cashOutActive) return;
    this._cashOutActive = true;

    // Deposit backpack resources
    const result = this.runBackpack.depositAll(this.resources);
    if (result.totalCoins > 0) {
      this.player.coins += result.totalCoins;
    }

    // Gather pending letters for cash-out display
    const pendingLetters = Array.from(this.pendingLetters);

    // Check milestone: any affordable upgrade?
    let milestone = null;
    const upgradeIds = [
      'pickaxe_width', 'round_time', 'letter_drop',
      'grenade_unlock', 'grenade_radius', 'grenade_cooldown',
      'missile_unlock', 'missile_radius',
      'rocket_boots_unlock', 'rocket_boots_fuel',
    ];
    for (const id of upgradeIds) {
      const cost = this.progression.getPurchaseCost(id);
      if (cost != null && cost <= this.player.coins) {
        milestone = 'New upgrade available!';
        break;
      }
    }

    SFXMapper.cashOutSuction();
    this.cashOut.start({
      deposited: result.deposited,
      totalCoins: result.totalCoins,
      letters: pendingLetters,
      milestone,
    }, () => {
      this._cashOutActive = false;
      this.state = STATES.CAMP;
      this.ui.showCamp(true);
    });
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

  _spawnPet() {
    const equipped = this.petManager.getEquippedPet();
    if (!equipped) return;

    this._clearPet();

    const pet = new PetLetter(this.scene, equipped.letter, equipped.level, {
      onBlockDestroyed: (block) => this._onPetBlockDestroyed(block),
      canMineBlock: (block) => this.mining.getStatus(block).allowed,
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
