import { existsSync } from 'node:fs';
import path from 'node:path';
import { type Backlink, backlinksTo } from './backlinks.ts';
import { type Issue } from './check.ts';
import { branchProgress, nowSection, projectLadder, skillTreeMermaid } from './home.ts';
import { escapeHtml, pageHref, rawHref } from './html.ts';
import { renderMarkdown } from './markdown.ts';
import { type SearchHit, type SearchQuery, TYPE_FILTERS } from './search.ts';
import { type Page, type Wiki, resolve, text, wikiPath } from './wiki.ts';

const STATUS_ICONS: Record<string, string> = {
  learned: '✅', learning: '🔄', locked: '🔒',
  done: '✅', active: '🔄', 'not-started': '🔒',
};

const VIA_LABELS: Record<Backlink['via'], string> = {
  link: 'ลิงก์', evidence: 'ใช้เป็น evidence', concepts: 'concepts', requires: 'ต้องใช้ node นี้',
};

// Frontmatter keys whose values name other pages.
const PAGE_LIST_KEYS = ['requires', 'concepts', 'rules', 'project'];

export function layout(title: string, content: string, query = ''): string {
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · Apollo</title>
<link rel="stylesheet" href="/assets/style.css">
</head>
<body>
<header class="site">
  <a class="brand" href="/">Apollo</a>
  <form action="/search" method="get" role="search">
    <input type="search" name="q" value="${escapeHtml(query)}" placeholder="ค้นหาใน wiki" aria-label="ค้นหาใน wiki">
  </form>
</header>
<main>
${content}
</main>
<script src="/assets/mermaid.min.js"></script>
<script>
  mermaid.initialize({
    startOnLoad: true,
    securityLevel: 'loose',
    theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default',
  });
</script>
</body>
</html>`;
}

function linkTo(wiki: Wiki): (target: string) => string | undefined {
  return (target) => {
    const page = resolve(wiki, target);
    return page ? pageHref(page.id) : undefined;
  };
}

function pageLink(page: Page): string {
  const icon = STATUS_ICONS[text(page, 'status') ?? ''];
  return `<a href="${pageHref(page.id)}">${escapeHtml(page.id)}</a>${icon ? ` ${icon}` : ''}`;
}

function nameLink(wiki: Wiki, name: string): string {
  const page = resolve(wiki, name);
  return page ? pageLink(page) : `<a class="broken" title="ไม่พบหน้านี้">${escapeHtml(name)}</a>`;
}

function evidenceLink(wiki: Wiki, value: string): string {
  const rel = wikiPath(value);
  const page = rel ? wiki.byPath.get(rel) : undefined;
  if (page) return `<a href="${pageHref(page.id)}">${escapeHtml(value)}</a>`;
  if (rel && existsSync(path.join(wiki.root, rel))) return `<a href="${rawHref(rel)}">${escapeHtml(value)}</a>`;
  return `<a class="broken" title="ไม่พบไฟล์นี้">${escapeHtml(value)}</a>`;
}

function metaValue(wiki: Wiki, key: string, value: unknown): string {
  const values = Array.isArray(value) ? value.map(String) : [String(value)];
  if (values.length === 0) return '<span class="muted">—</span>';
  if (key === 'evidence') return values.map((v) => evidenceLink(wiki, v)).join(' · ');
  if (PAGE_LIST_KEYS.includes(key)) return values.map((v) => nameLink(wiki, v)).join(' · ');
  return escapeHtml(values.join(', '));
}

function metaPanel(wiki: Wiki, page: Page): string {
  const rows = Object.entries(page.meta)
    .filter(([key]) => key !== 'type' && key !== 'status')
    .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${metaValue(wiki, key, value)}</dd>`);
  const type = text(page, 'type');
  const status = text(page, 'status');
  const badges = [
    type ? `<span class="badge">${escapeHtml(type)}</span>` : '',
    status ? `<span class="badge status-${escapeHtml(status)}">${STATUS_ICONS[status] ?? ''} ${escapeHtml(status)}</span>` : '',
  ].join('');
  const error = page.metaError ? `<p class="issue error">อ่าน frontmatter ไม่ได้: ${escapeHtml(page.metaError)}</p>` : '';
  if (!badges && rows.length === 0 && !error) return '';
  return `<section class="meta">${badges ? `<div class="badges">${badges}</div>` : ''}${rows.length ? `<dl>${rows.join('')}</dl>` : ''}${error}</section>`;
}

function backlinksSection(wiki: Wiki, page: Page): string {
  const byPage = new Map<Page, string[]>();
  for (const { from, via } of backlinksTo(wiki, page)) byPage.set(from, [...(byPage.get(from) ?? []), VIA_LABELS[via]]);
  if (byPage.size === 0) return '';
  const items = [...byPage].map(([from, vias]) => `<li>${pageLink(from)} <span class="muted">· ${vias.join(', ')}</span></li>`);
  return `<section class="backlinks"><h2>หน้าที่ลิงก์มาที่นี่</h2><ul>${items.join('')}</ul></section>`;
}

export function renderPage(wiki: Wiki, page: Page): string {
  const content = `<p class="path">${escapeHtml(page.path)} · <a href="${rawHref(page.path)}">ไฟล์ดิบ</a></p>
${metaPanel(wiki, page)}
<article>${renderMarkdown(page.body, linkTo(wiki))}</article>
${backlinksSection(wiki, page)}`;
  return layout(page.title, content);
}

function issuesSection(wiki: Wiki, issues: Issue[]): string {
  if (issues.length === 0) return '<p class="ok">✓ ไม่พบปัญหา wiki เป็นไปตามกติกาทุกข้อ</p>';
  const items = issues.map((issue) => {
    const page = wiki.byPath.get(issue.path);
    const where = page ? `<a href="${pageHref(page.id)}">${escapeHtml(issue.path)}</a>` : escapeHtml(issue.path);
    return `<li class="issue ${issue.level}"><strong>${issue.level}</strong> ${where}: ${escapeHtml(issue.message)}</li>`;
  });
  return `<ul class="issues">${items.join('')}</ul>`;
}

export function renderHome(wiki: Wiki, issues: Issue[]): string {
  const now = nowSection(wiki);
  const progress = branchProgress(wiki)
    .map((b) => `<span class="chip">${escapeHtml(b.name)} ${b.locked && b.total === 0 ? '🔒' : `${b.learned}/${b.total}`}</span>`)
    .join('');
  const ladder = projectLadder(wiki)
    .map((project) => `<a class="rung status-${escapeHtml(text(project, 'status') ?? '')}" href="${pageHref(project.id)}">${STATUS_ICONS[text(project, 'status') ?? ''] ?? ''} ${escapeHtml(project.id)}</a>`);
  const engine = wiki.byId.get('engine')?.[0];
  if (engine) ladder.push(`<a class="rung" href="${pageHref(engine.id)}">${STATUS_ICONS[text(engine, 'status') ?? ''] ?? ''} engine</a>`);

  const content = `<h1>Apollo — Game Craft Wiki</h1>
<section class="now"><h2>ตอนนี้</h2>${now ? renderMarkdown(now, linkTo(wiki)) : '<p class="muted">ยังไม่มีส่วน "## ตอนนี้" ใน README.md</p>'}</section>
<section><h2>Skill tree</h2><div class="chips">${progress}</div><pre class="mermaid">${escapeHtml(skillTreeMermaid(wiki))}</pre></section>
<section><h2>บันไดโปรเจกต์</h2><nav class="ladder">${ladder.join('<span class="arrow">→</span>')}</nav></section>
<section><h2>ตรวจกติกา</h2>${issuesSection(wiki, issues)}</section>
<p class="muted"><a href="/p/how-this-wiki-works">วิธีใช้ wiki นี้</a> · <a href="/search">ดูทุกหน้า</a></p>`;
  return layout('หน้าแรก', content);
}

function select(name: string, options: string[], current: string, label: string): string {
  const items = ['', ...options].map((value) =>
    `<option value="${escapeHtml(value)}"${value === current ? ' selected' : ''}>${value ? escapeHtml(value) : `${label}ทั้งหมด`}</option>`);
  return `<select name="${name}" aria-label="${label}">${items.join('')}</select>`;
}

/** Strips the markdown syntax that makes a result line hard to read: [[links]], emphasis, list and table markers. */
function plainLine(line: string): string {
  return line
    .replace(/\[\[([^[\]|]+?)(?:\|([^[\]]+?))?\]\]/g, (_, target: string, label?: string) => label ?? target)
    .replace(/\*\*|__|`/g, '')
    .replace(/^([-*]|\d+\.|#+|>)\s+/, '')
    .replace(/^\||\|$/g, '')
    .replace(/\s*\|\s*/g, ' · ')
    .trim();
}

function highlight(raw: string, needle: string): string {
  const line = plainLine(raw);
  if (!needle) return escapeHtml(line);
  const index = line.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase());
  if (index < 0) return escapeHtml(line);
  return `${escapeHtml(line.slice(0, index))}<mark>${escapeHtml(line.slice(index, index + needle.length))}</mark>${escapeHtml(line.slice(index + needle.length))}`;
}

export function renderSearch(wiki: Wiki, query: SearchQuery, hits: SearchHit[]): string {
  const statuses = [...new Set(wiki.pages.map((page) => text(page, 'status')).filter((s): s is string => !!s))].sort();
  const needle = query.q.trim();
  const results = hits.map(({ page, lines }) => `<li>
  <a href="${pageHref(page.id)}">${escapeHtml(page.title)}</a> <span class="muted">${escapeHtml(page.path)}</span>
  ${lines.length ? `<ul class="lines">${lines.map((line) => `<li>${highlight(line, needle)}</li>`).join('')}</ul>` : ''}
</li>`);
  const content = `<h1>ค้นหา</h1>
<form class="search" action="/search" method="get">
  <input type="search" name="q" value="${escapeHtml(query.q)}" placeholder="คำที่ต้องการค้น" aria-label="คำค้น">
  ${select('type', TYPE_FILTERS, query.type, 'ประเภท')}
  ${select('status', statuses, query.status, 'สถานะ')}
  <button type="submit">ค้นหา</button>
</form>
<p class="muted">พบ ${hits.length} หน้า</p>
<ol class="results">${results.join('')}</ol>`;
  return layout(needle ? `ค้นหา "${needle}"` : 'ค้นหา', content, query.q);
}

export function renderNotFound(what: string): string {
  return layout('ไม่พบหน้า', `<h1>ไม่พบหน้า</h1><p>ไม่มีหน้า <code>${escapeHtml(what)}</code> ใน wiki</p><p><a href="/">กลับหน้าแรก</a></p>`);
}
