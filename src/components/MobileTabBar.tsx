import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const tabs = [
  { to: '/home', icon: 'fas fa-home', label: '首页' },
  { to: '/accounting', icon: 'fas fa-calculator', label: '记账' },
  { to: '/consumption-analysis', icon: 'fas fa-chart-pie', label: '分析' },
  { to: '/financial-planning', icon: 'fas fa-bullseye', label: '规划' },
  { to: '/customer-service', icon: 'fas fa-comments', label: '客服' },
];

export const MobileTabBar: React.FC = () => {
  const { pathname } = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-border-light z-50">
      <ul className="grid grid-cols-5 h-full">
        {tabs.map(t => {
          const active = pathname === t.to;
          return (
            <li key={t.to} className="flex items-center justify-center">
              <Link to={t.to} className={`flex flex-col items-center justify-center w-full h-full ${active ? 'text-primary' : 'text-text-secondary'}`} aria-current={active ? 'page' : undefined}>
                <i className={`${t.icon} text-base`} aria-hidden="true"></i>
                <span className="text-[11px] mt-0.5">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileTabBar;
