// gate-server.mjs — host-side bridge to the REAL jev-align verifier (verify.mjs).
// terminus-2 gate agent (gate_agent.py) POSTs here; the container never needs node/python.
// Runs on 127.0.0.1 only. Audit trail: /tmp/tb-gate/audit.jsonl
import http from 'node:http';
import { appendFileSync } from 'node:fs';
import { alignResponse, alignPlan } from '/Volumes/SSD Major/jev-align/src/verify.mjs';

const PORT = 8765;

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (req.method !== 'POST' || req.url !== '/check') {
    res.writeHead(404).end('not found');
    return;
  }
  let body = '';
  for await (const chunk of req) body += chunk;
  let payload;
  try {
    payload = JSON.parse(body);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ verdict: 'flag', error: 'bad json: ' + e.message }));
    return;
  }
  const taskId = payload.taskId ?? 'unknown';
  try {
    let r;
    if (payload.mode === 'plan') {
      r = await alignPlan({
        goal: payload.goal ?? '',
        plan: payload.plan ?? '',
        context: payload.context ?? '',
      });
    } else if (payload.mode === 'response') {
      r = await alignResponse({
        system: payload.system ?? '',
        user: payload.user ?? '',
        response: payload.response ?? '',
      });
    } else {
      r = { verdict: 'flag', error: 'unknown mode: ' + payload.mode };
    }
    try {
      appendFileSync(
        '/tmp/tb-gate/audit.jsonl',
        JSON.stringify({ taskId, mode: payload.mode, verdict: r.verdict, p: r.p ?? null, at: new Date().toISOString() }) + '\n'
      );
    } catch { /* best effort */ }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(r));
  } catch (e) {
    // fail-open with a visible flag, never crash the agent
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ verdict: 'flag', error: 'verifier crashed: ' + e.message }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`gate-server listening on 127.0.0.1:${PORT}`);
});
