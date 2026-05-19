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
    this.ripple = null;
    this.active = false;
    this._createMesh();
  }

  _createMesh() {
    const group = new THREE.Group();

    // ── Circular Platform Base ──
    const platformGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.15, 32);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.8,
      metalness: 0.3,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = 0.075;
    platform.receiveShadow = true;
    group.add(platform);

    // ── Concentric Glow Rings ──
    this.rings = [];
    for (let i = 0; i < 3; i++) {
      const rInner = 0.6 + i * 0.55;
      const rOuter = rInner + 0.08;
      const ringGeo = new THREE.RingGeometry(rInner, rOuter, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x4ade80,
        transparent: true,
        opacity: 0.18 - i * 0.04,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.16;
      group.add(ring);
      this.rings.push(ring);
    }

    // ── Vertical Glow Beam ──
    const beamGeo = new THREE.CylinderGeometry(1.0, 1.0, 8.0, 24, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.beam = new THREE.Mesh(beamGeo, beamMat);
    this.beam.position.y = 4.0;
    group.add(this.beam);

    // ── Inner bright core ──
    const coreGeo = new THREE.CylinderGeometry(0.25, 0.25, 8.0, 12);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xaaffaa,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.core.position.y = 4.0;
    group.add(this.core);

    // ── Ground ripple ring ──
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

    // ── Floating Sign Sprite ──
    this.signSprite = this._createSignSprite();
    this.signSprite.position.set(0, 3.6, 0);
    group.add(this.signSprite);

    // ── Point light ──
    this.light = new THREE.PointLight(0x4ade80, 3.5, 14);
    this.light.position.y = 1.8;
    group.add(this.light);

    this.mesh = group;
    this.scene.add(group);
  }

  _createSignSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Dark rounded panel background
    ctx.fillStyle = 'rgba(10, 18, 12, 0.88)';
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.55)';
    ctx.lineWidth = 6;
    this._roundRect(ctx, 10, 10, 492, 236, 24);
    ctx.fill();
    ctx.stroke();

    // Green inner glow border
    ctx.shadowColor = 'rgba(74, 222, 128, 0.4)';
    ctx.shadowBlur = 30;
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.25)';
    ctx.lineWidth = 3;
    this._roundRect(ctx, 22, 22, 468, 212, 18);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // "DEPOSIT ZONE" text
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 52px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DEPOSIT ZONE', 256, 90);

    // Downward arrow
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 90px "Segoe UI", sans-serif';
    ctx.fillText('⬇', 256, 175);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3.2, 1.6, 1);
    return sprite;
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  setPosition(pos) {
    if (!this.mesh) return;
    this.mesh.position.set(pos.x, 0, pos.z);
    this.active = true;
  }

  update(dt) {
    if (!this.mesh || !this.active) return;

    const time = Date.now() * 0.002;

    // Rings rotation + scale pulse
    if (this.rings) {
      this.rings.forEach((ring, i) => {
        ring.rotation.z += dt * (0.3 + i * 0.15);
        const s = 1 + Math.sin(time * (1.2 + i * 0.4)) * 0.06;
        ring.scale.set(s, s, 1);
      });
    }

    // Beam gentle pulse
    if (this.beam) {
      this.beam.scale.set(
        1 + Math.sin(time * 1.5) * 0.04,
        1,
        1 + Math.sin(time * 1.5) * 0.04
      );
      this.beam.material.opacity = 0.18 + Math.sin(time * 2) * 0.04;
    }

    // Core brighter pulse
    if (this.core) {
      this.core.material.opacity = 0.4 + Math.sin(time * 2.5) * 0.12;
    }

    // Ripple expand/contract
    if (this.ripple) {
      const rippleTime = (Date.now() * 0.001) % 2;
      const rippleScale = 1 + rippleTime * 0.8;
      this.ripple.scale.set(rippleScale, rippleScale, 1);
      this.ripple.material.opacity = 0.15 * (1 - rippleTime / 2);
    }

    // Light flicker
    if (this.light) {
      this.light.intensity = 3.2 + Math.sin(time * 3) * 0.4;
    }

    // Sign bob
    if (this.signSprite) {
      this.signSprite.position.y = 3.6 + Math.sin(time * 1.2) * 0.1;
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
    this.rings = null;
    this.beam = null;
    this.core = null;
    this.signSprite = null;
  }
}
