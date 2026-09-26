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
  cook: { name: '做一份暖心早午餐', minutes: 45, cost: 12, energyRequired: 8, needs: { hunger: 34, energy: -7, fun: 4, hygiene: -4 }, skill: 'cooking', xp: 22, goal: 'cook', reward: 6 },
  paint: { name: '画一张街角速写', minutes: 80, cost: 0, income: 42, energyRequired: 12, needs: { energy: -18, fun: 13, hunger: -5, hygiene: -2 }, skill: 'creativity', xp: 28, goal: 'paint', reward: 18 },
  rest: { name: '小睡一会儿', minutes: 130, energyRequired: 0, needs: { energy: 60, fun: 3 } },
  shower: { name: '洗个热水澡', minutes: 35, energyRequired: 0, needs: { hygiene: 58, energy: 5 } },
  read: { name: '读一本旧书', minutes: 50, energyRequired: 3, needs: { fun: 26, energy: -3 }, skill: 'creativity', xp: 8 },
  tea: { name: '泡一壶花草茶', minutes: 25, cost: 4, energyRequired: 0, needs: { fun: 14, energy: 8, hunger: 5 } },
  chat: { name: '聊聊近况', minutes: 45, energyRequired: 3, needs: { social: 32, fun: 9, energy: -4 }, goal: 'chat', reward: 12 },
};

const STORAGE_KEY = 'simulated-days-v1';
const clamp = value => Math.max(0, Math.min(100, Math.round(value)));
const decayPerHour = { hunger: 4, energy: 2.5, fun: 2.2, social: 2, hygiene: 1.2 };

function advance(state, minutes) {
  const total = state.minute + minutes;
  const daysPassed = Math.floor(total / 1440);
  return {
    ...state,
    day: state.day + daysPassed,
    minute: total % 1440,
    goals: daysPassed ? { cook: false, paint: false, chat: false } : { ...state.goals },
    needs: Object.fromEntries(Object.entries(state.needs).map(([key, value]) => [key, clamp(value - decayPerHour[key] * minutes / 60)])),
  };
}

function withLog(state, message) {
  return { ...state, log: [message, ...state.log].slice(0, 8) };
}

export function performAction(state, actionId, neighborId) {
  const action = ACTIONS[actionId];
  if (!action) return { ok: false, state, message: '这个互动还没有开放。' };
  if (actionId === 'chat' && !Object.hasOwn(state.relationships, neighborId)) {
    return { ok: false, state, message: '先在社区里选一位邻居。' };
  }
  if (state.needs.energy < action.energyRequired) return { ok: false, state, message: 'Miri 有点累了，先休息一会儿吧。' };
  if (state.money < (action.cost || 0)) return { ok: false, state, message: '零钱不够了，画一张速写赚些钱吧。' };

  let next = advance(state, action.minutes);
  next.money += (action.income || 0) - (action.cost || 0);
  next.needs = { ...next.needs };
  for (const [key, change] of Object.entries(action.needs)) next.needs[key] = clamp(next.needs[key] + change);
  let message = action.name;
  if (action.income) message += ` · 收入 +${action.income} 暖光币`;
  if (action.cost) message += ` · 支出 -${action.cost} 暖光币`;
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
    message += ` · ${{ nora: 'Nora', jun: 'Jun', ellis: 'Ellis' }[neighborId]} 关系 +${gained}`;
  }
  if (action.goal && !next.goals[action.goal]) {
    next.goals[action.goal] = true;
    next.money += action.reward;
    message += ` · 微小日常完成，获得 ${action.reward} 暖光币`;
  }
  if (next.day > state.day) message += ` · 来到第 ${next.day} 天`;
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
    return state;
  } catch { return createInitialState(); }
}
