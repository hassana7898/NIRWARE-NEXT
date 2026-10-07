import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suites = [
  { name: 'Unit - Persian & Cryptography', file: 'tests/unit/persian.test.js' },
  { name: 'Unit - State Machine', file: 'tests/unit/state-machine.test.js' },
  { name: 'Unit - Feed Quota', file: 'tests/unit/quota.test.js' },
  { name: 'Unit - BOM & Formula', file: 'tests/unit/bom.test.js' },
  { name: 'Unit - Inventory Ledger', file: 'tests/unit/inventory.test.js' },
  { name: 'Integration - Authentication & Session', file: 'tests/integration/auth.test.js' },
  { name: 'Authorization - RBAC & IDOR', file: 'tests/authorization/idor.test.js' },
  { name: 'Concurrency - Production Concurrency', file: 'tests/concurrency/production-concurrency.test.js' },
  { name: 'Idempotency - Idempotency-Key Header', file: 'tests/idempotency/idempotency.test.js' },
  { name: 'Golden E2E - Factory to Farmer Lifecycle', file: 'tests/e2e/golden-workflow.test.js' },
  { name: 'Web PWA - Production Build & Assets Smoke', file: 'tests/e2e/web-build-smoke.test.js' },
];

console.log('===============================================================');
console.log('       NIRWARE NEXT - COMPREHENSIVE AUTOMATED VERIFICATION     ');
console.log('===============================================================\n');

let allPassed = true;
const results = [];

for (const suite of suites) {
  process.stdout.write(`⏳ Running [${suite.name}] ... `);
  try {
    const start = Date.now();
    execSync(`node --test "${suite.file}"`, { stdio: 'pipe' });
    const duration = Date.now() - start;
    console.log(`✅ PASSED (${duration}ms)`);
    results.push({ name: suite.name, status: 'PASSED', duration });
  } catch (err) {
    console.log(`❌ FAILED`);
    console.error(err.stdout ? err.stdout.toString() : err.message);
    results.push({ name: suite.name, status: 'FAILED' });
    allPassed = false;
  }
}

console.log('\n===============================================================');
console.log('                     VERIFICATION SUMMARY                      ');
console.log('===============================================================');
for (const r of results) {
  console.log(`${r.status === 'PASSED' ? '✅' : '❌'} ${r.name.padEnd(45)} ${r.status} ${r.duration ? `(${r.duration}ms)` : ''}`);
}
console.log('===============================================================\n');

if (!allPassed) {
  process.exit(1);
} else {
  console.log('🎉 ALL TEST SUITES PASSED PERFECTLY!\n');
}
