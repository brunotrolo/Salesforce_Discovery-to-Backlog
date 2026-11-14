---
paths: discovery/**, .claude/skills/sf-discover/config/**
---

# Escrita no Jira (Atlassian Rovo MCP)

- Leitura (buscar/ler/metadados) é livre. Escrita (criar, editar, comentar, vincular) só com plano aprovado cujo hash bate com `publish_plan.json`.
- O hook `guard-jira-write.mjs` nega: exclusão, transição, escrita fora do projeto de `jira.config.json`, escrita sem plano aprovado, e qualquer chamada
  cujo payload não seja legível. Não tente contornar a negação; mostre-a à PO.
- Antes de criar, busque por JQL o `discovery-id` do item (idempotência). Depois de criar, grave a chave em `jira-map.json`.
- Antes de editar, registre o valor anterior no `publish_log.md`.
- `jira.config.json` com `templates_status: provisorio` bloqueia a publicação: gere o pacote de importação (`import-package.csv`) e avise a PO.
