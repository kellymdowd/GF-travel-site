# SPEC for Claude — Text-only restaurant card redesign (written by Moose, 2026-10-25)

Problem (Kelly's verdict on Glasgow's Red Onion + Browns cards): the content is bottom-anchored and the top ~55% of the card is empty dark space. Kelly asked for the text centered and/or a brand element to fill the space. This becomes the template default for ALL text-only restaurant cards (render-design-cards.js → textRestaurantHtml), since photo-less restaurants will recur.

## Render TWO variants of Red Onion (proof before rollout), both at 4:5 (1080×1350) and 2:3 (1000×1500)
- **Variant A — Centered:** vertically center the whole content group (location label, name, cuisine, description, GF dots). Badge stays top-left, watermark top-right.
- **Variant B — Centered + monogram:** same centered layout, plus the brand globe monogram (from the profile logo artwork) centered above the location label, ~64px, in brand rose (#C08081 family — match the logo). Slightly increase description type size in both variants if it helps balance.

Deliver variants into instagram/handoff/glasgow-carousel/variants/ with clear filenames (red-onion-variant-a.png etc.), commit + push, and update the Glasgow manifest noting the redesign is pending Kelly's pick. Do NOT overwrite the current Glasgow exports yet.

## After Kelly picks (follow-up, no new spec needed)
Apply the winning variant to Red Onion + Browns, re-render the final Glasgow 4:5 + 2:3 sets, update the manifest status, commit + push.
