import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatPersianNumber, toPersianDigits, formatToJalali } from '@nirware/shared';
import { OrderStatusBadge } from '../components/Badge';
import { OrderStatus, UserRole } from '@nirware/config';
import { OfflineQueueManager } from '../pwa/offline-queue';
import { Plus, CheckCircle, XCircle, ArrowRightCircle, AlertCircle, ShoppingCart } from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const { user, isManager, isFarmer } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Form State
  const [farmerId, setFarmerId] = useState('');
  const [flockId, setFlockId] = useState('');
  const [quotaId, setQuotaId] = useState('');
  const [productId, setProductId] = useState('');
  const [requestedKg, setRequestedKg] = useState(10000);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDateNeeded, setDeliveryDateNeeded] = useState(
    new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', selectedStatus],
    queryFn: () => api.get<any[]>('/orders', selectedStatus ? { status: selectedStatus } : undefined),
  });

  const { data: quotas } = useQuery({
    queryKey: ['quotas'],
    queryFn: () => api.get<any[]>('/farmers/all/quotas'),
    enabled: isNewModalOpen,
  });

  const { data: products } = useQuery({
    queryKey: ['finished-products'],
    queryFn: () => api.get<any[]>('/products', { type: 'FINISHED_FEED' }),
    enabled: isNewModalOpen,
  });

  const { data: farmers } = useQuery({
    queryKey: ['farmers'],
    queryFn: () => api.get<any[]>('/farmers'),
    enabled: isNewModalOpen && isManager,
  });

  // State Transition Mutation
  const transitionMutation = useMutation({
    mutationFn: ({ orderId, action, targetState, approvedQuantityKg }: any) =>
      api.post(`/orders/${orderId}/transition`, { action, targetState, approvedQuantityKg }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
    },
    onError: (err: any) => {
      alert(err?.message || 'خطا در تغییر وضعیت سفارش');
    },
  });

  // Create Order Submit
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const targetFarmerId = isFarmer ? user?.farmerId : farmerId;

    if (!targetFarmerId || !flockId || !quotaId || !productId) {
      setFormError('لطفاً تمامی فیلدهای الزامی را تکمیل نمایید');
      return;
    }

    const payload = {
      farmerId: targetFarmerId,
      flockId,
      quotaId,
      productId,
      requestedQuantityKg: requestedKg,
      deliveryAddress,
      deliveryDateNeeded,
      notes,
    };

    if (!navigator.onLine) {
      // Offline fallback
      OfflineQueueManager.enqueue('/orders', payload, 'POST');
      alert('سفارش در حافظه محلی ذخیره شد و پس از اتصال اینترنت همگام‌سازی خواهد شد');
      setIsNewModalOpen(false);
      return;
    }

    try {
      await api.post('/orders', payload);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsNewModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'خطا در ثبت سفارش');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-brand-600" />
            <span>مدیریت و گردش سفارش‌های دان طیور</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            کنترل وضعیت سفارشات بر اساس ماشین وضعیت مرکزی (State Machine) و سهمیه فعال مرغدار
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-brand-600/20 flex items-center gap-1.5 transition"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت سفارش جدید دان</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 text-xs bg-white p-2 rounded-2xl border border-slate-200">
        <button
          onClick={() => setSelectedStatus('')}
          className={`px-3 py-1.5 rounded-xl transition font-medium ${
            selectedStatus === '' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          همه سفارش‌ها
        </button>
        <button
          onClick={() => setSelectedStatus(OrderStatus.SUBMITTED)}
          className={`px-3 py-1.5 rounded-xl transition font-medium ${
            selectedStatus === OrderStatus.SUBMITTED ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          ثبت شده
        </button>
        <button
          onClick={() => setSelectedStatus(OrderStatus.PENDING_APPROVAL)}
          className={`px-3 py-1.5 rounded-xl transition font-medium ${
            selectedStatus === OrderStatus.PENDING_APPROVAL ? 'bg-amber-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          در انتظار تایید
        </button>
        <button
          onClick={() => setSelectedStatus(OrderStatus.APPROVED)}
          className={`px-3 py-1.5 rounded-xl transition font-medium ${
            selectedStatus === OrderStatus.APPROVED ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          تایید شده
        </button>
        <button
          onClick={() => setSelectedStatus(OrderStatus.CONFIRMED)}
          className={`px-3 py-1.5 rounded-xl transition font-medium ${
            selectedStatus === OrderStatus.CONFIRMED ? 'bg-green-700 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          تایید نهایی / مختومه
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs">در حال بارگذاری لیست سفارشات...</div>
        ) : orders?.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">هیچ سفارشی در این وضعیت یافت نشد.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                <tr>
                  <th className="p-3">شماره سفارش</th>
                  <th className="p-3">مرغدار</th>
                  <th className="p-3">کد دوره / گله</th>
                  <th className="p-3">نوع خوراک</th>
                  <th className="p-3 text-center">درخواستی (KG)</th>
                  <th className="p-3 text-center">مصوب (KG)</th>
                  <th className="p-3 text-center">وضعیت</th>
                  <th className="p-3">تاریخ نیاز</th>
                  <th className="p-3 text-center">عملیات ماشین وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders?.map((ord: any) => (
                  <tr key={ord.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-bold text-slate-900">{toPersianDigits(ord.order_number)}</td>
                    <td className="p-3 font-semibold text-slate-800">{ord.farmerName}</td>
                    <td className="p-3 text-slate-600">{toPersianDigits(ord.flockCode)}</td>
                    <td className="p-3 text-slate-700 font-medium">{ord.productName}</td>
                    <td className="p-3 text-center font-bold text-slate-900">
                      {formatPersianNumber(Number(ord.requested_quantity_kg))}
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-700">
                      {Number(ord.approved_quantity_kg) > 0 ? formatPersianNumber(Number(ord.approved_quantity_kg)) : '—'}
                    </td>
                    <td className="p-3 text-center">
                      <OrderStatusBadge status={ord.status} />
                    </td>
                    <td className="p-3 text-slate-500">{formatToJalali(ord.delivery_date_needed)}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* State Machine Transition Actions based on Role */}
                        {isManager && ord.status === OrderStatus.SUBMITTED && (
                          <button
                            onClick={() =>
                              transitionMutation.mutate({
                                orderId: ord.id,
                                action: 'PROCESS_FOR_APPROVAL',
                                targetState: OrderStatus.PENDING_APPROVAL,
                              })
                            }
                            className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-lg text-[11px] font-semibold transition"
                          >
                            ارسال جهت تایید
                          </button>
                        )}

                        {isManager && ord.status === OrderStatus.PENDING_APPROVAL && (
                          <>
                            <button
                              onClick={() =>
                                transitionMutation.mutate({
                                  orderId: ord.id,
                                  action: 'APPROVE_ORDER',
                                  targetState: OrderStatus.APPROVED,
                                  approvedQuantityKg: Number(ord.requested_quantity_kg),
                                })
                              }
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition shadow-sm"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>تایید سفارش</span>
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('علت رد سفارش:');
                                if (reason) {
                                  transitionMutation.mutate({
                                    orderId: ord.id,
                                    action: 'REJECT_ORDER',
                                    targetState: OrderStatus.REJECTED,
                                    rejectionReason: reason,
                                  });
                                }
                              }}
                              className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-lg text-[11px] font-semibold transition"
                            >
                              رد سفارش
                            </button>
                          </>
                        )}

                        {isManager && ord.status === OrderStatus.APPROVED && (
                          <button
                            onClick={() =>
                              transitionMutation.mutate({
                                orderId: ord.id,
                                action: 'QUEUE_PRODUCTION',
                                targetState: OrderStatus.PRODUCTION_PENDING,
                              })
                            }
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
                          >
                            <ArrowRightCircle className="w-3 h-3" />
                            <span>ارسال به صف تولید</span>
                          </button>
                        )}

                        {ord.status === OrderStatus.CONFIRMED && (
                          <span className="text-emerald-700 text-[11px] font-bold">مختومه شده ✅</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Order Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-brand-600" />
              <span>ثبت سفارش دان جدید برای مرغداری</span>
            </h2>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
              {isManager && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">انتخاب مرغدار</label>
                  <select
                    value={farmerId}
                    onChange={(e) => setFarmerId(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">-- انتخاب مرغدار --</option>
                    {farmers?.map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.full_name} ({f.business_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">انتخاب سهمیه دان و گله فعال</label>
                <select
                  value={quotaId}
                  onChange={(e) => {
                    setQuotaId(e.target.value);
                    const q = quotas?.find((item: any) => item.id === e.target.value);
                    if (q) setFlockId(q.flock_id);
                  }}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">-- انتخاب سهمیه --</option>
                  {quotas?.map((q: any) => (
                    <option key={q.id} value={q.id}>
                      {q.farmerName} - دوره {q.flockCode} (مانده سهمیه: {formatPersianNumber(Number(q.remainingQuantityKg))} کیلوگرم)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">انتخاب نوع خوراک پلت</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">-- نوع خوراک --</option>
                  {products?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">مقدار درخواستی (کیلوگرم)</label>
                  <input
                    type="number"
                    value={requestedKg}
                    onChange={(e) => setRequestedKg(Number(e.target.value))}
                    required
                    min={100}
                    step={100}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تاریخ تحویل مورد نیاز</label>
                  <input
                    type="date"
                    value={deliveryDateNeeded}
                    onChange={(e) => setDeliveryDateNeeded(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">آدرس دقیق محل تخلیه مرغداری</label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  required
                  placeholder="مثال: قزوین، بوئین زهرا، کیلومتر ۵..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 py-2 rounded-xl shadow"
                >
                  ثبت سفارش در سامانه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
