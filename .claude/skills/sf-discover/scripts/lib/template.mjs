// Mini-template ({{campo}}, {{#lista}}…{{/lista}}, {{^campo}}…{{/campo}}, {{.}}). Sem dependências.
const get = (ctx, key) => (key === '.' ? ctx.__item : key.split('.').reduce((o, k) => (o == null ? o : o[k]), ctx));
export function render(tpl, ctx) {
  const open = /\{\{([#^])([\w.]+)\}\}/;
  let m; let out = tpl;
  while ((m = open.exec(out))) {
    const [full, kind, key] = m; const start = m.index; const endTag = `{{/${key}}}`;
    // fecha pelo mesmo nome, respeitando aninhamento do mesmo nome
    let depth = 1; let i = start + full.length; let end = -1;
    while (i < out.length) {
      const o = out.indexOf(`{{#${key}}}`, i); const n = out.indexOf(`{{^${key}}}`, i); const c = out.indexOf(endTag, i);
      if (c < 0) break;
      const nextOpen = [o, n].filter((x) => x >= 0).sort((a, b) => a - b)[0];
      if (nextOpen !== undefined && nextOpen < c) { depth += 1; i = nextOpen + 1; } else { depth -= 1; if (depth === 0) { end = c; break; } i = c + 1; }
    }
    if (end < 0) throw new Error(`template: bloco {{${kind}${key}}} sem fechamento`);
    const inner = out.slice(start + full.length, end);
    const val = get(ctx, key);
    let rep = '';
    if (kind === '#') {
      if (Array.isArray(val)) rep = val.map((it) => render(inner, { ...ctx, ...(typeof it === 'object' ? it : {}), __item: it })).join('');
      else if (val) rep = render(inner, ctx);
    } else if (!val || (Array.isArray(val) && !val.length)) rep = render(inner, ctx);
    out = out.slice(0, start) + rep + out.slice(end + endTag.length);
  }
  return out.replace(/\{\{([\w.]+)\}\}/g, (_, k) => { const v = get(ctx, k); return v == null ? '' : Array.isArray(v) ? v.join(', ') : String(v); });
}
