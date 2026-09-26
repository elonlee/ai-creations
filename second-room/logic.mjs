export const AREA = 73;

export const ROOMS = {
  living: { id: 'living', name: '客厅', en: 'LIVING ROOM', area: 22.7, size: '5.9 × 3.85 m', bounds: [-5, 0.9, -3.65, 0.2], items: ['三人沙发', '橡木茶几', '电视矮柜', '落地灯', '边几'] },
  kitchen: { id: 'kitchen', name: '餐厨', en: 'DINING & KITCHEN', area: 10.2, size: '2.9 × 3.45 m', bounds: [-5, -2.1, 0.2, 3.65], items: ['料理台', '吊柜', '四人餐桌', '餐椅 × 4'] },
  entry: { id: 'entry', name: '玄关与过道', en: 'ENTRY & HALL', area: 10.4, size: '3.0 × 3.45 m', bounds: [-2.1, 0.9, 0.2, 3.65], items: ['鞋柜', '换鞋凳', '玄关镜'] },
  master: { id: 'master', name: '主卧', en: 'MAIN BEDROOM', area: 14.5, size: '4.1 × 3.55 m', bounds: [0.9, 5, -3.65, -0.1], items: ['双人床', '床头柜 × 2', '衣柜', '台灯'] },
  flex: { id: 'flex', name: '第二间房', en: 'THE SECOND ROOM', area: 15.2, size: '4.1 × 3.75 m', bounds: [0.9, 5, -0.1, 3.65], items: [] },
};

export const SCENARIOS = {
  work: { name: '在家工作', en: 'WORK FROM HOME', index: '01', note: '一张宽桌、一排书架，专注与生活都有自己的位置。', items: ['工作长桌', '人体工学椅', '整墙书架', '阅读椅', '边几', '工作台灯'] },
  guest: { name: '朋友留宿', en: 'FRIENDS STAY OVER', index: '02', note: '白天是会客角落，夜里铺开一张舒适的床。', items: ['沙发床', '圆形茶几', '低矮边柜', '行李架', '落地灯', '地毯'] },
  future: { name: '留给未来', en: 'ROOM TO GROW', index: '03', note: '此刻留白，让阅读、游戏和未来的想象慢慢发生。', items: ['单人床', '矮书柜', '儿童桌', '小椅子', '玩具架', '圆形地毯'] },
};

export function roomAt(x, z) {
  return Object.values(ROOMS).find(({ bounds: [minX, maxX, minZ, maxZ] }) => x >= minX && x <= maxX && z >= minZ && z <= maxZ);
}

export function canOccupy(x, z, obstacles = [], radius = 0.2) {
  if (x < -5 + radius || x > 5 - radius || z < -3.65 + radius || z > 3.65 - radius) return false;
  return !obstacles.some(o => x + radius > o.minX && x - radius < o.maxX && z + radius > o.minZ && z - radius < o.maxZ);
}

export function lightAt(hour) {
  const h = Math.max(6, Math.min(23, Number(hour)));
  const lamps = h >= 18.5;
  const sun = lamps ? 0.05 : Math.max(0.16, Math.sin((h - 6) / 12 * Math.PI));
  const warmth = h < 11 ? 0.64 : h < 17 ? 0.32 : 0.9;
  return { lamps, sun, warmth, label: h < 11 ? '上午' : h < 18.5 ? '下午' : '夜晚' };
}

export function frameDelta(previousMs, currentMs) {
  return Math.max(0, Math.min(.05, (currentMs - previousMs) / 1000));
}
