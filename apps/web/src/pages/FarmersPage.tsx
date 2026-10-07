import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { toPersianDigits } from '@nirware/shared';
import { UserCheck, Plus, MapPin, Phone, Building2, CheckCircle2 } from 'lucide-react';

export interface FarmerItem {
  id: string;
  fullName: string;
  nationalId: string;
  phone: string;
  province?: string;
  city?: string;
  address?: string;
  status: string;
  createdAt: string;
}

export const FarmersPage: React.FC = () => {
  const { isManager } = useAuth();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');

  // Form state
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('گلستان');
  const [city, setCity] = useState('گرگان');
  const [address, setAddress] = useState('');

  const { data: farmers = [], isLoading, error } = useQuery<FarmerItem[]>({
    queryKey: ['farmers'],
    queryFn: () => api.get<FarmerItem[]>('/farmers'),
  });

  const createMutation = useMutation({
    mutationFn: (newFarmer: Partial<FarmerItem>) => api.post('/farmers', newFarmer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmers'] });
      setShowAddModal(false);
      setFullName('');
      setNationalId('');
      setPhone('');
      setAddress('');
    },
  });

  const filteredFarmers = (farmers || []).filter((f) =>
    (f.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.phone || '').includes(search) ||
    (f.nationalId || '').includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">مدیریت مرغداران و مزارع</h1>
          <p className="text-sm text-slate-500 mt-1">
            ثبت و پایش اطلاعات هویتی مرغداران، مزارع پرورشی و سالن‌های تولید
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-sm transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>افزودن مرغدار جدید</span>
          </button>
        )}
      </div>

      {/* Filter / Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="جستجو بر اساس نام، کدملی یا شماره تماس..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-96 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <div className="text-xs text-slate-500 font-medium">
          مجموع: {toPersianDigits(filteredFarmers.length)} مرغدار
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 font-medium">در حال دریافت اطلاعات...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 font-medium">خطا در دریافت لیست مرغداران</div>
        ) : filteredFarmers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>مرغداری با این مشخصات یافت نشد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-medium">
                <tr>
                  <th className="p-4">شناسه / نام کامل</th>
                  <th className="p-4">کد ملی</th>
                  <th className="p-4">شماره تماس</th>
                  <th className="p-4">استان / شهر</th>
                  <th className="p-4">آدرس واحد</th>
                  <th className="p-4">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFarmers.map((farmer) => (
                  <tr key={farmer.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{farmer.fullName}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{farmer.id.substring(0, 8)}</div>
                    </td>
                    <td className="p-4 font-mono text-slate-600">{toPersianDigits(farmer.nationalId)}</td>
                    <td className="p-4 font-mono text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {toPersianDigits(farmer.phone)}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {farmer.province} - {farmer.city}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 max-w-xs truncate">{farmer.address || 'ثبت نشده'}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        {farmer.status === 'ACTIVE' ? 'فعال' : farmer.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add Farmer */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                ثبت مرغدار جدید
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  fullName,
                  nationalId,
                  phone,
                  province,
                  city,
                  address,
                  status: 'ACTIVE',
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">نام و نام خانوادگی</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: علی حسینی"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">کد ملی</label>
                  <input
                    type="text"
                    required
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="0123456789"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">شماره همراه</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09110000000"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">استان</label>
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">شهر</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">آدرس مزرعه / اقامتگاه</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="کیلومتر ۵ جاده گرگان به آق‌قلا..."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50"
                >
                  {createMutation.isPending ? 'در حال ثبت...' : 'ثبت مرغدار'}
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
