'use strict';

const SaveSys = {
  data: null,
  _timer: null,

  def() {
    return {
      version: 1,
      gold: 0,
      food: 4,
      meds: 1,
      parts: 0,
      artifacts: [],       
      weapons: ['knife'],  
      curWeapon: 'knife',
      currentStar: 0,
      maxStar: 0,         
      endless: false,       
      endingSeen: null,    
      starState: {},      
      seen: {},            
      vol: { master: 1, music: 0.6, sfx: 1 }
    };
  },

  hasProgress() {
    const d = this.data;
    return !!(d && (d.seen.prologue || d.gold > 0 || d.maxStar > 0));
  },

  async load() {
    const stored = await SDK.getPlayerData();
    const def = this.def();
    if (stored && typeof stored === 'object') {
      this.data = Object.assign(def, stored);
      this.data.vol = Object.assign({ master: 1, music: 0.6, sfx: 1 }, stored.vol || {});
      this.data.seen = stored.seen || {};
      this.data.starState = stored.starState || {};
      this.data.artifacts = stored.artifacts || [];
      this.data.weapons = stored.weapons && stored.weapons.length ? stored.weapons : ['knife'];
      if (!this.data.weapons.includes(this.data.curWeapon)) this.data.curWeapon = 'knife';
    } else {
      this.data = def;
    }
  },

  reset() {
    const vol = this.data ? this.data.vol : null;
    this.data = this.def();
    if (vol) this.data.vol = vol;
    this.saveNow();
  },

  starOpened(starId) {
    const st = this.data.starState[starId];
    return st ? st.opened : [];
  },

  markChestOpened(starId, chestId) {
    if (!this.data.starState[starId]) this.data.starState[starId] = { opened: [] };
    const arr = this.data.starState[starId].opened;
    if (!arr.includes(chestId)) arr.push(chestId);
  },

  scheduleSave() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.saveNow(), 800);
  },

  saveNow() {
    clearTimeout(this._timer);
    if (!this.data) return;
    SDK.savePlayerData(this.data).then(ok => {
      if (!ok) console.warn('Сохранение не удалось: облако и localStorage недоступны');
    });
  }
};
