import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatPersianNumber, toPersianDigits, formatToJalali } from '@nirware/shared';
import { Award, Plus, CheckCircle2, AlertCircle, TrendingUp, Filter } from 'lucide-react';

export const QuotasPage: React.FC = () => {
  const { isManager, isFarmer, user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [farmerId, setFarmerId] = useState('');
  const [flockId, setFlockId] = useState('');
  const [period, setPeriod] = useState('1403-Q4');
  const [approvedQuantityKg, setApprovedQuantityKg] = useState(35000);

  const { data: quotas = [], isLoading } = useQuery<any[]>({
    queryKey: ['quotas'],
    queryFn: () => api.get<any[]>('/farmers/all/quotas'),
  });

  const { data: farmers = [] } = useQuery<any[]>({
    queryKey: ['farmers'],
    queryFn: () => api.get<any[]>('/farmers'),
    enabled: isManager,
  });

  const { data: flocks = [] } = useQuery<any[]>({
    queryKey: ['flocks'],
    queryFn: () => api.get<any[]>('/flocks'),
    enabled: isManager,
  });

  const createQuotaMutation = useMutation({
    mutationFn: (data: any) => api.post('/quotas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotas'] });
      setShowAddModal(false);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">سهمیه خوراک و دان مرغداران</h1>
          <p className="text-sm text-slate-500 mt-1">
            تخصیص سهمیه مصوب، پایش سقف سفارش و مانده مجاز دان بر اساس ظرفیت گله و دوره پرورشی
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-sm transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>تخصیص سهمیه جدید</span>
          </button>
        )}
      </div>

      {/* Quota Cards */}
      {isLoading ? (
        <div className="bg-white p-12 text-center text-slate-500 rounded-2xl border border-slate-200">
          در حال بارگذاری سهمیه‌ها...
        </div>
      ) : quotas.length === 0 ? (
        <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-200">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>هیچ سهمیه‌ای برای این دوره ثبت نشده است.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quotas.map((quota) => {
            const approved = Number(quota.approvedQuantityKg || 0);
            const used = Number(quota.usedQuantityKg || 0);
            const remaining = Number(quota.remainingKg !== undefined ? quota.remainingKg : approved - used);
            const usagePercent = approved > 0 ? Math.min(100, Math.round((used / approved) * 100)) : 0;

            return (
              <div
                key={quota.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-600 uppercase">
                      دوره: {quota.period || '۱۴۰۳'}
                    </span>
                    <h3 className="text-lg font-black text-slate-800 mt-0.5">
                      {quota.farmerName || 'مرغدار'}
                    </h3>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      گله: {quota.flockCode || (quota.flockId ? quota.flockId.slice(0, 8) : 'عمومی')}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    quota.status === 'APPROVED' || quota.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {quota.status === 'APPROVED' || quota.status === 'ACTIVE' ? 'مصوب' : quota.status}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">میزان مصرف شده:</span>
                    <span className="text-slate-800 font-mono">{toPersianDigits(usagePercent)}٪</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        usagePercent > 90 ? 'bg-rose-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>

                {/* Numbers */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl text-center">
                  <div>
                    <div className="text-[10px] text-slate-500">سهمیه کل</div>
                    <div className="text-xs font-bold text-slate-800 mt-1">
                      {formatPersianNumber(approved)} <span className="text-[9px]">کگ</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">مصرف شده</div>
                    <div className="text-xs font-bold text-slate-700 mt-1">
                      {formatPersianNumber(used)} <span className="text-[9px]">کگ</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-emerald-600 font-bold">باقیمانده</div>
                    <div className="text-xs font-black text-emerald-700 mt-1">
                      {formatPersianNumber(remaining)} <span className="text-[9px]">کگ</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add Quota */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                تخصیص سهمیه خوراک
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createQuotaMutation.mutate({
                  farmerId,
                  flockId: flockId || undefined,
                  period,
                  approvedQuantityKg,
                  status: 'APPROVED',
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">مرغدار</label>
                <select
                  value={farmerId}
                  onChange={(e) => setFarmerId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                >
                  <option value="">-- انتخاب مرغدار --</option>
                  {farmers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.fullName} - {f.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">دوره پرورشی (گله)</label>
                <select
                  value={flockId}
                  onChange={(e) => setFlockId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                >
                  <option value="">-- عمومی / بدون گله خاص --</option>
                  {flocks.map((flock) => (
                    <option key={flock.id} value={flock.id}>
                      {flock.code || flock.id.slice(0, 8)} ({flock.breed})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">دوره / فصل</label>
                  <input
                    type="text"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    placeholder="1403-Q4"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">مقدار مصوب (کیلوگرم)</label>
                  <input
                    type="number"
                    value={approvedQuantityKg}
                    onChange={(e) => setApprovedQuantityKg(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="submit"
                  disabled={createQuotaMutation.isPending}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition"
                >
                  {createQuotaMutation.isPending ? 'در حال ثبت...' : 'تصویب سهمیه'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
