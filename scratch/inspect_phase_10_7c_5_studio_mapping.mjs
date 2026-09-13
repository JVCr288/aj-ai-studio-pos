import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: 'require' });

async function inspectStudioMapping() {
  try {
    // 1. Read legacy studios row
    const legacyStudios = await sql`
      SELECT id, name, logo_url, brand_color, contact_phone, created_at
      FROM studios
      WHERE id = 'nocturne';
    `;

    // 2. Read production_studios rows
    const prodStudios = await sql`
      SELECT id, legacy_studio_id, slug, display_name, status, created_at, updated_at
      FROM production_studios;
    `;

    // 3. Check matching row
    const matchingRow = prodStudios.find(r => r.legacy_studio_id === 'nocturne' || r.slug === 'nocturne');

    console.log('--- LEGACY STUDIO ROW ---');
    console.log(JSON.stringify(legacyStudios, null, 2));

    console.log('--- PRODUCTION STUDIOS ROWS ---');
    console.log(JSON.stringify(prodStudios, null, 2));

    console.log('--- MAPPING EXISTS ---');
    console.log(`MAPPING_EXISTS=${matchingRow ? 'YES' : 'NO'}`);

  } finally {
    await sql.end();
  }
}

inspectStudioMapping().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
