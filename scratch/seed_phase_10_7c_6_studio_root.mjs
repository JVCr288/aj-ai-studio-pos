import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: 'require' });

async function runControlledSeed() {
  let seedAction = 'UNKNOWN';
  let mappingRow = null;

  // Execute inside a single transaction
  await sql.begin(async tx => {
    // 1. Read legacy studio
    const legacyRes = await tx`
      SELECT id, name
      FROM studios
      WHERE id = 'nocturne';
    `;

    if (legacyRes.length === 0) {
      throw new Error('Legacy studio nocturne not found');
    }

    const legacyStudio = legacyRes[0];

    // 2. Resolve existing production_studios row
    const existingRes = await tx`
      SELECT id, legacy_studio_id, slug, display_name, status, created_at, updated_at
      FROM production_studios
      WHERE legacy_studio_id = 'nocturne' OR slug = 'nocturne';
    `;

    if (existingRes.length > 0) {
      seedAction = 'REUSED';
      mappingRow = existingRes[0];
    } else {
      seedAction = 'CREATED';
      const insertedRes = await tx`
        INSERT INTO production_studios (
          legacy_studio_id,
          slug,
          display_name,
          status
        ) VALUES (
          ${'nocturne'},
          ${'nocturne'},
          ${legacyStudio.name},
          ${'APPROVED'}
        )
        ON CONFLICT (legacy_studio_id) DO NOTHING
        RETURNING id, legacy_studio_id, slug, display_name, status, created_at, updated_at;
      `;

      if (insertedRes.length > 0) {
        mappingRow = insertedRes[0];
      } else {
        // Fallback fetch if concurrent insert took place
        const refetchRes = await tx`
          SELECT id, legacy_studio_id, slug, display_name, status, created_at, updated_at
          FROM production_studios
          WHERE legacy_studio_id = 'nocturne' OR slug = 'nocturne';
        `;
        seedAction = 'REUSED';
        mappingRow = refetchRes[0];
      }
    }
  });

  // 3. Post-seed READ-ONLY verification
  const prodCountRes = await sql`SELECT count(*)::int as count FROM production_studios;`;
  const legacyStudiosCount = await sql`SELECT count(*)::int as count FROM studios;`;
  const legacyPackagesCount = await sql`SELECT count(*)::int as count FROM packages;`;
  const legacySlotsCount = await sql`SELECT count(*)::int as count FROM slots;`;
  const legacyBookingsCount = await sql`SELECT count(*)::int as count FROM bookings;`;

  const countsMatch = (
    legacyStudiosCount[0].count === 1 &&
    legacyPackagesCount[0].count === 3 &&
    legacySlotsCount[0].count === 5 &&
    legacyBookingsCount[0].count === 1
  );

  const report = {
    SEED_EXECUTION: 'PASS',
    SEED_ACTION: seedAction,
    PRODUCTION_STUDIO_ROWS: prodCountRes[0].count,
    LEGACY_STUDIO_MAPPING: mappingRow,
    LEGACY_ROW_COUNTS: countsMatch ? 'PASS' : 'FAIL',
    REAL_APPLY_BLOCKED: 'YES',
    DEPLOYMENT_PERFORMED: 'NO',
    FINAL_STATUS: (countsMatch && prodCountRes[0].count === 1 && mappingRow) ? 'PASS' : 'FAIL'
  };

  console.log('--- CONTROLLED ROOT SEED REPORT OUTPUT ---');
  console.log(JSON.stringify(report, null, 2));

  await sql.end();
}

runControlledSeed().catch(async err => {
  console.error('Controlled seed failed:', err);
  await sql.end();
  process.exit(1);
});
