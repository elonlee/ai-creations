import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  performAction,
  purchaseFurniture,
  moveFurniture,
  loadState,
  saveState,
  getActionAvailability,
} from '../game.mjs';

test('做早午餐每天限一次，做好后桌上有餐盒且可点击吃掉，也可跨天消失', () => {
  const initial = createInitialState();
  // 桌上还没做饭时不能吃
  assert.equal(performAction(initial, 'eat').ok, false);

  const cooked = performAction(initial, 'cook');
  assert.equal(cooked.ok, true);
  assert.equal(cooked.state.scene.meal, 'ready');
  assert.ok(cooked.state.money < initial.money);
  assert.ok(cooked.state.minute > initial.minute);
  assert.equal(cooked.state.goals.cook, true);
  assert.equal(initial.goals.cook, false);

  // 同一天不能第二次做早午餐
  const secondCook = performAction(cooked.state, 'cook');
  assert.equal(secondCook.ok, false);
  assert.equal(secondCook.state, cooked.state);

  // 点击餐盒吃掉：饥饿明显恢复且餐食消失
  const eaten = performAction(cooked.state, 'eat');
  assert.equal(eaten.ok, true);
  assert.ok(eaten.state.needs.hunger > cooked.state.needs.hunger);
  assert.equal(eaten.state.scene.meal, null);
  assert.equal(performAction(eaten.state, 'eat').ok, false);

  // 如果做了餐食没有吃直接睡到第二天，餐食也会消失且第二天可以重新下厨
  const nextMorning = performAction(cooked.state, 'sleep');
  assert.equal(nextMorning.state.day, 2);
  assert.equal(nextMorning.state.scene.meal, null);
  assert.equal(performAction(nextMorning.state, 'cook').ok, true);
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

test('每日限一次的动作在同一天内不可重复，可重复动作更新场景状态，睡到清晨重置新一天', () => {
  let state = createInitialState();

  // 第一次画画成功并在桌面留下画作状态
  const p1 = performAction(state, 'paint');
  assert.equal(p1.ok, true);
  assert.equal(p1.state.scene.painting, true);
  assert.equal(getActionAvailability(p1.state, 'paint').doneToday, true);

  // 当天第二次画画被限制
  const p2 = performAction(p1.state, 'paint');
  assert.equal(p2.ok, false);
  assert.equal(p2.state, p1.state);

  // 洗澡与泡茶当天限一次，同时更新场景状态
  const s1 = performAction(p1.state, 'shower');
  assert.equal(s1.ok, true);
  assert.equal(s1.state.scene.showered, true);
  assert.equal(performAction(s1.state, 'shower').ok, false);

  const t1 = performAction(s1.state, 'tea');
  assert.equal(t1.ok, true);
  assert.equal(t1.state.scene.tea, true);
  assert.equal(performAction(t1.state, 'tea').ok, false);

  // 做早午餐当天限一次并摆上桌，看书可重复
  const c1 = performAction(t1.state, 'cook');
  assert.equal(c1.state.scene.meal, 'ready');
  assert.equal(performAction(c1.state, 'cook').ok, false);

  const r1 = performAction(c1.state, 'read');
  assert.equal(r1.ok, true);
  assert.equal(r1.state.scene.bookOut, true);

  // 每位邻居每天限聊一次，并留下小屋纪念品
  const chatNora1 = performAction(r1.state, 'chat', 'nora');
  assert.equal(chatNora1.ok, true);
  assert.equal(chatNora1.state.scene.souvenirs.nora, true);
  assert.equal(performAction(chatNora1.state, 'chat', 'nora').ok, false);
  const chatJun = performAction(chatNora1.state, 'chat', 'jun');
  assert.equal(chatJun.ok, true);
  assert.equal(chatJun.state.scene.souvenirs.jun, true);

  // 睡到明天清晨会推进到第 2 天 08:00 并重置每日次数与当日桌面状态
  const morning = performAction(chatJun.state, 'sleep');
  assert.equal(morning.ok, true);
  assert.equal(morning.state.day, 2);
  assert.equal(morning.state.minute, 8 * 60);
  assert.equal(morning.state.scene.meal, null);
  assert.equal(morning.state.scene.painting, false);
  assert.equal(morning.state.scene.tea, false);
  assert.equal(morning.state.scene.showered, false);
  assert.deepEqual(morning.state.scene.souvenirs, {});
  assert.equal(getActionAvailability(morning.state, 'cook').allowed, true);
  assert.equal(getActionAvailability(morning.state, 'paint').allowed, true);
  assert.equal(getActionAvailability(morning.state, 'chat', 'nora').allowed, true);
});

test('旧版存档缺少 daily/scene 或使用旧数字 meal 字段时可无缝兼容', () => {
  const legacy = createInitialState();
  delete legacy.daily;
  delete legacy.scene;
  const data = new Map([['simulated-days-v1', JSON.stringify(legacy)]]);
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const loaded = loadState(storage);
  assert.equal(loaded.scene.meal, null);
  assert.deepEqual(loaded.daily.actions, {});
  assert.equal(performAction(loaded, 'cook').state.scene.meal, 'ready');

  const legacyNumericMeal = { ...createInitialState(), scene: { meal: 1 } };
  data.set('simulated-days-v1', JSON.stringify(legacyNumericMeal));
  assert.equal(loadState(storage).scene.meal, 'ready');
});

test('连续执行日常动作会逐步将时间推进到傍晚与夜晚时段', () => {
  let state = createInitialState(); // 09:00
  for (const actionId of ['cook', 'eat', 'paint', 'tea', 'read', 'rest', 'read']) {
    const res = performAction(state, actionId);
    assert.equal(res.ok, true);
    state = res.state;
  }
  assert.ok(state.minute >= 19 * 60, `多次互动后应进入夜晚时段，当前分钟=${state.minute}`);
});
