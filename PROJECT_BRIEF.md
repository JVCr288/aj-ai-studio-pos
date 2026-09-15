# AJ AI Studio POS — Project Brief

## Executive Summary
**AJ AI Studio POS** is a multi-tenant photography studio operations management platform, customer booking engine, and point-of-sale (POS) desk terminal. Built with React 19, TypeScript, Tailwind CSS, Express, Drizzle ORM, and Google Gemini AI, it provides end-to-end studio management—from public booking intake and mobile payment slip OCR verification to POS desk shift management, schedule management, and studio owner onboarding.

---

## Brand Identity & White-Label Architecture

### 1. Default Master Identity
- **Master Tenant Name:** AJ AI Studio
- **Platform Identity:** AJ AI Studio POS & Booking Operations Platform
- **Default Master Tenant ID:** `aj-ai-studio`

### 2. White-Label Policy
- The system is built as a proprietary white-label studio software solution.
- All legacy third-party branding has been permanently eradicated.
- Studio owners purchasing the software can dynamically replace branding assets, logos, tenant names, and contact details without modifying core business logic.

---

## 5 Core Studio Categories & Showcases

1. **Commercial Studio Rigs (`BAY ALPHA-01`)**
   - High-key commercial fashion, product campaigns, tethered capture, and Profoto lighting setups.
2. **Editorial Portrait Nook (`BAY BETA-02`)**
   - Intimate headshots, editorial fashion portraits, ambient natural lighting setups.
3. **Pre-Born & Newborn Photography Atelier**
   - Specialized maternity and newborn photo sessions with baby-safe props, temperature control, and sanitized environments.
4. **Maternity & Family Legacy Collections**
   - Timeless family portraits, multi-generational studio sessions, fine-art canvas prints.
5. **High-Speed Commercial Rigs**
   - E-commerce catalog automation, batch shoot scheduling, rapid asset delivery pipelines.

---

## Key System Modules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            AJ AI Studio POS                                 │
├──────────────────────────────┬──────────────────────────────┬───────────────┤
│    Customer Booking Portal   │    Studio Operations Desk    │   POS Terminal│
│  - Glass Plate UI Buttons    │  - Tenant-Isolated Bookings  │ - Cash/Wallet │
│  - Category Showcases        │  - Gemini OCR Slip Review    │ - Split Pay   │
│  - Full-Screen Lightbox      │  - Status & Rescheduling     │ - Drawer Shift│
├──────────────────────────────┴──────────────────────────────┴───────────────┤
│                       Express API & Local Dev Adapter                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Module 1: Customer Booking Intake Portal
- **Glass Plate UI Design System:** Semi-transparent glassmorphism buttons (`.btn-glass-plate`) with subtle backdrop blurring, cyan glowing borders, and hover micro-animations.
- **Distinct Typography Pairing:** Action buttons use bold action fonts, while presentation body text uses clean display typography (`font-presentation-body`).
- **Full-Screen Lightbox Modal:** High-resolution image inspection with ESC key exit, backdrop click close, body scroll locking, and explicit close buttons.
- **English-Only Interface:** Clean international English UI text across all screens.

### Module 2: Studio Admin Booking Operations Desk
- **Admin Access Login:** Protected modal accessed via configured admin credentials (`dev-admin-secret` in local dev).
- **Tenant Isolation:** Multi-tenant boundary checks ensuring zero data cross-leakage between master and partner tenants.
- **Payment Slip Verification:** Powered by Google Gemini AI for automated OCR parsing of KBZPay, WavePay, AYA Pay, and bank transfer slips.
- **Audit Timeline:** Immutable audit event records tracking status updates, payment reviews, reschedule events, and private admin notes.

### Module 3: POS Desk Terminal
- **Active Shift & Drawer Float:** Shift initialization with starting cash float and closing reconciliation.
- **Multi-Channel Payments:** Support for Cash, KBZPay, WavePay, AYA Pay, and Split Payments across multiple methods.
- **Add-on Presets & Overtime:** Preset catalog for extra retouched photos, studio overtime hours, backdrop replacements, and print delivery.

### Module 4: Standalone Owner Pre-Configuration Portal (`/setup/:token`)
- **5-Step Intake Form:** Studio Info, Spaces & Availability, Booking/Payment Policies, Brand Assets, and Review & Submit.
- **Security:** SHA-256 token hashing, HttpOnly session cookies, and CSRF protection.

---

## Technical Stack & Standards

- **Frontend Framework:** React 19, Vite 6, Tailwind CSS v4, Lucide Icons
- **Backend API:** Express, TypeScript (Node.js)
- **Database / ORM:** Drizzle ORM, PostgreSQL (with in-memory fallback for local dev)
- **AI Integration:** `@google/genai` (Gemini Flash model for Slip OCR Verification)
- **Testing:** Native Node.js assertion test suites (`tsx src/tests/*.test.ts`)
