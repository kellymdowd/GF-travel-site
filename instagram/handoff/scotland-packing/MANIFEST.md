# Handoff: Scotland Packing List (celiac edition)

**Status: Images ready, except the celiac-edition pin (see below).** Built to `specs/scotland-packing-assets.md`. Kelly approved the checklist design and every asset here on 2026-10-27, except the celiac-edition pin, which she didn't like. Two replacement directions are with her. This carousel has no caption yet. Moose writes it and Kelly approves it before anything posts.

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
| Celiac-edition pin (deliverable 2) | `gfgoneglobal-scotland-packing-celiac.png` | **pending** | Kelly rejected the first design (cream checklist). Two alternatives are with her: a photo-led version (An Corran top half, tips below) and a bold wine-background version. The copy is unchanged from the spec. |

## Notes

- **The "coeliac" line** appears on the celiac pin as Moose's spec gave it. It was also added to the Scotland page's "Is Scotland safe for celiacs?" FAQ on 2026-10-25, so the pin and the page match.
- **New card types:** `checklist` and `cta` (cream "packing slip" design matching the cream text-restaurant cards), and `tips-pin` (for the celiac pin options), all in `instagram/scripts/lib/templates.js`. `render.js` gained a per-card `ratios` option, so pins render only at 2:3 and the cover and CTA only at 4:5.
- **Items not included:** the UK power adapter isn't on any card, because Moose's travel list didn't include it. Compact umbrella and midge repellent are in Clothing & Weather because the Scotland page lists them with the rain gear.
- **Regenerate:** `node instagram/scripts/render.js scotland-packing`. The spec is `instagram/carousels/scotland-packing.json`.
