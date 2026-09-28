import test from 'node:test';
import assert from 'node:assert/strict';
import * as menu from '../menu.mjs';

test('打开页面先显示主界面，说明可返回主界面', () => {
  assert.equal(typeof menu.initialScreen, 'function');
  assert.equal(menu.initialScreen(), 'title');
  assert.equal(menu.nextScreen('title', 'instructions'), 'instructions');
  assert.equal(menu.nextScreen('instructions', 'back'), 'title');
});

test('开始游戏先进入剧情字幕，播完或跳过后才进入探索', () => {
  assert.equal(menu.nextScreen('title', 'start'), 'intro');
  assert.equal(menu.nextScreen('intro', 'finish'), 'game');
  assert.equal(menu.nextScreen('intro', 'skip'), 'game');
  assert.equal(menu.nextScreen('game', 'home'), 'title');
  assert.equal(menu.nextScreen('title', 'start'), 'intro');
});

test('无效选单操作不会跳过主界面', () => {
  assert.equal(menu.nextScreen('title', 'home'), 'title');
  assert.equal(menu.nextScreen('instructions', 'start'), 'instructions');
  assert.equal(menu.nextScreen('game', 'instructions'), 'game');
  assert.equal(menu.nextScreen('intro', 'instructions'), 'intro');
});
