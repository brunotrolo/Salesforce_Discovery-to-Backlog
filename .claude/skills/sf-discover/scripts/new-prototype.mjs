#!/usr/bin/env node
// Cria/atualiza o protótipo a partir do TEMPLATE do console (referência obrigatória): copia references/prototype-template/template.html
// e embute os metadados (#proto-meta) + banner + painel "Roteiro de validação". Idempotente: se o HTML já existe, só troca o bloco de metadados
// e preserva a jornada (bloco JORNADA) e o CSS da jornada.
// Uso: node new-prototype.mjs <proto_meta.json> --out <prototipo.html>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SKILL_ROOT } from './lib/config.mjs';

export const TEMPLATE = join(SKILL_ROOT, 'references/prototype-template/template.html');
export const META_START = '<!-- PROTO:META:INICIO -->'; export const META_END = '<!-- PROTO:META:FIM -->';

const PANEL = `<style id="proto-panel-css">
#proto-badge{position:fixed;left:10px;bottom:10px;z-index:9998;background:#fef3c7;color:#5c4400;border:1px solid #e0c36a;border-radius:4px;padding:4px 8px;font:11px -apple-system,Segoe UI,Arial,sans-serif}
#proto-btn{position:fixed;right:12px;bottom:10px;z-index:9998;background:#0070d2;color:#fff;border:0;border-radius:4px;padding:7px 12px;font:600 12px -apple-system,Segoe UI,Arial,sans-serif;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.25)}
#proto-panel{position:fixed;right:12px;bottom:48px;z-index:9998;width:340px;max-height:70vh;overflow:auto;background:#fff;border:1px solid #dddbda;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.2);padding:12px;font:12px -apple-system,Segoe UI,Arial,sans-serif;color:#3e3e3c;display:none}
#proto-panel h3{font-size:13px;margin-bottom:6px}#proto-panel p{color:#706e6b;margin-bottom:8px}
#proto-panel li{margin:0 0 8px 16px}#proto-panel a{color:#0070d2;cursor:pointer;text-decoration:underline}#proto-panel small{display:block;color:#706e6b}
</style>
<div id="proto-badge">PROTÓTIPO PARA VALIDAÇÃO — dados fictícios; não é a solução final</div>
<button id="proto-btn" type="button">Roteiro de validação</button><div id="proto-panel" role="dialog" aria-label="Roteiro de validação"></div>
<script>
(function(){var m=JSON.parse(document.getElementById('proto-meta').textContent),pn=document.getElementById('proto-panel');
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
pn.innerHTML='<h3>'+esc(m.title)+'</h3>'+(m.purpose?'<p>'+esc(m.purpose)+'</p>':'')+'<ol>'+m.walkthrough.map(function(w,i){return '<li><a data-i="'+i+'">'+esc(w.title)+'</a><small>'+esc(w.text)+'</small>'+((w.covers&&w.covers.length)?'<small>Cobre: '+esc(w.covers.join(', '))+'</small>':'')+'</li>'}).join('')+'</ol>'+((m.assumptions&&m.assumptions.length)?'<p><strong>A definir com o negócio:</strong> '+esc(m.assumptions.join(' · '))+'</p>':'')+'<p>Histórias: '+esc(m.stories.join(', '))+'</p>';
document.getElementById('proto-btn').onclick=function(){pn.style.display=pn.style.display==='block'?'none':'block'};
pn.onclick=function(ev){var a=ev.target.closest('a[data-i]');if(!a)return;var w=m.walkthrough[+a.dataset.i];window.PROTO_RESET();w.run.forEach(function(r){window.PROTO_DO(r[0],r[1])})};})();
</script>`;

export function metaBlock(meta) {
  return `${META_START}\n<script type="application/json" id="proto-meta">${JSON.stringify(meta).replace(/</g, '\\u003c')}</script>\n${PANEL}\n${META_END}`;
}

export function build(meta, existingHtml = null) {
  const block = metaBlock(meta);
  if (existingHtml) {
    const re = new RegExp(`${META_START}[\\s\\S]*?${META_END}`);
    if (!re.test(existingHtml)) throw new Error('HTML existente não tem o bloco de metadados do template; recrie a partir do template');
    return existingHtml.replace(re, () => block);
  }
  const t = readFileSync(TEMPLATE, 'utf8');
  return t.replace('</body>', () => `${block}\n</body>`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = process.argv.slice(2); const oi = a.indexOf('--out');
  if (!a[0] || oi < 0) { console.error('Uso: new-prototype.mjs <proto_meta.json> --out <prototipo.html>'); process.exit(1); }
  const meta = JSON.parse(readFileSync(a[0], 'utf8')); const out = a[oi + 1];
  writeFileSync(out, build(meta, existsSync(out) ? readFileSync(out, 'utf8') : null));
  console.log(`[new-prototype] ${existsSync(out) ? 'atualizado' : 'criado'}: ${out} (edite SOMENTE entre JORNADA:INICIO e JORNADA:FIM e no <style id="jornada-css">)`);
}
