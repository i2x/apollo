import { Marked, type Tokens, type TokenizerAndRendererExtension } from 'marked';
import { escapeHtml } from './html.ts';

// [[target]] or [[target|label]]
const WIKILINK = /^\[\[([^[\]|\n]+?)(?:\|([^[\]\n]+?))?\]\]/;

type WikiLinkToken = Tokens.Generic & { type: 'wikilink'; target: string; label: string };

/** Returns the href for a link target, or undefined when the target does not exist. */
export type LinkResolver = (target: string) => string | undefined;

function wikilinkExtension(resolve: LinkResolver): TokenizerAndRendererExtension {
  return {
    name: 'wikilink',
    level: 'inline',
    start(src) {
      const index = src.indexOf('[[');
      return index < 0 ? undefined : index;
    },
    tokenizer(src) {
      const match = WIKILINK.exec(src);
      if (!match) return undefined;
      const token: WikiLinkToken = {
        type: 'wikilink',
        raw: match[0],
        target: match[1].trim(),
        label: (match[2] ?? match[1]).trim(),
      };
      return token;
    },
    renderer(token) {
      const { target, label } = token as WikiLinkToken;
      const href = resolve(target);
      if (!href) return `<a class="wikilink broken" title="ไม่พบหน้า ${escapeHtml(target)}">${escapeHtml(label)}</a>`;
      return `<a class="wikilink" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
    },
  };
}

// Links are found with the same tokenizer that renders them, so [[...]] inside code is never counted.
const linkLexer = new Marked({ extensions: [wikilinkExtension(() => undefined)] });

export function extractLinks(markdown: string): string[] {
  const targets: string[] = [];
  linkLexer.walkTokens(linkLexer.lexer(markdown), (token) => {
    if (token.type === 'wikilink') targets.push((token as WikiLinkToken).target);
  });
  return targets;
}

export function renderMarkdown(markdown: string, resolve: LinkResolver): string {
  const marked = new Marked({
    extensions: [wikilinkExtension(resolve)],
    renderer: {
      code({ text, lang }) {
        if (lang === 'mermaid') return `<pre class="mermaid">${escapeHtml(text)}</pre>\n`;
        return false;
      },
    },
  });
  return marked.parse(markdown, { async: false });
}
