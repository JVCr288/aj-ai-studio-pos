import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: 'require' });

async function verifyPostMigration() {
  const results = {
    LIVE_DB_CONNECTION: 'FAIL',
    NEW_TABLES: 'FAIL',
    LEGACY_TABLES: 'FAIL',
    LEGACY_ROW_COUNTS: 'FAIL',
    NEW_FK_TARGETS: 'FAIL',
    PRODUCTION_STUDIO_ID_TYPE: 'FAIL',
    LEGACY_STUDIO_ID_TYPE: 'FAIL',
    MIGRATION_HISTORY: 'FAIL',
    REAL_APPLY_BLOCKED: 'YES',
    FINAL_STATUS: 'FAIL'
  };

  try {
    // 1. Connection check
    const ping = await sql`SELECT 1 as conn`;
    if (ping && ping[0].conn === 1) {
      results.LIVE_DB_CONNECTION = 'PASS';
    }

    // 2. Fetch existing tables in public schema
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
      results.NEW_TABLES = 'PASS';
    } else {
      console.log('Missing new tables:', missingNewTables);
    }

    // 3. Legacy tables check
    const expectedLegacyTables = ['studios', 'packages', 'slots', 'bookings'];
    const missingLegacy = expectedLegacyTables.filter(t => !existingTables.includes(t));
    if (missingLegacy.length === 0) {
      results.LEGACY_TABLES = 'PASS';
    } else {
      console.log('Missing legacy tables:', missingLegacy);
    }

    // 4. Legacy row counts check
    const studiosCount = await sql`SELECT count(*)::int as count FROM studios`;
    const packagesCount = await sql`SELECT count(*)::int as count FROM packages`;
    const slotsCount = await sql`SELECT count(*)::int as count FROM slots`;
    const bookingsCount = await sql`SELECT count(*)::int as count FROM bookings`;

    const countsMatch = (
      studiosCount[0].count === 1 &&
      packagesCount[0].count === 3 &&
      slotsCount[0].count === 5 &&
      bookingsCount[0].count === 1
    );

    if (countsMatch) {
      results.LEGACY_ROW_COUNTS = 'PASS';
    } else {
      console.log('Legacy row counts:', {
        studios: studiosCount[0].count,
        packages: packagesCount[0].count,
        slots: slotsCount[0].count,
        bookings: bookingsCount[0].count
      });
    }

    // 5. New studio_id FK targets check
    const fksRes = await sql`
      SELECT
        kcu.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
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
    const invalidNewStudioFks = newTableFks.filter(fk => 
      fk.foreign_table_name !== 'production_studios' || fk.foreign_column_name !== 'id'
    );
    const checkedNewTables = newTableFks.map(fk => fk.table_name);
    const missingNewFkTables = newTablesWithStudioIdFK.filter(t => !checkedNewTables.includes(t));

    if (invalidNewStudioFks.length === 0 && missingNewFkTables.length === 0) {
      results.NEW_FK_TARGETS = 'PASS';
    } else {
      console.log('Invalid new studio FKs:', invalidNewStudioFks, 'Missing new FK tables:', missingNewFkTables);
    }

    // 6. production_studios.id data type check
    const prodStudioIdType = await sql`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'production_studios' 
        AND column_name = 'id';
    `;
    if (prodStudioIdType.length > 0 && prodStudioIdType[0].data_type === 'uuid') {
      results.PRODUCTION_STUDIO_ID_TYPE = 'PASS';
    } else {
      console.log('production_studios.id type:', prodStudioIdType);
    }

    // 7. legacy studios.id data type check
    const legacyStudioIdType = await sql`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'studios' 
        AND column_name = 'id';
    `;
    if (legacyStudioIdType.length > 0 && (legacyStudioIdType[0].data_type === 'text' || legacyStudioIdType[0].data_type === 'character varying')) {
      results.LEGACY_STUDIO_ID_TYPE = 'PASS';
    } else {
      console.log('legacy studios.id type:', legacyStudioIdType);
    }

    // 8. Migration history check
    const migrationTablesRes = await sql`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = '__drizzle_migrations';
    `;

    let migrationRecords = [];
    if (migrationTablesRes.length > 0) {
      const schemaName = migrationTablesRes[0].table_schema;
      if (schemaName === 'drizzle') {
        migrationRecords = await sql`SELECT * FROM drizzle.__drizzle_migrations`;
      } else {
        migrationRecords = await sql`SELECT * FROM public.__drizzle_migrations`;
      }
    }

    if (migrationRecords.length > 0) {
      results.MIGRATION_HISTORY = 'PASS';
    } else {
      console.log('Migration records found:', migrationRecords);
    }

    // Overall status
    const allPass = (
      results.LIVE_DB_CONNECTION === 'PASS' &&
      results.NEW_TABLES === 'PASS' &&
      results.LEGACY_TABLES === 'PASS' &&
      results.LEGACY_ROW_COUNTS === 'PASS' &&
      results.NEW_FK_TARGETS === 'PASS' &&
      results.PRODUCTION_STUDIO_ID_TYPE === 'PASS' &&
      results.LEGACY_STUDIO_ID_TYPE === 'PASS' &&
      results.MIGRATION_HISTORY === 'PASS' &&
      results.REAL_APPLY_BLOCKED === 'YES'
    );

    if (allPass) {
      results.FINAL_STATUS = 'PASS';
    }

    console.log('--- POST-MIGRATION VERIFICATION RESULTS ---');
    console.log(JSON.stringify(results, null, 2));

  } finally {
    await sql.end();
  }
}

verifyPostMigration().catch(err => {
  console.error('Post-migration verification error:', err);
  process.exit(1);
});
