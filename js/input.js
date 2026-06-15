'use strict';

const Input = {
  down: {},
  pressed: {},
  mouse: { x: 0, y: 0, downLeft: false, pressedLeft: false, active: false },

  init() {
    window.addEventListener('keydown', e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }
      if (!this.down[e.code]) this.pressed[e.code] = true;
      this.down[e.code] = true;

      if (window.UI) UI.onKeyDown(e.code);
    });

    window.addEventListener('keyup', e => { this.down[e.code] = false; });

    window.addEventListener('blur', () => {
      this.down = {}; this.pressed = {};
      this.mouse.downLeft = false; this.mouse.pressedLeft = false;
    });

    const canvas = document.getElementById('game');
    const setPos = e => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
      this.mouse.active = true;
    };
    canvas.addEventListener('mousemove', setPos);
    canvas.addEventListener('mousedown', e => {
      setPos(e);
      if (e.button === 0) {
        if (!this.mouse.downLeft) this.mouse.pressedLeft = true;
        this.mouse.downLeft = true;
      }
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0) this.mouse.downLeft = false;
    });

    canvas.addEventListener('contextmenu', e => e.preventDefault());
  },

  isDown(code) { return !!this.down[code]; },
  wasPressed(code) { return !!this.pressed[code]; },
  endFrame() { this.pressed = {}; this.mouse.pressedLeft = false; },

  axis() {
    let x = 0, y = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) y -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) y += 1;
    if (x && y) { const k = Math.SQRT1_2; x *= k; y *= k; }
    return { x, y };
  }
};
