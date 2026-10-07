import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
  console.error('[NIRWARE-SEEDER] FATAL: Running seeds in production is strictly forbidden to prevent polluting production data.');
  process.exit(1);
}

const { Pool } = pg;
const dbUrl = process.env.NODE_ENV === 'test'
  ? (process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres123@localhost:5432/nirware_next_test')
  : (process.env.DATABASE_URL || 'postgres://postgres:postgres123@localhost:5432/nirware_next');

const pool = new Pool({ connectionString: dbUrl });

async function runSeeds() {
  console.log(`[NIRWARE-SEEDER] Connecting to database: ${dbUrl.replace(/:[^:]*@/, ':****@')}`);
  const client = await pool.connect();

  try {
    const seedsDir = path.resolve(__dirname, '../seeds');
    const files = fs.readdirSync(seedsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`[NIRWARE-SEEDER] Found ${files.length} seed file(s).`);

    for (const file of files) {
      console.log(`[NIRWARE-SEEDER] Applying seed file: ${file}...`);
      const filePath = path.join(seedsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`[NIRWARE-SEEDER] Successfully applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[NIRWARE-SEEDER] Failed to apply seed ${file}:`, err.message);
        throw err;
      }
    }

    console.log('[NIRWARE-SEEDER] Seed data population completed successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

runSeeds().catch((err) => {
  console.error('[NIRWARE-SEEDER] Fatal seed error:', err);
  process.exit(1);
});
