# CLAUDE.md — Discovery-to-Backlog

Turns product-owner discovery material (any format) into an evidence-traced backlog and, after explicit PO approval, into Jira. Built on the Elephant–Goldfish model (see `.claude/skills/egm/`, literal upstream copy, Apache-2.0).

## Rules (always on — details in `.claude/rules/`)
- No source, no requirement: every item carries anchors like `S01:L120-134`; otherwise it is an open question.
- Orchestration runs in the main conversation (subagents cannot spawn subagents). If no subagent tool exists, stop; do not "review" in the same context.
- Jira writes only after `approve-plan.mjs`; never delete, never transition; the hook `guard-jira-write.mjs` enforces it.
- Sources enter only through `scripts/ingest.mjs` (PII masked). Never paste raw transcripts into artifacts.
- Never embed org aliases or real customer/employee names in skills.
- Docs for humans in PT-BR; rules and agent prompts in EN where already so.

## Commands
- `node scripts/verify-skills.mjs` — lint skills/agents.
- `node --test tests/core.test.mjs tests/jira.test.mjs` — offline tests.
