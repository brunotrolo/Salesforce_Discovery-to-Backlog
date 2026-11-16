import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import politica from '../scripts/politicas/sf-discovery.mjs';

const vazio = () => mkdtempSync(join(tmpdir(), 'odin-disc-'));
const ev = (tool_name, tool_input = {}, cwd = vazio()) => ({ tool_name, tool_input, cwd });
test('política do Odin: escrita no Jira sem plano aprovado é negada; leitura e outras ferramentas passam', () => {
  assert.equal(politica(ev('mcp__atlassian__createJiraIssue', { summary: 'x' }))?.decisao, 'negar');
  assert.equal(politica(ev('mcp__atlassian__getJiraIssue', { issueIdOrKey: 'ABC-1' })), null);
  assert.equal(politica(ev('Bash', { command: 'ls' })), null);
});
test('política do Odin: exclusão no Jira, Confluence e verbo desconhecido são negados (fail-closed)', () => {
  assert.equal(politica(ev('mcp__atlassian__deleteJiraIssue', { issueIdOrKey: 'ABC-1' }))?.decisao, 'negar');
  assert.equal(politica(ev('mcp__atlassian__createConfluencePage', { title: 'x' }))?.decisao, 'negar');
  assert.equal(politica(ev('mcp__atlassian__frobnicateJira', {}))?.decisao, 'negar');
});
test('política do Odin: entrada vazia não quebra', () => { assert.equal(politica(undefined), null); });
