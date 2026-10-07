import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Lock, User, AlertCircle, ArrowLeft } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState(import.meta.env.DEV ? 'manager' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'password123' : '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res: any = await api.post('/auth/login', { username, password });
      login(res.token, res.user);
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'خطا در ورود به سامانه');
    } finally {
      setLoading(false);
    }
  };

  const setDemoUser = (u: string, p = 'password123') => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-brand-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-600 text-white font-black text-3xl mx-auto flex items-center justify-center shadow-lg shadow-brand-500/30 mb-4">
            N
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">نیرور نِکست | NIRWARE</h1>
          <p className="text-xs text-slate-500 mt-1">سامانه جامع مدیریت کارخانه خوراک طیور و زنجیره مرغداران</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">نام کاربری</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                placeholder="مثال: manager"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">کلمه عبور</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                placeholder="••••••••"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{loading ? 'در حال ورود...' : 'ورود به سامانه'}</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fast Login Selector (Dev Only) */}
        {import.meta.env.DEV && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
              ورود سریع محیط توسعه (حساب‌های نمونه)
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoUser('manager')}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition text-center"
              >
                مدیر کارخانه (Manager)
              </button>
              <button
                type="button"
                onClick={() => setDemoUser('farmer1')}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition text-center"
              >
                مرغدار (Farmer)
              </button>
              <button
                type="button"
                onClick={() => setDemoUser('driver1')}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition text-center"
              >
                راننده ناوگان (Driver)
              </button>
              <button
                type="button"
                onClick={() => setDemoUser('prod_op')}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition text-center"
              >
                مسئول تولید (Operator)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
