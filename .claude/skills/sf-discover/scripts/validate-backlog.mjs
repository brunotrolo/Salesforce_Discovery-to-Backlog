#!/usr/bin/env node
// Valida backlog.json: schema + regras semânticas + âncoras de evidência existentes nas fontes.
// Uso: node validate-backlog.mjs <backlog.json> [--sources discovery/R01/sources ...] [--domains <DOMAINS.md>] [--require-evidence]
// Exit: 0 ok (pode ter avisos) | 2 reprovado | 1 uso

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './lib/schema.mjs';
import { parseAnchor } from './lib/util.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA = JSON.parse(readFileSync(join(HERE, '..', 'schemas', 'backlog.schema.json'), 'utf8'));

export function loadSourceLines(dirs) {
  const lines = {};
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      const m = f.match(/^(S\d{2,3})\.md$/);
      if (!m) continue;
      lines[m[1]] = readFileSync(join(dir, f), 'utf8').split('\n').filter((l) => /^L\d+\|/.test(l)).length;
    }
  }
  return lines;
}

export function domainsFrom(md) {
  return new Set([...md.matchAll(/^\|\s*`([a-z0-9_-]+)`\s*\|/gm)].map((m) => m[1]));
}

export function checkBacklog(bl, { sourceLines = null, domains = null, requireEvidence = true } = {}) {
  const errors = validate(bl, SCHEMA); const warnings = [];
  if (errors.length) return { ok: false, errors, warnings };
  const ids = new Set(); const storyIds = new Set();
  const dup = (id) => { if (ids.has(id)) errors.push(`id duplicado: ${id}`); ids.add(id); };
  const checkAnchors = (anchors = [], where) => {
    for (const a of anchors) {
      const p = parseAnchor(a);
      if (!p) { errors.push(`${where}: âncora inválida ${a}`); continue; }
      if (sourceLines) {
        if (!(p.source in sourceLines)) errors.push(`${where}: fonte ${p.source} inexistente (${a})`);
        else if (p.to > sourceLines[p.source] || p.from < 1 || p.from > p.to) errors.push(`${where}: linhas fora da fonte ${p.source} (${a}; fonte tem ${sourceLines[p.source]})`);
      }
    }
  };
  const roundSources = new Set(bl.rounds.flatMap((r) => r.sources));
  for (const e of bl.epics) {
    dup(e.id);
    if (requireEvidence && !e.evidence.length) errors.push(`${e.id}: épico sem evidência (sem fonte, sem requisito)`);
    checkAnchors(e.evidence, e.id);
    if (domains && e.domain && !domains.has(e.domain)) errors.push(`${e.id}: domínio "${e.domain}" não existe em DOMAINS.md`);
    for (const q of e.open_questions || []) { dup(q.id); checkAnchors(q.evidence, q.id); }
    for (const s of e.stories) {
      dup(s.id); storyIds.add(s.id);
      if (requireEvidence && !s.evidence.length) errors.push(`${s.id}: história sem evidência`);
      checkAnchors(s.evidence, s.id);
      if (!s.acceptance.length) warnings.push(`${s.id}: sem critério de aceite`);
      s.acceptance.forEach((a, i) => { if (requireEvidence && !(a.evidence || []).length) errors.push(`${s.id}.acceptance[${i}]: sem evidência`); checkAnchors(a.evidence, `${s.id}.acceptance[${i}]`); });
      (s.business_rules || []).forEach((r, i) => { if (requireEvidence && !(r.evidence || []).length) errors.push(`${s.id}.business_rules[${i}]: regra sem evidência (vire pergunta aberta)`); checkAnchors(r.evidence, `${s.id}.business_rules[${i}]`); });
      if (domains && s.domain && !domains.has(s.domain)) errors.push(`${s.id}: domínio "${s.domain}" não existe em DOMAINS.md`);
      for (const q of s.open_questions || []) { dup(q.id); checkAnchors(q.evidence, q.id); }
      for (const t of s.tasks || []) { dup(t.id); checkAnchors(t.evidence, t.id); }
      if (s.ready_for_design && (s.open_questions || []).some((q) => q.kind === 'negocio' && !q.resolved)) errors.push(`${s.id}: ready_for_design com pergunta de negócio em aberto`);
      if (s.ready_for_design && !['aprovado', 'publicado'].includes(s.status)) errors.push(`${s.id}: ready_for_design exige status aprovado/publicado`);
    }
  }
  for (const e of bl.epics) for (const s of e.stories) for (const d of s.dependencies || []) if (!storyIds.has(d)) errors.push(`${s.id}: dependência ${d} inexistente`);
  for (const r of bl.rounds) for (const src of r.sources) if (sourceLines && !(src in sourceLines)) errors.push(`rodada ${r.id}: fonte ${src} não ingerida`);
  void roundSources;
  return { ok: errors.length === 0, errors, warnings };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const file = args[0];
  if (!file) { console.error('Uso: validate-backlog.mjs <backlog.json> [--sources <dir>]... [--domains DOMAINS.md] [--no-evidence-required]'); process.exit(1); }
  const dirs = []; for (let i = 0; i < args.length; i++) if (args[i] === '--sources') dirs.push(args[i + 1]);
  const di = args.indexOf('--domains');
  let bl; try { bl = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.error(`[validate-backlog] JSON ilegível: ${e.message}`); process.exit(2); }
  const r = checkBacklog(bl, { sourceLines: dirs.length ? loadSourceLines(dirs) : null, domains: di > -1 ? domainsFrom(readFileSync(args[di + 1], 'utf8')) : null, requireEvidence: !args.includes('--no-evidence-required') });
  for (const w of r.warnings) console.log(`  AVISO: ${w}`);
  for (const e of r.errors) console.error(`  ERRO:  ${e}`);
  console.log(r.ok ? `[validate-backlog] APROVADO${r.warnings.length ? ` (${r.warnings.length} aviso(s))` : ''}` : `[validate-backlog] REPROVADO (${r.errors.length})`);
  process.exit(r.ok ? 0 : 2);
}
