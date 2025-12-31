

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import styles from './styles.module.css';
import { fetchConsumptionSummary, fetchAnalysisInsights } from '../../api/endpoints';
import ComplianceNotice from '../../components/ComplianceNotice';
import type { ConsumptionSummary, AnalysisInsights } from '../../api/types';

Chart.register(...registerables);

const ConsumptionAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [summary, setSummary] = useState<ConsumptionSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [degraded, setDegraded] = useState<boolean>(false);
  const [insights, setInsights] = useState<AnalysisInsights | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  
  const spendingTrendChartRef = useRef<HTMLCanvasElement>(null);
  const categoryChartRef = useRef<HTMLCanvasElement>(null);
  const frequencyChartRef = useRef<HTMLCanvasElement>(null);
  
  const spendingTrendChartInstanceRef = useRef<Chart | null>(null);
  const categoryChartInstanceRef = useRef<Chart | null>(null);
  const frequencyChartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    const originalTitle = document.title;
    document.title = '金智通 - 消费分析';
    return () => { document.title = originalTitle; };
  }, []);

  useEffect(() => {
    initializeCharts();
    loadSummary('7d');
    loadInsights('7d');
    
    return () => {
      if (spendingTrendChartInstanceRef.current) {
        spendingTrendChartInstanceRef.current.destroy();
        spendingTrendChartInstanceRef.current = null;
      }
      if (categoryChartInstanceRef.current) {
        categoryChartInstanceRef.current.destroy();
        categoryChartInstanceRef.current = null;
      }
      if (frequencyChartInstanceRef.current) {
        frequencyChartInstanceRef.current.destroy();
        frequencyChartInstanceRef.current = null;
      }
    };
  }, []);
  
  // 时间范围变化时重新加载
  useEffect(() => {
    loadSummary(selectedTimeRange);
    loadInsights(selectedTimeRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimeRange]);

  const initializeCharts = () => {
    // 消费趋势图表
    if (spendingTrendChartRef.current) {
      const trendCtx = spendingTrendChartRef.current.getContext('2d');
      if (trendCtx) {
        spendingTrendChartInstanceRef.current = new Chart(trendCtx, {
          type: 'line',
          data: {
            labels: [],
            datasets: [{
              label: '支出',
              data: [],
              borderColor: '#EF4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#EF4444',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 3,
              pointRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  usePointStyle: true,
                  padding: 20
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                  callback: function(value) {
                    return '¥' + value.toLocaleString();
                  }
                }
              },
              x: {
                grid: {
                  display: false
                }
              }
            },
            elements: {
              point: {
                hoverRadius: 8
              }
            }
          }
        });
      }
    }

    // 消费品类偏好饼图
    if (categoryChartRef.current) {
      const categoryCtx = categoryChartRef.current.getContext('2d');
      if (categoryCtx) {
        categoryChartInstanceRef.current = new Chart(categoryCtx, {
          type: 'doughnut',
          data: {
            labels: [],
            datasets: [{
              data: [],
              backgroundColor: [
                '#F59E0B',
                '#3B82F6',
                '#3E3987',
                '#5147FF',
                '#10B981'
              ],
              borderWidth: 0,
              // @ts-ignore: Chart.js v4 doughnut dataset 支持 cutout，但类型缺失
              cutout: '60%'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            }
          }
        });
      }
    }

    // 消费频次柱状图
    if (frequencyChartRef.current) {
      const frequencyCtx = frequencyChartRef.current.getContext('2d');
      if (frequencyCtx) {
        frequencyChartInstanceRef.current = new Chart(frequencyCtx, {
          type: 'bar',
          data: {
            labels: [],
            datasets: [{
              label: '每周频次',
              data: [],
              backgroundColor: '#969FFF',
              borderRadius: 4,
              borderSkipped: false
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: 'rgba(0, 0, 0, 0.05)'
                }
              },
              x: {
                grid: {
                  display: false
                }
              }
            }
          }
        });
      }
    }
  };

  const buildRange = (key: string) => {
    const to = new Date();
    const from = new Date(to);
    if (key === '7d') from.setDate(to.getDate() - 6);
    else if (key === '30d') from.setDate(to.getDate() - 29);
    else if (key === '3m') from.setMonth(to.getMonth() - 2);
    else if (key === '1y') from.setFullYear(to.getFullYear() - 1);
    return { from: from.toISOString(), to: to.toISOString() };
  };

  const mockSummary = (): ConsumptionSummary => ({
    byCategory: [
      { category: '餐饮', amount: 352000, count: 28 },
      { category: '购物', amount: 281000, count: 18 },
      { category: '交通', amount: 157000, count: 22 },
      { category: '娱乐', amount: 123000, count: 6 },
      { category: '其他', amount: 87000, count: 9 },
    ],
    trend: Array.from({length: 7}).map((_,i) => {
      const d = new Date(); d.setDate(d.getDate() - (6-i));
      return { date: d.toISOString().slice(0,10), amount: [12000,19000,30000,25000,22000,35000,18000][i] };
    }),
    frequency: [
      { category: '餐饮', count: 15 },
      { category: '购物', count: 8 },
      { category: '交通', count: 12 },
      { category: '娱乐', count: 3 },
    ]
  });

  const updateChartsFrom = (sum: ConsumptionSummary) => {
    // 趋势
    if (spendingTrendChartInstanceRef.current) {
      const labels = sum.trend.map(p => {
        const d = new Date(p.date);
        return `${d.getMonth()+1}/${d.getDate()}`;
      });
      const data = sum.trend.map(p => (p.amount || 0) / 100);
      spendingTrendChartInstanceRef.current.data.labels = labels as any;
      spendingTrendChartInstanceRef.current.data.datasets[0].data = data as any;
      spendingTrendChartInstanceRef.current.update();
    }

    // 品类
    if (categoryChartInstanceRef.current) {
      const labels = sum.byCategory.map(c => c.category);
      const amounts = sum.byCategory.map(c => (c.amount || 0) / 100);
      categoryChartInstanceRef.current.data.labels = labels as any;
      categoryChartInstanceRef.current.data.datasets[0].data = amounts as any;
      categoryChartInstanceRef.current.update();
    }

    // 频次
    if (frequencyChartInstanceRef.current) {
      const labels = sum.frequency.map(f => f.category);
      const counts = sum.frequency.map(f => f.count);
      frequencyChartInstanceRef.current.data.labels = labels as any;
      frequencyChartInstanceRef.current.data.datasets[0].data = counts as any;
      frequencyChartInstanceRef.current.update();
    }
  };

  const loadSummary = async (rangeKey: string) => {
    setLoading(true);
    try {
      const range = buildRange(rangeKey);
      const res = await fetchConsumptionSummary(range);
      const data = (res as any)?.data as ConsumptionSummary;
      if (data && Array.isArray(data.byCategory)) {
        setSummary(data);
        setDegraded(false);
        updateChartsFrom(data);
      } else {
        throw new Error('invalid summary');
      }
    } catch {
      const m = mockSummary();
      setSummary(m);
      setDegraded(true);
      updateChartsFrom(m);
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async (rangeKey: string) => {
    try {
      const range = buildRange(rangeKey);
      const r = await fetchAnalysisInsights(range);
      setInsights(r.data);
      setInsightsError(null);
    } catch (e: any) {
      setInsights(null);
      setInsightsError(e?.message || '洞察获取失败，已隐藏');
    }
  };

  const handleTimeRangeChange = (timeRange: string) => {
    setSelectedTimeRange(timeRange);
    console.log('切换时间范围:', timeRange);
  };

  const handleExportReport = () => {
    console.log('导出消费分析报告');
    alert('报告正在生成中，请稍候...');
  };

  const handleViewFullProfile = () => {
    navigate('/user-settings');
  };

  const handleUserTagClick = (tagText: string) => {
    console.log('点击用户标签:', tagText);
    navigate('/user-settings');
  };

  // 服务端洞察：优先显示后端返回；失败则隐藏本区块

  return (
    <div className={styles.pageWrapper}>
      <div className="p-6">
        {/* 页面头部 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-1">消费分析</h2>
              <nav className="text-sm text-text-secondary">
                <span>首页</span>
                <i className="fas fa-chevron-right mx-2"></i>
                <span>消费分析</span>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleTimeRangeChange('7d')}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    selectedTimeRange === '7d' 
                      ? 'bg-primary text-white' 
                      : 'text-text-secondary hover:text-primary'
                  }`}
                >
                  近7天
                </button>
                <button 
                  onClick={() => handleTimeRangeChange('30d')}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    selectedTimeRange === '30d' 
                      ? 'bg-primary text-white' 
                      : 'text-text-secondary hover:text-primary'
                  }`}
                >
                  近30天
                </button>
                <button 
                  onClick={() => handleTimeRangeChange('3m')}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    selectedTimeRange === '3m' 
                      ? 'bg-primary text-white' 
                      : 'text-text-secondary hover:text-primary'
                  }`}
                >
                  近3月
                </button>
                <button 
                  onClick={() => handleTimeRangeChange('1y')}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    selectedTimeRange === '1y' 
                      ? 'bg-primary text-white' 
                      : 'text-text-secondary hover:text-primary'
                  }`}
                >
                  近1年
                </button>
              </div>
              <button 
                onClick={handleExportReport}
                className="px-4 py-2 bg-white border border-border-light text-text-primary rounded-lg hover:shadow-lg transition-all"
              >
                <i className="fas fa-download mr-2"></i>
                导出报告
              </button>
            </div>
          </div>
        </div>

        {/* 消费趋势图表区 */}
        <section className="mb-8">
          <div className={`${styles.gradientCard} rounded-xl p-6 shadow-card`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-text-primary">消费趋势</h3>
              {loading && <span className="text-xs text-text-secondary">加载中…</span>}
            </div>
            <div className={styles.chartContainer}>
              <canvas ref={spendingTrendChartRef}></canvas>
            </div>
            <div className="grid grid-cols-3 gap-6 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-danger mb-1">¥1,280</div>
                <div className="text-sm text-text-secondary">总支出</div>
                <div className="text-xs text-danger mt-1">较上期 +12.5%</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success mb-1">¥15,680</div>
                <div className="text-sm text-text-secondary">总收入</div>
                <div className="text-xs text-success mt-1">较上期 +3.5%</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">¥14,400</div>
                <div className="text-sm text-text-secondary">净收入</div>
                <div className="text-xs text-success mt-1">较上期 +2.1%</div>
              </div>
            </div>
          </div>
        </section>

        {/* 内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 消费品类偏好区 */}
          <section>
            <div className={`${styles.gradientCard} rounded-xl p-6 shadow-card`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-text-primary">消费品类偏好</h3>
                {degraded && <span className="text-[11px] text-warning">已使用示例数据</span>}
              </div>
              <div className={styles.chartContainerSm}>
                <canvas ref={categoryChartRef}></canvas>
              </div>
              {/* 动态分类占比列表（Top 6） */}
              <div className="mt-4 space-y-3">
                {(summary?.byCategory || []).slice(0,6).map((c, idx) => (
                  <div key={c.category + idx} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: ['#F59E0B','#3B82F6','#3E3987','#5147FF','#10B981','#969FFF'][idx % 6]}}></div>
                      <span className="text-sm text-text-primary">{c.category}</span>
                    </div>
                    <span className="text-sm font-medium text-text-primary">¥{((c.amount||0)/100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 消费频次分析区 */}
          <section>
            <div className={`${styles.gradientCard} rounded-xl p-6 shadow-card`}>
              <h3 className="text-lg font-semibold text-text-primary mb-6">消费频次分析</h3>
              <div className={styles.chartContainerSm}>
                <canvas ref={frequencyChartRef}></canvas>
              </div>
              {/* 动态频次列表（Top 6） */}
              <div className="mt-4 space-y-3">
                {(summary?.frequency || []).slice(0,6).map((f, idx) => (
                  <div key={f.category + idx} className="flex items-center justify-between">
                    <span className="text-sm text-text-primary">{f.category}</span>
                    <span className="text-sm font-medium text-text-primary">{f.count}次/期</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* 智能解读 */}
        <section className="mb-8">
          <div className={`${styles.gradientCard} rounded-xl p-6 shadow-card`}>
            <h3 className="text-lg font-semibold text-text-primary mb-6">智能解读</h3>
            {!insights && insightsError && (
              <div className="text-xs text-warning">{insightsError}</div>
            )}
            {insights && (
              <div className="space-y-3">
                <ul className="list-disc pl-5 space-y-2">
                  {insights.summary.map((s, i) => (
                    <li key={i} className="text-sm text-text-secondary">{s}</li>
                  ))}
                </ul>
                <div className="p-3 rounded bg-primary/5 border border-primary/20">
                  <div className="text-xs text-text-secondary mb-1">建议</div>
                  <div className="text-sm text-text-primary">{insights.recommendation}</div>
                </div>
              </div>
            )}
            <div className="mt-2"><ComplianceNotice variant="ai" /></div>
          </div>
        </section>

        {/* 用户画像概览区 */}
        <section className="mb-8">
          <div className={`${styles.gradientCard} rounded-xl p-6 shadow-card`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-text-primary">用户画像概览</h3>
              <button 
                onClick={handleViewFullProfile}
                className="text-primary text-sm font-medium hover:underline"
              >
                查看完整画像 <i className="fas fa-arrow-right ml-1"></i>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className={`w-16 h-16 ${styles.gradientBg} rounded-full flex items-center justify-center mx-auto mb-3`}>
                  <i className="fas fa-user text-white text-2xl"></i>
                </div>
                <h4 className="font-medium text-text-primary mb-1">消费能力</h4>
                <p className="text-lg font-bold text-primary">中等偏上</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-success bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-shield-alt text-success text-2xl"></i>
                </div>
                <h4 className="font-medium text-text-primary mb-1">风险偏好</h4>
                <p className="text-lg font-bold text-success">稳健型</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-warning bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-clock text-warning text-2xl"></i>
                </div>
                <h4 className="font-medium text-text-primary mb-1">消费习惯</h4>
                <p className="text-lg font-bold text-warning">规律理性</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-info bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-chart-line text-info text-2xl"></i>
                </div>
                <h4 className="font-medium text-text-primary mb-1">储蓄倾向</h4>
                <p className="text-lg font-bold text-info">较高</p>
              </div>
            </div>
            <div className="mt-6">
              <h4 className="font-medium text-text-primary mb-3">核心标签</h4>
              <div className="flex flex-wrap gap-2">
                <span 
                  onClick={() => handleUserTagClick('白领阶层')}
                  className={`${styles.userTag} px-3 py-1 text-sm rounded-full cursor-pointer`}
                >
                  白领阶层
                </span>
                <span 
                  onClick={() => handleUserTagClick('品质生活追求者')}
                  className={`${styles.userTag} px-3 py-1 text-sm rounded-full cursor-pointer`}
                >
                  品质生活追求者
                </span>
                <span 
                  onClick={() => handleUserTagClick('理性消费者')}
                  className={`${styles.userTag} px-3 py-1 text-sm rounded-full cursor-pointer`}
                >
                  理性消费者
                </span>
                <span 
                  onClick={() => handleUserTagClick('稳健投资者')}
                  className={`${styles.userTag} px-3 py-1 text-sm rounded-full cursor-pointer`}
                >
                  稳健投资者
                </span>
                <span 
                  onClick={() => handleUserTagClick('健康生活方式')}
                  className={`${styles.userTag} px-3 py-1 text-sm rounded-full cursor-pointer`}
                >
                  健康生活方式
                </span>
                <span 
                  onClick={() => handleUserTagClick('科技产品爱好者')}
                  className={`${styles.userTag} px-3 py-1 text-sm rounded-full cursor-pointer`}
                >
                  科技产品爱好者
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ConsumptionAnalysisPage;

