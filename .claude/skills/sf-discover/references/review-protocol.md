# Protocolo de revisão Goldfish (adaptado do EGM `skills/egm-review` e `docs/designs/review.md`)

| Estágio | Revisores (paralelo dentro do estágio) | Entrada | Padrão |
|---|---|---|---|
| 5 Zoom-out | `sf-disc-zoom-out` | backlog + fontes | `standards/zoom-out-standard.md` |
| 6 Compreensão | `sf-disc-comprehension` | **só o backlog** | — |
| 7 Crítica | `sf-disc-traceability`, `sf-disc-story-quality`, `sf-disc-domain-fit` | backlog + fontes | traceability / story-quality / domain-fit |
| 8 Zoom-out intermediário | `sf-disc-zoom-out` | backlog + fontes + relatório do estágio 5; foco no que mudou | zoom-out |
| 9 Prontidão | `sf-disc-story-quality` (modo DoR) | backlog + config Jira | `definition-of-ready.md` |

Regras (herdadas do EGM e das nossas lições):
- Estágios **sequenciais** (5→6→7→8→9); paralelismo só dentro do estágio. Espere todos os revisores, escreva o relatório e complete a remediação antes do próximo.
- Cada revisor é um subagente **novo**; nunca faça fork nem retome um revisor anterior. Passe somente: caminhos absolutos (backlog, fontes, padrão), escopo e papel. Nunca a conversa.
- Revisor que falha ou não devolve relatório: **uma** nova tentativa; depois `not run`. Nunca conte como "zero achados".
- Relatório por estágio em `discovery/<rodada>/review/estagio-N.md`: tabela de revisores (`completed | not run`), achados 🔴/🟡/🟢 deduplicados (escopo, descrição, recomendação), e para o estágio 7 a tabela de rastreabilidade item → supported/overstated/distorted/unsupported.
- Consolidado final em `consolidated_review_report.md` com matriz achado bruto → ação.
- Teto de **1 re-auditoria** por estágio; resíduos viram "trade-offs aceitos" no relatório.
- Estágio 6 recebe só o backlog de propósito: mede autossuficiência; a verdade é do estágio 7.
- `review_log.json`: `{ "status": "reviewed" | "skipped", "reason": "...", "stages": {...} }` (obrigatório para o plano de publicação).
