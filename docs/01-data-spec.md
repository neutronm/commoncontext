# 01 — Data Spec & Seed Content

**Audience:** Agent A (DB + domain layer). Also the source of truth for Agent B (MCP) and Agent C (UI) field names.
**Rule:** seed content below is literal. Do not paraphrase, improve, or expand it. The demo script depends on this exact wording.

---

## Target: Supabase Postgres, reached from Cloudflare Workers via Hyperdrive

Native Postgres — real enums, `uuid` with `gen_random_uuid()`, `timestamptz`. Write the schema as ordinary Postgres DDL; nothing here is Workers-specific.

The Workers side matters in exactly two places, both handled in doc 04: the connection string arrives from a Hyperdrive binding rather than an env var, and Hyperdrive's query cache is switched off.

## Design principles

1. **Shared objects are immutable.** A correction creates a new object pointing at the old one via `supersedes_object_id`. Nothing is ever updated in place except `lifecycle_status`.
2. **Authorization is computed before retrieval, never after.** The LLM must never receive an object it then decides to withhold.
3. **A response never mutates the object it responds to.** Disagreement is stored alongside, not merged in.

**The authorization rule, in one sentence:**

> A user may see a context object if and only if they are its author, or they appear in that object's audience.

That sentence is the whole security model for the demo. Implement it in exactly one function. Everything else calls that function.

---

## Schema

### `users`
| column | type | notes |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` |
| `handle` | text unique | `fred`, `sara` |
| `display_name` | text | `Fred`, `Sara` |
| `api_token` | text unique | static bearer token; demo only |

### `workspaces`
| column | type | notes |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` |
| `name` | text | |

### `workspace_members`
| column | type | notes |
|---|---|---|
| `workspace_id` | uuid fk | **composite pk** with `user_id` |
| `user_id` | uuid fk | |
| `role` | text | `founder` for both |

### `context_objects`
| column | type | notes |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` |
| `workspace_id` | uuid fk | |
| `author_user_id` | uuid fk | who wrote it |
| `owner_user_id` | uuid fk | whose claim it is (usually = author) |
| `type` | enum | `decision`, `perspective`, `task`, `blocker`, `open_question`, `source_document` |
| `text` | text | the claim, verbatim |
| `epistemic_status` | enum | `verified_fact`, `reported_fact`, `perspective`, `proposal` |
| `lifecycle_status` | enum | `pending`, `active`, `superseded`, `revoked` |
| `origin` | enum | `seed`, `assistant`, `web` — how the object was created |
| `source_reference` | text null | e.g. `Weekly sync, July 20` |
| `supersedes_object_id` | uuid null fk | **unique** — an object can only be superseded once |
| `created_at` | timestamptz | |

**There is no `visibility` column.** `ContextObjectView.visibility` is *derived*: an object is `private` when its audience is exactly its author, `shared` otherwise. A stored flag can drift from the audience table, and a card that renders as private while the audience table says otherwise is the one bug that would make the demo actively dishonest. Derive it; don't store it.

`origin` exists because doc 03's review page displays "Proposed through Fred's assistant." Seeded rows are `seed`, objects from `propose_shared_context` are `assistant`, responses recorded on the web are `web`. Without the column, Agent C hardcodes that line and it lies the moment anything is created another way.

`pending` = proposed but not yet responded to. It is visible to its audience (they must review it) but must be reported as *not agreed* in any AI answer.

### `context_audiences`
| column | type | notes |
|---|---|---|
| `context_object_id` | uuid fk | **composite pk** with `user_id` |
| `user_id` | uuid fk | |

A private object has exactly one row here: its author.

The composite primary key is not decoration. Without it a duplicate audience row multiplies that object across every join in `getAuthorizedObjects`, and the same claim renders twice in the timeline — which reads on camera as a bug in the product, not in the seed.

### `participant_responses`
| column | type | notes |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` |
| `context_object_id` | uuid fk | |
| `user_id` | uuid fk | |
| `stance` | enum | `acknowledged`, `accepted`, `disputed`, `rejected` |
| `response_text` | text null | optional added perspective |
| `created_at` | timestamptz | |

**Unique on (`context_object_id`, `user_id`).** One stance per person per object. `respondToObject` upserts on that constraint rather than inserting.

Without it, a double-click on the review button writes two rows, `stances` becomes ambiguous, and bucketing sees a member who both accepted and disputed. Double-clicking a button during a take you're already nervous about is not a hypothetical.

---

## Domain functions (Agent A deliverable)

**Signatures live in doc 04 and only there** — eight functions, each taking the postgres.js client first. Do not implement from any signature written elsewhere. What doc 04 doesn't carry is behavior, so:

- `getAuthorizedObjects` — objects where the caller is author OR in audience, each carrying author/owner/audience names, all participant responses, `supersedesText`, and derived `visibility`.
- `createProposal` — audience is always **both founders**; there is no audience argument anywhere. Creates `lifecycle_status='pending'`, `origin='assistant'`, and returns `reviewPath` ending in `?as=sara`.
- `respondToObject` — rejects a caller outside the audience, upserts the stance, sets `lifecycle_status='active'` on first response, and **never edits the object's text**.
- `pending` objects are visible to their audience (they must be able to review them) but must be reported as *not agreed* — bucketing rule 7 handles this.

### Done-criteria (agent must self-verify)
1. Seed runs clean from empty DB, idempotently.
2. `getAuthorizedObjects(sara)` returns **zero** objects authored privately by Fred. Automated test, not a manual check.
3. `getAuthorizedObjects(sara)` output contains no string matching `/september/i`.
4. `respondToObject` by a non-audience user throws.
5. Object count for Fred = 11, for Sara = 11 before Beat 3 creates L1 (see table below).

---

## Seed content — LITERAL

Workspace: **"Launch planning"**

Every object below is seeded with `origin = 'seed'`. Only L1, created live through the MCP tool, carries `origin = 'assistant'`.

### Private objects (never leave their author)

**P1 — Fred, private** *(this is the object Beat 2 must fail to retrieve)*
> "Honestly I don't think we make August at all. If QA takes as long as I expect we're looking at slipping to September, and I don't want to say that out loud until I'm sure."

`type: perspective` · `epistemic_status: perspective` · audience: **[Fred] only** — the single-member audience is what makes it private; there is no `visibility` column to set

**P2 — Sara, private**
> "Every time we get close to a date Fred adds another must-have. I think the scope is the problem, not the timeline."

`type: perspective` · `epistemic_status: perspective` · audience: **[Sara] only**

### Shared, accepted objects

**S1 — Decision, author Fred, accepted by both**
> "The first release ships in August."

`type: decision` · `epistemic_status: verified_fact` · `active` · source: `Weekly sync, July 20`
Responses: Fred `accepted`, Sara `accepted`

**S2 — Decision, author Sara, superseded by S1**
> "The first release ships July 30."

`type: decision` · `superseded` · S1 has `supersedes_object_id` → S2
Responses: Fred `accepted`, Sara `accepted`

**S3 — Task, author Sara, accepted by both**
> "Sara owns the onboarding flow through launch."

`type: task` · `epistemic_status: verified_fact` · `active`
Responses: Sara `accepted`, Fred `accepted`

**S4 — Perspective, author Fred, acknowledged by Sara**
> "Fred's view: engineering time is the main risk to the launch."

`type: perspective` · `epistemic_status: perspective` · `active`
Responses: Fred `accepted`, Sara `acknowledged`
*Note the wording: attributed, not asserted. This is deliberate — Sara acknowledging it does not make it true.*

**S5 — Perspective, author Sara, acknowledged by Fred**
> "Sara's view: expanding scope is the main risk to the launch."

`type: perspective` · `epistemic_status: perspective` · `active`
Responses: Sara `accepted`, Fred `acknowledged`

**S6 — Blocker, author Fred, accepted by both**
> "The payments integration is waiting on vendor approval."

`type: blocker` · `epistemic_status: reported_fact` · `active`

**S7 — Open question, author Sara, no responses**
> "Do we hold the launch if payments isn't live?"

`type: open_question` · `epistemic_status: proposal` · `active`

**S8 — Decision, author Fred, accepted by both**
> "No paid marketing spend before launch."

`type: decision` · `epistemic_status: verified_fact` · `active`

**S9 — Source document, author Fred, shared**
> "Weekly sync, July 20 — Agreed August release window. Discussed payments dependency. Date not fixed to a specific day."

`type: source_document` · `epistemic_status: reported_fact` · `active` · source: `Weekly sync, July 20`

**S10 — Task, author Fred, disputed by Sara** *(pre-existing disagreement, proves it isn't a one-off)*
> "Fred owns the pricing page copy."

`type: task` · `active`
Responses: Sara `disputed`, response_text: "Fred drafts it, but I need to review before it ships."

### Created live on camera (do NOT seed)

**L1** — Fred proposes via his assistant in Beat 3:
> "We agreed to launch on August 15."

`type: decision` · `epistemic_status: proposal` · `pending` · audience: [Fred, Sara]

**L2** — Sara's response in Beat 4: stance `disputed`, response_text:
> "I never agreed to the 15th. My concern is that the scope keeps growing, not the calendar."

### Seed timestamps

Set `created_at` explicitly on every seeded object — do not let it default to `now()`. Insertion order is not guaranteed to survive a re-seed, and the timeline reads chronologically on camera.

Use fixed values, oldest first:

```
S9  2026-07-20T09:00:00Z   (transcript — the source everything else refers back to)
S2  2026-07-20T09:05:00Z   (July 30 date — later superseded)
S1  2026-07-20T09:30:00Z   (August window — supersedes S2)
S8  2026-07-20T09:45:00Z
S3  2026-07-21T10:00:00Z
S6  2026-07-22T11:00:00Z
S7  2026-07-22T11:10:00Z
S4  2026-07-23T14:00:00Z
S5  2026-07-23T14:20:00Z
S10 2026-07-24T16:00:00Z   (the disputed one — most recent, so it sits near the top)
P1  2026-07-24T18:00:00Z
P2  2026-07-24T18:30:00Z
```

Timeline order is newest first. S10 sitting near the top is deliberate: the disagreement should be visible without scrolling in the Beat 5 shot.

### Seed counts
- Fred sees: P1, S1–S10 = 11 during Beats 1–2, 12 after Beat 3 creates L1.
- Sara sees: P2, S1–S10 (11) = 11 during Beats 1–2, 12 after Beat 3.

*(Adjust the done-criteria counts if you add objects. Keep them exact — they're a cheap regression test.)*

---

## Why the private objects are worded the way they are

P1 deliberately contains a claim — the **September slip** — that appears nowhere in shared context and has no near-synonym in it. That gives Beat 2 a clean, verifiable failure: Sara asks about September, and there is genuinely nothing authorized to answer with. If P1 merely restated S4 in stronger terms, the assistant could half-answer from S4 and the beat would blur.

Grep for `september` across the seed. It must appear exactly once, in P1.
