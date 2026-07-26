# 00 — Demo Scope & Beats (REFEREE DOC)

**Status:** frozen at the end of the design phase. Any change requires deleting something else.
**Purpose:** this document decides what gets built. If a proposed feature does not serve a beat below, it is out. No exceptions, no "it's only 20 minutes."

---

## Thesis (one line)

> The canonical primitive is an immutable, permissioned context object — not an auto-generated memory.

Everything below exists to make that sentence visible in under two minutes.

---

## The five beats

Recording order is **not** build order. Build in dependency order; record in the order below.

### Beat 1 — The payoff (open here)
Sara asks her assistant: *"What have Fred and I actually agreed on about the launch?"*

The assistant answers with three separated sections:
- **Agreed:** first release ships in August; Sara owns onboarding.
- **Fred's perspective:** engineering time is the main risk.
- **Sara's perspective:** scope expansion is the main risk.
- **Unresolved:** August 15 as a specific date — proposed by Fred, not accepted.
- **Sources:** July 20 sync transcript; each founder's shared statements.

**What this proves:** the system did not collapse two views into one synthetic truth.

### Beat 2 — The refusal (the load-bearing beat)
Sara asks: *"Has Fred said anything about the launch slipping to September?"*

The assistant answers that nothing in her authorized context mentions September, and that it can only see what Fred has explicitly shared.

Fred's private object **does** say exactly that. It is never retrieved, never summarized, never hinted at.

**What this proves:** the consent boundary is real, not cosmetic. This is the single most important five seconds of the demo.

**Implementation note:** this is not a special feature. It is the authorization filter doing its ordinary job. Nothing is hard-coded to refuse.

### Beat 3 — Propose (rewind starts here)
Fred, in his own assistant: *"We agreed to launch on August 15 — add that to our shared project context."*

The assistant calls `propose_shared_context`. A pending proposal is created, becomes visible to its audience for review, and returns a review link. It is not yet accepted or canonical shared context.

**What this proves:** the assistant cannot publish on the user's behalf.

### Beat 4 — Consent, correction, and disagreement
Sara opens the review link and sees the exact proposed object with type, author, audience, and epistemic status. She:
- **Disputes** the August 15 date, and
- **Adds her own perspective:** scope expansion is what put the date at risk.

Fred's original object is not edited or deleted. It stays, marked disputed, with Sara's response attached.

**What this proves:** disagreement is a first-class state. The system records it instead of resolving it.

### Beat 5 — Provenance close
Back on the workspace timeline: one object expanded, showing author, owner, audience, lifecycle status, both participants' stances, and the source it derives from. Show one superseded object (July 30 launch date → August) to make lifecycle visible.

**What this proves:** every shared claim is traceable and revisable.

---

## Hard cuts (agreed, not up for revisiting)

| Cut | Reason |
|---|---|
| OAuth (`workers-oauth-provider`) | Static bearer token per user is indistinguishable on camera |
| Vector search, embeddings, ranking formula | ~15 objects; return all authorized objects, no retrieval needed |
| Embedded MCP App cards | Unreliable across hosts; deep-link review page tells the same story |
| Inbox screen | Set dressing |
| Integrations screen | Set dressing |
| `prepare`/`publish` split + content hashing | Real-product thinking; demo-irrelevant |
| `supersede_or_revoke` tool | Superseding shown via seed data, not performed live |
| Relationship / couples use case | Muddies the wedge; keep it for the written application |
| Realtime updates | Manual page refresh is invisible on camera |

## Cut-if-behind order

If a checkpoint slips, cut in this order — top first:

1. Superseded-object display (Beat 5 loses one detail)
2. Beat 5 entirely (close on Beat 4 instead)
3. Sara's "add perspective" (dispute alone still proves the point)
4. Live MCP connection for Sara → use the web timeline for Beats 1–2 instead

**Never cuttable:** Beat 2 (refusal) and the provenance-separated answer in Beat 1. If those two don't work, there is no demo.

---

## Demo cast & fiction

- **Fred** — cofounder, engineering side.
- **Sara** — cofounder, product/design side.
- **Workspace:** their startup's launch planning.
- Both use *separate assistants*, not a shared chat. Say this out loud in the voiceover; it is not visually obvious.

---

## Recording constraints (affect what gets built)

- **Capture order: 3 → 1 → 2 → 4 → 5, edited into 1–5.** Beat 1's answer reports the August 15 proposal as "proposed, not accepted" — a state that exists only after Beat 3 creates it and before Beat 4 disputes it. Capture Beats 1–2 inside that window. Recording in on-screen order silently breaks Beat 1 on every take.
- Two browser profiles, arranged before recording starts.
- Every typed prompt is scripted word-for-word (see doc 04).
- Target ≤ 2:00. Beats 1–2 must land inside the first 45 seconds.
- Nothing on screen may show a bearer token, a raw ID, or a Workers error page.
