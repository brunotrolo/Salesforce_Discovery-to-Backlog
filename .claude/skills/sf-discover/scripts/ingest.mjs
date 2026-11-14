#!/usr/bin/env node
// Normaliza uma fonte de discovery (transcrição, resumo, requisitos estruturados ou semi-estruturados) em
// discovery/<rodada>/sources/Sxx.md: linhas numeradas (âncoras estáveis), PII formatada mascarada, falantes pseudonimizados.
// O arquivo original NUNCA é copiado nem lido pelo modelo; só o hash dele fica no cabeçalho (proveniência).
//
// Uso: node ingest.mjs <arquivo> --round R01 [--out discovery] [--type transcricao|resumo|estruturado|semi-estruturado]
//        [--speakers pseudonymize|keep] [--chunk-lines 400] [--id S01]
// Formatos nativos: .txt .md .vtt .srt .csv .json .yaml .yml .eml. Para .docx/.pdf/.pptx, extraia o texto com o leitor do host e passe o .txt.
// Exit: 0 ok | 1 uso/erro de formato

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { maskText } from './lib/pii.mjs';
import { sha256 } from './lib/util.mjs';

const NATIVE = new Set(['.txt', '.md', '.vtt', '.srt', '.csv', '.json', '.yaml', '.yml', '.eml']);
const HOST_READER = new Set(['.docx', '.pdf', '.pptx', '.xlsx', '.doc']);

const pad = (n, w = 2) => String(n).padStart(w, '0');

/** VTT/SRT → linhas "[hh:mm:ss] Falante: texto". */
function fromCues(raw) {
  const out = []; const blocks = raw.replace(/\r/g, '').replace(/^WEBVTT.*\n/, '').split(/\n\s*\n/);
  for (const b of blocks) {
    const lines = b.split('\n').filter(Boolean);
    const ti = lines.findIndex((l) => /-->/.test(l));
    if (ti < 0) continue;
    const t = lines[ti].split('-->')[0].trim().replace(',', '.').replace(/\.\d+$/, '');
    const text = lines.slice(ti + 1).join(' ').replace(/<[^>]+>/g, '').trim();
    if (text) out.push(`[${t}] ${text}`);
  }
  return out;
}

function fromCsv(raw) {
  const rows = raw.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  if (!rows.length) return [];
  const split = (l) => { const o = []; let cur = ''; let q = false; for (const c of l) { if (c === '"') q = !q; else if (c === ',' && !q) { o.push(cur); cur = ''; } else cur += c; } o.push(cur); return o.map((x) => x.trim()); };
  const head = split(rows[0]);
  return rows.slice(1).map((r, i) => `Linha ${i + 1}: ` + split(r).map((v, k) => `${head[k] || `col${k + 1}`}=${v}`).join(' | '));
}

function fromJson(raw) {
  const walk = (v, path, out) => {
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`, out));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k, out);
    else out.push(`${path}: ${v}`);
  };
  const out = []; walk(JSON.parse(raw), '', out); return out;
}

export function detectType(lines, ext) {
  const text = lines.join('\n');
  const speakerLines = lines.filter((l) => /^(\[\d{1,2}:\d{2}(:\d{2})?\]\s*)?[A-ZÀ-Ú][\wÀ-ú .'-]{1,30}:\s+\S/.test(l)).length;
  const gherkin = (text.match(/\b(Dado|Quando|Então|Given|When|Then)\b/g) || []).length;
  const ids = (text.match(/\b(RF|RNF|REQ|US|HU)[-_ ]?\d+/g) || []).length;
  if (['.json', '.yaml', '.yml', '.csv'].includes(ext) || gherkin >= 3 || ids >= 3) return 'estruturado';
  if (['.vtt', '.srt'].includes(ext) || speakerLines >= Math.max(4, lines.length * 0.15)) return 'transcricao';
  const bullets = lines.filter((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l)).length;
  const headings = lines.filter((l) => /^#{1,4}\s/.test(l)).length;
  if (headings + bullets >= Math.max(5, lines.length * 0.25)) return 'semi-estruturado';
  return 'resumo';
}

function pseudonymize(lines, map) {
  const letter = (n) => { let s = ''; n += 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
  return lines.map((l) => {
    const m = l.match(/^((?:\[\d{1,2}:\d{2}(?::\d{2})?\]\s*)?)([A-ZÀ-Ú][\wÀ-ú .'-]{1,30}):(\s+\S.*)$/);
    if (!m) return l;
    const name = m[2].trim();
    if (!(name in map)) map[name] = `Pessoa ${letter(Object.keys(map).length)}`;
    return `${m[1]}${map[name]}:${m[3]}`;
  });
}

export function normalize(raw, ext, opts = {}) {
  let lines;
  if (ext === '.vtt' || ext === '.srt') lines = fromCues(raw);
  else if (ext === '.csv') lines = fromCsv(raw);
  else if (ext === '.json') lines = fromJson(raw);
  else lines = raw.replace(/\r/g, '').split('\n');
  lines = lines.map((l) => l.replace(/\s+$/, ''));
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const type = opts.type || detectType(lines, ext);
  const map = {};
  if ((opts.speakers || 'pseudonymize') === 'pseudonymize' && type === 'transcricao') lines = pseudonymize(lines, map);
  const counts = {};
  lines = lines.map((l) => { const r = maskText(l); for (const [k, n] of Object.entries(r.counts)) counts[k] = (counts[k] || 0) + n; return r.text; });
  return { lines, type, speakerMap: map, piiMasked: counts };
}

export function chunkRanges(total, size) {
  const out = []; for (let s = 1; s <= total; s += size) out.push({ from: s, to: Math.min(total, s + size - 1) }); return out;
}

function nextId(dir) {
  const used = existsSync(dir) ? readdirSync(dir).map((f) => f.match(/^S(\d{2,3})\.md$/)?.[1]).filter(Boolean).map(Number) : [];
  return `S${pad((used.length ? Math.max(...used) : 0) + 1)}`;
}

function main() {
  const args = process.argv.slice(2);
  const opt = (n, d) => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : d; };
  const file = args.find((a) => !a.startsWith('--') && args.indexOf(a) === 0);
  if (!file) { console.error('Uso: ingest.mjs <arquivo> --round R01 [--out discovery] [--type ...] [--speakers pseudonymize|keep] [--chunk-lines 400]'); process.exit(1); }
  const ext = extname(file).toLowerCase();
  if (HOST_READER.has(ext)) { console.error(`[ingest] ${ext} não é lido aqui: extraia o texto com o leitor do host (skill ${ext.slice(1)}) e passe o .txt resultante.`); process.exit(1); }
  if (!NATIVE.has(ext)) { console.error(`[ingest] formato ${ext || '(sem extensão)'} não suportado. Nativos: ${[...NATIVE].join(' ')}`); process.exit(1); }
  const round = opt('--round', 'R01');
  const dir = join(opt('--out', 'discovery'), round, 'sources');
  mkdirSync(dir, { recursive: true });
  let raw; let parsed;
  try { raw = readFileSync(file, 'utf8'); parsed = normalize(raw, ext, { type: opt('--type'), speakers: opt('--speakers') }); }
  catch (e) { console.error(`[ingest] erro ao ler ${file}: ${e.message}`); process.exit(1); }
  const id = opt('--id') || nextId(dir);
  const width = Math.max(4, String(parsed.lines.length).length);
  const body = parsed.lines.map((l, i) => `L${pad(i + 1, width)}| ${l}`).join('\n');
  const head = ['---', `id: ${id}`, `round: ${round}`, `origem: ${basename(file)}`, `tipo: ${parsed.type}`, `sha256_original: ${sha256(raw)}`,
    `linhas: ${parsed.lines.length}`, `pii_mascarada: ${JSON.stringify(parsed.piiMasked)}`, `falantes: ${(opt('--speakers') || 'pseudonymize')}`, '---'].join('\n');
  writeFileSync(join(dir, `${id}.md`), `${head}\n${body}\n`);
  const size = Number(opt('--chunk-lines', 400));
  writeFileSync(join(dir, `${id}.chunks.json`), JSON.stringify({ source: id, total_lines: parsed.lines.length, chunks: chunkRanges(parsed.lines.length, size) }, null, 2) + '\n');
  if (Object.keys(parsed.speakerMap).length) writeFileSync(join(dir, `${id}.speakers.map.json`), JSON.stringify(parsed.speakerMap, null, 2) + '\n'); // local; ignorado pelo git; o modelo não lê
  console.log(`[ingest] ${id} (${parsed.type}) — ${parsed.lines.length} linha(s), PII mascarada: ${JSON.stringify(parsed.piiMasked)} → ${join(dir, `${id}.md`)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
