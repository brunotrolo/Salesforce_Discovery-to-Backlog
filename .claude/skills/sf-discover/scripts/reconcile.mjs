#!/usr/bin/env node
// Reconcilia uma rodada nova com o backlog existente. Parte determinística:
//   novo | mesmo-id-alterado | duplicado provável (título similar) | possível conflito (títulos similares com regras/aceites diferentes).
// A decisão semântica de conflito é da PO (marcador [CONFLITO]); este script só levanta candidatos.
// Uso: node reconcile.mjs <backlog.json> <candidato.json> [--threshold 0.75]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hashOf, norm } from './lib/util.mjs';

const tokens = (s) => new Set(norm(s).split(/[^a-z0-9]+/).filter((w) => w.length > 2));
export const jaccard = (a, b) => { const A = tokens(a); const B = tokens(b); if (!A.size || !B.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i += 1; return i / (A.size + B.size - i); };
const flat = (bl) => bl.epics.flatMap((e) => e.stories.map((s) => ({ epic: e.id, ...s })));
const core = (s) => ({ title: s.title, persona: s.persona, want: s.want, so_that: s.so_that, acceptance: (s.acceptance || []).map((a) => [a.given, a.when, a.then]), rules: (s.business_rules || []).map((r) => r.text) });

export function reconcile(base, cand, threshold = 0.75) {
  const out = { novos: [], alterados: [], duplicados: [], conflitos: [] };
  const existing = flat(base);
  for (const c of flat(cand)) {
    const same = existing.find((x) => x.id === c.id);
    if (same) { if (hashOf(core(same)) !== hashOf(core(c))) out.alterados.push({ id: c.id, titulo: c.title }); continue; }
    const sim = existing.map((x) => ({ x, score: jaccard(`${x.title} ${x.want}`, `${c.title} ${c.want}`) })).sort((a, b) => b.score - a.score)[0];
    if (sim && sim.score >= threshold) {
      const differs = hashOf(core(sim.x).rules) !== hashOf(core(c).rules) || hashOf(core(sim.x).acceptance) !== hashOf(core(c).acceptance);
      (differs ? out.conflitos : out.duplicados).push({ candidato: c.id, existente: sim.x.id, similaridade: Number(sim.score.toFixed(2)), titulo: c.title });
    } else out.novos.push({ id: c.id, titulo: c.title });
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  if (args.length < 2) { console.error('Uso: reconcile.mjs <backlog.json> <candidato.json> [--threshold 0.75]'); process.exit(1); }
  const ti = args.indexOf('--threshold');
  const r = reconcile(JSON.parse(readFileSync(args[0], 'utf8')), JSON.parse(readFileSync(args[1], 'utf8')), ti > -1 ? Number(args[ti + 1]) : 0.75);
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.conflitos.length ? 3 : 0); // 3 = há candidatos a conflito que exigem decisão da PO
}
