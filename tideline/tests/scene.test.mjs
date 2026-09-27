import test from 'node:test';
import assert from 'node:assert/strict';
import { getStoryPosition, getSceneState, getTideOffset, getWaveDisplacement } from '../scene.mjs';

test('滚动以整屏为一幕，边界被限制在四幕内', () => {
  assert.equal(getStoryPosition(-50, 800), 0);
  assert.equal(getStoryPosition(400, 800), 0.5);
  assert.equal(getStoryPosition(1600, 800), 2);
  assert.equal(getStoryPosition(4000, 800), 3);
  assert.equal(getStoryPosition(500, 0), 0);
});

test('相邻两幕的环境参数连续过渡', () => {
  const first = getSceneState(0);
  const second = getSceneState(1);
  const middle = getSceneState(0.5);

  assert.deepEqual(middle.skyTop, first.skyTop.map((value, i) => (value + second.skyTop[i]) / 2));
  assert.equal(middle.horizon, (first.horizon + second.horizon) / 2);
  assert.equal(middle.sunX, (first.sunX + second.sunX) / 2);
  assert.notDeepEqual(first.skyTop, second.skyTop);
});

test('最终一幕及越界位置保持同一画面参数', () => {
  const ending = getSceneState(3);
  assert.deepEqual(getSceneState(20), ending);
  assert.deepEqual(getSceneState(-2), getSceneState(0));
  assert.equal(ending.stars > getSceneState(1).stars, true);
});

test('潜入一幕保留海面下的发光焦点，并在前后两幕渐隐', () => {
  assert.equal(getSceneState(0).underwater, 0);
  assert.equal(getSceneState(1).underwater, 0);
  assert.equal(getSceneState(2).underwater, 1);
  assert.equal(getSceneState(3).underwater, 0);
  assert.equal(getSceneState(1.5).underwater, 0.5);
});

test('潮位缓慢起伏，但不会超出设定振幅', () => {
  assert.equal(getTideOffset(0, 12), 0);
  assert.ok(getTideOffset(3500, 12) > 10);
  assert.ok(getTideOffset(10500, 12) < -10);
  assert.ok(Math.abs(getTideOffset(2000, 12)) <= 12);
});

test('有体积的波峰随时间移动，静态模式可保持固定帧', () => {
  const first = getWaveDisplacement(140, 0, 700, 24, 1);
  const later = getWaveDisplacement(140, 2000, 700, 24, 1);
  assert.ok(Math.abs(first - later) > 5);
  assert.equal(getWaveDisplacement(140, 2000, 700, 0, 1), 0);
  assert.ok(Math.abs(first) <= 30);
});
