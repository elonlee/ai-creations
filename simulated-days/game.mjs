export function createInitialDaily() {
  return { actions: {}, chats: {} };
}

export function createInitialSceneState() {
  return {
    meal: null,
    painting: false,
    tea: false,
    showered: false,
    bookOut: false,
    rested: false,
    souvenirs: {},
  };
}

export function createInitialState() {
  return {
    version: 1,
    day: 1,
    minute: 9 * 60,
    money: 320,
    needs: { hunger: 72, energy: 82, fun: 66, social: 54, hygiene: 76 },
    skills: { cooking: { level: 1, xp: 0 }, creativity: { level: 1, xp: 0 } },
    relationships: { nora: 8, jun: 0, ellis: 0 },
    goals: { cook: false, paint: false, chat: false },
    furniture: { plant: { x: 1, z: 1 }, rug: { x: 2, z: 2 } },
    daily: createInitialDaily(),
    scene: createInitialSceneState(),
    log: ['新的一天，从紫蓝巷的晨光开始。'],
  };
}

export const CATALOG = {
  lamp: { name: '纸灯落地灯', price: 85, x: 3, z: 2 },
  armchair: { name: '奶油色扶手椅', price: 120, x: 1, z: 3 },
  shelf: { name: '手作矮书架', price: 110, x: 3, z: 1 },
  stool: { name: '橡木小圆凳', price: 55, x: 2, z: 3 },
};

export const ACTIONS = {
  cook: {
    name: '做一份暖心早午餐',
    minutes: 45,
    cost: 12,
    energyRequired: 8,
    needs: { energy: -7, fun: 4, hygiene: -4 },
    skill: 'cooking',
    xp: 22,
    goal: 'cook',
    reward: 6,
    dailyLimit: 1,
    limitMessage: '今天已经做过早午餐啦，明天再来下厨吧。',
  },
  eat: {
    name: '吃掉桌上的早午餐',
    minutes: 20,
    energyRequired: 0,
    needs: { hunger: 38, fun: 8, energy: 4 },
    dailyLimit: null,
  },
  paint: {
    name: '画一张街角速写',
    minutes: 80,
    cost: 0,
    income: 42,
    energyRequired: 12,
    needs: { energy: -18, fun: 13, hunger: -5, hygiene: -2 },
    skill: 'creativity',
    xp: 28,
    goal: 'paint',
    reward: 18,
    dailyLimit: 1,
    limitMessage: '今天已经画过街角速写啦，明天再来寻找新灵感吧。',
  },
  rest: {
    name: '小睡一会儿',
    minutes: 130,
    energyRequired: 0,
    needs: { energy: 60, fun: 3 },
    dailyLimit: null,
  },
  sleep: {
    name: '睡到明天清晨',
    minutes: 0,
    energyRequired: 0,
    overnight: true,
    needs: { energy: 85, fun: 5 },
    dailyLimit: null,
  },
  shower: {
    name: '洗个热水澡',
    minutes: 35,
    energyRequired: 0,
    needs: { hygiene: 58, energy: 5 },
    dailyLimit: 1,
    limitMessage: '今天已经洗过热水澡啦，整个人都很清爽。',
  },
  read: {
    name: '读一本旧书',
    minutes: 50,
    energyRequired: 3,
    needs: { fun: 26, energy: -3 },
    skill: 'creativity',
    xp: 8,
    dailyLimit: null,
  },
  tea: {
    name: '泡一壶花草茶',
    minutes: 25,
    cost: 4,
    energyRequired: 0,
    needs: { fun: 14, energy: 8, hunger: 5 },
    dailyLimit: 1,
    limitMessage: '今天的花草茶已经泡好啦，明天再泡新的一壶吧。',
  },
  chat: {
    name: '聊聊近况',
    minutes: 45,
    energyRequired: 3,
    needs: { social: 32, fun: 9, energy: -4 },
    goal: 'chat',
    reward: 12,
    dailyLimitPerNeighbor: 1,
    limitMessage: '今天已经和这位邻居聊过近况啦，明天再去打招呼吧。',
  },
};

const STORAGE_KEY = 'simulated-days-v1';
const clamp = value => Math.max(0, Math.min(100, Math.round(value)));
const decayPerHour = { hunger: 4, energy: 2.5, fun: 2.2, social: 2, hygiene: 1.2 };

function normalizeState(state) {
  const daily = {
    actions: { ...(state.daily?.actions || {}) },
    chats: { ...(state.daily?.chats || {}) },
  };
  const rawMeal = state.scene?.meal;
  const meal = rawMeal === 'ready' || (typeof rawMeal === 'number' && rawMeal > 0) ? 'ready' : null;
  const scene = {
    ...createInitialSceneState(),
    ...(state.scene || {}),
    meal,
    souvenirs: { ...(state.scene?.souvenirs || {}) },
  };
  return { ...state, daily, scene };
}

function advance(state, minutes, overnight = false) {
  const total = state.minute + minutes;
  const daysPassed = Math.floor(total / 1440);
  const decayFactor = overnight ? 0.35 : 1;
  const resetDaily = daysPassed > 0 || overnight;
  return {
    ...state,
    day: state.day + daysPassed,
    minute: total % 1440,
    goals: resetDaily ? { cook: false, paint: false, chat: false } : { ...state.goals },
    daily: resetDaily ? createInitialDaily() : { actions: { ...state.daily.actions }, chats: { ...state.daily.chats } },
    scene: resetDaily ? createInitialSceneState() : { ...state.scene, souvenirs: { ...state.scene.souvenirs } },
    needs: Object.fromEntries(
      Object.entries(state.needs).map(([key, value]) => {
        if (overnight && key === 'energy') return [key, value];
        return [key, clamp(value - decayPerHour[key] * decayFactor * minutes / 60)];
      }),
    ),
  };
}

function withLog(state, message) {
  return { ...state, log: [message, ...state.log].slice(0, 8) };
}

export function getActionAvailability(rawState, actionId, neighborId) {
  const action = ACTIONS[actionId];
  if (!action) return { allowed: false, reason: '这个互动还没有开放。', doneToday: false, repeatable: false };
  const state = normalizeState(rawState);
  if (actionId === 'eat') {
    if (state.scene.meal !== 'ready') {
      return { allowed: false, reason: '桌上现在没有餐食，先去小厨房做一份吧。', doneToday: false, repeatable: false };
    }
    return { allowed: true, reason: '', doneToday: false, repeatable: false };
  }
  if (actionId === 'chat') {
    if (!Object.hasOwn(state.relationships, neighborId)) {
      return { allowed: false, reason: '先在社区里选一位邻居。', doneToday: false, repeatable: false };
    }
    const used = state.daily.chats[neighborId] || 0;
    if (action.dailyLimitPerNeighbor && used >= action.dailyLimitPerNeighbor) {
      return { allowed: false, reason: action.limitMessage, doneToday: true, repeatable: false };
    }
    return { allowed: true, reason: '', doneToday: false, repeatable: false };
  }
  if (action.dailyLimit) {
    const used = state.daily.actions[actionId] || 0;
    if (used >= action.dailyLimit) {
      return { allowed: false, reason: action.limitMessage, doneToday: true, repeatable: false };
    }
    return { allowed: true, reason: '', doneToday: false, repeatable: false };
  }
  return { allowed: true, reason: '', doneToday: false, repeatable: true };
}

export function performAction(state, actionId, neighborId) {
  const action = ACTIONS[actionId];
  if (!action) return { ok: false, state, message: '这个互动还没有开放。' };
  const normalized = normalizeState(state);
  const availability = getActionAvailability(normalized, actionId, neighborId);
  if (!availability.allowed) return { ok: false, state, message: availability.reason };
  if (normalized.needs.energy < action.energyRequired) return { ok: false, state, message: 'Miri 有点累了，先休息一会儿吧。' };
  if (normalized.money < (action.cost || 0)) return { ok: false, state, message: '零钱不够了，画一张速写或等明天再来吧。' };

  const minutes = action.overnight
    ? (normalized.minute >= 6 * 60 ? (1440 - normalized.minute) + 8 * 60 : 8 * 60 - normalized.minute)
    : action.minutes;

  let next = advance(normalized, minutes, Boolean(action.overnight));
  next.money += (action.income || 0) - (action.cost || 0);
  next.needs = { ...next.needs };
  for (const [key, change] of Object.entries(action.needs)) next.needs[key] = clamp(next.needs[key] + change);

  if (!action.overnight && actionId !== 'eat') {
    if (actionId === 'chat') {
      next.daily.chats[neighborId] = (next.daily.chats[neighborId] || 0) + 1;
    } else {
      next.daily.actions[actionId] = (next.daily.actions[actionId] || 0) + 1;
    }
  }

  // Update persistent 3D room scene state for the current day.
  if (actionId === 'cook') next.scene.meal = 'ready';
  if (actionId === 'eat') next.scene.meal = null;
  if (actionId === 'paint') next.scene.painting = true;
  if (actionId === 'tea') next.scene.tea = true;
  if (actionId === 'shower') next.scene.showered = true;
  if (actionId === 'read') next.scene.bookOut = true;
  if (actionId === 'rest') next.scene.rested = true;
  if (actionId === 'chat') next.scene.souvenirs[neighborId] = true;

  let message = action.name;
  if (action.income) message += ` · 收入 +${action.income} 暖光币`;
  if (action.cost) message += ` · 支出 -${action.cost} 暖光币`;
  if (actionId === 'cook') message += ' · 早午餐已端上厨房桌面，点击餐盒即可享用';
  if (actionId === 'eat') message += ' · 饱餐一顿，厨房桌上的餐食已经吃光啦';
  if (actionId === 'paint') message += ' · 街角速写留在画桌上了';
  if (actionId === 'tea') message += ' · 热茶与茶点已备好';
  if (actionId === 'shower') message += ' · 浴室换上了干净浴巾';
  if (actionId === 'read') message += ' · 沙发旁留下了翻开的书';
  if (action.skill) {
    next.skills = { ...next.skills };
    const skill = { ...next.skills[action.skill], xp: next.skills[action.skill].xp + action.xp };
    if (skill.xp >= 100) { skill.level += 1; skill.xp -= 100; message += ` · ${action.skill === 'cooking' ? '烹饪' : '创作'}升级！`; }
    next.skills[action.skill] = skill;
    message += ` · ${action.skill === 'cooking' ? '烹饪' : '创作'}经验 +${action.xp}`;
  }
  if (actionId === 'chat') {
    const newRelation = clamp(next.relationships[neighborId] + 18);
    const gained = newRelation - next.relationships[neighborId];
    next.relationships = { ...next.relationships, [neighborId]: newRelation };
    const giftNote = { nora: '送来一束小花摆在窗台', jun: '推荐了一叠旧书放在画桌边', ellis: '捎来手冲咖啡豆和点心盒' }[neighborId];
    message += ` · ${{ nora: 'Nora', jun: 'Jun', ellis: 'Ellis' }[neighborId]} 关系 +${gained} · ${giftNote}`;
  }
  if (action.goal && !next.goals[action.goal]) {
    next.goals[action.goal] = true;
    next.money += action.reward;
    message += ` · 微小日常完成，获得 ${action.reward} 暖光币`;
  }
  if (next.day > normalized.day) message += ` · 来到第 ${next.day} 天`;
  else if (action.overnight) message += ' · 早安，新的一天开始了';
  next = withLog(next, message);
  return { ok: true, state: next, message };
}

export function purchaseFurniture(state, itemId) {
  const item = CATALOG[itemId];
  if (!item) return { ok: false, state, message: '没有找到这件家具。' };
  if (state.furniture[itemId]) return { ok: false, state, message: '这件家具已经在家里了。' };
  if (state.money < item.price) return { ok: false, state, message: '暖光币不足，先画几张速写吧。' };
  const message = `买下${item.name} · -${item.price} 暖光币`;
  const next = withLog({ ...state, money: state.money - item.price, furniture: { ...state.furniture, [itemId]: { x: item.x, z: item.z } } }, message);
  return { ok: true, state: next, message };
}

export function moveFurniture(state, itemId, x, z) {
  if (!state.furniture[itemId]) return { ok: false, state, message: '家里还没有这件家具。' };
  if (!Number.isInteger(x) || !Number.isInteger(z) || x < 0 || x > 4 || z < 0 || z > 4) {
    return { ok: false, state, message: '家具只能放在房间地板上。' };
  }
  const message = '家具换了一个新位置，房间又有了新感觉。';
  const next = withLog({ ...state, furniture: { ...state.furniture, [itemId]: { x, z } } }, message);
  return { ok: true, state: next, message };
}

export function saveState(storage, state) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}

export function loadState(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const state = JSON.parse(raw);
    if (state.version !== 1 || !Number.isFinite(state.money) || !Number.isFinite(state.minute) || !state.needs || !state.skills || !state.relationships || !state.goals || !state.furniture || !Array.isArray(state.log)) throw new Error('invalid save');
    return normalizeState(state);
  } catch { return createInitialState(); }
}
