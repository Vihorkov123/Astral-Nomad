'use strict';

const BASE_STARS = [
  {
    id: 0, name: 'Место крушения', size: 34,
    small: 5, big: 0, needOpen: 4, patrols: 1,
    smallChance: 0.30, bigChance: 0.50,
    hpMul: 1.0, dmgMul: 1.0,
    goldMul: 1.0,
    palette: { bg: '#34231d', decor: '#54341f', decor2: '#6b4a3a', obstacle: '#5d4032', obstacleEdge: '#7a5743', weather: '#d9534f', weatherName: 'ржавая пыль' },
    desc: 'Обломки капсулы и первые контейнеры снабжения.'
  },
  {
    id: 1, name: 'Заросший каньон', size: 40,
    small: 4, big: 2, needOpen: 5, patrols: 2,
    smallChance: 0.32, bigChance: 0.50,
    hpMul: 1.35, dmgMul: 1.3,
    goldMul: 1.4,
    palette: { bg: '#16291e', decor: '#27513a', decor2: '#d77bbf', obstacle: '#33543f', obstacleEdge: '#4c7a5b', weather: '#e8a0d8', weatherName: 'споры' },
    desc: 'Густая растительность. В больших контейнерах — энергоячейки.'
  },
  {
    id: 2, name: 'Кристальный разлом', size: 46,
    small: 5, big: 2, needOpen: 6, patrols: 3,
    smallChance: 0.34, bigChance: 0.55,
    hpMul: 1.7, dmgMul: 1.6,
    goldMul: 1.8,
    palette: { bg: '#241019', decor: '#5e1f33', decor2: '#c43b5c', obstacle: '#4c1c30', obstacleEdge: '#8a2f4d', weather: '#ff7a59', weatherName: 'искры' },
    desc: 'Пещеры из кристаллов. Охранных дронов больше.'
  },
  {
    id: 3, name: 'Древний комплекс', size: 52,
    small: 5, big: 3, needOpen: 7, patrols: 4,
    smallChance: 0.35, bigChance: 0.58,
    hpMul: 2.0, dmgMul: 1.9,
    goldMul: 2.2,
    guardian: true,
    palette: { bg: '#141729', decor: '#2c3260', decor2: '#7e89e8', obstacle: '#2a2f58', obstacleEdge: '#4a5290', weather: '#9fb0ff', weatherName: 'туман' },
    desc: 'Ядро энергосети. Вскрыть всё — разбудить Стража Ядра.'
  },
  {
    id: 4, name: 'Точка старта', size: 38,
    small: 4, big: 0, needOpen: 0, patrols: 2,
    smallChance: 0.30, bigChance: 0.6,
    hpMul: 1.8, dmgMul: 1.7,
    goldMul: 2.0,
    finale: true,
    palette: { bg: '#04050c', decor: '#101630', decor2: '#aab6ff', obstacle: '#11142a', obstacleEdge: '#2c3260', weather: '#ffffff', weatherName: 'звёзды' },
    desc: 'Собранная капсула ждёт. Финальное решение.'
  }
];

function genStar(i) {
  const k = i - 4; // 1, 2, 3 ...
  return {
    id: i, name: 'Дальний сектор ' + k, size: Math.min(50 + k * 2, 64),
    small: 5 + Math.min(k, 3), big: 3 + Math.min(k, 2),
    needOpen: 6 + Math.min(k, 4), patrols: 4 + Math.min(k, 3),
    smallChance: Math.min(0.35 + k * 0.02, 0.5),
    bigChance: Math.min(0.58 + k * 0.03, 0.8),
    hpMul: 2.0 + k * 0.35, dmgMul: 1.9 + k * 0.3,
    goldMul: 2.2 + k * 0.6,
    endless: true,
    palette: {
      bg: ['#1d1430', '#10242c', '#2a1a10'][i % 3],
      decor: ['#3b2a60', '#1f4a58', '#583a22'][i % 3],
      decor2: ['#9a7ae8', '#5fc8e0', '#e0a45f'][i % 3],
      obstacle: ['#332452', '#1c404c', '#4a311d'][i % 3],
      obstacleEdge: ['#564088', '#2f6878', '#71502f'][i % 3],
      weather: '#cfd6ff', weatherName: 'пыль'
    },
    desc: 'Неисследованная территория.'
  };
}

function getStar(i) {
  return i < BASE_STARS.length ? BASE_STARS[i] : genStar(i);
}
