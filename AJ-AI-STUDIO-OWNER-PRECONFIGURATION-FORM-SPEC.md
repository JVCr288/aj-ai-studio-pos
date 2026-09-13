# AJ AI Studio — Studio Owner Pre-Configuration Form Specification

**Product:** AJ AI Studio Client Data Intake Platform  
**Form Type:** Studio Owner Pre-Configuration Intake  
**Contract:** `studio-onboarding-schema-v1` / `1.0`  
**Pilot Tenant:** AKK Photo Studio  
**Status:** Approved Scope Baseline  
**Updated:** 2026-09-13

---

## 1. Purpose

This is the first data form sent to a Studio Owner through a secure project link. It collects only the information AJ AI Studio needs to prepare the tenant's initial Studio App configuration.

Target completion time: **10–15 minutes**.

---

## 2. Five-Step Form Structure

1. **Step 1 — Studio Information**: Name, display name, owner contact, phone, email, address, timezone, language.
2. **Step 2 — Spaces & Availability**: Operating hours, day toggles, studio space list (name, type, capacity, notes).
3. **Step 3 — Booking, Payment & Invoice**: Advance window, cancellation policy, deposit rules, payment methods, invoice header profile.
4. **Step 4 — Brand Assets**: Primary logo, cover/hero image, gallery uploads, payment QR.
5. **Step 5 — Review & Submit**: Validation summary, draft autosave, immutable version submission.

---

## 3. Package Placeholder Behavior

AJ AI Studio seeds four editable placeholder packages in the initial UI:
1. Silver
2. Gold
3. Platinum
4. Diamond

Placeholders have `status: 'PLACEHOLDER'`, zero invented prices, and are non-bookable until completed in the future Owner/Admin Dashboard.
