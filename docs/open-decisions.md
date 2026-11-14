# Decisões em aberto (pré-requisitos a definir)

A skill funciona hoje com padrões **provisórios**; nada disto bloqueia gerar backlog em arquivo, mas os itens 1–3 bloqueiam **publicar no Jira**.

| # | Decisão | Dono | Efeito enquanto aberto |
|---|---|---|---|
| 1 | Templates oficiais de Epic/História/Subtarefa | PO + engenharia | `templates_status: provisorio` → plano de publicação bloqueado; `import-package.csv` continua sendo gerado |
| 2 | Projeto/board do Jira (`project_key`), tipos de issue, campos customizados, mapa de prioridade, convenção de labels | PO + admin Jira | `diff-publish` bloqueia (sem `project_key`); hook nega qualquer escrita |
| 3 | Servidor e nomes reais das ferramentas do MCP do Jira | engenharia | `references/jira-adapter.md` com "a verificar"; testar na 1ª sessão conectada |
| 4 | Definition of Ready da equipe | PO | usa `standards/definition-of-ready.md` provisório |
| 5 | Retenção de transcrições e política LGPD (`discovery/` e `sources/` ficam fora do git) | DPO/PO | máscara de PII no ingest; pseudonimização de falantes por padrão |
| 6 | Nomenclatura dos domínios de produtos financeiros em `DOMAINS.md` do Designer | PO + arquitetura | histórias sem domínio conhecido não passam ao Designer |
| 7 | Fluxo de aprovação (quem aprova: só a PO? 2ª pessoa?) | PO | `approve-plan.mjs --by` registra o nome, mas o hook não prova a identidade |
| 8 | Formatos binários (.docx/.pdf/.pptx/.xlsx): extração pelo host antes do `ingest.mjs` | engenharia | `ingest.mjs` recusa e pede extração |
