import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// All 20 Required Verification Suites
const suites = [
  { id: '01', name: 'Persian & Crypto', file: 'tests/unit/persian.test.js' },
  { id: '02', name: 'State Machine', file: 'tests/unit/state-machine.test.js' },
  { id: '03', name: 'Feed Quota', file: 'tests/unit/quota.test.js' },
  { id: '04', name: 'BOM & Formula', file: 'tests/unit/bom.test.js' },
  { id: '05', name: 'Inventory Ledger', file: 'tests/unit/inventory.test.js' },
  { id: '06', name: 'Authentication & Session', file: 'tests/integration/auth.test.js' },
  { id: '07', name: 'RBAC Authorization', file: 'tests/authorization/rbac.test.js' },
  { id: '08', name: 'IDOR Enforcement', file: 'tests/authorization/idor.test.js' },
  { id: '09', name: 'Production Concurrency', file: 'tests/concurrency/production-concurrency.test.js' },
  { id: '10', name: 'HTTP Idempotency Concurrency', file: 'tests/idempotency/idempotency.test.js' },
  { id: '11', name: 'Golden HTTP E2E Lifecycle', file: 'tests/e2e/http-golden-workflow.test.js' },
  { id: '12', name: 'Web PWA Build & Assets Smoke', file: 'tests/e2e/web-build-smoke.test.js' },
  { id: '13', name: 'GPS Failure Safety', file: 'tests/mobile/gps-safety.test.js' },
  { id: '14', name: 'Mobile Secure Storage', file: 'tests/mobile/secure-storage.test.js' },
  { id: '15', name: 'Settings Integrity', file: 'tests/integration/settings-integrity.test.js' },
  { id: '16', name: 'Report Date Range & Dynamic Metrics', file: 'tests/reports/date-range.test.js' },
  { id: '17', name: 'Zero Mock Production Data Audit', file: 'tests/security/no-mock-data.test.js' },
  { id: '18', name: 'Docker Configuration Safety', file: 'tests/infra/docker-safety.test.js' },
  { id: '19', name: 'CI Reproducibility & DB Isolation', file: 'tests/infra/ci-reproducibility.test.js' },
  { id: '20', name: 'Mobile Expo Configuration', file: 'tests/mobile/mobile-config.test.js' },
  { id: '21', name: 'Android Build Verification', file: 'tests/mobile/android-build-verification.test.js' },
  { id: '22', name: 'OCR Provider Status', file: 'tests/security/ocr-provider-status.test.js' },
];

console.log('========================================================================');
console.log('       NIRWARE NEXT - 22/22 COMPREHENSIVE AUTOMATED VERIFICATION MATRIX ');
console.log('========================================================================\n');

let allPassed = true;
const results = [];

for (const suite of suites) {
  const label = `[${suite.id}] ${suite.name}`;
  process.stdout.write(`⏳ Running ${label.padEnd(45)} ... `);
  try {
    const start = Date.now();
    execSync(`node --test "${suite.file}"`, {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' },
    });
    const duration = Date.now() - start;
    console.log(`✅ PASSED (${duration}ms)`);
    results.push({ id: suite.id, name: suite.name, status: 'PASSED', duration });
  } catch (err) {
    console.log(`❌ FAILED`);
    console.error(err.stdout ? err.stdout.toString() : err.message);
    results.push({ id: suite.id, name: suite.name, status: 'FAILED' });
    allPassed = false;
  }
}

console.log('\n========================================================================');
console.log('                           VERIFICATION SUMMARY                         ');
console.log('========================================================================');
for (const r of results) {
  const icon = r.status === 'PASSED' ? '✅' : '❌';
  console.log(`${icon} [${r.id}] ${r.name.padEnd(42)} ${r.status.padEnd(8)} ${r.duration ? `(${r.duration}ms)` : ''}`);
}
console.log('========================================================================\n');

if (!allPassed) {
  process.exit(1);
} else {
  console.log(`🎉 ALL ${suites.length}/${suites.length} TEST SUITES PASSED PERFECTLY WITH EVIDENCE!\n`);
}
