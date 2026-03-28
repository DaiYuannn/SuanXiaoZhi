import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import MobileTabBar from "../MobileTabBar";
import { UserRole } from "../../types/permission.js";
import { AUTH_TOKEN_KEY } from "../../config/env.js";

const MobileLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { to: "/", label: "首页", icon: "fa-home" },
    { to: "/accounting", label: "记账", icon: "fa-calculator" },
    { to: "/analysis", label: "分析", icon: "fa-chart-pie" },
    { to: "/planning", label: "规划", icon: "fa-bullseye" },
    { to: "/customer-service", label: "客服", icon: "fa-comments" },
    { to: "/user-settings", label: "我的", icon: "fa-user" }
  ];

  // 若为管理员，不应进入此布局，应重定向至 B 端
  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const role = localStorage.getItem("sx-role") as UserRole;
    if (token && (role === UserRole.SUPER_ADMIN || role === UserRole.OPERATOR || role === UserRole.VIEWER)) {
      if (!location.pathname.startsWith("/admin")) {
        navigate("/admin", { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  // 判断是否需要显示底部 Tab
  const showTabPaths = ["/", "/home", "/accounting", "/analysis", "/planning", "/products", "/family", "/settings", "/user-settings", "/customer-service"];
  const isShowTab = showTabPaths.includes(location.pathname);

  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem("sx-role");
    localStorage.removeItem("sx-user-id");
    navigate("/login", { replace: true });
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#e6eef3]">
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-[#98f5cc]/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-[#79a8ff]/25 blur-3xl" />

      <div className="relative min-h-screen w-full">
        {/* 桌面端导航条（不再模拟手机壳，全屏展示） */}
        <header className="hidden md:flex sticky top-0 z-40 h-16 items-center justify-between border-b border-white/50 bg-white/85 px-8 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <i className="fas fa-chart-line text-primary" />
            <span className="font-semibold text-text-primary">算小智 C端</span>
          </div>
          <nav className="flex items-center gap-2">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    active ? "bg-primary text-white" : "text-text-secondary hover:bg-white/80"
                  }`}
                >
                  <i className={`fas ${item.icon} mr-1`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button onClick={handleLogout} className="rounded-lg border border-border-light px-3 py-1.5 text-sm text-text-secondary hover:bg-white">
            <i className="fas fa-sign-out-alt mr-1" />
            退出
          </button>
        </header>

        {/* 移动端快捷退出 */}
        <button
          onClick={handleLogout}
          className="md:hidden fixed right-4 top-4 z-40 h-9 rounded-full bg-white/90 px-3 text-xs text-text-secondary shadow-sm border border-white/60"
        >
          <i className="fas fa-sign-out-alt mr-1" />退出
        </button>

        {/* 主要内容区 */}
        <main className={`mx-auto w-full max-w-[1280px] px-4 pt-4 md:px-8 md:pt-6 ${isShowTab ? "pb-24 md:pb-8" : "pb-8"}`}>
          <Outlet />
        </main>

        {/* 移动端固定底部导航（始终可点，不随内容滚动到底才出现） */}
        {isShowTab && (
          <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 md:hidden">
            <MobileTabBar />
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileLayout;
