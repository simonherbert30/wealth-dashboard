// Validates every inline <script> in index.html so a JS syntax error
// can never ship silently (a broken inline script blanks the whole app).
// Run locally with `npm run check` and in CI on every push.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (scripts.length === 0) {
  console.error('check-syntax: no inline <script> block found in index.html');
  process.exit(1);
}

let failed = 0;
scripts.forEach((code, i) => {
  try {
    new vm.Script(code, { filename: `index.html#inline-${i}` });
  } catch (e) {
    failed++;
    console.error(`check-syntax: syntax error in inline script #${i}: ${e.message}`);
  }
});

if (failed) {
  console.error(`check-syntax: FAILED (${failed} of ${scripts.length} inline scripts have errors)`);
  process.exit(1);
}
console.log(`check-syntax: OK (${scripts.length} inline script(s) parsed clean)`);
