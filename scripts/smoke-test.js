'use strict';
// Смоук-тест игровой логики без браузера: node scripts/smoke-test.js
// Загружает все модули кроме main.js в песочницу со стабами DOM
// и прогоняет основной игровой цикл: мир → сундук → монстр → бой → смерть → сейв.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---------- Стабы браузера ----------
const storage = {};
const elStub = () => ({
  classList: { add() {}, remove() {}, toggle() {}, contains() { return true; } },
  addEventListener() {},
  appendChild() {},
  remove() {},
  style: {},
  textContent: '',
  innerHTML: '',
  value: 0
});

const sandbox = {
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  Math, JSON, Object, Array, Promise, performance: { now: () => Date.now() },
  localStorage: {
    getItem: k => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: k => { delete storage[k]; }
  },
  window: {},
  document: {
    addEventListener() {},
    createElement: () => Object.assign(elStub(), { set src(v) {}, set onerror(f) { f && f(); }, set onload(f) {} }),
    head: { appendChild(s) {} },
    getElementById: () => elStub(),
    visibilityState: 'visible'
  }
};
sandbox.window = sandbox; // window === глобальный объект
vm.createContext(sandbox);

const files = ['util.js', 'stars.js', 'story.js', 'sdk.js', 'save.js', 'audio.js', 'input.js', 'world.js', 'entities.js', 'ui.js', 'game.js'];
for (const f of files) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
}

// const-объявления скриптов живут в лексическом окружении контекста —
// пробрасываем их на window, чтобы тест видел их как свойства песочницы
vm.runInContext(`
  window.Util = Util; window.Story = Story; window.SDK = SDK;
  window.SaveSys = SaveSys; window.AudioSys = AudioSys; window.Input = Input;
  window.Ents = Ents; window.UI = UI; window.Game = Game;
  window.getStar = getStar; window.BASE_STARS = BASE_STARS;
`, sandbox);

// UI заменяем на молчаливый стаб — тестируем только логику
vm.runInContext(`
  UI.init = () => {};
  UI.say = (l, cb) => { if (cb) cb(); };
  UI.toast = () => {};
  UI.modal = () => {};
  UI.setPrompt = () => {};
  UI.showScreen = () => {};
  UI.showHud = () => {};
  UI.buildStarMap = () => {};
  UI.refreshMenu = () => {};
  UI.showDeath = () => { window.__deathShown = true; };
  UI.showEnding = (n) => { window.__ending = n; };
  UI.anyScreenOpen = () => false;
  UI.dialogOpenNow = () => false;
  AudioSys.sfx = () => {};
  AudioSys.applyVolumes = () => {};
`, sandbox);

let failed = 0;
function check(name, cond) {
  if (cond) { console.log('  OK  ' + name); }
  else { failed++; console.error('FAIL  ' + name); }
}

(async () => {
  const G = sandbox;

  await vm.runInContext('SaveSys.load()', sandbox);
  check('сейв создан по умолчанию', G.SaveSys.data && G.SaveSys.data.food === 5);

  // Полёт на звезду 1
  G.Game.travelTo(0);
  check('мир построен', G.Game.world && G.Game.world.chests.length === 5);
  check('игрок у капсулы', G.Util.dist(G.Game.player.x, G.Game.player.y, G.Game.world.capsule.x, G.Game.world.capsule.y) < 80);
  check('препятствия не на сундуках', G.Game.world.chests.every(c =>
    G.Game.world.obstacles.every(o =>
      !(c.x > o.x - 20 && c.x < o.x + o.w + 20 && c.y > o.y - 20 && c.y < o.y + o.h + 20))));

  // Детерминированность карты
  const c1 = G.Game.world.chests.map(c => c.x + ',' + c.y).join('|');
  G.Game.travelTo(0);
  const c2 = G.Game.world.chests.map(c => c.x + ',' + c.y).join('|');
  check('карта детерминирована между визитами', c1 === c2);

  // Сундук без монстра (форсируем)
  const chest = G.Game.world.chests[0];
  const origRandom = G.Math.random;
  G.Math.random = () => 0.99; // > шанс монстра → безопасно
  const goldBefore = G.SaveSys.data.gold;
  G.Game.openChest(chest);
  G.Math.random = origRandom;
  check('сундук открыт и записан в сейв', G.SaveSys.starOpened(0).includes(chest.id));
  check('лут начислен', G.SaveSys.data.gold > goldBefore);

  // Сундук с монстром (форсируем)
  const chest2 = G.Game.world.chests[1];
  G.Math.random = () => 0.0;
  G.Game.openChest(chest2);
  G.Math.random = origRandom;
  check('монстр заспавнился из сундука', G.Game.monsters.length === 1 && G.Game.monsters[0].kind === 'bug');
  check('лут удержан монстром', G.Game.monsters[0].lootChest === chest2);

  // Бой: ставим монстра перед игроком и бьём ножом
  const m = G.Game.monsters[0];
  const p = G.Game.player;
  m.x = p.x + 25; m.y = p.y;
  p.face = { x: 1, y: 0 };
  const goldBeforeKill = G.SaveSys.data.gold;
  let guard = 0;
  while (G.Game.monsters.length && guard++ < 20) {
    p.attackCd = 0;
    m.x = p.x + 25; m.y = p.y;
    G.Game.attack();
  }
  check('монстр убит ножом', G.Game.monsters.length === 0);
  check('награда за риск выдана после боя', G.SaveSys.data.gold > goldBeforeKill);

  // Прогрессия: needOpen=4 — вскрываем ещё два контейнера безопасно
  G.Math.random = () => 0.99;
  G.Game.openChest(G.Game.world.chests[2]);
  G.Game.openChest(G.Game.world.chests[3]);
  G.Math.random = origRandom;
  check('следующий сектор открыт после 4 контейнеров', G.SaveSys.data.maxStar === 1);

  // Смерть: золото −30%, еда в ноль, звёзды сохранены
  G.SaveSys.data.gold = 100;
  G.SaveSys.data.food = 7;
  G.SaveSys.data.parts = 2;
  G.Game.die();
  check('экран смерти показан', G.__deathShown === true);
  check('золото потеряно на 30%', G.SaveSys.data.gold === 70);
  check('еда потеряна вся', G.SaveSys.data.food === 0);
  check('деталь потеряна', G.SaveSys.data.parts === 1);
  check('звёзды сохранены', G.SaveSys.data.maxStar === 1);

  // Респаун
  G.Game.respawn();
  check('респаун на текущей звезде', G.Game.world.star.id === 0 && G.Game.player.hp === G.Game.player.maxHp);
  check('открытые контейнеры не сбросились', G.Game.world.chests.filter(c => c.opened).length === 4);

  // Хранитель на звезде 4 (id=3): вскрываем все 5 сундуков
  G.SaveSys.data.maxStar = 3;
  G.Game.travelTo(3);
  G.Math.random = () => 0.99;
  for (const c of G.Game.world.chests) G.Game.openChest(c);
  G.Math.random = origRandom;
  check('Хранитель призван за жадность', G.Game.monsters.some(mm => mm.kind === 'guardian'));

  // Открытие больших сундуков выдало второе оружие
  check('плазменный резак получен из большого сундука', G.SaveSys.data.weapons.includes('plasma'));

  // Щит Хранителя: без окна уязвимости урон не проходит
  // (нож, без критов — для точной проверки урона)
  G.SaveSys.data.curWeapon = 'knife';
  G.Math.random = () => 0.99;
  const boss = G.Game.monsters.find(mm => mm.kind === 'guardian');
  boss.x = G.Game.player.x + 30; boss.y = G.Game.player.y;
  G.Game.player.face = { x: 1, y: 0 };
  G.Game.player.attackCd = 0;
  const bossHp = boss.hp;
  G.Game.attack();
  check('щит Хранителя держит удар', boss.hp === bossHp);
  boss.vulnT = 2;
  G.Game.player.attackCd = 0;
  G.Game.attack();
  check('в окно уязвимости урон проходит', boss.hp === bossHp - 2);
  G.Math.random = () => 0.0;
  boss.vulnT = 2;
  G.Game.player.attackCd = 0;
  const hpBeforeCrit = boss.hp;
  G.Game.attack();
  check('критический удар наносит двойной урон', boss.hp === hpBeforeCrit - 4);
  G.Math.random = origRandom;

  // Удар по площади: замах → урон в радиусе → перезарядка (уязвим)
  boss.vulnT = 0; boss.windupT = 0; boss.slamCd = 0;
  const pl3 = G.Game.player;
  boss.x = pl3.x + 50; boss.y = pl3.y;
  pl3.hp = pl3.maxHp; pl3.inv = 0;
  G.Game.update(1 / 60);
  check('Страж начал замах рядом с игроком', boss.windupT > 0);
  boss.windupT = 0.001;
  G.Game.update(1 / 60);
  check('удар по площади нанёс урон и Страж перезаряжается',
    pl3.hp === pl3.maxHp - boss.dmg && boss.vulnT > 0);

  // Убиваем босса → артефакт
  guard = 0;
  while (G.Game.monsters.length && guard++ < 40) {
    boss.vulnT = 2;
    G.Game.player.attackCd = 0;
    boss.x = G.Game.player.x + 30; boss.y = G.Game.player.y;
    G.Game.attack();
  }
  check('Страж повержен, ядро получено', G.SaveSys.data.artifacts.includes('Ядро Стража'));

  // Магазин-синтезатор: покупка за лом
  G.SaveSys.data.gold = 50;
  const foodBefore = G.SaveSys.data.food;
  check('покупка еды за лом', G.Game.buyShopItem(0) === true &&
    G.SaveSys.data.food === foodBefore + 3 && G.SaveSys.data.gold === 35);
  G.SaveSys.data.gold = 5;
  check('покупка не проходит без лома', G.Game.buyShopItem(1) === false && G.SaveSys.data.gold === 5);

  // Финал: концовка 2 открывает бесконечные звёзды
  G.SaveSys.data.maxStar = 4;
  G.Game.travelTo(4);
  check('финальная звезда: есть центральный сундук', G.Game.world.chests.some(c => c.type === 'final'));
  G.Game.ending(2);
  check('концовка 2 показана', G.__ending === 2);
  check('бесконечные звёзды открыты', G.SaveSys.data.endless === true && G.SaveSys.data.maxStar === 5);
  const gen = G.getStar(7);
  check('генерация секторов за пределами карты', gen.name.includes('Дальний сектор') && gen.hpMul > 1.8);

  // Сохранение в localStorage (fallback без SDK)
  G.SaveSys.saveNow();
  await new Promise(r => setTimeout(r, 50));
  const raw = G.localStorage.getItem('astral_nomad_save');
  check('fallback-сейв записан в localStorage', !!raw && JSON.parse(raw).endless === true);

  // Загрузка из localStorage
  G.SaveSys.data = null;
  await vm.runInContext('SaveSys.load()', sandbox);
  check('fallback-сейв загружен', G.SaveSys.data.endless === true && G.SaveSys.data.artifacts.length === 1);

  // Update-цикл не падает (5 секунд игрового времени)
  G.Game.travelTo(1);
  G.Math.random = () => 0.0;
  G.Game.openChest(G.Game.world.chests.find(c => c.type === 'big'));
  G.Math.random = origRandom;
  for (let i = 0; i < 300; i++) G.Game.update(1 / 60);
  check('300 кадров update без ошибок (рыцарь преследует)', G.Game.monsters.length === 1);

  // Окно неуязвимости: серия атак монстра не снимает ХП каждый кадр
  const knight = G.Game.monsters[0];
  const pl = G.Game.player;
  knight.x = pl.x + 5; knight.y = pl.y;
  pl.hp = pl.maxHp; pl.inv = 0;
  knight.attackCd = 0;
  for (let i = 0; i < 30; i++) { knight.attackCd = 0; G.Game.update(1 / 60); }
  check('после удара действует неуязвимость', pl.hp >= pl.maxHp - knight.dmg * 2);

  // Смена оружия по Tab
  G.SaveSys.data.curWeapon = 'knife';
  G.Game.switchWeapon();
  check('Tab переключает оружие', G.SaveSys.data.curWeapon === 'plasma');

  console.log(failed ? '\n' + failed + ' ПРОВАЛОВ' : '\nВСЕ ПРОВЕРКИ ПРОЙДЕНЫ');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
