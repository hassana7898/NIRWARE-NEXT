import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { formatPersianNumber, toPersianDigits, formatToJalali } from '@nirware/shared';
import { OrderStatusBadge } from '../components/Badge';
import { Link } from 'react-router-dom';
import {
  Users,
  Feather,
  ShoppingCart,
  Factory,
  Truck,
  Warehouse,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => api.get<any>('/reports/kpis'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-slate-400 text-sm animate-pulse">در حال بارگذاری داده‌های داشبورد...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Summary */}
      <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-emerald-700 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">داشبورد فرماندهی کارخانه و زنجیره تأمین</h1>
          <p className="text-xs text-brand-100 mt-1">
            وضعیت لحظه‌ای تولید، موجودی سیلوها، توزیع دان و ناوگان حمل خوراک طیور
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/orders"
            className="px-4 py-2 bg-white text-brand-800 text-xs font-bold rounded-xl shadow hover:bg-brand-50 transition"
          >
            سفارش‌های جدید ({kpis?.pendingOrdersCount || 0})
          </Link>
          <Link
            to="/production"
            className="px-4 py-2 bg-brand-800/60 hover:bg-brand-800 text-white text-xs font-bold rounded-xl border border-white/20 transition"
          >
            خط تولید و پلت
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs">مرغداران فعال</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {toPersianDigits(kpis?.activeFarmersCount || 0)}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">واحدهای پرورشی</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs">گله‌های فعال</span>
            <Feather className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {toPersianDigits(kpis?.activeFlocksCount || 0)}
          </div>
          <span className="text-[11px] text-blue-600 font-semibold">دوره‌های در جریان</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs">سفارش‌های در انتظار</span>
            <ShoppingCart className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 text-amber-600">
            {toPersianDigits(kpis?.pendingOrdersCount || 0)}
          </div>
          <span className="text-[11px] text-amber-600 font-semibold">نیازمند بررسی</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs">بچ‌های تولید فعال</span>
            <Factory className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {toPersianDigits(kpis?.inProductionBatchesCount || 0)}
          </div>
          <span className="text-[11px] text-indigo-600 font-semibold">در خط میکسر و پلت</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs">محموله‌های در مسیر</span>
            <Truck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {toPersianDigits(kpis?.activeDeliveriesCount || 0)}
          </div>
          <span className="text-[11px] text-purple-600 font-semibold">ناوگان ترانزیت</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs">هشدار کمبود موجودی</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 text-rose-600">
            {toPersianDigits(kpis?.lowStockItemsCount || 0)}
          </div>
          <span className="text-[11px] text-rose-600 font-semibold">اقلام زیر نقطه سفارش</span>
        </div>
      </div>

      {/* Stock Levels Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <Warehouse className="w-4 h-4 text-brand-600" />
              <span>موجودی خوراک آماده در سیلوها (Finished Feed)</span>
            </div>
            <Link to="/inventory" className="text-xs text-brand-600 hover:underline flex items-center gap-0.5">
              <span>دفتر انبار</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="text-3xl font-black text-slate-900 mb-2">
            {formatPersianNumber(kpis?.totalFinishedFeedStockKg || 0)} <span className="text-sm font-normal text-slate-500">کیلوگرم</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>موجودی فیزیکی ثبت‌شده در کاردکس انبار</span>
            <span className="font-semibold text-brand-700">سیلوهای دان پلت</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>موجودی کل نهاده‌ها و مواد اولیه (Raw Materials)</span>
            </div>
            <Link to="/inbound" className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5">
              <span>حواله‌های ورود</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="text-3xl font-black text-slate-900 mb-2">
            {formatPersianNumber(kpis?.totalRawMaterialsStockKg || 0)} <span className="text-sm font-normal text-slate-500">کیلوگرم</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>ذرت، سویا، مکمل‌ها و روغن</span>
            <span className="font-semibold text-indigo-700">انبار نهاده‌های دامی</span>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900">آخرین سفارش‌های ثبت شده در زنجیره</h2>
          <Link to="/orders" className="text-xs text-brand-600 font-semibold hover:underline">
            مشاهده همه سفارش‌ها
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="p-3">شماره سفارش</th>
                <th className="p-3">مرغدار</th>
                <th className="p-3">نوع محصول</th>
                <th className="p-3 text-center">تناژ درخواستی (کیلوگرم)</th>
                <th className="p-3 text-center">وضعیت چرخه</th>
                <th className="p-3">تاریخ ثبت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kpis?.recentOrders?.map((ord: any) => (
                <tr key={ord.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3 font-bold text-slate-900">{toPersianDigits(ord.order_number)}</td>
                  <td className="p-3 font-semibold text-slate-700">{ord.farmerName}</td>
                  <td className="p-3 text-slate-600">{ord.productName}</td>
                  <td className="p-3 text-center font-bold text-slate-900">
                    {formatPersianNumber(Number(ord.requested_quantity_kg))}
                  </td>
                  <td className="p-3 text-center">
                    <OrderStatusBadge status={ord.status} />
                  </td>
                  <td className="p-3 text-slate-500">{formatToJalali(ord.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
