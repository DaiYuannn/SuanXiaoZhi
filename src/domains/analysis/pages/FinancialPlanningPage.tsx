

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './FinancialPlanningPage.module.css';
import DualAxisProgress from '../../../shared/components/DualAxisProgress';
import KeywordAnchors from '../../../shared/components/KeywordAnchors';
import { createPlan, generatePlans } from '../api/analysis-api';
import { fetchPlans, updatePlan, deletePlan } from '../../../shared/constants/endpoints';
import ComplianceNotice from '../../../shared/components/ComplianceNotice';
import type { PlanItem } from '../../../shared/types/api';

interface PlanDetail {
  title: string;
  target: string;
  current: string;
  progress: number;
  description: string;
  steps: Array<{
    title: string;
    status: string;
  }>;
}

const FinancialPlanningPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showPlanDetail, setShowPlanDetail] = useState<boolean>(false);

  // 服务端规划列表
  const [serverPlans, setServerPlans] = useState<PlanItem[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);

  // 编辑弹窗
  const [editModal, setEditModal] = useState<{ open: boolean; plan?: PlanItem }>({ open: false });
  const [editName, setEditName] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editStatus, setEditStatus] = useState<PlanItem['status']>('ongoing');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    loadServerPlans();
  }, []);

  const loadServerPlans = async () => {
    setPlansLoading(true);
    try {
      const res = await fetchPlans();
      setServerPlans(res.data || []);
    } catch {
      // 静默失败，显示本地静态数据
    } finally {
      setPlansLoading(false);
    }
  };

  const openEditModal = (plan: PlanItem) => {
    setEditName(plan.name);
    setEditGoal(plan.goal || '');
    setEditStatus(plan.status);
    setEditModal({ open: true, plan });
  };

  const handleSaveEdit = async () => {
    if (!editModal.plan) return;
    setEditSaving(true);
    try {
      await updatePlan(editModal.plan.planId, { name: editName, goal: editGoal, status: editStatus });
      setEditModal({ open: false });
      await loadServerPlans();
    } catch (e: any) {
      alert('保存失败：' + (e?.message || '未知错误'));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteServerPlan = async (planId: string) => {
    if (!confirm('确定要删除这个规划方案吗？')) return;
    try {
      await deletePlan(planId);
      await loadServerPlans();
    } catch (e: any) {
      alert('删除失败：' + (e?.message || '未知错误'));
    }
  };

  // 生成规划（服务端）
  const [genTarget, setGenTarget] = useState<string>('一年存下 2 万');
  const [genBudget, setGenBudget] = useState<string>('5000');
  const [genDeadline, setGenDeadline] = useState<string>('2025-12-31');
  const [genConstraints, setGenConstraints] = useState<string>('房租固定,不加班');
  const [genLoading, setGenLoading] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genPlans, setGenPlans] = useState<Array<{ name: string; rationale?: string; steps: string[]; checkpoints: string[] }> | null>(null);

  // 控支建议（本地占位）
  interface SpendSuggestion {
    id: string;
    title: string;
    desc: string;
    estimatedMonthlySave: number; // 预估可节省金额
    actions: string[]; // 可执行细项
  }
  const suggestions: SpendSuggestion[] = [
    {
      id: 'ctrl-dining-out',
      title: '减少外出就餐频次',
      desc: '将每周外出就餐 4 次减少到 2 次，并提前规划健康餐食。',
      estimatedMonthlySave: 600,
      actions: ['设定每周最多外食 2 次', '提前采购食材', '使用餐前计划模板']
    },
    {
      id: 'ctrl-subscriptions',
      title: '清理低使用率订阅',
      desc: '盘点视频/知识付费/软件会员，取消最近 30 天使用次数 ≤1 的订阅。',
      estimatedMonthlySave: 120,
      actions: ['导出订阅列表', '标记使用频次', '执行取消操作', '设置复盘提醒']
    },
    {
      id: 'ctrl-grocery-budget',
      title: '设定周度生鲜支出上限',
      desc: '以过去 3 个月平均值为基准，设定每周生鲜预算并记录异常。',
      estimatedMonthlySave: 300,
      actions: ['计算 3 个月平均', '设定上限值', '每次购物后录入', '异常支出标记原因']
    },
    {
      id: 'ctrl-transport-opt',
      title: '通勤方式优化',
      desc: '将高峰期打车改为公交 + 骑行组合，或使用优惠券批量购票。',
      estimatedMonthlySave: 200,
      actions: ['统计最近 4 周打车次数', '筛选可替代路线', '创建公交+骑行组合', '跟踪节省金额']
    }
  ];

  interface LocalPlan { goalId: string; progress: number; updatedAt: string }
  const LOCAL_PLANS_KEY = 'appliedPlans';
  function loadLocalPlans(): LocalPlan[] {
    try { const raw = localStorage.getItem(LOCAL_PLANS_KEY); if (raw) return JSON.parse(raw); } catch {}
    return [];
  }
  function saveLocalPlans(list: LocalPlan[]) {
    try { localStorage.setItem(LOCAL_PLANS_KEY, JSON.stringify(list)); } catch {}
  }
  const [localPlans, setLocalPlans] = useState<LocalPlan[]>(loadLocalPlans);
  const appliedMap = new Map(localPlans.map(p => [p.goalId, p]));

  function handleApplySuggestion(id: string) {
    if (appliedMap.has(id)) return;
    const next = [...localPlans, { goalId: id, progress: 0, updatedAt: new Date().toISOString() }];
    saveLocalPlans(next);
    setLocalPlans(next);
  }

  function handleRecordExecution(id: string) {
    const next = localPlans.map(p => {
      if (p.goalId === id) {
        const newProgress = Math.min(1, +(p.progress + 0.1).toFixed(2));
        return { ...p, progress: newProgress, updatedAt: new Date().toISOString() };
      }
      return p;
    });
    saveLocalPlans(next);
    setLocalPlans(next);
  }

  function handleStopSuggestion(id: string) {
    const next = localPlans.filter(p => p.goalId !== id);
    saveLocalPlans(next);
    setLocalPlans(next);
  }

  useEffect(() => {
    const originalTitle = document.title;
    document.title = '算小智 - 财务规划';
    return () => { document.title = originalTitle; };
  }, []);

  const handleCreatePlan = () => {
    console.log('创建新规划');
  };

  async function handleGenerate() {
    setGenLoading(true);
    setGenError(null);
    try {
      const constraints = genConstraints.split(',').map(s => s.trim()).filter(Boolean);
      const budgetNum = Number(genBudget) || undefined;
      const r = await generatePlans({ target: genTarget || undefined, budget: budgetNum, deadline: genDeadline || undefined, constraints });
      setGenPlans(r.data.plans || []);
    } catch (e: any) {
      setGenError(e?.message || '生成失败');
      setGenPlans(null);
    } finally {
      setGenLoading(false);
    }
  }

  async function handleAdoptPlan(p: { name: string; rationale?: string; steps: string[]; checkpoints: string[] }) {
    try {
      const payload = { name: p.name, status: 'ongoing', content: p } as any;
      await createPlan(payload);
      alert('已采纳到我的规划');
    } catch (e: any) {
      alert('采纳失败：' + (e?.message || '未知错误'));
    }
  }

  const handlePlanCardClick = (planId: string, event: React.MouseEvent) => {
    // 如果点击的是编辑或删除按钮，不触发卡片点击
    const target = event.target as HTMLElement;
    if (target.closest('.edit-plan-btn') || target.closest('.delete-plan-btn')) {
      return;
    }
    
    setSelectedPlanId(planId);
    setShowPlanDetail(true);
  };

  const handleEditPlan = (planId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const plan = serverPlans.find(p => p.planId === planId);
    if (plan) openEditModal(plan);
  };

  const handleDeletePlan = (planId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    handleDeleteServerPlan(planId);
  };

  const handleClosePlanDetail = () => {
    setShowPlanDetail(false);
    setSelectedPlanId(null);
  };

  const handleViewSavingsDetail = (productId: string) => {
    navigate(`/product-detail?productId=${productId}`);
  };

  const handleViewInvestmentProduct = (productId: string) => {
    navigate(`/product-detail?productId=${productId}`);
  };

  const getPlanDetail = (planId: string): PlanDetail | null => {
    // 优先从服务端规划查找
    const serverPlan = serverPlans.find(p => p.planId === planId);
    if (serverPlan) {
      return {
        title: serverPlan.name,
        target: serverPlan.goal || '—',
        current: serverPlan.status === 'done' ? serverPlan.goal || '—' : '进行中',
        progress: serverPlan.status === 'done' ? 100 : serverPlan.status === 'adjusted' ? 30 : 50,
        description: serverPlan.goal || '暂无描述',
        steps: [
          { title: '制定计划', status: '已完成' },
          { title: '执行计划', status: serverPlan.status === 'ongoing' ? '进行中' : '已完成' },
          { title: '达成目标', status: serverPlan.status === 'done' ? '已完成' : '待完成' },
        ],
      };
    }
    const planDetails: Record<string, PlanDetail> = {
      'plan-001': {
        title: '紧急备用金计划',
        target: '¥50,000',
        current: '¥32,500',
        progress: 65,
        description: '为突发情况准备3-6个月生活费的紧急备用金，确保家庭财务安全。',
        steps: [
          { title: '开设专用账户', status: '已完成' },
          { title: '每月定期存款', status: '进行中' },
          { title: '达到目标金额', status: '待完成' }
        ]
      },
      'plan-002': {
        title: '购房首付储蓄',
        target: '¥300,000',
        current: '¥75,000',
        progress: 25,
        description: '为购买首套住房积累首付款，实现安居乐业的目标。',
        steps: [
          { title: '确定购房预算', status: '已完成' },
          { title: '制定储蓄计划', status: '已完成' },
          { title: '定期存款', status: '进行中' },
          { title: '达到首付目标', status: '待完成' }
        ]
      },
      'plan-003': {
        title: '技能培训基金',
        target: '¥15,000',
        current: '¥15,000',
        progress: 100,
        description: '为职业技能提升和培训课程储备资金，提升个人竞争力。',
        steps: [
          { title: '选择培训课程', status: '已完成' },
          { title: '制定储蓄计划', status: '已完成' },
          { title: '完成储蓄目标', status: '已完成' },
          { title: '参加培训课程', status: '已完成' }
        ]
      }
    };
    
    return planDetails[planId] || null;
  };

  const renderPlanDetail = () => {
    if (!selectedPlanId || !showPlanDetail) return null;
    
    const plan = getPlanDetail(selectedPlanId);
    if (!plan) return null;

    return (
      <section className="mb-8">
        <div className={`${styles.gradientCard} rounded-xl p-6 shadow-card`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-text-primary">规划方案详情</h3>
            <button 
              onClick={handleClosePlanDetail}
              className="text-text-secondary hover:text-primary transition-colors"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xl font-semibold text-text-primary mb-4">{plan.title}</h4>
              <KeywordAnchors keywords={["计划", "目标", "储蓄", "金额"]} className="text-text-secondary mb-6">
                {plan.description}
              </KeywordAnchors>
              
              <div className="mb-6 space-y-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-text-secondary">完成进度</span>
                  <span className="text-text-primary font-medium">{plan.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`${styles.progressBar} h-3 rounded-full`} 
                    style={{ width: `${plan.progress}%` }}
                  ></div>
                </div>
                <DualAxisProgress
                  primaryLabel="储蓄达成度"
                  primaryPercent={plan.progress}
                  secondaryLabel="消费结构优化"
                  secondaryPercent={Math.max(0, Math.min(100, plan.progress - 20))}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-bg-light rounded-lg">
                  <p className="text-sm text-text-secondary">目标金额</p>
                  <p className="text-lg font-semibold text-text-primary">{plan.target}</p>
                </div>
                <div className="text-center p-3 bg-bg-light rounded-lg">
                  <p className="text-sm text-text-secondary">当前金额</p>
                  <p className="text-lg font-semibold text-text-primary">{plan.current}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h5 className="text-lg font-semibold text-text-primary mb-4">执行步骤</h5>
              <div className="space-y-3">
                {plan.steps.map((step, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-bg-light rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.status === '已完成' ? 'bg-success text-white' : 
                      step.status === '进行中' ? 'bg-primary text-white' : 
                      'bg-gray-300 text-gray-600'
                    }`}>
                      {step.status === '已完成' ? (
                        <i className="fas fa-check text-sm"></i>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">{step.title}</p>
                      <p className="text-xs text-text-secondary">{step.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className={styles.pageWrapper}>
      <div className="p-4 md:p-6">
        {/* 页面头部 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text-primary">财务规划</h2>
            </div>
            <button 
              onClick={handleCreatePlan}
              className={`${styles.gradientBg} text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all`}
            >
              <i className="fas fa-plus mr-2"></i>
              创建新规划
            </button>
          </div>
        </div>

        {/* 规划方案列表区 */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-text-primary mb-4">我的规划方案</h3>
          {/* 服务端规划 */}
          {plansLoading && <p className="text-sm text-text-secondary mb-4">加载中…</p>}
          {serverPlans.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {serverPlans.map(plan => (
                <div key={plan.planId} className={`${styles.planCard} rounded-xl p-6 cursor-pointer`}
                  onClick={(e) => handlePlanCardClick(plan.planId, e)}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      plan.status === 'done' ? 'bg-success bg-opacity-20 text-success' :
                      plan.status === 'adjusted' ? 'bg-warning bg-opacity-20 text-warning' :
                      'bg-info bg-opacity-20 text-info'
                    }`}>
                      {plan.status === 'done' ? '已完成' : plan.status === 'adjusted' ? '已调整' : '进行中'}
                    </span>
                  </div>
                  <h4 className="text-lg font-semibold text-text-primary mb-1">{plan.name}</h4>
                  {plan.goal && <p className="text-sm text-text-secondary mb-4">{plan.goal}</p>}
                  <div className="flex justify-end space-x-2 mt-4">
                    <button className="edit-plan-btn text-primary text-sm hover:underline"
                      onClick={(e) => { e.stopPropagation(); openEditModal(plan); }}>编辑</button>
                    <button className="delete-plan-btn text-danger text-sm hover:underline"
                      onClick={(e) => { e.stopPropagation(); handleDeleteServerPlan(plan.planId); }}>删除</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* 本地静态示例规划（无服务端数据时显示） */}
          {serverPlans.length === 0 && !plansLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              className={`${styles.planCard} rounded-xl p-6`}
              onClick={(e) => handlePlanCardClick('plan-001', e)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${styles.gradientBg} rounded-lg flex items-center justify-center`}>
                  <i className="fas fa-piggy-bank text-white text-xl"></i>
                </div>
                <span className="px-2 py-1 bg-success bg-opacity-20 text-success text-xs rounded-full">进行中</span>
              </div>
              <h4 className="text-lg font-semibold text-text-primary mb-2">紧急备用金计划</h4>
              <p className="text-sm text-text-secondary mb-4">为突发情况准备3-6个月生活费的紧急备用金</p>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-secondary">完成进度</span>
                  <span className="text-text-primary font-medium">65%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`${styles.progressBar} h-2 rounded-full`} style={{ width: '65%' }}></div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">目标: ¥50,000</span>
                <span className="text-xs text-text-secondary">点击查看详情</span>
              </div>
            </div>

            <div 
              className={`${styles.planCard} rounded-xl p-6`}
              onClick={(e) => handlePlanCardClick('plan-002', e)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-warning bg-opacity-20 rounded-lg flex items-center justify-center">
                  <i className="fas fa-home text-warning text-xl"></i>
                </div>
                <span className="px-2 py-1 bg-info bg-opacity-20 text-info text-xs rounded-full">规划中</span>
              </div>
              <h4 className="text-lg font-semibold text-text-primary mb-2">购房首付储蓄</h4>
              <p className="text-sm text-text-secondary mb-4">为购买首套住房积累首付款</p>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-secondary">完成进度</span>
                  <span className="text-text-primary font-medium">25%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`${styles.progressBar} h-2 rounded-full`} style={{ width: '25%' }}></div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">目标: ¥300,000</span>
                <span className="text-xs text-text-secondary">点击查看详情</span>
              </div>
            </div>

            <div 
              className={`${styles.planCard} rounded-xl p-6`}
              onClick={(e) => handlePlanCardClick('plan-003', e)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-secondary bg-opacity-20 rounded-lg flex items-center justify-center">
                  <i className="fas fa-graduation-cap text-secondary text-xl"></i>
                </div>
                <span className="px-2 py-1 bg-success bg-opacity-20 text-success text-xs rounded-full">已完成</span>
              </div>
              <h4 className="text-lg font-semibold text-text-primary mb-2">技能培训基金</h4>
              <p className="text-sm text-text-secondary mb-4">为职业技能提升和培训课程储备资金</p>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-secondary">完成进度</span>
                  <span className="text-text-primary font-medium">100%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`${styles.progressBar} h-2 rounded-full`} style={{ width: '100%' }}></div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">目标: ¥15,000</span>
                <span className="text-xs text-text-secondary">点击查看详情</span>
              </div>
            </div>
          </div>
          )}
        </section>

        {/* 编辑规划弹窗 */}
        {editModal.open && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-11/12 max-w-md p-6">
              <h4 className="text-lg font-semibold text-text-primary mb-4">编辑规划</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">规划名称</label>
                  <input className="w-full px-3 py-2 border border-border-light rounded-lg" value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">目标描述</label>
                  <input className="w-full px-3 py-2 border border-border-light rounded-lg" value={editGoal} onChange={e => setEditGoal(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">状态</label>
                  <select className="w-full px-3 py-2 border border-border-light rounded-lg" value={editStatus} onChange={e => setEditStatus(e.target.value as PlanItem['status'])}>
                    <option value="ongoing">进行中</option>
                    <option value="done">已完成</option>
                    <option value="adjusted">已调整</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button onClick={() => setEditModal({ open: false })} className="px-4 py-2 text-sm border border-border-light rounded-lg hover:bg-gray-50">取消</button>
                <button disabled={editSaving} onClick={handleSaveEdit} className={`${styles.gradientBg} text-white px-4 py-2 text-sm rounded-lg disabled:opacity-60`}>
                  {editSaving ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI 生成规划 */}
        <section className="mb-8">
          <div className={`${styles.gradientCard} rounded-xl p-6 shadow-card`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">智能生成规划</h3>
              <div className="text-xs text-text-secondary">对接后端 /api/v1/plan/generate</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <input className="px-3 py-2 border border-border-light rounded" placeholder="目标（可选）" value={genTarget} onChange={e=>setGenTarget(e.target.value)} />
              <input className="px-3 py-2 border border-border-light rounded" placeholder="预算/月（可选）" value={genBudget} onChange={e=>setGenBudget(e.target.value)} />
              <input className="px-3 py-2 border border-border-light rounded" type="date" value={genDeadline} onChange={e=>setGenDeadline(e.target.value)} />
              <input className="px-3 py-2 border border-border-light rounded" placeholder="约束（逗号分隔）" value={genConstraints} onChange={e=>setGenConstraints(e.target.value)} />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <button disabled={genLoading} onClick={handleGenerate} className={`${styles.gradientBg} text-white px-4 py-2 rounded disabled:opacity-50`}>
                {genLoading ? '生成中…' : '生成方案'}
              </button>
              {genError && <span className="text-xs text-warning">{genError}</span>}
            </div>
            {genPlans && genPlans.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {genPlans.map((p, idx) => (
                  <div key={idx} className="border border-border-light rounded p-4 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-base font-medium text-text-primary">{p.name}</div>
                      <button onClick={() => handleAdoptPlan(p)} className="text-xs px-2 py-1 rounded bg-primary text-white">采纳</button>
                    </div>
                    {p.rationale && <div className="text-xs text-text-secondary mb-2">{p.rationale}</div>}
                    <div className="text-xs text-text-secondary">步骤：</div>
                    <ul className="list-disc pl-5 text-xs text-text-primary mb-2">
                      {p.steps.map((s,i)=> <li key={i}>{s}</li>)}
                    </ul>
                    <div className="text-xs text-text-secondary">检查点：</div>
                    <ul className="list-disc pl-5 text-xs text-text-primary">
                      {p.checkpoints.map((s,i)=> <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2"><ComplianceNotice variant="ai" /></div>
          </div>
        </section>

        {/* 控支建议区 */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">控支建议</h3>
            <span className="text-xs text-text-secondary">本地策略 · 可随时调整</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {suggestions.map(s => {
              const applied = appliedMap.get(s.id);
              return (
                <div key={s.id} className={`${styles.planCard} rounded-xl p-6 relative`}>                    
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 pr-2">
                      <h4 className="text-base font-semibold text-text-primary mb-1 flex items-center space-x-2">
                        <span>{s.title}</span>
                        {applied && <span className="text-[10px] px-2 py-1 rounded-full bg-primary text-white">已应用</span>}
                      </h4>
                      <p className="text-xs text-text-secondary leading-relaxed mb-2">{s.desc}</p>
                      <p className="text-xs text-success font-medium mb-2">预估月度节省：¥{s.estimatedMonthlySave}</p>
                      <ul className="text-[11px] text-text-secondary space-y-1 mb-3 list-disc pl-4">
                        {s.actions.map(a => <li key={a}>{a}</li>)}
                      </ul>
                    </div>
                  </div>
                  {applied ? (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] text-text-secondary">执行进度</span>
                        <span className="text-[11px] text-text-primary font-medium">{Math.round(applied.progress * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div className={`${styles.progressBar} h-2 rounded-full`} style={{ width: `${Math.round(applied.progress * 100)}%` }}></div>
                      </div>
                      {applied.progress < 1 ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleRecordExecution(s.id)} className="flex-1 text-xs px-3 py-2 rounded-lg bg-primary text-white hover:opacity-90 transition-colors">记录执行（+10%）</button>
                          <button onClick={() => handleStopSuggestion(s.id)} className="text-xs px-3 py-2 rounded-lg border border-danger text-danger hover:bg-danger/10 transition-colors">停止</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <div className="flex-1 text-center text-xs text-success font-medium py-2">已完成该控支策略</div>
                          <button onClick={() => handleStopSuggestion(s.id)} className="text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors">移除</button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => handleApplySuggestion(s.id)} className="w-full text-xs px-3 py-2 rounded-lg bg-success text-white hover:opacity-90 transition-colors">一键应用到规划</button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mb-8">
          <div className={`${styles.gradientCard} rounded-xl p-6 shadow-card`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">情景模拟与资金路线图</h3>
              <span className="text-xs text-text-secondary">帮助你在不同收入波动下保持目标达成</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-text-primary">预算分配建议（按月）</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm"><span className="text-text-secondary">必要开支</span><span className="font-medium text-text-primary">50%</span></div>
                  <div className="w-full h-2 rounded bg-border-light"><div className="h-2 rounded bg-primary" style={{ width: '50%' }}></div></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-text-secondary">灵活消费</span><span className="font-medium text-text-primary">20%</span></div>
                  <div className="w-full h-2 rounded bg-border-light"><div className="h-2 rounded bg-warning" style={{ width: '20%' }}></div></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-text-secondary">储蓄/投资</span><span className="font-medium text-text-primary">30%</span></div>
                  <div className="w-full h-2 rounded bg-border-light"><div className="h-2 rounded bg-success" style={{ width: '30%' }}></div></div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-text-primary">本周执行清单</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 rounded bg-bg-light"><span className="text-text-primary">周一：核对自动扣费与订阅</span><span className="text-success">完成</span></div>
                  <div className="flex items-center justify-between p-2 rounded bg-bg-light"><span className="text-text-primary">周三：更新消费分类与预算偏差</span><span className="text-warning">进行中</span></div>
                  <div className="flex items-center justify-between p-2 rounded bg-bg-light"><span className="text-text-primary">周五：复盘投资组合与风险暴露</span><span className="text-text-secondary">待开始</span></div>
                  <div className="flex items-center justify-between p-2 rounded bg-bg-light"><span className="text-text-primary">周日：设定下周可执行目标</span><span className="text-text-secondary">待开始</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 规划详情区 */}
        {renderPlanDetail()}

        {/* 信贷评估与风险分析区 */}
        <section className="mb-8">
          <div className={`${styles.gradientCard} rounded-xl p-6 shadow-card`}>
            <h3 className="text-lg font-semibold text-text-primary mb-4">信贷评估</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className={`w-16 h-16 ${styles.gradientBg} rounded-full flex items-center justify-center mx-auto mb-3`}>
                  <i className="fas fa-credit-card text-white text-2xl"></i>
                </div>
                <h4 className="text-2xl font-bold text-text-primary mb-1">720</h4>
                <p className="text-sm text-text-secondary">信用评分</p>
                <p className="text-xs text-success font-medium mt-1">良好</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-success bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-shield-alt text-success text-2xl"></i>
                </div>
                <h4 className="text-2xl font-bold text-text-primary mb-1">低</h4>
                <p className="text-sm text-text-secondary">信贷风险</p>
                <p className="text-xs text-success font-medium mt-1">风险可控</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-info bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-percentage text-info text-2xl"></i>
                </div>
                <h4 className="text-2xl font-bold text-text-primary mb-1">4.5%</h4>
                <p className="text-sm text-text-secondary">建议利率</p>
                <p className="text-xs text-success font-medium mt-1">优惠利率</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-warning bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-chart-line text-warning text-2xl"></i>
                </div>
                <h4 className="text-2xl font-bold text-text-primary mb-1">¥80K</h4>
                <p className="text-sm text-text-secondary">建议额度</p>
                <p className="text-xs text-warning font-medium mt-1">合理利用</p>
              </div>
            </div>
          </div>
        </section>

        {/* “本地策略进度汇总”模块按需求移除 */}

        {/* 储蓄计划推荐区 */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-text-primary mb-4">储蓄计划推荐</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className={`${styles.recommendationCard} rounded-xl p-6 shadow-card`}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-success bg-opacity-20 rounded-lg flex items-center justify-center">
                  <i className="fas fa-piggy-bank text-success text-xl"></i>
                </div>
                <span className="px-2 py-1 bg-success bg-opacity-20 text-success text-xs rounded-full">稳健</span>
              </div>
              <h4 className="text-lg font-semibold text-text-primary mb-2">定期存款计划</h4>
              <p className="text-sm text-text-secondary mb-4">年化利率2.8%，零风险，适合保守型投资者</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">起存金额: ¥1,000</span>
                <button 
                  className="text-primary text-sm hover:underline"
                  onClick={() => handleViewSavingsDetail('P001')}
                >
                  查看详情
                </button>
              </div>
            </div>
            
            <div className={`${styles.recommendationCard} rounded-xl p-6 shadow-card`}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-warning bg-opacity-20 rounded-lg flex items-center justify-center">
                  <i className="fas fa-chart-line text-warning text-xl"></i>
                </div>
                <span className="px-2 py-1 bg-warning bg-opacity-20 text-warning text-xs rounded-full">灵活</span>
              </div>
              <h4 className="text-lg font-semibold text-text-primary mb-2">货币基金</h4>
              <p className="text-sm text-text-secondary mb-4">年化利率2.1%，随存随取，流动性极佳</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">起存金额: ¥1</span>
                <button 
                  className="text-primary text-sm hover:underline"
                  onClick={() => handleViewSavingsDetail('P004')}
                >
                  查看详情
                </button>
              </div>
            </div>
            
            <div className={`${styles.recommendationCard} rounded-xl p-6 shadow-card`}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-info bg-opacity-20 rounded-lg flex items-center justify-center">
                  <i className="fas fa-bullseye text-info text-xl"></i>
                </div>
                <span className="px-2 py-1 bg-info bg-opacity-20 text-info text-xs rounded-full">目标</span>
              </div>
              <h4 className="text-lg font-semibold text-text-primary mb-2">目标储蓄</h4>
              <p className="text-sm text-text-secondary mb-4">自定义储蓄目标，智能提醒，强制储蓄</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">起存金额: ¥100</span>
                <button 
                  className="text-primary text-sm hover:underline"
                  onClick={() => handleViewSavingsDetail('P005')}
                >
                  查看详情
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 投资建议区 */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-text-primary mb-4">投资建议</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className={`${styles.recommendationCard} rounded-xl p-6 shadow-card`}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-secondary bg-opacity-20 rounded-lg flex items-center justify-center">
                  <i className="fas fa-chart-pie text-secondary text-xl"></i>
                </div>
                <span className="px-2 py-1 bg-success bg-opacity-20 text-success text-xs rounded-full">低风险</span>
              </div>
              <h4 className="text-lg font-semibold text-text-primary mb-2">稳健混合型基金</h4>
              <p className="text-sm text-text-secondary mb-4">股债平衡配置，历史年化收益6.5%</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">起投金额: ¥1,000</span>
                <button 
                  className="text-primary text-sm hover:underline"
                  onClick={() => handleViewInvestmentProduct('P002')}
                >
                  查看产品
                </button>
              </div>
            </div>
            
            <div className={`${styles.recommendationCard} rounded-xl p-6 shadow-card`}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-accent bg-opacity-20 rounded-lg flex items-center justify-center">
                  <i className="fas fa-chart-area text-accent text-xl"></i>
                </div>
                <span className="px-2 py-1 bg-warning bg-opacity-20 text-warning text-xs rounded-full">中风险</span>
              </div>
              <h4 className="text-lg font-semibold text-text-primary mb-2">科技创新ETF</h4>
              <p className="text-sm text-text-secondary mb-4">聚焦科技成长，长期收益潜力大</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">起投金额: ¥100</span>
                <button 
                  className="text-primary text-sm hover:underline"
                  onClick={() => handleViewInvestmentProduct('P003')}
                >
                  查看产品
                </button>
              </div>
            </div>
            
            <div className={`${styles.recommendationCard} rounded-xl p-6 shadow-card`}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-primary bg-opacity-20 rounded-lg flex items-center justify-center">
                  <i className="fas fa-globe text-primary text-xl"></i>
                </div>
                <span className="px-2 py-1 bg-info bg-opacity-20 text-info text-xs rounded-full">分散</span>
              </div>
              <h4 className="text-lg font-semibold text-text-primary mb-2">全球配置组合</h4>
              <p className="text-sm text-text-secondary mb-4">全球化资产配置，分散投资风险</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">起投金额: ¥5,000</span>
                <button 
                  className="text-primary text-sm hover:underline"
                  onClick={() => handleViewInvestmentProduct('P001')}
                >
                  查看产品
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FinancialPlanningPage;








