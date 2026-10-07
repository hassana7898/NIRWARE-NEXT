import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatPersianNumber, toPersianDigits } from '@nirware/shared';
import { Package, Plus, Download, Upload, CheckCircle2, Layers, Search, FileSpreadsheet } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { isManager } = useAuth();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'RAW_MATERIAL' | 'FINISHED_FEED' | 'SUPPLEMENT'>('FINISHED_FEED');
  const [category, setCategory] = useState('پیش‌دان');
  const [unit, setUnit] = useState('KG');
  const [bagSizeKg, setBagSizeKg] = useState<number | undefined>(50);
  const [minStockLevel, setMinStockLevel] = useState(5000);
  const [unitPrice, setUnitPrice] = useState(24000);

  const { data: products = [], isLoading } = useQuery<any[]>({
    queryKey: ['products', filterType],
    queryFn: () => api.get<any[]>('/products', filterType ? { type: filterType } : undefined),
  });

  const createProductMutation = useMutation({
    mutationFn: (data: any) => api.post('/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowAddModal(false);
      setName('');
      setCode('');
    },
  });

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportExcel = async () => {
    try {
      const res = await api.get<{ downloadUrl: string; rowCount: number }>('/excel/products/export');
      alert(`خروجی اکسل با موفقیت تولید شد (${toPersianDigits(res.rowCount)} ردیف).`);
    } catch (e: any) {
      alert(`خطا در تولید اکسل: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">کاتالوگ اقلام و خوراک طیور</h1>
          <p className="text-sm text-slate-500 mt-1">
            تعریف انواع خوراک آماده، مواد اولیه، مکمل‌ها، قیمت‌گذاری و بسته‌بندی
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>خروجی اکسل</span>
          </button>
          {isManager && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-sm transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن محصول جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterType('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === '' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            همه اقلام
          </button>
          <button
            onClick={() => setFilterType('FINISHED_FEED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === 'FINISHED_FEED' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            خوراک آماده
          </button>
          <button
            onClick={() => setFilterType('RAW_MATERIAL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === 'RAW_MATERIAL' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            مواد اولیه کارخانه
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="جستجوی نام یا کد کالا..."
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
          <div className="p-8 text-center text-slate-500">در حال دریافت لیست اقلام...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>محصولی یافت نشد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-medium">
                <tr>
                  <th className="p-4">کد کالا</th>
                  <th className="p-4">نام کالا / فرآورده</th>
                  <th className="p-4">نوع</th>
                  <th className="p-4">دسته‌بندی</th>
                  <th className="p-4">بسته‌بندی</th>
                  <th className="p-4">قیمت واحد (تومان)</th>
                  <th className="p-4">حداقل موجودی هشدار</th>
                  <th className="p-4">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-4 font-mono font-bold text-slate-700">{p.code}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.brand || 'نیروار'}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        p.type === 'FINISHED_FEED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {p.type === 'FINISHED_FEED' ? 'خوراک آماده' : 'ماده اولیه'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">{p.category || '-'}</td>
                    <td className="p-4 text-slate-600">
                      {p.bagSizeKg ? `کیسه ${toPersianDigits(p.bagSizeKg)} کگ` : 'فله (Bulk)'}
                    </td>
                    <td className="p-4 font-mono font-semibold text-slate-800">
                      {p.unitPrice ? `${formatPersianNumber(p.unitPrice)}` : '-'}
                    </td>
                    <td className="p-4 font-mono text-slate-600">
                      {formatPersianNumber(p.minStockLevel || 0)} {p.unit === 'KG' ? 'کیلو' : p.unit}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                        فعال
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add Product */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                تعریف محصول جدید
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createProductMutation.mutate({
                  code,
                  name,
                  type,
                  category,
                  unit,
                  bagSizeKg: bagSizeKg || null,
                  minStockLevel,
                  unitPrice,
                  status: 'ACTIVE',
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">کد کالا</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="FEED-001"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">نوع کالا</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                  >
                    <option value="FINISHED_FEED">خوراک آماده (تولیدی)</option>
                    <option value="RAW_MATERIAL">ماده اولیه (خام)</option>
                    <option value="SUPPLEMENT">مکمل و کنسانتره</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">نام کامل فرآورده</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="پیش‌دان کرامبل ویژه گوشتی"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">دسته‌بندی</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">وزن کیسه (کیلوگرم)</label>
                  <input
                    type="number"
                    value={bagSizeKg || ''}
                    onChange={(e) => setBagSizeKg(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="مثال: ۵۰ (خالی=فله)"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">قیمت واحد (تومان)</label>
                  <input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">حداقل موجودی هشدار</label>
                  <input
                    type="number"
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="submit"
                  disabled={createProductMutation.isPending}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition"
                >
                  {createProductMutation.isPending ? 'در حال ایجاد...' : 'ثبت محصول'}
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
