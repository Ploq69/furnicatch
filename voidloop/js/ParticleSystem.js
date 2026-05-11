import * as THREE from 'three';

const BRACKEYS_DIR = 'brackeys_vfx_bundle/particles/alpha/';

const TEXTURE_MAP = {
  spark: 'spark_01_a.png',
  slash: 'slash_01_a.png',
  smoke: 'smoke_01_a.png',
  muzzle: 'muzzle_01_a.png',
  dirt: 'dirt_01_a.png',
  fire: 'fire_01_a.png',
  magic: 'magic_01_a.png',
  flare: 'flare_01_a.png',
  circle: 'circle_01_a.png',
};

class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.maxParticles = 256;
    this.geometry = new THREE.PlaneGeometry(0.3, 0.3);
    // Pool of reusable meshes
    this.pool = [];
    for (let i = 0; i < this.maxParticles; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(this.geometry, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.pool.push({ mesh, mat, life: 0, maxLife: 0, vel: new THREE.Vector3() });
    }

    // Texture cache
    this.textures = new Map();
    this.textureLoader = new THREE.TextureLoader();
  }

  async _loadTexture(key) {
    if (this.textures.has(key)) return this.textures.get(key);
    const filename = TEXTURE_MAP[key];
    if (!filename) return null;
    const path = '../../' + BRACKEYS_DIR + filename;
    return new Promise((resolve) => {
      this.textureLoader.load(path, (tex) => {
        tex.flipY = false;
        this.textures.set(key, tex);
        resolve(tex);
      }, undefined, () => {
        console.warn('[ParticleSystem] Failed to load texture:', path);
        resolve(null);
      });
    });
  }

  spawn(opts) {
    const { pos, count = 8, color = 0xffffff, speed = 3, life = 0.6, size = 0.2, texture = null } = opts;

    // Apply texture if provided and loaded
    const tex = texture && this.textures.has(texture) ? this.textures.get(texture) : null;

    for (let i = 0; i < count; i++) {
      const p = this.pool.find(p => p.life <= 0);
      if (!p) break;
      p.mesh.position.copy(pos);
      p.mesh.position.x += (Math.random() - 0.5) * 0.5;
      p.mesh.position.y += (Math.random() - 0.5) * 0.5;
      p.mesh.position.z += (Math.random() - 0.5) * 0.5;
      p.vel.set(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.5 + 1,
        (Math.random() - 0.5) * speed
      );
      p.life = life;
      p.maxLife = life;
      p.mat.color.setHex(color);
      if (tex) {
        p.mat.map = tex;
        p.mat.needsUpdate = true;
      } else {
        p.mat.map = null;
        p.mat.needsUpdate = true;
      }
      p.mat.opacity = 1;
      p.mesh.scale.setScalar(size);
      p.mesh.visible = true;
      p.mesh.lookAt(p.mesh.position.clone().add(p.vel));
      this.particles.push(p);
    }
  }

  burst(pos, color, count = 12) {
    this.spawn({ pos, count, color, speed: 5, life: 0.5, size: 0.25 });
  }

  dust(pos, count = 6) {
    this.spawn({ pos, count, color: 0x887766, speed: 2, life: 0.4, size: 0.15, texture: 'dirt' });
  }

  spark(pos, count = 10) {
    this.spawn({ pos, count, color: 0xffaa00, speed: 4, life: 0.3, size: 0.12, texture: 'spark' });
  }

  magic(pos, count = 8) {
    this.spawn({ pos, count, color: 0xa855f7, speed: 3, life: 0.6, size: 0.2 });
  }

  // Water aura for Water Suit equipment
  waterAura(pos, count = 12) {
    this.spawn({ pos, count, color: 0x4488ff, speed: 1.5, life: 0.8, size: 0.18, texture: 'spark' });
  }

  debris(pos, color = 0x888888) {
    // Spawn 3-4 small cube fragments that fly outward with gravity
    const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.position.x += (Math.random() - 0.5) * 0.3;
      mesh.position.y += (Math.random() - 0.5) * 0.3;
      mesh.position.z += (Math.random() - 0.5) * 0.3;
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 4 + 2,
        (Math.random() - 0.5) * 6
      );
      this.scene.add(mesh);
      // Animate and remove
      let life = 0.5;
      const animate = () => {
        life -= 0.016;
        if (life <= 0) {
          this.scene.remove(mesh);
          mat.dispose();
          return;
        }
        mesh.position.addScaledVector(vel, 0.016);
        vel.y -= 9.8 * 0.016;
        mesh.rotation.x += 0.1;
        mesh.rotation.z += 0.08;
        mat.opacity = life / 0.5;
        requestAnimationFrame(animate);
      };
      animate();
    }
  }

  // Preload common textures
  async preloadTextures() {
    const keys = Object.keys(TEXTURE_MAP);
    await Promise.all(keys.map(k => this._loadTexture(k)));
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        p.mat.opacity = 0;
        p.mat.map = null;
        p.mat.needsUpdate = true;
        this.particles.splice(i, 1);
        continue;
      }
      const t = p.life / p.maxLife;
      p.mat.opacity = t;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.y -= 9.8 * dt * 0.3; // light gravity
      // Skip lookAt for performance — particles are small enough
      // p.mesh.lookAt(p.mesh.position.clone().add(p.vel));
    }
  }
}

export { ParticleSystem };
