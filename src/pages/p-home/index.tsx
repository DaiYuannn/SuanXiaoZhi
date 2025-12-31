

import React, { useEffect, useRef, useState } from 'react';
import { useAuditReminder } from '../../hooks/useAuditReminder';
import { Link, useNavigate } from 'react-router-dom';
import styles from './styles.module.css';
import { useUserAndProgress } from '../../hooks/useUserAndProgress';
import { fetchDailyFlows } from '../../api/endpoints';
import type { TransactionFlow } from '../../api/types';
import { auditUI, auditError } from '../../analytics/audit';
import DynamicAlert, { DynamicAlertItem } from '../../components/DynamicAlert';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [activeTrendPeriod, setActiveTrendPeriod] = useState<'7d' | '30d' | '3m'>('7d');

  useEffect(() => {
    const originalTitle = document.title;
    document.title = '金智通 - 首页';
    return () => { document.title = originalTitle; };
  }, []);

  useEffect(() => {
    initializeChart();
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  const initializeChart = () => {
    if (!chartRef.current || chartInstanceRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['1/9', '1/10', '1/11', '1/12', '1/13', '1/14', '1/15'],
        datasets: [{
          label: '支出',
          data: [120, 190, 300, 250, 220, 350, 180],
          borderColor: '#969FFF',
          backgroundColor: 'rgba(150, 159, 255, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#969FFF',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 3,
          pointRadius: 6
        }, {
          label: '收入',
          data: [0, 0, 15680, 0, 0, 0, 0],
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#10B981',
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
              callback: function(value: any) {
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
  };

  const handleAddTransaction = () => {
    navigate('/add-transaction');
  };

  const handleViewAllTransactions = () => {
    navigate('/accounting');
  };

  // 保留占位：未来点击流水行可跳转详情

  const handleTrendPeriodChange = (period: '7d' | '30d' | '3m') => {
    setActiveTrendPeriod(period);
    // 这里可以更新图表数据
  };

  const handleQuickActionClick = (action: string) => {
    switch (action) {
      case 'add-transaction':
        navigate('/add-transaction');
        break;
      case 'consumption-analysis':
        navigate('/consumption-analysis');
        break;
      case 'financial-planning':
        navigate('/financial-planning');
        break;
      case 'financial-products':
        navigate('/financial-products');
        break;
      case 'bill-reminder':
        console.log('跳转到账单提醒功能');
        navigate('/accounting');
        break;
      case 'customer-service':
        navigate('/customer-service');
        break;
    }
  };

  const { loading: loadingProfile, profile, progress, error: profileError } = useUserAndProgress();
  const { settings: auditSettings, visible: auditReminderVisible, snooze: auditSnooze, markDone: auditMarkDone } = useAuditReminder();
  const [flows, setFlows] = useState<TransactionFlow[] | null>(null);
  const [flowsLoading, setFlowsLoading] = useState(false);
  const [flowsError, setFlowsError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<DynamicAlertItem[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0,10);
    setFlowsLoading(true);
    fetchDailyFlows(today)
      .then(res => {
        setFlows(res.data || []);
        auditUI('home_flows_load', { count: res.data?.length || 0 });
        // 演示动态预警：若检测到大额支出，给出提示
        const big = (res.data || []).find(f => f.amount < 0 && Math.abs(f.amount) > 5000);
        const items: DynamicAlertItem[] = [];
        if (big) {
          items.push({
            id: 'alert-big-expense',
            type: 'warning',
            title: '检测到大额支出',
            desc: `金额 ¥${Math.abs(big.amount).toFixed(2)} · 渠道 ${big.channel}`,
            actionText: '查看账单',
            onAction: () => window.location.assign('/accounting')
          });
        }
        setAlerts(items);
      })
      .catch(e => {
        const msg = e?.message || '加载流水失败';
        setFlowsError(msg);
        auditError('home_flows_error', e);
      })
      .finally(() => setFlowsLoading(false));
  }, []);

  return (
    <div className={styles.pageWrapper}>
      {/* 主内容区 */}
      <div className="p-6">
        {/* 页面头部 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-1">
                {loadingProfile ? '加载中…' : profile?.userId ? `欢迎回来，${profile.userId}` : '欢迎'}
              </h2>
              {profile && (
                <div className="flex items-center space-x-3 mt-1">
                  <span className="text-xs px-2 py-1 rounded-full bg-primary text-white">风险等级: {profile.riskLevel || '未知'}</span>
                  {profile.tags?.slice(0,3).map(t => (
                    <span key={t} className="text-xs px-2 py-1 rounded-full bg-accent text-white opacity-80">{t}</span>
                  ))}
                </div>
              )}
              {profileError && <p className="text-xs text-danger mt-1">画像加载失败：{profileError}</p>}
              <nav className="text-sm text-text-secondary">
                <span>首页</span>
              </nav>
            </div>
            <button onClick={handleAddTransaction} className={`${styles.gradientBg} text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all`}>
              <i className="fas fa-plus mr-2"></i>
              添加交易
            </button>
          </div>
        </div>

        {/* 动态预警 */}
        {alerts.length > 0 && (
          <section className="mb-4">
            <DynamicAlert items={alerts} />
          </section>
        )}

        {/* 记账校对提醒弹层（服务端化适配） */}
        {auditReminderVisible && (
          <section className="mb-4">
            <div className="rounded-xl p-4 border border-warning bg-warning bg-opacity-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-warning bg-opacity-20 rounded-lg flex items-center justify-center mt-1">
                  <i className="fas fa-bullseye text-warning"></i>
                </div>
                <div>
                  <h4 className="font-medium text-text-primary mb-1">记账校对提醒</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">请截取最近交易列表或分类视图，核对未分类、错误分类及异常金额。完成后点击“已校对”同步状态。</p>
                  <p className="text-[11px] text-text-secondary mt-1">频率（来源：{auditSettings.frequency === 'daily' ? '服务端/每日' : auditSettings.frequency === 'weekly' ? '服务端/每周' : '服务端/每月'}） · 目标时间 {auditSettings.hour}:00</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:justify-end">
                <button onClick={auditSnooze} className="px-3 py-2 text-xs rounded-lg border border-border-light hover:bg-gray-50 transition-colors" title="稍后再提醒（服务端或本地回退）">稍后提醒</button>
                <button onClick={auditMarkDone} className="px-3 py-2 text-xs rounded-lg bg-success text-white hover:opacity-90 transition-colors" title="标记本期已校对">已校对</button>
              </div>
            </div>
          </section>
        )}

        {/* 账户总览区 */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-text-primary mb-4">账户总览</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={`${styles.statCard} rounded-xl p-6`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${styles.gradientBg} rounded-lg flex items-center justify-center`}>
                  <i className="fas fa-wallet text-white text-xl"></i>
                </div>
                <span className="text-success text-sm font-medium">+5.2%</span>
              </div>
              <h4 className="text-2xl font-bold text-text-primary mb-1">¥128,560.00</h4>
              <p className="text-text-secondary text-sm">总资产</p>
            </div>
            
            <div className={`${styles.statCard} rounded-xl p-6`}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-warning bg-opacity-20 rounded-lg flex items-center justify-center">
                  <i className="fas fa-credit-card text-warning text-xl"></i>
                </div>
                <span className="text-danger text-sm font-medium">+2.1%</span>
              </div>
              <h4 className="text-2xl font-bold text-text-primary mb-1">¥25,320.00</h4>
              <p className="text-text-secondary text-sm">总负债</p>
            </div>
            
            <div className={`${styles.statCard} rounded-xl p-6`}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-success bg-opacity-20 rounded-lg flex items-center justify-center">
                  <i className="fas fa-chart-line text-success text-xl"></i>
                </div>
                <span className="text-success text-sm font-medium">+8.3%</span>
              </div>
              <h4 className="text-2xl font-bold text-text-primary mb-1">¥103,240.00</h4>
              <p className="text-text-secondary text-sm">净资产</p>
            </div>
            
            <div className={`${styles.statCard} rounded-xl p-6`}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-info bg-opacity-20 rounded-lg flex items-center justify-center">
                  <i className="fas fa-money-bill-wave text-info text-xl"></i>
                </div>
                <span className="text-success text-sm font-medium">+3.5%</span>
              </div>
              <h4 className="text-2xl font-bold text-text-primary mb-1">¥15,680.00</h4>
              <p className="text-text-secondary text-sm">本月收入</p>
            </div>
          </div>
        </section>

        {/* 内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* 消费趋势图表区 */}
          <section className="lg:col-span-2">
            <div className={`${styles.gradientCard} rounded-xl p-6 shadow-card`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-text-primary">消费趋势</h3>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleTrendPeriodChange('7d')}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      activeTrendPeriod === '7d' 
                        ? 'bg-primary text-white' 
                        : 'text-text-secondary hover:text-primary'
                    }`}
                  >
                    近7天
                  </button>
                  <button 
                    onClick={() => handleTrendPeriodChange('30d')}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      activeTrendPeriod === '30d' 
                        ? 'bg-primary text-white' 
                        : 'text-text-secondary hover:text-primary'
                    }`}
                  >
                    近30天
                  </button>
                  <button 
                    onClick={() => handleTrendPeriodChange('3m')}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      activeTrendPeriod === '3m' 
                        ? 'bg-primary text-white' 
                        : 'text-text-secondary hover:text-primary'
                    }`}
                  >
                    近3月
                  </button>
                </div>
              </div>
              <div className={styles.chartContainer}>
                <canvas ref={chartRef}></canvas>
              </div>
            </div>
          </section>

          {/* 待办事项/提醒区 & 规划进度 */}
          <section className="lg:col-span-1">
            <div className={`${styles.gradientCard} rounded-xl p-6 shadow-card`}>
              <h3 className="text-lg font-semibold text-text-primary mb-4">待办提醒</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-warning bg-opacity-10 rounded-lg">
                  <div className="w-2 h-2 bg-warning rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">信用卡还款</p>
                    <p className="text-xs text-text-secondary">招商银行信用卡，3天后到期</p>
                  </div>
                  <span className="text-xs text-warning font-medium">¥5,280</span>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-info bg-opacity-10 rounded-lg">
                  <div className="w-2 h-2 bg-info rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">理财产品到期</p>
                    <p className="text-xs text-text-secondary">稳健理财计划，1周后到期</p>
                  </div>
                  <span className="text-xs text-info font-medium">¥50,000</span>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-success bg-opacity-10 rounded-lg">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">工资到账</p>
                    <p className="text-xs text-text-secondary">预计明天到账</p>
                  </div>
                  <span className="text-xs text-success font-medium">+¥15,680</span>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-danger bg-opacity-10 rounded-lg">
                  <div className="w-2 h-2 bg-danger rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">异常交易提醒</p>
                    <p className="text-xs text-text-secondary">发现一笔大额支出</p>
                  </div>
                  <i className="fas fa-exclamation-triangle text-danger text-sm"></i>
                </div>
                <div className="pt-2 border-t border-border-light"></div>
                <h4 className="text-sm font-semibold text-text-primary">规划进度</h4>
                {progress?.slice(0,3).map(item => (
                  <div key={item.goalId} className="flex items-center justify-between py-2">
                    <span className="text-xs text-text-secondary">{item.goalId}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 h-2 bg-border-light rounded">
                        <div className="h-2 bg-primary rounded" style={{ width: `${Math.round(item.progress*100)}%` }}></div>
                      </div>
                      <span className="text-xs text-text-primary font-medium">{Math.round(item.progress*100)}%</span>
                    </div>
                  </div>
                ))}
                {!loadingProfile && !progress?.length && <p className="text-xs text-text-secondary">暂无进度数据</p>}
              </div>
            </div>
          </section>
        </div>

        {/* 最近交易记录区（接入T+1流水） */}
        <section className="mb-8">
          <div className={`${styles.gradientCard} rounded-xl p-6 shadow-card`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-text-primary">最近交易</h3>
              <button onClick={handleViewAllTransactions} className="text-primary text-sm font-medium hover:underline">查看全部</button>
            </div>
            <div className="overflow-x-auto">
              {flowsLoading && <div className="py-8 text-center text-text-secondary">加载中...</div>}
              {flowsError && <div className="py-8 text-center text-danger text-sm">{flowsError}</div>}
              {!flowsLoading && !flowsError && (
                flows && flows.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border-light">
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">时间</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">渠道</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">分类</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">金额</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flows.slice(0,5).map(f => (
                        <tr key={f.id} className={`${styles.transactionRow} border-b border-border-light transition-all`}>
                          <td className="py-3 px-4 text-sm text-text-primary">{new Date(f.time).toLocaleString()}</td>
                          <td className="py-3 px-4 text-sm text-text-secondary">{f.channel}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-info bg-opacity-20 text-info text-xs rounded-full">{f.category || '未知'}</span>
                          </td>
                          <td className={`py-3 px-4 text-sm font-medium ${f.amount >= 0 ? 'text-success' : 'text-danger'}`}>{f.amount >= 0 ? '+' : ''}¥{f.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <div className="py-8 text-center text-text-secondary text-sm">暂无今日流水</div>
              )}
            </div>
          </div>
        </section>

        {/* 快捷功能入口区 */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-text-primary mb-4">快捷功能</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div onClick={() => handleQuickActionClick('add-transaction')} className={`${styles.gradientCard} rounded-xl p-4 text-center shadow-card hover:shadow-card-hover transition-all cursor-pointer`}>
              <div className={`w-12 h-12 ${styles.gradientBg} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                <i className="fas fa-plus text-white text-xl"></i>
              </div>
              <p className="text-sm font-medium text-text-primary">添加交易</p>
            </div>
            
            <div onClick={() => handleQuickActionClick('consumption-analysis')} className={`${styles.gradientCard} rounded-xl p-4 text-center shadow-card hover:shadow-card-hover transition-all cursor-pointer`}>
              <div className="w-12 h-12 bg-success bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-chart-pie text-success text-xl"></i>
              </div>
              <p className="text-sm font-medium text-text-primary">消费分析</p>
            </div>
            
            <div onClick={() => handleQuickActionClick('financial-planning')} className={`${styles.gradientCard} rounded-xl p-4 text-center shadow-card hover:shadow-card-hover transition-all cursor-pointer`}>
              <div className="w-12 h-12 bg-warning bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-bullseye text-warning text-xl"></i>
              </div>
              <p className="text-sm font-medium text-text-primary">财务规划</p>
            </div>
            
            <div onClick={() => handleQuickActionClick('financial-products')} className={`${styles.gradientCard} rounded-xl p-4 text-center shadow-card hover:shadow-card-hover transition-all cursor-pointer`}>
              <div className="w-12 h-12 bg-info bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-coins text-info text-xl"></i>
              </div>
              <p className="text-sm font-medium text-text-primary">理财产品</p>
            </div>
            
            <div onClick={() => handleQuickActionClick('bill-reminder')} className={`${styles.gradientCard} rounded-xl p-4 text-center shadow-card hover:shadow-card-hover transition-all cursor-pointer`}>
              <div className="w-12 h-12 bg-secondary bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-file-invoice text-secondary text-xl"></i>
              </div>
              <p className="text-sm font-medium text-text-primary">账单提醒</p>
            </div>
            
            <div onClick={() => handleQuickActionClick('customer-service')} className={`${styles.gradientCard} rounded-xl p-4 text-center shadow-card hover:shadow-card-hover transition-all cursor-pointer`}>
              <div className="w-12 h-12 bg-accent bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-comments text-accent text-xl"></i>
              </div>
              <p className="text-sm font-medium text-text-primary">智能客服</p>
            </div>
            <div onClick={() => navigate('/bill-upload')} className={`${styles.gradientCard} rounded-xl p-4 text-center shadow-card hover:shadow-card-hover transition-all cursor-pointer`}>
              <div className="w-12 h-12 bg-secondary bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-file-upload text-secondary text-xl"></i>
              </div>
              <p className="text-sm font-medium text-text-primary">票据上传</p>
            </div>

            <div onClick={() => navigate('/family')} className={`${styles.gradientCard} rounded-xl p-4 text-center shadow-card hover:shadow-card-hover transition-all cursor-pointer`}>
              <div className="w-12 h-12 bg-primary bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-users text-primary text-xl"></i>
              </div>
              <p className="text-sm font-medium text-text-primary">家庭中心</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;

