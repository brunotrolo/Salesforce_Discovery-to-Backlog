# Modelo do backlog (`backlog.json`)

Fonte canônica; o contrato está em `schemas/backlog.schema.json`. Hierarquia **Epic (`E-nnn`) > História (`US-nnn`) > Subtarefa (`ST-nnn`)**; perguntas abertas `Q-nnn`.

- **Evidência:** âncoras `S01:L120-134` (fonte `Sxx`, linhas da fonte normalizada). `validate-backlog.mjs` confere que existem.
- **Perguntas abertas:** `kind: negocio` bloqueia `ready_for_design`; `kind: descoberta` não bloqueia (vira gate técnico no Designer).
- **Prioridade (opcional):** MUST | SHOULD | COULD | WONT, só se a PO decidiu; a skill não prioriza.
- **`classification_hint`:** padrao | misto | customizado | desconhecido — dica para o Journey Designer.
- **`domain`:** slug de um domínio do Journey Designer, ou `null` quando ainda não mapeado.
- **Status:** rascunho → revisado → aprovado → publicado. `ready_for_design` só com `aprovado`/`publicado` e sem pergunta de negócio aberta.
- **`conflicts`:** contradições entre rodadas aguardando decisão da PO.
- **Rodadas cumulativas:** `rounds[]` cresce; itens mantêm seus ids entre rodadas; `reconcile.mjs` levanta o que é novo, alterado, duplicado ou candidato a conflito.
- **IDs e hash:** o conteúdo de cada item gera um hash estável usado pela publicação (idempotência).
