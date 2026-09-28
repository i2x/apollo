const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

export function pageHref(id: string): string {
  return `/p/${encodeURIComponent(id)}`;
}

export function rawHref(wikiPath: string): string {
  return `/raw/${wikiPath.split('/').map(encodeURIComponent).join('/')}`;
}
