import * as THREE from 'three';
import { SFXMapper } from '../SFXMapper.js';
import { GAME } from '../constants.js';

export class MissileStrikeSystem {
  constructor(game) {
    this.game = game;
    this.activeMissiles = [];
    this.missileStrikeCooldown = 0;
  }

  tryFire() {
    if (!this.game.progression.state.missile.unlocked) {
      this.game.ui.showFloatingText('Unlock missile strike first', 0xffaa00);
      SFXMapper.swingMiss();
      return false;
    }
    if (this.missileStrikeCooldown > 0) {
      if (!this.game.progression.spendMissileCharge()) {
        this.game.ui.showFloatingText(`${this.missileStrikeCooldown.toFixed(1)}s`, 0xffaa00);
        SFXMapper.swingMiss();
        return false;
      }
    }

    const payload = this._buildMissileStrikePayload();
    if (!payload) {
      this.game.ui.showFloatingText('No strike target', 0xff4444);
      SFXMapper.swingMiss();
      return false;
    }

    this.missileStrikeCooldown = this.game.progression.getMissileCooldown();
    this.call(payload, { sync: true });
    this.game.ui.showFloatingText('Missile strike', 0xffaa00);
    return true;
  }

  _buildMissileStrikePayload() {
    const center = this._getMissileStrikeCenter();
    if (!center) return null;

    const range = this.game.progression.getMissileCountRange();
    const min = range.min || GAME.MISSILE_STRIKE_MIN || 3;
    const max = range.max || GAME.MISSILE_STRIKE_MAX || min;
    const count = min + Math.floor(Math.random() * (max - min + 1));
    const missiles = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spread = i === 0 ? Math.random() * 0.8 : 1.9 + Math.random() * 4.3;
      const x = center.x + Math.cos(angle) * spread;
      const z = center.z + Math.sin(angle) * spread;
      const target = this._getGroundedStrikePoint(x, z, center.y);
      const start = target.clone().add(new THREE.Vector3(
        -5 + Math.random() * 10,
        28 + Math.random() * 12,
        -5 + Math.random() * 10
      ));

      missiles.push({
        sx: start.x,
        sy: start.y,
        sz: start.z,
        tx: target.x,
        ty: target.y,
        tz: target.z,
        delay: i * 0.14 + Math.random() * 0.12,
        duration: 0.42 + Math.random() * 0.18,
      });
    }

    return {
      radius: this.game.progression.getMissileRadius(),
      damage: GAME.MISSILE_STRIKE_DAMAGE,
      missiles,
    };
  }

  _getMissileStrikeCenter() {
    const aim = this.game._getMiningAim();
    const terrain = this.game.world?.terrainMesh;
    if (terrain?.raycast) {
      const dirs = this.game.cameraMode === 'thirdPerson'
        ? [aim.direction.clone()]
        : [
          aim.direction.clone().normalize(),
          aim.direction.clone().multiplyScalar(0.75).add(new THREE.Vector3(0, -0.55, 0)).normalize(),
          new THREE.Vector3(0, -1, 0),
        ];
      for (const dir of dirs) {
        const raycaster = new THREE.Raycaster(aim.origin, dir, 0.05, 70);
        const hit = terrain.raycast(raycaster);
        if (hit?.point) return hit.point.clone();
      }
    }

    const forward = aim.direction.clone();
    forward.y = 0;
    if (forward.lengthSq() < 0.001) forward.set(Math.sin(this.game.player.rotation), 0, Math.cos(this.game.player.rotation));
    forward.normalize();
    const fallback = this.game.player.position.clone().addScaledVector(forward, 7.5);
    return this._getGroundedStrikePoint(fallback.x, fallback.z, fallback.y);
  }

  _getGroundedStrikePoint(x, z, fallbackY = 0) {
    const groundY = this.game.world?.getGroundHeightAt?.(x, z, 80);
    const y = Number.isFinite(groundY) && groundY > -998 ? groundY + 0.12 : fallbackY;
    return new THREE.Vector3(x, y, z);
  }

  call(payload, options = {}) {
    if (!payload?.missiles?.length) return;

    if (this.game.isMultiplayer && this.game.net && options.sync) {
      this.game.net.syncEvent('missile_strike', payload);
    }

    for (const spec of payload.missiles) {
      const start = new THREE.Vector3(spec.sx, spec.sy, spec.sz);
      const target = new THREE.Vector3(spec.tx, spec.ty, spec.tz);
      const visual = this._createMissileVisual(start, target);
      this.activeMissiles.push({
        ...spec,
        start,
        target,
        mesh: visual.mesh,
        marker: visual.marker,
        age: 0,
        trailTimer: 0,
        started: false,
        remote: !!options.remote,
        radius: payload.radius || GAME.MISSILE_STRIKE_RADIUS,
        damage: payload.damage || GAME.MISSILE_STRIKE_DAMAGE,
      });
    }
  }

  _createMissileVisual(start, target) {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2f3338,
      metalness: 0.45,
      roughness: 0.42,
      emissive: 0x331100,
      emissiveIntensity: 0.55,
    });
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xff6a22,
      emissive: 0xff3b00,
      emissiveIntensity: 1.4,
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.82, 10), bodyMat);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.32, 10), noseMat);
    nose.position.y = -0.56;
    nose.rotation.x = Math.PI;
    group.add(body, nose);
    group.position.copy(start);
    const dir = target.clone().sub(start).normalize();
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    group.visible = false;
    this.game.scene.add(group);

    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xff3b00,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const marker = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.025, 8, 48), markerMat);
    marker.rotation.x = Math.PI / 2;
    marker.position.copy(target).add(new THREE.Vector3(0, 0.05, 0));
    this.game.scene.add(marker);

    return { mesh: group, marker };
  }

  update(dt) {
    for (let i = this.activeMissiles.length - 1; i >= 0; i--) {
      const missile = this.activeMissiles[i];
      missile.age += dt;

      if (missile.marker) {
        const pulse = 1 + Math.sin(missile.age * 18) * 0.12;
        missile.marker.scale.setScalar(pulse);
        missile.marker.material.opacity = 0.35 + Math.max(0, Math.sin(missile.age * 18)) * 0.28;
      }

      if (missile.age < missile.delay) continue;

      if (!missile.started) {
        missile.started = true;
        missile.mesh.visible = true;
        SFXMapper.missileIncoming();
      }

      const rawT = Math.min(1, (missile.age - missile.delay) / Math.max(0.05, missile.duration));
      const t = 1 - Math.pow(1 - rawT, 2.4);
      missile.mesh.position.lerpVectors(missile.start, missile.target, t);

      missile.trailTimer -= dt;
      if (missile.trailTimer <= 0) {
        missile.trailTimer = 0.035;
        const trailPos = missile.mesh.position.clone();
        this.game.particles.spawn({ pos: trailPos, count: 2, color: 0x3b352f, speed: 1.1, life: 0.45, size: 0.32, texture: 'smoke' });
        this.game.particles.spawn({ pos: trailPos, count: 1, color: 0xff7a18, speed: 0.8, life: 0.24, size: 0.2, texture: 'flare' });
      }

      if (rawT >= 1) {
        const impact = this._getGroundedStrikePoint(missile.target.x, missile.target.z, missile.target.y);
        this._removeMissileVisual(missile);
        this.game._explodeMissile(impact, {
          radius: missile.radius,
          damage: missile.damage,
          remote: missile.remote,
        });
        this.activeMissiles.splice(i, 1);
      }
    }
  }

  _removeMissileVisual(missile) {
    for (const obj of [missile.mesh, missile.marker]) {
      if (!obj) continue;
      this.game.scene.remove(obj);
      obj.traverse?.((child) => {
        child.geometry?.dispose?.();
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose?.());
        } else {
          child.material?.dispose?.();
        }
      });
      obj.geometry?.dispose?.();
      obj.material?.dispose?.();
    }
  }
}
