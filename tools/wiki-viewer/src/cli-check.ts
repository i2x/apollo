import { checkWiki } from './check.ts';
import { WIKI_DIR } from './config.ts';
import { loadWiki } from './wiki.ts';

const wiki = loadWiki(WIKI_DIR);
const issues = checkWiki(wiki);

for (const issue of issues) {
  console.log(`${issue.level === 'error' ? '✗ error  ' : '! warning'} ${issue.path}: ${issue.message}`);
}

const errors = issues.filter((issue) => issue.level === 'error').length;
if (issues.length > 0) console.log('');
console.log(`${wiki.pages.length} หน้า · ${errors} error · ${issues.length - errors} warning`);
process.exitCode = errors > 0 ? 1 : 0;
