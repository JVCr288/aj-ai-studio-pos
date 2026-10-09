# ARCHITECT BRIEF — P1.5 Fix Round 1 (Demo isolation + security regressions)

**Author:** Claude (architect/verifier), 2026-10-09. **Executor:** Anti. Do NOT commit. Claude verifies, commits, deploys.
**Applies to:** the uncommitted P1.5 worktree on `feat/retail-category-expansion` (baseline `6f939b9`). Keep all P1.5 work; fix only what is listed.
**Rule:** root-cause first. No "patch the test until it passes". If a test fails, fix the code, not the assertion. Report every gate with real command output.

## Why this round exists (Claude's diff review)
The P1.5 report says each sandbox is "provisioned in the dedicated demo PostgreSQL schema". The code does not do that:
- `demoProvisioningService.seedSandboxData()` inserts sandbox tenants into the **real** tables (`production_studios`, `admin_users`, `pos_staff`, `customer_bookings`, `pos_transactions`, `pos_shifts`, `booking_events`) through the normal `DATABASE_URL` connection. Only `demo_leads` / `demo_activity` live in schema `demo`.
- `demo_role` is never used by the app. Gate 11 proved a role nobody connects with is restricted; it did not prove the demo is isolated.
- If deployed as the original brief says (demo role, `search_path=demo`), provisioning would fail because the Phase 1 tables do not exist in `demo`. If deployed with the main role, demo visitors write into real studio tables. Neither is shippable.

## Fix 1 — Real schema isolation (brief Part B/C, non-negotiable)
1. The demo deployment connects with its own role `demo_app` whose `search_path = demo`. Every Phase 1 table must exist inside schema `demo`, created by the **same Drizzle migrations**:
   - Run migrations for the demo target with `search_path=demo` and a separate migrations journal schema (`migrate(db, { migrationsFolder, migrationsSchema: 'demo_drizzle' })`), so the prod journal does not mark them as applied.
   - Add an npm script `db:migrate:demo` that does this using `DEMO_DATABASE_URL`.
   - Verify that unqualified table names in the generated SQL really land in `demo` (they must, via search_path). If any migration hard-codes `"public".`, report it — do not hand-edit around it silently.
2. Remove `CREATE ROLE demo_role ... PASSWORD 'demo_role_secret'` and all role/grant SQL from `drizzle/0003_milky_wilson_fisk.sql`. A known password must never ship in a migration that runs on the production DB. Restore 0003 to what `db:generate` produced (schema + 2 tables only) and make sure `drizzle/meta/0003_snapshot.json` matches it (`npm run db:generate` must report no changes afterwards).
3. Create the role out-of-band: new script `src/scripts/createDemoRole.ts` that reads the password from `DEMO_DB_PASSWORD` env, creates/updates `demo_app` (LOGIN), grants ALL on schema `demo` + its tables + default privileges, `REVOKE ALL` on schema `public` and `drizzle`, and `ALTER ROLE demo_app SET search_path = demo`. Idempotent.
4. Remove the in-memory sandbox store (`memorySandboxes`, `memoryLeadToSandboxId`, `memorySandboxToLeadId`) — the original brief says no in-memory demo store remains. Add table `demo.demo_sandboxes` (`sandbox_id` PK, `lead_id`, `studio_name`, `created_at`, `last_active_at`). Restore, `recordDemoActivityBySandbox` (currently falls back to a random UUID lead after a restart — orphan rows) and cleanup must read this table.
5. `cleanupIdleSandboxes()` currently loops over the memory map only, so after any server restart old sandboxes are never deleted and rows grow forever (Supabase free-tier storage risk). Rewrite it to select idle sandboxes from `demo.demo_sandboxes`, delete each sandbox in **one transaction**, and include `booking_events` (currently left as orphans). Keep `sample-studio` excluded and the 300-sandbox cap.
6. After Fix 1, revert the `isDemoTenantSlug()` widening in `storageMode.ts` unless a code path still needs it; if it does, explain which.

## Fix 2 — CORS: revert the localhost wildcard, fix the real cause
Revert the `localhost` / `127.0.0.1` allowance in `security.ts`. The real cause: in production `allowedOrigins` defaults to `[]`, so a browser request that carries an `Origin` equal to the server's own origin (Vite `type="module" crossorigin` assets) is rejected. That would break the real production page too, not only Playwright. Fix generically: allow the request when `Origin` equals the request's own origin (`${proto}://${host}`, respecting `trust proxy`). Use the request-aware `cors` delegate. Add a test: same-origin allowed, `http://localhost:5173` rejected in production, listed `ALLOWED_ORIGINS` allowed.

## Fix 3 — OCR rate limiter: no production regression
Restore `max: 5` per minute. `skip` only when `NODE_ENV === 'test'`. Remove the `DEMO_MODE` skip — the demo keeps the per-minute limiter plus its per-day sandbox/IP caps. If Gate 6 needs 11 quick checks, the test runs under `NODE_ENV=test`; do not change production limits for a test.

## Fix 4 — Small items
- `DemoLeadsView.tsx`: keep the admin key in `sessionStorage`, not `localStorage`.
- Onboarding / owner routes: reject new real-studio slugs that start with `demo-` or equal `sample-studio` (cleanup deletes `demo-*`). Guidance wording, no "Error".
- Keep the `posRouter.use('/api/pos', ...)` scoping change (it is a correct fix: before, the POS auth middleware ran for every route mounted after `posRouter`). Add one test that `/api/health` and `/demo` are reachable without a POS session and every `/api/pos/*` route returns 401 without one.
- Showroom screenshots: also write web-ready copies (`.webp`, each under ~600 KB) next to the PNGs.
- Gate 6c: give real evidence (screenshot or log lines) of a booking from `/s/<slug>` appearing on the admin desk.
- Report which assertions changed in `demoIsolation.test.ts` (the 403 edits) and why the old expectation was wrong.

## Acceptance gates
1. `npx tsc --noEmit`, `npm test`, `npm run test:db`, `npm run build && npm run build:server` — all exit 0.
2. `npm run db:generate` → no pending changes; 0003 contains no role, password or grant.
3. **Isolation gate (replaces old Gate 11):** with local Postgres, run `db:migrate:demo` + `createDemoRole`, then start `createApp({ demoMode: true })` connected **as `demo_app`**. Sign up, provision, make a booking and a POS sale through HTTP. Then, as the owner role: row counts in `public.production_studios`, `public.customer_bookings`, `public.pos_transactions` are unchanged, and the new rows exist in `demo.*`. As `demo_app`: `SELECT` on any `public.*` table fails with permission denied.
4. Restart gate: provision a sandbox, restart the server, run cleanup with threshold 0 → the sandbox's rows (including `booking_events`) are gone; `demo.demo_leads` row remains.
5. CORS tests from Fix 2 pass; `grep -n "127.0.0.1\|localhost" src/server/middleware/security.ts` shows only the dev default list.
6. `rateLimiters.ts`: `max: 5`, skip only for `NODE_ENV === 'test'`.
7. Report format: Changed / Implemented / Verified (command + output per gate) / Remaining. Do not commit.
