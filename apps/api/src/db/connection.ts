import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { ConcurrencyError } from '@nirware/shared';

dotenv.config();

const databaseUrl =
  process.env.NODE_ENV === 'test'
    ? process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres123@127.0.0.1:5432/nirware_next_test'
    : process.env.DATABASE_URL || 'postgresql://postgres:postgres123@127.0.0.1:5432/nirware_next';

export const pool = new Pool({
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.DEBUG_SQL === 'true') {
    console.log('[SQL]', { text, duration, rows: res.rowCount });
  }
  return res.rows as T[];
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

export async function transaction<T>(callback: (client: pkg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Executes a callback within PostgreSQL transaction holding an Advisory Lock.
 * Used for critical operations like production batch execution and inventory mutations.
 */
export async function withAdvisoryLock<T>(
  lockId: number,
  callback: (client: pkg.PoolClient) => Promise<T>
): Promise<T> {
  return transaction(async (client) => {
    // Acquire transaction-scoped advisory xact lock
    await client.query('SELECT pg_advisory_xact_lock($1)', [lockId]);
    return await callback(client);
  });
}
