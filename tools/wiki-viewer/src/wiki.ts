import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
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

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

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

export function splitFrontmatter(raw: string): { meta: Record<string, unknown>; metaError?: string; body: string } {
  const match = FRONTMATTER.exec(raw);
  if (!match) return { meta: {}, body: raw };
  const body = raw.slice(match[0].length);
  try {
    const parsed: unknown = parseYaml(match[1]);
    if (parsed == null) return { meta: {}, body };
    if (typeof parsed !== 'object' || Array.isArray(parsed)) return { meta: {}, metaError: 'frontmatter ต้องเป็น key: value', body };
    return { meta: parsed as Record<string, unknown>, body };
  } catch (err) {
    return { meta: {}, metaError: (err as Error).message.split('\n')[0], body };
  }
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
