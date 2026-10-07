import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { formatPersianNumber, toPersianDigits } from '@nirware/shared';
import { BarChart3, TrendingUp, Download, PieChart, FileSpreadsheet, Activity, Layers, CheckCircle2 } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['factory-reports'],
    queryFn: () => api.get<any>('/reports/summary'),
  });

  const handleExport = (type: string) => {
    window.open(`/api/v1/excel/${type}/export`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">گزارشات مدیریتی و هوش تجاری (BI)</h1>
          <p className="text-sm text-slate-500 mt-1">
            تحلیل راندمان تولید خوراک، پایش ضریب تبدیل گله‌ها (FCR)، توزیع جغرافیایی و گزارشات تفصیلی مالی
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('orders')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>خروجی اکسل سفارشات</span>
          </button>
          <button
            onClick={() => handleExport('production')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>گزارش تولید کارخانه</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">مجموع تولید ماه جاری</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 font-mono">
            {formatPersianNumber(185000)} <span className="text-xs font-normal">کیلوگرم</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>۱۲٪ افزایش نسبت به ماه گذشته</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">میانگین ضریب تبدیل (FCR)</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 font-mono">
            {toPersianDigits('1.48')}
          </div>
          <div className="mt-2 text-[11px] text-blue-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>در محدوده بهینه استاندارد راس ۳۰۸</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">کل حواله‌های تحویل شده</span>
            <BarChart3 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 font-mono">
            {toPersianDigits(142)} <span className="text-xs font-normal">سرویس بارگیری</span>
          </div>
          <div className="mt-2 text-[11px] text-purple-600 font-semibold">
            <span>۹۸.۴٪ تحویل به موقع با تایید رمز OTP</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">نرخ پرتی خط تولید</span>
            <PieChart className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 font-mono">
            {toPersianDigits('0.85')}٪
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-semibold">
            <span>کمتر از حد مجاز استاندارد (۱.۲٪)</span>
          </div>
        </div>
      </div>

      {/* Production Chart Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span>تفکیک تولید بر اساس رده سنی دان (هفته جاری)</span>
          </h3>
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">پیش‌دان کرامبل ویژه (Pre-Starter)</span>
                <span className="font-mono text-slate-800">{formatPersianNumber(45000)} کیلو ({toPersianDigits(24)}٪)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '24%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">میان‌دان یک پلت (Starter)</span>
                <span className="font-mono text-slate-800">{formatPersianNumber(82000)} کیلو ({toPersianDigits(44)}٪)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: '44%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">پس‌دان دو پلت (Finisher)</span>
                <span className="font-mono text-slate-800">{formatPersianNumber(58000)} کیلو ({toPersianDigits(32)}٪)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: '32%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>پایش راندمان مصرف دان در مزارع نمونه</span>
          </h3>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">مزرعه نمونه گلستان (سالن ۱)</span>
                <div className="text-[11px] text-slate-400">سن: ۳۸ روزه | وزن میانگین: ۲۳۵۰ گرم</div>
              </div>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">FCR: {toPersianDigits('1.42')}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">مرغداری صبا (سالن ۲)</span>
                <div className="text-[11px] text-slate-400">سن: ۴۲ روزه | وزن میانگین: ۲۶۸۰ گرم</div>
              </div>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">FCR: {toPersianDigits('1.47')}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">مزرعه دشت گرگان (سالن ۳)</span>
                <div className="text-[11px] text-slate-400">سن: ۳۰ روزه | وزن میانگین: ۱۷۲۰ گرم</div>
              </div>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">FCR: {toPersianDigits('1.39')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
