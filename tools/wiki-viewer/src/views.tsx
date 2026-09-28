import type { FC, PropsWithChildren } from 'hono/jsx';
import { type Backlink, backlinksTo } from './backlinks.ts';
import { type Issue } from './check.ts';
import { branchProgress, nowSection, projectLadder, skillTreeMermaid } from './home.ts';
import { pageHref, rawHref } from './html.ts';
import { renderMarkdown } from './markdown.ts';
import { type SearchHit, type SearchQuery, TYPE_FILTERS } from './search.ts';
import { type Page, type Wiki, resolve, text, wikiPath } from './wiki.ts';
import { existsSync } from 'node:fs';
import path from 'node:path';

const STATUS_ICONS: Record<string, string> = {
  learned: '✅', learning: '🔄', locked: '🔒',
  done: '✅', active: '🔄', 'not-started': '🔒',
};

const VIA_LABELS: Record<Backlink['via'], string> = {
  link: 'ลิงก์', evidence: 'ใช้เป็น evidence', concepts: 'concepts', requires: 'ต้องใช้ node นี้',
};

// Frontmatter keys whose values name other pages.
const PAGE_LIST_KEYS = ['requires', 'concepts', 'rules', 'project'];

const MERMAID_INIT = `mermaid.initialize({
  startOnLoad: true,
  securityLevel: 'loose',
  theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default',
});`;

export const Layout: FC<PropsWithChildren<{ title: string; query?: string }>> = ({ title, query = '', children }) => (
  <html lang="th">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title} · Apollo</title>
      <link rel="stylesheet" href="/assets/style.css" />
    </head>
    <body>
      <header class="site">
        <a class="brand" href="/">Apollo</a>
        <form action="/search" method="get" role="search">
          <input type="search" name="q" value={query} placeholder="ค้นหาใน wiki" aria-label="ค้นหาใน wiki" />
        </form>
      </header>
      <main>{children}</main>
      <script src="/assets/mermaid.min.js"></script>
      <script dangerouslySetInnerHTML={{ __html: MERMAID_INIT }} />
    </body>
  </html>
);

const Markdown: FC<{ wiki: Wiki; source: string; tag?: 'article' | 'div' }> = ({ wiki, source, tag = 'div' }) => {
  const html = renderMarkdown(source, (target) => {
    const page = resolve(wiki, target);
    return page ? pageHref(page.id) : undefined;
  });
  return tag === 'article' ? <article dangerouslySetInnerHTML={{ __html: html }} /> : <div dangerouslySetInnerHTML={{ __html: html }} />;
};

const statusIcon = (page: Page) => STATUS_ICONS[text(page, 'status') ?? ''];

const PageLink: FC<{ page: Page }> = ({ page }) => {
  const icon = statusIcon(page);
  return <><a href={pageHref(page.id)}>{page.id}</a>{icon ? ` ${icon}` : ''}</>;
};

const Broken: FC<{ label: string; title: string }> = ({ label, title }) => <a class="broken" title={title}>{label}</a>;

const NameLink: FC<{ wiki: Wiki; name: string }> = ({ wiki, name }) => {
  const page = resolve(wiki, name);
  return page ? <PageLink page={page} /> : <Broken label={name} title="ไม่พบหน้านี้" />;
};

const EvidenceLink: FC<{ wiki: Wiki; value: string }> = ({ wiki, value }) => {
  const rel = wikiPath(value);
  const page = rel ? wiki.byPath.get(rel) : undefined;
  if (page) return <a href={pageHref(page.id)}>{value}</a>;
  if (rel && existsSync(path.join(wiki.root, rel))) return <a href={rawHref(rel)}>{value}</a>;
  return <Broken label={value} title="ไม่พบไฟล์นี้" />;
};

const Joined: FC<{ items: unknown[] }> = ({ items }) => <>{items.map((item, i) => <>{i > 0 && ' · '}{item}</>)}</>;

const MetaValue: FC<{ wiki: Wiki; name: string; value: unknown }> = ({ wiki, name, value }) => {
  const values = Array.isArray(value) ? value.map(String) : [String(value)];
  if (values.length === 0) return <span class="muted">—</span>;
  if (name === 'evidence') return <Joined items={values.map((v) => <EvidenceLink wiki={wiki} value={v} />)} />;
  if (PAGE_LIST_KEYS.includes(name)) return <Joined items={values.map((v) => <NameLink wiki={wiki} name={v} />)} />;
  return <>{values.join(', ')}</>;
};

const MetaPanel: FC<{ wiki: Wiki; page: Page }> = ({ wiki, page }) => {
  const type = text(page, 'type');
  const status = text(page, 'status');
  const rows = Object.entries(page.meta).filter(([key]) => key !== 'type' && key !== 'status');
  if (!type && !status && rows.length === 0 && !page.metaError) return null;
  return (
    <section class="meta">
      {(type || status) && (
        <div class="badges">
          {type && <span class="badge">{type}</span>}
          {status && <span class={`badge status-${status}`}>{STATUS_ICONS[status] ?? ''} {status}</span>}
        </div>
      )}
      {rows.length > 0 && (
        <dl>
          {rows.map(([key, value]) => <><dt>{key}</dt><dd><MetaValue wiki={wiki} name={key} value={value} /></dd></>)}
        </dl>
      )}
      {page.metaError && <p class="issue error">อ่าน frontmatter ไม่ได้: {page.metaError}</p>}
    </section>
  );
};

const Backlinks: FC<{ wiki: Wiki; page: Page }> = ({ wiki, page }) => {
  const byPage = new Map<Page, string[]>();
  for (const { from, via } of backlinksTo(wiki, page)) byPage.set(from, [...(byPage.get(from) ?? []), VIA_LABELS[via]]);
  if (byPage.size === 0) return null;
  return (
    <section class="backlinks">
      <h2>หน้าที่ลิงก์มาที่นี่</h2>
      <ul>
        {[...byPage].map(([from, vias]) => <li><PageLink page={from} /> <span class="muted">· {vias.join(', ')}</span></li>)}
      </ul>
    </section>
  );
};

export const PageView: FC<{ wiki: Wiki; page: Page }> = ({ wiki, page }) => (
  <>
    <p class="path">{page.path} · <a href={rawHref(page.path)}>ไฟล์ดิบ</a></p>
    <MetaPanel wiki={wiki} page={page} />
    <Markdown wiki={wiki} source={page.body} tag="article" />
    <Backlinks wiki={wiki} page={page} />
  </>
);

const Issues: FC<{ wiki: Wiki; issues: Issue[] }> = ({ wiki, issues }) => {
  if (issues.length === 0) return <p class="ok">✓ ไม่พบปัญหา wiki เป็นไปตามกติกาทุกข้อ</p>;
  return (
    <ul class="issues">
      {issues.map((issue) => {
        const page = wiki.byPath.get(issue.path);
        return (
          <li class={`issue ${issue.level}`}>
            <strong>{issue.level}</strong> {page ? <a href={pageHref(page.id)}>{issue.path}</a> : issue.path}: {issue.message}
          </li>
        );
      })}
    </ul>
  );
};

export const HomeView: FC<{ wiki: Wiki; issues: Issue[] }> = ({ wiki, issues }) => {
  const now = nowSection(wiki);
  const rungs = projectLadder(wiki);
  const engine = wiki.byId.get('engine')?.[0];
  if (engine) rungs.push(engine);
  return (
    <>
      <h1>Apollo — Game Craft Wiki</h1>
      <section class="now">
        <h2>ตอนนี้</h2>
        {now ? <Markdown wiki={wiki} source={now} /> : <p class="muted">ยังไม่มีส่วน "## ตอนนี้" ใน README.md</p>}
      </section>
      <section>
        <h2>Skill tree</h2>
        <div class="chips">
          {branchProgress(wiki).map((b) => <span class="chip">{b.name} {b.locked && b.total === 0 ? '🔒' : `${b.learned}/${b.total}`}</span>)}
        </div>
        <pre class="mermaid">{skillTreeMermaid(wiki)}</pre>
      </section>
      <section>
        <h2>บันไดโปรเจกต์</h2>
        <nav class="ladder">
          {rungs.map((page, i) => (
            <>
              {i > 0 && <span class="arrow">→</span>}
              <a class={`rung status-${text(page, 'status') ?? ''}`} href={pageHref(page.id)}>{statusIcon(page) ?? ''} {page.id}</a>
            </>
          ))}
        </nav>
      </section>
      <section>
        <h2>ตรวจกติกา</h2>
        <Issues wiki={wiki} issues={issues} />
      </section>
      <p class="muted"><a href={pageHref('how-this-wiki-works')}>วิธีใช้ wiki นี้</a> · <a href="/search">ดูทุกหน้า</a></p>
    </>
  );
};

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

const Highlight: FC<{ line: string; needle: string }> = ({ line, needle }) => {
  const plain = plainLine(line);
  const index = needle ? plain.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase()) : -1;
  if (index < 0) return <>{plain}</>;
  return <>{plain.slice(0, index)}<mark>{plain.slice(index, index + needle.length)}</mark>{plain.slice(index + needle.length)}</>;
};

const Select: FC<{ name: string; options: string[]; current: string; label: string }> = ({ name, options, current, label }) => (
  <select name={name} aria-label={label}>
    {['', ...options].map((value) => <option value={value} selected={value === current}>{value || `${label}ทั้งหมด`}</option>)}
  </select>
);

export const SearchView: FC<{ wiki: Wiki; query: SearchQuery; hits: SearchHit[] }> = ({ wiki, query, hits }) => {
  const statuses = [...new Set(wiki.pages.map((page) => text(page, 'status')).filter((s): s is string => !!s))].sort();
  const needle = query.q.trim();
  return (
    <>
      <h1>ค้นหา</h1>
      <form class="search" action="/search" method="get">
        <input type="search" name="q" value={query.q} placeholder="คำที่ต้องการค้น" aria-label="คำค้น" />
        <Select name="type" options={TYPE_FILTERS} current={query.type} label="ประเภท" />
        <Select name="status" options={statuses} current={query.status} label="สถานะ" />
        <button type="submit">ค้นหา</button>
      </form>
      <p class="muted">พบ {hits.length} หน้า</p>
      <ol class="results">
        {hits.map(({ page, lines }) => (
          <li>
            <a href={pageHref(page.id)}>{page.title}</a> <span class="muted">{page.path}</span>
            {lines.length > 0 && <ul class="lines">{lines.map((line) => <li><Highlight line={line} needle={needle} /></li>)}</ul>}
          </li>
        ))}
      </ol>
    </>
  );
};

export const NotFoundView: FC<{ what: string }> = ({ what }) => (
  <>
    <h1>ไม่พบหน้า</h1>
    <p>ไม่มีหน้า <code>{what}</code> ใน wiki</p>
    <p><a href="/">กลับหน้าแรก</a></p>
  </>
);

export const ErrorView: FC<{ error: Error }> = ({ error }) => (
  <>
    <h1>เกิดข้อผิดพลาด</h1>
    <pre>{error.stack ?? error.message}</pre>
  </>
);
