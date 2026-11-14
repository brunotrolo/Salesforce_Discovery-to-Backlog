# Template de protótipo do console (REFERÊNCIA OBRIGATÓRIA)

`template.html` é a réplica fiel do console de atendimento da equipe (fornecida pela PO): topo, aba do cliente, **barra lateral** (perfil, alertas, dados cadastrais, casos), **abas de nível 1/2/3**, modais de **busca → produto → conta**, **wizard de 5 passos** (antecipação de parcelamento) e o acordeão de backoffice. Todo protótipo da skill **parte deste arquivo**: a PO valida uma jornada **dentro do console que ela conhece**, não em uma tela genérica.

Regras (verificadas por `scripts/check-prototype-html.mjs`):
1. **Fidelidade.** Fora do bloco `JORNADA` e do `<style id="jornada-css">`, o HTML do protótipo é **idêntico** ao template. Não edite CSS, topo, barra lateral nem funções existentes.
2. **A demanda mora só em:** `/* JORNADA:INICIO */ … /* JORNADA:FIM */` (JS) e `<style id="jornada-css">` (CSS extra, opcional, logo antes de `</head>`).
3. **Dados fictícios e mascarados.** Sem CPF/CNPJ/e-mail/telefone formatados; nomes "Cliente Exemplo …". Sem rede.
4. **Roteiro.** Todo passo (`walkthrough[].run`) usa ações que existem (do template ou de `EXT.actions`) e os passos cobrem os cenários de aceite (`covers: ["US-001#1"]`).
5. O que a fonte não define aparece no protótipo como aviso ("a definir com o negócio") e em `assumptions` com o id da pergunta (`Q-001: …`). Nunca como regra inventada.

## Anatomia (estado `S` + `da(acao, dado)`)
| Tela / estado | Como chegar (ações do template) |
|---|---|
| Home — buscar cliente | estado inicial (`S.tela='home'`) |
| Modal "Seleção de produto" | `buscarCliente` |
| Modal "Selecione a conta" | `buscarCliente`, `selProduto` (`selConta`, `<índice>` escolhe a conta) |
| Console (principal) | `avancar` |
| Abas nível 2 (`S.tab2`) | `t2`, `detalhes` · `massificados` · `ofertas` · `retencao` · `conect` · `autorizacoes` · `fraude` · `contestacoes` · `portoplus` · … |
| Abas nível 3 (`S.tab3`) dentro de Detalhes da Conta | `t3`, `fatura` · `manutencao` · `troca` · `manuCar` · `dossie` · `viagem` · `bloq` |
| Abas nível 4 (`S.tab4`) | `t4`, `parcelamento` · `resumo` · `historico` |
| Wizard Antecipação (passos 1–5) | `showAntecipacao`, `selParc`, `confirmarSelParc`, `escolherModal`, `togParcela`, `confirmarTotal`/`confirmarParcial`, `finalizar` |
| Backoffice (acordeão) | `t2`,`portoplus`, `ppAcc`, … |

Componentes prontos para reutilizar nas jornadas novas (funções do template): `fld(rótulo, valor)` campo somente leitura, `btn(texto, acao, classe)` (classes: `btn-navy`, `btn-antec`, `btn-modal`), `al(tipo, html)` alerta (`i` info, `e` erro, `w` aviso), `mf`, `calcPrice` (tabela Price) e as classes do CSS (`.sec-hdr`, `.fgrid`, `.ot`/`.tw` tabelas, `.pill`, `.card-img`, `.pp-*`).
Texto com acento: use entidades (`&#233;`) como o template; `esc()` já preserva entidades.

## Pontos de extensão (única mudança de código feita no original — ver PATCHES.md)
```js
EXT.tabs2.push(['chave','Rótulo']);        // nova aba de nível 2
EXT.tabs3.push(['chave','Rótulo']);        // nova aba dentro de Detalhes da Conta
EXT.render['chave']=function(){ return '<html…>'; };   // conteúdo da aba
EXT.actions['acao']=function(dado){ /* altera seu estado */ };   // onclick="da('acao','dado')"
EXT.reset=function(){ /* volta o estado da jornada */ };
```
Para **ajustar uma jornada existente** (ex.: o wizard de antecipação): sobrescreva a função de render dentro do bloco JORNADA (`step1=function(){…}`) ou registre uma aba nova que a substitua; **não** edite a função original.
`window.PROTO_RESET()` e `window.PROTO_DO(acao, dado)` existem para o roteiro e para as capturas de tela.

## Fluxo de trabalho
1. `proto_meta.json` (schema `schemas/proto-meta.schema.json`) com título, histórias, respostas da entrevista e roteiro.
2. `node scripts/new-prototype.mjs proto_meta.json --out discovery/<rodada>/entregas/prototipo.html`.
3. Edite a jornada no bloco `JORNADA` (e `jornada-css`).
4. `node scripts/check-prototype-html.mjs prototipo.html --backlog backlog.json --meta-out proto_meta.json` até aprovar.
5. Revisor `sf-disc-prototype-review`; mostrar à PO; capturas (`screenshot-prototype.mjs`) e Word/PowerPoint (`export-office.py`).

## Origem e sanitização
Fornecido pela PO. Na cópia versionada foram neutralizados: marca ("Banco Exemplo"), nome e CPF do cliente de exemplo (mascarados). Permanecem nomes funcionais de abas/parceiros do console (ex.: Portoplus, Smiles, ConectCar), por fidelidade à jornada; neutralize-os se o repositório for público. Ver `PATCHES.md`.
