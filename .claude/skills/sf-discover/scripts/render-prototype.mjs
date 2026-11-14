#!/usr/bin/env node
// prototype.json → HTML único e autocontido (SLDS oficial inline, sem rede), clicável, para a PO validar e compartilhar.
// Valida: schema, alvos de navegação (goto), dados fictícios (sem PII formatada), cobertura dos cenários de aceite (US-nnn#n).
// Uso: node render-prototype.mjs <prototype.json> [--backlog backlog.json] [--out <arquivo.html>]
// Exit: 0 ok | 2 reprovado | 1 uso
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './lib/schema.mjs';
import { findPii } from './lib/pii.mjs';
import { SKILL_ROOT } from './lib/config.mjs';

const SCHEMA = JSON.parse(readFileSync(join(SKILL_ROOT, 'schemas/prototype.schema.json'), 'utf8'));
const e = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let ICONS = null;
const icons = () => (ICONS ??= JSON.parse(readFileSync(join(SKILL_ROOT, 'vendor/slds/icons.json'), 'utf8')));
const css = () => readFileSync(join(SKILL_ROOT, 'vendor/slds/slds.min.css'), 'utf8');

const ico = (name, cls = 'slds-icon slds-icon-text-default slds-icon_x-small') => {
  const id = name.includes('-') ? name : `utility-${name}`;
  return icons()[id] ? `<svg class="${cls}" aria-hidden="true"><use href="#${id}"></use></svg>` : '';
};
const stdIcon = (n) => `<span class="slds-icon_container slds-icon-standard-${n.replace(/_/g, '-')} slds-m-right_small">${ico(`standard-${n}`, 'slds-icon slds-icon_small')}</span>`;

export function collectStrings(o, out = []) { if (typeof o === 'string') out.push(o); else if (o && typeof o === 'object') for (const v of Object.values(o)) collectStrings(v, out); return out; }
function gotos(o, out = []) { if (o && typeof o === 'object') { if (typeof o.goto === 'string') out.push(o.goto); for (const v of Object.values(o)) gotos(v, out); } return out; }

export function checkPrototype(p, backlog = null) {
  const errors = validate(p, SCHEMA); const warnings = [];
  if (errors.length) return { ok: false, errors, warnings };
  const need = { heading: ['text'], text: ['text'], alert: ['text'], path: ['steps'], fields: ['items'], form: ['fields'], table: ['columns', 'rows'], cards: ['items'], actions: ['items'], tabs: ['items'], timeline: ['items'], highlights: ['title'] };
  for (const s of p.screens) s.blocks.forEach((b, i) => { for (const k of need[b.type] || []) if (b[k] == null) errors.push(`tela ${s.id}, bloco ${i + 1} (${b.type}): falta "${k}"`); });
  const ids = new Set();
  for (const s of p.screens) { if (ids.has(s.id)) errors.push(`tela duplicada: ${s.id}`); ids.add(s.id); }
  if (!ids.has(p.start)) errors.push(`start "${p.start}" não é uma tela`);
  for (const g of gotos(p)) if (!ids.has(g)) errors.push(`goto "${g}" aponta para tela inexistente`);
  for (const w of p.walkthrough || []) if (!ids.has(w.screen)) errors.push(`walkthrough: tela "${w.screen}" inexistente`);
  const pii = collectStrings(p).flatMap((t) => findPii(t));
  if (pii.length) errors.push(`dados que parecem reais (PII) no protótipo: ${pii.length}. Use dados fictícios/mascarados.`);
  if (backlog) {
    const stories = new Map(backlog.epics.flatMap((ep) => ep.stories.map((s) => [s.id, s])));
    for (const sid of p.stories) if (!stories.has(sid)) errors.push(`história ${sid} não existe no backlog`);
    const covered = new Set((p.walkthrough || []).flatMap((w) => w.covers || []));
    for (const sid of p.stories) (stories.get(sid)?.acceptance || []).forEach((_, i) => { if (!covered.has(`${sid}#${i + 1}`)) warnings.push(`cenário ${sid}#${i + 1} não é coberto por nenhum passo do roteiro`); });
    for (const c of covered) { const [sid, n] = c.split('#'); if (stories.get(sid) && !stories.get(sid).acceptance?.[Number(n) - 1]) errors.push(`roteiro cobre ${c}, que não existe`); }
  } else warnings.push('backlog não informado: cobertura de cenários de aceite não verificada');
  return { ok: errors.length === 0, errors, warnings };
}

const btn = (a) => `<button type="button" class="slds-button slds-button_${a.variant === 'neutro' ? 'neutral' : a.variant === 'destrutivo' ? 'destructive' : a.variant === 'texto' ? 'base' : 'brand'}" ${a.goto ? `data-goto="${e(a.goto)}"` : ''} ${a.toast ? `data-toast="${e(a.toast)}"` : ''} ${a.validate ? 'data-validate="1"' : ''}>${e(a.label)}</button>`;

function input(f, i) {
  const id = `f-${i}-${e(f.name || f.label).replace(/\W+/g, '')}`;
  const req = f.required ? ' required' : '';
  const lab = `<label class="slds-form-element__label" for="${id}">${f.required ? '<abbr class="slds-required" title="obrigatório">*</abbr>' : ''}${e(f.label)}</label>`;
  let ctl;
  if (f.kind === 'select') ctl = `<div class="slds-select_container"><select class="slds-select" id="${id}"${req}><option value="">Selecione…</option>${(f.options || []).map((o) => `<option>${e(o)}</option>`).join('')}</select></div>`;
  else if (f.kind === 'textarea') ctl = `<textarea class="slds-textarea" id="${id}"${req} placeholder="${e(f.placeholder)}"></textarea>`;
  else if (f.kind === 'radio') ctl = (f.options || []).map((o, k) => `<span class="slds-radio"><input type="radio" id="${id}-${k}" name="${id}"${req}><label class="slds-radio__label" for="${id}-${k}"><span class="slds-radio_faux"></span><span class="slds-form-element__label">${e(o)}</span></label></span>`).join('');
  else if (f.kind === 'checkbox') ctl = `<span class="slds-checkbox"><input type="checkbox" id="${id}"${req}><label class="slds-checkbox__label" for="${id}"><span class="slds-checkbox_faux"></span><span class="slds-form-element__label">${e(f.text || f.label)}</span></label></span>`;
  else ctl = `<input class="slds-input" id="${id}" type="${f.kind === 'date' ? 'date' : 'text'}"${req} placeholder="${e(f.placeholder)}" value="${e(f.value)}"${f.readonly ? ' readonly' : ''}>`;
  const help = f.help ? `<div class="slds-form-element__help">${e(f.help)}</div>` : '';
  return `<div class="slds-form-element slds-m-bottom_small" data-field>${f.kind === 'checkbox' ? '' : lab}<div class="slds-form-element__control">${ctl}</div>${help}<div class="slds-form-element__help slds-text-color_error slds-hide" data-err>Preencha este campo.</div></div>`;
}

function block(b, i) {
  switch (b.type) {
    case 'heading': return `<h${b.level || 2} class="slds-text-heading_${b.level === 1 ? 'large' : 'medium'} slds-m-bottom_small">${e(b.text)}</h${b.level || 2}>`;
    case 'text': return `<p class="slds-m-bottom_small">${e(b.text)}</p>`;
    case 'alert': { const t = b.tone === 'erro' ? 'error' : b.tone === 'aviso' ? 'warning' : b.tone === 'sucesso' ? 'success' : 'info'; return `<div class="slds-notify slds-notify_alert slds-alert_${t === 'info' ? 'info' : t} slds-m-bottom_small" role="alert"><span class="slds-assistive-text">${t}</span>${ico(t === 'success' ? 'success' : t === 'error' ? 'error' : t === 'warning' ? 'warning' : 'info', 'slds-icon slds-icon_x-small slds-m-right_x-small')}<h2>${e(b.text)}</h2></div>`; }
    case 'path': { const cur = b.current ?? 0; return `<div class="slds-path slds-m-bottom_medium"><div class="slds-grid slds-path__track"><div class="slds-path__scroller"><ul class="slds-path__nav" role="listbox">${b.steps.map((s, k) => `<li class="slds-path__item ${k < cur ? 'slds-is-complete' : k === cur ? 'slds-is-current slds-is-active' : 'slds-is-incomplete'}" role="presentation"><a class="slds-path__link" role="option" aria-selected="${k === cur}" tabindex="-1"><span class="slds-path__stage">${k < cur ? ico('check', 'slds-icon slds-icon_x-small slds-icon-text-default') : ''}</span><span class="slds-path__title">${e(s)}</span></a></li>`).join('')}</ul></div></div></div>`; }
    case 'highlights': return `<div class="slds-page-header slds-m-bottom_medium"><div class="slds-grid slds-wrap"><div class="slds-media slds-col slds-size_1-of-1 slds-large-size_6-of-12">${b.icon ? `<div class="slds-media__figure">${stdIcon(b.icon)}</div>` : ''}<div class="slds-media__body"><p class="slds-text-title_caps">${e(b.kicker)}</p><h1 class="slds-page-header__title slds-truncate">${e(b.title)}</h1></div></div><div class="slds-col slds-size_1-of-1 slds-large-size_6-of-12 slds-text-align_right">${(b.actions || []).map((a) => btn({ variant: 'neutro', ...a })).join(' ')}</div></div><ul class="slds-grid slds-page-header__detail-row slds-m-top_small">${(b.fields || []).map((f) => `<li class="slds-page-header__detail-block"><p class="slds-text-title slds-truncate">${e(f.label)}</p><p class="slds-truncate">${e(f.value)}</p></li>`).join('')}</ul></div>`;
    case 'fields': return `<div class="slds-card slds-m-bottom_medium"><div class="slds-card__header slds-grid"><h2 class="slds-card__header-title">${e(b.title || 'Detalhes')}</h2></div><div class="slds-card__body slds-card__body_inner"><dl class="slds-grid slds-wrap">${b.items.map((f) => `<div class="slds-col slds-size_1-of-1 slds-medium-size_1-of-2 slds-m-bottom_small"><dt class="slds-text-title">${e(f.label)}</dt><dd>${e(f.value)}${f.masked ? ` ${ico('lock', 'slds-icon slds-icon_xx-small slds-icon-text-default')}` : ''}</dd></div>`).join('')}</dl></div></div>`;
    case 'form': return `<div class="slds-card slds-m-bottom_medium" data-form><div class="slds-card__header"><h2 class="slds-card__header-title">${e(b.title || 'Formulário')}</h2></div><div class="slds-card__body slds-card__body_inner">${b.fields.map((f) => input(f, i)).join('')}</div></div>`;
    case 'table': return `<div class="slds-card slds-m-bottom_medium"><div class="slds-card__header"><h2 class="slds-card__header-title">${e(b.title || 'Resultados')}</h2></div><div class="slds-card__body">${b.filter ? `<div class="slds-p-horizontal_small slds-m-bottom_small"><input class="slds-input" data-filter placeholder="${e(b.filter)}"></div>` : ''}<table class="slds-table slds-table_cell-buffer slds-table_bordered"><thead><tr class="slds-line-height_reset">${b.columns.map((c) => `<th scope="col"><div class="slds-truncate">${e(c)}</div></th>`).join('')}${b.rowAction ? '<th></th>' : ''}</tr></thead><tbody>${b.rows.map((r) => `<tr data-row>${r.map((c) => `<td>${e(c)}</td>`).join('')}${b.rowAction ? `<td>${btn({ variant: 'neutro', ...b.rowAction })}</td>` : ''}</tr>`).join('')}</tbody></table></div></div>`;
    case 'cards': return `<div class="slds-grid slds-wrap slds-gutters slds-m-bottom_medium">${b.items.map((c) => `<div class="slds-col slds-size_1-of-1 slds-medium-size_1-of-3 slds-m-bottom_small"><article class="slds-card"><div class="slds-card__header"><h3 class="slds-card__header-title">${e(c.title)}</h3></div><div class="slds-card__body slds-card__body_inner">${e(c.text)}</div>${c.goto ? `<footer class="slds-card__footer">${btn({ variant: 'neutro', label: c.action || 'Abrir', goto: c.goto })}</footer>` : ''}</article></div>`).join('')}</div>`;
    case 'actions': return `<div class="slds-m-vertical_medium slds-grid slds-grid_align-end">${b.items.map((a) => btn(a)).join(' <span class="slds-m-left_x-small"></span>')}</div>`;
    case 'tabs': return `<div class="slds-tabs_default slds-m-bottom_medium"><ul class="slds-tabs_default__nav" role="tablist">${b.items.map((t, k) => `<li class="slds-tabs_default__item${k === 0 ? ' slds-is-active' : ''}" role="presentation"><a class="slds-tabs_default__link" data-tab="${i}-${k}" role="tab">${e(t.label)}</a></li>`).join('')}</ul>${b.items.map((t, k) => `<div class="slds-tabs_default__content ${k === 0 ? 'slds-show' : 'slds-hide'}" data-tabpane="${i}-${k}" role="tabpanel">${e(t.text)}</div>`).join('')}</div>`;
    case 'timeline': return `<div class="slds-card slds-m-bottom_medium"><div class="slds-card__header"><h2 class="slds-card__header-title">${e(b.title || 'Atividade')}</h2></div><div class="slds-card__body slds-card__body_inner"><ul class="slds-timeline">${b.items.map((t) => `<li class="slds-m-bottom_small"><div class="slds-media"><div class="slds-media__figure">${ico(t.icon || 'note')}</div><div class="slds-media__body"><p class="slds-text-title_caps">${e(t.when)}</p><p>${e(t.text)}</p></div></div></li>`).join('')}</ul></div></div>`;
    default: return '';
  }
}

export function renderHtml(p, backlog = null) {
  const app = p.app || { mode: 'console' };
  const stories = backlog ? new Map(backlog.epics.flatMap((ep) => ep.stories.map((s) => [s.id, s]))) : new Map();
  const screens = p.screens.map((s, si) => `<section class="screen slds-hide" id="screen-${e(s.id)}" data-screen="${e(s.id)}" ${s.layout === 'duas-colunas' ? '' : ''}><h2 class="slds-assistive-text">${e(s.title)}</h2>${s.note ? `<div class="slds-text-color_weak slds-m-bottom_small">${ico('info')} ${e(s.note)}</div>` : ''}${s.blocks.map((b, bi) => block(b, si * 100 + bi)).join('\n')}</section>`).join('\n');
  const wt = (p.walkthrough || []).map((w, k) => `<li class="slds-m-bottom_x-small"><a href="#" data-goto="${e(w.screen)}">${k + 1}. ${e(w.text)}</a>${(w.covers || []).length ? `<div class="slds-text-body_small slds-text-color_weak">Cobre: ${w.covers.map((c) => { const [sid, n] = c.split('#'); const a = stories.get(sid)?.acceptance?.[Number(n) - 1]; return e(a ? `${c} — ${a.then}` : c); }).join('; ')}</div>` : ''}</li>`).join('');
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none"><defs>${Object.values(icons()).join('')}</defs></svg>`;
  const tabs = (app.tabs || []).map((t, k) => `<li class="slds-context-bar__item${k === 0 ? ' slds-is-active' : ''}"><a class="slds-context-bar__label-action"><span class="slds-truncate">${e(t)}</span></a></li>`).join('');
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Protótipo — ${e(p.title)}</title>
<style>${css()}
.proto-banner{background:#fef3c7;color:#5c4400;padding:.5rem 1rem;text-align:center;font-size:.8125rem;border-bottom:1px solid #e0c36a}
.proto-wrap{display:flex;min-height:calc(100vh - 140px)}.proto-main{flex:1;padding:1rem 1.5rem;max-width:1100px}.proto-side{width:300px;border-left:1px solid #dddbda;padding:1rem;background:#f3f3f3}
@media(max-width:820px){.proto-wrap{flex-direction:column}.proto-side{width:auto;border-left:0;border-top:1px solid #dddbda}}
.proto-toast{position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);z-index:9000}</style></head>
<body class="slds-scope">${sprite}
<div class="proto-banner"><strong>PROTÓTIPO PARA VALIDAÇÃO</strong> — dados fictícios; não é a solução final nem representa configuração real do Salesforce.</div>
<div class="slds-context-bar"><div class="slds-context-bar__primary"><div class="slds-context-bar__item slds-context-bar__dropdown-trigger slds-is-active"><span class="slds-context-bar__icon-action">${ico('home')}</span><span class="slds-context-bar__label-action slds-p-left_x-small"><span class="slds-truncate"><strong>${e(app.name || 'Service Console')}</strong></span></span></div></div><nav class="slds-context-bar__secondary"><ul class="slds-grid">${tabs}</ul></nav></div>
<div class="proto-wrap"><main class="proto-main"><h1 class="slds-text-heading_large slds-m-bottom_medium">${e(p.title)}</h1>
${screens}
</main><aside class="proto-side" aria-label="Roteiro de validação"><h2 class="slds-text-heading_small slds-m-bottom_small">Roteiro de validação</h2>${p.purpose ? `<p class="slds-text-body_small slds-m-bottom_small">${e(p.purpose)}</p>` : ''}<ol class="slds-list_ordered">${wt || '<li>Navegue pelos botões.</li>'}</ol><p class="slds-text-body_small slds-text-color_weak slds-m-top_medium">Histórias de origem: ${p.stories.map(e).join(', ')}</p><button type="button" class="slds-button slds-button_neutral slds-m-top_small" data-goto="${e(p.start)}">Recomeçar</button></aside></div>
<div id="toast" class="proto-toast slds-hide"><div class="slds-notify slds-notify_toast slds-theme_success" role="status"><span class="slds-assistive-text">sucesso</span><div class="slds-notify__content"><h2 class="slds-text-heading_small" id="toast-text"></h2></div></div></div>
<script>
(function(){var cur=null;function show(id){document.querySelectorAll('.screen').forEach(function(s){s.classList.toggle('slds-hide',s.dataset.screen!==id)});cur=id;window.scrollTo(0,0);try{history.replaceState(null,'','#'+id)}catch(e){}}
function toast(t){var el=document.getElementById('toast');document.getElementById('toast-text').textContent=t;el.classList.remove('slds-hide');setTimeout(function(){el.classList.add('slds-hide')},2600)}
document.addEventListener('click',function(ev){var t=ev.target.closest('[data-goto],[data-tab]');if(!t)return;ev.preventDefault();
if(t.dataset.tab){var k=t.dataset.tab,box=t.closest('.slds-tabs_default');box.querySelectorAll('[data-tabpane]').forEach(function(p){var on=p.dataset.tabpane===k;p.classList.toggle('slds-show',on);p.classList.toggle('slds-hide',!on)});box.querySelectorAll('.slds-tabs_default__item').forEach(function(li){li.classList.toggle('slds-is-active',li.contains(t))});return}
if(t.dataset.validate){var sc=t.closest('.screen'),ok=true;sc.querySelectorAll('[data-field]').forEach(function(f){var c=f.querySelector('input,select,textarea');var bad=c&&c.required&&((c.type==='checkbox'||c.type==='radio')?!f.querySelector('input:checked'):!c.value);f.querySelector('[data-err]').classList.toggle('slds-hide',!bad);f.classList.toggle('slds-has-error',!!bad);if(bad)ok=false});if(!ok)return}
if(t.dataset.toast)toast(t.dataset.toast);if(t.dataset.goto)show(t.dataset.goto)});
document.addEventListener('input',function(ev){var f=ev.target.closest('[data-filter]');if(!f)return;var q=f.value.toLowerCase();f.closest('.slds-card').querySelectorAll('[data-row]').forEach(function(r){r.classList.toggle('slds-hide',r.textContent.toLowerCase().indexOf(q)<0)})});
var h=location.hash.slice(1);show(document.getElementById('screen-'+h)?h:${JSON.stringify(p.start)});})();
</script></body></html>`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = process.argv.slice(2); const opt = (n) => { const i = a.indexOf(n); return i > -1 ? a[i + 1] : undefined; };
  if (!a[0]) { console.error('Uso: render-prototype.mjs <prototype.json> [--backlog backlog.json] [--out arquivo.html]'); process.exit(1); }
  const p = JSON.parse(readFileSync(a[0], 'utf8')); const bl = opt('--backlog') ? JSON.parse(readFileSync(opt('--backlog'), 'utf8')) : null;
  const r = checkPrototype(p, bl);
  for (const w of r.warnings) console.log(`  AVISO: ${w}`);
  for (const x of r.errors) console.error(`  ERRO:  ${x}`);
  if (!r.ok) { console.error(`[render-prototype] REPROVADO (${r.errors.length})`); process.exit(2); }
  const out = opt('--out') || join(dirname(a[0]), basename(a[0], '.json') + '.html');
  writeFileSync(out, renderHtml(p, bl));
  console.log(`[render-prototype] ${p.screens.length} tela(s) → ${out}`);
}
