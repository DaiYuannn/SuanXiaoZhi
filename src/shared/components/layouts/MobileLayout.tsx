import React, { useEffect } from "react";
import { Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
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
    <div className="min-h-screen bg-[#EEF2F6] flex justify-center w-full">
      {/* 桌面端外围居中限制，模拟手机壳形态 */}
      <div className="w-full max-w-[480px] bg-white min-h-screen relative shadow-[0_0_40px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden">
        {/* 主要内容区 */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden ${isShowTab ? "pb-[80px]" : "pb-safe"}`}>
          <Outlet />
        </main>

        {/* 悬浮级底部导航 */}
        {isShowTab && (
          <div className="absolute bottom-0 left-0 w-full z-50">
            <MobileTabBar />
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileLayout;
