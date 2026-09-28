import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadWiki, type Wiki } from '../src/wiki.ts';

/** Writes files into a fresh temporary wiki folder and loads it. */
export function makeWiki(files: Record<string, string>): Wiki {
  const root = path.join(mkdtempSync(path.join(tmpdir(), 'wiki-test-')), 'wiki');
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  mkdirSync(root, { recursive: true });
  return loadWiki(root);
}

type SkillOptions = { status?: string; requires?: string[]; evidence?: string[]; body?: string };

export function skill({ status = 'learning', requires = [], evidence = [], body = '' }: SkillOptions = {}): string {
  return `---
type: skill
status: ${status}
requires: [${requires.join(', ')}]
evidence: [${evidence.join(', ')}]
---
# Skill

${body}
`;
}

export function project(status: string, concepts: string[] = []): string {
  return `---
type: project
status: ${status}
concepts: [${concepts.join(', ')}]
---
# Project
`;
}
