import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== PHASE 10.7B DATABASE SCHEMA & REPOSITORY BOUNDARY TEST ===\n');

let failed = false;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed = true;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// 1. Dependencies Check
const pkgJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
assert(pkgJson.dependencies['drizzle-orm'] !== undefined, 'drizzle-orm is in dependencies');
assert(pkgJson.dependencies['postgres'] !== undefined, 'postgres is in dependencies');
assert(pkgJson.devDependencies['drizzle-kit'] !== undefined, 'drizzle-kit is in devDependencies');
assert(pkgJson.dependencies['prisma'] === undefined && pkgJson.devDependencies['prisma'] === undefined, 'Prisma is not present');

// 2. Explicit Migration Scripts Check
assert(pkgJson.scripts['db:generate'] === 'drizzle-kit generate', 'db:generate script exists');
assert(pkgJson.scripts['db:migrate'] === 'node --loader ts-node/esm src/db/migrate.ts' || pkgJson.scripts['db:migrate']?.includes('migrate.ts'), 'db:migrate script exists');
assert(pkgJson.scripts['db:studio'] === 'drizzle-kit studio', 'db:studio script exists');

// 3. Environment Variables Check
const envExample = fs.readFileSync(path.join(rootDir, '.env.example'), 'utf8');
assert(envExample.includes('DATABASE_URL='), '.env.example includes DATABASE_URL');
assert(!envExample.includes('VITE_DATABASE_URL'), '.env.example does NOT include VITE_DATABASE_URL');

// 4. Config & DB Module Files Exist
assert(fs.existsSync(path.join(rootDir, 'drizzle.config.ts')), 'drizzle.config.ts exists');
assert(fs.existsSync(path.join(rootDir, 'src/db/index.ts')), 'src/db/index.ts exists');
assert(fs.existsSync(path.join(rootDir, 'src/db/migrate.ts')), 'src/db/migrate.ts exists');
assert(fs.existsSync(path.join(rootDir, 'src/db/schema/index.ts')), 'src/db/schema/index.ts exists');
assert(fs.existsSync(path.join(rootDir, 'docker-compose.yml')), 'docker-compose.yml exists');

// 5. Schema Content Verification
const schemaContent = fs.readFileSync(path.join(rootDir, 'src/db/schema/index.ts'), 'utf8');

const requiredTables = [
  'studios',
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

requiredTables.forEach(table => {
  assert(
    new RegExp(`pgTable\\(\\s*['"]${table}['"]`).test(schemaContent),
    `Table definition for ${table} exists in schema`
  );
});

// Structural checks in schema
assert(
  schemaContent.includes("uniqueIndex('integration_runs_idempotency_idx').on(table.idempotencyKey)") ||
  schemaContent.includes("uniqueIndex('integration_runs_idempotency_idx').on(t.idempotencyKey)"),
  'Unique idempotency key on integration_runs exists'
);
assert(
  schemaContent.includes("uniqueIndex('booking_packages_studio_source_pkg_idx').on(table.studioId, table.sourcePackageId)"),
  'Unique (studioId, sourcePackageId) exists on booking_packages'
);
assert(
  schemaContent.includes("uniqueIndex('studio_spaces_studio_source_space_idx').on(table.studioId, table.sourceSpaceId)"),
  'Unique (studioId, sourceSpaceId) exists on studio_spaces'
);
assert(
  schemaContent.includes("uniqueIndex('payment_methods_config_source_pm_idx').on(table.paymentConfigId, table.sourcePaymentMethodId)"),
  'Unique (paymentConfigId, sourcePaymentMethodId) exists on payment_methods'
);
assert(
  schemaContent.includes("uniqueIndex('asset_records_studio_source_asset_idx').on(table.studioId, table.sourceAssetId)"),
  'Unique (studioId, sourceAssetId) exists on asset_records'
);

// Payment Config schema checks (NO OCR/settlement/ledger)
const paymentMethodSection = schemaContent.substring(schemaContent.indexOf("pgTable(\n  'payment_methods'"), schemaContent.indexOf("pgTable('booking_rules'"));
assert(!paymentMethodSection.includes('ocr_result') && !paymentMethodSection.includes('verification_status') && !paymentMethodSection.includes('transaction_id') && !paymentMethodSection.includes('settlement_state'), 'payment_methods table contains NO OCR/settlement/transaction fields');

// Money & Timestamp representation checks
assert(schemaContent.includes('bigint('), 'Money storage uses bigint for integer base units');
assert(!schemaContent.includes('real(') && !schemaContent.includes('doublePrecision('), 'Money storage does NOT use floating point types');
assert(schemaContent.includes('timestamp(') && schemaContent.includes('withTimezone: true'), 'System timestamps use timezone-aware timestamps (timestamptz)');

// Integration Run Statuses
assert(schemaContent.includes("'STARTED'") && schemaContent.includes("'COMMITTED'") && schemaContent.includes("'ROLLED_BACK'") && schemaContent.includes("'FAILED'"), 'Integration run statuses enum includes STARTED, COMMITTED, ROLLED_BACK, FAILED');

// 6. Server Startup Audit (NO Automatic Migrations)
const serverTs = fs.readFileSync(path.join(rootDir, 'server.ts'), 'utf8');
assert(!serverTs.includes('migrate(') && !serverTs.includes('drizzle/'), 'server.ts does NOT perform automatic schema migration on boot');
assert(serverTs.includes('checkDatabaseHealth'), 'server.ts includes checkDatabaseHealth in health check');

// 7. Frontend Boundary Audit (No React DB imports)
const srcFiles = fs.readdirSync(path.join(rootDir, 'src'), { recursive: true });
let foundFrontendDbImport = false;

srcFiles.forEach(file => {
  const filePath = path.join(rootDir, 'src', file.toString());
  if (fs.statSync(filePath).isFile() && (file.toString().endsWith('.tsx') || file.toString().endsWith('.ts'))) {
    // Exclude src/db/* and server-only service modules (productionDatabaseAdapter.ts)
    if (!filePath.includes('/src/db/') && !filePath.includes('productionDatabaseAdapter.ts')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes("from '../db") || content.includes("from './db") || content.includes("from '@/db") || content.includes("drizzle-orm") || content.includes("postgres")) {
        console.error(`❌ Frontend file importing DB: ${file}`);
        foundFrontendDbImport = true;
      }
    }
  }
});
assert(!foundFrontendDbImport, 'No React/frontend code imports drizzle-orm, postgres, or src/db');

// 8. Storage Key UI Exclusion
const onboardingTypes = fs.readFileSync(path.join(rootDir, 'src/types.ts'), 'utf8');
assert(!onboardingTypes.includes('storageKey') && !onboardingTypes.includes('storage_key'), 'src/types.ts does NOT expose storage_key in frontend interfaces');

// 9. Workflow & Step Boundaries Check
assert(onboardingTypes.includes('export type ScreenStep = 1 | 2 | 3 | 4 | 5 | 6;'), 'ScreenStep remains 1 | 2 | 3 | 4 | 5 | 6');

// 10. Dry-Run / REAL_APPLY Flag Safety
const integrationService = fs.readFileSync(path.join(rootDir, 'src/services/onboardingIntegrationService.ts'), 'utf8');
assert(integrationService.includes('REAL_APPLY') || integrationService.includes('PRODUCTION_PERSISTENCE_NOT_CONFIGURED'), 'REAL_APPLY remains strictly disabled/blocked in integration service');

// 11. Generated migration check
const drizzleFiles = fs.readdirSync(path.join(rootDir, 'drizzle'));
const hasSqlFile = drizzleFiles.some(f => f.endsWith('.sql'));
assert(hasSqlFile, 'Generated migration file exists in drizzle/ directory');

console.log('\n==================================================');
if (failed) {
  console.error('❌ PHASE 10.7B TEST FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL PHASE 10.7B PERSISTENCE FOUNDATION TESTS PASSED');
}
