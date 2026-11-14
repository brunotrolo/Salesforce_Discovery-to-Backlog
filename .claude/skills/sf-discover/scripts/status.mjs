#!/usr/bin/env node
// Situação das rodadas em discovery/: fontes, backlog, revisão, plano de publicação, itens por status.
// Uso: node status.mjs [raiz=discovery]
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function roundStatus(dir) {
  const has = (f) => existsSync(join(dir, f)); const j = (f) => (has(f) ? JSON.parse(readFileSync(join(dir, f), 'utf8')) : null);
  const src = has('sources') ? readdirSync(join(dir, 'sources')).filter((f) => /^S\d+\.md$/.test(f)).length : 0;
  const bl = j('backlog.json'); const rv = j('review_log.json'); const pp = j('publish_plan.json');
  const by = {}; let stories = 0;
  for (const e of bl?.epics || []) for (const s of e.stories) { stories++; by[s.status] = (by[s.status] || 0) + 1; }
  return { fontes: src, brief: has('discovery_brief.json'), backlog: !!bl, historias: stories, por_status: by, revisao: rv ? rv.status : 'ausente', plano: pp ? (pp.publishable ? 'publicável' : 'bloqueado') : 'ausente', aprovado: has('publish_plan.approved.json') };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = process.argv[2] || 'discovery';
  if (!existsSync(root)) { console.log('Nenhuma rodada ainda (discovery/ não existe).'); process.exit(0); }
  for (const r of readdirSync(root).sort()) { const st = roundStatus(join(root, r)); console.log(`${r}: fontes ${st.fontes} · brief ${st.brief ? 'sim' : 'não'} · histórias ${st.historias} ${JSON.stringify(st.por_status)} · revisão ${st.revisao} · plano ${st.plano}${st.aprovado ? ' (aprovado)' : ''}`); }
}
