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

export const WALL_HEIGHT = 2.7;
export const DOOR_HEIGHT = 2.12;
export const WINDOW_BOTTOM = 0.9;
export const WINDOW_TOP = 2.12;

export const WALL_SEGMENTS = [
  // West exterior wall (X = -5.0, Z = -3.56..3.56), kitchen window Z = 1.32..2.68
  { x1: -5, z1: -3.56, x2: -5, z2: 1.32, mode: 'exterior', exterior: true },
  { x1: -5, z1: 1.32, x2: -5, z2: 2.68, mode: 'exterior', exterior: true, kind: 'sill' },
  { x1: -5, z1: 1.32, x2: -5, z2: 2.68, mode: 'exterior', exterior: true, kind: 'header' },
  { x1: -5, z1: 2.68, x2: -5, z2: 3.56, mode: 'exterior', exterior: true },

  // East exterior wall (X = +5.0, Z = -3.56..3.56), flex window Z = 0.73..2.37
  { x1: 5, z1: -3.56, x2: 5, z2: 0.73, mode: 'front', exterior: true },
  { x1: 5, z1: 0.73, x2: 5, z2: 2.37, mode: 'front', exterior: true, kind: 'sill' },
  { x1: 5, z1: 0.73, x2: 5, z2: 2.37, mode: 'front', exterior: true, kind: 'header' },
  { x1: 5, z1: 2.37, x2: 5, z2: 3.56, mode: 'front', exterior: true },

  // North exterior wall (Z = -3.65, X = -5.09..5.09), living window -4.05..-1.55, master window 2.25..4.25
  { x1: -5.09, z1: -3.65, x2: -4.05, z2: -3.65, mode: 'exterior', exterior: true },
  { x1: -4.05, z1: -3.65, x2: -1.55, z2: -3.65, mode: 'exterior', exterior: true, kind: 'sill' },
  { x1: -4.05, z1: -3.65, x2: -1.55, z2: -3.65, mode: 'exterior', exterior: true, kind: 'header' },
  { x1: -1.55, z1: -3.65, x2: 2.25, z2: -3.65, mode: 'exterior', exterior: true },
  { x1: 2.25, z1: -3.65, x2: 4.25, z2: -3.65, mode: 'exterior', exterior: true, kind: 'sill' },
  { x1: 2.25, z1: -3.65, x2: 4.25, z2: -3.65, mode: 'exterior', exterior: true, kind: 'header' },
  { x1: 4.25, z1: -3.65, x2: 5.09, z2: -3.65, mode: 'exterior', exterior: true },

  // South exterior wall (Z = +3.65, X = -5.09..5.09), entrance doorway -0.77..0.07
  { x1: -5.09, z1: 3.65, x2: -0.77, z2: 3.65, mode: 'front', exterior: true },
  { x1: -0.77, z1: 3.65, x2: 0.07, z2: 3.65, mode: 'front', exterior: true, kind: 'header' },
  { x1: 0.07, z1: 3.65, x2: 5.09, z2: 3.65, mode: 'front', exterior: true },

  // Living / Kitchen+Entry divider (Z = +0.20, X = -4.91..0.84), door -1.15..-0.31
  { x1: -4.91, z1: 0.2, x2: -1.15, z2: 0.2, mode: 'interior', exterior: false },
  { x1: -1.15, z1: 0.2, x2: -0.31, z2: 0.2, mode: 'interior', exterior: false, kind: 'header' },
  { x1: -0.31, z1: 0.2, x2: 0.84, z2: 0.2, mode: 'interior', exterior: false },

  // Kitchen / Entry divider (X = -2.10, Z = 0.26..3.56), door 1.14..1.98
  { x1: -2.1, z1: 0.26, x2: -2.1, z2: 1.14, mode: 'interior', exterior: false },
  { x1: -2.1, z1: 1.14, x2: -2.1, z2: 1.98, mode: 'interior', exterior: false, kind: 'header' },
  { x1: -2.1, z1: 1.98, x2: -2.1, z2: 3.56, mode: 'interior', exterior: false },

  // Central spine wall (X = +0.90, Z = -3.56..3.56), master door -1.80..-0.96, flex door 1.24..2.08
  { x1: 0.9, z1: -3.56, x2: 0.9, z2: -1.8, mode: 'interior', exterior: false },
  { x1: 0.9, z1: -1.8, x2: 0.9, z2: -0.96, mode: 'interior', exterior: false, kind: 'header' },
  { x1: 0.9, z1: -0.96, x2: 0.9, z2: 1.24, mode: 'interior', exterior: false },
  { x1: 0.9, z1: 1.24, x2: 0.9, z2: 2.08, mode: 'interior', exterior: false, kind: 'header' },
  { x1: 0.9, z1: 2.08, x2: 0.9, z2: 3.56, mode: 'interior', exterior: false },

  // Master / Flex divider (Z = -0.10, X = 0.96..4.91), door 1.67..2.51
  { x1: 0.96, z1: -0.1, x2: 1.67, z2: -0.1, mode: 'interior', exterior: false },
  { x1: 1.67, z1: -0.1, x2: 2.51, z2: -0.1, mode: 'interior', exterior: false, kind: 'header' },
  { x1: 2.51, z1: -0.1, x2: 4.91, z2: -0.1, mode: 'interior', exterior: false },
];

export const WINDOW_DEFS = [
  { x: -2.8, z: -3.65, width: 2.5, orientation: 'x', roomId: 'living', mode: 'exterior' },
  { x: 3.25, z: -3.65, width: 2.0, orientation: 'x', roomId: 'master', mode: 'exterior' },
  { x: -5.0, z: 2.0, width: 1.36, orientation: 'z', roomId: 'kitchen', mode: 'exterior' },
  { x: 5.0, z: 1.55, width: 1.64, orientation: 'z', roomId: 'flex', mode: 'front' },
];

export const DOOR_DEFS = [
  { hingeX: -1.12, hingeZ: 0.2, orientation: 'x', swing: 1, roomId: 'living', mode: 'interior', wallThick: 0.12 },
  { hingeX: -2.1, hingeZ: 1.17, orientation: 'z', swing: 1, roomId: 'kitchen', mode: 'interior', wallThick: 0.12 },
  { hingeX: 0.9, hingeZ: -1.77, orientation: 'z', swing: 1, roomId: 'master', mode: 'interior', wallThick: 0.12 },
  { hingeX: 0.9, hingeZ: 1.27, orientation: 'z', swing: 1, roomId: 'flex', mode: 'interior', wallThick: 0.12 },
  { hingeX: 1.7, hingeZ: -0.1, orientation: 'x', swing: 1, roomId: 'flex', mode: 'interior', wallThick: 0.12 },
  { hingeX: -0.74, hingeZ: 3.65, orientation: 'x', swing: 1, roomId: 'entry', mode: 'front', wallThick: 0.18, entrance: true },
];

const COMMON_FURNITURE = [
  // Living room: sofa under North window sill (facing +Z), coffee table in center, media console on South wall (facing -Z)
  ['sofa', -3.1, -3.05, 0, 'living'],
  ['coffee_table', -3.1, -1.95, 0, 'living'],
  ['media_console', -3.1, -0.09, Math.PI, 'living'],
  ['floor_lamp', -4.58, -3.15, 0, 'living'],
  ['side_table', -1.65, -3.15, 0, 'living'],

  // Kitchen & Dining: counter + upper cabinet flush on South wall (facing -Z), 4-seat dining set in NW corner
  ['kitchen_counter', -3.54, 3.24, Math.PI, 'kitchen'],
  ['upper_cabinet', -3.54, 3.38, Math.PI, 'kitchen', 1.48],
  ['dining_table', -3.75, 1.25, 0, 'kitchen'],
  ['dining_chair', -4.06, 0.62, 0, 'kitchen'],
  ['dining_chair', -3.44, 0.62, 0, 'kitchen'],
  ['dining_chair', -4.06, 1.88, Math.PI, 'kitchen'],
  ['dining_chair', -3.44, 1.88, Math.PI, 'kitchen'],

  // Entry & Hall: shoe cabinet left of entrance door, mirror on West wall, bench on East wall
  ['shoe_cabinet', -1.42, 3.37, Math.PI, 'entry'],
  ['bench', 0.64, 2.85, -Math.PI / 2, 'entry'],
  ['mirror', -1.78, 2.58, Math.PI / 2, 'entry'],

  // Master Bedroom: bed against North wall, 2 bedsides flush on wall, table lamp atop left bedside, wardrobe on South wall
  ['bed_double', 3.15, -2.52, 0, 'master'],
  ['bedside', 1.98, -3.35, 0, 'master'],
  ['bedside', 4.32, -3.35, 0, 'master'],
  ['wardrobe', 3.85, -0.47, Math.PI, 'master'],
  ['table_lamp', 1.98, -3.35, 0, 'master', 0.5],
];

const SCENARIO_FURNITURE = {
  work: [
    ['desk', 3.55, 3.2, Math.PI, 'flex'],
    ['office_chair', 3.55, 2.48, 0, 'flex'],
    ['bookcase', 3.85, 0.15, 0, 'flex'],
    ['reading_chair', 1.56, 2.98, 2.45, 'flex'],
    ['side_table', 2.4, 3.18, 0, 'flex'],
    ['desk_lamp', 4.06, 3.3, Math.PI, 'flex', 0.76],
  ],
  guest: [
    ['sofa_bed', 3.52, 0.51, 0, 'flex'],
    ['round_table', 3.52, 1.65, 0, 'flex'],
    ['low_cabinet', 3.55, 3.34, Math.PI, 'flex'],
    ['luggage_rack', 1.65, 3.3, Math.PI, 'flex'],
    ['floor_lamp', 4.68, 0.22, 0, 'flex'],
    ['rug', 3.52, 1.55, 0, 'flex'],
  ],
  future: [
    ['bed_single', 4.35, 0.92, 0, 'flex'],
    ['low_bookshelf', 1.75, 3.36, Math.PI, 'flex'],
    ['kids_table', 2.55, 2.05, 0, 'flex'],
    ['kids_chair', 2.55, 1.54, 0, 'flex'],
    ['toy_shelf', 4.1, 3.36, Math.PI, 'flex'],
    ['round_rug', 2.65, 1.75, 0, 'flex'],
  ],
};

export function layoutEntries(kind) {
  const common = COMMON_FURNITURE.map(item => [...item]);
  if (kind === 'guest') {
    common.find(e => e[0] === 'coffee_table')[1] += 0.1;
    for (const e of common) {
      if (e[0] === 'dining_table' || e[0] === 'dining_chair') e[2] += 0.1;
    }
  } else if (kind === 'future') {
    common.find(e => e[0] === 'coffee_table')[1] -= 0.1;
    common.find(e => e[0] === 'coffee_table')[2] += 0.08;
    for (const e of common) {
      if (e[0] === 'dining_table' || e[0] === 'dining_chair') e[1] += 0.1;
    }
  }
  return [...common, ...(SCENARIO_FURNITURE[kind] || [])];
}

export function staticObstaclesFromWalls() {
  return WALL_SEGMENTS.filter(w => w.kind !== 'header').map(w => {
    const pad = w.exterior ? 0.09 : 0.06;
    return {
      minX: Math.min(w.x1, w.x2) - pad,
      maxX: Math.max(w.x1, w.x2) + pad,
      minZ: Math.min(w.z1, w.z2) - pad,
      maxZ: Math.max(w.z1, w.z2) + pad,
    };
  });
}

export function doorObstacle(door) {
  const w = 0.78;
  const pad = 0.05;
  if (!door.open) {
    if (door.orientation === 'x') {
      return { minX: door.hingeX, maxX: door.hingeX + w, minZ: door.hingeZ - pad, maxZ: door.hingeZ + pad };
    }
    return { minX: door.hingeX - pad, maxX: door.hingeX + pad, minZ: door.hingeZ, maxZ: door.hingeZ + w };
  }
  if (door.orientation === 'x') {
    const zMin = door.swing > 0 ? door.hingeZ - w : door.hingeZ;
    const zMax = door.swing > 0 ? door.hingeZ : door.hingeZ + w;
    return { minX: door.hingeX - pad, maxX: door.hingeX + pad, minZ: zMin, maxZ: zMax };
  }
  const xMin = door.swing > 0 ? door.hingeX : door.hingeX - w;
  const xMax = door.swing > 0 ? door.hingeX + w : door.hingeX;
  return { minX: xMin, maxX: xMax, minZ: door.hingeZ - pad, maxZ: door.hingeZ + pad };
}

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

export function walkStep(yaw, forward, sideways, distance) {
  if (!forward && !sideways) return { dx: 0, dz: 0 };
  const norm = Math.hypot(forward, sideways);
  // Look direction is (sin(yaw), 0, cos(yaw)); right-hand strafe F x Up is (-cos(yaw), 0, sin(yaw)).
  return {
    dx: (Math.sin(yaw) * forward - Math.cos(yaw) * sideways) * distance / norm,
    dz: (Math.cos(yaw) * forward + Math.sin(yaw) * sideways) * distance / norm,
  };
}

export function frameDelta(previousMs, currentMs) {
  return Math.max(0, Math.min(0.05, (currentMs - previousMs) / 1000));
}
