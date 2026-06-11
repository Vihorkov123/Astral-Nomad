'use strict';

// Мост к Yandex Games SDK.
// На площадке Яндекса /sdk.js существует; локально его нет — все методы
// тихо падают в fallback на localStorage, игра остаётся полностью рабочей.
const SDK = {
  ysdk: null,
  player: null,
  LS_KEY: 'astral_nomad_save',

  // Подключаем /sdk.js динамически: onerror не валит страницу,
  // билд не зависит от внешних CDN.
  _loadScript() {
    return new Promise(resolve => {
      const s = document.createElement('script');
      s.src = '/sdk.js';
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
      setTimeout(() => resolve(false), 4000); // страховка от зависшей загрузки
    });
  },

  async init() {
    try {
      const loaded = await this._loadScript();
      if (loaded && window.YaGames) {
        this.ysdk = await YaGames.init();
        this.player = await this.ysdk.getPlayer().catch(() => null);
      }
    } catch (e) {
      this.ysdk = null;
      this.player = null;
    }
    this._installAutoPause();
  },

  // Сообщаем платформе, что игра загрузилась (обязательное требование Яндекса)
  loadingReady() {
    try { this.ysdk && this.ysdk.features.LoadingAPI && this.ysdk.features.LoadingAPI.ready(); } catch (e) {}
  },

  gameplayStart() {
    try { this.ysdk && this.ysdk.features.GameplayAPI && this.ysdk.features.GameplayAPI.start(); } catch (e) {}
  },

  gameplayStop() {
    try { this.ysdk && this.ysdk.features.GameplayAPI && this.ysdk.features.GameplayAPI.stop(); } catch (e) {}
  },

  // --- Автопауза при сворачивании вкладки/окна ---
  _installAutoPause() {
    const onHide = () => { if (window.Game) Game.setAutoPause(true); };
    const onShow = () => { if (window.Game) Game.setAutoPause(false); };

    document.addEventListener('visibilitychange', () => {
      document.visibilityState === 'hidden' ? onHide() : onShow();
    });
    window.addEventListener('blur', onHide);
    window.addEventListener('focus', onShow);
    window.addEventListener('pagehide', onHide); // Safari

    // Событие паузы от самой платформы Яндекса (оверлеи, реклама и т.п.)
    try {
      if (this.ysdk && this.ysdk.on) {
        this.ysdk.on('game_api_pause', onHide);
        this.ysdk.on('game_api_resume', onShow);
      }
    } catch (e) {}
  },

  // --- Облачные сохранения с fallback ---

  // Всегда пишем в localStorage (мгновенный локальный бэкап),
  // затем пытаемся отправить в облако.
  async savePlayerData(data) {
    const json = JSON.stringify(data);
    let okLocal = false;
    try { localStorage.setItem(this.LS_KEY, json); okLocal = true; } catch (e) {}

    if (this.player) {
      try {
        await this.player.setData(data, true);
        return true;
      } catch (e) {
        return okLocal; // облако недоступно — спасает локальная копия
      }
    }
    return okLocal;
  },

  async getPlayerData() {
    let local = null;
    try {
      const raw = localStorage.getItem(this.LS_KEY);
      if (raw) local = JSON.parse(raw);
    } catch (e) {}

    let cloud = null;
    if (this.player) {
      try { cloud = await this.player.getData(); } catch (e) { cloud = null; }
      if (cloud && Object.keys(cloud).length === 0) cloud = null;
    }

    // Конфликт облако/локаль: выигрывает больший прогресс
    if (cloud && local) {
      const cs = (cloud.maxStar || 0) * 100000 + (cloud.gold || 0);
      const ls = (local.maxStar || 0) * 100000 + (local.gold || 0);
      return cs >= ls ? cloud : local;
    }
    return cloud || local;
  }
};
