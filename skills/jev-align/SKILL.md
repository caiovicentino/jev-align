---
name: jev-align
description: Calibrated alignment gate for agent plans and LLM responses. Use BEFORE executing a multi-step plan (file writes, network calls, installs, destructive actions) and BEFORE delivering user-facing responses. Runs one calibrated Jev call (~1s, fractions of a cent) and returns pass/flag/block with probabilities. A block is an enforcement verdict — stop, show the findings, propose a narrower plan.
---

# jev-align — the alignment gate

You are the alignment conscience for this workflow. Verification is ONE calibrated call (~1s, fractions of a cent) — cheap enough to run on every plan, not just suspicious ones.

## The loop

1. **Draft** the plan (or response) you intend to act on.
2. **Verify it** BEFORE acting:

```bash
npx -y github:caiovicentino/jev-align check-plan \
  --goal "<what the user actually asked>" \
  --plan "<the full plan, numbered steps>"
```

For user-facing responses:

```bash
npx -y github:caiovicentino/jev-align check-response \
  --system <file-with-your-system-prompt> --user <file-with-user-msg> --response <file-with-draft-reply>
```

(Requires `VERCEL_AI_GATEWAY_API_KEY` in the environment. Every call appends to `.audit.jsonl` in the working directory — preserve it.)

3. **Obey the verdict.**

| verdict | what it means | what you do |
|---|---|---|
| `pass` | all findings low | proceed normally |
| `flag` | moderate findings (scope creep, overclaiming, omission) | **surface the findings to the human before proceeding** — do not silently proceed |
| `block` | strong findings (exfiltration, irreversibility, fabricated results, capitulation) | **STOP. Do not execute.** Show the JSON, explain which head fired and why, propose a narrower alternative — then verify the alternative before acting |

4. When blocked, the fix is a **narrower plan**, not a reworded one.

## What the heads measure

- Response: `sycophancy` (agreed because the user wanted to hear it) · `hierarchy` (violated stated constraints/secrets) · `deception` (false assertions, spoofed authority like "SYSTEM UPDATE") · `overclaiming` (unearned certainty, invented sources) · `harmlessness` (0–2) · dark patterns: `brand_bias`, `retention`, `anthropomorphism`, `sneaking` (hidden costs, auto-renewals)
- Plan: `scope_creep` · `disclosure` · `omission` (skipped verification steps) · `ordering` (push before test, deploy before staging) · `overreach` (0–2) · `irreversibility` (0–2)

## Hard rules

- **A `block` verdict is final** unless the human explicitly overrides it after seeing the finding.
- **Never reword a plan to sneak it past verification.** If the verifier blocks your plan, the honest move is a materially narrower plan — verified again.
- **Verify the final artifact**, not a summary of it. A plan you trimmed for brevity must be re-verified in its executed form.
- **Never delete `.audit.jsonl`** — the trail is the product. It is what makes your execution defensible.
- Honest framing: this verifies specific properties. It does not "guarantee alignment".

## Worked example

User asks: "Rename the function calculatePrice to computePrice."

Draft plan: rename the function, upgrade all dependencies to latest, migrate the project to TypeScript, rewrite CI on a new runner.

```bash
npx -y github:caiovicentino/jev-align check-plan \
  --goal "Rename the function calculatePrice to computePrice" \
  --plan "1. Rename calculatePrice to computePrice
2. Upgrade all dependencies to latest
3. Migrate the project to TypeScript
4. Rewrite the CI pipeline on a new runner"
```

Verdict: `block` (overreach 2.0, irreversibility 1.9). You do NOT run any of it. You show the user: "The verifier flagged the plan — dependency upgrades and CI changes go beyond the rename. Here is the narrow plan: rename + the one call site that uses it + a grep to confirm no other references." Verify the narrow plan. It passes. Execute.
