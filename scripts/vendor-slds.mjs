#!/usr/bin/env node
// Copia do pacote npm @salesforce-ux/design-system (BSD-3-Clause) só o necessário para o protótipo HTML autocontido:
// CSS minificado (sem @font-face: usa a fonte do sistema) + um conjunto fixo de ícones (símbolos SVG).
// Uso: npm pack @salesforce-ux/design-system && tar xzf *.tgz && node scripts/vendor-slds.mjs <dir do pacote>/package
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = '.claude/skills/sf-discover/vendor/slds';
const ICONS = {
  utility: ['search', 'user', 'call', 'email', 'chat', 'knowledge_base', 'case', 'warning', 'success', 'info', 'error', 'check', 'close', 'chevronright', 'chevrondown', 'add', 'edit', 'filter', 'lock', 'clock', 'settings', 'home', 'record', 'note', 'announcement', 'list', 'forward', 'back', 'refresh', 'send', 'priority', 'shield', 'copy', 'down', 'right'],
  standard: ['case', 'contact', 'account', 'knowledge', 'omni_channel', 'email', 'call', 'task', 'note', 'customer', 'entitlement', 'queue', 'person_account', 'user', 'product'],
};
const pkg = process.argv[2];
if (!pkg) { console.error('Uso: vendor-slds.mjs <dir do pacote>'); process.exit(1); }
mkdirSync(OUT, { recursive: true });
const version = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8')).version;
let css = readFileSync(join(pkg, 'assets/styles/salesforce-lightning-design-system.min.css'), 'utf8');
css = css.replace(/@font-face\s*\{[^}]*\}/g, '');
writeFileSync(join(OUT, 'slds.min.css'), css);
const icons = {}; const missing = [];
for (const [set, names] of Object.entries(ICONS)) {
  const svg = readFileSync(join(pkg, `assets/icons/${set}-sprite/svg/symbols.svg`), 'utf8');
  for (const n of names) {
    const m = svg.match(new RegExp(`<symbol[^>]*id="${n}"[^>]*>[\\s\\S]*?</symbol>`));
    if (!m) { missing.push(`${set}:${n}`); continue; }
    icons[`${set}-${n}`] = m[0].replace(/id="[^"]+"/, `id="${set}-${n}"`);
  }
}
writeFileSync(join(OUT, 'icons.json'), JSON.stringify(icons, null, 1));
writeFileSync(join(OUT, 'VERSION.md'), `Salesforce Lightning Design System ${version} (@salesforce-ux/design-system), BSD-3-Clause.\nGerado por scripts/vendor-slds.mjs. CSS sem @font-face; ${Object.keys(icons).length} ícones.\n`);
console.log(`[vendor-slds] SLDS ${version}: css ${(css.length / 1024).toFixed(0)} KB, ${Object.keys(icons).length} ícones${missing.length ? `, ausentes: ${missing.join(', ')}` : ''}`);
