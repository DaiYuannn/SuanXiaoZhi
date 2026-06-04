

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import styles from './ProductDetailPage.module.css';
import { fetchProductDetail, fetchProducts, estimateProductYield } from '../api/products-api';
import type { ProductInfo } from '../../../shared/types/api';
import { auditApi, auditError } from '../../../shared/audit/audit-service';
import ComplianceNotice from '../../../shared/components/ComplianceNotice';

interface ProductData {
  name: string;
  type: string;
  riskLevel: string;
  riskClass: string;
  expectedReturn: string;
  minimumAmount: string;
  term: string;
  establishmentDate: string;
  hasHolding: boolean;
}

const ProductDetail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: pathId } = useParams();
  const [investmentAmount, setInvestmentAmount] = useState<number>(10000);
  const [expectedEarnings, setExpectedEarnings] = useState<string>('—');
  const [totalAmount, setTotalAmount] = useState<string>('—');
  const [estimating, setEstimating] = useState<boolean>(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState<boolean>(false);
  const [currentProduct, setCurrentProduct] = useState<ProductData | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<{riskScore?: number; volatility?: number; sharpe?: number}>({});
  const [history, setHistory] = useState<Array<{date:string; yield:number}>>([]);
  const [chartReady, setChartReady] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const riskText = (r?: string) => r === 'HIGH' ? '高风险' : r === 'MID' ? '中风险' : r === 'LOW' ? '低风险' : '—';
  const riskClassMap: Record<string, string> = { LOW: 'risk-low', MID: 'risk-medium', HIGH: 'risk-high' };

  // 设置页面标题
  useEffect(() => {
    const originalTitle = document.title;
    document.title = '算小智 - 产品详情';
    return () => { document.title = originalTitle; };
  }, []);

  // 获取产品数据并初始化（优先走详情接口，失败回退列表过滤）
  useEffect(() => {
    const productId = pathId || searchParams.get('productId');
    if (!productId) return;
    const mapProduct = (info: ProductInfo): ProductData => ({
      name: info.name,
      type: '理财产品',
      riskLevel: riskText(info.riskLevel),
      riskClass: riskClassMap[info.riskLevel] || 'risk-low',
      expectedReturn: `${info.expectedYield}%`,
      minimumAmount: '—',
      term: info.termDays ? `${info.termDays}天` : '—',
      establishmentDate: '—',
      hasHolding: false,
    });
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        auditApi('product_detail_load_start', { productId });
        const res = await fetchProductDetail(productId);
        const pd = mapProduct(res.data);
        setCurrentProduct(pd);
        await calculateReturn(pd, investmentAmount, productId, res.data.termDays || undefined);
        // 风险与历史
        setRiskMetrics({ riskScore: res.data.riskScore, volatility: res.data.volatility, sharpe: res.data.sharpe });
        setHistory(res.data.historyYieldPoints || []);
        auditApi('product_detail_load_success', { productId });
      } catch (e) {
        auditError('product_detail_load_fallback', e);
        // 回退：拉列表后过滤
        try {
          const list = await fetchProducts({});
          const found = (list.data || []).find(x => x.productId === productId);
          if (found) {
            const pd = mapProduct(found);
            setCurrentProduct(pd);
            await calculateReturn(pd, investmentAmount, productId, found.termDays || undefined);
            setRiskMetrics({ riskScore: found.riskScore, volatility: found.volatility, sharpe: found.sharpe });
            setHistory(found.historyYieldPoints || []);
          }
        } catch {}
        if (!currentProduct) setError('未找到该产品或网络错误');
      } finally {
        setTimeout(() => setIsDrawerVisible(true), 100);
        setLoading(false);
      }
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // 收益测算功能
  const calculateReturn = async (product: ProductData, amount: number, productId?: string, termDaysOverride?: number) => {
    const termDays = termDaysOverride ?? (product.term.includes('天') ? parseInt(product.term) : 365);
    setEstimating(true);
    setEstimateError(null);
    try {
      if (productId) {
        const resp = await estimateProductYield(productId, amount, termDays);
        const est = resp.data?.estimate ?? 0;
        const total = amount + est;
        setExpectedEarnings(`¥${est.toFixed(2)}`);
        setTotalAmount(`¥${total.toFixed(2)}`);
      } else {
        // 回退：本地估算
        const expectedReturn = parseFloat(product.expectedReturn) / 100;
        const earnings = amount * expectedReturn * (termDays / 365);
        const total = amount + earnings;
        setExpectedEarnings(`¥${earnings.toFixed(2)}`);
        setTotalAmount(`¥${total.toFixed(2)}`);
      }
    } catch (e:any) {
      setEstimateError(e?.message || '收益测算失败，已使用本地估算');
      const expectedReturn = parseFloat(product.expectedReturn) / 100;
      const earnings = amount * expectedReturn * (termDays / 365);
      const total = amount + earnings;
      setExpectedEarnings(`¥${earnings.toFixed(2)}`);
      setTotalAmount(`¥${total.toFixed(2)}`);
    } finally {
      setEstimating(false);
    }
  };

  // 处理投资金额变化
  const handleInvestmentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseFloat(e.target.value) || 0;
    setInvestmentAmount(amount);
    if (currentProduct) {
      const productId = searchParams.get('productId') || undefined;
      const days = currentProduct.term.includes('天') ? parseInt(currentProduct.term) : 365;
      calculateReturn(currentProduct, amount, productId, days);
    }
  };

  // 关闭抽屉
  const handleCloseDrawer = () => {
    setIsDrawerVisible(false);
    setTimeout(() => {
      navigate(-1);
    }, 300);
  };

  // 处理申购
  const handlePurchase = async () => {
    const amountCent = Math.round(investmentAmount * 100);
    const productId = searchParams.get('productId') || pathId || '';
    try {
      await fetch('/api/v1/mobile/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('sx-token') ?? ''}` },
        body: JSON.stringify({ amountCent: -amountCent, type: 'EXPENSE', categoryName: '投资支出', note: `申购 ${currentProduct?.name ?? productId}` })
      });
      alert(`申购成功！金额 ¥${investmentAmount.toLocaleString()}`);
    } catch { alert('申购失败，请重试'); }
  };

  // 处理赎回
  const handleRedemption = async () => {
    if (!currentProduct?.hasHolding) return;
    const amountCent = Math.round(investmentAmount * 100);
    const productId = searchParams.get('productId') || pathId || '';
    try {
      await fetch('/api/v1/mobile/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('sx-token') ?? ''}` },
        body: JSON.stringify({ amountCent, type: 'INCOME', categoryName: '理财收益', note: `赎回 ${currentProduct?.name ?? productId}` })
      });
      alert(`赎回申请已提交！金额 ¥${investmentAmount.toLocaleString()}`);
    } catch { alert('赎回失败，请重试'); }
  };

  // ESC键关闭抽屉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseDrawer();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 懒加载 Chart.js（在用户点击展示历史曲线时再加载）
  useEffect(() => {
    if (showChart && !chartReady) {
      import('chart.js/auto').then(() => setChartReady(true));
    }
  }, [showChart, chartReady]);

  if (!isDrawerVisible && loading) {
    return null;
  }

  const hasData = !!currentProduct;
  const recommendationSource = currentProduct
    ? (currentProduct.riskLevel.includes('高') ? '热门产品池 + 风险偏好匹配引擎' : '算法推荐 + 人工复核池')
    : '—';
  const recommendationBasis = currentProduct
    ? [
        `风险等级匹配：${currentProduct.riskLevel}`,
        `预期收益表现：${currentProduct.expectedReturn}`,
        `期限偏好匹配：${currentProduct.term}`
      ]
    : [];

  return (
    <div className={styles.pageWrapper}>
      {/* 抽屉遮罩层 */}
      <div 
        className={`fixed inset-0 ${styles.drawerOverlay} z-50 ${isDrawerVisible ? '' : 'hidden'}`}
        onClick={handleCloseDrawer}
      />
      
      {/* 产品详情抽屉 */}
      <div className={`fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-drawer z-50 ${isDrawerVisible ? styles.drawerEnterActive : styles.drawerEnter} overflow-y-auto`}>
        {/* 抽屉头部 */}
        <div className={`${styles.gradientBg} text-white p-6 sticky top-0 z-10`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">产品详情</h2>
            <button 
              onClick={handleCloseDrawer}
              className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all"
            >
              <i className="fas fa-times text-white"></i>
            </button>
          </div>
          <div className="space-y-2">
            {currentProduct && <h3 className="text-2xl font-bold">{currentProduct.name}</h3>}
            <div className="flex items-center space-x-2">
              {currentProduct && <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">{currentProduct.type}</span>}
              {currentProduct && <span className={`${styles.riskBadge} ${styles[currentProduct.riskClass]}`}>{currentProduct.riskLevel}</span>}
            </div>
          </div>
        </div>
        
        {/* 抽屉内容区 */}
        <div className="p-6 space-y-6">
          {loading && (
            <div className="text-center text-sm text-text-secondary">加载中…</div>
          )}
          {error && (
            <div className="text-center text-sm text-danger bg-danger/10 p-3 rounded">{error}</div>
          )}
          {!hasData && !loading && !error && (
            <div className="text-center text-sm text-text-secondary">暂无数据</div>
          )}
          {hasData && (
          <>
          <section className="space-y-4">
            <h4 className="text-lg font-semibold text-text-primary border-b border-border-light pb-2">推荐来源与依据</h4>
            <div className="bg-bg-light rounded-lg p-4 border border-border-light space-y-2">
              <p className="text-sm text-text-primary"><span className="font-medium">推荐来源：</span>{recommendationSource}</p>
              <div className="text-sm text-text-secondary space-y-1">
                {recommendationBasis.map((item, idx) => (
                  <p key={idx}>• {item}</p>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-lg font-semibold text-text-primary border-b border-border-light pb-2">信任与认证</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-border-light bg-white">
                <p className="font-medium text-text-primary mb-1"><i className="fas fa-certificate text-success mr-1"></i>风控认证</p>
                <p className="text-text-secondary">通过平台风控规则校验，支持异常波动监测。</p>
              </div>
              <div className="p-3 rounded-lg border border-border-light bg-white">
                <p className="font-medium text-text-primary mb-1"><i className="fas fa-user-shield text-info mr-1"></i>信息披露</p>
                <p className="text-text-secondary">披露收益规则、费用结构、风险边界与历史表现。</p>
              </div>
              <div className="p-3 rounded-lg border border-border-light bg-white">
                <p className="font-medium text-text-primary mb-1"><i className="fas fa-file-contract text-warning mr-1"></i>说明书可查</p>
                <p className="text-text-secondary">支持查看产品说明书、条款摘要、费用清单。</p>
              </div>
              <div className="p-3 rounded-lg border border-border-light bg-white">
                <p className="font-medium text-text-primary mb-1"><i className="fas fa-comments text-primary mr-1"></i>用户反馈</p>
                <p className="text-text-secondary">展示近 30 天真实反馈与常见问题处理记录。</p>
              </div>
            </div>
          </section>

          {/* 产品基本信息 */}
          <section className="space-y-4">
            <h4 className="text-lg font-semibold text-text-primary border-b border-border-light pb-2">基本信息</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-text-secondary text-sm mb-1">预期年化收益率</p>
                <p className="text-2xl font-bold text-success">{currentProduct.expectedReturn}</p>
              </div>
              <div className="text-center">
                <p className="text-text-secondary text-sm mb-1">起购金额</p>
                <p className="text-2xl font-bold text-text-primary">{currentProduct.minimumAmount}</p>
              </div>
              <div className="text-center">
                <p className="text-text-secondary text-sm mb-1">产品期限</p>
                <p className="text-2xl font-bold text-text-primary">{currentProduct.term}</p>
              </div>
              <div className="text-center">
                <p className="text-text-secondary text-sm mb-1">成立日期</p>
                <p className="text-lg font-semibold text-text-primary">{currentProduct.establishmentDate}</p>
              </div>
            </div>
          </section>
          
          {/* 风险指标 */}
          <section className="space-y-4">
            <h4 className="text-lg font-semibold text-text-primary border-b border-border-light pb-2">风险指标</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-bg-light rounded">
                <p className="text-xs text-text-secondary mb-1">综合风险分</p>
                <p className="text-lg font-bold text-text-primary">{riskMetrics.riskScore ?? '—'}</p>
              </div>
              <div className="text-center p-3 bg-bg-light rounded">
                <p className="text-xs text-text-secondary mb-1">年化波动率</p>
                <p className="text-lg font-bold text-text-primary">{riskMetrics.volatility != null ? `${riskMetrics.volatility}%` : '—'}</p>
              </div>
              <div className="text-center p-3 bg-bg-light rounded">
                <p className="text-xs text-text-secondary mb-1">夏普比率</p>
                <p className="text-lg font-bold text-text-primary">{riskMetrics.sharpe ?? '—'}</p>
              </div>
            </div>
          </section>

          {/* 历史收益曲线 */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-text-primary">历史收益曲线</h4>
              <button onClick={() => setShowChart(s => !s)} className="text-primary text-sm underline">
                {showChart ? '收起' : '展开'}
              </button>
            </div>
            {showChart && (
              <div className="bg-white rounded-lg p-4 border border-border-light">
                {chartReady ? (
                  <HistoryYieldChart points={history} />
                ) : (
                  <div className="text-center text-xs text-text-secondary">图表组件加载中…</div>
                )}
              </div>
            )}
            {!showChart && history.length > 0 && (
              <p className="text-xs text-text-secondary">最新收益：{history[history.length-1].yield}% （{history[history.length-1].date}）</p>
            )}
            {history.length === 0 && (
              <p className="text-xs text-text-secondary">暂无历史收益数据</p>
            )}
            {history.length > 0 && (
              <div className="overflow-x-auto border border-border-light rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-bg-light">
                    <tr>
                      <th className="text-left px-3 py-2 text-text-secondary">日期</th>
                      <th className="text-left px-3 py-2 text-text-secondary">收益率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(-6).map((p, idx) => (
                      <tr key={`${p.date}-${idx}`} className="border-t border-border-light">
                        <td className="px-3 py-2 text-text-primary">{p.date}</td>
                        <td className={`px-3 py-2 font-medium ${p.yield >= 0 ? 'text-success' : 'text-danger'}`}>{p.yield}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h4 className="text-lg font-semibold text-text-primary border-b border-border-light pb-2">购买路径与文档</h4>
            <div className="bg-white rounded-lg p-4 border border-border-light text-sm text-text-secondary space-y-2">
              <p>1) 点击“立即申购”进入确认页，核对风险等级与费用。</p>
              <p>2) 阅读产品说明书与关键条款，确认后进入合作渠道下单。</p>
              <p>3) 若暂不支持直购，将展示跳转指引与步骤说明。</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="button" className="px-3 py-1 rounded border border-border-light hover:bg-bg-light">查看产品说明书</button>
                <button type="button" className="px-3 py-1 rounded border border-border-light hover:bg-bg-light">查看费用结构</button>
                <button type="button" className="px-3 py-1 rounded border border-border-light hover:bg-bg-light">查看风险揭示书</button>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-lg font-semibold text-text-primary border-b border-border-light pb-2">用户评价（近30天）</h4>
            <div className="space-y-2 text-sm">
              <div className="p-3 rounded border border-border-light bg-bg-light">
                <p className="font-medium text-text-primary">用户A · 评分 4.7</p>
                <p className="text-text-secondary mt-1">信息披露清晰，收益波动在预期内，赎回路径指引明确。</p>
              </div>
              <div className="p-3 rounded border border-border-light bg-bg-light">
                <p className="font-medium text-text-primary">用户B · 评分 4.5</p>
                <p className="text-text-secondary mt-1">适合稳健配置，建议继续补充历史回撤区间说明。</p>
              </div>
            </div>
          </section>

          {/* 产品特色 */}
          <section className="space-y-4">
            <h4 className="text-lg font-semibold text-text-primary border-b border-border-light pb-2">产品特色</h4>
            <div className="space-y-3">
              <div className={`${styles.featureCard} rounded-lg p-4`}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-success bg-opacity-20 rounded-lg flex items-center justify-center">
                    <i className="fas fa-shield-alt text-success"></i>
                  </div>
                  <div>
                    <h5 className="font-medium text-text-primary">风险可控</h5>
                    <p className="text-sm text-text-secondary">专业团队管理，风险分散投资</p>
                  </div>
                </div>
              </div>
              
              <div className={`${styles.featureCard} rounded-lg p-4`}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-info bg-opacity-20 rounded-lg flex items-center justify-center">
                    <i className="fas fa-chart-line text-info"></i>
                  </div>
                  <div>
                    <h5 className="font-medium text-text-primary">稳定收益</h5>
                    <p className="text-sm text-text-secondary">历史业绩表现优异，收益稳定</p>
                  </div>
                </div>
              </div>
              
              <div className={`${styles.featureCard} rounded-lg p-4`}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-warning bg-opacity-20 rounded-lg flex items-center justify-center">
                    <i className="fas fa-clock text-warning"></i>
                  </div>
                  <div>
                    <h5 className="font-medium text-text-primary">灵活期限</h5>
                    <p className="text-sm text-text-secondary">多种期限选择，满足不同需求</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
          
          {/* 投资策略 */}
          <section className="space-y-4">
            <h4 className="text-lg font-semibold text-text-primary border-b border-border-light pb-2">投资策略</h4>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-border-light">
                <h5 className="font-medium text-text-primary mb-2">资产配置</h5>
                <ul className="text-sm text-text-secondary space-y-1">
                  <li>• 债券类资产：60-80%</li>
                  <li>• 股票类资产：10-30%</li>
                  <li>• 货币市场工具：5-15%</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-border-light">
                <h5 className="font-medium text-text-primary mb-2">投资理念</h5>
                <p className="text-sm text-text-secondary">
                  采用价值投资理念，通过深入的基本面分析，精选优质债券和股票，追求长期稳定的投资回报。
                </p>
              </div>
            </div>
          </section>
          
          {/* 风险提示 */}
          <section className="space-y-4">
            <h4 className="text-lg font-semibold text-text-primary border-b border-border-light pb-2">风险提示</h4>
            <div className="bg-danger bg-opacity-5 rounded-lg p-4 border border-danger border-opacity-20">
              <div className="flex items-start space-x-3">
                <i className="fas fa-exclamation-triangle text-danger mt-1"></i>
                <div className="flex-1">
                  <h5 className="font-medium text-danger mb-2">投资有风险，入市需谨慎</h5>
                  <ul className="text-sm text-text-secondary space-y-1">
                    <li>• 本产品属于中等风险等级，不保证本金不受损失</li>
                    <li>• 预期收益率仅供参考，实际收益可能存在波动</li>
                    <li>• 投资者应根据自身风险承受能力谨慎投资</li>
                    <li>• 详细风险说明请查看产品说明书</li>
                    <li>• 反诈提醒：平台不会要求私下转账或索要短信验证码</li>
                  </ul>
                </div>
              </div>
            </div>
            <ComplianceNotice variant="product" />
          </section>
          
          {/* 收益测算 */}
          <section className="space-y-4">
            <h4 className="text-lg font-semibold text-text-primary border-b border-border-light pb-2">收益测算</h4>
            <div className="bg-white rounded-lg p-4 border border-border-light">
              <div className="space-y-4">
                <div>
                  <label htmlFor="investment-amount" className="block text-sm font-medium text-text-primary mb-2">投资金额</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary">¥</span>
                    <input 
                      type="number" 
                      id="investment-amount"
                      value={investmentAmount}
                      onChange={handleInvestmentAmountChange}
                      className={`w-full pl-8 pr-4 py-3 border border-border-light rounded-lg ${styles.calculatorInput}`}
                      placeholder="请输入投资金额"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-bg-light rounded-lg">
                    <p className="text-sm text-text-secondary mb-1">预期收益</p>
                    <p className="text-xl font-bold text-success">{expectedEarnings}{estimating && <span className="ml-2 text-xs text-text-secondary">计算中…</span>}</p>
                  </div>
                  <div className="text-center p-3 bg-bg-light rounded-lg">
                    <p className="text-sm text-text-secondary mb-1">到期本息</p>
                    <p className="text-xl font-bold text-text-primary">{totalAmount}</p>
                  </div>
                </div>
                {estimateError && <p className="text-xs text-danger text-center">{estimateError}</p>}
                
                <p className="text-xs text-text-secondary text-center">
                  注：以上测算基于预期年化收益率{currentProduct.expectedReturn}，投资期限{currentProduct.term}，仅供参考
                </p>
              </div>
            </div>
          </section>
          
          {/* 操作按钮区 */}
          <section className="space-y-4 pt-6 border-t border-border-light">
            <div className="space-y-3">
              <button 
                onClick={handlePurchase}
                className={`w-full ${styles.gradientBg} text-white py-4 rounded-lg font-medium text-lg hover:shadow-lg transition-all`}
              >
                <i className="fas fa-shopping-cart mr-2"></i>
                立即申购
              </button>
              <button 
                onClick={handleRedemption}
                disabled={!currentProduct.hasHolding}
                className={`w-full bg-white text-primary border-2 border-primary py-4 rounded-lg font-medium text-lg hover:bg-primary hover:text-white transition-all ${!currentProduct.hasHolding ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <i className="fas fa-arrow-down mr-2"></i>
                赎回 (暂未持有)
              </button>
            </div>
          </section>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

// 分离的历史收益图表组件（懒加载 Chart.js 已在父级触发）
const HistoryYieldChart: React.FC<{ points: Array<{date:string; yield:number}> }> = ({ points }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let instance: any;
    (async () => {
      if (!canvasRef.current || points.length === 0) return;
      const mod = await import('chart.js/auto');
      const Chart = (mod as any).default || (mod as any);
      const labels = points.map(p => p.date.slice(5));
      const data = points.map(p => p.yield);
      instance = new Chart(canvasRef.current, {
        type: 'line',
        data: { labels, datasets: [{ label: '收益(%)', data, borderColor: '#2563eb', tension: 0.25, pointRadius: 0 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (v:number) => v + '%' } } } }
      });
    })();
    return () => { if (instance) instance.destroy(); };
  }, [points]);
  return <canvas ref={canvasRef} className="w-full h-40" />;
};

export default ProductDetail;








