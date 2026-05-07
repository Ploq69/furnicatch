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
import { LootDrop, LOOT_CONFIG } from './LootDrop.js';
import { GAME, BIOMES, BLOCK_LOOT_TABLES, ENEMY_LOOT_TABLES } from './constants.js';

const STATES = {
  LOADING: 'loading',
  PLAYING: 'playing',
  CAMP: 'camp',
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
    this.cameraZoom = 1.0;
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
    this.ui = new UIManager(this);
    this.ui.onBrightnessChange = (val) => {
      this.renderer.toneMappingExposure = 1.5 * val;
    };
    this.ui.onCameraZoomChange = (val) => {
      this.cameraZoom = val;
      this._updateCameraZoom();
    };

    // Timer — countdown
    this.floorTimer = GAME.COUNTDOWN_BASE;
    this.totalTime = 0;
    this.killCount = 0;
    this.level = 1;
    this.exitOpen = false;

    // Loot
    this.loot = new LootDrop(this.scene);

    // Screen shake
    this.shakeIntensity = 0;
    this.shakeDuration = 0;

    // Resize
    window.addEventListener('resize', () => this._onResize());

    // Start loading
    this._loadAssets();
  }

  async _loadAssets() {
    const priority = [
      'Cube World - Aug 2023/Blocks/glTF/Block_Dirt.gltf',
      'Cube World - Aug 2023/Blocks/glTF/Block_Stone.gltf',
      'Cube World - Aug 2023/Blocks/glTF/Block_Grass.gltf',
      'Cube World - Aug 2023/Blocks/glTF/Block_Coal.gltf',
      'Cube World - Aug 2023/Blocks/glTF/Block_Metal.gltf',
      'Cube World - Aug 2023/Blocks/glTF/Block_Crystal.gltf',
      'Cube World - Aug 2023/Enemies/glTF/Goblin.gltf',
      'Cube World - Aug 2023/Enemies/glTF/Skeleton.gltf',
      'Cube World - Aug 2023/Enemies/glTF/Demon.gltf',
      'Cube World - Aug 2023/Characters/glTF/Character_Male_1.gltf',
      // Weapons
      'Cube World - Aug 2023/Tools/glTF/Pickaxe_Wood.gltf',
      'Cube World - Aug 2023/Tools/glTF/Sword_Diamond.gltf',
      'Pirate Kit - Nov 2023/glTF/Weapon_Pistol.gltf',
      'Toon Shooter Game Kit - Dec 2022/Guns/glTF/Grenade.gltf',
    ];

    assetLoader.onProgress = (loaded, total) => {
      this.ui.setLoadingProgress(loaded, total);
    };

    await assetLoader.preloadBatch(priority);

    // Preload VFX textures
    await this.particles.preloadTextures();
    // Preload loot models
    await this.loot.preloadModels();

    this._initAudioOnInteraction();
    await this.player.spawn();
    await this._generateFloor(1);

    this.ui.hideLoading();
    this.state = STATES.PLAYING;
    this.renderer.setAnimationLoop(() => this._loop());
  }

  async _generateFloor(floorNum) {
    this.world.setFloor(floorNum);
    await this.world.generateFloor();
    this.player.position.set(0, 0, 0);
    this.player.hp = this.player.maxHp;
    this.exitOpen = false;
    this.floorTimer = Math.max(15, GAME.COUNTDOWN_BASE + (floorNum - 1) * GAME.COUNTDOWN_PER_FLOOR);
    this.killCount = 0;
    this.loot.clear();
    this.ui.setFloorText(`FLOOR ${floorNum} — ${this.world.biome.name.toUpperCase()}`);
    this.ui.showExitOpen(false);
    this._updateTorches();
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
      this._updatePlaying(dt);
    }

    this.particles.update(dt);
    this.flipbooks.update(dt, this.camera);
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
        this.player.playAttackAnim('sword');
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
        const nearestBlock = this._findNearestBlock(GAME.MINE_RANGE);
        if (nearestBlock && !nearestBlock.destroyed) {
          this.player.playAttackAnim('pickaxe');
          SFXMapper.mineSwing();
          // Mine VFX
          const blockPos = nearestBlock.position.clone();
          blockPos.y += 0.3;
          this.particles.dust(blockPos, 5);
          this.particles.spark(blockPos, 3);
          const destroyed = nearestBlock.takeDamage(this.player.mineDamage);
          if (destroyed) {
            // Block break VFX + screen shake
            this.particles.dust(blockPos, 8);
            this.particles.spark(blockPos, 6);
            this._screenShake(0.5, 0.25);
            const drop = this.world.mineBlock(nearestBlock, this.particles, audio);
            // enemyLoot: spawn loot on enemy death from block table
            const table = BLOCK_LOOT_TABLES[nearestBlock.typeKey];
            if (table) {
              this.loot.spawnFromTable(blockPos, table);
            }
            // timeBonus for mining
            this.floorTimer += GAME.TIME_BONUS_MINING;
            SFXMapper.collectOre();
          }
          weapon.cooldown = GAME.ATTACK_COOLDOWN;
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
    this.player.updateProjectiles(dt, this.scene, this.particles, this.world.enemies);

    // World update (enemies + blocks)
    this.world.update(dt, this.player.position, this.particles, audio, this.player);

    // Loot update (hoover, magnet, collect)
    this.loot.update(dt, this.player.position, (type, value, color) => {
      this._onLootCollect(type, value, color);
    });

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

    // Check if all enemies dead → open exit
    if (!this.exitOpen && this.world.enemies.length > 0) {
      const allDead = this.world.enemies.every(e => e.dead);
      if (allDead) {
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

  _findNearestBlock(range) {
    let nearest = null;
    let nearestDist = range;
    for (const block of this.world.blocks.values()) {
      if (block.destroyed) continue;
      const dist = this.player.position.distanceTo(block.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = block;
      }
    }
    return nearest;
  }

  _spawnExitPortal() {
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

  _onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const d = this.baseD / this.cameraZoom;
    this.camera.left = -d * aspect;
    this.camera.right = d * aspect;
    this.camera.top = d;
    this.camera.bottom = -d;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
