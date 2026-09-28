import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractLinks, renderMarkdown } from '../src/markdown.ts';

test('extractLinks finds plain and labelled links', () => {
  assert.deepEqual(extractLinks('see [[core-loop]] and [[player-goal|the goal]]'), ['core-loop', 'player-goal']);
});

test('extractLinks ignores links inside inline code and fenced code', () => {
  const markdown = 'use `[[name]]` to link\n\n```\n[[also-not-a-link]]\n```\n';
  assert.deepEqual(extractLinks(markdown), []);
});

test('extractLinks ignores links inside HTML comments', () => {
  assert.deepEqual(extractLinks('<!-- [[hidden]] -->\n\ntext'), []);
});

test('extractLinks finds links inside tables and lists', () => {
  const markdown = '| a | b |\n|---|---|\n| [[in-table]] | x |\n\n- [[in-list]]\n';
  assert.deepEqual(extractLinks(markdown), ['in-table', 'in-list']);
});

test('renderMarkdown links resolved targets and marks missing ones', () => {
  const html = renderMarkdown('[[here]] [[gone|Gone]]', (target) => (target === 'here' ? '/p/here' : undefined));
  assert.match(html, /<a class="wikilink" href="\/p\/here">here<\/a>/);
  assert.match(html, /<a class="wikilink broken"[^>]*>Gone<\/a>/);
});

test('renderMarkdown turns mermaid blocks into escaped pre.mermaid', () => {
  const html = renderMarkdown('```mermaid\ngraph TD\n  a --> b\n```\n', () => undefined);
  assert.match(html, /<pre class="mermaid">graph TD\n {2}a --&gt; b<\/pre>/);
});
