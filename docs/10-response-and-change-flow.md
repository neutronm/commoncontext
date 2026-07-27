# 10 — Response & Change Flow Addendum

**Status:** approved after the first full review.

This addendum extends the frozen demo scope without changing its security or
immutability model. Where docs 01–04 describe only the original response flow
or eight domain functions, this document controls.

## Product behavior

Every eligible shared context object exposes these actions to audience members
other than its author on both `/workspace` and `/review/[id]`:

1. **Accept** — records stance `accepted`.
2. **Decline** — records stance `rejected`.
3. **Propose change** — creates a new pending context object whose
   `supersedes_object_id` points to the original.

The response controls remain visible after a participant has responded. Their
current stance is shown, and they may choose the other response. Authors do not
accept or decline their own wording; proposing it records their stance as
`accepted` automatically. Authors may still propose replacement wording.
Private, superseded, and revoked objects have no response controls.

## Immutable replacement lifecycle

- Replacement wording never updates the original object's `text`.
- Only a shared object in the caller's audience may receive a change proposal.
  A private object must never become shared through this flow.
- A change proposal is a new object with `epistemic_status='proposal'`,
  `lifecycle_status='pending'`, and both founders in its audience.
- Creating the proposal records the proposer as `accepted`; proposing the
  wording is their affirmative stance on it.
- The original remains current while the replacement is pending.
- When every audience member has accepted the replacement, the replacement
  becomes active and the original becomes superseded.
- If anyone declines or disputes the replacement, its lifecycle becomes
  `revoked`; it remains visible in the audit trail, is excluded from assistant
  context buckets, and the original remains current.
- Only one pending replacement may target an object at a time. A revoked
  replacement does not prevent a later replacement proposal.
- Pending replacements always serialize under `unresolved`, even when their
  copied type is `blocker`, `open_question`, or `source_document`.

The original doc 01 schema used a global unique constraint on
`supersedes_object_id`. This addendum replaces it with a partial unique index
covering pending replacements only. Migration
`0003_change_proposal_lifecycle.sql` applies that change to an existing
database.

## Domain surface addition

This is the ninth shared domain function and explicitly extends the eight
functions listed in doc 04:

```ts
createChangeProposal(sql: Sql, args: {
  caller: Caller;
  objectId: string;
  text: string;
  origin: Extract<Origin, "assistant" | "web">;
}): Promise<{
  id: string;
  reviewPath: string;
  reviewerNames: string[];
}>
```

It rejects callers outside the original audience, private originals,
superseded or revoked originals, unchanged/empty wording, and objects that
already have a pending replacement.

The reviewer names come from the same atomic query as the proposal. The MCP
tool uses them directly instead of making a second database round trip before
creating the replacement.

## Assistant tools

`respond_to_context` records acceptance or decline as well as the existing
acknowledgement and dispute stances.

**Description string (use verbatim):**

> Record the current user's stance on a shared context item: accept it, decline it, dispute it, or add their own perspective alongside it. This never edits or deletes the original item. Use propose_context_change instead when the user wants replacement wording.

The input remains:

```ts
z.object({
  object_id: z.string(),
  stance: z.enum(["acknowledged", "accepted", "disputed", "rejected"]),
  response_text: z.string().optional()
})
```

Use `accepted` to approve and `rejected` to decline.

The fourth tool is `propose_context_change`.

**Description string (use verbatim):**

> Propose replacement wording for an existing shared context item. This creates a new pending object linked to the original; it never edits the original, and the original remains current unless every participant accepts the replacement.

**Input:**

```ts
z.object({
  object_id: z.string(),
  replacement_text: z.string()
})
```

The tool authenticates only through the connector token, exactly like the
other tools. It takes no `user_id` or audience argument.

## Verification

1. Both screens visibly render `Accept`, `Decline`, and `Propose change`.
2. The review screen keeps the controls visible for an existing response.
3. A proposed replacement preserves the original text and starts pending.
4. Declining a replacement leaves the original active.
5. A declined replacement is revoked and another replacement can be proposed.
6. Pending blocker, open-question, and source replacements are unresolved.
7. Unanimously accepting a replacement supersedes the original.
8. A private object cannot be used to create a shared replacement.
9. Fred's and Sara's connector URLs expose all four tools with caller identity
   resolved from the token.
