import * as THREE from 'three';
import { SkyGradientMaterial } from './SkyGradientMaterial.js';

export class SkyGradient {
  constructor(scene, camera, options = {}) {
    this.scene = scene;
    this.camera = camera;

    const geometry = new THREE.SphereGeometry(1, 32, 16);
    this.material = new SkyGradientMaterial();
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.scale.setScalar(options.scale ?? 800);
    this.mesh.name = 'sky_gradient_dome';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    this.scene.add(this.mesh);

    this.dayTimeSec = options.dayTimeSec ?? 300;
    this.nightTimeSec = options.nightTimeSec ?? 180;
    this.cycleSpeed = options.cycleSpeed ?? 1.0;
    this.autoTick = options.autoTick !== false;
    this.time = options.initialTime ?? (this.autoTick ? 0 : this.dayTimeSec * 0.35);



    // Sun state — will be overwritten each frame by orbit in update()
    this.sunDir = new THREE.Vector3(-0.2, 0.6, -0.6).normalize();
    this.sunColor = new THREE.Color(1.0, 0.92, 0.6);
    this.sunStrength = options.sunStrength ?? 4.0;
    this.sunSharpness = 16.0;
    this.sunGlowStrength = 0.6;
    this.sunDiscSize = options.sunDiscSize ?? 0.06;

    this.starsEnabled = options.starsEnabled !== false;
    this.auroraEnabled = options.auroraEnabled !== false;



    this._updateUniforms();
  }

  setSun({ dir, color, strength, sharpness, glowStrength, discSize }) {
    if (dir) this.sunDir.set(dir.x ?? dir[0], dir.y ?? dir[1], dir.z ?? dir[2]).normalize();
    if (color) this.sunColor.set(color);
    if (strength !== undefined) this.sunStrength = strength;
    if (sharpness !== undefined) this.sunSharpness = sharpness;
    if (glowStrength !== undefined) this.sunGlowStrength = glowStrength;
    if (discSize !== undefined) this.sunDiscSize = discSize;
  }

  /**
   * Compute sun direction from cycle time.
   * The sun rotates around the X axis, starting from (0, 0, -1).
   * θ = 0: horizon front  |  θ = π/2: zenith  |  θ = π: horizon back  |  θ > π: below horizon
   */
  getSunDirection() {
    const theta = this._getCycleAngle();
    const y = Math.sin(theta);
    const z = -Math.cos(theta);
    return new THREE.Vector3(0, y, z).normalize();
  }

  /**
   * Compute sun intensity factor from cycle time.
   * Returns max(0, sin(θ))² — zero below horizon, peak at midday.
   */
  getSunIntensityFactor() {
    const theta = this._getCycleAngle();
    return Math.max(0, Math.sin(theta)) ** 2;
  }

  _getCycleAngle() {
    const dayPct = Math.min(1, this.time / Math.max(this.dayTimeSec, 0.001));
    const nightPct = Math.max(0, (this.time - this.dayTimeSec) / Math.max(this.nightTimeSec, 0.001));
    return (dayPct + nightPct) * Math.PI;
  }

  getCyclePhase() {
    return (this._getCycleAngle() / (Math.PI * 2)) % 1;
  }

  update(dt) {
    if (this.autoTick && this.cycleSpeed > 0) {
      this.time += dt * this.cycleSpeed;
      const total = this.dayTimeSec + this.nightTimeSec;
      while (this.time > total) this.time -= total;
      while (this.time < 0) this.time += total;
    }

    if (this.camera) {
      this.mesh.position.copy(this.camera.position);
    }

    // Orbit sun based on cycle time
    const sunDir = this.getSunDirection();
    this.sunDir.copy(sunDir);

    this._updateUniforms();
  }

  setTime(t) {
    this.time = t;
  }

  get nightVisibility() {
    const nightPct = Math.max(0, (this.time - this.dayTimeSec) / Math.max(this.nightTimeSec, 0.001));
    return 1.0 - Math.abs(nightPct - 0.5) * 2.0;
  }

  _updateUniforms() {
    const mat = this.material;
    mat.uniforms.sunDir.value.copy(this.sunDir);
    mat.uniforms.sunColor.value.set(this.sunColor.r, this.sunColor.g, this.sunColor.b);
    mat.uniforms.sunStrength.value = this.sunStrength;
    mat.uniforms.sunSharpness.value = this.sunSharpness;
    mat.uniforms.sunGlowStrength.value = this.sunGlowStrength;
    mat.uniforms.sunDiscSize.value = this.sunDiscSize;
    mat.uniforms.nightVisibility.value = this.nightVisibility;
    mat.uniforms.time.value = this.time;
    mat.uniforms.cyclePhase.value = this.getCyclePhase();
    mat.uniforms.starEnabled.value = this.starsEnabled ? 1.0 : 0.0;
    mat.uniforms.auroraEnabled.value = this.auroraEnabled ? 1.0 : 0.0;
  }

  setDarkness(value) {
    this.material.uniforms.darkness.value = Math.max(0, Math.min(1, value));
  }

  setVisible(visible) {
    this.mesh.visible = visible;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
  }
}

