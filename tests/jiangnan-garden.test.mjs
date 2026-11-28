import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createContext, runInContext } from 'node:vm';

const html = readFileSync(new URL('../jiangnan-garden/index.html', import.meta.url), 'utf8');
const [three, app] = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(([, code]) => code);

class Element extends EventTarget {
  clientWidth = 1440;
  clientHeight = 900;
  style = {};
  classList = { toggle() {} };
  attributes = new Map();

  constructor(dataset = {}) {
    super();
    this.dataset = dataset;
  }
  appendChild() {}
  setPointerCapture() {}
  setAttribute(name, value) { this.attributes.set(name, value); }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight };
  }
  emit(type, props) { this.dispatchEvent(Object.assign(new Event(type), props)); }
}

function garden(reducedMotion = false, random = Math.random) {
  const host = new Element();
  const buttons = Object.fromEntries(['time', 'action'].map(key => [
    key, [...html.matchAll(new RegExp(`<button[^>]*data-${key}="([^"]+)"[^>]*>`, 'g'))]
      .map(([, value]) => new Element({ [key]: value })),
  ]));
  let scene, camera, nextFrame, time = 0;
  const context = createContext({
    document: {
      getElementById: () => host,
      querySelector: () => null,
      querySelectorAll: selector => buttons[selector.slice(6, -1)] ?? [],
    },
    console: { warn() {} },
    devicePixelRatio: 1,
    matchMedia: () => ({ matches: reducedMotion }),
    performance: { now: () => time },
    ResizeObserver: class { observe() {} },
    requestAnimationFrame: callback => { nextFrame = callback; },
  });
  runInContext(three, context);
  const THREE = context.THREE;
  // Keep the real Three.js objects and raycaster. The GPU and DOM are supplied by the browser smoke check.
  THREE.WebGLRenderer = class {
    domElement = new Element();
    shadowMap = {};
    setPixelRatio() {}
    setClearColor() {}
    setSize() {}
    render(nextScene, nextCamera) {
      scene = nextScene;
      camera = nextCamera;
      scene.updateMatrixWorld();
      camera.updateMatrixWorld();
    }
  };
  runInContext(app, context);
  runInContext('Math', context).random = random;
  function advance(ms) {
    const end = time + ms;
    while (time < end) {
      time = Math.min(end, time + 16);
      nextFrame(time);
    }
  }
  advance(16);
  function button(group, value) {
    const control = buttons[group].find(button => button.dataset[group] === value);
    assert.ok(control, `找不到 ${value} 按钮`);
    control.emit('click');
    return control;
  }
  function screen([x, y, z]) {
    const point = new THREE.Vector3(x, y, z).project(camera);
    return {
      clientX: (point.x + 1) * host.clientWidth / 2,
      clientY: (1 - point.y) * host.clientHeight / 2,
    };
  }
  function pointer(type, point, options = {}) {
    host.emit(type, { pointerId: 1, pointerType: 'mouse', button: 0, ...screen(point), ...options });
  }
  function tap(point) {
    pointer('pointerdown', point);
    pointer('pointerup', point);
  }
  return { scene, advance, button, pointer, tap, screen, wheel: deltaY => host.emit('wheel', { deltaY }), THREE };
}

test('三个时段的背景、主光与影子不同，切换可以从当前光照继续渐变', () => {
  const { scene, button, advance } = garden();
  const ambient = scene.children.find(light => light.isHemisphereLight);
  const key = scene.children.find(light => light.isDirectionalLight && light.castShadow);
  const noon = scene.background.clone();
  const noonIntensity = ambient.intensity;
  const noonPosition = key.position.clone();
  const morningButton = button('time', 'morning');
  assert.equal(morningButton.attributes.get('aria-pressed'), 'true');
  advance(1600);
  const morning = scene.background.clone();
  assert.ok(!morning.equals(noon));
  assert.ok(key.position.y < noonPosition.y);
  assert.ok(key.color.r > key.color.b);
  const nightButton = button('time', 'night');
  assert.equal(nightButton.attributes.get('aria-pressed'), 'true');
  assert.equal(morningButton.attributes.get('aria-pressed'), 'false');
  assert.ok(scene.background.equals(morning));
  advance(400);
  const halfway = scene.background.r;
  advance(1200);
  assert.ok(scene.background.r < halfway && halfway < morning.r);
  assert.ok(ambient.intensity < noonIntensity);
  assert.ok(key.position.x > 0 && noonPosition.x < 0);
  assert.ok(key.color.b > key.color.r);
  button('time', 'morning');
  advance(340);
  const changing = scene.background.clone();
  button('time', 'noon');
  assert.ok(scene.background.equals(changing));
  advance(1600);
  assert.ok(scene.background.equals(noon));
  assert.equal(ambient.intensity, noonIntensity);
  assert.ok(key.position.equals(noonPosition));
});

test('点按正屋木门会开合，拖拽和取消手势不会触发开门', () => {
  const { scene, pointer, tap, button, advance } = garden();
  button('action', 'front');
  for (let i = 0; i < 3; i++) button('action', 'up');
  advance(650);
  const doors = scene.getObjectByName('house-doors');
  assert.ok(doors, '正屋缺少可开合的木门');
  const leaves = doors.children.filter(object => object.isGroup);
  assert.equal(leaves.length, 2);
  const handle = [-4.55, 1.1, -2.45];
  pointer('pointerdown', handle);
  pointer('pointermove', handle, { clientX: 20 });
  pointer('pointermove', handle);
  pointer('pointerup', handle);
  pointer('pointerdown', handle);
  pointer('pointercancel', handle);
  pointer('pointerup', handle);
  advance(650);
  assert.ok(leaves.every(leaf => leaf.rotation.y === 0));
  tap(handle);
  advance(650);
  assert.ok(leaves[0].rotation.y < -1 && leaves[1].rotation.y > 1);
  tap(handle);
  advance(650);
  assert.ok(leaves.every(leaf => Math.abs(leaf.rotation.y) < 0.01));
});

test('右键拖拽从当前位置开始，庭院在不同视角和缩放下都跟随鼠标移动', () => {
  const { screen, pointer, wheel, button, advance } = garden();
  const anchor = [0, .15, 4.6];
  function dragBy(dx, dy) {
    const start = screen(anchor);
    const end = { clientX: start.clientX + dx, clientY: start.clientY + dy };
    pointer('pointerdown', anchor, { button: 2 });
    pointer('pointermove', anchor, { button: -1, ...end });
    pointer('pointerup', anchor, { button: 2, ...end });
    advance(16);
    const actual = screen(anchor);
    assert.ok(Math.abs(actual.clientX - end.clientX) < .01, '水平位移应跟随鼠标');
    assert.ok(Math.abs(actual.clientY - end.clientY) < .01, '垂直位移应跟随鼠标');
  }
  dragBy(52, 39);
  button('action', 'right');
  button('action', 'up');
  button('action', 'up');
  wheel(-500);
  advance(1700);
  dragBy(-41, -57);
  dragBy(24, 22);
});

test('石灯默认入夜亮起，点按仅改变选中的灯，手动设置跨时段保留', () => {
  const { scene, tap, button, advance } = garden(true);
  const lights = [];
  scene.traverse(object => { if (object.isPointLight) lights.push(object); });
  assert.equal(lights.length, 5);
  const entrance = lights.find(light => light.parent.position.z > 5);
  assert.ok(entrance, '入口处缺少石灯');
  assert.ok(lights.every(light => light.intensity === 0));
  button('time', 'night');
  advance(16);
  assert.ok(lights.every(light => light.intensity > 0));
  const point = [entrance.parent.position.x, .98, entrance.parent.position.z];
  tap(point);
  advance(16);
  assert.ok(lights.filter(light => light !== entrance).every(light => light.intensity > 0));
  assert.equal(entrance.intensity, 0);
  button('time', 'morning');
  advance(16);
  assert.ok(lights.every(light => light.intensity === 0));
  tap(point);
  advance(16);
  assert.ok(entrance.intensity > 0);
  button('time', 'night');
  advance(16);
  assert.ok(lights.every(light => light.intensity > 0));
  button('time', 'noon');
  advance(16);
  assert.ok(entrance.intensity > 0);
  assert.ok(lights.filter(light => light !== entrance).every(light => light.intensity === 0));
});

test('每次点按池水只产生一圈涟漪，锦鲤按概率跃出，桥不会触发', () => {
  const rolls = [.85, .12, .72];
  const { scene, tap, advance } = garden(false, () => rolls.shift());
  const koi = scene.getObjectByName('pond-koi');
  const ripples = scene.getObjectByName('pond-ripples');
  assert.ok(koi && ripples, '池塘缺少涟漪或锦鲤');
  function visibleRipples() {
    const rings = [];
    ripples.traverseVisible(object => { if (object.isMesh) rings.push(object); });
    return rings;
  }
  tap([.35, .52, 2.25]);
  advance(250);
  assert.equal(koi.visible, false);
  assert.equal(visibleRipples().length, 0);
  tap([1.60, .155, 2.87]);
  advance(200);
  assert.equal(visibleRipples().length, 1);
  assert.equal(koi.visible, false);
  tap([1.60, .155, 2.87]);
  advance(210);
  assert.equal(visibleRipples().length, 2);
  assert.ok(koi.visible && koi.position.y > .35);
  tap([1.60, .155, 2.87]);
  advance(150);
  assert.equal(visibleRipples().length, 3);
  assert.ok(koi.visible, '新的涟漪不应打断跃出的锦鲤');
  advance(800);
  assert.equal(koi.visible, false);
  assert.equal(visibleRipples().length, 1, '锦鲤落回水面时应只保留尚未散去的涟漪');
  advance(500);
  assert.equal(visibleRipples().length, 0);
  assert.equal(rolls.length, 0);
});

test('石路的直段、弯道与交汇处铺在同一平面，石板保持接缝且互不重叠', () => {
  const { scene, THREE } = garden();
  const paving = scene.getObjectByName('garden-paving');
  assert.ok(paving, '缺少成组的道路铺装');
  const matrix = new THREE.Matrix4();
  const vertices = [];
  for (let i = 0; i < paving.count; i++) {
    paving.getMatrixAt(i, matrix);
    vertices.push(new THREE.Vector3().setFromMatrixPosition(matrix));
  }
  const { width, depth } = paving.geometry.parameters;
  assert.ok(width >= .32 && depth >= .32, '单块石板应比原先的 .262 更宽');
  assert.ok(vertices.length > 0);
  assert.ok(vertices.every(point => point.y === vertices[0].y));
  for (const [i, first] of vertices.entries()) {
    for (const second of vertices.slice(i + 1)) {
      assert.ok(Math.abs(first.x - second.x) >= width || Math.abs(first.z - second.z) >= depth,
        `相邻石板重叠于 ${first.x}, ${first.z}`);
    }
  }
  for (const [x, z] of [[0, 5.85], [0, 4.65], [-3.35, 3.45], [-4.27, .65], [1.30, -2.95], [5.75, 2.85]]) {
    assert.ok(vertices.some(tile => Math.abs(tile.x - x) < .18 && Math.abs(tile.z - z) < .18),
      `道路在 ${x}, ${z} 不连续`);
  }
});
