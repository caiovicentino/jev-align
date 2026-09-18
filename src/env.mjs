import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

function loadDotEnv() {
  const paths = [resolve(here, '..', '.env'), resolve(process.cwd(), '.env'), resolve(here, '..', '..', '.env')];
  for (const p of paths) {
    try {
      for (const line of readFileSync(p, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
        if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
      return;
    } catch { /* try next */ }
  }
}
loadDotEnv();
