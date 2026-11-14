import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './schema.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SKILL_ROOT = ROOT;
export function loadConfig(path = join(ROOT, 'config', 'jira.config.json')) {
  const cfg = JSON.parse(readFileSync(path, 'utf8'));
  const schema = JSON.parse(readFileSync(join(ROOT, 'schemas', 'template-contract.schema.json'), 'utf8'));
  const errors = validate(cfg, schema);
  if (cfg.templates_status === 'oficial') {
    if (!cfg.project_key) errors.push('oficial exige project_key');
    for (const [k, p] of Object.entries(cfg.templates || {})) if (!existsSync(join(ROOT, p))) errors.push(`template ${k} não encontrado: ${p}`);
  }
  return { cfg, errors, publishable: errors.length === 0 && cfg.templates_status === 'oficial' };
}
