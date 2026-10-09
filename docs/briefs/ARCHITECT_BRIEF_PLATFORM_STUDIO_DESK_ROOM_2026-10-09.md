# IMPLEMENTATION BRIEF — AJ Studio Desk page inside the AJ AI Studio Platform

**Repo:** `ajax-click-ai-v1-ui` (AJ AI Studio Platform, Next.js). This is **not** the AJ Studio Desk repo.
**Author:** Claude (architect/verifier), 2026-10-09, on Ko Htoo's instruction. **Executor:** Anti. Claude verifies, commits and deploys. Anti does not commit.
**Start condition:** Build the page now, with empty slots where the real screenshots will go. The **Try Demo** and **Sample site** buttons go live only after AJ Studio Desk Phase 1.5 (public demo) is deployed. Until then they show "Demo မကြာမီ ဖွင့်ပါမည်" and the contact CTA.

---

## Why this page is different from the other products

Ko Htoo's decision: Event Photo and Ward each have their own standalone landing page. **AJ Studio Desk does not.** It runs on, and is sold from, the AJ AI Studio Platform. So its page lives **inside the platform**, and it must make three things obvious to a studio owner who knows nothing about software:

1. **Try it yourself.** A live demo they can click into today.
2. **The website your customers will use.** The pages the studio's own customers will see (booking, payment, digital pass, photo delivery, shop), shown as real pages, not described in words.
3. **Your own domain.** What a domain is, what theirs could look like, and how it is set up for them.

The page answers "what do I actually get, and what will my customers see?" A feature list does not answer that.

## Step 0 — validate against the repo first (report before building)
- Find what already exists for AJ Studio Desk in this repo: the Showroom / `/software` product card, any `ARCHITECT_BRIEF_STUDIO_DESK_ROOM_2026-09-18.md`, and any Studio Desk room or route. Report: Expected / Actual / Conflict.
- Reuse the `/software` theme and the existing design system (the platform has one landing page; this is a sub-page, not a second landing page).
- Route: `/software/studio-desk` (or extend the existing Studio Desk route if one exists). Public, no login. The `/software` card for AJ Studio Desk links here instead of to an external site.

## Page structure (top to bottom)

### 1. Hero
- One line in Burmese saying what the studio gets: online booking, payment check, counter sales and daily cash report, and their own website, all in one place.
- Two buttons: **Try Demo** (primary) and **Contact** (Messenger / Telegram pre-filled, same as `/software`).
- A device mock showing the real admin desk screenshot.

### 2. "Your customers will see this": the client website
- A browser-frame carousel of the **real customer-facing pages** (from AJ Studio Desk's `npm run demo:capture`, desktop + mobile pair for each):
  1. Studio home page with packages and showcase photos
  2. Booking calendar with time slots
  3. Payment slip upload and the confirmation result
  4. Digital pass (customer's booking ticket with QR)
  5. Photo delivery vault (customer downloads their photos)
  6. Retail shop (frames, albums, extras)
- Under each, one Burmese sentence on what the **customer** does there and what the **studio** saves (e.g. fewer phone calls, no checking slips by hand).
- Button: **Sample site ကို ဖွင့်ကြည့်ရန်** opens the permanent sample studio site (`/s/<sample-slug>` on the demo deployment) in a new tab, so they can tap around it on their own phone.
- A phone mock with a QR code to the same sample site, so a visitor on a laptop can open it on their phone.

### 3. "Your own domain"
- Plain explanation in 2 sentences: a domain is the address customers type (e.g. `yourstudio.com`), and the studio's booking website runs on it.
- **Live preview field:** the owner types their studio name or a domain idea. The browser-frame mock updates to show `https://<what they typed>` above their studio name on the sample home page. There is no purchase and no live availability check on this page.
- How it works, matching Ko Htoo's domain policy:
  - The domain is bought **for the studio** once they confirm the service; Ko Htoo's team handles purchase and setup.
  - Domains renew **yearly**; the renewal is a yearly fee.
  - Before the domain is live, the site already works on a link from the platform.
- **No prices anywhere on this page** (standing Showroom rule). Pricing is handled through the contact CTA.
- If the visitor typed a domain idea and then clicks Contact or Try Demo, pass it along (`?domain=` → pre-filled message text, and into the demo sign-up `source` / notes) so Ko Htoo sees it in the lead.

### 4. "How you get started": 4 steps
1. **Try Demo**: use the system as your own studio for 7 days
2. **Talk with us**: package, domain name and setup
3. **Fill the setup form**: logo, packages, payment accounts, rooms. This is AJ Studio Desk's existing owner setup portal (`/setup/<token>`); show one real screenshot of it.
4. **Go live**: your website on your own domain, and the desk ready for your staff

### 5. What the studio team uses (short)
- 3 cards with real screenshots: Admin booking desk, POS counter + receipt, Daily Z-Report. One Burmese sentence each. This section stays short because the demo is where they learn it.

### 6. Closing CTA
- Repeat **Try Demo** + **Contact**.

## Copy and content rules (Ko Htoo's standing rules)
- Reads like an ad for what the studio and its customers experience. Never describe the method: no AI/model names, no "OCR", no database, hosting, Supabase, VPS, or tech stack.
- Formal Burmese for sentences. Short labels and buttons stay English only: Try Demo, Contact, Booking, POS, Z-Report, Domain, Sample site, etc.
- No anti-AI buzzwords (no "seamless", "elevate", "unlock", …) and no "not just X, it's Y" sentences.
- Product name exactly **AJ Studio Desk**.
- Real screenshots only. No mockups that do not match the product. Until the capture images exist, use clearly empty slots with an "image coming" label; never a fake UI.
- Mobile-first: most studio owners will open this from Facebook on a phone.

## Dependency added to AJ Studio Desk (Phase 1.5, Part E)
- A **permanent sample studio** tenant on the demo deployment (never expires, read-only for the public, reset nightly). It powers the "Sample site" button and the QR code. Claude adds this to the Phase 1.5 brief.

## Acceptance gates
1. Step 0 report (what existed, what you reused)
2. `tsc` / lint / build pass for `ajax-click-ai-v1-ui`
3. Screenshots of the page at 390 px (phone) and 1440 px (desktop), every section
4. The domain preview field works, and the typed value reaches the Contact message text
5. With Phase 1.5 not yet live: Try Demo / Sample site show the "coming soon" state, never a broken link
6. Copy check: grep the page for `AI|OCR|Gemini|Supabase|server|database|Ks|ကျပ်` → no matches in visible text

Report: **Changed / Implemented / Verified (gates 1–6 + screenshots) / Remaining**. Do not commit.
