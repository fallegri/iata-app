import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import * as schema from '../models/schema.js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is required. Set it in your .env file.'
  );
}

const pool = new Pool({ connectionString: DATABASE_URL });

export const db = drizzle(pool, { schema });

/**
 * Runs SQL migrations from the `server/drizzle` folder.
 * Creates tables if they don't exist on first deployment.
 */
export async function runMigrations(): Promise<void> {
  const migrationsFolder = resolve(__dirname, '../../drizzle');

  console.log('Running database migrations...');
  await migrate(db, { migrationsFolder });
  console.log('Database migrations completed successfully.');
}

/**
 * Closes the database connection pool.
 */
export async function closeConnection(): Promise<void> {
  await pool.end();
}
