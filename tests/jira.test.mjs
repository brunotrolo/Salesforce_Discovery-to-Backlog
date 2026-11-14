import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const S = '.claude/skills/sf-discover/scripts';
const { plan, planMd } = await import(`../${S}/diff-publish.mjs`);
const { classify, decide } = await import(`../${S}/guard-jira-write.mjs`);
const { loadConfig } = await import(`../${S}/lib/config.mjs`);
const bl = JSON.parse(readFileSync('tests/fixtures/backlog.ok.json', 'utf8'));
const approvedBl = JSON.parse(JSON.stringify(bl));
approvedBl.epics[0].status = 'aprovado'; approvedBl.epics[0].stories[0].status = 'aprovado';

function officialCfg(dir) {
  const c = JSON.parse(readFileSync(`${S}/../config/jira.config.json`, 'utf8'));
  c.templates_status = 'oficial'; c.project_key = 'ATD';
  const p = join(dir, 'jira.json'); writeFileSync(p, JSON.stringify(c)); return p;
}

test('config provisória bloqueia publicação, mas gera plano', () => {
  const p = plan(approvedBl, {}, { status: 'reviewed' }, loadConfig());
  assert.equal(p.publishable, false);
  assert.ok(p.blockers.some((b) => /PROVIS/i.test(b)));
  assert.ok(p.actions.some((a) => a.op === 'create'));
});

test('config oficial + revisão => publicável; segundo plano com mapa => skip/update', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sfd-'));
  const cfg = loadConfig(officialCfg(dir));
  const p1 = plan(approvedBl, {}, { status: 'reviewed' }, cfg);
  assert.equal(p1.publishable, true, p1.blockers.join(';'));
  const map = Object.fromEntries(p1.actions.map((a) => [a.local_id, { key: `ATD-${a.local_id.length}${a.local_id}`, fingerprint: a.fingerprint, last: a }]));
  const p2 = plan(approvedBl, map, { status: 'reviewed' }, cfg);
  assert.equal(p2.publishable, false); // nada a publicar
  const ch = JSON.parse(JSON.stringify(approvedBl)); ch.epics[0].stories[0].title = 'Localizar cliente por CPF ou CNPJ';
  const p3 = plan(ch, map, { status: 'reviewed' }, cfg);
  assert.equal(p3.actions.filter((a) => a.op === 'update').length, 1);
  assert.match(planMd(p3), /→/);
});

test('rascunho fica fora do plano; revisão ausente bloqueia', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sfd-'));
  const p = plan(bl, {}, null, loadConfig(officialCfg(dir)));
  assert.equal(p.actions.length, 0); assert.equal(p.publishable, false);
  assert.ok(p.blockers.some((b) => /review_log/.test(b)));
});

test('classify de verbos', () => {
  for (const [n, k] of [['mcp__atlassian__getJiraIssue', 'read'], ['mcp__atlassian__searchJiraIssuesUsingJql', 'read'], ['mcp__atlassian__createJiraIssue', 'write'], ['mcp__atlassian__editJiraIssue', 'write'], ['mcp__atlassian__transitionJiraIssue', 'deny'], ['mcp__atlassian__deleteIssue', 'deny'], ['mcp__atlassian__frobnicate', 'unknown']]) assert.equal(classify(n), k, n);
});

function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'sfd-'));
  const cfg = loadConfig(officialCfg(dir));
  const p = plan(approvedBl, {}, { status: 'reviewed' }, cfg);
  writeFileSync(join(dir, 'publish_plan.json'), JSON.stringify(p));
  execFileSync('node', [`${S}/approve-plan.mjs`, join(dir, 'publish_plan.json'), '--by', 'PO Teste']);
  return { dir, plan: p };
}

test('hook: ferramenta não-Atlassian passa; escrita sem plano aprovado é negada', () => {
  assert.equal(decide('Bash', { command: 'ls' }).allow, true);
  const dir = mkdtempSync(join(tmpdir(), 'sfd-'));
  assert.equal(decide('mcp__atlassian__createJiraIssue', { projectKey: 'ATD', summary: 'x' }, dir).allow, false);
});

test('hook: criar só o que está no plano aprovado, no projeto aprovado', () => {
  const { dir, plan: p } = setup();
  process.env.SFD_PLAN = join(dir, 'publish_plan.approved.json');
  try {
    const t = p.actions[0].summary;
    assert.equal(decide('mcp__atlassian__createJiraIssue', { projectKey: 'ATD', summary: t }).allow, true);
    assert.equal(decide('mcp__atlassian__createJiraIssue', { fields: { project: { key: 'ATD' }, summary: t } }).allow, true); // payload aninhado
    assert.equal(decide('mcp__atlassian__createJiraIssue', { projectKey: 'ATD', summary: 'Título inventado' }).allow, false);
    assert.equal(decide('mcp__atlassian__createJiraIssue', { projectKey: 'OUTRO', summary: t }).allow, false);
    assert.equal(decide('mcp__atlassian__createJiraIssue', { foo: 'bar' }).allow, false); // payload ilegível
    assert.equal(decide('mcp__atlassian__transitionJiraIssue', { issueIdOrKey: 'ATD-1' }).allow, false);
    assert.equal(decide('mcp__atlassian__deleteIssue', { key: 'ATD-1' }).allow, false);
    assert.equal(decide('mcp__atlassian__frobnicate', { summary: t }).allow, false);
    assert.equal(decide('mcp__atlassian__editJiraIssue', { issueIdOrKey: 'ATD-99' }).allow, false);
    assert.equal(decide('mcp__atlassian__getJiraIssue', { issueIdOrKey: 'ATD-99' }).allow, true);
    assert.equal(decide('mcp__atlassian__createConfluencePage', { title: 'x', summary: t }).allow, false);
  } finally { delete process.env.SFD_PLAN; }
});

test('hook: plano alterado após aprovação é negado', () => {
  const { dir, plan: p } = setup();
  process.env.SFD_PLAN = join(dir, 'publish_plan.approved.json');
  try {
    const q = JSON.parse(readFileSync(join(dir, 'publish_plan.json'), 'utf8')); q.actions[0].summary = 'Adulterado';
    writeFileSync(join(dir, 'publish_plan.json'), JSON.stringify(q));
    assert.equal(decide('mcp__atlassian__createJiraIssue', { projectKey: 'ATD', summary: p.actions[0].summary }).allow, false);
  } finally { delete process.env.SFD_PLAN; }
});

test('hook via stdin: nega com JSON de permissão; JSON inválido não quebra', () => {
  const run = (input) => spawnSync('node', [`${S}/guard-jira-write.mjs`], { input, encoding: 'utf8' });
  const r = run(JSON.stringify({ tool_name: 'mcp__atlassian__deleteIssue', tool_input: { key: 'A-1' }, cwd: tmpdir() }));
  assert.equal(r.status, 0); assert.match(r.stdout, /"permissionDecision":"deny"/);
  assert.equal(run('{nao e json').stdout, '');
});

test('approve-plan recusa plano não publicável', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sfd-'));
  const p = plan(approvedBl, {}, { status: 'reviewed' }, loadConfig());
  writeFileSync(join(dir, 'publish_plan.json'), JSON.stringify(p));
  const r = spawnSync('node', [`${S}/approve-plan.mjs`, join(dir, 'publish_plan.json'), '--by', 'PO'], { encoding: 'utf8' });
  assert.equal(r.status, 3);
});

test('handoff Designer: dry-run não escreve; apply cria linha + spec e é idempotente', async () => {
  const { handoff, slug } = await import(`../${S}/handoff-designer.mjs`);
  const { existsSync, mkdirSync } = await import('node:fs');
  const root = mkdtempSync(join(tmpdir(), 'dsg-')); mkdirSync(join(root, 'docs/sdd'), { recursive: true });
  writeFileSync(join(root, 'docs/sdd/DOMAINS.md'), '| Domínio | Nome |\n|---|---|\n| `busca-cliente` | Busca |\n');
  writeFileSync(join(root, 'docs/sdd/BACKLOG.md'), '# B\n\n## `busca-cliente/`\n\n| ID | Capacidade | Persona | Depende de | Status |\n|---|---|---|---|---|\n| 001 | X | Y | — | não iniciado |\n');
  const b = JSON.parse(JSON.stringify(approvedBl)); b.epics[0].stories[0].ready_for_design = true; b.epics[0].stories[0].open_questions = [{ id: 'Q-009', text: 'Mascarar o documento em quais telas?', kind: 'negocio', evidence: ['S01:L2'] }];
  const d = handoff(b, root); assert.equal(d.created.length, 1);
  assert.ok(!readFileSync(join(root, 'docs/sdd/BACKLOG.md'), 'utf8').includes('Localizar cliente'));
  handoff(b, root, { apply: true });
  assert.match(readFileSync(join(root, 'docs/sdd/BACKLOG.md'), 'utf8'), /\| 002 \| Localizar cliente por documento/);
  assert.ok(existsSync(join(root, 'specs/busca-cliente/002-localizar-cliente-por-documento/spec.md')));
  assert.match(readFileSync(join(root, 'specs/busca-cliente/002-localizar-cliente-por-documento/spec.md'), 'utf8'), /NEEDS CLARIFICATION: negócio/);
  assert.equal(handoff(b, root, { apply: true }).created.length, 0);
  assert.equal(slug('Ação Rápida!'), 'acao-rapida');
});

test('hook: mcp_server_pattern cobre servidor do Jira com nome customizado', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sfd-'));
  const c = JSON.parse(readFileSync(`${S}/../config/jira.config.json`, 'utf8')); c.mcp_server_pattern = '^mcp__tracker__';
  writeFileSync(join(dir, 'c.json'), JSON.stringify(c));
  process.env.SFD_CONFIG = join(dir, 'c.json');
  try {
    assert.equal(decide('mcp__tracker__delete_item', {}, dir).allow, false);
    assert.equal(decide('mcp__outro__delete_item', {}, dir).allow, true);
  } finally { delete process.env.SFD_CONFIG; }
});

// ---- Entregas para a PO: protótipo HTML, entrevista, Word/PowerPoint
const proto = JSON.parse(readFileSync('tests/fixtures/prototype.ok.json', 'utf8'));
const { checkPrototype, renderHtml } = await import(`../${S}/render-prototype.mjs`);
const { validate } = await import(`../${S}/lib/schema.mjs`);

test('protótipo: válido, autocontido (sem rede), com SLDS e roteiro', () => {
  const r = checkPrototype(proto, bl); assert.equal(r.ok, true, r.errors.join(';')); assert.deepEqual(r.warnings, []);
  const html = renderHtml(proto, bl);
  assert.match(html, /slds-context-bar/); assert.match(html, /PROTÓTIPO PARA VALIDAÇÃO/); assert.match(html, /Roteiro de validação/);
  assert.equal(/(src|href)=["']https?:/.test(html), false); assert.equal(/<script[^>]+src=/.test(html), false);
});

test('protótipo: reprova goto inexistente, PII real, cenário não coberto e bloco incompleto', () => {
  const c = (f) => { const p = JSON.parse(JSON.stringify(proto)); f(p); return checkPrototype(p, bl); };
  assert.ok(c((p) => { p.screens[0].blocks[2].items[0].goto = 'nada'; }).errors.some((x) => /goto/.test(x)));
  assert.ok(c((p) => { p.screens[1].blocks[0].rows[0][1] = '123.456.789-09'; }).errors.some((x) => /PII/.test(x)));
  assert.ok(c((p) => { p.walkthrough[0].covers = []; }).warnings.some((x) => /não é coberto/.test(x)));
  assert.ok(c((p) => { delete p.screens[1].blocks[0].columns; }).errors.some((x) => /columns/.test(x)));
  assert.ok(c((p) => { p.stories = ['US-099']; }).errors.some((x) => /US-099/.test(x)));
});

test('prototype_brief: schema aceita resposta válida e rejeita opção inventada', () => {
  const sch = JSON.parse(readFileSync(`${S}/../schemas/prototype-brief.schema.json`, 'utf8'));
  assert.deepEqual(validate({ needed: 'sim', asked_at: '2026-11-14', screen_type: 'registro-caso', fidelity: 'fluxo-3-5-telas' }, sch), []);
  assert.ok(validate({ needed: 'talvez', asked_at: '2026-11-14' }, sch).length > 0);
});

test('export Word/PowerPoint abre e traz o conteúdo de negócio (pula sem python-docx/pptx)', (t) => {
  const has = spawnSync('python3', ['-c', 'import docx, pptx'], { encoding: 'utf8' }).status === 0;
  if (!has) return t.skip('python-docx/python-pptx ausentes');
  const out = mkdtempSync(join(tmpdir(), 'off-'));
  const r = spawnSync('python3', [`${S}/export-office.py`, 'tests/fixtures/backlog.ok.json', '--out', out, '--prototype', 'tests/fixtures/prototype.ok.json'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const chk = spawnSync('python3', ['-c', `
from docx import Document; from pptx import Presentation
d=Document('${out}/Visao-de-Produto.docx'); txt=' '.join(p.text for p in d.paragraphs)
assert 'Localizar cliente por documento' in txt and 'Decisões necessárias do negócio' in txt
assert 'discovery-id' not in txt and 'sha256' not in txt
p=Presentation('${out}/Apresentacao-Rodada.pptx'); assert len(p.slides)>=5
`], { encoding: 'utf8' });
  assert.equal(chk.status, 0, chk.stderr);
});

// ---- Protótipo derivado do template do console (referência obrigatória)
const { build } = await import(`../${S}/new-prototype.mjs`);
const { checkHtml, templateActions } = await import(`../${S}/check-prototype-html.mjs`);
const meta = JSON.parse(readFileSync('tests/fixtures/proto_meta.ok.json', 'utf8'));
const journeyJs = readFileSync('tests/fixtures/journey.sample.js', 'utf8');
const withJourney = (html, js = journeyJs) => html.replace('/* JORNADA:INICIO */', () => `/* JORNADA:INICIO */\n${js}`);

test('template do console: sem PII, sem rede, e reprovado até a jornada existir', () => {
  const html = build(meta); const r = checkHtml(html, bl);
  assert.ok(r.errors.some((e) => /JORNADA vazio/.test(e)));
  assert.ok(!r.errors.some((e) => /fidelidade|PII|autocontido/.test(e)), r.errors.join(';'));
  assert.ok(templateActions(readFileSync(`${S}/../references/prototype-template/template.html`, 'utf8')).has('buscarCliente'));
});

test('protótipo do template com jornada: aprovado; roteiro cobre o aceite', () => {
  const r = checkHtml(withJourney(build(meta)), bl);
  assert.equal(r.ok, true, r.errors.join(';')); assert.deepEqual(r.warnings, []);
});

test('protótipo do template: reprova alteração fora da jornada, ação inexistente, rede e PII', () => {
  const ok = withJourney(build(meta));
  assert.ok(checkHtml(ok.replace('function renderSidebar()', 'function renderSidebar2()'), bl).errors.some((e) => /fidelidade/.test(e)));
  assert.ok(checkHtml(ok.replace('.topnav{background:white', '.topnav{background:red'), bl).errors.some((e) => /fidelidade/.test(e)));
  assert.ok(checkHtml(build({ ...meta, walkthrough: [{ ...meta.walkthrough[1], run: [['acaoFantasma']] }] }).replace('/* JORNADA:INICIO */', () => `/* JORNADA:INICIO */\n${journeyJs}`), bl).errors.some((e) => /acaoFantasma/.test(e)));
  assert.ok(checkHtml(withJourney(build(meta), journeyJs + "\nfetch('x');"), bl).errors.some((e) => /autocontido/.test(e)));
  assert.ok(checkHtml(withJourney(build(meta), journeyJs + "\nvar d='123.456.789-09';"), bl).errors.some((e) => /PII/.test(e)));
});

test('protótipo do template: jornada funciona no navegador (se Playwright existir)', async (t) => {
  let chromium; try { ({ chromium } = (await import('node:module')).createRequire(join(process.cwd(), 'x.js'))('playwright')); } catch { return t.skip('Playwright ausente'); }
  const f = join(mkdtempSync(join(tmpdir(), 'pw-')), 'p.html'); writeFileSync(f, withJourney(build(meta)));
  const b = await chromium.launch(); const pg = await b.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
  await pg.goto('file://' + f);
  await pg.evaluate(() => { PROTO_RESET(); ['buscarCliente', 'selProduto', 'avancar'].forEach((a) => PROTO_DO(a)); PROTO_DO('t2', 'bscDoc'); PROTO_DO('bscBuscar'); });
  const txt = await pg.textContent('body'); await b.close();
  assert.deepEqual(errs, []); assert.match(txt, /Busca por documento/); assert.match(txt, /Cliente Exemplo Um/); assert.match(txt, /Roteiro de validação/);
});
