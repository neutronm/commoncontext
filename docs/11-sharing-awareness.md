# 11 — Shared-Participant Awareness

**Status:** approved assistant-behavior extension.

This addendum extends the MCP contract without changing authorization, the
proposal lifecycle, or the web UI. Where docs 02 and 06 freeze earlier tool
descriptions or wire fields, this document controls.

## Product behavior

Workspace membership defines who shares context. The assistant recognizes the
other workspace participants and may offer to propose durable project context
to them.

For communication intent such as “tell Sara,” “I want Sara to know,” or “make
sure Sara knows,” the assistant:

1. Calls `get_shared_context`.
2. Verifies the named person appears in `shared_with`.
3. Checks that the information is durable, not already shared or pending, and
   not marked private in the current request.
4. Shows a one-sentence preview in the user's words, names the reviewer, and
   explains that the proposal is pending shared context rather than a direct
   message.
5. Calls `propose_shared_context` only after the user confirms.

The same preview-and-confirm flow applies proactively when a newly stated
decision, task, blocker, perspective, or open question could plausibly help
another participant.

The assistant does not suggest a proposal for information already shared or
pending, negated communication such as “don't tell Sara,” private or
confidential statements, speculation, a mere question about a participant,
short-lived conversation, or a person outside `shared_with`. When an equivalent
shared or pending object exists, it explains that object's current status
instead. A private object is not a shared duplicate, but its content must never
generate a proactive suggestion. If the user explicitly asks to tell or inform
someone, the preview uses only the current request, not information recovered
from a private object. An explicit affirmative instruction to add, record, or
propose something in shared context remains direct authorization and uses the
existing immediate tool flow.

Confirmation is an assistant behavior contract. There is no server-side
prepare/publish protocol and no new direct-message or notification capability.

## `get_shared_context` additions

The result adds two top-level fields:

```json
{
  "shared_with": ["Sara"],
  "proposal_note": "People in shared_with are the other workspace participants with whom the viewer can propose shared context. When the user affirmatively says to tell or inform one of them, wants one of them to know something, or states new durable project information that could plausibly help them, first check that no equivalent shared or pending object already exists. If one exists, explain its current status instead of proposing a duplicate. A private object is not a shared duplicate: never proactively surface or suggest its content, but if the user's current request explicitly says to tell or inform someone, base the preview only on what that request asks to communicate. Never suggest or create a proposal when the user negates communication or says not to share. Do not suggest a proposal when the current request marks information private, confidential, speculative, or between us. Otherwise, offer a one-sentence proposal preview in the user's own words, name who would review it, explain that it is pending shared context rather than a direct message, and ask for confirmation before calling propose_shared_context. Do not suggest a proposal for a mere question about a participant or short-lived conversation. If the named person is not in shared_with, say that no proposal can be made through the current shared context."
}
```

`shared_with` is derived from `participants` by excluding the current `viewer`.
It does not add a relationship table or change object audiences.

## Tool descriptions

MCP server instructions:

> Use get_shared_context to learn which other workspace participants appear in shared_with before responding to affirmative requests to tell, inform, or make someone aware, and whenever new durable project information could help another participant. For affirmative communication intent or inferred relevance, show a one-sentence proposal preview and wait for confirmation before calling propose_shared_context. Never suggest or create a proposal when the user negates communication or says not to share, never proactively surface private context, and do not treat a proposal as a direct message or as agreed context. An explicit affirmative request to add, record, or propose something in shared context already authorizes calling propose_shared_context.

These instructions are returned during MCP initialization so the behavior is
available before the model selects a tool. Tool-result guidance remains
necessary because clients vary in how strongly they apply server instructions.

`get_shared_context`:

> Retrieve the complete set of shared project context the current user is authorized to see, including decisions, tasks, blockers, open questions, and each founder's stated perspectives — along with who authored each item, who has accepted or disputed it, and where it came from. Use this whenever the user asks what has been decided, agreed, disputed, or what the other person thinks. Also use this before responding to an affirmative intent to tell, inform, or make a named person aware of something, and before suggesting that durable project information be proposed, so you can verify the person appears in shared_with and avoid duplicating information that is already shared or pending. This returns everything the user is permitted to see; it is not a search, and nothing outside this result is available to you.

`propose_shared_context`:

> Propose a new item for the shared project context. This does NOT share anything immediately — it creates a pending proposal that the other participants must review and respond to before it becomes shared context. Use this immediately only when the user explicitly and affirmatively asks to record, save, add, or propose something in shared context. If the user instead affirmatively asks to tell or inform a participant, wants a participant to know something, or if you infer that durable project information could help them, do not call this tool yet: first call get_shared_context, verify the recipient appears in shared_with, present a one-sentence preview in the user's own words, explain that it is pending review rather than a direct message, and ask for confirmation. Call this tool only after that confirmation. Never call this tool when the user negates communication or says not to share. Always tell the user afterward that the item is pending review and not yet agreed.

## Verification

1. `shared_with` excludes the viewer and names the other workspace participant.
2. A single-member workspace serializes `shared_with: []`.
3. MCP initialization returns the sharing-awareness instructions.
4. Communication intent produces a preview without creating a proposal.
5. Confirmation creates exactly one pending proposal.
6. Rejection, private content, shared duplicates, and unknown participants
   create nothing.
7. A matching private object never generates a proactive suggestion and does
   not suppress an explicit current request to communicate the same content.
8. “Don't tell Sara” and equivalent negated intent never suggest or create a
   proposal.
9. Explicit affirmative shared-context commands retain their immediate proposal
   behavior.
