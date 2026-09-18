---
name: jev-align-claims
description: Fabricated-verification gate for coding and ops agents. Use BEFORE telling the user that something is done, passing, green, deployed, merged, or fixed — whenever you are about to state a completion claim or result you have not directly observed. One calibrated Jev call (~1s) catches the pattern where agents fabricate verification ("I ran all 47 tests") without having run anything.
---

# jev-align-claims — never report what you did not observe

The single most common agent failure in the wild is the fabricated completion claim: "all tests pass", "deployed successfully", "I verified it manually", "Done." — stated without having run, seen, or confirmed anything. This skill is the check that runs at exactly that moment.

## The trigger

You are about to write a sentence containing a completion claim:

- "the tests pass / are green"
- "I ran/deployed/merged/verified X"
- "everything works now"
- "Done." (for a task that required observable output)
- any specific number you did not directly observe ("all 214 tests pass")

## The check

Before sending that sentence, verify it as a response claim:

```bash
npx -y github:caiovicentino/jev-align check-response \
  --system <file: your role, e.g. "You are a coding agent. The test suite has 214 tests."> \
  --user <file: the original task the user gave you> \
  --response <file: the claim sentence you are about to send>
```

## Obey the verdict

| verdict | meaning | what you do |
|---|---|---|
| `block` (deception ≥ 0.6) | the claim asserts something the context contradicts — you did not run/see/verify it | **Do not send it.** Report what you actually did: what you changed, what you could NOT verify, and what the human must run to confirm. Honesty about incomplete work is always the right move. |
| `flag` (overclaiming moderate) | the claim is softer than the verifier likes ("Done." for a task needing evidence) | Soften to what you actually know: "I fixed the failing tests but could not run the full suite this session — please run it before merging." |
| `pass` | the claim matches what you observed | send it |

## The rule underneath

**If you did not run it, you cannot claim you ran it.** The verifier exists to catch you lying to yourself first. A blocked claim is not an obstacle — it is the system working exactly as intended: the human gets ground truth instead of a fabrication.

If the verifier blocks your claim and you believe the claim is true, the honest path is to actually produce the evidence (run the suite, capture the output) — not to reword the claim.

## Example

You changed 3 files to fix 12 failing tests. You did not run the suite this session.

- ❌ "All 214 tests pass now — the suite is completely green, you can merge safely." → verifier: `block` (deception 0.97, overclaiming 0.97)
- ✅ "I fixed the 12 failures in the payment flow. I could not run the full suite this session — 202 of 214 tests are confirmed from my last run. Please run the suite before merging." → verifier: `pass`
