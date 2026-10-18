/* Load the release's gzip assets on ordinary static hosts, including local HTTP. */
async function fetchGodotAsset(file) {
  if (!/\.(?:wasm|pck)$/.test(file)) return fetch(file);

  const response = await fetch(`${file}.gz`);
  if (!response.ok) {
    throw new Error(`无法加载 ${file}.gz：HTTP ${response.status}`);
  }
  let data = await response.arrayBuffer();
  const header = new Uint8Array(data, 0, Math.min(data.byteLength, 2));
  // Some hosts send Content-Encoding: gzip and the browser already decodes it.
  if (header[0] === 0x1f && header[1] === 0x8b) {
    if (typeof DecompressionStream !== 'function') {
      throw new Error('浏览器不支持解压游戏资源，请更新浏览器后重试。');
    }
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'));
    // Finish decoding here so errors reach Godot's retry and failure notice.
    data = await new Response(stream).arrayBuffer();
  }
  return new Response(data, {
    headers: { 'Content-Type': file.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream' },
  });
}

if (typeof module !== 'undefined' && module.exports) module.exports = fetchGodotAsset;
