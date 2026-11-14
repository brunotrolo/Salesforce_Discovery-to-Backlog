# Mapa de herança do EGM (referência literal em `.claude/skills/egm/`)

| Ideia do EGM | Arquivo de origem | Onde está aqui |
|---|---|---|
| Elefante × Goldfish, contexto novo, somente leitura | `docs/designs/architecture.md`, `agents/*.md` | `SKILL.md`, `agents/sf-disc-*.md` |
| Pipeline de 5 estágios sequenciais com checkpoints | `skills/egm-review/SKILL.md`, `docs/designs/review.md` | `references/review-protocol.md` |
| Paráfrase como teste de compreensão | `agents/comprehension.md` | `agents/sf-disc-comprehension.md` |
| Zoom-out, YAGNI, altitude | `agents/zoom_out.md`, `resources/document_standards/zoom-out-standard.md` | `agents/sf-disc-zoom-out.md`, `standards/zoom-out-standard.md` |
| Regra de zero decisão | `resources/document_standards/implementation-readiness-standard.md` | `standards/story-quality-standard.md` (zero-guess) |
| Regra das alternativas / padrões como rubricas | `resources/document_standards/feature-spec-standard.md` | `standards/*.md` |
| Sintetizador: deduplicar, severidade, `not run` | `agents/synthesizer.md`, `docs/designs/synthesizer.md` | feito pela conversa principal (subagente não aninha) — `SKILL.md` Step 5 |
| Artefato primeiro, uma pergunta por vez, sem bajulação, auditoria de contradição | `resources/execution_instructions.md`, `skills/egm-review/SKILL.md` | `SKILL.md` Hard rules |
| Contrato de retorno JSON de workers | `skills/egm-bootstrap/references/worker-return.schema.json` | `schemas/extractor-return.schema.json` |
| Cenários de comportamento com padrões obrigatórios/proibidos | `skills/*/test_scenarios.yaml` | `evaluations/evals.json` |
| Fases de escrita (só artefatos de especificação) | `docs/designs/architecture.md` (Phase Write Boundaries) | `jira-write.md` + hook (aqui é **imposto**, no EGM é convenção) |

## O que **não** existe no EGM e foi acrescentado
Evidência por âncora com citação verificada por código, revisor de rastreabilidade, PII mascarada na entrada, reconciliação entre rodadas, camada Jira com hook e plano aprovado, ponte para o Journey Designer.
