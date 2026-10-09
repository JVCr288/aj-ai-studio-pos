# ARCHITECT BRIEF — P1.6 DB-backed booking engine (production blocker found during demo deploy)

**Author:** Claude (architect/verifier), 2026-10-10. **Executor:** Anti. Do NOT commit. Claude verifies, commits, deploys.
**Baseline:** `feat/retail-category-expansion` at `1daa668` (P1.5 committed and deployed as the demo at pos.ajaxclickaistudio.com).
**Rule:** root-cause first. Fix the code, never weaken an assertion. Real command output per gate. Note: run tests with `env -u NODE_ENV` if your shell exports NODE_ENV.

## What Claude found on the live demo
A fresh demo sandbox has 95 bookings in `demo.customer_bookings`, but the Admin Booking Desk shows **0**. Root cause: `src/services/serverBookingService.ts` is entirely in-memory (`bookingStore` Map). No method reads or writes the database. `customer_bookings` / `booking_events` are written only by the demo seeder.
Consequences:
- Demo: the seeded 30-day history and upcoming bookings never appear on the desk, so the demo looks empty (Ko Htoo's rule: the demo must feel like the real product).
- Production: every real customer booking, payment review, status change, reschedule and note is lost on every server restart or deploy. This blocks any real studio go-live.

## Scope
Make the booking engine DB-backed whenever `getDb()` returns a database; keep the in-memory store only for offline test runs (`getDb() === null`). Same public method signatures, same SSE events, same API responses.

Methods to move to the DB (all in `serverBookingService.ts`):
1. `createCustomerBooking` — insert into `customer_bookings` + a `booking_events` row in ONE transaction. Respect the existing unique indexes (`tenant_ref`, `idempotency_key`): a repeated idempotency key returns the existing booking, never a duplicate.
2. Slot conflict check (create + `rescheduleBooking`) — must hold under concurrency. Do it inside the transaction with a lock (e.g. `pg_advisory_xact_lock(hashtext(tenant_id||space||start_date||time_slot))`) or a partial unique index on active bookings; pick one and explain. Add the migration with `db:generate` if you add an index (keep `demo.*` statements idempotent like 0003/0004).
3. `getAdminBookingSummary`, `queryAdminBookings` — SQL filters, newest first, real pagination and totalCount. Same date-format handling as today.
4. `getBookingDetails` — booking + its `booking_events` ordered by time.
5. `findBookingByManifestOrRef` — used by slip verification; must find DB bookings.
6. `reviewPaymentEvidence`, `updateBookingStatus`, `rescheduleBooking`, `updateAdminNotes` — update row + insert audit event in one transaction; tenant-scoped `WHERE tenant_id = $session` on every query (never trust a tenant from the body).
7. Remove the pilot booking seed (`pilot1/pilot2`) from DB mode; keep it only for offline memory mode if tests need it.
8. Map every `CustomerBookingRecord` field to its column (jsonb snapshots included). If a field has no column, report it instead of dropping data.

## Also audit (report only, do not fix unless trivial)
List every other module-level in-memory store on the server (`new Map`, arrays used as stores) that still holds production data while a DB is connected (e.g. verified slips, sessions, owner drafts). For each: file, what it holds, and whether a restart loses real data.

## Acceptance gates
1. `npx tsc --noEmit`, `npm test`, `npm run test:db`, `npm run build && npm run build:server` — exit 0.
2. Restart gate (Postgres): create a booking via HTTP, review payment, change status, add a note → `closeDb()` + new `createApp()` → admin list, summary and details (with all audit events) still show it.
3. Demo gate (Postgres, as `demo_app`): fresh sandbox → `/api/admin/bookings` page 1 returns > 0 items and `totalCount` equals the sandbox's row count; summary counts match the DB.
4. Concurrency gate: 10 parallel bookings for the same tenant/space/date/slot → exactly 1 succeeds, 9 get the existing "slot taken" response (guidance wording, no "Error").
5. Isolation: tenant A cannot read or mutate tenant B's booking by id (404).
6. Slip gate: a slip check finds a DB booking by manifest/ref after a restart.
7. `npm run db:generate` → no pending changes after your migration.
8. Report: Changed / Implemented / Verified (command + real output per gate) / Remaining + the in-memory store audit list. Do not commit.
