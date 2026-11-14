# Entrevista com a PO (múltipla escolha)

Regras: **sempre** perguntar (a cada rodada, antes de gerar entregas), mesmo que a PO tenha dito "não" antes; usar `AskUserQuestion` (2–4 opções, 1–4 perguntas por chamada, "Outro" já existe); português; nenhuma pergunta aberta quando uma escolha basta; se a PO escolher "Não agora", registre e siga sem insistir.

## Rodada A — sempre (1 chamada, 2 perguntas)
1. **Você precisa de um protótipo visual desta rodada?** — `Sim, clicável (Recomendado se há jornada nova)` · `Não agora` · `Depois da validação com o negócio`.
2. **Quais entregas para o negócio você quer?** (multiSelect) — `Documento Word (Visão de Produto)` · `Apresentação PowerPoint` · `Só o resumo no chat` .
   (Markdown técnico — `backlog_draft.md`, revisão, specs — é gerado sempre, para o time técnico.)

## Rodada B — só se "Sim" ao protótipo (1 chamada, até 4 perguntas)
3. **O que prototipar?** — listar até 4 histórias/épicos candidatos (os `ready_for_design` ou de maior prioridade) + "Todas as do épico X".
4. **Que tipo de tela representa melhor?** — `Registro do caso no console (cabeçalho, linha do tempo, ações)` · `Busca + resultados + abrir registro` · `Fluxo guiado passo a passo (Screen Flow)` · `Fila/lista de trabalho`.
5. **Qual profundidade?** — `Uma tela` · `Fluxo clicável de 3–5 telas (Recomendado)` · `Fluxo completo com variações`.
6. **Quais cenários mostrar?** — `Só o caminho feliz` · `Feliz + erro/exceção (Recomendado)` · `Feliz + erro + dados sensíveis/LGPD visíveis`.

## Rodada C — só se necessário (1 pergunta)
7. **Para quem é?** — `Validar com a área de negócio` · `Alinhar com TI/arquitetura` · `Demonstração executiva`. (Muda o tom do texto e o nível de detalhe do roteiro.)

## Depois da entrevista
Gravar `prototype_brief.json` (schema `schemas/prototype-brief.schema.json`). Se a PO respondeu "Outro", copie o texto em `other_notes` e confirme em uma frase como vai interpretar.
Ao mostrar o protótipo pronto, pergunte (múltipla escolha) o que ajustar: `Está bom` · `Ajustar textos/campos` · `Mudar o fluxo` · `Refazer com outro tipo de tela`. No máximo 2 rodadas de ajuste por entrega.
