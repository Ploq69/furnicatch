import * as THREE from 'three';
import { input } from '../InputManager.js';
import { GAME } from '../constants.js';

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothFactor = (dt, halfLife) => 1 - Math.pow(2, -dt / Math.max(0.0001, halfLife));
const shortestAngle = (from, to) => {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
};
const dampAngle = (from, to, dt, halfLife) => from + shortestAngle(from, to) * smoothFactor(dt, halfLife);

const TP_FOV = 65;
const TP_DISTANCE = 4.8;
const TP_HEIGHT = 1.25;
const TP_SHOULDER_X = 0.2;
const TP_SHOULDER_Y = 0.05;
const TP_PITCH_DEFAULT = 0.22;
const TP_PITCH_MIN = -0.55;
const TP_PITCH_MAX = 0.75;
const TP_LOOKAHEAD = 0.9;
const TP_VERTICAL_DEAD_ZONE = 0.15;
const TP_HORIZONTAL_HALF_LIFE = 0.1;
const TP_VERTICAL_HALF_LIFE = 0.35;
const TP_LOOKAHEAD_HALF_LIFE = 0.16;
const TP_POSITION_HALF_LIFE = 0.14;
const TP_YAW_HALF_LIFE = 0.09;
const TP_COLLISION_EXTEND_HALF_LIFE = 0.24;
const TP_RECENTER_DELAY = 1.25;
const TP_COLLISION_REFRESH_MS = 125;
const TP_COLLISION_MOVE_EPS = 0.35;

export class ThirdPersonCamera {
  constructor(game) {
    this.game = game;
    this.rig = {
      subjectTarget: new THREE.Vector3(),
      lookTarget: new THREE.Vector3(),
      lookahead: new THREE.Vector3(),
      previousPlayerPos: new THREE.Vector3(),
      desiredYaw: 0,
      displayYaw: 0,
      pitch: TP_PITCH_DEFAULT,
      distance: TP_DISTANCE,
      collisionDistance: TP_DISTANCE,
      manualRecenteringTimer: 0,
      initialized: false,
    };
    this.tuning = {
      fov: TP_FOV,
      distance: TP_DISTANCE,
      height: TP_HEIGHT,
      shoulderX: TP_SHOULDER_X,
      shoulderY: TP_SHOULDER_Y,
      pitchDefault: TP_PITCH_DEFAULT,
      pitchMin: TP_PITCH_MIN,
      pitchMax: TP_PITCH_MAX,
      lookahead: TP_LOOKAHEAD,
      verticalDeadZone: TP_VERTICAL_DEAD_ZONE,
      horizontalHalfLife: TP_HORIZONTAL_HALF_LIFE,
      verticalHalfLife: TP_VERTICAL_HALF_LIFE,
      lookaheadHalfLife: TP_LOOKAHEAD_HALF_LIFE,
      positionHalfLife: TP_POSITION_HALF_LIFE,
      yawHalfLife: TP_YAW_HALF_LIFE,
      collisionExtendHalfLife: TP_COLLISION_EXTEND_HALF_LIFE,
      recenterDelay: TP_RECENTER_DELAY,
    };
    this.debug = false;
    this.collision = {
      lastAt: -Infinity,
      lastDesired: new THREE.Vector3(),
      lastPivot: new THREE.Vector3(),
      actualDist: TP_DISTANCE,
      rayDist: TP_DISTANCE,
      nearHit: false,
      initialized: false,
    };
  }

  updateControls(dt) {
    const rig = this.rig;
    const tune = this.tuning;
    const sensitivity = 0.0022;
    const mouseMoved = input.mouse.locked && (Math.abs(input.mouse.dx) > 0.01 || Math.abs(input.mouse.dy) > 0.01);
    const gamepadLook = Math.abs(input.gamepad?.rightX) > 0.01 || Math.abs(input.gamepad?.rightY) > 0.01;
    if (mouseMoved) {
      rig.desiredYaw -= input.mouse.dx * sensitivity;
      rig.pitch += input.mouse.dy * sensitivity;
      rig.pitch = Math.max(tune.pitchMin, Math.min(tune.pitchMax, rig.pitch));
      rig.manualRecenteringTimer = tune.recenterDelay;
    } else if (gamepadLook) {
      const lookSpeed = 2.2;
      rig.desiredYaw -= input.gamepad.rightX * lookSpeed;
      rig.pitch += input.gamepad.rightY * lookSpeed;
      rig.pitch = Math.max(tune.pitchMin, Math.min(tune.pitchMax, rig.pitch));
      rig.manualRecenteringTimer = tune.recenterDelay;
    } else {
      rig.manualRecenteringTimer = Math.max(0, rig.manualRecenteringTimer - dt);
    }

    if (input.pressed('KeyR')) {
      rig.desiredYaw = this.game.player.rotation;
      rig.manualRecenteringTimer = 0;
    }

    let forwardMove = 0;
    let strafeMove = 0;
    if (input.gamepad && (Math.abs(input.gamepad.leftX) > 0.01 || Math.abs(input.gamepad.leftY) > 0.01)) {
      forwardMove = -input.gamepad.leftY;
      strafeMove = input.gamepad.leftX;
    } else {
      if (input.isDown('KeyW') || input.isDown('ArrowUp')) forwardMove += 1;
      if (input.isDown('KeyS') || input.isDown('ArrowDown')) forwardMove -= 1;
      if (input.isDown('KeyA') || input.isDown('ArrowLeft')) strafeMove -= 1;
      if (input.isDown('KeyD') || input.isDown('ArrowRight')) strafeMove += 1;
    }

    if (rig.manualRecenteringTimer <= 0 && (forwardMove !== 0 || strafeMove !== 0)) {
      const moveYaw = Math.atan2(
        Math.sin(rig.desiredYaw) * forwardMove - Math.cos(rig.desiredYaw) * strafeMove,
        Math.cos(rig.desiredYaw) * forwardMove + Math.sin(rig.desiredYaw) * strafeMove
      );
      const recenterHalfLife = input.isDown('ShiftLeft') ? 0.42 : 0.75;
      rig.desiredYaw = dampAngle(rig.desiredYaw, moveYaw, dt, recenterHalfLife);
    }

    this.game.camYaw = rig.desiredYaw;
    this.game.camPitch = rig.pitch;
    this.game.player.controlYaw = rig.desiredYaw;
  }

  update(dt, shakeX = 0, shakeY = 0, shakeZ = 0) {
    const rig = this.rig;
    const tune = this.tuning;
    const playerPos = this.game.player.position;
    const rawSubject = new THREE.Vector3(playerPos.x, playerPos.y + tune.height, playerPos.z);

    if (!rig.initialized) {
      rig.subjectTarget.copy(rawSubject);
      rig.lookTarget.copy(rawSubject);
      rig.lookahead.set(0, 0, 0);
      rig.previousPlayerPos.copy(playerPos);
      rig.desiredYaw = this.game.camYaw;
      rig.displayYaw = this.game.camYaw;
      rig.pitch = this.game.camPitch;
      rig.distance = tune.distance;
      rig.collisionDistance = tune.distance;
      this.game.camPos.copy(this.getDesiredPosition(rawSubject, rig.displayYaw, rig.pitch, tune.distance));
      rig.initialized = true;
    }

    rig.distance = tune.distance;

    // Dynamic FOV based on jet speed / rocket boot activity
    let targetFov = tune.fov;
    const jetSpeed = this.game.player.jetVelocity ? Math.sqrt(this.game.player.jetVelocity.x ** 2 + this.game.player.jetVelocity.y ** 2) : 0;
    if (this.game.player.rocketBootsActive) {
      targetFov = tune.fov + 5 + Math.min(6, jetSpeed * 1.2);
    } else if (jetSpeed > 2.5) {
      targetFov = tune.fov + Math.min(4, (jetSpeed - 2.5) * 0.8);
    }
    const fovT = smoothFactor(dt, 0.1);
    this.game.thirdPersonCamera.fov += (targetFov - this.game.thirdPersonCamera.fov) * fovT;
    if (Math.abs(this.game.thirdPersonCamera.fov - tune.fov) > 0.01 || this.game.player.rocketBootsActive) {
      this.game.thirdPersonCamera.updateProjectionMatrix();
    }

    const horizontalT = smoothFactor(dt, tune.horizontalHalfLife);
    rig.subjectTarget.x += (rawSubject.x - rig.subjectTarget.x) * horizontalT;
    rig.subjectTarget.z += (rawSubject.z - rig.subjectTarget.z) * horizontalT;

    const verticalDelta = rawSubject.y - rig.subjectTarget.y;
    if (Math.abs(verticalDelta) > tune.verticalDeadZone) {
      const targetY = rawSubject.y - Math.sign(verticalDelta) * tune.verticalDeadZone;
      rig.subjectTarget.y += (targetY - rig.subjectTarget.y) * smoothFactor(dt, tune.verticalHalfLife);
    }

    const planarDelta = new THREE.Vector3(
      playerPos.x - rig.previousPlayerPos.x,
      0,
      playerPos.z - rig.previousPlayerPos.z
    );
    const planarSpeed = dt > 0 ? planarDelta.length() / dt : 0;
    let desiredLookahead = new THREE.Vector3();
    if (planarSpeed > 0.08) {
      desiredLookahead.copy(planarDelta).normalize();
      const manualScale = rig.manualRecenteringTimer > 0 ? 0.45 : 1;
      desiredLookahead.multiplyScalar(tune.lookahead * Math.min(1, planarSpeed / GAME.PLAYER_SPEED) * manualScale);
    }
    rig.lookahead.lerp(desiredLookahead, smoothFactor(dt, tune.lookaheadHalfLife));

    const desiredLookTarget = rig.subjectTarget.clone().add(rig.lookahead);
    const lookHorizontalT = smoothFactor(dt, tune.horizontalHalfLife);
    rig.lookTarget.x += (desiredLookTarget.x - rig.lookTarget.x) * lookHorizontalT;
    rig.lookTarget.z += (desiredLookTarget.z - rig.lookTarget.z) * lookHorizontalT;
    rig.lookTarget.y += (desiredLookTarget.y - rig.lookTarget.y) * smoothFactor(dt, tune.verticalHalfLife);

    const yawHalfLife = rig.manualRecenteringTimer > 0 ? 0.04 : tune.yawHalfLife;
    rig.displayYaw = dampAngle(rig.displayYaw, rig.desiredYaw, dt, yawHalfLife);
    this.game.camYaw = rig.desiredYaw;
    this.game.camPitch = rig.pitch;

    const fullDistanceDesired = this.getDesiredPosition(rig.lookTarget, rig.displayYaw, rig.pitch, rig.distance);
    const direction = fullDistanceDesired.clone().sub(rig.lookTarget).normalize();
    const rayDist = rig.lookTarget.distanceTo(fullDistanceDesired);
    const actualDist = this.getCameraDistance(rig.lookTarget, fullDistanceDesired, direction, rayDist);
    if (actualDist < rig.collisionDistance) {
      rig.collisionDistance = actualDist;
    } else {
      rig.collisionDistance += (actualDist - rig.collisionDistance) * smoothFactor(dt, tune.collisionExtendHalfLife);
    }

    const resolvedDesired = rig.lookTarget.clone().add(direction.multiplyScalar(rig.collisionDistance));
    const positionT = smoothFactor(dt, tune.positionHalfLife);
    this.game.camPos.x += (resolvedDesired.x - this.game.camPos.x) * positionT;
    this.game.camPos.y += (resolvedDesired.y - this.game.camPos.y) * positionT;
    this.game.camPos.z += (resolvedDesired.z - this.game.camPos.z) * positionT;

    this.game.thirdPersonCamera.position.set(
      this.game.camPos.x + shakeX * 0.2,
      this.game.camPos.y + shakeY * 0.2,
      this.game.camPos.z + shakeZ * 0.2
    );
    this.game.thirdPersonCamera.lookAt(rig.lookTarget.x, rig.lookTarget.y, rig.lookTarget.z);
    rig.previousPlayerPos.copy(playerPos);
    this.game._updateShadowCamera(dt);

    if (this.debug && typeof window !== 'undefined') {
      window.__voidloopThirdPersonCameraTuning = tune;
      window.__voidloopThirdPersonCamera = {
        desiredYaw: rig.desiredYaw,
        displayYaw: rig.displayYaw,
        pitch: rig.pitch,
        collisionDistance: rig.collisionDistance,
        subjectTarget: rig.subjectTarget.toArray(),
        lookTarget: rig.lookTarget.toArray(),
        lookahead: rig.lookahead.toArray(),
      };
    }
  }

  getDesiredPosition(target, yaw, pitch, distance) {
    const tune = this.tuning;
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    return target.clone().add(new THREE.Vector3(
      -sinYaw * distance * cosPitch + cosYaw * tune.shoulderX,
      sinPitch * distance + tune.shoulderY,
      -cosYaw * distance * cosPitch - sinYaw * tune.shoulderX
    ));
  }

  getCameraDistance(pivot, desired, direction, rayDist) {
    const start = performance.now();
    const terrain = this.game.world?.terrainMesh;
    let actualDist = rayDist;

    if (!terrain) {
      this.game._perfFrame.cameraCollisionMs = performance.now() - start;
      return actualDist;
    }

    const now = performance.now();
    const cache = this.collision;
    const desiredMoved = !cache.initialized || cache.lastDesired.distanceToSquared(desired) > TP_COLLISION_MOVE_EPS * TP_COLLISION_MOVE_EPS;
    const pivotMoved = !cache.initialized || cache.lastPivot.distanceToSquared(pivot) > 0.25 * 0.25;
    const desiredBlocked = terrain.isSolidAt?.(desired.x, desired.y, desired.z);
    const shouldRefresh = desiredMoved
      || pivotMoved
      || desiredBlocked
      || cache.nearHit
      || now - cache.lastAt >= TP_COLLISION_REFRESH_MS;

    if (shouldRefresh) {
      const hit = terrain.raycastVoxel?.(pivot, direction, rayDist + 0.35, { solidOnly: true });
      actualDist = hit?.point ? Math.max(0.6, pivot.distanceTo(hit.point) - 0.3) : rayDist;
      if (!hit?.point && desiredBlocked) actualDist = Math.min(actualDist, 1.1);
      cache.lastAt = now;
      cache.lastDesired.copy(desired);
      cache.lastPivot.copy(pivot);
      cache.actualDist = actualDist;
      cache.rayDist = rayDist;
      cache.nearHit = actualDist < rayDist - 0.2;
      cache.initialized = true;
    } else {
      const cachedRatio = cache.rayDist > 0.001 ? cache.actualDist / cache.rayDist : 1;
      actualDist = Math.min(rayDist, rayDist * cachedRatio);
    }

    this.game._perfFrame.cameraCollisionMs = performance.now() - start;
    return actualDist;
  }
}
