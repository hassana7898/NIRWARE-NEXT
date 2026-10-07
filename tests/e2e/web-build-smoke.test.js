import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Production Web Build & PWA Smoke Suite', () => {
  const distDir = path.resolve(__dirname, '../../apps/web/dist');

  test('Production dist/index.html exists and is correctly configured', () => {
    const indexPath = path.join(distDir, 'index.html');
    assert.strictEqual(fs.existsSync(indexPath), true, 'index.html must exist in dist');

    const html = fs.readFileSync(indexPath, 'utf8');
    assert.match(html, /dir="rtl"/i, 'HTML must have dir="rtl" for Persian language');
    assert.match(html, /manifest\.json/i, 'HTML must link to PWA manifest.json');
    assert.match(html, /Vazirmatn/i, 'HTML must link to Vazirmatn Persian font');
    assert.match(html, /serviceWorker/i, 'HTML must include service worker registration');
    assert.match(html, /<script type="module"/i, 'HTML must include compiled module script');
  });

  test('PWA manifest.json is valid and contains Persian RTL metadata', () => {
    const manifestPath = path.join(distDir, 'manifest.json');
    assert.strictEqual(fs.existsSync(manifestPath), true, 'manifest.json must exist in dist');

    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);

    assert.strictEqual(manifest.display, 'standalone');
    assert.strictEqual(manifest.dir, 'rtl');
    assert.strictEqual(manifest.theme_color, '#16a34a');
    assert.ok(manifest.name.length > 0);
  });

  test('Service worker script sw.js exists in dist', () => {
    const swPath = path.join(distDir, 'sw.js');
    assert.strictEqual(fs.existsSync(swPath), true, 'sw.js must exist in dist');

    const swContent = fs.readFileSync(swPath, 'utf8');
    assert.match(swContent, /install/i);
    assert.match(swContent, /fetch/i);
  });

  test('Assets folder contains compiled JavaScript and CSS bundles', () => {
    const assetsDir = path.join(distDir, 'assets');
    assert.strictEqual(fs.existsSync(assetsDir), true, 'assets directory must exist');

    const files = fs.readdirSync(assetsDir);
    const jsFiles = files.filter((f) => f.endsWith('.js'));
    const cssFiles = files.filter((f) => f.endsWith('.css'));

    assert.ok(jsFiles.length > 0, 'Must have at least one compiled JS bundle');
    assert.ok(cssFiles.length > 0, 'Must have at least one compiled CSS bundle');

    // Ensure bundles are non-empty
    for (const f of [...jsFiles, ...cssFiles]) {
      const stat = fs.statSync(path.join(assetsDir, f));
      assert.ok(stat.size > 1000, `Asset ${f} should have substantial content size`);
    }
  });
});
