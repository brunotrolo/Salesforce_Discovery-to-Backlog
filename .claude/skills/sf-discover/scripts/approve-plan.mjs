#!/usr/bin/env node
// Registra a APROVAÇÃO da PO sobre um publish_plan.json publicável. Só rode depois de a PO dizer explicitamente "aprovo".
// Uso: node approve-plan.mjs <publish_plan.json> --by "<nome da PO>"
// Exit: 0 aprovado | 3 plano não publicável | 1 uso
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashOf } from './lib/util.mjs';

export const planBody = (p) => ({ version: p.version, project: p.project, templates_status: p.templates_status, review: p.review, actions: p.actions });

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const bi = args.indexOf('--by');
  if (!args[0] || bi < 0 || !args[bi + 1]) { console.error('Uso: approve-plan.mjs <publish_plan.json> --by "<nome da PO>"'); process.exit(1); }
  const p = JSON.parse(readFileSync(args[0], 'utf8'));
  if (hashOf(planBody(p)) !== p.plan_hash) { console.error('[approve-plan] publish_plan.json foi alterado depois de gerado (hash não bate). Gere o plano de novo.'); process.exit(3); }
  if (!p.publishable) { console.error(`[approve-plan] plano NÃO publicável:\n${p.blockers.map((b) => `  - ${b}`).join('\n')}`); process.exit(3); }
  const approved = { plan_hash: p.plan_hash, project: p.project, approved_by: args[bi + 1], approved_at: new Date().toISOString(), actions: p.actions.filter((a) => a.op !== 'skip').map((a) => ({ op: a.op, local_id: a.local_id, type: a.type, summary: a.summary, jira_key: a.jira_key || null })) };
  writeFileSync(join(dirname(args[0]), 'publish_plan.approved.json'), JSON.stringify(approved, null, 2) + '\n');
  console.log(`[approve-plan] aprovado por ${approved.approved_by}: ${approved.actions.length} ação(ões) autorizada(s) no projeto ${p.project}`);
}
