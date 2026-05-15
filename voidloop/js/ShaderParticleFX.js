import * as THREE from 'three';

/*
 * Shader point-sprite particle burst adapted from Bobby Roe's
 * Simple-Particle-Effects getParticleSystem.js.
 *
 * Source: https://github.com/bobbyroe/Simple-Particle-Effects
 * License: MIT, copyright (c) 2024 Bobby Roe.
 */

const TEXTURE_BASE = '../../brackeys_vfx_bundle/particles/alpha/';

const VERTEX_SHADER = `
uniform float pointMultiplier;

attribute float size;
attribute float angle;
attribute vec4 aColor;

varying vec4 vColor;
varying vec2 vAngle;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = size * pointMultiplier / max(0.001, gl_Position.w);

  vAngle = vec2(cos(angle), sin(angle));
  vColor = aColor;
}`;

const FRAGMENT_SHADER = `
uniform sampler2D diffuseTexture;

varying vec4 vColor;
varying vec2 vAngle;

void main() {
  vec2 coords = (gl_PointCoord - 0.5) * mat2(vAngle.x, vAngle.y, -vAngle.y, vAngle.x) + 0.5;
  vec4 texel = texture2D(diffuseTexture, coords);
  gl_FragColor = texel * vColor;
}`;

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const easeOutCubic = (value) => 1 - Math.pow(1 - clamp01(value), 3);
const easeInCubic = (value) => {
  const t = clamp01(value);
  return t * t * t;
};

function lerpColor(out, a, b, t) {
  out.copy(a).lerp(b, clamp01(t));
  return out;
}

class ShaderParticleBurst {
  constructor(scene, texture, origin, opts = {}) {
    this.scene = scene;
    this.texture = texture;
    this.origin = origin.clone();
    this.life = opts.life || 1.45;
    this.age = 0;
    this.particles = [];
    this.tmpColor = new THREE.Color();
    this.positions = null;
    this.sizes = null;
    this.colors = null;
    this.angles = null;
    this.group = new THREE.Group();
    this.group.position.copy(this.origin);
    this.scene.add(this.group);

    this._createParticles(opts);
    this._createPoints();
    this._createRingSprites(opts.ringTexture || texture, opts);
  }

  _createParticles(opts) {
    const count = opts.count || 76;
    const baseHue = opts.baseHue ?? 0.13;
    const level = Math.max(1, opts.level || 1);
    const radiusScale = opts.radiusScale ?? 1;
    const liftScale = opts.liftScale ?? 1;
    const speedScale = opts.speedScale ?? 1;
    const sizeScale = opts.sizeScale ?? 1;

    for (let i = 0; i < count; i++) {
      const lane = i / count;
      const turn = lane * Math.PI * 5.5;
      const radius = (0.18 + Math.random() * 0.5 + (i % 7) * 0.025) * radiusScale;
      const spiral = new THREE.Vector3(Math.cos(turn) * radius, 0.05 + Math.random() * 0.35, Math.sin(turn) * radius);
      const outward = spiral.clone().setY(0).normalize();
      if (outward.lengthSq() < 0.001) outward.set(1, 0, 0);

      const lift = (1.0 + Math.random() * 2.6 + level * 0.08) * liftScale;
      const speed = (1.2 + Math.random() * 3.2) * speedScale;
      const colorA = new THREE.Color().setHSL(baseHue + Math.random() * 0.08, 0.95, 0.62);
      const colorB = Math.random() > 0.34
        ? new THREE.Color(0x52f7a1)
        : new THREE.Color(0xffffff);

      this.particles.push({
        start: spiral,
        velocity: outward.multiplyScalar(speed).add(new THREE.Vector3(0, lift, 0)),
        swirl: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 2.6),
        size: (22 + Math.random() * 30 + level * 1.5) * sizeScale,
        life: this.life * (0.62 + Math.random() * 0.42),
        delay: Math.random() * 0.12,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 5.5,
        colorA,
        colorB,
      });
    }
  }

  _createPoints() {
    const count = this.particles.length;
    this.positions = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.colors = new Float32Array(count * 4);
    this.angles = new Float32Array(count);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 4));
    geometry.setAttribute('angle', new THREE.BufferAttribute(this.angles, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        diffuseTexture: { value: this.texture },
        pointMultiplier: {
          value: window.innerHeight / (2.0 * Math.tan(30.0 * Math.PI / 180.0)),
        },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      transparent: true,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.group.add(this.points);
  }

  _createRingSprites(texture, opts) {
    this.rings = [];
    const ringCount = opts.ringCount ?? 3;
    const colors = [0xfacc15, 0x52f7a1, 0xffffff];
    for (let i = 0; i < ringCount; i++) {
      const material = new THREE.SpriteMaterial({
        map: texture,
        color: colors[i],
        transparent: true,
        opacity: i === 0 ? 0.65 : 0.36,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.y = 0.7 + i * 0.18;
      sprite.scale.setScalar(0.35 + i * 0.12);
      this.group.add(sprite);
      this.rings.push({
        sprite,
        material,
        start: 0.35 + i * 0.18,
        end: (opts.ringScale || 3.6) + i * 0.75,
        delay: i * 0.08,
      });
    }
  }

  update(dt) {
    this.age += dt;
    if (this.material) {
      this.material.uniforms.pointMultiplier.value = window.innerHeight / (2.0 * Math.tan(30.0 * Math.PI / 180.0));
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const localAge = Math.max(0, this.age - p.delay);
      const t = clamp01(localAge / p.life);
      const alive = localAge > 0 && t < 1;
      const spiralAngle = p.swirl * t;
      const cos = Math.cos(spiralAngle);
      const sin = Math.sin(spiralAngle);
      const sx = p.start.x * cos - p.start.z * sin;
      const sz = p.start.x * sin + p.start.z * cos;

      const px = sx + p.velocity.x * localAge;
      const py = p.start.y + p.velocity.y * localAge - (p.gravity ?? 1.75) * localAge * localAge;
      const pz = sz + p.velocity.z * localAge;
      const alpha = alive ? Math.sin(Math.PI * t) * (1 - easeInCubic(Math.max(0, t - 0.55) / 0.45)) : 0;
      const size = alive ? p.size * (0.22 + easeOutCubic(t) * 0.95) : 0;
      const color = lerpColor(this.tmpColor, p.colorA, p.colorB, t);

      const posIndex = i * 3;
      const colorIndex = i * 4;
      this.positions[posIndex] = px;
      this.positions[posIndex + 1] = py;
      this.positions[posIndex + 2] = pz;
      this.sizes[i] = size;
      this.angles[i] = p.angle + p.spin * localAge;
      this.colors[colorIndex] = color.r;
      this.colors[colorIndex + 1] = color.g;
      this.colors[colorIndex + 2] = color.b;
      this.colors[colorIndex + 3] = alpha;
    }

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.size.needsUpdate = true;
    this.points.geometry.attributes.aColor.needsUpdate = true;
    this.points.geometry.attributes.angle.needsUpdate = true;

    for (const ring of this.rings) {
      const t = clamp01((this.age - ring.delay) / (this.life * 0.65));
      const scale = ring.start + (ring.end - ring.start) * easeOutCubic(t);
      ring.sprite.scale.set(scale, scale, scale);
      ring.sprite.material.opacity = Math.max(0, (1 - t) * 0.55);
      ring.sprite.material.rotation += dt * 1.8;
    }

    return this.age < this.life + 0.18;
  }

  dispose() {
    if (this.points) {
      this.group.remove(this.points);
      this.points.geometry.dispose();
      this.material.dispose();
    }
    for (const ring of this.rings || []) {
      this.group.remove(ring.sprite);
      ring.material.dispose();
    }
    this.scene.remove(this.group);
  }
}

export class ShaderParticleFX {
  constructor(scene) {
    this.scene = scene;
    this.loader = new THREE.TextureLoader();
    this.textures = new Map();
    this.effects = [];
  }

  _texture(filename) {
    if (this.textures.has(filename)) return this.textures.get(filename);
    const texture = this.loader.load(TEXTURE_BASE + filename);
    texture.flipY = false;
    this.textures.set(filename, texture);
    return texture;
  }

  playLetterLevelUp(letter, worldPosition, oldLevel = 1, newLevel = 2) {
    if (!worldPosition) return null;
    const charCode = String(letter || 'A').toUpperCase().charCodeAt(0) || 65;
    const hue = ((charCode - 65) / 26) * 0.72 + 0.08;
    const origin = worldPosition.clone();
    origin.y += 0.75;

    const burst = new ShaderParticleBurst(
      this.scene,
      this._texture('star_06_a.png'),
      origin,
      {
        count: 72 + Math.min(36, Math.max(0, newLevel - oldLevel) * 10),
        life: 1.45,
        level: newLevel,
        baseHue: hue % 1,
        ringTexture: this._texture('circle_03_a.png'),
        ringScale: 3.4 + newLevel * 0.12,
      }
    );
    this.effects.push(burst);
    return burst;
  }

  playLetterPickup(letter, worldPosition) {
    if (!worldPosition) return null;
    const charCode = String(letter || 'A').toUpperCase().charCodeAt(0) || 65;
    const hue = ((charCode - 65) / 26) * 0.72 + 0.08;
    const origin = worldPosition.clone();
    origin.y += 0.95;

    const burst = new ShaderParticleBurst(
      this.scene,
      this._texture('spark_04_a.png'),
      origin,
      {
        count: 18,
        life: 0.58,
        level: 1,
        baseHue: hue % 1,
        ringCount: 0,
        radiusScale: 0.28,
        liftScale: 0.45,
        speedScale: 0.28,
        sizeScale: 0.34,
      }
    );
    this.effects.push(burst);
    return burst;
  }

  update(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const alive = this.effects[i].update(dt);
      if (!alive) {
        this.effects[i].dispose();
        this.effects.splice(i, 1);
      }
    }
  }

  clear() {
    for (const effect of this.effects) effect.dispose();
    this.effects = [];
  }
}
