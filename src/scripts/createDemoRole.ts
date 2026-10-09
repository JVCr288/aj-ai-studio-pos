import 'dotenv/config';
import postgres from 'postgres';
import { fileURLToPath, pathToFileURL } from 'url';

export async function createDemoRole(
  adminUrl = process.env.DATABASE_URL,
  password = process.env.DEMO_DB_PASSWORD
) {
  if (!adminUrl) {
    throw new Error('DATABASE_URL_REQUIRED: DATABASE_URL is required to create demo_app role.');
  }
  if (!password) {
    throw new Error('DEMO_DB_PASSWORD_REQUIRED: DEMO_DB_PASSWORD is required to set role password.');
  }

  console.log('=== AJ STUDIO DESK: CREATING/UPDATING ROLE demo_app ===');
  const sql = postgres(adminUrl, { max: 1 });

  try {
    // 1. Ensure schemas exist
    await sql`CREATE SCHEMA IF NOT EXISTS "demo";`;
    await sql`CREATE SCHEMA IF NOT EXISTS "demo_drizzle";`;

    // 2. Create or update role demo_app with login password
    const existing = await sql`SELECT 1 FROM pg_roles WHERE rolname = 'demo_app';`;
    const escapedPassword = password.replace(/'/g, "''");
    if (existing.length === 0) {
      await sql.unsafe(`CREATE ROLE demo_app WITH LOGIN PASSWORD '${escapedPassword}';`);
      console.log('  Created role demo_app.');
    } else {
      await sql.unsafe(`ALTER ROLE demo_app WITH LOGIN PASSWORD '${escapedPassword}';`);
      console.log('  Updated password for role demo_app.');
    }

    // 3. Grant ALL on schema demo + its tables/sequences + default privileges
    await sql`GRANT USAGE, CREATE ON SCHEMA "demo" TO demo_app;`;
    await sql`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "demo" TO demo_app;`;
    await sql`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "demo" TO demo_app;`;
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA "demo" GRANT ALL PRIVILEGES ON TABLES TO demo_app;`;
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA "demo" GRANT ALL PRIVILEGES ON SEQUENCES TO demo_app;`;

    // 4. Grant on demo_drizzle for migration journal
    await sql`GRANT USAGE, CREATE ON SCHEMA "demo_drizzle" TO demo_app;`;
    await sql`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "demo_drizzle" TO demo_app;`;
    await sql`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "demo_drizzle" TO demo_app;`;
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA "demo_drizzle" GRANT ALL PRIVILEGES ON TABLES TO demo_app;`;

    // 5. Revoke ALL on schema public and drizzle
    await sql`REVOKE ALL ON SCHEMA "public" FROM demo_app;`;
    await sql`REVOKE ALL ON ALL TABLES IN SCHEMA "public" FROM demo_app;`;
    await sql`REVOKE ALL ON ALL SEQUENCES IN SCHEMA "public" FROM demo_app;`;
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON TABLES FROM demo_app;`;
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM demo_app;`;

    const drizzleSchemaCheck = await sql`SELECT 1 FROM information_schema.schemata WHERE schema_name = 'drizzle';`;
    if (drizzleSchemaCheck.length > 0) {
      await sql`REVOKE ALL ON SCHEMA "drizzle" FROM demo_app;`;
      await sql`REVOKE ALL ON ALL TABLES IN SCHEMA "drizzle" FROM demo_app;`;
    }

    // 6. Set search_path = demo for demo_app
    await sql`ALTER ROLE demo_app SET search_path = demo;`;

    console.log('✅ Role demo_app successfully configured with search_path=demo and schema demo isolation.');
  } finally {
    await sql.end();
  }
}

const isDirectRun = Boolean(
  process.argv[1] &&
  (import.meta.url === pathToFileURL(process.argv[1]).href ||
   fileURLToPath(import.meta.url) === process.argv[1])
);

if (isDirectRun) {
  createDemoRole().catch((err) => {
    console.error('❌ Failed to create demo role:', err);
    process.exit(1);
  });
}
