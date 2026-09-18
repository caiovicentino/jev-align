// Complete evaluation of jev-align: verdict accuracy, per-head separation,
// FP/FN rates, consistency (3x), latency/cost, robustness.
// Mirrors jev-shield's eval methodology.
import { alignResponse, alignPlan } from '../src/verify.mjs';
import { CASES } from './cases.mjs';
import { writeFileSync } from 'node:fs';

const THRESH = { blockish: 'block', flagish: 'flag' };

async function run(c) {
  const t0 = performance.now();
  const r = c.mode === 'plan'
    ? await alignPlan({ goal: c.goal, plan: c.plan, context: c.context })
    : await alignResponse({ system: c.system, user: c.user, response: c.response });
  r.ms = Math.round(performance.now() - t0);
  return r;
}

function checkExpect(c, r) {
  const errs = [];
  const expectedVerdicts = c.expect.verdict ?? 'flag';
  if (Array.isArray(expectedVerdicts)) {
    if (!expectedVerdicts.includes(r.verdict)) errs.push(`verdict ${r.verdict} ∉ [${expectedVerdicts}]`);
  } else if (r.verdict !== expectedVerdicts) {
    errs.push(`verdict ${r.verdict} ≠ ${expectedVerdicts}`);
  }
  for (const [h, v] of Object.entries(c.expect.headMin ?? {})) {
    if ((r.p[h] ?? 0) < v) errs.push(`${h}=${(r.p[h] ?? 0).toFixed(2)} < ${v}`);
  }
  for (const [h, v] of Object.entries(c.expect.headMax ?? {})) {
    if ((r.p[h] ?? 1) > v) errs.push(`${h}=${(r.p[h] ?? 1).toFixed(2)} > ${v}`);
  }
  return errs;
}

// ---------- Pass 1: accuracy + head separation ----------
const results = [];
for (const c of CASES) {
  const r = await run(c);
  r.errors = checkExpect(c, r);
  results.push({ case: c, r });
}

const byCat = {};
for (const { case: c, r } of results) {
  byCat[c.category] ??= { n: 0, ok: 0, verdicts: [] };
  byCat[c.category].n++;
  byCat[c.category].ok += r.errors.length === 0 ? 1 : 0;
  byCat[c.category].verdicts.push(r.verdict);
}

// head separation: positives (headMin) vs negatives (headMax) per head
const sep = {};
for (const { case: c, r } of results) {
  for (const h of Object.keys(c.expect.headMin ?? {})) (sep[h] ??= { pos: [], neg: [] }).pos.push({ id: c.id, p: r.p[h] ?? 0 });
  for (const h of Object.keys(c.expect.headMax ?? {})) (sep[h] ??= { pos: [], neg: [] }).neg.push({ id: c.id, p: r.p[h] ?? 1 });
}
for (const [h, s] of Object.entries(sep)) {
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y.p, 0) / a.length : null);
  sep[h] = { posMean: mean(s.pos), negMean: mean(s.neg), nPos: s.pos.length, nNeg: s.neg.length };
}

// ---------- Pass 2: consistency (3x on all cases) ----------
const consistency = [];
for (const c of CASES) {
  const runs = [results.find((x) => x.case.id === c.id).r.verdict];
  for (let i = 0; i < 2; i++) {
    const r = await run(c);
    runs.push(r.verdict);
  }
  const agree = runs.every((v) => v === runs[0]);
  consistency.push({ id: c.id, runs, agree });
}

// ---------- Report ----------
const total = results.length;
const okCount = results.filter((x) => x.r.errors.length === 0).length;
const lat = results.map((x) => x.r.ms).sort((a, b) => a - b);
const tokens = results.reduce((s, x) => s + (x.r.tokens ?? 0), 0);
const consistentCount = consistency.filter((c) => c.agree).length;

let md = `# jev-align — complete evaluation\n\nGenerated ${new Date().toISOString()}\n\n`;
md += `## Summary\n\n- **Cases**: ${total} (${Object.keys(byCat).length} categories)\n- **Verdict+head accuracy**: ${okCount}/${total} (${(100 * okCount / total).toFixed(0)}%)\n- **Consistency (3×)**: ${consistentCount}/${total} agree (${(100 * consistentCount / total).toFixed(0)}%)\n- **Latency**: p50 ${lat[Math.floor(lat.length / 2)]}ms · p95 ${lat[Math.floor(lat.length * 0.95)]}ms\n- **Cost**: ~${(tokens * 4.2e-8 * total).toFixed(4)} USD total (${tokens} input tokens)\n\n`;
md += `## Per category\n\n| category | n | accuracy | verdicts |\n|---|---|---|---|\n`;
for (const [k, v] of Object.entries(byCat)) {
  md += `| ${k} | ${v.n} | ${v.ok}/${v.n} | ${v.verdicts.join(' ')} |\n`;
}
md += `\n## Head separation (positives vs negatives)\n\n| head | pos mean (n) | neg mean (n) | separation |\n|---|---|---|---|\n`;
for (const [h, s] of Object.entries(sep)) {
  const d = s.posMean != null && s.negMean != null ? (s.posMean - s.negMean) : null;
  md += `| ${h} | ${s.posMean?.toFixed(2) ?? '—'} (${s.nPos}) | ${s.negMean?.toFixed(2) ?? '—'} (${s.nNeg}) | ${d?.toFixed(2) ?? '—'} |\n`;
}
md += `\n## Failures\n\n`;
const failures = results.filter((x) => x.r.errors.length > 0);
if (failures.length === 0) md += `None. All verdicts and head bounds matched expectations.\n`;
else for (const f of failures) md += `- **${f.case.id}** (${f.case.category}): ${f.r.errors.join('; ')} — got verdict ${f.r.verdict}, p=${JSON.stringify(f.r.p)}\n`;
md += `\n## Consistency disagreements\n\n`;
const dis = consistency.filter((c) => !c.agree);
if (dis.length === 0) md += `None — every case returned the same verdict across 3 runs.\n`;
else for (const d of dis) md += `- **${d.id}**: ${d.runs.join(' vs ')}\n`;

writeFileSync('eval/report.md', md);
writeFileSync('eval/report.json', JSON.stringify({ total, okCount, consistentCount, sep, byCat, latency: { p50: lat[Math.floor(lat.length / 2)], p95: lat[Math.floor(lat.length * 0.95)] }, results: results.map(({ case: c, r }) => ({ id: c.id, category: c.category, verdict: r.verdict, p: r.p, ms: r.ms, errors: r.errors })), consistency }, null, 2));
console.log(md);
