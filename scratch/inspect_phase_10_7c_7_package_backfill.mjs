import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: 'require' });

async function inspectPackageBackfill() {
  try {
    // 1. Get mapped production_studios UUID for nocturne
    const prodStudios = await sql`
      SELECT id, legacy_studio_id, slug, display_name
      FROM production_studios
      WHERE legacy_studio_id = 'nocturne' OR slug = 'nocturne';
    `;

    if (prodStudios.length === 0) {
      throw new Error('Production studio nocturne not found');
    }

    const prodStudio = prodStudios[0];

    // 2. Fetch legacy package rows
    const legacyPackages = await sql`
      SELECT id, studio_id, name, price, deposit, bay, features, duration, badge, "desc", sort_order, created_at
      FROM packages
      WHERE studio_id = 'nocturne';
    `;

    // 3. Fetch current booking_packages rows for production studio UUID
    const currentBookingPackages = await sql`
      SELECT id, studio_id, source_package_id, name, price, currency, deposit_type, deposit_value, session_duration_minutes, included_items, description, notes, enabled, sort_order
      FROM booking_packages
      WHERE studio_id = ${prodStudio.id};
    `;

    // 4. Fetch booking_packages columns and constraints
    const columnsRes = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'booking_packages';
    `;

    const constraintsRes = await sql`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'booking_packages';
    `;

    console.log('--- PRODUCTION STUDIO ---');
    console.log(JSON.stringify(prodStudio, null, 2));

    console.log('--- LEGACY PACKAGES (Count: ' + legacyPackages.length + ') ---');
    console.log(JSON.stringify(legacyPackages, null, 2));

    console.log('--- CURRENT BOOKING PACKAGES (Count: ' + currentBookingPackages.length + ') ---');
    console.log(JSON.stringify(currentBookingPackages, null, 2));

    console.log('--- BOOKING_PACKAGES COLUMNS ---');
    console.log(JSON.stringify(columnsRes, null, 2));

    console.log('--- BOOKING_PACKAGES CONSTRAINTS ---');
    console.log(JSON.stringify(constraintsRes, null, 2));

  } finally {
    await sql.end();
  }
}

inspectPackageBackfill().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
