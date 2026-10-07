import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatPersianNumber, toPersianDigits, formatToJalali } from '@nirware/shared';
import { Database, RotateCcw, Plus, AlertCircle, ArrowUpRight, ArrowDownLeft, ShieldCheck, Filter } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { isManager } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [showReversalModal, setShowReversalModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Queries
  const { data: balances = [], isLoading: isBalancesLoading } = useQuery<any[]>({
    queryKey: ['inventory-balances'],
    queryFn: () => api.get<any[]>('/inventory/balances'),
  });

  const { data: ledger = [], isLoading: isLedgerLoading } = useQuery<any[]>({
    queryKey: ['inventory-ledger', selectedProductId],
    queryFn: () => api.get<any[]>('/inventory/ledger', selectedProductId ? { productId: selectedProductId } : undefined),
  });

  // Reversal Mutation
  const reverseMutation = useMutation({
    mutationFn: ({ entryId, reason }: { entryId: string; reason: string }) =>
      api.post(`/inventory/ledger/${entryId}/reverse`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-balances'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-ledger'] });
      setShowReversalModal(false);
      setSelectedEntry(null);
      setReversalReason('');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">دفترکل انبار کارخانه (Ledger)</h1>
          <p className="text-sm text-slate-500 mt-1">
            سیستم انبارداری تغییرناپذیر (Immutable Ledger) — بدون امکان حذف و ویرایش مستقیم؛ فقط سند اصلاحی و معکوس‌سازی (Reversal)
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>حسابرسی تغییرناپذیر (Audited & Append-Only)</span>
        </div>
      </div>

      {/* Current Balances Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isBalancesLoading ? (
          <div className="col-span-4 bg-white p-6 text-center text-slate-400 rounded-2xl">
            در حال محاسبه موجودی بر مبنای دفترکل...
          </div>
        ) : balances.map((b) => (
          <div
            key={b.productId}
            onClick={() => setSelectedProductId(selectedProductId === b.productId ? '' : b.productId)}
            className={`cursor-pointer p-4 rounded-2xl border transition ${
              selectedProductId === b.productId
                ? 'bg-emerald-50/60 border-emerald-500 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                b.productType === 'RAW_MATERIAL' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
              }`}>
                {b.productType === 'RAW_MATERIAL' ? 'ماده خام' : 'خوراک آماده'}
              </span>
              <span className="text-xs font-mono text-slate-400">{b.productCode}</span>
            </div>
            <div className="font-bold text-slate-800 mt-2 text-sm truncate">{b.productName}</div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-lg font-black text-slate-900 font-mono">
                {formatPersianNumber(b.balanceKg || 0)}
              </span>
              <span className="text-xs text-slate-500 font-normal">کیلوگرم</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter notice */}
      {selectedProductId && (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <span>فیلتر فعال روی کالای انتخاب شده.</span>
          <button
            onClick={() => setSelectedProductId('')}
            className="text-emerald-700 underline font-bold"
          >
            حذف فیلتر و نمایش همه تراکنش‌ها
          </button>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <h2 className="font-bold text-slate-800 text-sm">ریز اسناد ثبتی دفترکل (Ledger Entries)</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">مجموع: {toPersianDigits(ledger.length)} سند</span>
        </div>

        {isLedgerLoading ? (
          <div className="p-8 text-center text-slate-500">در حال دریافت گردش انبار...</div>
        ) : ledger.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>سندی برای این کالا ثبت نشده است.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold">
                <tr>
                  <th className="p-3">شماره سند / تاریخ</th>
                  <th className="p-3">کالا</th>
                  <th className="p-3">نوع تراکنش</th>
                  <th className="p-3">ورود / افزایش (+)</th>
                  <th className="p-3">خروج / کاهش (-)</th>
                  <th className="p-3">تراز موجودی پس از سند</th>
                  <th className="p-3">مرجع / توضیحات</th>
                  <th className="p-3">عملیات اصلاحی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {ledger.map((entry) => {
                  const isPositive = Number(entry.quantityKg) > 0;
                  const qty = Math.abs(Number(entry.quantityKg));

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-sans">
                        <div className="font-mono font-bold text-slate-800">{entry.id.slice(0, 8)}</div>
                        <div className="text-[11px] text-slate-400">
                          {entry.createdAt ? formatToJalali(entry.createdAt) : '-'}
                        </div>
                      </td>
                      <td className="p-3 font-sans">
                        <div className="font-bold text-slate-800">{entry.productName}</div>
                        <div className="text-[10px] text-slate-400">{entry.productCode}</div>
                      </td>
                      <td className="p-3 font-sans">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          entry.transactionType === 'INBOUND' || entry.transactionType === 'PRODUCTION_IN'
                            ? 'bg-emerald-50 text-emerald-700'
                            : entry.transactionType === 'OUTBOUND' || entry.transactionType === 'PRODUCTION_CONSUME'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {entry.transactionType}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-emerald-600">
                        {isPositive ? `+${formatPersianNumber(qty)}` : '-'}
                      </td>
                      <td className="p-3 font-bold text-rose-600">
                        {!isPositive ? `-${formatPersianNumber(qty)}` : '-'}
                      </td>
                      <td className="p-3 font-bold text-slate-900">
                        {formatPersianNumber(entry.balanceAfterKg || 0)} کگ
                      </td>
                      <td className="p-3 font-sans text-slate-500 max-w-xs truncate">
                        {entry.referenceType ? `${entry.referenceType} (${entry.referenceId?.slice(0, 6) || ''})` : entry.notes || '-'}
                      </td>
                      <td className="p-3 font-sans">
                        {isManager && !entry.isReversed && (
                          <button
                            onClick={() => {
                              setSelectedEntry(entry);
                              setShowReversalModal(true);
                            }}
                            className="flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg font-bold transition"
                          >
                            <RotateCcw className="w-3 h-3" />
                            سند معکوس
                          </button>
                        )}
                        {entry.isReversed && (
                          <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full">
                            معکوس شده
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Reversal */}
      {showReversalModal && selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                ثبت سند معکوس و اصلاحیه انبار
              </h2>
              <button onClick={() => setShowReversalModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              سند شماره <span className="font-mono font-bold text-slate-800">{selectedEntry.id.slice(0, 8)}</span> تغییر مستقیم نمی‌کند؛ بلکه سندی با علامت متضاد در دفترکل ثبت خواهد شد.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                reverseMutation.mutate({
                  entryId: selectedEntry.id,
                  reason: reversalReason,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">دلیل معکوس‌سازی / اصلاحیه</label>
                <textarea
                  required
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="خطای باسکولچی در ثبت پارت / ثبت تکراری..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={reverseMutation.isPending}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  {reverseMutation.isPending ? 'در حال صدور...' : 'صدور سند معکوس'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReversalModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
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
