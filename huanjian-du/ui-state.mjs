import { CHARACTERS as characters, GAME_TITLE } from './identity.mjs';
import { SCENES, experienceForNextLevel } from './game.mjs';

const levelWords = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const percentage = (value, total) => total > 0 ? Math.max(0, Math.min(100, value / total * 100)) : 0;
const npcPortraits = {
  [characters.shen]: 'shen-tang',
  [characters.ferryman]: 'old-ferryman',
  [characters.cheng]: 'cheng-yan',
  [characters.refugee]: 'road-refugee',
};

export function dialoguePortraits(partner) {
  return {
    hero: 'assets/portraits/lu-zhao-v1.png',
    npc: npcPortraits[partner] ? `assets/portraits/${npcPortraits[partner]}-v1-mirrored.png` : null,
  };
}

export function dialogueBackdrop(scene) {
  return SCENES[scene]?.image ?? null;
}

export function dialogueControls(dialogue) {
  if (dialogue.kind === 'refugees' && dialogue.index === dialogue.lines.length - 1) {
    return {
      canAdvance: false,
      choices: [['grain', '留下一份口粮'], ['persuade', '答应调查粮车'], ['fight', '拔剑动武']],
    };
  }
  return { canAdvance: true, choices: [] };
}

export function endingPresentation(state) {
  const progress = `${characters.hero} · ${state.hero.level} 级 · 累计经验 ${state.hero.xp}`;
  if (state.mode === 'ending') {
    return {
      scene: SCENES.dock.image,
      kind: 'victory',
      kicker: `${GAME_TITLE} · 第一章终`,
      title: '粮船停在了渡口',
      lead: '雨夜里，剑锋终于替十年前的冤案留住了这艘船。',
      paragraphs: [
        `${characters.cheng}收剑，粮船停泊。仓中的余粮留在渡口，岸上等粮的人终于不必再空手而归。`,
        `${characters.hero}把师父的供词交给${characters.shen}。${characters.ferryman}愿意作证：${characters.shenDu}当年开仓，是为了救被困在洪水中的人。`,
        `可押运名册仍有涂改。是谁改了名字，又是谁扣下余粮？${characters.hero}收起旧剑，决定沿粮船的来路继续查。`,
      ],
      next: '旧案未结 · 江湖再会',
      progress,
      action: '再走一遍',
    };
  }
  return {
    scene: SCENES[state.scene].image,
    kind: 'defeat',
    kicker: `${GAME_TITLE} · 此行未竟`,
    title: '剑还没有送到',
    lead: `${characters.hero}倒下了，十年前的赈粮旧案仍等着有人查明。`,
    paragraphs: [
      '山路与渡口都还在。歇一口气，再循着师父留下的线索出发。',
    ],
    next: '故事尚未结束',
    progress,
    action: '重新再来',
  };
}

export function heroStatus(hero) {
  const previous = hero.level === 1 ? 0 : experienceForNextLevel(hero.level - 1);
  const next = experienceForNextLevel(hero.level);
  return {
    level: `${levelWords[hero.level] ?? hero.level}级`,
    hp: `${hero.hp} / ${hero.maxHp}`,
    qi: `${hero.qi} / ${hero.maxQi}`,
    xp: `${hero.xp} / ${next}`,
    hpPercent: percentage(hero.hp, hero.maxHp),
    qiPercent: percentage(hero.qi, hero.maxQi),
    xpPercent: percentage(hero.xp - previous, next - previous),
    herbs: `金疮药 × ${hero.herbs}`,
    grain: `口粮 × ${hero.grain}`,
  };
}
