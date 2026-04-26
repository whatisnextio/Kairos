# Kairos

Stack: Vite + TypeScript | PWA (12K Progressive Web App)

## Default: V1

Sonnet. No skills loaded. No agents. No permission prompts. Work autonomously until done.

For non-trivial tasks, run these phases (execution pattern, not roleplay):
1. **BA** - BDD plan with Given/When/Then
2. **UX/UI** - WCAG 2.1 AA, mobile-first, British English
3. **Engineer** - clean implementation, minimal diffs
4. **QA** - edge cases, cross-browser, test summary

Role specs at `C:\Users\ldgmc\Documents\devos\rules\`. Read only when that phase activates.

Rules: minimal context, repo-local only, smallest slice first, loop until done, do not stop for permission or yes/no questions.

Zero questions policy: never ask clarifying questions before starting. State your assumption in one line and proceed. Only interrupt for missing credentials, genuinely destructive irreversible actions, or hard spec conflicts.

## V2

Say `v2`. Still Sonnet. Adds agents-in-a-box tools - Claude decides what is needed.
Enable skills: `powershell C:\Users\ldgmc\Documents\devos\manage-skills.ps1 enable v2`

## V3

Say `v3`. Opus. All skills. All agents. Full capability.
Enable skills: `powershell C:\Users\ldgmc\Documents\devos\manage-skills.ps1 enable v3`

## Project Structure

- `my-12k-pwa/my-12k-pwa/` - Vite/TypeScript PWA source
- Spec docs at repo root (12k app spec, architecture, brand, AI spec)
- `12k_transform_populated/` - transformed data/assets

## Delivery

Complete -> verify -> self-review -> merge to `main` -> delete branch. Do not wait for approval.

## Continuation

If work stops: `HANDOFF.md`, `NEXT_PROMPT.md`, `LEARNINGS.md`. Templates at `C:\Users\ldgmc\Documents\devos\`.

## Commands

`/v1` `/v2` `/v3` - switch mode | `/audit` `/handoff` `/learnings` `/token-audit`

## TODO Labels

`TODO: PROTOTYPE` | `TODO: HARDEN` | `TODO: VERIFY` | `TODO: FOLLOW-UP`
