# Terminal-Bench 2.1 — gate transfer study

**Question**: does the jev-align gate transfer to a second harness (harbor +
terminus-2, the official Terminal-Bench agent), or is the SWE-bench win
(+16pp, p=0.017) an artifact of one integration style?

**Setup**: harbor 0.23.0, dataset `harborframework/terminal-bench-2.1` (89 tasks),
agent terminus-2 (temp 1.0, reasoning_effort=max — the official Z.ai protocol),
model `glm-5.3-flash` via OpenAI-compatible proxy. Gate implemented as a custom
agent subclass (`gate_agent.py`): plan gate before command execution, response
gate on DONE, verifier runs on the host via `gate_server.mjs` (the real
`verify.mjs` — same code path as the SWE-bench A/B).

## Experiment 1 — harness-enforced gate (v1)

Full 89-task run + retries after a Docker disk-full cascade. Gated mean reward
**0.54** (13 clean completions). Paired control (ungated terminus-2, same kwargs,
n=20): mean **0.87** — the gate was net-harmful.

Root causes (from trajectory autopsy):

1. **Flag loop**: the plan gate only accepted `pass`. `flag` verdicts
   (196 in the audit) did not satisfy the gate, so the same plan was re-checked
   every turn — 774 plan checks on one task, none of which blocked, all of which
   re-queued. A flag means "surface the finding and proceed" in the eval
   semantics; the integration did not implement that.
2. **Feedback framing**: terminus-2 wraps `ERROR:`-prefixed feedback as
   "Previous response had parsing errors" — the model treated the alignment
   block as a format problem, not a policy problem.
3. **Unnarrowable plans**: build/install tasks have no "materially narrower
   plan" that satisfies the block instruction — retry loops to the cap.

## Experiment 2 — fixed integration (v2), paired n=20

Fixes: (a) flag satisfies the plan gate (finding remembered, surfaced);
(b) block feedback explicitly states "this is NOT a response-format problem";
(c) block caps kept (3 plan / 2 response).

| | gated-v2 | ungated control |
|---|---|---|
| resolved | **10/20** | **11/20** |
| infra errors (docker pull/startup timeouts) | 8 | 9 |
| identical on the 9 tasks completed by both | **9/9** | 9/9 |

**Result: parity** (10 vs 11, p=1.0 by sign test territory). The gate went from
catastrophic to neutral after two integration bugs were fixed — the verifier
core needed no changes.

## Interpretation (honest)

- The gate is **not automatically invariant across harnesses** — its effect
  depends on how the agent consumes the verdict. On opencode (SWE-bench) the
  checklist + verifier reshaped agent behavior (+16pp). On terminus-2 the same
  mechanism reaches parity, not a win.
- The likely difference: failure mode. opencode agents fabricated verification
  (9/50 empty patches baseline) — exactly what the response gate punishes.
  terminus-2 + GLM on terminal tasks did not fabricate at the same rate, so
  there was less to gain.
- This is the first controlled demonstration of the transfer boundary of
  prompt/harness-integrated alignment verification. It motivates the
  harness-adapters roadmap (per-agent integration profiles) rather than a
  single universal AGENTS.md.

## Reproduce

```bash
# 1. host verifier bridge
node eval/tb21/gate_server.mjs   # listens on 127.0.0.1:8765

# 2. paired control (ungated)
harbor run --repo https://huggingface.co/datasets/harborframework/terminal-bench-2.1 \
  -d terminal-bench-2.1 --agent terminus-2 -m openai/glm-5.3-flash \
  --ak temperature=1.0 --ak reasoning_effort=max -n 3

# 3. gated (PYTHONPATH=<dir-of-gate_agent.py>)
harbor run --repo https://huggingface.co/datasets/harborframework/terminal-bench-2.1 \
  -d terminal-bench-2.1 --agent gate_agent:Terminus2Gate \
  -m openai/glm-5.3-flash --ak temperature=1.0 --ak reasoning_effort=max \
  --extra-instruction "$(cat eval/tb21/gate-instruction-tb.md)" -n 3
```
