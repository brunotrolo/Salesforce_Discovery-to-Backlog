#!/usr/bin/env node
// Tira um PNG de cada tela do protótipo HTML (para entrar no Word/PowerPoint). OPCIONAL: precisa do Playwright instalado
// (npm i -D playwright && npx playwright install chromium). Sem ele, o Word/PPT saem sem imagens e o HTML continua funcionando.
// Uso: node screenshot-prototype.mjs <prototype.html> <prototype.json> <dir-saida>
import { readFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const [html, json, out] = process.argv.slice(2);
if (!html || !json || !out) { console.error('Uso: screenshot-prototype.mjs <prototype.html> <prototype.json> <dir-saida>'); process.exit(1); }
let chromium;
try { ({ chromium } = createRequire(join(process.cwd(), 'x.js'))('playwright')); }
catch { console.error('[screenshot] Playwright não instalado: o Word/PowerPoint serão gerados sem imagens do protótipo.'); process.exit(3); }
const p = JSON.parse(readFileSync(json, 'utf8')); mkdirSync(out, { recursive: true });
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
await pg.goto('file://' + resolve(html));
for (const s of p.screens) {
  await pg.evaluate((id) => document.querySelectorAll('.screen').forEach((e) => e.classList.toggle('slds-hide', e.dataset.screen !== id)), s.id);
  await pg.screenshot({ path: join(out, `${s.id}.png`) });
}
await b.close(); console.log(`[screenshot] ${p.screens.length} tela(s) → ${out}`);
