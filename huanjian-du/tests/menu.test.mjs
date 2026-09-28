import test from 'node:test';
import assert from 'node:assert/strict';
import * as menu from '../menu.mjs';

test('打开页面先显示主界面，说明可返回主界面', () => {
  assert.equal(typeof menu.initialScreen, 'function');
  assert.equal(menu.initialScreen(), 'title');
  assert.equal(menu.nextScreen('title', 'instructions'), 'instructions');
  assert.equal(menu.nextScreen('instructions', 'back'), 'title');
});

test('开始游戏进入探索，返回主界面后可以重新开始', () => {
  assert.equal(menu.nextScreen('title', 'start'), 'game');
  assert.equal(menu.nextScreen('game', 'home'), 'title');
  assert.equal(menu.nextScreen('title', 'start'), 'game');
});

test('无效选单操作不会跳过主界面', () => {
  assert.equal(menu.nextScreen('title', 'home'), 'title');
  assert.equal(menu.nextScreen('instructions', 'start'), 'instructions');
  assert.equal(menu.nextScreen('game', 'instructions'), 'game');
});
