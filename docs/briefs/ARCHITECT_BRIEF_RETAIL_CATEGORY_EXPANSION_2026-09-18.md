# IMPLEMENTATION BRIEF — Client Retail Shop: Add Apparel, Baby Accessories, Digital Products categories

**Repo:** `Aj AI Studio POS` (AJ Studio Desk)
**Author:** Claude, on Ko Htoo's direct instruction (2026-09-18) — writing this brief only, per the current usage-saving collaboration mode. Antigravity/Spark to execute; Claude to validate + verify against the live repo before merge.
**Status:** PROPOSED — ready to hand to Antigravity. No code written yet.

---

## Why this brief exists

Ko Htoo is having a cross-promotion Room built inside the AJAX CLICK AI STUDIO platform (see `ajax-click-ai-v1-ui`'s `docs/briefs/ARCHITECT_BRIEF_STUDIO_DESK_ROOM_2026-09-18.md`) that describes AJ Studio Desk's features to members in Burmese, including a line about managing retail merchandise sold to clients: **clothing/apparel, baby accessories, digital products, photo frames, and other retail items.**

**Repo reality check (done before writing this brief, per the standing rule of validating before promising):** a Client Retail Shop feature **already exists and is already wired in** — `src/components/ClientRetailShop.tsx`, rendered as the "Retail" tab inside `EquipmentInventoryScreen` (Screen 6, alongside the "Gear" tab). It already supports: product catalog with search/category filter, cart, SKU, stock/availability, bilingual (EN/MM) name+description, and lead time. Its current categories (`ClientProductCategory` in `src/types.ts`, seed data in `src/data/clientProductsData.ts`) are: `frames_canvas`, `photo_albums`, `storage_media`, `film_supplies`, `studio_merch`.

**The gap:** none of these five categories are apparel/clothing, baby accessories, or digital products. Ko Htoo wants those specifically callable-out in the member-facing copy, so the categories need to actually exist before that copy is honest. This brief is narrowly about closing that gap — extending an existing, working feature's taxonomy and seed data, **not building a new module.**

---

## Required behavior

### 1. `src/types.ts` — extend `ClientProductCategory`
Add three new category values to the existing union (keep all five existing ones unchanged):
```ts
export type ClientProductCategory =
  | 'frames_canvas'
  | 'photo_albums'
  | 'storage_media'
  | 'film_supplies'
  | 'studio_merch'
  | 'apparel'            // clothing/outfits sold to clients (NOT the existing equipment "wardrobe" rental category — that is a separate, unrelated concept in EquipmentCategory, do not conflate the two)
  | 'baby_accessories'   // baby/newborn session retail accessories sold to clients
  | 'digital_products';  // e.g. digital photo downloads, presets, wallpapers, licensed digital deliverables — Antigravity + Ko Htoo to confirm exact scope of what counts as a "digital product" here before seeding data
```
(Exact slug names are a judgment call — keep them consistent with the existing snake_case convention either way.)

### 2. `src/data/clientProductsData.ts` — extend `CLIENT_PRODUCT_CATEGORIES` and seed products
- Add three entries to `CLIENT_PRODUCT_CATEGORIES` (bilingual label, same shape as the existing five: `{ id, label, myanmarLabel }`).
- Add at least 2 to 3 sample `ClientProduct` entries per new category to `INITIAL_CLIENT_PRODUCTS`, matching the existing data shape exactly (id/name/myanmarName/category/priceMMK/stockCount/availability/sku/description/myanmarDescription/features/imageUrl/leadTime). Use placeholder/generic product concepts (e.g. a studio-branded baby wrap, a printed digital-download bundle) — Ko Htoo can replace with his real catalog later; do not invent real prices/stock as if they were his actual inventory, keep them clearly sample/demo-shaped.
- No component code in `ClientRetailShop.tsx` needs to change for this — it already renders categories/products generically off this data file (confirmed: no per-category icon or hardcoded category logic exists in that component).

### 3. Cross-reference: Demo/Sandbox instance (see the Room brief in `ajax-click-ai-v1-ui`)
The Room being built in the main platform links out to a public demo instance of this app. Once this category expansion lands, make sure that demo instance's seed data (whatever seeding path is used there) is regenerated/updated so a member clicking through the Retail tab in the demo actually sees products in all eight categories, not just the original five. Flagging this dependency so it isn't missed — this brief's data change and that demo instance are two different deploys of the same codebase.

---

## Do NOT change

- `EquipmentCategory` (in `src/types.ts`) or anything in `EquipmentInventoryScreen.tsx`'s "Gear" tab / `src/data/equipmentData.ts` — that is a separate, unrelated concept (internal studio asset tracking, not client retail sales) and already has its own `wardrobe` category that must not be confused with the new client-facing `apparel` category being added here.
- The `ClientRetailShop.tsx` component's logic/layout — this brief is data-and-types only.
- Cart, checkout, or invoice logic — out of scope.

## Data-state impact
Additive only: new enum values + new seed array entries. No migration of existing products, no schema change to the persistence layer beyond what a new union member requires (if `category` is persisted to Supabase/Postgres via Drizzle as a typed enum rather than a free-text column, check `drizzle/` migrations — a typed DB enum would need its own migration to accept the three new values; if it's stored as text/varchar, no migration is needed). **Antigravity must check this before assuming it's purely a frontend change.**

## Cost/wallet
None.

## Test cases
1. The Retail tab's category filter pills show all 8 categories (5 existing + 3 new) and filtering by each new category returns only that category's seeded products.
2. Cart/add-to-cart works unchanged for products in the new categories (regression check — no category-specific branching should exist that the new categories fall outside of).
3. `tsc` passes with the widened `ClientProductCategory` union (no exhaustive-switch code elsewhere in the codebase breaks by missing the 3 new cases — search for any `switch (category)` or category-keyed lookup object outside `clientProductsData.ts` that would need a matching case added).
4. If the category is persisted to a real Postgres enum type, confirm the write path (create/update product) does not silently fail for the 3 new values.

## Acceptance
`tsc` + `eslint` clean; all 8 categories browsable and filterable in the Retail tab with seeded sample data; no change to the Gear tab or the wardrobe equipment category; no regression on cart/checkout for existing categories.

## Stop-condition
If `category` turns out to be a strict Postgres enum type requiring a schema migration (not just a TypeScript union), **stop and report** rather than writing a migration unprompted — Ko Htoo should decide when/whether to run a production schema change, same as the standing rule for any other database migration.
