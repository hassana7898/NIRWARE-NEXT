import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRoleBadge } from './Badge';
import { LogOut, Wifi, WifiOff, RefreshCw, Sparkles } from 'lucide-react';
import { OfflineQueueManager } from '../pwa/offline-queue';
import { api } from '../api/client';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(OfflineQueueManager.getPendingCount());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);
    const handleQueueUpdate = () => setPendingCount(OfflineQueueManager.getPendingCount());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-updated', handleQueueUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-updated', handleQueueUpdate);
    };
  }, []);

  const triggerSync = async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      await OfflineQueueManager.processQueue((endpoint, opts) => {
        return api.post(endpoint, opts.body, opts.headers?.['Idempotency-Key']);
      });
    } finally {
      setIsSyncing(false);
      setPendingCount(OfflineQueueManager.getPendingCount());
    }
  };

  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-brand-500/20">
              N
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">نیرور نِکست</span>
                <span className="text-xs bg-brand-100 text-brand-800 font-semibold px-2 py-0.5 rounded-full">
                  NIRWARE NEXT
                </span>
              </div>
              <span className="text-xs text-slate-500 hidden sm:inline">
                سامانه هوشمند کارخانه خوراک و زنجیره مرغداران
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* AI Assistant Quick Button */}
            <Link
              to="/ai"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 shadow-sm transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>دستیار هوش مصنوعی</span>
            </Link>

            {/* Online / Offline / Sync status */}
            <div className="flex items-center gap-2">
              {isOnline ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">آنلاین</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>آفلاین</span>
                </div>
              )}

              {pendingCount > 0 && (
                <button
                  onClick={triggerSync}
                  disabled={isSyncing}
                  className="flex items-center gap-1 text-xs bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full hover:bg-amber-100 transition"
                  title="تراکنش‌های در صف همگام‌سازی"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{pendingCount} در صف</span>
                </button>
              )}
            </div>

            {/* User Info & Role */}
            {user && (
              <div className="flex items-center gap-3 pl-3 border-r border-slate-200">
                <div className="text-left hidden md:block">
                  <div className="text-xs font-semibold text-slate-800">{user.fullName}</div>
                  <UserRoleBadge role={user.role} />
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="خروج از سامانه"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
