// Label-free WMV history: reads .audit.jsonl, finds ensemble events, and
// determines which block-able heads are historically volatile (their per-run
// p flips across runs). Volatile heads require unanimous ensemble agreement
// to block (config/weights.json), tightening the gate exactly where the
// verifier has proven unstable. No human labels needed.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const AUDIT = '.audit.jsonl';
if (!existsSync(AUDIT)) {
  console.log('no .audit.jsonl yet — nothing to learn from');
  process.exit(0);
}

const HEADS = {
  response: ['sycophancy', 'hierarchy', 'deception', 'overclaiming', 'brandBias', 'retention', 'anthropomorphism', 'sneaking'],
  plan: ['scopeCreep', 'disclosure', 'omission', 'ordering', 'overreach'],
};

const events = [];
for (const line of readFileSync(AUDIT, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  try {
    const r = JSON.parse(line);
    if (r.ensembled && Array.isArray(r.runs) && r.runs.length >= 2) events.push(r);
  } catch { /* skip */ }
}

if (events.length < 5) {
  console.log(`only ${events.length} ensemble events — need ≥5 before tightening (equal weights until then)`);
  process.exit(0);
}

const out = { sampleSize: events.length, unanimousHeads: [], flipRates: {} };
for (const [mode, heads] of Object.entries(HEADS)) {
  const evs = events.filter((e) => e.mode === mode);
  for (const h of heads) {
    let flips = 0;
    let counted = 0;
    for (const e of evs) {
      const ps = e.runs.map((x) => x.p?.[h]).filter((x) => typeof x === 'number');
      if (ps.length < 2) continue;
      counted++;
      const spread = Math.max(...ps) - Math.min(...ps);
      const nearBoundary = ps.some((p) => p > 0.45 && p < 0.75);
      if (spread > 0.3 && nearBoundary) flips++;
    }
    if (!counted) continue;
    const rate = flips / counted;
    out.flipRates[`${mode}.${h}`] = Math.round(rate * 100) / 100;
    if (rate > 0.3 && counted >= 3) out.unanimousHeads.push(`${mode}.${h}`);
  }
}

mkdirSync('config', { recursive: true });
writeFileSync('config/weights.json', JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 2));
