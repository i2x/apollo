import assert from 'node:assert/strict';
import { test } from 'node:test';
import { list, resolve, splitFrontmatter, text, wikiPath } from '../src/wiki.ts';
import { makeWiki, skill } from './helpers.ts';

test('page ids come from file names, or folder names for README.md', () => {
  const wiki = makeWiki({
    'README.md': '# Home',
    'skills/design/core-loop.md': skill(),
    'projects/01-dice-duel/README.md': '# Dice Duel',
  });
  assert.deepEqual(wiki.pages.map((page) => page.id).sort(), ['01-dice-duel', 'core-loop', 'wiki']);
  assert.equal(resolve(wiki, '01-dice-duel')?.path, 'projects/01-dice-duel/README.md');
});

test('folders starting with _ are not part of the wiki', () => {
  const wiki = makeWiki({ '_templates/skill-node.md': skill(), 'page.md': '# Page' });
  assert.deepEqual(wiki.pages.map((page) => page.path), ['page.md']);
});

test('frontmatter is parsed and the first heading becomes the title', () => {
  const wiki = makeWiki({ 'core-loop.md': skill({ status: 'locked', requires: ['a', 'b'] }) });
  const page = wiki.pages[0];
  assert.equal(text(page, 'status'), 'locked');
  assert.deepEqual(list(page, 'requires'), ['a', 'b']);
  assert.equal(page.title, 'Skill');
});

test('broken frontmatter is reported instead of thrown', () => {
  const result = splitFrontmatter('---\nstatus: [unclosed\n---\nbody');
  assert.ok(result.metaError);
  assert.equal(result.body, 'body');
});

test('pages without frontmatter keep their whole body', () => {
  assert.deepEqual(splitFrontmatter('# Title\ntext'), { meta: {}, body: '# Title\ntext' });
});

test('wikiPath normalizes and refuses paths outside the wiki', () => {
  assert.equal(wikiPath('./projects/a.md'), 'projects/a.md');
  assert.equal(wikiPath('../secret.md'), undefined);
  assert.equal(wikiPath('/etc/passwd'), undefined);
});
