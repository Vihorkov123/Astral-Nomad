'use strict';

// Ввод по event.code — не зависит от раскладки (E работает и на «У»)
const Input = {
  down: {},
  pressed: {},

  init() {
    window.addEventListener('keydown', e => {
      // Не даём странице скроллиться стрелками/пробелом и уводить фокус по Tab
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }
      if (!this.down[e.code]) this.pressed[e.code] = true;
      this.down[e.code] = true;

      if (window.UI) UI.onKeyDown(e.code);
    });

    window.addEventListener('keyup', e => { this.down[e.code] = false; });

    // При потере фокуса сбрасываем зажатые клавиши, чтобы герой не «бежал сам»
    window.addEventListener('blur', () => { this.down = {}; this.pressed = {}; });
  },

  isDown(code) { return !!this.down[code]; },
  wasPressed(code) { return !!this.pressed[code]; },
  endFrame() { this.pressed = {}; },

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
