

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './styles.module.css';

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
  receiptImage: string;
}

const TransactionDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [currentTransactionData, setCurrentTransactionData] = useState<TransactionData | null>(null);

  // 设置页面标题
  useEffect(() => {
    const originalTitle = document.title;
    document.title = '金智通 - 交易详情';
    return () => { document.title = originalTitle; };
  }, []);

  // 模拟交易数据
  const mockTransactionsData: Record<string, TransactionData> = {
    "txn1": {
      id: "txn1",
      amount: "-¥45.00",
      type: "支出",
      description: "星巴克咖啡",
      category: "餐饮",
      categoryIcon: "fas fa-utensils",
      categoryColor: "warning",
      dateTime: "2024-01-15 14:30:25",
      account: "招商银行储蓄卡",
      note: "下午茶咖啡",
      status: "已完成",
      receiptImage: "https://s.coze.cn/image/eHSE9XMALP0/"
    },
    "txn2": {
      id: "txn2",
      amount: "+¥15,680.00",
      type: "收入",
      description: "工资收入",
      category: "工资",
      categoryIcon: "fas fa-money-bill-wave",
      categoryColor: "success",
      dateTime: "2024-01-15 10:15:00",
      account: "工商银行储蓄卡",
      note: "月度工资",
      status: "已完成",
      receiptImage: "https://s.coze.cn/image/ylSZDFyJ2kA/"
    },
    "txn3": {
      id: "txn3",
      amount: "-¥236.80",
      type: "支出",
      description: "超市购物",
      category: "购物",
      categoryIcon: "fas fa-shopping-cart",
      categoryColor: "info",
      dateTime: "2024-01-14 19:45:30",
      account: "支付宝",
      note: "生活用品采购",
      status: "已完成",
      receiptImage: "https://s.coze.cn/image/RzX_oHayS3w/"
    }
  };

  // 加载交易详情
  useEffect(() => {
    const transactionId = searchParams.get('transactionId') || 'txn1';
    const transactionData = mockTransactionsData[transactionId] || mockTransactionsData["txn1"];
    setCurrentTransactionData(transactionData);
  }, [searchParams]);

  // 关闭弹窗
  const handleCloseModal = () => {
    navigate(-1);
  };

  // 编辑交易
  const handleEditTransaction = () => {
    const transactionId = currentTransactionData?.id || 'txn1';
    navigate(`/add-transaction?transactionId=${transactionId}`);
  };

  // 删除交易
  const handleDeleteTransaction = () => {
    setShowDeleteConfirmModal(true);
  };

  // 取消删除
  const handleCancelDelete = () => {
    setShowDeleteConfirmModal(false);
  };

  // 确认删除
  const handleConfirmDelete = () => {
    const transactionId = currentTransactionData?.id || 'txn1';
    console.log('删除交易:', transactionId);
    setShowDeleteConfirmModal(false);
    alert('交易已删除');
    navigate('/accounting');
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

  if (!currentTransactionData) {
    return <div>加载中...</div>;
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
            
            {/* 原始凭证区域 */}
            <div className="px-6 pb-6 border-t border-border-light">
              <h3 className="text-lg font-semibold text-text-primary mb-4">原始凭证</h3>
              <div className="space-y-4">
                <div className="bg-bg-light rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-text-primary">银行流水截图</span>
                    <span className="text-xs text-text-secondary">JPG格式 • 245KB</span>
                  </div>
                  <img 
                    src={currentTransactionData.receiptImage}
                    alt={`${currentTransactionData.description}凭证`}
                    className={styles.receiptImage}
                    loading="lazy"
                  />
                </div>
                
                <div className="bg-bg-light rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-text-primary">电子发票</span>
                    <span className="text-xs text-text-secondary">PDF格式 • 128KB</span>
                  </div>
                  <div className="flex items-center justify-center p-8 border-2 border-dashed border-border-light rounded-lg">
                    <div className="text-center">
                      <i className="fas fa-file-pdf text-danger text-3xl mb-2"></i>
                      <p className="text-sm text-text-secondary">点击查看电子发票</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 弹窗底部操作按钮 */}
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
                    className="flex-1 px-4 py-2 bg-danger text-white rounded-lg font-medium hover:bg-opacity-90 transition-all"
                  >
                    删除
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

