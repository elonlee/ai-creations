import { SCENES, experienceForNextLevel } from './game.mjs';

const levelWords = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const percentage = (value, total) => total > 0 ? Math.max(0, Math.min(100, value / total * 100)) : 0;
const npcPortraits = {
  '沈棠': 'shen-tang',
  '老船工': 'old-ferryman',
  '程砚': 'cheng-yan',
  '拦路流民': 'road-refugee',
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
