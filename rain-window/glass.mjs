const VERTEX = `#version 300 es
precision highp float;
out vec2 vUV;
void main() {
  vec2 point = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUV = point;
  gl_Position = vec4(point * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUV;
out vec4 outColor;
uniform sampler2D uScene;
uniform vec2 uViewport;
uniform float uTime;
uniform float uDensity;
uniform float uSpeed;
uniform float uSize;
uniform float uScale;
uniform float uTrails;
uniform float uWind;
uniform float uFog;
uniform float uRefraction;
uniform float uDispersion;
uniform float uMoving;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec2 rotated(vec2 p, float angle) {
  float c = cos(angle), s = sin(angle);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

// Use a curved height in screen pixels so each size acts like a lens.
float capHeight(vec2 offset, float radius) {
  float unit = dot(offset, offset) / (radius * radius);
  return sqrt(max(0.0, 1.0 - unit)) * radius * 0.55;
}

vec2 tinyBeads(vec2 point, float cellSize, float low, float high, float occupancy, float angle, float seed) {
  vec2 grid = rotated(point, angle) / cellSize;
  vec2 id = floor(grid);
  if (hash(id + vec2(seed, seed * 2.3)) > occupancy) return vec2(0.0);
  vec2 center = vec2(
    mix(0.30, 0.70, hash(id + vec2(seed + 7.0, 3.1))),
    mix(0.30, 0.70, hash(id + vec2(5.7, seed + 11.0)))
  );
  float radius = mix(low, high, hash(id + vec2(seed + 19.0, 23.0)))
    * (0.55 + uSize * 0.65) * uScale;
  radius = min(radius, 2.2);
  vec2 offset = (fract(grid) - center) * cellSize;
  float distance = length(offset) / radius;
  return vec2(capHeight(offset, radius), 1.0 - smoothstep(0.78, 1.0, distance));
}

// Each lane changes its drop after one crossing. The wake clears fine beads.
vec3 movingDrops(vec2 point, float laneWidth, vec2 range, float baseSpeed, float seed) {
  if (uMoving < 0.5) return vec3(0.0);
  float lane = floor(point.x / laneWidth);
  float laneSeed = hash(vec2(lane, seed));
  float gate = min(1.0, uDensity * (seed < 2.0 ? 1.90 : 1.60));
  if (laneSeed > gate) return vec3(0.0);
  float velocity = baseSpeed * (0.35 + uSpeed * 2.8)
    * mix(0.68, 1.34, hash(vec2(lane, seed + 19.0)));
  float travel = uViewport.y + 90.0;
  float cycle = (uTime * velocity + laneSeed * travel * 13.0) / travel;
  float generation = floor(cycle);
  float phase = fract(cycle);
  float progress = phase * phase * (1.35 - 0.35 * phase);
  float y = uViewport.y + 40.0 - progress * travel;
  float variation = hash(vec2(lane * 1.71 + seed, generation * 2.13));
  float radius = mix(range.x, range.y, variation)
    * (0.60 + uSize * 0.70) * uScale;
  radius = min(radius, 15.0);
  float laneOffset = (hash(vec2(lane, generation + seed * 3.0)) - 0.5) * laneWidth * 0.38;
  float baseX = (lane + 0.5) * laneWidth + laneOffset;
  float sway = min(4.0, radius * 0.4);
  float x = baseX + sin(y * 0.009 + laneSeed * 9.0) * sway
    + uWind * (uViewport.y - y) * 0.045;
  vec2 offset = point - vec2(x, y);
  offset.x += sin(offset.y * 0.16 + variation * 6.3) * radius * 0.045;
  offset.x /= 1.0 + clamp(-offset.y / max(radius, 1.0), -1.0, 1.0) * 0.12;
  offset.y *= 0.82;
  float distance = length(offset) / radius;
  float body = capHeight(offset, radius);
  float coverage = 1.0 - smoothstep(0.82, 1.0, distance);
  float behind = point.y - y;
  float wakeLength = 14.0 + uTrails * 75.0;
  float wake = smoothstep(0.0, 4.0, behind)
    * (1.0 - smoothstep(wakeLength * 0.55, wakeLength, behind));
  float wakeX = baseX + sin(point.y * 0.009 + laneSeed * 9.0) * sway
    + uWind * (uViewport.y - point.y) * 0.045;
  float lateral = abs(point.x - wakeX);
  float clear = (1.0 - smoothstep(radius * 0.40, radius * 1.55, lateral)) * wake * 0.85;
  float beadIndex = floor(behind / 10.0);
  float beadSeed = hash(vec2(lane * 3.1 + seed, beadIndex + generation * 7.3));
  float beadRadius = mix(0.35, 1.25, beadSeed);
  vec2 beadOffset = vec2(point.x - wakeX - (beadSeed - 0.5) * radius * 0.75,
                         mod(behind, 10.0) - 5.0);
  float bead = step(0.48, beadSeed) * wake;
  body = max(body, capHeight(beadOffset, beadRadius) * bead);
  coverage = max(coverage,
    (1.0 - smoothstep(0.78, 1.0, length(beadOffset) / beadRadius)) * bead);
  return vec3(body, coverage, clear);
}

vec3 pane(vec2 point) {
  if (uDensity <= 0.0) return vec3(0.0);
  vec3 large = movingDrops(point, 70.0, vec2(6.0, 15.0), 17.0, 1.0);
  vec3 medium = movingDrops(point + vec2(11.0, 0.0), 42.0, vec2(3.5, 9.0), 29.0, 2.0);
  vec3 small = movingDrops(point + vec2(5.0, 0.0), 27.0, vec2(1.8, 5.0), 42.0, 3.0);
  vec3 fine = movingDrops(point + vec2(2.0, 0.0), 17.0, vec2(0.9, 2.5), 54.0, 4.0);
  float movingHeight = max(max(large.x, medium.x), max(small.x, fine.x));
  float movingCover = max(max(large.y, medium.y), max(small.y, fine.y));
  float clear = max(max(large.z, medium.z), max(small.z, fine.z));
  vec2 a = tinyBeads(point, 5.5, 0.32, 0.78, uDensity * 1.22, 0.28, 5.0);
  vec2 b = tinyBeads(point, 9.5, 0.65, 1.55, uDensity * 1.07, 1.21, 17.0);
  vec2 c = tinyBeads(point, 14.0, 1.05, 2.2, uDensity * 0.87, 2.24, 31.0);
  float standingHeight = max(max(a.x, b.x), c.x) * (1.0 - clear);
  float standingCover = max(max(a.y, b.y), c.y) * (1.0 - clear);
  return vec3(max(movingHeight, standingHeight), max(movingCover, standingCover), clear);
}

vec3 photo(vec2 uv) {
  return texture(uScene, clamp(uv, vec2(0.002), vec2(0.998))).rgb;
}

void main() {
  vec2 point = vUV * uViewport;
  vec3 water = pane(point);
  float stepSize = 1.25;
  vec2 slope = vec2(
    pane(point + vec2(stepSize, 0.0)).x - water.x,
    pane(point + vec2(0.0, stepSize)).x - water.x
  ) / stepSize;
  float slopeLength = length(slope);
  vec2 normal = slope / (1.0 + slopeLength * 0.28);
  vec2 offset = -normal * (4.0 + uRefraction * 23.0) / uViewport;
  vec2 lensUV = clamp(vUV + offset, vec2(0.002), vec2(0.998));
  vec2 blurStep = (1.5 + uFog * 5.0) / uViewport;
  vec3 soft = photo(vUV) * 0.40;
  soft += (photo(vUV + vec2(blurStep.x, 0.0)) + photo(vUV - vec2(blurStep.x, 0.0))
        + photo(vUV + vec2(0.0, blurStep.y)) + photo(vUV - vec2(0.0, blurStep.y))) * 0.15;
  vec3 lens = photo(lensUV);
  lens.r = photo(lensUV + offset * uDispersion * 0.10).r;
  lens.b = photo(lensUV - offset * uDispersion * 0.10).b;
  vec3 color = mix(soft, lens, water.y * 0.96);
  vec3 surface = normalize(vec3(-slope * 1.7, 1.0));
  vec3 lightDirection = normalize(vec3(-0.55, 0.65, 0.9));
  float wet = water.y;
  float shoulder = smoothstep(0.12, 1.2, slopeLength) * wet;
  float facingLight = dot(normalize(slope + vec2(0.0001)), normalize(vec2(-0.6, 0.8)));
  float brightSide = smoothstep(0.0, 0.8, facingLight);
  float darkSide = smoothstep(0.0, 0.8, -facingLight);
  float glint = pow(max(dot(surface, lightDirection), 0.0), 18.0) * wet;
  color = mix(color, color * 0.64 + vec3(0.027, 0.070, 0.105), wet * 0.75);
  color += vec3(0.63, 0.79, 0.89) * shoulder * brightSide * 0.84;
  color += vec3(0.32, 0.45, 0.53) * glint * 0.70;
  color += vec3(0.12, 0.21, 0.26) * wet * (0.18 + brightSide * 0.34);
  color -= vec3(0.19, 0.25, 0.28) * shoulder * darkSide * 0.65;
  color = mix(color, vec3(0.19, 0.25, 0.29), uFog * 0.035 * (1.0 - water.y));
  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || '着色器编译失败');
  }
  return shader;
}

export function createGlassRenderer(canvas, reducedMotion) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  try {
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || '着色器链接失败');
    }
    gl.useProgram(program);
    gl.bindVertexArray(gl.createVertexArray());
    const sceneTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program, 'uScene'), 0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    const uniforms = Object.fromEntries([
      'Viewport', 'Time', 'Density', 'Speed', 'Size', 'Scale', 'Trails', 'Wind',
      'Fog', 'Refraction', 'Dispersion', 'Moving'
    ].map(name => [name, gl.getUniformLocation(program, `u${name}`)]));
    const sceneSurface = document.createElement('canvas');
    const sceneCtx = sceneSurface.getContext('2d');
    let width = 0;
    let height = 0;
    let image = null;
    let settings = null;
    let lastFrame = 0;
    let elapsed = 0;

    function uploadScene() {
      if (!image || !width || !height) return;
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * 1.045;
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      sceneCtx.clearRect(0, 0, width, height);
      sceneCtx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sceneSurface);
      canvas.style.display = 'block';
    }

    return {
      setScene(nextImage) { image = nextImage; uploadScene(); },
      setSettings(nextSettings) { settings = { ...nextSettings }; },
      resize(nextWidth, nextHeight) {
        width = Math.round(nextWidth);
        height = Math.round(nextHeight);
        const ratio = Math.min(devicePixelRatio || 1, 1.25);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        sceneSurface.width = width;
        sceneSurface.height = height;
        gl.viewport(0, 0, canvas.width, canvas.height);
        uploadScene();
      },
      frame(time) {
        if (!image || !settings || !width || !height) return;
        if (lastFrame && time - lastFrame < 28) return;
        if (lastFrame && !reducedMotion.matches) elapsed += Math.min(50, time - lastFrame) / 1000;
        lastFrame = time;
        gl.useProgram(program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
        gl.uniform2f(uniforms.Viewport, width, height);
        gl.uniform1f(uniforms.Time, elapsed);
        gl.uniform1f(uniforms.Density, settings.density);
        gl.uniform1f(uniforms.Speed, settings.speed);
        gl.uniform1f(uniforms.Size, settings.size);
        gl.uniform1f(uniforms.Scale, settings.scale);
        gl.uniform1f(uniforms.Trails, settings.trails);
        gl.uniform1f(uniforms.Wind, (settings.wind - 0.5) * 2);
        gl.uniform1f(uniforms.Fog, settings.fog);
        gl.uniform1f(uniforms.Refraction, settings.refraction);
        gl.uniform1f(uniforms.Dispersion, settings.dispersion);
        gl.uniform1f(uniforms.Moving, reducedMotion.matches ? 0 : 1);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };
  } catch (error) {
    console.warn('WebGL 雨窗不可用，改用 Canvas：', error);
    canvas.style.display = 'none';
    return null;
  }
}
