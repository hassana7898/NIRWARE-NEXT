import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { queryOne, pool } from '../../apps/api/dist/db/connection.js';

describe('CI Reproducibility & Database Isolation', () => {
  test('Test environment is isolated: connected to test database', async () => {
    assert.equal(process.env.NODE_ENV, 'test', 'NODE_ENV must be test');
    const testDb = process.env.TEST_DATABASE_URL;
    const prodDb = process.env.DATABASE_URL;
    if (testDb && prodDb) {
      assert.notEqual(testDb, prodDb, 'TEST_DATABASE_URL must be strictly isolated and distinct from DATABASE_URL');
    }
    const currentDb = await queryOne('SELECT current_database()');
    assert.ok(currentDb, 'Current database query must succeed');
    assert.ok(
      currentDb.current_database.endsWith('_test') || currentDb.current_database === 'nirware_next_test',
      `Test suite must be connected to an isolated test database, but is connected to: ${currentDb.current_database}`
    );
  });

  test('Database schema migrations are fully up to date', async () => {
    const migrations = await queryOne(
      'SELECT COUNT(*)::int as count FROM schema_migrations'
    );
    assert.ok(migrations && migrations.count >= 2, 'All migrations (001, 002) must be applied');
  });

  after(async () => {
    await pool.end();
  });
});
