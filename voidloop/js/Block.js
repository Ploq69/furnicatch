import * as THREE from 'three';
import { BLOCK_TYPES, GAME } from './constants.js';
import { SFXMapper } from './SFXMapper.js';
import { assetLoader } from './AssetLoader.js';

const SHARED_GEO = new THREE.BoxGeometry(GAME.BLOCK_SIZE, GAME.BLOCK_SIZE, GAME.BLOCK_SIZE);

// KayKit BlockBits models are 2×2×2 units centered at origin.
// We scale to 0.5 and offset by +0.5 so each block is exactly 1×1×1
// and sits flush against neighbors with no overlap/gaps.
const BLOCK_VISUAL_SCALE = 0.5;
const BLOCK_VISUAL_OFFSET = 0.5;

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

// Crack overlay geometry — slightly larger box with wireframe material
const CRACK_GEO = new THREE.BoxGeometry(1.02, 1.02, 1.02);
const CRACK_MAT = new THREE.MeshBasicMaterial({
  color: 0x000000, transparent: true, opacity: 0, wireframe: true,
});

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
    this.isFloating = false;
    this.bobPhase = 0;
    this._glowLight = null;
    this._crackMesh = null;
    this._scalePulse = 0;
  }

  _visualPos() {
    return new THREE.Vector3(
      this.position.x + BLOCK_VISUAL_OFFSET,
      this.position.y + BLOCK_VISUAL_OFFSET,
      this.position.z + BLOCK_VISUAL_OFFSET
    );
  }

  async createMesh(scene, options = {}) {
    // If an instancer is provided and this is a ground block, use instanced rendering
    this._instancer = options.instancer || null;
    if (this._instancer && !this.isFloating) {
      await this._instancer.addBlock(this);
      return null; // No individual mesh
    }

    // Try to load the KayKit 3D model
    if (this.def.model) {
      try {
        const gltf = await assetLoader.loadGLTF(this.def.model);
        if (gltf && gltf.scene) {
          this.mesh = gltf.scene.clone();
          // Clone materials so each block can flash independently (unless opted out)
          if (!options.noCloneMaterials) {
            this.mesh.traverse(c => {
              if (c.isMesh && c.material) {
                if (Array.isArray(c.material)) {
                  c.material = c.material.map(m => m.clone());
                } else {
                  c.material = c.material.clone();
                }
              }
            });
          }
          this.mesh.traverse(c => {
            if (c.isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
            }
          });
          this.mesh.scale.setScalar(BLOCK_VISUAL_SCALE);
          this.mesh.position.copy(this._visualPos());
          this.mesh.userData.block = this;
          scene.add(this.mesh);
        }
      } catch (e) {
        console.warn('[Block] Model load failed, falling back to cube:', this.typeKey, e);
      }
    }

    // Fallback colored cube if model missing or failed
    if (!this.mesh) {
      const mat = getMaterial(this.typeKey, this.def.color);
      this.mesh = new THREE.Mesh(SHARED_GEO, mat);
      this.mesh.position.copy(this._visualPos());
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;
      this.mesh.userData.block = this;
      scene.add(this.mesh);
    }

    // blockHP: mini HP bar for blocks with >1 HP
    if (this.maxHp > 1) {
      this._createHpBar(scene);
    }

    // Crack overlay for blocks with >1 HP
    if (this.maxHp > 1) {
      this._createCrackMesh();
    }

    return this.mesh;
  }

  _createHpBar(scene) {
    const group = new THREE.Group();
    group.position.set(0, 0.6, 0);
    group.visible = false;
    group.userData.isOverlay = true;

    const bg = new THREE.Mesh(HP_GEO, HP_BG_MAT);
    bg.userData.isOverlay = true;
    group.add(bg);

    // Foreground — only right half for scale trick
    const fg = new THREE.Mesh(HP_GEO, HP_FG_MAT.clone());
    fg.position.x = 0;
    fg.scale.x = 1;
    fg.userData.isOverlay = true;
    group.add(fg);
    this.hpBarFg = fg;

    this.hpBar = group;
    this.mesh.add(this.hpBar);
  }

  _createCrackMesh() {
    if (!this.mesh) return;
    const crack = new THREE.Mesh(CRACK_GEO, CRACK_MAT.clone());
    crack.visible = false;
    crack.userData.isOverlay = true;
    this.mesh.add(crack);
    this._crackMesh = crack;
  }

  _updateCrackOverlay() {
    if (!this._crackMesh) return;
    const ratio = Math.max(0, this.hp / this.maxHp);
    const damageRatio = 1 - ratio;
    if (damageRatio > 0.05) {
      this._crackMesh.visible = true;
      this._crackMesh.material.opacity = Math.min(0.7, damageRatio * 1.2);
    } else {
      this._crackMesh.visible = false;
    }
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

  _getMeshMaterials() {
    const meshes = [];
    if (this.mesh) {
      this.mesh.traverse(c => {
        // Skip overlay meshes (HP bar, crack overlay) — they use MeshBasicMaterial
        // which has no emissive property and will crash the renderer if modified
        if (c.isMesh && c.material && !c.userData.isOverlay) meshes.push(c);
      });
    }
    return meshes;
  }

  takeDamage(dmg) {
    this.hp -= dmg;

    // hitFeedback: shake on every hit (stronger for floating blocks)
    const shakeAmp = this.isFloating ? 0.25 : 0.15;
    this.shakeTimer = 0.15;
    this.shakeOffset.set(
      (Math.random() - 0.5) * shakeAmp,
      (Math.random() - 0.5) * (shakeAmp * 0.5),
      (Math.random() - 0.5) * shakeAmp
    );

    // Scale pulse on hit
    this._scalePulse = 0.08;

    // Flash white on hit
    if (this._instancer && !this.isFloating) {
      this._instancer.flashBlock(this, 0xffffff, 0.6);
      setTimeout(() => {
        if (!this.destroyed) this._instancer.unflashBlock(this);
      }, 80);
    } else {
      const meshes = this._getMeshMaterials();
      if (meshes.length > 0) {
        if (!this.mesh.userData.origMats) {
          this.mesh.userData.origMats = meshes.map(m => m.material);
          meshes.forEach(m => {
            m.material = Array.isArray(m.material)
              ? m.material.map(mat => mat.clone())
              : m.material.clone();
          });
        }
        meshes.forEach(m => {
          if (m.material.emissive !== undefined) {
            m.material.emissive = new THREE.Color(0xffffff);
            m.material.emissiveIntensity = 0.6;
          }
        });
        setTimeout(() => {
          if (this.mesh && this.mesh.userData.origMats) {
            meshes.forEach(m => {
              if (m.material && m.material.emissive !== undefined && m.material.emissive.setHex) {
                m.material.emissive.setHex(0x000000);
                m.material.emissiveIntensity = 0;
              }
            });
          }
        }, 80);
      }
    }

    this._updateHpBar();
    this._updateCrackOverlay();
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

    // Update instancer transform for shake/scale
    if (this._instancer && !this.isFloating) {
      if (this.shakeTimer > 0 || this._scalePulse > 0) {
        this._instancer.updateBlockTransform(this);
        if (this.shakeTimer > 0) {
          this.shakeTimer -= dt;
          if (this.shakeTimer <= 0) {
            this.shakeOffset.set(0, 0, 0);
            this._instancer.updateBlockTransform(this);
          }
        }
        if (this._scalePulse > 0) {
          this._scalePulse -= dt * 0.5;
          if (this._scalePulse < 0) {
            this._scalePulse = 0;
            this._instancer.updateBlockTransform(this);
          }
        }
        return;
      }
    }

    const v = this._visualPos();
    if (this.shakeTimer > 0 && this.mesh) {
      this.shakeTimer -= dt;
      const decay = this.shakeTimer / 0.15;
      this.mesh.position.x = v.x + this.shakeOffset.x * decay;
      this.mesh.position.y = v.y + this.shakeOffset.y * decay;
      this.mesh.position.z = v.z + this.shakeOffset.z * decay;
      if (this.shakeTimer <= 0) {
        this.mesh.position.copy(v);
      }
    }
    // Scale pulse decay (base scale + pulse)
    if (this._scalePulse > 0 && this.mesh) {
      this._scalePulse -= dt * 0.5;
      if (this._scalePulse < 0) this._scalePulse = 0;
      const pulse = 1 + Math.sin(this._scalePulse * Math.PI / 0.08) * this._scalePulse;
      this.mesh.scale.setScalar(BLOCK_VISUAL_SCALE * pulse);
    }
  }

  destroy(scene, particleSystem) {
    if (this.destroyed) return null;
    this.destroyed = true;
    if (this._instancer && !this.isFloating) {
      this._instancer.removeBlock(this);
    } else if (this.mesh) {
      scene.remove(this.mesh);
    }
    if (this._glowLight) {
      scene.remove(this._glowLight);
      this._glowLight = null;
    }
    SFXMapper.mineBreak(this.typeKey);
    if (particleSystem) {
      const center = this._visualPos();
      // Enhanced destruction VFX based on block type
      if (this.typeKey === 'crystal' || this.typeKey === 'decorative_block_blue' || this.typeKey === 'decorative_block_red') {
        particleSystem.spark(center, 12);
        particleSystem.magic(center, 8);
      } else if (this.typeKey === 'metal' || this.typeKey === 'stone_with_gold') {
        particleSystem.spark(center, 10);
        particleSystem.dust(center, 8);
      } else if (this.typeKey === 'lava') {
        particleSystem.burst(center, 0xff4422, 14);
        particleSystem.spark(center, 6);
      } else {
        particleSystem.dust(center, 6);
        particleSystem.spark(center, 4);
      }
      // Debris fragments for floating blocks
      if (this.isFloating) {
        particleSystem.debris(center, this.def.color || 0x888888);
      }
    }
    return this.drop;
  }
}
