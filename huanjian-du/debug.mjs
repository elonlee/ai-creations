import { SITES, SCENES, createInitialState, awardExperience, interact, chooseDialogue, move, startBattle, resolveBattle } from './game.mjs';

function atSite(state, scene, id) {
  const { x, y } = SITES[scene].find((site) => site.id === id);
  return { ...state, scene, position: { x, y } };
}

function readyForDock() {
  const state = createInitialState();
  return {
    ...state,
    scene: 'dock',
    position: { ...SCENES.dock.start },
    hero: awardExperience(state.hero, 31),
    flags: { cartSeen: true, shenStory: true, ferrymanRecognized: true, swordConfession: true },
  };
}

function refugeeChoice() {
  const state = { ...createInitialState(), encounterCooldown: 0 };
  const rolls = [0, 0.95];
  let result = move(state, 'right', () => rolls.shift());
  while (result.dialogue.index < result.dialogue.lines.length - 1) result = chooseDialogue(result, 'continue');
  return result;
}

const scenarios = {
  intro: () => ({ screen: 'intro', state: createInitialState() }),
  road: () => ({ screen: 'game', state: atSite(createInitialState(), 'road', 'cart') }),
  ferry: () => {
    const state = createInitialState();
    return { screen: 'game', state: atSite({ ...state, flags: { ...state.flags, shenStory: true } }, 'ferry', 'ferryman') };
  },
  tavern: () => ({ screen: 'game', state: atSite(createInitialState(), 'tavern', 'shen') }),
  dock: () => ({ screen: 'game', state: atSite(readyForDock(), 'dock', 'cheng') }),
  'shen-dialogue': () => ({ screen: 'game', state: interact(atSite(createInitialState(), 'tavern', 'shen')) }),
  'ferryman-dialogue': () => {
    const state = createInitialState();
    return { screen: 'game', state: interact(atSite({ ...state, flags: { ...state.flags, shenStory: true } }, 'ferry', 'ferryman')) };
  },
  'refugees-choice': () => ({ screen: 'game', state: refugeeChoice() }),
  'boss-dialogue': () => ({ screen: 'game', state: interact(atSite(readyForDock(), 'dock', 'cheng')) }),
  'bandit-battle': () => ({ screen: 'game', state: startBattle(createInitialState(), 'bandit') }),
  'boss-battle': () => ({ screen: 'game', state: startBattle(readyForDock(), 'boss') }),
  ending: () => {
    const battle = startBattle(readyForDock(), 'boss');
    return { screen: 'game', state: resolveBattle({ ...battle, battle: { ...battle.battle, enemyHp: 1 } }, 'strike').state };
  },
  defeat: () => {
    const battle = startBattle(createInitialState(), 'bandit');
    return { screen: 'game', state: resolveBattle({ ...battle, hero: { ...battle.hero, hp: 1 } }, 'strike').state };
  },
};

export function debugScenarioFromUrl(url) {
  const location = new URL(url);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname)) return null;
  const name = location.searchParams.get('debug');
  return Object.hasOwn(scenarios, name) ? scenarios[name]() : null;
}
