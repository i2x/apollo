import { type Page, type Wiki, list, resolve, wikiPath } from './wiki.ts';

export type Backlink = { from: Page; via: 'link' | 'evidence' | 'concepts' | 'requires' };

/** Every page that points at target, through a [[link]] or a frontmatter reference. */
export function backlinksTo(wiki: Wiki, target: Page): Backlink[] {
  const backlinks: Backlink[] = [];
  for (const from of wiki.pages) {
    if (from === target) continue;
    if (from.links.some((link) => resolve(wiki, link) === target)) backlinks.push({ from, via: 'link' });
    if (list(from, 'evidence').some((value) => wikiPath(value) === target.path)) backlinks.push({ from, via: 'evidence' });
    if (list(from, 'concepts').includes(target.id)) backlinks.push({ from, via: 'concepts' });
    if (list(from, 'requires').includes(target.id)) backlinks.push({ from, via: 'requires' });
  }
  return backlinks;
}
