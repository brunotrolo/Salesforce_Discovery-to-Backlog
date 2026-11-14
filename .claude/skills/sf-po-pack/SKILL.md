---
name: sf-po-pack
description: Gera as entregas da rodada para a Product Owner compartilhar com as áreas de negócio — documento Word (Visão de Produto), apresentação PowerPoint e, se ela quiser, um protótipo HTML clicável derivado do template do console da equipe (referência obrigatória). Sempre começa com uma breve entrevista de múltipla escolha. Use após o backlog da rodada existir (discovery/<rodada>/backlog.json), quando a PO pedir material para o negócio, protótipo, apresentação ou documento.
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
3. **Protótipo = template do console (OBRIGATÓRIO).** Leia **inteiro** `.claude/skills/sf-discover/references/prototype-template/README.md` antes de qualquer edição. Não existe protótipo "do zero" nem genérico: sempre parte de `template.html`, e a demanda da PO é **acrescentada ou ajustada** nele.
   - Escreva `discovery/$round/entregas/proto_meta.json` (`schemas/proto-meta.schema.json`): título, histórias, `brief` (respostas da entrevista), `assumptions` (perguntas de negócio abertas, com o id `Q-nnn`) e o `walkthrough` (cada passo com `run` = ações que levam à tela e `covers` = cenários de aceite `US-001#1`).
   - `node .claude/skills/sf-discover/scripts/new-prototype.mjs discovery/$round/entregas/proto_meta.json --out discovery/$round/entregas/prototipo.html`.
   - Edite o HTML **somente** entre `/* JORNADA:INICIO */` e `/* JORNADA:FIM */` (e, se preciso, `<style id="jornada-css">` antes de `</head>`), usando os pontos de extensão `EXT.*` e os componentes do template (`fld`, `btn`, `al`, classes do CSS). Para ajustar jornada existente, sobrescreva a função de render no bloco JORNADA; nunca edite a original.
   - Só o que está nas histórias/critérios de aceite; o que a fonte não define vira aviso na tela ("a definir com o negócio") + `assumptions`, nunca regra inventada. Dados **fictícios** e mascarados; sem rede.
4. **Valide até aprovar**: `node .claude/skills/sf-discover/scripts/check-prototype-html.mjs discovery/$round/entregas/prototipo.html --backlog discovery/$round/backlog.json --meta-out discovery/$round/entregas/proto_meta.json`. Exit 2 → corrija e repita (máx. 3 vezes; depois, diga o que falta). Fidelidade ao template, roteiro, cobertura de aceite, PII e rede são verificados por código.
5. **Revisão goldfish do protótipo** (se há subagentes): `sf-disc-prototype-review` (contexto novo) com os caminhos de `prototipo.html`, `proto_meta.json`, `backlog.json`, `prototype_brief.json`, `template.html`. Trate achados como nos estágios do sf-discover (PROPOSE FIX / CONTEST). Revisor que falhar = `not run`, diga isso.
6. **Mostre à PO** o caminho do HTML (abrir no navegador, funciona offline; botão "Roteiro de validação" guia os passos) e pergunte (múltipla escolha) o que ajustar; no máximo 2 ciclos.
7. **Imagens (opcional)**: `node .claude/skills/sf-discover/scripts/screenshot-prototype.mjs <html> discovery/$round/entregas/proto_meta.json discovery/$round/entregas/telas` (precisa do Playwright; exit 3 = sem imagens, siga).
8. **Word e PowerPoint** (os que ela escolheu): `python3 .claude/skills/sf-discover/scripts/export-office.py discovery/$round/backlog.json --out discovery/$round/entregas [--only docx|pptx] [--prototype discovery/$round/entregas/proto_meta.json --screens discovery/$round/entregas/telas --prototype-file <html>] [--docx-template <modelo> --pptx-template <modelo>]`. Se faltar `python-docx`/`python-pptx`, diga o comando de instalação ou use as skills `docx`/`pptx` do host.
9. **Reporte**: onde estão os arquivos, o que foi/ não foi gerado, perguntas de negócio ainda abertas, e o aviso de que o protótipo é referência visual (não substitui o desenho do Journey Designer).

## Regras
- O renderizador declarativo (`render-prototype.mjs`, SLDS) é só um rascunho opcional de fluxo para alinhar com a PO; **a entrega é sempre derivada do template**.
- Protótipo, Word e PPT nunca contêm transcrição crua, nomes reais, nem dados pessoais; o texto é em linguagem de negócio.
- Nada aqui escreve no Jira.
- Se `docs/open-decisions.md` marca os modelos corporativos (Word/PowerPoint) como definidos, use `--docx-template/--pptx-template`.
