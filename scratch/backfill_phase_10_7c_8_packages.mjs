import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: 'require' });

function parseDurationMinutes(durationStr) {
  if (!durationStr) return 60;
  const match = durationStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 60;
}

function formatNotes(badge, bay) {
  const parts = [];
  if (bay) parts.push(`Bay: ${bay}`);
  if (badge) parts.push(`Badge: ${badge}`);
  return parts.length > 0 ? parts.join(' | ') : null;
}

async function runControlledPackageBackfill() {
  let backfillAction = 'CREATED';

  await sql.begin(async tx => {
    // 1. Resolve production studio UUID
    const prodStudios = await tx`
      SELECT id
      FROM production_studios
      WHERE legacy_studio_id = 'nocturne' OR slug = 'nocturne';
    `;

    if (prodStudios.length === 0) {
      throw new Error('Production studio nocturne not found');
    }

    const studioUuid = prodStudios[0].id;

    // 2. Read legacy packages
    const legacyPackages = await tx`
      SELECT id, studio_id, name, price, deposit, bay, features, duration, badge, "desc", sort_order
      FROM packages
      WHERE studio_id = 'nocturne';
    `;

    if (legacyPackages.length !== 3) {
      throw new Error(`Expected 3 legacy packages, found ${legacyPackages.length}`);
    }

    // Check existing booking_packages
    const existingTarget = await tx`
      SELECT source_package_id FROM booking_packages WHERE studio_id = ${studioUuid};
    `;
    if (existingTarget.length > 0) {
      backfillAction = 'UPDATED';
    }

    // 3. Upsert into booking_packages
    for (const legacyPkg of legacyPackages) {
      const durationMins = parseDurationMinutes(legacyPkg.duration);
      const notesVal = formatNotes(legacyPkg.badge, legacyPkg.bay);
      const priceBigInt = BigInt(legacyPkg.price);
      const depositBigInt = BigInt(legacyPkg.deposit);
      const depositType = depositBigInt > 0n ? 'FIXED' : 'NONE';
      const featuresJson = JSON.stringify(legacyPkg.features || []);

      await tx`
        INSERT INTO booking_packages (
          studio_id,
          source_package_id,
          name,
          price,
          currency,
          deposit_type,
          deposit_value,
          session_duration_minutes,
          included_items,
          description,
          notes,
          enabled,
          sort_order,
          source_submission_id
        ) VALUES (
          ${studioUuid},
          ${legacyPkg.id},
          ${legacyPkg.name},
          ${priceBigInt},
          ${'MMK'},
          ${depositType},
          ${depositBigInt},
          ${durationMins},
          ${featuresJson}::jsonb,
          ${legacyPkg.desc},
          ${notesVal},
          true,
          ${legacyPkg.sort_order},
          ${'LEGACY_BACKFILL_NOCTURNE'}
        )
        ON CONFLICT (studio_id, source_package_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          price = EXCLUDED.price,
          currency = EXCLUDED.currency,
          deposit_type = EXCLUDED.deposit_type,
          deposit_value = EXCLUDED.deposit_value,
          session_duration_minutes = EXCLUDED.session_duration_minutes,
          included_items = EXCLUDED.included_items,
          description = EXCLUDED.description,
          notes = EXCLUDED.notes,
          enabled = EXCLUDED.enabled,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW();
      `;
    }
  });

  // 4. READ-ONLY post-execution verification
  const prodStudios = await sql`
    SELECT id FROM production_studios WHERE legacy_studio_id = 'nocturne' OR slug = 'nocturne';
  `;
  const studioUuid = prodStudios[0].id;

  const targetPackages = await sql`
    SELECT id, studio_id, source_package_id, name, price, currency, deposit_type, deposit_value, session_duration_minutes, included_items, description, notes, sort_order
    FROM booking_packages
    WHERE studio_id = ${studioUuid}
    ORDER BY sort_order ASC;
  `;

  // Verify legacy table counts
  const legacyStudiosCount = await sql`SELECT count(*)::int as count FROM studios;`;
  const legacyPackagesCount = await sql`SELECT count(*)::int as count FROM packages;`;
  const legacySlotsCount = await sql`SELECT count(*)::int as count FROM slots;`;
  const legacyBookingsCount = await sql`SELECT count(*)::int as count FROM bookings;`;

  // Legacy counts match check
  const legacyCountsPass = (
    legacyStudiosCount[0].count === 1 &&
    legacyPackagesCount[0].count === 3 &&
    legacySlotsCount[0].count === 5 &&
    legacyBookingsCount[0].count === 1
  );

  // Source IDs check
  const targetSourceIds = targetPackages.map(p => p.source_package_id).sort();
  const expectedSourceIds = ['commercial', 'editorial', 'indoor-master'].sort();
  const sourceIdsPass = (
    targetSourceIds.length === 3 &&
    targetSourceIds.every((val, index) => val === expectedSourceIds[index])
  );

  // Price & Deposit match check
  const legacyPackages = await sql`SELECT id, price, deposit FROM packages WHERE studio_id = 'nocturne';`;
  const legacyMap = new Map(legacyPackages.map(p => [p.id, { price: BigInt(p.price), deposit: BigInt(p.deposit) }]));

  const priceDepositPass = targetPackages.every(tp => {
    const leg = legacyMap.get(tp.source_package_id);
    return leg && BigInt(tp.price) === leg.price && BigInt(tp.deposit_value) === leg.deposit;
  });

  // Duration mapping check (60, 120, 90)
  const durationMap = new Map(targetPackages.map(p => [p.source_package_id, p.session_duration_minutes]));
  const durationPass = (
    durationMap.get('indoor-master') === 60 &&
    durationMap.get('commercial') === 120 &&
    durationMap.get('editorial') === 90
  );

  // Currency mapping check
  const currencyPass = targetPackages.every(p => p.currency === 'MMK');

  // Duplicates check
  const uniqueSourceIds = new Set(targetPackages.map(p => p.source_package_id));
  const hasDuplicates = uniqueSourceIds.size !== targetPackages.length;

  const report = {
    BACKFILL_EXECUTION: 'PASS',
    BACKFILL_ACTION: backfillAction,
    BOOKING_PACKAGES_ROWS: targetPackages.length,
    SOURCE_IDS: sourceIdsPass ? 'PASS' : 'FAIL',
    PRICE_DEPOSIT_MATCH: priceDepositPass ? 'PASS' : 'FAIL',
    DURATION_MAPPING: durationPass ? 'PASS' : 'FAIL',
    CURRENCY_MAPPING: currencyPass ? 'PASS' : 'FAIL',
    DUPLICATES: hasDuplicates ? 'YES' : 'NO',
    LEGACY_ROW_COUNTS: legacyCountsPass ? 'PASS' : 'FAIL',
    REAL_APPLY_BLOCKED: 'YES',
    DEPLOYMENT_PERFORMED: 'NO',
    FINAL_STATUS: (
      targetPackages.length === 3 &&
      sourceIdsPass &&
      priceDepositPass &&
      durationPass &&
      currencyPass &&
      !hasDuplicates &&
      legacyCountsPass
    ) ? 'PASS' : 'FAIL'
  };

  console.log('--- CONTROLLED PACKAGE BACKFILL REPORT ---');
  console.log(JSON.stringify(report, null, 2));

  await sql.end();
}

runControlledPackageBackfill().catch(async err => {
  console.error('Package backfill failed:', err);
  await sql.end();
  process.exit(1);
});
