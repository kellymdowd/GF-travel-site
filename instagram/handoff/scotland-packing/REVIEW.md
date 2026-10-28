# Scotland packing set: review request for Moose

**From Claude, 2026-10-27, at Kelly's request.** Kelly asked us both to review this set thoroughly for anything missing or wrong before it posts. My review is below. Please do your own pass against `specs/scotland-packing-assets.md` and the "What to Pack" section of `countries/scotland.html`, add your findings under "Moose's review", and flag anything Kelly needs to decide.

Assets and filenames are in `MANIFEST.md`. The celiac-edition pin is cut on purpose (Kelly: four short lines aren't useful).

## Claude's review

### Must fix before posting

1. **Slide 5 overclaims.** Its line "The full list — with shopping links for everything — is in the Scotland guide" (copy from the spec) isn't true. On the Scotland page, "Layers, layers, layers", "Midge repellent" and the compact umbrella have no shop link; `PACKING_LINKS_NEEDED.md` says midge repellent stays unlinked by Kelly's choice. Suggested fix: **"The full list — with shopping links — is in the Scotland guide."** One-word change; I'll re-render as soon as Kelly or you confirm the wording.

### Worth considering (Kelly's call)

2. **The UK power adapter (Type G) is missing.** The Scotland page lists it under Scotland-Wide Essentials, and every non-UK visitor needs one. It would fit on slide 4 (Travel Essentials, which only has 3 items) and the checklist pin. It wasn't in the spec's Group 3, so I left it out.
3. **Hiking boots and midge repellent read as universal.** On the page, both are optional and sit under "Hiking & Outdoor Essentials" ("skip this section if you're not planning to hike"). The slide notes (Ben Nevis, the Quiraing, the Fairy Pools; May–September) give the context, so probably fine. Mention hiking in the caption if you want to be explicit.
4. **Other items on the page but not in the set:** portable charger and multi-device cable, travel medicine (Advil, Benadryl, Dramamine), packing cubes and flight essentials. The spec scoped the set to three groups, so I'd leave them for the guide. Noting them so it's a deliberate choice.

### For the caption and pin descriptions

5. **Affiliate disclosure.** The guide's packing links are Amazon Associates affiliate links (plus lululemon/On). The caption and each pin description should disclose that, e.g. "Some links in the guide are affiliate links."
6. **Pin destination.** Link pins to `https://gfgoneglobal.com/countries/scotland#packing` (the packing section has `id="packing"`) so people land on the list, not the top of the page.
7. **Voice.** Per `brand_assets/voice-and-tone.md` and Kelly's notes: don't tell readers to "bring a celiac dining card" as a flat instruction (she rarely uses one), and make no visa or Schengen claims in documents copy.

### Checked and fine

- Every item on slides 2–4 and the checklist pin appears on the Scotland page, and every slide note uses the page's own wording ("It will rain, even in July", "Cobblestones, hills, cathedral steps", "Tap water is safe and excellent throughout Scotland").
- **Cover:** An Corran Beach is Kelly's photo (IMG_9301) of a place she visited. The only people are distant and unidentifiable. No stock photos anywhere.
- Both ratios are true re-renders. The 2:3 copies of slides 2–4 fill the frame with no cropping.
- **Deviation from the spec:** slide 6 uses the shared `gfgoneglobal-scotland-end-card.png` instead of `-06-end.png`, so all Scotland carousels share one file.

## Alt text (paste-ready)

| Asset | Alt text |
|---|---|
| 01 cover | Mossy green rocks and tide pools below dark basalt cliffs at An Corran Beach on the Isle of Skye, with the title "What to Pack for Scotland, Celiac Edition." |
| 02 snacks | Checklist titled "GF Snacks & Essentials": KIND protein bars, Simple Mills cheddar crackers, tamari packets, peanut butter packets, instant GF noodles, GF mac and cheese, electrolytes, nuts and crunchy snacks. |
| 03 clothing | Checklist titled "Clothing & Weather": packable rain jacket, compact umbrella, layers (t-shirt and light fleece), comfortable walking shoes, waterproof hiking boots, midge repellent, each with a short note on why. |
| 04 travel | Checklist titled "Travel Essentials": RFID card wallet, passport holder and organizer, reusable water bottle, plus a tip to photograph your passport and cards and leave a copy with someone at home. |
| 05 CTA | Text card: the full packing list, with shopping links, is in the Scotland guide at gfgoneglobal.com/countries/scotland. |
| 06 end card | Map of Scotland marking the cities in the GF Gone Global guide, with "Thanks for following along." |
| Checklist pin | One-page checklist "What to Pack for Scotland" in three groups: GF snacks and essentials, clothing and weather, and travel essentials. |

(If slide 5's wording changes, update its alt text to match.)

## Moose's review

_Add findings here: anything missing, wrong or worth Kelly's decision. Claude will re-render on request._
