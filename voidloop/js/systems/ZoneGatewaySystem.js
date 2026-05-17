import * as THREE from 'three';
import { getZoneById } from '../ZoneData.js';
import { Enemy } from '../Enemy.js';

export class ZoneGatewaySystem {
  constructor(game) {
    this.game = game;
    this._gatewayMeshes = [];
    this._gatewayLabels = [];
    this._isTransitioning = false;
  }

  create() {
    this.clear();
    const currentZone = this.game.zoneManager.getCurrentZone();
    if (!currentZone || !currentZone.exitGateway) return;

    const gw = currentZone.exitGateway;
    const targetZone = getZoneById(gw.targetZone);
    if (!targetZone) return;

    // Create barrier mesh
    const geo = new THREE.PlaneGeometry(4, 4);
    const isUnlocked = this.game.zoneManager.isZoneUnlocked(targetZone.id);
    const color = isUnlocked ? 0x44ff44 : 0xff4444;
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(gw.x, 2, gw.z);
    mesh.rotation.y = Math.PI / 2;
    this.game.scene.add(mesh);
    this._gatewayMeshes.push(mesh);

    // Floating label
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(0, 0, 512, 128, 16);
    ctx.fill();
    ctx.fillStyle = isUnlocked ? '#4ade80' : '#f87171';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    const label = isUnlocked ? `✅ ${targetZone.name}` : `🔒 ${targetZone.name}`;
    ctx.fillText(label, 256, 80);
    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(4, 1, 1);
    sprite.position.set(gw.x, 5, gw.z);
    this.game.scene.add(sprite);
    this._gatewayLabels.push(sprite);
  }

  clear() {
    for (const m of this._gatewayMeshes) {
      this.game.scene.remove(m);
      if (m.geometry) m.geometry.dispose();
      if (m.material) m.material.dispose();
    }
    for (const s of this._gatewayLabels) {
      this.game.scene.remove(s);
      if (s.material && s.material.map) s.material.map.dispose();
      if (s.material) s.material.dispose();
    }
    this._gatewayMeshes = [];
    this._gatewayLabels = [];
  }

  check() {
    const currentZone = this.game.zoneManager.getCurrentZone();
    if (!currentZone || !currentZone.exitGateway) return;

    const gw = currentZone.exitGateway;
    const targetZone = getZoneById(gw.targetZone);
    if (!targetZone) return;

    const dist = this.game.player.position.distanceTo(new THREE.Vector3(gw.x, this.game.player.position.y, gw.z));
    if (dist < 5) {
      const isUnlocked = this.game.zoneManager.isZoneUnlocked(targetZone.id);
      if (isUnlocked) {
        // Zone is unlocked — offer transition
        this.transition(targetZone.id);
        return;
      }

      const previousZoneId = this.game.zoneManager.getPreviousZoneId(targetZone.id);
      const canEnter = !previousZoneId || this.game.zoneManager.isZoneCompleted(previousZoneId);
      if (canEnter) {
        this.game.zoneManager.unlockZone(targetZone.id);
        this.game.ui.showFloatingText(`${targetZone.name} unlocked!`, 0x4ade80);
        this.create();
        this.transition(targetZone.id);
      } else {
        this.game.ui.showGatewayIndicator(targetZone.name, true, ['ABC', '⛏']);
        this.game.ui.showFloatingText('Master this zone first', 0xff4444);
      }
    }
  }

  async transition(targetZoneId) {
    if (this._isTransitioning) return;
    this._isTransitioning = true;

    const targetZone = getZoneById(targetZoneId);
    this.game.ui.showLoading(`Entering ${targetZone?.name || 'Unknown Zone'}...`);

    // Small delay to let the loading screen render
    await new Promise(r => setTimeout(r, 150));

    this.game.zoneManager.setCurrentZone(targetZoneId);
    await this.game._generateZones(this.game._worldSeed, targetZoneId);

    this.game.ui.hideLoading();
    this._isTransitioning = false;
  }

  respawnEnemies(zoneId) {
    // Enemies for newly unlocked zone are spawned on unlock
    // This is handled by regenerating the zone with enemies
    const zone = getZoneById(zoneId);
    if (!zone) return;
    const seed = this.game._worldSeed + zone.order * 7919;
    // We can't easily regenerate just enemies, so we'll spawn them manually
    const rng = { random: () => Math.random(), choice: (arr) => arr[Math.floor(Math.random() * arr.length)] };
    const b = zone.bounds;
    const size = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) / 2;
    const enemyCount = Math.min(Math.floor(5 + size / 8), 25);
    const enemyTypes = zone.enemyTypes;
    const sp = zone.spawnPoint;
    for (let i = 0; i < enemyCount; i++) {
      const et = rng.choice(enemyTypes);
      let ex, ez, attempts = 0;
      do {
        const angle = rng.random() * Math.PI * 2;
        const dist = 4 + rng.random() * (size - 7);
        ex = sp.x + Math.cos(angle) * dist;
        ez = sp.z + Math.sin(angle) * dist;
        attempts++;
      } while ((this.game.world.getBlock(ex, 0, ez) || this.game.world._hasGround(ex, ez)) && attempts < 20);
      const enemy = new Enemy(et, ex, ez);
      enemy.world = this.game.world;
      enemy._netId = this.game.world._nextEnemyId++;
      enemy.spawn(this.game.scene).then(() => {
        this.game.world.enemies.push(enemy);
      });
    }
  }
}
