#!/usr/bin/env node
// Funde os retornos dos extratores em discovery_brief.json/.md. Cada item precisa de uma citação literal que exista
// nas linhas da âncora (anti-alucinação por código). Itens sem prova vão para "rejeitados" — nunca entram no brief.
// Uso: node merge-extractions.mjs --sources <dir> --out <dir> <retorno1.json> [<retorno2.json> ...]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './lib/schema.mjs';
import { parseAnchor, norm } from './lib/util.mjs';
import { jaccard } from './reconcile.mjs';
import { dirname } from 'node:path';

const SCHEMA = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'schemas', 'extractor-return.schema.json'), 'utf8'));
const KINDS = ['necessidade', 'dor', 'regra', 'ator', 'jornada', 'restricao', 'pergunta'];
const TITLES = { necessidade: 'Necessidades', dor: 'Dores', regra: 'Regras de negócio', ator: 'Atores', jornada: 'Jornadas candidatas', restricao: 'Restrições (LGPD, regulatório, plataforma)', pergunta: 'Perguntas em aberto' };

function sourceLines(dir, id, cache) {
  if (!cache[id]) {
    const p = join(dir, `${id}.md`);
    cache[id] = existsSync(p) ? Object.fromEntries(readFileSync(p, 'utf8').split('\n').map((l) => l.match(/^L(\d+)\| ?(.*)$/)).filter(Boolean).map((m) => [Number(m[1]), m[2]])) : null;
  }
  return cache[id];
}

export function verifyItem(it, dir, cache) {
  const q = norm(it.quote);
  for (const a of it.evidence) {
    const p = parseAnchor(a); if (!p) continue;
    const lines = sourceLines(dir, p.source, cache); if (!lines) return `fonte ${p.source} não ingerida`;
    let text = ''; for (let n = p.from; n <= p.to; n++) text += ` ${lines[n] ?? ''}`;
    if (norm(text).includes(q)) return null;
  }
  return 'citação não encontrada nas linhas da âncora';
}

export function merge(returns, dir) {
  const cache = {}; const kept = []; const rejected = []; const schemaErrors = [];
  for (const r of returns) {
    const errs = validate(r, SCHEMA); if (errs.length) { schemaErrors.push(...errs); continue; }
    for (const it of r.items) {
      const why = verifyItem(it, dir, cache);
      if (why) { rejected.push({ ...it, motivo: why }); continue; }
      const twin = kept.find((k) => k.kind === it.kind && jaccard(k.text, it.text) >= 0.8);
      if (twin) twin.evidence = [...new Set([...twin.evidence, ...it.evidence])];
      else kept.push({ ...it, id: `B-${String(kept.length + 1).padStart(3, '0')}`, evidence: [...it.evidence] });
    }
  }
  return { kept, rejected, schemaErrors };
}

export function briefMd(b) {
  const L = ['# Brief de discovery', '', `Itens verificados: ${b.kept.length} · rejeitados por falta de prova: ${b.rejected.length}`, ''];
  for (const k of KINDS) {
    const items = b.kept.filter((i) => i.kind === k); if (!items.length) continue;
    L.push(`## ${TITLES[k]}`, '', ...items.map((i) => `- **${i.id}** ${i.text} _(${i.evidence.join(', ')})_${i.question_kind ? ` · pergunta de ${i.question_kind}` : ''}\n  > ${i.quote}`), '');
  }
  if (b.rejected.length) { L.push('## ⚠️ Rejeitados (sem prova na fonte — não usar)', '', ...b.rejected.map((i) => `- ${i.text} — ${i.motivo}`), ''); }
  return L.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : undefined; };
  const files = args.filter((a, i) => a.endsWith('.json') && args[i - 1] !== '--out' && args[i - 1] !== '--sources');
  if (!opt('--sources') || !opt('--out') || !files.length) { console.error('Uso: merge-extractions.mjs --sources <dir> --out <dir> <retorno.json>...'); process.exit(1); }
  const returns = files.map((f) => JSON.parse(readFileSync(f, 'utf8')));
  const b = merge(returns, opt('--sources'));
  mkdirSync(opt('--out'), { recursive: true });
  writeFileSync(join(opt('--out'), 'discovery_brief.json'), JSON.stringify(b, null, 2) + '\n');
  writeFileSync(join(opt('--out'), 'discovery_brief.md'), briefMd(b));
  console.log(`[merge-extractions] ${b.kept.length} verificados, ${b.rejected.length} rejeitados, ${b.schemaErrors.length} erro(s) de schema`);
  process.exit(b.schemaErrors.length ? 2 : 0);
}
