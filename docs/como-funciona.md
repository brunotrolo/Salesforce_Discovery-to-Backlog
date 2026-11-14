# Como a skill funciona (detalhe)

Complemento do [README](../README.md).

## Como o orquestrador funciona internamente

### Elefante, Goldfish e a conversa principal

Subagente não chama subagente nem pergunta ao usuário. Por isso o `/sf-discover` roda na conversa principal e despacha só agentes de primeiro nível. Se não houver ferramenta de subagente, a skill **para**: revisão no mesmo contexto não é revisão. Revisor que falha duas vezes é `not run` — nunca "zero achados".

### Contrato do extrator

Cada `sf-disc-extractor` recebe um trecho (`Sxx.chunks.json`, ≤ 6 em paralelo) e devolve JSON puro com **citação literal + âncora** por item. O `merge-extractions.mjs` confere **por código** que a citação existe nas linhas ancoradas, rejeita o que não existe, deduplica e grava `discovery_brief.json/.md` com as contagens de verificados e rejeitados. Trecho que falha é registrado como **não extraído**, nunca como vazio.

### Revisão em estágios

Sequenciais, com os revisores de um estágio em paralelo: **5** zoom-out → **6** comprehension (só o backlog) → **7** traceability + story-quality + domain-fit → **8** zoom-out intermediário → **9** story-quality em modo Definition of Ready. Cada revisor recebe só os caminhos do backlog, das fontes, do seu padrão e o escopo — nunca a conversa. Achados 🔴 Blocker / 🟡 Major viram **PROPOSE FIX** ou **CONTEST** e a PO decide, um por vez; cada estágio permite **uma** reauditoria.

### Rodadas seguintes

O `backlog.json` é **cumulativo**. Nova rodada passa por `reconcile.mjs` (novo / alterado / duplicado / **conflito com rodada anterior**); um conflito sem decisão da PO (`conflicts`) bloqueia a aprovação e a publicação.

### Limites

Perguntas **uma por vez**, sem bajulação; contradição com decisão anterior **não** edita arquivo — aponta e pergunta qual vale; a skill nunca estima pontos, prioriza roadmap, cria sprints ou projeta solução técnica.

## Entregas para o negócio

A PO compartilha com as áreas de negócio; **o time técnico** recebe Markdown e JSON.
- **Áreas de negócio (via PO):** `.docx` (Visão de Produto), `.pptx` (apresentação da rodada) e `.html` (o protótipo abre no navegador, offline, sem instalar nada). Linguagem de negócio, sem jargão técnico, sem hash nem JSON.
- **Time técnico:** `backlog.json`, `backlog_draft.md`, relatórios de revisão e os `spec.md` semente do Designer.
- **Protótipo = template do console da equipe** (referência **obrigatória**, em `references/prototype-template/`): a PO valida a jornada **dentro do console que ela conhece**. Só o bloco `JORNADA` é acrescentado ou ajustado; o `check-prototype-html.mjs` reprova qualquer alteração fora dele, ação inexistente no roteiro, cenário de aceite sem cobertura, chamada de rede e dado que pareça real. A skill **sempre pergunta** se a PO precisa do protótipo, com uma entrevista de múltipla escolha ([`references/po-interview.md`](../.claude/skills/sf-discover/references/po-interview.md)).

## Sobre o EGM importado — resumo

Cópia literal, sem modificação, de partes do [google/elephant-goldfish-model](https://github.com/google/elephant-goldfish-model) (Apache-2.0, Copyright 2026 Google LLC): os desenhos de arquitetura, revisão, sintetizador e rascunho, os agentes e os recursos de referência. Licença em `.claude/skills/egm/LICENSE`, commit e escopo em `.claude/skills/egm/UPSTREAM.md`, atribuição em [`NOTICE.md`](../NOTICE.md). Este repositório não é um produto oficial do Google. O CSS e os ícones do SLDS usados pelo renderizador declarativo opcional (BSD-3-Clause) também estão atribuídos no `NOTICE.md`.

