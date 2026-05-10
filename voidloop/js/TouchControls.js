/**
 * TouchControls — Virtual joystick + buttons for iPad/tablet play
 * Writes into the same input state as keyboard/mouse
 */

import { input } from './InputManager.js';

export class TouchControls {
  constructor() {
    this.active = false;
    this.el = document.getElementById('touch-controls');
    if (!this.el) return;

    // Only show on touch devices
    if (!('ontouchstart' in window)) return;

    this.active = true;
    this.el.style.display = 'block';

    // Joystick state
    this.joystickZone = document.getElementById('touch-joystick-zone');
    this.joystickKnob = document.getElementById('touch-joystick-knob');
    this.joystickTouchId = null;
    this.joystickCenter = { x: 0, y: 0 };
    this.joystickMax = 50; // max displacement in px

    // Sprint
    this.sprintBtn = document.getElementById('touch-sprint');
    this.sprintActive = false;

    // Attack
    this.attackBtn = document.getElementById('touch-attack');
    this.attackTouchId = null;

    // Block
    this.blockBtn = document.getElementById('touch-block');
    this.blockTouchId = null;

    // Hotbar
    this.hotbar = document.getElementById('touch-hotbar');

    // Loadout
    this.loadoutBtn = document.getElementById('touch-loadout');

    this._bindJoystick();
    this._bindSprint();
    this._bindAttack();
    this._bindBlock();
    this._bindHotbar();
    this._bindLoadout();
  }

  _bindJoystick() {
    const zone = this.joystickZone;
    if (!zone) return;

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this.joystickTouchId = t.identifier;
      const rect = zone.getBoundingClientRect();
      this.joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      this._updateJoystick(t.clientX, t.clientY);
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this.joystickTouchId) {
          this._updateJoystick(t.clientX, t.clientY);
        }
      }
    }, { passive: false });

    const endJoystick = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          this.joystickTouchId = null;
          this._resetJoystick();
        }
      }
    };
    zone.addEventListener('touchend', endJoystick);
    zone.addEventListener('touchcancel', endJoystick);
  }

  _updateJoystick(clientX, clientY) {
    const dx = clientX - this.joystickCenter.x;
    const dy = clientY - this.joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, this.joystickMax);
    const angle = Math.atan2(dy, dx);

    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;
    this.joystickKnob.style.transform = `translate(${kx}px, ${ky}px)`;

    // Map to WASD
    const nx = dx / this.joystickMax;
    const ny = dy / this.joystickMax;
    input.keys['KeyW'] = ny < -0.3;
    input.keys['KeyS'] = ny > 0.3;
    input.keys['KeyA'] = nx < -0.3;
    input.keys['KeyD'] = nx > 0.3;
  }

  _resetJoystick() {
    this.joystickKnob.style.transform = 'translate(0px, 0px)';
    input.keys['KeyW'] = false;
    input.keys['KeyS'] = false;
    input.keys['KeyA'] = false;
    input.keys['KeyD'] = false;
  }

  _bindSprint() {
    const btn = this.sprintBtn;
    if (!btn) return;

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.sprintActive = !this.sprintActive;
      input.keys['ShiftLeft'] = this.sprintActive;
      btn.style.background = this.sprintActive
        ? 'rgba(74,222,128,0.5)'
        : 'rgba(255,255,255,0.1)';
      btn.style.borderColor = this.sprintActive
        ? 'rgba(74,222,128,0.8)'
        : 'rgba(255,255,255,0.3)';
    }, { passive: false });
  }

  _bindAttack() {
    const btn = this.attackBtn;
    if (!btn) return;

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this.attackTouchId = t.identifier;
      input.keys['KeyJ'] = true;
      btn.style.transform = 'scale(0.92)';
    }, { passive: false });

    const endAttack = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.attackTouchId) {
          this.attackTouchId = null;
          // Keep KeyJ true for one more frame so pressed() catches it
          requestAnimationFrame(() => {
            input.keys['KeyJ'] = false;
          });
          btn.style.transform = 'scale(1)';
        }
      }
    };
    btn.addEventListener('touchend', endAttack);
    btn.addEventListener('touchcancel', endAttack);
  }

  _bindBlock() {
    const btn = this.blockBtn;
    if (!btn) return;

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this.blockTouchId = t.identifier;
      input.buttons.right = true;
      btn.style.transform = 'scale(0.92)';
      btn.style.background = 'rgba(59,130,246,0.7)';
    }, { passive: false });

    const endBlock = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.blockTouchId) {
          this.blockTouchId = null;
          input.buttons.right = false;
          btn.style.transform = 'scale(1)';
          btn.style.background = 'rgba(59,130,246,0.4)';
        }
      }
    };
    btn.addEventListener('touchend', endBlock);
    btn.addEventListener('touchcancel', endBlock);
  }

  _bindHotbar() {
    if (!this.hotbar) return;
    const slots = this.hotbar.querySelectorAll('[data-slot]');
    slots.forEach((slot) => {
      const idx = parseInt(slot.dataset.slot, 10);
      slot.addEventListener('touchstart', (e) => {
        e.preventDefault();
        input.keys[`Digit${idx + 1}`] = true;
        slot.style.borderColor = '#a855f7';
        slot.style.background = 'rgba(168,85,247,0.3)';
        // Clear after one frame
        requestAnimationFrame(() => {
          input.keys[`Digit${idx + 1}`] = false;
        });
      }, { passive: false });
    });
  }

  _bindLoadout() {
    const btn = this.loadoutBtn;
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      input.keys['KeyI'] = true;
      btn.style.transform = 'scale(0.92)';
      requestAnimationFrame(() => {
        input.keys['KeyI'] = false;
        btn.style.transform = 'scale(1)';
      });
    }, { passive: false });
  }
}
