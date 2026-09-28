const actors = new Set(['lu-zhao', 'road-bandit', 'cheng-yan']);
const actions = new Set(['attack', 'guard', 'hit']);
const frameDurations = [110, 130, 170, 110];

export function previewMoves(command, enemyActor) {
  if (command === 'strike') {
    return [
      { slot: 'hero', actor: 'lu-zhao', action: 'attack' },
      { slot: 'enemy', actor: enemyActor, action: 'hit', delayFrames: 2 },
    ];
  }
  if (command === 'break') {
    return [
      { slot: 'hero', actor: 'lu-zhao', action: 'attack' },
      { slot: 'enemy', actor: enemyActor, action: 'guard' },
    ];
  }
  if (command === 'guard') {
    return [
      { slot: 'hero', actor: 'lu-zhao', action: 'guard' },
      { slot: 'enemy', actor: enemyActor, action: 'attack' },
    ];
  }
  if (command === 'enemy-strike') {
    return [
      { slot: 'enemy', actor: enemyActor, action: 'attack' },
      { slot: 'hero', actor: 'lu-zhao', action: 'hit', delayFrames: 2 },
    ];
  }
  return [];
}

export function frameSource(actor, action, index) {
  if (!actors.has(actor) || !actions.has(action) || !Number.isInteger(index) || index < 0 || index > 3) {
    throw new RangeError('未知的战斗动画帧');
  }
  return `assets/battle/animations/${actor}-${action}-${index}.png`;
}

export function createAnimationPlayer({ render, wait, idle }) {
  let generation = 0;
  let idleImages = idle;

  function showIdle() {
    for (const [slot, source] of Object.entries(idleImages)) render(slot, source);
  }

  return {
    async play(moves) {
      const current = ++generation;
      for (const { slot, delayFrames = 0 } of moves) {
        if (delayFrames > 0) render(slot, idleImages[slot]);
      }
      const totalFrames = Math.max(4, ...moves.map(({ delayFrames = 0 }) => delayFrames + 4));
      for (let tick = 0; tick < totalFrames; tick++) {
        for (const { slot, actor, action, delayFrames = 0 } of moves) {
          const index = tick - delayFrames;
          if (index >= 0 && index < 4) render(slot, frameSource(actor, action, index));
          if (index === 4) render(slot, idleImages[slot]);
        }
        await wait(frameDurations[tick] ?? 130);
        if (current !== generation) return;
      }
      showIdle();
    },
    reset(nextIdle = idleImages) {
      generation++;
      idleImages = nextIdle;
      showIdle();
    },
  };
}
