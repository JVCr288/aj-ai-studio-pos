import fs from 'node:fs';
import path from 'node:path';
import { AddressInfo } from 'node:net';
import { chromium, Page } from '@playwright/test';
import { createApp } from '../server/app.js';
import { reseedSampleStudio, provisionOrRestoreSandbox } from '../server/services/demoProvisioningService.js';
import { hashWithScrypt } from '../server/utils/crypto.js';
import { getDb } from '../db/index.js';
import { adminUsers, productionStudios, customerBookings, posStaff } from '../db/schema/index.js';

const OUTPUT_DIR = path.resolve(process.cwd(), 'docs/showroom-capture');

async function main() {
  console.log('=== RUNNING DEMO SHOWROOM SCREENSHOT CAPTURE (PLAYWRIGHT) ===\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  process.env.NODE_ENV = 'production';
  process.env.DEMO_MODE = 'true';

  // Seed permanent sample studio and demo sandbox
  console.log('1. Seeding sample studio and provisioned demo sandbox...');
  await reseedSampleStudio();
  const demoProvision = await provisionOrRestoreSandbox(
    'lead-capture-01',
    'Aung Light Studio'
  );

  // Ensure test admin exists in DB if live
  const db = getDb();
  if (db) {
    try {
      const adminHash = await hashWithScrypt('DemoAdmin2026!');
      await db
        .insert(adminUsers)
        .values({
          tenantId: demoProvision.sandboxId,
          username: 'admin',
          passwordHash: adminHash,
          role: 'STUDIO_ADMIN',
          isActive: true,
        })
        .onConflictDoNothing();
    } catch (e) {
      console.warn('DB seed notice:', e);
    }
  }

  // Start app server in production mode serving static dist/
  const app = createApp({ demoMode: true });
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`2. Local server started on ${baseUrl}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // -------------------------------------------------------------------------
    // SCREEN 1: Customer Booking Desktop (1440x900) & Mobile (390x844)
    // -------------------------------------------------------------------------
    console.log('3. Capturing Screen 1: Customer Booking flow...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const desktopPage = await desktopContext.newPage();

    await desktopPage.goto(`${baseUrl}/s/sample-studio`, { waitUntil: 'networkidle' });
    // If not directly on packages, click Book or direct booking
    await desktopPage.waitForTimeout(1000);
    await desktopPage.screenshot({
      path: path.join(OUTPUT_DIR, '01-customer-booking.png'),
      fullPage: false,
    });
    console.log('  📸 Saved: docs/showroom-capture/01-customer-booking.png (1440x900)');

    // Mobile Booking Screen (390x844)
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${baseUrl}/s/sample-studio?direct=booking`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1000);
    await mobilePage.screenshot({
      path: path.join(OUTPUT_DIR, '01-customer-booking-mobile.png'),
      fullPage: false,
    });
    console.log('  📸 Saved: docs/showroom-capture/01-customer-booking-mobile.png (390x844)');
    await mobileContext.close();

    // -------------------------------------------------------------------------
    // SCREEN 2: Slip Check Result (Desktop 1440x900)
    // -------------------------------------------------------------------------
    console.log('4. Capturing Screen 2: Slip Check Verification Result...');
    await desktopPage.goto(`${baseUrl}/?step=3`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(2200);
    await desktopPage.screenshot({
      path: path.join(OUTPUT_DIR, '02-slip-check-result.png'),
      fullPage: false,
    });
    console.log('  📸 Saved: docs/showroom-capture/02-slip-check-result.png (1440x900)');

    // Also capture Burmese HelpTip on Slip Result
    const slipHelpIcon = desktopPage.locator('button[title^="လမ်းညွှန်ချက်:"], button[aria-label^="လမ်းညွှန်ချက်:"]').first();
    if (await slipHelpIcon.isVisible()) {
      await slipHelpIcon.click();
      await desktopPage.waitForTimeout(500);
      await desktopPage.screenshot({
        path: path.join(OUTPUT_DIR, 'tip-slip-result.png'),
        fullPage: false,
      });
      console.log('  📸 Saved: docs/showroom-capture/tip-slip-result.png');
      await desktopPage.keyboard.press('Escape');
      await desktopPage.waitForTimeout(300);
    }

    // -------------------------------------------------------------------------
    // SCREEN 3: Admin Booking Desk (Desktop 1440x900)
    // -------------------------------------------------------------------------
    console.log('5. Capturing Screen 3: Studio Admin Booking Desk...');
    // Login to Sandbox as Admin
    const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantSlug: demoProvision.sandboxId,
        username: 'admin',
        password: 'DemoAdmin2026!',
      }),
    });
    const loginCookies = loginRes.headers.get('set-cookie');
    const adminSessionCookie = loginCookies?.split(';')[0].split('=')[1] || '';

    // Set cookie on browser context
    await desktopContext.addCookies([
      {
        name: 'aj_admin_session',
        value: adminSessionCookie,
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    await desktopPage.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1500);
    await desktopPage.screenshot({
      path: path.join(OUTPUT_DIR, '03-admin-booking-desk.png'),
      fullPage: false,
    });
    console.log('  📸 Saved: docs/showroom-capture/03-admin-booking-desk.png (1440x900)');

    // -------------------------------------------------------------------------
    // SCREEN 4: POS Desk & Receipt Preview (Desktop 1440x900)
    // -------------------------------------------------------------------------
    console.log('6. Capturing Screen 4: POS Terminal Desk & Receipt Preview...');
    await desktopPage.goto(`${baseUrl}/pos`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1500);

    // Click Packages tab and add an item to cart
    const pkgTab = desktopPage.getByRole('button', { name: 'Packages', exact: true });
    if (await pkgTab.isVisible()) {
      await pkgTab.click();
      await desktopPage.waitForTimeout(500);
      const addBtn = desktopPage.locator('button:has-text("Add to Ticket")').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await desktopPage.waitForTimeout(500);
      }
    }

    // Capture HelpTip on POS desk
    const posHelpIcon = desktopPage.locator('button[title^="လမ်းညွှန်ချက်:"], button[aria-label^="လမ်းညွှန်ချက်:"]').first();
    if (await posHelpIcon.isVisible()) {
      await posHelpIcon.click();
      await desktopPage.waitForTimeout(500);
      await desktopPage.screenshot({
        path: path.join(OUTPUT_DIR, 'tip-pos-desk.png'),
        fullPage: false,
      });
      console.log('  📸 Saved: docs/showroom-capture/tip-pos-desk.png');
      await desktopPage.keyboard.press('Escape');
      await desktopPage.waitForTimeout(300);
    }

    // Complete sale to open Thermal Receipt Modal
    const checkoutBtn = desktopPage.locator('button:has-text("Complete & Print Receipt")').first();
    if (await checkoutBtn.isVisible()) {
      await checkoutBtn.click();
      await desktopPage.waitForTimeout(800);
    }

    await desktopPage.screenshot({
      path: path.join(OUTPUT_DIR, '04-pos-desk-receipt.png'),
      fullPage: false,
    });
    console.log('  📸 Saved: docs/showroom-capture/04-pos-desk-receipt.png (1440x900)');

    // Close Receipt Modal
    await desktopPage.keyboard.press('Escape');
    await desktopPage.waitForTimeout(500);

    // -------------------------------------------------------------------------
    // SCREEN 5: Z-Report Shift Modal (Desktop 1440x900)
    // -------------------------------------------------------------------------
    console.log('7. Capturing Screen 5: Z-Report Thermal Preview...');
    const shiftBtn = desktopPage.locator('button:has-text("Reconcile / Z-Report")').first();
    if (await shiftBtn.isVisible()) {
      await shiftBtn.click();
      await desktopPage.waitForTimeout(800);
    }
    await desktopPage.screenshot({
      path: path.join(OUTPUT_DIR, '05-z-report.png'),
      fullPage: false,
    });
    console.log('  📸 Saved: docs/showroom-capture/05-z-report.png (1440x900)');
    await desktopPage.keyboard.press('Escape');
    await desktopPage.waitForTimeout(500);

    // -------------------------------------------------------------------------
    // SCREEN 6: Settings Modal Help Tip
    // -------------------------------------------------------------------------
    console.log('8. Capturing Settings Burmese HelpTip...');
    await desktopPage.goto(`${baseUrl}/?settings=true`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1000);

    const settingsHelpIcon = desktopPage.locator('button[title^="လမ်းညွှန်ချက်:"], button[aria-label^="လမ်းညွှန်ချက်:"]').first();
    if (await settingsHelpIcon.isVisible()) {
      await settingsHelpIcon.click();
      await desktopPage.waitForTimeout(500);
    }
    await desktopPage.screenshot({
      path: path.join(OUTPUT_DIR, 'tip-settings.png'),
      fullPage: false,
    });
    console.log('  📸 Saved: docs/showroom-capture/tip-settings.png');

    await desktopContext.close();

    console.log('\n🎉 ALL 5 SHOWROOM SCREENS + BURMESE HELPTIPS CAPTURED TO docs/showroom-capture/!\n');
    process.exit(0);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
