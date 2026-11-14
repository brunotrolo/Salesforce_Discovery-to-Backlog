# Salesforce Discovery-to-Backlog

<p align="center">

  <img src="assets/banner.svg" width="960" alt="Salesforce Discovery-to-Backlog">
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/brunotrolo/Salesforce_Discovery-to-Backlog?style=flat-square&color=00A1E0&label=stars" alt="Stars">
  <img src="https://img.shields.io/badge/agentes-7-04E1CB?style=flat-square" alt="7 agentes">
  <img src="https://img.shields.io/badge/works%20with-Claude%20Code-032D60?style=flat-square" alt="Works with Claude Code">
</p>


É o **passo zero** do ciclo de skills Salesforce: transforma as rodadas de discovery da PO — transcrições, resumos, requisitos estruturados ou semi-estruturados — em **backlog rastreável** (Epic › História › Subtarefa) para o atendimento de produtos financeiros no Salesforce Service Cloud, publica no **Jira** só depois da aprovação explícita da PO e entrega o material para as áreas de negócio (Word, PowerPoint e um protótipo clicável). O resultado alimenta a skill irmã **[Salesforce Journey Designer](https://github.com/brunotrolo/Salesforce_Journey_Designer)**, que leva cada capacidade a `spec.md`, `plan.md` e `tasks.md`; depois vêm o **[Journey Developer](https://github.com/brunotrolo/Salesforce_Journey_Developer)** (constrói e implanta) e o **[Test Automator](https://github.com/brunotrolo/Salesforce_Test_Automator)** (testa pela tela).

**Instale no mesmo projeto que o Designer** — os dois compartilham `docs/sdd/DOMAINS.md`, `docs/sdd/BACKLOG.md` e `specs/`. Esta skill nunca desenha solução técnica (sem objetos, campos, componentes ou Apex) e nunca escreve no Jira sem um plano aprovado; o Designer é onde a história vira design.

**Como funciona** — baseado no modelo **Elephant–Goldfish** do [google/elephant-goldfish-model](https://github.com/google/elephant-goldfish-model), adaptado para discovery:
- **Orquestração e decisão** (a sequência, o que vira necessidade, o que é pergunta aberta, o rascunho seção a seção com a PO) → o `SKILL.md` do `/sf-discover` rodando na **conversa principal** (o *Elefante*, que guarda o contexto da PO) e os **7 agentes autorais** em `.claude/agents/`. Os revisores (*Goldfish*) rodam em contexto novo, somente leitura, e avaliam o backlog **contra as fontes**, sem ver a conversa.
- **Decisão por código, não por lembrete** (ingestão com máscara de PII, âncoras de fonte, validação do backlog, citação literal, plano de publicação, hook do Jira, handoff ao Designer) → os **scripts Node** em `.claude/skills/sf-discover/scripts/`, com testes.
- **Referência importada** — a cópia **literal** do EGM em `.claude/skills/egm/` (Apache-2.0, commit fixado em `UPSTREAM.md`) é só consulta: a skill lê por caminho para entender o racional original, nunca edita. A adaptação mora em `.claude/skills/sf-discover/references/egm-mapping.md`.
- **Princípio central:** *sem fonte, sem requisito.* Toda necessidade, regra e critério de aceite carrega uma âncora (`S01:L120-134`); o que a fonte não afirma vira **pergunta aberta**, nunca fato.

## Os 7 agentes

| Agente | Papel |
|---|---|
| `sf-disc-extractor` | Worker de extração: lê **um trecho** de **uma fonte** normalizada e devolve, em JSON puro, necessidades, dores, regras de negócio, atores, jornadas, restrições e perguntas abertas — cada item com **citação literal** e âncora. A citação é conferida por código; item sem citação verificável é rejeitado. |
| `sf-disc-comprehension` | Leitor ingênuo (Goldfish): lê o backlog **sem conhecer o projeto**, parafraseia o que cada épico e história significa e aponta termos sem definição, suposições ocultas e partes que não se conectam. |
| `sf-disc-traceability` | Auditor de evidência (Goldfish): confere cada épico, história, critério de aceite, regra e subtarefa contra as fontes normalizadas e aponta o que foi **inventado, exagerado, distorcido ou contradito**. |
| `sf-disc-story-quality` | Auditor de qualidade (Goldfish): INVEST, testabilidade, completude do Dado/Quando/Então, tamanho e **Definition of Ready**. |
| `sf-disc-domain-fit` | Aderência ao domínio (Goldfish): Service Cloud padrão-primeiro, produtos financeiros, exposição a LGPD e regulatório, encaixe nos domínios do Designer e riscos de integração. |
| `sf-disc-zoom-out` | Visão de cima (Goldfish): escopo, tamanho de épico, duplicidade, fatiamento de MVP, ordem de dependência e *gold-plating*. |
| `sf-disc-prototype-review` | Revisor do protótipo (Goldfish): fidelidade ao template do console, cenários de aceite percorríveis, nenhuma regra ou valor inventados, dados fictícios e mascarados, perguntas de negócio visíveis na tela. |

Padrões de revisão em [`.claude/skills/sf-discover/standards/`](.claude/skills/sf-discover/standards/) e protocolo dos estágios em [`references/review-protocol.md`](.claude/skills/sf-discover/references/review-protocol.md).

## Pré-requisitos

- **Node.js ≥ 20** — todos os scripts (ingestão, validação, plano de publicação, hook, handoff).
- **MCP do Jira** conectado — só para **publicar** (`/sf-backlog-publish`). Para gerar o backlog, o pacote de importação (`import-package.csv`) e os materiais da PO, não é necessário. O nome do servidor e das ferramentas reais ainda são "a verificar" na primeira sessão conectada (ver `references/jira-adapter.md`).
- **Python 3** com `pip install python-docx python-pptx` — só para os arquivos **Word** e **PowerPoint**. Sem eles, a skill orienta a instalar ou usar as skills `docx`/`pptx` do host.
- **Playwright + Chromium** *(opcional)* — só para colocar capturas do protótipo dentro do Word/PowerPoint.
- Para o handoff: o projeto já ter o **Salesforce Journey Designer** instalado (`docs/sdd/DOMAINS.md` e `docs/sdd/BACKLOG.md`).
- Material de discovery em `.txt`, `.md`, `.vtt`, `.srt`, `.csv`, `.json`, `.yaml`, `.eml`; `.docx`, `.pdf`, `.pptx` e `.xlsx` são extraídos pelo host antes da ingestão.

## Como começar

### O que a PO entrega a você

Qualquer material de rodada de discovery, em qualquer formato: transcrição de reunião, resumo, lista de requisitos, e-mail, planilha. A skill detecta o tipo (transcrição, resumo, requisitos estruturados ou semi-estruturados), normaliza em `discovery/<rodada>/sources/Sxx.md` com **âncoras de linha**, **mascara PII formatada** (CPF, CNPJ, e-mail, telefone) e **pseudonimiza falantes** — o arquivo original e o mapa de falantes nunca são lidos pelo modelo. Veja [`references/source-formats.md`](.claude/skills/sf-discover/references/source-formats.md).

### Instalação

Rode **de dentro da pasta do projeto onde o Designer já está instalado**:

**Mac / Linux / Git Bash:**
```bash
git clone --depth 1 https://github.com/brunotrolo/Salesforce_Discovery-to-Backlog.git .db-tmp && mkdir -p .claude && { [ -f .claude/settings.json ] && mv .claude/settings.json .claude/settings.json.anterior; :; } && cp -r .db-tmp/.claude/. .claude/ && { grep -qx 'discovery/' .gitignore 2>/dev/null || printf '\ndiscovery/\nsources/\nspeakers.map.json\n*.approved.json\n' >> .gitignore; } && rm -rf .db-tmp
```

**Windows (PowerShell):**
```powershell
git clone --depth 1 https://github.com/brunotrolo/Salesforce_Discovery-to-Backlog.git .db-tmp; if (-not (Test-Path .claude)) { New-Item -ItemType Directory .claude | Out-Null }; if (Test-Path .claude\settings.json) { Move-Item -Force .claude\settings.json .claude\settings.json.anterior }; Copy-Item -Recurse -Force .db-tmp\.claude\* .claude\; if (-not (Select-String -Path .gitignore -Pattern '^discovery/$' -Quiet -ErrorAction SilentlyContinue)) { Add-Content .gitignore "`ndiscovery/`nsources/`nspeakers.map.json`n*.approved.json" }; Remove-Item -Recurse -Force .db-tmp
```

A cópia é aditiva: agentes, skills e rules daqui têm prefixo próprio (`sf-disc-*`, `sf-discover`, `sf-backlog-publish`, `sf-po-pack`, `sf-discovery-status`) e não colidem com os das skills irmãs. **Exceção: `settings.json`.** Se você já tinha um, ele é preservado como `.claude/settings.json.anterior` — **junte os dois**: mantenha os hooks e permissões que já tinha e acrescente o hook `guard-jira-write` deste repositório. As **gravações e transcrições** ficam em `discovery/`, que a instalação acrescenta ao `.gitignore`: material de discovery **nunca** vai para o git.

### Configuração para publicar no Jira

Gerar o backlog não exige configuração. Para **publicar**, preencha `.claude/skills/sf-discover/config/jira.config.json` (hoje **provisório**):

```json
{
  "templates_status": "oficial",
  "project_key": "SEU_PROJETO",
  "mcp_server_pattern": "^mcp__seu-servidor__"
}
```

Enquanto `templates_status` for `provisorio` (ou faltar `project_key`), o `diff-publish` **bloqueia** a publicação — mas o `import-package.csv` continua sendo gerado, para importação manual. O campo `mcp_server_pattern` é opcional: use-o só se o nome do servidor MCP do Jira não contiver "atlassian" nem "jira". Os templates de Epic, História e Subtarefa estão em `templates/` (provisórios, em PT-BR); as decisões que dependem da equipe estão em [`docs/open-decisions.md`](docs/open-decisions.md).

Depois, abra o Claude Code na pasta do projeto — os comandos `/` e os agentes carregam automaticamente junto com os das skills irmãs.

## O que entra no seu `.claude/`

| Caminho | O que faz | Quando carrega |
|---|---|---|
| `agents/sf-disc-*` | Os 7 subagentes (extrator, cinco revisores do backlog e revisor do protótipo). Cada um roda na própria janela de contexto. | Quando despachados |
| `rules/` | `discovery-governance.md` (sem fonte sem requisito, Elefante e Goldfish, orquestração na conversa principal, PII, entregas para o negócio) sem `paths:`, e `jira-write.md` escopada à escrita no Jira. | A primeira no início da sessão; a outra quando o contexto envolve o Jira |
| `skills/sf-discover/` | O comando `/sf-discover` e tudo que ele usa: `scripts/`, `schemas/`, `standards/`, `templates/`, `config/`, `references/` (inclui o **template do console** para protótipos) e `vendor/slds/`. | Sob demanda, quando você digita |
| `skills/sf-backlog-publish/`, `skills/sf-po-pack/`, `skills/sf-discovery-status/` | Os comandos de publicação no Jira, de entregas para a PO e de status. | Sob demanda |
| `skills/egm/` | Cópia **literal** do Elephant–Goldfish Model (Apache-2.0) para consulta; nunca é editada. | Quando um agente lê o arquivo que precisa |
| `settings.json` | Hook `guard-jira-write` (em toda ferramenta `mcp__*`) e a negação de leitura de `.env`. | Aplicado em toda chamada de ferramenta |
| `discovery/` *(na raiz do projeto, fora do git)* | Fontes normalizadas, extrações, `backlog.json`, relatórios de revisão, planos de publicação e entregas de cada rodada. | Criada na primeira rodada |

### Comandos

| Comando | O que faz |
|---|---|
| `/sf-discover <rodada> <fontes…>` | Roda a rodada: ingestão, extração em paralelo, reconciliação com rodadas anteriores, rascunho seção a seção com a PO, revisão Goldfish em 5 estágios, resolução e aprovação. Modos: interativo (padrão), `--consolidado` (sem portões) e `--skip-review` (só com motivo registrado). |
| `/sf-po-pack <rodada>` | Entrevista curta de **múltipla escolha** (sempre pergunta se a PO precisa do protótipo) → **Word** (Visão de Produto), **PowerPoint** e **protótipo HTML clicável** derivado do template do console da equipe. |
| `/sf-backlog-publish <rodada>` | Gera o plano (criar / atualizar / ignorar, com o valor anterior → novo), pede a **aprovação explícita da PO** e só então escreve no Jira pelo MCP. Nunca apaga, nunca muda status. |
| `/sf-discovery-status` | Situação de cada rodada: fontes, histórias por status, revisão, plano de publicação, entregas e o próximo passo. |

O handoff ao Designer é o script `scripts/handoff-designer.mjs` (**dry-run por padrão**): só passam histórias **aprovadas**, `ready_for_design` e de domínio que existe no `DOMAINS.md`; cada uma vira uma linha em `docs/sdd/BACKLOG.md` (status `não iniciado`) e um `spec.md` semente **só de negócio**, com `[NEEDS CLARIFICATION: negócio]` para as perguntas abertas.

### O que o `settings.json` e o hook impedem na prática

O hook `.claude/skills/sf-discover/scripts/guard-jira-write.mjs` cobre o que **poluiria o Jira em silêncio** — por isso é bloqueio, não prosa:

- **leitura** (buscar, ler, metadados) passa; **exclusão, mudança de status e qualquer escrita no Confluence** são negadas sempre;
- **escrita** (criar, editar, vincular, comentar) só passa com `publish_plan.approved.json` cujo **hash bate** com o `publish_plan.json` atual, no projeto do plano e para um título ou chave que **consta no plano aprovado**;
- verbo de ferramenta desconhecido ou **payload ilegível** em escrita → negado (fail-closed); o payload é localizado **por valor**, não só por nome de parâmetro;
- plano alterado depois da aprovação (hash diferente) → negado.

Limite honesto: o hook prova que a chamada bate com um plano aprovado; **não prova** que a PO aprovou de fato — por isso `approve-plan.mjs` só roda depois de um "aprovo" explícito na conversa. Se o payload do hook vier quebrado, ele sai em silêncio sem bloquear: um bug no guard nunca trava trabalho legítimo.

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

## Ciclo por rodada

```
material da PO (transcrição, resumo, requisitos, e-mail…)  →  ingest.mjs (âncoras Sxx:Lnn, PII mascarada)
        ↓
extratores em paralelo (≤ 6) → merge-extractions (citação literal conferida) → discovery_brief
        ↓
reconcile (rodadas anteriores) → rascunho Épico › História › Subtarefa, seção a seção, com a PO → backlog.json
        ↓
revisão Goldfish (estágios 5–9) → resolução com a PO (PROPOSE FIX / CONTEST) → status "aprovado"
        ↓
/sf-po-pack → Word + PowerPoint + protótipo      /sf-backlog-publish → plano → aprovação → Jira      handoff-designer → BACKLOG.md + spec.md semente
```

## Entregas para o negócio

A PO compartilha com as áreas de negócio; **o time técnico** recebe Markdown e JSON.
- **Áreas de negócio (via PO):** `.docx` (Visão de Produto), `.pptx` (apresentação da rodada) e `.html` (o protótipo abre no navegador, offline, sem instalar nada). Linguagem de negócio, sem jargão técnico, sem hash nem JSON.
- **Time técnico:** `backlog.json`, `backlog_draft.md`, relatórios de revisão e os `spec.md` semente do Designer.
- **Protótipo = template do console da equipe** (referência **obrigatória**, em `references/prototype-template/`): a PO valida a jornada **dentro do console que ela conhece**. Só o bloco `JORNADA` é acrescentado ou ajustado; o `check-prototype-html.mjs` reprova qualquer alteração fora dele, ação inexistente no roteiro, cenário de aceite sem cobertura, chamada de rede e dado que pareça real. A skill **sempre pergunta** se a PO precisa do protótipo, com uma entrevista de múltipla escolha ([`references/po-interview.md`](.claude/skills/sf-discover/references/po-interview.md)).

## Garantias (por código, não por lembrete)

- **Sem fonte, sem requisito:** `validate-backlog.mjs` confere se cada âncora existe; `merge-extractions.mjs` confere a citação literal.
- **Jira:** o hook `guard-jira-write.mjs` nega escrita sem plano aprovado cujo hash bata, nega exclusão, transição, Confluence e outro projeto, e nega payload ilegível.
- **Templates provisórios não publicam** (`templates_status: provisorio`), mas o pacote de importação é gerado.
- **LGPD:** CPF/CNPJ/e-mail/telefone formatados são mascarados na entrada; falantes pseudonimizados; `discovery/` fora do git.

## O que NÃO foi verificado

O protótipo é a réplica HTML do console (template da PO), não o Salesforce real: não é LWC, não roda no Salesforce e não substitui o desenho do Journey Designer. Também não foram exercitados: o nome do servidor e das ferramentas reais do MCP do Jira, os templates e campos reais do Jira, uma sessão real com a PO e a execução ao vivo dos subagentes (extrator e revisores) — estão escritos e passam no lint, mas nunca rodaram numa sessão real. O comando de instalação para PowerShell foi escrito por analogia e não foi executado. Ver [`docs/open-decisions.md`](docs/open-decisions.md).

## Testes

`node scripts/verify-skills.mjs && node --test tests/core.test.mjs tests/jira.test.mjs` — 28 testes (ingestão por formato, PII, âncoras, validação do backlog, reconciliação, plano de publicação, hook do Jira, handoff ao Designer, protótipo, Word/PowerPoint). Os testes do Word/PowerPoint exigem `python-docx` e `python-pptx` e o do navegador exige Playwright; sem eles, são pulados.

## Sobre o EGM importado — resumo

Cópia literal, sem modificação, de partes do [google/elephant-goldfish-model](https://github.com/google/elephant-goldfish-model) (Apache-2.0, Copyright 2026 Google LLC): os desenhos de arquitetura, revisão, sintetizador e rascunho, os agentes e os recursos de referência. Licença em `.claude/skills/egm/LICENSE`, commit e escopo em `.claude/skills/egm/UPSTREAM.md`, atribuição em [`NOTICE.md`](NOTICE.md). Este repositório não é um produto oficial do Google. O CSS e os ícones do SLDS usados pelo renderizador declarativo opcional (BSD-3-Clause) também estão atribuídos no `NOTICE.md`.

---

## 📋 Resumo — input, o que faz, o que entrega

| | |
|---|---|
| **Input** | O material das rodadas de discovery da PO, em qualquer formato (transcrição, resumo, requisitos estruturados ou semi-estruturados), e o `backlog.json` das rodadas anteriores, se houver. Para publicar: MCP do Jira conectado e `jira.config.json` preenchido. Para o handoff: o Designer instalado. |
| **O que faz** | Ingestão com âncoras e PII mascarada → extração em paralelo com **citação literal conferida por código** → reconciliação entre rodadas → rascunho Épico › História › Subtarefa seção a seção com a PO → **revisão Goldfish em 5 estágios** contra as fontes → resolução e aprovação pela PO → plano de publicação com diff e **aprovação explícita** → Jira pelo MCP (nunca apaga, nunca transiciona) → handoff ao Designer. |
| **Entrega** | `discovery/<rodada>/backlog.json` canônico (+ `backlog_draft.md`, `import-package.csv`, relatórios de revisão); **Word**, **PowerPoint** e **protótipo HTML** para a PO levar ao negócio; itens no Jira com `jira-map.json` e `publish_log.md`; linhas em `docs/sdd/BACKLOG.md` e `spec.md` semente (só negócio) para o Journey Designer. |

---

<p align="center">
  ⭐ <b><a href="https://github.com/brunotrolo/Salesforce_Discovery-to-Backlog/stargazers">Dê uma star no repo</a></b> para ser avisado quando novas melhorias saírem.
</p>
