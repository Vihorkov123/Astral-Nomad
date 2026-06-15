'use strict';

(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    Game.view = { w: window.innerWidth, h: window.innerHeight, dpr };
  }
  window.addEventListener('resize', resize);
  resize();

  const unlockAudio = () => { AudioSys.init(); AudioSys.resume(); };
  document.addEventListener('pointerdown', unlockAudio);
  document.addEventListener('keydown', unlockAudio);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); 
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

    await SDK.init();       
    await SaveSys.load();    

    AudioSys.applyVolumes();
    UI.refreshMenu();
    UI.showScreen('screen-menu');

    SDK.loadingReady();     

    requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
  }

  window.addEventListener('load', boot);
})();
