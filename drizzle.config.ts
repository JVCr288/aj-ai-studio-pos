import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://akk_dev:akk_dev_password@localhost:5432/akk_nocturne_dev',
  },
  verbose: true,
  strict: true,
});
