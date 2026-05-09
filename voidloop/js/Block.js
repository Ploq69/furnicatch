import * as THREE from 'three';
import { BLOCK_TYPES, GAME } from './constants.js';
import { SFXMapper } from './SFXMapper.js';

const SHARED_GEO = new THREE.BoxGeometry(GAME.BLOCK_SIZE, GAME.BLOCK_SIZE, GAME.BLOCK_SIZE);

const MAT_CACHE = new Map();
function getMaterial(typeKey, color) {
  if (!MAT_CACHE.has(typeKey)) {
    MAT_CACHE.set(typeKey, new THREE.MeshStandardMaterial({
      color: color,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.8,
      metalness: 0.1,
    }));
  }
  return MAT_CACHE.get(typeKey);
}

// Reusable mini HP bar geometry
const HP_GEO = new THREE.BoxGeometry(0.9, 0.08, 0.08);
const HP_BG_MAT = new THREE.MeshBasicMaterial({ color: 0x333333 });
const HP_FG_MAT = new THREE.MeshBasicMaterial({ color: 0x00ff44 });
const HP_WARN_MAT = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
const HP_CRIT_MAT = new THREE.MeshBasicMaterial({ color: 0xff2222 });

export class Block {
  constructor(typeKey, x, y, z) {
    this.typeKey = typeKey;
    this.def = BLOCK_TYPES[typeKey] || BLOCK_TYPES.stone;
    this.hp = this.def.hp;
    this.maxHp = this.hp;
    this.position = new THREE.Vector3(x, y, z);
    this.mesh = null;
    this.destroyed = false;
    this.drop = this.def.drop;
    this.hpBar = null;
    this.hpBarFg = null;
    this.hpBarTimer = 0;
    this.shakeOffset = new THREE.Vector3();
    this.shakeTimer = 0;
  }

  createMesh(scene) {
    const mat = getMaterial(this.typeKey, this.def.color);
    this.mesh = new THREE.Mesh(SHARED_GEO, mat);
    this.mesh.position.copy(this.position);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.block = this;
    scene.add(this.mesh);

    // blockHP: mini HP bar for blocks with >1 HP
    if (this.maxHp > 1) {
      this._createHpBar(scene);
    }

    return this.mesh;
  }

  _createHpBar(scene) {
    const group = new THREE.Group();
    group.position.set(0, 0.6, 0);
    group.visible = false;

    const bg = new THREE.Mesh(HP_GEO, HP_BG_MAT);
    group.add(bg);

    // Foreground — only right half for scale trick
    const fg = new THREE.Mesh(HP_GEO, HP_FG_MAT.clone());
    fg.position.x = 0;
    fg.scale.x = 1;
    group.add(fg);
    this.hpBarFg = fg;

    this.hpBar = group;
    this.mesh.add(this.hpBar);
  }

  _updateHpBar() {
    if (!this.hpBarFg) return;
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpBarFg.scale.x = ratio;
    this.hpBarFg.position.x = -(1 - ratio) * 0.45;

    // Color shift
    if (ratio > 0.5) this.hpBarFg.material = HP_FG_MAT;
    else if (ratio > 0.25) this.hpBarFg.material = HP_WARN_MAT;
    else this.hpBarFg.material = HP_CRIT_MAT;
  }

  takeDamage(dmg) {
    this.hp -= dmg;

    // hitFeedback: shake on every hit
    this.shakeTimer = 0.15;
    this.shakeOffset.set(
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.1
    );

    // Flash white on hit
    if (this.mesh) {
      if (!this.mesh.userData.origMat) {
        this.mesh.userData.origMat = this.mesh.material;
        this.mesh.material = this.mesh.material.clone();
      }
      this.mesh.material.emissive = new THREE.Color(0xffffff);
      this.mesh.material.emissiveIntensity = 0.6;
      setTimeout(() => {
        if (this.mesh && this.mesh.userData.origMat) {
          this.mesh.material.emissive.setHex(0x000000);
          this.mesh.material.emissiveIntensity = 0;
        }
      }, 80);
    }

    this._updateHpBar();
    if (this.hpBar) {
      this.hpBar.visible = true;
      this.hpBarTimer = 2.0;
    }
    SFXMapper.mineHit(this.typeKey);
    return this.hp <= 0;
  }

  update(dt) {
    if (this.hpBarTimer > 0) {
      this.hpBarTimer -= dt;
      if (this.hpBarTimer <= 0 && this.hpBar) {
        this.hpBar.visible = false;
      }
    }
    if (this.shakeTimer > 0 && this.mesh) {
      this.shakeTimer -= dt;
      const decay = this.shakeTimer / 0.15;
      this.mesh.position.x = this.position.x + this.shakeOffset.x * decay;
      this.mesh.position.y = this.position.y + this.shakeOffset.y * decay;
      this.mesh.position.z = this.position.z + this.shakeOffset.z * decay;
      if (this.shakeTimer <= 0) {
        this.mesh.position.copy(this.position);
      }
    }
  }

  destroy(scene, particleSystem) {
    if (this.destroyed) return null;
    this.destroyed = true;
    if (this.mesh) {
      scene.remove(this.mesh);
    }
    SFXMapper.mineBreak(this.typeKey);
    if (particleSystem) {
      particleSystem.dust(this.position, 6);
      if (this.typeKey === 'crystal' || this.typeKey === 'diamond') {
        particleSystem.spark(this.position, 8);
      }
    }
    return this.drop;
  }
}
