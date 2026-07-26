# 06 — Agent B Dispatch Brief: MCP Endpoint

*Copy everything below into the agent session.*

---

You are building a remote MCP server for a short, tightly scoped demo. Read `00-demo-scope-and-beats.md`, `02-mcp-spec.md`, and `04-repo-conventions.md` before writing anything. Doc 02 contains tool description strings and JSON shapes that are **demo script, not API design** — reproduce them exactly, including punctuation.

Branch: `track/mcp`. You own `mcp-worker/**`, including its own `wrangler.jsonc`. Do not create or edit files outside that directory — with one exception: you import the domain layer from `../src/domain/`, read-only.

## STOP GATE — read this before you start

This brief is **phase 1 only**. When you have produced the deliverables below and pasted your verification output, **stop and wait.** Do not continue to any follow-on work, do not start refactoring, do not look for adjacent improvements, do not open files outside your ownership to "help." Post the report and end your turn.

Phase 2 is a separate dispatch you'll receive after a human review. If you finish early, stop early — idle is the correct state. An agent that keeps working past its deliverables is the single most expensive failure mode here, because the extra work lands in files another track is editing.

## Working before track A lands

`src/domain/types.ts` is already on `main` — import it from `../src/domain/types`, do not create or copy it. Stub the domain functions you call in `mcp-worker/src/stub-domain.ts` returning hardcoded objects that match doc 01's seed. Deleting the stub and pointing at the real domain layer is **phase 2, not yours yet** — build so it's a one-line change, then stop with the stub still in place.

## Deliverables

This is a standalone Cloudflare Worker, not a Next.js route. Use `createMcpHandler()` from the Agents SDK — the stateless path. No Durable Objects, no `McpAgent`, no SSE.

1. **`mcp-worker/src/index.ts`** — a fetch handler that routes `POST /:token/mcp` (Streamable HTTP). Open a postgres.js client from `env.HYPERDRIVE.connectionString`, then resolve the token with `resolveCaller(sql, token)` before anything else; unknown token returns 401 without touching the rest.
2. **`mcp-worker/wrangler.jsonc`** — `nodejs_compat`, the `HYPERDRIVE` binding (same config id as the web Worker — the config was created with caching disabled; do not create a new one), and vars `DEMO_TOKEN_FRED`, `DEMO_TOKEN_SARA`, `PUBLIC_APP_URL`.
3. **`mcp-worker/src/tools/get-shared-context.ts`** — empty input schema. Calls `getAuthorizedObjects`, then `getWorkspaceParticipants`, then `bucketContext(objects, { workspace, viewer, participants })`, then serializes to doc 02's wire shape.
4. **`mcp-worker/src/tools/propose-shared-context.ts`** — schema and output message from doc 02. Returns an absolute `review_url` built from `PUBLIC_APP_URL` + the `reviewPath` the domain returns.
5. **`mcp-worker/src/tools/respond-to-context.ts`** — built and registered, not used on camera.

The connector URL becomes `https://<mcp-worker>.workers.dev/<token>/mcp`.

## The three things that matter most

**Tool descriptions verbatim.** They are prompt engineering. The final clause of `get_shared_context`'s description — that the result is everything available and nothing outside it exists — is what produces the refusal in Beat 2. Do not shorten it, do not "clean it up," do not move it into a comment.

**`boundary_note` ships inside every `get_shared_context` result, with the viewer's name substituted in.** Doc 02 gives the template; it reads "Sara" there because that example is Sara's bundle. A hardcoded name tells Fred's assistant it's looking at Sara's context. It's the only steering available, because we do not control the system prompt of the assistant reading this on camera.

**No `user_id` parameter on any tool.** The caller cannot name themselves; identity comes only from the token. If a tool signature seems to need one for flexibility, that is the impersonation hole this entire product exists to close. Flag it, don't add it.

## Serialization notes

`bucketContext` returns `ContextBundle` with `ContextObjectView` objects. Doc 02's wire format is flatter and adds fields the model reads:

- `stances` — object map of display name to stance, built from `responses`
- `response_texts` — map of display name to text, only where present
- `visibility` — `"private"` or `"shared"`, on every object. **Required.** Fred's own private note appears in his bundle and is otherwise indistinguishable from context Sara can also see; without this flag his assistant may answer as though she knows about it.
- `note` — a short plain-English line, present on `perspectives` (attribution is not agreement), `unresolved` (proposed, not accepted; do not report as agreed), and every `private` object (`"Private to you. The other participant cannot see this and does not know it exists."`)
- `supersedes` — the `supersedesText` string
- `participants` — top level, from `ContextBundle.participants`
- **Keys are snake_case on the wire, camelCase in the contract.** `ContextBundle.openQuestions` serializes to `open_questions`. Everything else happens to match. This is deliberate: doc 02's JSON is what the model reads and is fixed; doc 04's types are internal.
- Omit empty buckets' keys? **No** — always emit all seven (`agreed`, `perspectives`, `unresolved`, `disputed`, `open_questions`, `blockers`, `sources`), empty arrays where nothing matches. Consistent shape means consistent model behavior across takes.

**Never run `db:reset` or `db:seed`.** One database, three agents — track A owns its lifecycle. If you need a clean database, ask at a checkpoint.

## Verification — run these and paste output

```
npx @modelcontextprotocol/inspector      # connect to both token URLs
```

1. Both token URLs connect; all three tools list with descriptions byte-identical to doc 02
2. `get_shared_context` with Sara's token: full JSON pasted into your report, with all seven bucket keys present
3. That JSON, grepped for `/september|honestly|slipping/i`, returns nothing
4. `propose_shared_context` creates a pending object and returns a `review_url` that returns 200
5. `respond_to_context` with a non-audience caller returns an MCP error, not a success with an empty body
6. A request with an unknown token returns 401 and no query is issued beyond the token lookup

## Report back with

- The inspector session output for both tokens
- The full Sara JSON from check 2, pasted raw
- Any place doc 02's wire shape was impossible to produce from `ContextBundle`, and what you did instead

## Do not

Add OAuth or `workers-oauth-provider`. Add SSE transport (deprecated). Add Durable Objects or `McpAgent`. Add a `user_id`, `query`, `filter`, or `limit` parameter to any tool. Add tools beyond the three. Add retries, caching, or rate limiting. Rewrite the tool descriptions. Log tokens.
