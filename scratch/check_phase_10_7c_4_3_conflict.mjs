import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.log('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: 'require' });

const TARGET_TABLES = [
  'asset_records',
  'booking_packages',
  'booking_rules',
  'integration_operation_records',
  'integration_runs',
  'invoice_profiles',
  'payment_configurations',
  'payment_methods',
  'production_studios',
  'studio_profiles',
  'studio_space_assets',
  'studio_spaces'
];

const TARGET_INDEXES = [
  'asset_records_studio_source_asset_idx',
  'booking_packages_studio_source_pkg_idx',
  'integration_op_records_run_seq_idx',
  'integration_runs_idempotency_idx',
  'payment_methods_config_source_pm_idx',
  'studio_space_assets_space_asset_role_idx',
  'studio_spaces_studio_source_space_idx'
];

const TARGET_CONSTRAINTS = [
  'ar_upload_status_check',
  'bp_deposit_type_check',
  'booking_rules_studio_id_unique',
  'ior_status_check',
  'integration_runs_idempotency_key_unique',
  'ir_status_check',
  'invoice_profiles_studio_id_unique',
  'payment_configurations_studio_id_unique',
  'pm_provider_check',
  'production_studios_legacy_studio_id_unique',
  'production_studios_slug_unique',
  'studio_profiles_studio_id_unique',
  'ssa_role_check',
  'asset_records_studio_id_production_studios_id_fk',
  'booking_packages_studio_id_production_studios_id_fk',
  'booking_rules_studio_id_production_studios_id_fk',
  'integration_operation_records_integration_run_id_integration_runs_id_fk',
  'integration_runs_studio_id_production_studios_id_fk',
  'invoice_profiles_studio_id_production_studios_id_fk',
  'invoice_profiles_logo_asset_id_asset_records_id_fk',
  'payment_configurations_studio_id_production_studios_id_fk',
  'payment_methods_payment_config_id_payment_configurations_id_fk',
  'payment_methods_qr_asset_id_asset_records_id_fk',
  'studio_profiles_studio_id_production_studios_id_fk',
  'studio_profiles_logo_asset_id_asset_records_id_fk',
  'studio_space_assets_space_id_studio_spaces_id_fk',
  'studio_space_assets_asset_id_asset_records_id_fk',
  'studio_spaces_studio_id_production_studios_id_fk',
  'studio_spaces_floor_plan_asset_id_asset_records_id_fk',
  'studio_spaces_sketch_asset_id_asset_records_id_fk'
];

async function checkConflicts() {
  try {
    // 1. Check existing tables in public schema
    const existingTablesRes = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
    const existingTables = existingTablesRes.map(r => r.table_name);

    const tableCollisions = TARGET_TABLES.filter(t => existingTables.includes(t));
    const productionStudiosExists = existingTables.includes('production_studios');

    // 2. Check indexes in public schema
    const existingIndexesRes = await sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public';
    `;
    const existingIndexes = existingIndexesRes.map(r => r.indexname);
    const indexCollisions = TARGET_INDEXES.filter(i => existingIndexes.includes(i));

    // 3. Check constraints in public schema
    const existingConstraintsRes = await sql`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_schema = 'public';
    `;
    const existingConstraints = existingConstraintsRes.map(r => r.constraint_name);
    const constraintCollisions = TARGET_CONSTRAINTS.filter(c => existingConstraints.includes(c));

    // 4. Check Drizzle migration history tables
    const drizzleTablesRes = await sql`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = '__drizzle_migrations';
    `;
    const drizzleHistoryFound = drizzleTablesRes.length > 0;
    const drizzleHistoryDetails = drizzleHistoryFound
      ? drizzleTablesRes.map(r => `${r.table_schema}.${r.table_name}`).join(', ')
      : 'NONE';

    // 5. Verify legacy tables exist untouched
    const legacyTables = ['studios', 'packages', 'slots', 'bookings'];
    const missingLegacy = legacyTables.filter(t => !existingTables.includes(t));

    const isConflict = tableCollisions.length > 0 || indexCollisions.length > 0 || constraintCollisions.length > 0;

    console.log('--- LIVE CONFLICT CHECK RESULTS ---');
    console.log(`PRE_MIGRATION_CONFLICT_CHECK=${isConflict ? 'FAIL' : 'PASS'}`);
    console.log(`TABLE_COLLISIONS=${tableCollisions.length > 0 ? tableCollisions.join(', ') : 'NONE'}`);
    console.log(`INDEX_COLLISIONS=${indexCollisions.length > 0 ? indexCollisions.join(', ') : 'NONE'}`);
    console.log(`CONSTRAINT_COLLISIONS=${constraintCollisions.length > 0 ? constraintCollisions.join(', ') : 'NONE'}`);
    console.log(`PRODUCTION_STUDIOS_EXISTS=${productionStudiosExists ? 'YES' : 'NO'}`);
    console.log(`DRIZZLE_HISTORY=${drizzleHistoryDetails}`);
    console.log(`SAFE_TO_APPLY=${(!isConflict && missingLegacy.length === 0) ? 'YES' : 'NO'}`);
    console.log(`LEGACY_TABLES_PRESENT=${legacyTables.join(', ')} (missing: ${missingLegacy.length === 0 ? 'NONE' : missingLegacy.join(', ')})`);

  } finally {
    await sql.end();
  }
}

checkConflicts().catch(err => {
  console.error('Check failed with error:', err.message);
  process.exit(1);
});
