import { SCENES, SITES, createInitialState, move, nearbyInteraction, interact, inspectSword, chooseDialogue, currentDialogueLine, resolveBattle, objective } from './game.mjs';
import { createAnimationPlayer, previewMoves } from './battle-animation.mjs';
import { initialScreen, nextScreen } from './menu.mjs';
import { INTRO_LINES, nextIntroIndex } from './intro.mjs';
import { heroStatus, dialoguePortraits, dialogueBackdrop, dialogueControls, endingPresentation } from './ui-state.mjs';
import { debugScenarioFromUrl } from './debug.mjs';

const $ = (selector) => document.querySelector(selector);
const debugScenario = debugScenarioFromUrl(window.location.href);
let state = debugScenario?.state ?? createInitialState();
let screen = debugScenario?.screen ?? initialScreen();
let busy = false;
let stepFrame = false;
let walkTimer;
let introIndex = 0;
let introTimer;

const battleActor = { bandit: 'road-bandit', boss: 'cheng-yan' };
const battleIdle = { bandit: 'assets/battle/road-bandit-stance-v1.png', boss: 'assets/battle/cheng-yan-stance-v1.png' };
const facingRow = { down: 0, left: 3, right: 6, up: 9 };

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
  const status = heroStatus(hero);
  $('#hero-level').textContent = status.level;
  $('#hero-hp').textContent = status.hp;
  $('#hero-qi').textContent = status.qi;
  $('#hero-xp').textContent = status.xp;
  $('#hp-fill').style.width = `${status.hpPercent}%`;
  $('#qi-fill').style.width = `${status.qiPercent}%`;
  $('#xp-fill').style.width = `${status.xpPercent}%`;
  $('#hero-herbs').textContent = status.herbs;
  $('#hero-grain').textContent = status.grain;
  $('#objective').textContent = objective(state);
  $('#inspect-sword').hidden = state.mode !== 'explore' || !state.flags.ferrymanRecognized || state.flags.swordConfession;
}

function renderDialogue() {
  const visible = state.mode === 'dialogue';
  $('#dialogue').hidden = !visible;
  if (!visible) return;
  const { partner, index, lines } = state.dialogue;
  const line = currentDialogueLine(state.dialogue);
  const { canAdvance, choices } = dialogueControls(state.dialogue);
  const portraits = dialoguePortraits(partner);
  $('#dialogue').style.backgroundImage = `url('${dialogueBackdrop(state.scene)}')`;
  $('#dialogue-speaker').textContent = line.speaker;
  $('#dialogue-text').textContent = line.text;
  $('#dialogue-progress').textContent = `${index + 1} / ${lines.length}${canAdvance ? ' · 点击继续' : ''}`;
  $('#dialogue-hero-portrait').src = portraits.hero;
  $('#dialogue-hero').classList.toggle('speaking', line.speaker === '陆照');
  $('#dialogue-npc').hidden = !portraits.npc;
  if (portraits.npc) {
    $('#dialogue-npc-portrait').src = portraits.npc;
    $('#dialogue-npc-portrait').alt = `${partner}立绘`;
    $('#dialogue-npc-name').textContent = partner;
    $('#dialogue-npc').classList.toggle('speaking', line.speaker === partner);
  }
  const copy = $('#dialogue-copy');
  copy.classList.toggle('can-advance', canAdvance);
  copy.tabIndex = canAdvance ? 0 : -1;
  if (canAdvance) {
    copy.setAttribute('role', 'button');
    copy.setAttribute('aria-label', '继续对话');
  } else {
    copy.removeAttribute('role');
    copy.removeAttribute('aria-label');
  }
  $('#dialogue-options').replaceChildren(...choices.map(([id, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.dataset.choice = id;
    button.disabled = id === 'grain' && state.hero.grain < 1;
    button.addEventListener('click', () => { state = chooseDialogue(state, id); render(); });
    return button;
  }));
  if (canAdvance) copy.focus();
  else $('#dialogue-options button:not([disabled])')?.focus();
}

function renderBattle() {
  const visible = state.mode === 'battle';
  $('#battle').hidden = !visible;
  if (!visible) return;
  const { battle } = state;
  const status = heroStatus(state.hero);
  $('#battle-scene').textContent = SCENES[state.scene].name;
  $('#battle-round').textContent = `第 ${battle.round + 1} 回合`;
  $('#battle-arena').style.backgroundImage = `url('${SCENES[state.scene].image}')`;
  $('#battle-hero-level').textContent = status.level;
  $('#battle-hero-hp').textContent = status.hp;
  $('#battle-hero-qi').textContent = status.qi;
  $('#battle-hero-xp').textContent = `经验 ${status.xp}`;
  $('#battle-hp-fill').style.width = `${status.hpPercent}%`;
  $('#battle-qi-fill').style.width = `${status.qiPercent}%`;
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
  const ending = endingPresentation(state);
  $('#ending').dataset.result = ending.kind;
  $('#ending').style.backgroundImage = `linear-gradient(90deg, #07161af5 0%, #0a1c20e8 47%, #0a1a1bb0 100%), url('${ending.scene}')`;
  $('#ending-kicker').textContent = ending.kicker;
  $('#ending-title').textContent = ending.title;
  $('#ending-lead').textContent = ending.lead;
  $('#ending-epilogue').replaceChildren(...ending.paragraphs.map((line) => {
    const paragraph = document.createElement('p');
    paragraph.textContent = line;
    return paragraph;
  }));
  $('#ending-next').textContent = ending.next;
  $('#ending-level').textContent = ending.progress;
  $('#ending-restart').textContent = ending.action;
  $('#ending').scrollTop = 0;
  $('#ending-title').focus({ preventScroll: true });
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
  $('#intro-screen').hidden = screen !== 'intro';
  $('#game-shell').hidden = screen !== 'game';
  if (screen === 'title') $('#menu-start').focus();
  if (screen === 'instructions') $('#instructions-back').focus();
  if (screen === 'intro') $('#intro-screen').focus();
  if (screen === 'game') $('#map').focus();
}

function showIntroLine() {
  const caption = $('#intro-caption');
  caption.classList.remove('appear');
  caption.textContent = INTRO_LINES[introIndex];
  $('#intro-count').textContent = `第 ${introIndex + 1} / ${INTRO_LINES.length} 段`;
  $('#intro-next').textContent = introIndex === INTRO_LINES.length - 1 ? '进入游戏' : '继续';
  void caption.offsetWidth;
  caption.classList.add('appear');
  clearTimeout(introTimer);
  introTimer = setTimeout(advanceIntro, 3400);
}

function finishIntro(action) {
  if (screen !== 'intro') return;
  clearTimeout(introTimer);
  screen = nextScreen(screen, action);
  renderScreen();
  render();
}

function advanceIntro() {
  if (screen !== 'intro') return;
  const next = nextIntroIndex(introIndex);
  if (next === null) finishIntro('finish');
  else { introIndex = next; showIntroLine(); }
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
  introIndex = 0;
  renderScreen();
  showIntroLine();
});
$('#menu-instructions').addEventListener('click', () => { screen = nextScreen(screen, 'instructions'); renderScreen(); });
$('#instructions-back').addEventListener('click', () => { screen = nextScreen(screen, 'back'); renderScreen(); });
$('#intro-next').addEventListener('click', advanceIntro);
$('#intro-skip').addEventListener('click', () => finishIntro('skip'));
$('#return-title').addEventListener('click', () => {
  if (busy) return;
  animation.reset();
  screen = nextScreen(screen, 'home');
  renderScreen();
});
$('#ending-home').addEventListener('click', () => {
  screen = nextScreen(screen, 'home');
  renderScreen();
});
$('#interact').addEventListener('click', doInteract);
$('#dialogue-copy').addEventListener('click', (event) => {
  if (event.target.closest('button') || state.mode !== 'dialogue') return;
  if (!dialogueControls(state.dialogue).canAdvance) return;
  state = chooseDialogue(state, 'continue');
  render();
});
$('#inspect-sword').addEventListener('click', () => { state = inspectSword(state); render(); });
for (const id of ['#restart', '#ending-restart']) $(id).addEventListener('click', restartGame);

document.addEventListener('keydown', (event) => {
  if (screen === 'intro') {
    if (event.key === 'Escape') { event.preventDefault(); finishIntro('skip'); }
    else if ([' ', 'Enter', 'ArrowRight'].includes(event.key) && !event.target.closest('button')) {
      event.preventDefault();
      advanceIntro();
    }
    return;
  }
  if (screen !== 'game') return;
  const direction = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }[event.key];
  if (state.mode === 'explore' && direction) { event.preventDefault(); doMove(direction); return; }
  if (state.mode === 'explore' && (event.key === ' ' || event.key === 'e')) { event.preventDefault(); doInteract(); return; }
  if (state.mode === 'dialogue' && (event.key === 'Enter' || event.key === ' ') && !event.target.closest('button') && dialogueControls(state.dialogue).canAdvance) {
    event.preventDefault();
    state = chooseDialogue(state, 'continue');
    render();
    return;
  }
  if (state.mode === 'battle') {
    const action = { '1': 'strike', '2': 'break', '3': 'guard', '4': 'item', '5': 'escape' }[event.key];
    if (action) { event.preventDefault(); void doBattle(action); }
  }
});

renderScreen();
render();
if (screen === 'intro') showIntroLine();
