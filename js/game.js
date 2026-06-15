'use strict';

const ZOOM = 1.5;
const MED_HEAL = 18; 
const REST_HEAL = 10; 
const CHEST_GUARD_RADIUS = 220;

const Game = {
  state: 'menu',          
  autoPaused: false,
  time: 0,
  view: { w: 1280, h: 720, dpr: 1 },

  star: null,
  world: null,
  player: null,
  monsters: [],
  particles: [],

  cam: { x: 0, y: 0, shake: 0 },

  foodTimer: 0,
  starveTimer: 0,
  lowHpWarned: false,



  newGame() {
    SaveSys.reset();
    UI.refreshMenu();
    UI.showScreen(null);
    SaveSys.data.seen.prologue = true;
    SaveSys.scheduleSave();
    UI.say(Story.PROLOGUE, () => this.openStarMap());
  },

  continueGame() {
    UI.showScreen(null);
    this.openStarMap();
  },

  toMenu() {
    SDK.gameplayStop();
    this.state = 'menu';
    this.world = null;
    this.player = null;
    this.monsters = [];
    UI.showHud(false);
    UI.setPrompt(null);
    UI.showScreen('screen-menu');
    UI.refreshMenu();
    SaveSys.saveNow();
  },


  openStarMap() {
    SDK.gameplayStop();
    UI.buildStarMap();
    UI.showScreen('screen-starmap');
  },

  closeStarMap() {
    if (this.world) {
      UI.showScreen(null);
      SDK.gameplayStart();
    } else {
      this.travelTo(SaveSys.data.currentStar);
    }
  },

  travelTo(i) {
    const d = SaveSys.data;
    if (i > d.maxStar) return;
    d.currentStar = i;
    this.star = getStar(i);
    this.world = buildWorld(this.star);
    this.player = Ents.makePlayer(this.world.capsule.x, this.world.capsule.y + 50);
    this.monsters = [];
    this.particles = [];
    this.foodTimer = 0;
    this.starveTimer = 0;
    this.lowHpWarned = false;
    this.state = 'play';

    for (let n = 0; n < (this.star.patrols || 0); n++) {
      let px = 0, py = 0, tries = 0;
      do {
        px = 60 + Math.random() * (this.world.w - 120);
        py = 60 + Math.random() * (this.world.h - 120);
        tries++;
      } while (tries < 80 && (
        Util.dist(px, py, this.world.capsule.x, this.world.capsule.y) < 300 ||
        spotBlocked(this.world, px, py, 18)));   
      const kind = this.star.id >= 2 && Math.random() < 0.35 ? 'knight' : 'bug';
      const pm = Ents.makeMonster(kind, px, py, this.star, null);
      pm.patrol = true; pm.aggro = false; pm.homeX = px; pm.homeY = py;
      this.monsters.push(pm);
    }

    if (this.star.guardian && !d.seen.guardianDead) {
      const total = this.star.small + this.star.big;
      const opened = SaveSys.starOpened(this.star.id);
      if (opened.length >= total) {
        const reopenId = total - 1; 
        const arr = SaveSys.data.starState[this.star.id].opened;
        const idx = arr.indexOf(reopenId);
        if (idx >= 0) arr.splice(idx, 1);
        const ch = this.world.chests.find(c => c.id === reopenId);
        if (ch) ch.opened = false;
        SaveSys.scheduleSave();
      }
    }

    UI.showScreen(null);
    UI.showHud(true);
    this._updateCamera();
    SaveSys.saveNow();
    SDK.gameplayStart();

    const seen = d.seen;
    if (i === 0 && !seen.act1) { seen.act1 = true; UI.say(Story.ACT1); SaveSys.scheduleSave(); }
    else if (i === 1 && !seen.act2) { seen.act2 = true; UI.say(Story.ACT2); SaveSys.scheduleSave(); }
    else if (i === 2 && !seen.mem3) { seen.mem3 = true; UI.say(Story.MEM3); SaveSys.scheduleSave(); }
    else if (i === 3 && !seen.act4) { seen.act4 = true; UI.say(Story.ACT4); SaveSys.scheduleSave(); }
    else if (i === 4 && !seen.finale) { seen.finale = true; UI.say(Story.FINALE_INTRO); SaveSys.scheduleSave(); }
  },


  openPause() {
    if (this.state !== 'play') return;
    SDK.gameplayStop();
    UI.showScreen('screen-pause');
  },

  closePause(silent) {
    UI.showScreen(null);
    if (!silent) SDK.gameplayStart();
  },

  onEscape() {
    if (UI.modalOpen) { UI.closeModal(); return; }
    if (UI.dialogOpenNow()) return;
    const s = UI.els;
    if (!s['screen-settings'].classList.contains('hidden')) {
      UI.showScreen(UI._settingsFrom === 'screen-pause' ? 'screen-pause' : 'screen-menu');
      return;
    }
    if (!s['screen-pause'].classList.contains('hidden')) { this.closePause(); return; }
    if (!s['screen-starmap'].classList.contains('hidden')) { if (this.world) this.closeStarMap(); return; }
    if (this.state === 'play' && !UI.anyScreenOpen()) this.openPause();
  },

  setAutoPause(hidden) {
    if (hidden) {
      this.autoPaused = true;
      AudioSys.suspend();
      if (this.state === 'play' && !UI.anyScreenOpen()) this.openPause();
    } else {
      this.autoPaused = false;
      AudioSys.resume();
    }
  },


  _chestTitle(type) {
    return type === 'small' ? 'Малый контейнер'
         : type === 'big' ? 'Большой контейнер' : 'Консоль капсулы';
  },

  monstersNear(x, y, r) {
    return this.monsters.some(m => Util.dist(x, y, m.x, m.y) < r);
  },

  mouseWorld() {
    return {
      x: this.cam.x + Input.mouse.x / ZOOM,
      y: this.cam.y + Input.mouse.y / ZOOM
    };
  },

  askOpenChest(chest) {
    const star = this.star;
    if (chest.type === 'final') { this.finaleChoice(); return; }

    const isBig = chest.type === 'big';
    const chance = isBig ? star.bigChance : star.smallChance;
    const mon = Story.MONSTERS[isBig ? 'knight' : 'bug'];
    const desc =
      'Шанс охраны: ' + Util.pct(chance) + '. Тип: «' + mon.name + '» (' + mon.hint + ').\n' +
      (isBig
        ? 'Награда: ×3 лома, аптечки, энергоячейка.'
        : 'Награда: еда и лом, иногда аптечка.');

    UI.modal('Вскрыть ' + this._chestTitle(chest.type).toLowerCase() + '?', desc, [
      { label: 'Вскрыть', cls: isBig ? 'danger' : '', cb: () => this.openChest(chest) },
      { label: 'Отойти' }
    ]);
  },

  openChest(chest) {
    const star = this.star;
    chest.opened = true;
    SaveSys.markChestOpened(star.id, chest.id);
    AudioSys.sfx('chest');
    this._burst(chest.x, chest.y, '#ffd76e', 10);

    const isBig = chest.type === 'big';
    const chance = isBig ? star.bigChance : star.smallChance;

    if (Math.random() < chance) {
      const kind = isBig ? 'knight' : 'bug';
      const a = Math.random() * Math.PI * 2;
      const m = Ents.makeMonster(kind, chest.x + Math.cos(a) * 30, chest.y + Math.sin(a) * 30, star, chest);
      this.monsters.push(m);
      
      if (isBig && star.id >= 2 && Math.random() < 0.5) {
        this.monsters.push(Ents.makeMonster('bug',
          chest.x - Math.cos(a) * 30, chest.y - Math.sin(a) * 30, star, null));
      }
      AudioSys.sfx('monster');
      this.cam.shake = 0.3;
      UI.toast('Из контейнера вырывается охрана: ' + Story.MONSTERS[kind].name + '!', 'danger');
    } else {
      this.grantLoot(chest, false);
      if (star.id === 0 && !SaveSys.data.seen.act1safe) {
        SaveSys.data.seen.act1safe = true;
        UI.say(Story.ACT1_SAFE);
      }
    }

    this.checkChestProgress();
    SaveSys.scheduleSave();
  },

  grantLoot(chest, riskBonus) {
    const star = this.star;
    const d = SaveSys.data;
    const isBig = chest.type === 'big';
    const k = riskBonus ? 1.5 : 1;

    let gold = Math.round((isBig ? 12 + Math.random() * 10 : 3 + Math.random() * 5) * star.goldMul * k);
    let food = isBig ? 2 + Math.floor(Math.random() * 2) : 1 + (Math.random() < 0.5 ? 1 : 0);
    let meds = isBig ? 1 : (Math.random() < 0.12 ? 1 : 0);
    let parts = isBig ? 1 : (riskBonus && Math.random() < 0.25 ? 1 : 0);

    d.gold += gold; d.food += food; d.meds += meds; d.parts += parts;

    AudioSys.sfx('loot');
    AudioSys.sfx('gold');
    this._burst(chest.x, chest.y, '#ffe9a0', 14);
    const parts_msg = [];
    if (gold) parts_msg.push('+' + gold + ' лома');
    if (food) parts_msg.push('+' + food + ' еды');
    if (meds) parts_msg.push('+' + meds + ' аптечка');
    if (parts) parts_msg.push('+' + parts + ' энергоячейка');
    if (parts_msg.length) UI.toast(parts_msg.join(', '), 'gold');

    if (isBig && !d.weapons.includes('plasma')) {
      d.weapons.push('plasma');
      d.curWeapon = 'plasma';
      UI.toast('Новое оружие: плазменный резак (Tab — смена)', 'gold');
      AudioSys.sfx('unlock');
    } else if (this.player && Math.random() < (isBig ? 0.35 : 0.15)) {
      if (Math.random() < 0.5) {
        this.player.buffSpeed = 20;
        UI.toast('Ускорение +40% на 20 с', 'gold');
      } else {
        this.player.buffDmg = 20;
        UI.toast('Урон +50% на 20 с', 'gold');
      }
      AudioSys.sfx('heal');
    }
  },

  checkChestProgress() {
    const star = this.star;
    const d = SaveSys.data;
    const opened = SaveSys.starOpened(star.id).length;
    const total = star.small + star.big;

    if (!star.finale && opened >= star.needOpen && d.maxStar === star.id) {
      const lastBase = BASE_STARS.length - 1;
      if (star.id < lastBase || d.endless) {
        d.maxStar = star.id + 1;
        AudioSys.sfx('unlock');
        UI.toast('Открыт новый сектор: ' + getStar(d.maxStar).name + '! (карта — у капсулы)', 'gold');
      }
    }

    if (star.guardian && opened >= total && !d.seen.guardianDead && !this.monsters.some(m => m.kind === 'guardian')) {
      const m = Ents.makeMonster('guardian', this.world.capsule.x, this.world.capsule.y - 180, star, null);
      this.monsters.push(m);
      AudioSys.sfx('guardian');
      this.cam.shake = 0.7;
      UI.say(Story.GUARDIAN_SPAWN);
    }
  },


  finaleChoice() {
    const c = Story.FINALE_CHOICE;
    const opts = [
      { label: c.safe, cb: () => this.ending(1) },
      { label: c.risky, cls: 'danger', cb: () => {
          UI.say(Story.ENDING2_DIALOG, () => this.ending(2));
        } }
    ];
    UI.modal(c.title, c.desc + (SaveSys.data.artifacts.includes('Ядро Стража')
      ? '\n\n«Ядро Стража» подключено: энергии хватит на любой путь.' : ''), opts);
  },

  ending(n) {
    const d = SaveSys.data;
    d.endingSeen = n;
    if (n === 2) {
      d.endless = true;
      d.maxStar = Math.max(d.maxStar, BASE_STARS.length); 
    }
    SDK.gameplayStop();
    SaveSys.saveNow();
    AudioSys.sfx(n === 1 ? 'unlock' : 'guardian');
    UI.showEnding(n);
  },

  afterEnding2() {
    this.openStarMap();
  },


  die() {
    const d = SaveSys.data;
    AudioSys.sfx('death');
    d.food = 0;
    d.gold = Math.floor(d.gold * 0.7);
    if (d.parts > 0) d.parts -= 1;
    SDK.gameplayStop();
    SaveSys.saveNow();
    UI.showDeath();
  },

  respawn() {
    const first = !SaveSys.data.seen.death;
    SaveSys.data.seen.death = true;

    this.travelTo(SaveSys.data.currentStar);
    if (first) UI.say(Story.ACT3_DEATH);
  },

 

  capsuleMenu() {
    const d = SaveSys.data;
    const opts = [];
    opts.push({
      label: 'Сон (−1 еда, +' + REST_HEAL + ' ОЗ)',
      cb: () => {
        if (d.food < 1) { UI.toast('Нет еды для сна', 'danger'); return; }
        d.food -= 1;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + REST_HEAL);
        if (this.monsters.length) {
          this.monsters = [];
          UI.toast('Дроны отступили от капсулы', 'danger');
        }
        AudioSys.sfx('heal');
        this.lowHpWarned = false;
        SaveSys.scheduleSave();
      }
    });
    opts.push({ label: 'Магазин', cb: () => this.openShop() });
    opts.push({ label: 'Карта секторов', cb: () => this.openStarMap() });
    opts.push({ label: 'Отмена' });
    UI.modal('Капсула', 'Сон, магазин и карта секторов.', opts);
  },

  SHOP_ITEMS: [
    { name: 'Еда +2', cost: 25, apply(d) { d.food += 2; } },
    { name: 'Аптечка +' + MED_HEAL + ' ОЗ', cost: 45, apply(d) { d.meds += 1; } },
    { name: 'Ускорение +40% на 25 с', cost: 30, apply(d, g) { if (g.player) g.player.buffSpeed = 25; } },
    { name: 'Урон +50% на 25 с', cost: 30, apply(d, g) { if (g.player) g.player.buffDmg = 25; } }
  ],

  buyShopItem(i) {
    const d = SaveSys.data;
    const it = this.SHOP_ITEMS[i];
    if (d.gold < it.cost) { UI.toast('Не хватает лома', 'danger'); return false; }
    d.gold -= it.cost;
    it.apply(d, this);
    AudioSys.sfx('gold');
    UI.toast('Куплено: ' + it.name);
    SaveSys.scheduleSave();
    return true;
  },

  openShop() {
    const d = SaveSys.data;
    const opts = this.SHOP_ITEMS.map((it, i) => ({
      label: it.name + ' — ' + it.cost + ' лома',
      cb: () => { this.buyShopItem(i); this.openShop(); } 
    }));
    opts.push({ label: 'Закрыть' });
    UI.modal('Магазин', 'Лом: ' + d.gold, opts);
  },


  _uiBlocked() {
    return UI.anyScreenOpen() || UI.dialogOpenNow() || UI.modalOpen;
  },

  update(dt) {
    this.time += dt;
    this.cam.shake = Math.max(0, this.cam.shake - dt);

    if (this.state !== 'play' || !this.world) return;

    this._updateWeather(dt);
    this._updateParticles(dt);

    if (this._uiBlocked() || this.autoPaused) return;

    const p = this.player;

    this.foodTimer += dt;
    if (this.foodTimer >= 15) {
      this.foodTimer = 0;
      const d = SaveSys.data;
      if (d.food > 0) {
        d.food -= 1;
        if (d.food === 1) UI.toast('Еда заканчивается!', 'danger');
        SaveSys.scheduleSave();
      }
    }
    if (SaveSys.data.food <= 0) {
      this.starveTimer += dt;
      if (this.starveTimer >= 3) {
        this.starveTimer = 0;
        p.hp -= 1;
        AudioSys.sfx('hurt');
        UI.toast('Голод! Ищи еду в сундуках.', 'danger');
        if (p.hp <= 0) { this.die(); return; }
      }
    } else {
      this.starveTimer = 0;
    }

    p.attackCd -= dt;
    p.attackAnim = Math.max(0, p.attackAnim - dt);
    p.dashCd -= dt;
    p.inv = Math.max(0, p.inv - dt);
    p.buffSpeed = Math.max(0, p.buffSpeed - dt);
    p.buffDmg = Math.max(0, p.buffDmg - dt);

    const speed = p.speed * (p.buffSpeed > 0 ? 1.4 : 1);
    const ax = Input.axis();
    if (p.dashT > 0) {
      p.dashT -= dt;
      p.x += p.dashDir.x * 430 * dt;
      p.y += p.dashDir.y * 430 * dt;
    } else {
      p.x += ax.x * speed * dt;
      p.y += ax.y * speed * dt;
      if (ax.x || ax.y) { p.face.x = ax.x; p.face.y = ax.y; }
    }
    collideWorld(p, this.world);

    if (Input.mouse.active) {
      const mw = this.mouseWorld();
      const dx = mw.x - p.x, dy = mw.y - p.y;
      const L = Math.hypot(dx, dy);
      if (L > 0.001) { p.face.x = dx / L; p.face.y = dy / L; }
    }

    if (Input.wasPressed('Tab')) this.switchWeapon();

    if (Input.wasPressed('Space') && p.dashCd <= 0) {
      p.dashT = 0.18;
      p.dashCd = 0.7;
      p.inv = 0.35;
      const len = Math.hypot(ax.x, ax.y);
      p.dashDir = len ? { x: ax.x / len, y: ax.y / len } : { x: p.face.x, y: p.face.y };
      AudioSys.sfx('dash');
      for (const m of this.monsters) if (m.kind === 'bug') m.loseT = 1.0;
    }

    if (Input.wasPressed('KeyQ')) {
      const d = SaveSys.data;
      if (d.meds > 0 && p.hp < p.maxHp) {
        d.meds -= 1;
        p.hp = Math.min(p.maxHp, p.hp + MED_HEAL);
        AudioSys.sfx('heal');
        UI.toast('Аптечка: +' + MED_HEAL + ' ОЗ');
        SaveSys.scheduleSave();
      }
    }

    let prompt = null;
    let target = null;
    for (const c of this.world.chests) {
      if (!c.opened && Util.dist(p.x, p.y, c.x, c.y) < 48) {
        const blocked = this.monstersNear(c.x, c.y, CHEST_GUARD_RADIUS);
        target = { kind: 'chest', c, blocked };
        prompt = blocked
          ? 'Рядом дроны — сначала зачисти'
          : 'E — вскрыть: ' + this._chestTitle(c.type).toLowerCase();
        break;
      }
    }
    if (!target && Util.dist(p.x, p.y, this.world.capsule.x, this.world.capsule.y) < 60) {
      target = { kind: 'capsule' };
      prompt = 'E — капсула (сон / магазин / карта)';
    }
    UI.setPrompt(prompt);

    if (Input.wasPressed('KeyE')) {
      if (target && target.kind === 'chest') {
        if (target.blocked) {
          UI.toast('Сначала уничтожь дронов рядом', 'danger');
          AudioSys.sfx('hit');
        } else {
          this.askOpenChest(target.c);
        }
      }
      else if (target && target.kind === 'capsule') this.capsuleMenu();
      else this.attack();
    }

    if (Input.mouse.pressedLeft) this.attack();

    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      const act = Ents.updateMonster(m, dt, p, this.world);
      if (act === 'slam') {
        
        AudioSys.sfx('guardian');
        this.cam.shake = m.kind === 'guardian' ? 0.6 : 0.35;
        this._burst(m.x, m.y, m.color2, m.kind === 'guardian' ? 26 : 14);
        if (Util.dist(p.x, p.y, m.x, m.y) < m.slamR + p.r && p.inv <= 0) {
          p.hp -= m.dmg;
          p.inv = 0.6;
          AudioSys.sfx('hurt');
          this._burst(p.x, p.y, '#e84a5f', 10);
          if (p.hp <= 0) { this.die(); return; }
        }
        continue;
      }
      if (act === 'aggro') { AudioSys.sfx('monster'); continue; }
      if (act === 'lunge') { AudioSys.sfx('dash'); continue; }
      if (act === 'attack' && p.inv <= 0) {
        p.hp -= m.dmg;
        p.inv = 0.6; // окно неуязвимости — толпа не растерзает за секунду
        this.cam.shake = 0.25;
        AudioSys.sfx('hurt');
        this._burst(p.x, p.y, '#e84a5f', 8);
        if (p.hp / p.maxHp < 0.3 && !this.lowHpWarned) {
          this.lowHpWarned = true;
          UI.toast('Здоровье на исходе! Отступи к капсуле.', 'danger');
        }
        if (p.hp <= 0) { this.die(); return; }
      }
    }

    // --- Камера ---
    this._updateCamera();
  },

  curWeapon() {
    return Ents.WEAPONS[SaveSys.data.curWeapon] || Ents.WEAPONS.knife;
  },

  switchWeapon() {
    const d = SaveSys.data;
    if (d.weapons.length < 2) return;
    const i = d.weapons.indexOf(d.curWeapon);
    d.curWeapon = d.weapons[(i + 1) % d.weapons.length];
    AudioSys.sfx('ui');
    UI.toast('Оружие: ' + this.curWeapon().name);
    SaveSys.scheduleSave();
  },

  attack() {
    const p = this.player;
    if (p.attackCd > 0) return;
    const w = this.curWeapon();
    p.attackCd = w.cd;
    p.attackAnim = 0.18;
    AudioSys.sfx(w.id === 'plasma' ? 'plasma' : 'knife');

    // Автоприцел только для клавиатуры: разворот к ближайшему монстру, чтобы
    // не «драться в развороте». При игре мышью направление задаёт курсор.
    if (!Input.mouse.active) {
      let nearest = null, nd = Infinity;
      for (const m of this.monsters) {
        const d = Util.dist(p.x, p.y, m.x, m.y) - m.r;
        if (d <= w.range && d < nd) { nd = d; nearest = m; }
      }
      if (nearest) {
        const dx = nearest.x - p.x, dy = nearest.y - p.y;
        const L = Math.hypot(dx, dy) || 1;
        p.face.x = dx / L; p.face.y = dy / L;
      }
    }

    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      const dx = m.x - p.x, dy = m.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > w.range + m.r) continue;
      const dot = (dx * p.face.x + dy * p.face.y) / (dist || 1);
      if (dot < w.arc) continue;

      if (m.kind === 'guardian' && m.vulnT <= 0) {
        AudioSys.sfx('hit');
        UI.toast('Щит Стража! Бей, когда он перезаряжается после удара.', 'danger');
        continue;
      }

      let dmg = w.dmg * (p.buffDmg > 0 ? 1.5 : 1);
      const crit = Math.random() < Ents.CRIT_CHANCE;
      if (crit) dmg *= Ents.CRIT_MUL;

      m.hp -= dmg;
      m.hitFlash = 0.12;
      m.x += (dx / (dist || 1)) * (crit ? 18 : 10);
      m.y += (dy / (dist || 1)) * (crit ? 18 : 10);
      AudioSys.sfx(crit ? 'crit' : 'hit');
      this._burst(m.x, m.y, crit ? '#ffe14a' : '#ffffff', crit ? 14 : 6);

      if (m.hp <= 0) this.killMonster(i);
    }
  },

  killMonster(idx) {
    const m = this.monsters[idx];
    this.monsters.splice(idx, 1);
    AudioSys.sfx('die');
    this._burst(m.x, m.y, m.color2, 16);
    const d = SaveSys.data;

    if (m.lootChest) this.grantLoot(m.lootChest, true);

    if (m.patrol) {
      const scrap = Math.round((3 + Math.random() * 4) * (this.star ? this.star.goldMul : 1));
      d.gold += scrap;
      UI.toast('+' + scrap + ' лома (дрон уничтожен)', 'gold');
    }

    if (m.kind === 'bug' && !d.seen.bugKill) {
      d.seen.bugKill = true;
      UI.say(Story.ACT1_FIGHT_WON);
    } else if (m.kind === 'knight' && !d.seen.knightKill) {
      d.seen.knightKill = true;
      UI.say(Story.ACT2_KNIGHT_WON);
    } else if (m.kind === 'guardian') {
      d.seen.guardianDead = true;
      d.gold += 120;
      if (!d.artifacts.includes('Ядро Стража')) d.artifacts.push('Ядро Стража');
      UI.toast('+120 лома. Получено «Ядро Стража»!', 'gold');
      UI.say(Story.GUARDIAN_WON);
    }
    SaveSys.scheduleSave();
  },

  // ================= Служебное =================

  _burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 110;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.4 + Math.random() * 0.3, t: 0,
        c: color, s: 1.5 + Math.random() * 2
      });
    }
  },

  _updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.t += dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.92; pt.vy *= 0.92;
      if (pt.t >= pt.life) this.particles.splice(i, 1);
    }
  },

  _updateWeather(dt) {
    const w = this.world;
    for (const f of w.weather) {
      f.x -= f.vx * dt;
      f.y += f.vy * dt * (w.star.finale ? 0.15 : 1);
      if (f.y > w.h) { f.y = -4; f.x = Math.random() * w.w; }
      if (f.x < 0) f.x = w.w;
    }
  },

  _updateCamera() {
    const W = this.view.w / ZOOM, H = this.view.h / ZOOM;
    const p = this.player, w = this.world;
    this.cam.x = w.w <= W ? (w.w - W) / 2 : Util.clamp(p.x - W / 2, 0, w.w - W);
    this.cam.y = w.h <= H ? (w.h - H) / 2 : Util.clamp(p.y - H / 2, 0, w.h - H);
  },

  // ================= Рендер =================

  render(ctx, W, H) {
    if (!this.world) { this._renderMenuBg(ctx, W, H); return; }

    const w = this.world, pal = w.star.palette;
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.scale(ZOOM, ZOOM);
    let sx = 0, sy = 0;
    if (this.cam.shake > 0) {
      sx = (Math.random() - 0.5) * 8 * this.cam.shake;
      sy = (Math.random() - 0.5) * 8 * this.cam.shake;
    }
    ctx.translate(-this.cam.x + sx, -this.cam.y + sy);

    // Граница карты
    ctx.strokeStyle = pal.obstacleEdge;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w.w - 4, w.h - 4);

    // Декор
    for (const dcr of w.decor) {
      ctx.fillStyle = dcr.c;
      ctx.beginPath();
      ctx.arc(dcr.x, dcr.y, dcr.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Препятствия
    for (const o of w.obstacles) {
      ctx.fillStyle = pal.obstacle;
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = pal.obstacleEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x, o.y, o.w, o.h);
    }

    this._renderCapsule(ctx, w.capsule);
    for (const c of w.chests) this._renderChest(ctx, c);
    for (const m of this.monsters) this._renderMonster(ctx, m);
    this._renderPlayer(ctx, this.player);

    // Частицы
    for (const pt of this.particles) {
      ctx.globalAlpha = 1 - pt.t / pt.life;
      ctx.fillStyle = pt.c;
      ctx.fillRect(pt.x - pt.s / 2, pt.y - pt.s / 2, pt.s, pt.s);
    }
    ctx.globalAlpha = 1;

    // Погода
    ctx.fillStyle = pal.weather;
    for (const f of w.weather) {
      ctx.globalAlpha = 0.65;
      ctx.fillRect(f.x, f.y, f.s, f.s * (w.star.finale ? 1 : 2));
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // Виньетка
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  },

  _renderMenuBg(ctx, W, H) {
    ctx.fillStyle = '#05060d';
    ctx.fillRect(0, 0, W, H);
    const rng = Util.mulberry32(42);
    for (let i = 0; i < 160; i++) {
      const x = rng() * W, y = rng() * H;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(this.time * (0.5 + rng()) + i));
      ctx.globalAlpha = tw;
      ctx.fillStyle = i % 7 === 0 ? '#aab6ff' : '#dfe6ff';
      ctx.fillRect(x, y, rng() < 0.1 ? 2 : 1, rng() < 0.1 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
  },

  _renderCapsule(ctx, cap) {
    const t = this.time;
    // Круг света — в нём тени медлительны (визуальный ориентир для отступления)
    const glow = ctx.createRadialGradient(cap.x, cap.y, 8, cap.x, cap.y, 90);
    glow.addColorStop(0, 'rgba(140,170,255,0.25)');
    glow.addColorStop(1, 'rgba(140,170,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cap.x, cap.y, 90, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#9aa4c8';
    ctx.beginPath();
    ctx.ellipse(cap.x, cap.y, 20, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a647e';
    ctx.beginPath();
    ctx.ellipse(cap.x, cap.y + 16, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,220,255,' + (0.6 + 0.3 * Math.sin(t * 3)) + ')';
    ctx.beginPath();
    ctx.arc(cap.x, cap.y - 8, 7, 0, Math.PI * 2);
    ctx.fill();
  },

  _renderChest(ctx, c) {
    const t = this.time;
    const size = c.type === 'small' ? 20 : c.type === 'big' ? 32 : 38;
    let y = c.y;
    if (c.type === 'final') y += Math.sin(t * 1.4 + (c.bob || 0)) * 5; // парит в невесомости

    if (!c.opened) {
      const glowC = c.type === 'small' ? 'rgba(90,140,255,' : c.type === 'big' ? 'rgba(255,80,80,' : 'rgba(255,255,255,';
      const pulse = 0.25 + 0.15 * Math.sin(t * 2.5 + c.id);
      const glow = ctx.createRadialGradient(c.x, y, 4, c.x, y, size * 2.2);
      glow.addColorStop(0, glowC + pulse + ')');
      glow.addColorStop(1, glowC + '0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(c.x, y, size * 2.2, 0, Math.PI * 2); ctx.fill();
    }

    const half = size / 2;
    ctx.fillStyle = c.opened ? '#3a3326' : (c.type === 'small' ? '#6b5836' : '#8a6a2a');
    ctx.fillRect(c.x - half, y - half * 0.8, size, size * 0.8);
    ctx.strokeStyle = c.opened ? '#5a5040' : (c.type === 'big' || c.type === 'final' ? '#ffd76e' : '#a8916a');
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x - half, y - half * 0.8, size, size * 0.8);
    // Крышка
    ctx.fillStyle = c.opened ? '#2a2419' : (c.type === 'small' ? '#7d6843' : '#a8842f');
    if (c.opened) {
      ctx.fillRect(c.x - half, y - half * 0.8 - 6, size, 5);
    } else {
      ctx.fillRect(c.x - half, y - half * 0.8, size, size * 0.3);
      ctx.fillStyle = c.type === 'small' ? '#cfe0ff' : '#ffd76e';
      ctx.fillRect(c.x - 2, y - 4, 4, 8); // замок
    }
  },

  _renderMonster(ctx, m) {
    const t = this.time;
    ctx.save();

    if (m.kind === 'guardian') {
      // Тень-аура
      const aura = ctx.createRadialGradient(m.x, m.y, 6, m.x, m.y, m.r * 2.4);
      aura.addColorStop(0, 'rgba(40,40,80,0.5)');
      aura.addColorStop(1, 'rgba(40,40,80,0)');
      ctx.fillStyle = aura;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 2.4, 0, Math.PI * 2); ctx.fill();

    }

    if (m.windupT > 0 && m.slamR) {
      const prog = 1 - m.windupT / m.windupMax;
      ctx.fillStyle = 'rgba(232,74,95,' + (0.12 + prog * 0.15) + ')';
      ctx.beginPath(); ctx.arc(m.x, m.y, m.slamR, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(232,74,95,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.slamR * prog, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.fillStyle = m.hitFlash > 0 ? '#ffffff' : m.color;
    ctx.beginPath();
    if (m.kind === 'bug') {
      // След рывка-укуса
      if (m.lungeT > 0) {
        ctx.fillStyle = 'rgba(232,200,74,0.35)';
        ctx.beginPath();
        ctx.arc(m.x - m.lungeDir.x * 18, m.y - m.lungeDir.y * 18, m.r * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = m.hitFlash > 0 ? '#ffffff' : m.color;
        ctx.beginPath();
      }
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
      // Лапки-искры
      ctx.strokeStyle = m.color2;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const a = t * 14 + i * Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x + Math.cos(a) * (m.r + 6), m.y + Math.sin(a) * (m.r + 6));
        ctx.stroke();
      }
    } else if (m.kind === 'knight') {
      ctx.fillRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
      ctx.fillStyle = m.color2;
      ctx.fillRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 0.8); // шлем
      ctx.fillStyle = '#e84a5f';
      ctx.fillRect(m.x - 6, m.y - m.r + 4, 4, 4); // глаза
      ctx.fillRect(m.x + 2, m.y - m.r + 4, 4, 4);
    } else {
      // Хранитель
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
      const vulnerable = m.vulnT > 0;
      if (vulnerable) {
        ctx.strokeStyle = '#e84a5f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r + 5 + Math.sin(t * 10) * 2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Щит — дуга со стороны игрока
        const a = Math.atan2(m.face.y, m.face.x);
        ctx.strokeStyle = m.color2;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r + 7, a - 1.1, a + 1.1);
        ctx.stroke();
      }
      ctx.fillStyle = vulnerable ? '#e84a5f' : '#8a93e8';
      ctx.fillRect(m.x - 8, m.y - 5, 5, 5);
      ctx.fillRect(m.x + 3, m.y - 5, 5, 5);
    }

    // Полоска здоровья
    const bw = m.r * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(m.x - bw / 2, m.y - m.r - 12, bw, 4);
    ctx.fillStyle = '#e84a5f';
    ctx.fillRect(m.x - bw / 2, m.y - m.r - 12, bw * Math.max(0, m.hp / m.maxHp), 4);

    ctx.restore();
  },

  _renderPlayer(ctx, p) {
    ctx.save();
    if (p.inv > 0 && Math.floor(this.time * 14) % 2 === 0) ctx.globalAlpha = 0.45;

    // След рывка
    if (p.dashT > 0) {
      ctx.fillStyle = 'rgba(160,200,255,0.35)';
      ctx.beginPath();
      ctx.arc(p.x - p.dashDir.x * 16, p.y - p.dashDir.y * 16, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ранец
    ctx.fillStyle = '#e07b39';
    ctx.beginPath();
    ctx.arc(p.x - p.face.x * 7, p.y - p.face.y * 7, p.r * 0.75, 0, Math.PI * 2);
    ctx.fill();

    // Скафандр
    ctx.fillStyle = '#e8ecf8';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();

    // Визор (с трещиной из пролога)
    const fa = Math.atan2(p.face.y, p.face.x);
    ctx.fillStyle = '#1b2438';
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(fa) * 4, p.y + Math.sin(fa) * 4, p.r * 0.55, fa - 1.2, fa + 1.2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(fa) * 2, p.y + Math.sin(fa) * 2);
    ctx.lineTo(p.x + Math.cos(fa + 0.5) * 8, p.y + Math.sin(fa + 0.5) * 8);
    ctx.stroke();

    // Взмах оружия (цвет и радиус зависят от выбранного)
    if (p.attackAnim > 0) {
      const w = this.curWeapon();
      const prog = 1 - p.attackAnim / 0.18;
      ctx.strokeStyle = w.color + (1 - prog) + ')';
      ctx.lineWidth = w.id === 'plasma' ? 5 : 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + w.range - 34, fa - 1.1 + prog * 1.4, fa - 0.2 + prog * 1.4);
      ctx.stroke();
    }

    // Ореолы баффов
    if (p.buffSpeed > 0 || p.buffDmg > 0) {
      ctx.strokeStyle = p.buffDmg > 0 ? 'rgba(255,160,80,0.5)' : 'rgba(120,220,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 5 + Math.sin(this.time * 6) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }
};

// Top-level const не попадает в window — экспортируем явно,
// иначе автопауза и горячие клавиши, проверяющие window.Game, не работают
window.Game = Game;
