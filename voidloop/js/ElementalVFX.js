import * as THREE from 'three';
import { TEXTURE_MAP } from './ParticleSystem.js';

// Default element presets
export const ELEMENTS = {
  fire:      { name: '🔥 Fire',      particles: ['fire','flame','smoke'],     color: '#ff4400', intensity: 5 },
  ice:       { name: '❄️ Ice',       particles: ['light','spark','smoke'],    color: '#44aaff', intensity: 5 },
  water:     { name: '💧 Water',     particles: ['light','circle','smoke'],   color: '#00ccff', intensity: 5 },
  poison:    { name: '☠️ Poison',    particles: ['twirl','smoke','spark'],    color: '#44ff66', intensity: 5 },
  electric:  { name: '⚡ Electric',  particles: ['spark','circle','flare'],   color: '#ffff88', intensity: 6 },
  arcane:    { name: '🔮 Arcane',    particles: ['magic','star','flare'],     color: '#aa66ff', intensity: 5 },
  explosion: { name: '💥 Explosion', particles: ['smoke','fire','spark'],     color: '#ff6600', intensity: 6 },
  blood:     { name: '🩸 Blood',     particles: ['smoke','spark'],            color: '#cc0000', intensity: 4 },
  holy:      { name: '✨ Holy',      particles: ['star','light','flare'],     color: '#ffd700', intensity: 6 },
  impact:    { name: '💢 Impact',    particles: ['smoke','spark','dirt'],     color: '#ffffff', intensity: 5 },
};

export const DEFAULT_ELEMENT = 'fire';

// Alpha particle textures (single-frame)
export const TEXTURE_KEYS = Object.keys(TEXTURE_MAP);

// Flipbook spritesheets (animated particle textures)
export const FLIPBOOK_TEXTURES = {
  fb_big_hit:       { path: 'brackeys_vfx_bundle/predrawn/big_hit_6x5.png',       cols: 6, rows: 5, frames: 30 },
  fb_blood_impact:  { path: 'brackeys_vfx_bundle/predrawn/blood_impact_6x5.png',  cols: 6, rows: 5, frames: 30 },
  fb_charge:        { path: 'brackeys_vfx_bundle/predrawn/charge_7x6.png',        cols: 7, rows: 6, frames: 42 },
  fb_dithered_fire: { path: 'brackeys_vfx_bundle/predrawn/dithered_fire_6x5.png', cols: 6, rows: 5, frames: 30 },
  fb_electric_ring: { path: 'brackeys_vfx_bundle/predrawn/electric_ring_6x5.png', cols: 6, rows: 5, frames: 30 },
  fb_explosion:     { path: 'brackeys_vfx_bundle/predrawn/explosion_6x5.png',     cols: 6, rows: 5, frames: 30 },
  fb_fire_point:    { path: 'brackeys_vfx_bundle/predrawn/fire_point_6x5.png',    cols: 6, rows: 5, frames: 30 },
  fb_fire_ring:     { path: 'brackeys_vfx_bundle/predrawn/fire_ring_6x5.png',     cols: 6, rows: 5, frames: 30 },
  fb_impact_white:  { path: 'brackeys_vfx_bundle/predrawn/impact_white_6x4.png',  cols: 6, rows: 4, frames: 24 },
  fb_lightstreaks:  { path: 'brackeys_vfx_bundle/predrawn/lightstreaks_6x5.png',  cols: 6, rows: 5, frames: 30 },
  fb_star_explosion:{ path: 'brackeys_vfx_bundle/predrawn/star_explosion_6x5.png',cols: 6, rows: 5, frames: 30 },
  fb_vortex:        { path: 'brackeys_vfx_bundle/predrawn/vortex_6x5.png',        cols: 6, rows: 5, frames: 30 },
  fb_wavy_blue:     { path: 'brackeys_vfx_bundle/predrawn/wavy_blue_6x5.png',     cols: 6, rows: 5, frames: 30 },
  fb_wavy_purple:   { path: 'brackeys_vfx_bundle/predrawn/wavy_purple_6x5.png',   cols: 6, rows: 5, frames: 30 },
};

export const FLIPBOOK_KEYS = Object.keys(FLIPBOOK_TEXTURES);

// Combined keys for the texture picker
export const ALL_TEXTURE_KEYS = [...TEXTURE_KEYS, ...FLIPBOOK_KEYS];

// Preset VFX recipes (Brackeys-style layered effects)
export const VFX_PRESETS = {
  flame_sword: {
    name: '🔥 Flame Sword',
    particleLayers: [
      { texture: 'fb_fire_ring', color: '#ff6600', count: 12, size: 0.5, life: 0.6, speed: 4, gravity: 3, offsetX: 0, offsetY: 0.1, offsetZ: 0, blend: 'additive', loop: true },
      { texture: 'fb_fire_ring', color: '#333333', count: 8,  size: 0.7, life: 1.2, speed: 2, gravity: 5, offsetX: 0, offsetY: 0.1, offsetZ: 0, blend: 'normal',   loop: true },
      { texture: 'spark',        color: '#ffcc00', count: 6,  size: 0.15, life: 0.4, speed: 6, gravity: 2, offsetX: 0, offsetY: 0.1, offsetZ: 0, blend: 'additive', loop: false },
    ],
    color: '#ff6600', intensity: 4,
  },
  frost_weapon: {
    name: '❄️ Frost Weapon',
    particleLayers: [
      { texture: 'fb_wavy_blue', color: '#88ccff', count: 10, size: 0.4, life: 0.8, speed: 2, gravity: 1, offsetX: 0, offsetY: 0.1, offsetZ: 0, blend: 'additive', loop: true },
      { texture: 'light',        color: '#aaddff', count: 8,  size: 0.25, life: 0.5, speed: 3, gravity: 0.5, offsetX: 0, offsetY: 0.1, offsetZ: 0, blend: 'additive', loop: true },
      { texture: 'spark',        color: '#ffffff', count: 4,  size: 0.1, life: 0.3, speed: 5, gravity: 1, offsetX: 0, offsetY: 0.1, offsetZ: 0, blend: 'additive', loop: false },
    ],
    color: '#44aaff', intensity: 3,
  },
  poison_drip: {
    name: '☠️ Poison Drip',
    particleLayers: [
      { texture: 'fb_dithered_fire', color: '#44ff66', count: 8, size: 0.35, life: 0.7, speed: 1, gravity: 7, offsetX: 0, offsetY: 0.1, offsetZ: 0, blend: 'multiply', loop: true },
      { texture: 'smoke',            color: '#228822', count: 6, size: 0.5, life: 1.0, speed: 1.5, gravity: 6, offsetX: 0, offsetY: 0.1, offsetZ: 0, blend: 'normal', loop: true },
      { texture: 'spark',            color: '#66ff88', count: 4, size: 0.1, life: 0.3, speed: 4, gravity: 8, offsetX: 0, offsetY: 0.1, offsetZ: 0, blend: 'additive', loop: false },
    ],
    color: '#44ff66', intensity: 3,
  },
  electric_arc: {
    name: '⚡ Electric Arc',
    particleLayers: [
      { texture: 'fb_electric_ring', color: '#ffff88', count: 10, size: 0.4, life: 0.4, speed: 6, gravity: 0.5, offsetX: 0, offsetY: 0.1, offsetZ: 0, blend: 'additive', loop: true },
      { texture: 'fb_lightstreaks',  color: '#ffffff', count: 6,  size: 0.3, life: 0.3, speed: 8, gravity: 0.2, offsetX: 0, offsetY: 0.1, offsetZ: 0, blend: 'additive', loop: true },
      { texture: 'spark',            color: '#ffffaa', count: 8,  size: 0.12, life: 0.2, speed: 10, gravity: 1, offsetX: 0, offsetY: 0.1, offsetZ: 0, blend: 'additive', loop: false },
    ],
    color: '#ffff88', intensity: 5,
  },
  holy_glow: {
    name: '✨ Holy Glow',
    particleLayers: [
      { texture: 'fb_star_explosion', color: '#ffd700', count: 8, size: 0.35, life: 0.8, speed: 2, gravity: 1.5, offsetX: 0, offsetY: 0.1, offsetZ: 0, blend: 'additive', loop: true },
      { texture: 'light',             color: '#ffee88', count: 6, size: 0.3, life: 0.6, speed: 2.5, gravity: 1, offsetX: 0, offsetY: 0.1, offsetZ: 0, blend: 'additive', loop: true },
      { texture: 'star',              color: '#ffffff', count: 4, size: 0.15, life: 0.4, speed: 4, gravity: 0.5, offsetX: 0, offsetY: 0.1, offsetZ: 0, blend: 'additive', loop: false },
    ],
    color: '#ffd700', intensity: 4,
  },
  none: {
    name: '❌ None',
    particleLayers: [],
    color: '#ffffff', intensity: 0,
  },
};

export const PRESET_KEYS = Object.keys(VFX_PRESETS);

const BRACKEYS_DIR = 'brackeys_vfx_bundle/particles/alpha/';
const STORAGE_KEY = 'vfx_custom_';
const WEAPON_VFX_KEY = 'weapon_vfx_';
const RECIPE_OVERRIDE_KEY = 'vfx_recipe_override_';

// Module-level texture cache shared between preview and gameplay
const _globalTextureCache = new Map();
const _textureLoader = new THREE.TextureLoader();

export async function preloadAllTextures() {
  const promises = [];
  // Preload all flipbook textures
  for (const [key, def] of Object.entries(FLIPBOOK_TEXTURES)) {
    if (_globalTextureCache.has(key)) continue;
    const path = '../../' + def.path;
    promises.push(new Promise((resolve) => {
      _textureLoader.load(path, (tex) => {
        tex.flipY = false;
        tex.userData = { isFlipbook: true, cols: def.cols, rows: def.rows, frames: def.frames };
        _globalTextureCache.set(key, tex);
        resolve(tex);
      }, undefined, () => {
        console.warn('[ElementalVFX] Failed to preload flipbook:', path);
        resolve(null);
      });
    }));
  }
  // Preload all alpha textures
  for (const [key, filename] of Object.entries(TEXTURE_MAP)) {
    if (_globalTextureCache.has(key)) continue;
    const path = '../../' + BRACKEYS_DIR + filename;
    promises.push(new Promise((resolve) => {
      _textureLoader.load(path, (tex) => {
        tex.flipY = false;
        _globalTextureCache.set(key, tex);
        resolve(tex);
      }, undefined, () => {
        console.warn('[ElementalVFX] Failed to preload texture:', path);
        resolve(null);
      });
    }));
  }
  await Promise.all(promises);
  console.log('[ElementalVFX] Preloaded', _globalTextureCache.size, 'textures');
}

function _getCachedTexture(key) {
  return _globalTextureCache.get(key) || null;
}

export function getWeaponVFX(itemId) {
  if (!itemId) return '';
  try {
    return localStorage.getItem(WEAPON_VFX_KEY + itemId) || '';
  } catch (e) { return ''; }
}

export function saveWeaponVFX(itemId, config) {
  if (!itemId) return;
  try {
    if (config && config.particleLayers?.length) {
      localStorage.setItem(WEAPON_VFX_KEY + itemId, JSON.stringify(config));
    } else {
      localStorage.removeItem(WEAPON_VFX_KEY + itemId);
    }
  } catch (e) { console.warn('[ElementalVFX] Failed to save weapon VFX:', e); }
}

export function getWeaponVFXConfig(itemId) {
  if (!itemId) return null;
  try {
    const raw = localStorage.getItem(WEAPON_VFX_KEY + itemId);
    if (!raw) return null;
    // Try parsing as full config object
    const parsed = JSON.parse(raw);
    if (parsed && parsed.particleLayers) return parsed;
    // Fallback: old preset-key format
    if (VFX_PRESETS[raw]) return VFX_PRESETS[raw];
    return null;
  } catch (e) { return null; }
}

// Recipe override save/load
export function saveRecipeOverride(recipeKey, config) {
  if (!recipeKey) return;
  try {
    localStorage.setItem(RECIPE_OVERRIDE_KEY + recipeKey, JSON.stringify(config));
  } catch (e) { console.warn('[ElementalVFX] Failed to save recipe override:', e); }
}

export function getRecipeOverride(recipeKey) {
  if (!recipeKey) return null;
  try {
    const raw = localStorage.getItem(RECIPE_OVERRIDE_KEY + recipeKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

export function resetRecipeOverride(recipeKey) {
  if (!recipeKey) return;
  try {
    localStorage.removeItem(RECIPE_OVERRIDE_KEY + recipeKey);
  } catch (e) { console.warn('[ElementalVFX] Failed to reset recipe override:', e); }
}

export function getRecipeWithOverride(recipeKey) {
  const override = getRecipeOverride(recipeKey);
  if (override) return override;
  return VFX_PRESETS[recipeKey] || null;
}

export function getElementConfig(elementKey) {
  const base = ELEMENTS[elementKey] || ELEMENTS[DEFAULT_ELEMENT];
  const saved = _loadCustom(elementKey);
  if (!saved) return base;
  return { ...base, ...saved };
}

export function saveCustomConfig(elementKey, config) {
  try {
    localStorage.setItem(STORAGE_KEY + elementKey, JSON.stringify(config));
  } catch (e) {
    console.warn('[ElementalVFX] Failed to save custom config:', e);
  }
}

export function resetCustomConfig(elementKey) {
  try {
    localStorage.removeItem(STORAGE_KEY + elementKey);
  } catch (e) {
    console.warn('[ElementalVFX] Failed to reset custom config:', e);
  }
}

function _loadCustom(elementKey) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY + elementKey);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function _parseColor(c) {
  if (typeof c === 'number') return c;
  if (typeof c === 'string' && c.startsWith('#')) {
    return parseInt(c.slice(1), 16);
  }
  return 0xffffff;
}

function _parseBlendMode(mode) {
  switch (mode) {
    case 'additive': return THREE.AdditiveBlending;
    case 'multiply': return THREE.MultiplyBlending;
    default: return THREE.NormalBlending;
  }
}

/** Remove all active VFX particles from the preview scene. */
export function clearVFX(preview) {
  for (const p of preview._vfxParticles) {
    preview.scene.remove(p.mesh);
    p.mesh.geometry.dispose();
    p.mat.dispose();
  }
  preview._vfxParticles.length = 0;
}

/**
 * Main play function. elementOrConfig can be a string key or a full config object.
 */
export async function playElementalVFX(preview, elementOrConfig) {
  if (!preview || !preview.ready || !preview.player?.mesh) {
    console.warn('[ElementalVFX] Preview not ready');
    return;
  }

  let config;
  if (typeof elementOrConfig === 'string') {
    config = getElementConfig(elementOrConfig);
  } else {
    config = elementOrConfig;
  }

  console.log(`[ElementalVFX] Playing ${config.name || 'custom'}`);

  // Clear previous particles
  clearVFX(preview);

  // Play attack animation
  preview.player.playAttackAnim();

  // Get hand position
  const handPos = _getHandPosition(preview);

  // Spawn particles
  const particleLayers = config.particleLayers || config.particles?.map((tex) => ({
    texture: tex,
    color: config.color,
    count: 16,
    size: 0.35,
    life: 1.0,
    speed: 5,
    gravity: 6,
    offsetX: 0.6,
    offsetY: 0,
    offsetZ: 0.6,
    blend: 'normal',
    loop: false,
  })) || [];

  for (const layer of particleLayers) {
    if (!layer.texture) continue;
    const tex = await _loadTexture(preview, layer.texture);
    const offset = new THREE.Vector3(
      layer.offsetX !== undefined ? layer.offsetX : 0.6,
      layer.offsetY !== undefined ? layer.offsetY : 0,
      layer.offsetZ !== undefined ? layer.offsetZ : 0.6
    );
    _spawnParticles(preview, handPos.clone().add(offset), layer, tex);
  }

  // Flash light
  const colorVal = _parseColor(config.color);
  const flash = new THREE.PointLight(colorVal, config.intensity || 5, 6);
  flash.position.copy(handPos);
  preview.scene.add(flash);
  let flashLife = 0.2;
  const fade = () => {
    flashLife -= 0.016;
    if (flashLife > 0) {
      flash.intensity = flashLife * (config.intensity || 5) * 25;
      requestAnimationFrame(fade);
    } else {
      preview.scene.remove(flash);
    }
  };
  fade();
}

function _getHandPosition(preview) {
  const pos = new THREE.Vector3(0.4, 1.3, 0.6);
  if (preview.player?.mesh) {
    const hand = preview.player.mesh.getObjectByName('handslotr');
    if (hand) hand.getWorldPosition(pos);
  }
  return pos;
}

async function _loadTexture(preview, key) {
  // Check global cache first
  const global = _getCachedTexture(key);
  if (global) return global;

  const cache = preview._textureCache;
  if (cache.has(key)) return cache.get(key);

  // Check if it's a flipbook texture
  const fbDef = FLIPBOOK_TEXTURES[key];
  if (fbDef) {
    const path = '../../' + fbDef.path;
    return new Promise((resolve) => {
      preview._textureLoader.load(path, (tex) => {
        tex.flipY = false;
        tex.userData = { isFlipbook: true, cols: fbDef.cols, rows: fbDef.rows, frames: fbDef.frames };
        cache.set(key, tex);
        _globalTextureCache.set(key, tex);
        resolve(tex);
      }, undefined, () => {
        console.warn(`[ElementalVFX] Failed to load flipbook: ${path}`);
        resolve(null);
      });
    });
  }

  // Regular alpha texture
  const filename = TEXTURE_MAP[key];
  if (!filename) {
    console.warn(`[ElementalVFX] Unknown texture key: ${key}`);
    return null;
  }
  const path = '../../' + BRACKEYS_DIR + filename;
  return new Promise((resolve) => {
    preview._textureLoader.load(path, (tex) => {
      tex.flipY = false;
      cache.set(key, tex);
      _globalTextureCache.set(key, tex);
      resolve(tex);
    }, undefined, () => {
      console.warn(`[ElementalVFX] Failed to load: ${path}`);
      resolve(null);
    });
  });
}

function _setFrameUVs(mesh, texture, frameIndex) {
  const ud = texture.userData;
  if (!ud || !ud.isFlipbook) return;
  const cols = ud.cols;
  const rows = ud.rows;
  const totalFrames = ud.frames;
  const frame = Math.max(0, Math.min(totalFrames - 1, frameIndex));

  const col = frame % cols;
  const row = Math.floor(frame / cols);

  const u1 = col / cols;
  const u2 = (col + 1) / cols;
  const v1 = 1 - (row + 1) / rows;
  const v2 = 1 - row / rows;

  const attr = mesh.geometry.attributes.uv;
  if (!attr) return;
  // PlaneGeometry vertex order: 0=BL, 1=BR, 2=TL, 3=TR
  attr.setXY(0, u1, v1);
  attr.setXY(1, u2, v1);
  attr.setXY(2, u1, v2);
  attr.setXY(3, u2, v2);
  attr.needsUpdate = true;
}

function _spawnParticles(preview, pos, layer, texture) {
  const count = layer.count || 16;
  const speed = layer.speed || 5;
  const gravity = layer.gravity !== undefined ? layer.gravity : 6;
  const life = layer.life || 1.0;
  const size = layer.size || 0.35;
  const color = _parseColor(layer.color);
  const blend = _parseBlendMode(layer.blend);
  const isFlipbook = texture?.userData?.isFlipbook || false;
  const fbFrames = isFlipbook ? texture.userData.frames : 1;
  const isPremult = layer.blend === 'premultiply';

  for (let i = 0; i < count; i++) {
    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide,
      depthWrite: false,
      map: texture || null,
      blending: blend,
      premultipliedAlpha: isPremult,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.position.x += (Math.random() - 0.3) * 0.6;
    mesh.position.y += (Math.random() - 0.2) * 0.6;
    mesh.position.z += (Math.random() - 0.3) * 0.6;
    mesh.rotation.z = Math.random() * Math.PI * 2;

    // Set initial UVs for flipbook
    if (isFlipbook) {
      _setFrameUVs(mesh, texture, 0);
    }

    const vel = new THREE.Vector3(
      (Math.random() - 0.3) * speed,
      Math.random() * speed * 0.8 + 1,
      (Math.random() - 0.3) * speed
    );
    preview.scene.add(mesh);
    preview._vfxParticles.push({
      mesh, mat: mesh.material, vel,
      life: life * (0.7 + Math.random() * 0.6),
      maxLife: life,
      rotSpeed: (Math.random() - 0.5) * 8,
      gravity: gravity,
      isFlipbook,
      fbFrames,
      loop: layer.loop || false,
    });
  }
}

export function updateVFX(preview, dt) {
  // Update particles
  for (let i = preview._vfxParticles.length - 1; i >= 0; i--) {
    const p = preview._vfxParticles[i];
    p.life -= dt;
    if (p.life <= 0) {
      preview.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mat.dispose();
      preview._vfxParticles.splice(i, 1);
      continue;
    }
    p.mesh.position.addScaledVector(p.vel, dt);
    p.vel.y -= dt * (p.gravity || 6);
    p.vel.multiplyScalar(0.97);
    p.mesh.rotation.z += p.rotSpeed * dt;

    // Proper fade: opacity goes from 1.0 at start to 0.0 at death
    const t = p.life / p.maxLife;
    p.mat.opacity = Math.max(0, Math.min(1, t));
    p.mesh.lookAt(preview.camera.position);

    // Animate flipbook UVs
    if (p.isFlipbook && p.mat.map) {
      let progress = 1 - t; // 0 = birth, 1 = death
      if (p.loop) {
        progress = progress % 1;
      }
      const frameIndex = Math.floor(progress * p.fbFrames);
      _setFrameUVs(p.mesh, p.mat.map, frameIndex);
    }
  }
}

// ─── Weapon VFX Emitter (continuous flame/etc. on equipped weapons) ───

const _activeEmitters = [];

export class WeaponVFXEmitter {
  constructor(parent, scene, camera, config) {
    this.parent = parent;
    this.scene = scene;
    this.camera = camera;
    this.config = config;
    this.active = false;
    this.timer = 0;
    this.interval = 0.06; // emit every 60ms
    this.particles = [];
    this._textures = {}; // key -> texture
    this._ready = false;
    this._preload();
  }

  async _preload() {
    if (!this.config?.particleLayers) {
      this._ready = true;
      return;
    }
    for (const layer of this.config.particleLayers) {
      if (!layer.texture) continue;
      const tex = _getCachedTexture(layer.texture);
      if (tex) {
        this._textures[layer.texture] = tex;
      } else {
        // Fallback async load (shouldn't happen if preloadAllTextures was called)
        const fbDef = FLIPBOOK_TEXTURES[layer.texture];
        const filename = TEXTURE_MAP[layer.texture];
        const path = fbDef ? '../../' + fbDef.path : (filename ? '../../' + BRACKEYS_DIR + filename : null);
        if (path) {
          const loaded = await new Promise((resolve) => {
            _textureLoader.load(path, (tex) => {
              tex.flipY = false;
              if (fbDef) tex.userData = { isFlipbook: true, cols: fbDef.cols, rows: fbDef.rows, frames: fbDef.frames };
              _globalTextureCache.set(layer.texture, tex);
              resolve(tex);
            }, undefined, () => resolve(null));
          });
          if (loaded) this._textures[layer.texture] = loaded;
        }
      }
    }
    this._ready = true;
  }

  start() { this.active = true; }
  stop() { this.active = false; }

  destroy() {
    this.stop();
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mat.dispose();
    }
    this.particles = [];
    const idx = _activeEmitters.indexOf(this);
    if (idx >= 0) _activeEmitters.splice(idx, 1);
  }

  _emit() {
    if (!this._ready || !this.config?.particleLayers) return;
    const pos = new THREE.Vector3();
    this.parent.getWorldPosition(pos);
    for (const layer of this.config.particleLayers) {
      const tex = this._textures[layer.texture];
      if (!tex && layer.texture) continue;
      this._spawnLayer(pos, layer, tex);
    }
  }

  _spawnLayer(pos, layer, texture) {
    const count = Math.max(1, Math.floor((layer.count || 16) * 0.15)); // fewer per tick for continuous
    const speed = layer.speed || 5;
    const gravity = layer.gravity !== undefined ? layer.gravity : 6;
    const life = layer.life || 1.0;
    const size = layer.size || 0.35;
    const color = _parseColor(layer.color);
    const blend = _parseBlendMode(layer.blend);
    const isFlipbook = texture?.userData?.isFlipbook || false;
    const fbFrames = isFlipbook ? texture.userData.frames : 1;
    const isPremult = layer.blend === 'premultiply';

    for (let i = 0; i < count; i++) {
      const geo = new THREE.PlaneGeometry(size, size);
      const mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide,
        depthWrite: false,
        map: texture || null,
        blending: blend,
        premultipliedAlpha: isPremult,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const emitPos = pos.clone();
      emitPos.x += (Math.random() - 0.5) * 0.3;
      emitPos.y += (Math.random() - 0.2) * 0.3;
      emitPos.z += (Math.random() - 0.5) * 0.3;
      mesh.position.copy(emitPos);
      mesh.rotation.z = Math.random() * Math.PI * 2;

      if (isFlipbook) _setFrameUVs(mesh, texture, 0);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * speed * 0.5,
        Math.random() * speed * 0.5 + 0.5,
        (Math.random() - 0.5) * speed * 0.5
      );
      this.scene.add(mesh);
      this.particles.push({
        mesh, mat, vel,
        life: life * (0.7 + Math.random() * 0.6),
        maxLife: life,
        rotSpeed: (Math.random() - 0.5) * 8,
        gravity: gravity,
        isFlipbook,
        fbFrames,
        loop: layer.loop || false,
      });
    }
  }

  update(dt) {
    // Emit on timer
    if (this.active) {
      this.timer += dt;
      if (this.timer >= this.interval) {
        this.timer = 0;
        this._emit();
      }
    }
    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mat.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.y -= dt * (p.gravity || 6);
      p.vel.multiplyScalar(0.97);
      p.mesh.rotation.z += p.rotSpeed * dt;
      const t = p.life / p.maxLife;
      p.mat.opacity = Math.max(0, Math.min(1, t));
      if (this.camera) p.mesh.lookAt(this.camera.position);
      if (p.isFlipbook && p.mat.map) {
        let progress = 1 - t;
        if (p.loop) progress = progress % 1;
        const frameIndex = Math.floor(progress * p.fbFrames);
        _setFrameUVs(p.mesh, p.mat.map, frameIndex);
      }
    }
  }
}

export function addWeaponEmitter(emitter) {
  _activeEmitters.push(emitter);
}

export function updateWeaponEmitters(dt, camera) {
  for (const e of _activeEmitters) {
    e.camera = camera;
    e.update(dt);
  }
}

export function clearWeaponEmitters() {
  for (const e of _activeEmitters) e.destroy();
  _activeEmitters.length = 0;
}

// One-shot burst at a world position (for attack impacts)
export function playWeaponBurst(scene, camera, pos, itemId) {
  const config = getWeaponVFXConfig(itemId);
  if (!config) return;
  const fakeParent = { getWorldPosition: (v) => v.copy(pos) };
  const emitter = new WeaponVFXEmitter(fakeParent, scene, camera, config);
  emitter.interval = 999; // won't emit again
  emitter.active = true;
  // Override _spawnLayer to use full count for burst
  const origSpawn = emitter._spawnLayer.bind(emitter);
  emitter._spawnLayer = function(p, layer, tex) {
    const count = Math.max(1, Math.floor((layer.count || 16) * 0.6));
    const speed = layer.speed || 5;
    const gravity = layer.gravity !== undefined ? layer.gravity : 6;
    const life = layer.life || 1.0;
    const size = layer.size || 0.35;
    const color = _parseColor(layer.color);
    const blend = _parseBlendMode(layer.blend);
    const isFlipbook = tex?.userData?.isFlipbook || false;
    const fbFrames = isFlipbook ? tex.userData.frames : 1;
    const isPremult = layer.blend === 'premultiply';
    for (let i = 0; i < count; i++) {
      const geo = new THREE.PlaneGeometry(size, size);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1.0, side: THREE.DoubleSide, depthWrite: false, map: tex || null, blending: blend, premultipliedAlpha: isPremult });
      const mesh = new THREE.Mesh(geo, mat);
      const emitPos = p.clone();
      emitPos.x += (Math.random() - 0.5) * 0.8;
      emitPos.y += (Math.random() - 0.2) * 0.8;
      emitPos.z += (Math.random() - 0.5) * 0.8;
      mesh.position.copy(emitPos);
      mesh.rotation.z = Math.random() * Math.PI * 2;
      if (isFlipbook) _setFrameUVs(mesh, tex, 0);
      const vel = new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed * 0.8 + 1, (Math.random() - 0.5) * speed);
      scene.add(mesh);
      emitter.particles.push({ mesh, mat, vel, life: life * (0.7 + Math.random() * 0.6), maxLife: life, rotSpeed: (Math.random() - 0.5) * 8, gravity, isFlipbook, fbFrames, loop: layer.loop || false });
    }
  };
  emitter._emit();
  emitter.active = false; // stop further emission
  addWeaponEmitter(emitter);
}
