// ==========================================
// Voidloop — Collection Beacon
// 3D entity at zone spawn for deposit + cash-out.
// ==========================================

import * as THREE from 'three';

export class CollectionBeacon {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.light = null;
    this.ring = null;
    this.particles = null;
    this.active = false;
    this._createMesh();
  }

  _createMesh() {
    const group = new THREE.Group();

    // Main pillar — glowing translucent cylinder
    const pillarGeo = new THREE.CylinderGeometry(0.25, 0.35, 2.2, 16);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.y = 1.1;
    group.add(pillar);

    // Inner bright core
    const coreGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.0, 8);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xaaffaa,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 1.1;
    group.add(core);

    // Glow ring on ground
    const ringGeo = new THREE.RingGeometry(0.45, 0.65, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.02;
    group.add(this.ring);

    // Outer ripple ring
    const rippleGeo = new THREE.RingGeometry(0.7, 0.75, 32);
    const rippleMat = new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ripple = new THREE.Mesh(rippleGeo, rippleMat);
    this.ripple.rotation.x = -Math.PI / 2;
    this.ripple.position.y = 0.01;
    group.add(this.ripple);

    // Point light
    this.light = new THREE.PointLight(0x4ade80, 1.8, 10);
    this.light.position.y = 1.8;
    group.add(this.light);

    this.mesh = group;
    this.scene.add(group);
  }

  setPosition(pos) {
    if (!this.mesh) return;
    this.mesh.position.set(pos.x, 0, pos.z);
    this.active = true;
  }

  update(dt) {
    if (!this.mesh || !this.active) return;

    const time = Date.now() * 0.002;

    // Pillar gentle pulse
    const pillar = this.mesh.children[0];
    pillar.scale.set(
      1 + Math.sin(time) * 0.03,
      1 + Math.sin(time * 1.3) * 0.02,
      1 + Math.sin(time) * 0.03
    );

    // Core brighter pulse
    const core = this.mesh.children[1];
    core.material.opacity = 0.6 + Math.sin(time * 2) * 0.15;

    // Ring rotation + scale
    if (this.ring) {
      this.ring.rotation.z += dt * 0.3;
      const s = 1 + Math.sin(time * 1.5) * 0.08;
      this.ring.scale.set(s, s, 1);
    }

    // Ripple expand/contract
    if (this.ripple) {
      const rippleTime = (Date.now() * 0.001) % 2;
      const rippleScale = 1 + rippleTime * 0.5;
      this.ripple.scale.set(rippleScale, rippleScale, 1);
      this.ripple.material.opacity = 0.15 * (1 - rippleTime / 2);
    }

    // Light flicker
    if (this.light) {
      this.light.intensity = 1.8 + Math.sin(time * 3) * 0.3;
    }
  }

  isPlayerNear(playerPos, radius = 3) {
    if (!this.mesh || !this.active) return false;
    const dx = playerPos.x - this.mesh.position.x;
    const dz = playerPos.z - this.mesh.position.z;
    return (dx * dx + dz * dz) < radius * radius;
  }

  getVortexPosition() {
    if (!this.mesh) return new THREE.Vector3(0, 3, 0);
    return new THREE.Vector3(
      this.mesh.position.x,
      this.mesh.position.y + 2.5,
      this.mesh.position.z
    );
  }

  dispose() {
    if (!this.mesh) return;
    this.scene.remove(this.mesh);
    this.mesh.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.mesh = null;
    this.light = null;
    this.ring = null;
    this.ripple = null;
  }
}
