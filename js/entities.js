'use strict';

const Ents = {

  // Оружие: arc — минимальный косинус угла до цели (меньше = шире взмах)
  WEAPONS: {
    knife:  { id: 'knife',  name: 'Нож',              short: '🔪 Нож',   dmg: 2, range: 56, arc: 0.15, cd: 0.4,  color: 'rgba(220,235,255,' },
    plasma: { id: 'plasma', name: 'Плазменный резак', short: '⚡ Резак', dmg: 7, range: 82, arc: -0.2, cd: 0.7, color: 'rgba(110,230,255,' }
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
    bug:      { r: 10, hp: 8,  dmg: 3, speed: 185, attackCd: 0.8, color: '#e8c84a', color2: '#9a7510' },
    knight:   { r: 17, hp: 22, dmg: 5, speed: 75,  attackCd: 1.4, color: '#7a9a6a', color2: '#3d5232' },
    guardian: { r: 26, hp: 36, dmg: 8, speed: 62,  attackCd: 1.5, color: '#2b2f4a', color2: '#8a93e8' }
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
      patrol: false, aggro: true, homeX: x, homeY: y, // патрули бродят, пока не заметят игрока
      // Телеграфированные атаки: у всех мобов, как у босса
      // bug: рывок-укус; knight: замах → удар по площади; guardian: то же, но больше
      windupT: 0, windupMax: kind === 'knight' ? 0.6 : 0.9,
      slamCd: 2, smashCd: 1,
      slamR: kind === 'guardian' ? 95 : (kind === 'knight' ? 58 : 0),
      vulnT: 0,
      lungeT: 0, lungeCd: 1, lungeHit: false, lungeDir: { x: 0, y: 1 },
      hitFlash: 0,
      face: { x: 0, y: 1 }
    };
  },

  updateMonster(m, dt, player, world) {
    m.hitFlash = Math.max(0, m.hitFlash - dt);
    m.attackCd -= dt;
    m.loseT = Math.max(0, m.loseT - dt);

    const dx = player.x - m.x, dy = player.y - m.y;
    const dist = Math.hypot(dx, dy) || 0.001;

    // --- Страж Ядра: цикл «замах → удар по площади → перезарядка» ---
    if (m.kind === 'guardian') {
      if (m.vulnT > 0) { m.vulnT -= dt; return null; }   // перезарядка: стоит, уязвим
      if (m.windupT > 0) {                                // замах: телеграф удара
        m.windupT -= dt;
        if (m.windupT <= 0) { m.vulnT = 3.0; m.slamCd = 1.2; return 'slam'; }
        return null;
      }
      m.slamCd -= dt;
      if (dist > m.r + 10) {
        moveEntity(m, (dx / dist) * m.speed * dt, (dy / dist) * m.speed * dt, world);
        m.face.x = dx / dist; m.face.y = dy / dist;
      }
      if (m.slamCd <= 0 && dist < 130) m.windupT = m.windupMax;
      return null;
    }

    // --- Патруль: дрейфует у своей точки, пока игрок не подойдёт ---
    if (m.patrol && !m.aggro) {
      m.wanderA += (Math.random() - 0.5) * 2 * dt;
      const hx = m.homeX - m.x, hy = m.homeY - m.y;
      moveEntity(m,
        (Math.cos(m.wanderA) * m.speed * 0.35 + hx * 0.2) * dt,
        (Math.sin(m.wanderA) * m.speed * 0.35 + hy * 0.2) * dt, world);
      if (dist < 180) { m.aggro = true; return 'aggro'; }
      return null;
    }

    // --- Тяжёлый страж: замах → удар по площади (мини-версия босса) ---
    if (m.kind === 'knight') {
      if (m.windupT > 0) {
        m.windupT -= dt;
        if (m.windupT <= 0) { m.smashCd = 2.2; return 'slam'; }
        return null; // стоит и замахивается — окно, чтобы отбежать
      }
      m.smashCd -= dt;
    }

    // --- Дрон-жало: рывок-укус с разгона ---
    if (m.kind === 'bug') {
      if (m.lungeT > 0) {
        m.lungeT -= dt;
        moveEntity(m, m.lungeDir.x * 400 * dt, m.lungeDir.y * 400 * dt, world);
        if (!m.lungeHit && dist < m.r + player.r + 4) { m.lungeHit = true; return 'attack'; }
        return null;
      }
      m.lungeCd -= dt;
      if (m.loseT <= 0 && m.lungeCd <= 0 && dist < 170 && dist > 40) {
        m.lungeT = 0.35; m.lungeCd = 2.0; m.lungeHit = false;
        m.lungeDir = { x: dx / dist, y: dy / dist };
        return 'lunge';
      }
    }

    if (m.loseT > 0) {
      // Потерял цель — бесцельно дрейфует
      m.wanderA += (Math.random() - 0.5) * 2 * dt;
      moveEntity(m, Math.cos(m.wanderA) * m.speed * 0.4 * dt,
                    Math.sin(m.wanderA) * m.speed * 0.4 * dt, world);
    } else if (dist > m.r + player.r + 2) {
      moveEntity(m, (dx / dist) * m.speed * dt, (dy / dist) * m.speed * dt, world);
      m.face.x = dx / dist; m.face.y = dy / dist;
    }

    // Страж начинает замах, когда подошёл вплотную
    if (m.kind === 'knight' && m.loseT <= 0 && m.smashCd <= 0 && dist < 70) {
      m.windupT = m.windupMax;
      return null;
    }

    // Атака в упор (дрон-жало; страж бьёт только замахом)
    if (m.kind !== 'knight' && m.loseT <= 0 && dist < m.r + player.r + 6 && m.attackCd <= 0) {
      m.attackCd = m.attackCdBase;
      return 'attack';
    }
    return null;
  }
};
