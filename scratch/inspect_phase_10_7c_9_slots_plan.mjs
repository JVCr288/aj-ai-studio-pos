import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: 'require' });

async function inspectSlotsPlan() {
  try {
    // 1. Get mapped production_studios UUID for nocturne
    const prodStudios = await sql`
      SELECT id, legacy_studio_id, slug
      FROM production_studios
      WHERE legacy_studio_id = 'nocturne' OR slug = 'nocturne';
    `;

    const prodStudio = prodStudios[0];

    // 2. Fetch all legacy slots rows for nocturne
    const legacySlots = await sql`
      SELECT id, studio_id, time, active, sort_order, created_at
      FROM slots
      WHERE studio_id = 'nocturne'
      ORDER BY sort_order ASC;
    `;

    // 3. Fetch current booking_rules for production studio UUID
    const currentRules = await sql`
      SELECT id, studio_id, opening_time, closing_time, default_session_duration_minutes, buffer_minutes, closed_days, max_advance_booking_days, same_day_booking, reschedule_policy, cancellation_policy, deposit_refund_policy, source_submission_id
      FROM booking_rules
      WHERE studio_id = ${prodStudio.id};
    `;

    // 4. Fetch booking_rules schema details
    const columnsRes = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'booking_rules';
    `;

    console.log('--- PRODUCTION STUDIO UUID ---');
    console.log(JSON.stringify(prodStudio, null, 2));

    console.log('--- LEGACY SLOTS (Count: ' + legacySlots.length + ') ---');
    console.log(JSON.stringify(legacySlots, null, 2));

    console.log('--- CURRENT BOOKING_RULES (Count: ' + currentRules.length + ') ---');
    console.log(JSON.stringify(currentRules, null, 2));

    console.log('--- BOOKING_RULES COLUMNS ---');
    console.log(JSON.stringify(columnsRes, null, 2));

  } finally {
    await sql.end();
  }
}

inspectSlotsPlan().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
