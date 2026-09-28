export const SCENES = {
  road: { name: '荒山驿道', image: 'assets/scenes/mountain-road-concept-v1.png', start: { x: 2, y: 6 } },
  ferry: { name: '乌篷渡', image: 'assets/scenes/wupeng-ferry-concept-v1.png', start: { x: 9, y: 9 } },
  tavern: { name: '渡口酒肆', image: 'assets/scenes/wine-shop-concept-v1.png', start: { x: 10, y: 10 } },
  dock: { name: '夜雨码头', image: 'assets/scenes/dock-concept-v1.png', start: { x: 3, y: 4 } },
};

export const SITES = {
  road: [{ id: 'cart', label: '废弃粮车', x: 5, y: 6 }, { id: 'ferry', label: '前往乌篷渡', x: 18, y: 6 }],
  ferry: [
    { id: 'road', label: '返回山道', x: 9, y: 10 },
    { id: 'tavern', label: '进入酒肆', x: 5, y: 3 },
    { id: 'ferryman', label: '老船工', x: 11, y: 6 },
    { id: 'dock', label: '前往码头', x: 16, y: 5 },
  ],
  tavern: [{ id: 'shen', label: '沈棠', x: 5, y: 4 }, { id: 'ferry', label: '返回渡口', x: 10, y: 10 }],
  dock: [{ id: 'ferry', label: '返回渡口', x: 3, y: 4 }, { id: 'cheng', label: '程砚', x: 11, y: 4 }],
};

const directions = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export function createInitialState() {
  return {
    scene: 'road', position: { ...SCENES.road.start }, facing: 'down', mode: 'explore',
    hero: { level: 1, xp: 0, hp: 42, maxHp: 42, qi: 6, maxQi: 6, herbs: 2, grain: 1 },
    flags: { cartSeen: false, shenStory: false, ferrymanRecognized: false, swordConfession: false },
    encounterCooldown: 4, battle: null, dialogue: null,
    message: '暮色将尽。师父留下的剑，指向乌篷渡。',
  };
}

export function experienceForNextLevel(level) {
  return 20 * level + (15 * (level - 1) * level) / 2;
}

export function awardExperience(hero, amount) {
  if (!Number.isInteger(amount) || amount < 0) throw new RangeError('经验值必须是非负整数');
  const next = { ...hero, xp: hero.xp + amount };
  while (next.xp >= experienceForNextLevel(next.level)) {
    next.level++;
    next.maxHp += 6;
    next.hp = Math.min(next.maxHp, next.hp + 6);
    next.maxQi++;
    next.qi = Math.min(next.maxQi, next.qi + 1);
  }
  return next;
}

export function objective(state) {
  if (!state.flags.cartSeen && state.scene === 'road') return '查看路旁粮车，沿驿道前往乌篷渡。';
  if (!state.flags.shenStory) return '到渡口酒肆寻找沈棠，问清赈粮旧事。';
  if (!state.flags.ferrymanRecognized) return '找老船工辨认师父留下的佩剑。';
  if (!state.flags.swordConfession) return '检查剑柄，读出藏在其中的供词。';
  return '前往夜雨码头，与程砚对质。';
}

export function nearbyInteraction(state) {
  if (state.mode !== 'explore') return null;
  const closest = SITES[state.scene]
    .map((site) => ({ ...site, distance: Math.abs(site.x - state.position.x) + Math.abs(site.y - state.position.y) }))
    .sort((a, b) => a.distance - b.distance)[0];
  return closest?.distance <= 2 ? closest : null;
}

export function isWalkable(scene, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 1 || x > 18 || y < 2 || y > 10) return false;
  if (scene === 'road') {
    const center = x <= 5 ? 6 : x <= 8 ? 5 : x <= 11 ? 4 : x <= 14 ? 5 : 6;
    return Math.abs(y - center) <= 1;
  }
  if (scene === 'ferry') {
    return (x >= 2 && x <= 14 && y >= 3 && y <= 8) ||
      (x >= 8 && x <= 11 && y >= 9) ||
      (x >= 15 && x <= 18 && y >= 4 && y <= 6);
  }
  if (scene === 'tavern') return x >= 2 && x <= 17 && y >= 3 && y <= 10;
  if (scene === 'dock') return (x >= 2 && x <= 12 && y >= 3 && y <= 6) ||
    (x >= 13 && x <= 16 && y >= 3 && y <= 5);
  return false;
}

function talk(state, lines, kind = 'story') {
  return {
    ...state, mode: 'dialogue',
    dialogue: { lines, index: 0, kind, partner: lines.find((line) => line.speaker !== '陆照')?.speaker ?? null },
    message: lines[0].text,
  };
}

export function currentDialogueLine(dialogue) {
  return dialogue.lines[dialogue.index];
}

function travel(state, scene) {
  return { ...state, scene, position: { ...SCENES[scene].start }, mode: 'explore', message: `来到${SCENES[scene].name}。` };
}

export function interact(state) {
  if (state.mode !== 'explore') return state;
  const site = nearbyInteraction(state);
  if (!site) return { ...state, message: '附近没有可以交谈或调查的地方。' };
  if (['road', 'ferry', 'tavern', 'dock'].includes(site.id)) return travel(state, site.id);
  if (site.id === 'cart') {
    return talk({ ...state, hero: state.flags.cartSeen ? state.hero : awardExperience(state.hero, 3), flags: { ...state.flags, cartSeen: true } }, [
      { speaker: '陆照', text: '车板上还留着官仓封泥，车辙却一路指向乌篷渡。' },
      { speaker: '陆照', text: '赈粮若真在这里卸过，师父让我还剑，恐怕是要我顺着这条路查下去。' },
    ]);
  }
  if (site.id === 'shen') {
    return talk({ ...state, hero: state.flags.shenStory ? state.hero : awardExperience(state.hero, 8), flags: { ...state.flags, shenStory: true } }, [
      { speaker: '陆照', text: '山路上有辆废粮车，还留着官仓封泥。十年前的粮船，真是令尊劫的吗？' },
      { speaker: '沈棠', text: '我爹沈渡把船拦在渡口。那夜水漫到屋檐，岸上还有几十口人等粮。' },
      { speaker: '陆照', text: '若是救人，为何案卷写他私吞赈粮？' },
      { speaker: '沈棠', text: '粮分完后，押运名册被人改了。爹认下罪名，只为让领粮的人活下来。' },
      { speaker: '陆照', text: '是谁改的名册？' },
      { speaker: '沈棠', text: '爹没说。去找老船工吧，他见过那夜上船的人，也许认得你这把剑。' },
    ]);
  }
  if (site.id === 'ferryman') {
    if (!state.flags.shenStory) return talk(state, [
      { speaker: '陆照', text: '老人家，你可认得这把剑？' },
      { speaker: '老船工', text: '剑鞘上的旧结眼熟。先去酒肆问问沈棠，听了她的话，你才知道该问我什么。' },
      { speaker: '陆照', text: '好。我问清十年前的粮船，再来见你。' },
    ]);
    return talk({ ...state, hero: state.flags.ferrymanRecognized ? state.hero : awardExperience(state.hero, 8), flags: { ...state.flags, ferrymanRecognized: true } }, [
      { speaker: '陆照', text: '沈棠让我来认剑。你见过我师父？' },
      { speaker: '老船工', text: '见过。那夜他登船时，剑鞘还挂着青崖门的旧结。' },
      { speaker: '陆照', text: '他为何一直不肯讲沈渡的事？' },
      { speaker: '老船工', text: '他亲眼见沈渡开仓救人，却没拦住后来改名册的人。' },
      { speaker: '陆照', text: '他把什么留下了？' },
      { speaker: '老船工', text: '看剑柄。你师父临走前缠了一层新皮，像在藏一张薄纸。' },
    ]);
  }
  if (site.id === 'cheng') {
    if (!state.flags.swordConfession) return talk(state, [
      { speaker: '程砚', text: '粮船今夜离渡。师弟，你要拦船，总得拿出凭据。' },
      { speaker: '陆照', text: '沈棠说，十年前的押运名册被人改过。' },
      { speaker: '程砚', text: '仅凭传闻，谁也不能停船。去查清旧案，再来见我。' },
    ]);
    return talk(state, [
      { speaker: '程砚', text: '粮船今夜离渡，师弟，让开。' },
      { speaker: '陆照', text: '师兄先看师父留在剑柄里的供词。沈渡开仓救人，他亲眼所见。' },
      { speaker: '程砚', text: '这字我认得。但一纸供词，还不足以改十年前的官案。' },
      { speaker: '陆照', text: '押运名册也被涂改。你守着的船，载的正是当年被扣下的余粮。' },
      { speaker: '程砚', text: '我奉命把粮送走。此刻停船，青崖门也会被牵进旧案。' },
      { speaker: '陆照', text: '那就让渡口的人看清真相。船不能再走。' },
      { speaker: '程砚', text: '你要拦我，就先试试手中的剑。' },
      { speaker: '陆照', text: '这一剑不是为争胜，是替沈渡和渡口百姓讨一句实话。' },
    ], 'boss');
  }
  return state;
}

export function inspectSword(state) {
  if (state.mode !== 'explore' || !state.flags.ferrymanRecognized) return state;
  return talk({ ...state, hero: state.flags.swordConfession ? state.hero : awardExperience(state.hero, 12), flags: { ...state.flags, swordConfession: true } }, [
    { speaker: '陆照', text: '剑柄的皮缠得太紧了。这里面果然藏着一张薄纸。' },
    { speaker: '陆照', text: '师父的字：沈渡开仓救人，我亲见。押运粮船之名册，另有涂改。' },
    { speaker: '陆照', text: '他把供词藏在剑里，是怕有人先一步毁掉它。该去码头见程砚了。' },
  ]);
}

export function chooseDialogue(state, choice) {
  if (state.mode !== 'dialogue') return state;
  const { dialogue } = state;
  if (choice === 'continue') {
    if (dialogue.index < dialogue.lines.length - 1) {
      const index = dialogue.index + 1;
      return { ...state, dialogue: { ...dialogue, index }, message: dialogue.lines[index].text };
    }
    if (dialogue.kind === 'boss') return startBattle(state, 'boss');
    return dialogue.kind === 'refugees' ? state : { ...state, mode: 'explore', dialogue: null };
  }
  if (dialogue.kind !== 'refugees' || dialogue.index !== dialogue.lines.length - 1) return state;
  if (choice === 'grain') {
    if (state.hero.grain < 1) return { ...state, message: '身上没有余粮。' };
    return { ...state, mode: 'explore', dialogue: null, hero: awardExperience({ ...state.hero, grain: state.hero.grain - 1 }, 6), message: '你留下口粮。流民让开山路，指了指渡口的方向。获得 6 点经验。' };
  }
  if (choice === 'persuade') {
    return { ...state, mode: 'explore', dialogue: null, hero: awardExperience(state.hero, 4), message: '你答应到渡口查清赈粮去向。流民迟疑片刻，让开了路。获得 4 点经验。' };
  }
  if (choice === 'fight') {
    return { ...startBattle(state, 'bandit'), message: '流民退开，藏在后面的山贼拔刀迎战。' };
  }
  return state;
}

export function move(state, direction, random = Math.random) {
  if (state.mode !== 'explore' || !directions[direction]) return state;
  const [dx, dy] = directions[direction];
  const x = state.position.x + dx;
  const y = state.position.y + dy;
  if (!isWalkable(state.scene, x, y)) return { ...state, facing: direction, message: '前面不能通行。' };
  let next = { ...state, position: { x, y }, facing: direction };
  if (state.scene !== 'road') return next;
  if (state.encounterCooldown > 0) return { ...next, encounterCooldown: state.encounterCooldown - 1 };
  if (random() >= 0.18) return next;
  next = { ...next, encounterCooldown: 6 };
  if (random() < 0.7) return startBattle(next, 'bandit');
  return talk(next, [
    { speaker: '拦路流民', text: '前面的粮车空了。我们只求一口吃的，你可有余粮？' },
    { speaker: '陆照', text: '你们从哪儿来？官府没有放粮吗？' },
    { speaker: '拦路流民', text: '说是赈粮到了渡口，等了几日却连一斗都没见着。孩子已饿得走不动了。' },
    { speaker: '陆照', text: '我正要去查那辆粮车。若有余粮，理该分到你们手里。' },
    { speaker: '拦路流民', text: '那就请你给个准话。眼下这口粮，还是渡口的消息，我们都等不起。' },
  ], 'refugees');
}

export function startBattle(state, kind) {
  if (!['bandit', 'boss'].includes(kind)) throw new RangeError('未知对手');
  const maxHp = kind === 'boss' ? 84 : 28;
  return {
    ...state, mode: 'battle', dialogue: null, encounterCooldown: 6,
    battle: { kind, enemyHp: maxHp, maxHp, round: 0, intent: 'probe' },
    message: kind === 'boss' ? '对质已尽。程砚横剑守在粮船前，陆照拔剑迎战。' : '山贼拔刀拦路。',
  };
}

function enemyDamage(battle) {
  return battle.kind === 'boss' ? (battle.intent === 'windup' ? 12 : 8) : (battle.intent === 'windup' ? 9 : 5);
}

export function resolveBattle(state, action, random = Math.random) {
  if (state.mode !== 'battle') return { state, timeline: [], text: '' };
  const { battle, hero } = state;
  if (action === 'escape' && battle.kind === 'boss') return { state: { ...state, message: '粮船就在眼前，不能退走。' }, timeline: [], text: '此战不能退走。' };
  if (action === 'break' && hero.qi < 2) return { state: { ...state, message: '内力不足，无法破招。' }, timeline: [], text: '内力不足。' };
  if (action === 'item' && hero.herbs < 1) return { state: { ...state, message: '药品已用尽。' }, timeline: [], text: '没有药品。' };
  if (!['strike', 'break', 'guard', 'item', 'escape'].includes(action)) return { state, timeline: [], text: '' };
  if (action === 'escape' && random() < 0.7) {
    return { state: { ...state, mode: 'explore', battle: null, message: '你借着山路脱身。' }, timeline: [], text: '退走成功。' };
  }

  const nextHero = { ...hero };
  let enemyHp = battle.enemyHp;
  let interrupted = false;
  let timeline = [];
  let text = '';
  if (action === 'strike') { enemyHp -= 7 + 2 * (hero.level - 1); timeline.push('hero-strike'); text = '陆照出剑，命中对手。'; }
  if (action === 'break') {
    nextHero.qi -= 2;
    enemyHp -= (battle.intent === 'windup' ? 9 : 5) + 2 * (hero.level - 1);
    interrupted = battle.intent === 'windup';
    timeline.push('hero-break');
    text = interrupted ? '陆照破开蓄势，打断了对手的招式。' : '陆照抢先破招。';
  }
  if (action === 'guard') { nextHero.qi = Math.min(nextHero.maxQi, nextHero.qi + 1); timeline.push('hero-guard'); text = '陆照收剑守势。'; }
  if (action === 'item') { nextHero.herbs -= 1; nextHero.hp = Math.min(nextHero.maxHp, nextHero.hp + 16); text = '陆照服下金疮药。'; }
  if (action === 'escape') text = '退路被山贼堵住。';

  if (enemyHp <= 0) {
    const mode = battle.kind === 'boss' ? 'ending' : 'explore';
    const gained = battle.kind === 'boss' ? 40 : 12;
    const rewardedHero = awardExperience(nextHero, gained);
    const message = battle.kind === 'boss'
      ? '程砚收剑。供词与名册终于能交到所有人面前，粮船也停了下来。'
      : '山贼弃刀退入山林。道路暂时安全了。';
    return { state: { ...state, mode, hero: rewardedHero, battle: null, message: `${message} 获得 ${gained} 点经验。` }, timeline, text: message };
  }
  if (!interrupted) {
    const damage = action === 'guard' ? Math.min(3, enemyDamage(battle)) : enemyDamage(battle);
    nextHero.hp = Math.max(0, nextHero.hp - damage);
    timeline.push(action === 'guard' ? 'enemy-guarded' : 'enemy-strike');
    text += ` 对手还击，陆照受到 ${damage} 点伤害。`;
  }
  if (nextHero.hp <= 0) {
    return { state: { ...state, hero: nextHero, mode: 'defeat', battle: null, message: '陆照倒下，旧案尚未昭雪。' }, timeline, text };
  }
  const round = battle.round + 1;
  return {
    state: { ...state, hero: nextHero, battle: { ...battle, enemyHp, round, intent: round % 3 === 1 ? 'windup' : 'probe' }, message: text },
    timeline, text,
  };
}
