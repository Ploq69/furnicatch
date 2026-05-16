// ==========================================
// Voidloop — 3D Letter Drops from mining
// Uses Glyph3DManager from the main project
// ==========================================

import * as THREE from 'three';
import { glyph3D } from '../../js/Glyph3DManager.js';

const GRAVITY = -15;
const BOUNCE_REST = 0.4;
const MAGNET_RANGE = 4.0;
const MAGNET_ACCEL = 15;
const MAGNET_MAX_SPEED = 12;
const COLLECT_DIST = 1.6;
const LETTER_SCALE = 1.5;
const DESPAWN_TIME = 15;
const MAX_ACTIVE = 30;

export class LetterDrop {
  constructor(scene) {
    this.scene = scene;
    this.drops = [];
    this.preloaded = false;
    this._tmpDir = new THREE.Vector3();
  }

  async preload() {
    if (this.preloaded) return;
    await glyph3D.load();
    this.preloaded = true;
  }

  spawn(pos, letter) {
    if (!this.preloaded || !glyph3D.ready) return null;
    if (this.drops.length >= MAX_ACTIVE) {
      // Remove oldest
      const oldest = this.drops.shift();
      if (oldest && oldest.mesh) {
        this.scene.remove(oldest.mesh);
      }
    }

    const mesh = glyph3D.createGlyph(letter, 'reward');
    if (!mesh) return null;

    mesh.position.copy(pos);
    mesh.position.y += 0.3;
    mesh.scale.setScalar(LETTER_SCALE);
    mesh.castShadow = false;

    this.scene.add(mesh);

    const drop = {
      mesh,
      letter: letter.toUpperCase(),
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
    };

    this.drops.push(drop);
    return drop;
  }

  update(dt, playerPos) {
    let collected = null;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.life -= dt;

      if (d.life <= 0) {
        this._remove(i);
        continue;
      }

      // Despawn fade
      if (d.life < 1.0) {
        this._setOpacity(d.mesh, d.life);
      }

      // Spin
      d.mesh.rotation.y += d.spinSpeed * dt;

      const dx = playerPos.x - d.mesh.position.x;
      const dy = playerPos.y - d.mesh.position.y;
      const dz = playerPos.z - d.mesh.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (d.state === 'bounce') {
        d.velocity.y += GRAVITY * dt;
        d.mesh.position.addScaledVector(d.velocity, dt);

        if (d.mesh.position.y < d.groundY) {
          d.mesh.position.y = d.groundY;
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
        d.mesh.position.y = d.groundY + 0.1 + Math.sin(d.bobPhase) * 0.1;

        if (distSq < MAGNET_RANGE * MAGNET_RANGE) {
          const dist = Math.sqrt(distSq);
          const dir = this._tmpDir.set(dx, dy, dz).multiplyScalar(dist > 0.0001 ? 1 / dist : 0);
          const speed = Math.min(MAGNET_MAX_SPEED, MAGNET_ACCEL * (MAGNET_RANGE - dist));
          d.mesh.position.addScaledVector(dir, speed * dt);
        }
      }

      // Collect
      if (distSq < COLLECT_DIST * COLLECT_DIST) {
        collected = {
          letter: d.letter,
          position: d.mesh.position.clone(),
        };
        this._remove(i);
      }
    }
    return collected;
  }

  _remove(index) {
    const d = this.drops[index];
    if (d.mesh) {
      this.scene.remove(d.mesh);
      // Dispose cloned materials to avoid leaks (geometry is shared prototype)
      d.mesh.traverse((child) => {
        if (child.isMesh && child.material && child.material.dispose) {
          child.material.dispose();
        }
      });
    }
    this.drops.splice(index, 1);
  }

  _setOpacity(root, opacity) {
    root.traverse((c) => {
      if (c.isMesh && c.material) {
        c.material.opacity = opacity;
        c.material.transparent = opacity < 1;
      }
    });
  }

  clear() {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      this._remove(i);
    }
  }
}
