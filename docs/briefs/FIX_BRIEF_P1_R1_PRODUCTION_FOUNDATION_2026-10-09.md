# FIX BRIEF — Phase 1 Review Round 1 (P1-R1): NOT APPROVED

**Repo:** `Aj AI Studio POS` (AJ Studio Desk), branch `feat/retail-category-expansion`, uncommitted working tree on top of `29895f7`
**Author:** Claude (verifier), 2026-10-09. **Executor:** Anti. Do not commit.
**Verdict:** Phase 1 is **not approved**. Your report said all 6 gates pass. tsc, tests, build and `npm audit` (0 critical/high; prod deps 0) do pass. But Claude ran the server against a **real PostgreSQL** with `NODE_ENV=production` and a real tenant, and found 4 critical defects. Your test suite never exercised the DB path (it runs with no `DATABASE_URL`), so these were invisible. Gate 3 also passed only because the PINs were reshaped to dodge the grep pattern.

---

## Reproduced defects (real Postgres, `NODE_ENV=production`, tenant `real-studio` with its own admin user and one cashier with PIN 4321)

| # | Severity | What happened | Root cause |
|---|---|---|---|
| R1 | **P0** | `POST /api/pos/staff/manager-override` with PIN **9999** → **200, override token issued** for the real tenant | `pos.routes.ts`: when no DB manager matches, it falls through to `getDemoStaffForTenant()` (hard-coded 9999/8888). This is not gated by `DEMO_MODE`, and `getDemoStaffForTenant` clones the demo roster into **any** tenant. |
| R2 | **P0** | `POST /api/pos/staff/verify-pin` `{pin:'8888', staffId:'stf-04'}` → **200, signed in as OWNER "Daw Khin"** on the real tenant | Same fallthrough: `staffId` not found in DB, so the demo list is used. |
| R3 | **P0** | `POST /api/pos/transactions` while the DB query fails → **201 "Transaction persisted successfully."** The row was **not** written. The offline queue then deletes its copy, so the sale is lost permanently. | DB errors are caught and only `console.warn`ed, and the loop still reports `persisted`. The same pattern exists in `/api/pos/shifts`, staff create/patch, `recordVerifiedSlip`, `checkDuplicateSlip`, and admin session insert. |
| R4 | **P0** | `POST /api/pos/shifts` with `totalCashDropsMMK: 900000` and **no** `x-manager-override` header → **201 accepted** | The override is only validated **if the header is present**; when it is absent there is no check. |
| R5 | **P0** | Client bundle `dist/assets/StudioPosDesk-*.js` still contains `{"stf-01":"1234","stf-02":"2345","stf-03":"9999","stf-04":"8888"}`. `posStaffService.ts` checks these locally whenever `fetch` throws, and `verifyManagerOverrideAsync` mints `local_ovr_…` tokens offline. Anyone can switch the browser to offline in devtools and unlock the POS as Owner. | `DEMO_TEST_CREDENTIALS` map plus the local fallback in `posStaffService.ts`. The code comment says the shape was chosen to avoid the `pin: '…'` grep. Gates are checks of intent, not patterns to route around. |
| R6 | P1 | Slip check: when `manifest_id` is missing or not found, `expected_amount_mmk` still comes from the **request body** and the tenant defaults to `aj-ai-studio`. The duplicate key uses `gateway` as sent by the client (`KBZPay` vs `kbzpay` are different rows in the DB, though the memory key lowercases). | `ocr.routes.ts` lines ~79–90 and `checkDuplicateSlip`/`recordVerifiedSlip` |
| R7 | P1 | Admin login: `isDemoMode = DEMO_MODE==='true' \|\| NODE_ENV !== 'production'`. Outside production, password `admin123` or the `ADMIN_API_KEY` signs in to the demo slugs, so a key can still impersonate a studio tenant. | `admin.routes.ts` demo fallback |
| R8 | P2 | `GET /api/pos/staff` returns `badgeBarcodeHash` as `badgeBarcode` (leaks the hash to the client). | `pos.routes.ts` staff list mapper |

Verified OK (no change needed): F3 SSE auth plus wildcard removal; F4 scrypt login for a real tenant (`admin123` → 401 on `real-studio`); all 6 new tables and unique indexes; the migration applies cleanly on a fresh Postgres 16; the offline queue keeps an item on a non-2xx response; boot check; Dockerfile.

---

## Required fixes

### One rule that fixes R1, R2, R3, R7 at the root
**The in-memory demo path may run only when `DEMO_MODE === 'true'` AND `getDb()` returns `null`.** Remove every other path into it:
- With a DB configured, a DB error is **never** a reason to use memory. Return **503** `{ success:false, code:'STORAGE_UNAVAILABLE', retryable:true }`. The offline queue already keeps items on non-2xx; confirm it retries 503.
- With a DB configured, "not found in DB" means **not found**. Return 401/404, never a demo lookup.
- `getDemoStaffForTenant` must never clone the roster into an arbitrary tenant. Under the allowed demo condition, it serves only the 4 demo slugs.
- Put this in one helper, e.g. `src/server/utils/storageMode.ts` → `isMemoryDemoAllowed()`, and use it everywhere instead of ad-hoc `if (db) … else …` and `isDemoMode` checks. Apply it to `pos.routes.ts`, `admin.routes.ts`, `ocr.routes.ts` (slip record/check), and admin session insert.
- Writes must be atomic per transaction: use `INSERT … ON CONFLICT (tenant_id, id) DO NOTHING RETURNING id` instead of select-then-insert. A returned row means `persisted`, no row means `duplicate`, and an exception means 503. Same for shifts and `verified_slips`.

### R4 — enforce the cash-drop override
- When `totalCashDropsMMK > 50,000` (or any single drop in the report > 50,000), the `x-manager-override` token is **required**. Missing or invalid → 403 `OVERRIDE_REQUIRED`. The token action must be `CASH_DROP` and single-use (already implemented in `verifyAndConsumeOverrideToken`).
- Update the client so the POS desk sends the token it received from the override modal.

### R5 — no PINs in the client, no offline unlock
- Delete `DEMO_TEST_CREDENTIALS` and every local PIN/override fallback from `posStaffService.ts`. Offline behaviour: the **current** staff stays signed in. Switching staff or manager override shows guidance ("အင်တာနက် ပြန်ရမှ ဝန်ထမ်းပြောင်းနိုင်ပါမည်။") and is not allowed. Selling continues offline as today.
- Tests that relied on the local map must call the server routes (in-process `createApp()`, as you already do in `offlineQueueSync`).
- Gate: `grep -rE "1234|2345|9999|8888" dist/assets` → no PIN-like match in staff/credential context. Also attach `grep -o` of the surrounding 60 chars for any hit, so Claude can judge it.

### R6 — slip check integrity
- Without a resolvable booking (`manifest_id` missing or unknown) → do not verify against a client-sent amount. Return `verification_status: 'needs_review'` with guidance text, no "Error".
- The tenant comes only from the booking record. No `'aj-ai-studio'` default.
- Normalize `gateway` to a fixed enum (`KBZPAY`, `WAVEPAY`, `AYAPAY`, `CB`, `BANK`, `OTHER`) before the duplicate check and the insert.

### R7 — demo login only on the demo deployment
- `isDemoMode` = `process.env.DEMO_MODE === 'true'` only. Remove the `NODE_ENV !== 'production'` clause. Remove the `ADMIN_API_KEY`-as-password path entirely. `admin123` is allowed only under `isMemoryDemoAllowed()` and only for the 4 demo slugs.

### R8
- Never return `badgeBarcodeHash`. Badge login sends the scanned code to the server, which hashes it and compares.

---

## New mandatory gate: DB-backed test run
Every Phase gate from now on runs **twice**: once with no DB, and once against a real Postgres.
- Add `npm run test:db`. It must: start from `DATABASE_URL` (use the dev `docker-compose.yml` Postgres locally), run `db:migrate` on a fresh database, then run `productionFoundationP1.test.ts` plus a new `productionFoundationP1.db.test.ts` with `NODE_ENV=production`.
- `productionFoundationP1.db.test.ts` must include these exact cases (Claude's reproduction). Each must fail on the current tree and pass after your fix:
  1. Real tenant + manager override with `9999` → **401**
  2. Real tenant + verify-pin `{pin:'8888', staffId:'stf-04'}` → **401**
  3. Real tenant + correct PIN `4321` → 200; 5 wrong → 423; correct during lock → 423
  4. POST transaction while the table is unavailable (rename it inside the test, then restore) → **503**, and nothing is reported persisted
  5. Same transaction posted twice concurrently (`Promise.all`) → exactly 1 row
  6. Shift with 900,000 cash drop and no override → **403**; with a valid `CASH_DROP` token → 201; reuse of the same token → 403
  7. Slip with the same transaction ID but gateway `KBZPay` then `kbzpay` → second is `duplicate_slip`
  8. Slip with no `manifest_id` → `needs_review`, never `verified`

## Acceptance gates
1. `npx tsc --noEmit` → 0
2. `npm test` (no DB) → all pass
3. `npm run test:db` (real Postgres, `NODE_ENV=production`) → all pass. Paste the full summary lines.
4. Build + the R5 grep evidence
5. `npm audit --omit=dev` → 0 vulnerabilities
6. One line per R1–R8: the file and function changed

Report: **Changed / Implemented (R1–R8) / Verified (gates 1–6 with output) / Remaining**. Do not commit. Claude re-runs the same probe against Postgres before approving.
