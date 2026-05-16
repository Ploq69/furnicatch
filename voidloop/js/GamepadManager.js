/**
 * GamepadManager — Gamepad API input for Voidloop
 * Polls navigator.getGamepads() and writes into the input singleton.
 * Follows the same pattern as TouchControls.js.
 */

import { input } from './InputManager.js';
import { settings } from './SettingsManager.js';

// Standard gamepad button indices (per W3C Gamepad spec)
const BUTTONS = {
  A: 0,           // Cross (PS), B (Nintendo)
  B: 1,           // Circle (PS), A (Nintendo)
  X: 2,           // Square (PS), Y (Nintendo)
  Y: 3,           // Triangle (PS), X (Nintendo)
  LB: 4,          // L1
  RB: 5,          // R1
  LT: 6,          // L2
  RT: 7,          // R2
  SELECT: 8,      // View / Share / Minus
  START: 9,       // Menu / Options / Plus
  LSTICK: 10,     // L3
  RSTICK: 11,     // R3
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
};

// Axes
const AXES = {
  LEFT_X: 0,
  LEFT_Y: 1,
  RIGHT_X: 2,
  RIGHT_Y: 3,
};

// Dead zone helpers
function applyCircularDeadZone(x, y, threshold) {
  const len = Math.sqrt(x * x + y * y);
  if (len < threshold) return { x: 0, y: 0 };
  const scale = Math.min(1, (len - threshold) / (1 - threshold)) / len;
  return { x: x * scale, y: y * scale };
}

export class GamepadManager {
  constructor() {
    this.connected = false;
    this.gamepadIndex = null;
    this.gamepadId = null;
    this._prevButtons = {};
    this._weaponCycleCooldown = 0;

    this.onConnect = null;
    this.onDisconnect = null;

    window.addEventListener('gamepadconnected', (e) => this._onConnect(e));
    window.addEventListener('gamepaddisconnected', (e) => this._onDisconnect(e));

    // Some browsers don't fire gamepadconnected until a button is pressed.
    // Poll once at startup to catch already-connected pads.
    this._scanForGamepads();
  }

  _scanForGamepads() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < pads.length; i++) {
      const pad = pads[i];
      if (pad && !this.connected) {
        this._adopt(pad, i);
        break;
      }
    }
  }

  _onConnect(e) {
    if (this.connected) return; // stick with first connected pad
    this._adopt(e.gamepad, e.gamepad.index);
  }

  _onDisconnect(e) {
    if (e.gamepad.index !== this.gamepadIndex) return;
    this.connected = false;
    this.gamepadIndex = null;
    this.gamepadId = null;
    input.gamepad.connected = false;
    input.gamepad.id = null;
    this._clearInput();
    if (this.onDisconnect) this.onDisconnect();
  }

  _adopt(pad, index) {
    this.connected = true;
    this.gamepadIndex = index;
    this.gamepadId = pad.id;
    input.gamepad.connected = true;
    input.gamepad.id = pad.id;
    if (this.onConnect) this.onConnect(pad.id);
  }

  /** Call once per frame from the game loop */
  update(dt) {
    if (!this.connected || this.gamepadIndex == null) {
      // Keep scanning in case browser missed the event
      this._scanForGamepads();
      return;
    }

    if (!settings.get('gamepadEnabled')) {
      this._clearInput();
      return;
    }

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads[this.gamepadIndex];
    if (!pad) {
      // disconnected without event
      this._onDisconnect({ gamepad: { index: this.gamepadIndex } });
      return;
    }

    const deadZone = settings.get('gamepadDeadZone') ?? 0.12;
    const lookSensitivity = settings.get('gamepadLookSensitivity') ?? 1.0;

    // ---- Analog sticks ----
    const left = applyCircularDeadZone(pad.axes[AXES.LEFT_X] || 0, pad.axes[AXES.LEFT_Y] || 0, deadZone);
    const right = applyCircularDeadZone(pad.axes[AXES.RIGHT_X] || 0, pad.axes[AXES.RIGHT_Y] || 0, deadZone);

    input.gamepad.leftX = left.x;
    input.gamepad.leftY = left.y;
    input.gamepad.rightX = right.x * lookSensitivity;
    input.gamepad.rightY = right.y * lookSensitivity;

    // ---- Build current button state ----
    const btns = pad.buttons;
    const cur = {};
    for (const [name, idx] of Object.entries(BUTTONS)) {
      const b = btns[idx];
      cur[name] = b ? (b.pressed || b.value > 0.5) : false;
    }

    // ---- Actions mapping ----
    // Write to input.gamepadKeys so keyboard state never interferes

    // Jump (A/Cross)
    this._mapButton(cur, 'A', 'Space');
    // Dodge (B/Circle)
    this._mapButton(cur, 'B', 'AltLeft');
    // Attack (X/Square)
    this._mapButton(cur, 'X', 'KeyJ');
    // Missile strike (Y/Triangle)
    this._mapButton(cur, 'Y', 'KeyQ');

    // Sprint (LB hold)
    input.gamepadKeys['ShiftLeft'] = cur.LB;
    // Block (RB hold)
    input.gamepadButtons.right = cur.RB;

    // Swim down / descend (LT)
    input.gamepadKeys['ControlLeft'] = cur.LT;
    input.gamepadKeys['ControlRight'] = cur.LT;

    // Camera toggle (D-Pad Up)
    this._mapButton(cur, 'DPAD_UP', 'KeyV');
    // Recenter camera (D-Pad Down)
    this._mapButton(cur, 'DPAD_DOWN', 'KeyR');

    // Pause (Start)
    this._mapButton(cur, 'START', 'Escape');
    // Shop (Select)
    this._mapButton(cur, 'SELECT', 'KeyB');
    // Loadout (L3)
    this._mapButton(cur, 'LSTICK', 'KeyI');
    // Pet den (R3)
    this._mapButton(cur, 'RSTICK', 'KeyP');

    // Weapon cycling with cooldown to prevent rapid switching
    this._weaponCycleCooldown = Math.max(0, this._weaponCycleCooldown - dt);
    if (this._weaponCycleCooldown <= 0) {
      if (cur.DPAD_LEFT) {
        window._game?.player?.cycleWeapon?.(-1);
        this._weaponCycleCooldown = 0.25;
      } else if (cur.DPAD_RIGHT) {
        window._game?.player?.cycleWeapon?.(1);
        this._weaponCycleCooldown = 0.25;
      }
    }

    // Store previous for next frame
    this._prevButtons = cur;
  }

  _mapButton(cur, gamepadBtn, keyCode) {
    input.gamepadKeys[keyCode] = !!cur[gamepadBtn];
  }

  _clearInput() {
    input.gamepad.leftX = 0;
    input.gamepad.leftY = 0;
    input.gamepad.rightX = 0;
    input.gamepad.rightY = 0;
    input.gamepadKeys = {};
    input.gamepadButtons = {};
  }

  /** Trigger haptic pulse if supported and enabled */
  vibrate(strength = 0.5, duration = 100) {
    if (!settings.get('gamepadVibration')) return;
    if (!this.connected || this.gamepadIndex == null) return;
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const pad = pads[this.gamepadIndex];
      if (pad?.vibrationActuator) {
        pad.vibrationActuator.playEffect('dual-rumble', {
          duration,
          strongMagnitude: strength,
          weakMagnitude: strength * 0.6,
        });
      } else if (pad?.hapticActuators?.[0]) {
        pad.hapticActuators[0].pulse(strength, duration);
      }
    } catch (e) {
      // ignore unsupported haptics
    }
  }
}

export const gamepadManager = new GamepadManager();
