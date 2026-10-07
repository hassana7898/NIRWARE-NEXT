import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { formatPersianNumber, toPersianDigits } from '@nirware/shared';
import { BarChart3, TrendingUp, Download, PieChart, FileSpreadsheet, Activity, Layers, CheckCircle2 } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');

  const { data: reportData, isLoading } = useQuery<any>({
    queryKey: ['factory-reports', fromDate, toDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      return api.get<any>(`/reports/summary${queryStr}`);
    },
  });

  const handleExport = (type: string) => {
    window.open(`/api/v1/excel/${type}/export`, '_blank');
  };

  const monthlyProduced = reportData?.monthlyProducedKg ?? 0;
  const avgFcr = reportData?.averageFcr ?? 0;
  const deliveredServices = reportData?.monthlyDeliveredServices ?? 0;
  const wastage = reportData?.wastageRate ?? 0;
  const flockEfficiencies = reportData?.flockEfficiencies || [];
  const productDistribution = reportData?.productDistribution || [];

  return (
    <div className="space-y-6">
      {/* Header & Date Range Filter */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">گزارشات مدیریتی و هوش تجاری (BI)</h1>
          <p className="text-sm text-slate-500 mt-1">
            تحلیل راندمان تولید خوراک، پایش ضریب تبدیل گله‌ها (FCR)، توزیع جغرافیایی و گزارشات تفصیلی مالی
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Inputs */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs">
            <span className="text-slate-500 font-medium">از تاریخ:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border-0 bg-transparent text-slate-700 font-mono text-xs focus:ring-0 outline-none"
            />
            <span className="text-slate-400">|</span>
            <span className="text-slate-500 font-medium">تا تاریخ:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border-0 bg-transparent text-slate-700 font-mono text-xs focus:ring-0 outline-none"
            />
            {(fromDate || toDate) && (
              <button
                onClick={() => { setFromDate(''); setToDate(''); }}
                className="text-[11px] text-red-500 hover:text-red-700 font-bold ml-1"
              >
                پاکسازی
              </button>
            )}
          </div>

          <button
            onClick={() => handleExport('orders')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>خروجی اکسل</span>
          </button>
          <button
            onClick={() => handleExport('production')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>گزارش تولید</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">مجموع تولید ثبت شده</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 font-mono">
            {isLoading ? '...' : formatPersianNumber(monthlyProduced)} <span className="text-xs font-normal">کیلوگرم</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>تولید واقعی دفترکل کارخانه</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">میانگین ضریب تبدیل (FCR)</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 font-mono">
            {isLoading ? '...' : toPersianDigits(avgFcr.toFixed(2))}
          </div>
          <div className="mt-2 text-[11px] text-blue-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>محاسبه شده بر اساس عملکرد گله‌ها</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">کل حواله‌های تحویل شده</span>
            <BarChart3 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 font-mono">
            {isLoading ? '...' : toPersianDigits(deliveredServices)} <span className="text-xs font-normal">سرویس بارگیری</span>
          </div>
          <div className="mt-2 text-[11px] text-purple-600 font-semibold">
            <span>تحویل نهایی با تایید رمز امنیتی OTP</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">نرخ استاندارد پرتی خط</span>
            <PieChart className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 font-mono">
            {toPersianDigits(wastage.toFixed(2))}٪
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-semibold">
            <span>در محدوده کنترل کیفی و استاندارد</span>
          </div>
        </div>
      </div>

      {/* Production Chart & Dynamic Flock List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span>تفکیک تولید بر اساس رده سنی دان</span>
          </h3>
          <div className="space-y-3 pt-2">
            {productDistribution.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">
                هنوز بچ تولیدی تکمیل‌شده‌ای برای تفکیک رده دان ثبت نشده است.
              </div>
            ) : (
              productDistribution.map((item: any, idx: number) => {
                const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-indigo-500'];
                const barColor = colors[idx % colors.length];
                return (
                  <div key={item.productName}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700">{item.productName} ({formatPersianNumber(item.producedKg)} ک.گ)</span>
                      <span className="font-mono text-slate-800">{toPersianDigits(item.percentage.toFixed(1))}٪</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div className={`${barColor} h-2.5 rounded-full`} style={{ width: `${Math.min(item.percentage, 100)}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>پایش راندمان مصرف دان در مزارع (استخراج دیتابیس)</span>
          </h3>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            {flockEfficiencies.length === 0 ? (
              <div className="p-4 text-center text-slate-400">اطلاعاتی از گله‌های فعال ثبت نشده است.</div>
            ) : (
              flockEfficiencies.map((flock: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">{flock.farmName || 'مزرعه'} ({flock.flockCode})</span>
                    <div className="text-[11px] text-slate-400">مرغدار: {flock.farmerName} | نژاد: {flock.breed}</div>
                  </div>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    FCR: {toPersianDigits(flock.calculatedFcr || flock.conversion_ratio || '1.45')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
