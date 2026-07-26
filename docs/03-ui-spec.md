# 03 — UI Spec

**Audience:** Agent C (web UI). Field names come from doc 01.
**Two screens only:** the workspace timeline and the proposal review page. Nothing else gets built.

---

## Design brief

This is a **record**, not a conversation. Every design decision below exists to keep it from looking like chat, because "you built a shared chatbot" is the misreading that kills the pitch.

The reference world is version control and chain-of-custody documents: attributed claims, stances, supersession, provenance. The interface should feel like something you could be held to.

**The design thesis: color is data, not branding.** Every accent in the palette maps to an epistemic state. Nothing is colored for decoration. A viewer who watches for fifteen seconds should be able to read agreement, disagreement, and pending status without reading a single word.

---

## Tokens

### Palette

| Token | Hex | Means |
|---|---|---|
| `paper` | `#F6F7F5` | page background |
| `card` | `#FFFFFF` | object surface |
| `ink` | `#16181A` | claim text |
| `ink-muted` | `#5A6472` | metadata |
| `rule` | `#E2E5E1` | borders, dividers |
| `agreed` | `#0F6B5C` | every participant accepted |
| `pending` | `#B4690E` | proposed, awaiting response |
| `disputed` | `#A63D2F` | disputed or rejected |
| `private` | `#5A6472` | visible only to author |

Do not add a brand accent. Every color on screen must mean something; a decorative sixth color would break the one rule the design has.

### Type

Two faces, and the contrast between them is the signature typographic move:

- **Instrument Sans** — claims, headings, buttons. The words people are accountable for.
- **IBM Plex Mono** — all metadata: author, owner, audience, stance, type, status, source, timestamps. Uppercase, letter-spaced, 11–12px.

Claims in sans, provenance in mono. That split does the explanatory work that a legend or tooltip would otherwise have to do, and it reads instantly on video.

Scale: claim text 17px/1.45. Screen title 28px. Metadata 11px uppercase, `0.06em` tracking. Nothing below 11px — see video constraints.

---

## Signature component: the stance strip

Every object card ends with a fixed strip showing **both founders and their position, always**. Never collapsed, never hidden behind a hover, never omitted when they agree.

```
┌──────────────────────────────────────────────┐
│ FRED · accepted        │  SARA · disputed    │
└──────────────────────────────────────────────┘
```

Rules:
- Both names always present, in fixed order (Fred left, Sara right). Fixed position means the viewer's eye learns where to look in the first two seconds.
- No stance yet → `awaiting response` in `pending`.
- No access → `no access` in `private`, italic.
- Stance word carries the semantic color; the name stays `ink-muted`.
- If a response has `response_text`, it appears directly below the strip, in sans, prefixed by the responder's name.

This component is the whole product in one row. Build it first; everything else is scaffolding around it.

---

## Screen 1 — Workspace timeline

Route: `/workspace`

```
┌─────────────────────────────────────────────────────────┐
│  Launch planning                          Viewing as ▾  │
│  ── shared context, 11 items ─────────────────────────  │
│                                                         │
│ ▌┌─────────────────────────────────────────────────┐   │
│ ▌│ DECISION · AUTHORED BY FRED · SHARED WITH SARA  │   │
│ ▌│                                                 │   │
│ ▌│ The first release ships in August.              │   │
│ ▌│                                                 │   │
│ ▌│ SUPERSEDES "The first release ships July 30."   │   │
│ ▌│ SOURCE  Weekly sync, July 20                    │   │
│ ▌├─────────────────────────────────────────────────┤   │
│ ▌│ FRED · accepted          SARA · accepted        │   │
│ ▌└─────────────────────────────────────────────────┘   │
│                                                         │
│ ▌┌─────────────────────────────────────────────────┐   │
│ ▌│ PERSPECTIVE · OWNED BY FRED                     │   │
│ ▌│                                                 │   │
│ ▌│ Fred's view: engineering time is the main risk  │   │
│ ▌│ to the launch.                                  │   │
│ ▌│                                                 │   │
│ ▌│ Acknowledged is not agreement.                  │   │
│ ▌├─────────────────────────────────────────────────┤   │
│ ▌│ FRED · accepted          SARA · acknowledged    │   │
│ ▌└─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Status gutter** (`▌`): a 3px vertical bar on the card's left edge, colored by state. This is what makes the timeline scannable at video scale — a column of colored marks down the left side, readable before any text is.

**Card anatomy, top to bottom:**
1. Metadata line (mono, uppercase): type · authored by · shared with
2. Claim text (sans, 17px) — the only thing at full `ink`
3. Provenance lines (mono): `supersedes`, `source`, where present
4. Stance strip

**Private objects** get a dashed `private` border, no gutter bar, and a `PRIVATE TO YOU` chip in the metadata line. Sara's timeline simply doesn't contain them.

> This is why the demo shows both timelines back to back. Fred's screen has a dashed card; Sara's has nothing where it would be. The absence is the proof, and it only reads if the private card looks visibly different when it *is* there.

**Superseded objects:** claim text at 45% opacity with a strikethrough, gutter in `rule` grey. Keep them in the stream — removing them would defeat the point.

**"Viewing as" switcher:** top-right, switches between Fred and Sara by rewriting the `?as=` query parameter (see doc 04 — there is no login). Backstop for the demo: if a live MCP session misbehaves mid-take, you can still show the authorization boundary by flipping this control. Style it quietly — it must not look like a core feature.

**Where the stance strip gets its names:** from `ContextBundle.participants`, not from an object's `audienceNames`. A private object's audience is one person, so deriving the strip from audience would silently drop Sara's `no access` cell on exactly the cards where it matters most. Pass `participants` down as a prop from the page.

**Preserving `?as=` :** every internal link and the review page's response POST must carry the current `?as=` value. A response recorded as the wrong founder looks identical to a correct one on screen and destroys the take.

---

## Screen 2 — Proposal review

Route: `/review/[id]` — the URL `propose_shared_context` returns. Sara opens this in Beat 4.

```
┌─────────────────────────────────────────────────────────┐
│  Fred proposed a decision                               │
│  ── pending your response ────────────────────────────  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ DECISION · PROPOSED BY FRED · PENDING             │  │
│  │                                                   │  │
│  │ We agreed to launch on August 15.                 │  │
│  │                                                   │  │
│  │ Proposed through Fred's assistant · 2 minutes ago │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Nothing is shared until you respond.                   │
│                                                         │
│  [ Accept ]  [ Dispute ]  [ Acknowledge ]               │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Add your perspective (optional)                   │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Your response is recorded alongside Fred's statement.  │
│  His wording is never edited or removed.                │
│                                                         │
│                                    [ Record response ]  │
└─────────────────────────────────────────────────────────┘
```

The two lines of body copy are load-bearing — they're the demo's argument, stated in the interface so the voiceover doesn't have to carry it alone. Keep them verbatim.

Selected stance button fills with its semantic color; unselected stay outlined. On submit, the page becomes the object's detail view with the stance strip now populated — showing the result immediately, in the same layout as the timeline.

---

## Copy rules

- Buttons name the action and keep that name through the flow: `Record response` → toast `Response recorded`.
- Never "Submit," never "Save."
- Say what people control: "shared with Sara," not "audience: user_2."
- Empty state on Sara's timeline before anything is shared: *"Nothing has been shared with you yet."* Not "No data."

---

## Video legibility constraints

These override normal web conventions. The screen will be recorded, compressed, and watched at speed.

1. **Nothing important on hover.** A partner watching a recording never sees hover states, and a moving cursor pulls the eye. Every fact in the demo must be visible at rest.
2. **No animation** beyond instant state changes. Transitions read as lag on compressed video.
3. **Minimum 11px, minimum 4.5:1 contrast.** The muted-grey-on-white metadata that looks elegant in the browser disappears entirely after upload.
4. **Zoom to ~125% before recording.** Design at a max content width of 720px so it still fills the frame when zoomed.
5. **No toasts that auto-dismiss under 5 seconds.** They'll vanish before the viewer registers them.

---

## Done-criteria (Agent C self-verifies)

1. Both screens render the doc 01 seed data with no placeholder or lorem text anywhere.
2. Fred's timeline shows exactly one dashed private card; Sara's shows none.
3. The stance strip appears on every card including private ones (`SARA · no access`).
4. One superseded card is visibly struck through and still present in the stream.
5. `/review/[id]` for the pending object renders all three stance buttons and posts a real response.
6. Screenshot at 125% zoom, exported at 1080p and viewed at 50% size, is still fully legible.
