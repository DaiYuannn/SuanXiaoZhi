

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './styles.module.css';
import { fetchProducts, fetchRecommendedProducts } from '../../api/endpoints';
import ComplianceNotice from '../../components/ComplianceNotice';
import type { ProductInfo, ProductRiskLevel, RecommendedProduct } from '../../api/types';
import { useUserAndProgress } from '../../hooks/useUserAndProgress';

interface FilterState {
  type: string;
  risk: string;
  return: string;
}

const FinancialProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useUserAndProgress();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    risk: 'all',
    return: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);

  // 设置页面标题
  useEffect(() => {
    const originalTitle = document.title;
    document.title = '金智通 - 理财产品';
    return () => { document.title = originalTitle; };
  }, []);

  const [items, setItems] = useState<ProductInfo[]>([]);
  const [recommended, setRecommended] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoLoading, setRecoLoading] = useState(false);
  const [recoError, setRecoError] = useState<string | null>(null);
  const [budget, setBudget] = useState<number>(10000);
  const [termDays, setTermDays] = useState<number>(180);

  const riskMap: Record<string, ProductRiskLevel | undefined> = {
    all: undefined,
    low: 'LOW',
    medium: 'MID',
    high: 'HIGH'
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const riskLevel = riskMap[filters.risk];
        let minYield: number | undefined;
        let maxYield: number | undefined;
        if (filters.return === 'low') {
          maxYield = 3;
        } else if (filters.return === 'medium') {
          minYield = 3; maxYield = 6;
        } else if (filters.return === 'high') {
          minYield = 6;
        }
        const res = await fetchProducts({ riskLevel, minYield, maxYield });
        setItems(res.data || []);
      } catch (e: any) {
        setError(e?.message || '加载失败');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [filters.risk, filters.return]);

  // 首次加载尝试拉取智能推荐
  useEffect(() => {
    const runReco = async () => {
      setRecoLoading(true);
      setRecoError(null);
      try {
        const riskPreference = (profile?.riskLevel as ('LOW'|'MID'|'HIGH'|undefined)) || 'MID';
        const res = await fetchRecommendedProducts({ budget, termDays, riskPreference });
        setRecommended(res.data || []);
      } catch (e: any) {
        setRecoError(e?.message || '推荐加载失败');
      } finally {
        setRecoLoading(false);
      }
    };
    runReco();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (filterType: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setCurrentPage(1); // 重置到第一页
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // 重置到第一页
  };

  const [riskPrompt, setRiskPrompt] = useState<{visible: boolean; product?: ProductInfo}>(() => ({ visible: false }));
  const [drawer, setDrawer] = useState<{ open: boolean; product?: ProductInfo }>({ open: false });

  const openDrawer = (product: ProductInfo) => setDrawer({ open: true, product });
  const closeDrawer = () => setDrawer({ open: false, product: undefined });

  const isMobileOrTablet = () => window.innerWidth < 1024; // < lg 断点

  const handleProductClick = (product: ProductInfo) => {
    const userRisk = profile?.riskLevel;
    if (product.riskLevel === 'HIGH' && userRisk !== 'HIGH') {
      setRiskPrompt({ visible: true, product });
      return;
    }
    if (isMobileOrTablet()) {
      openDrawer(product);
    } else {
      navigate(`/product-detail?productId=${product.productId}`);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getRiskLevelClass = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW':
        return styles.riskLow;
      case 'MID':
        return styles.riskMedium;
      case 'HIGH':
        return styles.riskHigh;
      default:
        return '';
    }
  };

  const getRiskLevelText = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW':
        return '低风险';
      case 'MID':
        return '中风险';
      case 'HIGH':
        return '高风险';
      default:
        return '';
    }
  };

  // 筛选逻辑
  const filteredProducts = useMemo(() => items.filter(product => {
    // 搜索筛选
    if (searchTerm && !product.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // 类型筛选
    // 当前接口未提供产品类型字段，保留 UI，但忽略该过滤，可在后端扩展字段后启用

    // 风险等级筛选
    if (filters.risk !== 'all' && product.riskLevel !== riskMap[filters.risk]) {
      return false;
    }

    // 预期收益筛选
    if (filters.return !== 'all') {
      const returnRate = product.expectedYield;
      switch (filters.return) {
        case 'low':
          if (returnRate >= 3) return false;
          break;
        case 'medium':
          if (returnRate < 3 || returnRate >= 6) return false;
          break;
        case 'high':
          if (returnRate < 6) return false;
          break;
      }
    }

    return true;
  }), [items, searchTerm, filters.type, filters.risk, filters.return]);

  const handleApplyProfileFilter = () => {
    // 根据用户风险等级快速设置筛选
    const rl = profile?.riskLevel as ('LOW'|'MID'|'HIGH'|undefined);
    if (!rl) return;
    const map: Record<'LOW'|'MID'|'HIGH', string> = { LOW: 'low', MID: 'medium', HIGH: 'high' };
    setFilters(prev => ({ ...prev, risk: map[rl] }));
  };

  return (
    <div className="p-6">
      {/* 页面头部 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-1">理财产品</h2>
            <nav className="text-sm text-text-secondary">
              <span>理财产品</span>
            </nav>
          </div>
          <Link to="/risk-assessment" className={`${styles.gradientBg} text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all`}>
            <i className="fas fa-clipboard-check mr-2"></i>
            风险测评
          </Link>
        </div>
      </div>

      {/* 工具栏区域 */}
      <section className="mb-6">
        <div className={`${styles.gradientCard} rounded-xl p-4 shadow-card`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* 搜索框 */}
            <div className="flex-1 lg:max-w-md">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="搜索理财产品..." 
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary"></i>
              </div>
            </div>
            
            {/* 筛选器 */}
            <div className="flex flex-wrap items-center space-x-4">
              {/* 智能推荐参数 */}
              <div className="flex items-center space-x-2 mr-4">
                <span className="text-sm font-medium text-text-secondary">预算(元)</span>
                <input type="number" value={budget} onChange={e=>setBudget(parseFloat(e.target.value)||0)} className="w-28 px-2 py-1 border border-border-light rounded" />
                <span className="text-sm font-medium text-text-secondary ml-2">期限(天)</span>
                <input type="number" value={termDays} onChange={e=>setTermDays(parseInt(e.target.value)||0)} className="w-24 px-2 py-1 border border-border-light rounded" />
                <button onClick={async ()=>{
                  setRecoLoading(true); setRecoError(null);
                  try{
                    const riskPreference = (profile?.riskLevel as ('LOW'|'MID'|'HIGH'|undefined)) || 'MID';
                    const res = await fetchRecommendedProducts({ budget, termDays, riskPreference });
                    setRecommended(res.data || []);
                  }catch(e:any){ setRecoError(e?.message||'推荐失败'); }
                  finally{ setRecoLoading(false);} 
                }} className={`${styles.gradientBg} text-white px-3 py-1 rounded-lg text-sm`}>智能推荐</button>
              </div>
              {/* 画像推荐提示 */}
              {profile?.riskLevel && (
                <div className="flex items-center space-x-2 mr-4">
                  <span className="text-sm text-text-secondary">画像推荐：</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary text-white">风险等级 {profile.riskLevel}</span>
                  <button onClick={handleApplyProfileFilter} className="ml-2 text-xs px-2 py-1 rounded-lg border border-border-light hover:bg-gray-50">一键筛选</button>
                </div>
              )}
              {/* 产品类型筛选 */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-text-secondary">产品类型:</span>
                <div className="flex space-x-1">
                  {[
                    { value: 'all', label: '全部' },
                    { value: 'fund', label: '基金' },
                    { value: 'insurance', label: '保险' },
                    { value: 'deposit', label: '存款' },
                    { value: 'bond', label: '债券' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleFilterChange('type', option.value)}
                      className={`${styles.filterButton} px-3 py-1 text-sm rounded-lg border border-border-light ${
                        filters.type === option.value 
                          ? styles.filterButtonActive 
                          : 'text-text-secondary'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 风险等级筛选 */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-text-secondary">风险等级:</span>
                <div className="flex space-x-1">
                  {[
                    { value: 'all', label: '全部' },
                    { value: 'low', label: '低风险' },
                    { value: 'medium', label: '中风险' },
                    { value: 'high', label: '高风险' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleFilterChange('risk', option.value)}
                      className={`${styles.filterButton} px-3 py-1 text-sm rounded-lg border border-border-light ${
                        filters.risk === option.value 
                          ? styles.filterButtonActive 
                          : 'text-text-secondary'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 预期收益筛选 */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-text-secondary">预期收益:</span>
                <div className="flex space-x-1">
                  {[
                    { value: 'all', label: '全部' },
                    { value: 'low', label: '3%以下' },
                    { value: 'medium', label: '3%-6%' },
                    { value: 'high', label: '6%以上' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleFilterChange('return', option.value)}
                      className={`${styles.filterButton} px-3 py-1 text-sm rounded-lg border border-border-light ${
                        filters.return === option.value 
                          ? styles.filterButtonActive 
                          : 'text-text-secondary'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-2">
          <ComplianceNotice variant="product" />
        </div>
      </section>

      {/* 理财产品列表 */}
      {(
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-text-primary">为你推荐</h3>
            {recoLoading && <span className="text-xs text-text-secondary">计算中…</span>}
          </div>
          {recoError && <div className="text-sm text-danger mb-2">{recoError}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recommended.map(r => (
              <div key={r.product.productId} className={`${styles.productCard} rounded-xl p-6 cursor-pointer`} onClick={() => handleProductClick(r.product)}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text-primary mb-1">{r.product.name}</h3>
                    <p className="text-xs text-text-secondary">推荐分 {Math.round(r.score*100)}</p>
                  </div>
                  <span className="text-xs text-text-secondary">{r.reason||'综合匹配'}</span>
                </div>
                <div className="mb-4">
                  <div className="flex items-baseline space-x-1 mb-1">
                    <span className="text-2xl font-bold text-text-primary">{r.product.expectedYield}</span>
                    <span className="text-sm text-text-secondary">%</span>
                  </div>
                  <p className="text-sm text-text-secondary">期限 {r.product.termDays} 天</p>
                </div>
                <div className="border-t border-border-light pt-4">
                  <button className={`w-full ${styles.gradientBg} text-white py-2 rounded-lg font-medium hover:shadow-lg transition-all`} onClick={(e)=>{e.stopPropagation(); handleProductClick(r.product);}}>查看详情</button>
                </div>
              </div>
            ))}
            {!recoLoading && recommended.length===0 && <div className="col-span-full text-center text-text-secondary text-sm">暂无推荐结果</div>}
          </div>
        </section>
      )}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading && <div className="col-span-full text-center text-text-secondary">加载中...</div>}
          {error && <div className="col-span-full text-center text-danger">{error}</div>}
          {!loading && !error && filteredProducts.map(product => (
            <div
              key={product.productId}
              className={`${styles.productCard} rounded-xl p-6 cursor-pointer`}
              onClick={() => handleProductClick(product)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-text-primary mb-1">{product.name}</h3>
                  <p className="text-sm text-text-secondary">{getRiskLevelText(product.riskLevel)} · 期限 {product.termDays} 天</p>
                </div>
                <div className={`${getRiskLevelClass(product.riskLevel)} text-white text-xs px-2 py-1 rounded-full font-medium`}>
                  {getRiskLevelText(product.riskLevel)}
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex items-baseline space-x-1 mb-1">
                  <span className="text-2xl font-bold text-text-primary">{product.expectedYield}</span>
                  <span className="text-sm text-text-secondary">%</span>
                </div>
                <p className="text-sm text-text-secondary">预期年化收益率</p>
              </div>
              
              <div className="border-t border-border-light pt-4">
                <button
                  className={`w-full ${styles.gradientBg} text-white py-2 rounded-lg font-medium hover:shadow-lg transition-all`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProductClick(product);
                  }}
                >
                  查看详情
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 风险提示弹层 */}
      {riskPrompt.visible && riskPrompt.product && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-11/12 max-w-md p-6">
            <div className="flex items-start space-x-3 mb-3">
              <div className="w-10 h-10 bg-warning bg-opacity-20 rounded-lg flex items-center justify-center">
                <i className="fas fa-exclamation-triangle text-warning"></i>
              </div>
              <div className="flex-1">
                <h4 className="text-base font-semibold text-text-primary mb-1">风险提示</h4>
                <p className="text-sm text-text-secondary">当前产品风险等级为 <span className="font-medium">{getRiskLevelText(riskPrompt.product.riskLevel)}</span>，与您的画像可能不匹配。请充分了解产品风险、收益不保证且可能亏损本金。</p>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2 mt-4">
              <button onClick={() => setRiskPrompt({ visible: false })} className="px-4 py-2 text-sm rounded-lg border border-border-light hover:bg-gray-50">取消</button>
              <button onClick={() => { const p = riskPrompt.product!; setRiskPrompt({ visible: false }); navigate(`/product-detail?productId=${p.productId}`);} } className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:opacity-90">我已了解风险，继续</button>
            </div>
          </div>
        </div>
      )}

      {/* 分页区域 */}
      <section className="mb-8">
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-secondary">
            显示第 <span className="font-medium">1</span> - <span className="font-medium">{filteredProducts.length}</span> 条，共 <span className="font-medium">24</span> 条记录
          </div>
          <div className="flex items-center space-x-2">
            <button 
              className={`${styles.paginationButton} px-3 py-1 text-sm border border-border-light rounded-lg text-text-secondary`}
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            {[1, 2, 3].map(page => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`${styles.paginationButton} px-3 py-1 text-sm border border-border-light rounded-lg ${
                  currentPage === page 
                    ? styles.paginationButtonActive 
                    : 'text-text-secondary'
                }`}
              >
                {page}
              </button>
            ))}
            <span className="px-2 text-text-secondary">...</span>
            <button
              onClick={() => handlePageChange(5)}
              className={`${styles.paginationButton} px-3 py-1 text-sm border border-border-light rounded-lg text-text-secondary`}
            >
              5
            </button>
            <button 
              className={`${styles.paginationButton} px-3 py-1 text-sm border border-border-light rounded-lg text-text-secondary`}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </section>

      {/* 右侧抽屉（移动/平板） */}
      {drawer.open && drawer.product && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeDrawer}></div>
          <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] md:w-[520px] bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border-light">
              <h3 className="text-lg font-semibold text-text-primary">{drawer.product.name}</h3>
              <button onClick={closeDrawer} className="p-2 rounded hover:bg-gray-100 text-text-secondary">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="mb-4">
                <div className="text-sm text-text-secondary mb-1">风险等级</div>
                <div className="text-sm font-medium">{drawer.product.riskLevel}</div>
              </div>
              <div className="mb-4">
                <div className="text-sm text-text-secondary mb-1">预期年化收益率</div>
                <div className="text-2xl font-bold text-text-primary">{drawer.product.expectedYield}%</div>
              </div>
              <div className="mb-4">
                <div className="text-sm text-text-secondary mb-1">期限</div>
                <div className="text-sm font-medium">{drawer.product.termDays} 天</div>
              </div>
              {/* 产品说明字段后端未提供，暂不展示 */}
              <div className="mt-2"><ComplianceNotice variant="product" /></div>
            </div>
            <div className="p-4 border-t border-border-light bg-gray-50 flex items-center justify-end gap-2">
              <button onClick={closeDrawer} className="px-4 py-2 text-sm rounded border border-border-light hover:bg-gray-100">关闭</button>
              <button onClick={() => { const p = drawer.product!; closeDrawer(); navigate(`/product-detail?productId=${p.productId}`); }} className={`${styles.gradientBg} text-white px-4 py-2 text-sm rounded`}>查看完整详情</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialProductsPage;

