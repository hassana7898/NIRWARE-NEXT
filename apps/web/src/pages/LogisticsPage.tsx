import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatPersianNumber, toPersianDigits, formatToJalali } from '@nirware/shared';
import { DeliveryStatusBadge } from '../components/Badge';
import { DeliveryStatus } from '@nirware/config';
import { PrintVoucherModal } from '../components/PrintVoucherModal';
import {
  Truck,
  Printer,
  KeyRound,
  CheckCircle,
  Plus,
  Play,
  MapPin,
  FileCheck2,
  AlertCircle,
} from 'lucide-react';

export const LogisticsPage: React.FC = () => {
  const { isManager, isDriver } = useAuth();
  const queryClient = useQueryClient();

  // Modals state
  const [selectedPrintDelivery, setSelectedPrintDelivery] = useState<any | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(null);

  // Form states
  const [feedOrderId, setFeedOrderId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [scaleWeightKg, setScaleWeightKg] = useState(10000);

  // Confirm Form
  const [otpCode, setOtpCode] = useState('');
  const [signatureData, setSignatureData] = useState('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xMCAxMCBDIDIwIDIwLCA0MCAyMCwgNTAgMTAiIHN0cm9rZT0iYmxhY2siIGZpbGw9Im5vbmUiLz48L3N2Zz4=');
  const [confirmNotes, setConfirmNotes] = useState('');
  const [lastGeneratedOtp, setLastGeneratedOtp] = useState<string | null>(null);

  // Queries
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => api.get<any[]>('/logistics/deliveries'),
  });

  const { data: drivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => api.get<any[]>('/logistics/drivers'),
    enabled: isAssignModalOpen,
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<any[]>('/logistics/vehicles'),
    enabled: isAssignModalOpen,
  });

  const { data: readyOrders } = useQuery({
    queryKey: ['orders-for-dispatch'],
    queryFn: () => api.get<any[]>('/orders', { status: 'APPROVED' }),
    enabled: isAssignModalOpen,
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ deliveryId, status }: { deliveryId: string; status: DeliveryStatus }) =>
      api.post(`/logistics/deliveries/${deliveryId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: any) => alert(err?.message || 'خطا در تغییر وضعیت بارنامه'),
  });

  const handleGenerateOtp = async (delId: string) => {
    try {
      const res: any = await api.post(`/logistics/deliveries/${delId}/otp`);
      if (res?.devOtpPreview) {
        setLastGeneratedOtp(res.devOtpPreview);
        alert(`کد تایید OTP با موفقیت صادر شد.\n[محیط توسعه - کد تست: ${res.devOtpPreview}]`);
      } else {
        alert('کد تایید OTP با موفقیت برای شماره موبایل مرغدار ارسال شد.');
      }
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    } catch (err: any) {
      alert(err?.message || 'خطا در صدور کد OTP');
    }
  };

  const handleConfirmReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeliveryId) return;

    try {
      await api.post(`/logistics/deliveries/${activeDeliveryId}/confirm`, {
        otpCode,
        signatureData,
        notes: confirmNotes,
      });
      alert('تحویل محموله با موفقیت تایید و بارنامه مختومه شد');
      setIsConfirmModalOpen(false);
      setOtpCode('');
      setActiveDeliveryId(null);
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err: any) {
      alert(err?.message || 'خطا در تایید تحویل');
    }
  };

  const handleAssignDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/logistics/assign', {
        feedOrderId,
        driverId,
        vehicleId,
        originScaleWeightKg: scaleWeightKg,
      });
      setIsAssignModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err: any) {
      alert(err?.message || 'خطا در تخصیص راننده');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-brand-600" />
            <span>مدیریت حمل‌ونقل، ناوگان و بارنامه‌های خروج دان</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ثبت خروج از باسکول کارخانه، ردیابی ترانزیت، تایید دیجیتال تحویل با کد OTP و امضای رسمی
          </p>
        </div>

        {isManager && (
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>صدور بارنامه و تخصیص راننده</span>
          </button>
        )}
      </div>

      {/* Deliveries Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs">در حال بارگذاری لیست بارنامه‌ها...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                <tr>
                  <th className="p-3">شماره بارنامه</th>
                  <th className="p-3">شماره سفارش</th>
                  <th className="p-3">مرغدار و مقصد</th>
                  <th className="p-3">نوع خوراک</th>
                  <th className="p-3 text-center">وزن باسکول مبدا</th>
                  <th className="p-3">راننده و پلاک</th>
                  <th className="p-3 text-center">وضعیت</th>
                  <th className="p-3 text-center">عملیات حمل و تحویل</th>
                  <th className="p-3 text-center">چاپ رسمی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries?.map((del: any) => (
                  <tr key={del.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-bold text-slate-900">{toPersianDigits(del.delivery_number)}</td>
                    <td className="p-3 font-semibold text-slate-700">{toPersianDigits(del.orderNumber)}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{del.farmerName}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{del.deliveryAddress}</div>
                    </td>
                    <td className="p-3 text-slate-700">{del.productName}</td>
                    <td className="p-3 text-center font-bold text-slate-900">
                      {formatPersianNumber(Number(del.origin_scale_weight_kg))} کیلوگرم
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-800">{del.driverName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{toPersianDigits(del.plateNumber)}</div>
                    </td>
                    <td className="p-3 text-center">
                      <DeliveryStatusBadge status={del.status} />
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Step 1: Pick Up from factory */}
                        {del.status === DeliveryStatus.ASSIGNED && (
                          <button
                            onClick={() =>
                              updateStatusMutation.mutate({
                                deliveryId: del.id,
                                status: DeliveryStatus.PICKED_UP,
                              })
                            }
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold transition"
                          >
                            تایید بارگیری و خروج
                          </button>
                        )}

                        {/* Step 2: Start transit */}
                        {del.status === DeliveryStatus.PICKED_UP && (
                          <button
                            onClick={() =>
                              updateStatusMutation.mutate({
                                deliveryId: del.id,
                                status: DeliveryStatus.IN_TRANSIT,
                              })
                            }
                            className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" />
                            <span>شروع ترانزیت</span>
                          </button>
                        )}

                        {/* Step 3: Arrived at farm */}
                        {del.status === DeliveryStatus.IN_TRANSIT && (
                          <button
                            onClick={() =>
                              updateStatusMutation.mutate({
                                deliveryId: del.id,
                                status: DeliveryStatus.DELIVERED,
                              })
                            }
                            className="bg-cyan-600 hover:bg-cyan-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>رسیدن به مقصد</span>
                          </button>
                        )}

                        {/* Step 4: OTP & Confirm Receipt */}
                        {del.status === DeliveryStatus.DELIVERED && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleGenerateOtp(del.id)}
                              className="bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 px-2 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
                              title="صدور کد OTP"
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>کد OTP</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveDeliveryId(del.id);
                                setIsConfirmModalOpen(true);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 shadow-sm"
                            >
                              <FileCheck2 className="w-3 h-3" />
                              <span>تایید تحویل</span>
                            </button>
                          </div>
                        )}

                        {del.status === DeliveryStatus.CONFIRMED && (
                          <div className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>تحویل شد</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedPrintDelivery(del)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                        title="چاپ رسمی بارنامه و حواله"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Driver Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Truck className="w-4 h-4 text-brand-600" />
              <span>صدور بارنامه و اختصاص خودرو به سفارش آماده</span>
            </h2>

            <form onSubmit={handleAssignDriver} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">انتخاب سفارش تایید شده</label>
                <select
                  value={feedOrderId}
                  onChange={(e) => {
                    setFeedOrderId(e.target.value);
                    const ord = readyOrders?.find((o: any) => o.id === e.target.value);
                    if (ord) setScaleWeightKg(Number(ord.approved_quantity_kg || ord.requested_quantity_kg));
                  }}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">-- انتخاب سفارش --</option>
                  {readyOrders?.map((ord: any) => (
                    <option key={ord.id} value={ord.id}>
                      سفارش {ord.order_number} ({ord.farmerName} - {ord.productName} - {formatPersianNumber(Number(ord.requested_quantity_kg))} کیلوگرم)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">انتخاب راننده ناوگان</label>
                <select
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">-- انتخاب راننده --</option>
                  {drivers?.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} ({d.mobile})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">انتخاب خودرو / کامیون</label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">-- انتخاب خودرو --</option>
                  {vehicles?.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.plate_number} - {v.vehicle_type} (ظرفیت: {formatPersianNumber(Number(v.max_capacity_kg))} KG)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">وزن باسکول مبدا کارخانه (کیلوگرم)</label>
                <input
                  type="number"
                  value={scaleWeightKg}
                  onChange={(e) => setScaleWeightKg(Number(e.target.value))}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 py-2 rounded-xl shadow"
                >
                  صدور بارنامه رسمی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delivery Receipt Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <span>تایید دریافت بار و ثبت امضای دیجیتال</span>
            </h2>

            <form onSubmit={handleConfirmReceipt} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">کد تایید ۶ رقمی پیامک شده به مرغدار (OTP)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="مثال: 582194"
                  className="w-full p-3 rounded-xl border border-slate-300 font-mono text-center tracking-widest text-lg font-bold focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  کد تایید یکبار مصرف با اعتبار ۱۰ دقیقه
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">امضای دیجیتال تحویل‌گیرنده</label>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-center text-slate-400">
                  <div className="h-16 flex items-center justify-center text-slate-400 italic">
                    [امضای دیجیتال کاربر ثبت گردید]
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ملاحظات و وضعیت ظاهری بار</label>
                <input
                  type="text"
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  placeholder="بار سالم تخلیه گردید..."
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl shadow"
                >
                  تایید نهایی و مختومه کردن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Printable Voucher Modal */}
      {selectedPrintDelivery && (
        <PrintVoucherModal
          isOpen={!!selectedPrintDelivery}
          onClose={() => setSelectedPrintDelivery(null)}
          title="حواله رسمی خروج خوراک پلت و بارنامه ناوگان"
          documentNumber={selectedPrintDelivery.delivery_number}
          date={selectedPrintDelivery.created_at}
          customerName={selectedPrintDelivery.farmerName}
          customerNationalId="0054231890"
          farmLocation={selectedPrintDelivery.deliveryAddress}
          productName={selectedPrintDelivery.productName}
          weightKg={Number(selectedPrintDelivery.origin_scale_weight_kg)}
          driverName={selectedPrintDelivery.driverName}
          driverMobile={selectedPrintDelivery.driverMobile}
          vehiclePlate={selectedPrintDelivery.plateNumber}
          notes={selectedPrintDelivery.notes}
        />
      )}
    </div>
  );
};
