/**
 * Shared UI Design Tokens, Color Maps and Persian Status Labels
 */

import {
  OrderStatus,
  DeliveryStatus,
  UserRole,
  ProductType,
  QuotaStatus,
  ProductionBatchStatus,
} from '@nirware/config';

export interface StatusMeta {
  label: string;
  badgeClass: string;
  bgHex: string;
  textHex: string;
}

export const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  [OrderStatus.DRAFT]: {
    label: 'پیش‌نویس',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-300',
    bgHex: '#f3f4f6',
    textHex: '#374151',
  },
  [OrderStatus.SUBMITTED]: {
    label: 'ثبت شده',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    bgHex: '#eff6ff',
    textHex: '#1d4ed8',
  },
  [OrderStatus.PENDING_APPROVAL]: {
    label: 'در انتظار تایید',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    bgHex: '#fffbeb',
    textHex: '#b45309',
  },
  [OrderStatus.APPROVED]: {
    label: 'تایید شده',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    bgHex: '#ecfdf5',
    textHex: '#047857',
  },
  [OrderStatus.PRODUCTION_PENDING]: {
    label: 'در صف تولید',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    bgHex: '#eef2ff',
    textHex: '#4338ca',
  },
  [OrderStatus.READY]: {
    label: 'آماده بارگیری',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    bgHex: '#f0fdfa',
    textHex: '#0f766e',
  },
  [OrderStatus.ASSIGNED_TO_DRIVER]: {
    label: 'راننده تخصیص‌یافته',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    bgHex: '#faf5ff',
    textHex: '#7e22ce',
  },
  [OrderStatus.PICKED_UP]: {
    label: 'بارگیری شده',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    bgHex: '#ecfeff',
    textHex: '#0e7490',
  },
  [OrderStatus.IN_TRANSIT]: {
    label: 'در حال حمل',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    bgHex: '#fff7ed',
    textHex: '#c2410c',
  },
  [OrderStatus.DELIVERED]: {
    label: 'تحویل در محل',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    bgHex: '#f0f9ff',
    textHex: '#0369a1',
  },
  [OrderStatus.CONFIRMED]: {
    label: 'تایید نهایی و مختومه',
    badgeClass: 'bg-green-100 text-green-800 border-green-300',
    bgHex: '#dcfce7',
    textHex: '#166534',
  },
  [OrderStatus.REJECTED]: {
    label: 'رد شده',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    bgHex: '#fff1f2',
    textHex: '#be123c',
  },
  [OrderStatus.CANCELLED]: {
    label: 'لغو شده',
    badgeClass: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    bgHex: '#f4f4f5',
    textHex: '#52525b',
  },
};

export const DELIVERY_STATUS_META: Record<DeliveryStatus, StatusMeta> = {
  [DeliveryStatus.ASSIGNED]: {
    label: 'تخصیص‌یافته به راننده',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    bgHex: '#faf5ff',
    textHex: '#7e22ce',
  },
  [DeliveryStatus.PICKED_UP]: {
    label: 'خروج از باسکول کارخانه',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    bgHex: '#eff6ff',
    textHex: '#1d4ed8',
  },
  [DeliveryStatus.IN_TRANSIT]: {
    label: 'در مسیر مرغداری',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    bgHex: '#fffbeb',
    textHex: '#b45309',
  },
  [DeliveryStatus.DELIVERED]: {
    label: 'رسیده به مرغداری',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    bgHex: '#ecfeff',
    textHex: '#0e7490',
  },
  [DeliveryStatus.CONFIRMED]: {
    label: 'تحویل تایید شده (OTP)',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    bgHex: '#d1fae5',
    textHex: '#065f46',
  },
  [DeliveryStatus.CANCELLED]: {
    label: 'لغو بارنامه',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    bgHex: '#fff1f2',
    textHex: '#be123c',
  },
};

export const USER_ROLE_META: Record<UserRole, { label: string; badgeClass: string }> = {
  [UserRole.SUPER_ADMIN]: { label: 'مدیر ارشد سامانه', badgeClass: 'bg-red-50 text-red-700' },
  [UserRole.ADMIN]: { label: 'مدیر سیستم', badgeClass: 'bg-rose-50 text-rose-700' },
  [UserRole.MANAGER]: { label: 'مدیر کارخانه', badgeClass: 'bg-blue-50 text-blue-700' },
  [UserRole.SCALE_OPERATOR]: { label: 'مسئول باسکول', badgeClass: 'bg-yellow-50 text-yellow-700' },
  [UserRole.PRODUCTION_OPERATOR]: { label: 'مسئول تولید', badgeClass: 'bg-amber-50 text-amber-700' },
  [UserRole.FARMER]: { label: 'مرغدار', badgeClass: 'bg-emerald-50 text-emerald-700' },
  [UserRole.DRIVER]: { label: 'راننده ناوگان', badgeClass: 'bg-purple-50 text-purple-700' },
};

export const PRODUCT_TYPE_META: Record<ProductType, { label: string }> = {
  [ProductType.RAW_MATERIAL]: { label: 'ماده اولیه' },
  [ProductType.FINISHED_FEED]: { label: 'خوراک نهایی' },
  [ProductType.PREMIX]: { label: 'مکمل / پیش‌مخلوط' },
  [ProductType.MEDICINE]: { label: 'دارو و واکسن' },
};

export const QUOTA_STATUS_META: Record<QuotaStatus, { label: string; badgeClass: string }> = {
  [QuotaStatus.ACTIVE]: { label: 'دارای سهمیه فعال', badgeClass: 'bg-emerald-50 text-emerald-700' },
  [QuotaStatus.SUSPENDED]: { label: 'معلق شده', badgeClass: 'bg-amber-50 text-amber-700' },
  [QuotaStatus.EXHAUSTED]: { label: 'سهمیه پایان یافته', badgeClass: 'bg-gray-100 text-gray-700' },
};

export const BATCH_STATUS_META: Record<ProductionBatchStatus, { label: string; badgeClass: string }> = {
  [ProductionBatchStatus.PLANNED]: { label: 'برنامه‌ریزی شده', badgeClass: 'bg-blue-50 text-blue-700' },
  [ProductionBatchStatus.IN_PROGRESS]: { label: 'در حال میکس و تولید', badgeClass: 'bg-amber-50 text-amber-700' },
  [ProductionBatchStatus.COMPLETED]: { label: 'تولید تکمیل شد', badgeClass: 'bg-emerald-50 text-emerald-700' },
  [ProductionBatchStatus.CANCELLED]: { label: 'تولید لغو شده', badgeClass: 'bg-rose-50 text-rose-700' },
};
