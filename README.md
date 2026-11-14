# Salesforce Discovery-to-Backlog

Skill do Claude Code que transforma as rodadas de discovery da PO (transcrições, resumos, requisitos estruturados ou semi-estruturados) em **backlog rastreável** para o atendimento de produtos financeiros no Salesforce Service Cloud, com publicação controlada no **Jira** (MCP do Jira). Alimenta o **Journey Designer**.

Base: [elephant-goldfish-model](https://github.com/google/elephant-goldfish-model) (cópia literal em `.claude/skills/egm/`, Apache-2.0, ver `NOTICE.md`).

## Fluxo

| Etapa | Comando / script | Entrega |
|---|---|---|
| 0 Intake | `scripts/ingest.mjs` | `discovery/<rodada>/sources/Sxx.md` com âncoras de linha e PII mascarada |
| 1–4 Extração, rascunho | `/sf-discover <rodada> <fontes…>` | `discovery_brief.md`, `backlog.json` + `backlog_draft.md` + `import-package.csv` |
| 5–6 Revisão goldfish e resolução | 5 revisores `sf-disc-*` (somente leitura) | `consolidated_review_report.md`, `review_log.json` |
| 7 Publicação | `/sf-backlog-publish <rodada>` | `publish_plan.md` → aprovação da PO → Jira + `jira-map.json` |
| 8 Ponte Designer | `scripts/handoff-designer.mjs` | linhas em `docs/sdd/BACKLOG.md` + `spec.md` semente (só negócio) |
| Entregas para o negócio | `/sf-po-pack <rodada>` | entrevista de múltipla escolha → **Word** (Visão de Produto), **PowerPoint** e **protótipo HTML clicável derivado do template do console da equipe** (referência obrigatória; a jornada da demanda é acrescentada ou ajustada nele) |
| Status | `/sf-discovery-status` | situação por rodada |

## Para quem é cada entrega
- **Áreas de negócio (via PO):** `.docx`, `.pptx` e `.html` (o protótipo abre no navegador, offline, sem instalar nada). Linguagem de negócio, sem jargão técnico.
- **Time técnico:** Markdown/JSON (`backlog_draft.md`, relatórios de revisão, specs do Designer).
- A skill **sempre pergunta** se a PO precisa do protótipo e orienta o desenho com uma entrevista curta de múltipla escolha (`references/po-interview.md`).
- Word/PowerPoint: `pip install python-docx python-pptx`. Imagens do protótipo nos arquivos: Playwright (opcional).

## Garantias (por código, não por lembrete)
- **Sem fonte, sem requisito**: `validate-backlog.mjs` confere se cada âncora existe; `merge-extractions.mjs` confere a citação literal.
- **Jira**: o hook `guard-jira-write.mjs` nega escrita sem plano aprovado cujo hash bata, nega exclusão/transição/Confluence/outro projeto e nega payload ilegível.
- **Templates provisórios não publicam** (`templates_status: provisorio`), mas o pacote de importação é gerado.
- **LGPD**: CPF/CNPJ/e-mail/telefone formatados são mascarados na entrada; falantes pseudonimizados; `discovery/` fora do git.

## O que NÃO foi verificado aqui
O protótipo é a réplica HTML do console (template da PO), não o Salesforce real: não é LWC, não roda no Salesforce e não substitui o desenho do Journey Designer. Nome do servidor e das ferramentas reais do MCP do Jira, templates/campos reais do Jira, sessão real com a PO e execução ao vivo dos revisores. Ver `docs/open-decisions.md`.

## Testes
`node scripts/verify-skills.mjs && node --test tests/core.test.mjs tests/jira.test.mjs`
