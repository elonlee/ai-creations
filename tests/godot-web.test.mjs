import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const release = fileURLToPath(new URL('../godot-test/web/', import.meta.url));

test('碎岳 Web 资源包不超过 GitHub 网页上传的 25 MiB 上限', () => {
  assert.ok(statSync(`${release}index.pck`).size <= 25 * 1024 * 1024,
    '资源包过大：检查完整字体和历史图集是否被重新打包');
});

test('碎岳 Web 引擎低于 GitHub 的 50 MiB 警告阈值且是有效的 WASM', () => {
  const wasm = readFileSync(`${release}index.wasm`);
  assert.ok(wasm.length < 50 * 1024 * 1024);
  assert.ok(WebAssembly.validate(wasm), '引擎二进制已损坏');
});
