# CHECK BRIEF — AJ Studio Desk: Current Deployment Status (investigation only, no build yet)

**Repo:** `Aj AI Studio POS` (AJ Studio Desk)
**Author:** Claude, on Ko Htoo's direct instruction (2026-09-18). This is a **fact-finding brief**, not an implementation brief — Antigravity should report findings back to Ko Htoo before anyone builds or deploys anything from it.
**Why this exists:** Ko Htoo wants to link a public live demo of this app from a new Room inside the AJAX CLICK AI STUDIO platform (see `ajax-click-ai-v1-ui`'s `docs/briefs/ARCHITECT_BRIEF_STUDIO_DESK_ROOM_2026-09-18.md`). Before anyone builds that demo, we need ground truth on what's already deployed vs. what still needs a hosting decision from Ko Htoo.

---

## What Claude already confirmed by reading the repo (2026-09-18)

- `.env` already has a real Supabase project wired up (`NEXT_PUBLIC_SUPABASE_URL` pointing at a live `*.supabase.co` project, plus a `DATABASE_URL` pooled Postgres connection string) and `DATABASE_ENV=staging`. **This is the database only** — Supabase does not host the Node/Vite app itself.
- A production-ready `Dockerfile` exists (multi-stage: builds the Vite frontend + bundles `server.js`, runs `node server.js` on port 4000 in the final image) — this is deploy-ready, but nothing in the repo shows evidence it has actually been built into a running container anywhere (no `fly.toml`, `render.yaml`, `vercel.json`, GitHub Actions deploy workflow, or VPS deploy script found in the repo root during this check).
- `docker-compose.yml` in the repo root is explicitly commented "DEVELOPMENT-ONLY POSTGRESQL DOCKER COMPOSE SETUP... DO NOT deploy or use in production environments" — it is a local-only Postgres container for dev, unrelated to the real Supabase staging DB already in `.env`. Don't confuse the two when reporting back.
- Ko Htoo confirmed verbally (2026-09-18) that "Supabase already has it deployed" — Claude's reading is that he means the **database** already exists on Supabase (confirmed above), not that the web app itself is publicly reachable anywhere yet. **Antigravity should confirm this interpretation with Ko Htoo rather than assume** — if Ko Htoo actually meant something more (e.g. a Supabase Edge Function, or he deployed the app somewhere and is calling the whole stack "Supabase" loosely), that needs to surface now, not after a duplicate deploy is built.

## What Antigravity needs to check / ask Ko Htoo directly

1. **Is there an existing public URL for this app anywhere right now?** Check for it (ask Ko Htoo — he would know fastest) before assuming a fresh deploy is needed.
2. **What does "staging" actually contain in that Supabase project?** Is `DATABASE_ENV=staging` Ko Htoo's own working test data (bookings he's been testing with), or is it empty/safe to seed with obviously-fake demo data for public members to click through? **This matters a lot**: if public AJAX CLICK members are going to hit this database through a public demo link, and it currently holds Ko Htoo's real test/working data, that data could get corrupted or exposed. Do not point a public demo at this Supabase project without Ko Htoo explicitly confirming it's safe to do so, or without provisioning a separate demo-only database/schema.
3. **Where does Ko Htoo want to host the container?** Options to present to him, not decide unilaterally:
   - His existing VPS (AJAX CLICK AI STUDIO itself migrated to a VPS recently, per `[[legacy-render-projects]]`/git history `904e591 migrate to VPS`) — if there's spare capacity there, this Docker image could run alongside it under its own subdomain.
   - A fresh Vercel/Render deploy (Render specifically supports Dockerfile-based deploys directly, which fits this repo's existing `Dockerfile` with no changes needed).
4. **Confirm no secrets leak in any of this reporting.** `.env` contains a live database password inline in `DATABASE_URL` — when Antigravity reports findings back (in chat, in a doc, in a commit message, anywhere), it must **never paste the raw `DATABASE_URL` or any credential value**. Reference which env vars exist by name only.

## Explicitly NOT in scope for this brief
- No deploy should happen from this brief alone.
- No new Supabase project should be provisioned yet — that's a cost/infra decision for Ko Htoo (he already has 2 free-tier Supabase projects per `[[ajax-click-showroom]]`'s "fits Supabase's 2-free-project-per-org cap" note — a third project may not even be available on the free tier, which is itself a fact worth surfacing to him if a separate demo DB turns out to be needed).

## Report-back format
Short and factual, per the standing "usage-saving" collaboration mode: what's actually live right now (URL or "nothing is publicly deployed"), what's in the staging DB (safe-for-public-demo or not), and the concrete host options with their real constraints (VPS capacity? Supabase project cap?) — so Ko Htoo can make the hosting decision with real facts, not guesses.
