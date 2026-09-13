import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: 'require' });

async function runFinalLockAudit() {
  const audit = {
    LIVE_DB_CONNECTION: 'FAIL',
    SCHEMA_FOUNDATION: 'FAIL',
    PRODUCTION_STUDIO_ROOT: 'FAIL',
    PACKAGE_BACKFILL: 'FAIL',
    SLOT_COEXISTENCE: 'FAIL',
    BOOKING_PRESERVATION: 'FAIL',
    LEGACY_DATA_INTEGRITY: 'FAIL',
    FK_INTEGRITY: 'FAIL',
    MIGRATION_HISTORY: 'FAIL',
    REAL_APPLY_BLOCKED: 'YES',
    DEPLOYMENT_PERFORMED: 'NO',
    PHASE_10_7C_STATUS: 'FAIL'
  };

  try {
    // 1. Connection check
    const ping = await sql`SELECT 1 as conn;`;
    if (ping && ping[0].conn === 1) {
      audit.LIVE_DB_CONNECTION = 'PASS';
    }

    // 2. Schema check (all 12 Phase 10.7 tables exist)
    const tablesRes = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
    const existingTables = tablesRes.map(r => r.table_name);
    const expectedNewTables = [
      'production_studios',
      'studio_profiles',
      'booking_packages',
      'studio_spaces',
      'studio_space_assets',
      'payment_configurations',
      'payment_methods',
      'booking_rules',
      'invoice_profiles',
      'asset_records',
      'integration_runs',
      'integration_operation_records'
    ];
    const missingNewTables = expectedNewTables.filter(t => !existingTables.includes(t));
    if (missingNewTables.length === 0) {
      audit.SCHEMA_FOUNDATION = 'PASS';
    }

    // 3. production_studios root check (count = 1, legacy_studio_id = 'nocturne')
    const prodStudios = await sql`
      SELECT id, legacy_studio_id, slug, display_name, status
      FROM production_studios;
    `;
    if (prodStudios.length === 1 && prodStudios[0].legacy_studio_id === 'nocturne') {
      audit.PRODUCTION_STUDIO_ROOT = 'PASS';
    }

    // 4. booking_packages backfill check (count = 3, no duplicates)
    const bookingPkgs = await sql`
      SELECT source_package_id
      FROM booking_packages
      WHERE studio_id = ${prodStudios[0].id};
    `;
    const uniquePkgs = new Set(bookingPkgs.map(p => p.source_package_id));
    if (bookingPkgs.length === 3 && uniquePkgs.size === 3) {
      audit.PACKAGE_BACKFILL = 'PASS';
    }

    // 5. Slot coexistence check (legacy slots = 5, booking_rules = 0)
    const slotsCount = await sql`SELECT count(*)::int as count FROM slots;`;
    const rulesCount = await sql`SELECT count(*)::int as count FROM booking_rules;`;
    if (slotsCount[0].count === 5 && rulesCount[0].count === 0) {
      audit.SLOT_COEXISTENCE = 'PASS';
    }

    // 6. Booking preservation check (legacy bookings = 1)
    const bookingsCount = await sql`SELECT count(*)::int as count FROM bookings;`;
    if (bookingsCount[0].count === 1) {
      audit.BOOKING_PRESERVATION = 'PASS';
    }

    // 7. Legacy data integrity check (studios=1, packages=3, slots=5, bookings=1)
    const studiosCount = await sql`SELECT count(*)::int as count FROM studios;`;
    const packagesCount = await sql`SELECT count(*)::int as count FROM packages;`;
    if (
      studiosCount[0].count === 1 &&
      packagesCount[0].count === 3 &&
      slotsCount[0].count === 5 &&
      bookingsCount[0].count === 1
    ) {
      audit.LEGACY_DATA_INTEGRITY = 'PASS';
    }

    // 8. Foreign key integrity check
    const fksRes = await sql`
      SELECT
        kcu.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND kcu.column_name = 'studio_id';
    `;
    const newTablesWithStudioIdFK = [
      'studio_profiles',
      'booking_packages',
      'studio_spaces',
      'payment_configurations',
      'booking_rules',
      'invoice_profiles',
      'asset_records',
      'integration_runs'
    ];
    const newTableFks = fksRes.filter(fk => newTablesWithStudioIdFK.includes(fk.table_name));
    const invalidFks = newTableFks.filter(fk => fk.foreign_table_name !== 'production_studios' || fk.foreign_column_name !== 'id');
    if (newTableFks.length === 8 && invalidFks.length === 0) {
      audit.FK_INTEGRITY = 'PASS';
    }

    // 9. Migration history check
    const migrationTablesRes = await sql`
      SELECT table_name FROM information_schema.tables WHERE table_name = '__drizzle_migrations';
    `;
    if (migrationTablesRes.length > 0) {
      audit.MIGRATION_HISTORY = 'PASS';
    }

    // Overall Status
    const allPass = (
      audit.LIVE_DB_CONNECTION === 'PASS' &&
      audit.SCHEMA_FOUNDATION === 'PASS' &&
      audit.PRODUCTION_STUDIO_ROOT === 'PASS' &&
      audit.PACKAGE_BACKFILL === 'PASS' &&
      audit.SLOT_COEXISTENCE === 'PASS' &&
      audit.BOOKING_PRESERVATION === 'PASS' &&
      audit.LEGACY_DATA_INTEGRITY === 'PASS' &&
      audit.FK_INTEGRITY === 'PASS' &&
      audit.MIGRATION_HISTORY === 'PASS' &&
      audit.REAL_APPLY_BLOCKED === 'YES' &&
      audit.DEPLOYMENT_PERFORMED === 'NO'
    );

    if (allPass) {
      audit.PHASE_10_7C_STATUS = 'VERIFIED_AND_LOCKED';
    }

    console.log('--- FINAL LIVE PERSISTENCE AUDIT ---');
    console.log(JSON.stringify(audit, null, 2));

  } finally {
    await sql.end();
  }
}

runFinalLockAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
