# AJ AI Studio POS — System User Manual & Operational Guide

## 📌 Executive Overview
This guide provides a comprehensive step-by-step walkthrough of **AJ AI Studio POS** for Studio Owners, Admins, and Receptionists. The platform consists of **4 Core Workstations**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AJ AI Studio Platform                             │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│ 1. Customer     │ 2. Operations   │ 3. POS Desk     │ 4. Owner Setup        │
│    Portal       │    Desk         │    Terminal     │    Portal             │
│ (Booking Intake)│ (Admin Desk)    │ (Cashier POS)   │ (Owner Setup /setup)  │
└─────────────────┴─────────────────┴─────────────────┴───────────────────────┘
```

---

## 🚀 Workstation 1: Customer Booking Intake Portal
**URL:** `http://localhost:3010/` (Click **"Reserve Your Studio Session"**)

### Step-by-Step Customer Flow:
1. **Select Package (Step 1):** Customer selects an Atelier photography package (e.g. Solo Portrait, Commercial Branding, Editorial Fashion).
2. **Choose Date & Time Slot (Step 2):** Customer picks an available date on the interactive month calendar and selects a time slot (e.g., 11:00 AM, 02:00 PM).
3. **Select Payment Gateway (Step 3):** Customer chooses KBZPay, WavePay, or AYA Pay.
4. **Transfer Deposit & Attach Slip:** Customer scans the QR code, transfers 50% deposit in MMK, and uploads or drops the payment slip screenshot.
5. **Telegram Confirmation (Optional):** Customer enters their Telegram handle (e.g. `@elena_rostova`) for instant automated gate pass notifications.
6. **Submit Booking:** Click **"Verify & Confirm Booking"**.

---

## 🛡️ Workstation 2: Studio Admin Booking Operations Desk
**URL:** `http://localhost:3010` -> Click **"Booking Desk"** (or `/admin/bookings`)  
**Default Access Credential:** `dev-admin-secret`

### Key Administrative Actions:
1. **Login:** Enter `dev-admin-secret` into the Studio Admin Access modal.
2. **Review Pending Slips:**
   - Click **"Review Slip →"** or select a booking with status `AWAITING_PAYMENT_REVIEW`.
   - Click **"Verify Payment"** to confirm deposit receipt. Status updates automatically to `CONFIRMED`.
3. **Reschedule Shoot:**
   - Select a booking, click **"Reschedule"**, choose a new date/time slot, and save. Conflict checks ensure zero double-bookings.
4. **Update Booking Lifecycle:**
   - Update lifecycle state: `CONFIRMED` ➔ `CHECKED_IN` ➔ `IN_PROGRESS` ➔ `COMPLETED`.
5. **Add Private Admin Notes:**
   - Enter internal studio notes (e.g., *"Customer requested extra softbox setup"*).

---

## 💳 Workstation 3: POS Desk Terminal (Cashier & Reception)
**URL:** `http://localhost:3010` -> Click **"POS Desk"** in top header

### Cashier Shift & Transaction Workflow:
1. **Initialize Shift:** Enter starting cash drawer float (e.g., `100,000 MMK`).
2. **Lookup Booking:** Search by booking reference (e.g., `#AJ-BK-2026-8801`) to pull customer details and outstanding balance.
3. **Add Overtime & Add-ons:** Click preset add-ons if needed (e.g. *Extra Retouched Photo*, *Overtime 1 Hour*, *Wardrobe Steamer Rental*).
4. **Settle Payment:**
   - **Cash:** Enter cash tendered, system calculates change due.
   - **Digital Wallet:** Select KBZPay / WavePay merchant reference.
   - **Split Payment:** Allocate partial cash + partial KBZPay.
5. **Complete Checkout:** Click **"Complete Sale & Issue Receipt"**.

---

## ⚙️ Workstation 4: Standalone Owner Pre-Configuration Portal
**URL:** `http://localhost:3010/setup/:token` (or `/setup`)

### 5-Step Owner Onboarding:
1. **Step 1: Studio Information:** Enter studio name, primary contact, phone, email, address, Google Maps link, and Telegram bot info.
2. **Step 2: Spaces & Availability:** Configure studio bays (`BAY ALPHA-01`, `BAY BETA-02`), ceiling heights, lighting setups, operating hours.
3. **Step 3: Booking & Payment Rules:** Set deposit percentage (50%), cancellation terms, bank account numbers, merchant QR codes.
4. **Step 4: Brand Assets:** Upload studio logo, invoice logo, and watermark graphics.
5. **Step 5: Review & Submit:** Verify all entries and click **"Submit Pre-Configuration"**.

---

## 💡 Customer Delivery & Onboarding Strategy for Studio Owners

When handing this system over to a purchasing Studio Owner:

1. **Provide Setup Link:** Give the owner their unique onboarding link (e.g. `/setup/owner-token`). They complete the 5-step form to brand the software with their logo, studio name, and KBZPay QR codes.
2. **Train Staff on POS Desk:** Show receptionists how to use the **POS Desk Terminal** for walk-in clients and daily cash drawer reconciliation.
3. **Show Admin Operations Desk:** Demonstrate how studio managers review uploaded payment slips and confirm bookings.
