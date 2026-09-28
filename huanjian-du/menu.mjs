export function initialScreen() {
  return 'title';
}

export function nextScreen(current, action) {
  if (current === 'title' && action === 'start') return 'game';
  if (current === 'title' && action === 'instructions') return 'instructions';
  if (current === 'instructions' && action === 'back') return 'title';
  if (current === 'game' && action === 'home') return 'title';
  return current;
}
