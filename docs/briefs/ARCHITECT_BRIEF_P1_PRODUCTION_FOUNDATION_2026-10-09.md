# IMPLEMENTATION BRIEF — AJ Studio Desk Upgrade, Phase 1: Production Foundation (P1)

**Repo:** `Aj AI Studio POS` (AJ Studio Desk), branch `feat/retail-category-expansion`
**Baseline commit:** `1bdca8a` (Claude committed the full v2.4.0 working tree on 2026-10-09: tsc clean, 10/11 suites green)
**Author:** Claude (architect/verifier), 2026-10-09. **Executor:** Anti. Claude verifies, commits and deploys. Anti does not commit.
**Upgrade order Ko Htoo approved:** Phase 1 Production foundation → Phase 2 New features → Phase 3 UI/UX redesign. This brief covers **Phase 1 only**. Do not start Phase 2 or 3 work.

---

## Ground rules (read first)

- **ROOT-CAUSE-FIRST.** Do not "patch → push → hope". Trace every item end to end (client → route → service → DB → SSE → client) before you call it done.
- **Smallest safe change.** Reuse existing services (`productionDatabaseAdapter`, `serverBookingService`, `ownerTokenService`, `crypto.ts`, `rateLimiters.ts`). Do not add new architecture beyond what this brief names.
- **Keep demo mode working.** The Showroom links a public demo. Add one explicit flag `DEMO_MODE=true` that keeps today's seed staff/catalog/in-memory behavior **for the demo tenant only**. Production (`DEMO_MODE` unset) must fail closed.
- **No secrets** in code, logs, docs, or your report. Refer to env vars by name only.
- If repo reality contradicts this brief, STOP and report: Expected / Actual / Conflict / smallest fix / files.

---

## What Claude verified in the live repo (2026-10-09)

| # | Severity | Finding | Where |
|---|---|---|---|
| F1 | **P0** | `/api/pos/transactions` (GET+POST) and `/api/pos/shifts` have **no auth**. GET with no `tenantId` returns **every tenant's** sales. POST accepts any client body, trusts client totals. | `src/server/routes/pos.routes.ts` |
| F2 | **P0** | POS transactions and Z-reports live in **in-memory arrays**. Server restart = all sales history lost. There is no POS table in the Drizzle schema. | `pos.routes.ts`, `src/db/schema/index.ts` |
| F3 | **P0** | SSE `/api/events/stream` has **no auth**; any caller picks any `tenantId`, and `tenantId=*` receives **all tenants' events** (booking, payment, POS totals). | `src/server/events/sseBus.ts` |
| F4 | **P0** | Admin login uses **one shared `ADMIN_API_KEY` for all tenants**; the caller chooses the tenant. Tenant list is hard-coded. Header fallback lets `x-tenant-id` pick any tenant. Dev default key `dev-admin-secret` is active whenever `NODE_ENV !== 'production'` (a deploy that forgets `NODE_ENV` is wide open). Admin sessions are in memory. | `src/server/middleware/auth.ts`, `src/server/routes/admin.routes.ts` |
| F5 | **P0** | Staff PINs (`1234`, `2345`, `9999`, `8888`) are **hard-coded in the client bundle**, plaintext, checked in the browser. Manager override is client-side only. No lockout. | `src/services/posStaffService.ts` |
| F6 | P1 | Slip OCR has **no duplicate-slip check**: the same transaction ID can verify multiple bookings. `expected_amount_mmk` comes from the client body. | `src/server/routes/ocr.routes.ts`, `booking.routes.ts` |
| F7 | P1 | Bookings, owner links/sessions and onboarding drafts **silently fall back to memory** when the DB fails. In production that hides data loss. | `serverBookingService.ts`, `ownerTokenService.ts`, `serverOnboardingService.ts` |
| F8 | P1 | `offlineQueueSync.test.ts` fails with `ECONNREFUSED :4000` unless a server is already running. | `src/tests/offlineQueueSync.test.ts` |
| F9 | P1 | `npm audit`: 7 vulns (1 critical `proxy-addr`, 1 high `source-map-js`, 5 moderate). All fixable without `--force`. | `package-lock.json` |
| F10 | P2 | Dockerfile uses deprecated `npm ci --only=production`; no `HEALTHCHECK`; no boot-time env validation. | `Dockerfile`, `server.ts` |

---

## Required changes

### 1. Persistence for POS (fixes F2) — do this first, everything else builds on it
- Add Drizzle tables in `src/db/schema/index.ts`:
  - `pos_transactions` — `id` (client UUID, text), `tenant_id`, `terminal_id`, `staff_id`, `order_reference`, `lines` (jsonb), `subtotal_mmk`, `discount_mmk`, `total_due_mmk`, `payments` (jsonb, supports SPLIT), `status`, `client_created_at`, `server_received_at`. **Unique `(tenant_id, id)`** so offline re-sync is idempotent.
  - `pos_shifts` — shift open/close, float, cash drops/cash-ins (jsonb or child table), Z-report snapshot, counted cash, discrepancy. Unique `(tenant_id, report_id)`.
  - `pos_staff` — `tenant_id`, `name`, `myanmar_name`, `role`, `pin_hash`, `badge_barcode_hash`, `is_active`, `failed_attempts`, `locked_until`.
  - `admin_users` — `tenant_id`, `username`, `password_hash`, `role` (`STUDIO_OWNER` / `STUDIO_ADMIN` / `STUDIO_STAFF` / `VIEWER`), `is_active`.
  - `admin_sessions` — hashed session token, tenant, user, csrf, expiry (sessions survive restart).
- Generate the migration with `npm run db:generate` (do not hand-write SQL). Integer MMK only, no floats.

### 2. Lock down POS routes (fixes F1)
- Require `verifyStudioAdminMiddleware` (or a new `verifyPosTerminal` built on the same session) on all three POS routes.
- **`tenantId` comes from the session only.** Ignore `tenantId` in query/body; reject a body whose `tenantId` differs from the session.
- Validate the body server-side (shape, integer MMK, non-negative, lines non-empty). **Recompute `total_due_mmk` from lines/discount on the server** and reject a mismatch.
- Upsert by `(tenant_id, id)` — duplicates return 200 with `duplicate: true`, never a second row. Batch POST returns per-item results so the offline queue can drop only confirmed items.
- Replace `'nocturne'` hard-coded tenant in SSE broadcasts with the session tenant.

### 3. Lock down SSE (fixes F3)
- `/api/events/stream` requires the admin session cookie. Tenant = session tenant. Remove the `*` wildcard path entirely (no platform-wide stream in Phase 1).
- Update `useStudioRealtimeEvents.ts` to stop sending `tenantId` and rely on the cookie (EventSource sends cookies same-origin).

### 4. Per-tenant admin auth (fixes F4)
- Login = `tenantSlug + username + password`, verified against `admin_users` with **scrypt** (`node:crypto`, no new dependency). Tenant must exist in `production_studios` by `slug` or `legacy_studio_id` (drop the hard-coded list; under `DEMO_MODE` the four current demo slugs stay valid).
- Sessions stored hashed in `admin_sessions`; keep HttpOnly + SameSite=Lax + Secure-in-prod + CSRF exactly as today.
- `ADMIN_API_KEY` header path: keep **only** for platform ops (`setup-links`, onboarding submissions). Remove it from `verifyStudioAdminMiddleware` so a key can never impersonate a studio tenant.
- Remove the `dev-admin-secret` default unless `NODE_ENV === 'development'` **explicitly**.
- Add a CLI script `npm run admin:create -- --tenant <slug> --user <name>` that prompts for a password and inserts a hashed `admin_users` row (how Ko Htoo creates studio logins).
- Login rate limit: reuse `rateLimiters.ts`; 5 failures / 15 min per IP+tenant.

### 5. Server-side staff PIN (fixes F5)
- New routes: `GET /api/pos/staff` (names/roles/colors only, never hashes), `POST /api/pos/staff/verify-pin`, `POST /api/pos/staff/manager-override`. PINs hashed with scrypt + per-row salt. **5 wrong PINs → 5-minute lock** on that staff row.
- Manager-override decisions (cart void, cash drop > 50,000 MMK) must be checked **on the server** when the related POST arrives (carry an override token issued by `manager-override`, single-use, 2-minute expiry).
- `DEFAULT_POS_STAFF` moves to a demo seed used only when `DEMO_MODE=true`. Remove PINs from the client bundle (`grep -r "pin: '" dist/` must return nothing after build).
- Owner can add/edit/deactivate staff and reset PINs from `SettingsModal` (minimal form; Phase 3 redesigns it).

### 6. Slip OCR integrity (fixes F6)
- Unique `(tenant_id, gateway, transaction_id)` on verified slips (add column/table as needed). A reused transaction ID returns `verification_status: 'duplicate_slip'` and the booking stays `PENDING_REVIEW` for a human.
- `expected_amount_mmk` is read from the booking record on the server (via `manifest_id`/booking id), not from the request body.
- Customer-facing wording for a duplicate: guidance tone, no "Error" (e.g. "ဤငွေလွှဲပြေစာကို စစ်ဆေးနေပါသည်။ စတူဒီယိုမှ မကြာမီ အတည်ပြုပေးပါမည်။").

### 7. Fail closed in production (fixes F7, F10)
- On boot (`server.ts`): when `NODE_ENV=production` and `DEMO_MODE` is not `true`, require `DATABASE_URL`, `GEMINI_API_KEY`, `ALLOWED_ORIGINS` (the existing env names); exit with a clear message if missing, and refuse to start if the DB ping fails.
- In production, memory fallbacks in booking/owner-token/onboarding services are **disabled**: a DB error returns 503 with a retryable message instead of writing to memory.
- Dockerfile: `npm ci --omit=dev`, add `HEALTHCHECK` on `/api/health`, run as the non-root `node` user.

### 8. Tests and dependencies (fixes F8, F9)
- `offlineQueueSync.test.ts`: start `createApp()` in-process on an ephemeral port inside the test (same pattern for any HTTP test), point the queue at it, close it after. No skipping.
- New tests (each must fail before the fix and pass after):
  1. POS GET/POST without session → 401; with tenant A session cannot read or write tenant B.
  2. Re-posting the same offline batch twice → one row per transaction.
  3. Client-sent total that does not match lines → 400.
  4. SSE without session → 401; tenant A stream never receives tenant B events; `tenantId=*` no longer works.
  5. 5 wrong PINs → locked; correct PIN during lock → rejected.
  6. Same slip transaction ID on two bookings → second is `duplicate_slip`.
  7. Production boot without `DATABASE_URL` → process exits non-zero.
- `npm audit fix` (no `--force`), then re-run everything.
- Tests that need Postgres: use the dev `docker-compose.yml` DB or skip with a clear `SKIP: no DATABASE_URL` line — but the auth/tenant tests must run without a DB using `DEMO_MODE`.

---

## Explicitly out of scope
- New features (reports, CRM, inventory, loyalty) → Phase 2.
- Visual redesign of any screen → Phase 3. Only add the minimal forms named above (login fields, staff management).
- Deploy / Coolify / VPS. Claude handles deploy after verification.
- Changing the Supabase project or creating a new one.

## Acceptance gates (report each separately)
1. `npx tsc --noEmit` → 0 errors
2. `npm test` → all suites pass with **no server pre-started**
3. `npm run build && npm run build:server` → succeed; `grep -rE "pin: '[0-9]{4}'" dist/` → no matches
4. `npm audit` → 0 critical, 0 high
5. Manual: login as tenant A, ring a split-payment sale offline, reconnect, confirm exactly one row in `pos_transactions`; restart server; history still there
6. Manual: open SSE as tenant A in one browser and tenant B in another; a tenant B sale never appears in A

## Report-back format (short)
**Changed** (files) / **Implemented** (by F-number) / **Verified** (gates 1–6 with output lines) / **Remaining or conflicts**. Do not commit.
