import { serve } from '@hono/node-server';
import { createApp } from './app.tsx';
import { PORT, WIKI_DIR } from './config.ts';

serve({ fetch: createApp(WIKI_DIR).fetch, port: PORT, hostname: '127.0.0.1' }, () => {
  console.log(`wiki: http://localhost:${PORT}  (อ่านจาก ${WIKI_DIR})`);
});
