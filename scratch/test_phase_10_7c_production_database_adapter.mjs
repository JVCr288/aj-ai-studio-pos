import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== PHASE 10.7C PRODUCTION DATABASE ADAPTER TEST ===\n');

let failed = false;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed = true;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// 1. Adapter File Existence & Exports
const adapterPath = path.join(rootDir, 'src/services/productionDatabaseAdapter.ts');
assert(fs.existsSync(adapterPath), 'src/services/productionDatabaseAdapter.ts exists');

const adapterContent = fs.readFileSync(adapterPath, 'utf8');

// 2. Class & Capability Checks
assert(adapterContent.includes('export class ProductionDatabaseAdapter'), 'Exports ProductionDatabaseAdapter class');
assert(adapterContent.includes("adapterName = 'ProductionDatabaseAdapter'"), 'Adapter declares adapterName = ProductionDatabaseAdapter');
assert(adapterContent.includes('isProduction = true'), 'Adapter declares isProduction = true');
assert(adapterContent.includes('isDatabaseConfigured()'), 'Adapter includes isDatabaseConfigured() guard');
assert(adapterContent.includes('DATABASE_NOT_CONFIGURED'), 'Adapter handles DATABASE_NOT_CONFIGURED error code');

// 3. Approved Source Revalidation Check
assert(adapterContent.includes('validateApprovedSource'), 'Adapter includes validateApprovedSource revalidation logic');
assert(adapterContent.includes("project.project?.status !== 'APPROVED'"), 'Adapter verifies project.status === APPROVED');
assert(adapterContent.includes('resolveApprovedSubmission'), 'Adapter resolves approved submission snapshot');
assert(adapterContent.includes('snapshot.submissionId !== plan.source.approvedSubmissionId'), 'Adapter rejects modified source submission ID');

// 4. Idempotency & Database Transaction Boundary
assert(adapterContent.includes('checkIdempotency'), 'Adapter implements checkIdempotency');
assert(adapterContent.includes("status: 'ALREADY_APPLIED'"), 'Adapter returns ALREADY_APPLIED on duplicate committed run');
assert(adapterContent.includes('db.transaction(async (tx) => {'), 'Adapter executes operations within single PostgreSQL transaction boundary');
assert(adapterContent.includes('integrationRuns'), 'Adapter references integrationRuns table schema');

// 5. Entity Upsert Strategies
assert(adapterContent.includes('studios'), 'Upserts studios root entity');
assert(adapterContent.includes('studioProfiles'), 'Upserts studioProfiles');
assert(adapterContent.includes('bookingPackages'), 'Upserts bookingPackages');
assert(adapterContent.includes('studioSpaces'), 'Upserts studioSpaces');
assert(adapterContent.includes('studioSpaceAssets'), 'Upserts studioSpaceAssets junction');
assert(adapterContent.includes('paymentConfigurations'), 'Upserts paymentConfigurations');
assert(adapterContent.includes('paymentMethods'), 'Upserts paymentMethods');
assert(adapterContent.includes('bookingRules'), 'Upserts bookingRules');
assert(adapterContent.includes('invoiceProfiles'), 'Upserts invoiceProfiles');
assert(adapterContent.includes('assetRecords'), 'Resolves assetRecords');
assert(adapterContent.includes('integrationOperationRecords'), 'Inserts integrationOperationRecords audit logs');

// 6. Asset Resolution & Storage Key Safety
assert(adapterContent.includes('resolveAssetUuid'), 'Resolves sourceAssetId -> asset_records.id (UUID FK)');
const codeWithoutComments = adapterContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
assert(!codeWithoutComments.includes('base64') && !codeWithoutComments.includes('Base64'), 'No Base64 binary payload storage in adapter code');
assert(!adapterContent.includes('storage_key: p.') && !adapterContent.includes('storageKey: p.'), 'storage_key is not derived from frontend payloads');

// 7. Payment Config & Audit Safety (No OCR/settlement fields)
assert(!adapterContent.includes('ocr_result') && !adapterContent.includes('verification_status') && !adapterContent.includes('transaction_id'), 'No OCR or transaction settlement fields in payment adapter');

// 8. Public REAL_APPLY Gate Check in Service
const serviceContent = fs.readFileSync(path.join(rootDir, 'src/services/onboardingIntegrationService.ts'), 'utf8');
assert(serviceContent.includes("if (mode === 'REAL_APPLY')") && serviceContent.includes('PRODUCTION_PERSISTENCE_NOT_CONFIGURED'), 'REAL_APPLY remains strictly blocked in public service interface');

// 9. Server Startup Audit (NO Automatic Migrations)
const serverTs = fs.readFileSync(path.join(rootDir, 'server.ts'), 'utf8');
assert(!serverTs.includes('migrate(') && !serverTs.includes('drizzle/'), 'server.ts does NOT perform automatic schema migration on boot');

// 10. Frontend Boundary Audit (No React DB imports)
const srcFiles = fs.readdirSync(path.join(rootDir, 'src'), { recursive: true });
let foundFrontendDbImport = false;

srcFiles.forEach(file => {
  const filePath = path.join(rootDir, 'src', file.toString());
  if (fs.statSync(filePath).isFile() && (file.toString().endsWith('.tsx') || file.toString().endsWith('.ts'))) {
    if (!filePath.includes('/src/db/') && !filePath.includes('/src/services/productionDatabaseAdapter.ts')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes("from '../db") || content.includes("from './db") || content.includes("from '@/db") || content.includes("drizzle-orm") || content.includes("postgres")) {
        console.error(`❌ Frontend file importing DB: ${file}`);
        foundFrontendDbImport = true;
      }
    }
  }
});
assert(!foundFrontendDbImport, 'No React components import DB modules');

// 11. Workflow & Step Boundaries Check
const onboardingTypes = fs.readFileSync(path.join(rootDir, 'src/types.ts'), 'utf8');
assert(onboardingTypes.includes('export type ScreenStep = 1 | 2 | 3 | 4 | 5 | 6;'), 'ScreenStep remains 1 | 2 | 3 | 4 | 5 | 6');

console.log('\n==================================================');
if (failed) {
  console.error('❌ PHASE 10.7C TEST FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL PHASE 10.7C PRODUCTION DATABASE ADAPTER CHECKS PASSED');
}
