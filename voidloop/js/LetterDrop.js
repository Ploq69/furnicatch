// ==========================================
// Voidloop — 3D Letter Drops (Instanced)
// Uses Glyph3DManager geometries with InstancedMesh.
// ==========================================

import * as THREE from 'three';
import { glyph3D } from '../../js/Glyph3DManager.js';
import { DropInstancer } from './DropInstancer.js';

const GRAVITY = -15;
const BOUNCE_REST = 0.4;
const MAGNET_RANGE = 4.0;
const MAGNET_ACCEL = 15;
const MAGNET_MAX_SPEED = 12;
const COLLECT_DIST = 1.6;
const LETTER_SCALE = 1.5;
const DESPAWN_TIME = 15;
const CAPACITY_PER_LETTER = 30; // per letter type
const MAX_ACTIVE = 200;

const _tmpDir = new THREE.Vector3();
const _tmpQuat = new THREE.Quaternion();
const _tmpScale = new THREE.Vector3();
const _tmpPos = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

function extractGeometryAndMaterial(protoGroup) {
  const geometries = [];
  let material = null;
  protoGroup.updateMatrixWorld(true);
  protoGroup.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const geo = child.geometry.clone();
      geo.applyMatrix4(child.matrixWorld);
      geometries.push(geo);
      if (!material && child.material) {
        material = Array.isArray(child.material) ? child.material[0].clone() : child.material.clone();
      }
    }
  });
  if (geometries.length === 0) return null;
  const geometry = geometries[0];
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.95 });
  }
  return { geometry, material };
}

export class LetterDrop {
  constructor(scene) {
    this.scene = scene;
    this.drops = [];
    this.instancer = new DropInstancer(scene);
    this.preloaded = false;
    this._registeredLetters = new Set();
  }

  async preload() {
    if (this.preloaded) return;
    await glyph3D.load();
    if (!glyph3D.ready) {
      console.warn('[LetterDrop] Glyph3D not ready');
      return;
    }
    for (const [letter, proto] of glyph3D.prototypes) {
      const extracted = extractGeometryAndMaterial(proto);
      if (!extracted) continue;
      extracted.geometry.scale(LETTER_SCALE, LETTER_SCALE, LETTER_SCALE);
      extracted.geometry.computeBoundingSphere();
      this.instancer.registerType(letter, extracted.geometry, extracted.material, CAPACITY_PER_LETTER);
      this._registeredLetters.add(letter);
    }
    this.preloaded = true;
  }

  spawn(pos, letter) {
    if (!this.preloaded || !glyph3D.ready) return null;
    const key = String(letter).toUpperCase();
    if (!this._registeredLetters.has(key)) return null;

    if (this.drops.length >= MAX_ACTIVE) {
      const oldest = this.drops[0];
      this._remove(0);
    }

    const index = this.instancer.alloc(key);
    if (index < 0) return null;

    const x = pos.x;
    const y = pos.y + 0.3;
    const z = pos.z;

    _tmpPos.set(x, y, z);
    _tmpQuat.identity();
    _tmpScale.setScalar(1);
    this.instancer.setTransform(key, index, _tmpPos, _tmpQuat, _tmpScale);

    const drop = {
      key,
      index,
      letter: key,
      spinSpeed: 8.0,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        3 + Math.random() * 3,
        (Math.random() - 0.5) * 2
      ),
      groundY: pos.y + 0.05,
      state: 'bounce',
      stateTime: 0,
      life: DESPAWN_TIME,
      bobPhase: Math.random() * Math.PI * 2,
      position: new THREE.Vector3(x, y, z),
      rotY: 0,
      scale: 1,
    };
    this.drops.push(drop);
    return drop;
  }

  update(dt, playerPos) {
    if (!this.preloaded) return null;
    let collected = null;

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.life -= dt;

      if (d.life <= 0) {
        this._remove(i);
        continue;
      }

      let scaleMul = 1;
      if (d.life < 0.5) {
        scaleMul = Math.max(0, d.life / 0.5);
      }

      d.rotY += d.spinSpeed * dt;

      const dx = playerPos.x - d.position.x;
      const dy = playerPos.y - d.position.y;
      const dz = playerPos.z - d.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (d.state === 'bounce') {
        d.velocity.y += GRAVITY * dt;
        d.position.x += d.velocity.x * dt;
        d.position.y += d.velocity.y * dt;
        d.position.z += d.velocity.z * dt;

        if (d.position.y < d.groundY) {
          d.position.y = d.groundY;
          d.velocity.y *= -BOUNCE_REST;
          d.velocity.x *= 0.8;
          d.velocity.z *= 0.8;
        }

        d.stateTime += dt;
        if (d.stateTime > 0.3 && d.velocity.y < 0.5) {
          d.state = 'hover';
          d.velocity.set(0, 0, 0);
        }

        if (distSq < MAGNET_RANGE * MAGNET_RANGE * 0.25 && d.stateTime > 0.1) {
          d.state = 'hover';
        }
      }

      if (d.state === 'hover') {
        d.bobPhase += dt * 3;
        d.position.y = d.groundY + 0.1 + Math.sin(d.bobPhase) * 0.1;

        if (distSq < MAGNET_RANGE * MAGNET_RANGE) {
          const dist = Math.sqrt(distSq);
          const dir = _tmpDir.set(dx, dy, dz).multiplyScalar(dist > 0.0001 ? 1 / dist : 0);
          const speed = Math.min(MAGNET_MAX_SPEED, MAGNET_ACCEL * (MAGNET_RANGE - dist));
          d.position.x += dir.x * speed * dt;
          d.position.y += dir.y * speed * dt;
          d.position.z += dir.z * speed * dt;
        }
      }

      _tmpQuat.setFromAxisAngle(_upAxis, d.rotY);
      _tmpScale.setScalar(scaleMul);
      this.instancer.setTransform(d.key, d.index, d.position, _tmpQuat, _tmpScale);

      if (distSq < COLLECT_DIST * COLLECT_DIST) {
        collected = {
          letter: d.letter,
          position: d.position.clone(),
        };
        this._remove(i);
      }
    }

    this.instancer.upload();
    return collected;
  }

  _remove(i) {
    const d = this.drops[i];
    if (!d) return;
    this.instancer.free(d.key, d.index);
    const last = this.drops.pop();
    if (last && last !== d) this.drops[i] = last;
  }

  clear() {
    this.instancer.clear();
    this.drops = [];
  }
}
