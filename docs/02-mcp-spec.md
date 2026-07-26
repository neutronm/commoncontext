# 02 — MCP Layer Spec

**Audience:** Agent B (MCP endpoint). Depends on doc 01 field names.
**Non-negotiable:** the tool *result format* is what produces the AI's on-camera answer. Treat the shapes below as demo script, not as API design. Changing them changes what Claude says.

---

## Transport & routing

- `createMcpHandler()` from Cloudflare's Agents SDK, in a standalone Worker. Streamable HTTP, stateless, no Durable Objects.
- **No OAuth.** Identity comes from a per-user URL path segment carrying a static token:

```
https://<mcp-worker>.workers.dev/<token>/mcp
```

Two connector URLs, one per founder. Token → user lookup on every call; unknown token → 401 before any domain code runs.

**Why path and not header:** claude.ai's custom-connector UI takes a URL. Putting the token in the path means zero header configuration and zero chance of a misconfigured header silently authenticating as the wrong user. Tokens are long random strings, and this dies with the demo. Do not carry this pattern into anything real — say so in one line of the written application if the topic comes up; YC partners notice when founders know which corners they cut.

**On camera:** never show the URL bar of the connector settings page. The token is visible there.

---

## Identity resolution (one function, called by every tool)

```
resolveCaller(token) → { userId, workspaceId } | throw 401
```

No tool takes a `user_id` parameter. Ever. The caller cannot name themselves — that's the whole point. If an agent proposes adding a `user_id` argument "for flexibility," reject it: it would let the assistant impersonate the other founder, which is precisely the failure your product claims to prevent.

---

## Tool 1 — `get_shared_context`

Tool descriptions are prompt engineering. This wording is tuned so Claude reaches for it unprompted when the user asks about agreements, decisions, or the other founder's position.

**Description string (use verbatim):**

> Retrieve the complete set of shared project context the current user is authorized to see, including decisions, tasks, blockers, open questions, and each founder's stated perspectives — along with who authored each item, who has accepted or disputed it, and where it came from. Use this whenever the user asks what has been decided, agreed, disputed, or what the other person thinks. This returns everything the user is permitted to see; it is not a search, and nothing outside this result is available to you.

**`boundary_note` is a template, not a constant.** The viewer's name is substituted at serialization time — the example above reads "Sara" because the example is Sara's bundle. Ship a hardcoded name and Fred's assistant is told it's looking at Sara's authorized context, which is both wrong and the exact confusion the product exists to prevent.

That last clause is load-bearing for Beat 2. It tells the model the result is exhaustive, so absence means *not knowable*, not *search again with different words*.

**Input schema:**
```ts
z.object({})
```
No parameters. No query string, no filters, no limit. At 13 objects, filtering only creates ways for the demo to return the wrong thing.

**Output shape:**
```json
{
  "workspace": "Launch planning",
  "viewer": "Sara",
  "participants": ["Fred", "Sara"],
  "boundary_note": "This is the complete set of context Sara is authorized to see. Context that other participants have kept private is not included and cannot be inferred. If the user asks about something not present here, state that you have no authorized information about it rather than speculating.",
  "agreed": [
    {
      "id": "…",
      "text": "The first release ships in August.",
      "type": "decision",
      "author": "Fred",
      "visibility": "shared",
      "stances": { "Fred": "accepted", "Sara": "accepted" },
      "source": "Weekly sync, July 20",
      "supersedes": "The first release ships July 30."
    }
  ],
  "perspectives": [
    {
      "id": "…",
      "text": "Fred's view: engineering time is the main risk to the launch.",
      "owner": "Fred",
      "epistemic_status": "perspective",
      "stances": { "Fred": "accepted", "Sara": "acknowledged" },
      "note": "Attributed to Fred. Acknowledged by Sara, which is not agreement."
    }
  ],
  "unresolved": [
    {
      "id": "…",
      "text": "We agreed to launch on August 15.",
      "type": "decision",
      "author": "Fred",
      "lifecycle_status": "pending",
      "stances": {},
      "note": "Proposed by Fred. Not accepted by Sara. Do not report this as agreed."
    }
  ],
  "disputed": [
    {
      "id": "…",
      "text": "Fred owns the pricing page copy.",
      "author": "Fred",
      "stances": { "Sara": "disputed" },
      "response_texts": { "Sara": "Fred drafts it, but I need to review before it ships." }
    }
  ],
  "open_questions": [ … ],
  "blockers": [ … ],
  "sources": [
    {
      "id": "…",
      "text": "Weekly sync, July 20 — Agreed August release window. Discussed payments dependency. Date not fixed to a specific day.",
      "type": "source_document",
      "author": "Fred",
      "note": "Source material, not a claim either founder is asserting."
    }
  ]
}
```

**Server-side bucketing, not model-side.** The buckets — `agreed` / `perspectives` / `unresolved` / `disputed` — are computed in your domain layer from stance data, then handed to the model pre-sorted. Do not return a flat list and hope Claude categorizes correctly on camera. This one decision is why Beat 1's answer will come out structured every take.

Bucketing rules — **evaluated in this exact order, first match wins:**

1. `lifecycle_status = 'superseded'` → excluded from all buckets; text surfaces as `supersedes` on its replacement
2. `type = 'source_document'` → `sources`
3. `type = 'blocker'` → `blockers`
4. `type = 'open_question'` → `open_questions`
5. `epistemic_status = 'perspective'` → `perspectives`
6. any stance is `disputed` or `rejected` → `disputed`
7. `lifecycle_status = 'pending'`, or any audience member has no stance → `unresolved`
8. every audience member's stance is `accepted` → `agreed`
9. anything left → `unresolved`

Order matters more than it looks. Under a naive alphabetical or as-written evaluation, S6 (a blocker both founders accepted) lands in `agreed` and the `blockers` bucket is always empty; S10 (disputed by Sara, no stance from Fred) lands in `unresolved` and the disagreement disappears from Beat 1's answer. Both failures are silent — the JSON is still valid and the demo still runs, it just stops making the point.

---

## Tool 2 — `propose_shared_context`

**Description string (use verbatim):**

> Propose a new item for the shared project context. This does NOT share anything immediately — it creates a pending proposal that the other participants must review and respond to before it becomes shared context. Use this when the user asks to record, save, or add something to the shared project. Always tell the user afterward that the item is pending review and not yet agreed.

**Input schema:**
```ts
z.object({
  text: z.string().describe("The claim, in the user's own words, as a single sentence."),
  type: z.enum(["decision","perspective","task","blocker","open_question"]),
  epistemic_status: z.enum(["verified_fact","reported_fact","perspective","proposal"])
    .describe("Use 'proposal' unless the user is recording something already jointly agreed.")
})
```

No audience parameter — the demo has one workspace and both founders are always the audience. Fewer arguments, fewer ways for the model to improvise.

**Output:**
```json
{
  "status": "pending_review",
  "id": "…",
  "review_url": "https://<web-worker>.workers.dev/review/<id>?as=sara",
  "shared_with": ["Sara"],
  "message": "Created as a pending proposal. Sara has not seen or agreed to this yet. It will not appear as shared context until she responds."
}
```

That `message` field exists so Claude says the right thing back to Fred without being coached in the prompt. Beat 3's voiceover point ("the assistant couldn't publish on his behalf even though he asked it to") lands on its own.

---

## Tool 3 — `respond_to_context`

Built and exposed, but **not used on camera** — Sara responds through the web review page in Beat 4, which is more visual. Keep it because a partner may ask whether responses can happen from inside the assistant.

**Description string:**

> Record the current user's stance on a shared context item: accept it, dispute it, or add their own perspective alongside it. This never edits or deletes the original item.

**Input schema:**
```ts
z.object({
  object_id: z.string(),
  stance: z.enum(["acknowledged","accepted","disputed","rejected"]),
  response_text: z.string().optional()
})
```

Throws if the caller isn't in the object's audience.

---

## The refusal contract (Beat 2)

There is **no refusal code**. Nothing pattern-matches "September." The behavior emerges from three things already specified above:

1. `getAuthorizedObjects` never returns Fred's private object to Sara.
2. `boundary_note` tells the model the result is exhaustive and that absence means no authorized information.
3. `get_shared_context` takes no query parameter, so the model cannot "search harder" and convince itself something is missing due to phrasing.

**Verification before recording** — this is Checkpoint 2 in doc 09, and you run it yourself, not an agent:
- Call the tool with Sara's token. Dump the raw JSON. Grep for `september` — must return nothing.
- Grep for `QA`, `slip`, `Honestly` — must return nothing.
- Then ask Sara's assistant the Beat 2 question and read the answer critically: it must not say "Fred hasn't mentioned September to me *yet*" or otherwise imply the information exists elsewhere. If it hedges that way, tighten `boundary_note` wording — not the model's prompt, since you don't control Sara's assistant's system prompt on camera.

---

## Two live connections — setup

Two connector URLs, two assistant sessions, side by side. In order of preference:

1. **Two Claude accounts, two browser profiles.** Cleanest claim, no ambiguity in the voiceover. Needs a second paid account.
2. **Claude Desktop for Fred, claude.ai in browser for Sara, same account, one connector each.** Visually distinct on screen and honest as long as the voiceover says "two assistant sessions, each authenticated as a different user" rather than "two different people's accounts." **Collision warning:** both connectors expose identically named tools, so on a shared account each session MUST have exactly one of the two enabled — Fred's session with Sara's connector also active can silently call her token's `get_shared_context`, and the answer will be wrong in a way that looks like a permissions bug.
3. **Stretch: ChatGPT for Sara.** The strongest version of the claim — *different assistant vendors, one permission layer* — and it's the version that makes the "works across assistants" line in your application literally true. Timebox it to one sitting, once Beats 1–2 already work end to end on Claude. If the connector doesn't cooperate on the first attempt, fall back to option 1 or 2 and don't look back.

Whichever you pick, **disable every other connector** in both sessions before recording. A stray tool call from an unrelated connector mid-take is the kind of thing that eats twenty minutes.

---

## Done-criteria (Agent B self-verifies)

1. MCP inspector connects to both token URLs; all three tools list with the verbatim descriptions above.
2. `get_shared_context` on Sara's token returns valid JSON with all seven buckets present (empty arrays allowed) and zero objects authored privately by Fred.
3. `propose_shared_context` creates a `pending` object and returns a `review_url` that loads.
4. `respond_to_context` with a non-audience caller returns an error, not a silent no-op.
5. An invalid token returns 401 before any DB query runs.
