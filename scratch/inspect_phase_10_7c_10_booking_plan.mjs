import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: 'require' });

async function inspectBookingPlan() {
  try {
    // 1. Read legacy booking columns
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bookings';
    `;
    const colNames = columns.map(c => c.column_name).filter(c => c !== 'phone' && c !== 'customer_phone');

    // 2. Read legacy booking row (excluding phone)
    const bookingsRes = await sql`
      SELECT ${sql(colNames)}
      FROM bookings;
    `;

    // 2. Check for any production booking tables in public schema
    const tablesRes = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%booking%';
    `;
    const bookingTables = tablesRes.map(r => r.table_name);

    console.log('--- LEGACY BOOKINGS (Count: ' + bookingsRes.length + ') ---');
    console.log(JSON.stringify(bookingsRes, null, 2));

    console.log('--- BOOKING RELATED TABLES IN PUBLIC SCHEMA ---');
    console.log(JSON.stringify(bookingTables, null, 2));

  } finally {
    await sql.end();
  }
}

inspectBookingPlan().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
