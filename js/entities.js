'use strict';

const Ents = {

  // Оружие: arc — минимальный косинус угла до цели (меньше = шире взмах)
  WEAPONS: {
    knife:  { id: 'knife',  name: 'Нож',              short: '🔪 Нож',   dmg: 2, range: 56, arc: 0.15, cd: 0.4,  color: 'rgba(220,235,255,' },
    plasma: { id: 'plasma', name: 'Плазменный резак', short: '⚡ Резак', dmg: 4, range: 78, arc: -0.2, cd: 0.75, color: 'rgba(110,230,255,' }
  },

  CRIT_CHANCE: 0.15,
  CRIT_MUL: 2,

  makePlayer(x, y) {
    return {
      x, y, r: 13,
      hp: 30, maxHp: 30,
      speed: 150,
      face: { x: 0, y: 1 },
      attackCd: 0, attackAnim: 0,
      dashT: 0, dashCd: 0, inv: 0,
      dashDir: { x: 0, y: 1 },
      buffSpeed: 0, buffDmg: 0   // таймеры баффов, сек
    };
  },

  // База монстров; множители звезды применяются при спавне
  MONSTER_BASE: {
    bug:      { r: 10, hp: 6,  dmg: 2, speed: 170, attackCd: 0.8, color: '#e8c84a', color2: '#9a7510' },
    knight:   { r: 17, hp: 16, dmg: 4, speed: 70,  attackCd: 1.4, color: '#7a9a6a', color2: '#3d5232' },
    guardian: { r: 26, hp: 30, dmg: 7, speed: 62,  attackCd: 1.5, color: '#2b2f4a', color2: '#8a93e8' }
  },

  makeMonster(kind, x, y, star, lootChest) {
    const b = this.MONSTER_BASE[kind];
    const mul = kind === 'guardian' ? 1 : star.hpMul; // босс не скейлится
    const dmul = kind === 'guardian' ? 1 : star.dmgMul;
    return {
      kind, x, y, r: b.r,
      hp: Math.round(b.hp * mul), maxHp: Math.round(b.hp * mul),
      dmg: Math.round(b.dmg * dmul),
      speed: b.speed, attackCdBase: b.attackCd,
      attackCd: 0.6,
      color: b.color, color2: b.color2,
      lootChest: lootChest || null,
      loseT: 0,                 // после рывка игрока цель потеряна
      wanderA: Math.random() * Math.PI * 2,
      // Хранитель: после 3 атак — окно уязвимости
      attacks: 0, vulnT: 0,
      hitFlash: 0,
      face: { x: 0, y: 1 }
    };
  },

  updateMonster(m, dt, player, world) {
    m.hitFlash = Math.max(0, m.hitFlash - dt);
    m.attackCd -= dt;
    m.loseT = Math.max(0, m.loseT - dt);

    if (m.kind === 'guardian' && m.vulnT > 0) {
      m.vulnT -= dt;          // выдохся — стоит и уязвим
      return;
    }

    const dx = player.x - m.x, dy = player.y - m.y;
    const dist = Math.hypot(dx, dy) || 0.001;

    if (m.loseT > 0) {
      // Потерял цель — бесцельно дрейфует
      m.wanderA += (Math.random() - 0.5) * 2 * dt;
      m.x += Math.cos(m.wanderA) * m.speed * 0.4 * dt;
      m.y += Math.sin(m.wanderA) * m.speed * 0.4 * dt;
    } else if (dist > m.r + player.r + 2) {
      m.x += (dx / dist) * m.speed * dt;
      m.y += (dy / dist) * m.speed * dt;
      m.face.x = dx / dist; m.face.y = dy / dist;
    }

    collideWorld(m, world);

    // Атака в упор
    if (m.loseT <= 0 && dist < m.r + player.r + 6 && m.attackCd <= 0) {
      m.attackCd = m.attackCdBase;
      if (m.kind === 'guardian') {
        m.attacks++;
        if (m.attacks >= 3) { m.attacks = 0; m.vulnT = 2.6; }
      }
      return 'attack';
    }
    return null;
  }
};
