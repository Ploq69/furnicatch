import * as THREE from 'three';

const MAX_VINES = 3;
const VINE_RANGE = 22;
const VINE_SPEED = 70;
const SPREAD_ANGLE = 0.18; // ~10 degrees
const VINE_COLORS = [0x2d8a3e, 0x3cb043, 0x228b22];

// Wall grapple constants
const WALL_PULL_ACCEL = 180;
const WALL_PULL_MAX_SPEED = 24;
const WALL_STICK_DIST = 0.9;
const WALL_STICK_OFFSET = 0.35;

export class IvyWhipSystem {
  constructor(scene) {
    this.scene = scene;
    this.vines = [];
    this.cooldown = 0;
    this.isGrappled = false;
    this.momentum = new THREE.Vector3();
    this.state = 'pulling'; // 'pulling' | 'stuck'
    this.wallNormal = new THREE.Vector3(0, 1, 0);
    this.stickPosition = new THREE.Vector3();
    this.shouldRip = false;
    this.ripVelocity = null;
  }

  fire(origin, direction, world) {
    if (this.cooldown > 0) return false;

    // If already grappled, release old vines first then fire new ones
    if (this.isGrappled) {
      this.release();
    }

    // Fire up to 3 vines with horizontal spread
    const fired = this._fireVine(origin, direction, world, 0);
    if (fired) {
      const up = new THREE.Vector3(0, 1, 0);
      const dirLeft = direction.clone().applyAxisAngle(up, SPREAD_ANGLE).normalize();
      const dirRight = direction.clone().applyAxisAngle(up, -SPREAD_ANGLE).normalize();
      this._fireVine(origin, dirLeft, world, 1);
      this._fireVine(origin, dirRight, world, 2);
    }

    this.cooldown = 0.35;
    this.state = 'pulling';
    this.momentum.set(0, 0, 0);
    return fired;
  }

  _fireVine(origin, direction, world, index) {
    const dir = direction.clone().normalize();
    let anchor = null;
    let normal = new THREE.Vector3(0, 1, 0);

    // Raycast against terrain first
    if (world?.terrainMesh?.raycast) {
      const raycaster = new THREE.Raycaster(origin, dir, 0.1, VINE_RANGE);
      const hit = world.terrainMesh.raycast(raycaster, origin, VINE_RANGE + 2);
      if (hit?.point) {
        normal = hit.face?.normal?.clone()?.transformDirection(hit.object.matrixWorld)?.normalize() || new THREE.Vector3(0, 1, 0);
        anchor = hit.point.clone().addScaledVector(normal, -0.25);
      }
    }

    // If no terrain hit, check floating blocks
    if (!anchor && world?.blocks) {
      let nearestBlock = null;
      let nearestDist = VINE_RANGE;
      for (const block of world.blocks.values()) {
        if (block.destroyed) continue;
        const toBlock = block.position.clone().sub(origin);
        const proj = toBlock.dot(dir);
        if (proj < 0.5 || proj > VINE_RANGE) continue;
        const closest = origin.clone().addScaledVector(dir, proj);
        const distToCenter = closest.distanceTo(block.position);
        if (distToCenter < 0.8 && proj < nearestDist) {
          nearestDist = proj;
          nearestBlock = block;
        }
      }
      if (nearestBlock) {
        anchor = nearestBlock.position.clone();
        normal = new THREE.Vector3(0, 1, 0);
      }
    }

    if (!anchor) {
      this._spawnVine(origin, dir, null, normal, index);
      return false;
    }

    this._spawnVine(origin, dir, anchor, normal, index);
    this.isGrappled = true;
    return true;
  }

  _spawnVine(origin, direction, anchor, normal, index) {
    const color = VINE_COLORS[index % VINE_COLORS.length];
    const end = anchor ? anchor.clone() : origin.clone().addScaledVector(direction, VINE_RANGE);
    const geo = new THREE.BufferGeometry().setFromPoints([origin.clone(), end]);
    const mat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    this.vines.push({
      line, geo, origin: origin.clone(), direction: direction.clone(),
      anchor: anchor ? anchor.clone() : null,
      normal: normal.clone(),
      state: anchor ? 'attached' : 'flying',
      flyDist: 0, maxFlyDist: VINE_RANGE, index, color,
    });
  }

  release() {
    for (const vine of this.vines) {
      this.scene.remove(vine.line);
      vine.geo.dispose();
      vine.line.material.dispose();
    }
    this.vines = [];
    this.isGrappled = false;
    this.momentum.set(0, 0, 0);
    this.state = 'pulling';
    this.shouldRip = false;
    this.ripVelocity = null;
  }

  _doRip(velocity) {
    this.ripVelocity = velocity || null;
    this.shouldRip = true;
  }

  update(dt, player, input) {
    if (this.cooldown > 0) this.cooldown -= dt;

    // Release on jump while grappled
    if (this.isGrappled && input?.pressed('Space')) {
      let vel = null;
      if (this.state === 'stuck' && player.game?.tpCamera) {
        const yaw = player.game.tpCamera.rig.displayYaw;
        const pitch = player.game.tpCamera.rig.pitch;
        const forward = new THREE.Vector3(
          Math.sin(yaw) * Math.cos(pitch),
          0,
          Math.cos(yaw) * Math.cos(pitch)
        ).normalize();
        vel = forward.multiplyScalar(10);
        vel.y = 7;
      }
      this._doRip(vel);
      return;
    }

    const handPos = player.getHandPosition();

    // Update flying / dying vines
    for (let i = this.vines.length - 1; i >= 0; i--) {
      const vine = this.vines[i];
      if (vine.state === 'flying') {
        vine.flyDist += VINE_SPEED * dt;
        const end = vine.origin.clone().addScaledVector(vine.direction, Math.min(vine.flyDist, vine.maxFlyDist));
        vine.geo.setFromPoints([handPos.clone(), end]);
        if (vine.flyDist >= vine.maxFlyDist) {
          vine.state = 'dying';
          vine.dieTimer = 0.12;
        }
      } else if (vine.state === 'dying') {
        vine.dieTimer -= dt;
        if (vine.dieTimer <= 0) {
          this.scene.remove(vine.line);
          vine.geo.dispose();
          vine.line.material.dispose();
          this.vines.splice(i, 1);
          continue;
        }
        const end = vine.origin.clone().addScaledVector(vine.direction, vine.maxFlyDist);
        vine.geo.setFromPoints([handPos.clone(), end]);
        vine.line.material.opacity = Math.max(0, vine.dieTimer / 0.12);
        vine.line.material.transparent = true;
      } else if (vine.state === 'attached') {
        vine.geo.setFromPoints([handPos.clone(), vine.anchor]);
      }
    }

    const attached = this.vines.filter(v => v.state === 'attached');
    if (this.isGrappled && attached.length === 0) {
      this._doRip();
      return;
    }
    if (!this.isGrappled) return;

    // Compute average anchor and wall normal
    const avgAnchor = new THREE.Vector3();
    let avgNormal = new THREE.Vector3(0, 1, 0);
    for (const vine of attached) {
      avgAnchor.add(vine.anchor);
      if (vine.normal) avgNormal.add(vine.normal);
    }
    avgAnchor.divideScalar(attached.length);
    avgNormal.normalize();

    if (this.state === 'pulling') {
      // ── Pull phase ──
      const toAnchor = avgAnchor.clone().sub(player.position);
      const dist = toAnchor.length();

      if (dist < WALL_STICK_DIST) {
        // ── Reached wall, stick to it ──
        this.state = 'stuck';
        this.wallNormal.copy(avgNormal);
        this.stickPosition.copy(avgAnchor).addScaledVector(avgNormal, WALL_STICK_OFFSET);

        // Face away from wall
        const awayYaw = Math.atan2(-avgNormal.x, -avgNormal.z);
        player.rotation = awayYaw;
        if (player.game?.tpCamera) {
          player.game.tpCamera.rig.desiredYaw = awayYaw;
          player.game.tpCamera.rig.displayYaw = awayYaw;
          player.game.tpCamera.rig.manualRecenteringTimer = 0;
        }
      } else {
        // Strong pull toward anchor
        toAnchor.normalize();
        this.momentum.addScaledVector(toAnchor, WALL_PULL_ACCEL * dt);
        this.momentum.y += -6 * dt;
        this.momentum.multiplyScalar(0.94);

        const speed = this.momentum.length();
        if (speed > WALL_PULL_MAX_SPEED) {
          this.momentum.multiplyScalar(WALL_PULL_MAX_SPEED / speed);
        }

        player.position.x += this.momentum.x * dt;
        player.position.y += this.momentum.y * dt;
        player.position.z += this.momentum.z * dt;
      }
    }

    if (this.state === 'stuck') {
      // ── Stuck to wall ──
      player.position.copy(this.stickPosition);

      // Keep player facing roughly away from wall (mouse can override via camera)
      // Sync player rotation with camera yaw so mesh faces right way if camera ever goes 3rd person
      if (player.game?.tpCamera) {
        player.rotation = player.game.tpCamera.rig.displayYaw;
      }
    }

    // Override grounded/wallslide state while grappled
    player.isGrounded = false;
    player.isWallSliding = false;
    player.coyoteTimer = 0;
    player.velocity.set(0, 0, 0);
    player.jetVelocity.set(0, 0);
    player.slideVelocity.set(0, 0);
  }
}
