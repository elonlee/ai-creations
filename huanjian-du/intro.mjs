import { CHARACTERS as characters } from './identity.mjs';
export const INTRO_LINES = [
  '十年前，乌篷渡大水封江。',
  `一船赈粮失了踪，${characters.shenDu}被认作劫粮之人。`,
  `十年后，${characters.hero}接过师父留下的旧剑。`,
  '师父只留下一句话：把剑送回乌篷渡。',
  `山路渐暗，${characters.hero}在废弃的粮车前停下脚步。`,
];

export function nextIntroIndex(index) {
  return Number.isInteger(index) && index >= 0 && index < INTRO_LINES.length - 1 ? index + 1 : null;
}
