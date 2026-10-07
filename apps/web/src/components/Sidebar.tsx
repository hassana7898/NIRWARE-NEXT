import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Feather,
  PieChart,
  Package,
  Layers,
  ShoppingCart,
  Factory,
  Warehouse,
  ArrowDownLeft,
  Truck,
  BarChart3,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { isManager, isFarmer, isDriver } = useAuth();

  const navItems = [
    { to: '/', label: 'داشبورد مدیریتی', icon: LayoutDashboard, show: true },
    { to: '/orders', label: 'سفارش‌های دان', icon: ShoppingCart, show: true },
    { to: '/logistics', label: 'لجستیک و بارنامه‌ها', icon: Truck, show: true },
    { to: '/farmers', label: 'مرغداران و مزارع', icon: Users, show: isManager || isFarmer },
    { to: '/flocks', label: 'گله‌ها و سالن‌ها', icon: Feather, show: isManager || isFarmer },
    { to: '/quotas', label: 'سهمیه دان طیور', icon: PieChart, show: isManager || isFarmer },
    { to: '/production', label: 'خط تولید و پلت', icon: Factory, show: isManager },
    { to: '/inventory', label: 'دفتر کل انبار', icon: Warehouse, show: isManager },
    { to: '/products', label: 'کاتالوگ محصولات', icon: Package, show: true },
    { to: '/formulas', label: 'فرمولاسیون (BOM)', icon: Layers, show: isManager },
    { to: '/inbound', label: 'حواله ورود نهاده', icon: ArrowDownLeft, show: isManager },
    { to: '/reports', label: 'گزارش‌ها و ضریب تبدیل', icon: BarChart3, show: isManager || isFarmer },
    { to: '/ai', label: 'دستیار هوشمند و OCR', icon: Sparkles, show: true },
    { to: '/audit', label: 'لاگ امنیتی و تراکنش‌ها', icon: ShieldAlert, show: isManager },
  ];

  return (
    <aside className="no-print w-64 bg-white border-l border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          بخش‌های سیستم
        </div>
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 shadow-sm border border-brand-200/60 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
      </div>

      <div className="pt-4 border-t border-slate-100 px-3 text-[11px] text-slate-400">
        <div>نسخه ۱.۰.۰ گرین‌فیلد</div>
        <div>معماری مدولار مایکرولیتث + پستگرس</div>
      </div>
    </aside>
  );
};
