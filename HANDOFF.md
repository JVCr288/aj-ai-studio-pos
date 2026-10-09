# 🏢 AJ Studio Desk Platform — POS & Operations ERP
## Complete System Handoff & Technical Documentation (စနစ်လွှဲပြောင်းမှုနှင့် နည်းပညာမှတ်တမ်း)

> **ရက်စွဲ:** ၂၀၂၆ ခုနှစ်၊ အောက်တိုဘာလ ၉ ရက်  
> **စနစ်ဗားရှင်း:** `v2.4.0` (POS Hardware & Retail Expansion)  
> **လက်ရှိ Git Branch:** `feat/retail-category-expansion`  
> **ပရောဂျက်အမည်:** `AJ Studio Desk` (`aj-studio-desk`)  
> **ပရောဂျက်တည်နေရာ:** `/Users/htoowai/Documents/Products/AJ Studio Desk_ERP/Aj AI Studio POS`  
> **ပိုင်ရှင် / အဖွဲ့:** AJ AI Studio / AJAX CLICK  
> **အဓိက နည်းပညာ:** React 19 + TypeScript 5.8 + Node.js (Express) + Drizzle ORM (PostgreSQL) + Google Gemini AI  
> **White-Label မူဝါဒ:** Proprietary White-Label Multi-Tenant Architecture (Zero Vendor Lock-in)

---

## 📋 Table of Contents (မာတိကာ)

1. [စနစ်ခြုံငုံသုံးသပ်ချက် (System Overview)](#၁-စနစ်ခြုံငုံသုံးသပ်ချက်-system-overview)
2. [နည်းပညာ Stack နှင့် အခြေခံဗိသုကာ (Technology Stack & Architecture)](#၂-နည်းပညာ-stack-နှင့်-အခြေခံဗိသုကာ-technology-stack--architecture)
3. [Folder ဖွဲ့စည်းပုံနှင့် အဓိကဖိုင်များ (Project Structure)](#၃-folder-ဖွဲ့စည်းပုံနှင့်-အဓိကဖိုင်များ-project-structure)
4. [ပြီးစီးပြီးသော အဓိကစနစ်များနှင့် စွမ်းဆောင်ရည်များ (Completed Modules & Capabilities)](#၄-ပြီးစီးပြီးသော-အဓိကစနစ်များနှင့်-စွမ်းဆောင်ရည်များ-completed-modules--capabilities)
   - [က။ Customer Booking Intake Portal (အွန်လိုင်း ဘွတ်ကင်စနစ်)](#က-customer-booking-intake-portal-အွန်လိုင်း-ဘွတ်ကင်စနစ်)
   - [ခ။ Studio Admin Operations Desk (စီမံခန့်ခွဲမှု ကောင်တာ)](#ခ-studio-admin-operations-desk-စီမံခန့်ခွဲမှု-ကောင်တာ)
   - [ဂ။ Gemini AI Automated Slip OCR Verification (ငွေလွှဲပြေစာ အလိုအလျောက် စစ်ဆေးခြင်း)](#ဂ-gemini-ai-automated-slip-ocr-verification-ငွေလွှဲပြေစာ-အလိုအလျောက်-စစ်ဆေးခြင်း)
   - [ဃ။ POS Desk Terminal & Cash Drawer Management (အရောင်းကောင်တာစနစ်)](#ဃ-pos-desk-terminal--cash-drawer-management-အရောင်းကောင်တာစနစ်)
   - [င။ ESC/POS Thermal Printing & Cash Drawer Kick (အပူပေးပရင်တာနှင့် အံဆွဲဖွင့်စနစ်)](#င-escpos-thermal-printing--cash-drawer-kick-အပူပေးပရင်တာနှင့်-အံဆွဲဖွင့်စနစ်)
   - [စ။ Barcode Scanner Hardware Integration (ဘားကုဒ်ဖတ်စနစ်)](#စ-barcode-scanner-hardware-integration-ဘားကုဒ်ဖတ်စနစ်)
   - [ဆ။ Multi-Staff Fast PIN Switch & Audit Roles (ဝန်ထမ်း PIN အမြန်လဲလှယ်မှု)](#ဆ-multi-staff-fast-pin-switch--audit-roles-ဝန်ထမ်း-pin-အမြန်လဲလှယ်မှု)
   - [ဇ။ Offline-First Synchronization Queue (အော့ဖ်လိုင်း အရောင်းသိမ်းဆည်းမှု)](#ဇ-offline-first-synchronization-queue-အော့ဖ်လိုင်း-အရောင်းသိမ်းဆည်းမှု)
   - [ဈ။ Client Retail Shop & Category Expansion (လက်လီပစ္စည်း ၈ မျိုး ချဲ့ထွင်ခြင်း)](#ဈ-client-retail-shop--category-expansion-လက်လီပစ္စည်း-၈-မျိုး-ချဲ့ထွင်ခြင်း)
   - [ည။ Standalone Owner Pre-Configuration Portal (`/setup/:token`)](#ည-standalone-owner-pre-configuration-portal-setuptoken)
5. [လက်ရှိ Git Branch (`feat/retail-category-expansion`) နှင့် Refactoring မှတ်တမ်း](#၅-လက်ရှိ-git-branch-featretail-category-expansion-နှင့်-refactoring-မှတ်တမ်း)
6. [စနစ်စမ်းသပ်ခြင်းနှင့် Run ပြုလုပ်နည်း (Verification & Run Scripts)](#၆-စနစ်စမ်းသပ်ခြင်းနှင့်-run-ပြုလုပ်နည်း-verification--run-scripts)
7. [Audit တွေ့ရှိချက်များနှင့် ဖြေရှင်းရန် လိုအပ်ချက်များ (Audit Findings & Remediation Plan)](#၇-audit-တွေ့ရှိချက်များနှင့်-ဖြေရှင်းရန်-လိုအပ်ချက်များ-audit-findings--remediation-plan)
8. [ရှေ့ဆက်ဆောင်ရွက်ရန် Roadmap (Next Steps & Launch Roadmap)](#၈-ရှေ့ဆက်ဆောင်ရွက်ရန်-roadmap-next-steps--launch-roadmap)

---

## ၁။ စနစ်ခြုံငုံသုံးသပ်ချက် (System Overview)

`AJ Studio Desk` သည် Professional Photography Studio များအတွက် Customer Booking လက်ခံခြင်းမှစ၍၊ ငွေလွှဲပြေစာ (KBZPay, WavePay, AYA Pay) များကို Gemini AI ဖြင့် စစ်ဆေးခြင်း၊ Studio အုပ်ချုပ်ရေးမှူးမှ အတည်ပြုခြင်း၊ POS Desk အရောင်းကောင်တာတွင် ပစ္စည်း/ဝန်ဆောင်မှုများ ရောင်းချခြင်း၊ အပူပေး Thermal Printer ဖြင့် ပြေစာထုတ်ပေးခြင်း၊ ဝန်ထမ်းအလိုက် Shift အဖွင့်/အပိတ်နှင့် ငွေစာရင်းရှင်းတမ်း (X-Report / Z-Report) များ ထုတ်ယူခြင်းတို့ကို တစ်နေရာတည်းတွင် ချိတ်ဆက်ဆောင်ရွက်ပေးသော **All-in-One Studio ERP & POS Platform** ဖြစ်သည်။

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              AJ STUDIO DESK PLATFORM (ERP & POS)                       │
│                                                                                        │
│   ┌───────────────────────────┐      ┌───────────────────────────┐                     │
│   │  Customer Booking Portal  │ ───> │  Gemini Slip OCR (Flash)  │                     │
│   │  (5 Showcase Bays / Bags) │      │  KBZPay / WavePay / AYAPay│                     │
│   └───────────────────────────┘      └─────────────┬─────────────┘                     │
│                                                    │                                   │
│                                                    ▼                                   │
│   ┌───────────────────────────┐      ┌───────────────────────────┐                     │
│   │  Owner Intake Setup Form  │      │  Studio Admin Operations  │                     │
│   │  (/setup/:token 5-Steps)  │      │  - Multi-Tenant Isolation │                     │
│   └───────────────────────────┘      │  - Booking Status Guard   │                     │
│                                      └─────────────┬─────────────┘                     │
│                                                    │                                   │
│                                                    ▼                                   │
│   ┌──────────────────────────────────────────────────────────────────────────────┐     │
│   │                       POS DESK TERMINAL & HARDWARE ENGINE                    │     │
│   │  - Multi-Staff Fast PIN (Cashier / Lead / Manager / Owner)                   │     │
│   │  - Hardware Barcode Scanner (Retail SKU / Asset / Package)                   │     │
│   │  - Shift Management (Drawer Float, Cash Drop, Cash In, Shortage/Overage)     │     │
│   │  - ESC/POS Thermal Printing (58mm/80mm + Cash Drawer Kick Pin 2/5)           │     │
│   │  - Offline-First Queue (Persistent Storage + Bulk Server Sync)               │     │
│   └──────────────────────────────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ၂။ နည်းပညာ Stack နှင့် အခြေခံဗိသုကာ (Technology Stack & Architecture)

| အလွှာ (Layer) | နည်းပညာ / Library | အသေးစိတ် အသုံးပြုပုံ |
|---|---|---|
| **Frontend Framework** | React 19 (`react: ^19.0.1`, `react-dom: ^19.0.1`) | Functional components, Hooks, Custom State Machine |
| **Language & Typings** | TypeScript 5.8 (`typescript: ~5.8.2`) | Strict type checking, Shared domain contracts |
| **Styling & Icons** | Tailwind CSS v4 (`@tailwindcss/vite: ^4.1.14`), `lucide-react` | Glassmorphism (`.btn-glass-plate`), Presentation typography |
| **Backend Server** | Express 4.21 (`express: ^4.21.2`), `tsx`, `esbuild` | RESTful API, Server-Sent Events (SSE), Security middleware |
| **Database & ORM** | Drizzle ORM (`drizzle-orm: ^0.45.2`), PostgreSQL (`postgres: ^3.4.9`) | PostgreSQL schema migrations, Safe conditional pool with in-memory fallback |
| **AI / OCR Engine** | Google GenAI SDK (`@google/genai: ^2.4.0`) | Gemini Flash model ဖြင့် ငွေလွှဲစလစ် Transaction ID, အချိန်, ငွေပမာဏ တိုက်စစ်ခြင်း |
| **Hardware Driver** | Native ESC/POS Binary Protocol (`src/utils/escPosPrinter.ts`) | 58mm/80mm Thermal receipt format, Cash drawer solenoid pulse (`0x1B 0x70`) |
| **Security & Sandbox** | `helmet: ^8.3.0`, `express-rate-limit: ^8.7.0`, `cors` | Token hashing (SHA-256), HttpOnly Cookies, Strict tenant scoping |

---

## ၃။ Folder ဖွဲ့စည်းပုံနှင့် အဓိကဖိုင်များ (Project Structure)

```
AJ Studio Desk/
├── docs/
│   ├── briefs/
│   │   ├── ARCHITECT_BRIEF_RETAIL_CATEGORY_EXPANSION_2026-09-18.md
│   │   └── CHECK_BRIEF_DEPLOYMENT_STATUS_2026-09-18.md
│   ├── ADR-001-production-persistence.md
│   └── production-database-adapter.md
├── drizzle/                          # PostgreSQL Migrations & Schema Snapshots
│   ├── 0000_strange_marvel_apes.sql
│   └── 0001_previous_lizard.sql
├── src/
│   ├── components/
│   │   ├── admin/                    # Modularized Admin Booking Panels
│   │   │   ├── AdminBookingDetailDrawer.tsx
│   │   │   ├── AdminBookingFilterBar.tsx
│   │   │   ├── AdminBookingMetricsRow.tsx
│   │   │   └── AdminBookingTable.tsx
│   │   ├── pos/                      # Modularized POS Desk Components
│   │   │   ├── PosCartView.tsx
│   │   │   ├── PosCatalogTabs.tsx
│   │   │   ├── PosPaymentModal.tsx
│   │   │   ├── PosReceiptModal.tsx
│   │   │   ├── PosShiftModal.tsx
│   │   │   └── PosStaffAuthBar.tsx
│   │   ├── ClientRetailShop.tsx      # Retail sales catalog UI
│   │   ├── StudioAdminBookingPanel.tsx # Admin Desk shell
│   │   ├── StudioPosDesk.tsx         # POS Terminal Main Desk
│   │   ├── StandaloneOwnerPortal.tsx # /setup/:token 5-step intake portal
│   │   └── StudioUserGuideModal.tsx  # Built-in User Manual Modal
│   ├── data/
│   │   ├── clientProductsData.ts     # 8 Categories Client Retail Catalog & Seed Data
│   │   ├── equipmentData.ts          # Studio Gear & Asset inventory
│   │   └── studioShowcases.ts        # 5 Core Studio Bay Showcases
│   ├── db/
│   │   ├── schema/                   # Drizzle Schema Definitions
│   │   │   └── index.ts              # Production studios, bookings, transactions
│   │   ├── index.ts                  # Safe connection pool with fallback
│   │   └── migrate.ts                # Auto-migration runner
│   ├── hooks/
│   │   ├── useBarcodeScanner.ts      # Hardware wedge scanner listener
│   │   ├── useOfflineSync.ts         # Network status & automatic queue flush
│   │   └── useStudioRealtimeEvents.ts # Server-Sent Events (SSE) subscriber
│   ├── server/                       # Decoupled Express Modular Architecture
│   │   ├── app.ts                    # Express Application instance & middleware wiring
│   │   ├── events/                   # SSE broadcasting hub
│   │   ├── middleware/               # Auth, tenant boundary, rate limiting
│   │   ├── routes/                   # Clean REST route controllers
│   │   │   ├── adminRoutes.ts
│   │   │   ├── assetRoutes.ts
│   │   │   ├── bookingRoutes.ts
│   │   │   ├── posRoutes.ts
│   │   │   └── setupRoutes.ts
│   │   └── utils/                    # Gemini client, crypto helpers
│   ├── services/
│   │   ├── adminBookingClientService.ts
│   │   ├── offlineQueueService.ts    # Persistent offline queue for POS items
│   │   ├── posService.ts             # POS Shifts, Cash Drops, Sales & Z-Reports
│   │   ├── posStaffService.ts        # Multi-Staff PIN auth & permission matrix
│   │   └── supabaseStorageService.ts # Cloud storage upload abstraction
│   ├── tests/                        # Automated Test Suites (11 Specs)
│   │   ├── adminBookingPanel.test.ts
│   │   ├── barcodeHardwareUX.test.ts
│   │   ├── httpIntegration.test.ts
│   │   ├── offlineQueueSync.test.ts
│   │   ├── onboardingForm.test.ts
│   │   ├── phaseB1Persistence.test.ts
│   │   ├── posDesk.test.ts
│   │   ├── posStaffAuth.test.ts
│   │   ├── realtimeHardware.test.ts
│   │   ├── runtimeRouting.test.ts
│   │   └── tenantWiring.test.ts
│   ├── utils/
│   │   └── escPosPrinter.ts          # ESC/POS Binary Protocol Generator
│   ├── types.ts                      # Universal Domain Type Contracts
│   └── App.tsx                       # Root Route Manager & Multi-View Switcher
├── server.ts                         # Standalone Server Entry Point
├── vite.config.ts                    # Vite 6 Dev & Proxy Configuration
├── package.json                      # NPM Dependencies & Scripts
└── .env.example                      # Environment variables template
```

---

## ၄။ ပြီးစီးပြီးသော အဓိကစနစ်များနှင့် စွမ်းဆောင်ရည်များ (Completed Modules & Capabilities)

### (က) Customer Booking Intake Portal (အွန်လိုင်း ဘွတ်ကင်စနစ်)
* **၅ ခုသော Studio Showcases:** Commercial Studio Rigs (Bay Alpha-01), Editorial Portrait Nook (Bay Beta-02), Pre-Born & Newborn, Maternity & Family, High-Speed Commercial Rigs တို့ကို High-Res ဓာတ်ပုံများနှင့်တကွ ပြသထားသည်။
* **Glass Plate UI Design System:** Semi-transparent cyan-glowing `.btn-glass-plate` ဒီဇိုင်းဖြင့် modern UI experience ပေးသည်။
* **Full-Screen Lightbox:** ESC ခလုတ်၊ Backdrop click နှင့် Scroll locking တို့ပါဝင်သော Fullscreen image viewer။

### (ခ) Studio Admin Operations Desk (စီမံခန့်ခွဲမှု ကောင်တာ)
* ဘွတ်ကင်များကို Tenant အလိုက် သီးသန့်ခွဲခြားထားပြီး (`Multi-tenant boundary`) အခြားစတူဒီယိုများ၏ ဒေတာနှင့် မရောထွေးစေပါ။
* Status workflow: `PENDING_REVIEW` ➔ `CONFIRMED` ➔ `IN_PROGRESS` ➔ `COMPLETED` / `CANCELLED`။
* အချိန်ပြောင်းလဲခြင်း (Reschedule) ပြုလုပ်ပါက Space availability conflict ကို အလိုအလျောက် တိုက်စစ်ပေးသည်။
* ပြင်ဆင်မှုတိုင်းကို မည်သူက မည်သည့်အချိန်တွင် ပြုလုပ်ခဲ့ကြောင်း `Immutable Audit Timeline` ဖြင့် မှတ်တမ်းတင်သည်။

### (ဂ) Gemini AI Automated Slip OCR Verification (ငွေလွှဲပြေစာ အလိုအလျောက် စစ်ဆေးခြင်း)
* ဧည့်သည်တင်သွင်းလာသော KBZPay, WavePay, AYA Pay, ဘဏ်ငွေလွှဲစလစ်များကို Google Gemini Flash Vision API ဖြင့် ဖတ်ရှုသည်။
* Transaction Number, ငွေလွှဲသည့် ပမာဏ (Amount in MMK), အချိန်နှင့် လက်ခံသူအမည်တို့ကို အလိုအလျောက် ထုတ်ယူပြီး ဘွတ်ကင်နှင့် တိုက်စစ်ပေးသည်။

### (ဃ) POS Desk Terminal & Cash Drawer Management (အရောင်းကောင်တာစနစ်)
* **Shift Management:** ကောင်တာဖွင့်ချိန်တွင် အစဦးမတည်ငွေ (Starting Float) ဖြင့် စတင်ပြီး နေ့စဉ်အရောင်းများကို မှတ်တမ်းတင်သည်။
* **ငွေပေးချေမှုစနစ်များ:** Cash, KBZPay, WavePay, AYA Pay အပြင် Split Payment (ဥပမာ- တစ်ဝက် ငွေသား၊ တစ်ဝက် KPay) ကို တိကျစွာ လက်ခံနိုင်သည်။
* **X-Report (Mid-Shift Audit):** ဆိုင်းမသိမ်းမီ လက်ရှိရောင်းရငွေနှင့် အံဆွဲထဲရှိ ငွေစာရင်းကို ကြားဖြတ်စစ်ဆေးနိုင်သည်။
* **Z-Report (Shift Closure & Discrepancy):** ဆိုင်းသိမ်းချိန်တွင် အမှန်တကယ် ရေတွက်ရရှိသော ငွေသားနှင့် စနစ်တွက်ချက်ငွေ ကွာဟချက် (Shortage / Overage / Balanced) ကို ရှင်းတမ်းထုတ်ပေးပြီး Shift သစ် ဖွင့်လှစ်နိုင်သည်။
* **Cash Movements:** Safe ထဲသို့ ငွေလွှဲသိမ်းခြင်း (Cash Drop) နှင့် အကြွေဖြည့်တင်းခြင်း (Cash In) များကို သီးခြား Voucher ဖြင့် ထိန်းချုပ်သည်။

### (င) ESC/POS Thermal Printing & Cash Drawer Kick (အပူပေးပရင်တာနှင့် အံဆွဲဖွင့်စနစ်)
* `src/utils/escPosPrinter.ts` တွင် 58mm နှင့် 80mm အပူပေးပရင်တာများအတွက် Native ESC/POS Binary Bytes (`Uint8Array`) များကို တိုက်ရိုက်ထုတ်ပေးသည်။
* ငွေသားရှင်းချိန်တွင် အံဆွဲကို အလိုအလျောက် ကန်ဖွင့်ပေးနိုင်သည့် Drawer Kick Command (Pin 2: `ESC p 0`, Pin 5: `ESC p 1`) ပါဝင်သည်။
* ပြေစာခေါင်းစဉ်၊ အရောင်းစာရင်း၊ အခွန်/လျှော့စျေး၊ Split breakdown၊ QR Code နှင့် စက္ကူဖြတ်တောက်မှု (`GS V 0`) များကို standard command များဖြင့် ရေးဆွဲထားသည်။

### (စ) Barcode Scanner Hardware Integration (ဘားကုဒ်ဖတ်စနစ်)
* `src/hooks/useBarcodeScanner.ts` သည် USB / Bluetooth Hardware Wedge Scanner များမှ ရိုက်ထည့်လိုက်သော Keystroke များကို Buffer ဖြင့် ဖမ်းယူပြီး `Enter` ခေါက်ချိန်တွင် ချက်ချင်း အလုပ်လုပ်သည်။
* Barcode ဖတ်ယူမှု အောင်မြင်ပါက Audio Beep သံ ထွက်ပေါ်သည်။
* Retail Product SKU, Studio Equipment Asset Code နှင့် Photo Service Packages များကို 1-Scan ဖြင့် Cart ထဲသို့ တိုက်ရိုက် ထည့်သွင်းပေးသည်။

### (ဆ) Multi-Staff Fast PIN Switch & Audit Roles (ဝန်ထမ်း PIN အမြန်လဲလှယ်မှု)
* ဝန်ထမ်းများသည် မိမိ၏ ၄ လုံးတွဲ PIN သို့မဟုတ် ဝန်ထမ်းကတ် Barcode ကို Scan ဖတ်ရုံဖြင့် ကောင်တာတာဝန်ကို စက္ကန့်ပိုင်းအတွင်း လဲလှယ်နိုင်သည်။
* ရာထူးအဆင့် ၄ မျိုး သတ်မှတ်ထားသည်:
  1. `CASHIER`: အရောင်းဖွင့်ခြင်း၊ ပြေစာထုတ်ခြင်း (Cart ဖျက်သိမ်းခြင်းနှင့် ကြီးမားသော Cash Drop အတွက် ခွင့်ပြုချက် လိုအပ်သည်)။
  2. `LEAD_CASHIER`: Cart ဖျက်သိမ်းခြင်းနှင့် အထွေထွေပြင်ဆင်မှု ခွင့်ပြုချက်။
  3. `STUDIO_MANAGER`: Cash Drop ၅၀,၀၀၀ ကျပ်အထက် ခွင့်ပြုခြင်း၊ နေ့စဉ် အစီရင်ခံစာ ထုတ်ယူခြင်း။
  4. `OWNER`: အခွင့်အာဏာ အပြည့်အစုံ။

### (ဇ) Offline-First Synchronization Queue (အော့ဖ်လိုင်း အရောင်းသိမ်းဆည်းမှု)
* ခန်းမတွင်း အင်တာနက်လိုင်း ပြတ်တောက်သွားသော်လည်း POS အရောင်းများ၊ ဘွတ်ကင်ရှင်းတမ်းများနှင့် Z-Report များကို Local Storage Queue ထဲတွင် သိမ်းဆည်းထားသည်။
* အင်တာနက်လိုင်း ပြန်လည်ရရှိချိန်တွင် Background Worker မှ Server ဆီသို့ `/api/pos/transactions` bulk batch sync အလိုအလျောက် ပေးပို့သည်။

### (ဈ) Client Retail Shop & Category Expansion (လက်လီပစ္စည်း ၈ မျိုး ချဲ့ထွင်ခြင်း)
Architect Brief အရ မူလ ၅ မျိုးအပြင် နောက်ထပ် အမျိုးအစား ၃ မျိုးကို အောင်မြင်စွာ တိုးချဲ့ပေါင်းစပ်ထားသည်:
1. `frames_canvas` (Photo Frames & Canvas Wraps)
2. `photo_albums` (Hardcover & Leather Albums)
3. `storage_media` (High-Speed USBs & Memory Cards)
4. `film_supplies` (35mm Film Rolls & Disposable Cameras)
5. `studio_merch` (Studio Apparel & Caps)
6. `apparel` ⭐️ **(အသစ် - ဝယ်ယူနိုင်သော အဝတ်အထည်နှင့် ဖက်ရှင်ပစ္စည်းများ)**
7. `baby_accessories` ⭐️ **(အသစ် - ကလေး/မွေးကင်းစ အသုံးအဆောင်နှင့် ဓာတ်ပုံရိုက် အထောက်အကူပစ္စည်းများ)**
8. `digital_products` ⭐️ **(အသစ် - Digital Presets, High-Res Wallpapers & Digital Licenses)**

### (ည) Standalone Owner Pre-Configuration Portal (`/setup/:token`)
* စတူဒီယိုပိုင်ရှင်များ မိမိတို့၏ ဆိုင်အချက်အလက်ကို ထည့်သွင်းနိုင်သည့် 5-Step Intake Form။
* လုံခြုံရေးအတွက် SHA-256 Token Hash၊ HttpOnly Session Cookie နှင့် Project Isolation စနစ်များ ထည့်သွင်းထားသည်။

---

## ၅။ လက်ရှိ Git Branch (`feat/retail-category-expansion`) နှင့် Refactoring မှတ်တမ်း

လက်ရှိ Branch တွင် အောက်ပါ အဓိက ဗိသုကာ ပြုပြင်ပြောင်းလဲမှု (Architectural Refactoring) များကို စနစ်တကျ ပြုလုပ်ခဲ့ပါသည်:

1. **Backend Server Modularization:**
   - မူလ `server.ts` ဖိုင်ကြီး (လိုင်းပေါင်း ၁,၅၀၀ ကျော်) အား `src/server/` အောက်ရှိ သီးခြား Module များ (`app.ts`, `routes/`, `middleware/`, `events/`, `utils/`) သို့ ခွဲထုတ် ရှင်းလင်းခဲ့သည်။
   - Compiled file ဖြစ်သော `server.js` အား Git tracking မှ ဖယ်ရှားပြီး `.gitignore` တွင် ထည့်သွင်းခဲ့သည်။ `npm run build:server` ဖြင့် esbuild မှ 18ms အတွင်း သန့်ရှင်းစွာ compile လုပ်ပေးသည်။

2. **Frontend Component Decomposition:**
   - [StudioAdminBookingPanel.tsx](file:///Users/htoowai/Documents/Products/AJ%20Studio%20Desk_ERP/Aj%20AI%20Studio%20POS/src/components/StudioAdminBookingPanel.tsx) အား [src/components/admin/](file:///Users/htoowai/Documents/Products/AJ%20Studio%20Desk_ERP/Aj%20AI%20Studio%20POS/src/components/admin/) အောက်သို့ Drawer, FilterBar, MetricsRow, Table ဟူ၍ ခွဲထုတ်ခဲ့သည်။
   - [StudioPosDesk.tsx](file:///Users/htoowai/Documents/Products/AJ%20Studio%20Desk_ERP/Aj%20AI%20Studio%20POS/src/components/StudioPosDesk.tsx) အား [src/components/pos/](file:///Users/htoowai/Documents/Products/AJ%20Studio%20Desk_ERP/Aj%20AI%20Studio%20POS/src/components/pos/) အောက်သို့ CartView, CatalogTabs, PaymentModal, ReceiptModal, ShiftModal, StaffAuthBar ဟူ၍ ခွဲထုတ်ခဲ့သည်။

---

## ၆။ စနစ်စမ်းသပ်ခြင်းနှင့် Run ပြုလုပ်နည်း (Verification & Run Scripts)

### ၁။ Local Development စတင်ရန်

```bash
# Terminal 1: Backend API Daemon (Port 4000)
npm run server

# Terminal 2: Frontend Web UI (Port 3010)
npm run dev
```
*Browser တွင် `http://localhost:3010` သို့ ဝင်ရောက်နိုင်ပါသည်။*

### ၂။ Static Type Checking စစ်ဆေးရန်

```bash
npm run lint
# သို့မဟုတ်
npx tsc --noEmit
```
*(TypeScript Compile အမှားအယွင်းမရှိ 0 Errors ဖြင့် ပြီးမြောက်ပါသည်)*

### ၃။ Frontend Production Bundle ထုတ်ရန်

```bash
npm run build
```
*(Vite 6 ဖြင့် dist/ ဖိုဒါထဲသို့ bundle ထုတ်လုပ်ပေးပါသည်)*

### ၄။ Backend Production Server Compile ပြုလုပ်ရန်

```bash
npm run build:server
```
*(esbuild ဖြင့် server.js သို့ bundle လုပ်ပေးပြီး Node.js ဖြင့် တိုက်ရိုက် run နိုင်ပါသည်)*

### ၅။ Automated Test Suite အားလုံး စစ်ဆေးရန်

```bash
npm test
```

---

## ၇။ Audit တွေ့ရှိချက်များနှင့် ဖြေရှင်းရန် လိုအပ်ချက်များ (Audit Findings & Remediation Plan)

၂၀၂၆ အောက်တိုဘာ ၉ ရက် Audit အရ အောက်ပါ အချက် ၂ ချက်ကို ဦးစားပေး ဖြေရှင်းရန် လိုအပ်ပါသည်:

### ၁။ `offlineQueueSync.test.ts` Offline Runner စစ်ဆေးမှု (P1)
* **ပြဿနာ:** `npm test` ပြုလုပ်ချိန်တွင် Server (port 4000) ကြိုတင် run မထားပါက `offlineQueueSync.test.ts` သည် `fetch failed ECONNREFUSED` error တက်ပြီး ရပ်တန့်သွားသည်။
* **အခြေအနေ:** ✅ **RESOLVED & VERIFIED IN PHASE 1** — `offlineQueueSync.test.ts` တွင် in-process `createApp()` ကို ephemeral port တွင် run ၍ session auth ဖြင့် offline runner တွင် pass ဖြစ်အောင် ဖြေရှင်းပြီးစီးခဲ့သည်။

### ၂။ NPM Dependencies Security Update (P1)
* **အခြေအနေ:** ✅ **RESOLVED & VERIFIED IN PHASE 1** — `npm audit fix` ဖြင့် Critical (`proxy-addr`) နှင့် High (`source-map-js`) vulnerability များကို ရှင်းလင်းခဲ့သည်။ (0 Critical, 0 High)

---

---

## ၈။ Phase 1.5 Public Demo Architecture & Operations (အများသုံး Demo စနစ် လည်ပတ်ပုံ)

### က။ Migration & Database Role Run Order (အဆင့်ဆင့် Run ရန် အစီအစဉ်)
Public Demo စနစ်အား Production သို့မဟုတ် Staging တွင် အသစ်တပ်ဆင်ရာတွင် အောက်ပါအစီအစဉ်အတိုင်း တိကျစွာ run ရမည်ဖြစ်သည်:
```bash
# အဆင့် ၁: Main schema (public) migrations များ run ခြင်း (owner role)
npm run db:migrate

# အဆင့် ၂: Demo schema (demo) migrations များ run ခြင်း (owner role ဖြင့် search_path=demo ထား၍ foreign keys များကို demo သို့ re-point ပြုလုပ်ခြင်း)
npm run db:migrate:demo

# အဆင့် ၃: demo_app role အား ဖန်တီး၍ schema demo သို့ privileges ပေးပြီး public privileges များအားလုံး revoke ပြုလုပ်ခြင်း
DATABASE_URL="postgres://..." DEMO_DB_PASSWORD="secure_password" tsx src/scripts/createDemoRole.ts
```

### ခ။ VPS Reverse Proxy & TLS Configuration (`TRUST_PROXY`)
Production VPS တွင် Nginx သို့မဟုတ် Caddy စသော TLS reverse proxy များနောက်၌ Express server run သည့်အခါ Same-Origin CORS requests များနှင့် visitor IP limiter များ မှန်ကန်စေရန် `.env` တွင် အောက်ပါအတိုင်း သတ်မှတ်ပေးရမည်:
```env
TRUST_PROXY=1
```
ယင်းကြောင့် `X-Forwarded-Proto: https` ဖြစ်ပါက `req.protocol` သည် `https` ဖြစ်လာပြီး Browser ၏ `Origin: https://<domain>` နှင့် တိုက်ဆိုင်စစ်ဆေးမှု အောင်မြင်မည်ဖြစ်သည်။

### ဂ။ Public Demo Fail-Closed & Hardened Security Guarantees
1. **Fail-Closed DB Configuration:** `DEMO_MODE=true` ဖြစ်ပြီး `DEMO_DATABASE_URL` မရှိပါက Server မစတင်ဘဲ ရပ်တန့်မည်ဖြစ်သည် (`DATABASE_URL` သို့ silent fallback လုံးဝ မပြုလုပ်ပါ)။
2. **Runtime Isolation Assertion:** Demo routes များ မ mount မီ `has_table_privilege(current_user, 'public.production_studios', 'SELECT') === false` နှင့် `current_schema() === 'demo'` ဟုတ်မဟုတ် စစ်ဆေးသည်။ မဟုတ်ပါက demo routes များ mount မလုပ်ဘဲ 404 ပြန်ပေးသည်။
3. **Endpoint Security & HMAC-Signed Cookies:**
   - `/api/demo/cleanup` နှင့် `/api/demo/reseed-sample` တို့သည် `ADMIN_API_KEY` မပါပါက `401 Unauthorized` ဖြစ်သည်။
   - `/api/demo/reset` နှင့် `/api/demo/activity` တို့သည် visitor ၏ HMAC-signed session cookie မှသာ lead/sandbox ID ကို ရယူပြီး body မှ sandboxId ကို အယုံအကြည်မရှိ လျစ်လျူရှုသည်။
   - `sample-studio` အား reset ပြုလုပ်ခွင့်ကို ပိတ်ပင်ထားသည် (403 Forbidden)။
   - `/api/demo/signup` တွင် IP တစ်ခုလျှင် တစ်နာရီ ၅ ခုသာ ခွင့်ပြုထားပြီး ၆ ခုမြောက်တွင် error text မပါသော လမ်းညွှန်စာသား (Guidance) ဖြင့် တားမြစ်သည်။
4. **In-Process Scheduler:** Sandboxes idle > 7 days cleanup နှင့် 03:00 Asia/Yangon (UTC+06:30) `sample-studio` reseed တို့သည် daily scheduler ဖြင့် တစ်ရက်လျှင် တစ်ကြိမ်သာ တိကျစွာ run သည်။
5. **Offline Memory Isolation:** `memorySandboxes`, `memoryLeadToSandboxId`, `memorySandboxToLeadId` တို့သည် `getDb() === null` (offline test) ဖြစ်မှသာ အသုံးပြုပြီး Postgres ချိတ်ဆက်ထားချိန်တွင် PostgreSQL `demo` schema ကိုသာ ၁၀၀% အသုံးပြုသည်။

---

## ၉။ ရှေ့ဆက်ဆောင်ရွက်ရန် Roadmap (Next Steps & Launch Roadmap)

1. **Phase 1 & Phase 1.5 Production Foundation (ပြီးစီး):**
   - Foundation & Isolation Gate အားလုံး ဖြေရှင်းပြီးစီးခဲ့ပြီး Acceptance Gates 1–8 အားလုံး အောင်မြင်ထားသည်။
2. **Git Commit & Deployment (Claude Action):**
   - Verifier & Deployer ဖြစ်သော Claude မှ Phase 1.5 Fix Round 2 working tree အား အတည်ပြု commit ရေးသွင်းခြင်းနှင့် Deploy ပြုလုပ်ခြင်း။
3. **Phase 2 (New Features) သို့ ကူးပြောင်းခြင်း:**
   - Reports, Inventory, Loyalty စသော New Feature များကို Ko Htoo ၏ လမ်းညွှန်ချက်အတိုင်း စတင်ဆောင်ရွက်ခြင်း။
4. **Phase 3 (UI/UX Redesign):**
   - စနစ်တစ်ခုလုံး၏ UI/UX အသွင်အပြင်ကို နောက်ဆုံးအဆင့်အဖြစ် အဆင့်မြှင့်တင်ခြင်း။

---

*ဤမှတ်တမ်းသည် AJ Studio Desk ၏ Phase 1 & 1.5 Production Foundation ပြီးမြောက်မှုနှင့် လွှဲပြောင်းရယူမည့် အင်ဂျင်နီယာ/Claude အတွက် အပြည့်စုံဆုံး လမ်းညွှန်ချက် ဖြစ်ပါသည်။*
