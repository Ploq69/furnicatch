class InputManager {
  constructor() {
    this.keys = {};
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, locked: false, initialized: false };
    this.mouseDown = { left: false, right: false };
    this.justPressed = new Set();
    this.mouseJustPressed = { left: false, right: false };
    this.scrollDelta = 0;
    this.aimToggled = false;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);
  }

  attach() {
    this.mouse.x = window.innerWidth / 2;
    this.mouse.y = window.innerHeight / 2;
    this.mouse.initialized = true;
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mouseup', this._onMouseUp);
    document.addEventListener('contextmenu', this._onContextMenu);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    document.addEventListener('wheel', this._onWheel, { passive: false });
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mousedown', this._onMouseDown);
    document.removeEventListener('mouseup', this._onMouseUp);
    document.removeEventListener('contextmenu', this._onContextMenu);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    document.removeEventListener('wheel', this._onWheel);
  }

  _onKeyDown(e) {
    this.keys[e.code] = true;
    this.justPressed.add(e.code);
    if (e.code === 'KeyF' && !e.repeat) {
      this.aimToggled = !this.aimToggled;
      if (this.aimToggled) {
        document.body.requestPointerLock?.();
      } else if (document.pointerLockElement === document.body) {
        document.exitPointerLock?.();
      }
    }
  }

  _onKeyUp(e) {
    this.keys[e.code] = false;
  }

  _onMouseMove(e) {
    if (!this.mouse.initialized) {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.initialized = true;
      return;
    }
    const mx = e.movementX !== undefined ? e.movementX : (e.clientX - this.mouse.x);
    const my = e.movementY !== undefined ? e.movementY : (e.clientY - this.mouse.y);
    this.mouse.dx += mx;
    this.mouse.dy += my;
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
  }

  _onMouseDown(e) {
    if (e.button === 0) { this.mouseDown.left = true; this.mouseJustPressed.left = true; }
    if (e.button === 2) { this.mouseDown.right = true; this.mouseJustPressed.right = true; }
  }

  _onMouseUp(e) {
    if (e.button === 0) this.mouseDown.left = false;
    if (e.button === 2) this.mouseDown.right = false;
  }

  _onWheel = (e) => {
    e.preventDefault();
    this.scrollDelta += Math.sign(e.deltaY);
  };

  _onContextMenu = (e) => {
    e.preventDefault();
  };

  _onPointerLockChange() {
    this.mouse.locked = document.pointerLockElement === document.body;
    if (!this.mouse.locked) {
      this.aimToggled = false;
      this.mouse.x = window.innerWidth / 2;
      this.mouse.y = window.innerHeight / 2;
    }
  }

  isDown(code) {
    return !!this.keys[code];
  }

  wasJustPressed(code) {
    return this.justPressed.has(code);
  }

  consumePress(code) {
    this.justPressed.delete(code);
  }

  clearFrame() {
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    this.justPressed.clear();
    this.mouseJustPressed.left = false;
    this.mouseJustPressed.right = false;
    this.scrollDelta = 0;
  }

  getMovementVector() {
    let x = 0, z = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) z -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) z += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    if (x !== 0 || z !== 0) {
      const len = Math.sqrt(x * x + z * z);
      x /= len; z /= len;
    }
    return { x, z };
  }

  isSprinting() {
    return this.isDown('ShiftLeft') || this.isDown('ShiftRight');
  }

  isDodging() {
    return this.wasJustPressed('KeyQ');
  }

  isJumping() {
    return this.wasJustPressed('Space');
  }

  isAiming() {
    return this.aimToggled;
  }

  requestPointerLock(element) {
    element.requestPointerLock?.();
  }

  exitPointerLock() {
    document.exitPointerLock?.();
  }
}

export const input = new InputManager();
