# Formatos de fonte aceitos

| Formato | Como entra | Observação |
|---|---|---|
| `.txt`, `.md` | direto | resumos, atas, requisitos em texto |
| `.vtt`, `.srt` | cues viram `[hh:mm:ss] Falante: texto` | transcrições de reunião (Teams/Meet/Zoom) |
| `.csv` | cada linha vira `Linha n: coluna=valor | …` | planilhas de requisitos |
| `.json`, `.yaml`, `.yml` | achatado em `caminho: valor` | requisitos estruturados exportados |
| `.eml` | texto | e-mails colados/exportados |
| `.docx`, `.pdf`, `.pptx`, `.xlsx` | **extrair o texto com o leitor do host** e passar o `.txt` | `ingest.mjs` recusa e orienta |

## Tipo detectado (muda a estratégia de extração, não o resultado)
- **transcricao**: cues ou linhas "Falante: fala" em volume; extrair dores, necessidades e regras ditas, preservando quem (papel) disse.
- **estruturado**: JSON/YAML/CSV ou muitos ids (RF-1, US-2) / Dado-Quando-Então; extrair 1:1, sem reinterpretar.
- **semi-estruturado**: títulos e marcadores; cada marcador é candidato a item.
- **resumo**: prosa curta; extrair o que é afirmado e transformar o resto em perguntas abertas.
Sobrescreva com `--type` quando a heurística errar.

## Proteções na entrada
PII formatada (CPF, CNPJ, e-mail, telefone) é mascarada; falantes viram `Pessoa A/B…` (use `--speakers keep` se a PO decidir manter nomes). O original nunca é copiado: só o hash SHA-256 fica no cabeçalho da fonte.
Fontes grandes saem divididas em trechos (`--chunk-lines`, padrão 400) para extração em paralelo.
