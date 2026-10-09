# ARCHITECT BRIEF — P1.5 Fix Round 2 (public demo endpoints + fail-closed config)

**Author:** Claude (architect/verifier), 2026-10-09. **Executor:** Anti. Do NOT commit. Claude verifies, commits, deploys.
**Applies to:** the current uncommitted worktree (Round 1 result). Keep all Round 1 work.
**Rule:** root-cause first. Fix the code, never weaken an assertion. Real command output per gate.

## Claude's verdict on Round 1
Round 1 fixed the core: the app now runs as `demo_app`, the Phase 1 tables live in schema `demo`, public row counts stay unchanged, cleanup is DB-backed and transactional, the migration has no password, CORS/rate-limit regressions are reverted. Good work.
Claude's diff review found the items below. The public demo is open to the internet, so each one is a real visitor-facing risk.

## Fix A — Fail closed when the demo DB is not configured
`src/db/index.ts` uses `DEMO_DATABASE_URL` only if it is set. If `DEMO_MODE=true` and `DEMO_DATABASE_URL` is missing, it silently falls back to `DATABASE_URL` (the owner role) and sandboxes go into the real tables again.
1. If `DEMO_MODE === 'true'` and `DEMO_DATABASE_URL` is not set: never fall back. Refuse to start (fail closed with a clear log line). Exception: `NODE_ENV === 'test'` offline runs with neither URL set keep the existing `getDb() === null` memory path.
2. At startup in DEMO_MODE with a DB, assert the connection is isolated: `SELECT has_table_privilege(current_user, 'public.production_studios', 'SELECT')` must be false and `current_schema()` must be `demo`. If not, do not mount the demo routes and log why. Add a test for both the missing-URL case and the wrong-role case.

## Fix B — Lock down the demo HTTP endpoints (all currently unauthenticated)
1. `POST /api/demo/cleanup` — anyone can send `{"maxIdleDays":0}` and wipe every visitor's sandbox. Require `requireAdminApiKey`. Clamp `maxIdleDays` to >= 1 over HTTP.
2. `POST /api/demo/reseed-sample` — anyone can trigger repeated reseeds. Require `requireAdminApiKey`.
3. `POST /api/demo/reset` — takes `sandboxId` from the body, so a visitor can reset anyone's sandbox (including `sample-studio`). Derive the sandbox from the visitor's own httpOnly demo cookie/session; ignore any body `sandboxId`; never allow `sample-studio`.
4. `POST /api/demo/activity` — accepts any `sandboxId`/`leadId` from the body, so anyone can write fake funnel rows into the founder's lead data. Same rule: derive lead + sandbox from the visitor's cookie; reject when there is none. Allow only the known event names.
5. `POST /api/demo/signup` — do not trust `existingSandboxId` from the body (it lets a visitor attach to another visitor's sandbox). Restore only (a) the sandbox linked to the visitor's own `demo_lead_id` cookie, or (b) the sandbox of the lead matched by the normalized phone, as the original brief says. Add a per-IP limiter on signup (e.g. 5 per hour) so a script cannot create hundreds of sandboxes; on hit, show guidance wording (no "Error").
6. Make the cookie that identifies the visitor signed (`cookie-parser` secret or HMAC) so it cannot be forged by editing it.
Tests: each endpoint rejects without the key/cookie (401), and a visitor cannot reset or log activity for another sandbox.

## Fix C — Scheduled jobs actually run
The original brief requires nightly cleanup of sandboxes idle > 7 days and a nightly reseed of `sample-studio` at 03:00 Asia/Yangon. Today nothing calls them; they exist only as HTTP endpoints. Add an in-process scheduler started only in DEMO_MODE with an isolated DB (after Fix A passes): run cleanup once per night and reseed `sample-studio` at 03:00 Asia/Yangon (UTC+06:30). Guard against double runs (store the last run date in a small `demo` table or check before running). Log each run. Test with an injectable clock.

## Fix D — Scripts must not carry default credentials
1. `src/scripts/createDemoRole.ts`: remove the fallback password `demo_app_dev_password` and the fallback localhost admin URL. Require `DATABASE_URL` and `DEMO_DB_PASSWORD`; refuse to run without them. Tests pass these env vars explicitly. Also do not run `createDemoRole()` on import — only when executed as the script entry point.
2. `src/db/migrateDemo.ts`: it must run as the owner role (creating the FKs to `public.*` before the re-point needs REFERENCES rights that `demo_app` correctly lacks). Use `DATABASE_URL` only, with `search_path=demo`; do not fall back to `DEMO_DATABASE_URL`. Same entry-point rule as above. Write the run order in HANDOFF.md: `db:migrate` → `db:migrate:demo` → `createDemoRole`.

## Fix E — CORS behind the VPS reverse proxy
Production runs behind a TLS reverse proxy on the VPS. Without `trust proxy`, `req.protocol` is `http` while the browser sends `Origin: https://<domain>`, so same-origin POSTs are rejected. Add `app.set('trust proxy', ...)` driven by an env var (`TRUST_PROXY`, e.g. `1`), documented in HANDOFF.md and `.env.example`. Extend the CORS test: with trust proxy and `X-Forwarded-Proto: https`, `Origin: https://<host>` is allowed.

## Fix F — Confirm the remaining memory paths are offline-only
`memorySandboxes`, `memoryLeadToSandboxId`, `memorySandboxToLeadId` still exist. Show (by code reference) that every read/write of them is reached only when `getDb() === null`. If any path uses them while a DB is connected, move it to `demo.demo_sandboxes`.

## Acceptance gates
1. `npx tsc --noEmit`, `npm test`, `npm run test:db`, `npm run build && npm run build:server` — exit 0.
2. `npm run db:generate` → no changes.
3. Fix A tests: DEMO_MODE without DEMO_DATABASE_URL refuses to start; DEMO_MODE with the owner URL as DEMO_DATABASE_URL does not mount demo routes.
4. Fix B tests: cleanup / reseed-sample without key → 401; reset and activity without cookie → 401; visitor A cannot reset or log activity for visitor B; `existingSandboxId` in signup body is ignored; 6th signup from one IP in an hour gets the limiter guidance.
5. Fix C: injectable-clock test shows cleanup and the 03:00 Asia/Yangon reseed each run once per day.
6. `grep -rn "demo_app_dev_password\|aj_dev_password" src` → no matches outside test env setup.
7. Isolation gate and restart gate from Round 1 still pass.
8. Report: Changed / Implemented / Verified (command + output) / Remaining. Do not commit.
