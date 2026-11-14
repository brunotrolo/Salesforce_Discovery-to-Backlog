# Entrevista com a PO (múltipla escolha)

Regras: **sempre** perguntar (a cada rodada, antes de gerar entregas), mesmo que a PO tenha dito "não" antes; usar `AskUserQuestion` (2–4 opções, 1–4 perguntas por chamada, "Outro" já existe); português; nenhuma pergunta aberta quando uma escolha basta; se a PO escolher "Não agora", registre e siga sem insistir.

## Rodada A — sempre (1 chamada, 2 perguntas)
1. **Você precisa de um protótipo visual desta rodada?** — `Sim, clicável (Recomendado se há jornada nova)` · `Não agora` · `Depois da validação com o negócio`.
2. **Quais entregas para o negócio você quer?** (multiSelect) — `Documento Word (Visão de Produto)` · `Apresentação PowerPoint` · `Só o resumo no chat` .
   (Markdown técnico — `backlog_draft.md`, revisão, specs — é gerado sempre, para o time técnico.)

## Rodada B — só se "Sim" ao protótipo (1 chamada, até 4 perguntas)
O protótipo **parte do template do console** (`references/prototype-template/README.md`, referência obrigatória): a PO vê a jornada dentro do console que ela conhece.
3. **O que prototipar?** — listar até 4 histórias/épicos candidatos (os `ready_for_design` ou de maior prioridade) + "Todas as do épico X".
4. **Esta demanda...** — `Acrescenta uma jornada nova ao console` · `Ajusta uma jornada que já existe (qual? → Outro)` .
5. **Onde fica no console?** — `Nova aba no nível 2 (ao lado de Detalhes da Conta, Retenção…)` · `Nova aba dentro de Detalhes da Conta (Fatura, Manutenção…)` · `Passo/wizard dentro de uma aba existente` · `Na busca/home do atendimento`.
6. **Qual profundidade e quais cenários?** — `Uma tela, caminho feliz` · `Fluxo de 3–5 telas, feliz + erro (Recomendado)` · `Fluxo completo com variações e dados sensíveis/LGPD visíveis`. (Se precisar separar em duas perguntas, use a Rodada C.)

## Rodada C — só se necessário (1 pergunta)
7. **Para quem é?** — `Validar com a área de negócio` · `Alinhar com TI/arquitetura` · `Demonstração executiva`. (Muda o tom do texto e o nível de detalhe do roteiro.)

## Depois da entrevista
Gravar `prototype_brief.json` (schema `schemas/prototype-brief.schema.json`: `change_kind`, `existing_target`, `insertion`, `fidelity`, `scenarios`, `audience`) e copiá-lo para `brief` do `proto_meta.json`. Se a PO respondeu "Outro", copie o texto em `other_notes` e confirme em uma frase como vai interpretar.
Ao mostrar o protótipo pronto, pergunte (múltipla escolha) o que ajustar: `Está bom` · `Ajustar textos/campos` · `Mudar o fluxo` · `Refazer com outro tipo de tela`. No máximo 2 rodadas de ajuste por entrega.
