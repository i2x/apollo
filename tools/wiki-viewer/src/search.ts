import { type Page, type Wiki, text } from './wiki.ts';

export const TYPE_FILTERS = ['skill', 'project', 'playtest', 'other'];

export type SearchQuery = { q: string; type: string; status: string };
export type SearchHit = { page: Page; lines: string[] };

const MAX_LINES = 3;

/** Case-insensitive full-text search. An empty q lists every page that passes the filters. */
export function searchWiki(wiki: Wiki, query: SearchQuery): SearchHit[] {
  const needle = query.q.trim().toLocaleLowerCase();
  const scored: { hit: SearchHit; score: number }[] = [];

  for (const page of wiki.pages) {
    if (!matchesType(page, query.type)) continue;
    if (query.status && text(page, 'status') !== query.status) continue;
    if (!needle) {
      scored.push({ hit: { page, lines: [] }, score: 0 });
      continue;
    }
    const lines = page.body.split('\n')
      .map((line) => line.trim())
      .filter((line) => line.toLocaleLowerCase().includes(needle));
    const inName = page.id.toLocaleLowerCase().includes(needle) || page.title.toLocaleLowerCase().includes(needle);
    if (lines.length === 0 && !inName) continue;
    scored.push({ hit: { page, lines: lines.slice(0, MAX_LINES) }, score: lines.length + (inName ? 100 : 0) });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.hit.page.path.localeCompare(b.hit.page.path))
    .map(({ hit }) => hit);
}

function matchesType(page: Page, type: string): boolean {
  if (!type) return true;
  const pageType = text(page, 'type') ?? '';
  if (type === 'other') return !TYPE_FILTERS.includes(pageType);
  return pageType === type;
}
