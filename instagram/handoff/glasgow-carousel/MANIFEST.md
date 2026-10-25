# Handoff: Glasgow Carousel (Scotland relaunch post #2)

**Status: NOT cleared to publish.** Moose's caption is in `captions/glasgow-caption.md` as **DRAFT**, awaiting Kelly's approval. Kelly also needs to pick a text-card variant (see "Text-card redesign: pending Kelly's pick" below) before the final Red Onion + Browns slides are re-rendered. Do not publish until a follow-up updates this status line.

Final 8-slide order, leading with a photo per Kelly's note (not a text-only card first). Two complete sets, same filenames in each folder:
- **Instagram (4:5, 1080×1350):** `instagram/exports/`
- **Pinterest (2:3, 1000×1500):** `instagram/exports/pinterest/` — true re-renders from the templates, not crops. All 8 checked individually at both ratios; none needed to fall back to 4:5.

| # | Slide | Filename (same in both folders) | 4:5 Size | Pinterest Size | Notes |
|---|-------|----------|------|------|-------|
| 1 | Glasgow Cathedral | `gfgoneglobal-scotland-glasgow-cathedral.png` | 2.5M | 2.5M | Lead slide. Photo is the view down from the Necropolis — shows the full cathedral. **Not** the old Day 14 photo (`glasgow-cathedral/IMG_8978.jpeg`), which turned out to show St Mungo Museum, a different building next door. See "Photo issues found" below. |
| 2 | Red Onion | `gfgoneglobal-scotland-glasgow-red-onion.png` | 436K | 452K | 5/5, Dedicated GF Menu. Text-only card (no photo exists for this restaurant) — same treatment as the original Day 8 card, just re-rendered at 4:5/2:3 with the new text-restaurant template. Content unchanged from the real guide data. |
| 3 | Glasgow Necropolis | `gfgoneglobal-scotland-glasgow-necropolis.png` | 2.5M | 2.5M | Photo shows the entrance gate/bridge with monuments on the hill. |
| 4 | Browns | `gfgoneglobal-scotland-glasgow-browns.png` | 444K | 460K | 5/5, Coeliac UK accredited. Text-only (no photo exists). New card, not previously in any batch file. |
| 5 | Z Hotel | `gfgoneglobal-scotland-glasgow-z-hotel.png` | 2.5M | 2.5M | "Where to Stay" treatment, same pattern as Portree's Cuillin Hills Hotel slide. Hotels.com affiliate URL below, not yet placed anywhere. |
| 6 | Glasgow Mural Trail | `gfgoneglobal-scotland-glasgow-mural-trail.png` | 2.5M | 2.5M | Photo is real street art but is filed under `photos/scotland/glasgow/merchant-square/IMG_8977.jpeg`, not under the mural-trail folder — the actual mural-trail folder's one photo (`IMG_8989.jpeg`) turned out to be an unrelated river/bridge shot. See "Photo issues found." |
| 7 | Glasgow Overview | `gfgoneglobal-scotland-glasgow-overview.png` | 704K | 764K | 10 restaurants, 8/10 GF score, 2 scored 5/5 (Browns + Red Onion), 6 landmarks, May–Sep, 2–3 nights — all from the live Glasgow guide page. |
| 8 | Scotland End Card | `gfgoneglobal-scotland-end-card.png` | 496K | 500K | **Identical file to Portree's end card** — this is the one reusable-per-country asset, not slide-specific. Don't regenerate it for Glasgow; it's already shared. |

## Text-card redesign: pending Kelly's pick

Per `specs/text-card-redesign.md`: Kelly found the text-only cards (Red Onion, Browns) bottom-heavy, with the top ~55% empty. Two Red Onion proofs are in `variants/`. **The slide-2/slide-4 exports in the table above are still the old bottom-anchored design** and stay that way until Kelly picks.

| Variant | 4:5 (1080×1350) | 2:3 (1000×1500) | What changed |
|---|---|---|---|
| A: Centered | `variants/red-onion-variant-a.png` | `variants/pinterest/red-onion-variant-a.png` | Content group vertically centered. Description 1rem → 1.1rem. Badge top-left, watermark top-right, as before. |
| B: Centered + monogram | `variants/red-onion-variant-b.png` | `variants/pinterest/red-onion-variant-b.png` | Same as A, plus the profile-logo globe (64px, `#C8717A`, the logo's exact stroke color) above the location label. |

Interpretation note: the spec says the globe is "centered above the location label." The text block is left-aligned, so the globe sits on the content's left edge, directly above the label, rather than in the horizontal center of the card, where it floated detached in a left-aligned layout. Easy to switch if Kelly wants it card-centered.

Copy is unchanged from the real guide data. Both variants were reviewed at both ratios with no clipping or crowding. Template support is opt-in (`layout: "centered"`, `monogram: true`, `quoteSize` on `text-restaurant` cards), so nothing else re-renders differently yet. Regenerate the proofs with `node instagram/scripts/render.js instagram/handoff/glasgow-carousel/variants/variants.json --out instagram/handoff/glasgow-carousel/variants`.

**After the pick:** make the winner the `text-restaurant` default, re-render the full Glasgow 4:5 + 2:3 sets, and update this section and the status line.

## Photo issues found while building this (none live on the site, but worth knowing)

Two of the four "new" photo slides needed real investigation because the first candidate photo was wrong — same pattern as the Day 7/Day 11/Day 10 issues found during the Portree build:

1. **Glasgow Cathedral** — the existing Day 14 Instagram card (`scotland-batch-1.html`, not yet posted) uses `photos/scotland/glasgow/glasgow-cathedral/IMG_8978.jpeg`, which actually shows **St Mungo Museum**, a neighboring building, not the cathedral. Confirmed this photo is Instagram-only — the live Glasgow guide page uses a different, correct photo (`IMG_8980.jpeg`, a cathedral interior) for its own Glasgow Cathedral card, so there's no live-site bug. I didn't edit the old Day 14 entry in `scotland-batch-1.html` itself (same as Portree's retired days — that file is being superseded by the new carousel system, not patched in place), but flagging in case anything else ever references `IMG_8978.jpeg` as "Glasgow Cathedral."
2. **Glasgow Mural Trail** — the only photo in the mural-trail folder (`the-worlds-most-economical-taxi-10-glasgow-mural-trail/IMG_8989.jpeg`) shows the South Portland Street Suspension Bridge over the Clyde, not a mural. Not used anywhere live. The photo I used instead (showing genuine large-scale street art) is sitting in the **Merchant Square** folder — content-wise it's clearly mural-trail material, not Merchant Square (which is a covered market courtyard with no photo on the live site at all, so also not a live bug). This looks like a photo-cataloguing mix-up between two nearby stops, not anything urgent, but Kelly may want to re-file `IMG_8977.jpeg` into the mural-trail folder at some point for clarity.

## Supporting data

- **Caption:** Drafted by Moose in `captions/glasgow-caption.md` (status DRAFT). That file's status header is authoritative. Update this manifest's status line when Kelly approves.
- **Z Hotel affiliate URL** (Hotels.com): `https://www.hotels.com/affiliate?landingPage=https%3A%2F%2Fwww.hotels.com%2Fho273536832%2F&camref=1100l5QxCT&creativeref=1011l66481`
- **Source guide page:** `countries/scotland/glasgow.html` (restaurant/landmark/hotel data, GF scores, visited-vs-researched status).
- **Regenerate:** `node instagram/scripts/render.js glasgow` (both ratios). Every slide's settings live in `instagram/carousels/glasgow.json`; card templates (including the no-photo `text-restaurant` type used for Red Onion and Browns) in `instagram/scripts/lib/templates.js`.
- **Pipeline fix this round:** the photo-overlay watermark ("GF GONE GLOBAL") was nearly invisible against light-colored backgrounds (first noticed on the Mural Trail photo). Added a subtle text-shadow — fixed system-wide, including on the already-pushed Portree slides, which were re-rendered and will show the improved watermark too.

## Explicitly NOT part of this post

- **Bella Italia, Blue Lagoon Fish & Chips** — both visited, both have GF scores, neither has a photo. Considered adding as more text-only cards; decided two strong 5/5 text cards (Red Onion, Browns) beats four mixed-score ones. Available if Kelly wants a denser version later.
- **Merchant Square** — researched, not visited; its one photo is being used for the Mural Trail slide instead (see above). No separate Merchant Square card.
- **George Square, Buchanan Street** — visited landmarks, no photos available at all.
- **GF Gem / Bookable Experience / Key Phrases card types** — same reasoning as Portree: no qualifying dedicated-GF venue beyond Browns/Red Onion (both already used as the restaurant slides), no Viator-linked tour in the guide, Scotland is English-speaking.
