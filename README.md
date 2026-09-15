# AJ AI Studio Platform — POS & Booking Operations

**Master Tenant:** AJ AI Studio  
**Platform Version:** 2.4.0  

AJ AI Studio POS is an enterprise-grade multi-tenant studio management platform, customer booking intake engine, POS desk terminal, and automated payment slip OCR verification system.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (`.env`)
Create a `.env` file in the project root:
```env
PORT=4000
ADMIN_API_KEY=dev-admin-secret
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Development Servers

**Run Frontend Dev Server (Vite on port 3010):**
```bash
npm run dev
```

**Run Backend API Daemon (Express on port 4000):**
```bash
npm run server
```

Open `http://localhost:3010` in your web browser.

---

## 🧪 Verification & Testing

Run all 7 canonical automated test suites:
```bash
npm test
```

Run TypeScript static type verification:
```bash
npx tsc --noEmit
```

Build production bundle:
```bash
npm run build
```

---

## 📚 Key Documentation Files

- [PROJECT_BRIEF.md](file:///Users/htoowai/Documents/Aj%20AI%20Studio%20POS/PROJECT_BRIEF.md) — Executive brief, core pillars, white-label policy, and module breakdown.
- [FYI.md](file:///Users/htoowai/Documents/Aj%20AI%20Studio%20POS/FYI.md) — Developer quick reference, environment keys, local fallback adapter details, and FAQs.
- [AJ-AI-STUDIO-CLIENT-DATA-INTAKE-PLATFORM-ARCHITECTURE.md](file:///Users/htoowai/Documents/Aj%20AI%20Studio%20POS/AJ-AI-STUDIO-CLIENT-DATA-INTAKE-PLATFORM-ARCHITECTURE.md) — Client intake platform architecture specification.
- [AJ-AI-STUDIO-OWNER-PRECONFIGURATION-FORM-SPEC.md](file:///Users/htoowai/Documents/Aj%20AI%20Studio%20POS/AJ-AI-STUDIO-OWNER-PRECONFIGURATION-FORM-SPEC.md) — Owner pre-configuration 5-step form specification.

---

## 🏛️ Project Architecture Overview

```
AJ AI Studio POS/
├── src/
│   ├── components/       # UI Components (Landing, Admin Panel, POS Desk, Lightbox)
│   ├── services/         # API Client & Server In-Memory Booking Services
│   ├── tests/            # 7 Canonical Automated Test Suites
│   └── types/            # Shared TypeScript Contracts & Domain Models
├── server.ts             # Express API Server (Slip OCR, Admin Auth, Health Check)
├── vite.config.ts        # Vite Configuration & Proxy Rules
├── PROJECT_BRIEF.md      # Full Executive & Technical Brief
├── FYI.md                # Developer FYI & Quick Reference Guide
└── README.md             # High-Level Project Overview & Setup Instructions
```

---

## 🛡️ License & Ownership
Copyright © 2026 **AJ AI Studio Platform**. All rights reserved. Built as a white-label studio management solution.
