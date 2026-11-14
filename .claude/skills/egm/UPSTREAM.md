# Referência literal: Elephant-Goldfish Model (EGM)

- **Origem:** https://github.com/google/elephant-goldfish-model
- **Commit importado:** 964a4f1ecd333961375c35cb37ed09364dab5e4e ("Add experimental Windsurf (Devin Desktop) adapter (#379)")
- **Licença:** Apache-2.0 (arquivo `LICENSE` nesta pasta). Copyright 2026 Google LLC. Não é um produto oficial do Google.
- **O que foi copiado, sem alteração:** `skills/` (7 skills), `agents/` (10 personas de revisores), `resources/` (rubricas e instruções de execução),
  `docs/designs/{architecture,review,synthesizer,draft,brainstorm}.md` e `docs/claude.md`. Não foram copiados: site, testes, CI, adaptadores de outros hosts.
- **Papel aqui:** material de **consulta** (lido por caminho pelos nossos agentes e pelos mantenedores). Fica sob `.claude/skills/egm/skills/`, dois níveis abaixo,
  então **não aparece como comando `/`** nem registra subagentes. Nada aqui é executado como parte do `sf-discover`.
- **Regra:** nunca reescrever estes arquivos. As adaptações para discovery → backlog ficam nos nossos próprios agentes, padrões e referências
  (`.claude/agents/sf-disc-*.md`, `.claude/skills/sf-discover/`), que citam o arquivo de origem de cada ideia herdada.
- **Para atualizar:** repetir a cópia a partir de um novo commit, atualizar este arquivo e revisar o mapa de herança em `sf-discover/references/egm-mapping.md`.
