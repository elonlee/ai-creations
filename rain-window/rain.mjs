const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createRainLayers(width, height, settings, random = Math.random) {
  const density = clamp(settings.density, 0, 1);
  const scale = (0.5 + settings.size * 0.8) * settings.scale;
  const area = width * height;
  const microCount = Math.min(7000, Math.round(area / 130 * density));
  const beadCount = Math.min(1000, Math.round(area / 1100 * density));
  const runnerCount = density === 0 ? 0 : Math.round(3 + density * 22);
  const at = (r, moving = false) => ({
    x: random() * width, y: random() * height, r,
    aspect: 0.88 + random() * 0.55, tilt: (random() - 0.5) * 0.18,
    moving, velocity: 12 + random() * 45, wobble: random() * 2 - 1,
    trailLength: 0
  });
  const micro = Array.from({ length: microCount }, () => at(Math.min(1.1, (0.34 + random() ** 2 * 0.95) * scale)));
  const beads = Array.from({ length: beadCount }, () => at(Math.min(2.2, (0.9 + random() * 1.2) * scale)));
  const runners = Array.from({ length: runnerCount }, () => {
    const drop = at(Math.min(14, (3.5 + random() * 7.5) * scale), true);
    drop.trailLength = settings.trails * (2 + random() * 8);
    return drop;
  });
  return { micro, beads, runners };
}

export function lensSourceRect(image, viewport, drop, refraction) {
  const cover = Math.max(viewport.width / image.width, viewport.height / image.height) * 1.045;
  const offsetX = (viewport.width - image.width * cover) / 2;
  const offsetY = (viewport.height - image.height * cover) / 2;
  const focus = 1 + clamp(refraction, 0, 1) * 0.35;
  const sw = Math.min(image.width, Math.max(1, drop.r * 2 / cover / focus));
  const sh = Math.min(image.height, Math.max(1, drop.r * 2.7 / cover / focus));
  const centerX = (drop.x - offsetX) / cover;
  const centerY = (drop.y - offsetY) / cover;
  return {
    sx: clamp(centerX - sw / 2 + drop.r * 0.22 / cover, 0, image.width - sw),
    sy: clamp(centerY - sh / 2 + drop.r * 0.32 / cover, 0, image.height - sh),
    sw, sh
  };
}
