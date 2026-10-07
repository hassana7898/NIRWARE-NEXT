/**
 * Accurate Gregorian to Jalali (Solar Hijri) and Jalali to Gregorian date conversions.
 * Implementation based on the astronomical algorithm.
 */

import { toPersianDigits } from './persian.js';

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

export interface GregorianDate {
  gy: number;
  gm: number;
  gd: number;
}

const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

/**
 * Converts Gregorian date to Jalali date
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

/**
 * Converts Jalali date to Gregorian date
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): GregorianDate {
  let gy: number;
  if (jy > 979) {
    gy = 1600;
    jy -= 979;
  } else {
    gy = 621;
  }
  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  let gm: number;
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) {
    gd -= sal_a[gm];
  }
  return { gy, gm, gd };
}

/**
 * Formats a Date object or ISO string into Persian Jalali string (e.g. "۱۴۰۳/۰۷/۱۶")
 */
export function formatToJalali(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const { jy, jm, jd } = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const mm = jm < 10 ? `0${jm}` : `${jm}`;
  const dd = jd < 10 ? `0${jd}` : `${jd}`;
  return `${toPersianDigits(jy)}/${toPersianDigits(mm)}/${toPersianDigits(dd)}`;
}

/**
 * Formats a Date object or ISO string into a standard Gregorian YYYY/MM/DD Jalali representation with English digits
 */
export function formatToJalaliEn(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const { jy, jm, jd } = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const mm = jm < 10 ? `0${jm}` : `${jm}`;
  const dd = jd < 10 ? `0${jd}` : `${jd}`;
  return `${jy}/${mm}/${dd}`;
}

/**
 * Formats a Date object with Persian Month Name (e.g. "۱۶ مهر ۱۴۰۳")
 */
export function formatJalaliHuman(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const { jy, jm, jd } = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const monthName = PERSIAN_MONTH_NAMES[jm - 1];
  return `${toPersianDigits(jd)} ${monthName} ${toPersianDigits(jy)}`;
}

/**
 * Parses Jalali date string (YYYY/MM/DD) into UTC Date object
 */
export function parseJalaliToDate(jalaliStr: string): Date | null {
  if (!jalaliStr) return null;
  const cleaned = jalaliStr.trim().replace(/[ـ]/g, '');
  const parts = cleaned.split(/[\/\-\.]/).map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return null;
  }
  const [jy, jm, jd] = parts;
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  return new Date(Date.UTC(gy, gm - 1, gd));
}
