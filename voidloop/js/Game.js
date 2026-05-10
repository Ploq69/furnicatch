import * as THREE from 'three';
import { assetLoader } from './AssetLoader.js';
import { input } from './InputManager.js';
import { audio } from './AudioManager.js';
import { ParticleSystem } from './ParticleSystem.js';
import { FlipbookVFX, FLIPBOOK_EFFECTS } from './FlipbookVFX.js';
import { Player } from './Player.js';
import { World } from './World.js';
import { UIManager } from './UIManager.js';
import { SFXMapper } from './SFXMapper.js';
import { TouchControls } from './TouchControls.js';
import { LootDrop, LOOT_CONFIG } from './LootDrop.js';
import { GAME, BIOMES, BLOCK_LOOT_TABLES, ENEMY_LOOT_TABLES } from './constants.js';
import { getKayKitPaths } from './KayKitLoadout.js';
import { LetterPool, SPELLING_WORDS } from './SpellingData.js';
import { SpellingChallenge } from './SpellingEngine.js';
import { LetterDrop } from './LetterDrop.js';
import { glyph3D } from '../../js/Glyph3DManager.js';
import { PetManager } from './PetManager.js';
import { PetLetter } from './PetLetter.js';

const STATES = {
  LOADING: 'loading',
  PLAYING: 'playing',
  CAMP: 'camp',
  SPELLING: 'spelling',
};

export class Game {
  constructor(container) {
    this.container = container;
    this.state = STATES.LOADING;
    this.clock = new THREE.Clock();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
    this.container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);

    // Camera — Orthographic isometric (stationary)
    this.cameraZoom = 3.0;
    this.baseD = 18;
    const aspect = window.innerWidth / window.innerHeight;
    const d = this.baseD / this.cameraZoom;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 200);
    this.camera.position.set(20, 20, 20);
    this.camera.lookAt(0, 0, 0);

    // Lighting
    this.ambient = new THREE.AmbientLight(0x8888aa, 0.6);
    this.scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xfff5e6, 1.2);
    this.sun.position.set(10, 30, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(512, 512);
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 80;
    this.sun.shadow.camera.left = -30;
    this.sun.shadow.camera.right = 30;
    this.sun.shadow.camera.top = 30;
    this.sun.shadow.camera.bottom = -30;
    this.scene.add(this.sun);

    // Torch lights (added per floor)
    this.torches = [];

    // Floor plane (dark ground)
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 0.9 });
    this.floorPlane = new THREE.Mesh(floorGeo, floorMat);
    this.floorPlane.rotation.x = -Math.PI / 2;
    this.floorPlane.position.y = -0.51;
    this.floorPlane.receiveShadow = true;
    this.scene.add(this.floorPlane);

    // Systems
    this.particles = new ParticleSystem(this.scene);
    this.flipbooks = new FlipbookVFX(this.scene);
    this.world = new World(this.scene);
    this.player = new Player(this.scene);
    this.player.world = this.world;
    this.ui = new UIManager(this);
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

    // Touch controls for iPad/tablet
    this.touchControls = new TouchControls();

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
    // Preload loot models
    await this.loot.preloadModels();
    // Preload alphabet glyphs for letter drops
    await glyph3D.load();
    await this.letterDrops.preload();

    this._initAudioOnInteraction();
    await this.player.spawn();
    await this.player.equipWeapon(1); // Sync functional weapon with sword visual

    if (this.playtestKey) {
      await this._loadPlaytestLevel();
    } else {
      await this._generateFloor(1);
    }

    this.ui.hideLoading();
    this.state = STATES.PLAYING;
    this.renderer.setAnimationLoop(() => this._loop());
  }

  async _generateFloor(floorNum) {
    this._clearExitPortal();
    this.world.setFloor(floorNum);
    await this.world.generateFloor();
    if (this.world.startPosition) {
      this.player.position.copy(this.world.startPosition);
    } else {
      this.player.position.set(0, 0, 0);
    }
    this.player.hp = this.player.maxHp;
    this.exitOpen = false;
    this.floorTimer = Math.max(15, GAME.COUNTDOWN_BASE + (floorNum - 1) * GAME.COUNTDOWN_PER_FLOOR);
    this.killCount = 0;
    this.loot.clear();
    this.letterDrops.clear();
    this._clearPet();
    // Advance letter pool for new floor
    if (floorNum === 1) this.letterPool.reset();
    else this.letterPool.advanceLevel();
    const letters = this.letterPool.getCurrentLetters().join(' ');
    this.ui.setFloorText(`FLOOR ${floorNum} — ${this.world.biome.name.toUpperCase()} — Letters: ${letters}`);
    this.ui.showExitOpen(false);
    this._spawnPet();
    this._updateTorches();
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

    const size = GAME.FLOOR_SIZE;
    // Place torch lights at corners
    const corners = [
      [size, size], [size, -size], [-size, size], [-size, -size],
      [size, 0], [-size, 0], [0, size], [0, -size],
    ];
    for (const [tx, tz] of corners) {
      const light = new THREE.PointLight(0xffaa44, 0.8, 20);
      light.position.set(tx, 4, tz);
      this.scene.add(light);
      this.torches.push(light);
    }
  }

  _initAudioOnInteraction() {
    if (this._audioInitialized) return;
    const init = () => {
      if (this._audioInitialized) return;
      this._audioInitialized = true;
      audio.init();
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
      await this._generateFloor(this.world.floor + 1);
    }
  }

  _loop() {
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.state === STATES.PLAYING) {
      if (input.pressed('KeyI')) {
        this.ui.toggleLoadout();
      } else if (this.ui.loadoutOpen && input.pressed('Escape')) {
        this.ui.hideLoadout();
      }

      if (input.pressed('KeyP')) {
        this.ui.togglePetDen();
      } else if (this.ui.petDenOpen && input.pressed('Escape')) {
        this.ui.hidePetDenOverlay();
      }

      if (!this.ui.loadoutOpen && !this.ui.petDenOpen) {
        this._updatePlaying(dt);
      }
    }

    if (this.state === STATES.SPELLING) {
      if (input.pressed('Escape')) {
        this._onSpellingClose();
      }
      // Camera still follows player but no gameplay updates
      const offset = 20 / this.cameraZoom;
      this.camera.position.set(
        this.player.position.x + offset,
        this.player.position.y + offset,
        this.player.position.z + offset
      );
      this.camera.lookAt(this.player.position.x, this.player.position.y, this.player.position.z);
      // Bob the 3D glyph mesh if present
      if (this.spellingGlyphMesh) {
        this.spellingGlyphMesh.position.y = 1.5 + Math.sin(Date.now() * 0.003) * 0.15;
        this.spellingGlyphMesh.rotation.y += dt * 1.5;
      }
    }

    this.particles.update(dt);
    this.flipbooks.update(dt, this.camera);
    this.ui.update(dt);
    this.renderer.render(this.scene, this.camera);
    input.update();
  }

  _updatePlaying(dt) {
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
    this.camera.position.set(
      this.player.position.x + offset + shakeX,
      this.player.position.y + offset + shakeY,
      this.player.position.z + offset + shakeZ
    );
    this.camera.lookAt(this.player.position.x, this.player.position.y, this.player.position.z);

    // Player update
    this.player.update(dt, input);

    // Update weapon cooldowns
    for (const w of this.player.weapons) w.update(dt);

    // Contextual J button — mine block or attack enemy
    if (input.pressed('KeyJ') && this.player.weapons[this.player.currentSlot].cooldown <= 0) {
      const weapon = this.player.weapons[this.player.currentSlot];

      // Check for nearby enemy first (combat priority)
      const nearestEnemy = this._findNearestEnemy(2.5);
      if (nearestEnemy) {
        this.player.playAttackAnim();
        nearestEnemy.takeDamage(weapon.data.damage);
        // Attack VFX
        const hitPos = nearestEnemy.position.clone().add(new THREE.Vector3(0, 0.5, 0));
        this.particles.spawn({ pos: hitPos, count: 6, color: 0xff4444, speed: 4, life: 0.3, size: 0.2, texture: 'slash' });
        this.particles.spark(hitPos, 4);
        this.flipbooks.spawn({ pos: hitPos, ...FLIPBOOK_EFFECTS.impact });
        SFXMapper.meleeSwing('sword');
        SFXMapper.meleeHit();
        weapon.cooldown = GAME.ATTACK_COOLDOWN;
      } else {
        // Mine nearest block
        const nearestBlock = this._findMineableBlock(GAME.MINE_RANGE);
        if (nearestBlock && !nearestBlock.destroyed) {
          // Use the same weapon attack animation for mining
          this.player.playAttackAnim();
          SFXMapper.mineSwing();
          // Mine VFX
          const blockPos = nearestBlock.position.clone();
          blockPos.y += 0.3;
          this.particles.dust(blockPos, 5);
          this.particles.spark(blockPos, 3);
          const destroyed = nearestBlock.takeDamage(this.player.mineDamage);
          if (destroyed) {
            // Combo tracking
            if (this.mineComboTimer > 0) {
              this.mineCombo++;
            } else {
              this.mineCombo = 1;
            }
            this.mineComboTimer = 2.0;
            this.blocksMined++;

            // Block break VFX + screen shake (stronger for floating blocks)
            const isFloat = nearestBlock.isFloating;
            this.particles.dust(blockPos, isFloat ? 10 : 8);
            this.particles.spark(blockPos, isFloat ? 8 : 6);
            this._screenShake(isFloat ? 0.8 : 0.5, 0.25);
            const drop = this.world.mineBlock(nearestBlock, this.particles, audio);

            // enemyLoot: spawn loot on enemy death from block table
            const table = BLOCK_LOOT_TABLES[nearestBlock.typeKey];
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
        weapon.cooldown = GAME.ATTACK_COOLDOWN;
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
    this.player.updateProjectiles(dt, this.scene, this.particles, this.world.enemies);

    // World update (enemies + blocks)
    this.world.update(dt, this.player.position, this.particles, audio, this.player);

    // Loot update (hoover, magnet, collect)
    this.loot.update(dt, this.player.position, (type, value, color) => {
      this._onLootCollect(type, value, color);
    });

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

    // Check if all enemies dead AND all letters spelled → open exit
    if (!this.exitOpen && this.world.enemies.length > 0) {
      const allDead = this.world.enemies.every(e => e.dead);
      const allLettersSpelled = this.letterPool.allSpelledForLevel();
      if (allDead && allLettersSpelled) {
        this.exitOpen = true;
        this.ui.showExitOpen(true);
        SFXMapper.floorComplete();
        this._spawnExitPortal();
      }
    }

    // Check exit
    if (this.exitOpen && this.world.exitPosition) {
      if (this.player.position.distanceTo(this.world.exitPosition) < 1.5) {
        if (this.world.floor >= 20) {
          this.state = STATES.CAMP;
          this.ui.showCamp();
          this.world.clear();
          this.world.floor = 0;
          SFXMapper.campEnter();
          return;
        }
        this._generateFloor(this.world.floor + 1);
      }
    }

    // Check death
    if (this.player.hp <= 0) {
      SFXMapper.playerDeath();
      this.state = STATES.CAMP;
      this.ui.showCamp(true);
      this.world.clear();
      this.world.floor = 0;
      return;
    }

    // Update UI
    this.ui.updateStats();

    // FPS counter
    this.frameCount = (this.frameCount || 0) + 1;
    const now = performance.now();
    if (now - (this.lastFpsTime || 0) >= 1000) {
      this.ui.setFPS(this.frameCount);
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
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

  _findMineableBlock(range) {
    let nearest = null;
    let nearestDist = range;
    const playerPos = this.player.position;
    const forward = new THREE.Vector3(Math.sin(this.player.rotation), 0, Math.cos(this.player.rotation));

    const weaponId = this.player.weapons[this.player.currentSlot]?.data?.id || 'unknown';
    const isPickaxe = weaponId === 'pickaxe';

    for (const block of this.world.blocks.values()) {
      if (block.destroyed) continue;

      // Ground blocks are only mineable with the pickaxe
      const blockIsFloating = block.isFloating === true;
      if (!blockIsFloating && !isPickaxe) {
        console.log(`[MineGuard] ${weaponId} → skipping ground block at ${block.position.x},${block.position.y},${block.position.z}`);
        continue;
      }

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
      console.log(`[MineGuard] ${weaponId} → targeting ${nearest.isFloating ? 'floating' : 'ground'} block at ${nearest.position.x},${nearest.position.y},${nearest.position.z}`);
    }
    return nearest;
  }

  _findNearestBlock(range) {
    // Deprecated: kept for compatibility, delegates to _findMineableBlock
    return this._findMineableBlock(range);
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

  _updateCameraZoom() {
    const aspect = window.innerWidth / window.innerHeight;
    const d = this.baseD / this.cameraZoom;
    this.camera.left = -d * aspect;
    this.camera.right = d * aspect;
    this.camera.top = d;
    this.camera.bottom = -d;
    this.camera.updateProjectionMatrix();
  }

  _screenShake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
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
        // Pet capture
        const result = this.petManager.recordCapture(letter);
        if (result.unlocked) {
          this.ui.showFloatingText(`Pet ${letter} unlocked!`, 0xfacc15);
        }
        if (result.levelUp && this.pet && this.pet.letter === letter) {
          this.pet.setLevel(result.newLevel);
          this.pet.playLevelUp();
          this.ui.showFloatingText(`Pet ${letter} ➜ Lv${result.newLevel}!`, 0x4ade80);
          // Level 7 triggers rainbow effect automatically via PetLetter.update()
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
  }

  _onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const d = this.baseD / this.cameraZoom;
    this.camera.left = -d * aspect;
    this.camera.right = d * aspect;
    this.camera.top = d;
    this.camera.bottom = -d;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
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
