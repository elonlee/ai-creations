import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  performAction,
  purchaseFurniture,
  moveFurniture,
  loadState,
  saveState,
} from '../game.mjs';

test('做饭消耗时间和食材费，同时改善饥饿并完成一次性日常目标', () => {
  const initial = createInitialState();
  const first = performAction(initial, 'cook');
  assert.equal(first.ok, true);
  assert.ok(first.state.needs.hunger > initial.needs.hunger);
  assert.ok(first.state.money < initial.money);
  assert.ok(first.state.minute > initial.minute);
  assert.equal(first.state.goals.cook, true);
  const second = performAction(first.state, 'cook');
  assert.equal(second.ok, true);
  assert.equal(second.state.money - first.state.money, -12);
  assert.equal(initial.goals.cook, false);
});

test('创作获得收入与技能经验，邻居互动提升关系', () => {
  const initial = createInitialState();
  const painted = performAction(initial, 'paint');
  assert.ok(painted.state.money > initial.money);
  assert.ok(painted.state.skills.creativity.xp > initial.skills.creativity.xp);
  const chatted = performAction(painted.state, 'chat', 'nora');
  assert.ok(chatted.state.relationships.nora > painted.state.relationships.nora);
  assert.ok(chatted.state.needs.social > painted.state.needs.social);
  assert.match(painted.message, /42 暖光币/);
  assert.match(painted.message, /创作经验 \+28/);
  assert.match(chatted.message, /Nora 关系 \+18/);
});

test('跨天后重新生成当日微小目标', () => {
  const state = { ...createInitialState(), minute: 23 * 60 + 30, goals: { cook: true, paint: true, chat: true } };
  const result = performAction(state, 'rest');
  assert.equal(result.state.day, 2);
  assert.deepEqual(result.state.goals, { cook: false, paint: false, chat: false });
});

test('关系达到上限时反馈实际增长值', () => {
  const state = { ...createInitialState(), relationships: { ...createInitialState().relationships, nora: 95 } };
  const result = performAction(state, 'chat', 'nora');
  assert.equal(result.state.relationships.nora, 100);
  assert.match(result.message, /Nora 关系 \+5/);
});

test('精力不足时动作失败且不改变状态', () => {
  const state = { ...createInitialState(), needs: { ...createInitialState().needs, energy: 2 } };
  const result = performAction(state, 'paint');
  assert.equal(result.ok, false);
  assert.equal(result.state, state);
});

test('购买家具扣款并可在房间网格中重新摆放', () => {
  const initial = createInitialState();
  const bought = purchaseFurniture(initial, 'lamp');
  assert.equal(bought.ok, true);
  assert.equal(bought.state.money, initial.money - 85);
  assert.deepEqual(bought.state.furniture.lamp, { x: 3, z: 2 });
  const moved = moveFurniture(bought.state, 'lamp', 1, 3);
  assert.equal(moved.ok, true);
  assert.deepEqual(moved.state.furniture.lamp, { x: 1, z: 3 });
  assert.equal(moveFurniture(moved.state, 'lamp', 9, 9).ok, false);
  assert.equal(purchaseFurniture(moved.state, 'lamp').ok, false);
});

test('存档恢复全部游戏状态，损坏存档回到初始状态', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const state = performAction(createInitialState(), 'paint').state;
  saveState(storage, state);
  assert.deepEqual(loadState(storage), state);
  data.set('simulated-days-v1', '{bad json');
  assert.deepEqual(loadState(storage), createInitialState());
});
