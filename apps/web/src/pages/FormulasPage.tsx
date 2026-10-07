import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatPersianNumber, toPersianDigits } from '@nirware/shared';
import { Layers, Plus, CheckCircle2, FlaskConical, Scale, Trash2 } from 'lucide-react';

export const FormulasPage: React.FC = () => {
  const { isManager } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFormula, setSelectedFormula] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Queries
  const { data: formulas = [], isLoading } = useQuery<any[]>({
    queryKey: ['formulas'],
    queryFn: () => api.get<any[]>('/products/all/formulas'),
  });

  const { data: rawMaterials = [] } = useQuery<any[]>({
    queryKey: ['raw-materials'],
    queryFn: () => api.get<any[]>('/products', { type: 'RAW_MATERIAL' }),
  });

  const { data: finishedProducts = [] } = useQuery<any[]>({
    queryKey: ['finished-products'],
    queryFn: () => api.get<any[]>('/products', { type: 'FINISHED_FEED' }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">فرمولاسیون و آنالیز خوراک (BOM)</h1>
          <p className="text-sm text-slate-500 mt-1">
            تعریف ساختار استاندارد ۱۰۰۰ کیلوگرم، درصد اجزای تشکیل‌دهنده و نیازمندی مواد اولیه
          </p>
        </div>
      </div>

      {/* Grid of Formulas */}
      {isLoading ? (
        <div className="bg-white p-12 text-center text-slate-500 rounded-2xl border border-slate-200">
          در حال بارگذاری فرمول‌ها...
        </div>
      ) : formulas.length === 0 ? (
        <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-200">
          <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>هیچ فرمول فعالی ثبت نشده است.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {formulas.map((formula) => {
            const totalBatch = formula.batchSizeKg || 1000;
            const items = formula.items || [];
            const sumKg = items.reduce((acc: number, curr: any) => acc + Number(curr.quantityKg || 0), 0);

            return (
              <div
                key={formula.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between border-b pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-600 uppercase font-mono">
                        ورژن {toPersianDigits(formula.version || 1)}
                      </span>
                      {formula.isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          پیش‌فرض خط تولید
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-slate-800 mt-1">
                      {formula.productName || formula.name || 'فرمول خوراک'}
                    </h3>
                    <div className="text-xs text-slate-500 mt-0.5">
                      مبنای فرمولاسیون: <span className="font-bold text-slate-700">{formatPersianNumber(totalBatch)} کیلوگرم</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                    {formula.status === 'ACTIVE' ? 'فعال' : formula.status}
                  </span>
                </div>

                {/* Formula Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                      <tr>
                        <th className="py-2 px-3">ماده اولیه / جزء تشکیل‌دهنده</th>
                        <th className="py-2 px-3">مقدار در ۱۰۰۰ کگ</th>
                        <th className="py-2 px-3">درصد فرمول</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item: any, idx: number) => {
                        const pct = ((Number(item.quantityKg) / totalBatch) * 100).toFixed(1);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-medium text-slate-800">
                              {item.materialName || item.productName || 'ماده خام'}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-700">
                              {formatPersianNumber(item.quantityKg)} کیلوگرم
                            </td>
                            <td className="py-2 px-3 font-mono text-emerald-600 font-semibold">
                              {toPersianDigits(pct)}٪
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t bg-slate-50/80 font-bold">
                      <tr>
                        <td className="py-2 px-3 text-slate-700">مجموع وزن بچ:</td>
                        <td className="py-2 px-3 font-mono text-slate-900">
                          {formatPersianNumber(sumKg)} کیلوگرم
                        </td>
                        <td className="py-2 px-3 font-mono text-emerald-700">
                          {toPersianDigits(((sumKg / totalBatch) * 100).toFixed(0))}٪
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
