export function initialScreen() {
  return 'title';
}

export function nextScreen(current, action) {
  if (current === 'title' && action === 'start') return 'intro';
  if (current === 'title' && action === 'instructions') return 'instructions';
  if (current === 'instructions' && action === 'back') return 'title';
  if (current === 'intro' && (action === 'finish' || action === 'skip')) return 'game';
  if (current === 'game' && action === 'home') return 'title';
  return current;
}
