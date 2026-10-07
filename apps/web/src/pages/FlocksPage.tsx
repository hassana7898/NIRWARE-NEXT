import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { toPersianDigits, formatPersianNumber, formatToJalali } from '@nirware/shared';
import { Bird, Plus, Activity, Calendar, Scale, AlertTriangle, FileText } from 'lucide-react';

export const FlocksPage: React.FC = () => {
  const { isManager, isFarmer, user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedFlock, setSelectedFlock] = useState<any | null>(null);

  // New Flock Form
  const [flockCode, setFlockCode] = useState('');
  const [farmerId, setFarmerId] = useState('');
  const [breed, setBreed] = useState('راس ۳۰۸ (Ross 308)');
  const [initialChicks, setInitialChicks] = useState(25000);
  const [hatchDate, setHatchDate] = useState(new Date().toISOString().slice(0, 10));

  // Daily Record Form
  const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 10));
  const [mortalityCount, setMortalityCount] = useState(12);
  const [feedConsumedKg, setFeedConsumedKg] = useState(1250);
  const [averageWeightGrams, setAverageWeightGrams] = useState(850);
  const [waterConsumedLiters, setWaterConsumedLiters] = useState(2500);
  const [dailyNotes, setDailyNotes] = useState('');

  // Queries
  const { data: flocks = [], isLoading } = useQuery<any[]>({
    queryKey: ['flocks'],
    queryFn: () => api.get<any[]>('/flocks'),
  });

  const { data: farmers = [] } = useQuery<any[]>({
    queryKey: ['farmers'],
    queryFn: () => api.get<any[]>('/farmers'),
    enabled: isManager,
  });

  // Create Flock Mutation
  const createFlockMutation = useMutation({
    mutationFn: (data: any) => api.post('/flocks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flocks'] });
      setShowAddModal(false);
    },
  });

  // Add Daily Record Mutation
  const addRecordMutation = useMutation({
    mutationFn: (data: any) => api.post(`/flocks/${selectedFlock.id}/records`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flocks'] });
      setShowRecordModal(false);
      setSelectedFlock(null);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">مدیریت دوره‌های پرورشی (گله‌ها)</h1>
          <p className="text-sm text-slate-500 mt-1">
            پایش سن گله، تلفات، مصرف دان روزانه، ضریب تبدیل (FCR) و ثبت روزشمار سالن
          </p>
        </div>
        {(isManager || isFarmer) && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-sm transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>ثبت گله جدید</span>
          </button>
        )}
      </div>

      {/* Grid of Flocks */}
      {isLoading ? (
        <div className="bg-white p-12 text-center text-slate-500 rounded-2xl border border-slate-200">
          در حال بارگذاری اطلاعات گله‌ها...
        </div>
      ) : flocks.length === 0 ? (
        <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-200">
          <Bird className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>هیچ گله فعالی ثبت نشده است.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flocks.map((flock) => {
            const ageDays = Math.max(
              1,
              Math.floor((Date.now() - new Date(flock.startDate || flock.createdAt).getTime()) / 86400000)
            );
            const liveBirds = (flock.chickCount || 0) - (flock.mortality || 0);
            const fcr =
              flock.finalWeight && flock.finalWeight > 0 && flock.feedConsumed
                ? (flock.feedConsumed / flock.finalWeight).toFixed(2)
                : null;

            return (
              <div
                key={flock.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b pb-3">
                    <div>
                      <div className="text-xs font-bold text-emerald-600 uppercase">
                        کد دوره: {flock.code || flock.id.slice(0, 8)}
                      </div>
                      <h3 className="text-lg font-black text-slate-800 mt-0.5">
                        {flock.breed || 'جوجه گوشتی تجاری'}
                      </h3>
                      <div className="text-xs text-slate-500 mt-1">
                        مرغدار: <span className="font-semibold text-slate-700">{flock.farmerName || 'نامشخص'}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      روز {toPersianDigits(ageDays)}
                    </span>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3 my-4">
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <div className="text-xs text-slate-500">جوجه‌ریزی اولیه</div>
                      <div className="text-base font-bold text-slate-800 mt-0.5">
                        {formatPersianNumber(flock.chickCount || 0)} <span className="text-xs font-normal">قطعه</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <div className="text-xs text-slate-500">پرندگان زنده</div>
                      <div className="text-base font-bold text-slate-800 mt-0.5">
                        {formatPersianNumber(liveBirds)} <span className="text-xs font-normal">قطعه</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <div className="text-xs text-slate-500">کل دان مصرفی</div>
                      <div className="text-base font-bold text-slate-800 mt-0.5">
                        {formatPersianNumber(flock.feedConsumed || 0)} <span className="text-xs font-normal">کیلو</span>
                      </div>
                    </div>
                    <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                      <div className="text-xs text-emerald-700 font-medium">ضریب تبدیل (FCR)</div>
                      <div className="text-base font-black text-emerald-800 mt-0.5">
                        {fcr ? toPersianDigits(fcr) : <span className="text-xs font-normal text-slate-400">ثبت نشده</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedFlock(flock);
                      setShowRecordModal(true);
                    }}
                    className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    ثبت آمار روزانه
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add Flock */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Bird className="w-5 h-5 text-emerald-600" />
                افتتاح دوره جوجه‌ریزی جدید
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createFlockMutation.mutate({
                  flockCode,
                  farmerId: isManager ? farmerId : user?.id,
                  breed,
                  chickCount: initialChicks,
                  startDate: hatchDate,
                  status: 'ACTIVE',
                });
              }}
              className="space-y-4"
            >
              {isManager && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">انتخاب مرغدار</label>
                  <select
                    value={farmerId}
                    onChange={(e) => setFarmerId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                  >
                    <option value="">-- انتخاب کنید --</option>
                    {farmers.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.fullName} - {f.phone}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">کد رهگیری / شناسه دوره</label>
                <input
                  type="text"
                  required
                  value={flockCode}
                  onChange={(e) => setFlockCode(e.target.value)}
                  placeholder="مثال: FLOCK-1403-01"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">نژاد جوجه</label>
                  <input
                    type="text"
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">تعداد جوجه‌ریزی</label>
                  <input
                    type="number"
                    value={initialChicks}
                    onChange={(e) => setInitialChicks(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">تاریخ جوجه‌ریزی</label>
                <input
                  type="date"
                  value={hatchDate}
                  onChange={(e) => setHatchDate(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-mono"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="submit"
                  disabled={createFlockMutation.isPending}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition"
                >
                  {createFlockMutation.isPending ? 'در حال افتتاح...' : 'تأیید و افتتاح دوره'}
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

      {/* Modal Add Daily Record */}
      {showRecordModal && selectedFlock && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  ثبت آمار روزانه سالن
                </h2>
                <div className="text-xs text-slate-500 mt-0.5">دوره: {selectedFlock.code || selectedFlock.id.slice(0, 8)}</div>
              </div>
              <button onClick={() => setShowRecordModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addRecordMutation.mutate({
                  date: recordDate,
                  mortality: mortalityCount,
                  feedConsumed: feedConsumedKg,
                  averageWeight: averageWeightGrams,
                  notes: dailyNotes,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">تاریخ ثبت</label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">تلفات امروز (قطعه)</label>
                  <input
                    type="number"
                    value={mortalityCount}
                    onChange={(e) => setMortalityCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">دان مصرفی (کیلوگرم)</label>
                  <input
                    type="number"
                    value={feedConsumedKg}
                    onChange={(e) => setFeedConsumedKg(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">میانگین وزن (گرم)</label>
                  <input
                    type="number"
                    value={averageWeightGrams}
                    onChange={(e) => setAverageWeightGrams(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">آب مصرفی (لیتر)</label>
                  <input
                    type="number"
                    value={waterConsumedLiters}
                    onChange={(e) => setWaterConsumedLiters(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">یادداشت و مشاهدات فارم</label>
                <textarea
                  rows={2}
                  value={dailyNotes}
                  onChange={(e) => setDailyNotes(e.target.value)}
                  placeholder="وضعیت تهویه، رطوبت بستر، رفتار گله..."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="submit"
                  disabled={addRecordMutation.isPending}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition"
                >
                  {addRecordMutation.isPending ? 'در حال ذخیره...' : 'ثبت رکورد روزانه'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
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
