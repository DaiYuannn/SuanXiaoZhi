import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const tabs = [
  { to: '/', icon: 'fas fa-home', label: '首页' },
  { to: '/accounting', icon: 'fas fa-calculator', label: '记账' },
  { to: '/analysis', icon: 'fas fa-chart-pie', label: '分析' },
  { to: '/planning', icon: 'fas fa-bullseye', label: '规划' },
  { to: '/customer-service', icon: 'fas fa-comments', label: '客服' },
];

export const MobileTabBar: React.FC = () => {
  const { pathname } = useLocation();
  return (
    <nav className="md:hidden h-16 rounded-2xl border border-white/60 bg-white/92 shadow-[0_12px_35px_rgba(20,45,80,0.22)] backdrop-blur-xl z-50">
      <ul className="grid grid-cols-5 h-full px-1">
        {tabs.map(t => {
          const active = pathname === t.to;
          return (
            <li key={t.to} className="flex items-center justify-center">
              <Link
                to={t.to}
                className={`flex h-full w-full flex-col items-center justify-center rounded-xl transition-all ${
                  active
                    ? 'bg-[#e8f8ef] text-[#16784d] shadow-[inset_0_0_0_1px_rgba(22,120,77,0.08)]'
                    : 'text-text-secondary hover:bg-[#f4f8fb]'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <i className={`${t.icon} text-base ${active ? 'scale-110' : ''}`} aria-hidden="true"></i>
                <span className="mt-0.5 text-[11px]">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileTabBar;
