# Governança do Discovery-to-Backlog (sempre ativa)

1. **Sem fonte, sem requisito.** Toda necessidade, regra, critério de aceite ou restrição no backlog aponta para uma âncora de fonte (`S01:L120-134`).
   O que não tem âncora é pergunta aberta (`[NEEDS CLARIFICATION: negócio|descoberta]`), nunca fato. Não invente regra de negócio, de compliance ou de produto financeiro.
2. **Elefante e Goldfish.** Você (conversa principal) mantém o contexto e redige. A revisão é feita por subagentes em contexto novo, somente leitura, que recebem
   o backlog e as fontes — nunca a conversa. Sem ferramenta de subagente, **pare** e avise: revisão no mesmo contexto não é revisão. Um revisor que falha duas vezes
   fica `not run`; nunca conte como "zero achados".
3. **A orquestração fica na conversa principal.** Subagente não chama subagente nem faz perguntas ao usuário. Extratores e revisores são de primeiro nível.
4. **Artefato primeiro.** Backlog, brief, relatórios e planos vão para arquivo; no chat vai só o caminho e a pergunta. Uma pergunta por vez, sem bajulação, sem pedidos de desculpa.
5. **JSON canônico.** `backlog.json` é a fonte; `backlog_draft.md` é renderizado. Edite o JSON e re-renderize; valide com `validate-backlog.mjs` antes de mostrar à PO.
6. **PII.** Só leia fontes normalizadas por `ingest.mjs` (PII formatada mascarada). Nunca abra o arquivo original de transcrição nem o `speakers.map.json`.
7. **Jira é escrita controlada.** Nada é criado ou editado sem `publish_plan.approved.json` (aprovação explícita da PO). Nunca exclua, nunca transicione status.
   Template provisório = não publica. Detalhes em `.claude/rules/jira-write.md`.
8. **Escopo.** Não estime pontos, não priorize roadmap, não crie sprints, não projete solução técnica (isso é do Journey Designer/Developer).
