'use strict';

const TILE = 32;

function buildWorld(star) {
  const rng = Util.mulberry32(7331 + star.id * 9973);
  const w = star.size * TILE;
  const h = star.size * TILE;
  const cx = w / 2, cy = h / 2;

  const world = {
    star, w, h,
    capsule: { x: cx, y: cy, r: 26 },
    chests: [],
    obstacles: [],
    decor: [],
    weather: []
  };

  // --- Сундуки: маленькие + большие + финальный ---
  const spots = [];
  const total = star.small + star.big + (star.finale ? 1 : 0);
  let guard = 0;
  while (spots.length < total && guard++ < 4000) {
    const x = 80 + rng() * (w - 160);
    const y = 80 + rng() * (h - 160);
    if (Util.dist(x, y, cx, cy) < 170) continue;            
    if (spots.some(s => Util.dist(x, y, s.x, s.y) < 150)) continue; 
    spots.push({ x, y });
  }

  const openedIds = SaveSys.starOpened(star.id);
  let id = 0;
  for (let i = 0; i < star.small; i++) {
    const s = spots[id];
    world.chests.push({ id, type: 'small', x: s.x, y: s.y, opened: openedIds.includes(id) });
    id++;
  }
  for (let i = 0; i < star.big; i++) {
    const s = spots[id];
    world.chests.push({ id, type: 'big', x: s.x, y: s.y, opened: openedIds.includes(id) });
    id++;
  }
  if (star.finale) {
    // Центральный сундук финала — в дальнем верхнем секторе карты
    world.chests.push({ id, type: 'final', x: cx, y: 140, opened: false, bob: rng() * 6 });
    id++;
  }

  // --- Препятствия (на финальной звезде их нет — открытый космос) ---
  if (!star.finale) {
    const count = Math.floor(star.size * 0.7);
    guard = 0;
    while (world.obstacles.length < count && guard++ < 4000) {
      const ow = TILE * (1 + Math.floor(rng() * 3));
      const oh = TILE * (1 + Math.floor(rng() * 3));
      const x = 40 + rng() * (w - 80 - ow);
      const y = 40 + rng() * (h - 80 - oh);
      const ccx = x + ow / 2, ccy = y + oh / 2;
      if (Util.dist(ccx, ccy, cx, cy) < 190) continue;
      if (world.chests.some(c => Util.dist(ccx, ccy, c.x, c.y) < 130)) continue;
      world.obstacles.push({ x, y, w: ow, h: oh });
    }
  }

  const decorCount = star.size * 4;
  for (let i = 0; i < decorCount; i++) {
    world.decor.push({
      x: rng() * w, y: rng() * h,
      r: 1 + rng() * (star.finale ? 1.6 : 5),
      c: rng() < 0.25 ? star.palette.decor2 : star.palette.decor
    });
  }

  for (let i = 0; i < 70; i++) {
    world.weather.push({
      x: rng() * w, y: rng() * h,
      vx: 8 + rng() * 14, vy: 18 + rng() * 26,
      s: 1 + rng() * 2
    });
  }

  return world;
}

function collideWorld(e, world) {
  e.x = Util.clamp(e.x, e.r, world.w - e.r);
  e.y = Util.clamp(e.y, e.r, world.h - e.r);
  for (const o of world.obstacles) {
    const px = Util.clamp(e.x, o.x, o.x + o.w);
    const py = Util.clamp(e.y, o.y, o.y + o.h);
    let dx = e.x - px, dy = e.y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 < e.r * e.r) {
      let d = Math.sqrt(d2);
      if (d < 0.01) { dx = 0; dy = -1; d = 1; } 
      const push = (e.r - d) / d;
      e.x += dx * push;
      e.y += dy * push;
    }
  }
}


function spotBlocked(world, x, y, r) {
  for (const o of world.obstacles) {
    const px = Util.clamp(x, o.x, o.x + o.w);
    const py = Util.clamp(y, o.y, o.y + o.h);
    const dx = x - px, dy = y - py;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}


function moveEntity(e, dx, dy, world) {
  const ox = e.x;
  e.x = Util.clamp(e.x + dx, e.r, world.w - e.r);
  if (spotBlocked(world, e.x, e.y, e.r)) e.x = ox;
  const oy = e.y;
  e.y = Util.clamp(e.y + dy, e.r, world.h - e.r);
  if (spotBlocked(world, e.x, e.y, e.r)) e.y = oy;
}
