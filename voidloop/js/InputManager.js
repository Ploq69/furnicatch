class InputManager {
  constructor() {
    this.keys = {};
    this.gamepadKeys = {};
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, locked: false };
    this.buttons = { left: false, right: false, middle: false };
    this.gamepadButtons = {};
    this.wheel = 0;
    this.gamepad = { leftX: 0, leftY: 0, rightX: 0, rightY: 0, connected: false, id: null };

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.buttons.left = true;
      if (e.button === 1) this.buttons.middle = true;
      if (e.button === 2) this.buttons.right = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.buttons.left = false;
      if (e.button === 1) this.buttons.middle = false;
      if (e.button === 2) this.buttons.right = false;
    });
    window.addEventListener('mousemove', (e) => {
      this.mouse.dx = e.movementX;
      this.mouse.dy = e.movementY;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.locked = !!document.pointerLockElement;
    });
    document.addEventListener('pointerlockchange', () => {
      this.mouse.locked = !!document.pointerLockElement;
    });
    window.addEventListener('wheel', (e) => {
      this.wheel = e.deltaY;
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  isDown(code) { return !!this.keys[code] || !!this.gamepadKeys[code]; }
  pressed(code) {
    const kbPressed = this.keys[code] && !this._prevKeys?.[code];
    const gpPressed = this.gamepadKeys[code] && !this._prevGamepadKeys?.[code];
    return kbPressed || gpPressed;
  }

  isButtonDown(button) { return !!this.buttons[button] || !!this.gamepadButtons[button]; }

  buttonPressed(button) {
    const mousePressed = !!this.buttons[button] && !this._prevButtons?.[button];
    const gamepadPressed = !!this.gamepadButtons[button] && !this._prevGamepadButtons?.[button];
    return mousePressed || gamepadPressed;
  }

  update() {
    this._prevKeys = { ...this.keys };
    this._prevButtons = { ...this.buttons };
    this._prevGamepadKeys = { ...this.gamepadKeys };
    this._prevGamepadButtons = { ...this.gamepadButtons };
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    this.wheel = 0;
  }
}

export const input = new InputManager();
