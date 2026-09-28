import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { extractLinks } from './markdown.ts';

export type Page = {
  /** Link name: the file name without .md, or the folder name for README.md. */
  id: string;
  /** Path relative to the wiki root, always with "/" separators. */
  path: string;
  title: string;
  meta: Record<string, unknown>;
  metaError?: string;
  body: string;
  /** Targets of every [[...]] in the body. */
  links: string[];
};

export type Wiki = {
  root: string;
  pages: Page[];
  /** Normally one page per id; more than one is a duplicate the checker reports. */
  byId: Map<string, Page[]>;
  byPath: Map<string, Page>;
};

/** Reads the whole wiki from disk. Cheap enough to call on every request. */
export function loadWiki(root: string): Wiki {
  const pages = listMarkdown(root).map((rel) => readPage(root, rel));
  const byId = new Map<string, Page[]>();
  const byPath = new Map<string, Page>();
  for (const page of pages) {
    byId.set(page.id, [...(byId.get(page.id) ?? []), page]);
    byPath.set(page.path, page);
  }
  return { root, pages, byId, byPath };
}

// Folders whose name starts with "_" (templates) or "." are not part of the wiki.
function listMarkdown(root: string, dir = ''): string[] {
  const entries = readdirSync(path.join(root, dir), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  const files: string[] = [];
  for (const entry of entries) {
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('_') && !entry.name.startsWith('.')) files.push(...listMarkdown(root, rel));
    } else if (entry.name.endsWith('.md')) {
      files.push(rel);
    }
  }
  return files;
}

function readPage(root: string, rel: string): Page {
  const { meta, metaError, body } = splitFrontmatter(readFileSync(path.join(root, rel), 'utf8'));
  const id = pageId(root, rel);
  const heading = /^#\s+(.+)$/m.exec(body);
  return { id, path: rel, title: heading ? heading[1].trim() : id, meta, metaError, body, links: extractLinks(body) };
}

function pageId(root: string, rel: string): string {
  const base = path.posix.basename(rel, '.md');
  if (base !== 'README') return base;
  const folder = path.posix.dirname(rel);
  return folder === '.' ? path.basename(root) : path.posix.basename(folder);
}

/** On unreadable frontmatter the whole file stays in the body, so the broken block is visible on the page. */
export function splitFrontmatter(raw: string): { meta: Record<string, unknown>; metaError?: string; body: string } {
  let parsed: { data: unknown; content: string };
  try {
    parsed = matter(raw);
  } catch (err) {
    return { meta: {}, metaError: (err as Error).message.split('\n')[0], body: raw };
  }
  const { data, content } = parsed;
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { meta: {}, metaError: 'frontmatter ต้องเป็น key: value', body: content };
  }
  const meta = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, plainValue(value)]));
  return { meta, body: content };
}

// YAML reads `date: 2026-10-01` as a Date; the wiki treats it as the text it was written as.
function plainValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.map(plainValue);
  return value;
}

export function text(page: Page, key: string): string | undefined {
  const value = page.meta[key];
  return typeof value === 'string' ? value : undefined;
}

export function list(page: Page, key: string): string[] {
  const value = page.meta[key];
  if (value == null) return [];
  return (Array.isArray(value) ? value : [value]).map(String);
}

export function resolve(wiki: Wiki, target: string): Page | undefined {
  return wiki.byId.get(target.trim())?.[0];
}

/** Normalizes an evidence path (relative to the wiki root); undefined if it escapes the root. */
export function wikiPath(value: string): string | undefined {
  const normalized = path.posix.normalize(value.trim().replace(/\\/g, '/'));
  if (normalized.startsWith('..') || path.posix.isAbsolute(normalized)) return undefined;
  return normalized;
}
