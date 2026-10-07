import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres123@localhost:5432/nirware_next';

const pool = new Pool({ connectionString: dbUrl });

async function runMigrations() {
  console.log(`[NIRWARE-MIGRATOR] Connecting to database: ${dbUrl.replace(/:[^:]*@/, ':****@')}`);
  const client = await pool.connect();

  try {
    // Ensure migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationsDir = path.resolve(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`[NIRWARE-MIGRATOR] Found ${files.length} migration file(s).`);

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT id FROM schema_migrations WHERE filename = $1',
        [file]
      );

      if (rows.length > 0) {
        console.log(`[NIRWARE-MIGRATOR] Skipping already applied: ${file}`);
        continue;
      }

      console.log(`[NIRWARE-MIGRATOR] Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[NIRWARE-MIGRATOR] Successfully applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[NIRWARE-MIGRATOR] Failed to apply ${file}:`, err.message);
        throw err;
      }
    }

    console.log('[NIRWARE-MIGRATOR] All migrations are up to date.');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error('[NIRWARE-MIGRATOR] Fatal migration error:', err);
  process.exit(1);
});
