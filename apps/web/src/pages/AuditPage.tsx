import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { toPersianDigits, formatToJalali } from '@nirware/shared';
import { ShieldCheck, Search, Filter, Terminal, User, Clock, Globe } from 'lucide-react';

export const AuditPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  const { data: auditLogs = [], isLoading } = useQuery<any[]>({
    queryKey: ['audit-logs'],
    queryFn: () => api.get<any[]>('/audit/logs'),
  });

  const filteredLogs = auditLogs.filter(
    (log) =>
      (!selectedAction || log.action === selectedAction) &&
      (!search ||
        (log.userName && log.userName.toLowerCase().includes(search.toLowerCase())) ||
        (log.action && log.action.toLowerCase().includes(search.toLowerCase())) ||
        (log.entityType && log.entityType.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            لاگ‌های امنیتی و ردپای حسابرسی (Audit Trail)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ثبت غیرقابل تغییر تمامی رویدادها، تغییرات وضعیت، لاگین‌ها و تراکنش‌های حساس سیستم با مهر زمانی و آدرس شبکه
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none"
          >
            <option value="">-- همه اقدامات --</option>
            <option value="USER_LOGIN">ورود به سیستم (LOGIN)</option>
            <option value="CREATE_ORDER">ثبت سفارش دان</option>
            <option value="ORDER_TRANSITION">تغییر وضعیت سفارش</option>
            <option value="DISPATCH_DELIVERY">تخصیص راننده و ناوگان</option>
            <option value="CONFIRM_DELIVERY">تأیید تحویل با رمز OTP</option>
            <option value="INVENTORY_REVERSAL">معکوس‌سازی سند انبار</option>
            <option value="PRODUCTION_LAUNCH">شروع بچ تولیدی</option>
          </select>
        </div>

        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="جستجوی کاربر، نوع موجودیت یا اقدام..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">در حال دریافت لاگ‌های سیستمی...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>رکوردی در تاریخچه امنیت یافت نشد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold">
                <tr>
                  <th className="p-3">زمان رویداد (جلالی)</th>
                  <th className="p-3">کاربر عامل</th>
                  <th className="p-3">نقش</th>
                  <th className="p-3">نوع عملیات (Action)</th>
                  <th className="p-3">موجودیت و شناسه</th>
                  <th className="p-3">آدرس IP</th>
                  <th className="p-3">جزئیات / Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3 font-sans text-slate-500">
                      {log.createdAt ? formatToJalali(log.createdAt) : '-'}
                    </td>
                    <td className="p-3 font-sans">
                      <div className="font-bold text-slate-800">{log.userName || log.userEmail || 'سامانه'}</div>
                    </td>
                    <td className="p-3 font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {log.userRole || 'SYSTEM'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-emerald-700">{log.action}</span>
                    </td>
                    <td className="p-3 font-sans">
                      <span className="text-slate-600 font-semibold">{log.entityType}</span>
                      {log.entityId && (
                        <span className="text-slate-400 font-mono text-[10px] mr-1">({log.entityId.slice(0, 8)})</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500">{log.ipAddress || '127.0.0.1'}</td>
                    <td className="p-3 max-w-xs truncate text-[11px] text-slate-400">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
