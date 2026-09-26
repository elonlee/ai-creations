import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ROOMS, SCENARIOS, canOccupy, frameDelta, lightAt } from './logic.mjs';

const $ = selector => document.querySelector(selector);
const canvas = $('#home-canvas');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let previousFrameMs = performance.now();
let renderer, scene, overviewCamera, walkCamera, controls;
let activeCamera, view = 'dollhouse', scenario = 'work', selectedRoom = null;
let introProgress = reducedMotion ? 1 : 0;
let furnitureGroup, wallGroup, windowGroup, doorGroup;
let sun, ambient, hemi;
const bulbs = [], pointLights = [], walls = [], staticObstacles = [], furnitureObstacles = [], doors = [];
const keys = new Set();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const assetCache = new Map();
const materialCache = new Map();
const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8f5ed, roughness: .93 });
const trimMat = new THREE.MeshStandardMaterial({ color: 0xc7a77b, roughness: .76 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0xbdd0c7, roughness: .16, metalness: .05, transparent: true, opacity: .37, side: THREE.DoubleSide });
const windowMat = new THREE.MeshStandardMaterial({ color: 0xb2b9a4, roughness: .66 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x46544a, roughness: .8 });

function texture(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const ctx = c.getContext('2d');
  const base = { oak: '#b99466', oak_light: '#d5b98b', ivory: '#ddd9cd', sage: '#7b9081', stone: '#b4b3a9', dark: '#4e574f', brass: '#ae8a59', white: '#f0ede5' }[kind];
  ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 512);
  let seed = 23;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  if (kind.startsWith('oak')) {
    for (let i = 0; i < 180; i++) {
      const y = random() * 512;
      ctx.strokeStyle = `rgba(89,63,37,${.025 + random() * .075})`;
      ctx.lineWidth = .3 + random() * 1.6; ctx.beginPath();
      ctx.moveTo(0, y); ctx.bezierCurveTo(130, y + random() * 9, 330, y - random() * 11, 512, y + random() * 5); ctx.stroke();
    }
  } else if (kind === 'stone') {
    for (let i = 0; i < 13; i++) { const y = random() * 512; ctx.strokeStyle = `rgba(98,103,91,${.03 + random() * .08})`; ctx.lineWidth = random() * 2; ctx.beginPath(); ctx.moveTo(-20, y); ctx.bezierCurveTo(180, y - 45, 300, y + 50, 540, y - 15); ctx.stroke(); }
  } else if (kind === 'ivory' || kind === 'sage' || kind === 'white') {
    for (let i = 0; i < 8000; i++) { const v = random() * 512; ctx.fillStyle = `rgba(42,53,44,${random() * .045})`; ctx.fillRect(random() * 512, v, 1, 1); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

function assetMaterial(name) {
  if (!materialCache.has(name)) materialCache.set(name, new THREE.MeshStandardMaterial({ map: texture(name), color: 0xffffff, roughness: name === 'stone' ? .62 : .86, metalness: name === 'brass' ? .38 : 0, side: THREE.DoubleSide }));
  return materialCache.get(name);
}

function box(parent, x, y, z, sx, sy, sz, mat, roomId = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
  if (roomId) mesh.userData.roomId = roomId;
  parent.add(mesh); return mesh;
}

function addWall(x1, z1, x2, z2, options = {}) {
  const x = (x1 + x2) / 2, z = (z1 + z2) / 2;
  const horizontal = Math.abs(x2 - x1) > Math.abs(z2 - z1);
  const length = Math.hypot(x2 - x1, z2 - z1);
  const thickness = options.exterior ? .18 : .12;
  const height = options.exterior ? 2.78 : 2.55;
  const mesh = box(wallGroup, x, height / 2, z, horizontal ? length : thickness, height, horizontal ? thickness : length, wallMat);
  mesh.userData.wall = true;
  mesh.userData.mode = options.front ? 'front' : options.exterior ? 'exterior' : 'interior';
  mesh.userData.fullHeight = height;
  walls.push(mesh);
  const pad = thickness / 2;
  staticObstacles.push({ minX: Math.min(x1, x2) - pad, maxX: Math.max(x1, x2) + pad, minZ: Math.min(z1, z2) - pad, maxZ: Math.max(z1, z2) + pad });
  if (!options.front) mesh.userData.cap = box(wallGroup, x, height + .012, z, horizontal ? length : .085, .024, horizontal ? .085 : length, trimMat);
}

function addDoor(x, z, orientation, roomId) {
  const group = new THREE.Group(); group.position.set(x, 0, z);
  const width = .78;
  const leaf = box(group, orientation === 'x' ? width / 2 : 0, 1.04, orientation === 'x' ? 0 : width / 2, orientation === 'x' ? width : .06, 2.08, orientation === 'x' ? .06 : width, assetMaterial('oak_light'), roomId);
  const handle = box(group, orientation === 'x' ? .65 : .05, 1.02, orientation === 'x' ? .06 : .65, .05, .04, .05, assetMaterial('brass'), roomId);
  leaf.userData.door = handle.userData.door = group;
  group.userData.open = false; group.userData.orientation = orientation;
  doorGroup.add(group); doors.push(group);
}

function addWindow(x, z, width, orientation, roomId) {
  const g = new THREE.Group(); g.position.set(x, 1.55, z); windowGroup.add(g);
  const w = width, h = 1.22, depth = .045;
  box(g, 0, 0, 0, orientation === 'x' ? w : depth, h, orientation === 'x' ? depth : w, glassMat, roomId);
  const rail = orientation === 'x' ? (px, py, pz, sx, sy, sz) => box(g, px, py, pz, sx, sy, sz, windowMat) : (px, py, pz, sx, sy, sz) => box(g, pz, py, px, sz, sy, sx, windowMat);
  for (const yy of [-h / 2, h / 2]) rail(0, yy, 0, w + .1, .045, .07);
  for (const xx of [-w / 2, 0, w / 2]) rail(xx, 0, 0, .045, h, .07);
  rail(0, 0, 0, w, .025, .07);
}

function addFloor() {
  const base = box(scene, 0, -.19, 0, 10.36, .38, 7.66, new THREE.MeshStandardMaterial({ color: 0xf2eee5, roughness: .9 }));
  base.castShadow = false;
  const flooring = { living: '#cdb38d', kitchen: '#d9d2c2', entry: '#ded9ca', master: '#d2b992', flex: '#d3bd98' };
  for (const room of Object.values(ROOMS)) {
    const [a, b, c, d] = room.bounds;
    const floor = box(scene, (a + b) / 2, .015, (c + d) / 2, b - a - .03, .03, d - c - .03, new THREE.MeshStandardMaterial({ color: flooring[room.id], roughness: .96 }), room.id);
    floor.castShadow = false;
    const edge = new THREE.EdgesGeometry(floor.geometry);
    const outline = new THREE.LineSegments(edge, new THREE.LineBasicMaterial({ color: 0xb4a88e, transparent: true, opacity: .32 })); outline.position.copy(floor.position); scene.add(outline);
    if (room.id === 'living' || room.id === 'master' || room.id === 'flex') {
      for (let n = 1; n < Math.floor((b - a) / .21); n++) box(scene, a + n * .21, .037, (c + d) / 2, .004, .002, d - c - .03, new THREE.MeshBasicMaterial({ color: 0xb4986f, transparent: true, opacity: .14 }));
    }
  }
  const mat = new THREE.MeshStandardMaterial({ color: 0xecebe5, roughness: 1 });
  const ground = box(scene, 0, -.43, 0, 200, .04, 200, mat); ground.castShadow = false;
}

function buildArchitecture() {
  wallGroup = new THREE.Group(); windowGroup = new THREE.Group(); doorGroup = new THREE.Group();
  scene.add(wallGroup, windowGroup, doorGroup);
  addFloor();
  // The entrance is open; window frames sit against the exterior walls.
  addWall(-5, -3.65, -4.2, -3.65, { exterior: true }); addWall(-4.2, -3.65, -1.15, -3.65, { exterior: true }); addWall(-1.15, -3.65, 5, -3.65, { exterior: true });
  addWall(-5, -3.65, -5, 3.65, { exterior: true });
  addWall(-5, 3.65, -.75, 3.65, { exterior: true, front: true }); addWall(.05, 3.65, 5, 3.65, { exterior: true, front: true });
  addWall(5, -3.65, 5, 3.65, { exterior: true, front: true });
  addWall(-5, .2, -1.15, .2); addWall(-.25, .2, .9, .2);
  addWall(-2.1, .2, -2.1, 1.12); addWall(-2.1, 1.95, -2.1, 3.65);
  addWall(.9, -3.65, .9, -1.78); addWall(.9, -1.0, .9, 1.24); addWall(.9, 2.04, .9, 3.65);
  addWall(.9, -.1, 1.67, -.1); addWall(2.47, -.1, 5, -.1);
  addDoor(-.75, .2, 'x', 'living'); addDoor(-2.1, 1.12, 'z', 'kitchen'); addDoor(.9, -1.78, 'z', 'master'); addDoor(.9, 1.24, 'z', 'flex'); addDoor(1.67, -.1, 'x', 'flex');
  addWindow(-2.8, -3.56, 2.55, 'x', 'living'); addWindow(3.25, -3.56, 2.05, 'x', 'master');
  addWindow(4.93, 1.55, 1.65, 'z', 'flex'); addWindow(-4.93, 2.0, 1.35, 'z', 'kitchen');
  // Oak skirting ties the rooms together while keeping the plan readable.
  for (const room of Object.values(ROOMS)) {
    const [a, b, c] = room.bounds;
    box(wallGroup, (a + b) / 2, .085, c + .05, b - a, .14, .045, trimMat);
  }
}

function addPendant(x, z, roomId, radius = .23) {
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(radius * .73, radius, .23, 12), assetMaterial('ivory'));
  shade.position.set(x, 2.16, z); shade.castShadow = true; scene.add(shade); shade.userData.roomId = roomId;
  box(scene, x, 2.49, z, .015, .43, .015, darkMat);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.073, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf4e5b8, emissive: 0xffd89b, emissiveIntensity: 0 }));
  bulb.position.set(x, 2.025, z); scene.add(bulb); bulbs.push(bulb);
  const point = new THREE.PointLight(0xffd5a1, 0, 4.5, 2); point.position.set(x, 1.98, z); scene.add(point); pointLights.push(point);
}

const COMMON = [
  ['sofa', -3.65, -1.42, 0, 'living'], ['coffee_table', -2.62, -1.45, 0, 'living'], ['media_console', -.45, -1.55, Math.PI / 2, 'living'], ['floor_lamp', -4.45, -2.85, 0, 'living'], ['side_table', -3.95, -.43, 0, 'living'],
  ['kitchen_counter', -3.7, 3.05, 0, 'kitchen'], ['upper_cabinet', -3.7, 3.03, 0, 'kitchen', 1.4], ['dining_table', -3.5, 1.05, 0, 'kitchen'], ['dining_chair', -4.3, 1.05, Math.PI / 2, 'kitchen'], ['dining_chair', -2.7, 1.05, -Math.PI / 2, 'kitchen'],
  ['shoe_cabinet', -1.14, 3.35, 0, 'entry'], ['bench', .2, 2.8, Math.PI / 2, 'entry'], ['mirror', -1.85, 2.8, Math.PI / 2, 'entry'],
  ['bed_double', 3.15, -1.84, 0, 'master'], ['bedside', 1.72, -2.49, 0, 'master'], ['bedside', 4.52, -2.49, 0, 'master'], ['wardrobe', 3.75, -.48, 0, 'master'], ['table_lamp', 1.72, -2.49, 0, 'master', .55],
];

const LAYOUTS = {
  work: [ ['desk', 3.1, 2.91, 0, 'flex'], ['office_chair', 3.08, 2.08, Math.PI, 'flex'], ['bookcase', 4.63, 1.18, Math.PI / 2, 'flex'], ['reading_chair', 1.67, .65, -.5, 'flex'], ['side_table', 2.48, .62, 0, 'flex'], ['desk_lamp', 3.52, 2.87, 0, 'flex', .78] ],
  guest: [ ['sofa_bed', 3.1, 1.15, 0, 'flex'], ['round_table', 3.2, 2.37, 0, 'flex'], ['low_cabinet', 4.53, 2.7, Math.PI / 2, 'flex'], ['luggage_rack', 1.66, 2.75, 0, 'flex'], ['floor_lamp', 4.38, .56, 0, 'flex'], ['rug', 3.17, 1.7, 0, 'flex'] ],
  future: [ ['bed_single', 4.12, 1.0, 0, 'flex'], ['low_bookshelf', 1.66, 2.92, 0, 'flex'], ['kids_table', 2.62, 2.25, 0, 'flex'], ['kids_chair', 2.57, 1.63, Math.PI, 'flex'], ['toy_shelf', 4.53, 2.86, Math.PI / 2, 'flex'], ['round_rug', 2.95, 1.47, 0, 'flex'] ],
};

function disposeFurniture() {
  if (!furnitureGroup) return;
  scene.remove(furnitureGroup);
  // Clones share geometry with the asset cache; keep it alive for the next layout.
  furnitureGroup = null;
}

function instantiate(name, x, z, rotation, roomId, y = 0) {
  const source = assetCache.get(name);
  if (!source) return;
  const object = source.clone(true);
  object.position.set(x, y, z); object.rotation.y = rotation;
  object.userData.roomId = roomId; object.userData.asset = name;
  object.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.roomId = roomId; } });
  furnitureGroup.add(object);
  if (!['floor_lamp', 'table_lamp', 'desk_lamp', 'rug', 'round_rug', 'mirror', 'upper_cabinet'].includes(name)) {
    object.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(object);
    furnitureObstacles.push({ minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z });
  }
  return object;
}

function rebuildFurniture(kind) {
  disposeFurniture(); furnitureGroup = new THREE.Group(); scene.add(furnitureGroup); furnitureObstacles.length = 0;
  const entries = [...COMMON.map(v => [...v]), ...LAYOUTS[kind]];
  if (kind === 'guest') { entries.find(e => e[0] === 'sofa')[2] -= .16; entries.find(e => e[0] === 'coffee_table')[1] += .14; entries.find(e => e[0] === 'dining_table')[2] += .15; }
  if (kind === 'future') { entries.find(e => e[0] === 'sofa')[1] += .13; entries.find(e => e[0] === 'dining_table')[1] -= .12; entries.find(e => e[0] === 'bed_double')[2] -= .1; }
  for (const e of entries) instantiate(...e);
  if (!reducedMotion) { furnitureGroup.scale.setScalar(.001); furnitureGroup.userData.born = performance.now(); }
}

function setScenario(kind) {
  if (!SCENARIOS[kind]) return;
  scenario = kind; rebuildFurniture(kind);
  document.querySelectorAll('.scenario').forEach(btn => { const active = btn.dataset.scenario === kind; btn.classList.toggle('active', active); btn.setAttribute('aria-pressed', active); });
  if (selectedRoom === 'flex') showRoom('flex');
  $('#asset-status').textContent = `方案 ${SCENARIOS[kind].index} / 03 · 32 件本地家具模型`;
}

function showRoom(id) {
  const room = ROOMS[id]; if (!room) return;
  selectedRoom = id;
  $('#room-en').textContent = room.en;
  $('#room-name').textContent = room.name;
  $('#room-area').textContent = `${room.area}㎡`;
  $('#room-size').textContent = room.size;
  $('#room-items').replaceChildren(...(id === 'flex' ? SCENARIOS[scenario].items : room.items).map(item => { const li = document.createElement('li'); li.textContent = item; return li; }));
  $('#room-card').hidden = false;
}

function setView(next) {
  view = next;
  document.body.classList.toggle('walk-mode', next === 'walk');
  document.querySelectorAll('.view-btn').forEach(btn => { const active = btn.dataset.view === next; btn.classList.toggle('active', active); btn.setAttribute('aria-pressed', active); });
  $('#walk-hint').hidden = next !== 'walk'; $('#scene-hint').hidden = next === 'walk';
  if (next === 'walk') {
    controls.enabled = false; activeCamera = walkCamera;
    walkCamera.position.set(-4.1, 1.58, -2.8); walkCamera.userData.yaw = 1.04; walkCamera.userData.pitch = -.05; updateWalkLook();
  } else {
    activeCamera = overviewCamera; controls.enabled = true;
    overviewCamera.up.set(0, next === 'top' ? 0 : 1, next === 'top' ? -1 : 0);
    controls.target.set(.1, .15, next === 'top' ? .48 : 0); controls.minPolarAngle = next === 'top' ? 0 : .18; controls.maxPolarAngle = next === 'top' ? .01 : Math.PI * .47;
    if (next === 'top') overviewCamera.position.set(.1, 20, 0);
    else if (next === 'section') overviewCamera.position.set(12.8, 10.6, 13.8);
    else overviewCamera.position.set(12.9, 14.4, 15.8);
    overviewCamera.lookAt(controls.target); controls.update();
  }
  updateWalls();
}

function updateWalls() {
  for (const mesh of walls) {
    const full = mesh.userData.fullHeight;
    const mode = mesh.userData.mode;
    const height = view === 'walk' ? full : view === 'top' ? .12 : view === 'section' ? mode === 'front' ? .16 : 1.35 : mode === 'front' ? .21 : mode === 'exterior' ? 1.9 : 1.27;
    mesh.scale.y = height / full; mesh.position.y = height / 2;
    if (mesh.userData.cap) mesh.userData.cap.position.y = height + .012;
  }
  windowGroup.visible = view !== 'top' && view !== 'section';
  doorGroup.visible = view === 'walk' || view === 'dollhouse';
}

function updateWalkLook() {
  const yaw = walkCamera.userData.yaw, pitch = walkCamera.userData.pitch;
  walkCamera.lookAt(walkCamera.position.x + Math.sin(yaw) * Math.cos(pitch), walkCamera.position.y + Math.sin(pitch), walkCamera.position.z + Math.cos(yaw) * Math.cos(pitch));
}

function updateLighting(hour) {
  const state = lightAt(hour);
  document.body.classList.toggle('night-mode', state.lamps);
  const h = Number(hour), hh = Math.floor(h), mm = Math.round((h - hh) * 60).toString().padStart(2, '0');
  $('#time-output').textContent = `${hh}:${mm} ${state.label}`;
  sun.position.set((h - 13) * 1.8, 9.5, h < 13 ? -7 : 8);
  sun.intensity = state.sun * 1.55;
  sun.color.set(state.warmth > .7 ? 0xffdfad : 0xfff1d7);
  ambient.intensity = state.lamps ? .43 : .69;
  hemi.intensity = state.lamps ? .34 : .52;
  scene.background = new THREE.Color(state.lamps ? 0x444d4b : h < 11 ? 0xece9df : 0xf1f0e9);
  pointLights.forEach(l => l.intensity = state.lamps ? 3.4 : 0);
  bulbs.forEach(b => b.material.emissiveIntensity = state.lamps ? 3.2 : .05);
}

function resize() {
  const w = innerWidth, h = innerHeight, aspect = w / h;
  renderer.setSize(w, h, false); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const vertical = aspect < .8 ? Math.max(19, 12 / aspect) : aspect < 1.2 ? 17.4 : 16.8;
  overviewCamera.left = -vertical * aspect / 2; overviewCamera.right = vertical * aspect / 2;
  overviewCamera.top = vertical / 2; overviewCamera.bottom = -vertical / 2; overviewCamera.updateProjectionMatrix();
  walkCamera.aspect = aspect; walkCamera.updateProjectionMatrix();
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
      const door = object.userData.door; door.userData.open = !door.userData.open;
      door.rotation.y = door.userData.open ? (door.userData.orientation === 'x' ? -Math.PI * .52 : Math.PI * .52) : 0;
      return;
    }
    if (view !== 'walk' && object.userData.roomId) { showRoom(object.userData.roomId); return; }
  }
}

function updateWalk(delta) {
  if (view !== 'walk') return;
  const yaw = walkCamera.userData.yaw, speed = Math.min(delta, .04) * 2.25;
  let forward = 0, sideways = 0;
  if (keys.has('w') || keys.has('arrowup')) forward += 1;
  if (keys.has('s') || keys.has('arrowdown')) forward -= 1;
  if (keys.has('a') || keys.has('arrowleft')) sideways -= 1;
  if (keys.has('d') || keys.has('arrowright')) sideways += 1;
  if (!forward && !sideways) return;
  const norm = Math.hypot(forward, sideways);
  const dx = (Math.sin(yaw) * forward + Math.cos(yaw) * sideways) * speed / norm;
  const dz = (Math.cos(yaw) * forward - Math.sin(yaw) * sideways) * speed / norm;
  const p = walkCamera.position;
  const obstacles = [...staticObstacles, ...furnitureObstacles, ...doors.filter(d => !d.userData.open).map(d => ({ minX: d.position.x - .39, maxX: d.position.x + .39, minZ: d.position.z - .39, maxZ: d.position.z + .39 }))];
  if (canOccupy(p.x + dx, p.z, obstacles, .21)) p.x += dx;
  if (canOccupy(p.x, p.z + dz, obstacles, .21)) p.z += dz;
  updateWalkLook();
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const delta = frameDelta(previousFrameMs, now); previousFrameMs = now;
  if (introProgress < 1) { introProgress = Math.min(1, introProgress + delta / 3.3); wallGroup.scale.y = .01 + .99 * THREE.MathUtils.smoothstep(introProgress, .06, .7); windowGroup.scale.y = .01 + .99 * THREE.MathUtils.smoothstep(introProgress, .22, .86); if (furnitureGroup) furnitureGroup.scale.setScalar(.001 + .999 * THREE.MathUtils.smoothstep(introProgress, .47, 1)); }
  else { wallGroup.scale.y = 1; windowGroup.scale.y = 1; }
  if (furnitureGroup?.userData.born && introProgress >= 1) { const t = Math.min(1, (performance.now() - furnitureGroup.userData.born) / 430); furnitureGroup.scale.setScalar(.001 + .999 * (1 - (1 - t) ** 3)); if (t === 1) delete furnitureGroup.userData.born; }
  updateWalk(delta); if (view !== 'walk') controls.update(); renderer.render(scene, activeCamera);
}

async function loadFurniture() {
  const loader = new GLTFLoader();
  const names = [...new Set([...COMMON, ...Object.values(LAYOUTS).flat()].map(e => e[0]))];
  let completed = 0, failed = 0;
  await Promise.all(names.map(async name => {
    try {
      const gltf = await loader.loadAsync(`./assets/furniture/${name}.glb`);
      gltf.scene.traverse(o => { if (o.isMesh) o.material = assetMaterial(o.material.name); });
      assetCache.set(name, gltf.scene);
    } catch (error) { failed++; console.error(`家具载入失败：${name}`, error); }
    completed++; $('#loading-bar').style.width = `${Math.round(completed / names.length * 100)}%`; $('#loading-progress').textContent = `家具载入 ${completed} / ${names.length}`;
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
  canvas.addEventListener('pointerdown', e => { start = { x: e.clientX, y: e.clientY }; last = { x: e.clientX, y: e.clientY }; if (view === 'walk') canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (view !== 'walk' || !last) return; const dx = e.clientX - last.x, dy = e.clientY - last.y; walkCamera.userData.yaw -= dx * .004; walkCamera.userData.pitch = THREE.MathUtils.clamp(walkCamera.userData.pitch - dy * .003, -1.2, 1.2); last = { x: e.clientX, y: e.clientY }; updateWalkLook(); });
  canvas.addEventListener('pointerup', e => { if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 5) handlePick(e); start = last = null; });
  canvas.addEventListener('pointercancel', () => { start = last = null; });
  window.addEventListener('keydown', e => { if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()) && view === 'walk') e.preventDefault(); keys.add(e.key.toLowerCase()); if (e.key === 'Escape') { if (view === 'walk') setView('dollhouse'); else { $('#room-card').hidden = true; selectedRoom = null; } } });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('resize', resize);
}

async function init() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
    scene = new THREE.Scene(); scene.background = new THREE.Color(0xf1f0e9);
    overviewCamera = new THREE.OrthographicCamera(-8, 8, 5, -5, .1, 100);
    overviewCamera.position.set(12.9, 14.4, 15.8); overviewCamera.lookAt(.1, .35, 0);
    walkCamera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .04, 70);
    activeCamera = overviewCamera;
    controls = new OrbitControls(overviewCamera, canvas); controls.enableDamping = true; controls.dampingFactor = .08; controls.minDistance = 7; controls.maxDistance = 36; controls.maxPolarAngle = Math.PI * .47; controls.target.set(.1, .35, 0); controls.update();
    ambient = new THREE.AmbientLight(0xffffff, .86); scene.add(ambient);
    hemi = new THREE.HemisphereLight(0xe9f1e8, 0x998468, .65); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff1d7, 2); sun.position.set(4, 10, 7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -11; sun.shadow.camera.right = 11; sun.shadow.camera.top = 11; sun.shadow.camera.bottom = -11; sun.shadow.bias = -.0001; sun.shadow.radius = 4; scene.add(sun);
    buildArchitecture();
    addPendant(-2.55, -1.75, 'living', .3); addPendant(-3.55, 1.06, 'kitchen', .22); addPendant(-.5, 1.6, 'entry', .18); addPendant(3.15, -2.2, 'master', .23); addPendant(3.06, 1.47, 'flex', .24);
    bindUI(); resize(); setView('dollhouse'); updateLighting($('#time-slider').value);
    await loadFurniture(); setScenario('work');
    $('#loading').classList.add('done'); animate();
  } catch (error) { console.error(error); $('#loading').classList.add('done'); $('#error').hidden = false; }
}

init();
