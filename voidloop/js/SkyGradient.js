import * as THREE from 'three';
import { SkyGradientMaterial } from './SkyGradientMaterial.js';

class GradientBuilder {
  constructor({
    sunriseColor = [255, 180, 120],
    dayLowColor = [200, 230, 255],
    dayHighColor = [120, 190, 255],
    sunsetColor = [255, 170, 110],
    nightLowColor = [20, 25, 60],
    nightHighColor = [8, 12, 35],
  } = {}) {
    this.sunriseColor = this._toVec3(sunriseColor);
    this.dayLowColor = this._toVec3(dayLowColor);
    this.dayHighColor = this._toVec3(dayHighColor);
    this.sunsetColor = this._toVec3(sunsetColor);
    this.nightLowColor = this._toVec3(nightLowColor);
    this.nightHighColor = this._toVec3(nightHighColor);
  }

  _toVec3(c) {
    if (Array.isArray(c)) return new THREE.Vector3(c[0] / 255, c[1] / 255, c[2] / 255);
    if (c.isColor) return new THREE.Vector3(c.r, c.g, c.b);
    if (typeof c === 'number') {
      const col = new THREE.Color(c);
      return new THREE.Vector3(col.r, col.g, col.b);
    }
    return new THREE.Vector3(c.r ?? 0, c.g ?? 0, c.b ?? 0);
  }

  sampleAt(t) {
    const stops = [
      { t: 0.00, color: this.sunriseColor },
      { t: 0.10, color: this.dayLowColor },
      { t: 0.30, color: this.dayHighColor },
      { t: 0.48, color: this.dayLowColor },
      { t: 0.50, color: this.sunsetColor },
      { t: 0.62, color: this.nightLowColor },
      { t: 0.85, color: this.nightHighColor },
      { t: 1.00, color: this.sunriseColor },
    ];

    if (t <= stops[0].t) return stops[0].color;
    if (t >= stops[stops.length - 1].t) return stops[stops.length - 1].color;

    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i].t) {
        const a = stops[i - 1];
        const b = stops[i];
        const f = (t - a.t) / Math.max(b.t - a.t, 0.0001);
        return new THREE.Vector3().lerpVectors(a.color, b.color, f);
      }
    }
    return stops[stops.length - 1].color;
  }
}

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

    this.builders = [
      new GradientBuilder(),
      new GradientBuilder(),
      new GradientBuilder(),
      new GradientBuilder(),
    ];

    this.bandPositions = options.bandPositions ?? [0.0, 0.28, 0.62, 1.0];

    // Sun state — will be overwritten each frame by orbit in update()
    this.sunDir = new THREE.Vector3(-0.2, 0.6, -0.6).normalize();
    this.sunColor = new THREE.Color(1.0, 0.92, 0.6);
    this.sunStrength = options.sunStrength ?? 4.0;
    this.sunSharpness = 16.0;
    this.sunGlowStrength = 0.6;
    this.sunDiscSize = options.sunDiscSize ?? 0.06;

    this.starsEnabled = options.starsEnabled !== false;
    this.auroraEnabled = options.auroraEnabled !== false;

    this._cachedColors = [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()];

    this._updateUniforms();
  }

  setBuilders(builders) {
    if (builders && builders.length >= 4) {
      this.builders = builders.map(b => (b instanceof GradientBuilder) ? b : new GradientBuilder(b));
    }
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

    const timePct = this._timePercent();
    for (let i = 0; i < 4; i++) {
      const sampled = this.builders[i].sampleAt(timePct);
      this._cachedColors[i].setRGB(sampled.x, sampled.y, sampled.z);
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

  _timePercent() {
    const dayPct = Math.min(1, this.time / Math.max(this.dayTimeSec, 0.001));
    const nightPct = Math.max(0, (this.time - this.dayTimeSec) / Math.max(this.nightTimeSec, 0.001));
    return (dayPct + nightPct) * 0.5;
  }

  _updateUniforms() {
    const mat = this.material;
    mat.setGradientColors(this._cachedColors);
    mat.setGradientPositions(this.bandPositions);
    mat.uniforms.sunDir.value.copy(this.sunDir);
    mat.uniforms.sunColor.value.set(this.sunColor.r, this.sunColor.g, this.sunColor.b);
    mat.uniforms.sunStrength.value = this.sunStrength;
    mat.uniforms.sunSharpness.value = this.sunSharpness;
    mat.uniforms.sunGlowStrength.value = this.sunGlowStrength;
    mat.uniforms.sunDiscSize.value = this.sunDiscSize;
    mat.uniforms.nightVisibility.value = this.nightVisibility;
    mat.uniforms.time.value = this.time;
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

export function createSkyGradientPreset(zoneAtmosphere) {
  const top = new THREE.Color(zoneAtmosphere.skyTop);
  const horizon = new THREE.Color(zoneAtmosphere.horizon);
  const fog = new THREE.Color(zoneAtmosphere.fog);
  const sun = new THREE.Color(zoneAtmosphere.sunColor);

  // fogBase matches the renderer clear color for seamless blending
  const fogBase = fog.clone().lerp(horizon, 0.22);

  // Night colors
  const nightLow = fog.clone().lerp(new THREE.Color(0x000020), 0.75).multiplyScalar(0.35);
  const nightHigh = fog.clone().lerp(new THREE.Color(0x000010), 0.85).multiplyScalar(0.15);

  // Sunrise/sunset with more sun influence for warmth
  const sunrise = new THREE.Color().lerpColors(horizon, sun, 0.5);
  const sunset = new THREE.Color().lerpColors(horizon, sun, 0.6);

  // Day colors: bottom matches fogBase for seamless horizon blending
  const dayLow = fogBase.clone();
  const dayHigh = top.clone().lerp(new THREE.Color(0xaaccff), 0.15);

  return [
    // Band 0: bottom horizon — warm, bright
    new GradientBuilder({
      sunriseColor: sunrise,
      dayLowColor: dayLow,
      dayHighColor: dayHigh,
      sunsetColor: sunset,
      nightLowColor: nightLow,
      nightHighColor: nightHigh,
    }),
    // Band 1: lower mid
    new GradientBuilder({
      sunriseColor: new THREE.Color().lerpColors(sunrise, top, 0.2),
      dayLowColor: new THREE.Color().lerpColors(dayLow, top, 0.15),
      dayHighColor: dayHigh,
      sunsetColor: new THREE.Color().lerpColors(sunset, top, 0.2),
      nightLowColor: nightLow,
      nightHighColor: nightHigh,
    }),
    // Band 2: upper mid
    new GradientBuilder({
      sunriseColor: new THREE.Color().lerpColors(sunrise, top, 0.4),
      dayLowColor: new THREE.Color().lerpColors(dayLow, top, 0.35),
      dayHighColor: dayHigh,
      sunsetColor: new THREE.Color().lerpColors(sunset, top, 0.4),
      nightLowColor: nightLow,
      nightHighColor: nightHigh,
    }),
    // Band 3: zenith — deeper blue
    new GradientBuilder({
      sunriseColor: new THREE.Color().lerpColors(sunrise, top, 0.6),
      dayLowColor: top.clone(),
      dayHighColor: dayHigh,
      sunsetColor: new THREE.Color().lerpColors(sunset, top, 0.6),
      nightLowColor: nightHigh,
      nightHighColor: nightHigh,
    }),
  ];
}
