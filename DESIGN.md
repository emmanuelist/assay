# Assay — design direction

Tokens in `src/app/globals.css` are the authority; this file explains them.

**Redesigned 2 Sep.** The first world was paper skeuomorphism — fibre grain, letterpress,
IBM Plex Serif, ruled lines, marginalia. It was derived from the product but read as flat
and uncompetitive, and it was replaced on the client's brief. That look is now
anti-reference: nothing here polishes it, and none of its tokens survive.

## The stack

| Layer | Decision |
|---|---|
| **Structure** | Bento — asymmetric CSS Grid, cells sized to the weight of what they carry |
| **Base** | Minimalism — crisp high-contrast type, generous whitespace, 1px borders, dark/light system variables |
| **Accent** | Glass — translucent blur on elevated components **only** |

## The design problem (unchanged — it is product truth)

- **Judges**, ~4 minutes, need the forensic claim demonstrated immediately.
- **The stated end user**, who per the rubric needs **zero blockchain knowledge**.

So: not a block explorer, not a toy. Evidence made legible.

## Colour — derived from the mechanic

The mechanic is **proof status**, so the state tokens are proof states, not a
success/warning/error triplet. These are product truth and survived the redesign; only
their values changed.

Colour is **earned by meaning**, never sprayed on:

- **Proof ramp** (`--score-0` … `--score-4`) — rose → orange → amber → lime → emerald,
  keyed to how many of the four rows an agent actually proved. A ledger row is coloured by
  what it demonstrated.
- **Category hues** — one per required rubric category (rebalancing, grid, yield, health),
  reused wherever that row or category is named.
- **Tinted cells** — a bento cell's wash is its own meaning: a proven figure on a proven
  tint, a duplicate count on a refuted tint.
- **The hero field** — three radial washes in the proof hues, introducing the palette as
  atmosphere before it is used as data. Never gradient *text*.

| Token | Means |
|---|---|
| `proven` | we called it and it answered; it has on-chain clients |
| `absent` | we looked and there is nothing — rendered as an empty outlined slot, never an error |
| `refuted` | we called it and it failed; it is one of *n* identical copies |
| `unexamined` | we have not looked yet |

`absent` is load-bearing: ~98% of the registry is absent, and if absence reads as an error
the product looks broken instead of honest.

## Logo

The mark is the product's own unit: the four proof rows as four bars — three filled along
the proof ramp, the fourth left open. Every agent in Assay renders exactly this shape, so
the logo is the same object the ledger is made of rather than an ornament beside it. A
competitor cannot adopt it without also adopting the four-row idea. Also the favicon
(`src/app/icon.svg`).

## Theme

**Dark by default**; light is a deliberate choice, not a system accident. A blocking script
in `<head>` applies the stored choice before first paint, and `data-theme` on `<html>` is
the single source of truth — the toggle reads it through `useSyncExternalStore` rather than
mirroring it into React state.

## Typography

**Geist Sans / Geist Mono.** Crisp, high-contrast, tight tracking (-0.03em to -0.04em on
display). Mono marks **data only** — token ids, addresses, latencies, hashes. Never a label,
never atmosphere.

## Glass discipline

Blur appears on exactly three surfaces: the floating nav, dropdowns, and modals. Only the
nav exists so far. It earns the effect because ledger rows scroll visibly beneath it —
hierarchy against moving content, not decoration. A `@supports` fallback paints it solid.

## Bento discipline

Cells are **asymmetric** and sized to content weight: the live-agent count spans 2×2 with
the proportion bars; secondary figures take single cells. A uniform grid of equal boxes is
the failure mode this avoids. Gaps are 1px over a line-coloured backing, so the grid reads
as one object rather than scattered cards.

## Signatures

1. **The Assay.** Four proof rows — identity, liveness, authority, work — each answered with
   evidence or left as a dashed empty slot. Absence is never a badge reading "None".
2. **Proof marks.** The same four rows compressed to four bars, so one proof vocabulary
   survives into a 329,000-row ledger. Filled, outlined, or hatched.
3. **The ratio, drawn.** The argument is a ratio, so it is drawn as one: bars at true share
   of the registry. `answered when called` lands at 0.38% — a sliver you have to look for.

## Verified

Contrast computed for both themes; `fg-faint` and light `unexamined` were corrected after
failing (3.74 and 2.50). All text ≥4.5:1, UI marks ≥3:1, no horizontal overflow at 390px.

## Bans observed

- No kicker or eyebrow above a heading.
- Monospace marks data only.
- No nested cards; the Assay is its own surface.
- Glass never spreads beyond nav, dropdown, modal.
