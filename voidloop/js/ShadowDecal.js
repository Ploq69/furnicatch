import * as THREE from 'three';

// Procedurally generate a soft circular shadow texture
function createShadowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const center = size / 2;
  const radius = size / 2 - 2;

  // Soft radial gradient from dark center to transparent edge
  const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let _sharedShadowTexture = null;
function getSharedShadowTexture() {
  if (!_sharedShadowTexture) {
    _sharedShadowTexture = createShadowTexture();
  }
  return _sharedShadowTexture;
}

/**
 * Cheap fake shadow decal that follows an entity and projects onto the ground.
 * Used because the custom terrain shader cannot receive Three.js shadow maps.
 */
export class ShadowDecal {
  /**
   * @param {THREE.Object3D} owner - The entity mesh to shadow
   * @param {THREE.Scene} scene
   * @param {Function} getGroundHeight - (x, z) => groundY or null
   * @param {object} options
   */
  constructor(owner, scene, getGroundHeight, options = {}) {
    this.owner = owner;
    this.scene = scene;
    this.getGroundHeight = getGroundHeight;
    this.baseScale = options.baseScale || 1.0;
    this.baseOpacity = options.baseOpacity ?? 0.55;
    this.fadeStart = options.fadeStart ?? 3.0;
    this.fadeEnd = options.fadeEnd ?? 6.0;
    this.heightScaleFactor = options.heightScaleFactor ?? 0.35;
    this.sunOffsetFactor = options.sunOffsetFactor ?? 0.25;

    this._geometry = new THREE.PlaneGeometry(1, 1);
    this._geometry.rotateX(-Math.PI / 2);

    this._material = new THREE.MeshBasicMaterial({
      map: getSharedShadowTexture(),
      transparent: true,
      opacity: this.baseOpacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    this.mesh = new THREE.Mesh(this._geometry, this._material);
    this.mesh.name = 'shadowDecal';
    this.scene.add(this.mesh);

    this._lastPos = new THREE.Vector3();
    this._cachedGroundY = null;
    this._cacheDirty = true;
    this._cacheThreshold = 0.5;
  }

  update(dt, sunDirection) {
    if (!this.owner || !this.mesh) return;

    const ownerPos = this.owner.position;

    // Cache ground height to avoid excessive sampling
    const dx = ownerPos.x - this._lastPos.x;
    const dz = ownerPos.z - this._lastPos.z;
    if (dx * dx + dz * dz > this._cacheThreshold * this._cacheThreshold) {
      this._cacheDirty = true;
      this._lastPos.set(ownerPos.x, 0, ownerPos.z);
    }

    let groundY = this._cachedGroundY;
    if (this._cacheDirty && this.getGroundHeight) {
      groundY = this.getGroundHeight(ownerPos.x, ownerPos.z);
      this._cachedGroundY = groundY;
      this._cacheDirty = false;
    }

    if (groundY === null || groundY === undefined || !Number.isFinite(groundY)) {
      this.mesh.visible = false;
      return;
    }

    const heightAbove = Math.max(0, ownerPos.y - groundY);

    // Fade out when too high
    const fadeT = Math.max(0, Math.min(1, (this.fadeEnd - heightAbove) / (this.fadeEnd - this.fadeStart)));
    if (fadeT <= 0.01) {
      this.mesh.visible = false;
      return;
    }

    this.mesh.visible = true;

    // Scale grows with height (shadow gets softer/bigger when airborne)
    const scale = this.baseScale * (1 + heightAbove * this.heightScaleFactor);
    this.mesh.scale.setScalar(scale);

    // Position: on ground, offset by sun direction for fake directional feel
    let sx = ownerPos.x;
    let sz = ownerPos.z;
    if (sunDirection && heightAbove > 0.1) {
      sx += sunDirection.x * heightAbove * this.sunOffsetFactor;
      sz += sunDirection.z * heightAbove * this.sunOffsetFactor;
    }
    this.mesh.position.set(sx, groundY + 0.02, sz);

    // Opacity fades with height
    this._material.opacity = this.baseOpacity * fadeT;
  }

  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      // Don't dispose shared material/texture here
      this.mesh = null;
    }
    this.owner = null;
    this.getGroundHeight = null;
  }
}
