---
name: sf-discovery-status
description: Mostra a situação das rodadas de discovery do sf-discover (fontes, brief, histórias por status, revisão, plano de publicação) e o próximo passo sugerido. Use quando a PO perguntar em que pé estão as rodadas ou o que falta para publicar.
disable-model-invocation: true
---

# sf-discovery-status

1. Rode `node .claude/skills/sf-discover/scripts/status.mjs` e mostre a saída.
2. Para cada rodada, sugira UM próximo passo: sem backlog → `/sf-discover`; histórias em `rascunho` → revisão/resolução; `revisado` sem aprovação → pedir aprovação da PO; plano `bloqueado` → ler `publish_plan.md`; `aprovado` + `ready_for_design` → handoff ao Designer (`handoff-designer.mjs`, dry-run primeiro).
3. Não altere nada.
