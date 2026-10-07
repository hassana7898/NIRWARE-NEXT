import React from 'react';
import { formatToJalali, toPersianDigits, formatPersianNumber } from '@nirware/shared';
import { Printer, X } from 'lucide-react';

interface PrintVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  documentNumber: string;
  date: string;
  customerName: string;
  customerNationalId?: string;
  farmLocation: string;
  productName: string;
  weightKg: number;
  driverName: string;
  driverMobile: string;
  vehiclePlate: string;
  notes?: string;
}

export const PrintVoucherModal: React.FC<PrintVoucherModalProps> = ({
  isOpen,
  onClose,
  title,
  documentNumber,
  date,
  customerName,
  customerNationalId,
  farmLocation,
  productName,
  weightKg,
  driverName,
  driverMobile,
  vehiclePlate,
  notes,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Controls Bar */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-brand-400" />
            <span className="font-semibold text-sm">پیش‌نمایش چاپ رسمی حواله و بارنامه</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition shadow"
            >
              <Printer className="w-4 h-4" />
              <span>ارسال به چاپگر</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Official Printable Document */}
        <div className="p-8 overflow-y-auto bg-white text-slate-900 printable-area text-xs">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex justify-between items-center">
              <div className="w-32">
                <div className="w-16 h-16 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl">
                  NW
                </div>
              </div>
              <div className="text-center">
                <h1 className="text-lg font-black tracking-tight text-slate-950 mb-1">
                  کارخانجات تولید خوراک طیور نیرور (NIRWARE)
                </h1>
                <h2 className="text-sm font-bold text-slate-700">{title}</h2>
                <div className="text-[11px] text-slate-500 mt-1">
                  سهامی خاص - شماره ثبت: ۷۸۴۹۲ - دارای استاندارد ملی خوراک آماده دام و طیور
                </div>
              </div>
              <div className="w-40 text-left space-y-1 text-[11px]">
                <div>
                  <span className="text-slate-500">شماره سند: </span>
                  <span className="font-bold">{toPersianDigits(documentNumber)}</span>
                </div>
                <div>
                  <span className="text-slate-500">تاریخ صدور: </span>
                  <span className="font-bold">{formatToJalali(date)}</span>
                </div>
                <div>
                  <span className="text-slate-500">پیوست: </span>
                  <span>ندارد</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Customer & Destination Info */}
          <div className="border border-slate-300 rounded-lg p-4 mb-4 bg-slate-50/50">
            <div className="font-bold text-slate-900 mb-2 border-b border-slate-200 pb-1">
              مشخصات مرغدار و مقصد تخلیه بار
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-slate-500">نام مرغدار / واحد: </span>
                <span className="font-bold text-slate-800">{customerName}</span>
              </div>
              <div>
                <span className="text-slate-500">کد ملی / شناسه ملی: </span>
                <span className="font-semibold text-slate-800">
                  {toPersianDigits(customerNationalId || '—')}
                </span>
              </div>
              <div>
                <span className="text-slate-500">محل تخلیه و مرغداری: </span>
                <span className="font-semibold text-slate-800">{farmLocation}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Product & Scale Weight Table */}
          <div className="mb-4">
            <table className="w-full border-collapse border border-slate-300 text-right">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                  <th className="border border-slate-300 p-2 text-center w-12">ردیف</th>
                  <th className="border border-slate-300 p-2">شرح کالا / محصول</th>
                  <th className="border border-slate-300 p-2">نوع بسته‌بندی</th>
                  <th className="border border-slate-300 p-2 text-center">وزن خالص باسکول (کیلوگرم)</th>
                  <th className="border border-slate-300 p-2">ملاحظات کیفی</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-2 text-center font-bold">۱</td>
                  <td className="border border-slate-300 p-2 font-bold text-slate-900">{productName}</td>
                  <td className="border border-slate-300 p-2">فله بونکری استاندارد</td>
                  <td className="border border-slate-300 p-2 text-center font-black text-slate-900 text-sm">
                    {formatPersianNumber(weightKg)}
                  </td>
                  <td className="border border-slate-300 p-2 text-slate-600">
                    رطوبت مجاز زیر ۱۱٪، پلت با شاخص PDI بالای ۹۰٪
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t border-slate-300">
                  <td colSpan={3} className="border border-slate-300 p-2 text-left pl-4">
                    جمع کل وزن خالص خروجی:
                  </td>
                  <td className="border border-slate-300 p-2 text-center font-black text-sm text-slate-900">
                    {formatPersianNumber(weightKg)} کیلوگرم
                  </td>
                  <td className="border border-slate-300 p-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Section 3: Driver & Vehicle Info */}
          <div className="border border-slate-300 rounded-lg p-4 mb-6 bg-slate-50/50">
            <div className="font-bold text-slate-900 mb-2 border-b border-slate-200 pb-1">
              مشخصات راننده و خودروی حامل
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-slate-500">نام راننده: </span>
                <span className="font-bold text-slate-800">{driverName}</span>
              </div>
              <div>
                <span className="text-slate-500">تلفن همراه: </span>
                <span className="font-semibold text-slate-800">{toPersianDigits(driverMobile)}</span>
              </div>
              <div>
                <span className="text-slate-500">شماره پلاک کامیون: </span>
                <span className="font-bold text-slate-800">{toPersianDigits(vehiclePlate)}</span>
              </div>
            </div>
            {notes && (
              <div className="mt-2 text-slate-600 border-t border-slate-200 pt-1">
                <span className="text-slate-500">توضیحات تکمیلی: </span>
                <span>{notes}</span>
              </div>
            )}
          </div>

          {/* Section 4: Four Formal Signatures */}
          <div className="border border-slate-400 rounded-lg p-4 mt-6">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="border-l border-slate-200 pl-2">
                <div className="font-bold text-slate-800 mb-1">مسئول باسکول و بارگیری</div>
                <div className="text-[10px] text-slate-400 mb-8">نام و امضا</div>
                <div className="text-[11px] text-slate-600 font-semibold">بهرام کاظمی</div>
              </div>

              <div className="border-l border-slate-200 pl-2">
                <div className="font-bold text-slate-800 mb-1">مدیر بازرگانی و فروش</div>
                <div className="text-[10px] text-slate-400 mb-8">نام و امضا</div>
                <div className="text-[11px] text-slate-600 font-semibold">مهندس صمدی</div>
              </div>

              <div className="border-l border-slate-200 pl-2">
                <div className="font-bold text-slate-800 mb-1">راننده تحویل‌گیرنده بار</div>
                <div className="text-[10px] text-slate-400 mb-8">نام و امضا</div>
                <div className="text-[11px] text-slate-600 font-semibold">{driverName}</div>
              </div>

              <div>
                <div className="font-bold text-slate-800 mb-1">مرغدار / تحویل‌گیرنده در مقصد</div>
                <div className="text-[10px] text-slate-400 mb-8">مهر و امضای تایید دریافت (کد OTP)</div>
                <div className="text-[11px] text-slate-600 font-semibold">{customerName}</div>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="text-center text-[10px] text-slate-400 mt-6 border-t border-slate-200 pt-2">
            این سند توسط سامانه یکپارچه نرم‌افزاری نیرور نِکست تولید شده و نسخه چاپی معتبر حواله کارخانه محسوب می‌گردد.
          </div>
        </div>
      </div>
    </div>
  );
};
