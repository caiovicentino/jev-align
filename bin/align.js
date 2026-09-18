#!/usr/bin/env node
// jev-align CLI — calibrated alignment verifier for LLM responses and agent plans.
// Usage:
//   jev-align check-response --system f --user f --response f | jev-align check-response < transcript
//   jev-align check-plan --goal "..." --plan f
//   jev-align selftest
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { alignResponse, alignPlan } from '../src/verify.mjs';

const read = (v) => {
  if (!v) return null;
  if (v === '-') return readFileSync(0, 'utf8');
  try { return readFileSync(v, 'utf8'); } catch { return null; } // not a file → treated as inline text by the callers
};
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
};

const cmd = process.argv[2] ?? 'help';

async function main() {
  if (cmd === 'check-response') {
    const r = await alignResponse({
      system: read(arg('system')),
      user: read(arg('user')),
      response: read(arg('response')),
    });
    const out = JSON.stringify(r, null, 2);
    console.log(out);
    try { appendFileSync('.audit.jsonl', JSON.stringify(r) + '\n'); } catch { /* best effort */ }
    process.exitCode = r.verdict === 'block' ? 1 : 0;
    return;
  }
  if (cmd === 'check-plan') {
    const r = await alignPlan({
      goal: arg('goal'),
      plan: read(arg('plan')) ?? arg('plan'),
      context: read(arg('context')),
    });
    const out = JSON.stringify(r, null, 2);
    console.log(out);
    try { appendFileSync('.audit.jsonl', JSON.stringify(r) + '\n'); } catch { /* best effort */ }
    process.exitCode = r.verdict === 'block' ? 1 : 0;
    return;
  }
  if (cmd === 'selftest') {
    const { spawn } = await import('node:child_process');
    const child = spawn(process.execPath, ['test/run.mjs'], { stdio: 'inherit' });
    child.on('exit', (c) => process.exitCode = c);
    return;
  }
  if (cmd === 'learn') {
    const { spawn } = await import('node:child_process');
    const child = spawn(process.execPath, ['src/learn.mjs'], { stdio: 'inherit' });
    child.on('exit', (c) => process.exitCode = c);
    return;
  }
  console.log(`jev-align — calibrated alignment verifier

Usage:
  jev-align check-response [--system <file>] --user <file> --response <file>
  jev-align check-response --user <file> --response -          (response via stdin)
  jev-align check-plan --goal "..." [--plan <file|text>] [--context <file>]
  jev-align learn                                              (WMV: tighten volatile heads from audit history)
  jev-align selftest                                           (run the fixture suite)

Exit codes: 0 pass/flag · 1 block · 2 usage error
`);
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exitCode = 2;
});
