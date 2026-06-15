'use strict';

const Util = {
  clamp(v, a, b) { return v < a ? a : (v > b ? b : v); },
  dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); },
  lerp(a, b, t) { return a + (b - a) * t; },

  // Детерминированный ГПСЧ — одинаковая карта звезды между визитами
  mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  },

  rndInt(rng, a, b) { return a + Math.floor(rng() * (b - a + 1)); },

  pct(v) { return Math.round(v * 100) + '%'; }
};
