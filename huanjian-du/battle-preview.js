import { CHARACTERS as characters, GAME_TITLE } from './identity.mjs';
import { createAnimationPlayer, frameSource, previewMoves } from './battle-animation.mjs';

const identityLabels = { ...characters, title: GAME_TITLE };
document.querySelectorAll('[data-identity]').forEach((element) => {
  element.textContent = identityLabels[element.dataset.identity];
});
document.title = `《${GAME_TITLE}》战斗画面设计稿`;

const battleScreen = document.querySelector('.battle-screen');
const sceneButtons = [...document.querySelectorAll('[data-scene-button]')];
const actionButtons = [...document.querySelectorAll('[data-action]')];
const heroImage = document.querySelector('#hero-image');
const enemyImage = document.querySelector('#enemy-image');

const scenes = {
  road: {
    name: '荒山驿道',
    time: '暮色',
    enemy: characters.bandit,
    hp: '气血 28 / 28',
    intent: '架势：试探',
    image: 'assets/battle/road-bandit-stance-v1.png',
    actor: 'road-bandit',
    line: '山贼按住刀柄，拦在去渡口的路上。',
  },
  dock: {
    name: '乌篷渡码头',
    time: '夜雨',
    enemy: characters.cheng,
    hp: '气血 84 / 84',
    intent: '下一式：回风挑灯',
    image: 'assets/battle/cheng-yan-stance-v1.png',
    actor: 'cheng-yan',
    line: `${characters.cheng}横剑而立，身后是即将离岸的粮船。`,
  },
};

const animationPlayer = createAnimationPlayer({
  render: (slot, source) => {
    (slot === 'hero' ? heroImage : enemyImage).src = source;
  },
  wait: (duration) => new Promise((resolve) => setTimeout(resolve, duration)),
  idle: { hero: heroImage.getAttribute('src'), enemy: enemyImage.getAttribute('src') },
});

for (const actor of ['lu-zhao', 'road-bandit', 'cheng-yan']) {
  for (const action of ['attack', 'guard', 'hit']) {
    for (let index = 0; index < 4; index++) {
      const image = new Image();
      image.src = frameSource(actor, action, index);
    }
  }
}

const actionNotes = {
  strike: '出剑：稳妥的一击，不消耗内力。',
  break: '破招：消耗 2 点内力，打断正在蓄势的招式。',
  guard: '守势：减少本回合受到的伤害，恢复 1 点内力。',
  item: '物品：使用随身药品或其他道具。',
  escape: '退走：仅普通遭遇战可以尝试离开。',
};

function selectAction(action, preview = true) {
  for (const button of actionButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.action === action));
  }
  document.querySelector('#action-note').textContent = actionNotes[action];

  if (!preview) return;
  const enemy = scenes[battleScreen.dataset.scene].actor;
  const moves = previewMoves(action, enemy);
  if (moves.length) void animationPlayer.play(moves);
  else animationPlayer.reset();
}

function selectScene(scene) {
  const data = scenes[scene];
  animationPlayer.reset({ hero: 'assets/battle/lu-zhao-stance-v1.png', enemy: data.image });
  battleScreen.dataset.scene = scene;
  document.querySelector('#scene-name').textContent = data.name;
  document.querySelector('#scene-time').textContent = data.time;
  document.querySelector('#enemy-name').textContent = data.enemy;
  document.querySelector('#enemy-hp-text').textContent = data.hp;
  document.querySelector('#enemy-intent').textContent = data.intent;
  document.querySelector('#battle-line').textContent = data.line;

  for (const button of sceneButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.sceneButton === scene));
  }

  const escapeButton = document.querySelector('[data-action="escape"]');
  escapeButton.disabled = scene === 'dock';
  if (scene === 'dock' && escapeButton.getAttribute('aria-pressed') === 'true') {
    selectAction('strike', false);
  }
}

for (const button of sceneButtons) {
  button.addEventListener('click', () => selectScene(button.dataset.sceneButton));
}

for (const button of actionButtons) {
  button.addEventListener('click', () => selectAction(button.dataset.action));
}

document.querySelector('#preview-enemy-strike').addEventListener('click', () => {
  for (const button of actionButtons) button.setAttribute('aria-pressed', 'false');
  document.querySelector('#action-note').textContent = `敌方出招预览：${characters.hero}没有摆守势，受到攻击。`;
  void animationPlayer.play(previewMoves('enemy-strike', scenes[battleScreen.dataset.scene].actor));
});
