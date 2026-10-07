import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('Docker Configuration Safety & Secrets Isolation', () => {
  test('docker-compose.yml does not contain hardcoded database passwords or JWT secrets', () => {
    const composeContent = fs.readFileSync(path.join(rootDir, 'docker-compose.yml'), 'utf8');
    assert.ok(!composeContent.includes('POSTGRES_PASSWORD: postgres123'), 'Hardcoded postgres password found in docker-compose.yml');
    assert.ok(!composeContent.includes('JWT_SECRET: production_super_secret'), 'Hardcoded JWT secret found in docker-compose.yml');
    assert.ok(composeContent.includes('${POSTGRES_PASSWORD}'), 'Must use environment variable for POSTGRES_PASSWORD');
    assert.ok(composeContent.includes('${JWT_SECRET}'), 'Must use environment variable for JWT_SECRET');
  });

  test('docker-compose.yml does not mount seed files into initdb', () => {
    const composeContent = fs.readFileSync(path.join(rootDir, 'docker-compose.yml'), 'utf8');
    assert.ok(!composeContent.includes('002_seed_data.sql'), 'Seed files must not be mounted into docker initdb');
  });

  test('.env.example contains only template placeholders without secrets', () => {
    const envExample = fs.readFileSync(path.join(rootDir, '.env.example'), 'utf8');
    assert.ok(!envExample.includes('postgres123'), 'Hardcoded password found in .env.example');
    assert.ok(envExample.includes('your_secure_db_password'), 'Template placeholder expected in .env.example');
  });
});
