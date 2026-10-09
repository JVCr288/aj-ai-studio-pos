import 'dotenv/config';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import path from 'path';

export async function runDemoMigrations(targetUrl?: string) {
  const connectionString = targetUrl || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL must be set to run demo migrations.');
    process.exit(1);
  }

  console.log('=== AJ STUDIO DESK DEMO DATABASE MIGRATION RUNNER ===');
  console.log(`Target Connection: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);

  // 1. Ensure schemas exist
  const initClient = postgres(connectionString, { max: 1 });
  await initClient`CREATE SCHEMA IF NOT EXISTS "demo";`;
  await initClient`CREATE SCHEMA IF NOT EXISTS "demo_drizzle";`;
  await initClient.end();

  // 2. Connect with search_path = demo so all unqualified tables land in demo
  const migrationClient = postgres(connectionString, {
    max: 1,
    connection: { search_path: 'demo' },
  });
  const db = drizzle(migrationClient);

  const migrationsFolder = path.resolve(process.cwd(), 'drizzle');
  console.log(`Executing SQL migrations with search_path=demo into schema demo (journal: demo_drizzle)...`);

  try {
    await migrate(db, {
      migrationsFolder,
      migrationsSchema: 'demo_drizzle',
    });
    console.log('✅ All migrations applied successfully to schema "demo"!');

    // 3. Re-point any cross-schema FKs in demo pointing to public back into demo
    const fixClient = postgres(connectionString, { max: 1 });
    const crossSchemaFks = await fixClient`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'demo'
        AND ccu.table_schema = 'public';
    `;

    for (const fk of crossSchemaFks) {
      await fixClient.unsafe(`ALTER TABLE "demo"."${fk.table_name}" DROP CONSTRAINT "${fk.constraint_name}";`);
      await fixClient.unsafe(`
        ALTER TABLE "demo"."${fk.table_name}"
        ADD CONSTRAINT "${fk.constraint_name}"
        FOREIGN KEY ("${fk.column_name}") REFERENCES "demo"."${fk.foreign_table_name}"("${fk.foreign_column_name}")
        ON DELETE ${fk.delete_rule} ON UPDATE ${fk.update_rule};
      `);
    }

    // Refresh demo_app permissions if role exists
    const roleExists = await fixClient`SELECT 1 FROM pg_roles WHERE rolname = 'demo_app';`;
    if (roleExists.length > 0) {
      await fixClient`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "demo" TO demo_app;`;
      await fixClient`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "demo" TO demo_app;`;
    }
    await fixClient.end();
  } catch (error) {
    console.error('❌ Demo migration failed:', error);
    throw error;
  } finally {
    await migrationClient.end();
  }
}

import { fileURLToPath, pathToFileURL } from 'url';

const isDirectRun = Boolean(
  process.argv[1] &&
  (import.meta.url === pathToFileURL(process.argv[1]).href ||
   fileURLToPath(import.meta.url) === process.argv[1])
);

if (isDirectRun) {
  runDemoMigrations().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
