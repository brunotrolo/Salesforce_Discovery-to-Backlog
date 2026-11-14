import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SC = join(ROOT, '.claude/skills/sf-discover/scripts');
const FX = join(ROOT, 'tests/fixtures');
const run = (script, args, opts = {}) => spawnSync('node', [join(SC, script), ...args], { encoding: 'utf8', ...opts });
const tmp = () => mkdtempSync(join(tmpdir(), 'sfd-'));

test('ingest: vtt → âncoras, PII mascarada, falantes pseudonimizados, original não copiado', () => {
  const d = tmp();
  const r = run('ingest.mjs', [join(FX, 'sample.vtt'), '--round', 'R01', '--out', d]);
  assert.equal(r.status, 0, r.stderr);
  const md = readFileSync(join(d, 'R01/sources/S01.md'), 'utf8');
  assert.match(md, /^L0001\| \[00:00:01\] Pessoa A:/m);
  assert.doesNotMatch(md, /123\.456\.789-00|Maria|João/);
  assert.match(md, /tipo: transcricao/);
  assert.ok(existsSync(join(d, 'R01/sources/S01.chunks.json')));
});
test('ingest: docx/pdf pedem extração pelo host; formato desconhecido falha', () => {
  assert.equal(run('ingest.mjs', ['x.docx']).status, 1);
  assert.equal(run('ingest.mjs', ['x.xyz']).status, 1);
});
test('ingest: csv, json e texto semi-estruturado e resumo', () => {
  const d = tmp();
  writeFileSync(join(d, 'r.csv'), 'id,necessidade\n1,Buscar por documento\n2,Ver produtos\n');
  writeFileSync(join(d, 'r.json'), JSON.stringify({ requisitos: [{ id: 'RF-1', texto: 'a' }, { id: 'RF-2', texto: 'b' }, { id: 'RF-3', texto: 'c' }] }));
  writeFileSync(join(d, 's.md'), '# Reunião\n- ponto 1\n- ponto 2\n- ponto 3\n- ponto 4\n- ponto 5\n');
  writeFileSync(join(d, 'u.txt'), 'O time conversou sobre a dificuldade de achar o cliente e concluiu que precisa melhorar a busca.');
  const types = {};
  for (const f of ['r.csv', 'r.json', 's.md', 'u.txt']) { const r = run('ingest.mjs', [join(d, f), '--round', 'R01', '--out', d]); assert.equal(r.status, 0, r.stderr); types[f] = r.stdout.match(/\((\w[\w-]*)\)/)[1]; }
  assert.deepEqual(types, { 'r.csv': 'estruturado', 'r.json': 'estruturado', 's.md': 'semi-estruturado', 'u.txt': 'resumo' });
});
test('ingest: falantes podem ser mantidos', () => {
  const d = tmp();
  run('ingest.mjs', [join(FX, 'sample.vtt'), '--round', 'R01', '--out', d, '--speakers', 'keep']);
  assert.match(readFileSync(join(d, 'R01/sources/S01.md'), 'utf8'), /Maria Souza:/);
});

test('validate: backlog ok passa, com âncoras contra fontes ingeridas', () => {
  const d = tmp(); run('ingest.mjs', [join(FX, 'sample.vtt'), '--round', 'R01', '--out', d]);
  const r = run('validate-backlog.mjs', [join(FX, 'backlog.ok.json'), '--sources', join(d, 'R01/sources')]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
test('validate: sem evidência, âncora fora da fonte, id duplicado, domínio inexistente reprovam', () => {
  const bl = JSON.parse(readFileSync(join(FX, 'backlog.ok.json'), 'utf8'));
  const d = tmp(); run('ingest.mjs', [join(FX, 'sample.vtt'), '--round', 'R01', '--out', d]);
  const mk = (mut) => { const c = structuredClone(bl); mut(c); const p = join(d, 'b.json'); writeFileSync(p, JSON.stringify(c)); return run('validate-backlog.mjs', [p, '--sources', join(d, 'R01/sources')]); };
  assert.equal(mk((c) => { c.epics[0].stories[0].evidence = []; }).status, 2);
  assert.equal(mk((c) => { c.epics[0].stories[0].business_rules[0].evidence = []; }).status, 2);
  assert.equal(mk((c) => { c.epics[0].stories[0].evidence = ['S01:L1-99']; }).status, 2);
  assert.equal(mk((c) => { c.epics[0].stories[0].id = 'E-001'; }).status, 2);
  assert.equal(mk((c) => { c.epics[0].stories[0].ready_for_design = true; }).status, 2);
  assert.equal(mk((c) => { c.epics[0].stories[0].dependencies = ['US-099']; }).status, 2);
  const dom = join(d, 'DOMAINS.md'); writeFileSync(dom, '| `atendimento` | x |\n');
  const r = run('validate-backlog.mjs', [join(d, 'b.json'), '--domains', dom]); void r;
  writeFileSync(join(d, 'ok.json'), JSON.stringify(bl));
  assert.equal(run('validate-backlog.mjs', [join(d, 'ok.json'), '--domains', dom]).status, 2); // busca-cliente não está em DOMAINS
});

test('render: rascunho e CSV; template provisório é sinalizado', () => {
  const d = tmp();
  const r = run('render-backlog.mjs', [join(FX, 'backlog.ok.json'), '--out', d]);
  assert.equal(r.status, 0, r.stderr);
  const md = readFileSync(join(d, 'backlog_draft.md'), 'utf8');
  assert.match(md, /Template provisório/);
  assert.match(md, /### US-001 — Localizar cliente por documento/);
  assert.match(md, /\*\*Dado\*\* um documento válido/);
  assert.match(md, /discovery-id: US-001/);
  const csv = readFileSync(join(d, 'import-package.csv'), 'utf8');
  assert.match(csv, /^"Issue Type","Summary"/);
  assert.match(csv, /"Sub-task","Definir campos exibidos no resultado"/);
});

test('reconcile: novo, alterado, duplicado e candidato a conflito', () => {
  const base = JSON.parse(readFileSync(join(FX, 'backlog.ok.json'), 'utf8'));
  const cand = structuredClone(base); const d = tmp();
  const s0 = cand.epics[0].stories[0];
  const same = structuredClone(s0); same.so_that = 'outra finalidade';
  const dupe = { ...structuredClone(s0), id: 'US-002' };
  const conf = { ...structuredClone(s0), id: 'US-003', business_rules: [{ text: 'O documento pode aparecer completo', evidence: ['S01:L2'] }] };
  const nov = { ...structuredClone(s0), id: 'US-004', title: 'Consultar limite do cartão', want: 'ver o limite disponível' };
  cand.epics[0].stories = [same, dupe, conf, nov];
  writeFileSync(join(d, 'c.json'), JSON.stringify(cand));
  const r = run('reconcile.mjs', [join(FX, 'backlog.ok.json'), join(d, 'c.json')]);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out.alterados.map((x) => x.id), ['US-001']);
  assert.deepEqual(out.novos.map((x) => x.id), ['US-004']);
  assert.ok(out.conflitos.some((x) => x.candidato === 'US-003'));
  assert.equal(r.status, 3);
});
