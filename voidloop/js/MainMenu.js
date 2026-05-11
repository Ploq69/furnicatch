/**
 * MainMenu — Title screen with animated 3D background
 * Flow: Title → (Solo | Co-op | Settings)
 */

import * as THREE from 'three';
import { assetLoader } from './AssetLoader.js';
import { LobbyManager } from './LobbyManager.js';
import { Game } from './Game.js';
import { settings } from './SettingsManager.js';

export class MainMenu {
  constructor(container) {
    this.container = container;
    this.game = null;
    this.lobby = null;
    this._bgScene = null;
    this._bgCamera = null;
    this._bgRenderer = null;
    this._bgMesh = null;
    this._animId = null;
    this._hasStarted = false;

    this._bindElements();
    this._bindEvents();
    this._initBackground();

    // Listen for lobby "back to menu" event
    document.addEventListener('show-main-menu', () => {
      this._hasStarted = false;
      this.elMenu.classList.remove('hidden');
      this._initBackground();
    });
  }

  _bindElements() {
    this.elMenu = document.getElementById('main-menu');
    this.elTitle = document.getElementById('menu-title');
    this.elSoloBtn = document.getElementById('menu-solo-btn');
    this.elCoopBtn = document.getElementById('menu-coop-btn');
    this.elSettingsBtn = document.getElementById('menu-settings-btn');
    this.elVersion = document.getElementById('menu-version');
  }

  _bindEvents() {
    this.elSoloBtn?.addEventListener('click', () => this._onSolo());
    this.elCoopBtn?.addEventListener('click', () => this._onCoop());
    this.elSettingsBtn?.addEventListener('click', () => this._onSettings());
  }

  // ── Animated 3D Background ──
  _initBackground() {
    const canvas = document.getElementById('menu-bg-canvas');
    if (!canvas) return;
    canvas.style.display = 'block';

    // If already initialized, just resume
    if (this._bgRenderer) {
      this._startBgLoop();
      return;
    }

    const w = window.innerWidth;
    const h = window.innerHeight;

    this._bgRenderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
    this._bgRenderer.setSize(w, h);
    this._bgRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this._bgRenderer.setClearColor(0x0a0a0a);

    this._bgScene = new THREE.Scene();
    this._bgCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this._bgCamera.position.set(4, 3, 6);
    this._bgCamera.lookAt(0, 0.5, 0);

    const ambient = new THREE.AmbientLight(0x8888aa, 0.5);
    this._bgScene.add(ambient);
    const dir = new THREE.DirectionalLight(0xfff5e6, 1.0);
    dir.position.set(3, 5, 3);
    this._bgScene.add(dir);
    const rim = new THREE.DirectionalLight(0xa855f7, 0.6);
    rim.position.set(-3, 2, -3);
    this._bgScene.add(rim);

    this._loadBackgroundModel();
    this._createEmbers();

    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.2 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    this._bgScene.add(floor);

    this._startBgLoop();

    this._onResize = () => {
      if (!this._bgRenderer) return;
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      this._bgCamera.aspect = nw / nh;
      this._bgCamera.updateProjectionMatrix();
      this._bgRenderer.setSize(nw, nh);
    };
    window.addEventListener('resize', this._onResize);
  }

  async _loadBackgroundModel() {
    try {
      const path = 'KayKit_Adventurers_2.0_FREE/Characters/gltf/Rogue.glb';
      await assetLoader.loadGLTF(path);
      const cloned = assetLoader.cloneModel(path);
      if (cloned && cloned.scene) {
        this._bgMesh = cloned.scene;
        this._bgMesh.scale.setScalar(0.8);
        this._bgMesh.position.set(0, 0, 0);
        this._bgMesh.rotation.y = Math.PI / 4;
        this._bgScene.add(this._bgMesh);
      }
    } catch (e) {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x4a1d7a, emissiveIntensity: 0.3 });
      this._bgMesh = new THREE.Mesh(geo, mat);
      this._bgMesh.position.set(0, 0.5, 0);
      this._bgScene.add(this._bgMesh);
    }
  }

  _createEmbers() {
    const count = 60;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = Math.random() * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      speeds[i] = 0.2 + Math.random() * 0.5;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffaa44,
      size: 0.06,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this._embers = new THREE.Points(geo, mat);
    this._embers.userData.speeds = speeds;
    this._bgScene.add(this._embers);
  }

  _startBgLoop() {
    if (this._animId) return;
    const clock = new THREE.Clock();
    const animate = () => {
      this._animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();

      if (this._bgMesh) {
        this._bgMesh.rotation.y += dt * 0.3;
        this._bgMesh.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.08;
      }

      if (this._embers) {
        const positions = this._embers.geometry.attributes.position.array;
        const speeds = this._embers.userData.speeds;
        for (let i = 0; i < speeds.length; i++) {
          positions[i * 3 + 1] += speeds[i] * dt;
          if (positions[i * 3 + 1] > 5) {
            positions[i * 3 + 1] = 0;
            positions[i * 3] = (Math.random() - 0.5) * 10;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
          }
        }
        this._embers.geometry.attributes.position.needsUpdate = true;
      }

      const t = clock.elapsedTime * 0.1;
      this._bgCamera.position.x = 4 + Math.sin(t) * 1.5;
      this._bgCamera.position.z = 6 + Math.cos(t) * 1.5;
      this._bgCamera.lookAt(0, 0.5, 0);

      this._bgRenderer.render(this._bgScene, this._bgCamera);
    };
    animate();
  }

  _stopBgLoop() {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
  }

  _destroyBackground() {
    this._stopBgLoop();
    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
      this._onResize = null;
    }
    if (this._bgRenderer) {
      this._bgRenderer.dispose();
      this._bgRenderer = null;
    }
    const canvas = document.getElementById('menu-bg-canvas');
    if (canvas) canvas.style.display = 'none';
    this._bgScene = null;
    this._bgCamera = null;
    this._bgMesh = null;
    this._embers = null;
  }

  // ── Button Handlers ──
  _onSolo() {
    if (this._hasStarted) return;
    this._hasStarted = true;
    this._transitionToGame(false);
  }

  _onCoop() {
    if (this._hasStarted) return;
    this._hasStarted = true;
    this.elMenu.classList.add('hidden');
    if (!this.lobby) {
      this.lobby = new LobbyManager(this.container, (net, isHost) => {
        this._transitionToGame(true, net, isHost);
      });
    }
    document.getElementById('lobby-overlay').classList.remove('hidden');
  }

  _onSettings() {
    document.dispatchEvent(new CustomEvent('show-settings'));
  }

  _transitionToGame(isMultiplayer = false, net = null, isHost = false) {
    this._destroyBackground();
    this.elMenu.classList.add('hidden');

    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';

    try {
      this.game = new Game(this.container);
      this.game.isMultiplayer = isMultiplayer;
      this.game.isHost = isHost;
      this.game.net = net;
      this.game.mainMenu = this;
    } catch (err) {
      console.error('[MainMenu] Failed to start game:', err);
      this._hasStarted = false;
      this.elMenu.classList.remove('hidden');
      if (loading) loading.style.display = 'none';
      this._initBackground();
    }
  }

  returnToMenu() {
    if (this.game) {
      // Clean up game
      try {
        this.game.renderer.setAnimationLoop(null);
        this.game.renderer.dispose();
        this.container.removeChild(this.game.renderer.domElement);
      } catch (e) {}
      this.game = null;
    }
    this._hasStarted = false;
    this.elMenu.classList.remove('hidden');
    this._initBackground();
  }
}
