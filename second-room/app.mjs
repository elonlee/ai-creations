import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  DOOR_DEFS,
  DOOR_HEIGHT,
  ROOMS,
  SCENARIOS,
  WALL_HEIGHT,
  WALL_SEGMENTS,
  WINDOW_BOTTOM,
  WINDOW_DEFS,
  WINDOW_TOP,
  canOccupy,
  doorObstacle,
  frameDelta,
  layoutEntries,
  lightAt,
  staticObstaclesFromWalls,
  walkStep,
} from './logic.mjs';

const $ = selector => document.querySelector(selector);
const canvas = $('#home-canvas');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let previousFrameMs = performance.now();
let renderer, scene, overviewCamera, walkCamera, controls;
let activeCamera, view = 'dollhouse', scenario = 'work', selectedRoom = null;
let introProgress = reducedMotion ? 1 : 0;
let furnitureGroup, wallGroup, windowGroup, doorGroup, pendantGroup, ceilingGroup;
let sun, ambient, hemi;
const pendantBulbs = [], lampBulbs = [], shadeMaterials = [], pointLights = [], lampPointLights = [];
const wallParts = [], windowParts = [], doors = [];
const staticObstacles = staticObstaclesFromWalls();
const furnitureObstacles = [];
const keys = new Set();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const assetCache = new Map();
const materialCache = new Map();
let reflectionEnvMap = null;

function createReflectionEnv() {
  if (reflectionEnvMap) return reflectionEnvMap;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#f4f2eb');
  g.addColorStop(0.45, '#e2e8e3');
  g.addColorStop(0.6, '#d2c8b6');
  g.addColorStop(1, '#b6aa94');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 128);
  reflectionEnvMap = new THREE.CanvasTexture(c);
  reflectionEnvMap.mapping = THREE.EquirectangularReflectionMapping;
  reflectionEnvMap.colorSpace = THREE.SRGBColorSpace;
  return reflectionEnvMap;
}

const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8f5ed, roughness: 0.93 });
const trimMat = new THREE.MeshStandardMaterial({ color: 0xc7a77b, roughness: 0.76 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0xbdd0c7, roughness: 0.14, metalness: 0.06, transparent: true, opacity: 0.34, side: THREE.DoubleSide });
const windowMat = new THREE.MeshStandardMaterial({ color: 0xaab49e, roughness: 0.64 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x46544a, roughness: 0.8 });
const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.96, side: THREE.FrontSide });

function texture(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  const base = {
    oak: '#b99466',
    oak_light: '#d5b98b',
    ivory: '#ddd9cd',
    sage: '#7b9081',
    stone: '#b4b3a9',
    dark: '#4e574f',
    brass: '#b8925a',
    white: '#f0ede5',
    mirror: '#dbe3e0',
    bulb: '#fff4d4',
    steel: '#c4c8c5',
  }[kind] || '#ddd9cd';
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  let seed = 23;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  if (kind.startsWith('oak')) {
    for (let i = 0; i < 180; i++) {
      const y = random() * 512;
      ctx.strokeStyle = `rgba(89,63,37,${0.025 + random() * 0.075})`;
      ctx.lineWidth = 0.3 + random() * 1.6;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(130, y + random() * 9, 330, y - random() * 11, 512, y + random() * 5);
      ctx.stroke();
    }
  } else if (kind === 'stone') {
    for (let i = 0; i < 14; i++) {
      const y = random() * 512;
      ctx.strokeStyle = `rgba(98,103,91,${0.03 + random() * 0.08})`;
      ctx.lineWidth = random() * 2;
      ctx.beginPath();
      ctx.moveTo(-20, y);
      ctx.bezierCurveTo(180, y - 45, 300, y + 50, 540, y - 15);
      ctx.stroke();
    }
  } else if (kind === 'ivory' || kind === 'sage' || kind === 'white') {
    for (let i = 0; i < 8000; i++) {
      const v = random() * 512;
      ctx.fillStyle = `rgba(42,53,44,${random() * 0.045})`;
      ctx.fillRect(random() * 512, v, 1, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function floorTexture(kind, baseHex, repeatX, repeatZ) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);
  let seed = 97;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  if (kind === 'wood') {
    const planks = 6;
    const pw = 512 / planks;
    for (let i = 0; i < planks; i++) {
      ctx.fillStyle = `rgba(110,82,48,${(random() - 0.5) * 0.045})`;
      ctx.fillRect(i * pw, 0, pw, 512);
      ctx.fillStyle = 'rgba(130,100,62,0.13)';
      ctx.fillRect(i * pw, 0, 1.5, 512);
      const jointY = Math.floor(random() * 400) + 56;
      ctx.fillRect(i * pw, jointY, pw, 1.5);
    }
    for (let i = 0; i < 140; i++) {
      const x = random() * 512;
      ctx.strokeStyle = `rgba(98,70,40,${0.02 + random() * 0.045})`;
      ctx.lineWidth = 0.6 + random() * 1.2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + random() * 6, 170, x - random() * 6, 340, x + random() * 4, 512);
      ctx.stroke();
    }
  } else {
    const step = 128;
    ctx.strokeStyle = 'rgba(130,126,112,0.16)';
    ctx.lineWidth = 2;
    for (let p = 0; p < 512; p += step) {
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(512, p); ctx.stroke();
    }
    for (let i = 0; i < 1800; i++) {
      ctx.fillStyle = `rgba(115,112,98,${random() * 0.05})`;
      ctx.fillRect(random() * 512, random() * 512, 2, 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatZ);
  t.anisotropy = 4;
  return t;
}

function assetMaterial(name) {
  if (!materialCache.has(name)) {
    if (name === 'mirror') {
      materialCache.set(name, new THREE.MeshStandardMaterial({ color: 0xe6eeea, metalness: 0.88, roughness: 0.08, envMap: createReflectionEnv(), envMapIntensity: 1.35 }));
    } else if (name === 'steel') {
      materialCache.set(name, new THREE.MeshStandardMaterial({ color: 0xc8ccca, metalness: 0.78, roughness: 0.25, envMap: createReflectionEnv(), envMapIntensity: 1.0 }));
    } else if (name === 'bulb') {
      materialCache.set(name, new THREE.MeshStandardMaterial({ color: 0xfff3d1, emissive: 0xffcf82, emissiveIntensity: 0.05, roughness: 0.35 }));
    } else {
      const roughness = name === 'stone' ? 0.62 : name === 'brass' ? 0.38 : name.startsWith('oak') ? 0.76 : 0.86;
      const metalness = name === 'brass' ? 0.42 : 0;
      materialCache.set(name, new THREE.MeshStandardMaterial({ map: texture(name), color: 0xffffff, roughness, metalness }));
    }
  }
  return materialCache.get(name);
}

function box(parent, x, y, z, sx, sy, sz, mat, roomId = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (roomId) mesh.userData.roomId = roomId;
  parent.add(mesh);
  return mesh;
}

function addWallSegment(seg) {
  const { x1, z1, x2, z2, mode, exterior, kind = 'full' } = seg;
  const x = (x1 + x2) / 2, z = (z1 + z2) / 2;
  const horizontal = Math.abs(x2 - x1) > Math.abs(z2 - z1);
  const length = Math.hypot(x2 - x1, z2 - z1);
  const thickness = exterior ? 0.18 : 0.12;

  const baseY = kind === 'header' ? WINDOW_TOP : 0;
  const fullTop = kind === 'sill' ? WINDOW_BOTTOM : WALL_HEIGHT;
  const fullSpan = fullTop - baseY;

  const mesh = box(wallGroup, x, baseY + fullSpan / 2, z, horizontal ? length : thickness, fullSpan, horizontal ? thickness : length, wallMat);
  mesh.userData = { wall: true, mode, kind, baseY, fullTop, fullSpan };

  let cap = null;
  if (mode !== 'front' && kind !== 'header') {
    cap = box(wallGroup, x, fullTop + 0.012, z, horizontal ? length : thickness * 0.72, 0.024, horizontal ? thickness * 0.72 : length, trimMat);
  }

  let skirting = null;
  if (kind === 'full' || kind === 'sill') {
    skirting = box(wallGroup, x, 0.04, z, horizontal ? length : thickness + 0.022, 0.08, horizontal ? thickness + 0.022 : length, trimMat);
  }

  wallParts.push({ mesh, cap, skirting, mode, kind, baseY, fullTop, fullSpan });
}

function addDoor(def) {
  const { hingeX, hingeZ, orientation, swing, roomId, mode, wallThick, entrance = false } = def;
  const group = new THREE.Group();
  group.position.set(hingeX, 0, hingeZ);

  const width = 0.78;
  const leafH = 2.08;
  const frameMat = entrance ? assetMaterial('oak') : assetMaterial('oak_light');
  const leafMat = entrance ? assetMaterial('oak') : assetMaterial('oak_light');

  // Door leaf & inner panel trim
  const leaf = box(
    group,
    orientation === 'x' ? width / 2 : 0,
    leafH / 2,
    orientation === 'x' ? 0 : width / 2,
    orientation === 'x' ? width : 0.052,
    leafH,
    orientation === 'x' ? 0.052 : width,
    leafMat,
    roomId,
  );
  // Lever handles on both sides of the door
  const handleOffset = 0.64;
  for (const side of [-1, 1]) {
    const h = box(
      group,
      orientation === 'x' ? handleOffset : side * 0.038,
      1.0,
      orientation === 'x' ? side * 0.038 : handleOffset,
      orientation === 'x' ? 0.095 : 0.024,
      0.024,
      orientation === 'x' ? 0.024 : 0.095,
      assetMaterial('brass'),
      roomId,
    );
    h.userData.door = group;
  }
  leaf.userData.door = group;

  // Fixed doorframe (left & right jambs + top lintel) in doorway opening
  const frameGroup = new THREE.Group();
  const jambDepth = wallThick + 0.022;
  const jambThick = 0.032;
  const openingSpan = width + jambThick * 2;
  const lintelH = DOOR_HEIGHT - leafH;

  const jamb1 = box(
    frameGroup,
    orientation === 'x' ? hingeX - jambThick / 2 : hingeX,
    leafH / 2,
    orientation === 'x' ? hingeZ : hingeZ - jambThick / 2,
    orientation === 'x' ? jambThick : jambDepth,
    leafH,
    orientation === 'x' ? jambDepth : jambThick,
    frameMat,
  );
  const jamb2 = box(
    frameGroup,
    orientation === 'x' ? hingeX + width + jambThick / 2 : hingeX,
    leafH / 2,
    orientation === 'x' ? hingeZ : hingeZ + width + jambThick / 2,
    orientation === 'x' ? jambThick : jambDepth,
    leafH,
    orientation === 'x' ? jambDepth : jambThick,
    frameMat,
  );
  const lintel = box(
    frameGroup,
    orientation === 'x' ? hingeX + width / 2 : hingeX,
    leafH + lintelH / 2,
    orientation === 'x' ? hingeZ : hingeZ + width / 2,
    orientation === 'x' ? openingSpan : jambDepth,
    lintelH,
    orientation === 'x' ? jambDepth : openingSpan,
    frameMat,
  );

  group.userData = { open: false, orientation, swing, hingeX, hingeZ, mode, entrance };
  doorGroup.add(group, frameGroup);
  doors.push({ group, leafH, jamb1, jamb2, lintel, mode, entrance, def });
}

function addWindow(def) {
  const { x, z, width, orientation, roomId, mode } = def;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  windowGroup.add(g);

  const h = WINDOW_TOP - WINDOW_BOTTOM;
  const midY = (WINDOW_BOTTOM + WINDOW_TOP) / 2;
  const depth = 0.055;
  const rail = orientation === 'x'
    ? (px, py, pz, sx, sy, sz, mat = windowMat, r = null) => box(g, px, py, pz, sx, sy, sz, mat, r)
    : (px, py, pz, sx, sy, sz, mat = windowMat, r = null) => box(g, pz, py, px, sz, sy, sx, mat, r);

  const glass = rail(0, midY, 0, width - 0.04, h - 0.04, 0.02, glassMat, roomId);
  const bottomSill = rail(0, WINDOW_BOTTOM + 0.022, 0, width + 0.08, 0.044, 0.21, trimMat);
  const topRail = rail(0, WINDOW_TOP - 0.022, 0, width + 0.04, 0.044, depth + 0.02, windowMat);
  const transom = rail(0, midY, 0, width - 0.04, 0.026, depth, windowMat);
  const mullions = [-width / 2 + 0.022, 0, width / 2 - 0.022].map(xx => rail(xx, midY, 0, 0.044, h, depth + 0.02, windowMat));

  windowParts.push({ group: g, mode, glass, bottomSill, topRail, transom, mullions, h, midY });
}

function addFloor() {
  const base = box(scene, 0, -0.22, 0, 10.36, 0.36, 7.66, new THREE.MeshStandardMaterial({ color: 0xf2eee5, roughness: 0.9 }));
  base.castShadow = false;
  const floorConfigs = {
    living: { color: '#ceb58e', kind: 'wood' },
    kitchen: { color: '#dbd4c5', kind: 'tile' },
    entry: { color: '#dfd9cb', kind: 'tile' },
    master: { color: '#d3ba93', kind: 'wood' },
    flex: { color: '#d4be99', kind: 'wood' },
  };
  for (const room of Object.values(ROOMS)) {
    const [a, b, c, d] = room.bounds;
    const w = b - a;
    const len = d - c;
    const cfg = floorConfigs[room.id];
    const tex = floorTexture(cfg.kind, cfg.color, w / 1.4, len / 1.4);
    const floor = box(scene, (a + b) / 2, -0.02, (c + d) / 2, w - 0.02, 0.04, len - 0.02, new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff, roughness: cfg.kind === 'wood' ? 0.88 : 0.92 }), room.id);
    floor.castShadow = false;
    const edge = new THREE.EdgesGeometry(floor.geometry);
    const outline = new THREE.LineSegments(edge, new THREE.LineBasicMaterial({ color: 0xb4a88e, transparent: true, opacity: 0.25 }));
    outline.position.copy(floor.position);
    scene.add(outline);
  }
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xecebe5, roughness: 1 });
  const ground = box(scene, 0, -0.42, 0, 200, 0.04, 200, groundMat);
  ground.castShadow = false;
}

function addCeiling() {
  ceilingGroup = new THREE.Group();
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(10.18, 7.48), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, WALL_HEIGHT, 0);
  ceilingGroup.add(ceiling);
  scene.add(ceilingGroup);
}

function buildArchitecture() {
  wallGroup = new THREE.Group();
  windowGroup = new THREE.Group();
  doorGroup = new THREE.Group();
  pendantGroup = new THREE.Group();
  scene.add(wallGroup, windowGroup, doorGroup, pendantGroup);

  addFloor();
  addCeiling();
  for (const seg of WALL_SEGMENTS) addWallSegment(seg);
  for (const def of DOOR_DEFS) addDoor(def);
  for (const def of WINDOW_DEFS) addWindow(def);
  const threshold = box(wallGroup, -0.35, 0.008, 3.65, 0.84, 0.016, 0.18, trimMat);
  threshold.castShadow = false;
}

function addPendant(x, z, roomId, radius = 0.22) {
  const shadeMat = assetMaterial('ivory').clone();
  shadeMat.side = THREE.DoubleSide;
  shadeMat.userData.pendant = true;
  shadeMaterials.push(shadeMat);

  const shadeWall = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.72, radius, 0.21, 28, 1, true), shadeMat);
  shadeWall.position.set(x, 2.22, z);
  shadeWall.castShadow = true;
  shadeWall.userData.roomId = roomId;
  pendantGroup.add(shadeWall);

  const shadeTop = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.72, 28), shadeMat);
  shadeTop.rotation.x = -Math.PI / 2;
  shadeTop.position.set(x, 2.325, z);
  shadeTop.userData.roomId = roomId;
  pendantGroup.add(shadeTop);

  const cord = box(pendantGroup, x, 2.51, z, 0.014, 0.38, 0.014, darkMat);
  cord.userData.cord = true;
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.025, 16), darkMat);
  canopy.position.set(x, WALL_HEIGHT - 0.012, z);
  canopy.userData.cord = true;
  pendantGroup.add(canopy);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.052, 14, 10),
    new THREE.MeshStandardMaterial({ color: 0xf4e5b8, emissive: 0xffd89b, emissiveIntensity: 0.05 }),
  );
  bulb.position.set(x, 2.18, z);
  pendantGroup.add(bulb);
  pendantBulbs.push(bulb);

  const point = new THREE.PointLight(0xffd5a1, 0, 5.2, 2);
  point.position.set(x, 2.04, z);
  scene.add(point);
  pointLights.push(point);
}

function disposeFurniture() {
  if (!furnitureGroup) return;
  scene.remove(furnitureGroup);
  furnitureGroup = null;
  lampBulbs.length = 0;
  lampPointLights.length = 0;
  const keptShades = shadeMaterials.filter(m => m.userData.pendant);
  shadeMaterials.length = 0;
  shadeMaterials.push(...keptShades);
}

function instantiate(name, x, z, rotation, roomId, y = 0) {
  const source = assetCache.get(name);
  if (!source) return;
  const object = source.clone(true);
  object.position.set(x, y, z);
  object.rotation.y = rotation;
  object.userData.roomId = roomId;
  object.userData.asset = name;
  const isLamp = name === 'floor_lamp' || name === 'table_lamp' || name === 'desk_lamp';
  object.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.userData.roomId = roomId;
      if (o.material === assetMaterial('bulb')) {
        o.material = o.material.clone();
        lampBulbs.push(o);
      } else if (isLamp && o.material === assetMaterial('ivory')) {
        o.material = o.material.clone();
        shadeMaterials.push(o.material);
      }
    }
  });
  furnitureGroup.add(object);

  if (name === 'floor_lamp' || name === 'table_lamp' || name === 'desk_lamp') {
    const lightY = name === 'floor_lamp' ? 1.44 : y + 0.34;
    const lp = new THREE.PointLight(0xffd296, 0, 2.8, 2);
    lp.position.set(x, lightY, z);
    furnitureGroup.add(lp);
    lampPointLights.push(lp);
  }

  if (!['floor_lamp', 'table_lamp', 'desk_lamp', 'rug', 'round_rug', 'mirror', 'upper_cabinet'].includes(name)) {
    object.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(object);
    furnitureObstacles.push({ minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z });
  }
  return object;
}

function rebuildFurniture(kind) {
  disposeFurniture();
  furnitureGroup = new THREE.Group();
  scene.add(furnitureGroup);
  furnitureObstacles.length = 0;
  for (const e of layoutEntries(kind)) instantiate(...e);
  updateLampGlow($('#time-slider').value);
  if (!reducedMotion) {
    furnitureGroup.scale.setScalar(0.001);
    furnitureGroup.userData.born = performance.now();
  }
}

function setScenario(kind) {
  if (!SCENARIOS[kind]) return;
  scenario = kind;
  rebuildFurniture(kind);
  document.querySelectorAll('.scenario').forEach(btn => {
    const active = btn.dataset.scenario === kind;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active);
  });
  if (selectedRoom === 'flex') showRoom('flex');
  $('#asset-status').textContent = `方案 ${SCENARIOS[kind].index} / 03 · 32 件本地家具模型`;
}

function showRoom(id) {
  const room = ROOMS[id];
  if (!room) return;
  selectedRoom = id;
  $('#room-en').textContent = room.en;
  $('#room-name').textContent = room.name;
  $('#room-area').textContent = `${room.area}㎡`;
  $('#room-size').textContent = room.size;
  $('#room-items').replaceChildren(
    ...(id === 'flex' ? SCENARIOS[scenario].items : room.items).map(item => {
      const li = document.createElement('li');
      li.textContent = item;
      return li;
    }),
  );
  $('#room-card').hidden = false;
}

function setView(next) {
  view = next;
  document.body.classList.toggle('walk-mode', next === 'walk');
  document.querySelectorAll('.view-btn').forEach(btn => {
    const active = btn.dataset.view === next;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active);
  });
  $('#walk-hint').hidden = next !== 'walk';
  $('#scene-hint').hidden = next === 'walk';

  if (next === 'walk') {
    controls.enabled = false;
    activeCamera = walkCamera;
    walkCamera.position.set(-1.35, 1.58, -1.65);
    walkCamera.userData.yaw = -1.85;
    walkCamera.userData.pitch = -0.05;
    updateWalkLook();
  } else {
    activeCamera = overviewCamera;
    controls.enabled = true;
    overviewCamera.up.set(0, next === 'top' ? 0 : 1, next === 'top' ? -1 : 0);
    controls.target.set(0.1, 0.15, next === 'top' ? 0.48 : 0);
    controls.minPolarAngle = next === 'top' ? 0 : 0.18;
    controls.maxPolarAngle = next === 'top' ? 0.01 : Math.PI * 0.47;
    if (next === 'top') overviewCamera.position.set(0.1, 20, 0);
    else if (next === 'section') overviewCamera.position.set(12.8, 10.6, 13.8);
    else overviewCamera.position.set(12.9, 14.4, 15.8);
    overviewCamera.lookAt(controls.target);
    controls.update();
  }
  updateWalls();
}

function cutHeightForMode(mode) {
  if (view === 'walk') return WALL_HEIGHT;
  if (view === 'top') return 0.14;
  if (view === 'section') return mode === 'front' ? 0.16 : 1.35;
  return mode === 'front' ? 0.21 : mode === 'exterior' ? 1.92 : 1.28;
}

function updateWalls() {
  for (const part of wallParts) {
    const cutH = cutHeightForMode(part.mode);
    const { mesh, cap, skirting, kind, baseY, fullTop, fullSpan } = part;
    if (kind === 'header') {
      const visible = cutH > baseY + 0.01;
      mesh.visible = visible;
      if (visible) {
        const span = Math.min(cutH, fullTop) - baseY;
        mesh.scale.y = span / fullSpan;
        mesh.position.y = baseY + span / 2;
      }
      continue;
    }
    const targetTop = Math.min(cutH, fullTop);
    const span = Math.max(0.001, targetTop - baseY);
    mesh.scale.y = span / fullSpan;
    mesh.position.y = baseY + span / 2;
    if (cap) {
      cap.visible = view !== 'walk' && cutH > baseY + 0.05 && (kind !== 'sill' || cutH <= WINDOW_BOTTOM + 0.02);
      cap.position.y = targetTop + 0.012;
    }
    if (skirting) {
      const skH = Math.min(0.08, cutH);
      skirting.scale.y = skH / 0.08;
      skirting.position.y = skH / 2;
      skirting.visible = cutH > 0.02;
    }
  }

  for (const wp of windowParts) {
    const cutH = cutHeightForMode(wp.mode);
    const visible = cutH > WINDOW_BOTTOM + 0.04;
    wp.group.visible = visible;
    if (!visible) continue;
    const top = Math.min(cutH, WINDOW_TOP);
    const span = Math.max(0.05, top - WINDOW_BOTTOM);
    const mid = (WINDOW_BOTTOM + top) / 2;
    wp.glass.scale.y = Math.max(0.01, (span - 0.04) / (wp.h - 0.04));
    wp.glass.position.y = mid;
    for (const m of wp.mullions) {
      m.scale.y = span / wp.h;
      m.position.y = mid;
    }
    wp.transom.visible = top >= wp.midY + 0.04;
    wp.topRail.visible = top >= WINDOW_TOP - 0.02;
  }

  for (const d of doors) {
    const cutH = cutHeightForMode(d.mode);
    const visible = view !== 'top' && (!d.entrance || view === 'walk') && cutH > 0.25;
    d.group.visible = visible;
    d.jamb1.visible = visible;
    d.jamb2.visible = visible;
    d.lintel.visible = visible && cutH >= DOOR_HEIGHT;
    if (!visible) continue;
    const targetH = Math.min(d.leafH, cutH);
    const scaleY = targetH / d.leafH;
    d.group.scale.y = scaleY;
    d.jamb1.scale.y = scaleY;
    d.jamb1.position.y = targetH / 2;
    d.jamb2.scale.y = scaleY;
    d.jamb2.position.y = targetH / 2;
  }

  ceilingGroup.visible = view === 'walk';
  pendantGroup.visible = view === 'walk' || view === 'dollhouse';
  pendantGroup.traverse(o => {
    if (o.userData.cord) o.visible = view === 'walk';
  });
}

function updateWalkLook() {
  const yaw = walkCamera.userData.yaw, pitch = walkCamera.userData.pitch;
  walkCamera.lookAt(
    walkCamera.position.x + Math.sin(yaw) * Math.cos(pitch),
    walkCamera.position.y + Math.sin(pitch),
    walkCamera.position.z + Math.cos(yaw) * Math.cos(pitch),
  );
}

function updateLampGlow(hour) {
  const state = lightAt(hour);
  pointLights.forEach(l => (l.intensity = state.lamps ? 3.2 : 0));
  lampPointLights.forEach(l => (l.intensity = state.lamps ? 1.8 : 0));
  pendantBulbs.forEach(b => (b.material.emissiveIntensity = state.lamps ? 3.2 : 0.05));
  lampBulbs.forEach(b => (b.material.emissiveIntensity = state.lamps ? 2.8 : 0.05));
  shadeMaterials.forEach(m => {
    m.emissive.setHex(0xffcf88);
    m.emissiveIntensity = state.lamps ? 0.36 : 0;
  });
}

function updateLighting(hour) {
  const state = lightAt(hour);
  document.body.classList.toggle('night-mode', state.lamps);
  const h = Number(hour), hh = Math.floor(h), mm = Math.round((h - hh) * 60).toString().padStart(2, '0');
  $('#time-output').textContent = `${hh}:${mm} ${state.label}`;
  sun.position.set((h - 13) * 1.8, 9.5, h < 13 ? -7 : 8);
  sun.intensity = state.sun * 1.55;
  sun.color.set(state.warmth > 0.7 ? 0xffdfad : 0xfff1d7);
  ambient.intensity = state.lamps ? 0.44 : 0.7;
  hemi.intensity = state.lamps ? 0.34 : 0.52;
  scene.background = new THREE.Color(state.lamps ? 0x444d4b : h < 11 ? 0xece9df : 0xf1f0e9);
  updateLampGlow(hour);
}

function resize() {
  const w = innerWidth, h = innerHeight, aspect = w / h;
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const vertical = aspect < 0.8 ? Math.max(19, 12 / aspect) : aspect < 1.2 ? 17.4 : 16.8;
  overviewCamera.left = -vertical * aspect / 2;
  overviewCamera.right = vertical * aspect / 2;
  overviewCamera.top = vertical / 2;
  overviewCamera.bottom = -vertical / 2;
  overviewCamera.updateProjectionMatrix();
  walkCamera.aspect = aspect;
  walkCamera.updateProjectionMatrix();
}

function handlePick(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, activeCamera);
  const hits = raycaster.intersectObjects([doorGroup, furnitureGroup, scene], true);
  for (const hit of hits) {
    const object = hit.object;
    if (view === 'walk' && object.userData.door) {
      const door = object.userData.door;
      door.userData.open = !door.userData.open;
      door.rotation.y = door.userData.open ? door.userData.swing * Math.PI * 0.52 : 0;
      return;
    }
    if (view !== 'walk' && object.userData.roomId) {
      showRoom(object.userData.roomId);
      return;
    }
  }
}

function updateWalk(delta) {
  if (view !== 'walk') return;
  const yaw = walkCamera.userData.yaw, speed = Math.min(delta, 0.04) * 2.25;
  let forward = 0, sideways = 0;
  if (keys.has('w') || keys.has('arrowup')) forward += 1;
  if (keys.has('s') || keys.has('arrowdown')) forward -= 1;
  if (keys.has('a') || keys.has('arrowleft')) sideways -= 1;
  if (keys.has('d') || keys.has('arrowright')) sideways += 1;
  if (!forward && !sideways) return;
  const { dx, dz } = walkStep(yaw, forward, sideways, speed);
  const p = walkCamera.position;
  const doorObs = doors.map(d => doorObstacle({
    hingeX: d.def.hingeX,
    hingeZ: d.def.hingeZ,
    orientation: d.def.orientation,
    swing: d.def.swing,
    open: d.group.userData.open,
  }));
  const obstacles = [...staticObstacles, ...furnitureObstacles, ...doorObs];
  if (canOccupy(p.x + dx, p.z, obstacles, 0.21)) p.x += dx;
  if (canOccupy(p.x, p.z + dz, obstacles, 0.21)) p.z += dz;
  updateWalkLook();
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const delta = frameDelta(previousFrameMs, now);
  previousFrameMs = now;
  if (introProgress < 1) {
    introProgress = Math.min(1, introProgress + delta / 3.3);
    wallGroup.scale.y = 0.01 + 0.99 * THREE.MathUtils.smoothstep(introProgress, 0.06, 0.7);
    windowGroup.scale.y = 0.01 + 0.99 * THREE.MathUtils.smoothstep(introProgress, 0.22, 0.86);
    if (furnitureGroup) furnitureGroup.scale.setScalar(0.001 + 0.999 * THREE.MathUtils.smoothstep(introProgress, 0.47, 1));
  } else {
    wallGroup.scale.y = 1;
    windowGroup.scale.y = 1;
  }
  if (furnitureGroup?.userData.born && introProgress >= 1) {
    const t = Math.min(1, (performance.now() - furnitureGroup.userData.born) / 430);
    furnitureGroup.scale.setScalar(0.001 + 0.999 * (1 - (1 - t) ** 3));
    if (t === 1) delete furnitureGroup.userData.born;
  }
  updateWalk(delta);
  if (view !== 'walk') controls.update();
  renderer.render(scene, activeCamera);
}

async function loadFurniture() {
  const loader = new GLTFLoader();
  const names = [...new Set([...layoutEntries('work'), ...layoutEntries('guest'), ...layoutEntries('future')].map(e => e[0]))];
  let completed = 0, failed = 0;
  await Promise.all(names.map(async name => {
    try {
      const gltf = await loader.loadAsync(`./assets/furniture/${name}.glb`);
      gltf.scene.traverse(o => {
        if (o.isMesh) o.material = assetMaterial(o.material.name);
      });
      assetCache.set(name, gltf.scene);
    } catch (error) {
      failed++;
      console.error(`家具载入失败：${name}`, error);
    }
    completed++;
    $('#loading-bar').style.width = `${Math.round(completed / names.length * 100)}%`;
    $('#loading-progress').textContent = `家具载入 ${completed} / ${names.length}`;
  }));
  $('#asset-status').textContent = failed ? `${failed} 件家具载入失败` : '32 件本地家具模型';
}

function bindUI() {
  document.querySelectorAll('.scenario').forEach(btn => btn.addEventListener('click', () => setScenario(btn.dataset.scenario)));
  document.querySelectorAll('.view-btn').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));
  $('#time-slider').addEventListener('input', e => updateLighting(e.target.value));
  $('#close-room').addEventListener('click', () => { $('#room-card').hidden = true; selectedRoom = null; });
  $('#reset-view').addEventListener('click', () => setView('dollhouse'));
  $('#exit-walk').addEventListener('click', () => setView('dollhouse'));
  let start = null, last = null;
  canvas.addEventListener('pointerdown', e => {
    start = { x: e.clientX, y: e.clientY };
    last = { x: e.clientX, y: e.clientY };
    if (view === 'walk') canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (view !== 'walk' || !last) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    walkCamera.userData.yaw -= dx * 0.004;
    walkCamera.userData.pitch = THREE.MathUtils.clamp(walkCamera.userData.pitch - dy * 0.003, -1.2, 1.2);
    last = { x: e.clientX, y: e.clientY };
    updateWalkLook();
  });
  canvas.addEventListener('pointerup', e => {
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 5) handlePick(e);
    start = last = null;
  });
  canvas.addEventListener('pointercancel', () => { start = last = null; });
  window.addEventListener('keydown', e => {
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase()) && view === 'walk') e.preventDefault();
    keys.add(e.key.toLowerCase());
    if (e.key === 'Escape') {
      if (view === 'walk') setView('dollhouse');
      else { $('#room-card').hidden = true; selectedRoom = null; }
    }
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('resize', resize);
}

async function init() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f0e9);
    overviewCamera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 100);
    overviewCamera.position.set(12.9, 14.4, 15.8);
    overviewCamera.lookAt(0.1, 0.35, 0);
    walkCamera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.04, 70);
    activeCamera = overviewCamera;

    controls = new OrbitControls(overviewCamera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 7;
    controls.maxDistance = 36;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.target.set(0.1, 0.35, 0);
    controls.update();

    ambient = new THREE.AmbientLight(0xffffff, 0.86);
    scene.add(ambient);
    hemi = new THREE.HemisphereLight(0xe9f1e8, 0x998468, 0.65);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff1d7, 2);
    sun.position.set(4, 10, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -11;
    sun.shadow.camera.right = 11;
    sun.shadow.camera.top = 11;
    sun.shadow.camera.bottom = -11;
    sun.shadow.bias = -0.00015;
    sun.shadow.normalBias = 0.015;
    sun.shadow.radius = 3.5;
    scene.add(sun);

    buildArchitecture();
    addPendant(-2.9, -1.75, 'living', 0.28);
    addPendant(-3.55, 1.35, 'kitchen', 0.21);
    addPendant(-0.6, 1.75, 'entry', 0.17);
    addPendant(3.15, -2.0, 'master', 0.22);
    addPendant(3.0, 1.75, 'flex', 0.23);

    bindUI();
    resize();
    setView('dollhouse');
    updateLighting($('#time-slider').value);
    await loadFurniture();
    setScenario('work');
    $('#loading').classList.add('done');
    animate();
  } catch (error) {
    console.error(error);
    $('#loading').classList.add('done');
    $('#error').hidden = false;
  }
}

init();
