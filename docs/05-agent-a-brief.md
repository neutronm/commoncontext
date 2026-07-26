# 05 — Agent A Dispatch Brief: Database & Domain Layer

*Copy everything below into the agent session.*

---

You are building the database and domain layer for a short, tightly scoped demo. Read `00-demo-scope-and-beats.md`, `01-data-spec.md`, and `04-repo-conventions.md` before writing anything. Doc 04 defines types you must not change.

Branch: `track/domain`. You own `src/domain/**` and `supabase/migrations/**`. Do not create or edit files outside those paths.

## STOP GATE — read this before you start

This brief is **phase 1 only**. When you have produced the deliverables below and pasted your verification output, **stop and wait.** Do not continue to any follow-on work, do not start refactoring, do not look for adjacent improvements, do not open files outside your ownership to "help." Post the report and end your turn.

Phase 2 is a separate dispatch you'll receive after a human review. If you finish early, stop early — idle is the correct state. An agent that keeps working past its deliverables is the single most expensive failure mode here, because the extra work lands in files another track is editing.

## Deliverables, in this order

1. **`supabase/migrations/0001_init.sql`** — schema from doc 01 as ordinary **Postgres** DDL: `users`, `workspaces`, `workspace_members`, `context_objects`, `context_audiences`, `participant_responses`. Real Postgres enums for `type`, `epistemic_status`, `lifecycle_status`, `origin`, `stance`. Composite primary keys on `workspace_members` and `context_audiences`. Unique on `participant_responses (context_object_id, user_id)` and on `context_objects.supersedes_object_id`. FKs with `on delete cascade`. One index: `context_audiences(user_id)`.

   **Must be re-runnable.** Open the file with `drop table if exists … cascade;` and `drop type if exists … cascade;` for every object it creates. `db:reset` is a plain `psql -f` with no drop step of its own, and your done-criteria require running it twice in a row. A migration that only works against an empty database fails the second time you need it, which will be during recording.

2. **`supabase/migrations/0002_seed.sql`** — the literal seed content from doc 01 as plain SQL. Two users whose `api_token` values are the psql variables `:'fred_token'` and `:'sara_token'` (injected by the `db:seed` script via `-v` — never hardcode a token in the file), one workspace, objects P1–P2 and S1–S10 with their exact wording, audiences, participant responses, explicit `created_at` values, and `origin = 'seed'`. Open the file by deleting all rows from every table so it is re-runnable.

   There is no seed script. No `tsx`, no `dotenv` — a SQL file applied by `psql`, which is also what Fred runs to reset between takes.

3. **`src/domain/context.ts`** — every function in doc 04's domain surface (eight, including `getWorkspaceParticipants` and `resolveWebViewer`).
4. **`src/domain/__tests__/authorization.test.ts`** — the tests named under Verification below.

## The rule you are implementing

> A user may see a context object if and only if they are its author, or they appear in that object's audience.

Every domain function takes the postgres.js client as its first argument (doc 04). Never open a connection inside the domain layer — the two Workers get their connection string from a Hyperdrive binding and the tests get one from `DATABASE_URL`. Injection is what lets the same code run in all three.

Implement it in exactly one place — a single `visibleObjectIds(userId)` query or CTE that every read path goes through. Do not scatter authorization conditions across functions. If two functions each filter, one of them will eventually drift and that drift is the demo's central claim failing on camera.

Authorization is applied **in SQL, before rows leave the database.** Never fetch broadly and filter in TypeScript. Never fetch broadly and filter in TypeScript.

Two related rules:

- `ContextObjectView.visibility` is **derived**, not stored — `private` when an object's audience is exactly its author, `shared` otherwise. There is no `visibility` column.
- `respondToObject` **upserts** on the `(context_object_id, user_id)` unique constraint. A second response from the same person replaces their stance; it never adds a row.

## Bucketing rules for `bucketContext`

**Evaluated in this exact order, first match wins.** Doc 02 carries the same list — they must not diverge.

1. `lifecycleStatus === 'superseded'` → no bucket; text surfaces as `supersedesText` on its replacement
2. `type === 'source_document'` → `sources`
3. `type === 'blocker'` → `blockers`
4. `type === 'open_question'` → `openQuestions`
5. `epistemicStatus === 'perspective'` → `perspectives`
6. any response stance is `disputed` or `rejected` → `disputed`
7. `lifecycleStatus === 'pending'`, or any audience member has no response → `unresolved`
8. every audience member's stance is `accepted` → `agreed`
9. anything left → `unresolved`

Write it as an ordered chain of early returns in one function, not as six independent filters. Independent filters let an object land in two buckets, which produces an AI answer that reports the same item as both agreed and disputed.

Private objects are included for their author and bucket normally — P2 is a perspective, so it appears in Sara's `perspectives`.

**You are the only track that runs `db:reset` or `db:seed`.** All three agents share one database; a reset while B or C is mid-test wipes their state and produces failures that look like logic bugs. If they need a fresh database they'll ask at a checkpoint.

## Verification — run these and paste output

```
npm run db:reset && npm run db:seed     # twice in a row, clean both times
npm test
```

Tests run in plain Node under vitest, opening their own postgres.js client against `DATABASE_URL` — no Workers pool, no bindings. In `beforeAll`, apply both migration files with `sql.file()` (passing the token values from `process.env` for the seed's psql-style variables is not possible — instead read `0002_seed.sql`, replace `:'fred_token'`/`:'sara_token'` with the env values, and execute with `sql.unsafe()`). The tests must not assume someone seeded the database first. That's the whole benefit of taking `sql` as an argument.

Tests that must exist and pass:

1. `getAuthorizedObjects(sql, sara)` returns zero objects where `visibility === 'private' && authorName === 'Fred'`
2. `JSON.stringify(await getAuthorizedObjects(sara))` does not match `/september/i`
3. `getAuthorizedObjects(sql, fred)` returns 11 objects; `getAuthorizedObjects(sql, sara)` returns 11
4. `respondToObject(sql, …)` with a caller outside the audience **throws** — not a silent no-op, not a returned error object
5. `resolveCaller(sql, 'garbage-token')` throws
6. `bucketContext(objects, { workspace, viewer: 'Sara', participants })` places **every** object exactly once or nowhere: S1, S3, S8 → `agreed`; S4, S5, P2 → `perspectives`; S6 → `blockers`; S7 → `openQuestions`; S10 → `disputed`; S9 → `sources`; S2 → no bucket. Assert the total across all seven buckets equals 10.

Test 2 is the demo's load-bearing claim. Write it as an assertion, not a comment.

## Report back with

- The paste of both commands above
- The exact function signatures you exported, if any differ from doc 04
- Anything in doc 01 that was ambiguous and the smaller option you chose

## Do not

Add an ORM. Add RLS policies. Add embeddings, vectors, or full-text search. Add soft deletes. Add a `revoke` path. Add seed objects beyond P1–P2 and S1–S10. Reword any seed text — the demo script depends on exact wording, including the word "September" appearing exactly once in the entire dataset.
