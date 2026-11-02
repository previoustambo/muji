import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';

const source = await readFile(new URL('../sw.js', import.meta.url), 'utf8');

test('GitHub Pages 仓库子路径下，离线资源仍属于同一 App', () => {
  const context = createContext({ URL, self: { location: 'https://someone.github.io/muji/sw.js', registration: { scope: 'https://someone.github.io/muji/' }, addEventListener() {} } });
  runInContext(source, context);
  const urls = runInContext('[...assetURLs]', context);
  assert.ok(urls.length >= 10);
  for (const url of urls) assert.ok(url.startsWith('https://someone.github.io/muji/'), url);
  assert.equal(urls.includes('https://someone.github.io/styles.css'), false);
});

test('清理旧缓存不会删除同一 GitHub 用户下其他仓库的缓存', async () => {
  const listeners = {}, removed = [];
  const scope = 'https://someone.github.io/muji/';
  const prefix = `muji-${scope}-`;
  const context = createContext({ URL, self: { location: scope + 'sw.js', registration: { scope }, addEventListener(name, handler) { listeners[name] = handler; }, clients: { claim() {} } }, caches: { keys: async () => [prefix + 'old', prefix + 'lavender-v1', 'muji-https://someone.github.io/another/-old', 'other-app'], delete: async key => { removed.push(key); return true; } } });
  runInContext(source, context);
  let complete;
  listeners.activate({ waitUntil(promise) { complete = promise; } });
  await complete;
  assert.deepEqual(removed, [prefix + 'old']);
});
