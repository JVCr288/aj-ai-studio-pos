import 'dotenv/config';
import readline from 'readline';
import { getDb } from '../db/index.js';
import { adminUsers, productionStudios } from '../db/schema/index.js';
import { hashWithScrypt } from '../server/utils/crypto.js';
import { eq, or } from 'drizzle-orm';

function getArgValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index !== -1 && index + 1 < process.argv.length) {
    return process.argv[index + 1];
  }
  return null;
}

async function promptHidden(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const tenantSlug = getArgValue('--tenant');
  const username = getArgValue('--user');
  const role = getArgValue('--role') || 'STUDIO_ADMIN';

  if (!tenantSlug || !username) {
    console.error('❌ Error: Missing required arguments.');
    console.log('Usage: npm run admin:create -- --tenant <slug> --user <name> [--role <STUDIO_OWNER|STUDIO_ADMIN>]');
    process.exit(1);
  }

  const db = getDb();
  if (!db) {
    console.error('❌ Error: Database is not configured. DATABASE_URL environment variable must be set.');
    process.exit(1);
  }

  // Verify studio tenant exists or prompt warning
  try {
    const existingStudio = await db
      .select()
      .from(productionStudios)
      .where(
        or(
          eq(productionStudios.slug, tenantSlug),
          eq(productionStudios.legacyStudioId, tenantSlug)
        )
      )
      .limit(1);

    if (existingStudio.length === 0) {
      console.warn(`⚠️ Warning: Tenant '${tenantSlug}' does not exist in production_studios table.`);
      const proceed = await promptHidden("Do you want to create the admin user for this tenant anyway? (y/N): ");
      if (proceed.toLowerCase() !== 'y') {
        console.log('Aborted.');
        process.exit(0);
      }
    }
  } catch (err) {
    console.warn('⚠️ Warning: Failed to check production_studios table:', err);
  }

  const password = await promptHidden(`Enter password for user '${username}' [${tenantSlug}]: `);
  if (!password || password.length < 6) {
    console.error('❌ Error: Password must be at least 6 characters.');
    process.exit(1);
  }

  const confirmPassword = await promptHidden('Confirm password: ');
  if (password !== confirmPassword) {
    console.error('❌ Error: Passwords do not match.');
    process.exit(1);
  }

  console.log('Hashing password with scrypt...');
  const passwordHash = await hashWithScrypt(password);

  try {
    // Check if user already exists
    const existing = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.tenantId, tenantSlug))
      .limit(10);

    const userMatch = existing.find((u) => u.username === username);

    if (userMatch) {
      await db
        .update(adminUsers)
        .set({
          passwordHash,
          role,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(adminUsers.id, userMatch.id));
      console.log(`✅ Success: Updated existing admin user '${username}' for tenant '${tenantSlug}' (Role: ${role}).`);
    } else {
      await db.insert(adminUsers).values({
        tenantId: tenantSlug,
        username,
        passwordHash,
        role,
        isActive: true,
      });
      console.log(`✅ Success: Created new admin user '${username}' for tenant '${tenantSlug}' (Role: ${role}).`);
    }

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error inserting admin user into database:', err?.message || err);
    process.exit(1);
  }
}

main();
