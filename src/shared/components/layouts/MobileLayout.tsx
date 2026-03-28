import React, { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import MobileTabBar from "../MobileTabBar";
import { UserRole } from "../../types/permission.js";

const MobileLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 若为管理员，不应进入此布局，应重定向至 B 端
  useEffect(() => {
    const role = localStorage.getItem("sx-role") as UserRole;
    if (role === UserRole.SUPER_ADMIN || role === UserRole.OPERATOR) {
      if (!location.pathname.startsWith("/admin")) {
        navigate("/admin", { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  // 判断是否需要显示底部 Tab
  const showTabPaths = ["/", "/home", "/accounting", "/analysis", "/planning", "/products", "/family", "/user-settings"];
  const isShowTab = showTabPaths.includes(location.pathname);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#e6eef3] flex justify-center">
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-[#98f5cc]/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-[#79a8ff]/25 blur-3xl" />

      {/* 桌面端外围居中限制，模拟手机壳形态 */}
      <div className="relative w-full max-w-[480px] bg-white/96 min-h-screen md:min-h-[96vh] md:my-4 md:rounded-[34px] md:border md:border-white/60 md:shadow-[0_26px_80px_rgba(16,42,67,0.24)] flex flex-col overflow-hidden backdrop-blur-sm">
        {/* 主要内容区 */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden ${isShowTab ? "pb-[92px]" : "pb-safe"}`}>
          <Outlet />
        </main>

        {/* 悬浮级底部导航 */}
        {isShowTab && (
          <div className="absolute bottom-0 left-0 w-full z-50 px-3 pb-3 md:px-4 md:pb-4">
            <MobileTabBar />
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileLayout;
