import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePersianText,
  toPersianDigits,
  toEnglishDigits,
  gregorianToJalali,
  jalaliToGregorian,
  formatToJalali,
  generateSecureOtp,
  hashToken,
  verifyOtpHash,
} from '../../packages/shared/dist/index.js';

describe('Shared - Persian Utilities & Cryptography', () => {
  test('Normalizes Arabic characters to standard Persian', () => {
    const raw = 'شركت پشتيباني امور دام كشور';
    const normalized = normalizePersianText(raw);
    assert.equal(normalized, 'شرکت پشتیبانی امور دام کشور');
    assert.ok(!normalized.includes('ي'));
    assert.ok(!normalized.includes('ك'));
  });

  test('Converts English to Persian digits and vice versa', () => {
    assert.equal(toPersianDigits(1403), '۱۴۰۳');
    assert.equal(toPersianDigits('25000 KG'), '۲۵۰۰۰ KG');
    assert.equal(toEnglishDigits('۱۲۵۰۰'), '12500');
  });

  test('Jalali astronomical conversion', () => {
    // 2024-03-20 is 1403-01-01 (Nowruz)
    const { jy, jm, jd } = gregorianToJalali(2024, 3, 20);
    assert.equal(jy, 1403);
    assert.equal(jm, 1);
    assert.equal(jd, 1);

    const greg = jalaliToGregorian(1403, 1, 1);
    assert.equal(greg.gy, 2024);
    assert.equal(greg.gm, 3);
    assert.equal(greg.gd, 20);

    const formatted = formatToJalali(new Date('2024-03-20T00:00:00Z'));
    assert.ok(formatted.includes('۱۴۰۳/۰۱/۰۱'));
  });

  test('Generates cryptographically secure 6-digit OTP and verifies hash', () => {
    const otp = generateSecureOtp(6);
    assert.equal(otp.length, 6);
    assert.ok(/^\d{6}$/.test(otp));

    const hashed = hashToken(otp);
    assert.notEqual(hashed, otp);
    assert.ok(verifyOtpHash(otp, hashed));
    assert.ok(!verifyOtpHash('000000', hashed));
  });
});
