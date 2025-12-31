import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import TopBarActions from './TopBarActions';
import MobileTabBar from './MobileTabBar';

const MainLayout: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname;

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  const sidebarItems = [
    { to: '/home', icon: 'fas fa-home', label: '首页' },
    { to: '/accounting', icon: 'fas fa-calculator', label: '智能记账' },
    { to: '/consumption-analysis', icon: 'fas fa-chart-bar', label: '消费分析' },
    { to: '/financial-planning', icon: 'fas fa-bullseye', label: '财务规划' },
    { to: '/financial-products', icon: 'fas fa-coins', label: '理财产品' },
    { to: '/customer-service', icon: 'fas fa-comments', label: '智能客服' },
    { to: '/family', icon: 'fas fa-users', label: '家庭中心' },
    { to: '/incentive-center', icon: 'fas fa-gift', label: '激励中心' },
    { to: '/user-settings', icon: 'fas fa-cog', label: '个人中心' },
  ];

  // 路由白名单：仅以下页面显示底部 Tab (移动端)
  const TAB_WHITELIST = new Set([
    '/home',
    '/accounting',
    '/consumption-analysis',
    '/financial-planning',
    '/financial-products',
    '/customer-service',
    '/family',
    '/incentive-center',
    '/user-settings'
  ]);
  const showMobileTab = TAB_WHITELIST.has(pathname);

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      {/* 顶部导航栏 */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-border-light z-50 h-14 md:h-16">
        <div className="flex items-center justify-between h-full px-4 md:px-6">
          {/* Logo和品牌 */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
              <i className="fas fa-chart-line text-white text-lg"></i>
            </div>
            <h1 className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">金智通</h1>
          </div>
          
          {/* 桌面端顶部导航 (可选，如果侧边栏已经够用，这里可以简化) */}
          <nav className="hidden md:flex items-center space-x-6">
             {/* 这里可以放一些快捷入口或者保持简洁 */}
          </nav>
          
          {/* 用户操作区 */}
          <TopBarActions />
        </div>
      </header>

      <div className="flex pt-14 md:pt-16 flex-1">
        {/* 桌面端侧边栏 */}
        <aside className="hidden md:block w-64 bg-white border-r border-border-light fixed bottom-0 top-16 overflow-y-auto">
          <nav className="p-4">
            <ul className="space-y-2">
              {sidebarItems.map(item => (
                <li key={item.to}>
                  <Link 
                    to={item.to} 
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                      isActive(item.to) 
                        ? 'bg-primary text-white shadow-md' 
                        : 'text-text-secondary hover:bg-gray-50 hover:text-primary'
                    }`}
                  >
                    <i className={`${item.icon} text-lg w-6 text-center`}></i>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 md:ml-64 w-full">
           <Outlet />
        </main>
      </div>

      {/* 移动端底部 Tab */}
      {showMobileTab && <MobileTabBar />}
    </div>
  );
};

export default MainLayout;
