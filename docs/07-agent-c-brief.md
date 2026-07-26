# 07 — Agent C Dispatch Brief: Web UI

*Copy everything below into the agent session.*

---

You are building two screens for a short demo that will be screen-recorded and submitted to Y Combinator. Read `00-demo-scope-and-beats.md`, `03-ui-spec.md`, and `04-repo-conventions.md` before writing anything. Doc 03's tokens, component anatomy, and copy are fixed.

Branch: `track/ui`. You own `src/app/workspace/**`, `src/app/review/**`, `src/components/**`, `src/app/globals.css`. Do not create or edit files outside those paths.

## STOP GATE — read this before you start

This brief is **phase 1 only**. When you have produced the deliverables below and pasted your verification output, **stop and wait.** Do not continue to any follow-on work, do not start refactoring, do not look for adjacent improvements, do not open files outside your ownership to "help." Post the report and end your turn.

Phase 2 is a separate dispatch you'll receive after a human review. If you finish early, stop early — idle is the correct state. An agent that keeps working past its deliverables is the single most expensive failure mode here, because the extra work lands in files another track is editing.

## Working before track A lands

Import the shared contract with `import type { ContextObjectView } from "@/domain/types"`. It is already committed on `main` — do not copy it into your branch and do not edit it. Build `src/components/mock-data.ts` containing the doc 01 seed as `ContextObjectView[]`, verbatim text. Every component takes data as props — no component fetches. Swapping `mock-data` for real domain calls is **phase 2, not yours yet**. Build so that it's a change to the page files alone, then stop with the mocks still wired.

## Deliverables

1. **`src/components/stance-strip.tsx`** — build this first, before layout, before pages. It is the product in one row.
2. **`src/components/context-card.tsx`** — metadata line, claim, provenance lines, stance strip, status gutter.
3. **`src/app/workspace/page.tsx`** — the timeline, with the "Viewing as" switcher.
4. **`src/app/review/[id]/page.tsx`** — the proposal review screen with stance buttons and the optional perspective field.
5. **Tokens in `globals.css`** — the nine colors and two font families from doc 03, declared in the `@theme` block as named CSS variables. Tailwind v4 is CSS-first; there is no `tailwind.config.ts` and creating one has no effect. No literal hex values in component files.

Page-level server components open a postgres.js client from `getCloudflareContext().env.HYPERDRIVE.connectionString` and pass it into the domain functions (doc 04). One client per request; never a module-level singleton. If you see "getCloudflareContext has been called without having called initOpenNextCloudflareForDev", that's a `next.config.ts` problem — Fred's file, not yours. Flag it, don't fix it.

Both pages need `export const dynamic = 'force-dynamic';` — they read a per-request Cloudflare binding and cannot be prerendered at build time. Without it the build either fails or bakes a stale page.

Participant names come from `getWorkspaceParticipants`, passed down as a prop. The stance strip takes its names from `ContextBundle.participants`, never from an object's `audienceNames`: a private object has an audience of one, so deriving from audience drops the `no access` cell on the cards that exist to show it.

The review page's "Proposed through Fred's assistant" line renders from `ContextObjectView.origin` (`assistant` → "through Fred's assistant", `web` → "on the web"). Do not hardcode it.

Both pages resolve the viewer from `?as=fred|sara` (doc 04). There is no login. Every link and the response POST must preserve the current value — a response recorded as the wrong founder is invisible on screen and ruins the take.

## The three things that matter most

**The stance strip never collapses.** Both founders, fixed positions, on every card — including cards where they agree, and private cards where the other cell reads `no access` in italic. The instinct is to hide it when redundant. The redundancy is the point: it teaches the viewer where to look within two seconds of the video starting.

**Color is data.** Nine tokens, each mapped to an epistemic state. Do not add a brand accent, a hover tint, a gradient, or a tenth color. A viewer should read the agreement landscape from the column of status gutters before reading any text.

**Nothing important on hover, no animation.** This is recorded and compressed. Hover states are invisible in a video and a moving cursor pulls the eye; transitions read as lag. Every fact must be visible at rest.

## Copy

All strings come from doc 03 verbatim, including the two lines on the review page about nothing being shared until she responds and her response being recorded alongside Fred's statement. Those sentences are the demo's argument stated in the interface. Do not rewrite them for tone. Buttons keep their name through the flow: `Record response` produces `Response recorded`.

**Never run `db:reset` or `db:seed`.** One database, three agents — track A owns its lifecycle. If you need a clean database, ask at a checkpoint.

## Verification — screenshots required

Paste screenshots for each:

1. `/workspace` viewing as Fred — exactly one dashed private card visible, `PRIVATE TO YOU` chip present
2. `/workspace` viewing as Sara — zero private cards, and no gap or placeholder where one would be
3. A card with disagreement (S10) showing `SARA · disputed` and her response text below the strip
4. The superseded card (S2) struck through at reduced opacity, still present in the stream
5. `/review/<pending id>` before responding, and the same page after — now showing a populated stance strip in the timeline's layout
6. Screenshot 1 exported at 1080p and viewed at 50% size: every metadata line still readable
7. `/review/<id>?as=sara` — record a dispute, then confirm the resulting stance strip reads `SARA · disputed` and not `FRED · disputed`

Check 6 is not optional polish. Metadata that looks elegant at full size disappears after video compression, and the metadata is where provenance lives.

## Report back with

- All seven screenshots
- The token names you used in CSS, so the other tracks can reference them
- Anything in doc 03 that couldn't be built as specified, and what you did instead

## Do not

Build an inbox, an integrations page, a settings page, a nav bar beyond the workspace title, dark mode, loading skeletons, toasts that dismiss under five seconds, or any animation. Do not make it look like chat — no bubbles, no avatars, no left/right alignment by speaker. Do not fetch data inside components. Do not add a tenth color.
