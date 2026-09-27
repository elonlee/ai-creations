export function spectrumLevels(samples, barCount) {
  if (!samples.length || barCount < 1) return [];
  const usable = Math.min(samples.length, 256);
  return Array.from({ length: barCount }, (_, index) => {
    const start = Math.floor(index * usable / barCount);
    const end = Math.max(start + 1, Math.ceil((index + 1) * usable / barCount));
    let peak = 0;
    for (let bin = start; bin < end; bin += 1) peak = Math.max(peak, samples[bin]);
    return peak / 255;
  });
}

export function waveformPoints(samples, width, height, pointCount = 128) {
  if (!samples.length || pointCount < 1) return [];
  const count = Math.min(samples.length, pointCount);
  return Array.from({ length: count }, (_, index) => {
    const sample = samples[Math.round(index * (samples.length - 1) / Math.max(1, count - 1))];
    const y = Math.max(0, Math.min(height, height / 2 + (sample - 128) / 127 * height / 2));
    return [count === 1 ? width / 2 : width * index / (count - 1), y];
  });
}
