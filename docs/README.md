# Shared-context demo — spec set

Eleven documents. Read in this order; dispatch in the order under **Handoff**.

| Doc | What it is | Who reads it |
|---|---|---|
| `00-demo-scope-and-beats.md` | The five beats and the cut list. The referee for every scope question. | Everyone |
| `01-data-spec.md` | Schema and literal seed content. | Agent A (+ B, C for field names) |
| `02-mcp-spec.md` | Tool descriptions, wire shape, refusal contract, recording setup. | Agent B |
| `03-ui-spec.md` | Design tokens, component anatomy, video-legibility rules. | Agent C |
| `04-repo-conventions.md` | **The contract.** Stack, bindings, ownership, types, domain surface. | Everyone |
| `05-agent-a-brief.md` | Dispatch: database + domain layer. | Agent A |
| `06-agent-b-brief.md` | Dispatch: MCP Worker. | Agent B |
| `07-agent-c-brief.md` | Dispatch: two web screens. | Agent C |
| `08-scaffold-checklist.md` | What Fred does before any agent starts. | Fred |
| `09-build-plan.md` | Phase-gated plan. No clock. | Fred |
| `10-response-and-change-flow.md` | Approved post-review extension: accept, decline, and immutable change proposals. Extends the shared domain contract and overrides earlier response-flow details where they conflict. | Everyone |

## Handoff

1. Work through `08` completely. Every box in its pre-dispatch check must be ticked.
2. Commit `docs/` so later restores land on the reviewed version.
3. Paste `05`, `06`, `07` into three separate agent sessions, simultaneously.
4. Each brief ends at a stop gate. Agents will finish at different times and idle — that's correct.
5. While they work, start the written application (`09`, Phase 7). It has no dependency on the demo.
6. Follow `09`'s gates from there.

## Invariants nobody may change without changing every doc

- The authorization rule: a user sees an object iff they are its author or in its audience.
- Seed counts: 11 authorized objects each for Fred and Sara before Beat 3.
- Bucketing: seven buckets, ordered evaluation, 10 of Sara's 11 objects land somewhere.
- `visibility` is derived from audience, never stored.
- Tool descriptions and the wire shape in `02`, as amended by `10`, are byte-exact.
- `DATABASE_URL` is the session-mode pooler. Only the Hyperdrive config gets the direct string.
- Beat 2 (the refusal) and Beat 1's provenance-separated answer are never cuttable.
