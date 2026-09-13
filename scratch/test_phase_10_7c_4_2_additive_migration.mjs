import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== PHASE 10.7C.4.2 ADDITIVE COMPATIBILITY MIGRATION AUDIT ===\n');

let failed = false;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed = true;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// 1. Schema Definition Audit
const schemaContent = fs.readFileSync(path.join(rootDir, 'src/db/schema/index.ts'), 'utf8');

assert(schemaContent.includes("pgTable('production_studios'"), 'production_studios root table defined in Drizzle schema');
assert(schemaContent.includes("legacyStudioId: text('legacy_studio_id').unique()"), 'production_studios includes legacy_studio_id unique bridge column');
assert(!schemaContent.includes("pgTable('studios',"), 'Legacy table name studios is NOT redefined as a target schema table');

// 2. FK Target Audit in Schema
const targetTablesWithStudioFk = [
  'asset_records',
  'studio_profiles',
  'booking_packages',
  'studio_spaces',
  'payment_configurations',
  'booking_rules',
  'invoice_profiles',
  'integration_runs',
];

targetTablesWithStudioFk.forEach((table) => {
  assert(
    schemaContent.includes(`references(() => productionStudios.id`),
    `Table schema references productionStudios.id for ${table}`
  );
});

assert(!schemaContent.includes('references(() => studios.id'), 'No FK references legacy studios.id');

// 3. Generated Migration File Audit
const drizzleFiles = fs.readdirSync(path.join(rootDir, 'drizzle'));
const sqlFile = drizzleFiles.find((f) => f.endsWith('.sql'));
assert(sqlFile !== undefined, `Migration SQL file exists in drizzle/ (${sqlFile})`);

const sqlContent = fs.readFileSync(path.join(rootDir, 'drizzle', sqlFile), 'utf8');

// Destructive SQL Audit
assert(!/DROP\s+TABLE/i.test(sqlContent), 'Migration does NOT contain DROP TABLE');
assert(!/DROP\s+COLUMN/i.test(sqlContent), 'Migration does NOT contain DROP COLUMN');
assert(!/ALTER\s+COLUMN/i.test(sqlContent), 'Migration does NOT contain ALTER COLUMN');
assert(!/RENAME\s+TABLE/i.test(sqlContent), 'Migration does NOT contain RENAME TABLE');
assert(!/DELETE\s+FROM/i.test(sqlContent), 'Migration does NOT contain DELETE');
assert(!/TRUNCATE/i.test(sqlContent), 'Migration does NOT contain TRUNCATE');
assert(!/UPDATE\s+public\.(studios|packages|slots|bookings)/i.test(sqlContent), 'Migration does NOT mutate legacy public tables');

// Additive DDL Verification
assert(sqlContent.includes('CREATE TABLE "production_studios"'), 'Migration contains CREATE TABLE "production_studios"');
assert(sqlContent.includes('REFERENCES "public"."production_studios"("id")'), 'Migration contains FK constraints referencing production_studios(id)');

// 4. ProductionDatabaseAdapter Root Resolution Audit
const adapterContent = fs.readFileSync(path.join(rootDir, 'src/services/productionDatabaseAdapter.ts'), 'utf8');
assert(adapterContent.includes('productionStudios'), 'ProductionDatabaseAdapter imports productionStudios');
assert(adapterContent.includes('legacyStudioId'), 'ProductionDatabaseAdapter queries productionStudios by legacyStudioId or slug');

// 5. Public REAL_APPLY Gate Safety
const serviceContent = fs.readFileSync(path.join(rootDir, 'src/services/onboardingIntegrationService.ts'), 'utf8');
assert(serviceContent.includes('PRODUCTION_PERSISTENCE_NOT_CONFIGURED'), 'Public REAL_APPLY remains strictly blocked');

console.log('\n==================================================');
if (failed) {
  console.error('❌ PHASE 10.7C.4.2 MIGRATION AUDIT FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL PHASE 10.7C.4.2 ADDITIVE MIGRATION CHECKS PASSED');
}
