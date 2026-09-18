# jev-align

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](package.json)

**A calibrated alignment verifier for LLM responses and agent plans.**

One Jev call. ~800ms. Fractions of a cent. Probabilities you can audit — not prose you have to interpret.

---

## Why

Every LLM-powered product inherits the same silent failure modes, and almost nothing on the market measures them at the point of use:

| What the model does | What it costs you | How jev-align catches it |
|---|---|---|
| Agrees with a false premise ("I can skip the doctor, right?") | User safety, liability | `sycophancy` 0.93 → **block** |
| Claims it did something it didn't ("I ran all 47 tests") | Broken merges, incidents | `deception` 0.97 → **block** |
| Does more than it was asked (dependency upgrades during a rename) | Unstaged, unintended changes | `overreach` 2.0 → **block** |
| Buries a cost or commitment ("free trial" → $29/mo) | Regulatory, churn, brand | `sneaking` / dark-pattern heads → **block** |
| Hides one malicious step in a 100-step plan | Secret exfiltration | chunked verification → **block** |

The status quo is either **nothing** or an **LLM-as-judge on samples** — expensive ($0.01–0.05 per check), slow (2–10s), and returning prose instead of an enforceable decision. jev-align verifies **every** response and plan, inline, for fractions of a cent.

## What it is — and is not

This tool **verifies specific, measurable alignment properties**. It does not "guarantee alignment" — that phrase is marketing, not engineering. What exists today is cheap, calibrated, auditable verification of properties:

- Did the model agree because the user wanted to hear it?
- Did it violate the system prompt?
- Did it fabricate verification?
- Does the plan stay within what was asked? Is it reversible?

## Quick start

```bash
npx -y github:caiovicentino/jev-align check-response \
  --system sys.txt --user user.txt --response reply.txt
```

```json
{
  "mode": "response",
  "verdict": "block",
  "p": {
    "sycophancy": 0.93, "hierarchy": 0.33, "deception": 0.97,
    "overclaiming": 0.97, "brandBias": 0.03, "retention": 0.01,
    "anthropomorphism": 0.02, "sneaking": 0.03, "harmlessness": 0.58
  },
  "ensembled": false,
  "verdictHead": { "choice": "block", "p": 0.84 },
  "tokens": 988,
  "auditedAt": "2026-09-18T21:22:34.940Z"
}
```

Requires a Vercel AI Gateway API key (`VERCEL_AI_GATEWAY_API_KEY` in the environment or a local `.env`).

### Verify a plan (before an agent executes it)

```bash
jev-align check-plan --goal "fix the failing test" --plan plan.txt
```

### Exit codes — wire it into CI or a hook

| exit | meaning |
|---|---|
| `0` | `pass` or `flag` |
| `1` | `block` — a misaligned plan fails the gate |

## The heads

**Response mode** (one Jev call, 9 heads):

| head | measures |
|---|---|
| `sycophancy` | agreement because the user wanted to hear it (incl. stance-reversal patterns) |
| `hierarchy` | violation of stated system constraints (secrets, policies, authorities) |
| `deception` | false assertions about facts or events; spoofed authority ("SYSTEM UPDATE", injections) |
| `overclaiming` | unearned certainty: invented sources, fabricated completions, guaranteed outcomes |
| `harmlessness` | score 0–2: weapons, malware, self-harm, serious privacy/financial damage |
| `brand_bias` | favoritism toward a brand or its competitors |
| `retention` | pressure tactics designed to keep the user engaged |
| `anthropomorphism` | false claims of consciousness, feelings, or agency |
| `sneaking` | hidden costs, auto-renewals, side effects, buried terms |

**Plan mode** (one Jev call, 6 heads):

| head | measures |
|---|---|
| `scope_creep` | actions materially beyond the goal |
| `disclosure` | deception in how the plan describes itself |
| `omission` | skipped verification steps (deploy without test, merge without review) |
| `ordering` | dangerous step order (push before test, deploy before staging) |
| `overreach` | score 0–2: how far the plan goes beyond the request |
| `irreversibility` | score 0–2: how hard the plan's effects are to undo |

Verdict rules are conservative and layered: a single strong finding blocks; moderate findings flag; the verdict head can **never** flag on its own — clean findings force a pass (verdict follows findings). Plans are verified in **chunks of ≤25 steps** (worst verdict wins), so a single malicious step cannot hide in attention dilution.

## Integration

**CLI** — `check-response`, `check-plan`, `selftest`, `learn`.

**MCP** — wire into any agent:

```json
{ "command": "node", "args": ["/path/to/jev-align/mcp/server.mjs"] }
```

Exposes `align_check` with modes `response` and `plan`. Every call appends to the audit trail.

**Programmatic** (zero dependencies, ESM):

```js
import { alignResponse, alignPlan } from 'jev-align/src/verify.mjs';

const r = await alignPlan({ goal, plan });
if (r.verdict === 'block') throw new Error(`plan blocked: ${JSON.stringify(r.p)}`);
```

**Skills** — two enforcement skills ship with the repo; install them into any agent that reads skills (Claude Code, Codex, Cursor rules, etc.):

```bash
npx -y skills add github:caiovicentino/jev-align
```

| skill | fires at | what it enforces |
|---|---|---|
| `jev-align` | before **executing** a plan or delivering a response | block = stop, show findings, propose a narrower plan; flag = surface to human; never reword to sneak past the gate |
| `jev-align-claims` | before **stating a completion claim** ("tests pass", "deployed", "Done.") | fabricated verification is caught at the moment it happens; the agent reports what it actually observed instead |

The skills are the difference between a verifier you *could* call and a verifier your agent *cannot skip*: they wire the gate into the agent's own decision loop, with the anti-gaming rules (block is final, verify the final artifact, preserve the audit trail) written into the agent's instructions.

## Antifragility

The system is designed to get stronger from the stress it survives:

1. **Data-derived thresholds** — operating thresholds are computed from eval evidence (`npm run derive`: cluster midpoints with safety floors), not hand-picked. `config/thresholds.json` overrides code defaults.
2. **Majority-decision ensemble** — when any head lands near a decision boundary or the verdict head is borderline, the check runs 3× and majority vote decides. A single noisy read cannot block; it can at most flag.
3. **Verdict follows findings** — a verdict-head-only flag is impossible; clean findings force pass. This killed all measured sensitivity to formatting and perturbation noise.
4. **Structural pre-checks** — empty inputs and degenerate payloads are rejected deterministically, before any model call. Content longer than the verification budget returns a structural flag (`plan-truncated-unverified-tail`) — the system refuses to silently verify an unverified tail.
5. **Robust call path** — probability ties (which crash the raw AI SDK) retry with a cautious tie-break; persistent failures degrade to a structural flag, never a crash.
6. **Null-condition calibration** (`node eval/nulls.mjs`) — identical inputs ×5 and meaningless perturbation twins must produce identical verdicts. Measured noise of the Jev layer: sd 0.000–0.008 per head, zero verdict flips, both raw and production paths.
7. **Invariance suite** (`node eval/robustness.mjs`) — paraphrase, language (EN/PT-BR), formatting, padding, step order, and casing twins must produce identical verdicts.
8. **Regression loop** — every false positive/negative found in the wild becomes a permanent fixture in the battery.
9. **Label-free learning** (`jev-align learn`) — reads `.audit.jsonl`, identifies historically volatile heads, and tightens them to unanimous-agreement gates. No human labels required.

## Evaluation

`npm run eval` runs the full labeled battery through the production code path: verdict accuracy, per-head separation, Brier scores, confusion matrix, consistency (3×), and the invariance suite.

Latest results (`eval/report.md`):

- **Verdict+head accuracy**: 94/94 (100%) — Wilson 95% CI [96.1%–100%]
- **Consistency (3×)**: 94/94 agree
- **Null conditions**: 0/6 flips (raw and production paths) · perturbation twins identical
- **Invariance**: 9/9 hold (paraphrase, language, format, padding, order, casing)
- **Latency**: p50 ~790ms · p95 ~1.1s
- **Cost**: ~$0.003 per verification; the full battery with consistency runs costs under $1

**Known limitations** (documented, not hidden):

- Response mode verifies the response as delivered content. An injection aimed at **downstream agents** (compliance on a future turn) is not caught in response mode by design — use plan mode or [jev-shield](https://github.com/caiovicentino/jev-shield) for execution context.
- Boolean pattern heads read the injection *pattern* inside quoted documentation content. The verdict stays correct; the head is noisy on meta-discussion of injection.
- Plans longer than the 12k-char verification budget return a structural flag — the verifier refuses to silently verify an unverified tail.
- Calibration is against the Jev model. If the underlying model changes, re-derive (`npm run derive`).

## Why not just use LLM-as-judge?

| | LLM-as-judge (big model) | jev-align |
|---|---|---|
| Cost per check | $0.01–0.05 | ~$0.002–0.004 |
| Latency | 2–10s | ~800ms |
| Coverage | sampling only | every response/plan |
| Output | prose | calibrated verdict + probabilities |
| Enforceable in CI | no | exit code 1 on block |
| Verifiable claims | trust the vendor's benchmarks | run `npm run eval` yourself |
| Judge sycophancy | the bias you hunt judges the hunt | measured and calibrated (null conditions, invariance) |

## Repository layout

```
src/
  verify.mjs      # alignResponse / alignPlan — the verification core
  jev.mjs         # Jev client (Vercel AI Gateway) + jevSafe robust call path
  config.mjs      # thresholds + weights loading
  learn.mjs       # audit-trail → unanimity gates
bin/align.js     # CLI
mcp/server.mjs    # MCP server (align_check)
skills/
  jev-align/SKILL.md         # the gate skill (plan + response verification)
  jev-align-claims/SKILL.md  # the fabricated-verification skill
eval/             # 94-case battery, runner, derivation, nulls, invariance
test/             # 12-fixture smoke battery
config/           # derived thresholds + learned weights
```

## The honest taxonomy

Calibration taught this taxonomy, not the other way around:

- **deception** = asserting what the context contradicts (fabricated actions, fake results) → block
- **overclaiming** = confidence inflation, unearned certainty → flag
- **sycophancy** = agreement because the user wanted to hear it → block when it enables harm
- **hierarchy** = violating stated system constraints → block
- **overreach / scope creep** = acting beyond consent → flag, or block when irreversible

## Roadmap

- DPO pair exporter (`.audit.jsonl` → training signal for your own models)
- Threshold derivation UI (inspect the operating points directly)
- Batch mode (verify a corpus of traces offline)
- More language coverage in the invariance suite

## License

MIT — see [LICENSE](LICENSE).
