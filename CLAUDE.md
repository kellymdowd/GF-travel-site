# CLAUDE.md — Frontend Website Rules

## Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.

## Project Structure
- **Data source:** `travel_master.xlsx` — the single source of truth for all places, hotels, restaurants, GF scores, coordinates, and visit history. Read with Node.js `xlsx` package (installed in `node_modules/`).
- **Maps registry:** `map downloads/maps_registry.json` — index of all Google My Maps (local KML files + Google Maps IDs).
- **City pages:** `countries/[country]/[city].html` — self-contained HTML with inline CSS/JS.
- **Photos:** `photos/[country]/[city]/[place-name]/` — exported from Apple Photos, organized by place. Each city folder has a `photo_manifest.json`.
- **Python venv:** `.venv/` — Python 3.13 virtual environment with `osxphotos` installed. Activate with `source .venv/bin/activate`. Note: `osxphotos` requires Full Disk Access; use AppleScript as fallback for Photos access.
- **Node.js:** `/opt/homebrew/bin/node` — always set PATH before running Node scripts.

## Visited vs. Researched Places
- The `actually_visited` column in the spreadsheet tracks whether a place was visited (1), not visited (0), or unknown (empty).
- On city pages, visited places show a rose-colored "Went here" indicator; others show "Traveler recommended" in light gray.
- This indicator appears on both restaurant cards (between cuisine and GF score) and landmark cards (after location).

## Packing Section Order
- Always list Essential items first, then city-specific items.

## Brand Assets
- Always check the `brand_assets/` folder before designing. It may contain logos, color guides, style guides, or images.
- If assets exist there, use them. Do not use placeholders where real assets are available.
- If a logo is present, use it. If a color palette is defined, use those exact values — do not invent brand colors.

## Anti-Generic Guardrails
- **Colors:** Never use default Tailwind palette (indigo-500, blue-600, etc.). Pick a custom brand color and derive from it.
- **Shadows:** Never use flat `shadow-md`. Use layered, color-tinted shadows with low opacity.
- **Typography:** Never use the same font for headings and body. Pair a display/serif with a clean sans. Apply tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
- **Gradients:** Layer multiple radial gradients. Add grain/texture via SVG noise filter for depth.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Use spring-style easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states. No exceptions.
- **Images:** Add a gradient overlay (`bg-gradient-to-t from-black/60`) and a color treatment layer with `mix-blend-multiply`.
- **Spacing:** Use intentional, consistent spacing tokens — not random Tailwind steps.
- **Depth:** Surfaces should have a layering system (base → elevated → floating), not all sit at the same z-plane.

## Hard Rules
- Do not add sections, features, or content not in the reference
- Do not "improve" a reference design — match it
- Do not stop after one screenshot pass
- Do not use `transition-all`
- Do not use default Tailwind blue/indigo as primary color