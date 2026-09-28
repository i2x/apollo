import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkWiki, type Issue } from '../src/check.ts';
import { makeWiki, project, skill } from './helpers.ts';

function messages(issues: Issue[], level: Issue['level']): string[] {
  return issues.filter((issue) => issue.level === level).map((issue) => `${issue.path}: ${issue.message}`);
}

test('a wiki that follows every rule has no issues', () => {
  const wiki = makeWiki({
    'skills/a.md': skill({ status: 'learned', evidence: ['projects/p/log.md'] }),
    'skills/b.md': skill({ status: 'learning', requires: ['a'], body: 'see [[a]]' }),
    'skills/c.md': skill({ status: 'locked', requires: ['b'] }),
    'projects/p/README.md': project('active', ['a', 'b']),
    'projects/p/log.md': '# log',
  });
  assert.deepEqual(checkWiki(wiki), []);
});

test('learned without evidence is an error', () => {
  const issues = checkWiki(makeWiki({ 'a.md': skill({ status: 'learned' }) }));
  assert.deepEqual(messages(issues, 'error'), ['a.md: เป็น learned แต่ยังไม่มี evidence']);
});

test('evidence pointing at a missing file is an error', () => {
  const issues = checkWiki(makeWiki({ 'a.md': skill({ evidence: ['projects/nope.md'] }) }));
  assert.deepEqual(messages(issues, 'error'), ['a.md: evidence: ไม่พบไฟล์ "projects/nope.md"']);
});

test('evidence outside the wiki counts as missing', () => {
  const issues = checkWiki(makeWiki({ 'a.md': skill({ evidence: ['../outside.md'] }) }));
  assert.equal(messages(issues, 'error').length, 1);
});

test('unknown names in requires and concepts are errors', () => {
  const issues = checkWiki(makeWiki({
    'a.md': skill({ status: 'locked', requires: ['ghost'] }),
    'p/README.md': project('active', ['phantom']),
  }));
  assert.deepEqual(messages(issues, 'error'), [
    'a.md: requires: ไม่มี node ชื่อ "ghost"',
    'p/README.md: concepts: ไม่มี node ชื่อ "phantom"',
  ]);
});

test('learning or learned before every required node is learned is an error', () => {
  const issues = checkWiki(makeWiki({
    'a.md': skill({ status: 'learning' }),
    'b.md': skill({ status: 'learning', requires: ['a'] }),
  }));
  assert.deepEqual(messages(issues, 'error'), ['b.md: เป็น learning ทั้งที่ a ยังไม่ learned']);
});

test('duplicate page ids are errors on every copy', () => {
  const issues = checkWiki(makeWiki({ 'x/rules-v1.md': '# one', 'y/rules-v1.md': '# two' }));
  assert.equal(messages(issues, 'error').length, 2);
});

test('a requires cycle is reported once', () => {
  const issues = checkWiki(makeWiki({
    'a.md': skill({ status: 'locked', requires: ['b'] }),
    'b.md': skill({ status: 'locked', requires: ['a'] }),
  }));
  const cycles = messages(issues, 'error').filter((message) => message.includes('วงวน'));
  assert.deepEqual(cycles, ['a.md: requires เป็นวงวน: a → b → a']);
});

test('a broken link is a warning, but a link inside code is ignored', () => {
  const issues = checkWiki(makeWiki({ 'a.md': '# A\n\n[[missing]] and `[[example]]`' }));
  assert.deepEqual(messages(issues, 'warning'), ['a.md: ลิงก์ [[missing]] หาปลายทางไม่เจอ']);
  assert.deepEqual(messages(issues, 'error'), []);
});

test('a locked node whose requirements are all learned is a warning', () => {
  const issues = checkWiki(makeWiki({
    'a.md': skill({ status: 'locked' }),
    'b.md': skill({ status: 'learned', evidence: ['log.md'] }),
    'c.md': skill({ status: 'locked', requires: ['b'] }),
    'log.md': '# log',
  }));
  assert.deepEqual(messages(issues, 'warning'), ['a.md: เงื่อนไขครบแล้ว unlock ได้', 'c.md: เงื่อนไขครบแล้ว unlock ได้']);
});

test('more than one active project is a warning', () => {
  const issues = checkWiki(makeWiki({ 'p1/README.md': project('active'), 'p2/README.md': project('active') }));
  assert.equal(messages(issues, 'warning').length, 2);
});

test('invalid statuses are errors', () => {
  const issues = checkWiki(makeWiki({ 'a.md': skill({ status: 'finished' }), 'p/README.md': project('paused') }));
  assert.equal(messages(issues, 'error').length, 2);
});

test('unreadable frontmatter is an error', () => {
  const issues = checkWiki(makeWiki({ 'a.md': '---\nstatus: [oops\n---\n# A' }));
  assert.equal(messages(issues, 'error').length, 1);
});

test('errors are listed before warnings', () => {
  const issues = checkWiki(makeWiki({ 'a.md': '# A [[missing]]', 'b.md': skill({ status: 'learned' }) }));
  assert.deepEqual(issues.map((issue) => issue.level), ['error', 'warning']);
});
