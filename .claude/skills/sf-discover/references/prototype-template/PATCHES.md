# Diferenças entre o template original (PO) e `template.html`

Somente estas alterações; todo o resto é byte a byte o original.

1. **Sanitização:** `<title>`; marca "PortoBank" → "Banco Exemplo" (inclui "Relacionamento Porto"); `CLIENTE.nome` → "Cliente Exemplo Um"; `CLIENTE.cpf`/`cpfInput` → `***.000.***-00`.
2. **Correção:** `esc()` não escapava entidades já codificadas (`&#233;` aparecia como texto cru em rótulos). Agora `&` seguido de `#nnn;` é preservado.
3. **Pontos de extensão:** objeto `EXT` (tabs2/tabs3/render/actions/reset); `T2`/`T3` recebem `EXT.tabs2/tabs3`; `renderTabContent()` consulta `EXT.render`; `renderMain()` trata abas de nível 2 registradas em `EXT.render` como página inteira (como a aba Portoplus), e a página dessas abas é desenhada por `renderTabContent()`; `da()` consulta `EXT.actions`.
4. **Marcadores** `/* JORNADA:INICIO */ … /* JORNADA:FIM */` após `render();` e utilitários `PROTO_RESET`/`PROTO_DO` ao final do script.

Se o template da PO mudar, reaplique 1–4 sobre a nova versão e rode `node --test tests/jira.test.mjs`.
