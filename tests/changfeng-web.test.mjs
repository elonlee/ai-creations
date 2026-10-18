import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { gzipSync, gunzipSync } from 'node:zlib';

const root = fileURLToPath(new URL('../changfeng-zhuan-godot/', import.meta.url));
const release = `${root}web/`;
const require = createRequire(import.meta.url);

test('长风传发布包总量低于 45 MiB，避免重新加入完整字体或未压缩引擎', () => {
  const total = readdirSync(release)
    .filter(name => statSync(`${release}${name}`).isFile())
    .reduce((sum, name) => sum + statSync(`${release}${name}`).size, 0);
  assert.ok(total < 45 * 1024 * 1024, `Web release 过大：${total} 字节`);
});

test('长风传压缩产物可还原成有效 WASM 和 Godot PCK', () => {
  for (const name of ['index.wasm', 'index.pck']) {
    assert.ok(existsSync(`${release}${name}.gz`), `缺少压缩发布文件 ${name}.gz`);
    const data = gunzipSync(readFileSync(`${release}${name}.gz`));
    if (name.endsWith('.wasm')) {
      assert.ok(WebAssembly.validate(data), '解压后的引擎二进制已损坏');
    } else {
      assert.equal(data.subarray(0, 4).toString(), 'GDPC');
    }
    const config = JSON.parse(readFileSync(`${release}index.html`, 'utf8')
      .match(/const GODOT_CONFIG = (.*);/)[1]);
    assert.equal(config.fileSizes[name], data.length, `${name} 的加载进度大小与内容不一致`);
  }
});

test('长风传加载器能从普通静态服务器和启用 HTTP gzip 的服务器读取相同资源', async t => {
  assert.ok(existsSync(`${release}compressed-fetch.js`), '缺少压缩资源加载器');
  const fetchGodotAsset = require(`${release}compressed-fetch.js`);
  const payload = Buffer.from('GDPC\0长风传资源');
  const server = createServer((request, response) => {
    if (request.url === '/plain.pck.gz') {
      response.end(gzipSync(payload));
    } else if (request.url === '/encoded.pck.gz') {
      response.setHeader('Content-Encoding', 'gzip');
      response.end(gzipSync(payload));
    } else if (request.url === '/double.pck.gz') {
      response.setHeader('Content-Encoding', 'gzip');
      response.end(gzipSync(gzipSync(payload)));
    } else if (request.url === '/broken.pck.gz') {
      response.end(Buffer.from([0x1f, 0x8b, 0, 0]));
    } else {
      response.writeHead(404).end();
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const name of ['plain', 'encoded', 'double']) {
    const response = await fetchGodotAsset(`${base}/${name}.pck`);
    assert.equal(response.headers.get('content-type'), 'application/octet-stream');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), payload);
  }
  await assert.rejects(fetchGodotAsset(`${base}/missing.pck`), /404/);
  await assert.rejects(fetchGodotAsset(`${base}/broken.pck`));
});
