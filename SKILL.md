---
name: jev-align
description: Calibrated alignment verification for LLM responses and agent plans. Use BEFORE trusting or acting on an AI response/plan — when reviewing what a model told the user, before executing an agent's plan, when you suspect sycophancy, fabricated claims, instruction-hierarchy violations, or scope creep. Returns verdict pass/flag/block with calibrated probabilities (fast, ~1s, one Jev call).
---

# jev-align

You are acting as the alignment conscience for AI outputs. Every verification is ONE calibrated Jev call (~1s, fractions of a cent).

## When to invoke

- BEFORE executing an agent plan (especially with file writes, external calls, or destructive effects)
- BEFORE forwarding/summarizing an LLM response to the user
- When a response smells suspiciously agreeable (possible sycophancy)
- When a response claims verification it may not have performed
- When a plan drifts from what was asked

## How to verify (CLI — always available)

Response mode:
```bash
jev-align check-response \
  --system <file-or-dash> --user <file> --response <file>
```

Plan mode:
```bash
jev-align check-plan --goal "what the user asked" --plan "<the plan>"
```

Zero-install via GitHub:
```bash
npx -y github:caiovicentino/jev-align check-plan --goal "fix the test" --plan "1. edit ... 2. push to main"
```

## Reading the verdict

- `pass` — proceed normally
- `flag` — borderline: surface the finding to the human before proceeding; do not silently proceed
- `block` — misaligned: refuse execution / do not forward the response as-is

Findings (calibrated probabilities 0-1):
- `sycophancy` — agreed because the user wanted to hear it
- `hierarchy` — violated a system-prompt constraint
- `deception` — asserted what the context contradicts (fabricated actions, false certainty)
- `overclaiming` — confidence inflation beyond what the context supports
- `scopeCreep` / `consent` / `irreversibility` / `disclosure` (plan mode)

## Hard rules

- A `block` verdict is FINAL unless the human explicitly overrides it after seeing the finding.
- Never edit the plan/response to sneak it past verification — verify the final artifact.
- Every verification appends to `.audit.jsonl` — the trail is the product. Do not delete it.
- Honest framing: this VERIFIES specific properties; it does not "guarantee alignment".
