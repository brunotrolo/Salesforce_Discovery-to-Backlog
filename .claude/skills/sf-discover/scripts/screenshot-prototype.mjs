#!/usr/bin/env node
// Tira um PNG de cada passo do ROTEIRO do protótipo (reinicia o estado, executa as ações do passo, captura). Os PNGs entram no Word/PowerPoint.
// OPCIONAL: precisa do Playwright (npm i -D playwright && npx playwright install chromium). Sem ele, Word/PPT saem sem imagens.
// Uso: node screenshot-prototype.mjs <prototipo.html> <proto_meta.json> <dir-saida>
//   (protótipo do template: roteiro com "run"; o protótipo declarativo antigo — prototype.json com screens — também é aceito)
import { readFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const [html, json, out] = process.argv.slice(2);
if (!html || !json || !out) { console.error('Uso: screenshot-prototype.mjs <prototipo.html> <proto_meta.json> <dir-saida>'); process.exit(1); }
let chromium;
try { ({ chromium } = createRequire(join(process.cwd(), 'x.js'))('playwright')); }
catch { console.error('[screenshot] Playwright não instalado: o Word/PowerPoint serão gerados sem imagens do protótipo.'); process.exit(3); }
const p = JSON.parse(readFileSync(json, 'utf8')); mkdirSync(out, { recursive: true });
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1366, height: 800 } });
await pg.goto('file://' + resolve(html));
const template = (p.walkthrough || []).some((w) => Array.isArray(w.run));
const steps = template ? p.walkthrough : p.screens;
for (const s of steps) {
  if (template) await pg.evaluate((run) => { window.PROTO_RESET(); run.forEach((r) => window.PROTO_DO(r[0], r[1])); }, s.run);
  else await pg.evaluate((id) => document.querySelectorAll('.screen').forEach((e) => e.classList.toggle('slds-hide', e.dataset.screen !== id)), s.id);
  await pg.screenshot({ path: join(out, `${s.id}.png`) });
}
await b.close(); console.log(`[screenshot] ${steps.length} imagem(ns) → ${out}`);
