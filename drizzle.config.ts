import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://aj_dev:aj_dev_password@localhost:5432/aj_studio_dev',
  },
  verbose: true,
  strict: true,
});
