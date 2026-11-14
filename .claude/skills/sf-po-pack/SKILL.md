---
name: sf-po-pack
description: Gera as entregas da rodada para a Product Owner compartilhar com as áreas de negócio — documento Word (Visão de Produto), apresentação PowerPoint e, se ela quiser, um protótipo HTML clicável com o design system padrão do Salesforce Service Cloud (SLDS). Sempre começa com uma breve entrevista de múltipla escolha. Use após o backlog da rodada existir (discovery/<rodada>/backlog.json), quando a PO pedir material para o negócio, protótipo, apresentação ou documento.
disable-model-invocation: true
argument-hint: <round-id>
arguments: [round]
---

# sf-po-pack — entregas para a PO (Word, PowerPoint, protótipo)

Roda na **conversa principal** (a entrevista usa `AskUserQuestion`; subagente não pode perguntar). Regra de formato: **negócio = Word/PowerPoint/HTML; time técnico = Markdown**. Nunca converta artefato técnico para Word sem a PO pedir.

## Pré-condições
`discovery/$round/backlog.json` existe e passa `validate-backlog.mjs`. Se não, pare e aponte `/sf-discover`.

## Passos
1. **Entrevista A (sempre)** — siga `references/po-interview.md` (em `.claude/skills/sf-discover/references/`): pergunte se ela precisa do protótipo e quais entregas quer (Word, PowerPoint). **Pergunte mesmo que já tenha perguntado antes.** "Não agora" é resposta válida: registre em `prototype_brief.json` (`needed`) e siga.
2. **Se quer protótipo — Entrevista B/C**: escopo, tipo de tela, profundidade, cenários, público. Grave `discovery/$round/entregas/prototype_brief.json`.
3. **Desenhe `prototype.json`** (`schemas/prototype.schema.json`) a partir das histórias escolhidas e das respostas:
   - Só o que está nas histórias/critérios de aceite; cada passo do `walkthrough` cobre cenários (`covers: ["US-001#1"]`). O que a fonte não define vira alerta/nota "a definir com o negócio" na tela, nunca regra inventada.
   - Dados **fictícios** ("Cliente Exemplo Um"); documentos sempre mascarados (`•••.456.789-••`). O validador reprova PII formatada.
   - Padrão Service Cloud: `app.mode: console`; blocos do catálogo do renderizador (`highlights`, `path`, `fields`, `form`, `table`, `tabs`, `timeline`, `alert`, `cards`, `actions`). Não invente componentes.
   - Perguntas de negócio abertas aparecem no protótipo como `alert` tom `aviso`.
4. **Valide e renderize**: `node .claude/skills/sf-discover/scripts/render-prototype.mjs discovery/$round/entregas/prototype.json --backlog discovery/$round/backlog.json --out discovery/$round/entregas/prototipo.html`. Exit 2 → corrija e repita (máx. 3 vezes; depois, diga o que falta).
5. **Revisão goldfish do protótipo** (se há subagentes): dispare `sf-disc-prototype-review` (contexto novo) com os caminhos de `prototype.json`, `backlog.json`, `prototype_brief.json`. Trate os achados como nos estágios do sf-discover (PROPOSE FIX / CONTEST). Revisor que falhar = `not run`, diga isso.
6. **Mostre à PO** o caminho do HTML (abrir no navegador, funciona offline) e pergunte (múltipla escolha) o que ajustar; no máximo 2 ciclos.
7. **Imagens (opcional)**: `node .claude/skills/sf-discover/scripts/screenshot-prototype.mjs <html> <prototype.json> discovery/$round/entregas/telas` (precisa do Playwright; exit 3 = sem imagens, siga).
8. **Word e PowerPoint** (os que ela escolheu): `python3 .claude/skills/sf-discover/scripts/export-office.py discovery/$round/backlog.json --out discovery/$round/entregas [--only docx|pptx] [--prototype <json> --screens <dir> --prototype-file <html>] [--docx-template <modelo> --pptx-template <modelo>]`. Se faltar `python-docx`/`python-pptx`, diga o comando de instalação ou use as skills `docx`/`pptx` do host.
9. **Reporte**: onde estão os arquivos, o que foi/ não foi gerado, perguntas de negócio ainda abertas, e o aviso de que o protótipo é referência visual (não substitui o desenho do Journey Designer).

## Regras
- Protótipo, Word e PPT nunca contêm transcrição crua, nomes reais, nem dados pessoais; o texto é em linguagem de negócio.
- Nada aqui escreve no Jira.
- Se `docs/open-decisions.md` marca os modelos corporativos (Word/PowerPoint) como definidos, use `--docx-template/--pptx-template`.
