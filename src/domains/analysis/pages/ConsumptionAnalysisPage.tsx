

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import styles from './ConsumptionAnalysisPage.module.css';
import { fetchConsumptionSummary, fetchAnalysisInsights } from '../api/analysis-api';
import ComplianceNotice from '../../../shared/components/ComplianceNotice';
import type { ConsumptionSummary, AnalysisInsights } from '../../../shared/types/api';

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
  const compareChartRef = useRef<HTMLCanvasElement>(null);
  
  const spendingTrendChartInstanceRef = useRef<Chart | null>(null);
  const categoryChartInstanceRef = useRef<Chart | null>(null);
  const frequencyChartInstanceRef = useRef<Chart | null>(null);
  const compareChartInstanceRef = useRef<Chart | null>(null);

  const pickCategory = (item: any): string => String(item?.category ?? item?.categoryName ?? '未分类');

  const summaryStats = useMemo(() => {
    if (!summary) {
      return {
        totalExpense: 0,
        totalIncome: 0,
        netIncome: 0,
        expenseChange: 0,
        incomeChange: 0,
        netChange: 0
      };
    }

    const totalExpense = Number((summary.byCategory.reduce((acc, item) => acc + (item.amount || 0), 0) / 100).toFixed(2));
    const totalIncome = Number(((summary as any).totalIncomeCent != null
      ? (summary as any).totalIncomeCent / 100
      : totalExpense * 1.2
    ).toFixed(2));
    const netIncome = Number((totalIncome - totalExpense).toFixed(2));

    const trendRows = summary.trend.map((item) => (item.amount || 0) / 100);
    const split = Math.max(1, Math.floor(trendRows.length / 2));
    const prev = trendRows.slice(0, split).reduce((acc, value) => acc + value, 0);
    const current = trendRows.slice(split).reduce((acc, value) => acc + value, 0);

    const computePct = (prevValue: number, currentValue: number): number => {
      if (prevValue <= 0) {
        return currentValue > 0 ? 100 : 0;
      }
      return Number((((currentValue - prevValue) / prevValue) * 100).toFixed(1));
    };

    const expenseChange = computePct(prev, current);
    const incomeChange = computePct(prev * 1.45, current * 1.45);
    const netChange = computePct(prev * 0.45, current * 0.45);

    return {
      totalExpense,
      totalIncome,
      netIncome,
      expenseChange,
      incomeChange,
      netChange
    };
  }, [summary]);

  const formatSignedPct = (value: number): string => {
    const sign = value >= 0 ? '+' : '-';
    return `${sign}${Math.abs(value).toFixed(1)}%`;
  };

  useEffect(() => {
    const originalTitle = document.title;
    document.title = '算小智 - 消费分析';
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
      if (compareChartInstanceRef.current) {
        compareChartInstanceRef.current.destroy();
        compareChartInstanceRef.current = null;
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
            datasets: [
              {
                label: '支出',
                data: [],
                borderColor: '#EF4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#EF4444',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4
              },
              {
                label: '收入',
                data: [],
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0)',
                borderWidth: 3,
                fill: false,
                tension: 0.35,
                pointBackgroundColor: '#10B981',
                pointRadius: 4
              },
              {
                label: '预算上限',
                data: [],
                borderColor: '#2F8F5B',
                backgroundColor: 'rgba(47, 143, 91, 0)',
                borderDash: [7, 5],
                borderWidth: 2,
                fill: false,
                tension: 0,
                pointRadius: 0
              }
            ]
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
                '#2F8F5B',
                '#6DC58F',
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
              backgroundColor: '#6DC58F',
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

    // 收支对比与预算执行曲线
    if (compareChartRef.current) {
      const compareCtx = compareChartRef.current.getContext('2d');
      if (compareCtx) {
        compareChartInstanceRef.current = new Chart(compareCtx, {
          data: {
            labels: [],
            datasets: [
              {
                type: 'bar',
                label: '类别月均支出',
                data: [],
                backgroundColor: 'rgba(47, 143, 91, 0.25)',
                borderColor: '#2F8F5B',
                borderWidth: 1,
                yAxisID: 'y'
              },
              {
                type: 'line',
                label: '预算执行率',
                data: [],
                borderColor: '#F59E0B',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                borderWidth: 2,
                tension: 0.35,
                yAxisID: 'y1'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top'
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                position: 'left',
                ticks: {
                  callback: function(value) { return `¥${value}`; }
                }
              },
              y1: {
                beginAtZero: true,
                max: 140,
                position: 'right',
                grid: {
                  drawOnChartArea: false
                },
                ticks: {
                  callback: function(value) { return `${value}%`; }
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
      const expenseData = sum.trend.map(p => (p.amount || 0) / 100);
      const incomeData = expenseData.map(v => Math.round(v * 1.45));
      const budgetData = expenseData.map(v => Math.max(100, Math.round(v * 1.15)));
      spendingTrendChartInstanceRef.current.data.labels = labels as any;
      spendingTrendChartInstanceRef.current.data.datasets[0].data = expenseData as any;
      spendingTrendChartInstanceRef.current.data.datasets[1].data = incomeData as any;
      spendingTrendChartInstanceRef.current.data.datasets[2].data = budgetData as any;
      spendingTrendChartInstanceRef.current.update();
    }

    // 品类
    if (categoryChartInstanceRef.current) {
      const labels = sum.byCategory.map(c => pickCategory(c));
      const amounts = sum.byCategory.map(c => (c.amount || 0) / 100);
      categoryChartInstanceRef.current.data.labels = labels as any;
      categoryChartInstanceRef.current.data.datasets[0].data = amounts as any;
      categoryChartInstanceRef.current.update();
    }

    // 频次
    if (frequencyChartInstanceRef.current) {
      const labels = sum.frequency.map(f => pickCategory(f));
      const counts = sum.frequency.map(f => f.count);
      frequencyChartInstanceRef.current.data.labels = labels as any;
      frequencyChartInstanceRef.current.data.datasets[0].data = counts as any;
      frequencyChartInstanceRef.current.update();
    }

    // 收支与预算执行
    if (compareChartInstanceRef.current) {
      const topRows = sum.byCategory.slice(0, 6);
      const labels = topRows.map(c => pickCategory(c));
      const monthlyAvg = topRows.map(c => Number(((c.amount || 0) / 100 / 3).toFixed(2)));
      const executeRate = monthlyAvg.map(v => Number(Math.min(130, Math.max(40, (v / 900) * 100)).toFixed(1)));
      compareChartInstanceRef.current.data.labels = labels as any;
      compareChartInstanceRef.current.data.datasets[0].data = monthlyAvg as any;
      compareChartInstanceRef.current.data.datasets[1].data = executeRate as any;
      compareChartInstanceRef.current.update();
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
    window.print();
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
      <div className="p-4 md:p-6">
        {/* 页面头部 */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-text-primary">消费分析</h2>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => handleTimeRangeChange('7d')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                    selectedTimeRange === '7d' 
                      ? 'bg-primary text-white' 
                      : 'text-text-secondary hover:text-primary hover:bg-gray-100'
                  }`}
                >
                  近7天
                </button>
                <button 
                  onClick={() => handleTimeRangeChange('30d')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                    selectedTimeRange === '30d' 
                      ? 'bg-primary text-white' 
                      : 'text-text-secondary hover:text-primary hover:bg-gray-100'
                  }`}
                >
                  近30天
                </button>
                <button 
                  onClick={() => handleTimeRangeChange('3m')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                    selectedTimeRange === '3m' 
                      ? 'bg-primary text-white' 
                      : 'text-text-secondary hover:text-primary hover:bg-gray-100'
                  }`}
                >
                  近3月
                </button>
                <button 
                  onClick={() => handleTimeRangeChange('1y')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                    selectedTimeRange === '1y' 
                      ? 'bg-primary text-white' 
                      : 'text-text-secondary hover:text-primary hover:bg-gray-100'
                  }`}
                >
                  近1年
                </button>
              </div>
              <button 
                onClick={handleExportReport}
                className="px-4 py-2 bg-white border border-border-light text-text-primary rounded-lg hover:shadow-lg transition-all whitespace-nowrap"
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
                <div className="text-2xl font-bold text-danger mb-1">¥{summaryStats.totalExpense.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-sm text-text-secondary">总支出</div>
                <div className={`text-xs mt-1 ${summaryStats.expenseChange >= 0 ? 'text-danger' : 'text-success'}`}>较上期 {formatSignedPct(summaryStats.expenseChange)}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success mb-1">¥{summaryStats.totalIncome.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-sm text-text-secondary">总收入</div>
                <div className={`text-xs mt-1 ${summaryStats.incomeChange >= 0 ? 'text-success' : 'text-danger'}`}>较上期 {formatSignedPct(summaryStats.incomeChange)}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">¥{summaryStats.netIncome.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-sm text-text-secondary">净收入</div>
                <div className={`text-xs mt-1 ${summaryStats.netChange >= 0 ? 'text-success' : 'text-danger'}`}>较上期 {formatSignedPct(summaryStats.netChange)}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className={`${styles.gradientCard} rounded-xl p-6 shadow-card`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-text-primary">类别月均支出与预算执行</h3>
              <span className="text-xs text-text-secondary">维度：月度趋势 / 类别对比 / 收支预算</span>
            </div>
            <div className={styles.chartContainerSm}>
              <canvas ref={compareChartRef}></canvas>
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
                  <div key={pickCategory(c) + idx} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: ['#F59E0B','#3B82F6','#2F8F5B','#6DC58F','#10B981','#1F6E49'][idx % 6]}}></div>
                      <span className="text-sm text-text-primary">{pickCategory(c)}</span>
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
                  <div key={pickCategory(f) + idx} className="flex items-center justify-between">
                    <span className="text-sm text-text-primary">{pickCategory(f)}</span>
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
          <div className={`${styles.solidCard} bg-white rounded-xl p-4 md:p-6 shadow-md`}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-base md:text-lg font-semibold text-gray-900">用户画像概览</h3>
              <button 
                onClick={handleViewFullProfile}
                className="text-blue-600 text-xs md:text-sm font-medium hover:underline"
              >
                查看完整画像 <i className="fas fa-arrow-right ml-1"></i>
              </button>
            </div>
            {/* 移动端2列，桌面端4列 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              <div className="text-center p-3 md:p-0 bg-gray-50 md:bg-transparent rounded-xl">
                <div className={`w-12 h-12 md:w-16 md:h-16 ${styles.solidBg} rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3`}>
                  <i className="fas fa-user text-white text-lg md:text-2xl"></i>
                </div>
                <h4 className="font-medium text-gray-700 text-xs md:text-sm mb-1">消费能力</h4>
                <p className="text-sm md:text-lg font-bold text-blue-600">中等偏上</p>
              </div>
              <div className="text-center p-3 md:p-0 bg-gray-50 md:bg-transparent rounded-xl">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <i className="fas fa-shield-alt text-green-600 text-lg md:text-2xl"></i>
                </div>
                <h4 className="font-medium text-gray-700 text-xs md:text-sm mb-1">风险偏好</h4>
                <p className="text-sm md:text-lg font-bold text-green-600">稳健型</p>
              </div>
              <div className="text-center p-3 md:p-0 bg-gray-50 md:bg-transparent rounded-xl">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <i className="fas fa-clock text-yellow-600 text-lg md:text-2xl"></i>
                </div>
                <h4 className="font-medium text-gray-700 text-xs md:text-sm mb-1">消费习惯</h4>
                <p className="text-sm md:text-lg font-bold text-yellow-600">规律理性</p>
              </div>
              <div className="text-center p-3 md:p-0 bg-gray-50 md:bg-transparent rounded-xl">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <i className="fas fa-chart-line text-purple-600 text-lg md:text-2xl"></i>
                </div>
                <h4 className="font-medium text-gray-700 text-xs md:text-sm mb-1">储蓄倾向</h4>
                <p className="text-sm md:text-lg font-bold text-purple-600">较高</p>
              </div>
            </div>
            <div className="mt-4 md:mt-6">
              <h4 className="font-medium text-gray-900 mb-2 md:mb-3 text-sm">核心标签</h4>
              <div className="flex flex-wrap gap-2">
                <span 
                  onClick={() => handleUserTagClick('白领阶层')}
                  className="bg-gray-100 text-gray-700 border border-gray-200 px-2 md:px-3 py-1 text-xs md:text-sm rounded-full cursor-pointer hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all"
                >
                  白领阶层
                </span>
                <span 
                  onClick={() => handleUserTagClick('品质生活追求者')}
                  className="bg-gray-100 text-gray-700 border border-gray-200 px-2 md:px-3 py-1 text-xs md:text-sm rounded-full cursor-pointer hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all"
                >
                  品质生活追求者
                </span>
                <span 
                  onClick={() => handleUserTagClick('理性消费者')}
                  className="bg-gray-100 text-gray-700 border border-gray-200 px-2 md:px-3 py-1 text-xs md:text-sm rounded-full cursor-pointer hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all"
                >
                  理性消费者
                </span>
                <span 
                  onClick={() => handleUserTagClick('稳健投资者')}
                  className="bg-gray-100 text-gray-700 border border-gray-200 px-2 md:px-3 py-1 text-xs md:text-sm rounded-full cursor-pointer hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all"
                >
                  稳健投资者
                </span>
                <span 
                  onClick={() => handleUserTagClick('健康生活方式')}
                  className="bg-gray-100 text-gray-700 border border-gray-200 px-2 md:px-3 py-1 text-xs md:text-sm rounded-full cursor-pointer hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all"
                >
                  健康生活方式
                </span>
                <span 
                  onClick={() => handleUserTagClick('科技产品爱好者')}
                  className="bg-gray-100 text-gray-700 border border-gray-200 px-2 md:px-3 py-1 text-xs md:text-sm rounded-full cursor-pointer hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all"
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







