'use strict';

(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  function resize() {
    // Буфер — в физических пикселях (чётко на любом DPI),
    // логика и камера — в CSS-пикселях: любой аспект 21:9 / 16:9 / 4:3
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    Game.view = { w: window.innerWidth, h: window.innerHeight, dpr };
  }
  window.addEventListener('resize', resize);
  resize();

  // Браузеры разрешают звук только после жеста пользователя
  const unlockAudio = () => { AudioSys.init(); AudioSys.resume(); };
  document.addEventListener('pointerdown', unlockAudio);
  document.addEventListener('keydown', unlockAudio);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); // защита от скачка после паузы
    last = now;

    if (!Game.autoPaused) Game.update(dt);
    else Game.time += dt;

    const v = Game.view;
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    Game.render(ctx, v.w, v.h);
    if (Game.state === 'play' && Game.player) UI.updateHud();

    Input.endFrame();
    requestAnimationFrame(frame);
  }

  async function boot() {
    Input.init();
    UI.init();

    await SDK.init();        // Yandex SDK или тихий fallback
    await SaveSys.load();    // облако → localStorage → новый профиль

    AudioSys.applyVolumes();
    UI.refreshMenu();
    UI.showScreen('screen-menu');

    SDK.loadingReady();      // сообщаем платформе: игра готова

    requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
  }

  window.addEventListener('load', boot);
})();
