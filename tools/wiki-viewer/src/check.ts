import { existsSync } from 'node:fs';
import path from 'node:path';
import { type Page, type Wiki, list, resolve, text, wikiPath } from './wiki.ts';

export type Issue = { level: 'error' | 'warning'; path: string; message: string };

export const SKILL_STATUSES = ['locked', 'learning', 'learned'];
export const PROJECT_STATUSES = ['not-started', 'active', 'done'];

/** Checks the wiki against the rules in docs/specs (§4.2, §11). Errors first, then by path. */
export function checkWiki(wiki: Wiki): Issue[] {
  const issues: Issue[] = [];
  const error = (page: Page, message: string) => issues.push({ level: 'error', path: page.path, message });
  const warn = (page: Page, message: string) => issues.push({ level: 'warning', path: page.path, message });

  const skills = wiki.pages.filter((page) => text(page, 'type') === 'skill');
  const skillById = new Map(skills.map((skill) => [skill.id, skill]));

  for (const page of wiki.pages) {
    if (page.metaError) error(page, `อ่าน frontmatter ไม่ได้: ${page.metaError}`);
    if ((wiki.byId.get(page.id)?.length ?? 0) > 1) {
      error(page, `ชื่อ "${page.id}" ซ้ำกับหน้าอื่น ลิงก์ [[${page.id}]] จะชี้ได้แค่หน้าเดียว`);
    }
    for (const target of page.links) {
      if (!resolve(wiki, target)) warn(page, `ลิงก์ [[${target}]] หาปลายทางไม่เจอ`);
    }
    for (const name of list(page, 'concepts')) {
      if (!skillById.has(name)) error(page, `concepts: ไม่มี node ชื่อ "${name}"`);
    }
    for (const evidence of list(page, 'evidence')) {
      if (!evidenceExists(wiki.root, evidence)) error(page, `evidence: ไม่พบไฟล์ "${evidence}"`);
    }
  }

  for (const skill of skills) {
    const status = text(skill, 'status');
    if (!status || !SKILL_STATUSES.includes(status)) {
      error(skill, `status "${status ?? ''}" ไม่ถูกต้อง ต้องเป็น ${SKILL_STATUSES.join(' / ')}`);
      continue;
    }
    const requires = list(skill, 'requires');
    const unknown = requires.filter((name) => !skillById.has(name));
    const pending = requires.filter((name) => skillById.has(name) && text(skillById.get(name)!, 'status') !== 'learned');
    for (const name of unknown) error(skill, `requires: ไม่มี node ชื่อ "${name}"`);
    if (status === 'learned' && list(skill, 'evidence').length === 0) error(skill, 'เป็น learned แต่ยังไม่มี evidence');
    if (status !== 'locked' && pending.length > 0) error(skill, `เป็น ${status} ทั้งที่ ${pending.join(', ')} ยังไม่ learned`);
    if (status === 'locked' && unknown.length === 0 && pending.length === 0) warn(skill, 'เงื่อนไขครบแล้ว unlock ได้');
  }

  for (const cycle of findCycles(skills)) {
    error(skillById.get(cycle[0])!, `requires เป็นวงวน: ${[...cycle, cycle[0]].join(' → ')}`);
  }

  const projects = wiki.pages.filter((page) => text(page, 'type') === 'project');
  for (const project of projects) {
    const status = text(project, 'status');
    if (!status || !PROJECT_STATUSES.includes(status)) {
      error(project, `status "${status ?? ''}" ไม่ถูกต้อง ต้องเป็น ${PROJECT_STATUSES.join(' / ')}`);
    }
  }
  const active = projects.filter((project) => text(project, 'status') === 'active');
  if (active.length > 1) {
    for (const project of active) warn(project, `มีโปรเจกต์ active พร้อมกัน ${active.length} โปรเจกต์`);
  }

  return issues.sort((a, b) => (a.level === b.level ? a.path.localeCompare(b.path) : a.level === 'error' ? -1 : 1));
}

function evidenceExists(root: string, evidence: string): boolean {
  const rel = wikiPath(evidence);
  return rel !== undefined && existsSync(path.join(root, rel));
}

/** Each cycle is listed once, as ids where every id requires the next. */
function findCycles(skills: Page[]): string[][] {
  const graph = new Map(skills.map((skill) => [skill.id, list(skill, 'requires')]));
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];
  const cycles: string[][] = [];
  const seen = new Set<string>();

  const visit = (id: string) => {
    state.set(id, 'visiting');
    stack.push(id);
    for (const next of graph.get(id) ?? []) {
      if (!graph.has(next)) continue;
      if (state.get(next) === 'visiting') {
        const cycle = stack.slice(stack.indexOf(next));
        const key = [...cycle].sort().join(',');
        if (!seen.has(key)) {
          seen.add(key);
          cycles.push(cycle);
        }
      } else if (!state.has(next)) {
        visit(next);
      }
    }
    stack.pop();
    state.set(id, 'done');
  };

  for (const id of graph.keys()) if (!state.has(id)) visit(id);
  return cycles;
}
