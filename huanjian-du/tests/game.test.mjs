import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../game.mjs';

function atSite(state, scene, id) {
  const { x, y } = game.SITES[scene].find((site) => site.id === id);
  return { ...state, scene, position: { x, y } };
}

test('初始状态从驿道开始，有完整气血与明确目标', () => {
  assert.equal(typeof game.createInitialState, 'function');
  const state = game.createInitialState();
  assert.equal(state.scene, 'road');
  assert.equal(state.mode, 'explore');
  assert.equal(state.hero.hp, 42);
  assert.match(game.objective(state), /渡口|粮车/);
});

test('场景交互按线索顺序推进并解锁码头对质', () => {
  let state = game.createInitialState();
  state = atSite(state, 'ferry', 'tavern');
  state = game.interact(state);
  assert.equal(state.scene, 'tavern');
  state = atSite(state, 'tavern', 'shen');
  state = game.interact(state);
  assert.equal(state.flags.shenStory, true);
  state = game.chooseDialogue(state, 'continue');
  state = atSite(state, 'ferry', 'ferryman');
  state = game.interact(state);
  assert.equal(state.flags.ferrymanRecognized, true);
  state = game.chooseDialogue(state, 'continue');
  state = game.inspectSword(state);
  assert.equal(state.flags.swordConfession, true);
  state = game.chooseDialogue(state, 'continue');
  state = atSite(state, 'dock', 'cheng');
  state = game.interact(state);
  assert.equal(state.mode, 'battle');
  assert.equal(state.battle.kind, 'boss');
});

test('没有查清旧案时程砚不触发决战', () => {
  const state = atSite(game.createInitialState(), 'dock', 'cheng');
  const next = game.interact(state);
  assert.equal(next.mode, 'dialogue');
  assert.equal(next.battle, null);
});

test('驿道行走可触发山贼遭遇，冷却期不会连战', () => {
  let state = { ...game.createInitialState(), encounterCooldown: 0 };
  state = game.move(state, 'right', () => 0);
  assert.equal(state.mode, 'battle');
  assert.equal(state.battle.kind, 'bandit');
  state = { ...state, mode: 'explore', battle: null };
  state = game.move(state, 'right', () => 0);
  assert.equal(state.mode, 'explore');
});

test('流民可交粮和平解决，也能谈判；没有粮时不能假交粮', () => {
  const start = { ...game.createInitialState(), encounterCooldown: 0 };
  const event = game.move(start, 'right', (i => () => [0, 0.95][i++])());
  assert.equal(event.dialogue.kind, 'refugees');
  const fed = game.chooseDialogue(event, 'grain');
  assert.equal(fed.mode, 'explore');
  assert.equal(fed.hero.grain, 0);
  assert.equal(fed.hero.xp, 6);
  const noGrain = game.chooseDialogue({ ...event, hero: { ...event.hero, grain: 0 } }, 'grain');
  assert.equal(noGrain.mode, 'dialogue');
  const talked = game.chooseDialogue(event, 'persuade');
  assert.equal(talked.mode, 'explore');
  assert.equal(talked.hero.xp, 4);
  const fought = game.chooseDialogue(event, 'fight');
  assert.equal(fought.battle.kind, 'bandit');
  assert.match(fought.message, /流民.*山贼/);
});

test('战斗出剑结算伤害，敌人还手时陆照受击', () => {
  const state = game.startBattle(game.createInitialState(), 'bandit');
  const turn = game.resolveBattle(state, 'strike', () => 0.5);
  assert.equal(turn.state.battle.enemyHp, 21);
  assert.equal(turn.state.hero.hp, 37);
  assert.deepEqual(turn.timeline, ['hero-strike', 'enemy-strike']);
});

test('破招打断蓄势招式，守势减伤回内力，物品只在有药时可用', () => {
  let state = game.startBattle(game.createInitialState(), 'bandit');
  state = { ...state, battle: { ...state.battle, round: 1, intent: 'windup' } };
  const broken = game.resolveBattle(state, 'break');
  assert.equal(broken.state.hero.hp, 42);
  assert.equal(broken.state.hero.qi, 4);
  assert.deepEqual(broken.timeline, ['hero-break']);
  const guarded = game.resolveBattle({ ...state, hero: { ...state.hero, qi: 4 } }, 'guard');
  assert.equal(guarded.state.hero.hp, 39);
  assert.equal(guarded.state.hero.qi, 5);
  const used = game.resolveBattle({ ...state, hero: { ...state.hero, hp: 20, herbs: 1 } }, 'item');
  assert.equal(used.state.hero.herbs, 0);
  assert.equal(used.state.hero.hp, 27);
  const invalid = game.resolveBattle({ ...state, hero: { ...state.hero, herbs: 0 } }, 'item');
  assert.equal(invalid.state.battle.round, state.battle.round);
  assert.deepEqual(invalid.timeline, []);
});

test('普通战可退走，剧情战禁止退走；胜负进入明确终态', () => {
  const road = game.startBattle(game.createInitialState(), 'bandit');
  assert.equal(game.resolveBattle(road, 'escape', () => 0).state.mode, 'explore');
  const boss = game.startBattle(game.createInitialState(), 'boss');
  assert.equal(game.resolveBattle(boss, 'escape', () => 0).state.battle.round, 0);
  const won = game.resolveBattle({ ...boss, battle: { ...boss.battle, enemyHp: 1 } }, 'strike');
  assert.equal(won.state.mode, 'ending');
  const lost = game.resolveBattle({ ...road, hero: { ...road.hero, hp: 1 } }, 'strike');
  assert.equal(lost.state.mode, 'defeat');
});

test('经验值达到门槛会连续升级并提高气血、内力和出剑伤害', () => {
  const hero = game.awardExperience(game.createInitialState().hero, 55);
  assert.equal(hero.level, 3);
  assert.equal(hero.xp, 55);
  assert.equal(hero.maxHp, 54);
  assert.equal(hero.maxQi, 8);
  const state = game.startBattle({ ...game.createInitialState(), hero }, 'bandit');
  assert.equal(game.resolveBattle(state, 'strike').state.battle.enemyHp, 17);
});

test('关键线索只奖励一次经验，普通战胜利也获得经验', () => {
  let state = atSite(game.createInitialState(), 'tavern', 'shen');
  state = game.interact(state);
  const gained = state.hero.xp;
  assert.ok(gained > 0);
  state = game.chooseDialogue(state, 'continue');
  state = game.interact(state);
  assert.equal(state.hero.xp, gained);
  const battle = game.startBattle(game.createInitialState(), 'bandit');
  const won = game.resolveBattle({ ...battle, battle: { ...battle.battle, enemyHp: 1 } }, 'strike');
  assert.ok(won.state.hero.xp > 0);
});

test('水面与崖壁不能通行，四个场景的交互点都能从入口到达', () => {
  assert.equal(typeof game.isWalkable, 'function');
  assert.equal(game.isWalkable('dock', 17, 8), false);
  assert.equal(game.isWalkable('ferry', 17, 9), false);
  for (const [scene, data] of Object.entries(game.SCENES)) {
    const queue = [data.start];
    const seen = new Set([`${data.start.x},${data.start.y}`]);
    for (let index = 0; index < queue.length; index++) {
      const { x, y } = queue[index];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const key = `${x + dx},${y + dy}`;
        if (!seen.has(key) && game.isWalkable(scene, x + dx, y + dy)) {
          seen.add(key);
          queue.push({ x: x + dx, y: y + dy });
        }
      }
    }
    for (const site of game.SITES[scene]) {
      assert.ok(seen.has(`${site.x},${site.y}`), `${scene}: ${site.id} 不可到达`);
    }
  }
});
