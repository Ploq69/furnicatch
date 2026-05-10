import * as THREE from 'three';
import { assetLoader } from './AssetLoader.js';
import { input } from './InputManager.js';
import { Player } from './Player.js';
import { World } from './World.js';
import { Orb } from './Orb.js';
import { ParticleSystem } from './ParticleSystem.js';
import { UIManager } from './UIManager.js';
import { CharPreview } from './CharPreview.js';
import { GAME, FURNITURE_TIERS, FURNITURE_LEVELS, LETTER_WORDS, QUIZ_MODES, VOCABULARY, PROP_VOCABULARY, ULTIMATE_CHARACTERS, CATCHABLE_CATALOG, CATCHABLE_WORDS, ESL_BIOMES } from './constants.js';
import { audio } from './AudioManager.js';
import { AimController } from './AimController.js';
import { ImpactController } from './ImpactController.js';
import { CollectionStore } from './CollectionStore.js';
import { tts } from './TTSManager.js';
import { TypingGlyphView } from './TypingGlyphView.js';
import { FloatingGlyphSystem } from './FloatingGlyphSystem.js';

const STATES = {
  LOADING: 'loading',
  CHAR_SELECT: 'char_select',
  PLAYING: 'playing',
  VOCAB_CHALLENGE: 'vocab_challenge',
  BASE: 'base',
};

export class Game {
  constructor(container) {
    this.container = container;
    this.state = STATES.LOADING;
    this.clock = new THREE.Clock();
    
    // Three.js setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 28, 52);
    
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 60);
    this.cameraYaw = 0;
    this.cameraPitch = 0.25;
    
    // Camera settings
    this.cameraSettings = {
      distance: GAME.CAM_DISTANCE,
      height: GAME.CAM_HEIGHT,
      lookAtHeight: GAME.CAM_LOOK_AT_HEIGHT,
      fov: 60,
      sensitivity: 1.0,
    };
    this.settingsMenuOpen = false;
    
    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);
    
    this.sun = new THREE.DirectionalLight(0xfff5e6, 1.2);
    this.sun.position.set(10, 20, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.width = 512;
    this.sun.shadow.mapSize.height = 512;
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 35;
    this.sun.shadow.camera.left = -20;
    this.sun.shadow.camera.right = 20;
    this.sun.shadow.camera.top = 20;
    this.sun.shadow.camera.bottom = -20;
    this.scene.add(this.sun);
    
    const fill = new THREE.DirectionalLight(0xc7d2fe, 0.4);
    fill.position.set(-10, 10, -10);
    this.scene.add(fill);
    
    // Void cover plane (far below terrain to hide gaps)
    const voidGeo = new THREE.PlaneGeometry(300, 300);
    const voidMat = new THREE.MeshStandardMaterial({ color: 0x1a2e1a });
    const voidPlane = new THREE.Mesh(voidGeo, voidMat);
    voidPlane.rotation.x = -Math.PI / 2;
    voidPlane.position.y = -12;
    voidPlane.receiveShadow = true;
    this.scene.add(voidPlane);
    
    // Game objects
    this.player = null;
    this.collectionStore = new CollectionStore();
    this.world = new World(this.scene, {
      getFurnitureLevel: (word) => this.collectionStore.getLevel(word),
      getLetterLevel: (letter) => this.collectionStore.getLetterLevel(letter),
      getPropLevel: (key) => this.collectionStore.getPropLevel(key),
    });
    this.particles = new ParticleSystem(this.scene);
    this.ui = new UIManager();
    this.charPreview = new CharPreview(this.scene);
    this.impact = new ImpactController(this.camera);
    this.aim = new AimController(this.scene, this.camera);
    this.typingGlyphView = new TypingGlyphView();
    this.floatingGlyphs = new FloatingGlyphSystem(this.scene, this.camera);
    
    this.orbs = [];
    this.coins = 0;
    this.capturedCount = 0;
    this.streak = 1;
    this.incomePerSec = 0;
    
    // Upgrades
    this.upgrades = {
      satchelLevel: 0,
      bootsLevel: 0,
      orbTierLevel: 0,
    };
    this.upgradeCosts = {
      satchel: 100,
      boots: 250,
      orb: 500,
    };
    
    // Vocab challenge state
    this.currentVocab = null;
    this.currentFurniture = null;
    this.currentChallengeType = 'furniture';
    this.currentLetter = null;
    this.speakerOptions = [];
    this.currentChoiceOptions = [];
    this.correctSpeakerWord = null;
    this.selectedSpeakerWord = null;
    this.letterChallengePhase = 'speakers';
    this.typedWord = '';
    this.challengeCompleting = false;
    this.challengeCameraSide = 1;
    this.biomeKeys = ['farm_garden', 'food_market', 'space_camp'];
    this.currentBiomeIndex = 0;
    this.selectedBiomeKey = this.biomeKeys[this.currentBiomeIndex];
    
    // Hint state
    this.hintsUsed = 0;
    this.hintedIndices = [];
    
    // Passive income accumulator
    this.incomeAccumulator = 0;
    
    // World bounds
    this.worldBounds = this.world.getWorldBounds();
    
    // Selected character
    this.selectedCharPath = null;
    
    // Resize handler
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
    
    // Input
    input.attach();
    this.ui.bindTyping((key) => this._onTypeKey(key));
    this.ui.bindSpeakerPlay((index) => this._onSpeakerPlay(index));
    this.ui.bindSpeakerChoice((index) => this._onSpeakerChoice(index));
    this.ui.bindExpedition(() => this._goOnExpedition());
    this.ui.bindBaseClick('satchel', () => this._buyUpgrade('satchel'));
    this.ui.bindBaseClick('boots', () => this._buyUpgrade('boots'));
    this.ui.bindBaseClick('orb', () => this._buyUpgrade('orb'));
    this.ui.bindHint(() => this._useHint());
    this.ui.bindBiomeSelect((biomeKey) => this._selectBiome(biomeKey));
  }

  async init() {
    this.ui.showLoading('Loading assets...');
    await assetLoader.loadOBJ('Ultimate House Interior Pack - June 2020/OBJ/Chair_1.obj');
    await assetLoader.loadGLTF('Cube World - Aug 2023/Blocks/glTF/Block_Grass.gltf');
    this.ui.hideLoading();

    // Start render loop early so preview works
    this.renderer.setAnimationLoop(() => this._loop());

    // Show character select
    await this._showCharSelect();
    this._setupSettingsMenu();
  }

  _setupSettingsMenu() {
    // Create settings button
    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'settings-btn';
    settingsBtn.textContent = '⚙️';
    settingsBtn.style.cssText = 'position:fixed; top:12px; right:12px; z-index:50; width:36px; height:36px; border-radius:50%; border:1px solid rgba(255,255,255,0.2); background:rgba(0,0,0,0.4); color:#fff; font-size:16px; cursor:pointer; display:none;';
    settingsBtn.addEventListener('click', () => this._toggleSettingsMenu());
    document.body.appendChild(settingsBtn);

    // Create settings menu
    const menu = document.createElement('div');
    menu.id = 'settings-menu';
    menu.style.cssText = 'position:fixed; top:56px; right:12px; z-index:50; width:260px; background:rgba(15,23,42,0.92); border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:16px; display:none; backdrop-filter:blur(8px);';
    menu.innerHTML = `
      <div style="font-size:14px; font-weight:700; margin-bottom:12px; color:#a5b4fc;">Camera Settings</div>
      <div style="margin-bottom:10px;">
        <label style="font-size:11px; opacity:0.7; display:block; margin-bottom:4px;">Distance: <span id="cam-dist-val">10</span></label>
        <input type="range" id="cam-dist" min="4" max="24" step="0.5" value="10" style="width:100%;">
      </div>
      <div style="margin-bottom:10px;">
        <label style="font-size:11px; opacity:0.7; display:block; margin-bottom:4px;">Height: <span id="cam-height-val">3.5</span></label>
        <input type="range" id="cam-height" min="1" max="10" step="0.25" value="3.5" style="width:100%;">
      </div>
      <div style="margin-bottom:10px;">
        <label style="font-size:11px; opacity:0.7; display:block; margin-bottom:4px;">Look At Height: <span id="cam-look-val">0.8</span></label>
        <input type="range" id="cam-look" min="0" max="3" step="0.1" value="0.8" style="width:100%;">
      </div>
      <div style="margin-bottom:10px;">
        <label style="font-size:11px; opacity:0.7; display:block; margin-bottom:4px;">FOV: <span id="cam-fov-val">60</span></label>
        <input type="range" id="cam-fov" min="30" max="100" step="1" value="60" style="width:100%;">
      </div>
      <div style="margin-bottom:10px;">
        <label style="font-size:11px; opacity:0.7; display:block; margin-bottom:4px;">Sensitivity: <span id="cam-sens-val">1.0</span></label>
        <input type="range" id="cam-sens" min="0.2" max="3" step="0.1" value="1.0" style="width:100%;">
      </div>
      <button id="settings-close" style="width:100%; padding:8px; margin-top:4px; font-size:12px; font-weight:700; color:#fff; background:rgba(99,102,241,0.4); border:1px solid rgba(99,102,241,0.6); border-radius:8px; cursor:pointer;">Close</button>
    `;
    document.body.appendChild(menu);

    menu.querySelector('#cam-dist').addEventListener('input', (e) => {
      this.cameraSettings.distance = parseFloat(e.target.value);
      document.getElementById('cam-dist-val').textContent = this.cameraSettings.distance;
    });
    menu.querySelector('#cam-height').addEventListener('input', (e) => {
      this.cameraSettings.height = parseFloat(e.target.value);
      document.getElementById('cam-height-val').textContent = this.cameraSettings.height;
    });
    menu.querySelector('#cam-look').addEventListener('input', (e) => {
      this.cameraSettings.lookAtHeight = parseFloat(e.target.value);
      document.getElementById('cam-look-val').textContent = this.cameraSettings.lookAtHeight;
    });
    menu.querySelector('#cam-fov').addEventListener('input', (e) => {
      this.cameraSettings.fov = parseFloat(e.target.value);
      this.camera.fov = this.cameraSettings.fov;
      this.camera.updateProjectionMatrix();
      document.getElementById('cam-fov-val').textContent = this.cameraSettings.fov;
    });
    menu.querySelector('#cam-sens').addEventListener('input', (e) => {
      this.cameraSettings.sensitivity = parseFloat(e.target.value);
      document.getElementById('cam-sens-val').textContent = this.cameraSettings.sensitivity;
    });
    menu.querySelector('#settings-close').addEventListener('click', () => this._toggleSettingsMenu());
  }

  _toggleSettingsMenu() {
    this.settingsMenuOpen = !this.settingsMenuOpen;
    const menu = document.getElementById('settings-menu');
    if (menu) menu.style.display = this.settingsMenuOpen ? 'block' : 'none';
    if (this.settingsMenuOpen) {
      document.body.style.cursor = 'auto';
    } else if (this.state === STATES.PLAYING) {
      document.body.style.cursor = 'none';
    }
  }

  async _showCharSelect() {
    this.state = STATES.CHAR_SELECT;
    this.ui.hideStart();

    // Position camera for character preview (portrait framing)
    this.camera.position.set(0, 0.85, 5.0);
    this.camera.lookAt(0, 0.35, 0);

    // Show first character
    await this.charPreview.showCharacter(ULTIMATE_CHARACTERS[0]);

    this.ui.showCharSelect(ULTIMATE_CHARACTERS, 0,
      (index) => {
        // On cycle: update preview model
        this.charPreview.showCharacter(ULTIMATE_CHARACTERS[index]);
      },
      (index) => {
        // On confirm: choose the first biome before loading the world.
        const char = ULTIMATE_CHARACTERS[index];
        this.selectedCharPath = char.path;
        this.ui.hideCharSelect();
        this.ui.setSelectedBiome(this.selectedBiomeKey);
        this.ui.showBiomeSelect(() => this._startGameWithCharacter(this.selectedCharPath));
      }
    );
  }

  async _startGameWithCharacter(charPath) {
    this.ui.hideCharSelect();
    this.ui.hideBiomeSelect();
    this.ui.showLoading('Loading hunter...');

    // Hide preview and clean up
    this.charPreview.hide();

    // Create player with selected character
    this.player = new Player(this.scene, charPath);
    await this.player.ready;

    this.ui.loadingText.textContent = 'Generating world...';
    await this.world.generate(this.selectedBiomeKey);

    // Snap player to terrain surface at origin
    // Safety: ensure spawn point is at least at default ground level so player
    // doesn't start in a deep pit.
    let terrainY = this.world.getTerrainHeight(0, 0);
    if (terrainY < 0) terrainY = 0;
    const startY = terrainY - (this.player.groundOffset || 0);
    this.player.position.set(0, startY, 0);

    // Reset camera to proper gameplay position (snap, don't lerp from preview)
    this.cameraYaw = Math.PI; // behind player (player faces -Z, camera at +Z)
    this.cameraPitch = 0.25;
    const camDist = this.cameraSettings.distance;
    const camHeight = this.cameraSettings.height;
    this.camera.position.set(
      this.player.position.x + Math.sin(this.cameraYaw) * camDist,
      this.player.position.y + camHeight + Math.sin(this.cameraPitch) * camDist,
      this.player.position.z + Math.cos(this.cameraYaw) * camDist
    );
    const lookAt = new THREE.Vector3(
      this.player.position.x,
      this.player.position.y + this.cameraSettings.lookAtHeight,
      this.player.position.z
    );
    this.camera.lookAt(lookAt);

    this.ui.hideLoading();
    this.ui.showHud();
    this.ui.showPowerMeter();
    this.ui.updatePowerMeter(this.player.throwPower, GAME.THROW_POWER_MIN, GAME.THROW_POWER_MAX);

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) settingsBtn.style.display = 'block';

    this._onResize();
    this.state = STATES.PLAYING;
  }

  _loop() {
    const rawDt = Math.min(this.clock.getDelta(), 0.05);
    const dt = this.impact.applyTime(rawDt);

    if (this.state === STATES.CHAR_SELECT) {
      this._updateCharSelect(dt);
    } else if (this.state === STATES.PLAYING) {
      this._updatePlaying(dt);
    } else if (this.state === STATES.VOCAB_CHALLENGE) {
      this._updateVocabChallenge(dt);
    } else if (this.state === STATES.BASE) {
      this._updateBase(dt);
    }

    this.particles.update(dt);
    this.typingGlyphView.update(rawDt);
    this.floatingGlyphs.update(dt);
    this.impact.update(rawDt);
    this.renderer.render(this.scene, this.camera);
    input.clearFrame();
  }

  _updateCharSelect(dt) {
    this.charPreview.update(dt);
  }

  _updatePlaying(dt) {
    if (this.settingsMenuOpen) return;

    const aiming = input.isAiming();
    const reticleX = aiming ? window.innerWidth / 2 : input.mouse.x;
    const reticleY = aiming ? window.innerHeight / 2 : input.mouse.y;
    this.ui.updateCrosshair(reticleX, reticleY, this.aim.isLocked);
    
    // Camera orbit driven by mouse delta (decoupled from player yaw — NO auto-center)
    const sens = this.cameraSettings.sensitivity;
    this.cameraYaw -= input.mouse.dx * 0.003 * sens;
    const pitchDirection = aiming ? -1 : 1;
    this.cameraPitch += input.mouse.dy * 0.003 * sens * pitchDirection;
    this.cameraPitch = Math.max(-0.3, Math.min(0.5, this.cameraPitch));
    
    // Scroll wheel = throw power adjustment
    if (input.scrollDelta !== 0) {
      const newPower = this.player.adjustThrowPower(-input.scrollDelta);
      this.ui.updatePowerMeter(newPower, GAME.THROW_POWER_MIN, GAME.THROW_POWER_MAX);
    }
    
    // Defensive: reset camera yaw if it went NaN
    if (Number.isNaN(this.cameraYaw)) this.cameraYaw = 0;
    if (Number.isNaN(this.cameraPitch)) this.cameraPitch = 0.25;
    
    // Update player
    this.player.update(dt, this.cameraYaw, {
      aiming,
      aimYaw: this.aim.getAimYaw(),
    });
    this.player.setVisible(!aiming);
    
    // World bounds
    this.worldBounds = this.world.getWorldBounds();
    this.player.position.x = Math.max(-this.worldBounds, Math.min(this.worldBounds, this.player.position.x));
    this.player.position.z = Math.max(-this.worldBounds, Math.min(this.worldBounds, this.player.position.z));
    
    // Snap player Y to terrain height (offset by groundOffset so feet touch ground)
    // Use getTerrainHeightForPlayer with a small radius so the player rides on top
    // of terrain features instead of falling into crevices.
    const terrainY = this.world.getTerrainHeightForPlayer(this.player.position.x, this.player.position.z, 0.35);
    const targetY = terrainY - (this.player.groundOffset || 0);
    const currentY = this.player.position.y;
    
    if (this.player.isJumping) {
      // During jump: only snap to ground when falling and at or below terrain
      if (this.player.jumpVelocity <= 0 && currentY <= targetY) {
        this.player.isJumping = false;
        this.player.jumpVelocity = 0;
        this.player.position.y = targetY;
      }
    } else {
      // On ground: snap to terrain
      // Safety: if we fell more than 1 unit below terrain, snap instantly instead of lerping
      if (currentY < targetY - 1.0) {
        this.player.position.y = targetY;
      } else {
        this.player.position.y = THREE.MathUtils.lerp(currentY, targetY, 25 * dt);
      }
    }
    
    // Update world
    this.world.update(dt, this.player.position);
    
    if (aiming) {
      const eye = new THREE.Vector3(
        this.player.position.x,
        this.player.position.y + GAME.AIM_EYE_HEIGHT,
        this.player.position.z
      );
      const forward = new THREE.Vector3(
        -Math.sin(this.cameraYaw),
        Math.sin(this.cameraPitch),
        -Math.cos(this.cameraYaw)
      ).normalize();
      this.camera.position.copy(eye);
      this.camera.lookAt(eye.clone().add(forward));
    } else {
      const camDist = this.cameraSettings.distance;
      const camHeight = this.cameraSettings.height;
      const back = new THREE.Vector3(Math.sin(this.cameraYaw), 0, Math.cos(this.cameraYaw));
      const targetCamPos = new THREE.Vector3(
        this.player.position.x + back.x * camDist,
        this.player.position.y + camHeight + Math.sin(this.cameraPitch) * camDist,
        this.player.position.z + back.z * camDist
      );
      this.camera.position.lerp(targetCamPos, 8 * dt);
      const lookAt = new THREE.Vector3(
        this.player.position.x,
        this.player.position.y + this.cameraSettings.lookAtHeight,
        this.player.position.z
      );
      this.camera.lookAt(lookAt);
    }
    this.impact.applyCameraShake(this.camera);
    this.aim.update(this.player, this.world, this.player.throwPower);
    this.ui.updateCrosshair(reticleX, reticleY, this.aim.isLocked);
    
    // Orb toss
    if (input.mouseJustPressed.left && this.player.canTossOrb()) {
      this._tossOrb();
      audio.playOrbToss();
      this.impact.pulse('throw');
    }
    
    // Return to base
    if (input.wasJustPressed('KeyB')) {
      this._returnToBase();
    }
    
    // Settings menu toggle
    if (input.wasJustPressed('Escape')) {
      this._toggleSettingsMenu();
    }
    
    // Update orbs
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      orb.update(dt);
      
      // Trail particles
      if (orb.active && Math.random() < 0.4) {
        this.particles.spawnTrail(orb.getPosition(), 0x00ffff, 1);
      }
      
      if (!orb.active) {
        this.orbs.splice(i, 1);
        continue;
      }
      
      // Collision with catchable entities
      for (const entity of this.world.getVisibleEntities()) {
        if (entity.state !== 'idle' && entity.state !== 'alert' && entity.state !== 'flee') continue;
        if (!entity.hitbox || !entity.container) continue;
        
        const targetPoint = entity.getCatchPoint?.() || entity.hitbox.center;
        const dist = orb.getPosition().distanceTo(targetPoint);
        const assistBonus = orb.homingEntity === entity ? orb.assistRadiusBonus : 0;
        const snapRadius = orb.homingEntity === entity ? orb.snapRadius : 0;
        if (dist < entity.hitbox.radius + GAME.ORB_RADIUS + assistBonus || (snapRadius > 0 && dist < snapRadius)) {
          orb.destroy();
          this.orbs.splice(i, 1);
          
          const hitDistance = this.player.position.distanceTo(entity.position);
          this.impact.pulse('hit');
          this.particles.spawn(18, orb.getPosition(), 0x8be9ff, 5.5, 0.35, 0.055);
          const result = entity.onOrbHit(this.player.orbTier, { distance: hitDistance });
          if (result === 'trapped') {
            audio.playOrbHit();
            if (entity.entityType === 'letter') {
              this._startLetterChallenge(entity);
            } else if (entity.entityType === 'prop') {
              this._startPropChallenge(entity);
            } else {
              this._startVocabChallenge(entity);
            }
          } else {
            // Escaped
            audio.playEscape();
            this.impact.pulse('escape');
            this.particles.spawn(22, entity.position, 0x9ca3af, 6, 0.5, 0.06);
            this.ui.showFeedback('ESCAPED!', '#9ca3af');
            this.streak = 1;
          }
          break;
        }
      }
    }
    
    // Update HUD
    this.ui.updateHud(this.player, this.coins, this.capturedCount);
  }

  _tossOrb() {
    if (!this.player.tossOrb()) return;
    
    const startPos = this.player.getHandPosition();
    
    this.aim.update(this.player, this.world, this.player.throwPower);
    const locked = this.aim.isLocked && this.aim.targetEntity;
    const velocity = this.aim.getThrowVelocity(startPos, this.aim.targetPoint, this.player.throwPower, { locked });
    const orb = new Orb(this.scene, startPos, velocity, this.player.orbTier, this.player.throwPower, {
      isVelocity: true,
      gravityScale: locked ? GAME.ORB_GRAVITY_SCALE * 0.18 : GAME.ORB_GRAVITY_SCALE,
      homingTarget: locked ? this.aim.targetPoint.clone() : null,
      homingEntity: locked ? this.aim.targetEntity : null,
      homingStrength: locked ? 22 : 0,
      maxTurnRate: locked ? 28 : 0,
      snapRadius: locked ? 1.15 : 0,
      assistRadiusBonus: locked ? 0.85 : 0,
      homingDelay: 0,
    });
    this.orbs.push(orb);
    
    // Toss animation via action map
    this.player.currentAnimState = 'toss';
    this.player.playAction('toss', 0.05, { loop: false });
  }

  _startVocabChallenge(furniture) {
    this.state = STATES.VOCAB_CHALLENGE;
    this.currentChallengeType = 'furniture';
    this.currentFurniture = furniture;
    this.currentVocab = furniture.vocab;
    this.currentLetter = null;
    this.typedWord = '';
    this.hintsUsed = 0;
    this.hintedIndices = [];
    const level = furniture.level || 1;
    this.currentQuizMode = this._getQuizModeForEntity(this.currentVocab.word, 'furniture');
    this.currentChoiceOptions = this.currentQuizMode.type === 'choice'
      ? this._buildWordChoiceOptions(this.currentVocab.word, this.currentVocab.biome)
      : [];
    this.challengeCompleting = false;
    
    const mesh = furniture.container;
    this.ui.showVocabChallenge(this.currentVocab, mesh, this.streak, this.currentQuizMode, level, this.hintsUsed, this.currentChoiceOptions);
    if (this.currentQuizMode.type === 'spell') {
      this.typingGlyphView.show(this.ui.vocabPreview, this.currentVocab.word, this.currentQuizMode.revealPending);
      this.floatingGlyphs.showLiveTypedWord(this.currentFurniture.position, this.typedWord, this.hintedIndices);
    } else {
      this.typingGlyphView.hide();
      this.floatingGlyphs.hideLiveTypedWord();
    }
    this._snapChallengeCamera();
    if (this.currentQuizMode.playAudio) {
      tts.playWord(this.currentVocab.word);
    }
  }

  _startPropChallenge(prop) {
    this.state = STATES.VOCAB_CHALLENGE;
    this.currentChallengeType = 'prop';
    this.currentFurniture = prop;
    this.currentVocab = { word: prop.word, ttsWord: prop.ttsWord, biome: prop.biome, resourceDrops: prop.resourceDrops };
    this.currentLetter = null;
    this.typedWord = '';
    this.hintsUsed = 0;
    this.hintedIndices = [];
    const level = prop.level || 1;
    this.currentQuizMode = this._getQuizModeForEntity(prop.collectionKey || prop.word, 'prop');
    this.currentChoiceOptions = this.currentQuizMode.type === 'choice'
      ? this._buildWordChoiceOptions(this.currentVocab.word, this.currentVocab.biome)
      : [];
    this.challengeCompleting = false;
    
    const mesh = prop.container;
    this.ui.showVocabChallenge(this.currentVocab, mesh, this.streak, this.currentQuizMode, level, this.hintsUsed, this.currentChoiceOptions);
    if (this.currentQuizMode.type === 'spell') {
      this.typingGlyphView.show(this.ui.vocabPreview, this.currentVocab.word, this.currentQuizMode.revealPending);
      this.floatingGlyphs.showLiveTypedWord(this.currentFurniture.position, this.typedWord, this.hintedIndices);
    } else {
      this.typingGlyphView.hide();
      this.floatingGlyphs.hideLiveTypedWord();
    }
    this._snapChallengeCamera();
    if (this.currentQuizMode.playAudio) {
      tts.playWord(this.currentVocab.ttsWord || this.currentVocab.word);
    }
  }

  _startLetterChallenge(letterCreature) {
    this.state = STATES.VOCAB_CHALLENGE;
    this.currentChallengeType = 'letter';
    this.currentFurniture = letterCreature;
    this.currentVocab = null;
    this.currentLetter = letterCreature.letter;
    this.typedWord = '';
    this.hintsUsed = 0;
    this.hintedIndices = [];
    this.selectedSpeakerWord = null;
    this.correctSpeakerWord = null;
    this.letterChallengePhase = 'speakers';
    this.challengeCompleting = false;
    this.speakerOptions = this._buildSpeakerOptions(this.currentLetter);
    const correct = this.speakerOptions.find(option => option.correct);
    this.correctSpeakerWord = correct?.word || this.speakerOptions[0]?.word || '';
    const level = letterCreature.level || 1;
    this.ui.showLetterChallenge(this.currentLetter, this.speakerOptions, this.streak, level, this.hintsUsed);
    this.floatingGlyphs.showLiveTypedWord(letterCreature.position, this.currentLetter, this.hintedIndices);
    this._snapChallengeCamera();
  }

  _updateVocabChallenge(dt) {
    this.ui.ensureVocabChallengeVisible();
    
    // Animate trapped furniture/prop/letter
    if (this.currentFurniture) {
      this.currentFurniture.update(dt, this.player.position);
      this._updateChallengeCamera(dt);
      if (Math.random() < 0.3) {
        const color = new THREE.Color(this.currentFurniture.tier.color);
        this.particles.spawn(2, this.currentFurniture.position, color, 1, 0.6);
      }
    }
  }

  _useHint() {
    if (this.state !== STATES.VOCAB_CHALLENGE) return;
    if (this.challengeCompleting) return;
    if (this.currentQuizMode?.type === 'choice') return;

    let targetWord = '';
    if (this.currentChallengeType === 'furniture' && this.currentVocab) {
      targetWord = this.currentVocab.word;
    } else if (this.currentChallengeType === 'prop' && this.currentFurniture) {
      targetWord = this.currentFurniture.word;
    } else if (this.currentChallengeType === 'letter' && this.letterChallengePhase === 'spelling') {
      targetWord = this.selectedSpeakerWord;
    } else {
      return;
    }

    if (!targetWord) return;
    const maxHints = Math.max(0, targetWord.length - 1);
    if (this.hintsUsed >= maxHints) return;

    // Find next unrevealed letter
    for (let i = 0; i < targetWord.length; i++) {
      if (!this.hintedIndices.includes(i) && this.typedWord[i] !== targetWord[i]) {
        this.hintedIndices.push(i);
        this.hintsUsed++;
        break;
      }
    }

    const bonus = this._calcHintBonus();
    this.ui.updateHintStatus(this.hintsUsed, maxHints, bonus);
    this.ui.updateVocabInput(targetWord, this.typedWord, this.hintedIndices);
    this.typingGlyphView.updateTyped(this.typedWord, this.currentQuizMode?.revealPending ?? true, this.hintedIndices);
    this.floatingGlyphs.showLiveTypedWord(this.currentFurniture.position, this.typedWord, this.hintedIndices);
    audio.playTypeCorrect(this.streak);
  }

  _calcHintBonus() {
    return Math.max(0.25, 1 - this.hintsUsed * 0.18);
  }

  _snapChallengeCamera() {
    this._updateChallengeCamera(1, true);
  }

  _updateChallengeCamera(dt, snap = false) {
    if (!this.currentFurniture) return;
    const target = this.currentFurniture.getCatchPoint?.().clone() || this.currentFurniture.position.clone();
    const isLetter = this.currentFurniture.entityType === 'letter';
    target.y += isLetter ? 0.75 : 0.95;

    let viewDir = new THREE.Vector3().subVectors(target, this.player?.position || this.camera.position);
    viewDir.y = 0;
    if (viewDir.lengthSq() < 0.001) {
      this.camera.getWorldDirection(viewDir);
      viewDir.y = 0;
    }
    viewDir.normalize();

    const distance = isLetter ? 5.2 : 6.2;
    const desired = target.clone()
      .addScaledVector(viewDir, -distance)
      .add(new THREE.Vector3(0, isLetter ? 0.55 : 0.85, 0));

    const forward = new THREE.Vector3().subVectors(target, desired).normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const screenOffset = window.innerWidth > 820 ? 1.35 : 0;
    const lookAt = target.clone().addScaledVector(right, -screenOffset);

    if (snap) {
      this.camera.position.copy(desired);
    } else {
      this.camera.position.lerp(desired, Math.min(1, 6 * dt));
    }
    this.camera.lookAt(lookAt);
    this.impact.applyCameraShake(this.camera);
  }

  _onTypeKey(key) {
    if (this.state !== STATES.VOCAB_CHALLENGE) return;
    if (this.challengeCompleting) return;
    if (this.currentChallengeType === 'letter') {
      this._onLetterTypeKey(key);
      return;
    }
    if (this.currentQuizMode?.type === 'choice') return;
    
    if (key === 'Backspace') {
      this.typedWord = this.typedWord.slice(0, -1);
      const target = this._getTargetWord();
      this.ui.updateVocabInput(target, this.typedWord, this.hintedIndices);
      this.typingGlyphView.updateTyped(this.typedWord, this.currentQuizMode?.revealPending ?? true, this.hintedIndices);
      this.floatingGlyphs.showLiveTypedWord(this.currentFurniture.position, this.typedWord, this.hintedIndices);
      return;
    }
    
    if (key.length === 1 && /[a-zA-Z]/.test(key)) {
      const target = this._getTargetWord();
      // Skip hinted letters
      while (this.hintedIndices.includes(this.typedWord.length) && this.typedWord.length < target.length) {
        this.typedWord += target[this.typedWord.length];
      }
      this.typedWord += key.toLowerCase();
      
      let correctSoFar = true;
      for (let i = 0; i < this.typedWord.length; i++) {
        if (this.typedWord[i] !== target[i]) {
          correctSoFar = false;
          break;
        }
      }
      
      if (!correctSoFar) {
        audio.playTypeWrong();
        this.ui.ensureVocabChallengeVisible();
        this.ui.shakeScreen();
        this.typingGlyphView.flashWrong();
        this.floatingGlyphs.flashLiveWrong();
        this.typedWord = this.typedWord.slice(0, -1);
      }
      
      this.ui.updateVocabInput(target, this.typedWord, this.hintedIndices);
      this.typingGlyphView.updateTyped(this.typedWord, this.currentQuizMode?.revealPending ?? true, this.hintedIndices);
      this.floatingGlyphs.showLiveTypedWord(this.currentFurniture.position, this.typedWord, this.hintedIndices);
      if (correctSoFar) audio.playTypeCorrect(this.streak);
      
      if (this.typedWord === target) {
        this.challengeCompleting = true;
        this.typingGlyphView.pulseComplete();
        window.setTimeout(() => {
          if (this.state === STATES.VOCAB_CHALLENGE) this._successChallenge();
        }, 220);
      }
    }
  }

  _getTargetWord() {
    if (this.currentChallengeType === 'furniture' && this.currentVocab) {
      return this.currentVocab.word.toLowerCase();
    } else if (this.currentChallengeType === 'prop' && this.currentFurniture) {
      return this.currentFurniture.word.toLowerCase();
    } else if (this.currentChallengeType === 'letter' && this.letterChallengePhase === 'spelling') {
      return this.selectedSpeakerWord.toLowerCase();
    }
    return '';
  }

  _onSpeakerPlay(index) {
    if (this.state !== STATES.VOCAB_CHALLENGE || this.challengeCompleting) return;

    if (this.currentChallengeType !== 'letter') {
      if (this.currentQuizMode?.type === 'choice') {
        const option = this.currentChoiceOptions[index];
        if (!option) return;
        this.ui.updateSpeakerState(index, 'playing');
        tts.playWord(option.word);
        window.setTimeout(() => this.ui.updateSpeakerState(index, null), 260);
      } else if (index === 0) {
        const word = this.currentVocab?.ttsWord || this.currentVocab?.word || this._getTargetWord();
        if (word) tts.playWord(word);
      }
      return;
    }

    if (this.letterChallengePhase !== 'speakers') return;
    const option = this.speakerOptions[index];
    if (!option) return;

    this.ui.updateSpeakerState(index, 'playing');
    tts.playWord(option.word);
    window.setTimeout(() => this.ui.updateSpeakerState(index, null), 260);
  }

  _onSpeakerChoice(index) {
    if (this.state !== STATES.VOCAB_CHALLENGE || this.challengeCompleting) return;

    if (this.currentChallengeType !== 'letter') {
      if (this.currentQuizMode?.type !== 'choice') return;
      const option = this.currentChoiceOptions[index];
      if (!option) return;
      if (option.correct) {
        this.ui.updateSpeakerAnswerState(index, 'correct');
        audio.playTypeCorrect(this.streak);
        this.challengeCompleting = true;
        window.setTimeout(() => {
          if (this.state === STATES.VOCAB_CHALLENGE) this._successChallenge();
        }, 260);
      } else {
        audio.playTypeWrong();
        this.ui.ensureVocabChallengeVisible();
        this.ui.shakeScreen();
        this.ui.updateSpeakerAnswerState(index, 'wrong');
        window.setTimeout(() => this.ui.updateSpeakerAnswerState(index, null), 420);
      }
      return;
    }

    if (this.letterChallengePhase !== 'speakers') return;
    const option = this.speakerOptions[index];
    if (!option) return;

    if (option.correct) {
      this.ui.updateSpeakerAnswerState(index, 'correct');
      this.selectedSpeakerWord = option.word;
      this.typedWord = '';
      this.hintsUsed = 0;
      this.hintedIndices = [];
      this.letterChallengePhase = 'spelling';
      audio.playTypeCorrect(this.streak);
      window.setTimeout(() => {
        if (this.state !== STATES.VOCAB_CHALLENGE || this.currentChallengeType !== 'letter') return;
        this.ui.showLetterSpelling(option.word, this.hintsUsed);
        this.typingGlyphView.show(this.ui.vocabPreview, option.word, false);
        this.floatingGlyphs.showLiveTypedWord(this.currentFurniture.position, '', this.hintedIndices);
      }, 380);
    } else {
      audio.playTypeWrong();
      this.ui.ensureVocabChallengeVisible();
      this.ui.shakeScreen();
      this.floatingGlyphs.flashLiveWrong();
      this.ui.updateSpeakerAnswerState(index, 'wrong');
      window.setTimeout(() => this.ui.updateSpeakerAnswerState(index, null), 360);
    }
  }

  _onLetterTypeKey(key) {
    if (this.letterChallengePhase !== 'spelling' || !this.selectedSpeakerWord) return;
    if (key === 'Backspace') {
      this.typedWord = this.typedWord.slice(0, -1);
      this.ui.updateVocabInput(this.selectedSpeakerWord, this.typedWord, this.hintedIndices);
      this.typingGlyphView.updateTyped(this.typedWord, false, this.hintedIndices);
      this.floatingGlyphs.showLiveTypedWord(this.currentFurniture.position, this.typedWord, this.hintedIndices);
      return;
    }

    if (key.length !== 1 || !/[a-zA-Z]/.test(key)) return;
    const target = this.selectedSpeakerWord.toLowerCase();
    // Skip hinted letters
    while (this.hintedIndices.includes(this.typedWord.length) && this.typedWord.length < target.length) {
      this.typedWord += target[this.typedWord.length];
    }
    this.typedWord += key.toLowerCase();

    let correctSoFar = true;
    for (let i = 0; i < this.typedWord.length; i++) {
      if (this.typedWord[i] !== target[i]) {
        correctSoFar = false;
        break;
      }
    }

    if (!correctSoFar) {
      audio.playTypeWrong();
      this.ui.ensureVocabChallengeVisible();
      this.ui.shakeScreen();
      this.typingGlyphView.flashWrong();
      this.floatingGlyphs.flashLiveWrong();
      this.typedWord = this.typedWord.slice(0, -1);
    }

    this.ui.updateVocabInput(this.selectedSpeakerWord, this.typedWord, this.hintedIndices);
    this.typingGlyphView.updateTyped(this.typedWord, false, this.hintedIndices);
    this.floatingGlyphs.showLiveTypedWord(this.currentFurniture.position, this.typedWord, this.hintedIndices);
    if (correctSoFar) audio.playTypeCorrect(this.streak);

    if (this.typedWord === target) {
      this.challengeCompleting = true;
      this.typingGlyphView.pulseComplete();
      window.setTimeout(() => {
        if (this.state === STATES.VOCAB_CHALLENGE && this.currentChallengeType === 'letter') this._successLetterChallenge();
      }, 220);
    }
  }

  _successChallenge() {
    audio.playCaptureSuccess();
    this.challengeCompleting = false;
    this.impact.pulse('capture');
    this.ui.hideVocabChallenge();
    this.typingGlyphView.hide();
    this.floatingGlyphs.hideLiveTypedWord();
    this.ui.showFeedback('CAPTURED!', '#fbbf24');
    
    const hintBonus = this._calcHintBonus();
    
    if (this.currentFurniture) {
      this.currentFurniture.capture();
      
      const color = new THREE.Color(this.currentFurniture.tier.color);
      this.particles.spawn(24, this.currentFurniture.position, color, 5, 0.8);
      this.particles.spawn(16, this.currentFurniture.position, 0xffffff, 3, 0.6);
      
      let record, levelConfig, reward, levelUp;
      
      if (this.currentChallengeType === 'prop') {
        record = this.collectionStore.recordPropCapture(this.currentFurniture.collectionKey, this.streak);
        levelConfig = FURNITURE_LEVELS.find(item => item.level === this.currentFurniture.level) || FURNITURE_LEVELS[0];
        const shinyBonus = this.currentFurniture.variant === 'shiny' ? 2 : 1;
        reward = Math.floor(this.currentFurniture.tier.reward * this.streak * levelConfig.rewardMultiplier * shinyBonus * hintBonus);
        levelUp = record.level > this.currentFurniture.level ? record.level : null;
        const resourceMultiplier = this.currentFurniture.variant === 'shiny' ? 2 : 1;
        const earned = this.collectionStore.addResources(this.currentFurniture.resourceDrops, resourceMultiplier);
        const earnedText = Object.entries(earned).map(([name, amount]) => `+${amount} ${name}`).join('  ');
        if (earnedText) this.ui.showFeedback(earnedText, '#a5b4fc');
      } else {
        record = this.collectionStore.recordCapture(this.currentVocab.word, this.streak, this.currentFurniture.variant);
        levelConfig = FURNITURE_LEVELS.find(item => item.level === this.currentFurniture.level) || FURNITURE_LEVELS[0];
        const shinyBonus = this.currentFurniture.variant === 'shiny' ? 2 : 1;
        reward = Math.floor(this.currentFurniture.tier.reward * this.streak * levelConfig.rewardMultiplier * shinyBonus * hintBonus);
        levelUp = record.level > this.currentFurniture.level ? record.level : null;
      }
      
      this.floatingGlyphs.spawnCapture({
        position: this.currentFurniture.position,
        reward,
        streak: this.streak,
        levelUp,
      });
      this.coins += reward;
      this.capturedCount++;
      this.streak++;
      this._recalculateIncome();
      if (levelUp) {
        this.ui.showFeedback(`LEVEL ${record.level}!`, '#fbbf24');
      }
    }
    
    // Victory animation!
    this.player.playVictory();
    
    this.state = STATES.PLAYING;
    this.currentFurniture = null;
    this.currentVocab = null;
    this.currentChoiceOptions = [];
    this.hintsUsed = 0;
    this.hintedIndices = [];
  }

  _successLetterChallenge() {
    audio.playCaptureSuccess();
    this.challengeCompleting = false;
    this.impact.pulse('capture');
    this.ui.hideVocabChallenge();
    this.typingGlyphView.hide();
    this.floatingGlyphs.hideLiveTypedWord();
    this.ui.showFeedback('SPELL BONUS!', '#facc15');

    const hintBonus = this._calcHintBonus();

    if (this.currentFurniture) {
      this.currentFurniture.capture();
      this.particles.spawn(30, this.currentFurniture.position, 0xfacc15, 5.5, 0.8, 0.06);
      this.particles.spawn(16, this.currentFurniture.position, 0x78f7a5, 3.5, 0.65, 0.055);

      const record = this.collectionStore.recordLetterCapture(this.currentLetter, this.selectedSpeakerWord, this.streak);
      const levelConfig = FURNITURE_LEVELS.find(item => item.level === this.currentFurniture.level) || FURNITURE_LEVELS[0];
      const levelUp = record.level > this.currentFurniture.level ? record.level : null;
      const reward = Math.floor((this.currentFurniture.tier.reward + 20) * this.streak * levelConfig.rewardMultiplier * hintBonus);
      this.floatingGlyphs.spawnCapture({
        position: this.currentFurniture.position,
        reward,
        streak: this.streak,
        levelUp,
      });
      this.coins += reward;
      this.capturedCount++;
      this.streak++;
      if (levelUp) this.ui.showFeedback(`LETTER LV ${record.level}!`, '#facc15');
    }

    this.player.playVictory();
    this.state = STATES.PLAYING;
    this.currentFurniture = null;
    this.currentVocab = null;
    this.currentLetter = null;
    this.selectedSpeakerWord = null;
    this.correctSpeakerWord = null;
    this.speakerOptions = [];
    this.currentChoiceOptions = [];
    this.currentChallengeType = 'furniture';
    this.hintsUsed = 0;
    this.hintedIndices = [];
  }

  _failChallenge() {
    audio.playEscape();
    this.challengeCompleting = false;
    this.ui.hideVocabChallenge();
    this.typingGlyphView.hide();
    this.floatingGlyphs.hideLiveTypedWord();
    this.ui.showFeedback('IT FLED!', '#ef4444');
    
    if (this.currentFurniture) {
      this.currentFurniture.failCapture();
    }
    
    this.streak = 1;
    this.state = STATES.PLAYING;
    this.currentFurniture = null;
    this.currentVocab = null;
    this.currentLetter = null;
    this.selectedSpeakerWord = null;
    this.correctSpeakerWord = null;
    this.speakerOptions = [];
    this.currentChoiceOptions = [];
    this.currentChallengeType = 'furniture';
    this.hintsUsed = 0;
    this.hintedIndices = [];
  }

  _buildSpeakerOptions(letter) {
    const targetLetter = String(letter || 'A').toUpperCase();
    const correctPool = LETTER_WORDS[targetLetter] || [];
    const correctWord = correctPool[Math.floor(Math.random() * correctPool.length)] || 'apple';
    const otherWords = [];
    for (const [key, words] of Object.entries(LETTER_WORDS)) {
      if (key === targetLetter) continue;
      for (const word of words) otherWords.push(word);
    }
    this._shuffle(otherWords);
    const options = [
      { word: correctWord, correct: true },
      { word: otherWords[0] || 'table', correct: false },
      { word: otherWords[1] || 'chair', correct: false },
    ];
    return this._shuffle(options);
  }

  _shuffle(items) {
    const next = items.slice();
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
  }

  _returnToBase() {
    this.state = STATES.BASE;
    this._updateBaseUI();
    this.ui.showBase(this._getTotalCollectionCount(), this._getTotalCollectibleCount(), this.coins, this.incomePerSec);
    this.ui.updateResources(this.collectionStore.getResources());
    this.ui.setSelectedBiome(this.selectedBiomeKey);
    audio.playLevelUp();
  }

  _updateBase(dt) {
    this.incomeAccumulator += this.incomePerSec * dt;
    if (this.incomeAccumulator >= 1) {
      const add = Math.floor(this.incomeAccumulator);
      this.coins += add;
      this.incomeAccumulator -= add;
    }
    this._updateBaseUI();
  }

  _updateBaseUI() {
    this.ui.baseCollectionCount.textContent = `${this._getTotalCollectionCount()} / ${this._getTotalCollectibleCount()}`;
    this.ui.baseCoinCount.textContent = Math.floor(this.coins);
    this.ui.baseIncome.textContent = `+${this.incomePerSec.toFixed(1)}`;
    this.ui.updateResources(this.collectionStore.getResources());
    
    this.ui.setUpgradeEnabled('satchel', this.coins >= this.upgradeCosts.satchel);
    this.ui.setUpgradeEnabled('boots', this.coins >= this.upgradeCosts.boots);
    this.ui.setUpgradeEnabled('orb', this.coins >= this.upgradeCosts.orb);
  }

  _getTotalCollectionCount() {
    return this.collectionStore.getUniqueCount() + this.collectionStore.getUniqueLetterCount() + this.collectionStore.getUniquePropCount();
  }

  _getTotalCollectibleCount() {
    return CATCHABLE_CATALOG.length + 26;
  }

  _buyUpgrade(key) {
    const cost = this.upgradeCosts[key];
    if (this.coins < cost) return;
    
    this.coins -= cost;
    audio.playCoinPickup();
    
    if (key === 'satchel') {
      this.upgrades.satchelLevel++;
      this.upgradeCosts.satchel = Math.floor(this.upgradeCosts.satchel * 1.5);
      this.ui.upgradeCards.satchel.querySelector('div:last-child').textContent = `${this.upgradeCosts.satchel} coins`;
    } else if (key === 'boots') {
      this.upgrades.bootsLevel++;
      this.upgradeCosts.boots = Math.floor(this.upgradeCosts.boots * 1.5);
      this.ui.upgradeCards.boots.querySelector('div:last-child').textContent = `${this.upgradeCosts.boots} coins`;
    } else if (key === 'orb') {
      this.upgrades.orbTierLevel++;
      const tiers = ['wood', 'iron', 'gold', 'diamond'];
      this.player.orbTier = tiers[Math.min(this.upgrades.orbTierLevel, tiers.length - 1)];
      this.upgradeCosts.orb = Math.floor(this.upgradeCosts.orb * 1.5);
      this.ui.upgradeCards.orb.querySelector('div:last-child').textContent = `${this.upgradeCosts.orb} coins`;
    }
    
    this._updateBaseUI();
  }

  _recalculateIncome() {
    let income = 0;
    for (const [word, record] of Object.entries(this.collectionStore.getAllRecords())) {
      if (!record.captures) continue;
      const vocab = VOCABULARY.find(v => v.word === word);
      if (vocab) {
        const tier = FURNITURE_TIERS[vocab.tier];
        const levelConfig = FURNITURE_LEVELS.find(item => item.level === record.level) || FURNITURE_LEVELS[0];
        income += (tier?.reward || 10) * 0.05 * levelConfig.rewardMultiplier;
      }
    }
    for (const [key, record] of Object.entries(this.collectionStore.getAllPropRecords())) {
      if (!record.captures) continue;
      const prop = CATCHABLE_CATALOG.find(p => p.word === key) || PROP_VOCABULARY.find(p => p.word === key);
      if (prop) {
        const tier = FURNITURE_TIERS[prop.tier] || FURNITURE_TIERS.common;
        const levelConfig = FURNITURE_LEVELS.find(item => item.level === record.level) || FURNITURE_LEVELS[0];
        income += (tier?.reward || 10) * 0.05 * levelConfig.rewardMultiplier;
      }
    }
    this.incomePerSec = income;
  }

  _goOnExpedition() {
    if (this.settingsMenuOpen) this._toggleSettingsMenu();
    this.ui.hideBase();
    this.state = STATES.PLAYING;
    
    this.world.clear();
    const biomeKey = this.selectedBiomeKey;
    this.world.generate(biomeKey);
    this.player.position.set(0, 0, 0);
    this.cameraYaw = 0;
    this.ui.showFeedback(ESL_BIOMES[biomeKey]?.name || 'Expedition', '#a5b4fc');
  }

  _selectBiome(biomeKey) {
    if (!this.biomeKeys.includes(biomeKey)) return;
    this.selectedBiomeKey = biomeKey;
    this.currentBiomeIndex = this.biomeKeys.indexOf(biomeKey);
  }

  _getQuizModeForEntity(collectionKey, type = 'prop') {
    let captures = 0;
    if (type === 'furniture') {
      captures = this.collectionStore.getCaptureCount(collectionKey);
    } else {
      captures = this.collectionStore.getPropRecord(collectionKey).captures || 0;
    }
    if (captures <= 0) return QUIZ_MODES.spell;
    return captures % 2 === 1 ? QUIZ_MODES.choice : QUIZ_MODES.spell;
  }

  _buildWordChoiceOptions(correctWord, biome = null) {
    const normalized = String(correctWord || '').toLowerCase();
    const sameBiome = CATCHABLE_CATALOG
      .filter(item => item.biome === biome && item.word !== normalized)
      .map(item => item.word);
    const similarLength = sameBiome.filter(word => Math.abs(word.length - normalized.length) <= 2);
    const fallback = CATCHABLE_WORDS.filter(word => word !== normalized);
    const pool = [...new Set([...similarLength, ...sameBiome, ...fallback])];
    this._shuffle(pool);
    const options = [
      { word: normalized, correct: true },
      { word: pool[0] || 'tree', correct: false },
      { word: pool[1] || 'chair', correct: false },
    ];
    return this._shuffle(options);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  destroy() {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this._onResize);
    input.detach();
    this.ui.unbindTyping();
    this.aim.dispose();
    this.renderer.dispose();
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) settingsBtn.remove();
    const settingsMenu = document.getElementById('settings-menu');
    if (settingsMenu) settingsMenu.remove();
  }
}
