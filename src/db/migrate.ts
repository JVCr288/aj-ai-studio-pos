import 'dotenv/config';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import path from 'path';

/**
 * EXPLICIT DATABASE MIGRATION RUNNER
 * Executes version-controlled SQL migrations from ./drizzle into target PostgreSQL instance.
 *
 * IMPORTANT:
 * This script is executed explicitly via `npm run db:migrate` during staging/deployment steps.
 * It is NOT executed automatically on application server boot.
 */

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL environment variable is not set.');
    console.error('   Please set DATABASE_URL in your environment or .env file.');
    process.exit(1);
  }

  console.log('=== AJ AI STUDIO DATABASE MIGRATION RUNNER ===');
  console.log(`Target Connection: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);

  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  const migrationsFolder = path.resolve(process.cwd(), 'drizzle');
  console.log(`Executing SQL migrations from: ${migrationsFolder}...`);

  try {
    await migrate(db, { migrationsFolder });
    console.log('✅ All migrations applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigrations();
