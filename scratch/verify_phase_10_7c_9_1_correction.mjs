import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: 'require' });

async function verifySlotCorrection() {
  try {
    const rulesRes = await sql`SELECT count(*)::int as count FROM booking_rules;`;
    const slotsRes = await sql`SELECT id, time, active FROM slots WHERE studio_id = 'nocturne' ORDER BY id ASC;`;

    console.log('booking_rules count:', rulesRes[0].count);
    console.log('legacy slots:', slotsRes);
  } finally {
    await sql.end();
  }
}

verifySlotCorrection().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
