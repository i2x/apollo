import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backlinksTo } from '../src/backlinks.ts';
import { branchProgress, nowSection, projectLadder, skillTreeMermaid } from '../src/home.ts';
import { searchWiki } from '../src/search.ts';
import { resolve } from '../src/wiki.ts';
import { makeWiki, project, skill } from './helpers.ts';

test('search is case-insensitive and shows matching lines', () => {
  const wiki = makeWiki({ 'a.md': '# A\n\nCore Loop is here\nnothing', 'b.md': '# B\n\nno match' });
  const hits = searchWiki(wiki, { q: 'core loop', type: '', status: '' });
  assert.deepEqual(hits.map((hit) => [hit.page.id, hit.lines]), [['a', ['Core Loop is here']]]);
});

test('search filters by type, including "other", and by status', () => {
  const wiki = makeWiki({
    'a.md': skill({ status: 'learning' }),
    'b.md': skill({ status: 'locked' }),
    'c.md': '---\ntype: example\n---\n# C',
  });
  assert.deepEqual(searchWiki(wiki, { q: '', type: 'skill', status: 'locked' }).map((hit) => hit.page.id), ['b']);
  assert.deepEqual(searchWiki(wiki, { q: '', type: 'other', status: '' }).map((hit) => hit.page.id), ['c']);
});

test('backlinks come from links, evidence, concepts and requires', () => {
  const wiki = makeWiki({
    'skills/goal.md': skill({ evidence: ['projects/p/log.md'] }),
    'skills/loop.md': skill({ status: 'locked', requires: ['goal'] }),
    'projects/p/README.md': project('active', ['goal']),
    'projects/p/log.md': '# log\n\nabout [[goal]]',
  });
  const via = (id: string) => backlinksTo(wiki, resolve(wiki, id)!).map((b) => `${b.from.id}:${b.via}`).sort();
  assert.deepEqual(via('goal'), ['log:link', 'loop:requires', 'p:concepts']);
  assert.deepEqual(via('log'), ['goal:evidence']);
});

test('skill tree has one node per skill, requirement edges and status classes', () => {
  const wiki = makeWiki({
    'skills/design/a.md': skill({ status: 'learned', evidence: ['x.md'] }),
    'skills/design/b.md': skill({ status: 'locked', requires: ['a'] }),
  });
  const chart = skillTreeMermaid(wiki);
  assert.match(chart, /s0\["a"\]:::learned/);
  assert.match(chart, /s1\["b"\]:::locked/);
  assert.match(chart, /s0 --> s1/);
  assert.match(chart, /click s1 href "\/p\/b"/);
});

test('branch progress counts learned skills and reads a locked branch README', () => {
  const wiki = makeWiki({
    'skills/design/a.md': skill({ status: 'learned', evidence: ['x.md'] }),
    'skills/design/b.md': skill({ status: 'learning' }),
    'skills/engine/README.md': '---\ntype: branch\nstatus: locked\n---\n# Engine',
  });
  assert.deepEqual(branchProgress(wiki), [
    { name: 'design', learned: 1, total: 2, locked: false },
    { name: 'engine', learned: 0, total: 0, locked: true },
  ]);
});

test('project ladder is ordered by folder', () => {
  const wiki = makeWiki({ 'projects/02-b/README.md': project('not-started'), 'projects/01-a/README.md': project('active') });
  assert.deepEqual(projectLadder(wiki).map((page) => page.id), ['01-a', '02-b']);
});

test('the now section is read from the root README up to the next heading', () => {
  const wiki = makeWiki({ 'README.md': '# Home\n\n## ตอนนี้\n\n- doing X\n\n## ทางเข้า\n\n- links' });
  assert.equal(nowSection(wiki), '- doing X');
});

test('the now section can be the last section', () => {
  const wiki = makeWiki({ 'README.md': '# Home\n\n## ตอนนี้\n- doing Y\n' });
  assert.equal(nowSection(wiki), '- doing Y');
});
