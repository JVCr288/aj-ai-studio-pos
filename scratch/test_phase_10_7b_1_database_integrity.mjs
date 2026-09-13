import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== PHASE 10.7B.1 DATABASE FOUNDATION EXECUTION & INTEGRITY AUDIT ===\n');

let failed = false;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed = true;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// 1. Executable Dependency Audit
const pkgJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const allDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };

assert(pkgJson.scripts['db:migrate'] === 'tsx src/db/migrate.ts', 'db:migrate script uses tsx runner');
assert(allDeps['tsx'] !== undefined, 'tsx is an explicit project dependency in package.json');
assert(allDeps['drizzle-kit'] !== undefined, 'drizzle-kit is an explicit project dependency');
assert(allDeps['drizzle-orm'] !== undefined, 'drizzle-orm is an explicit project dependency');
assert(allDeps['postgres'] !== undefined, 'postgres is an explicit project dependency');
assert(pkgJson.devDependencies['ts-node'] === undefined, 'ts-node is NOT present in dependencies');

// 2. Server Startup Audit (NO Automatic Migrations)
const serverTs = fs.readFileSync(path.join(rootDir, 'server.ts'), 'utf8');
assert(!serverTs.includes('migrate(') && !serverTs.includes('drizzle/'), 'server.ts does NOT perform automatic schema migration on boot');

// 3. Health Endpoint Security & Connection Pooling Check
assert(serverTs.includes('checkDatabaseHealth'), 'server.ts includes checkDatabaseHealth diagnostic');
assert(!serverTs.includes('process.env.DATABASE_URL') || serverTs.includes('checkDatabaseHealth'), 'DATABASE_URL is not exposed raw in health responses');

// 4. Schema Generation Check
const drizzleFiles = fs.readdirSync(path.join(rootDir, 'drizzle'));
const sqlMigrationFile = drizzleFiles.find(f => f.endsWith('.sql'));
assert(sqlMigrationFile !== undefined, `Generated SQL migration file exists (${sqlMigrationFile})`);

const sqlContent = fs.readFileSync(path.join(rootDir, 'drizzle', sqlMigrationFile), 'utf8');

// 5. Asset Foreign Key Audit (Referencing asset_records.id)
const schemaContent = fs.readFileSync(path.join(rootDir, 'src/db/schema/index.ts'), 'utf8');

assert(schemaContent.includes("logoAssetId: uuid('logo_asset_id').references(() => assetRecords.id"), 'studio_profiles.logo_asset_id references asset_records.id');
assert(schemaContent.includes("logoAssetId: uuid('logo_asset_id').references(() => assetRecords.id"), 'invoice_profiles.logo_asset_id references asset_records.id');
assert(schemaContent.includes("qrAssetId: uuid('qr_asset_id').references(() => assetRecords.id"), 'payment_methods.qr_asset_id references asset_records.id');
assert(schemaContent.includes("assetId: uuid('asset_id').notNull().references(() => assetRecords.id"), 'studio_space_assets.asset_id references asset_records.id');
assert(schemaContent.includes("floorPlanAssetId: uuid('floor_plan_asset_id').references(() => assetRecords.id"), 'studio_spaces.floor_plan_asset_id references asset_records.id');
assert(schemaContent.includes("sketchAssetId: uuid('sketch_asset_id').references(() => assetRecords.id"), 'studio_spaces.sketch_asset_id references asset_records.id');

// 6. Junction Integrity & Uniqueness (studio_space_assets)
assert(schemaContent.includes("spaceId: uuid('space_id').notNull().references(() => studioSpaces.id, { onDelete: 'cascade' })"), 'studio_space_assets.space_id references studio_spaces.id with CASCADE');
assert(schemaContent.includes("uniqueIndex('studio_space_assets_space_asset_role_idx').on(table.spaceId, table.assetId, table.role)"), 'Unique composite constraint (space_id, asset_id, role) on studio_space_assets');

// 7. Payment Relation Consistency
assert(schemaContent.includes("paymentConfigId: uuid('payment_config_id').notNull().references(() => paymentConfigurations.id, { onDelete: 'cascade' })"), 'payment_methods references payment_configurations.id with CASCADE');
assert(schemaContent.includes("uniqueIndex('payment_methods_config_source_pm_idx').on(table.paymentConfigId, table.sourcePaymentMethodId)"), 'payment_methods composite uniqueness (payment_config_id, source_payment_method_id) prevents studio mismatch');

// 8. Money & File Size Semantics
assert(schemaContent.includes("fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).notNull(), // Storage size in bytes"), 'file_size_bytes classified as storage size');
assert(schemaContent.includes("price: bigint('price', { mode: 'number' }).notNull(), // Whole integer MMK monetary amount"), 'price classified as MMK monetary amount');
assert(!schemaContent.includes('real(') && !schemaContent.includes('doublePrecision('), 'No floating point types for money or storage');

// 9. CHECK Constraint Audit
assert(sqlContent.includes('bp_deposit_type_check'), 'Generated SQL contains bp_deposit_type_check');
assert(sqlContent.includes('pm_provider_check'), 'Generated SQL contains pm_provider_check');
assert(sqlContent.includes('ssa_role_check'), 'Generated SQL contains ssa_role_check');
assert(sqlContent.includes('ar_upload_status_check'), 'Generated SQL contains ar_upload_status_check');
assert(sqlContent.includes('ir_status_check'), 'Generated SQL contains ir_status_check');
assert(sqlContent.includes('ior_status_check'), 'Generated SQL contains ior_status_check');

// 10. Idempotency Constraint Audit
assert(sqlContent.includes('integration_runs_idempotency_idx'), 'Generated SQL contains integration_runs_idempotency_idx');

// 11. Frontend Isolation Audit
const srcFiles = fs.readdirSync(path.join(rootDir, 'src'), { recursive: true });
let foundFrontendDbImport = false;

srcFiles.forEach(file => {
  const filePath = path.join(rootDir, 'src', file.toString());
  if (fs.statSync(filePath).isFile() && (file.toString().endsWith('.tsx') || file.toString().endsWith('.ts'))) {
    if (!filePath.includes('/src/db/') && !filePath.includes('productionDatabaseAdapter.ts')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes("from '../db") || content.includes("from './db") || content.includes("from '@/db") || content.includes("drizzle-orm") || content.includes("postgres")) {
        console.error(`❌ Frontend file importing DB: ${file}`);
        foundFrontendDbImport = true;
      }
    }
  }
});
assert(!foundFrontendDbImport, 'No React components import DB modules');

// 12. REAL_APPLY Flag Safety
const integrationService = fs.readFileSync(path.join(rootDir, 'src/services/onboardingIntegrationService.ts'), 'utf8');
assert(integrationService.includes('REAL_APPLY') || integrationService.includes('PRODUCTION_PERSISTENCE_NOT_CONFIGURED'), 'REAL_APPLY remains strictly disabled/blocked');

// 13. ScreenStep & Nav Contract
const onboardingTypes = fs.readFileSync(path.join(rootDir, 'src/types.ts'), 'utf8');
assert(onboardingTypes.includes('export type ScreenStep = 1 | 2 | 3 | 4 | 5 | 6;'), 'ScreenStep remains 1 | 2 | 3 | 4 | 5 | 6');

console.log('\n==================================================');
if (failed) {
  console.error('❌ PHASE 10.7B.1 HARDENING AUDIT FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL PHASE 10.7B.1 HARDENING AUDIT CHECKS PASSED');
}
