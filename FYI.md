# AJ AI Studio POS — FYI & Quick Reference Guide

> [!NOTE]
> This document provides essential developer information, environment settings, local dev fallback behavior, port configurations, and troubleshooting procedures for **AJ AI Studio POS**.

---

## ⚡ Quick Reference

| Item | Value / Configuration |
| :--- | :--- |
| **Project Root** | `/Users/htoowai/Documents/Aj AI Studio POS` |
| **Vite Dev Server Port** | `3010` (`http://localhost:3010`) |
| **Backend Express API Port**| `4000` (`http://localhost:4000`) |
| **Master Tenant ID** | `aj-ai-studio` |
| **Default Admin Key** | `dev-admin-secret` |
| **Default Test Credentials** | Admin Key: `dev-admin-secret` |
| **Primary Test Command** | `npm test` |
| **TypeScript Check** | `npx tsc --noEmit` |
| **Production Build** | `npm run build` |

---

## 🛠️ Environment Configuration (`.env`)

Create a `.env` file in the project root with the following keys:

```env
# Server Port Configuration
PORT=4000

# Studio Admin Secret Credential (Development Default)
ADMIN_API_KEY=dev-admin-secret

# Gemini AI API Key for Mobile Banking Slip OCR Verification
GEMINI_API_KEY=YOUR_GEMINI_API_KEY

# Production Database Connection (Optional in Local Dev Mode)
DATABASE_URL=postgres://user:password@localhost:5432/aj_ai_studio_pos

# Allowed CORS Origins (Comma-Separated)
ALLOWED_ORIGINS=http://localhost:3010,http://127.0.0.1:3010
```

---

## 🔄 Local Dev Offline Fallback Architecture

To ensure smooth development and zero blocking when running without a live database or when the Express API server proxy is unreachable:

1. **Client-Side Service Adapter (`adminBookingClientService.ts`):**
   - If `/api/admin/login` or booking endpoints return a 503 error (`BACKEND_OFFLINE` / `SERVER_UNAVAILABLE`), the client service automatically falls back to an in-memory session and repository (`serverBookingService`).
   - Admin access key `dev-admin-secret` will always authenticate successfully in local dev mode.

2. **Backend API Fallback (`server.ts` & `serverBookingService.ts`):**
   - When `DATABASE_URL` is unconfigured, the backend operates using an in-memory seed repository with pre-seeded pilot bookings (`#AJ-BK-2026-8801`, `#AJ-BK-2026-8802`).
   - When `GEMINI_API_KEY` is absent, the slip verification endpoint returns a simulated OCR response tagged with `verification_source: 'mock'`.

---

## 🧪 Running Test Suites

Run all 7 canonical test suites using:

```bash
npm test
```

### Included Test Suites:
1. `src/tests/onboardingForm.test.ts` — 5-Step Owner Intake Form & Render Tests
2. `src/tests/tenantWiring.test.ts` — Multi-Tenant Wiring & Branding Leak Isolation
3. `src/tests/phaseB1Persistence.test.ts` — Token Hashing, Revision Control & Setup Links
4. `src/tests/httpIntegration.test.ts` — API Endpoint & HTTP Security Verification
5. `src/tests/runtimeRouting.test.ts` — URL Hash & Query Route Resolution
6. `src/tests/adminBookingPanel.test.ts` — Admin Operations, Status Transitions & Fallback Tests
7. `src/tests/posDesk.test.ts` — POS Shift, Cash Float, Wallet & Split Payment Tests

---

## 🔍 Frequently Asked Questions (FAQ) & Troubleshooting

### Q1: What should I do if the Admin login modal shows `BACKEND_OFFLINE`?
> **Answer:** Ensure that `adminBookingClientService.ts` local fallback adapter is active. Entering `dev-admin-secret` as the Admin Access Key will automatically authenticate you into the Studio Operations Desk even if the Express backend port `:4000` is offline or proxied.

### Q2: How is third-party branding handled?
> **Answer:** All third-party legacy references have been eradicated. The default master tenant identity is **AJ AI Studio**. Partner studios purchasing the platform are assigned their own `tenantId` (e.g., `neutral-studio-tenant`), which dynamically swaps all logos, contact info, and receipt headers.

### Q3: How do I test the POS Desk Terminal?
> **Answer:** Navigate to `http://localhost:3010`, click the **POS Desk Terminal** button in the header, initialize the shift float (e.g. `100,000 MMK`), and test cash, KBZPay, or split payment transactions.

### Q4: How do I test full-screen photo showcases?
> **Answer:** On the landing page under the Portfolio & Worked Showcase section, click on any photo card to open the Full-Screen Lightbox Modal (`z-[99999]`). Press `ESC` or click the `X` button to close.
