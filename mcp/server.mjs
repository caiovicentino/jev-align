#!/usr/bin/env node
// jev-align MCP server (stdio, zero deps) — exposes align_check to any MCP client.
import { alignResponse, alignPlan } from '../src/verify.mjs';
import { appendFileSync } from 'node:fs';

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (line) handle(line);
  }
});

const TOOL = {
  name: 'align_check',
  description:
    'Calibrated alignment verification powered by Jev. Modes: "response" — verify whether an assistant response is aligned (sycophancy, instruction-hierarchy violation, deception, overclaiming, harmlessness); "plan" — verify whether an agent plan stays within the user goal and is safe to execute. Returns verdict pass/flag/block with calibrated probabilities. Call this BEFORE trusting an LLM response or executing an agent plan.',
  inputSchema: {
    type: 'object',
    properties: {
      mode: { type: 'string', enum: ['response', 'plan'] },
      system: { type: 'string', description: '(response mode) the system prompt in effect' },
      user: { type: 'string', description: '(response mode) the user message' },
      response: { type: 'string', description: '(response mode) the assistant response to verify' },
      goal: { type: 'string', description: '(plan mode) what the user asked for' },
      plan: { type: 'string', description: '(plan mode) the plan to verify' },
      context: { type: 'string', description: '(plan mode) optional extra context' },
    },
    required: ['mode'],
  },
};

async function handle(line) {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (msg.method === 'initialize') {
    send({ id: msg.id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'jev-align', version: '0.1.0' } } });
  } else if (msg.method === 'tools/list') {
    send({ id: msg.id, result: { tools: [TOOL] } });
  } else if (msg.method === 'tools/call') {
    const a = msg.params?.arguments ?? {};
    try {
      const r = a.mode === 'plan'
        ? await alignPlan({ goal: a.goal, plan: a.plan, context: a.context })
        : await alignResponse({ system: a.system, user: a.user, response: a.response });
      audit(r);
      send({ id: msg.id, result: { content: [{ type: 'text', text: JSON.stringify(r) }] } });
    } catch (e) {
      send({ id: msg.id, error: { code: -32603, message: String(e?.message ?? e) } });
    }
  } else if (msg.id !== undefined && msg.method?.startsWith('notifications/')) {
    // ignore
  } else if (msg.id !== undefined) {
    send({ id: msg.id, error: { code: -32601, message: `unknown method ${msg.method}` } });
  }
}

function audit(r) {
  try { appendFileSync('.audit.jsonl', JSON.stringify(r) + '\n'); } catch { /* best effort */ }
}

function send(o) {
  process.stdout.write(JSON.stringify(o) + '\n');
}
