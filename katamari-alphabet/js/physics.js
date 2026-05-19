import * as THREE from 'three';
import RAPIER from 'rapier';

export const USE_RAPIER_PHYSICS = true;
export const FIXED_TIMESTEP = 1 / 60;

function quatFromEuler(x = 0, y = 0, z = 0) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
  return { x: q.x, y: q.y, z: q.z, w: q.w };
}

export class PhysicsWorld {
  constructor() {
    this.RAPIER = null;
    this.world = null;
    this.handleToItem = new Map();
    this.bodyHandles = new Set();
    this.colliderHandles = new Set();
  }

  // KA-RAPIER-002: async Rapier initialization, world creation, fixed-step owner, and cleanup/reset live here.
  async init() {
    if (!this.RAPIER) {
      await RAPIER.init();
      this.RAPIER = RAPIER;
    }
    this.reset();
  }

  reset() {
    if (this.world?.free) this.world.free();
    this.world = new this.RAPIER.World({ x: 0, y: -18, z: 0 });
    this.handleToItem.clear();
    this.bodyHandles.clear();
    this.colliderHandles.clear();
  }

  step() {
    this.world.timestep = FIXED_TIMESTEP;
    this.world.step();
  }

  createKatamariBody({ x, y, z, radius, mass = 1 }) {
    const bodyDesc = this.RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .setCanSleep(false)
      .setLinearDamping(0.12)
      .setAngularDamping(0.35);
    // KA-RAPIER-028: CCD is enabled where the compat build exposes it to reduce tunneling.
    if (bodyDesc.setCcdEnabled) bodyDesc.setCcdEnabled(true);
    const body = this.world.createRigidBody(bodyDesc);
    this.bodyHandles.add(body.handle);

    const colliderDesc = this.RAPIER.ColliderDesc.ball(radius)
      .setFriction(1.0)
      .setRestitution(0.04)
      .setDensity(Math.max(0.2, mass));
    const collider = this.world.createCollider(colliderDesc, body);
    this.colliderHandles.add(collider.handle);
    if (body.setCcdEnabled) body.setCcdEnabled(true);
    return { body, collider };
  }

  replaceKatamariCollider(body, oldCollider, radius, mass) {
    if (oldCollider) {
      this.world.removeCollider(oldCollider, false);
      this.colliderHandles.delete(oldCollider.handle);
    }
    const desc = this.RAPIER.ColliderDesc.ball(radius)
      .setFriction(1.0)
      .setRestitution(0.04)
      .setDensity(Math.max(0.2, mass));
    const collider = this.world.createCollider(desc, body);
    this.colliderHandles.add(collider.handle);
    if (body.setAdditionalMass) body.setAdditionalMass(Math.max(1, mass), true);
    return collider;
  }

  // KA-RAPIER-006: authored environment visuals get matching fixed colliders.
  // KA-RAPIER-007: colliders are cuboids/rotated cuboids instead of dynamic trimeshes.
  addFixedCuboid({ x, y, z, hx, hy, hz, rx = 0, ry = 0, rz = 0, friction = 0.9 }) {
    const desc = this.RAPIER.ColliderDesc.cuboid(hx, hy, hz)
      .setTranslation(x, y, z)
      .setRotation(quatFromEuler(rx, ry, rz))
      .setFriction(friction)
      .setRestitution(0);
    const collider = this.world.createCollider(desc);
    this.colliderHandles.add(collider.handle);
    return collider;
  }

  addCollectableCollider(item, shape, size, position, rotationY = 0) {
    // KA-RAPIER-009: collectable props are represented by simplified sensor/contact candidate colliders.
    // KA-RAPIER-010: collider handles map back to collectable records for pickup resolution.
    let desc;
    if (shape === 'ball') {
      desc = this.RAPIER.ColliderDesc.ball(size[0]);
    } else if (shape === 'capsule') {
      desc = this.RAPIER.ColliderDesc.capsule(size[1], size[0]);
    } else {
      desc = this.RAPIER.ColliderDesc.cuboid(size[0], size[1], size[2]);
    }
    desc
      .setTranslation(position.x, position.y, position.z)
      .setRotation(quatFromEuler(0, rotationY, 0))
      .setSensor(true);
    const collider = this.world.createCollider(desc);
    this.colliderHandles.add(collider.handle);
    this.handleToItem.set(collider.handle, item);
    item.collider = collider;
    return collider;
  }

  removeItemCollider(item) {
    if (!item?.collider) return;
    this.handleToItem.delete(item.collider.handle);
    this.colliderHandles.delete(item.collider.handle);
    this.world.removeCollider(item.collider, false);
    item.collider = null;
  }
}
