import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import { jsxRenderer } from 'hono/jsx-renderer';
import { checkWiki } from './check.ts';
import { VIEWER_DIR } from './config.ts';
import { searchWiki } from './search.ts';
import { ErrorView, HomeView, Layout, NotFoundView, PageView, SearchView } from './views.tsx';
import { loadWiki } from './wiki.ts';

declare module 'hono' {
  interface ContextRenderer {
    (content: string | Promise<string>, props: { title: string; query?: string }): Response | Promise<Response>;
  }
}

const ASSETS: Record<string, { file: string; type: string }> = {
  'style.css': { file: path.join(VIEWER_DIR, 'src/assets/style.css'), type: 'text/css; charset=utf-8' },
  'mermaid.min.js': { file: path.join(VIEWER_DIR, 'node_modules/mermaid/dist/mermaid.min.js'), type: 'text/javascript; charset=utf-8' },
};

const RAW_TYPES: Record<string, string> = {
  '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.csv': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.pdf': 'application/pdf',
};

/** The wiki is re-read from disk on every request, so edits show up on refresh. */
export function createApp(wikiDir: string): Hono {
  const root = path.resolve(wikiDir);
  const app = new Hono();

  app.use(jsxRenderer(({ children, title, query }) => <Layout title={title} query={query}>{children}</Layout>, { docType: true }));

  app.get('/assets/:name', (c) => {
    const asset = ASSETS[c.req.param('name')];
    if (!asset) return c.notFound();
    return c.body(readFileSync(asset.file), 200, { 'content-type': asset.type, 'cache-control': 'max-age=3600' });
  });

  app.get('/', (c) => {
    const wiki = loadWiki(root);
    return c.render(<HomeView wiki={wiki} issues={checkWiki(wiki)} />, { title: 'หน้าแรก' });
  });

  app.get('/p/:id', (c) => {
    const wiki = loadWiki(root);
    const page = wiki.byId.get(c.req.param('id'))?.[0];
    if (!page) return c.notFound();
    return c.render(<PageView wiki={wiki} page={page} />, { title: page.title });
  });

  app.get('/search', (c) => {
    const wiki = loadWiki(root);
    const query = { q: c.req.query('q') ?? '', type: c.req.query('type') ?? '', status: c.req.query('status') ?? '' };
    const needle = query.q.trim();
    return c.render(<SearchView wiki={wiki} query={query} hits={searchWiki(wiki, query)} />, {
      title: needle ? `ค้นหา "${needle}"` : 'ค้นหา',
      query: query.q,
    });
  });

  app.get('/raw/*', (c) => {
    // Decode once from the raw URL so an encoded "../" is caught by the containment check below.
    const rel = decodeURIComponent(new URL(c.req.url).pathname.slice('/raw/'.length));
    const file = path.resolve(root, rel);
    if (!file.startsWith(root + path.sep) || !existsSync(file) || !statSync(file).isFile()) return c.notFound();
    const type = RAW_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
    return c.body(readFileSync(file), 200, { 'content-type': type });
  });

  app.notFound((c) => {
    c.status(404);
    return c.render(<NotFoundView what={decodeURIComponent(c.req.path)} />, { title: 'ไม่พบหน้า' });
  });

  app.onError((error, c) => {
    c.status(500);
    return c.render(<ErrorView error={error} />, { title: 'เกิดข้อผิดพลาด' });
  });

  return app;
}
