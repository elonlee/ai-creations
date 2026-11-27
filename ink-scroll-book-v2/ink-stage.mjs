import { getAtmosphereState, getGanZhiLabel, layoutSealCharacters } from './scene.mjs';

const ART_SOURCES = {
  mountains: '../ink-scroll-book/assets/mountains.jpg',
  rainBridge: '../ink-scroll-book/assets/rain-bridge.jpg',
  returnBoat: '../ink-scroll-book/assets/return-boat.jpg',
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function createRng(seedValue = 90210) {
  let seed = seedValue >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Draws an artwork image anchored at a normalized focus (focusX, focusY) with cover+zoom framing.
 */
function drawFramedArt(ctx, img, width, height, camera, pointerX, pointerY, alpha) {
  if (!img || alpha <= 0.005) return;
  const imgRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
  const viewRatio = width / Math.max(1, height);

  let baseW;
  let baseH;
  if (viewRatio > imgRatio) {
    baseW = width;
    baseH = width / imgRatio;
  } else {
    baseH = height;
    baseW = height * imgRatio;
  }

  const drawW = baseW * camera.zoom;
  const drawH = baseH * camera.zoom;
  const maxOffsetX = Math.max(0, drawW - width);
  const maxOffsetY = Math.max(0, drawH - height);

  const offsetX = -clamp(camera.focusX, 0, 1) * maxOffsetX + pointerX * 16;
  const offsetY = -clamp(camera.focusY, 0, 1) * maxOffsetY + pointerY * 9;

  const clampedX = clamp(offsetX, -maxOffsetX, 0);
  const clampedY = clamp(offsetY, -maxOffsetY, 0);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, clampedX, clampedY, drawW, drawH);
  ctx.restore();
}

export function createInkStage(canvas, minimapCanvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const miniCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const rng = createRng(202611);

  const images = {
    mountains: null,
    rainBridge: null,
    returnBoat: null,
  };

  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = 0;
  let lastTime = 0;

  let targetPos = 0;
  let smoothPos = 0;
  let pointerX = 0;
  let pointerY = 0;
  let smoothPointerX = 0;
  let smoothPointerY = 0;
  let nightMode = false;
  let panoramaMode = false;

  // Panorama state: normalized horizontal scroll 0..1 and zoom 1..2.1
  let panTarget = 0.32;
  let panCurrent = 0.32;
  let panZoomTarget = 1.08;
  let panZoomCurrent = 1.08;

  // Living particles
  const rainDrops = Array.from({ length: 130 }, () => ({
    x: rng(),
    y: rng(),
    len: 14 + rng() * 26,
    speed: 0.42 + rng() * 0.45,
    alpha: 0.14 + rng() * 0.24,
  }));

  const clouds = Array.from({ length: 14 }, (_, i) => ({
    x: rng(),
    y: 0.26 + (i % 5) * 0.11 + rng() * 0.05,
    rx: 0.14 + rng() * 0.18,
    ry: 0.035 + rng() * 0.045,
    speed: 0.005 + rng() * 0.009,
    alpha: 0.14 + rng() * 0.18,
    phase: rng() * Math.PI * 2,
  }));

  const birds = Array.from({ length: 7 }, (_, i) => ({
    baseX: 0.62 + i * 0.025 + rng() * 0.015,
    baseY: 0.17 + (i % 3) * 0.022 + rng() * 0.01,
    span: 5 + rng() * 4,
    phase: rng() * Math.PI * 2,
    speed: 0.008 + rng() * 0.004,
  }));

  const motes = Array.from({ length: 42 }, () => ({
    x: rng(),
    y: rng(),
    r: 0.9 + rng() * 2.1,
    vx: (rng() - 0.5) * 0.008,
    vy: -0.004 - rng() * 0.01,
    phase: rng() * Math.PI * 2,
  }));

  const waterfallSpray = Array.from({ length: 34 }, () => ({
    x: 0.855 + (rng() - 0.5) * 0.03,
    y: 0.28 + rng() * 0.26,
    speed: 0.08 + rng() * 0.12,
    r: 1.4 + rng() * 3.5,
    alpha: 0.12 + rng() * 0.22,
  }));

  const autoRipples = [];
  const interactiveRipples = [];
  let nextAutoRippleAt = 0;

  function resize() {
    if (!ctx) return;
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (minimapCanvas && miniCtx) {
      const mW = 300;
      const mH = 58;
      minimapCanvas.width = mW * dpr;
      minimapCanvas.height = mH * dpr;
      miniCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (motionQuery.matches) renderFrame(performance.now(), 0.016);
  }

  function spawnRipple(normX, normY, maxRadius = 46, isCinnabar = false) {
    interactiveRipples.push({
      x: normX,
      y: normY,
      radius: 3,
      maxRadius,
      alpha: isCinnabar ? 0.42 : 0.34,
      isCinnabar,
    });
    if (interactiveRipples.length > 28) interactiveRipples.shift();
  }

  function drawPaperBase() {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    if (nightMode) {
      grad.addColorStop(0, '#2a312e');
      grad.addColorStop(0.55, '#202624');
      grad.addColorStop(1, '#141918');
    } else {
      grad.addColorStop(0, '#f3efe4');
      grad.addColorStop(0.6, '#ece5d6');
      grad.addColorStop(1, '#e5ddcb');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function applyNightTonePass(scene) {
    if (!nightMode) return;
    // Multiply deep moonlit celadon-slate over the paper while preserving dark ink silhouettes
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const moonGrad = ctx.createRadialGradient(
      width * 0.72,
      height * 0.24,
      width * 0.05,
      width * 0.6,
      height * 0.5,
      Math.max(width, height) * 0.92,
    );
    moonGrad.addColorStop(0, 'rgba(132, 148, 142, 0.92)');
    moonGrad.addColorStop(0.45, 'rgba(66, 78, 75, 0.95)');
    moonGrad.addColorStop(1, 'rgba(34, 41, 40, 0.98)');
    ctx.fillStyle = moonGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // Subtle soft lantern/moon warmth around evening boat or quiet bridge
    if (scene.sunGlow > 0.08 || scene.waterShimmer > 0.35) {
      ctx.save();
      const warmX = width * (scene.sunGlow > 0.2 ? 0.35 : 0.68);
      const warmY = height * 0.48;
      const warmGlow = ctx.createRadialGradient(warmX, warmY, 10, warmX, warmY, width * 0.35);
      warmGlow.addColorStop(0, `rgba(218, 148, 92, ${0.14 * Math.max(scene.sunGlow, 0.35)})`);
      warmGlow.addColorStop(1, 'rgba(218, 148, 92, 0)');
      ctx.fillStyle = warmGlow;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  function drawStitchedPanorama(scrollNorm, zoom) {
    const order = [images.rainBridge, images.mountains, images.returnBoat].filter(Boolean);
    if (order.length === 0) return null;

    const panelHeights = height * zoom;
    const panels = order.map((img) => {
      const ratio = img.naturalWidth / Math.max(1, img.naturalHeight);
      return { img, width: panelHeights * ratio, height: panelHeights };
    });

    const overlap = Math.min(width * 0.28, 300 * zoom);
    const totalWidth = panels.reduce((sum, p, i) => sum + p.width - (i > 0 ? overlap : 0), 0);
    const maxPan = Math.max(0, totalWidth - width);
    const offsetX = -clamp(scrollNorm, 0, 1) * maxPan + smoothPointerX * 14;
    const offsetY = -(panelHeights - height) * 0.56 + smoothPointerY * 8;
    const clampedY = clamp(offsetY, -(panelHeights - height), 0);

    let cursorX = offsetX;
    for (let i = 0; i < panels.length; i += 1) {
      const panel = panels[i];
      if (cursorX + panel.width >= -40 && cursorX <= width + 40) {
        if (i === 0) {
          ctx.drawImage(panel.img, cursorX, clampedY, panel.width, panel.height);
        } else {
          const overlapPx = Math.min(overlap, panel.width * 0.5);
          const bodyX = cursorX + overlapPx;
          const bodyW = panel.width - overlapPx;
          const srcOverlapW = panel.img.naturalWidth * (overlapPx / panel.width);

          // Draw non-overlapping right body cleanly
          if (bodyW > 0) {
            ctx.drawImage(
              panel.img,
              srcOverlapW,
              0,
              panel.img.naturalWidth - srcOverlapW,
              panel.img.naturalHeight,
              bodyX,
              clampedY,
              bodyW,
              panel.height,
            );
          }

          // Smoothstep strip-by-strip alpha feather directly on main canvas (no offscreen artifacts)
          const slices = 40;
          const sliceDestW = overlapPx / slices;
          const sliceSrcW = srcOverlapW / slices;
          ctx.save();
          for (let s = 0; s < slices; s += 1) {
            const t = (s + 0.5) / slices;
            const eased = t * t * (3 - 2 * t);
            ctx.globalAlpha = eased;
            ctx.drawImage(
              panel.img,
              s * sliceSrcW,
              0,
              sliceSrcW + 0.6,
              panel.img.naturalHeight,
              cursorX + s * sliceDestW,
              clampedY,
              sliceDestW + 0.8,
              panel.height,
            );
          }
          ctx.restore();

          // Soft xuan-mist breath over the seam transition to dissolve foliage edges gently
          const mistSpan = overlapPx * 1.15;
          const mistCenter = cursorX + overlapPx * 0.52;
          const veil = ctx.createLinearGradient(mistCenter - mistSpan * 0.5, 0, mistCenter + mistSpan * 0.5, 0);
          const mistRGB = nightMode ? '32, 38, 36' : '241, 236, 224';
          veil.addColorStop(0, `rgba(${mistRGB}, 0)`);
          veil.addColorStop(0.5, `rgba(${mistRGB}, ${nightMode ? 0.36 : 0.42})`);
          veil.addColorStop(1, `rgba(${mistRGB}, 0)`);
          ctx.fillStyle = veil;
          ctx.fillRect(mistCenter - mistSpan * 0.5, 0, mistSpan, height);
        }
      }
      cursorX += panel.width - overlap;
    }

    return { totalWidth, maxPan, scrollNorm };
  }

  function drawMinimap(panoInfo) {
    if (!miniCtx || !minimapCanvas || !panoInfo) return;
    const mW = 300;
    const mH = 58;
    miniCtx.clearRect(0, 0, mW, mH);
    miniCtx.fillStyle = nightMode ? '#1c211f' : '#efe9da';
    miniCtx.fillRect(0, 0, mW, mH);

    const order = [images.rainBridge, images.mountains, images.returnBoat].filter(Boolean);
    if (order.length > 0) {
      const segW = mW / order.length;
      order.forEach((img, idx) => {
        miniCtx.save();
        miniCtx.globalAlpha = nightMode ? 0.62 : 0.9;
        miniCtx.drawImage(img, idx * segW, 0, segW, mH);
        miniCtx.restore();
      });
    }

    const viewFrac = clamp(width / Math.max(width, panoInfo.totalWidth), 0.14, 1);
    const boxW = mW * viewFrac;
    const boxX = clamp(panoInfo.scrollNorm, 0, 1) * (mW - boxW);
    miniCtx.fillStyle = 'rgba(166, 74, 55, 0.14)';
    miniCtx.fillRect(boxX, 2, boxW, mH - 4);
    miniCtx.strokeStyle = nightMode ? '#d4634b' : '#a64a37';
    miniCtx.lineWidth = 1.5;
    miniCtx.strokeRect(boxX + 0.75, 2.75, boxW - 1.5, mH - 5.5);
  }

  function drawAtmosphere(scene, time, dt) {
    // 1. Drifting ink clouds & mist
    const mistStrength = scene.mist;
    if (mistStrength > 0.02) {
      const cloudRGB = nightMode ? '176, 192, 184' : '247, 243, 232';
      for (const cloud of clouds) {
        cloud.x = (cloud.x + cloud.speed * dt) % 1.3;
        const cx = (cloud.x - 0.15) * width + smoothPointerX * 24;
        const cy = cloud.y * height + Math.sin(time * 0.0004 + cloud.phase) * 8 + smoothPointerY * 10;
        const rx = cloud.rx * width;
        const ry = cloud.ry * height;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, ry / Math.max(1, rx));
        const g = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
        const alpha = cloud.alpha * mistStrength * (nightMode ? 0.45 : 0.85);
        g.addColorStop(0, `rgba(${cloudRGB}, ${alpha})`);
        g.addColorStop(0.55, `rgba(${cloudRGB}, ${alpha * 0.42})`);
        g.addColorStop(1, `rgba(${cloudRGB}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, rx, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 2. Distant birds
    if (scene.birds > 0.08) {
      const birdInk = nightMode ? 'rgba(218, 224, 214, 0.45)' : 'rgba(54, 58, 52, 0.46)';
      ctx.save();
      ctx.strokeStyle = birdInk;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      for (const bird of birds) {
        const bx = ((bird.baseX - time * 0.000012 * bird.speed * 100) % 1.15) * width;
        const by = bird.baseY * height + Math.sin(time * 0.0014 + bird.phase) * 6;
        const flap = Math.sin(time * 0.0055 + bird.phase) * 2.6;
        ctx.beginPath();
        ctx.moveTo(bx - bird.span, by + flap);
        ctx.quadraticCurveTo(bx - bird.span * 0.4, by - 2.5, bx, by);
        ctx.quadraticCurveTo(bx + bird.span * 0.4, by - 2.5, bx + bird.span, by + flap);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Waterfall mist spray in 寻山
    if (scene.waterfall > 0.05) {
      const sprayColor = nightMode ? '194, 212, 206' : '248, 245, 238';
      for (const drop of waterfallSpray) {
        drop.y += drop.speed * dt;
        if (drop.y > 0.62) drop.y = 0.28;
        const px = drop.x * width + Math.sin(time * 0.002 + drop.y * 12) * 3;
        const py = drop.y * height;
        ctx.fillStyle = `rgba(${sprayColor}, ${drop.alpha * scene.waterfall * 0.7})`;
        ctx.beginPath();
        ctx.arc(px, py, drop.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Vermilion sunset glow & river shimmer in 归舟
    if (scene.sunGlow > 0.05 || scene.waterShimmer > 0.08) {
      if (scene.sunGlow > 0.05) {
        const sunX = width * 0.34 + smoothPointerX * 10;
        const sunY = height * 0.36 + smoothPointerY * 6;
        const pulse = 1 + Math.sin(time * 0.0012) * 0.04;
        const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, width * 0.28 * pulse);
        const sunAlpha = (nightMode ? 0.16 : 0.24) * scene.sunGlow;
        glow.addColorStop(0, `rgba(214, 102, 74, ${sunAlpha})`);
        glow.addColorStop(0.45, `rgba(224, 152, 108, ${sunAlpha * 0.45})`);
        glow.addColorStop(1, 'rgba(224, 152, 108, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      // Shimmer lines on lower river
      const shimmerStrength = scene.waterShimmer;
      ctx.save();
      for (let i = 0; i < 18; i += 1) {
        const t = i / 18;
        const sy = height * (0.66 + t * 0.28);
        const sx = width * (0.28 + Math.sin(time * 0.0009 + i * 1.7) * 0.18 + (i % 3) * 0.12);
        const sw = (26 + t * 62) * (0.7 + 0.3 * Math.sin(time * 0.0018 + i));
        const a = (0.06 + 0.08 * Math.sin(time * 0.002 + i * 2.3)) * shimmerStrength;
        ctx.fillStyle = scene.sunGlow > 0.35
          ? `rgba(232, 176, 134, ${Math.max(0, a)})`
          : (nightMode ? `rgba(182, 206, 200, ${Math.max(0, a)})` : `rgba(255, 251, 240, ${Math.max(0, a * 1.25)})`);
        ctx.fillRect(sx, sy, sw, 1.2);
      }
      ctx.restore();
    }

    // 5. Fine spring rain & surface ripples
    if (scene.rain > 0.04) {
      const rainColor = nightMode ? '194, 210, 206' : '72, 78, 70';
      ctx.save();
      ctx.lineWidth = 0.85;
      for (const drop of rainDrops) {
        drop.x -= drop.speed * 0.14 * dt;
        drop.y += drop.speed * dt;
        if (drop.y > 1.05) {
          drop.y = -0.05;
          drop.x = rng();
        }
        if (drop.x < -0.05) drop.x = 1.05;

        const rx = drop.x * width;
        const ry = drop.y * height;
        ctx.strokeStyle = `rgba(${rainColor}, ${drop.alpha * scene.rain})`;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - drop.len * 0.14, ry + drop.len);
        ctx.stroke();
      }
      ctx.restore();

      if (time > nextAutoRippleAt) {
        nextAutoRippleAt = time + 190 + rng() * 340;
        autoRipples.push({
          x: 0.35 + rng() * 0.58,
          y: 0.72 + rng() * 0.24,
          radius: 2,
          maxRadius: 20 + rng() * 22,
          alpha: 0.28 * scene.rain,
        });
        if (autoRipples.length > 22) autoRipples.shift();
      }
    }

    // 6. Floating ink/reed/firefly motes
    const moteAlphaBase = nightMode ? 0.42 : (0.14 + scene.reeds * 0.24);
    for (const mote of motes) {
      mote.x = (mote.x + mote.vx * dt + 1) % 1;
      mote.y = (mote.y + mote.vy * dt + 1) % 1;
      const pulse = 0.55 + 0.45 * Math.sin(time * 0.002 + mote.phase);
      ctx.fillStyle = nightMode
        ? `rgba(232, 204, 146, ${moteAlphaBase * pulse})`
        : `rgba(116, 108, 92, ${moteAlphaBase * pulse})`;
      ctx.beginPath();
      ctx.arc(mote.x * width, mote.y * height, mote.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Render rain ripples & user-clicked ink ripples
    const drawRippleList = (list, defaultRGB) => {
      for (let i = list.length - 1; i >= 0; i -= 1) {
        const r = list[i];
        r.radius += (r.maxRadius - r.radius) * Math.min(1, dt * 2.5) + dt * 12;
        r.alpha -= dt * 0.28;
        if (r.alpha <= 0.01 || r.radius >= r.maxRadius) {
          list.splice(i, 1);
          continue;
        }
        const cx = r.x * width;
        const cy = r.y * height;
        const color = r.isCinnabar ? '166, 74, 55' : defaultRGB;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, 0.36);
        ctx.strokeStyle = `rgba(${color}, ${r.alpha})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(0, 0, r.radius, 0, Math.PI * 2);
        ctx.stroke();
        if (r.radius > 10) {
          ctx.strokeStyle = `rgba(${color}, ${r.alpha * 0.52})`;
          ctx.beginPath();
          ctx.arc(0, 0, r.radius * 0.62, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    };
    drawRippleList(autoRipples, nightMode ? '194, 212, 206' : '72, 78, 70');
    drawRippleList(interactiveRipples, nightMode ? '220, 214, 198' : '58, 62, 56');

    // 8. Soft xuan paper mist wash (especially at colophon for serene reading)
    if (scene.paperFade > 0.02 && !panoramaMode) {
      ctx.save();
      ctx.fillStyle = nightMode
        ? `rgba(22, 27, 25, ${scene.paperFade * 0.85})`
        : `rgba(242, 237, 226, ${scene.paperFade * 0.88})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  function renderFrame(time, dt) {
    if (!ctx || width === 0 || height === 0) return;

    smoothPos += (targetPos - smoothPos) * Math.min(1, dt * 8.5);
    smoothPointerX += (pointerX - smoothPointerX) * Math.min(1, dt * 6);
    smoothPointerY += (pointerY - smoothPointerY) * Math.min(1, dt * 6);
    panCurrent += (panTarget - panCurrent) * Math.min(1, dt * 10);
    panZoomCurrent += (panZoomTarget - panZoomCurrent) * Math.min(1, dt * 10);

    drawPaperBase();

    const scene = panoramaMode
      ? {
          mist: 0.45,
          rain: clamp(1 - Math.abs(panCurrent - 0.18) * 3.2, 0, 0.85),
          waterfall: clamp(1 - Math.abs(panCurrent - 0.56) * 3.2, 0, 0.9),
          birds: 0.65,
          sunGlow: clamp((panCurrent - 0.58) * 2.5, 0, 0.92),
          waterShimmer: 0.58,
          reeds: clamp((panCurrent - 0.62) * 2.4, 0, 0.8),
          paperFade: 0,
        }
      : getAtmosphereState(smoothPos);

    if (panoramaMode) {
      const panoInfo = drawStitchedPanorama(panCurrent, panZoomCurrent);
      applyNightTonePass(scene);
      drawAtmosphere(scene, time, dt);
      drawMinimap(panoInfo);
    } else {
      const { primaryArt, secondaryArt, layers, primaryCamera, secondaryCamera, sameArt } = scene;
      if (sameArt) {
        drawFramedArt(ctx, images[primaryArt], width, height, primaryCamera, smoothPointerX, smoothPointerY, 1);
      } else {
        drawFramedArt(ctx, images[primaryArt], width, height, primaryCamera, smoothPointerX, smoothPointerY, layers[primaryArt]);
        drawFramedArt(ctx, images[secondaryArt], width, height, secondaryCamera, smoothPointerX, smoothPointerY, layers[secondaryArt]);
      }
      applyNightTonePass(scene);
      drawAtmosphere(scene, time, dt);
    }
  }

  function loop(time) {
    if (!lastTime) lastTime = time;
    const dt = Math.min(0.05, Math.max(0.001, (time - lastTime) / 1000));
    lastTime = time;
    renderFrame(time, dt);
    rafId = window.requestAnimationFrame(loop);
  }

  function start() {
    Promise.all(
      Object.entries(ART_SOURCES).map(async ([key, src]) => {
        images[key] = await loadImage(src);
      }),
    ).then(() => {
      renderFrame(performance.now(), 0.016);
    });

    resize();
    if (!motionQuery.matches) {
      rafId = window.requestAnimationFrame(loop);
    }
  }

  return {
    start,
    resize,
    setPosition(pos) {
      targetPos = pos;
      if (motionQuery.matches) {
        smoothPos = pos;
        renderFrame(performance.now(), 0.016);
      }
    },
    setPointer(nx, ny) {
      pointerX = clamp(nx, -1, 1);
      pointerY = clamp(ny, -1, 1);
    },
    setNightMode(enabled) {
      nightMode = Boolean(enabled);
      if (motionQuery.matches) renderFrame(performance.now(), 0.016);
    },
    setPanoramaMode(enabled) {
      panoramaMode = Boolean(enabled);
      if (motionQuery.matches) renderFrame(performance.now(), 0.016);
    },
    panBy(delta) {
      panTarget = clamp(panTarget + delta, 0, 1);
      if (motionQuery.matches) {
        panCurrent = panTarget;
        renderFrame(performance.now(), 0.016);
      }
    },
    setPan(value) {
      panTarget = clamp(value, 0, 1);
      if (motionQuery.matches) {
        panCurrent = panTarget;
        renderFrame(performance.now(), 0.016);
      }
    },
    getPan() {
      return panTarget;
    },
    setZoom(value) {
      panZoomTarget = clamp(value, 1, 2.1);
      if (motionQuery.matches) {
        panZoomCurrent = panZoomTarget;
        renderFrame(performance.now(), 0.016);
      }
    },
    getZoom() {
      return panZoomTarget;
    },
    spawnRipple,
    getImage(key) {
      return images[key];
    },
    destroy() {
      if (rafId) window.cancelAnimationFrame(rafId);
    },
  };
}

/**
 * Renders a printable museum-grade 1200x1800 commemorative keepsake card PNG.
 */
export async function renderKeepsakeCard({ sealText, sealStyle, noteText, dateLabel }) {
  const cardW = 1200;
  const cardH = 1800;
  const offscreen = document.createElement('canvas');
  offscreen.width = cardW;
  offscreen.height = cardH;
  const ctx = offscreen.getContext('2d');

  // Xuan paper background
  const paper = ctx.createLinearGradient(0, 0, 0, cardH);
  paper.addColorStop(0, '#f4efe2');
  paper.addColorStop(0.55, '#ede5d4');
  paper.addColorStop(1, '#e6dcc6');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, cardW, cardH);

  // Fine xuan paper texture specks
  const rng = createRng(7712);
  for (let i = 0; i < 3600; i += 1) {
    ctx.fillStyle = rng() > 0.5 ? 'rgba(90, 82, 64, 0.03)' : 'rgba(255, 252, 245, 0.045)';
    ctx.fillRect(rng() * cardW, rng() * cardH, 1.5, 1.5);
  }

  // Silk brocade frame & thin gold rule
  ctx.strokeStyle = 'rgba(66, 63, 52, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(56, 56, cardW - 112, cardH - 112);
  ctx.strokeStyle = 'rgba(166, 74, 55, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(70, 70, cardW - 140, cardH - 140);

  // Top artwork vignette (return-boat.jpg)
  const art = await loadImage(ART_SOURCES.returnBoat);
  const artX = 110;
  const artY = 130;
  const artW = cardW - 220;
  const artH = 620;
  if (art) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(artX, artY, artW, artH);
    ctx.clip();
    const imgRatio = art.naturalWidth / Math.max(1, art.naturalHeight);
    const drawW = Math.max(artW, artH * imgRatio);
    const drawH = drawW / imgRatio;
    ctx.drawImage(art, artX - (drawW - artW) * 0.18, artY - (drawH - artH) * 0.52, drawW, drawH);
    const vignette = ctx.createLinearGradient(0, artY + artH * 0.65, 0, artY + artH);
    vignette.addColorStop(0, 'rgba(237, 229, 212, 0)');
    vignette.addColorStop(1, 'rgba(237, 229, 212, 0.92)');
    ctx.fillStyle = vignette;
    ctx.fillRect(artX, artY, artW, artH);
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(72, 68, 56, 0.24)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(artX, artY, artW, artH);

  // Book title & caption
  ctx.fillStyle = '#a64a37';
  ctx.font = '500 26px "Songti SC", "STSong", "Noto Serif CJK SC", serif';
  ctx.textAlign = 'center';
  ctx.fillText('松 烟 行 旅  ·  卷 末 留 笺', cardW / 2, 855);

  ctx.fillStyle = '#262924';
  ctx.font = '600 62px "Songti SC", "STSong", "Noto Serif CJK SC", serif';
  ctx.fillText('山水有归处', cardW / 2, 940);

  // Divider
  ctx.fillStyle = '#a64a37';
  ctx.fillRect(cardW / 2 - 48, 985, 96, 2);

  // Closing quote
  ctx.fillStyle = '#333831';
  ctx.font = '400 40px "Songti SC", "STSong", "Noto Serif CJK SC", serif';
  const quoteLines = [
    '山川不问行人面',
    '却把雨声与晚烟',
    '留到合卷眉睫间',
  ];
  quoteLines.forEach((line, idx) => {
    ctx.fillText(line, cardW / 2, 1085 + idx * 72);
  });

  // Personal colophon note if provided
  const trimmedNote = String(noteText ?? '').trim();
  if (trimmedNote) {
    ctx.fillStyle = '#5a5f55';
    ctx.font = '400 28px "Kaiti SC", "STKaiti", "Songti SC", serif';
    const wrapped = [];
    let current = '';
    for (const ch of trimmedNote) {
      current += ch;
      if (ctx.measureText(current).width > 740 || ch === '\n') {
        wrapped.push(current.trim());
        current = '';
      }
    }
    if (current.trim()) wrapped.push(current.trim());
    wrapped.slice(0, 3).forEach((line, idx) => {
      ctx.fillText(`「 ${line} 」`, cardW / 2, 1340 + idx * 48);
    });
  }

  // Date label
  const resolvedDate = dateLabel || getGanZhiLabel();
  ctx.fillStyle = '#75796e';
  ctx.font = '400 24px "Songti SC", "STSong", serif';
  ctx.fillText(resolvedDate, cardW / 2, 1525);

  // Carved cinnabar seal
  const sealSize = 112;
  const sealX = cardW / 2 - sealSize / 2;
  const sealY = 1565;
  const layout = layoutSealCharacters(sealText);
  const isBaiWen = sealStyle === 'baiwen';

  ctx.save();
  ctx.translate(sealX + sealSize / 2, sealY + sealSize / 2);
  ctx.rotate(-0.06);
  ctx.translate(-sealSize / 2, -sealSize / 2);

  if (isBaiWen) {
    ctx.fillStyle = '#a64a37';
    ctx.fillRect(0, 0, sealSize, sealSize);
    ctx.fillStyle = '#f3ede0';
  } else {
    ctx.strokeStyle = '#a64a37';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, sealSize, sealSize);
    ctx.fillStyle = '#a64a37';
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontSize = layout.cols === 1 && layout.rows === 1 ? 58 : layout.cols === 1 ? 38 : 34;
  ctx.font = `600 ${fontSize}px "Songti SC", "STSong", "Noto Serif CJK SC", serif`;

  for (let colIdx = 0; colIdx < layout.cols; colIdx += 1) {
    const col = layout.grid[colIdx];
    const xPos = layout.cols === 1
      ? sealSize / 2
      : (colIdx === 0 ? sealSize * 0.72 : sealSize * 0.28);
    for (let rowIdx = 0; rowIdx < col.length; rowIdx += 1) {
      const yPos = col.length === 1
        ? sealSize / 2
        : (rowIdx === 0 ? sealSize * 0.3 : sealSize * 0.72);
      ctx.fillText(col[rowIdx], xPos, yPos);
    }
  }
  ctx.restore();

  return offscreen.toDataURL('image/png');
}
