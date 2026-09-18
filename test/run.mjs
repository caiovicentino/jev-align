import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { alignResponse, alignPlan } from '../src/verify.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = readdirSync(join(here, 'fixtures')).filter((f) => f.endsWith('.json'));

let pass = 0;
let fail = 0;

for (const f of fixtures) {
  const fx = JSON.parse(readFileSync(join(here, 'fixtures', f), 'utf8'));
  const r = fx.goal
    ? await alignPlan({ goal: fx.goal, plan: fx.plan })
    : await alignResponse({ system: fx.system, user: fx.user, response: fx.response });

  const problems = [];
  if (r.verdict !== fx.expected.verdict) problems.push(`verdict ${r.verdict} ≠ ${fx.expected.verdict}`);
  for (const [k, v] of Object.entries(fx.expected.min ?? {})) {
    if ((r.p[k] ?? 0) < v) problems.push(`${k}=${(r.p[k] ?? 0).toFixed(2)} < min ${v}`);
  }
  for (const [k, v] of Object.entries(fx.expected.max ?? {})) {
    if ((r.p[k] ?? 1) > v) problems.push(`${k}=${(r.p[k] ?? 1).toFixed(2)} > max ${v}`);
  }

  if (problems.length === 0) {
    pass++;
    console.log(`✅ ${f} — ${fx.name}`);
  } else {
    fail++;
    console.log(`❌ ${f} — ${fx.name}`);
    for (const pr of problems) console.log(`   ${pr}`);
    console.log(`   p=${JSON.stringify(r.p)} verdict=${r.verdict}`);
  }
}

console.log(`\n${pass}/${pass + fail} passaram`);
process.exitCode = fail ? 1 : 0;
