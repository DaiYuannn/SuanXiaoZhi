

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import styles from './TransactionDetailPage.module.css';
import { readStoredSession } from '../../../shared/utils/auth-session.js';
import { UserRole } from '../../../shared/types/permission.js';
import { fetchTransactions, deleteTransaction } from '../../../shared/constants/endpoints';
import type { TransactionItem } from '../../../shared/types/api';

interface TransactionData {
  id: string;
  amount: string;
  type: string;
  description: string;
  category: string;
  categoryIcon: string;
  categoryColor: string;
  dateTime: string;
  account: string;
  note: string;
  status: string;
}

const categoryMeta: Record<string, { icon: string; color: string }> = {
  '餐饮': { icon: 'fas fa-utensils', color: 'warning' },
  '购物': { icon: 'fas fa-shopping-cart', color: 'info' },
  '交通': { icon: 'fas fa-bus', color: 'success' },
  '娱乐': { icon: 'fas fa-gamepad', color: 'accent' },
  '医疗': { icon: 'fas fa-hospital', color: 'danger' },
  '教育': { icon: 'fas fa-book', color: 'primary' },
  '住房': { icon: 'fas fa-home', color: 'secondary' },
  '水电煤': { icon: 'fas fa-bolt', color: 'warning' },
  '工资': { icon: 'fas fa-money-bill-wave', color: 'success' },
  '奖金': { icon: 'fas fa-gift', color: 'accent' },
  '理财收益': { icon: 'fas fa-chart-line', color: 'primary' },
  '转账收入': { icon: 'fas fa-exchange-alt', color: 'info' },
  '转账支出': { icon: 'fas fa-exchange-alt', color: 'danger' },
  '其他': { icon: 'fas fa-ellipsis-h', color: 'secondary' },
};

const toCnCategory = (code?: string): string => {
  const map: Record<string, string> = {
    food: '餐饮', shopping: '购物', transport: '交通', entertainment: '娱乐',
    medical: '医疗', education: '教育', housing: '住房', utilities: '水电煤',
    salary: '工资', bonus: '奖金', investment: '理财收益', 'investment-out': '投资',
    'other-income': '转账收入', transfer: '转账支出', other: '其他',
  };
  if (!code) return '其他';
  return map[code] || code;
};

const TransactionDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: pathId } = useParams();
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [currentTransactionData, setCurrentTransactionData] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const session = readStoredSession();
  const canWrite = session?.role !== UserRole.FAMILY_MEMBER;

  useEffect(() => {
    const originalTitle = document.title;
    document.title = '算小智 - 交易详情';
    return () => { document.title = originalTitle; };
  }, []);

  // Load transaction from API
  useEffect(() => {
    const transactionId = pathId || searchParams.get('transactionId');
    if (!transactionId) { setError('未指定交易ID'); setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchTransactions({ page: 1, size: 200 });
        const list: TransactionItem[] = (res as any)?.data?.list || [];
        const found = list.find((t) => t.transactionId === transactionId);
        if (found) {
          const amountYuan = (found.amount ?? 0) / 100;
          const isExpense = found.type !== 'INCOME';
          const cnCat = toCnCategory(found.categoryName);
          const meta = categoryMeta[cnCat] || { icon: 'fas fa-receipt', color: 'primary' };
          setCurrentTransactionData({
            id: found.transactionId || transactionId,
            amount: `${isExpense ? '-' : '+'}¥${Math.abs(amountYuan).toFixed(2)}`,
            type: found.type === 'INCOME' ? '收入' : '支出',
            description: found.description || found.remark || '交易',
            category: cnCat,
            categoryIcon: meta.icon,
            categoryColor: meta.color,
            dateTime: new Date(found.time).toLocaleString(),
            account: found.accountId || '—',
            note: found.remark || '',
            status: found.isAnomaly ? '异常' : '已完成',
          });
        } else {
          setError('未找到该交易');
        }
      } catch (e: any) {
        setError('加载失败：' + (e?.message || '网络错误'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pathId, searchParams]);

  const handleCloseModal = () => {
    navigate(-1);
  };

  const handleEditTransaction = () => {
    const transactionId = currentTransactionData?.id;
    if (transactionId) navigate(`/add-transaction?transactionId=${transactionId}`);
  };

  const handleDeleteTransaction = () => {
    setShowDeleteConfirmModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmModal(false);
  };

  const handleConfirmDelete = async () => {
    const transactionId = currentTransactionData?.id;
    if (!transactionId) return;
    setDeleting(true);
    try {
      if (transactionId.startsWith('local-')) {
        // Remove from localStorage
        const list = JSON.parse(localStorage.getItem('local_transactions') || '[]');
        localStorage.setItem('local_transactions', JSON.stringify(list.filter((t: any) => t.id !== transactionId)));
      } else {
        await deleteTransaction(transactionId);
      }
      setShowDeleteConfirmModal(false);
      navigate('/accounting');
    } catch (e: any) {
      alert('删除失败：' + (e?.message || '未知错误'));
    } finally {
      setDeleting(false);
    }
  };

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 点击背景关闭弹窗
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  // 点击删除确认对话框背景关闭
  const handleDeleteModalBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowDeleteConfirmModal(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-text-secondary">加载中…</div></div>;
  }

  if (error || !currentTransactionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-circle text-danger text-2xl"></i>
          </div>
          <p className="text-text-primary font-medium mb-2">{error || '未找到交易'}</p>
          <button onClick={() => navigate('/accounting')} className="text-primary text-sm hover:underline">返回记账</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      {/* 模态弹窗背景遮罩 */}
      <div 
        className={`fixed inset-0 ${styles.modalBackdrop} z-50 flex items-center justify-center p-4`}
        onClick={handleBackdropClick}
      >
        {/* 模态弹窗内容 */}
        <div className={`bg-white rounded-xl shadow-modal w-full max-w-2xl max-h-[90vh] overflow-hidden ${styles.modalEnter}`}>
          {/* 弹窗头部 */}
          <div className={`${styles.gradientBg} text-white px-6 py-4 flex items-center justify-between`}>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <i className="fas fa-receipt text-white"></i>
              </div>
              <h2 className="text-xl font-semibold">交易详情</h2>
            </div>
            <button 
              onClick={handleCloseModal}
              className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-all"
            >
              <i className="fas fa-times text-white"></i>
            </button>
          </div>
          
          {/* 弹窗内容区 */}
          <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* 交易基本信息 */}
            <div className="p-6">
              <div className="space-y-4">
                {/* 交易金额 */}
                <div className="text-center py-4 border-b border-border-light">
                  <div className="text-3xl font-bold text-danger mb-2">{currentTransactionData.amount}</div>
                  <div className="text-sm text-text-secondary">{currentTransactionData.type}</div>
                </div>
                
                {/* 交易详情列表 */}
                <div className="space-y-0">
                  <div className={styles.detailItem}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 bg-${currentTransactionData.categoryColor} bg-opacity-20 rounded-lg flex items-center justify-center`}>
                          <i className={`${currentTransactionData.categoryIcon} text-${currentTransactionData.categoryColor}`}></i>
                        </div>
                        <div>
                          <div className="font-medium text-text-primary">{currentTransactionData.description}</div>
                          <div className="text-sm text-text-secondary">交易描述</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.detailItem}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-info bg-opacity-20 rounded-lg flex items-center justify-center">
                          <i className="fas fa-calendar-alt text-info"></i>
                        </div>
                        <div>
                          <div className="font-medium text-text-primary">{currentTransactionData.dateTime}</div>
                          <div className="text-sm text-text-secondary">交易时间</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.detailItem}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 bg-${currentTransactionData.categoryColor} bg-opacity-20 rounded-lg flex items-center justify-center`}>
                          <i className={`${currentTransactionData.categoryIcon} text-${currentTransactionData.categoryColor}`}></i>
                        </div>
                        <div>
                          <div className="font-medium text-text-primary">
                            <span className={`px-2 py-1 bg-${currentTransactionData.categoryColor} bg-opacity-20 text-${currentTransactionData.categoryColor} text-xs rounded-full`}>
                              {currentTransactionData.category}
                            </span>
                          </div>
                          <div className="text-sm text-text-secondary">交易分类</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.detailItem}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary bg-opacity-20 rounded-lg flex items-center justify-center">
                          <i className="fas fa-university text-primary"></i>
                        </div>
                        <div>
                          <div className="font-medium text-text-primary">{currentTransactionData.account}</div>
                          <div className="text-sm text-text-secondary">交易账户</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.detailItem}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-secondary bg-opacity-20 rounded-lg flex items-center justify-center">
                          <i className="fas fa-sticky-note text-secondary"></i>
                        </div>
                        <div>
                          <div className="font-medium text-text-primary">{currentTransactionData.note}</div>
                          <div className="text-sm text-text-secondary">交易备注</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.detailItem}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-success bg-opacity-20 rounded-lg flex items-center justify-center">
                          <i className="fas fa-check-circle text-success"></i>
                        </div>
                        <div>
                          <div className="font-medium text-text-primary">{currentTransactionData.status}</div>
                          <div className="text-sm text-text-secondary">交易状态</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="h-2"></div>
          </div>
          
          {/* 弹窗底部操作按钮 */}
          {canWrite && (
            <div className="bg-bg-light px-6 py-4 border-t border-border-light">
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={handleEditTransaction}
                  className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-opacity-90 transition-all flex items-center space-x-2"
                >
                  <i className="fas fa-edit"></i>
                  <span>编辑</span>
                </button>
                <button
                  onClick={handleDeleteTransaction}
                  className="px-6 py-2 bg-danger text-white rounded-lg font-medium hover:bg-opacity-90 transition-all flex items-center space-x-2"
                >
                  <i className="fas fa-trash"></i>
                  <span>删除</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 删除确认对话框 */}
      {showDeleteConfirmModal && (
        <div 
          className={`fixed inset-0 ${styles.modalBackdrop} z-60 flex items-center justify-center p-4`}
          onClick={handleDeleteModalBackdropClick}
        >
          <div className={`bg-white rounded-xl shadow-modal w-full max-w-md ${styles.modalEnter}`}>
            <div className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-danger bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-exclamation-triangle text-danger text-2xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">确认删除</h3>
                <p className="text-text-secondary mb-6">删除后将无法恢复，确定要删除这笔交易吗？</p>
                <div className="flex space-x-3">
                  <button 
                    onClick={handleCancelDelete}
                    className="flex-1 px-4 py-2 border border-border-light text-text-secondary rounded-lg font-medium hover:bg-bg-light transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 bg-danger text-white rounded-lg font-medium hover:bg-opacity-90 transition-all disabled:opacity-50"
                  >
                    {deleting ? '删除中…' : '删除'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionDetailPage;





