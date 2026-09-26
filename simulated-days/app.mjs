import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ACTIONS, CATALOG, loadState, saveState, performAction, purchaseFurniture, moveFurniture } from './game.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let stateStore;
try { stateStore = window.localStorage; }
catch { stateStore = { getItem: () => null, setItem: () => { throw new Error('storage unavailable'); } }; }
let state = loadState(stateStore);
let mode = 'life';
let selectedInteraction = null;
let selectedFurniture = null;
let selectedNeighbor = 'nora';
let scene, camera, renderer, controls, roomGroup, movableGroup, miri, floor;
let wallBack, wallLeft;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const markers = [];
const interactiveModels = new Map();
const characterTarget = new THREE.Vector3(-0.2, 0, 0.2);
const colors = {
  cream: 0xf8f1e4, oak: 0xc99d70, oakLight: 0xdfba91, oakDark: 0x946f59,
  lavender: 0xcbb8d5, lavenderDeep: 0x9d83b1, sage: 0x9eb4a0,
  pink: 0xdfafa4, blue: 0xaac9cf, ink: 0x514a56, gold: 0xd7b874,
  white: 0xfffdf7, tile: 0xe8ddd5,
};
const materials = Object.fromEntries(Object.entries(colors).map(([key, color]) => [key, new THREE.MeshStandardMaterial({ color, roughness: .82 })]));
const glass = new THREE.MeshPhysicalMaterial({ color: 0xd3e6e8, transparent: true, opacity: .35, roughness: .15, metalness: .03, depthWrite: false, side: THREE.DoubleSide });

const needsMeta = [
  ['hunger', '饥饿', '#e3ab79'], ['energy', '精力', '#a991c5'], ['fun', '娱乐', '#d6a0ad'],
  ['social', '社交', '#8eaeb6'], ['hygiene', '卫生', '#a5b79a'],
];
const goalsMeta = [
  ['cook', '为自己做一餐', 6], ['paint', '画下今天的街角', 18], ['chat', '和邻居聊聊天', 12],
];
const people = {
  nora: { name: 'Nora', place: '街角花店', color: '#b893a9', initial: 'N', description: '热爱植物的花店主。' },
  jun: { name: 'Jun', place: '旧书屋', color: '#8a9db1', initial: 'J', description: '总会推荐合适的书。' },
  ellis: { name: 'Ellis', place: '小咖啡馆', color: '#b9a17d', initial: 'E', description: '记得每位客人的喜好。' },
};
const interactionMeta = {
  stove: { name: '橡木小厨房', hint: '冰箱里还有新鲜食材。', actions: ['cook'], point: [-4.1, 2.2, -3.3], character: [-3.2, 0, -2.2] },
  desk: { name: '窗边画桌', hint: '太阳刚好照在画纸上。', actions: ['paint'], point: [2.15, 2.15, -3.2], character: [1.4, 0, -2.4] },
  bed: { name: '柔软的小床', hint: '累的时候，就安心睡一会儿。', actions: ['rest'], point: [3.9, 1.6, 1.8], character: [2.7, 0, 1.4] },
  shower: { name: '暖光浴室', hint: '让热水带走一天的疲惫。', actions: ['shower'], point: [-4.65, 2.35, 2.7], character: [-3.7, 0, 2.4] },
  bookshelf: { name: '收集的旧书', hint: '每一本都藏着另一种生活。', actions: ['read'], point: [4.8, 2.25, -3.2], character: [3.7, 0, -2.3] },
  tea: { name: '客厅茶桌', hint: '给自己留一点空白时间。', actions: ['tea'], point: [-1.1, 1.1, 1.4], character: [-.4, 0, 2.2] },
};

function addBox(parent, material, w, h, d, x = 0, y = 0, z = 0, cast = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z); mesh.castShadow = cast; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function addCylinder(parent, material, top, bottom, height, x = 0, y = 0, z = 0, segments = 20) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, segments), material);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function addSphere(parent, material, r, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), material);
  mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
}
function group(parent, x = 0, y = 0, z = 0) {
  const result = new THREE.Group(); result.position.set(x, y, z); parent.add(result); return result;
}
function registerModel(id, model) { model.userData.interaction = id; interactiveModels.set(id, model); return model; }
function addLegs(parent, xHalf, zHalf, topY, height, material = materials.oakDark) {
  for (const x of [-xHalf, xHalf]) for (const z of [-zHalf, zHalf]) addBox(parent, material, .13, height, .13, x, topY - height / 2, z);
}

function buildRoom() {
  roomGroup = group(scene);
  addBox(roomGroup, materials.oakDark, 12.5, .25, 10.5, 0, -.23, 0);
  addBox(roomGroup, materials.cream, 12.2, .11, 10.2, 0, -.045, 0);
  const boardColors = [materials.oakLight, new THREE.MeshStandardMaterial({ color: 0xdcb58c, roughness: .88 }), new THREE.MeshStandardMaterial({ color: 0xe3bd97, roughness: .88 })];
  for (let i = 0; i < 19; i++) addBox(roomGroup, boardColors[i % 3], 12.02, .025, .52, 0, .021, -4.75 + i * .52, false);
  floor = addBox(roomGroup, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }), 12, .02, 10, 0, .06, 0, false);
  floor.userData.ground = true;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xeee6ee, roughness: .95, side: THREE.DoubleSide });
  const sideMat = new THREE.MeshStandardMaterial({ color: 0xe9dded, roughness: .95, side: THREE.DoubleSide });
  wallBack = group(roomGroup);
  // Back wall with a genuine opening for the sunny window.
  addBox(wallBack, wallMat, 3.7, 3.5, .17, -4.15, 1.75, -5.02);
  addBox(wallBack, wallMat, 4.8, 3.5, .17, 3.6, 1.75, -5.02);
  addBox(wallBack, wallMat, 3.5, .98, .17, -.05, .49, -5.02);
  addBox(wallBack, wallMat, 3.5, .46, .17, -.05, 3.27, -5.02);
  wallLeft = group(roomGroup);
  addBox(wallLeft, sideMat, .17, 3.5, 10.25, -6.06, 1.75, 0);
  addBox(roomGroup, materials.white, 12.14, .13, .21, 0, .12, -4.89);
  addBox(roomGroup, materials.white, .2, .13, 10, -5.93, .12, 0);
  // Window frame, sill and simple original street scenery outside.
  const windowGroup = group(roomGroup, -.05, 0, -4.96);
  addBox(windowGroup, materials.white, 3.7, .13, .28, 0, 1.06, 0);
  addBox(windowGroup, materials.white, 3.7, .13, .28, 0, 3.04, 0);
  addBox(windowGroup, materials.white, .13, 2.0, .28, -1.82, 2.06, 0);
  addBox(windowGroup, materials.white, .13, 2.0, .28, 1.82, 2.06, 0);
  addBox(windowGroup, materials.white, .1, 2.0, .2, 0, 2.06, .08);
  addBox(windowGroup, materials.white, 3.65, .09, .2, 0, 2.1, .08);
  addBox(windowGroup, glass, 3.48, 1.82, .025, 0, 2.07, -.06, false);
  addBox(windowGroup, materials.oakLight, 3.85, .13, .46, 0, 1.02, .2);
  const outside = group(roomGroup, 0, 0, -6.6);
  addBox(outside, new THREE.MeshStandardMaterial({ color: 0xbab5ce }), 1.2, 4, 1, -1.25, 1.5, -.4);
  addBox(outside, new THREE.MeshStandardMaterial({ color: 0xd8bdd0 }), 1.35, 4.6, .8, .9, 1.8, -.8);
  for (const x of [-1.5, -.95, .65, 1.2]) for (const y of [1.6, 2.2, 2.8]) addBox(outside, materials.cream, .18, .28, .02, x, y, -.27, false);
  addCylinder(outside, materials.oakDark, .11, .14, 2.5, -2.7, 1.1, -.1);
  addSphere(outside, materials.sage, .7, -2.7, 2.5, -.1);
  addSphere(outside, materials.sage, .6, -3.2, 2.2, -.1);
  // Kitchen.
  const kitchen = registerModel('stove', group(roomGroup, -4.2, 0, -3.53));
  addBox(kitchen, materials.oakLight, 3.05, .85, 1.18, 0, .45, 0);
  addBox(kitchen, materials.white, 3.12, .1, 1.24, 0, .93, 0);
  addBox(kitchen, materials.oakDark, .03, .62, .04, -.45, .43, .61);
  addBox(kitchen, materials.oakDark, .03, .62, .04, .52, .43, .61);
  addCylinder(kitchen, materials.ink, .31, .31, .025, -.65, 1.00, -.08);
  addCylinder(kitchen, materials.ink, .25, .25, .025, .16, 1.00, -.08);
  addCylinder(kitchen, materials.gold, .38, .34, .22, -.65, 1.16, -.08);
  addCylinder(kitchen, materials.oakDark, .15, .15, .08, -.65, 1.29, -.08);
  addBox(kitchen, materials.cream, .25, .5, .23, 1.05, 1.25, -.28);
  addSphere(kitchen, materials.sage, .25, 1.05, 1.6, -.28);
  addBox(roomGroup, materials.cream, 1.15, 2.52, 1.03, -5.22, 1.27, -3.72);
  addBox(roomGroup, materials.white, 1.2, .05, 1.09, -5.22, 2.54, -3.72);
  addBox(roomGroup, materials.oakDark, .14, .04, .04, -4.72, 1.93, -3.18);
  // Painting corner.
  const desk = registerModel('desk', group(roomGroup, 2.2, 0, -3.4));
  addBox(desk, materials.oak, 2.55, .15, 1.14, 0, 1.25, 0);
  addLegs(desk, 1.12, .42, 1.2, 1.15);
  addBox(desk, materials.cream, .92, .025, .64, -.35, 1.35, -.1);
  addBox(desk, materials.lavenderDeep, .7, .025, .05, -.35, 1.37, .22);
  addCylinder(desk, materials.pink, .12, .15, .2, .8, 1.42, .12);
  addBox(desk, materials.cream, .06, .6, .06, .8, 1.79, .12);
  addSphere(desk, materials.gold, .16, .8, 2.11, .12);
  addBox(desk, materials.oakDark, .93, .1, .84, -.45, .47, 1.08);
  addLegs(desk, .34, .31, .45, .43);
  addBox(desk, materials.sage, .98, .14, .83, -.45, .58, 1.08);
  addBox(desk, materials.oakDark, .95, .92, .13, -.45, 1.0, 1.46);
  // Bookshelf.
  const books = registerModel('bookshelf', group(roomGroup, 4.9, 0, -3.55));
  addBox(books, materials.oak, 1.18, 2.48, .67, 0, 1.24, 0);
  addBox(books, materials.cream, .95, 2.13, .05, 0, 1.25, .36);
  for (const y of [.46, 1.04, 1.62, 2.19]) addBox(books, materials.oakDark, 1.04, .09, .75, 0, y, .05);
  for (let i = 0; i < 11; i++) addBox(books, [materials.lavenderDeep, materials.sage, materials.pink, materials.cream][i % 4], .12 + i % 3 * .03, .34 + i % 4 * .04, .44, -.42 + i * .078, .73 + (i % 2) * .59, .13);
  // Bathroom with translucent screen.
  const shower = registerModel('shower', group(roomGroup, -4.83, 0, 2.38));
  addBox(shower, materials.tile, 1.88, .14, 2.15, 0, .05, 0);
  addBox(shower, glass, .055, 2.38, 2.02, .88, 1.28, .05, false);
  addBox(shower, materials.white, .07, 2.44, .08, .88, 1.27, -1);
  addBox(shower, materials.white, .07, 2.44, .08, .88, 1.27, 1);
  addCylinder(shower, materials.gold, .13, .13, 1.55, -.42, 1.3, -.71);
  addSphere(shower, materials.gold, .29, -.42, 2.1, -.71);
  addBox(shower, materials.cream, .7, .68, .52, -.34, .43, .75);
  // Bed and cushions.
  const bed = registerModel('bed', group(roomGroup, 3.65, 0, 1.65));
  addBox(bed, materials.oak, 3.1, .36, 3.1, 0, .33, 0);
  addBox(bed, materials.oakDark, 3.18, 1.15, .18, 0, .81, -1.47);
  addBox(bed, materials.cream, 2.84, .3, 2.82, 0, .65, .01);
  addBox(bed, materials.lavender, 2.72, .16, 1.95, 0, .85, .42);
  for (const x of [-.72, .72]) addBox(bed, materials.white, 1.12, .21, .6, x, .91, -1.02);
  addBox(bed, materials.pink, 1.48, .08, .65, 0, .97, .98);
  // Sofa and low table.
  const sofa = group(roomGroup, -2.05, 0, 1.4);
  addBox(sofa, materials.oakDark, 2.5, .18, 1.15, 0, .28, 0);
  addBox(sofa, materials.sage, 2.55, .55, 1.15, 0, .7, 0);
  addBox(sofa, materials.sage, 2.6, 1.08, .25, 0, 1.09, -.52);
  addBox(sofa, materials.sage, .27, .82, 1.2, -1.18, .86, 0);
  addBox(sofa, materials.sage, .27, .82, 1.2, 1.18, .86, 0);
  addBox(sofa, materials.pink, .63, .23, .45, -.69, 1.04, -.18);
  const table = registerModel('tea', group(roomGroup, -.78, 0, 2.55));
  addCylinder(table, materials.oak, .71, .71, .12, 0, .74, 0, 30);
  addCylinder(table, materials.oakDark, .09, .12, .62, 0, .39, 0);
  addCylinder(table, materials.oakDark, .48, .48, .07, 0, .07, 0);
  addCylinder(table, materials.white, .22, .19, .16, .2, .88, 0);
  addBox(table, materials.white, .23, .035, .3, -.27, .84, .14);
  // Framed sketches and hanging lights.
  addBox(roomGroup, materials.oakDark, .95, 1.15, .08, 4.55, 2.48, -4.82);
  addBox(roomGroup, materials.cream, .81, 1.01, .09, 4.55, 2.48, -4.76);
  addBox(roomGroup, materials.pink, .3, .44, .04, 4.55, 2.45, -4.69);
  addSphere(roomGroup, materials.gold, .27, 4.55, 2.72, -4.66);
  for (const x of [-2.15, .72]) {
    addBox(roomGroup, materials.ink, .025, .48, .025, x, 3.35, -1);
    addCylinder(roomGroup, materials.cream, .37, .19, .4, x, 3.05, -1);
    addSphere(roomGroup, new THREE.MeshStandardMaterial({ color: 0xffe2aa, emissive: 0xf1bd73, emissiveIntensity: .5 }), .09, x, 2.79, -1);
  }
  createMiri();
}

function createMiri() {
  miri = group(roomGroup, -.2, 0, .2);
  const skin = new THREE.MeshStandardMaterial({ color: 0xeabb9e, roughness: .85 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x443645, roughness: .9 });
  addCylinder(miri, materials.oakDark, .19, .15, .65, -.15, .34, 0);
  addCylinder(miri, materials.oakDark, .19, .15, .65, .15, .34, 0);
  addCylinder(miri, materials.pink, .38, .33, .73, 0, 1.02, 0);
  addSphere(miri, skin, .34, 0, 1.66, 0);
  addSphere(miri, hair, .36, 0, 1.86, -.05);
  addBox(miri, hair, .72, .29, .28, 0, 1.78, -.19);
  addSphere(miri, hair, .17, -.31, 1.56, -.12);
  addSphere(miri, hair, .17, .31, 1.56, -.12);
  addCylinder(miri, skin, .105, .095, .55, -.44, 1.09, 0).rotation.z = -.2;
  addCylinder(miri, skin, .105, .095, .55, .44, 1.09, 0).rotation.z = .2;
  addSphere(miri, materials.ink, .026, -.12, 1.65, .3);
  addSphere(miri, materials.ink, .026, .12, 1.65, .3);
  addSphere(miri, materials.pink, .045, 0, 1.5, .32);
}

function worldFromCell(x, z) { return [-4.75 + x * 2.28, -3.65 + z * 1.83]; }
function cellFromWorld(x, z) { return [Math.max(0, Math.min(4, Math.round((x + 4.75) / 2.28))), Math.max(0, Math.min(4, Math.round((z + 3.65) / 1.83)))]; }

function createFurniture(id, parent) {
  const piece = group(parent);
  piece.userData.furniture = id;
  if (id === 'rug') {
    addCylinder(piece, materials.lavender, 1.04, 1.04, .045, 0, .085, 0, 40);
    addCylinder(piece, materials.cream, .76, .76, .05, 0, .09, 0, 40);
  } else if (id === 'plant') {
    addCylinder(piece, materials.pink, .31, .23, .47, 0, .27, 0);
    addCylinder(piece, materials.oakDark, .08, .08, .9, 0, .84, 0);
    for (const [x, y, z, radius] of [[-.25,1.1,0,.27],[.28,1.25,.08,.3],[-.12,1.5,-.09,.26],[.12,1.67,.02,.2]]) addSphere(piece, materials.sage, radius, x, y, z);
  } else if (id === 'lamp') {
    addCylinder(piece, materials.oakDark, .37, .37, .09, 0, .08, 0);
    addCylinder(piece, materials.gold, .045, .045, 1.62, 0, .9, 0);
    addCylinder(piece, materials.cream, .37, .22, .51, 0, 1.95, 0);
    addSphere(piece, materials.gold, .13, 0, 1.63, 0);
  } else if (id === 'armchair') {
    addBox(piece, materials.oakDark, 1.1, .15, 1.1, 0, .27, 0);
    addBox(piece, materials.cream, 1.18, .53, 1.13, 0, .64, 0);
    addBox(piece, materials.cream, 1.16, .9, .21, 0, 1.08, -.48);
    for (const x of [-.5, .5]) addBox(piece, materials.cream, .17, .7, 1.11, x, .85, 0);
    addBox(piece, materials.pink, .54, .2, .45, 0, .95, -.13);
  } else if (id === 'shelf') {
    addBox(piece, materials.oak, 1.55, 1.12, .58, 0, .59, 0);
    for (const y of [.13, .56, 1.03]) addBox(piece, materials.oakDark, 1.55, .07, .66, 0, y, 0);
    for (let i = 0; i < 8; i++) addBox(piece, [materials.cream, materials.sage, materials.pink][i % 3], .13, .24 + (i % 2) * .1, .37, -.57 + i * .16, .35, .06);
  } else if (id === 'stool') {
    addCylinder(piece, materials.oak, .42, .42, .12, 0, .58, 0);
    for (const x of [-.24,.24]) for (const z of [-.24,.24]) addBox(piece, materials.oakDark, .1, .52, .1, x, .27, z);
  }
  return piece;
}
function updateMovableFurniture() {
  if (movableGroup) roomGroup.remove(movableGroup);
  movableGroup = group(roomGroup);
  for (const [id, cell] of Object.entries(state.furniture)) {
    const piece = createFurniture(id, movableGroup);
    const [x, z] = worldFromCell(cell.x, cell.z); piece.position.set(x, 0, z);
  }
}

function initScene() {
  const canvas = $('#room-canvas');
  scene = new THREE.Scene();
  scene.background = null;
  camera = new THREE.OrthographicCamera(-8, 8, 7, -7, .1, 100);
  camera.position.set(13, 11, 15);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.75;
  const ambient = new THREE.HemisphereLight(0xfff4df, 0xbaa8c6, 2.5); scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffe6b4, 3.2); sun.position.set(-4, 10, 7); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -12; sun.shadow.camera.right = 12; sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12; sun.shadow.bias = -.0003;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xd8d5f3, 1.1); fill.position.set(7, 5, -6); scene.add(fill);
  controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1.1, 0); controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = .08;
  controls.minPolarAngle = .54; controls.maxPolarAngle = 1.25; controls.minZoom = .64; controls.maxZoom = 1.75;
  controls.update();
  buildRoom(); updateMovableFurniture(); createHotspots();
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const aspect = rect.width / Math.max(1, rect.height);
    const halfHeight = aspect < .9 ? 9.4 : 7.6;
    camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect; camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.updateProjectionMatrix(); renderer.setSize(rect.width, rect.height, false);
  };
  new ResizeObserver(resize).observe(canvas); resize();
  let down = null;
  canvas.addEventListener('pointerdown', event => { down = { x: event.clientX, y: event.clientY }; });
  canvas.addEventListener('pointerup', event => {
    if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(roomGroup.children, true);
    for (const hit of hits) {
      let object = hit.object;
      while (object && object !== roomGroup) {
        if (mode === 'build' && object.userData.furniture) { selectFurniture(object.userData.furniture); return; }
        if (mode === 'life' && object.userData.interaction) { selectInteraction(object.userData.interaction); return; }
        if (object.userData.ground && mode === 'build' && selectedFurniture) {
          const [x, z] = cellFromWorld(hit.point.x, hit.point.z);
          applyMove(selectedFurniture, x, z); return;
        }
        object = object.parent;
      }
    }
  });
  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    miri.position.lerp(characterTarget, .045);
    miri.rotation.y = Math.sin(performance.now() / 750) * .04;
    if (wallBack) wallBack.visible = camera.position.z > -1.5;
    if (wallLeft) wallLeft.visible = camera.position.x > -2.5;
    if (mode !== 'community') renderer.render(scene, camera);
    positionHotspots();
  };
  animate();
}

function createHotspots() {
  const container = $('#hotspots'); container.innerHTML = '';
  for (const [id, meta] of Object.entries(interactionMeta)) {
    const button = document.createElement('button');
    button.className = 'hotspot'; button.type = 'button';
    button.innerHTML = `<span class="hotspot-dot">+</span>${meta.name}`;
    button.setAttribute('aria-label', `查看${meta.name}互动`);
    button.addEventListener('click', () => selectInteraction(id));
    container.append(button); markers.push({ button, point: new THREE.Vector3(...meta.point) });
  }
}
function positionHotspots() {
  if (mode !== 'life' || !camera) return;
  const rect = $('#room-canvas').getBoundingClientRect();
  for (const marker of markers) {
    const screen = marker.point.clone().project(camera);
    marker.button.style.left = `${(screen.x + 1) / 2 * rect.width}px`;
    marker.button.style.top = `${(-screen.y + 1) / 2 * rect.height}px`;
    marker.button.style.display = screen.z > 1 || screen.x < -1 || screen.x > 1 || screen.y < -1 || screen.y > 1 ? 'none' : '';
  }
}

function render() {
  const hour = Math.floor(state.minute / 60), minute = state.minute % 60;
  $('#day-label').textContent = `第 ${state.day} 天 · 晴`;
  $('#time-label').textContent = `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')} ${hour < 12 ? '上午' : hour < 18 ? '下午' : '夜晚'}`;
  $('#money-label').textContent = state.money.toLocaleString('zh-CN');
  $('#goals-list').innerHTML = goalsMeta.map(([id, name, reward]) => `<div class="goal-item ${state.goals[id] ? 'done' : ''}"><span class="goal-check">${state.goals[id] ? '<svg><use href="#i-check"/></svg>' : ''}</span><span class="goal-text">${name}</span><span class="goal-reward">+${reward}</span></div>`).join('');
  $('#goals-progress').textContent = `${Object.values(state.goals).filter(Boolean).length} / 3 已完成`;
  $('#journal-list').innerHTML = state.log.slice(0, 4).map(item => `<li>${escapeHtml(item)}</li>`).join('');
  $('#needs-list').innerHTML = needsMeta.map(([id, name, color]) => `<div class="need-row ${state.needs[id] < 25 ? 'low' : ''}"><span class="need-name">${name}</span><div class="need-bar"><span style="width:${state.needs[id]}%;--bar:${color}"></span></div><span class="need-number">${state.needs[id]}</span></div>`).join('');
  const average = Object.values(state.needs).reduce((a,b) => a+b,0) / 5;
  $('#mood-label').textContent = average >= 70 ? '状态很好' : average >= 45 ? '心情不错' : '需要照顾';
  $('#skills-list').innerHTML = [['cooking','烹饪','◌',''],['creativity','创作','✳','purple']].map(([id,name,icon,style]) => `<div class="skill-row"><span class="skill-icon ${style}">${icon}</span><div class="skill-details"><div><span>${name}</span><small>Lv.${state.skills[id].level} · ${state.skills[id].xp}/100</small></div><div class="skill-bar"><span style="width:${state.skills[id].xp}%"></span></div></div></div>`).join('');
  renderShop(); renderNeighbors();
}
function renderShop() {
  const icons = { lamp: '♧', armchair: '▤', shelf: '▥', stool: '◯' };
  $('#shop-list').innerHTML = Object.entries(CATALOG).map(([id, item]) => `<div class="shop-item"><span class="shop-icon" aria-hidden="true">${icons[id]}</span><span class="shop-details"><strong>${item.name}</strong><small>${item.price} 暖光币</small></span><button type="button" data-buy="${id}" ${state.furniture[id] ? 'disabled' : ''}>${state.furniture[id] ? '已拥有' : '购买'}</button></div>`).join('');
  $$('[data-buy]').forEach(button => button.addEventListener('click', () => {
    const result = purchaseFurniture(state, button.dataset.buy); applyResult(result);
    if (result.ok) { updateMovableFurniture(); selectFurniture(button.dataset.buy); }
  }));
}
function renderNeighbors() {
  $('#neighbor-list').innerHTML = Object.entries(people).map(([id, person]) => `<div class="neighbor-item"><div class="neighbor-top"><span class="neighbor-avatar" style="--neighbor-color:${person.color}">${person.initial}</span><span class="neighbor-details"><strong>${person.name}</strong><small>${person.place}</small></span><button type="button" data-chat="${id}">聊天</button></div><div class="relation-line"><svg><use href="#i-heart"/></svg><div class="relation-bar"><span style="width:${state.relationships[id]}%;--bar:${person.color}"></span></div><span>${state.relationships[id]}/100</span></div></div>`).join('');
  $$('[data-chat]').forEach(button => button.addEventListener('click', () => { selectedNeighbor = button.dataset.chat; takeAction('chat', selectedNeighbor); updateSelectedNeighbor(); }));
}
function updateSelectedNeighbor() {
  $$('.map-pin').forEach(button => button.classList.toggle('active', button.dataset.neighbor === selectedNeighbor));
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]); }
function persist() {
  const saved = saveState(stateStore, state);
  $('#save-indicator').classList.toggle('failed', !saved);
  $('#save-indicator span').textContent = saved ? '已自动保存到此设备' : '当前设备无法保存进度';
  $('#global-save').textContent = saved ? '已自动保存到此设备 · 原创紫蓝巷' : '当前设备无法保存进度 · 原创紫蓝巷';
}
let toastTimer;
function toast(message) {
  const node = $('#toast'); node.textContent = message; node.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('show'), 3300);
}
function applyResult(result) {
  if (result.ok) { state = result.state; render(); persist(); }
  toast(result.message);
}
function takeAction(id, neighbor) {
  const result = performAction(state, id, neighbor);
  applyResult(result);
  if (result.ok) {
    const target = interactionMeta[selectedInteraction]?.character;
    if (target) characterTarget.set(...target);
    if (mode === 'life') $('#interaction-card').hidden = true;
  }
}
function selectInteraction(id) {
  if (mode !== 'life') return;
  selectedInteraction = id;
  $$('.hotspot').forEach(button => button.classList.toggle('active', button.getAttribute('aria-label') === `查看${interactionMeta[id].name}互动`));
  const meta = interactionMeta[id];
  const card = $('#interaction-card');
  card.innerHTML = `<button class="close-card" type="button" aria-label="关闭互动菜单">×</button><span class="card-kicker">LITTLE MOMENT / 互动</span><h3>${meta.name}</h3><p>${meta.hint}</p><div class="action-buttons">${meta.actions.map(action => `<button type="button" data-action="${action}">${ACTIONS[action].name}</button>`).join('')}</div>`;
  card.hidden = false;
  card.querySelector('.close-card').addEventListener('click', () => { card.hidden = true; selectedInteraction = null; $$('.hotspot').forEach(button => button.classList.remove('active')); });
  card.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => takeAction(button.dataset.action)));
}
function selectFurniture(id) {
  if (mode !== 'build') return;
  selectedFurniture = id;
  const name = CATALOG[id]?.name || (id === 'plant' ? '窗边绿植' : '圆形地毯');
  const card = $('#placement-card');
  card.innerHTML = `<button class="close-card" type="button" aria-label="关闭摆放菜单">×</button><span class="card-kicker">BUILD / 摆放家具</span><h3>${name}</h3><p>已选中。点击房间地板上的新位置，家具就会移过去。</p><button class="place-action" type="button">换个位置试试</button>`;
  card.hidden = false;
  card.querySelector('.close-card').addEventListener('click', () => { card.hidden = true; selectedFurniture = null; });
  card.querySelector('.place-action').addEventListener('click', () => toast('现在点击地板，就能摆放这件家具。'));
}
function applyMove(id, x, z) { const result = moveFurniture(state, id, x, z); applyResult(result); if (result.ok) updateMovableFurniture(); }
function setMode(next) {
  mode = next;
  $$('.mode-tab').forEach(button => { const active = button.dataset.mode === next; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  $('#room-view').hidden = next === 'community'; $('#community-view').hidden = next !== 'community';
  $('#hotspots').hidden = next !== 'life';
  for (const key of ['life','build','community']) $(`#${key}-panel`).hidden = key !== next;
  $('#interaction-card').hidden = true; $('#placement-card').hidden = true;
  selectedInteraction = null; selectedFurniture = null;
  $('#room-message').textContent = next === 'build' ? '点击已拥有的家具，再点击地板重新摆放。拖动旋转，滚轮缩放。' : '拖动旋转房间，滚轮缩放。点击家具，与 Miri 一起生活。';
  if (next !== 'community') setTimeout(() => window.dispatchEvent(new Event('resize')), 40);
}

$$('.mode-tab').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
$$('.map-pin').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.neighbor === 'home') { setMode('life'); return; }
  selectedNeighbor = button.dataset.neighbor; updateSelectedNeighbor();
  const person = people[selectedNeighbor]; toast(`${person.name} · ${person.description} 点击右侧“聊天”打招呼。`);
}));
$('#rotate-left').addEventListener('click', () => { controls.rotateLeft(Math.PI / 6); controls.update(); });
$('#rotate-right').addEventListener('click', () => { controls.rotateLeft(-Math.PI / 6); controls.update(); });
$('#reset-view').addEventListener('click', () => { camera.position.set(13, 11, 15); controls.target.set(0, 1.1, 0); camera.zoom = 1; camera.updateProjectionMatrix(); controls.update(); });
$('#zoom-in').addEventListener('click', () => { camera.zoom = Math.min(1.75, camera.zoom + .15); camera.updateProjectionMatrix(); });
$('#zoom-out').addEventListener('click', () => { camera.zoom = Math.max(.64, camera.zoom - .15); camera.updateProjectionMatrix(); });

try { initScene(); render(); persist(); updateSelectedNeighbor(); }
catch (error) { console.error(error); $('#error').hidden = false; }
