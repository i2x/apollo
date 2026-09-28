import { pageHref } from './html.ts';
import { type Page, type Wiki, list, text } from './wiki.ts';

export type BranchProgress = { name: string; learned: number; total: number; locked: boolean };

/** One entry per folder under skills/, in path order. A branch README with status locked marks the branch locked. */
export function branchProgress(wiki: Wiki): BranchProgress[] {
  const branches = new Map<string, BranchProgress>();
  for (const page of wiki.pages) {
    const match = /^skills\/([^/]+)\//.exec(page.path);
    if (!match) continue;
    const branch = branches.get(match[1]) ?? { name: match[1], learned: 0, total: 0, locked: false };
    if (text(page, 'type') === 'skill') {
      branch.total++;
      if (text(page, 'status') === 'learned') branch.learned++;
    } else if (page.path.endsWith('/README.md') && text(page, 'status') === 'locked') {
      branch.locked = true;
    }
    branches.set(match[1], branch);
  }
  return [...branches.values()];
}

const STATUS_CLASSES = ['learned', 'learning', 'locked'];

/** Mermaid flowchart of every skill: an edge runs from each required node to the node that needs it. */
export function skillTreeMermaid(wiki: Wiki): string {
  const skills = wiki.pages.filter((page) => text(page, 'type') === 'skill');
  // Mermaid ids are generated so that page ids never need escaping.
  const nodeId = new Map(skills.map((skill, i) => [skill.id, `s${i}`]));
  const lines = ['graph TD'];
  for (const skill of skills) {
    const status = text(skill, 'status') ?? '';
    lines.push(`  ${nodeId.get(skill.id)}["${skill.id}"]:::${STATUS_CLASSES.includes(status) ? status : 'locked'}`);
  }
  for (const skill of skills) {
    for (const name of list(skill, 'requires')) {
      const from = nodeId.get(name);
      if (from) lines.push(`  ${from} --> ${nodeId.get(skill.id)}`);
    }
  }
  for (const skill of skills) lines.push(`  click ${nodeId.get(skill.id)} href "${pageHref(skill.id)}"`);
  lines.push(
    '  classDef learned fill:#2f7d4f,stroke:#1d5234,color:#ffffff',
    '  classDef learning fill:#f2b33d,stroke:#a8741a,color:#1f1a10',
    '  classDef locked fill:#e4e2dd,stroke:#a9a59c,color:#5b5850',
  );
  return lines.join('\n');
}

export function projectLadder(wiki: Wiki): Page[] {
  return wiki.pages
    .filter((page) => text(page, 'type') === 'project')
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** The hand-written "## ตอนนี้" section of the root README, up to the next "## " heading. */
export function nowSection(wiki: Wiki): string | undefined {
  const readme = wiki.byPath.get('README.md');
  if (!readme) return undefined;
  const match = /^## ตอนนี้[ \t]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(readme.body);
  return match ? match[1].trim() : undefined;
}
