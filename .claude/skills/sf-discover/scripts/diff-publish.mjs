#!/usr/bin/env node
// Plano de publicação no Jira (dry-run, SEM escrever): compara o backlog aprovado com jira-map.json e decide create | update | skip.
// Gera publish_plan.json e publish_plan.md (valor anterior → novo). A PO aprova com approve-plan.mjs; o hook guard-jira-write.mjs só deixa escrever o que está no plano aprovado.
// Uso: node diff-publish.mjs <backlog.json> [--map jira-map.json] [--review review_log.json] [--out <dir>]
// Exit: 0 plano publicável | 3 plano gerado mas NÃO publicável (bloqueios listados) | 1 uso

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from './lib/template.mjs';
import { loadConfig, SKILL_ROOT } from './lib/config.mjs';
import { hashOf } from './lib/util.mjs';

const strip = (t) => t.replace(/<!--[\s\S]*?-->\n?/g, '').trim();
const tpl = (cfg, k) => readFileSync(join(SKILL_ROOT, cfg.templates[k]), 'utf8');

export function flatten(bl, cfg) {
  const items = []; const labels = [...(cfg.labels || [])];
  for (const e of bl.epics) {
    items.push({ local_id: e.id, type: 'epic', status: e.status, summary: e.title, description: strip(render(tpl(cfg, 'epic'), e)), parent: null, labels, priority: null });
    for (const s of e.stories) {
      items.push({ local_id: s.id, type: 'story', status: s.status, summary: s.title, description: strip(render(tpl(cfg, 'story'), s)), parent: e.id, labels, priority: cfg.priority_map?.[s.priority] ?? null, open_business: (s.open_questions || []).filter((q) => q.kind === 'negocio' && !q.resolved).length });
      for (const t of s.tasks || []) items.push({ local_id: t.id, type: 'subtask', status: s.status, summary: t.title, description: strip(render(tpl(cfg, 'subtask'), t)), parent: s.id, labels, priority: null });
    }
  }
  return items;
}
const fingerprint = (i) => hashOf({ summary: i.summary, description: i.description, labels: i.labels, priority: i.priority, parent: i.parent });

export function plan(bl, map, review, cfgInfo) {
  const { cfg, errors, publishable: cfgOk } = cfgInfo;
  const blockers = [];
  if (errors.length) blockers.push(`configuração do Jira inválida: ${errors.join('; ')}`);
  if (cfg.templates_status !== 'oficial') blockers.push('templates/configuração do Jira PROVISÓRIOS (templates_status != oficial): publique só depois que a equipe definir os oficiais');
  if (!cfg.project_key) blockers.push('project_key não definido em jira.config.json');
  if (!review) blockers.push('review_log.json ausente: registre a revisão Goldfish (reviewed) ou o pulo justificado (skipped)');
  else if (review.status === 'skipped' && !String(review.reason || '').trim()) blockers.push('revisão pulada sem motivo registrado');
  else if (!['reviewed', 'skipped'].includes(review.status)) blockers.push('review_log.json com status inválido');
  const unresolved = (bl.conflicts || []).filter((c) => !String(c.resolution || '').trim());
  if (unresolved.length) blockers.push(`${unresolved.length} conflito(s) entre rodadas sem decisão da PO`);

  const actions = []; const excluded = [];
  for (const it of flatten(bl, cfg)) {
    if (!['aprovado', 'publicado'].includes(it.status)) { excluded.push({ local_id: it.local_id, motivo: `status ${it.status} (só aprovado/publicado publica)` }); continue; }
    const fp = fingerprint(it); const m = map[it.local_id];
    const base = { local_id: it.local_id, type: it.type, summary: it.summary, description: it.description, parent: it.parent, labels: it.labels, priority: it.priority, fingerprint: fp };
    if (!m) actions.push({ op: 'create', ...base });
    else if (m.fingerprint === fp) actions.push({ op: 'skip', jira_key: m.key, ...base });
    else {
      const before = m.last || {}; const changes = {};
      for (const k of ['summary', 'description', 'labels', 'priority', 'parent']) if (JSON.stringify(before[k]) !== JSON.stringify(base[k])) changes[k] = { before: before[k] ?? null, after: base[k] };
      actions.push({ op: 'update', jira_key: m.key, changes, ...base });
    }
  }
  const ordered = ['create', 'update', 'skip'].flatMap((op) => ['epic', 'story', 'subtask'].flatMap((t) => actions.filter((a) => a.op === op && a.type === t)));
  const body = { version: 1, project: cfg.project_key, templates_status: cfg.templates_status, review: review ? review.status : 'missing', actions: ordered };
  return { ...body, publishable: blockers.length === 0 && cfgOk && ordered.some((a) => a.op !== 'skip'), blockers: blockers.concat(blockers.length === 0 && !ordered.some((a) => a.op !== 'skip') ? ['nada a publicar (tudo igual ao Jira ou sem itens aprovados)'] : []), excluded, plan_hash: hashOf(body) };
}

export function planMd(p) {
  const L = ['# Plano de publicação no Jira', '', `Projeto: **${p.project ?? '(não definido)'}** · templates: ${p.templates_status} · revisão: ${p.review} · hash: \`${p.plan_hash}\``, ''];
  L.push(p.publishable ? '✅ **Publicável após aprovação da PO.**' : `⛔ **NÃO publicável**:\n${p.blockers.map((b) => `- ${b}`).join('\n')}`, '');
  const n = (op) => p.actions.filter((a) => a.op === op).length;
  L.push(`Criar: ${n('create')} · Atualizar: ${n('update')} · Sem mudança: ${n('skip')} · Fora do plano: ${p.excluded.length}`, '');
  for (const a of p.actions.filter((x) => x.op !== 'skip')) {
    L.push(`## ${a.op === 'create' ? '➕ Criar' : '✏️ Atualizar'} ${a.type} ${a.local_id}${a.jira_key ? ` (${a.jira_key})` : ''} — ${a.summary}`, '');
    if (a.op === 'create') L.push(`Pai: ${a.parent ?? '—'} · Labels: ${a.labels.join(', ') || '—'}`, '', '```', a.description, '```', '');
    else for (const [k, v] of Object.entries(a.changes)) L.push(`- **${k}**: \`${JSON.stringify(v.before)}\` → \`${JSON.stringify(v.after)}\``);
    L.push('');
  }
  if (p.excluded.length) L.push('## Fora do plano', '', ...p.excluded.map((e) => `- ${e.local_id}: ${e.motivo}`), '');
  return L.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : undefined; };
  if (!args[0]) { console.error('Uso: diff-publish.mjs <backlog.json> [--map jira-map.json] [--review review_log.json] [--out <dir>]'); process.exit(1); }
  const dir = opt('--out') || dirname(args[0]);
  const mapPath = opt('--map') || join(dir, 'jira-map.json'); const revPath = opt('--review') || join(dir, 'review_log.json');
  const p = plan(JSON.parse(readFileSync(args[0], 'utf8')), existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, 'utf8')) : {}, existsSync(revPath) ? JSON.parse(readFileSync(revPath, 'utf8')) : null, loadConfig());
  writeFileSync(join(dir, 'publish_plan.json'), JSON.stringify(p, null, 2) + '\n');
  writeFileSync(join(dir, 'publish_plan.md'), planMd(p));
  console.log(`[diff-publish] ${p.publishable ? 'publicável' : 'NÃO publicável'} — criar ${p.actions.filter((a) => a.op === 'create').length}, atualizar ${p.actions.filter((a) => a.op === 'update').length}, igual ${p.actions.filter((a) => a.op === 'skip').length} → ${join(dir, 'publish_plan.md')}`);
  for (const b of p.blockers) console.log(`  BLOQUEIO: ${b}`);
  process.exit(p.publishable ? 0 : 3);
}
