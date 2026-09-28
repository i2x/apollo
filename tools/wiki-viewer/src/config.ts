import path from 'node:path';

export const VIEWER_DIR = path.resolve(import.meta.dirname, '..');
export const WIKI_DIR = path.resolve(process.env.WIKI_DIR ?? path.join(VIEWER_DIR, '../../wiki'));
export const PORT = Number(process.env.PORT ?? 4000);
