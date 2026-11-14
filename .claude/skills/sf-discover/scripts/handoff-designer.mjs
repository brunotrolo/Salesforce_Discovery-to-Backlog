#!/usr/bin/env node
// Ponte para o Journey Designer: histórias aprovadas + ready_for_design + domínio conhecido viram
// (1) linha em docs/sdd/BACKLOG.md (status "não iniciado") e (2) specs/<dominio>/<NNN>-<slug>/spec.md semente (SÓ negócio).
// Dry-run por padrão; --apply escreve e registra story.handoff no backlog.json. Nunca sobrescreve spec existente.
// Uso: node handoff-designer.mjs <backlog.json> --designer <raiz do projeto do Designer> [--apply]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { domainsFrom } from './validate-backlog.mjs';

export const slug = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);

export function nextNumber(backlogMd, domain) {
  const m = backlogMd.match(new RegExp(`^## \`${domain}/\`[\\s\\S]*?(?=^## |(?![\\s\\S]))`, 'm'));
  if (!m) return 1;
  const ids = [...m[0].matchAll(/^\|\s*(\d{3})\s*\|/gm)].map((x) => Number(x[1]));
  return (ids.length ? Math.max(...ids) : 0) + 1;
}

export function addRow(backlogMd, domain, row) {
  const re = new RegExp(`(^## \`${domain}/\`[\\s\\S]*?)(?=\\n## |(?![\\s\\S]))`, 'm');
  if (re.test(backlogMd)) return backlogMd.replace(re, (sec) => `${sec.replace(/\s*$/, '')}\n${row}\n`);
  return `${backlogMd.replace(/\s*$/, '')}\n\n## \`${domain}/\`\n\n| ID | Capacidade | Persona | Depende de | Status |\n|---|---|---|---|---|\n${row}\n`;
}

export function seedSpec(story, epic, nnn) {
  const open = (story.open_questions || []).filter((q) => !q.resolved);
  const L = [`# Spec ${nnn} — ${story.title}`, '', `> Semente gerada pelo sf-discover (${story.id}, épico ${epic.id}). Contém **somente negócio**; solução técnica é do Journey Designer.`, '',
    '## História', '', `Como **${story.persona}**, quero ${story.want}, para ${story.so_that}.`, '', '## Cenários de aceite', ''];
  for (const a of story.acceptance || []) L.push(`- **Dado** ${a.given}, **quando** ${a.when}, **então** ${a.then}. _(${(a.evidence || []).join(', ')})_`);
  L.push('', '## Regras de negócio', '', ...((story.business_rules || []).length ? story.business_rules.map((r) => `- ${r.text} _(${(r.evidence || []).join(', ')})_`) : ['- (nenhuma registrada)']));
  if ((story.compliance_flags || []).length) L.push('', '## Restrições', '', `- Sinalizadores: ${story.compliance_flags.join(', ')}`);
  L.push('', '## Perguntas em aberto', '', ...(open.length ? open.map((q) => `- [NEEDS CLARIFICATION: ${q.kind === 'negocio' ? 'negócio' : 'descoberta'}] ${q.text}`) : ['- (nenhuma)']));
  L.push('', '## Rastreabilidade', '', `- Evidências: ${(story.evidence || []).join(', ')}`, `- Classificação sugerida (não vinculante): ${story.classification_hint || 'desconhecido'}`, '');
  return L.join('\n');
}

export function handoff(bl, designerRoot, { apply = false, today = new Date().toISOString().slice(0, 10) } = {}) {
  const bPath = join(designerRoot, 'docs/sdd/BACKLOG.md'); const dPath = join(designerRoot, 'docs/sdd/DOMAINS.md');
  if (!existsSync(bPath) || !existsSync(dPath)) throw new Error(`BACKLOG.md/DOMAINS.md do Designer não encontrados em ${designerRoot}/docs/sdd`);
  let backlogMd = readFileSync(bPath, 'utf8'); const domains = domainsFrom(readFileSync(dPath, 'utf8'));
  const out = { created: [], skipped: [] };
  for (const e of bl.epics) for (const s of e.stories) {
    const why = s.handoff ? 'já entregue ao Designer' : s.status !== 'aprovado' ? `status ${s.status}` : !s.ready_for_design ? 'ready_for_design=false' : !s.domain || !domains.has(s.domain) ? `domínio "${s.domain ?? ''}" não consta em DOMAINS.md` : null;
    if (why) { out.skipped.push({ id: s.id, motivo: why }); continue; }
    const n = nextNumber(backlogMd, s.domain); const nnn = String(n).padStart(3, '0');
    const cap = `${nnn}-${slug(s.title)}`; const dir = join(designerRoot, 'specs', s.domain, cap);
    if (existsSync(join(dir, 'spec.md'))) { out.skipped.push({ id: s.id, motivo: `${dir}/spec.md já existe (não sobrescrevo)` }); continue; }
    backlogMd = addRow(backlogMd, s.domain, `| ${nnn} | ${s.title} | ${s.persona} | ${(s.depends_on || []).join(', ') || '—'} | não iniciado |`);
    out.created.push({ id: s.id, domain: s.domain, capability: cap });
    if (apply) { mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'spec.md'), seedSpec(s, e, nnn)); s.handoff = { domain: s.domain, capability: cap, date: today }; }
  }
  if (apply && out.created.length) writeFileSync(bPath, backlogMd);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = process.argv.slice(2); const di = a.indexOf('--designer');
  if (!a[0] || di < 0 || !a[di + 1]) { console.error('Uso: handoff-designer.mjs <backlog.json> --designer <raiz> [--apply]'); process.exit(1); }
  const bl = JSON.parse(readFileSync(a[0], 'utf8')); const apply = a.includes('--apply');
  const r = handoff(bl, a[di + 1], { apply });
  if (apply && r.created.length) writeFileSync(a[0], JSON.stringify(bl, null, 2) + '\n');
  console.log(`[handoff] ${apply ? 'aplicado' : 'DRY-RUN'}: ${r.created.length} para o Designer, ${r.skipped.length} ignorada(s)`);
  for (const c of r.created) console.log(`  + ${c.id} → ${c.domain}/${c.capability}`);
  for (const s of r.skipped) console.log(`  - ${s.id}: ${s.motivo}`);
}
