#!/usr/bin/env node
// backlog.json → backlog_draft.md (visão da PO) e import-package.csv (Jira CSV: sem escrever no Jira).
// Uso: node render-backlog.mjs <backlog.json> [--out <dir>]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from './lib/template.mjs';
import { loadConfig, SKILL_ROOT } from './lib/config.mjs';

const tpl = (cfg, k) => readFileSync(join(SKILL_ROOT, cfg.templates[k]), 'utf8');
const strip = (t) => t.replace(/<!--[\s\S]*?-->\n?/g, '').trim();
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function renderDraft(bl, cfg) {
  const provisorio = cfg.templates_status !== 'oficial';
  const L = [`# Backlog de discovery — ${bl.project.name}`, '', `Atualizado em ${bl.project.updated}. Rodadas: ${bl.rounds.map((r) => r.id).join(', ')}.`,
    provisorio ? '\n> ⚠️ **Template provisório** — este rascunho não pode ser publicado no Jira até a equipe definir os templates oficiais (docs/open-decisions.md).\n' : '', ''];
  for (const e of bl.epics) {
    L.push(`## ${e.id} — ${e.title}  \`[${e.status}]\``, '', strip(render(tpl(cfg, 'epic'), e)), '');
    for (const s of e.stories) {
      L.push(`### ${s.id} — ${s.title}  \`[${s.status}]\`${s.priority ? ` · ${s.priority}` : ''}`, '', strip(render(tpl(cfg, 'story'), s)), '');
      for (const t of s.tasks || []) L.push(`#### ${t.id} — ${t.title}`, '', strip(render(tpl(cfg, 'subtask'), t)), '');
    }
  }
  if ((bl.conflicts || []).length) { L.push('## ⚠️ Conflitos entre rodadas', ''); for (const c of bl.conflicts) L.push(`- **${c.id}** (${c.items.join(', ')}): ${c.description}${c.resolution ? ` — resolução: ${c.resolution}` : ' — **sem decisão**'}`); }
  return L.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

export function renderCsv(bl, cfg) {
  const rows = [['Issue Type', 'Summary', 'Description', 'Labels', 'Parent', 'Priority', 'Discovery ID']];
  const labels = [...(cfg.labels || [])].join(' ');
  for (const e of bl.epics) {
    rows.push([cfg.issue_types.epic, e.title, strip(render(tpl(cfg, 'epic'), e)), labels, '', '', e.id]);
    for (const s of e.stories) {
      rows.push([cfg.issue_types.story, s.title, strip(render(tpl(cfg, 'story'), s)), labels, e.title, cfg.priority_map?.[s.priority] || '', s.id]);
      for (const t of s.tasks || []) rows.push([cfg.issue_types.subtask, t.title, strip(render(tpl(cfg, 'subtask'), t)), labels, s.title, '', t.id]);
    }
  }
  return rows.map((r) => r.map(csv).join(',')).join('\n') + '\n';
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  if (!args[0]) { console.error('Uso: render-backlog.mjs <backlog.json> [--out <dir>]'); process.exit(1); }
  const bl = JSON.parse(readFileSync(args[0], 'utf8'));
  const { cfg } = loadConfig();
  const oi = args.indexOf('--out'); const out = oi > -1 ? args[oi + 1] : dirname(args[0]);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'backlog_draft.md'), renderDraft(bl, cfg));
  writeFileSync(join(out, 'import-package.csv'), renderCsv(bl, cfg));
  console.log(`[render-backlog] ${join(out, 'backlog_draft.md')} e import-package.csv (templates: ${cfg.templates_status})`);
}
