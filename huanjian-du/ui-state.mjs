import { experienceForNextLevel } from './game.mjs';

const levelWords = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const percentage = (value, total) => total > 0 ? Math.max(0, Math.min(100, value / total * 100)) : 0;

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
