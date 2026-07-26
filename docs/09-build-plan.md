# 09 — Build Plan (phase-gated)

There is exactly one real deadline: **the YC submission itself.** Everything below is ordered by dependency, not by clock. A phase starts when the previous gate passes, however long that takes.

Each gate is a thing you can check, not a time you can reach. If a gate fails, you repeat the phase — you do not proceed on the assumption it'll sort itself out later.

---

## Phase 0 — Design ✅

Docs 00–04 written, scope frozen, seed content literal.

**Gate:** doc 00 exists and you're willing to be held to it.

---

## Phase 1 — Scaffold (you, solo)

Doc 08, start to finish. No agents running yet.

**Gate:** every box in doc 08's pre-dispatch check is ticked. That list lives in doc 08 and only there — duplicating it here is how the two drift apart.

Do not dispatch a single agent until every box is ticked. An agent that starts against a broken scaffold produces work you can't evaluate.

---

## Phase 2 — Parallel build (three agents, simultaneously)

Paste docs 05, 06, 07 into three sessions. Each brief has a stop gate; they will finish at different times and then idle, which is correct.

While they work, **you are not idle** — go do Phase 7. It has no dependency on the demo and it's the part that can't be delegated.

**Gate — Checkpoint 1: the contract check.** All three tracks have reported. You personally verify:
- Agent A's types match `src/domain/types.ts` exactly, with no signature drift
- Agent B's tool descriptions are byte-identical to doc 02
- Agent C's screenshots show real seed content, no placeholders
- All three used the same field names for the same things

This is a read-through, not a test run. You're checking that three independent interpretations of the contract agree. If two tracks disagree about a field name, fix it now — after the merge it costs ten times as much.

---

## Phase 3 — Merge

Merge all three branches to `main`. Then two small phase-2 dispatches:

- **Agent B:** delete `stub-domain.ts`, import from `../src/domain/context`, re-run the inspector checks.
- **Agent C:** replace the `mock-data` import in the two page files with real domain calls, re-take the screenshots.

Both are single-seam changes by construction — that's why phase 1 forbade touching the seam.

**Gate — Checkpoint 2: the authorization check. You run this, not an agent.**

```
npm run db:reset && npm run db:seed
npm test
```

Then hit the MCP endpoint with Sara's token and dump the raw JSON. Grep it for `september`, `honestly`, `slipping`. All three must return nothing.

**This is the load-bearing gate of the entire project.** Everything else is presentation. If this fails, stop and fix it before touching anything cosmetic — a beautiful demo that leaks private context is worse than no demo, because you'd be pitching the opposite of your thesis.

---

## Phase 4 — Deploy and connect real assistants

Deploy both Workers. Add both connector URLs. Run the demo conversation as Fred, then as Sara.

Budget generously — this is where reality diverges from spec. Tool descriptions will need tuning so the assistants call them naturally; `boundary_note` will need tightening if Beat 2 hedges. Expect to iterate on wording several times.

**Gate — Checkpoint 3: the full dry run.** All five beats, in capture order (3 → 1 → 2 → 4 → 5), end to end, with a `db:seed` reset before it. Nothing scripted-around, nothing hand-waved.

If a beat fails twice in a row here, cut it using doc 00's cut-if-behind order rather than fighting it. Beat 2 and Beat 1's provenance answer are the two that are never cuttable.

---

## Phase 5 — Fix list

Everything broken or ugly from Checkpoint 3, ranked, dispatched to agents. **Only bugs that appear on camera qualify.** Everything else is dead to you.

**Gate:** a second clean dry run.

---

## Phase 6 — Record

Write the shot-by-shot script first, with your exact typed prompts word-for-word — no improvising on camera. Then two browser profiles arranged, every other connector disabled, one connector enabled per session, `db:seed` between takes.

**Gate:** a take you'd show a stranger, under two minutes, with Beats 1–2 inside the first 45 seconds.

---

## Phase 7 — Written application and founder video

**No dependency on the demo.** Start it during Phase 2 and pick it up in every gap afterward. This is the single biggest scheduling lever you have: if you leave it until the demo is done, you'll be writing your application at the worst possible moment.

Agents can draft from existing material, but edit heavily — YC reads for founder voice. The thesis line is worth using verbatim: *the canonical primitive is an immutable, permissioned context object, not an auto-generated memory.*

Founder video: one take, about 60 seconds, deliberately unpolished.

**Gate:** every question answered, video recorded.

---

## Phase 8 — Submit

Upload, read the whole application top to bottom once, submit.

**Submit before the demo feels finished.** There is always one more polish pass available and it is never worth the risk of missing the deadline. A submitted good demo beats an unsubmitted great one by an infinite margin.

---

## If you fall behind

The trigger for cutting is **a gate failing twice**, not a clock reading. When that happens, open doc 00's cut-if-behind list and take the top item. Do not extend, do not "just fix this one thing first."

Order of what survives, if it comes to it:
1. Beat 2 (the refusal) and Beat 1's provenance-separated answer
2. A submitted application with a rough demo
3. Everything else
