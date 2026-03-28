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
    <div className="flex bg-[#F1F5F9] min-h-screen">
      {/* 侧边深色导航 */}
      <aside className="w-64 bg-[#1E293B] text-white flex flex-col transition-all duration-300 shadow-xl z-20">
        <div className="p-6 flex items-center justify-center border-b border-gray-700">
          <i className="fas fa-cube text-primary text-2xl mr-3"></i>
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
                    ? "bg-primary text-white shadow-md font-semibold" 
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <i className={`fas ${item.icon} w-6 text-center mr-3 text-lg`}></i>
                {item.name}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-700 text-sm text-gray-500 text-center">
          算小智 V2.0
        </div>
      </aside>

      {/* 右侧主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部操作条 */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-8 z-10">
          <div className="font-medium text-gray-700">
            {menuItems.find(m => m.path === location.pathname)?.name || "管理后台"}
          </div>
          <div className="flex items-center space-x-6">
            <button className="text-gray-400 hover:text-gray-600 transition">
              <i className="fas fa-bell text-lg"></i>
            </button>
            <div className="flex items-center space-x-3 border-l pl-6 border-gray-200">
              <img src="https://i.pravatar.cc/150?img=11" alt="admin" className="w-8 h-8 rounded-full shadow-sm" />
              <div className="text-sm">
                <p className="font-semibold text-gray-800">Admin</p>
                <p className="text-xs text-gray-500">超级管理员</p>
              </div>
              <button onClick={handleLogout} className="ml-4 text-gray-400 hover:text-danger p-2 rounded-lg transition-colors" title="登出">
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          </div>
        </header>

        {/* 页面路由挂载点 */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
