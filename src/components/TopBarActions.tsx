import React, { useEffect, useRef, useState } from 'react';

const TopBarActions: React.FC = () => {
  const [showSearch, setShowSearch] = useState(false);
  const [showNotify, setShowNotify] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const notifyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element;
      if (showSearch && searchRef.current && !searchRef.current.contains(t)) setShowSearch(false);
      if (showNotify && notifyRef.current && !notifyRef.current.contains(t)) setShowNotify(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [showSearch, showNotify]);

  const onSearch = () => {
    if (!query.trim()) return;
    const q = query.trim().toLowerCase();
    // 简单路由匹配：记账/分析/规划/产品/客服
    if (q.includes('记账')) window.location.assign('/accounting');
    else if (q.includes('分析')) window.location.assign('/consumption-analysis');
    else if (q.includes('规划')) window.location.assign('/financial-planning');
    else if (q.includes('产品') || q.includes('理财')) window.location.assign('/financial-products');
    else if (q.includes('客服') || q.includes('帮助')) window.location.assign('/customer-service');
    else window.location.assign('/home');
  };

  return (
    <div className="flex items-center space-x-4 relative">
      <button
        aria-label="搜索"
        className="p-2 text-text-secondary hover:text-primary transition-colors"
        onClick={(e) => { e.stopPropagation(); setShowSearch((s) => !s); setShowNotify(false); }}
      >
        <i className="fas fa-search"></i>
      </button>
      <button
        aria-label="通知"
        className="p-2 text-text-secondary hover:text-primary transition-colors relative"
        onClick={(e) => { e.stopPropagation(); setShowNotify((s) => !s); setShowSearch(false); }}
      >
        <i className="fas fa-bell"></i>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-danger rounded-full"></span>
      </button>
      <div className="flex items-center space-x-2 cursor-pointer">
        <img src="https://s.coze.cn/image/7XpnQ81VF7w/" alt="用户头像" className="w-8 h-8 rounded-full" />
        <span className="text-text-primary font-medium">张先生</span>
        <i className="fas fa-chevron-down text-text-secondary text-sm"></i>
      </div>

      {showSearch && (
        <div ref={searchRef} className="absolute top-full right-20 mt-2 bg-white border border-border-light rounded-lg shadow-lg p-3 w-72 z-50">
          <div className="flex items-center space-x-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
              placeholder="搜索功能或页面（如 记账/分析/规划/产品/客服）"
              className="flex-1 px-3 py-2 border border-border-light rounded focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button onClick={onSearch} className="px-3 py-2 bg-primary text-white rounded">搜索</button>
          </div>
        </div>
      )}

      {showNotify && (
        <div ref={notifyRef} className="absolute top-full right-6 mt-2 bg-white border border-border-light rounded-lg shadow-lg p-0 w-80 z-50">
          <div className="px-4 py-2 border-b border-border-light font-medium">通知</div>
          <div className="max-h-64 overflow-auto divide-y">
            <div className="px-4 py-3 text-sm hover:bg-gray-50 cursor-pointer">欢迎使用金智通，祝您财务顺利！</div>
            <div className="px-4 py-3 text-sm hover:bg-gray-50 cursor-pointer">记账提醒：本周还没有新增交易</div>
            <div className="px-4 py-3 text-sm hover:bg-gray-50 cursor-pointer">分析报告已更新，点击查看</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopBarActions;
