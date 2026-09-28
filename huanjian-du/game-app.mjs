import { SCENES, SITES, createInitialState, experienceForNextLevel, move, nearbyInteraction, interact, inspectSword, chooseDialogue, resolveBattle, objective } from './game.mjs';
import { createAnimationPlayer, previewMoves } from './battle-animation.mjs';
import { initialScreen, nextScreen } from './menu.mjs';

const $ = (selector) => document.querySelector(selector);
let state = createInitialState();
let screen = initialScreen();
let busy = false;
let stepFrame = false;
let walkTimer;

const portrait = {
  '陆照': 'assets/portraits/lu-zhao-v1.png',
  '沈棠': 'assets/portraits/shen-tang-v1.png',
  '老船工': 'assets/portraits/old-ferryman-v1.png',
  '程砚': 'assets/portraits/cheng-yan-v1.png',
};
const battleActor = { bandit: 'road-bandit', boss: 'cheng-yan' };
const battleIdle = { bandit: 'assets/battle/road-bandit-stance-v1.png', boss: 'assets/battle/cheng-yan-stance-v1.png' };
const facingRow = { down: 0, left: 3, right: 6, up: 9 };
const levelWords = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];

const animation = createAnimationPlayer({
  render(slot, source) { $(slot === 'hero' ? '#battle-hero' : '#battle-enemy').src = source; },
  wait(duration) { return new Promise((resolve) => setTimeout(resolve, duration)); },
  idle: { hero: 'assets/battle/lu-zhao-stance-v1.png', enemy: battleIdle.bandit },
});

function spriteSource(facing, walking) {
  const frame = facingRow[facing] + (walking ? (stepFrame ? 2 : 0) : 1);
  return `assets/sprites/lu-zhao-walk-frames/frame-${String(frame).padStart(2, '0')}.png`;
}

function renderMap() {
  $('#scene-title').textContent = SCENES[state.scene].name;
  $('#scene-caption').textContent = state.scene === 'dock' ? '夜雨将至，粮船待发' : '循着旧案留下的线索前行';
  $('#map-image').src = SCENES[state.scene].image;
  $('#player-sprite').style.left = `${state.position.x / 19 * 100}%`;
  $('#player-sprite').style.top = `${state.position.y / 11 * 100}%`;
  $('#player-sprite').src = spriteSource(state.facing, false);
  $('#map-markers').replaceChildren(...SITES[state.scene].map((site) => {
    const marker = document.createElement('span');
    marker.className = 'map-marker';
    marker.style.left = `${site.x / 19 * 100}%`;
    marker.style.top = `${site.y / 11 * 100}%`;
    marker.textContent = site.label;
    return marker;
  }));
  const site = nearbyInteraction(state);
  $('#nearby-label').textContent = site ? `附近：${site.label}` : '靠近金色标记可调查';
  $('#interact').disabled = !site || state.mode !== 'explore';
  $('#interact').textContent = site ? `调查 / ${site.label}` : '调查 / 交谈';
  $('#world-message').textContent = state.message;
}

function renderHero() {
  const { hero } = state;
  $('#hero-level').textContent = `${levelWords[hero.level] ?? hero.level}级`;
  $('#hero-hp').textContent = `${hero.hp} / ${hero.maxHp}`;
  $('#hero-qi').textContent = `${hero.qi} / ${hero.maxQi}`;
  const start = hero.level === 1 ? 0 : experienceForNextLevel(hero.level - 1);
  const next = experienceForNextLevel(hero.level);
  $('#hero-xp').textContent = `${hero.xp} / ${next}`;
  $('#hp-fill').style.width = `${hero.hp / hero.maxHp * 100}%`;
  $('#qi-fill').style.width = `${hero.qi / hero.maxQi * 100}%`;
  $('#xp-fill').style.width = `${(hero.xp - start) / (next - start) * 100}%`;
  $('#hero-herbs').textContent = `金疮药 × ${hero.herbs}`;
  $('#hero-grain').textContent = `口粮 × ${hero.grain}`;
  $('#objective').textContent = objective(state);
  $('#inspect-sword').hidden = state.mode !== 'explore' || !state.flags.ferrymanRecognized || state.flags.swordConfession;
}

function renderDialogue() {
  const visible = state.mode === 'dialogue';
  $('#dialogue').hidden = !visible;
  if (!visible) return;
  const { speaker, text, kind } = state.dialogue;
  $('#dialogue-speaker').textContent = speaker;
  $('#dialogue-text').textContent = text;
  $('#dialogue-portrait').hidden = !portrait[speaker];
  if (portrait[speaker]) $('#dialogue-portrait').src = portrait[speaker];
  const choices = kind === 'refugees'
    ? [['grain', '留下一份口粮'], ['persuade', '答应调查粮车'], ['fight', '拔剑动武']]
    : [['continue', '继续']];
  $('#dialogue-options').replaceChildren(...choices.map(([id, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.dataset.choice = id;
    button.disabled = id === 'grain' && state.hero.grain < 1;
    button.addEventListener('click', () => { state = chooseDialogue(state, id); render(); });
    return button;
  }));
  $('#dialogue-options button:not([disabled])')?.focus();
}

function renderBattle() {
  const visible = state.mode === 'battle';
  $('#battle').hidden = !visible;
  if (!visible) return;
  const { battle } = state;
  const actor = battleActor[battle.kind];
  $('#battle-scene').textContent = SCENES[state.scene].name;
  $('#battle-round').textContent = `第 ${battle.round + 1} 回合`;
  $('#battle-arena').style.backgroundImage = `url('${SCENES[state.scene].image}')`;
  $('#enemy-name').textContent = battle.kind === 'boss' ? '程砚' : '劫道山贼';
  $('#enemy-hp').textContent = `气血 ${battle.enemyHp} / ${battle.maxHp}`;
  $('#enemy-fill').style.width = `${battle.enemyHp / battle.maxHp * 100}%`;
  $('#enemy-intent').textContent = battle.intent === 'windup' ? '对手蓄势，下一击更重' : '对手正伺机出招';
  $('#battle-message').textContent = state.message;
  $('#battle-hero').src = 'assets/battle/lu-zhao-stance-v1.png';
  $('#battle-enemy').src = battleIdle[battle.kind];
  animation.reset({ hero: 'assets/battle/lu-zhao-stance-v1.png', enemy: battleIdle[battle.kind] });
  for (const button of document.querySelectorAll('[data-battle]')) {
    button.disabled = busy || (button.dataset.battle === 'escape' && battle.kind === 'boss') ||
      (button.dataset.battle === 'break' && state.hero.qi < 2) ||
      (button.dataset.battle === 'item' && state.hero.herbs < 1);
  }
  $('#battle [data-battle]:not([disabled])')?.focus();
}

function renderEnding() {
  const visible = state.mode === 'ending' || state.mode === 'defeat';
  $('#ending').hidden = !visible;
  if (!visible) return;
  const won = state.mode === 'ending';
  $('#ending-kicker').textContent = won ? '第一章 · 终' : '山路未尽';
  $('#ending-title').textContent = won ? '粮船停在了渡口' : '剑还没有送到';
  $('#ending-text').textContent = state.message;
  $('#ending-level').textContent = `陆照达到 ${state.hero.level} 级，累计获得 ${state.hero.xp} 点经验。`;
  $('#ending-restart').focus();
}

function render() {
  renderMap();
  renderHero();
  renderDialogue();
  renderBattle();
  renderEnding();
  const canLeave = !busy && !['battle', 'dialogue'].includes(state.mode);
  $('#return-title').disabled = !canLeave;
  $('#restart').disabled = !canLeave;
}

function renderScreen() {
  $('#title-screen').hidden = screen !== 'title';
  $('#instructions-screen').hidden = screen !== 'instructions';
  $('#game-shell').hidden = screen !== 'game';
  if (screen === 'title') $('#menu-start').focus();
  if (screen === 'instructions') $('#instructions-back').focus();
  if (screen === 'game') $('#map').focus();
}

function restartGame() {
  animation.reset();
  clearTimeout(walkTimer);
  state = createInitialState();
  render();
  $('#map').focus();
}

function doMove(direction) {
  if (busy || state.mode !== 'explore') return;
  const previous = state;
  state = move(state, direction);
  if (state === previous) return;
  stepFrame = !stepFrame;
  render();
  $('#player-sprite').src = spriteSource(direction, true);
  clearTimeout(walkTimer);
  walkTimer = setTimeout(() => { $('#player-sprite').src = spriteSource(direction, false); }, 150);
}

function doInteract() {
  if (busy || state.mode !== 'explore') return;
  state = interact(state);
  render();
}

async function doBattle(action) {
  if (busy || state.mode !== 'battle') return;
  const kind = state.battle.kind;
  const previousLevel = state.hero.level;
  const result = resolveBattle(state, action);
  if (result.timeline.length === 0) { state = result.state; render(); return; }
  busy = true;
  for (const button of document.querySelectorAll('[data-battle]')) button.disabled = true;
  $('#battle-message').textContent = result.text;
  for (const step of result.timeline) {
    if (step === 'enemy-guarded') continue;
    const command = { 'hero-strike': 'strike', 'hero-break': 'break', 'hero-guard': 'guard', 'enemy-strike': 'enemy-strike' }[step];
    await animation.play(previewMoves(command, battleActor[kind]));
  }
  busy = false;
  state = result.state;
  if (state.hero.level > previousLevel) state = { ...state, message: `${state.message} 陆照升至 ${state.hero.level} 级！` };
  render();
}

document.querySelectorAll('[data-move]').forEach((button) => button.addEventListener('click', () => doMove(button.dataset.move)));
document.querySelectorAll('[data-battle]').forEach((button) => button.addEventListener('click', () => void doBattle(button.dataset.battle)));
$('#menu-start').addEventListener('click', () => {
  screen = nextScreen(screen, 'start');
  restartGame();
  renderScreen();
});
$('#menu-instructions').addEventListener('click', () => { screen = nextScreen(screen, 'instructions'); renderScreen(); });
$('#instructions-back').addEventListener('click', () => { screen = nextScreen(screen, 'back'); renderScreen(); });
$('#return-title').addEventListener('click', () => {
  if (busy) return;
  animation.reset();
  screen = nextScreen(screen, 'home');
  renderScreen();
});
$('#interact').addEventListener('click', doInteract);
$('#inspect-sword').addEventListener('click', () => { state = inspectSword(state); render(); });
for (const id of ['#restart', '#ending-restart']) $(id).addEventListener('click', restartGame);

document.addEventListener('keydown', (event) => {
  if (screen !== 'game') return;
  const direction = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }[event.key];
  if (state.mode === 'explore' && direction) { event.preventDefault(); doMove(direction); return; }
  if (state.mode === 'explore' && (event.key === ' ' || event.key === 'e')) { event.preventDefault(); doInteract(); return; }
  if (state.mode === 'dialogue' && event.key === 'Enter' && state.dialogue.kind !== 'refugees') { event.preventDefault(); state = chooseDialogue(state, 'continue'); render(); return; }
  if (state.mode === 'battle') {
    const action = { '1': 'strike', '2': 'break', '3': 'guard', '4': 'item', '5': 'escape' }[event.key];
    if (action) { event.preventDefault(); void doBattle(action); }
  }
});

render();
renderScreen();
