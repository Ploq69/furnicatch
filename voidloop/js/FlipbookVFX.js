import * as THREE from 'three';

/**
 * FlipbookVFX — Spritesheet animation system for big effects (explosions, impacts, etc.)
 * Loads a spritesheet PNG + optional spritesheet.txt with frame rects.
 * Creates a billboard plane that cycles through frames.
 */
export class FlipbookVFX {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.textureLoader = new THREE.TextureLoader();
    this.frameDataCache = new Map();
  }

  /**
   * Spawn a flipbook effect.
   * @param {Object} opts
   * @param {THREE.Vector3} opts.pos — world position
   * @param {string} opts.sheetPath — path to spritesheet PNG (relative to project root)
   * @param {string} [opts.txtPath] — optional path to spritesheet.txt with frame rects
   * @param {number} [opts.fps=24] — playback speed
   * @param {number} [opts.scale=2] — plane scale
   * @param {boolean} [opts.billboard=true] — face camera each frame
   * @param {number} [opts.cols] — grid columns (if no txtPath)
   * @param {number} [opts.rows] — grid rows (if no txtPath)
   * @param {number} [opts.frames] — total frames (if no txtPath)
   */
  async spawn(opts) {
    const { pos, sheetPath, txtPath, fps = 24, scale = 2, billboard = true } = opts;

    // Load texture
    const fullPath = '../../' + sheetPath;
    const texture = await this._loadTexture(fullPath);
    if (!texture) return;

    // Get frame rects and convert to UVs
    let frames = [];
    if (txtPath) {
      const pixelFrames = await this._parseFrameData(txtPath, sheetPath);
      frames = this._finalizeFrames(pixelFrames, texture.image.width, texture.image.height);
    } else if (opts.cols && opts.rows && opts.frames) {
      const pixelFrames = this._buildGridFrames(texture.image.width, texture.image.height, opts.cols, opts.rows, opts.frames);
      frames = this._finalizeFrames(pixelFrames, texture.image.width, texture.image.height);
    }
    if (frames.length === 0) {
      // Fallback: single frame = whole sheet
      frames = [{ u1: 0, u2: 1, v1: 0, v2: 1 }];
    }

    // Create mesh
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.scale.setScalar(scale);
    this.scene.add(mesh);

    this.active.push({
      mesh,
      mat,
      texture,
      frames,
      frameIndex: 0,
      frameTime: 0,
      frameDuration: 1 / fps,
      billboard,
      done: false,
    });
  }

  update(dt, camera) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const fx = this.active[i];
      if (fx.done) {
        this.scene.remove(fx.mesh);
        fx.mat.dispose();
        this.active.splice(i, 1);
        continue;
      }

      fx.frameTime += dt;
      if (fx.frameTime >= fx.frameDuration) {
        fx.frameTime -= fx.frameDuration;
        fx.frameIndex++;
        if (fx.frameIndex >= fx.frames.length) {
          fx.done = true;
          continue;
        }
        this._updateUVs(fx);
      }

      if (fx.billboard && camera) {
        fx.mesh.lookAt(camera.position);
      }
    }
  }

  _updateUVs(fx) {
    const f = fx.frames[fx.frameIndex];
    const attr = fx.mesh.geometry.attributes.uv;
    // PlaneGeometry vertex order: 0=bottom-left, 1=bottom-right, 2=top-left, 3=top-right
    attr.setXY(0, f.u1, f.v1);
    attr.setXY(1, f.u2, f.v1);
    attr.setXY(2, f.u1, f.v2);
    attr.setXY(3, f.u2, f.v2);
    attr.needsUpdate = true;
  }

  _loadTexture(path) {
    return new Promise((resolve) => {
      this.textureLoader.load(path, (tex) => {
        tex.flipY = false;
        resolve(tex);
      }, undefined, () => {
        console.warn('[FlipbookVFX] Failed to load texture:', path);
        resolve(null);
      });
    });
  }

  async _parseFrameData(txtPath, sheetPath) {
    // Build cache key from sheetPath (txtPath may not be fetchable)
    const cacheKey = sheetPath;
    if (this.frameDataCache.has(cacheKey)) {
      return this.frameDataCache.get(cacheKey);
    }

    try {
      const fullTxt = '../../' + (txtPath || sheetPath.replace('.png', '.txt'));
      const res = await fetch(fullTxt);
      if (!res.ok) return [];
      const text = await res.text();
      const lines = text.trim().split('\n');
      const frames = [];

      for (const line of lines) {
        const match = line.match(/=\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
        if (!match) continue;
        const [, x, y, w, h] = match.map(Number);
        frames.push({ x, y, w, h });
      }

      // Normalize to UVs (need image dimensions)
      // We'll defer UV calc until texture loads
      // For now store pixel rects
      this.frameDataCache.set(cacheKey, frames);
      return frames;
    } catch (e) {
      return [];
    }
  }

  _buildGridFrames(imgW, imgH, cols, rows, totalFrames) {
    const fw = imgW / cols;
    const fh = imgH / rows;
    const frames = [];
    for (let i = 0; i < totalFrames; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      frames.push({
        x: col * fw,
        y: row * fh,
        w: fw,
        h: fh,
      });
    }
    return frames;
  }

  // Convert pixel rects to UVs once texture size is known
  _finalizeFrames(frames, texW, texH) {
    return frames.map(f => ({
      u1: f.x / texW,
      u2: (f.x + f.w) / texW,
      v1: 1 - (f.y + f.h) / texH,
      v2: 1 - f.y / texH,
    }));
  }
}

// Helper to spawn pre-defined effects
export const FLIPBOOK_EFFECTS = {
  // Using Super Pixel Effects spritesheets
  explosion: {
    sheetPath: "Super Pixel Effects Gigapack (Free Version)/spritesheet/Explosions/stylized_explosion_001/stylized_explosion_001_large_yellow/spritesheet.png",
    fps: 18,
    scale: 3,
  },
  impact: {
    sheetPath: "Super Pixel Effects Gigapack (Free Version)/spritesheet/Impacts/symmetrical_impact_001/symmetrical_impact_001_large_yellow/spritesheet.png",
    fps: 24,
    scale: 2,
  },
  magic_burst: {
    sheetPath: "Super Pixel Effects Gigapack (Free Version)/spritesheet/Fantasy Spells/spell_attack_up_001/spell_attack_up_001_large_red/spritesheet.png",
    fps: 20,
    scale: 2.5,
  },
  // Water splash effect for Water Staff impact
  water_splash: {
    sheetPath: "Super Pixel Effects Gigapack (Free Version)/spritesheet/Fantasy Spells/spell_attack_up_001/spell_attack_up_001_large_blue/spritesheet.png",
    fps: 20,
    scale: 2.5,
  },
};
