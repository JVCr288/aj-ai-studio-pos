# IMPLEMENTATION BRIEF — Phase 1.5: Official rename to "AJ Studio Desk" + Public Demo

**Repo:** `Aj AI Studio POS` (AJ Studio Desk), branch `feat/retail-category-expansion`
**Author:** Claude (architect/verifier), 2026-10-09, on Ko Htoo's instruction. **Executor:** Anti. Claude verifies, commits and deploys. Anti does not commit.
**Start condition:** Begin **only after Phase 1 (Production Foundation) is verified and committed.** Phase 1 creates `DEMO_MODE`, per-tenant login and the POS tables this brief builds on. Starting earlier would cause merge conflicts with your in-flight Phase 1 edits.
**Supersedes one Phase 1 detail:** Phase 1 let `DEMO_MODE` keep the old in-memory seed staff/catalog. This brief replaces that with real tenant provisioning (Part B). After this brief, `DEMO_MODE` uses the same DB-backed code paths as production, and no in-memory demo store remains.

Ko Htoo's four decisions (the 4th, Burmese "?" help tips, is Part D):
1. The system's official name is **AJ Studio Desk** everywhere a person can see it.
2. Before any client gets the system, an interested studio owner can **see the real UI first**, then **click into a live Demo** and try it themselves.
3. The platform keeps a record of every demo visitor (account and name) for marketing follow-up.

---

## Part A — Official rename

### Rename (visible text and project metadata)
- `index.html` `<title>` → `AJ Studio Desk — Studio Booking & POS`
- `metadata.json` `name` → `AJ Studio Desk`
- `package.json` `name` → `aj-studio-desk`
- Every user-visible string that says "AJ AI Studio POS", "AJ AI Studio Platform", "AJ AI Studio" **as the product name**: `Navbar.tsx`, `Footer.tsx`, `AdminLoginModal.tsx`, `StudioUserGuideModal.tsx`, `StandaloneOwnerPortal.tsx`, `SettingsModal.tsx`, `StudioOnboardingScreen.tsx`, `EquipmentInventoryScreen.tsx`, `PosReceiptModal.tsx`, `escPosPrinter.ts` receipt footer ("Powered by AJ Studio Desk"), `ocr.routes.ts` prompt text, `health.routes.ts` service name, `server.ts` boot log.
- Docs: `README.md`, `USER_MANUAL.md`, `PROJECT_BRIEF.md`, `HANDOFF.md`, `FYI.md` → product name AJ Studio Desk. Old `docs/briefs/*` stay as written (historical record).
- `src/config/platformConfig.ts`: the product/platform display name.

### Do NOT rename (data keys — renaming breaks saved data)
- Tenant IDs and slugs: `aj-ai-studio`, `nocturne`, `neutral-studio-tenant`, `akk-photo-studio`. These are database/tenant keys, not the product name. `tenantConfig.ts` may change a tenant's **display name** only.
- Database table/column names, migration files, env var names.
- `localStorage` keys (`aj_pos_*`, etc.). If you think one must change, add a one-time read-old-write-new migration in `src/utils/legacyStorageMigration.ts`; never just rename.
- The GitHub repo name and the local folder name. Ko Htoo renames those himself later (GitHub keeps a redirect).

### Check
`grep -rniE "AJ AI Studio POS|AJ AI Studio Platform" src index.html metadata.json package.json README.md USER_MANUAL.md` → no matches. Update tests that assert the old strings.

---

## Part B — Public Demo ("see the real UI, then try it")

### The visitor's path (what this must deliver)
1. The visitor lands on the AJ Studio Desk card on the Showroom (`/software` in the AJAX CLICK web app, a separate repo with a separate brief, not this one).
2. They see **real screenshots / a short screen recording** of the actual product: the customer booking page, the slip check result, the admin booking desk, the POS desk with a receipt, and the Z-Report.
3. They click **Try Demo** and land on `https://<demo host>/demo`, which this repo provides.
4. From the demo they can contact Ko Htoo (Messenger / Telegram, same CTA as the Showroom).

### `/demo` entry page (new, in this repo)
- Step 1 is a short **Demo sign-up** (Part C below). Only after it does the visitor see the role picker.
- Step 2 is one screen with a short intro and **three role buttons**:
  - **Customer**: opens the booking flow as a customer of the demo studio.
  - **Studio Admin**: opens the real admin login with the visitor's own credentials pre-filled (see "Real flows").
  - **Cashier (POS)**: opens the real POS PIN pad, with the demo staff PINs shown in a hint card (including a Manager PIN) so visitors can try override flows.
- The visitor can switch roles any time from the navbar without signing up again.
- Copy: formal Burmese for the explanatory sentences; short labels and buttons stay English only (Try Demo, Customer, Studio Admin, Cashier, Reset, Back). Sell what the studio gets (faster bookings, fewer payment mistakes, a clean daily cash report). Do **not** describe internals: no AI model names, no "OCR", no database, no hosting.

### Ko Htoo's rule for the demo: it must feel like the real product
A visitor should come away thinking "this is my studio's system", not "this is a toy". So the demo is **the production code running for real**, with only the entry, seeding and cleanup added. No mock screens, no fake loaders, no separate "demo version" of any page.

### How: each visitor's sandbox is a real tenant (non-negotiable isolation)
- Runs only when `DEMO_MODE=true`, on its **own deployment**. Its database connection points at a dedicated **`demo` Postgres schema** (same Supabase project, `search_path=demo`, see Part C). The full Phase 1 table set is created there by the same Drizzle migrations. The demo can never reach real studio tables; the DB role has no grant outside `demo`.
- On sign-up, the server **provisions a real tenant** for that visitor (`tenant_id = demo-<random>`), creates a real admin user and real POS staff for it, and seeds it. From then on every request goes through the **normal Phase 1 code paths**: real login sessions, real tenant scoping, real `pos_transactions` rows, real SSE. This is also a live, continuous proof that tenant isolation works.
- The sandbox **persists for 7 days** after the visitor's last activity, tied to their `lead_id`. A returning visitor (same cookie or same phone) gets **their same studio back**, with the bookings and sales they made last time. After 7 idle days a nightly job deletes the tenant and all its rows. Cap: 300 live sandboxes; over the cap, the longest-idle is removed first. Check row counts and DB size against the Supabase free-tier limit and report the numbers.
- **Reset** (in Settings, not on every screen) reseeds the visitor's studio from scratch.

### Make it the visitor's own studio
- The **studio name typed at sign-up becomes the tenant's studio name** everywhere: navbar, booking page header, receipts, Z-Report header, customer booking link.
- Optional in Settings: upload their own logo; it appears on the booking page and receipt immediately (resize client-side; store in the demo bucket, max 500 KB).
- The customer booking link shows as their own URL path (e.g. `/s/<their-studio-slug>`), so they can open it on their phone and book like a real customer would.

### Seed data that looks lived-in
- Myanmar studio content: realistic package names and MMK prices (e.g. Wedding Pre-shoot, Graduation, Family Portrait, Newborn), realistic Burmese and English customer names, Yangon/Mandalay phone formats. Make it generic studio data, not Ko Htoo's own studio.
- **30 days of history**, generated relative to "now" at seed time: past bookings in every status, past POS sales with a realistic daily pattern (busier weekends), closed shifts with Z-Reports including one small shortage and one overage, a few cash drops. Reports and metric cards must show real-looking numbers on first open, never empty zeros.
- **Today and the next 14 days** already have bookings at real times, so the calendar and availability conflicts behave like a busy studio.
- Retail catalog with stock counts, including 2 low-stock items.
- Seed is deterministic per tenant (seeded random from `tenant_id`), so tests are stable.

### Real flows, end to end
- **Real login.** The Studio Admin button opens the real login screen with the visitor's credentials **pre-filled**, and they press Login themselves. The Cashier button opens the real PIN pad, and the demo PINs are shown in a small hint card beside it.
- **Real realtime.** If the visitor opens the customer booking link on their phone (or a 2nd tab) and books, the booking appears on the admin desk live through SSE, with the same notification sound and badge a real studio gets. Put one line on the role picker inviting them to try this ("ဖုန်းနဲ့ Booking တင်ကြည့်ပြီး Admin desk မှာ ချက်ချင်း ပေါ်လာတာကို ကြည့်ပါ").
- **Real payment slip check.** Uploading a slip runs the real Gemini check, with the same result screen as production. The 3 sample slips (correct amount / wrong amount / reused) are offered as a convenience for visitors without a slip at hand. Abuse cap: 10 real checks per sandbox per day and 30 per IP per day. Past the cap, use the sample-slip path silently, with guidance wording and never "Error". Do not store uploaded slip images in the demo; keep the extracted fields only.
- **Real receipt.** The receipt preview is the real 58/80 mm thermal layout. A Print button sends it to the visitor's own printer through the browser print dialog. If they have a USB thermal printer, it prints for real.
- **Cash drawer / barcode scanner.** The drawer kick shows the same "Drawer opened" toast production shows when no drawer is attached. Barcode: a USB scanner works for real (wedge input). Without one, typing a SKU + Enter behaves identically.
- **Telegram notifications:** if the visitor connects their own Telegram in Settings, notifications go to them for real. Otherwise the panel shows what would be sent.

### What still marks it as a demo (honesty, kept minimal)
- No full-width banner. One small **"Demo"** chip in the navbar corner. Its tooltip says "ဒီ Demo ဆိုင်ကို ၇ ရက်အတွင်း ပြန်ဝင်ကြည့်နိုင်ပါသည်" and shows the contact CTA.
- No real money moves and no real customers exist. Seed names are realistic but invented. Do not use real people's or real studios' names.

### Real UI material for the Showroom
- Add `npm run demo:capture`, a Playwright script (add `@playwright/test` as a devDependency) that runs the demo locally and saves fixed-size screenshots (desktop 1440×900, plus mobile 390×844 for the booking flow) of the 5 screens listed in step 2 to `docs/showroom-capture/`.
- These images are what the Showroom brief will use, so the Showroom always shows the **real current UI**, never a mock.

---

## Part C — Demo visitor records (for marketing follow-up)

Ko Htoo's decision: the platform must keep a record of **who used the demo** (account and name) so he can follow up.

### Demo sign-up form (before the role picker)
- Fields:
  - **Name**: required.
  - **Phone**: required. Myanmar numbers (`09…` or `+959…`). Validate loosely; normalize to `+959…` on save.
  - **Studio name**: required.
  - **City**: optional.
  - **Telegram / Messenger / Viber handle**: optional; one free-text field plus a "best way to reach you" choice.
- One consent line, checked by default but visible: "AJ Studio Desk အကြောင်း ဆက်သွယ်ပြောပြခွင့် ပြုပါသည်။" Store the consent value and timestamp.
- Keep it light (Ko Htoo's rule: gates must not feel strict). Use 3 required fields and no OTP. Show the guidance text under the field, never "Error". A returning visitor (cookie `demo_lead_id`, 90 days) skips the form and goes straight to the role picker with "Welcome back, <Name>".
- Same phone signing up again → update the existing lead and count it as a new visit, not a duplicate row.

### What is recorded
- `demo_leads`: id, name, phone (normalized, unique), studio_name, city, contact_handle, preferred_channel, consent, consent_at, first_seen_at, last_seen_at, visit_count, source (`utm_source` / `ref` query param, e.g. `showroom`), user_agent summary (browser + device type only).
- `demo_activity`: lead_id, sandbox_id, event (`DEMO_STARTED`, `ROLE_OPENED:customer|admin|cashier`, `BOOKING_CREATED`, `SLIP_CHECKED`, `POS_SALE`, `Z_REPORT`, `RESET`, `CONTACT_CLICKED`), created_at. Store events only, never the content the visitor typed inside the sandbox.
- Each sandbox is linked to its `lead_id`, so a lead's activity shows how far they got. That is the follow-up signal.
- Do not store IP addresses beyond what the rate limiter needs in memory.

### Where it is stored
- These two tables persist permanently. Sandbox tenants are deleted after 7 idle days; leads and activity are never deleted. Put them in the dedicated **`demo` Postgres schema** inside AJ Studio Desk's existing Supabase project (`demo.demo_leads`, `demo.demo_activity`). This avoids a 3rd Supabase project (free-tier cap is 2). The demo deployment's DB role may access **only** the `demo` schema, never the real tenant tables. Add that grant to the migration.
- Generate the migration with Drizzle (`pgSchema('demo')`).

### Ko Htoo's view (Founder-only)
- `/demo/leads`: protected by `ADMIN_API_KEY` as a platform-ops route. Never reachable by a demo session or a studio tenant.
- It shows a table sorted by `last_seen_at`. Columns: name, studio, phone, channel, visits, furthest step reached (e.g. "made a POS sale + Z-Report"), first and last seen.
- **Export CSV** button.
- Optional instant alert: when env `DEMO_LEAD_TELEGRAM_CHAT_ID` is set, post one Telegram message per **new** lead (name, studio, phone, source) through the existing `telegramWebhook.ts`. If Telegram fails, the visitor's flow is unaffected.

### Out of scope
- Showroom page changes (separate brief for the `ajax-click-ai-v1-ui` repo once the demo URL exists).
- Deploying the demo host. Claude handles deploy after verification.
- Any Phase 2 feature or Phase 3 redesign work.

---

## Part D — "?" help tips with Burmese explanations

Ko Htoo's decision: AJ Studio Desk gets the same **"?" help icons with Burmese explanations** that his other products already have.

### Reuse, do not reinvent
- The pattern already exists in Ko Htoo's other products under `~/Documents/Products/`, in particular the Delivery ERP (**Sentinel Edge**, folder `Delivery စနစ် ERP`). Find that help-tip component and port it into this repo as `src/components/ui/HelpTip.tsx`, keeping the **same look and behavior** (icon, placement, open/close, mobile tap). Copy the code; do not import across repos. If two products implement it differently, follow Sentinel Edge.
- Claude has confirmed this repo currently has **no** help-tip component (no `HelpCircle` usage anywhere).
- Put all tip texts in one file, `src/content/helpTips.ts` (`{ id, mm, en? }`), so Ko Htoo can edit wording without touching components.

### Where the "?" goes (minimum coverage)
- **Admin booking desk:** each status (PENDING_REVIEW / CONFIRMED / IN_PROGRESS / COMPLETED / CANCELLED), payment review, Reschedule (explains the automatic clash check), Notes, the audit timeline.
- **Slip check result:** what each result means and what staff should do next (matched / amount differs / reused slip / unreadable).
- **POS desk:** Starting Float, Cash Drop, Cash In, Split payment, X-Report vs Z-Report, Shortage / Overage / Balanced, Manager override, offline indicator ("အင်တာနက် ပြတ်နေချိန် ရောင်းထားတာတွေ ပြန်ချိတ်မိတာနဲ့ အလိုအလျောက် ပို့ပေးပါမယ်").
- **Staff & PIN settings:** each role (Cashier / Lead Cashier / Studio Manager / Owner) and what it may do, PIN lock after wrong attempts.
- **Retail catalog:** SKU, stock count, low-stock, lead time.
- **Settings:** printer width 58 / 80 mm, cash drawer, barcode scanner, Telegram notifications, studio logo/name.
- **Demo:** the role picker and the sign-up form (why phone is asked: "AJ Studio Desk အကြောင်း ဆက်သွယ်ပြောပြနိုင်ရန်").

### Writing rules for the tip text
- Burmese, formal register (no "အစ်ကို"), 1–3 short sentences: what it is, and when or why to use it. Operation only.
- Short terms stay English only, without a Burmese rendering: Float, Cash Drop, X-Report, Z-Report, SKU, PIN, Split, Save, Cancel, etc. Burmese is for the explanation sentence.
- Never explain internals: no AI/model names, no "OCR", no database, server, SSE or hosting.
- Tone examples:
  - Z-Report: "ဆိုင်းပိတ်ချိန်မှာ ထုတ်ရတဲ့ နေ့စဉ်ငွေစာရင်း ရှင်းတမ်းပါ။ အံဆွဲထဲ ရေတွက်ရတဲ့ ငွေနဲ့ စနစ်က တွက်ထားတဲ့ ငွေ ကွာခြားချက်ကို ပြပေးပြီး ဆိုင်းကို ပိတ်ပါတယ်။"
  - X-Report: "ဆိုင်းမပိတ်ခင် လက်ရှိ ရောင်းရငွေကို ကြားဖြတ် စစ်ကြည့်ဖို့ပါ။ ဆိုင်းကို မပိတ်ပါဘူး။"
  - Cash Drop: "အံဆွဲထဲ ငွေများလာရင် Safe ထဲ ရွှေ့သိမ်းတာကို မှတ်တမ်းတင်ဖို့ပါ။ ၅၀,၀၀၀ ကျပ်ထက် ကျော်ရင် Manager PIN လိုပါတယ်။"

### Gate for Part D
- Every location in the coverage list has a working "?" (tap and click both work, closes on outside tap/Esc). List the tip ids in your report, and send Ko Htoo a screenshot of 3 of them (POS desk, slip result, Settings) for wording review.

---

## Part E — Permanent sample studio (for the Platform's AJ Studio Desk page)

- One extra tenant, `sample-studio`, on the demo deployment. It **never expires** and is reseeded every night at 03:00 Asia/Yangon with the same lived-in seed (Part B).
- Its customer website `/s/sample-studio` is public: home, packages, booking calendar, sample-slip payment, digital pass, delivery vault, and shop. A visitor can make a booking; it disappears at the nightly reseed.
- Its admin desk is **not** public. The admin experience is only through each visitor's own demo sandbox.
- This powers the "Sample site" button and QR code on the platform page (`ajax-click-ai-v1-ui` brief `ARCHITECT_BRIEF_PLATFORM_STUDIO_DESK_ROOM_2026-10-09.md`).
- Gate: `/s/sample-studio` loads on a phone without login, and a booking made there is gone after a forced reseed.

## Acceptance gates (report each separately)
1. `npx tsc --noEmit` → 0 errors; `npm test` → all pass (update renamed-string asserts; add tests 4–6 below)
2. Rename grep in Part A → no matches; tenant IDs unchanged (`grep -rn "'aj-ai-studio'" src` still finds the tenant key)
3. `npm run build && npm run build:server` succeed
4. Test: two sandboxes created back to back. A booking made in sandbox 1 is not visible in sandbox 2 (DB, API and SSE).
5. Test: with `DEMO_MODE` unset, `/demo` returns 404 and no tenant-provisioning route exists.
6. Test: the 11th real slip check in one sandbox on the same day falls back to the sample path (no Gemini call), with no "Error" text.
6a. Test: a fresh sandbox's dashboard shows non-zero 30-day revenue and today's bookings; the studio name equals the name typed at sign-up on the navbar, receipt and Z-Report.
6b. Test: returning with the same phone after 1 simulated day restores the same tenant with the visitor's own earlier sale; after 8 simulated idle days the cleanup job removes the tenant's rows but keeps the lead.
6c. Manual: book from a phone on `/s/<slug>` → appears live on the admin desk with sound.
7. `npm run demo:capture` produces the screenshots; attach them to your report.
8. Test: sign up → `demo_leads` row exists with normalized phone; sign up again with the same phone → still 1 row, `visit_count` = 2.
9. Test: making a POS sale in the sandbox writes a `POS_SALE` row to `demo_activity` for that lead.
10. Test: `/demo/leads` without `ADMIN_API_KEY` → 401; with a demo session cookie → 401; CSV export returns all leads.
11. Test: the demo DB role cannot `SELECT` from a real tenant table (permission denied).

## Report-back format (short)
**Changed** (files) / **Implemented** (Part A, B, C, D items) / **Verified** (gates 1–11 with output lines + screenshots) / **Remaining or conflicts**. Do not commit.
