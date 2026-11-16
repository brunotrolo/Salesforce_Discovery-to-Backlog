// Política do odin-guard para esta skill (ADR 0027 do Odin): as mesmas regras do guard-jira-write.mjs, aplicadas depois do `odin ensure sf-discovery`.
// Escrita no Jira só com plano aprovado (hash conferido); exclusão e Confluence são negados; verbo desconhecido é escrita (fail-closed).
import { decide } from '../guard-jira-write.mjs';

export default function politica(evento) {
  const d = decide(evento?.tool_name ?? '', evento?.tool_input ?? {}, evento?.cwd ?? process.cwd());
  return d.allow ? null : { decisao: 'negar', motivo: d.reason };
}
