---
name: sf-backlog-publish
description: Publica no Jira (Atlassian Rovo MCP) o backlog aprovado da skill sf-discover — gera o plano (criar/atualizar/ignorar), mostra o diff à PO, e só depois da aprovação explícita escreve no Jira. Use quando a PO pedir para publicar, atualizar ou editar histórias no Jira a partir de discovery/<rodada>/backlog.json.
disable-model-invocation: true
argument-hint: <round-id>
arguments: [round]
---

# sf-backlog-publish — publicação controlada no Jira

Roda na **conversa principal**. Nunca apaga nem transiciona issues. Leia `.claude/skills/sf-discover/references/jira-adapter.md`.

## Passos
1. Pré-condições: `discovery/$round/backlog.json` válido (`validate-backlog.mjs`) e `review_log.json` presente. Sem eles, pare e diga o que falta.
2. Plano (dry-run): `node .claude/skills/sf-discover/scripts/diff-publish.mjs discovery/$round/backlog.json`. Exit 3 = **não publicável** (templates provisórios, sem project_key, revisão ausente, conflito sem decisão). Mostre os bloqueios e o `publish_plan.md`; ofereça o `import-package.csv` como alternativa. **Pare.**
3. Plano publicável: apresente o `publish_plan.md` inteiro (criar/atualizar com valor anterior → novo) e peça aprovação explícita da PO. Aprovação parcial → peça ajuste no backlog e regenere o plano.
4. Só após um "aprovo" claro: `node .../approve-plan.mjs discovery/$round/publish_plan.json --by "<nome da PO>"`.
5. Execute exatamente as ações aprovadas, na ordem Epic → História → Subtarefa, com as operações do adaptador (buscar por `discovery-id` antes de criar). O hook `guard-jira-write.mjs` nega o que não estiver no plano aprovado; se negar, **não contorne** — reporte.
6. Atualize `jira-map.json` e `publish_log.md` (valor anterior → novo; é o registro para reversão manual). Marque no `backlog.json` os itens publicados (`status: publicado`).
7. Reporte: criados, atualizados, ignorados, erros, e o que ficou pendente.

## Regras
- Nunca rode `approve-plan.mjs` sem aprovação explícita da PO nesta conversa.
- Nunca edite `publish_plan.json` à mão (o hash invalida).
- Nada de exclusão, transição de status, escrita no Confluence ou fora do projeto de `jira.config.json`.
