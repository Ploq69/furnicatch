import * as THREE from 'three';
import { ZONES } from '../ZoneData.js';
import { ZONE_ATMOSPHERE } from '../AtmosphereData.js';

export class BoundaryEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.group = null;
  }

  create() {
    this.clear();
    this.group = new THREE.Group();
    this.group.name = 'distant_boundary_environment';
    for (const zone of ZONES) {
      this._addZoneApron(zone);
      this._addZoneSilhouettes(zone);
    }
    this.scene.add(this.group);
  }

  clear() {
    if (this.group) {
      this.scene.remove(this.group);
      this.group.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      this.group = null;
    }
  }

  _addZoneApron(zone) {
    const preset = ZONE_ATMOSPHERE[zone.id] || ZONE_ATMOSPHERE.default;
    const b = zone.bounds;
    const width = 26;
    const yInner = -0.25;
    const yOuter = -5.5;
    const mat = new THREE.MeshLambertMaterial({
      color: preset.groundTint,
      transparent: true,
      opacity: 0.82,
      fog: true,
      side: THREE.DoubleSide,
    });
    const strips = [
      [[b.minX, yInner, b.minZ], [b.maxX, yInner, b.minZ], [b.maxX, yOuter, b.minZ - width], [b.minX, yOuter, b.minZ - width]],
      [[b.maxX, yInner, b.minZ], [b.maxX, yInner, b.maxZ], [b.maxX + width, yOuter, b.maxZ], [b.maxX + width, yOuter, b.minZ]],
      [[b.maxX, yInner, b.maxZ], [b.minX, yInner, b.maxZ], [b.minX, yOuter, b.maxZ + width], [b.maxX, yOuter, b.maxZ + width]],
      [[b.minX, yInner, b.maxZ], [b.minX, yInner, b.minZ], [b.minX - width, yOuter, b.minZ], [b.minX - width, yOuter, b.maxZ]],
    ];
    for (const points of strips) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
      geo.setIndex([0, 1, 2, 0, 2, 3]);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `${zone.id}_terrain_apron`;
      mesh.receiveShadow = false;
      this.group.add(mesh);
    }
  }

  _addZoneSilhouettes(zone) {
    const preset = ZONE_ATMOSPHERE[zone.id] || ZONE_ATMOSPHERE.default;
    const b = zone.bounds;
    const mat = new THREE.MeshLambertMaterial({
      color: preset.silhouette,
      transparent: true,
      opacity: zone.id === 'steelworks' ? 0.88 : 0.72,
      fog: true,
    });
    const group = new THREE.Group();
    group.name = `${zone.id}_horizon_silhouette`;
    const cx = (b.minX + b.maxX) * 0.5;
    const cz = (b.minZ + b.maxZ) * 0.5;
    const longX = b.maxX - b.minX;
    const longZ = b.maxZ - b.minZ;

    if (zone.id === 'steelworks') {
      for (let i = 0; i < 7; i++) {
        const stack = new THREE.Mesh(new THREE.BoxGeometry(2.2, 12 + (i % 3) * 5, 2.2), mat);
        stack.position.set(b.maxX + 15 + (i % 2) * 7, stack.geometry.parameters.height * 0.5 - 0.5, b.minZ + 12 + i * 14);
        group.add(stack);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.4, 4.5), mat);
        cap.position.set(stack.position.x, stack.position.y + stack.geometry.parameters.height * 0.5 + 0.7, stack.position.z);
        group.add(cap);
      }
      const gantry = new THREE.Mesh(new THREE.BoxGeometry(8, 2.2, longZ * 0.72), mat);
      gantry.position.set(b.maxX + 20, 8, cz);
      group.add(gantry);
    } else if (zone.id === 'citadel') {
      for (let i = 0; i < 5; i++) {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(5, 15 + i % 2 * 5, 5), mat);
        tower.position.set(b.maxX + 14, tower.geometry.parameters.height * 0.5, b.minZ + 14 + i * 24);
        group.add(tower);
      }
      const wall = new THREE.Mesh(new THREE.BoxGeometry(5, 7, longZ * 0.82), mat);
      wall.position.set(b.maxX + 12, 3.5, cz);
      group.add(wall);
    } else if (zone.id === 'forest' || zone.id === 'mire') {
      const count = zone.id === 'mire' ? 18 : 24;
      for (let i = 0; i < count; i++) {
        const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 7 + (i % 4), 1.2), mat);
        trunk.position.set(b.minX + (i / count) * longX, trunk.geometry.parameters.height * 0.5 - 0.8, b.maxZ + 10 + (i % 3) * 2);
        const crown = new THREE.Mesh(new THREE.ConeGeometry(4 + (i % 2), 9, 5), mat);
        crown.position.set(trunk.position.x, trunk.position.y + trunk.geometry.parameters.height * 0.5 + 4, trunk.position.z);
        group.add(trunk, crown);
      }
    } else if (zone.id === 'desert' || zone.id === 'ice') {
      for (let i = 0; i < 8; i++) {
        const ridge = new THREE.Mesh(new THREE.ConeGeometry(9 + (i % 3) * 3, 7 + (i % 4) * 2, 4), mat);
        ridge.position.set(b.minX + 8 + i * (longX / 7), ridge.geometry.parameters.height * 0.5 - 1, b.maxZ + 13 + (i % 2) * 5);
        ridge.rotation.y = Math.PI * 0.25;
        group.add(ridge);
      }
    } else {
      for (let i = 0; i < 8; i++) {
        const rock = new THREE.Mesh(new THREE.BoxGeometry(4 + (i % 3), 5 + (i % 4), 4 + (i % 2)), mat);
        rock.position.set(b.minX + 8 + i * (longX / 7), rock.geometry.parameters.height * 0.5 - 0.8, b.maxZ + 12);
        group.add(rock);
      }
    }

    this.group.add(group);
  }
}
