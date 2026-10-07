/**
 * Persian text normalization and digit conversion utilities
 */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Normalizes Persian text:
 * - Converts Arabic Yeh (ي / ى) to Persian Yeh (ی)
 * - Converts Arabic Kaf (ك) to Persian Keheh (ک)
 * - Converts Arabic digits to standard Persian/English
 * - Normalizes half-spaces (ZWNJ) and collapses consecutive whitespace
 */
export function normalizePersianText(input: string): string {
  if (!input) return '';

  let normalized = input
    // Arabic Yeh to Persian Yeh
    .replace(/\u064A/g, '\u06CC') // ي -> ی
    .replace(/\u0649/g, '\u06CC') // ى -> ی
    // Arabic Kaf to Persian Keheh
    .replace(/\u0643/g, '\u06A9') // ك -> ک
    // Arabic Heh with Yeh above to standard
    .replace(/\u06C0/g, '\u0647\u200C\u06CC')
    // Remove tatweel (kashida)
    .replace(/\u0640/g, '')
    // Replace multiple spaces with single space
    .replace(/[ \t\f\v]+/g, ' ')
    .trim();

  return normalized;
}

/**
 * Converts English and Arabic digits to Persian digits (for display)
 */
export function toPersianDigits(input: string | number): string {
  if (input === null || input === undefined) return '';
  const str = input.toString();
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const code = char.charCodeAt(0);
    // English 0-9
    if (code >= 48 && code <= 57) {
      result += PERSIAN_DIGITS[code - 48];
    }
    // Arabic ٠-٩
    else if (code >= 1632 && code <= 1641) {
      result += PERSIAN_DIGITS[code - 1632];
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Converts Persian and Arabic digits to standard English digits (for parsing/storage)
 */
export function toEnglishDigits(input: string): string {
  if (!input) return '';
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const pIndex = PERSIAN_DIGITS.indexOf(char);
    if (pIndex !== -1) {
      result += pIndex.toString();
      continue;
    }
    const aIndex = ARABIC_DIGITS.indexOf(char);
    if (aIndex !== -1) {
      result += aIndex.toString();
      continue;
    }
    result += char;
  }
  return result;
}

/**
 * Formats a number with Persian digit thousands separators (e.g. ۱۲,۵۰۰)
 */
export function formatPersianNumber(value: number): string {
  const parts = value.toLocaleString('en-US').split('.');
  const intPart = toPersianDigits(parts[0].replace(/,/g, '،'));
  if (parts.length > 1) {
    return `${intPart}٫${toPersianDigits(parts[1])}`;
  }
  return intPart;
}
