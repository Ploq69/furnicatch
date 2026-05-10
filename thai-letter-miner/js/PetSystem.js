import * as THREE from 'three';
import { THAI_BY_ID } from './thaiManifest.js';

export class LetterPet {
  constructor(item, record, thaiAssets, scene) {
    this.item = item;
    this.record = record;
    this.thaiAssets = thaiAssets;
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.userData.entityType = 'thaiLetterPet';
    this.group.userData.thaiModelId = item.id;
    this.position = new THREE.Vector3();
    this.cooldown = Math.random() * 0.5;
    this.model = this.thaiAssets.cloneItem(item.id);
    this.model.scale.multiplyScalar(0.82);
    this.model.userData.thaiModelRole = 'pet';
    this.group.add(this.model);
    const light = new THREE.PointLight(0xffd66b, 0.55, 4);
    light.position.y = 0.8;
    this.group.add(light);
    this.scene.add(this.group);
  }

  update(dt, index, playerPosition, world, stats, breakBlock) {
    const t = performance.now() * 0.001;
    const desired = playerPosition.clone().add(new THREE.Vector3(
      Math.cos(t + index * 1.7) * 1.65,
      1.35 + Math.sin(t * 2.1 + index) * 0.18,
      Math.sin(t + index * 1.7) * 1.65
    ));
    this.position.lerp(desired, Math.min(1, dt * (3.0 + stats.speed * 0.18)));
    this.group.position.copy(this.position);
    this.group.rotation.y += dt * 1.4;

    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    this.cooldown = Math.max(0.22, 0.92 - stats.speed * 0.055);
    const target = nearestBlock(world, playerPosition, 5.0 + stats.range);
    if (!target) return;
    const destroyed = target.takeDamage(stats.damage + Math.floor((this.record.level || 1) / 2));
    if (destroyed) breakBlock(target, 'pet');
    if (stats.splash > 0 && Math.random() < stats.splash * 0.08) {
      for (const block of blocksNear(world, target.position, 1.6, 2)) {
        if (block.takeDamage(1)) breakBlock(block, 'petSplash');
      }
    }
  }

  dispose() {
    this.scene.remove(this.group);
  }
}

export class PetSystem {
  constructor(scene, saveStore, thaiAssets) {
    this.scene = scene;
    this.saveStore = saveStore;
    this.thaiAssets = thaiAssets;
    this.pets = [];
  }

  refresh() {
    for (const pet of this.pets) pet.dispose();
    this.pets = [];
    const activeIds = this.saveStore.data.activePets.slice(0, this.saveStore.petSlots());
    for (const id of activeIds) {
      const item = THAI_BY_ID[id];
      if (!item) continue;
      this.pets.push(new LetterPet(item, this.saveStore.getRecord(id), this.thaiAssets, this.scene));
    }
  }

  stats() {
    return {
      damage: 1 + this.saveStore.upgradeLevel('pet_damage'),
      speed: this.saveStore.upgradeLevel('pet_speed'),
      range: this.saveStore.upgradeLevel('pet_speed') * 0.25,
      splash: this.saveStore.upgradeLevel('pet_splash'),
    };
  }

  update(dt, playerPosition, world, breakBlock) {
    const stats = this.stats();
    this.pets.forEach((pet, index) => pet.update(dt, index, playerPosition, world, stats, breakBlock));
  }
}

export function nearestBlock(world, position, range) {
  let best = null;
  let bestDist = range;
  for (const block of world.blocks.values()) {
    if (block.destroyed) continue;
    const dist = block.position.distanceTo(position);
    if (dist < bestDist) {
      bestDist = dist;
      best = block;
    }
  }
  return best;
}

export function blocksNear(world, position, range, limit) {
  return [...world.blocks.values()]
    .filter((block) => !block.destroyed)
    .map((block) => ({ block, dist: block.position.distanceTo(position) }))
    .filter((entry) => entry.dist <= range)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit)
    .map((entry) => entry.block);
}
