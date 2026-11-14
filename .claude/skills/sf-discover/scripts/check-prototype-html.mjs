#!/usr/bin/env node
// Valida o protótipo derivado do template (referência obrigatória):
//  1. fidelidade: fora do bloco JORNADA, do <style id="jornada-css"> e do bloco de metadados, o HTML é IDÊNTICO ao template;
//  2. a jornada existe (bloco JORNADA não vazio) e todo passo do roteiro usa ações que existem (template ou EXT.actions);
//  3. metadados válidos (schema), histórias existem no backlog, cenários de aceite cobertos pelo roteiro;
//  4. autocontido (sem rede) e sem PII formatada.
// Uso: node check-prototype-html.mjs <prototipo.html> [--backlog backlog.json] [--meta-out proto_meta.json]
// Exit: 0 ok | 2 reprovado | 1 uso
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './lib/schema.mjs';
import { findPii } from './lib/pii.mjs';
import { SKILL_ROOT } from './lib/config.mjs';
import { TEMPLATE, META_START, META_END } from './new-prototype.mjs';

const SCHEMA = JSON.parse(readFileSync(join(SKILL_ROOT, 'schemas/proto-meta.schema.json'), 'utf8'));
const J_RE = /\/\* JORNADA:INICIO \*\/([\s\S]*?)\/\* JORNADA:FIM \*\//;
const CSS_RE = /<style id="jornada-css">([\s\S]*?)<\/style>/;
const META_RE = new RegExp(`${META_START}[\\s\\S]*?${META_END}\\n?`);
const base = (h) => h.replace(META_RE, '').replace(CSS_RE, '').replace(J_RE, '/* JORNADA:INICIO *//* JORNADA:FIM */').replace(/\s+$/g, '');

export function templateActions(tpl) {
  const body = tpl.slice(tpl.indexOf('function da(a,d){'));
  return new Set([...body.matchAll(/a==='([A-Za-z0-9_]+)'/g)].map((m) => m[1]));
}

export function checkHtml(html, backlog = null) {
  const errors = []; const warnings = []; const tpl = readFileSync(TEMPLATE, 'utf8');
  if (base(html) !== base(tpl)) errors.push('fidelidade ao template: houve alteração fora do bloco JORNADA / #jornada-css / metadados. Reverta e implemente a demanda só nesses pontos.');
  const jm = html.match(J_RE); const journey = jm ? jm[1].replace(/\/\*[\s\S]*?\*\//g, '').trim() : '';
  if (!jm) errors.push('bloco JORNADA:INICIO/FIM ausente');
  else if (!journey) errors.push('bloco JORNADA vazio: o protótipo não implementa a demanda (acrescentar ou ajustar a jornada)');
  const mm = html.match(/<script type="application\/json" id="proto-meta">([\s\S]*?)<\/script>/); let meta = null;
  if (!mm) errors.push('metadados (#proto-meta) ausentes: rode new-prototype.mjs');
  else { try { meta = JSON.parse(mm[1]); } catch { errors.push('#proto-meta não é JSON válido'); } }
  if (meta) {
    const se = validate(meta, SCHEMA); errors.push(...se);
    if (!se.length) {
      const known = templateActions(tpl); for (const m of journey.matchAll(/EXT\.actions(?:\.([A-Za-z0-9_]+)|\[['"]([A-Za-z0-9_]+)['"]\])\s*=/g)) known.add(m[1] || m[2]);
      for (const m of journey.matchAll(/actions\s*:\s*\{([\s\S]*?)\}\s*[,)]/g)) for (const k of m[1].matchAll(/([A-Za-z0-9_]+)\s*:\s*function/g)) known.add(k[1]);
      meta.walkthrough.forEach((w) => w.run.forEach((r) => { if (!known.has(r[0])) errors.push(`roteiro "${w.id}": ação "${r[0]}" não existe no template nem em EXT.actions da jornada`); }));
      if (backlog) {
        const st = new Map(backlog.epics.flatMap((e) => e.stories.map((s) => [s.id, s])));
        for (const sid of meta.stories) if (!st.has(sid)) errors.push(`história ${sid} não existe no backlog`);
        const cov = new Set(meta.walkthrough.flatMap((w) => w.covers || []));
        for (const sid of meta.stories) (st.get(sid)?.acceptance || []).forEach((_, i) => { if (!cov.has(`${sid}#${i + 1}`)) warnings.push(`cenário ${sid}#${i + 1} não é coberto por nenhum passo do roteiro`); });
        for (const c of cov) { const [sid, n] = c.split('#'); if (st.get(sid) && !st.get(sid).acceptance?.[Number(n) - 1]) errors.push(`roteiro cobre ${c}, que não existe`); }
        for (const sid of meta.stories) for (const q of (st.get(sid)?.open_questions || []).filter((x) => x.kind === 'negocio' && !x.resolved)) if (!(meta.assumptions || []).some((a) => a.includes(q.id))) warnings.push(`pergunta de negócio ${q.id} em aberto não aparece em "assumptions" (cite o id, ex.: "Q-001: ...")`);
      } else warnings.push('backlog não informado: cobertura dos cenários de aceite não verificada');
    }
  }
  if (/(src|href)\s*=\s*["']https?:/i.test(html) || /url\(\s*["']?https?:/i.test(html) || /\b(fetch|XMLHttpRequest|WebSocket)\s*\(/.test(journey)) errors.push('o protótipo deve ser autocontido (sem recursos externos nem chamadas de rede)');
  const pii = findPii(html); if (pii.length) errors.push(`dados que parecem reais (PII formatada): ${pii.length}. Use dados fictícios/mascarados.`);
  return { ok: errors.length === 0, errors, warnings, meta };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = process.argv.slice(2); const opt = (n) => { const i = a.indexOf(n); return i > -1 ? a[i + 1] : undefined; };
  if (!a[0]) { console.error('Uso: check-prototype-html.mjs <prototipo.html> [--backlog backlog.json] [--meta-out proto_meta.json]'); process.exit(1); }
  const r = checkHtml(readFileSync(a[0], 'utf8'), opt('--backlog') ? JSON.parse(readFileSync(opt('--backlog'), 'utf8')) : null);
  for (const w of r.warnings) console.log(`  AVISO: ${w}`);
  for (const e of r.errors) console.error(`  ERRO:  ${e}`);
  if (r.ok && opt('--meta-out')) writeFileSync(opt('--meta-out'), JSON.stringify(r.meta, null, 2) + '\n');
  console.log(r.ok ? `[check-prototype] APROVADO${r.warnings.length ? ` (${r.warnings.length} aviso(s))` : ''}` : `[check-prototype] REPROVADO (${r.errors.length})`);
  process.exit(r.ok ? 0 : 2);
}
