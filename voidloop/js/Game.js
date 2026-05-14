import * as THREE from 'three';
import { assetLoader } from './AssetLoader.js';
import { input } from './InputManager.js';
import { audio } from './AudioManager.js';
import { ParticleSystem } from './ParticleSystem.js';
import { FlipbookVFX, FLIPBOOK_EFFECTS } from './FlipbookVFX.js';
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
import { ShopManager, SHOP_ITEMS } from './ShopManager.js';
import { ShopUI } from './ShopUI.js';
import { HazardSystem } from './HazardSystem.js';
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

const STATES = {
  LOADING: 'loading',
  PLAYING: 'playing',
  CAMP: 'camp',
  SPELLING: 'spelling',
};

const ISO_UNDERGROUND_VIEW = {
  DEPTH_START: 0.8,
  DEPTH_FULL: 7.0,
  HORIZONTAL_SCALE: 0.68,
  VERTICAL_SCALE: 1.26,
  TARGET_Y_BIAS: -0.35,
  TARGET_FORWARD_BIAS: 1.65,
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

const TP_DISTANCE = 2.4;
const TP_HEIGHT = 1.55;
const TP_SHOULDER_X = 0.45;
const TP_SHOULDER_Y = 0.05;
const TP_PITCH_MIN = -1.0;
const TP_PITCH_MAX = 1.0;
const TP_SMOOTH_SPEED = 8.0;

export class Game {
  constructor(container) {
    this.container = container;
    this.state = STATES.LOADING;
    this.clock = new THREE.Clock();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Keep the main game at native CSS resolution. On Retina displays a 1.5x
    // render scale is a large fragment-cost jump and makes 60fps fragile.
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
    this.container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);

    // Camera — Orthographic isometric by default, with a toggleable third-person mining view
    this.cameraZoom = 3.0;
    this.baseD = 18;
    const aspect = window.innerWidth / window.innerHeight;
    const d = this.baseD / this.cameraZoom;
    this.isoCamera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 200);
    this.isoCamera.position.set(20, 20, 20);
    this.isoCamera.lookAt(0, 0, 0);
    this.thirdPersonCamera = new THREE.PerspectiveCamera(72, aspect, 0.05, 180);
    this.scene.add(this.thirdPersonCamera);
    this.camera = this.isoCamera;
    this.cameraMode = 'iso';
    this.cameraTarget = new THREE.Vector3();
    this._cameraTargetReady = false;
    this.camYaw = 0;
    this.camPitch = -0.12;
    this.camPos = new THREE.Vector3();

    // Lighting
    this.ambient = new THREE.AmbientLight(0x8888aa, 0.6);
    this.scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xfff5e6, 1.2);
    this.sun.position.set(10, 30, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(256, 256);
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 80;
    this.sun.shadow.camera.left = -30;
    this.sun.shadow.camera.right = 30;
    this.sun.shadow.camera.top = 30;
    this.sun.shadow.camera.bottom = -30;
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

    // Systems
    this.particles = new ParticleSystem(this.scene);
    this.flipbooks = new FlipbookVFX(this.scene);
    this.world = new World(this.scene);
    this.player = new Player(this.scene);
    this.player.world = this.world;
    this.ui = new UIManager(this);
    this.aimReticle = document.createElement('div');
    this.aimReticle.textContent = '+';
    this.aimReticle.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);color:#e8fff2;text-shadow:0 1px 4px #000;font-size:22px;font-weight:700;z-index:20;pointer-events:none;display:none;';
    document.body.appendChild(this.aimReticle);
    this.ui.onBrightnessChange = (val) => {
      this.renderer.toneMappingExposure = 1.5 * val;
    };
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
    this.floorTimer = GAME.COUNTDOWN_BASE;
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
      if (key === 'graphicsQuality') this._applyGraphicsSettings();
      if (key === 'masterVolume' || key === 'sfxVolume' || key === 'musicVolume') {
        settings.applyToAudio(audio);
      }
    });

    // Playtest mode detection
    const params = new URLSearchParams(location.search);
    this.playtestKey = params.get('playtest');
    this.isTimedMode = !!this.playtestKey;

    // Score tracking for timed mode
    this.lettersCollected = 0;
    this.blocksMined = 0;
    this.enemiesDefeated = 0;
    this.tokensGathered = 0;

    // Mining combo system
    this.mineCombo = 0;
    this.mineComboTimer = 0;

    // Missile strike special attack
    this.activeMissiles = [];
    this.missileStrikeCooldown = 0;

    // Zone progression systems
    this.zoneManager = new ZoneManager();
    this.inventory = new Inventory();
    this.shop = new ShopManager(this.inventory);
    this.resources = new ResourceInventory();
    this.hazards = null;
    this.shopUI = null;
    this._gatewayMeshes = [];
    this._gatewayLabels = [];

    // Touch controls for iPad/tablet
    this.touchControls = new TouchControls();

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
    await this.player.equipWeapon(1); // Sync functional weapon with sword visual

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
      await this._generateZones(this._worldSeed);
    }

    // Create remote player for multiplayer
    if (this.isMultiplayer) {
      this._createRemotePlayer();
    }

    // Create Shop UI
    this.shopUI = new ShopUI(
      this.shop,
      (itemId, isEquip) => {
        if (isEquip) {
          const item = SHOP_ITEMS.find(i => i.id === itemId);
          if (item) {
            this.inventory.equip(itemId, item.type);
            this._syncFunctionalEquipment();
          }
          return { success: true };
        } else {
          const result = this.shop.buyItem(itemId);
          if (result.success) {
            const item = SHOP_ITEMS.find(i => i.id === itemId);
            if (item) {
              this.inventory.equip(itemId, item.type);
              this._syncFunctionalEquipment();
            }
          }
          return result;
        }
      },
      (upgradeId) => {
        const result = this.shop.buyUpgrade(upgradeId);
        if (result.success) {
          this.player.applyUpgrades(this.shop.upgradeLevels);
        }
        return result;
      },
      () => {
        // Close shop callback
        this.shop.setCoins(this.player.coins);
        this.player.applyUpgrades(this.shop.upgradeLevels);
      },
      // getResources callback
      () => this.resources.getAll(),
      // onSellResource callback
      (type, amount) => {
        const coins = this.resources.sell(type, amount);
        if (coins > 0) {
          this.player.coins += coins;
          this.shop.setCoins(this.player.coins);
          return { success: true, coins };
        }
        return { success: false };
      },
      // getLoadout callback
      () => this.player.loadout,
      // onOpenLoadout callback
      () => {
        this.ui.hideShop();
        this.ui.showLoadout();
      },
      // onBuyPickaxeTier callback
      (zoneId) => this.shop.upgradePickaxeTier(zoneId)
    );

    // Apply saved upgrades to player on game start
    this.player.applyUpgrades(this.shop.upgradeLevels);
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
  }

  async _generateZones(seed) {
    this.world.clear();
    const worldSeed = seed != null ? seed : Math.floor(Math.random() * 1000000);

    // Generate all zones (both visible, enemies only in unlocked)
    for (const zone of ZONES) {
      const zoneSeed = worldSeed + zone.order * 7919;
      const spawnEnemies = this.zoneManager.isZoneUnlocked(zone.id);
      await this.world.generateZone(zone.id, zoneSeed, spawnEnemies);
    }

    // Build unified terrain mesh once after all zones are generated
    await this.world.buildTerrainMesh();

    // Spawn player at current zone's spawn point
    const currentZone = this.zoneManager.getCurrentZone();
    if (currentZone) {
      this.player.position.set(currentZone.spawnPoint.x, 1, currentZone.spawnPoint.z);
    } else {
      this.player.position.set(0, 1, 0);
    }
    this.player.hp = this.player.maxHp;
    this.exitOpen = false;
    this.floorTimer = GAME.COUNTDOWN_BASE;
    this.killCount = 0;
    this.loot.clear();
    this.letterDrops.clear();
    this._clearPet();
    this.letterPool.reset();

    // Set up letter pool for current zone
    if (currentZone) {
      this.letterPool.setLetters(currentZone.letters, currentZone.id);
    }

    const letters = this.letterPool.getCurrentLetters().join(' ');
    this.ui.setFloorText(`ZONE: ${currentZone?.name?.toUpperCase() || 'UNKNOWN'} — Letters: ${letters}`);
    this.ui.updateObjectiveHud?.(this._getObjectiveState(currentZone?.id));
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

    if (this.state === STATES.PLAYING) {
      // Escape handling: pause takes priority, then loadout/petden close
      if (input.pressed('Escape')) {
        if (this.shopUI && this.shopUI.isOpen) {
          this.ui.hideShop();
        } else if (this.ui.loadoutOpen) {
          this.ui.hideLoadout();
        } else if (this.ui.petDenOpen) {
          this.ui.hidePetDenOverlay();
        } else {
          this._togglePause();
        }
      }

      if (input.pressed('KeyI') && !this.paused && !(this.shopUI && this.shopUI.isOpen)) {
        this.ui.toggleLoadout();
      }

      if (input.pressed('KeyP') && !this.paused && !(this.shopUI && this.shopUI.isOpen)) {
        this.ui.togglePetDen();
      }

      if (input.pressed('KeyB') && !this.paused && !this.ui.loadoutOpen && !this.ui.petDenOpen) {
        this.ui.showShop();
      }

      if (input.pressed('KeyV') && !this.paused && !this.ui.loadoutOpen && !this.ui.petDenOpen && !(this.shopUI && this.shopUI.isOpen)) {
        this._toggleCameraMode();
      }

      if (!this.ui.loadoutOpen && !this.ui.petDenOpen && !this.paused && !(this.shopUI && this.shopUI.isOpen)) {
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

    this.particles.update(dt);
    this.flipbooks.update(dt, this.camera);
    updateWeaponEmitters(dt, this.camera);
    this.ui.update(dt);
    this.shopUI?.updatePreview(dt);
    this.renderer.render(this.scene, this.camera);
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

    // Camera hard follow with screen shake
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

    // Player update
    this.player.update(dt, input);
    if (this.player.jumpStartedThisFrame) {
      const pos = this.player.position.clone().add(new THREE.Vector3(0, 0.08, 0));
      this.particles.dust(pos, 5);
      this.particles.spark(pos, this.player.jumpsRemaining === 0 ? 4 : 2);
    }
    if (this.player.landedThisFrame) {
      const pos = this.player.position.clone().add(new THREE.Vector3(0, 0.04, 0));
      this.particles.dust(pos, 4);
    }

    // Update remote player animation
    if (this._remotePlayer) {
      this._remotePlayer.update(dt);
    }

    // Update weapon cooldowns
    for (const w of this.player.weapons) w.update(dt);
    this.missileStrikeCooldown = Math.max(0, this.missileStrikeCooldown - dt);

    if (input.pressed('KeyQ')) {
      this._tryCallMissileStrike();
    }

    // Contextual J button — mine block or attack enemy
    const minePressed = input.pressed('KeyJ') || (this.cameraMode === 'thirdPerson' && input.buttonPressed?.('left'));
    if (minePressed && this.player.weapons[this.player.currentSlot].cooldown <= 0) {
      const weapon = this.player.weapons[this.player.currentSlot];
      if (weapon.data.type === 'thrown') {
        const aim = this._getMiningAim();
        const thrown = this.player.attack(aim.origin, aim.direction, this.scene, audio, this.particles, this.world.enemies);
        if (thrown) {
          this.player.playAttackAnim();
          // third-person uses full-body attack animation, no viewmodel swing needed
        } else {
          SFXMapper.swingMiss();
        }
      } else {

      // Check for nearby enemy first (combat priority)
      const nearestEnemy = this._findNearestEnemy(2.5);
      if (nearestEnemy) {
        // Check zone staff requirements for enemies beyond Forest
        const enemyZone = nearestEnemy.zoneId ? getZoneById(nearestEnemy.zoneId) : null;
        const equippedWeapon = this.player.getEquippedWeapon();
        if (enemyZone && enemyZone.staffId) {
          const requiredWeapon = enemyZone.staffId;
          if (equippedWeapon !== requiredWeapon) {
            this.ui.showFloatingText(`🔱 ${enemyZone.name}`, 0xff4444);
            this.player.playAttackAnim();
            SFXMapper.swingMiss();
            weapon.cooldown = GAME.ATTACK_COOLDOWN;
            return;
          }
        }
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

            // Block break VFX + screen shake (stronger for floating blocks)
            this.particles.dust(blockPos, isFloat ? 10 : 8);
            this.particles.spark(blockPos, isFloat ? 8 : 6);
            this._screenShake(isFloat ? 0.8 : 0.5, 0.25);

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
              if (Math.random() < 0.25) {
                const letter = this._pickLetterForZone(zoneId || this.zoneManager.currentZoneId);
                if (letter) {
                  this.letterDrops.spawn(blockPos, letter);
                  this.ui.showFloatingText(`Letter ${letter}!`, 0xfacc15);
                }
              }
              const blockDef = BLOCK_TYPES[typeKey];
              if (blockDef && blockDef.resource) {
                this.resources.add(blockDef.resource, 1);
                const resName = blockDef.resource.replace(/_/g, ' ');
                this.ui.showFloatingText(`+1 ${resName}`, 0x88ccff);
              }
            }

            // Score popup + combo text for floating blocks
            if (isFloat) {
              const basePoints = 10;
              const points = basePoints * this.mineCombo;
              this.ui.showFloatingText(`+${points}`, 0xfacc15);
              if (this.mineCombo >= 2) {
                const comboColors = { 2: 0xfacc15, 3: 0xffaa00, 4: 0xff6600, 5: 0xff2200 };
                const comboColor = comboColors[Math.min(this.mineCombo, 5)] || 0xff0000;
                this.ui.showFloatingText(`×${this.mineCombo} COMBO!`, comboColor);
              }
            }

            // timeBonus for mining (combo bonus)
            this.floorTimer += GAME.TIME_BONUS_MINING + (isFloat ? this.mineCombo : 0);
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
    this.world.update(dt, this.player.position, this.particles, audio, this.player, {
      cameraMode: this.cameraMode,
      camera: this.camera,
      currentZoneId: this.zoneManager.currentZoneId,
    });

    // Loot update (hoover, magnet, collect)
    this.loot.update(dt, this.player.position, (type, value, color) => {
      this._onLootCollect(type, value, color);
    });

    this._syncCurrentZoneFromPosition();
    this._checkZoneCompletion();

    // Letter drops update
    const collectedLetter = this.letterDrops.update(dt, this.player.position);
    if (collectedLetter) {
      this._enterSpellingChallenge(collectedLetter);
    }

    // Pet update
    if (this.pet) {
      this.pet.update(dt, this.player, this.world);
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

    this._updateZoneAtmosphere(isoDepthFactor);

    // Check death
    if (this.player.hp <= 0) {
      SFXMapper.playerDeath();
      this.state = STATES.CAMP;
      // Save coins and progress before showing camp
      this.shop.setCoins(this.player.coins);
      this.ui.showCamp(true);
      return;
    }

    // Update UI
    this.ui.updateStats();

    // FPS counter
    this.frameCount = (this.frameCount || 0) + 1;
    const now = performance.now();
    if (now - (this.lastFpsTime || 0) >= 1000) {
      this.ui.setFPS(this.frameCount, this._getPerfDebugStats());
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  _getPerfDebugStats() {
    const enabled = window.location.search.includes('perf=1')
      || window.localStorage?.getItem('voidloopPerfDebug') === '1';
    if (!enabled) return null;
    const terrain = this.world?.terrainMesh?.getStats?.() || {};
    return {
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      visibleChunks: terrain.visibleChunks || 0,
      liveChunks: terrain.liveChunks || terrain.chunks || 0,
      dirtyChunks: terrain.dirtyChunks || 0,
      rebuildMs: terrain.rebuildMs || 0,
    };
  }

  _getIsoUndergroundFactor() {
    if (this.cameraMode !== 'iso' || !this.world || !this.player) return 0;
    const depth = this.world.getTerrainDepthAtPlayer?.(this.player.position) || 0;
    return smoothstep(ISO_UNDERGROUND_VIEW.DEPTH_START, ISO_UNDERGROUND_VIEW.DEPTH_FULL, depth);
  }

  _updateZoneAtmosphere(isoDepthFactor = 0) {
    const currentZone = getZoneAtPosition(this.player.position.x, this.player.position.z);
    const baseBackground = new THREE.Color(currentZone?.fogColor || 0x0a0a0a);
    const ambientColors = {
      forest: 0x88aa88,
      fire: 0xaa6644,
      ice: 0x88aacc,
      desert: 0xccaa66,
      steelworks: 0x8899aa,
      mire: 0x669966,
      citadel: 0xccaa77,
    };
    const baseAmbient = new THREE.Color(currentZone ? (ambientColors[currentZone.id] || 0x8888aa) : 0x8888aa);
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

      const fogColor = this.scene.background.clone().lerp(new THREE.Color(0x111820), 0.22);
      const fogNear = currentZone?.fogNear || ISO_UNDERGROUND_VIEW.FOG_NEAR;
      const fogFar = currentZone?.fogFar || ISO_UNDERGROUND_VIEW.FOG_FAR;
      this.scene.fog = new THREE.Fog(
        fogColor,
        fogNear + (ISO_UNDERGROUND_VIEW.FOG_NEAR - fogNear) * undergroundT,
        fogFar + (ISO_UNDERGROUND_VIEW.FOG_FAR - fogFar) * undergroundT
      );

      this.ambient.color.copy(baseAmbient).lerp(new THREE.Color(0xd9e4d0), ISO_UNDERGROUND_VIEW.AMBIENT_BOOST * undergroundT);
    } else {
      this.scene.background = baseBackground;
      this.scene.fog = null;
      this.ambient.color.copy(baseAmbient);
    }
  }

  _updateCamera(dt, isoOffset, shakeX = 0, shakeY = 0, shakeZ = 0, isoDepthFactor = 0) {
    if (this.cameraMode === 'thirdPerson') {
      this._updateThirdPersonAim(dt);
      this._updateThirdPersonCamera(dt, shakeX, shakeY, shakeZ);
      if (this.player.mesh) this.player.mesh.visible = true;
      return;
    }

    this.player.controlYaw = null;
    if (this.player.mesh) this.player.mesh.visible = true;
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
  }

  _updateThirdPersonAim(dt) {
    const sensitivity = 0.0022;
    if (input.mouse.locked) {
      this.camYaw -= input.mouse.dx * sensitivity;
      this.camPitch += input.mouse.dy * sensitivity;
      this.camPitch = Math.max(TP_PITCH_MIN, Math.min(TP_PITCH_MAX, this.camPitch));
    }
    this.player.controlYaw = this.camYaw;
  }

  _updateThirdPersonCamera(dt, shakeX = 0, shakeY = 0, shakeZ = 0) {
    const playerPos = this.player.position;
    const pivot = new THREE.Vector3(playerPos.x, playerPos.y + TP_HEIGHT, playerPos.z);

    // Lazy follow / auto-recenter: when moving, camera gently swings behind player
    let forwardMove = 0;
    let strafeMove = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) forwardMove += 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) forwardMove -= 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) strafeMove -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) strafeMove += 1;

    if (forwardMove !== 0 || strafeMove !== 0) {
      const moveYaw = Math.atan2(
        Math.sin(this.camYaw) * forwardMove - Math.cos(this.camYaw) * strafeMove,
        Math.cos(this.camYaw) * forwardMove + Math.sin(this.camYaw) * strafeMove
      );
      let yawDiff = moveYaw - this.camYaw;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      this.camYaw += yawDiff * 2.5 * dt;
    }

    // Compute desired camera position based on yaw, pitch, distance and shoulder offset
    const cosYaw = Math.cos(this.camYaw);
    const sinYaw = Math.sin(this.camYaw);
    const cosPitch = Math.cos(this.camPitch);
    const sinPitch = Math.sin(this.camPitch);

    // Base offset: behind player
    const offset = new THREE.Vector3(
      -sinYaw * TP_DISTANCE * cosPitch,
      sinPitch * TP_DISTANCE,
      -cosYaw * TP_DISTANCE * cosPitch
    );

    // Shoulder offset (right shoulder)
    offset.x += cosYaw * TP_SHOULDER_X;
    offset.z += -sinYaw * TP_SHOULDER_X;
    offset.y += TP_SHOULDER_Y;

    const desired = pivot.clone().add(offset);

    // Collision avoidance: raycast from pivot to desired camera position
    const direction = desired.clone().sub(pivot).normalize();
    const rayDist = pivot.distanceTo(desired);
    let actualDist = rayDist;

    if (this.world?.terrainMesh) {
      const raycaster = new THREE.Raycaster(pivot, direction, 0.05, rayDist + 0.5);
      const hit = this.world.terrainMesh.raycast(raycaster);
      if (hit?.point) {
        actualDist = Math.max(0.6, pivot.distanceTo(hit.point) - 0.3);
      }
    }

    if (actualDist < rayDist) {
      desired.copy(pivot).add(direction.multiplyScalar(actualDist));
    }

    // Apply shake
    desired.x += shakeX * 0.2;
    desired.y += shakeY * 0.2;
    desired.z += shakeZ * 0.2;

    // Smooth position with spring-like feel
    const t = 1 - Math.exp(-TP_SMOOTH_SPEED * dt);
    this.camPos.x += (desired.x - this.camPos.x) * t;
    this.camPos.y += (desired.y - this.camPos.y) * t;
    this.camPos.z += (desired.z - this.camPos.z) * t;

    this.thirdPersonCamera.position.copy(this.camPos);
    this.thirdPersonCamera.lookAt(pivot.x, pivot.y, pivot.z);
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
      const rayOrigin = aim.origin;
      const rayDirs = this.cameraMode === 'thirdPerson'
        ? [aim.direction.clone()]
        : [
          aim.direction.clone(),
          aim.direction.clone().multiplyScalar(0.75).add(new THREE.Vector3(0, -0.65, 0)).normalize(),
          new THREE.Vector3(0, -1, 0),
        ];
      let hit = null;
      for (const dir of rayDirs) {
        const raycaster = new THREE.Raycaster(rayOrigin, dir, 0.05, range);
        hit = this.world.terrainMesh.raycast(raycaster);
        if (hit) break;
      }
      if (hit) {
        const zone = getZoneAtPosition(hit.point.x, hit.point.z);
        if (!zone) return null;
        const normal = hit.face?.normal?.clone() || new THREE.Vector3(0, 1, 0);
        normal.transformDirection(hit.object.matrixWorld).normalize();
        let brushCenter = hit.point.clone().addScaledVector(normal, -0.45);
        if (!this.world.terrainMesh.isSolidAt(brushCenter.x, brushCenter.y, brushCenter.z)) {
          brushCenter = hit.point.clone().addScaledVector(normal, 0.45);
        }
        const depth = Math.max(0, 1 - brushCenter.y);
        const typeKey = depth > 12 ? 'stone_dark' : depth > 4 ? 'stone' : 'dirt';
        const proxy = {
          typeKey,
          position: hit.point.clone(),
          zoneId: zone.id,
          isFloating: false,
          destroyed: false,
          tier: 1,
        };
        const status = this._getMiningStatusForBlock(proxy, { isPickaxe });
        status.isTerrain = true;
        status.gridPos = { x: brushCenter.x, y: brushCenter.y, z: brushCenter.z };
        status.hitPoint = hit.point.clone();
        status.brushCenter = brushCenter;
        status.terrainCell = { type: typeKey, zoneId: zone.id };
        return status;
      }
    }

    return null;
  }

  _getMiningStatusForBlock(block, options = {}) {
    const blockDef = BLOCK_TYPES[block.typeKey] || {};
    const blockZoneId = block.zoneId || blockDef.zone;
    const blockZone = getZoneById(blockZoneId);
    const equippedTool = this.player.getEquippedTool() || this.inventory.getEquippedTool();
    const requiredPickaxe = blockZone?.pickaxeId;
    const blockTier = blockDef.tier || block.tier || 1;
    const zonePickaxeTier = this.shop.getPickaxeTier(blockZoneId);
    const isPickaxe = options.isPickaxe ?? (this.player.weapons[this.player.currentSlot]?.data?.id === 'pickaxe');

    if (block.isFloating && !isPickaxe) {
      return { allowed: false, block, reason: 'wrong_weapon', icon: '⛏️', requiredTier: blockTier, currentTier: zonePickaxeTier };
    }
    if (requiredPickaxe && equippedTool !== requiredPickaxe) {
      return { allowed: false, block, reason: 'wrong_pickaxe', icon: '⛏️', requiredItem: requiredPickaxe, requiredTier: blockTier, currentTier: zonePickaxeTier };
    }
    if (zonePickaxeTier < blockTier) {
      return { allowed: false, block, reason: 'low_tier', icon: '🔒', requiredTier: blockTier, currentTier: zonePickaxeTier };
    }

    return { allowed: true, block, reason: 'ok', requiredTier: blockTier, currentTier: zonePickaxeTier };
  }

  _getMiningDamage(block) {
    const blockDef = BLOCK_TYPES[block.typeKey] || {};
    const zonePickaxeTier = this.shop.getPickaxeTier(block.zoneId || blockDef.zone);
    const tierDamage = { 1: 1, 2: 2, 3: 3, 4: 5 };
    return tierDamage[zonePickaxeTier] || 1;
  }

  _getTerrainBrushRadius(zoneId) {
    const tier = this.shop.getPickaxeTier(zoneId || this.zoneManager.currentZoneId) || 1;
    const radii = { 1: 0.95, 2: 1.25, 3: 1.65, 4: 2.15 };
    return radii[Math.min(tier, 4)] || radii[1];
  }

  _awardTerrainDigRewards(result, hitPos, zoneId) {
    if (!result?.meaningful) return;

    const tier = this.shop.getPickaxeTier(zoneId || this.zoneManager.currentZoneId) || 1;
    const depth = result.depth || 0;
    const luck = this.shop.getUpgradeLevel?.('mine_luck') || 0;
    const volumeBonus = Math.min(3, Math.floor((result.removedVolume || 0) / 10));
    const amount = Math.max(1, Math.min(4, 1 + Math.floor((tier - 1) / 2) + volumeBonus));
    const resourceType = this._pickDigJunkResource(depth, tier, luck);

    if (this.resources.add(resourceType, amount)) {
      const name = RESOURCE_META[resourceType]?.name || resourceType.replace(/_/g, ' ');
      this.ui.showFloatingText(`+${amount} ${name}`, 0x9bd47a);
    }

    for (const node of result.revealedLetters || []) {
      const spawnPos = node.position.clone();
      this.letterDrops.spawn(spawnPos, node.letter);
      this.ui.showFloatingText(`Letter ${node.letter}!`, 0xfacc15);
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
          const name = resource.replace(/_/g, ' ');
          this.ui.showFloatingText(`+${amount} ${name}`, 0x88ccff);
        }
      }
    }
  }

  _tryCallMissileStrike() {
    if (this.missileStrikeCooldown > 0) {
      this.ui.showFloatingText(`${this.missileStrikeCooldown.toFixed(1)}s`, 0xffaa00);
      SFXMapper.swingMiss();
      return false;
    }

    const payload = this._buildMissileStrikePayload();
    if (!payload) {
      this.ui.showFloatingText('No strike target', 0xff4444);
      SFXMapper.swingMiss();
      return false;
    }

    this.missileStrikeCooldown = GAME.MISSILE_STRIKE_COOLDOWN;
    this._callMissileStrike(payload, { sync: true });
    this.ui.showFloatingText('Missile strike', 0xffaa00);
    return true;
  }

  _buildMissileStrikePayload() {
    const center = this._getMissileStrikeCenter();
    if (!center) return null;

    const min = GAME.MISSILE_STRIKE_MIN || 3;
    const max = GAME.MISSILE_STRIKE_MAX || min;
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
      radius: GAME.MISSILE_STRIKE_RADIUS,
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
    const currentZone = getZoneAtPosition(this.player.position.x, this.player.position.z);
    if (!currentZone) return;
    if (!this.zoneManager.isZoneUnlocked(currentZone.id)) return;
    if (this.zoneManager.currentZoneId === currentZone.id) return;

    this.zoneManager.setCurrentZone(currentZone.id);
    this.letterPool.setLetters(currentZone.letters, currentZone.id);
    const letters = this.letterPool.getCurrentLetters().join(' ');
    this.ui.setFloorText(`ZONE: ${currentZone.name.toUpperCase()} — Letters: ${letters}`);
    this.ui.updateObjectiveHud?.(this._getObjectiveState(currentZone.id));
  }

  _checkZoneCompletion() {
    const zone = this.zoneManager.getCurrentZone();
    if (!zone || this.zoneManager.isZoneCompleted(zone.id)) return;
    const aliveZoneEnemies = this.world.enemies.filter(e => e.zoneId === zone.id && !e.dead);
    const allDead = aliveZoneEnemies.length === 0;
    const allLettersSpelled = this.letterPool.allSpelledForLevel();
    if (allDead && allLettersSpelled) {
      this.zoneManager.markZoneCompleted(zone.id);
      this.exitOpen = true;
      this.ui.showExitOpen(true);
      this.ui.showFloatingText('✅ ⛏️ 🔓', 0x4ade80);
      SFXMapper.floorComplete();
      this._createGateways();
      this.ui.updateObjectiveHud?.(this._getObjectiveState(zone.id));
    }
  }

  _getObjectiveState(zoneId = this.zoneManager.currentZoneId) {
    const zone = getZoneById(zoneId);
    if (!zone) return null;
    const tier = this.shop.getPickaxeTier(zone.id);
    const aliveEnemies = this.world.enemies.filter(e => e.zoneId === zone.id && !e.dead).length;
    return {
      zoneId: zone.id,
      letters: { done: this.letterPool.getSpelledCount(), total: zone.letters.length },
      enemies: { done: aliveEnemies === 0, remaining: aliveEnemies },
      pickaxeTier: tier,
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
    for (const zone of ZONES) {
      if (!zone.exitGateway) continue;
      const gw = zone.exitGateway;
      const targetZone = getZoneById(gw.targetZone);
      if (!targetZone) continue;

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
    for (const zone of ZONES) {
      if (!zone.exitGateway) continue;
      const gw = zone.exitGateway;
      const targetZone = getZoneById(gw.targetZone);
      if (!targetZone) continue;

      const dist = this.player.position.distanceTo(new THREE.Vector3(gw.x, this.player.position.y, gw.z));
      if (dist < 5) {
        const status = this.zoneManager.getGatewayStatus(targetZone.id, this.inventory);
        if (status && !status.unlocked) {
          if (status.canEnter) {
            const previousComplete = this.zoneManager.isZoneCompleted(this.zoneManager.getPreviousZoneId(targetZone.id));
            this.zoneManager.unlockZone(targetZone.id);
            this.ui.showFloatingText(`🔓 ${targetZone.name} unlocked!`, 0x4ade80);
            this.ui.showGatewayIndicator(targetZone.name, false, ['✅', '⛏️', '🛡️', '🔱']);
            this._createGateways();
            // Spawn enemies in newly unlocked zone
            this._respawnZoneEnemies(targetZone.id);
          } else {
            const reqList = status.missing.map(m => m.label);
            this.ui.showGatewayIndicator(targetZone.name, true, reqList);
            this.ui.showFloatingText(`🔒 ${reqList.join(' ')}`, 0xff4444);
          }
        }
      }
    }
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
    this.hazards = new HazardSystem(this.scene, this.player, this.inventory, this.ui);
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
    this._setCameraMode(this.cameraMode === 'thirdPerson' ? 'iso' : 'thirdPerson');
  }

  _setCameraMode(mode, showToast = true) {
    if (mode === this.cameraMode && this.camera === (mode === 'thirdPerson' ? this.thirdPersonCamera : this.isoCamera)) return;

    this.cameraMode = mode;
    if (mode === 'thirdPerson') {
      this.camera = this.thirdPersonCamera;
      this.camYaw = this.player.rotation;
      this.camPitch = -0.12;
      this.camPos.set(this.player.position.x, this.player.position.y + TP_HEIGHT, this.player.position.z);
      this.renderer.domElement.requestPointerLock?.();
      if (this.aimReticle) this.aimReticle.style.display = 'block';
      if (showToast) this.ui.showFloatingText('Third-person view', 0x7dd3fc);
    } else {
      this.camera = this.isoCamera;
      if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock?.();
      this.player.controlYaw = null;
      this._cameraTargetReady = false;
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
      this.ui.showFloatingText(`+20 HP`, 0x44ff44);
    } else if (type === 'key') {
      this.player.keys = (this.player.keys || 0) + 1;
      this.ui.showFloatingText(`KEY!`, 0xffaa00);
    } else {
      // Coin/gem/ore
      if (value > 0) {
        this.player.coins += value;
        const name = type.replace(/_/g, ' ').toUpperCase();
        this.ui.showFloatingText(`+${value} 💰`, color);
      }
    }
    SFXMapper.collectOre();
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

  _enterSpellingChallenge(letter) {
    if (this.state === STATES.SPELLING) return;
    const wordObj = this.letterPool.pickWordForLetter(letter);
    if (!wordObj) return;

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
        this.ui.showFloatingText('+10 💰', 0xfacc15);
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

    // Update progress text on HUD if needed
    if (this.letterPool.allSpelledForLevel()) {
      this.ui.showFloatingText('All letters found!', 0x4ade80);
    }
    this.ui.updateObjectiveHud?.(this._getObjectiveState());
    this._checkZoneCompletion();
  }

  _applyGraphicsSettings() {
    const size = Math.min(settings.getShadowMapSize(), 512);
    this.renderer.setPixelRatio(1);
    this.sun.shadow.mapSize.set(size, size);
    this.sun.shadow.mapSize.needsUpdate = true;
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
