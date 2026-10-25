# Handoff: Glasgow Carousel (Scotland relaunch post #2)

**Status: Caption NOT yet written. Not cleared to publish.** Same division of labor as Portree — Moose writes the single carousel caption; Kelly approves before this goes out. Do not publish until a follow-up updates this status line.

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

## Photo issues found while building this (none live on the site, but worth knowing)

Two of the four "new" photo slides needed real investigation because the first candidate photo was wrong — same pattern as the Day 7/Day 11/Day 10 issues found during the Portree build:

1. **Glasgow Cathedral** — the existing Day 14 Instagram card (`scotland-batch-1.html`, not yet posted) uses `photos/scotland/glasgow/glasgow-cathedral/IMG_8978.jpeg`, which actually shows **St Mungo Museum**, a neighboring building, not the cathedral. Confirmed this photo is Instagram-only — the live Glasgow guide page uses a different, correct photo (`IMG_8980.jpeg`, a cathedral interior) for its own Glasgow Cathedral card, so there's no live-site bug. I didn't edit the old Day 14 entry in `scotland-batch-1.html` itself (same as Portree's retired days — that file is being superseded by the new carousel system, not patched in place), but flagging in case anything else ever references `IMG_8978.jpeg` as "Glasgow Cathedral."
2. **Glasgow Mural Trail** — the only photo in the mural-trail folder (`the-worlds-most-economical-taxi-10-glasgow-mural-trail/IMG_8989.jpeg`) shows the South Portland Street Suspension Bridge over the Clyde, not a mural. Not used anywhere live. The photo I used instead (showing genuine large-scale street art) is sitting in the **Merchant Square** folder — content-wise it's clearly mural-trail material, not Merchant Square (which is a covered market courtyard with no photo on the live site at all, so also not a live bug). This looks like a photo-cataloguing mix-up between two nearby stops, not anything urgent, but Kelly may want to re-file `IMG_8977.jpeg` into the mural-trail folder at some point for clarity.

## Supporting data

- **Caption:** Not written yet. Moose to draft the single carousel caption once source material is reviewed; update this manifest's status line when Kelly approves.
- **Z Hotel affiliate URL** (Hotels.com): `https://www.hotels.com/affiliate?landingPage=https%3A%2F%2Fwww.hotels.com%2Fho273536832%2F&camref=1100l5QxCT&creativeref=1011l66481`
- **Source guide page:** `countries/scotland/glasgow.html` (restaurant/landmark/hotel data, GF scores, visited-vs-researched status).
- **Card templates / regeneration scripts:** `instagram/scripts/render-photo-overlay.js` (Cathedral, Necropolis, Mural Trail, Z Hotel), `instagram/scripts/render-overview-card.js` (Glasgow Overview), `instagram/scripts/render-design-cards.js` (Red Onion, Browns — new `textRestaurantHtml()` template added this round for no-photo restaurant cards; also where the shared Scotland end card lives). Each takes `--pinterest` for the 2:3 set.
- **Pipeline fix this round:** the photo-overlay watermark ("GF GONE GLOBAL") was nearly invisible against light-colored backgrounds (first noticed on the Mural Trail photo). Added a subtle text-shadow — fixed system-wide, including on the already-pushed Portree slides, which were re-rendered and will show the improved watermark too.

## Explicitly NOT part of this post

- **Bella Italia, Blue Lagoon Fish & Chips** — both visited, both have GF scores, neither has a photo. Considered adding as more text-only cards; decided two strong 5/5 text cards (Red Onion, Browns) beats four mixed-score ones. Available if Kelly wants a denser version later.
- **Merchant Square** — researched, not visited; its one photo is being used for the Mural Trail slide instead (see above). No separate Merchant Square card.
- **George Square, Buchanan Street** — visited landmarks, no photos available at all.
- **GF Gem / Bookable Experience / Key Phrases card types** — same reasoning as Portree: no qualifying dedicated-GF venue beyond Browns/Red Onion (both already used as the restaurant slides), no Viator-linked tour in the guide, Scotland is English-speaking.
