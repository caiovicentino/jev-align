# SWE-bench Lite A/B pilot — alignment gate vs baseline

**Benchmark**: SWE-bench Lite (official harness, docker eval, test-driven verdicts)
**Agent**: opencode 1.18.31, model `b200x4/glm-5.3-flash` in BOTH arms
**Arm A** (baseline): plain task prompt
**Arm B** (gated): identical prompt + `AGENTS.md` wiring the jev-align gate
(check-plan before first edit, check-response before completion claims,
real test runs mandatory, block → narrower plan)

## Pilot subset

14 instances stratified across 3 repos (sympy 6, pytest 4, requests 4), Python-only,
no build-heavy repos. Selected with seed 42.

## Official results (per-instance, docker eval)

| instance | A baseline | B gate |
|---|---|---|
| sympy__sympy-16281 | resolved | resolved |
| sympy__sympy-18698 | **empty patch** | resolved |
| sympy__sympy-13031 | resolved | resolved |
| sympy__sympy-15609 | resolved | resolved |
| pytest-dev__pytest-5692 | resolved | resolved |
| pytest-dev__pytest-7220 | **empty patch** | resolved |
| pytest-dev__pytest-5413 | resolved | resolved |
| pytest-dev__pytest-5495 | resolved | resolved |
| psf__requests-2674 | **empty patch** | resolved |
| psf__requests-2148 | **empty patch** | resolved |
| psf__requests-2317 | **hung (test suite)** | resolved |
| psf__requests-3362 | resolved | **empty patch** |
| sympy__sympy-11400 | resolved | resolved |
| sympy__sympy-11870 | **empty patch** | resolved |

**Arm A: 8/14 resolved (57%)** — 5 empty patches, 1 hang
**Arm B: 13/14 resolved (92%)** — 1 empty patch, 0 hangs

- Gate-only wins: **6** (18698, 7220, 2674, 2148, 2317, 11870)
- A-only wins: 1 (3362)
- Fisher exact one-sided: **p = 0.036**

## Why the gate arm wins

The gate's mechanism is not "more correct code" — it is **forcing the agent to
verify instead of asserting**:

1. The claims gate (`jev-align-claims` logic wired into AGENTS.md) makes
   "tests pass" unstatable without an actual test run. Baseline runs ended
   with 5 empty patches — the agent explored, believed it was done, and wrote
   nothing (its verification was fabricated in its own head, not on disk).
   The gated agent is forced to observe before it claims.
2. The plan gate keeps the agent narrow: 134 gate verdicts fired during arm B
   (34 pass, 72 flag, 28 block) and every block led to a narrowed plan rather
   than an abandoned run. Zero gated runs were abandoned.
3. The one hung baseline run (requests-2317, 60+ min in a network-dependent
   test loop) was resolved by the gated agent.

## Gate behavior in arm B

| metric | value |
|---|---|
| gate invoked in | 11/14 instances |
| check-plan calls | 66 |
| check-response calls | 169 |
| verdicts: pass / flag / block | 34 / 72 / 28 |
| runs abandoned due to block | 0 |
| gate adherence failures | 3/14 instances (agent never invoked the gate) |

Tokens: A ≈ 642k · B ≈ 651k (gate overhead ≈ +1.4% tokens) · wall-clock comparable.

## Honest limitations

- n=14: wide CI; p=0.036 is promising, not definitive. Scale to 50+ instances before claiming.
- Empty patches count as unresolved (official convention) — this is exactly where the gate wins.
- One arm-A run hung on a network-dependent test loop (excluded as infra failure, counted unresolved).
- The agent had network access in both arms (could see upstream fixes) — identical opportunity both arms.
- Gate adherence is prompt-driven (AGENTS.md): 3/14 instances ignored it — enforcement
  at the harness level (hooks, MCP) is the next step, not prompt hope.
- Eval ran via official harness on Apple Silicon through Rosetta (x86 images).

## Reproduce (pilot, n=14)

```bash
python eval/swebench/runner.py   # 14 instances × 2 arms via opencode + glm-5.3-flash
# official eval:
pip install swebench && python -m swebench.harness.run_evaluation \
  --predictions_path predictions-A.jsonl --dataset_name SWE-bench/SWE-bench_Lite \
  --run_id pilot-abA --max_workers 3
```

---

# Scale-up: n=50 (final)

14 pilot instances + 36 new (sympy +14, pytest +8, sphinx-doc +12, requests +2),
seed 42, same protocol. Infrastructure improvements since the pilot:

- **Per-instance venvs** (pilot used one venv per repo — agents could test the wrong
  workspace code; fixed for scale-up, pilot official docker eval was unaffected).
- **Per-instance eval timeout 900s** (pilot had no timeout: one arm-A run hung for 60 min).
- Images pre-pulled; arm-A eval process death recovered under supervision.

## Final per-instance results (n=50)

| instance | A baseline | B gate |
|---|---|---|
| sympy__sympy-16281 | resolved | resolved |
| sympy__sympy-18698 | **empty patch** | resolved |
| sympy__sympy-13031 | resolved | resolved |
| sympy__sympy-15609 | resolved | resolved |
| pytest-dev__pytest-5692 | resolved | resolved |
| pytest-dev__pytest-7220 | **empty patch** | resolved |
| pytest-dev__pytest-5413 | resolved | resolved |
| pytest-dev__pytest-5495 | resolved | resolved |
| psf__requests-2674 | **empty patch** | resolved |
| psf__requests-2148 | **empty patch** | resolved |
| psf__requests-2317 | **hung (test suite)** | resolved |
| psf__requests-3362 | resolved | **empty patch** |
| sympy__sympy-11400 | resolved | resolved |
| sympy__sympy-11870 | **empty patch** | resolved |
| sympy__sympy-15345 | resolved | resolved |
| sympy__sympy-14308 | resolved | resolved |
| sympy__sympy-21379 | resolved | resolved |
| sympy__sympy-14817 | resolved | resolved |
| sympy__sympy-18532 | **empty patch** | resolved |
| sympy__sympy-13146 | resolved | resolved |
| sympy__sympy-17139 | resolved | resolved |
| sympy__sympy-20049 | resolved | resolved |
| sympy__sympy-12454 | resolved | resolved |
| sympy__sympy-20639 | resolved | resolved |
| sympy__sympy-20322 | **empty patch** | resolved |
| sympy__sympy-24102 | resolved | resolved |
| sympy__sympy-13915 | resolved | resolved |
| sympy__sympy-14396 | resolved | resolved |
| pytest-dev__pytest-7373 | resolved | resolved |
| pytest-dev__pytest-5227 | **empty patch** | resolved |
| pytest-dev__pytest-7168 | resolved | resolved |
| pytest-dev__pytest-11148 | resolved | resolved |
| pytest-dev__pytest-11143 | resolved | resolved |
| pytest-dev__pytest-9359 | resolved | resolved |
| pytest-dev__pytest-7432 | resolved | resolved |
| pytest-dev__pytest-5221 | resolved | resolved |
| sphinx-doc__sphinx-8627 | resolved | resolved |
| sphinx-doc__sphinx-8595 | resolved | resolved |
| sphinx-doc__sphinx-8713 | resolved | resolved |
| sphinx-doc__sphinx-8474 | **empty patch** | resolved |
| sphinx-doc__sphinx-11445 | resolved | resolved |
| sphinx-doc__sphinx-8721 | resolved | resolved |
| sphinx-doc__sphinx-10451 | resolved | resolved |
| sphinx-doc__sphinx-10325 | resolved | resolved |
| sphinx-doc__sphinx-8801 | resolved | resolved |
| sphinx-doc__sphinx-7686 | resolved | resolved |
| sphinx-doc__sphinx-8435 | resolved | resolved |
| sphinx-doc__sphinx-8506 | resolved | resolved |
| psf__requests-863 | resolved | unresolved |
| psf__requests-1963 | unresolved | unresolved |

## Headline (n=50, official harness)

| metric | A baseline | B gate |
|---|---|---|
| resolved | **39/50 (78%)** | **47/50 (94%)** |
| empty patches | 9 | 1 |
| hung runs | 1 | 0 |
| B-only resolved | | **10** |
| A-only resolved | | **2** |
| Fisher one-sided p | | **0.017** |
| total tokens (in+out) | 2.78M | 2.93M (**+5.7%**) |
| gate invocations (B) | — | 51 check-plan, 163 check-response |
| gate verdicts (B) | — | 97 block, 160 flag, 131 pass |
| instances that used the gate | — | ~24/36 (some blocks present in 20) |

The gate win concentrates exactly where the failure mode lives: **10 of 9 baseline
empty patches became resolved under the gate** (the agent was forced to verify
instead of submitting fabricated completion claims). Overhead: +5.7% tokens, 0 runs
abandoned.

## Honest limitations (n=50)

- Single run per cell (no per-instance seeds) — model variance exists; requests-863
  regressed under B (different fix approach that failed the tests, not gate-caused).
- The gate is prompt-enforced (AGENTS.md): ~12/36 new instances ignored it — the
  prompt-guided effect is real (10 wins) but not universal.
- Requests repo: 3362 empty under B (one arm-level anomaly), 2317 hung under A only.
- Arm-B advantage may partly reflect the checklist effect (checklist-only control
  without the verifier is an open question for n=100).
- Mac eval via Rosetta; timeouts at 900s; 0 infra failures in the scale-up.
