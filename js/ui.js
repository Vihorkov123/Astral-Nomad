'use strict';

const UI = {
  els: {},
  dialogQueue: [],
  dialogDone: null,
  typing: false,
  typeTimer: null,
  modalOpen: false,

  $(id) { return document.getElementById(id); },

  init() {
    const ids = [
      'hud', 'hp-bar', 'hp-text', 'res-food', 'res-gold', 'res-meds', 'res-parts',
      'res-weapon', 'buff-row',
      'star-name', 'star-progress', 'prompt', 'toasts',
      'dialog', 'dlg-who', 'dlg-text',
      'modal', 'modal-title', 'modal-desc', 'modal-buttons',
      'screen-menu', 'screen-starmap', 'screen-death', 'screen-ending',
      'screen-pause', 'screen-settings',
      'btn-continue', 'btn-new', 'btn-settings',
      'star-list', 'btn-map-back',
      'death-text', 'btn-respawn',
      'ending-title', 'ending-text', 'btn-ending-continue', 'btn-ending-menu',
      'btn-resume', 'btn-pause-map', 'btn-pause-settings', 'btn-pause-menu',
      'btn-settings-back', 'vol-master', 'vol-music', 'vol-sfx'
    ];
    ids.forEach(id => { this.els[id] = this.$(id); });

    this._bindMenu();
    this._bindSettings();
    this.els['dialog'].addEventListener('click', () => this.advanceDialog());
  },

  // ---------- Экраны ----------
  showScreen(name) {
    ['screen-menu', 'screen-starmap', 'screen-death', 'screen-ending', 'screen-pause', 'screen-settings']
      .forEach(s => this.els[s].classList.add('hidden'));
    if (name) this.els[name].classList.remove('hidden');
  },

  anyScreenOpen() {
    return ['screen-menu', 'screen-starmap', 'screen-death', 'screen-ending', 'screen-pause', 'screen-settings']
      .some(s => !this.els[s].classList.contains('hidden'));
  },

  showHud(show) { this.els['hud'].classList.toggle('hidden', !show); },

  // ---------- Главное меню ----------
  _bindMenu() {
    const click = (id, fn) => this.els[id].addEventListener('click', () => { AudioSys.init(); AudioSys.sfx('ui'); fn(); });

    click('btn-new', () => {
      if (SaveSys.hasProgress()) {
        this.confirm('Новая игра', 'Текущий прогресс будет удалён. Начать заново?', () => Game.newGame());
      } else {
        Game.newGame();
      }
    });
    click('btn-continue', () => Game.continueGame());
    click('btn-settings', () => { this._settingsFrom = 'screen-menu'; this.openSettings(); });

    click('btn-map-back', () => Game.closeStarMap());

    click('btn-respawn', () => Game.respawn());

    click('btn-ending-menu', () => Game.toMenu());
    click('btn-ending-continue', () => Game.afterEnding2());

    click('btn-resume', () => Game.closePause());
    click('btn-pause-map', () => { Game.closePause(true); Game.openStarMap(); });
    click('btn-pause-settings', () => { this._settingsFrom = 'screen-pause'; this.openSettings(); });
    click('btn-pause-menu', () => Game.toMenu());

    click('btn-settings-back', () => {
      this.showScreen(this._settingsFrom === 'screen-pause' ? 'screen-pause' : 'screen-menu');
    });
  },

  refreshMenu() {
    this.els['btn-continue'].classList.toggle('hidden', !SaveSys.hasProgress());
    this.els['btn-new'].textContent = SaveSys.hasProgress() ? 'Новая игра' : 'Начать';
  },

  // ---------- Настройки ----------
  _bindSettings() {
    const bind = (id, kind) => {
      this.els[id].addEventListener('input', e => {
        AudioSys.setVolume(kind, e.target.value / 100);
      });
    };
    bind('vol-master', 'master');
    bind('vol-music', 'music');
    bind('vol-sfx', 'sfx');
  },

  openSettings() {
    const v = SaveSys.data.vol;
    this.els['vol-master'].value = Math.round(v.master * 100);
    this.els['vol-music'].value = Math.round(v.music * 100);
    this.els['vol-sfx'].value = Math.round(v.sfx * 100);
    this.showScreen('screen-settings');
  },

  // ---------- HUD ----------
  updateHud() {
    const d = SaveSys.data;
    const p = Game.player;
    if (!p) return;
    const hpPct = Math.max(0, p.hp / p.maxHp * 100);
    this.els['hp-bar'].style.width = hpPct + '%';
    this.els['hp-text'].textContent = Math.max(0, Math.ceil(p.hp)) + ' / ' + p.maxHp;
    this.els['res-food'].textContent = d.food;
    this.els['res-gold'].textContent = d.gold;
    this.els['res-meds'].textContent = d.meds;
    this.els['res-parts'].textContent = d.parts;
    this.els['res-weapon'].textContent = (Ents.WEAPONS[d.curWeapon] || Ents.WEAPONS.knife).short;

    const buffs = [];
    if (p.buffSpeed > 0) buffs.push('⚡ скорость ' + Math.ceil(p.buffSpeed) + ' с');
    if (p.buffDmg > 0) buffs.push('🗡 урон ' + Math.ceil(p.buffDmg) + ' с');
    this.els['buff-row'].textContent = buffs.join(' · ');

    const star = Game.star;
    if (star) {
      this.els['star-name'].textContent = 'Сектор ' + (star.id + 1) + ': ' + star.name;
      const opened = SaveSys.starOpened(star.id).length;
      const total = star.small + star.big;
      this.els['star-progress'].textContent = star.finale
        ? 'Финальный сектор'
        : 'Контейнеры: ' + opened + ' / ' + total + (star.needOpen > opened ? ' (для нового сектора: ' + star.needOpen + ')' : ' ✓');
    }
  },

  setPrompt(text) {
    if (text) {
      this.els['prompt'].textContent = text;
      this.els['prompt'].classList.remove('hidden');
    } else {
      this.els['prompt'].classList.add('hidden');
    }
  },

  toast(text, cls) {
    const el = document.createElement('div');
    el.className = 'toast' + (cls ? ' ' + cls : '');
    el.textContent = text;
    this.els['toasts'].appendChild(el);
    setTimeout(() => el.remove(), 3200);
  },

  // ---------- Диалоги ----------
  say(lines, done) {
    this.dialogQueue = lines.slice();
    this.dialogDone = done || null;
    this.els['dialog'].classList.remove('hidden');
    this._nextLine();
  },

  dialogOpenNow() { return !this.els['dialog'].classList.contains('hidden'); },

  _nextLine() {
    const line = this.dialogQueue.shift();
    if (!line) {
      this.els['dialog'].classList.add('hidden');
      const cb = this.dialogDone;
      this.dialogDone = null;
      if (cb) cb();
      return;
    }
    this.els['dlg-who'].textContent = line.who || '';
    this.els['dlg-who'].style.display = line.who ? 'block' : 'none';
    const target = this.els['dlg-text'];
    target.textContent = '';
    this.typing = true;
    let i = 0;
    clearInterval(this.typeTimer);
    this.typeTimer = setInterval(() => {
      target.textContent = line.text.slice(0, ++i);
      if (i >= line.text.length) {
        clearInterval(this.typeTimer);
        this.typing = false;
      }
    }, 9);
    this._currentLine = line;
  },

  advanceDialog() {
    if (!this.dialogOpenNow()) return;
    if (this.typing) {
      clearInterval(this.typeTimer);
      this.typing = false;
      this.els['dlg-text'].textContent = this._currentLine.text;
    } else {
      AudioSys.sfx('ui');
      this._nextLine();
    }
  },

  // ---------- Модальные окна ----------
  // options: [{ label, cls, cb }]
  modal(title, desc, options) {
    this.modalOpen = true;
    this.els['modal-title'].textContent = title;
    this.els['modal-desc'].textContent = desc;
    const box = this.els['modal-buttons'];
    box.innerHTML = '';
    options.forEach(opt => {
      const b = document.createElement('button');
      b.className = 'btn choice' + (opt.cls ? ' ' + opt.cls : '');
      b.textContent = opt.label;
      b.addEventListener('click', () => {
        AudioSys.sfx('ui');
        this.closeModal();
        if (opt.cb) opt.cb();
      });
      box.appendChild(b);
    });
    this.els['modal'].classList.remove('hidden');
  },

  confirm(title, desc, yes) {
    this.modal(title, desc, [
      { label: 'Да', cls: 'danger', cb: yes },
      { label: 'Нет' }
    ]);
  },

  closeModal() {
    this.modalOpen = false;
    this.els['modal'].classList.add('hidden');
  },

  // ---------- Карта звёзд ----------
  buildStarMap() {
    const d = SaveSys.data;
    const list = this.els['star-list'];
    list.innerHTML = '';
    let count = Math.max(BASE_STARS.length, d.endless ? d.maxStar + 2 : 0);
    for (let i = 0; i < count; i++) {
      const star = getStar(i);
      const unlocked = i <= d.maxStar;
      const item = document.createElement('button');
      item.className = 'star-item' + (unlocked ? '' : ' locked');
      const opened = SaveSys.starOpened(i).length;
      const total = star.small + star.big;
      item.innerHTML =
        '<span><b>Сектор ' + (i + 1) + ': ' + star.name + '</b>' +
        '<div class="star-sub">' + (unlocked
          ? star.desc + (total ? ' · Контейнеры: ' + opened + '/' + total : '')
          : 'Заблокировано — вскрой контейнеры в предыдущем секторе') + '</div></span>' +
        '<span class="star-mark">' + (unlocked ? (i === d.currentStar ? '◉' : '○') : '🔒') + '</span>';
      if (unlocked) {
        item.addEventListener('click', () => { AudioSys.sfx('ui'); Game.travelTo(i); });
      }
      list.appendChild(item);
    }
  },

  // ---------- Экраны смерти и концовок ----------
  showDeath() {
    this.els['death-text'].textContent = Story.DEATH_SCREEN;
    this.showScreen('screen-death');
  },

  showEnding(n) {
    const e = n === 1 ? Story.ENDING1 : Story.ENDING2;
    this.els['ending-title'].textContent = e.title;
    this.els['ending-text'].textContent = e.text;
    this.els['btn-ending-continue'].classList.toggle('hidden', n !== 2);
    this.showScreen('screen-ending');
  },

  // ---------- Клавиатура для UI ----------
  onKeyDown(code) {
    if (this.dialogOpenNow() && ['KeyE', 'Enter', 'Space'].includes(code)) {
      this.advanceDialog();
      return;
    }
    if (code === 'Escape' && window.Game) Game.onEscape();
  }
};

window.UI = UI;
