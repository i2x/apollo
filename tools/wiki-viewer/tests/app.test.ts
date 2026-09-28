import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../src/app.tsx';
import { makeWiki, project, skill } from './helpers.ts';

function appFor(files: Record<string, string>) {
  return createApp(makeWiki(files).root);
}

test('home page shows the now section, skill tree and rule check', async () => {
  const app = appFor({
    'README.md': '# Home\n\n## ตอนนี้\n\n- working on [[a]]\n',
    'skills/design/a.md': skill(),
    'projects/01-x/README.md': project('active', ['a']),
  });
  const res = await app.request('/');
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /^<!DOCTYPE html>/i);
  assert.match(html, /working on <a class="wikilink" href="\/p\/a">a<\/a>/);
  assert.match(html, /<pre class="mermaid">graph TD/);
  assert.match(html, /ไม่พบปัญหา/);
});

test('a page renders its markdown and backlinks', async () => {
  const app = appFor({ 'a.md': '# Page A', 'b.md': '# B\n\nsee [[a]]' });
  const html = await (await app.request('/p/a')).text();
  assert.match(html, /<h1>Page A<\/h1>/);
  assert.match(html, /หน้าที่ลิงก์มาที่นี่/);
  assert.match(html, /href="\/p\/b">b<\/a>/);
});

test('unknown pages and assets are 404', async () => {
  const app = appFor({ 'a.md': '# A' });
  assert.equal((await app.request('/p/nope')).status, 404);
  assert.equal((await app.request('/assets/nope.js')).status, 404);
});

test('raw files are served, but never from outside the wiki', async () => {
  const app = appFor({ 'a.md': '# A', '_templates/t.md': 'template' });
  assert.equal(await (await app.request('/raw/_templates/t.md')).text(), 'template');
  assert.equal((await app.request('/raw/..%2F..%2Fetc%2Fpasswd')).status, 404);
  assert.equal((await app.request('/raw/%2E%2E/outside.md')).status, 404);
});

test('search results and the reflected query are escaped', async () => {
  const app = appFor({ 'a.md': '# A\n\nfind <b>me</b> here' });
  const html = await (await app.request('/search?q=%3Cb%3Eme')).text();
  assert.doesNotMatch(html, /value="<b>me"/);
  assert.match(html, /value="&lt;b&gt;me"/);
  assert.match(html, /<mark>&lt;b&gt;me<\/mark>/);
});

test('frontmatter values are escaped in the meta panel', async () => {
  const app = appFor({ 'a.md': '---\nnote: "<script>alert(1)</script>"\n---\n# A' });
  const html = await (await app.request('/p/a')).text();
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});
