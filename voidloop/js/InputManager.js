class InputManager {
  constructor() {
    this.keys = {};
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, locked: false };
    this.buttons = { left: false, right: false, middle: false };
    this.wheel = 0;

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

  isDown(code) { return !!this.keys[code]; }
  pressed(code) {
    if (this.keys[code] && !this._prevKeys?.[code]) return true;
    return false;
  }

  buttonPressed(button) {
    return !!this.buttons[button] && !this._prevButtons?.[button];
  }

  update() {
    this._prevKeys = { ...this.keys };
    this._prevButtons = { ...this.buttons };
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    this.wheel = 0;
  }
}

export const input = new InputManager();
