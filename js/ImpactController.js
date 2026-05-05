export class ImpactController {
  constructor(camera) {
    this.camera = camera;
    this.baseFov = camera.fov;
    this.hitStopTimer = 0;
    this.shakeTimer = 0;
    this.shakeDuration = 0;
    this.shakeStrength = 0;
    this.fovKick = 0;
  }

  applyTime(dt) {
    if (this.hitStopTimer > 0) {
      this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);
      return dt * 0.08;
    }
    return dt;
  }

  update(dt) {
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    }
    this.fovKick += (0 - this.fovKick) * Math.min(1, dt * 8);
    const nextFov = this.baseFov + this.fovKick;
    if (Math.abs(this.camera.fov - nextFov) > 0.01) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }
  }

  hitStop(duration = 0.07) {
    this.hitStopTimer = Math.max(this.hitStopTimer, duration);
  }

  shake(strength = 0.08, duration = 0.18) {
    this.shakeStrength = Math.max(this.shakeStrength, strength);
    this.shakeDuration = duration;
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  kick(amount = 2.5) {
    this.fovKick = Math.max(this.fovKick, amount);
  }

  applyCameraShake(camera) {
    if (this.shakeTimer <= 0 || this.shakeDuration <= 0) return;
    const falloff = this.shakeTimer / this.shakeDuration;
    const strength = this.shakeStrength * falloff;
    camera.position.x += (Math.random() - 0.5) * strength;
    camera.position.y += (Math.random() - 0.5) * strength * 0.6;
    camera.position.z += (Math.random() - 0.5) * strength;
  }

  pulse(type) {
    if (type === 'throw') {
      this.kick(1.8);
      this.shake(0.025, 0.08);
    } else if (type === 'hit') {
      this.hitStop(0.08);
      this.shake(0.08, 0.16);
      this.kick(2.2);
    } else if (type === 'capture') {
      this.hitStop(0.11);
      this.shake(0.12, 0.24);
      this.kick(3.0);
    } else if (type === 'escape') {
      this.hitStop(0.06);
      this.shake(0.1, 0.2);
    }
  }
}
