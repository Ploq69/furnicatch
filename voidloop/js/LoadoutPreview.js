import * as THREE from 'three';
import { Player } from './Player.js';
import { cloneLoadout } from './KayKitLoadout.js';

export class LoadoutPreview {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111214);
    this.camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 50);
    this.camera.position.set(0, 1.2, 10);
    this.camera.lookAt(0, 1.0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.player = new Player(this.scene);
    this.yaw = 0.4;
    this.ready = false;
    this.pendingLoadout = null;
    this.dragging = false;
    this.lastX = 0;
    this.stageY = -0.18;
    this.zoom = 1.0;

    this._addLights();
    this._addStage();
    this._bindDrag();
    this._bindZoom();
  }

  async init(loadout) {
    const next = cloneLoadout(loadout);
    await this.player.spawn(next.characterId);
    await this.player.applyLoadout(next);
    this.player.position.set(0, 0, 0);
    this.ready = true;
    this.resize();
    this._autoFrame();
  }

  async setLoadout(loadout) {
    const next = cloneLoadout(loadout);
    if (!this.ready) {
      this.pendingLoadout = next;
      return;
    }
    await this.player.applyLoadout(next);
    this.player.position.set(0, 0, 0);
    this.pendingLoadout = null;
    this._autoFrame();
  }

  setCalibrationEnabled(enabled, slot) {
    const snapshot = this.player.setCalibrationEnabled(enabled, slot);
    this._autoFrame();
    return snapshot;
  }

  setCalibrationSlot(slot) {
    const snapshot = this.player.setCalibrationSlot(slot);
    this._autoFrame();
    return snapshot;
  }

  adjustCalibration(field, delta) {
    const snapshot = this.player.adjustCalibration(field, delta);
    this._autoFrame();
    return snapshot;
  }

  setCalibration(field, value) {
    const snapshot = this.player.setCalibration(field, value);
    this._autoFrame();
    return snapshot;
  }

  resetCalibrationOffset() {
    const snapshot = this.player.resetCalibrationOffset();
    this._autoFrame();
    return snapshot;
  }

  getCalibrationSnapshot() {
    return this.player.getCalibrationSnapshot();
  }

  update(dt) {
    if (!this.ready) return;
    if (this.pendingLoadout) {
      const pending = this.pendingLoadout;
      this.pendingLoadout = null;
      this.setLoadout(pending);
    }
    this.player.mixer?.update(dt);
    this.player.rotation = this.yaw;
    this.player.position.x = 0;
    this.player.position.z = 0;
    this.player._updateMesh();
    this._autoFrame();
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    this._autoFrame(width, height);
    this.renderer.setSize(width, height, false);
  }

  _addLights() {
    this.scene.add(new THREE.HemisphereLight(0xf4efe6, 0x242225, 1.1));

    const key = new THREE.DirectionalLight(0xfff4dd, 2.2);
    key.position.set(3, 4, 4);
    key.castShadow = true;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x8fd7ff, 1.1);
    rim.position.set(-4, 2, -3);
    this.scene.add(rim);
  }

  _addStage() {
    const floorGeo = new THREE.CircleGeometry(1.9, 48);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x202225, roughness: 0.82, metalness: 0.05 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = this.stageY;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  _bindDrag() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.lastX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      this.yaw += (e.clientX - this.lastX) * 0.01;
      this.lastX = e.clientX;
    });
    canvas.addEventListener('pointerup', (e) => {
      this.dragging = false;
      canvas.releasePointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointerleave', () => {
      this.dragging = false;
    });
  }

  _bindZoom() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        this.zoom *= 0.9;
      } else {
        this.zoom *= 1.1;
      }
      this.zoom = Math.max(0.2, Math.min(5.0, this.zoom));
    }, { passive: false });
    canvas.addEventListener('dblclick', () => {
      this.zoom = 1.0;
    });
  }

  _autoFrame(widthOverride = null, heightOverride = null) {
    if (!this.player?.mesh) return;
    this.player.mesh.updateMatrixWorld(true);

    const bodyBox = this._getPreviewBox(false);
    if (!Number.isFinite(bodyBox.min.y) || !Number.isFinite(bodyBox.max.y)) return;

    // The floor snap must use only the character body. Weapons, arrows and
    // calibration helpers can hang below the feet and should not lift the model.
    const stageY = this.stageY;
    const lift = stageY - bodyBox.min.y;
    if (Math.abs(lift) > 0.0001) {
      this.player.position.y += lift;
      this.player._updateMesh();
      this.player.mesh.updateMatrixWorld(true);
    }

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    const frameBox = this._getPreviewBox(true);
    if (Number.isFinite(frameBox.min.y) && Number.isFinite(frameBox.max.y)) {
      frameBox.getSize(size);
      frameBox.getCenter(center);
    } else {
      size.set(1.8, 2.4, 1.2);
      center.set(0, 1.0, 0);
    }

    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(widthOverride || rect.width || 1));
    const height = Math.max(1, Math.floor(heightOverride || rect.height || 1));
    const aspect = width / height;
    const viewPadding = 1.85;
    const minViewHeight = 4.4;
    const viewHeight = Math.max(minViewHeight, size.y * viewPadding, (size.x * viewPadding) / aspect) * this.zoom;
    const viewWidth = viewHeight * aspect;
    const aimY = Math.max(0.95, center.y - size.y * 0.08);

    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.position.set(center.x, aimY + 1.2, center.z + 10);
    this.camera.lookAt(center.x, aimY, center.z);
    this.camera.updateProjectionMatrix();
  }

  _getPreviewBox(includeEquipment) {
    const box = new THREE.Box3();
    const holders = new Set(Object.values(this.player.equipmentHolders || {}).filter(Boolean));
    const helperGroup = this.player.calibration?.helperGroup || null;

    // Clear stale SkinnedMesh bounding-box caches so expandByObject
    // uses accurate, freshly-computed bounds.
    this.player.mesh.traverse((obj) => {
      if (obj.isSkinnedMesh) obj.boundingBox = null;
    });

    this.player.mesh.traverse((obj) => {
      if (!obj.isMesh) return;
      if (this._hasCalibrationHelperAncestor(obj)) return;
      if (this._isDescendantOfAny(obj, holders)) {
        if (!includeEquipment) return;
      }
      if (helperGroup && this._isDescendantOf(obj, helperGroup)) return;
      box.expandByObject(obj);
    });

    return box;
  }

  _isDescendantOfAny(obj, parents) {
    for (const parent of parents) {
      if (this._isDescendantOf(obj, parent)) return true;
    }
    return false;
  }

  _isDescendantOf(obj, parent) {
    let current = obj;
    while (current) {
      if (current === parent) return true;
      current = current.parent;
    }
    return false;
  }

  _hasCalibrationHelperAncestor(obj) {
    let current = obj;
    while (current) {
      if (current.userData?.isCalibrationHelper) return true;
      current = current.parent;
    }
    return false;
  }
}
