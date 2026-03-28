import React, { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { UserRole } from "../../types/permission.js";

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const role = localStorage.getItem("sx-role") as UserRole;
    if (role !== UserRole.SUPER_ADMIN && role !== UserRole.OPERATOR) {
      if (location.pathname.startsWith("/admin")) {
        navigate("/", { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  const menuItems = [
    { name: "系统仪表盘", path: "/admin", icon: "fa-chart-line" },
    { name: "用户管理", path: "/admin/users", icon: "fa-users" },
    { name: "交易审计", path: "/admin/transactions", icon: "fa-file-invoice-dollar" },
    { name: "产品配置", path: "/admin/products", icon: "fa-box-open" },
    { name: "系统设置", path: "/admin/system", icon: "fa-cog" }
  ];

  const handleLogout = () => {
    localStorage.removeItem("sx-token");
    localStorage.removeItem("sx-role");
    localStorage.removeItem("sx-user-id");
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-[#edf2f7]">
      {/* 侧边深色导航 */}
      <aside className="w-72 bg-gradient-to-b from-[#0f172a] via-[#111c33] to-[#152640] text-white flex flex-col transition-all duration-300 shadow-2xl z-20">
        <div className="p-6 flex items-center justify-center border-b border-white/10">
          <i className="fas fa-cube text-[#5eead4] text-2xl mr-3"></i>
          <h1 className="text-xl font-bold tracking-wider">智算中心 B端</h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== "/admin" && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? "bg-gradient-to-r from-[#1f9d70] to-[#1d7f63] text-white shadow-lg font-semibold" 
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <i className={`fas ${item.icon} w-6 text-center mr-3 text-lg`}></i>
                {item.name}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10 text-sm text-slate-400 text-center">
          算小智 Control Hub v2.1
        </div>
      </aside>

      {/* 右侧主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部操作条 */}
        <header className="h-16 bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-between px-8 z-10 border-b border-slate-200/80">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Operations Console</p>
            <div className="font-semibold text-slate-700">
              {menuItems.find(m => m.path === location.pathname)?.name || "管理后台"}
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
              <i className="fas fa-search text-slate-400 mr-2"></i>
              <input
                className="bg-transparent text-sm outline-none placeholder:text-slate-400 w-56"
                placeholder="搜索用户、单据、事件..."
              />
            </div>
            <button className="text-slate-400 hover:text-slate-600 transition">
              <i className="fas fa-bell text-lg"></i>
            </button>
            <div className="flex items-center space-x-3 border-l pl-6 border-slate-200">
              <img src="https://i.pravatar.cc/150?img=11" alt="admin" className="w-8 h-8 rounded-full shadow-sm" />
              <div className="text-sm">
                <p className="font-semibold text-slate-800">Admin</p>
                <p className="text-xs text-slate-500">超级管理员</p>
              </div>
              <button onClick={handleLogout} className="ml-4 text-slate-400 hover:text-danger p-2 rounded-lg transition-colors" title="登出">
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          </div>
        </header>

        {/* 页面路由挂载点 */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8 bg-gradient-to-b from-[#edf2f7] to-[#f8fbfd]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
