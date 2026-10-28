# Handoff: Scotland Packing List (celiac edition)

**Status: Images complete.** Built to `specs/scotland-packing-assets.md`. Kelly approved the checklist design and every asset here on 2026-10-27. **Deliverable 2 (the celiac-edition pin) is cut on purpose.** Kelly felt four short lines didn't tell anyone anything useful, and the GF snacks pin is the more informative celiac pin. **Before posting, review `REVIEW.md`:** Kelly asked Moose and Claude to review this set for gaps. It has one must-fix (slide 5 overclaims "shopping links for everything"), open questions and paste-ready alt text. This carousel has no caption yet. Moose writes it and Kelly approves it before anything posts.

## Instagram carousel (4:5, 1080×1350), in `instagram/exports/`

| # | Slide | Filename | 4:5 | 2:3 copy | Notes |
|---|---|---|---|---|---|
| 1 | Cover | `gfgoneglobal-scotland-packing-01-cover.png` | 1.9M | — | An Corran Beach, Skye (Kelly's photo, IMG_9301). "Celiac Edition" label + "What to Pack for Scotland". 4:5 only. |
| 2 | GF Snacks & Essentials | `gfgoneglobal-scotland-packing-02-snacks.png` | 1.3M | 1.3M | Moose's 8 items, plus an intro line adapted from the Scotland page. Also exported at 2:3 for Pinterest. |
| 3 | Clothing & Weather | `gfgoneglobal-scotland-packing-03-clothing.png` | 1.3M | 1.4M | From the Scotland page's weather and hiking items, waterproofs first, with the page's own wording as notes. Also at 2:3. |
| 4 | Travel Essentials | `gfgoneglobal-scotland-packing-04-travel.png` | 1.3M | 1.3M | Moose's 3 items, plus the documents tip from the page. Also at 2:3. |
| 5 | Full list in the guide | `gfgoneglobal-scotland-packing-05-cta.png` | 1.3M | — | "The full list — with shopping links for everything — is in the Scotland guide" + gfgoneglobal.com/countries/scotland. 4:5 only. |
| 6 | Scotland end card | `gfgoneglobal-scotland-end-card.png` | 493K | — | Existing shared country end card (`gfgoneglobal-scotland-end-card.png`), same file as Portree/Glasgow/Fort William. Not re-rendered. |

## Pinterest pins (2:3, 1000×1500), in `instagram/exports/pinterest/`

| Pin | Filename | Size | Notes |
|---|---|---|---|
| Checklist pin (deliverable 1) | `gfgoneglobal-scotland-packing-checklist.png` | 1.4M | All three groups. Clothing names are shortened for two columns. Links to the Scotland guide. |
| Snacks / Clothing / Travel | `gfgoneglobal-scotland-packing-02-snacks.png`, `gfgoneglobal-scotland-packing-03-clothing.png`, `gfgoneglobal-scotland-packing-04-travel.png` | — | 2:3 re-renders of carousel slides 2–4, per the spec's "Pinterest reuse" criterion. |
| ~~Celiac-edition pin (deliverable 2)~~ | none | — | **Cut by Kelly 2026-10-27:** too thin to be useful. Use the GF snacks pin for celiac-focused Pinterest posts. |

## Notes

- **The "coeliac" line** was written for the cut celiac pin. It still lives on the Scotland page's "Is Scotland safe for celiacs?" FAQ, added 2026-10-25.
- **New card types:** `checklist` and `cta` (cream "packing slip" design matching the cream text-restaurant cards), both in `instagram/scripts/lib/templates.js`. `render.js` gained a per-card `ratios` option, so pins render only at 2:3 and the cover and CTA only at 4:5.
- **Items not included:** the UK power adapter isn't on any card, because Moose's travel list didn't include it. Compact umbrella and midge repellent are in Clothing & Weather because the Scotland page lists them with the rain gear.
- **Regenerate:** `node instagram/scripts/render.js scotland-packing`. The spec is `instagram/carousels/scotland-packing.json`.
