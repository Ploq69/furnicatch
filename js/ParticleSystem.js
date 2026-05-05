import * as THREE from 'three';

// Simple pooled particle system
export class ParticleSystem {
  constructor(scene, maxParticles = 200) {
    this.scene = scene;
    this.maxParticles = maxParticles;
    this.particles = [];
    this.geometry = new THREE.SphereGeometry(0.03, 4, 4);
    this.baseMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 1 });
  }

  spawn(count, position, color, speed = 3, life = 0.6, size = 0.04) {
    for (let i = 0; i < count; i++) {
      const mat = this.baseMaterial.clone();
      mat.color.set(color);
      const mesh = new THREE.Mesh(this.geometry, mat);
      mesh.position.copy(position);
      mesh.scale.setScalar(size / 0.03);
      
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const v = speed * (0.5 + Math.random() * 0.5);
      const velocity = new THREE.Vector3(
        v * Math.sin(phi) * Math.cos(theta),
        v * Math.sin(phi) * Math.sin(theta) + speed * 0.3,
        v * Math.cos(phi)
      );
      
      this.scene.add(mesh);
      this.particles.push({ mesh, velocity, life, maxLife: life, gravity: -5 });
    }
  }

  spawnTrail(position, color, count = 1) {
    for (let i = 0; i < count; i++) {
      const mat = this.baseMaterial.clone();
      mat.color.set(color);
      const mesh = new THREE.Mesh(this.geometry, mat);
      mesh.position.copy(position);
      mesh.position.x += (Math.random() - 0.5) * 0.05;
      mesh.position.y += (Math.random() - 0.5) * 0.05;
      mesh.position.z += (Math.random() - 0.5) * 0.05;
      mesh.scale.setScalar(0.6);
      
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(0, 0, 0),
        life: 0.25,
        maxLife: 0.25,
        gravity: 0
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose?.();
        p.mesh.material.dispose?.();
        this.particles.splice(i, 1);
        continue;
      }
      
      p.velocity.y += p.gravity * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      const alpha = p.life / p.maxLife;
      p.mesh.material.opacity = alpha;
      p.mesh.scale.setScalar(alpha * 0.8);
    }
  }

  clear() {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose?.();
      p.mesh.material.dispose?.();
    }
    this.particles = [];
  }
}
