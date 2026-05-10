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
import { SaveStore } from './SaveStore.js';
import { DiscoveryQueue } from './DiscoveryQueue.js';
import { ThaiAssetLoader } from './ThaiAssetLoader.js';
import { PetSystem, blocksNear } from './PetSystem.js';
import { GAME_CONFIG, UPGRADE_DEFS, upgradeCost } from './config.js';
import { THAI_BY_ID, THAI_ITEMS, getUnlockedItems } from './thaiManifest.js';

const STATES = {
  LOADING: 'loading',
  PLAYING: 'playing',
  CAMP: 'camp',
  QUIZ: 'quiz',
  SURVEY: 'survey',
};

function isDescendantOf(node, parent) {
  let cursor = node;
  while (cursor) {
    if (cursor === parent) return true;
    cursor = cursor.parent;
  }
  return false;
}

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

    // Thai incremental systems
    this.save = new SaveStore(GAME_CONFIG.storageKey);
    this.thaiAssets = new ThaiAssetLoader();
    this.discoveryQueue = new DiscoveryQueue(this.save);
    this.petSystem = new PetSystem(this.scene, this.save, this.thaiAssets);
    this.stage = this._currentStage();
    this.gameSeconds = 0;
    this.pendingStateAfterQuiz = STATES.PLAYING;
    this.lastDiscoveryModel = null;

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
    await this.thaiAssets.preload(THAI_ITEMS);

    this._initAudioOnInteraction();
    await this.player.spawn();
    this.player.coins = this.save.data.trash;
    this.player.mineDamage = 1 + this.save.upgradeLevel('pick_head');
    await this._generateFloor(1);
    this.petSystem.refresh();
    this._installTestHooks();

    this.ui.hideLoading();
    this.state = STATES.PLAYING;
    this.renderer.setAnimationLoop(() => this._loop());
  }

  async _generateFloor(floorNum) {
    this.stage = this._currentStage();
    this.world.setFloor(Math.max(1, floorNum));
    await this.world.generateFloor();
    this._removeEnemiesForMiningRun();
    this.player.position.set(0, 0, 0);
    this.player.hp = this.player.maxHp;
    this.exitOpen = false;
    this.floorTimer = 0;
    this.killCount = 0;
    this.loot.clear();
    this.ui.setFloorText(`RUN ${this.save.data.runsCompleted + 1} — ${this.stage.name.toUpperCase()}`);
    this.ui.showExitOpen(false);
    this._updateTorches();
    this.petSystem.refresh();
    this.ui.updateThaiStats();
  }

  _removeEnemiesForMiningRun() {
    for (const enemy of this.world.enemies) enemy.cleanup(this.scene);
    this.world.enemies = [];
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
    this.player.hp = this.player.maxHp;
    this.player.position.set(0, 0, 0);
    this.killCount = 0;
    this.totalTime = 0;
    await this._generateFloor(this.save.data.runsCompleted + 1);
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
    // Timer — count-up for run pacing. Death timer pressure is removed for the mining spinoff.
    this.floorTimer += dt;
    this.totalTime += dt;
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
    this.gameSeconds += dt;

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
          this._mineTargetsFrom(nearestBlock);
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
    this.petSystem.update(dt, this.player.position, this.world, (block, source) => this._breakMinedBlock(block, source));

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

    if (this.discoveryQueue.shouldForceQuiz(this.gameSeconds)) {
      const bundle = this.discoveryQueue.buildForcedBundle(this.gameSeconds, THAI_BY_ID);
      if (bundle) this.startBundleQuiz(bundle, STATES.PLAYING);
    }

    this._checkRunComplete();

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

  _mineTargetsFrom(primaryBlock) {
    const twin = this.save.upgradeLevel('twin_strike');
    const targets = [primaryBlock];
    if (twin > 0) {
      const extras = blocksNear(this.world, primaryBlock.position, 1.8, twin).filter((block) => block !== primaryBlock);
      targets.push(...extras);
    }
    const damage = this.player.mineDamage + this.save.upgradeLevel('pick_head');
    for (const block of targets) {
      if (block.destroyed) continue;
      const blockPos = block.position.clone();
      blockPos.y += 0.3;
      const destroyed = block.takeDamage(damage);
      if (destroyed) this._breakMinedBlock(block, 'player');
      this._chainCrack(block);
      this._quarryBurst(block);
    }
  }

  _breakMinedBlock(block, source = 'player') {
    if (!block || block.destroyed) return;
    const blockPos = block.position.clone();
    blockPos.y += 0.3;
    this.particles.dust(blockPos, 8);
    this.particles.spark(blockPos, 6);
    this.flipbooks.spawn({ pos: blockPos, ...FLIPBOOK_EFFECTS.impact });
    this._screenShake(source === 'quarryBurst' ? 0.75 : 0.5, 0.25);
    this.world.mineBlock(block, this.particles, audio);
    const table = BLOCK_LOOT_TABLES[block.typeKey];
    if (table) this.loot.spawnFromTable(blockPos, table);
    this.save.data.blocksBroken += 1;
    this.save.save();
    this._rollDiscovery(blockPos);
    SFXMapper.collectOre();
    this.ui.updateThaiStats();
    this._checkRunComplete();
  }

  _chainCrack(origin) {
    const level = this.save.upgradeLevel('chain_crack');
    if (!level || Math.random() > level * 0.08) return;
    for (const block of blocksNear(this.world, origin.position, 1.6, level)) {
      if (block.destroyed) continue;
      if (block.takeDamage(1)) this._breakMinedBlock(block, 'chainCrack');
    }
  }

  _quarryBurst(origin) {
    const level = this.save.upgradeLevel('quarry_burst');
    if (!level || Math.random() > level * 0.035) return;
    for (const block of blocksNear(this.world, origin.position, 2.2, 2 + level)) {
      if (block.destroyed) continue;
      if (block.takeDamage(999)) this._breakMinedBlock(block, 'quarryBurst');
    }
    this.ui.showFloatingText('QUARRY BURST!', 0xfbbf24);
  }

  _rollDiscovery(pos) {
    const chance = GAME_CONFIG.discovery.baseChance + this.stage.discoveryBonus + this.save.upgradeLevel('lucky_soil') * 0.012;
    if (Math.random() > chance) return;
    const pool = this._discoveryPool();
    if (!pool.length) return;
    const item = pool[Math.floor(Math.random() * pool.length)];
    this.discoveryQueue.enqueue(item);
    this._showDiscoveryModel(item, pos);
    this.ui.showFloatingText(`Found ${item.glyph}`, 0xfacc15);
  }

  _discoveryPool() {
    const pool = getUnlockedItems(this.stage.unlockTier);
    if (!this.save.upgradeLevel('focused_survey')) return pool;
    const uncaptured = pool.filter((item) => this.save.getRecord(item.id).captures === 0);
    return uncaptured.length ? [...uncaptured, ...pool.slice(0, Math.ceil(pool.length / 3))] : pool;
  }

  _showDiscoveryModel(item, pos) {
    const model = this.thaiAssets.cloneItem(item.id);
    model.userData.thaiModelRole = 'discovery';
    model.position.copy(pos);
    model.position.y += 0.9;
    model.scale.multiplyScalar(0.75);
    this.scene.add(model);
    this.lastDiscoveryModel = model;
    const start = performance.now();
    const animate = () => {
      if (!model.parent) return;
      const age = (performance.now() - start) / 1000;
      model.rotation.y += 0.05;
      model.position.y = pos.y + 0.9 + Math.sin(age * 5) * 0.2;
      if (age > 2.0) {
        this.scene.remove(model);
        return;
      }
      requestAnimationFrame(animate);
    };
    animate();
  }

  _checkRunComplete() {
    if (this.world.blocks.size > 0 || this.state !== STATES.PLAYING) return;
    this.save.completeRun();
    this.save.save();
    this.player.coins = this.save.data.trash;
    SFXMapper.floorComplete();
    const bundles = this.discoveryQueue.buildSurveyReport(THAI_BY_ID);
    this.state = STATES.SURVEY;
    this.ui.showSurvey(bundles);
  }

  startBundleQuiz(bundle, returnState = this.state) {
    this.pendingStateAfterQuiz = returnState;
    this.state = STATES.QUIZ;
    this.ui.showQuiz(bundle, (answeredBundle, correct) => this._resolveBundle(answeredBundle, correct));
  }

  _resolveBundle(bundle, correct) {
    const item = THAI_BY_ID[bundle.targetId];
    if (!item) throw new Error(`Unknown Thai quiz target: ${bundle.targetId}`);
    if (correct) {
      const sortedBonus = this.save.upgradeLevel('sorted_finds');
      const reward = bundle.rewardCount + Math.floor(sortedBonus * bundle.rewardCount * 0.12);
      this.save.recordCapture(item, reward);
      this.ui.showFloatingText(`Captured ${item.glyph} x${reward}`, 0x4ade80);
      this.petSystem.refresh();
    } else {
      const keep = Math.floor(bundle.rewardCount * GAME_CONFIG.discovery.wrongBundleKeepRatio);
      this.save.recordMiss(item, bundle.rewardCount);
      if (keep > 0 && this.save.upgradeLevel('recall_bell') > 0) {
        this.save.addStudyChest({ title: 'Recall Echo', category: item.category, itemIds: [item.id], rewardCount: keep });
      }
      this.ui.showFloatingText(`${item.glyph} escaped`, 0xf87171);
    }
    this.ui.updateThaiStats();
    this.state = this.pendingStateAfterQuiz || STATES.PLAYING;
  }

  buyThaiUpgrade(def) {
    const level = this.save.upgradeLevel(def.id);
    if (level >= def.max) return false;
    const cost = upgradeCost(def, level);
    if (!this.save.spendTrash(cost)) {
      SFXMapper.uiDenied();
      return false;
    }
    this.player.coins = this.save.data.trash;
    this.save.setUpgradeLevel(def.id, level + 1);
    this.player.mineDamage = 1 + this.save.upgradeLevel('pick_head');
    this.petSystem.refresh();
    SFXMapper.upgradeBuy();
    this.ui.updateStats();
    return true;
  }

  openStudyChest(chest) {
    const targetId = chest.itemIds[Math.floor(Math.random() * chest.itemIds.length)];
    this.save.removeStudyChest(chest.id);
    this.startBundleQuiz({
      kind: 'study_chest',
      title: chest.title,
      targetId,
      itemIds: chest.itemIds,
      category: chest.category,
      rewardCount: chest.rewardCount,
    }, STATES.CAMP);
  }

  tonePrestige() {
    if (!this.save.tonePrestige()) {
      SFXMapper.uiDenied();
      return;
    }
    this.player.coins = this.save.data.trash;
    this.petSystem.refresh();
    this.ui.showFloatingText('TONE PRESTIGE', 0xfbbf24);
    this.ui.showCamp();
  }

  _currentStage() {
    const run = this.save.data.runsCompleted + 1;
    return [...GAME_CONFIG.pacing.stages].reverse().find((stage) => run >= stage.minRun) || GAME_CONFIG.pacing.stages[0];
  }

  _installTestHooks() {
    window.__TLM_TEST_HOOKS__ = {
      getSceneAudit: () => {
        let thaiModels = 0;
        let thaiPets = 0;
        let playerMeshes = 0;
        this.scene.traverse((node) => {
          if (node.userData?.thaiModelId) thaiModels += 1;
          if (node.userData?.entityType === 'thaiLetterPet') thaiPets += 1;
          if (this.player.mesh && node.isMesh && isDescendantOf(node, this.player.mesh)) playerMeshes += 1;
        });
        return {
          state: this.state,
          blocks: this.world.blocks.size,
          lootDrops: this.loot.drops.length,
          thaiModels,
          thaiPets,
          playerMeshes,
          hasVoidloopPlayer: !!this.player.mesh && playerMeshes > 0,
          hasParticleSystem: !!this.particles,
          hasFlipbookVFX: !!this.flipbooks,
          hasLootDrop: !!this.loot,
        };
      },
      forceThaiDiscovery: (itemId) => {
        const item = THAI_BY_ID[itemId];
        if (!item) throw new Error(`Unknown Thai item ${itemId}`);
        this.discoveryQueue.enqueue(item);
        this._showDiscoveryModel(item, this.player.position.clone());
        return this.discoveryQueue.size();
      },
      forceQuiz: (itemId) => {
        const item = THAI_BY_ID[itemId];
        if (!item) throw new Error(`Unknown Thai item ${itemId}`);
        this.startBundleQuiz({ kind: 'test', title: item.thaiName, targetId: item.id, itemIds: [item.id], category: item.category, rewardCount: 1 }, this.state);
      },
      forceCapture: (itemId) => {
        const item = THAI_BY_ID[itemId];
        if (!item) throw new Error(`Unknown Thai item ${itemId}`);
        this.save.recordCapture(item, 1);
        this.petSystem.refresh();
        return this.petSystem.pets.length;
      },
      forceRunComplete: () => {
        for (const block of [...this.world.blocks.values()]) this._breakMinedBlock(block, 'test');
        this._checkRunComplete();
      },
      getQuizAudit: () => ({
        active: this.state === STATES.QUIZ,
        choices: [...document.querySelectorAll('.thai-quiz-choice')].map((el) => ({
          id: el.dataset.choiceId,
          has3dPreview: !!el.querySelector('canvas[data-thai-model-preview]'),
        })),
      }),
      getModelAudit: (itemId) => {
        const item = THAI_BY_ID[itemId];
        if (!item) throw new Error(`Unknown Thai item ${itemId}`);
        const model = this.thaiAssets.cloneItem(item.id);
        const box = new THREE.Box3().setFromObject(model);
        let meshCount = 0;
        let vertexCount = 0;
        model.traverse((node) => {
          if (!node.isMesh) return;
          meshCount += 1;
          vertexCount += node.geometry?.attributes?.position?.count || 0;
        });
        return {
          itemId,
          source: `assets/thai/glb/${item.id}.glb`,
          meshCount,
          vertexCount,
          bounds: box.getSize(new THREE.Vector3()).toArray(),
        };
      },
    };
    const params = new URLSearchParams(location.search);
    if (params.get('auditQuiz')) {
      setTimeout(() => window.__TLM_TEST_HOOKS__.forceQuiz(params.get('auditQuiz')), 600);
    }
    if (params.get('auditPet')) {
      setTimeout(() => window.__TLM_TEST_HOOKS__.forceCapture(params.get('auditPet')), 600);
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
        this.save.data.trash = this.player.coins;
        this.save.save();
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
