# Production Database Persistence Adapter

**Module:** [`src/services/productionDatabaseAdapter.ts`](../src/services/productionDatabaseAdapter.ts)  
**Architecture Phase:** Phase 10.7C — Server-Side Production Database Adapter  
**Authority:** Server-Side Express API / Drizzle ORM Authority

---

## 1. Overview

The `ProductionDatabaseAdapter` implements the real server-side PostgreSQL transaction boundary for converting approved studio onboarding configuration plans into durable production records.

```
Onboarding Submission (APPROVED)
   │
   ▼
Configuration Mapper
   │
   ▼
Integration Plan & Idempotency Key Calculation
   │
   ▼
ProductionDatabaseAdapter (Server-Side Authority)
   │ (Approved Source Revalidation)
   │ (Idempotency Key Database Lock)
   ▼
PostgreSQL Transaction (Single Drizzle Transaction)
   ├── UPSERT studios
   ├── UPSERT studio_profiles
   ├── UPSERT booking_packages
   ├── UPSERT studio_spaces & studio_space_assets
   ├── UPSERT payment_configurations & payment_methods
   ├── UPSERT booking_rules
   ├── UPSERT invoice_profiles
   └── INSERT integration_operation_records
   │
   ▼
Durable Integration Receipt (COMMITTED)
```

---

## 2. Key Operational Principles

### A. Single PostgreSQL Transaction Boundary
All configuration entity upserts and audit log insertions execute inside **a single Drizzle database transaction** (`db.transaction(async (tx) => { ... })`).
- If any operation fails or throws an exception, PostgreSQL executes an **atomic rollback**. Zero partial data is persisted.

### B. Approved Source Revalidation
Before mutating production tables, the adapter revalidates the onboarding project source on the server:
- `project.status === 'APPROVED'`
- Approved submission snapshot exists and `snapshot.reviewStatus === 'APPROVED'`
- `snapshot.submissionId === plan.source.approvedSubmissionId`
- Mapper readiness state is `READY_FOR_INTEGRATION`

### C. Database Idempotency Lock
- Uses PostgreSQL unique constraint `integration_runs_idempotency_idx` on `integration_runs.idempotency_key`.
- Queries existing run before execution:
  - If a `COMMITTED` run exists for the idempotency key, returns `status: 'ALREADY_APPLIED'` with the original receipt.
  - If a concurrent transaction attempts to insert the same idempotency key, PostgreSQL rejects the duplicate write at the database level.

### D. Relational Entity Upserts
- **Studios (`studios`)**: Resolved via stable project slug (`studio-<projectId>`).
- **Booking Packages (`booking_packages`)**: Upserted via composite key `(studio_id, source_package_id)`. Prices and deposit values are stored as `bigint` whole MMK units.
- **Studio Spaces (`studio_spaces`)**: Upserted via composite key `(studio_id, source_space_id)`.
- **Space Asset Bindings (`studio_space_assets`)**: Asset UUIDs resolved from `asset_records.id` via `sourceAssetId`. Upserted via `(space_id, asset_id, role)`.
- **Payment Setup (`payment_configurations` & `payment_methods`)**: Linked strictly to `payment_config_id` (`ON DELETE CASCADE`) to eliminate cross-studio mismatch. Excludes raw OCR/settlement/transaction state.
- **Booking Rules & Invoice Profile**: 1:1 studio relations preserving setup semantics.

### E. Error Normalization & Security
- Database errors are mapped to application error codes: `DATABASE_NOT_CONFIGURED`, `SOURCE_NOT_APPROVED`, `APPROVED_SUBMISSION_MISSING`, `SOURCE_CHANGED`, `MAPPER_NOT_READY`, `TRANSACTION_FAILED`.
- Raw database connection strings, passwords, `storage_key` paths, and Base64 payloads are excluded from receipts and API responses.

### F. REAL_APPLY Public Gate
- Public runtime requests for `REAL_APPLY` remain gated behind `PRODUCTION_PERSISTENCE_NOT_CONFIGURED` until Phase 10.7D API endpoints are authenticated.

---

## 3. Verification Status

- **Static Adapter & DDL Verification**: **VERIFIED**
- **Live Local PostgreSQL Migration Execution**: **NOT VERIFIED** (Docker CLI unavailable in local environment).
