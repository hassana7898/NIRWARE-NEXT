import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatPersianNumber, toPersianDigits, formatToJalali } from '@nirware/shared';
import { Truck, Plus, Scale, CheckCircle2, AlertTriangle, FileText, User } from 'lucide-react';

export const InboundPage: React.FC = () => {
  const { isManager, isScaleOperator } = useAuth();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [seller, setSeller] = useState('');
  const [productId, setProductId] = useState('');
  const [invoiceWeightKg, setInvoiceWeightKg] = useState(24000);
  const [factoryScaleWeightKg, setFactoryScaleWeightKg] = useState(23850);
  const [billNumber, setBillNumber] = useState('');
  const [origin, setOrigin] = useState('بندر امام خمینی');
  const [transportCost, setTransportCost] = useState(15000000);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [iban, setIban] = useState('');

  // Queries
  const { data: remittances = [], isLoading } = useQuery<any[]>({
    queryKey: ['inbound-remittances'],
    queryFn: () => api.get<any[]>('/inbound'),
  });

  const { data: rawMaterials = [] } = useQuery<any[]>({
    queryKey: ['raw-materials'],
    queryFn: () => api.get<any[]>('/products', { type: 'RAW_MATERIAL' }),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/inbound', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-remittances'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-balances'] });
      setShowAddModal(false);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">حواله‌های ورودی و باسکول کارخانه</h1>
          <p className="text-sm text-slate-500 mt-1">
            ثبت محموله‌های ورودی مواد اولیه (ذرت، سویا، کنجاله)، مقایسه وزن بارنامه و باسکول، کسر افت بار و ورود به انبار
          </p>
        </div>
        {(isManager || isScaleOperator) && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-sm transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>ثبت قبض باسکول ورودی</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">در حال دریافت محموله‌های ورودی...</div>
        ) : remittances.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>هیچ حواله ورودی ثبت نشده است.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold">
                <tr>
                  <th className="p-3">شماره حواله / بارنامه</th>
                  <th className="p-3">ماده اولیه / فروشنده</th>
                  <th className="p-3">وزن بارنامه</th>
                  <th className="p-3">وزن باسکول کارخانه</th>
                  <th className="p-3">کسری / افت بار</th>
                  <th className="p-3">راننده و مبدا</th>
                  <th className="p-3">کرایه حمل (تومان)</th>
                  <th className="p-3">وضعیت قبض</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {remittances.map((rem) => {
                  const inv = Number(rem.invoiceWeightKg || 0);
                  const scale = Number(rem.factoryScaleWeightKg || inv);
                  const diff = inv - scale;

                  return (
                    <tr key={rem.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-sans">
                        <div className="font-mono font-bold text-slate-800">{rem.id.slice(0, 8)}</div>
                        <div className="text-[11px] text-slate-400 font-mono">بارنامه: {rem.billNumber || '-'}</div>
                      </td>
                      <td className="p-3 font-sans">
                        <div className="font-bold text-slate-800">{rem.productName || 'ماده اولیه'}</div>
                        <div className="text-[11px] text-slate-500">{rem.seller || 'شرکت پشتیبانی امور دام'}</div>
                      </td>
                      <td className="p-3 font-bold text-slate-700">
                        {formatPersianNumber(inv)} کگ
                      </td>
                      <td className="p-3 font-bold text-emerald-700">
                        {formatPersianNumber(scale)} کگ
                      </td>
                      <td className="p-3 font-sans">
                        {diff > 0 ? (
                          <span className="text-rose-600 font-bold font-mono">-{formatPersianNumber(diff)} کگ</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">بدون کسری</span>
                        )}
                      </td>
                      <td className="p-3 font-sans">
                        <div className="font-semibold text-slate-700">{rem.driverName || 'راننده ثبت نشده'}</div>
                        <div className="text-[10px] text-slate-400">{rem.origin || 'مبدا نامشخص'}</div>
                      </td>
                      <td className="p-3 font-bold text-slate-800">
                        {formatPersianNumber(rem.transportCost || 0)}
                      </td>
                      <td className="p-3 font-sans">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          توزین و انبارش شد
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add Inbound */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-600" />
                ثبت قبض باسکول و محموله ورودی
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  seller,
                  productId,
                  invoiceWeightKg,
                  factoryScaleWeightKg,
                  billNumber,
                  origin,
                  transportCost,
                  driverName,
                  driverPhone,
                  iban,
                  status: 'CONFIRMED',
                });
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">فروشنده / مبدا بار</label>
                  <input
                    type="text"
                    required
                    value={seller}
                    onChange={(e) => setSeller(e.target.value)}
                    placeholder="مثال: شرکت جهاد استقلال"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">کالای ورودی</label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="">-- انتخاب ماده اولیه --</option>
                    {rawMaterials.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">وزن بارنامه (کیلوگرم)</label>
                  <input
                    type="number"
                    required
                    value={invoiceWeightKg}
                    onChange={(e) => setInvoiceWeightKg(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">وزن باسکول کارخانه (کیلوگرم)</label>
                  <input
                    type="number"
                    required
                    value={factoryScaleWeightKg}
                    onChange={(e) => setFactoryScaleWeightKg(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">شماره بارنامه</label>
                  <input
                    type="text"
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    placeholder="982341"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">کرایه حمل (تومان)</label>
                  <input
                    type="number"
                    value={transportCost}
                    onChange={(e) => setTransportCost(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">نام راننده</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="محمد کریمی"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">تلفن همراه راننده</label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="09120000000"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  {createMutation.isPending ? 'در حال ثبت و ورود به انبار...' : 'تأیید باسکول و ثبت در انبار'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
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
