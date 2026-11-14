# Adaptador Jira (Atlassian Rovo MCP)

A skill fala em **operações lógicas**. Os nomes reais das ferramentas do Rovo **NÃO foram verificados** (nenhum MCP Atlassian estava conectado ao construir esta skill).
Na primeira sessão com o MCP conectado: liste as ferramentas disponíveis, preencha a coluna "Ferramenta real" abaixo e rode `node --test tests/jira.test.mjs` (o hook classifica por verbo no nome).

| Operação lógica | Uso | Ferramenta real (a verificar) | Classe no hook |
|---|---|---|---|
| buscar | JQL por `discovery-id` antes de criar | ? (ex.: busca JQL) | leitura |
| ler | estado atual de uma issue | ? | leitura |
| metadados | projeto, tipos, campos, prioridades | ? | leitura |
| criar | Epic, História, Subtarefa | ? (ex.: create issue) | escrita (exige plano aprovado) |
| editar | só issue mapeada com hash divergente | ? (ex.: edit issue) | escrita (exige plano aprovado) |
| vincular | Epic↔História (pai) e dependências | ? | escrita |
| comentar | registrar rodada/decisão | ? | escrita |
| transicionar / excluir | **nunca** | — | negado sempre |

## Regras
1. Antes de criar: buscar por JQL `labels = "discovery-id:<id>"` (ou o campo definido em `jira.config.json`). Achou → mapear, não criar.
2. Depois de criar: gravar a chave no `jira-map.json` (`{ "<id local>": { "key": "ATD-1", "fingerprint": "...", "last": { ... } } }`) e registrar valor anterior/novo no `publish_log.md`.
3. Ordem: Epic → História → Subtarefa (o pai precisa existir).
4. Erro de API: parar, registrar no `publish_log.md`, não repetir em laço; reportar à PO.
5. O hook casa o payload por **valor** (summary/chave de issue/projeto), não por nome de parâmetro; payload ilegível = negado. Se o Rovo usar outra estrutura, ajuste `extract()` em `guard-jira-write.mjs` e adicione teste.
6. Limite honesto: o hook prova que a chamada bate com um plano aprovado; não prova que a PO aprovou de fato — por isso `approve-plan.mjs` só roda após aprovação explícita na conversa.
