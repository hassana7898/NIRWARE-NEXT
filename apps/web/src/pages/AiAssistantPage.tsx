import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { formatPersianNumber, toPersianDigits } from '@nirware/shared';
import { Sparkles, Send, ScanText, Bot, User, CheckCircle2, AlertCircle, FileText, CornerDownLeft } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  toolResult?: any;
  timestamp: string;
}

export const AiAssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'سلام! من دستیار هوشمند نیروار (Nirware AI) هستم. می‌توانید سوالات آماری کارخانه، استعلام موجودی انبار، تحلیل سلامت گله یا OCR قبض باسکول را از من بخواهید.',
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isOcrMode, setIsOcrMode] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [ocrResult, setOcrResult] = useState<any | null>(null);

  // Ask AI Mutation
  const askMutation = useMutation({
    mutationFn: (question: string) => api.post<any>('/ai/query', { query: question }),
    onSuccess: (data) => {
      const assistantMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: 'assistant',
        text: data.answer || 'پاسخ پردازش شد.',
        toolResult: data.data,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    },
    onError: () => {
      const assistantMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: 'assistant',
        text: 'متاسفانه در پردازش این دستور خطایی رخ داد. لطفا دوباره تلاش کنید.',
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    },
  });

  // OCR Bill Mutation
  const ocrMutation = useMutation({
    mutationFn: (text: string) => api.post<any>('/ai/ocr-bill', { rawText: text }),
    onSuccess: (data) => {
      setOcrResult(data.parsedBill);
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    askMutation.mutate(inputText);
    setInputText('');
  };

  const sampleQuestions = [
    'موجودی ذرت و سویای انبار چقدر است؟',
    'وضعیت سفارشات در انتظار تحویل چیست؟',
    'کدام مرغداران بیش از ۸۰ درصد سهمیه مصرف کرده‌اند؟',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-600" />
            دستیار هوشمند و تحلیل داده (AI Engine)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            پرسش و پاسخ به زبان فارسی با دیتابیس کارخانه و استخراج خودکار فاکتور و قبض باسکول (OCR)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOcrMode(!isOcrMode)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              isOcrMode ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ScanText className="w-4 h-4" />
            <span>اسکن و OCR قبض باسکول</span>
          </button>
        </div>
      </div>

      {/* Main View: OCR vs Chat */}
      {isOcrMode ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ScanText className="w-5 h-5 text-emerald-600" />
              استخراج هوشمند فیش بارنامه و قبض باسکول (Vision OCR)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              متن خام دریافتی از اسکنر یا دوربین را وارد کنید تا هوش مصنوعی فیلدهای کلیدی را استخراج و برای ثبت حواله آماده کند.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600">متن نمونه فیش اسکن شده:</label>
              <textarea
                rows={8}
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                placeholder="باسکول ۶۰ تنی خلیج فارس
شماره بارنامه: ۹۸۴۳۲۱
فروشنده: شرکت پشتیبانی امور دام
کالا: کنجاله سویای پلت آرژانتین
وزن مبدا: ۲۴۵۰۰ کیلوگرم
وزن ناخالص: ۳۸۲۰۰ کیلو
وزن خالص باسکول: ۲۴۲۰۰ کیلوگرم
راننده: رضا احمدی ۰۹۱۲۳۴۵۶۷۸۹"
                className="w-full p-4 border border-slate-200 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-mono leading-relaxed"
              />
              <button
                onClick={() => ocrMutation.mutate(ocrText)}
                disabled={ocrMutation.isPending || !ocrText.trim()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {ocrMutation.isPending ? 'در حال استخراج فیلدها...' : 'تحلیل و استخراج اطلاعات'}
              </button>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
              <h3 className="text-xs font-bold text-slate-700">نتیجه استخراج ساختاریافته:</h3>
              {ocrResult ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">شماره بارنامه:</span>
                    <span className="font-mono font-bold text-slate-800">{ocrResult.billNumber || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">نام فروشنده:</span>
                    <span className="font-bold text-slate-800">{ocrResult.seller || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">کالای شناسایی شده:</span>
                    <span className="font-bold text-emerald-700">{ocrResult.productName || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">وزن بارنامه:</span>
                    <span className="font-mono font-bold text-slate-800">{formatPersianNumber(ocrResult.invoiceWeightKg || 0)} کیلو</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">وزن خالص باسکول:</span>
                    <span className="font-mono font-bold text-emerald-800">{formatPersianNumber(ocrResult.factoryScaleWeightKg || 0)} کیلو</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">راننده و تماس:</span>
                    <span className="font-bold text-slate-800">{ocrResult.driverName} ({ocrResult.driverPhone})</span>
                  </div>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-100/70 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      آماده انتقال به فرم حواله ورودی
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  هنوز فیشی تحلیل نشده است. متن یا نمونه بالا را تحلیل کنید.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Chat View */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm flex flex-col h-[650px] overflow-hidden">
          {/* Quick prompts */}
          <div className="p-3 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-slate-400 font-medium shrink-0">پیشنهادات:</span>
            {sampleQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputText(q);
                }}
                className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-full border border-slate-200 shrink-0 transition"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages scroll */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 max-w-2xl ${m.sender === 'user' ? 'mr-auto flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    m.sender === 'user' ? 'bg-slate-800 text-white' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-slate-800 text-white rounded-tr-none'
                      : 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>
                  {m.toolResult && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 text-[11px] font-mono overflow-x-auto text-slate-700">
                      <pre>{JSON.stringify(m.toolResult, null, 2)}</pre>
                    </div>
                  )}
                  <div className={`text-[10px] mt-1.5 opacity-60 ${m.sender === 'user' ? 'text-left' : 'text-right'}`}>
                    {m.timestamp}
                  </div>
                </div>
              </div>
            ))}
            {askMutation.isPending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl text-xs text-slate-500 border border-slate-200">
                  در حال استخراج داده از دفترکل و پردازش پاسخ هوشمند...
                </div>
              </div>
            )}
          </div>

          {/* Input form */}
          <form onSubmit={handleSend} className="p-4 border-t border-slate-100 flex items-center gap-3 bg-white">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="سوال خود را درباره آمار مزارع، انبار یا گله‌ها به زبان فارسی بپرسید..."
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || askMutation.isPending}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>ارسال</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
