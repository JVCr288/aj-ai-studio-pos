# AJ AI Studio — Client Data Intake Platform Architecture

**Product:** AJ AI Studio Platform  
**Authority:** Platform Owner & Multi-Tenant Data Handoff Pipeline  
**Canonical Public URL:** https://ajaxclickaistudio.com/  
**Pilot Tenant:** AJ AI Studio (Master Edition)  
**Schema Version:** 1.0  
**Updated:** 2026-09-15

---

## 1. Overview

The AJ AI Studio Client Data Intake Platform provides a structured, multi-tenant intake, review, and production persistence engine for photography studios.

```
AJ AI Studio Platform Root
  ├── Platform Container & Shell Identity (AJ AI Studio POS)
  ├── Multi-Tenant Configuration Layer
  │     └── Default Master Studio: AJ AI Studio
  ├── Studio Owner Pre-Configuration Intake (5 Steps)
  │     ├── Step 1: Studio Information
  │     ├── Step 2: Spaces & Availability
  │     ├── Step 3: Booking, Payment & Invoice
  │     ├── Step 4: Brand Assets
  │     └── Step 5: Review & Submit
  ├── Review & Handoff Lifecycle (Immutable Snapshots)
  └── Production Persistence Boundary (PostgreSQL / Drizzle)
```

---

## 2. Core Architecture Rules

1. **AJ AI Studio Platform Ownership**: AJ AI Studio POS is the hero brand, platform identity, and architectural owner.
2. **Tenant Parameterization**: AJ AI Studio POS is the master software product. When a studio owner purchases the software, their tenant-owned configuration (studio display name, address, payment accounts, invoice headers, brand assets) seamlessly replaces default values via tenant configuration.
3. **Five-Step Intake Form**: The client-facing pre-configuration form consists of 5 steps and does not prompt studio owners for detailed package prices or inclusion details.
4. **Package Seed Strategy**: Initial UI receives four editable placeholder packages (`Silver`, `Gold`, `Platinum`, `Diamond`) marked with `status: 'PLACEHOLDER'`. They are non-bookable until configured in the Owner/Admin Dashboard.
5. **Truthful Operations**: Developer review status (`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `NEEDS_CHANGES`, `APPROVED`, `INTEGRATED`) remains distinct from production database locks.

---

## 3. Data Flow & Contract

- **Client Intake**: Mutable draft saved locally and to backend service.
- **Submission Snapshot**: Creates an immutable snapshot version (`sub_v1`, `sub_v2`).
- **Review Console**: Developer revalidates submitted fields and asset references.
- **Production Integration**: Server-side Drizzle transaction applies approved tenant configuration to PostgreSQL.
