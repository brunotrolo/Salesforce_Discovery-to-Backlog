#!/usr/bin/env node
// Hook PreToolUse para ferramentas do MCP do Jira. Barreira no momento da chamada (não depende de a skill "lembrar"):
//  • leitura (get/search/lookup/list/...)  → permite
//  • exclusão, transição de status, qualquer escrita no Confluence → NEGA sempre
//  • escrita no Jira (create/edit/update/add/link/comment/...) → só com publish_plan.approved.json cujo hash bate com publish_plan.json,
//    no projeto do plano, e com payload que casa com uma ação aprovada (criar: summary igual; editar/comentar/vincular: chave do plano)
//  • verbo desconhecido ou payload ilegível em escrita → NEGA (fail-closed). Só um erro do próprio hook (JSON do hook ilegível) deixa passar.
// O plano aprovado é procurado em $SFD_PLAN (caminho) ou no discovery/*/publish_plan.approved.json mais recente a partir do cwd.
// Limite honesto: o hook prova que o payload bate com um plano aprovado; não prova que quem escreveu o arquivo de aprovação foi a PO.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { hashOf, norm } from './lib/util.mjs';
import { planBody } from './approve-plan.mjs';
import { loadConfig } from './lib/config.mjs';

const READ = /(^|[^a-z])(get|search|lookup|fetch|list|read|find|query|describe|resolve|visible|metadata|fields|jql|whoami|user)/i;
const DENY_ALWAYS = /(delete|remove|archive|purge|destroy|transition|move)/i;
const WRITE = /(create|edit|update|add|link|assign|comment|set|bulk|worklog|attach|upload|clone|import|write)/i;

export function classify(toolName) {
  const verb = String(toolName).split('__').pop();
  if (DENY_ALWAYS.test(verb)) return 'deny';
  if (WRITE.test(verb)) return 'write';
  if (READ.test(verb)) return 'read';
  return 'unknown';
}

function deepFind(o, keys, out = []) {
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) {
    if (keys.includes(k.toLowerCase()) && (typeof v === 'string' || (v && typeof v === 'object'))) out.push(v);
    deepFind(v, keys, out);
  }
  return out;
}
export function extract(input) {
  const s = deepFind(input, ['summary', 'title']).filter((x) => typeof x === 'string');
  const keys = deepFind(input, ['issueidorkey', 'issuekey', 'key', 'issue_key', 'parentkey']).map((x) => (typeof x === 'string' ? x : x?.key)).filter(Boolean);
  const proj = deepFind(input, ['projectkey', 'project', 'projectidorkey']).map((x) => (typeof x === 'string' ? x : x?.key)).filter((x) => typeof x === 'string');
  return { summaries: s, keys: keys.filter((k) => /^[A-Z][A-Z0-9]+-\d+$/.test(k)), projects: proj };
}

function findApproved(cwd) {
  if (process.env.SFD_PLAN) return process.env.SFD_PLAN;
  const root = join(cwd, 'discovery'); if (!existsSync(root)) return null;
  const c = readdirSync(root).map((r) => join(root, r, 'publish_plan.approved.json')).filter(existsSync).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return c[0] || null;
}

export function decide(toolName, input, cwd = process.cwd()) {
  const t = String(toolName).toLowerCase();
  let extra = null;
  try { const p = loadConfig().cfg.mcp_server_pattern; if (p) extra = new RegExp(p, 'i'); } catch { /* padrão inválido: usa só o detector padrão */ }
  if (!/atlassian|jira|confluence/.test(t) && !(extra && extra.test(t))) return { allow: true };
  const kind = classify(toolName);
  if (kind === 'read') return { allow: true };
  if (kind === 'deny') return { allow: false, reason: 'Exclusão/transição de status no Jira não é feita por esta skill. Faça manualmente, fora do Claude Code, se for realmente necessário.' };
  if (/confluence/.test(t)) return { allow: false, reason: 'Escrita no Confluence está fora do escopo do sf-discover.' };
  if (kind === 'unknown') return { allow: false, reason: `Ferramenta "${toolName}" de verbo desconhecido: tratada como escrita não autorizada (fail-closed). Mostre isto à PO.` };
  // escrita
  const ap = findApproved(cwd);
  if (!ap || !existsSync(ap)) return { allow: false, reason: 'Escrita no Jira sem plano aprovado. Gere o plano (diff-publish.mjs), peça a aprovação da PO e rode approve-plan.mjs.' };
  let approved; let plan;
  try { approved = JSON.parse(readFileSync(ap, 'utf8')); plan = JSON.parse(readFileSync(join(dirname(ap), 'publish_plan.json'), 'utf8')); }
  catch { return { allow: false, reason: 'Plano aprovado ou publish_plan.json ilegível.' }; }
  if (hashOf(planBody(plan)) !== plan.plan_hash || approved.plan_hash !== plan.plan_hash) return { allow: false, reason: 'O plano mudou depois da aprovação (hash não bate). Gere e aprove o plano de novo.' };
  const { summaries, keys, projects } = extract(input);
  if (!summaries.length && !keys.length) return { allow: false, reason: 'Não consegui localizar summary nem chave de issue no payload; sem como validar contra o plano aprovado (fail-closed).' };
  for (const p of projects) if (p !== approved.project && !/^\d+$/.test(p)) return { allow: false, reason: `Projeto "${p}" difere do projeto aprovado "${approved.project}".` };
  for (const k of keys) if (!k.startsWith(`${approved.project}-`)) return { allow: false, reason: `Issue ${k} fora do projeto aprovado "${approved.project}".` };
  const verb = String(toolName).split('__').pop().toLowerCase();
  if (/create/.test(verb) && !/link|comment/.test(verb)) {
    const ok = summaries.some((s) => approved.actions.some((a) => a.op === 'create' && norm(a.summary) === norm(s)));
    return ok ? { allow: true } : { allow: false, reason: 'Criação de issue cujo título não consta no plano aprovado.' };
  }
  const planKeys = new Set(approved.actions.map((a) => a.jira_key).filter(Boolean));
  const okKey = keys.some((k) => planKeys.has(k) || approved.actions.some((a) => a.op === 'create' && a.created_key === k));
  return okKey ? { allow: true } : { allow: false, reason: 'Edição/comentário/vínculo em issue que não consta no plano aprovado (use o jira-map.json após criar e registre a chave no plano).' };
}

let raw = '';
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => (raw += c));
  process.stdin.on('end', () => {
    try {
      const j = JSON.parse(raw);
      const d = decide(j.tool_name || '', j.tool_input || {}, j.cwd || process.cwd());
      if (!d.allow) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: d.reason } }));
    } catch { /* erro do próprio hook: não bloquear trabalho legítimo */ }
    process.exit(0);
  });
}
