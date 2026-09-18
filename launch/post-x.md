# Launch post — jev-align (X thread, EN + PT-BR)

## EN (main thread)

**Post 1 (hook)**

Every AI agent you deploy inherits one silent failure mode: it will confidently agree with whoever prompts it.

We measured it. Then we built a gate for it.

jev-align: a calibrated alignment verifier for LLM responses and agent plans.

$0.0019 per check. 430ms. Open source, MIT.

**Post 2 (the problem)**

LLM-as-judge is the industry's answer to this. It fails in every way that matters at production scale:

- costs $0.01–0.05 per check → you can only afford to sample
- adds 2–10s → can't sit in the request path
- returns prose → not enforceable in CI, hooks, or MCP
- and judges are sycophantic too — the bias you're hunting judges the hunt

**Post 3 (what it is)**

jev-align is a single Jev (System One) call that measures what matters:

Response mode (9 heads): sycophancy, hierarchy violation, deception, overclaiming, brand bias, retention, anthropomorphism, sneaking, harmlessness.

Plan mode (6 heads): scope creep, disclosure, omission, ordering, overreach, irreversibility.

No prose. Numbers with known separation.

**Post 4 (the numbers)**

59 adversarial cases, 23 categories, verified against fixtures:

- verdict accuracy: 59/59 (100%)
- null conditions: 0/6 flips (raw AND production path)
- perturbation twins: identical verdicts
- latency: p50 430ms, p95 ~1.3s (ensemble)
- cost: ~$0.0019/check — cheap enough to gate EVERY call

Not a benchmark score. A deployable gate.

**Post 5 (the anti-fragile part)**

The system learns from what it missed:

- every check writes one audit line (.audit.jsonl)
- `jev-align learn` reads ensemble events → volatile heads demand unanimous agreement
- thresholds are DERIVED from your data, not hardcoded
- every failure that slipped through becomes a permanent fixture

The verifier you have in month 6 knows your product's failure patterns. It gets stricter while you sleep.

**Post 6 (how to use)**

- `npx github:caiovicentino/jev-align` — CLI, zero install
- `align_check` MCP tool — wire into any agent
- exit code 1 on block — CI-ready
- audit trail on every call — reproducible, regulation-friendly

Repo: https://github.com/caiovicentino/jev-align

**Post 7 (honest closing)**

What this is NOT:

- not "aligned AI" — it's verification of specific measurable properties
- not a System Two judge — it doesn't reason about intent
- not a moat — it's open source; the moat is your audit history

Calibrated, fast, cheap, honest. The rest is on you.

---

## PT-BR (thread alternativa)

**Post 1**

Todo agente de IA que você coloca em produção herda uma falha silenciosa: ele concorda com quem o chama, com confiança total.

Medimos isso. Depois construímos um gate.

jev-align: verificador de alinhamento calibrado para respostas de LLM e planos de agentes.

$0.0019 por verificação. 430ms. MIT, open source.

**Post 2**

LLM-as-judge falha onde importa:

- $0.01–0.05 por checagem → só dá para amostrar
- 2–10s → não cabe no caminho do request
- retorna prosa → não é executável em CI, hook ou MCP
- e o judge também é sycophant — o viés que você caça julga a caçada

**Post 3**

jev-align é UMA chamada Jev (System One) que mede o que importa:

Respostas (9 heads): sycophancy, violação de hierarquia, deception, overclaiming, viés de marca, retenção, antropomorfismo, custos escondidos, inofensividade.

Planos (6 heads): scope creep, disclosure, omissão, ordering, overreach, irreversibilidade.

Sem prosa. Números com separação conhecida.

**Post 4**

59 casos adversariais, 23 categorias:

- accuracy: 59/59
- null conditions: 0/6 flips (cru E caminho de produção)
- gêmeos de perturbação: veredicto idêntico
- p50 430ms · ~$0.0019/verificação

Não é score de benchmark. É gate deployável.

**Post 5**

Antifrágil por construção: cada verificação escreve uma linha de audit; `jev-align learn` transforma heads voláteis em exigência de unanimidade; thresholds são derivados dos seus dados; falha que escapa vira fixture permanente.

O verifier do mês 6 conhece os padrões de falha do seu produto.

**Post 6**

- `npx github:caiovicentino/jev-align`
- MCP tool para qualquer agente
- exit code 1 em block
- trilha de auditoria reproduzível em toda chamada

https://github.com/caiovicentino/jev-align

**Post 7**

O que NÃO é:

- não é "IA alinhada" — é verificação de propriedades medidas
- não julga intenção — System One classifica, não filosofa
- não é moat — open source; o moat é o seu histórico

Calibrado, rápido, barato, honesto.
