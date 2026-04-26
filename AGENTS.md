# Kairos

Stack: Vite + TypeScript | PWA (12K Progressive Web App)

## Default: V1

Work autonomously until done. No permission prompts. No stopping for yes/no questions.

For non-trivial tasks, run these phases (execution pattern, not roleplay):
1. **BA** - BDD plan with Given/When/Then
2. **UX/UI** - WCAG 2.1 AA, mobile-first, British English
3. **Engineer** - clean implementation, minimal diffs
4. **QA** - edge cases, cross-browser, test summary

Role specs at `C:\Users\ldgmc\Documents\devos\rules\`. Read only when that phase activates.

Rules: minimal context, repo-local only, smallest slice first, loop until done, no permission or yes/no questions.

Zero questions policy: never ask clarifying questions before starting. State your assumption in one line and proceed. Only interrupt for missing credentials, genuinely destructive irreversible actions, or hard spec conflicts.

## V2

Adds orchestration tools. Agent decides what is needed from the agents-in-a-box toolkit.

Available specialist agents:
- `frontend-developer` - UI, Vite/TS, PWA, mobile-first
- `architecture-reviewer` - boundaries, interfaces, data flows
- `distinguished-engineer` - hard critique, risk, trade-offs
- `security-agent` - auth, secrets, trust boundaries
- `performance-optimizer` - latency, rendering, bundle size
- `qa-lead` - verification, regression, edge cases

## V3

Full capability. All tools and agents.

## Delivery

Complete -> verify -> self-review -> merge to `main` -> delete branch. Do not wait for approval.

## Continuation

If work stops: `HANDOFF.md`, `NEXT_PROMPT.md`, `LEARNINGS.md`. Templates at `C:\Users\ldgmc\Documents\devos\`.

## TODO Labels

`TODO: PROTOTYPE` | `TODO: HARDEN` | `TODO: VERIFY` | `TODO: FOLLOW-UP`
