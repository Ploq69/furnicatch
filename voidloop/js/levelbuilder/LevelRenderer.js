// ==========================================
// Voidloop Level Builder — Scene Renderer
// ==========================================

import * as THREE from 'three';
import { Block } from '../Block.js';
import { assetLoader } from '../AssetLoader.js';
import { TILE_CATALOG, PROP_CATALOG, getBlockTypeForTile } from './LevelCatalog.js';
import { BLOCK_TYPES } from '../constants.js';
import { glyph3D } from '../../../js/Glyph3DManager.js';

const GHOST_MAT = new THREE.MeshStandardMaterial({
  color: 0xffffff, transparent: true, opacity: 0.5,
});
const GHOST_MAT_INVALID = new THREE.MeshStandardMaterial({
  color: 0xff0000, transparent: true, opacity: 0.5,
});

export class LevelRenderer {
  constructor(scene) {
    this.scene = scene;
    this.blockMeshes = new Map(); // key: "x,y,z" → Block
    this.propMeshes = new Map();  // id → Object3D
    this.floatBlockMeshes = new Map(); // id → Block
    this.tokenMeshes = new Map(); // id → Object3D
    this.enemyMeshes = new Map(); // id → Object3D
    this.startMesh = null;
    this.exitMesh = null;
    this.ghostMesh = null;
    this.groundPlane = null;
    this._createGroundPlane();
  }

  _createGroundPlane(width = 24, depth = 24) {
    if (this.groundPlane) {
      this.scene.remove(this.groundPlane);
    }
    const geo = new THREE.PlaneGeometry(width + 4, depth + 4);
    const mat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    this.groundPlane = new THREE.Mesh(geo, mat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = -0.51;
    this.groundPlane.receiveShadow = true;
    this.scene.add(this.groundPlane);
  }

  resizeGroundPlane(width, depth) {
    this._createGroundPlane(width, depth);
  }

  clear() {
    for (const block of this.blockMeshes.values()) {
      if (block.mesh) this.scene.remove(block.mesh);
    }
    this.blockMeshes.clear();
    for (const mesh of this.propMeshes.values()) {
      this.scene.remove(mesh);
    }
    this.propMeshes.clear();
    for (const block of this.floatBlockMeshes.values()) {
      if (block.mesh) this.scene.remove(block.mesh);
    }
    this.floatBlockMeshes.clear();
    for (const mesh of this.tokenMeshes.values()) {
      this.scene.remove(mesh);
    }
    this.tokenMeshes.clear();
    for (const mesh of this.enemyMeshes.values()) {
      this.scene.remove(mesh);
    }
    this.enemyMeshes.clear();
    if (this.startMesh) { this.scene.remove(this.startMesh); this.startMesh = null; }
    if (this.exitMesh) { this.scene.remove(this.exitMesh); this.exitMesh = null; }
    if (this.ghostMesh) { this.scene.remove(this.ghostMesh); this.ghostMesh = null; }
  }

  // ---------- Tiles ----------

  async syncTiles(tilesMap) {
    // Remove blocks that no longer exist
    for (const [key, block] of this.blockMeshes) {
      const [bx, by, bz] = key.split(',').map(Number);
      const colKey = `${bx},${bz}`;
      const t = tilesMap.get(colKey);
      if (!t) {
        if (block.mesh) this.scene.remove(block.mesh);
        this.blockMeshes.delete(key);
        continue;
      }
      // Check if this y-level still exists
      const yIdx = by; // block position.y
      if (yIdx < 0 || yIdx >= t.height || t.type !== block.typeKey) {
        if (block.mesh) this.scene.remove(block.mesh);
        this.blockMeshes.delete(key);
      }
    }

    // Add missing blocks
    for (const t of tilesMap.values()) {
      const blockType = getBlockTypeForTile(t.type);
      for (let dy = 0; dy < t.height; dy++) {
        const key = `${t.x},${t.y + dy},${t.z}`;
        if (!this.blockMeshes.has(key)) {
          const block = new Block(blockType, t.x, t.y + dy, t.z);
          await block.createMesh(this.scene);
          this.blockMeshes.set(key, block);
        }
      }
    }
  }

  // ---------- Props ----------

  async syncProps(props) {
    // Remove old
    const currentIds = new Set(props.map(p => p.id));
    for (const [id, mesh] of this.propMeshes) {
      if (!currentIds.has(id)) {
        this.scene.remove(mesh);
        this.propMeshes.delete(id);
      }
    }
    // Add/update
    for (const p of props) {
      let mesh = this.propMeshes.get(p.id);
      if (!mesh) {
        mesh = await this._loadPropMesh(p);
        if (mesh) {
          this.propMeshes.set(p.id, mesh);
          this.scene.add(mesh);
        }
      }
      if (mesh) {
        mesh.position.set(p.x, p.y, p.z);
        mesh.rotation.y = (p.rotation || 0) * (Math.PI / 180);
        mesh.scale.setScalar(p.scale || 1);
      }
    }
  }

  async _loadPropMesh(p) {
    const def = PROP_CATALOG[p.assetId];
    if (!def || !def.model) return null;
    try {
      await assetLoader.loadGLTF(def.model);
      const cloned = assetLoader.cloneModel(def.model);
      if (!cloned || !cloned.scene) return null;
      return cloned.scene;
    } catch (e) {
      console.warn('[LevelRenderer] Failed to load prop:', p.assetId, e);
      // Fallback cube
      const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
      return new THREE.Mesh(geo, mat);
    }
  }

  // ---------- Tokens ----------

  syncTokens(tokens) {
    const currentIds = new Set(tokens.map(t => t.id));
    for (const [id, mesh] of this.tokenMeshes) {
      if (!currentIds.has(id)) {
        this.scene.remove(mesh);
        this.tokenMeshes.delete(id);
      }
    }
    for (const t of tokens) {
      let mesh = this.tokenMeshes.get(t.id);
      if (!mesh) {
        mesh = glyph3D.createGlyph(t.value, 'reward');
        if (mesh) {
          mesh.scale.setScalar(0.8);
          this.tokenMeshes.set(t.id, mesh);
          this.scene.add(mesh);
        }
      }
      if (mesh) {
        mesh.position.set(t.x, (t.y || 0) + 0.5, t.z);
      }
    }
  }

  // ---------- Enemies (proxies) ----------

  syncEnemies(enemies) {
    const currentIds = new Set(enemies.map(e => e.id));
    for (const [id, mesh] of this.enemyMeshes) {
      if (!currentIds.has(id)) {
        this.scene.remove(mesh);
        this.enemyMeshes.delete(id);
      }
    }
    for (const e of enemies) {
      let mesh = this.enemyMeshes.get(e.id);
      if (!mesh) {
        // Proxy: colored capsule
        const geo = new THREE.CapsuleGeometry(0.3, 0.6, 4, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
        mesh = new THREE.Mesh(geo, mat);
        this.enemyMeshes.set(e.id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(e.x, 0.6, e.z);
    }
  }

  // ---------- Start / Exit Markers ----------

  syncStart(start) {
    if (this.startMesh) this.scene.remove(this.startMesh);
    if (!start) return;
    const geo = new THREE.ConeGeometry(0.3, 0.6, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x22ff22, emissive: 0x22ff22, emissiveIntensity: 0.5 });
    this.startMesh = new THREE.Mesh(geo, mat);
    this.startMesh.position.set(start.x, 0.8, start.z);
    this.scene.add(this.startMesh);
  }

  syncExit(exit) {
    if (this.exitMesh) this.scene.remove(this.exitMesh);
    if (!exit) return;
    const geo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 0.5 });
    this.exitMesh = new THREE.Mesh(geo, mat);
    this.exitMesh.position.set(exit.x, 0.5, exit.z);
    this.scene.add(this.exitMesh);
  }

  // ---------- Ghost Preview ----------

  async showGhost(propDef, x, y, z, rotation = 0, valid = true) {
    if (this.ghostMesh) {
      this.scene.remove(this.ghostMesh);
      this.ghostMesh = null;
    }
    if (!propDef || !propDef.model) return;
    try {
      await assetLoader.loadGLTF(propDef.model);
      const cloned = assetLoader.cloneModel(propDef.model);
      if (!cloned || !cloned.scene) return;
      this.ghostMesh = cloned.scene;
      this.ghostMesh.position.set(x, y, z);
      this.ghostMesh.rotation.y = rotation * (Math.PI / 180);
      this.ghostMesh.traverse(c => {
        if (c.isMesh && c.material) {
          c.material = (valid ? GHOST_MAT : GHOST_MAT_INVALID).clone();
        }
      });
      this.scene.add(this.ghostMesh);
    } catch (e) {
      // ignore ghost load failures
    }
  }

  hideGhost() {
    if (this.ghostMesh) {
      this.scene.remove(this.ghostMesh);
      this.ghostMesh = null;
    }
  }

  // ---------- Full Sync ----------

  async sync(state) {
    await this.syncTiles(state.tiles);
    await this.syncProps(state.props);
    await this.syncFloatBlocks(state.floatingBlocks);
    this.syncTokens(state.tokens);
    this.syncEnemies(state.enemies);
    this.syncStart(state.doc.start);
    this.syncExit(state.doc.exit);
  }

  // ---------- Floating Blocks ----------

  async syncFloatBlocks(floatBlocks) {
    // Remove blocks that no longer exist
    const currentIds = new Set(floatBlocks.map(fb => fb.id));
    for (const [id, block] of this.floatBlockMeshes) {
      if (!currentIds.has(id)) {
        if (block.mesh) this.scene.remove(block.mesh);
        if (block._glowLight) this.scene.remove(block._glowLight);
        this.floatBlockMeshes.delete(id);
      }
    }
    // Add/update
    for (const fb of floatBlocks) {
      let block = this.floatBlockMeshes.get(fb.id);
      if (!block) {
        const typeKey = fb.type || 'crystal';
        block = new Block(typeKey, fb.x, fb.y, fb.z);
        await block.createMesh(this.scene);
        if (block.mesh) {
          // Apply custom rotation and scale (multiply by base visual scale 0.5)
          block.mesh.rotation.y = (fb.rotation || 0) * (Math.PI / 180);
          block.mesh.scale.setScalar(0.5 * (fb.scale || 1));
          // Add glow light at visual center
          const glowColor = fb.glowColor || (BLOCK_TYPES[typeKey]?.color ?? 0xffffff);
          const light = new THREE.PointLight(glowColor, 0.6, 4);
          light.position.set(fb.x + 0.5, fb.y + 0.5 + 0.5, fb.z + 0.5);
          this.scene.add(light);
          block._glowLight = light;
          block._bobPhase = fb.bobPhase || 0;
          this.floatBlockMeshes.set(fb.id, block);
        }
      }
      if (block && block.mesh) {
        // Update bobbing animation
        const bob = Math.sin(Date.now() * 0.0015 + block._bobPhase) * 0.08;
        block.mesh.position.y = fb.y + 0.5 + bob;
        block.mesh.rotation.y += 0.005; // slow idle rotation
        if (block._glowLight) {
          block._glowLight.position.y = fb.y + 0.5 + 0.5 + bob;
        }
      }
    }
  }
}
