import test from 'node:test';
import assert from 'node:assert/strict';
import { createRainLayers, lensSourceRect } from '../rain.mjs';

const settings = { density: 0.42, size: 0.76, scale: 1, trails: 0.58 };

test('静止雨滴全是小水珠，移动雨点可以较大但没有长水痕', () => {
  let seed = 17;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const layers = createRainLayers(1200, 800, settings, random);
  assert.ok(layers.micro.length > 2500);
  assert.ok(layers.beads.length > 300);
  assert.ok(layers.micro.length > layers.beads.length * 3);
  assert.ok([...layers.micro, ...layers.beads].every(drop => !drop.moving && drop.r <= 2.2 && drop.trailLength === 0));
  assert.ok(layers.runners.length > 0 && layers.runners.length < layers.beads.length);
  assert.ok(layers.runners.some(drop => drop.r >= 8));
  assert.ok(layers.runners.every(drop => drop.moving && drop.trailLength <= 10));
  const largeScale = createRainLayers(1200, 800, { ...settings, size: 1, scale: 2 }, random);
  assert.ok([...largeScale.micro, ...largeScale.beads].every(drop => drop.r <= 2.2 && drop.trailLength === 0));
});

test('水滴透镜取样在背景图片内，并随位置移动', () => {
  const left = lensSourceRect({ width: 1600, height: 900 }, { width: 1200, height: 800 }, { x: 200, y: 400, r: 10 }, 0.8);
  const right = lensSourceRect({ width: 1600, height: 900 }, { width: 1200, height: 800 }, { x: 900, y: 400, r: 10 }, 0.8);
  assert.ok(left.sx >= 0 && left.sy >= 0 && left.sx + left.sw <= 1600 && left.sy + left.sh <= 900);
  assert.ok(right.sx > left.sx);
  assert.ok(left.sw > 0 && left.sh > 0);
});
