import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAPTER_SCENES,
  getAtmosphereState,
  getContinuousChapterPosition,
  getGanZhiLabel,
  getSoundscapeMix,
  layoutSealCharacters,
  normalizeSealText,
} from '../scene.mjs';

test('连续阅读位置在章首与章尾之间平滑插值', () => {
  const starts = [0, 1000, 2000, 3000, 4000, 5000];
  assert.equal(getContinuousChapterPosition(starts, 0), 0);
  assert.equal(getContinuousChapterPosition(starts, 1500), 1.5);
  assert.equal(getContinuousChapterPosition(starts, -200), 0);
  assert.equal(getContinuousChapterPosition(starts, 9999), 5);
});

test('同画作相邻章节保持镜头平推，跨画作章节平稳叠化', () => {
  const bridgeMid = getAtmosphereState(1.5);
  assert.equal(bridgeMid.sameArt, true);
  assert.equal(bridgeMid.layers.rainBridge, 1);
  assert.ok(bridgeMid.primaryCamera.focusX > CHAPTER_SCENES[1].focusX);
  assert.ok(bridgeMid.primaryCamera.focusX < CHAPTER_SCENES[2].focusX);

  const crossMid = getAtmosphereState(0.5);
  assert.equal(crossMid.sameArt, false);
  assert.ok(Math.abs(crossMid.layers.mountains - 0.5) < 1e-6);
  assert.ok(Math.abs(crossMid.layers.rainBridge - 0.5) < 1e-6);
});

test('声景权重随章节推进正确反映雨声、松风与江波', () => {
  const rain = getSoundscapeMix(1);
  const mountain = getSoundscapeMix(3);
  const river = getSoundscapeMix(4);
  assert.ok(rain.rain > mountain.rain);
  assert.ok(mountain.wind > rain.wind);
  assert.ok(river.water > rain.water);
});

test('印文规整与干支年份计算符合传统印式', () => {
  assert.equal(normalizeSealText('  山水 有归处 '), '山水有归');
  assert.equal(normalizeSealText('   ', '心远'), '心远');
  assert.equal(getGanZhiLabel(new Date(2026, 2, 10)), '丙午年 · 孟春');
  assert.equal(getGanZhiLabel(new Date(2026, 6, 10)), '丙午年 · 仲夏');
  assert.equal(getGanZhiLabel(new Date(2026, 10, 27)), '丙午年 · 暮秋');
  assert.equal(getGanZhiLabel(new Date(2026, 11, 10)), '丙午年 · 孟冬');

  const fourChar = layoutSealCharacters('山水有归');
  assert.equal(fourChar.cols, 2);
  assert.deepEqual(fourChar.grid, [['山', '水'], ['有', '归']]);

  const threeChar = layoutSealCharacters('听雨人');
  assert.deepEqual(threeChar.grid, [['听', '雨'], ['人', '印']]);
});
