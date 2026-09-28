import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { checkWiki } from './check.ts';
import { PORT, VIEWER_DIR, WIKI_DIR } from './config.ts';
import { escapeHtml } from './html.ts';
import { renderHome, renderNotFound, renderPage, renderSearch } from './render.ts';
import { searchWiki } from './search.ts';
import { loadWiki } from './wiki.ts';

type Response = { status: number; type: string; body: string | Buffer; cache?: boolean };

const HTML = 'text/html; charset=utf-8';

const ASSETS: Record<string, { file: string; type: string }> = {
  'style.css': { file: path.join(VIEWER_DIR, 'src/assets/style.css'), type: 'text/css; charset=utf-8' },
  'mermaid.min.js': { file: path.join(VIEWER_DIR, 'node_modules/mermaid/dist/mermaid.min.js'), type: 'text/javascript; charset=utf-8' },
};

const RAW_TYPES: Record<string, string> = {
  '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.csv': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.pdf': 'application/pdf',
};

function route(url: URL): Response {
  if (url.pathname.startsWith('/assets/')) {
    const asset = ASSETS[url.pathname.slice('/assets/'.length)];
    if (!asset) return notFound(url.pathname);
    return { status: 200, type: asset.type, body: readFileSync(asset.file), cache: true };
  }

  // The wiki is re-read on every request, so edits show up on refresh.
  const wiki = loadWiki(WIKI_DIR);

  if (url.pathname === '/') return page(renderHome(wiki, checkWiki(wiki)));

  if (url.pathname.startsWith('/p/')) {
    const id = decodeURIComponent(url.pathname.slice('/p/'.length));
    const found = wiki.byId.get(id)?.[0];
    return found ? page(renderPage(wiki, found)) : notFound(id);
  }

  if (url.pathname === '/search') {
    const query = {
      q: url.searchParams.get('q') ?? '',
      type: url.searchParams.get('type') ?? '',
      status: url.searchParams.get('status') ?? '',
    };
    return page(renderSearch(wiki, query, searchWiki(wiki, query)));
  }

  if (url.pathname.startsWith('/raw/')) {
    const rel = decodeURIComponent(url.pathname.slice('/raw/'.length));
    const file = path.resolve(WIKI_DIR, rel);
    const insideWiki = file.startsWith(WIKI_DIR + path.sep);
    if (!insideWiki || !existsSync(file) || !statSync(file).isFile()) return notFound(rel);
    const type = RAW_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
    return { status: 200, type, body: readFileSync(file) };
  }

  return notFound(url.pathname);
}

function page(body: string): Response {
  return { status: 200, type: HTML, body };
}

function notFound(what: string): Response {
  return { status: 404, type: HTML, body: renderNotFound(what) };
}

const server = createServer((req, res) => {
  let response: Response;
  try {
    response = route(new URL(req.url ?? '/', 'http://localhost'));
  } catch (err) {
    const detail = err instanceof Error ? err.stack ?? err.message : String(err);
    response = { status: 500, type: HTML, body: `<h1>500</h1><pre>${escapeHtml(detail)}</pre>` };
  }
  res.writeHead(response.status, {
    'content-type': response.type,
    'cache-control': response.cache ? 'max-age=3600' : 'no-store',
  });
  res.end(response.body);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`wiki: http://localhost:${PORT}  (อ่านจาก ${WIKI_DIR})`);
});
