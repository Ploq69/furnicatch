import * as THREE from 'three';
import { GAME, FURNITURE_LEVELS } from './constants.js';
import { input } from './InputManager.js';

const UP = new THREE.Vector3(0, 1, 0);

export class AimController {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.isAiming = false;
    this.targetPoint = new THREE.Vector3(0, 0, -5);
    this.targetFurniture = null;
    this.targetEntity = null;
    this.isLocked = false;
    this.lockStrength = 0;
    this.lockDistancePx = Infinity;
    this.lastVelocity = new THREE.Vector3();

    const markerGeo = new THREE.RingGeometry(0.22, 0.32, 28);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.marker = new THREE.Mesh(markerGeo, markerMat);
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.visible = false;
    this.scene.add(this.marker);

    this.dotGeometry = new THREE.SphereGeometry(0.045, 6, 6);
    this.dotMaterial = new THREE.MeshBasicMaterial({
      color: 0x8be9ff,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    this.trajectoryDots = [];
    for (let i = 0; i < GAME.TRAJECTORY_DOTS; i++) {
      const dot = new THREE.Mesh(this.dotGeometry, this.dotMaterial.clone());
      dot.visible = false;
      this.scene.add(dot);
      this.trajectoryDots.push(dot);
    }
  }

  update(player, world, power) {
    this.isAiming = input.isAiming();
    const origin = player.getHandPosition();
    const ndc = this.isAiming
      ? new THREE.Vector2(0, 0)
      : new THREE.Vector2(
        (input.mouse.x / window.innerWidth) * 2 - 1,
        -(input.mouse.y / window.innerHeight) * 2 + 1
      );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.camera);

    const target = this._resolveTarget(raycaster.ray, world);
    this.targetPoint.copy(target.point);
    this.targetFurniture = target.entity;
    this.targetEntity = target.entity;
    this.isLocked = !!target.entity;
    this.lockStrength = target.lockStrength || 0;
    this.lockDistancePx = target.lockDistancePx ?? Infinity;
    this.lastVelocity.copy(this.getThrowVelocity(origin, this.targetPoint, power, { locked: this.isLocked }));

    this.marker.visible = this.isAiming;
    if (this.isAiming) {
      this.marker.position.copy(this.targetPoint);
      this.marker.position.y += 0.025;
      this.marker.scale.setScalar(this.isLocked ? 1.45 + this.lockStrength * 0.35 : 1);
      this.marker.material.opacity = this.isLocked ? 1 : 0.55;
      this.marker.material.color.set(this.isLocked ? this._levelColor(target.entity?.level) : 0xffffff);
      this._updateTrajectory(origin, this.lastVelocity);
    } else {
      this._hideTrajectory();
    }
  }

  getThrowVelocity(startPos, targetPoint, power, options = {}) {
    const toTarget = new THREE.Vector3().subVectors(targetPoint, startPos);
    const horizontal = new THREE.Vector3(toTarget.x, 0, toTarget.z);
    const horizontalDistance = Math.max(0.1, horizontal.length());
    const speed = options.locked ? THREE.MathUtils.clamp(6.5 + horizontalDistance * 0.22, 6.5, 11) : Math.max(GAME.THROW_POWER_MIN, power);
    const time = options.locked
      ? THREE.MathUtils.clamp(horizontalDistance / speed, 0.28, 1.15)
      : THREE.MathUtils.clamp(horizontalDistance / (speed * 0.85), 0.35, 1.65);
    const gravity = GAME.GRAVITY * GAME.ORB_GRAVITY_SCALE;
    const velocity = horizontal.multiplyScalar(1 / time);
    velocity.y = (toTarget.y - 0.5 * gravity * time * time) / time;
    if (options.locked) {
      velocity.y = THREE.MathUtils.clamp(velocity.y, -2.2, horizontalDistance < 4 ? 2.2 : 3.8);
    }
    return velocity;
  }

  getAimYaw() {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 0.001) return null;
    forward.normalize();
    return Math.atan2(forward.x, forward.z);
  }

  _resolveTarget(ray, world) {
    const screenTarget = this._resolveScreenLock(world);
    if (screenTarget) return screenTarget;

    let best = null;
    const entityList = world.getVisibleEntities ? world.getVisibleEntities() : (world.furniture || []);
    for (const entity of entityList) {
      if (!entity.isCatchable?.() || !entity.hitbox) continue;
      const catchPoint = this._catchPointFor(entity);
      const hit = this._raySphere(ray, catchPoint, entity.hitbox.radius + GAME.AIM_ASSIST_RADIUS + (this.isAiming ? 1.25 : 0.4));
      if (hit === null) continue;
      if (!best || hit < best.distance) {
        best = {
          distance: hit,
          entity,
          point: catchPoint,
          lockStrength: 0.85,
          lockDistancePx: 0,
        };
      }
    }
    if (best) return best;

    const voxelHit = world.raycastVoxel?.(ray.origin, ray.direction, 60);
    if (voxelHit) {
      return { point: voxelHit.point, entity: null };
    }

    const groundPlane = new THREE.Plane(UP, 0);
    const point = new THREE.Vector3();
    if (ray.intersectPlane(groundPlane, point)) {
      return { point, entity: null };
    }
    return {
      point: ray.origin.clone().add(ray.direction.clone().multiplyScalar(25)),
      entity: null,
    };
  }

  _resolveScreenLock(world) {
    const entityList = world.getVisibleEntities ? world.getVisibleEntities() : (world.furniture || []);
    const reticle = this.isAiming
      ? new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2)
      : new THREE.Vector2(input.mouse.x, input.mouse.y);
    const lockRadius = this.isAiming ? 280 : 110;
    let best = null;

    for (const entity of entityList) {
      if (!entity.isCatchable?.() || !entity.hitbox || entity.container?.visible === false) continue;
      const point = this._catchPointFor(entity);
      const projected = point.clone().project(this.camera);
      if (projected.z < -1 || projected.z > 1) {
        const cone = this._rayDistanceToPoint(point);
        if (!this.isAiming || cone.closest < 0 || cone.distance > entity.hitbox.radius + 1.7) continue;
      }
      const sx = (projected.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-projected.y * 0.5 + 0.5) * window.innerHeight;
      const distPx = Math.hypot(sx - reticle.x, sy - reticle.y);
      const cone = this._rayDistanceToPoint(point);
      const coneLocked = this.isAiming && cone.closest > 0 && cone.distance <= entity.hitbox.radius + 1.6;
      if (distPx > lockRadius && !coneLocked) continue;
      const worldDist = this.camera.position.distanceTo(point);
      const score = (coneLocked ? Math.min(distPx, lockRadius * 0.35) : distPx) + worldDist * 2.5;
      if (!best || score < best.score) {
        best = {
          score,
          entity,
          point,
          lockDistancePx: Math.min(distPx, lockRadius),
          lockStrength: coneLocked ? 1 : 1 - Math.min(distPx, lockRadius) / lockRadius,
        };
      }
    }

    return best;
  }

  _rayDistanceToPoint(point) {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const toPoint = new THREE.Vector3().subVectors(point, this.camera.position);
    const closest = toPoint.dot(forward);
    const closestPoint = this.camera.position.clone().addScaledVector(forward, closest);
    return { closest, distance: closestPoint.distanceTo(point) };
  }

  _catchPointFor(entity) {
    if (entity.getCatchPoint) return entity.getCatchPoint();
    const point = entity.hitbox.center.clone();
    point.y = Math.max(0.35, point.y - entity.hitbox.radius * 0.15);
    return point;
  }

  _raySphere(ray, center, radius) {
    const toCenter = new THREE.Vector3().subVectors(center, ray.origin);
    const t = toCenter.dot(ray.direction);
    if (t < 0) return null;
    const closest = ray.origin.clone().add(ray.direction.clone().multiplyScalar(t));
    const distSq = closest.distanceToSquared(center);
    if (distSq > radius * radius) return null;
    return t;
  }

  _updateTrajectory(startPos, velocity) {
    const gravity = GAME.GRAVITY * GAME.ORB_GRAVITY_SCALE;
    for (let i = 0; i < this.trajectoryDots.length; i++) {
      const t = 0.08 + i * 0.075;
      const dot = this.trajectoryDots[i];
      dot.visible = true;
      dot.material.color.set(this.isLocked ? 0x7cff9b : 0x8be9ff);
      dot.position.set(
        startPos.x + velocity.x * t,
        startPos.y + velocity.y * t + 0.5 * gravity * t * t,
        startPos.z + velocity.z * t
      );
      dot.material.opacity = 0.78 * (1 - i / this.trajectoryDots.length);
    }
  }

  _hideTrajectory() {
    for (const dot of this.trajectoryDots) dot.visible = false;
  }

  _levelColor(level = 1) {
    const config = FURNITURE_LEVELS.find(item => item.level === level) || FURNITURE_LEVELS[0];
    return config.color;
  }

  dispose() {
    this.scene.remove(this.marker);
    this.marker.geometry.dispose();
    this.marker.material.dispose();
    for (const dot of this.trajectoryDots) {
      this.scene.remove(dot);
      dot.material.dispose();
    }
    this.dotGeometry.dispose();
  }
}
