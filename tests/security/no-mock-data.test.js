import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

function scanFiles(dir, extensions = ['.ts', '.tsx']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('dist')) {
      results = results.concat(scanFiles(fullPath, extensions));
    } else if (extensions.some((ext) => fullPath.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Zero Mock Production Data - Static Code Audit Suite', () => {
  const sourceFiles = [
    ...scanFiles(path.join(rootDir, 'apps/api/src')),
    ...scanFiles(path.join(rootDir, 'apps/mobile/src')),
    ...scanFiles(path.join(rootDir, 'apps/web/src')),
  ];

  test('No fake GPS coordinates (36.8456, 54.4392) in production source code', () => {
    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      assert.ok(!content.includes('36.8456'), `Fake latitude 36.8456 found in ${path.relative(rootDir, file)}`);
      assert.ok(!content.includes('54.4392'), `Fake longitude 54.4392 found in ${path.relative(rootDir, file)}`);
    }
  });

  test('No fake placeholder signatures (SIGNED_ON_MOBILE_DEVICE) in production source code', () => {
    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      assert.ok(!content.includes('SIGNED_ON_MOBILE_DEVICE'), `Fake signature placeholder found in ${path.relative(rootDir, file)}`);
    }
  });

  test('No hardcoded mock bill data in AI service OCR', () => {
    const aiServicePath = path.join(rootDir, 'apps/api/src/services/ai.service.ts');
    const content = fs.readFileSync(aiServicePath, 'utf8');
    assert.ok(!content.includes('BL-98421'), 'Hardcoded OCR billNumber BL-98421 must not exist in ai.service.ts');
    assert.ok(!content.includes('24850'), 'Hardcoded invoiceWeightKg must not exist in ai.service.ts');
  });

  test('Auth service has zero password bypasses', () => {
    const authServicePath = path.join(rootDir, 'apps/api/src/services/auth.service.ts');
    const content = fs.readFileSync(authServicePath, 'utf8');
    assert.ok(!content.includes("password === 'password123'"), 'Password bypass found in auth.service.ts');
    assert.ok(!content.includes("password === 'password'"), 'Password bypass found in auth.service.ts');
  });
});
