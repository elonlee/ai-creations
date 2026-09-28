import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, awardExperience } from '../game.mjs';
import * as ui from '../ui-state.mjs';

test('角色状态数据可同时用于探索和战斗界面', () => {
  assert.equal(typeof ui.heroStatus, 'function');
  const hero = awardExperience({ ...createInitialState().hero, hp: 21, qi: 3, herbs: 1 }, 23);
  assert.deepEqual(ui.heroStatus(hero), {
    level: '贰级', hp: '27 / 48', qi: '4 / 7', xp: '23 / 55',
    hpPercent: 56.25, qiPercent: 4 / 7 * 100, xpPercent: 3 / 35 * 100,
    herbs: '金疮药 × 1', grain: '口粮 × 1',
  });
});

test('气血耗尽时状态条归零，不出现负宽度', () => {
  const hero = { ...createInitialState().hero, hp: 0, qi: 0 };
  const status = ui.heroStatus(hero);
  assert.equal(status.hpPercent, 0);
  assert.equal(status.qiPercent, 0);
});
