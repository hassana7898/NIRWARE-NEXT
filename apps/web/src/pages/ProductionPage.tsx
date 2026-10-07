import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatPersianNumber, toPersianDigits, formatToJalali } from '@nirware/shared';
import { Factory, Play, CheckCircle2, AlertTriangle, Clock, RefreshCw, Layers } from 'lucide-react';

export const ProductionPage: React.FC = () => {
  const { isManager } = useAuth();
  const queryClient = useQueryClient();
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [targetQuantityKg, setTargetQuantityKg] = useState(5000);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Queries
  const { data: batches = [], isLoading } = useQuery<any[]>({
    queryKey: ['production-batches'],
    queryFn: () => api.get<any[]>('/production/batches'),
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['finished-products'],
    queryFn: () => api.get<any[]>('/products', { type: 'FINISHED_FEED' }),
  });

  // Launch Batch Mutation
  const launchMutation = useMutation({
    mutationFn: (data: any) => api.post('/production/batches', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-ledger'] });
      setShowLaunchModal(false);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'خطا در ثبت بچ تولیدی. ممکن است موجودی مواد اولیه کافی نباشد.');
    },
  });

  // Complete Batch Mutation
  const completeMutation = useMutation({
    mutationFn: ({ batchId, actualKg, wastageKg }: any) =>
      api.post(`/production/batches/${batchId}/complete`, { actualKg, wastageKg }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-ledger'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">خط تولید و بچ‌های خوراک</h1>
          <p className="text-sm text-slate-500 mt-1">
            راه‌اندازی بچ بر اساس BOM، قفل و کسر خودکار مواد اولیه از انبار، ثبت پرتی و افزایش موجودی محصول
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => {
              setErrorMessage(null);
              setShowLaunchModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-sm transition-all"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>راه‌اندازی بچ تولیدی جدید</span>
          </button>
        )}
      </div>

      {/* Batches List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">در حال دریافت بچ‌های تولید...</div>
        ) : batches.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Factory className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>هیچ بچ تولیدی فعالی ثبت نشده است.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-medium">
                <tr>
                  <th className="p-4">شماره بچ / تاریخ</th>
                  <th className="p-4">فرآورده هدف</th>
                  <th className="p-4">مقدار هدف</th>
                  <th className="p-4">مقدار واقعی / پرتی</th>
                  <th className="p-4">وضعیت فرآیند</th>
                  <th className="p-4">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-4">
                      <div className="font-mono font-bold text-slate-800">{batch.batchNumber || batch.id.slice(0, 8)}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {batch.createdAt ? formatToJalali(batch.createdAt) : '-'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{batch.productName || 'خوراک طیور'}</div>
                    </td>
                    <td className="p-4 font-mono font-semibold text-slate-700">
                      {formatPersianNumber(batch.targetQuantityKg || 0)} کیلوگرم
                    </td>
                    <td className="p-4 font-mono text-slate-600">
                      {batch.actualQuantityKg ? (
                        <>
                          <span className="font-bold text-emerald-700">{formatPersianNumber(batch.actualQuantityKg)} کگ</span>
                          {batch.wastageKg ? (
                            <span className="text-rose-500 text-xs mr-2">({formatPersianNumber(batch.wastageKg)} کگ پرتی)</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-slate-400 text-xs">در حال پردازش خط</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        batch.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : batch.status === 'IN_PROGRESS'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {batch.status === 'COMPLETED' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            تکمیل شده
                          </>
                        ) : batch.status === 'IN_PROGRESS' ? (
                          <>
                            <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                            در حال آسیاب و میکس
                          </>
                        ) : (
                          batch.status
                        )}
                      </span>
                    </td>
                    <td className="p-4">
                      {batch.status === 'IN_PROGRESS' && isManager && (
                        <button
                          onClick={() =>
                            completeMutation.mutate({
                              batchId: batch.id,
                              actualKg: batch.targetQuantityKg,
                              wastageKg: Math.round(batch.targetQuantityKg * 0.01),
                            })
                          }
                          disabled={completeMutation.isPending}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
                        >
                          ثبت خاتمه و انبارش
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Launch Batch */}
      {showLaunchModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Factory className="w-5 h-5 text-emerald-600" />
                راه‌اندازی خط تولید خوراک
              </h2>
              <button onClick={() => setShowLaunchModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                launchMutation.mutate({
                  productId: selectedProductId,
                  targetQuantityKg,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">فرآورده نهایی تولید</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                >
                  <option value="">-- انتخاب فرمول و فرآورده --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">میزان تولید هدف (کیلوگرم)</label>
                <input
                  type="number"
                  step="100"
                  required
                  value={targetQuantityKg}
                  onChange={(e) => setTargetQuantityKg(Number(e.target.value))}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  سامانه بر مبنای BOM موجودی مواد اولیه (ذرت، کنجاله، سویا، مکمل) را بررسی و به‌صورت Transactional کسر خواهد کرد.
                </p>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="submit"
                  disabled={launchMutation.isPending}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50"
                >
                  {launchMutation.isPending ? 'در حال قفل و اختصاص مواد...' : 'تأیید و شروع تولید'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLaunchModal(false)}
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
