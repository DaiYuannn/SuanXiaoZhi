

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './styles.module.css';
import { createTransaction } from '../../api/endpoints';

interface TransactionData {
  date: string;
  type: 'expense' | 'income';
  amount: string;
  account: string;
  category: string;
  description: string;
  note: string;
}

const AddTransactionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get('transactionId');
  const isEditMode = Boolean(transactionId);

  const [formData, setFormData] = useState<TransactionData>({
    date: '',
    type: 'expense',
    amount: '',
    account: '',
    category: '',
    description: '',
    note: ''
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const originalTitle = document.title;
    document.title = '金智通 - 添加交易';
    return () => { document.title = originalTitle; };
  }, []);

  useEffect(() => {
    if (isEditMode && transactionId) {
      loadTransactionData(transactionId);
    } else {
      // 尝试读取预填参数
      const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
      const type = (searchParams.get('type') as 'expense' | 'income') || 'expense';
      const amount = searchParams.get('amount') || '';
      const account = searchParams.get('account') || '';
      const category = searchParams.get('category') || '';
      const description = searchParams.get('description') || '';
      const note = searchParams.get('note') || '';
      setFormData({ date, type, amount, account, category, description, note });
    }
  }, [isEditMode, transactionId, searchParams]);

  useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
      
      if (e.key === 'Enter' && !e.shiftKey) {
        const activeElement = document.activeElement;
        if (activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          
          const inputs = Array.from(document.querySelectorAll('input[required], select[required]')) as HTMLElement[];
          const currentIndex = activeElement ? inputs.indexOf(activeElement as HTMLElement) : -1;
          
          if (currentIndex < inputs.length - 1) {
            const next = inputs[currentIndex + 1];
            if (next && 'focus' in next) (next as HTMLElement).focus();
          } else {
            // 直接提交表单
            const form = document.querySelector('form');
            if (form) form.requestSubmit();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadTransactionData = (id: string) => {
    setIsLoading(true);
    
    // 模拟API调用
    const mockTransaction: Record<string, TransactionData> = {
      '1': {
        date: '2024-01-15',
        type: 'expense',
        amount: '45.00',
        account: 'cmb-savings',
        category: 'food',
        description: '星巴克咖啡',
        note: '和同事开会'
      },
      '2': {
        date: '2024-01-15',
        type: 'income', 
        amount: '15680.00',
        account: 'icbc-savings',
        category: 'salary',
        description: '工资收入',
        note: '1月份工资'
      }
    };

    setTimeout(() => {
      const transaction = mockTransaction[id];
      if (transaction) {
        setFormData(transaction);
      }
      setIsLoading(false);
    }, 300);
  };

  const handleCloseModal = () => {
    navigate(-1);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      type: e.target.value as 'expense' | 'income'
    }));
  };

  const validateForm = (data: TransactionData): boolean => {
    if (!data.date) {
      alert('请选择交易日期');
      return false;
    }
    
    if (!data.amount || parseFloat(data.amount) <= 0) {
      alert('请输入有效的交易金额');
      return false;
    }
    
    if (!data.account) {
      alert('请选择交易账户');
      return false;
    }
    
    if (!data.category) {
      alert('请选择交易分类');
      return false;
    }
    
    if (!data.description.trim()) {
      alert('请输入交易描述');
      return false;
    }
    
    return true;
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm(formData)) {
      return;
    }

    setIsLoading(true);
    
    try {
      // 尝试调用后端创建交易接口
      const amountCents = Math.round(parseFloat(formData.amount) * 100);
      const payload = {
        accountId: formData.account,
        time: new Date(formData.date).toISOString(),
        type: (formData.type === 'income' ? 'INCOME' : 'EXPENSE') as 'INCOME' | 'EXPENSE',
        amount: amountCents,
        category: formData.category,
        description: formData.description,
        remark: formData.note,
      };
      await createTransaction(payload);
      alert(isEditMode ? '交易修改成功！' : '交易添加成功！');
      handleCloseModal();
    } catch (error) {
      // 后端不可用时，回退到本地存储占位，确保用户流程可走通
      try {
        const localKey = 'local_transactions';
        const list = JSON.parse(localStorage.getItem(localKey) || '[]');
        const id = `local-${Date.now()}`;
        list.push({
          id,
          time: formData.date + ' 12:00',
          description: formData.description,
          category: mapCategoryLabel(formData.category),
          amount: (formData.type === 'income' ? 1 : -1) * parseFloat(formData.amount),
          account: mapAccountLabel(formData.account),
          note: formData.note || '',
        });
        localStorage.setItem(localKey, JSON.stringify(list));
        alert('网络不可用，已临时保存到本地，稍后可在记账列表查看');
        handleCloseModal();
      } catch (e) {
        alert('保存失败，请重试');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 将内部分类代码映射为中文标签（与记账列表显示一致）
  const mapCategoryLabel = (value: string) => {
    const map: Record<string, string> = {
      food: '餐饮',
      shopping: '购物',
      transport: '交通',
      entertainment: '娱乐',
      medical: '医疗',
      education: '教育',
      housing: '住房',
      utilities: '水电煤',
      salary: '工资',
      bonus: '奖金',
      investment: '投资',
      'other-income': '其他收入',
      'investment-out': '投资',
      transfer: '转账',
      other: '其他',
    };
    return map[value] || value;
  };

  const mapAccountLabel = (value: string) => {
    const map: Record<string, string> = {
      'icbc-savings': '工商银行储蓄卡',
      'cmb-savings': '招商银行储蓄卡',
      'ccb-savings': '建设银行储蓄卡',
      'alipay': '支付宝',
      'wechat-pay': '微信支付',
      'cash': '现金',
    };
    return map[value] || value;
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const parentElement = e.target.parentElement;
    if (parentElement) {
      parentElement.classList.add('ring-2', 'ring-primary', 'ring-opacity-20');
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const parentElement = e.target.parentElement;
    if (parentElement) {
      parentElement.classList.remove('ring-2', 'ring-primary', 'ring-opacity-20');
    }
  };

  if (isLoading) {
    return (
      <div className={styles.pageWrapper}>
        <div className={`fixed inset-0 ${styles.modalOverlay} z-50 flex items-center justify-center p-4`}>
          <div className="bg-white rounded-xl shadow-modal w-full max-w-md p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-text-secondary">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div 
        className={`fixed inset-0 ${styles.modalOverlay} z-50 flex items-center justify-center p-4`}
        onClick={handleOverlayClick}
      >
        <div className={`bg-white rounded-xl shadow-modal w-full max-w-md max-h-[90vh] flex flex-col ${styles.modalEnter}`}>
          <div className="flex items-center justify-between p-6 border-b border-border-light flex-shrink-0">
            <h2 className="text-xl font-semibold text-text-primary">
              {isEditMode ? '编辑交易' : '添加新交易'}
            </h2>
            <button 
              onClick={handleCloseModal}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-lg transition-all"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1">
            <form id="transaction-form" onSubmit={handleFormSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="transaction-date" className="block text-sm font-medium text-text-primary">
                  交易日期 *
                </label>
                <input 
                  type="date" 
                  id="transaction-date" 
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  className={`w-full px-4 py-3 border border-border-light rounded-lg ${styles.formInputFocus} transition-all`}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">交易类型 *</label>
                <div className="flex space-x-3">
                  <input 
                    type="radio" 
                    id="type-expense" 
                    name="transaction-type" 
                    value="expense"
                    checked={formData.type === 'expense'}
                    onChange={handleRadioChange}
                    className={`${styles.radioCustom} hidden`}
                  />
                  <label 
                    htmlFor="type-expense" 
                    className={`${styles.radioLabel} flex-1 px-4 py-3 text-center rounded-lg cursor-pointer ${
                      formData.type === 'expense' ? 'bg-primary text-white border-primary' : ''
                    }`}
                  >
                    <i className="fas fa-minus-circle mr-2"></i>
                    支出
                  </label>
                  
                  <input 
                    type="radio" 
                    id="type-income" 
                    name="transaction-type" 
                    value="income"
                    checked={formData.type === 'income'}
                    onChange={handleRadioChange}
                    className={`${styles.radioCustom} hidden`}
                  />
                  <label 
                    htmlFor="type-income" 
                    className={`${styles.radioLabel} flex-1 px-4 py-3 text-center rounded-lg cursor-pointer ${
                      formData.type === 'income' ? 'bg-primary text-white border-primary' : ''
                    }`}
                  >
                    <i className="fas fa-plus-circle mr-2"></i>
                    收入
                  </label>
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="transaction-amount" className="block text-sm font-medium text-text-primary">
                  交易金额 *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary">¥</span>
                  <input 
                    type="number" 
                    id="transaction-amount" 
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    className={`w-full pl-8 pr-4 py-3 border border-border-light rounded-lg ${styles.formInputFocus} transition-all`}
                    placeholder="0.00" 
                    step="0.01" 
                    min="0" 
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="transaction-account" className="block text-sm font-medium text-text-primary">
                  交易账户 *
                </label>
                <select 
                  id="transaction-account" 
                  name="account"
                  value={formData.account}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  className={`w-full px-4 py-3 border border-border-light rounded-lg ${styles.formInputFocus} transition-all`}
                  required
                >
                  <option value="">请选择账户</option>
                  <option value="icbc-savings">工商银行储蓄卡</option>
                  <option value="cmb-savings">招商银行储蓄卡</option>
                  <option value="ccb-savings">建设银行储蓄卡</option>
                  <option value="alipay">支付宝</option>
                  <option value="wechat-pay">微信支付</option>
                  <option value="cash">现金</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="transaction-category" className="block text-sm font-medium text-text-primary">
                  交易分类 *
                </label>
                <select 
                  id="transaction-category" 
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  className={`w-full px-4 py-3 border border-border-light rounded-lg ${styles.formInputFocus} transition-all`}
                  required
                >
                  <option value="">请选择分类</option>
                  <option value="food">餐饮</option>
                  <option value="shopping">购物</option>
                  <option value="transport">交通</option>
                  <option value="entertainment">娱乐</option>
                  <option value="medical">医疗</option>
                  <option value="education">教育</option>
                  <option value="housing">住房</option>
                  <option value="utilities">水电煤</option>
                  <option value="salary">工资</option>
                  <option value="bonus">奖金</option>
                  <option value="investment">投资收益</option>
                  <option value="other-income">其他收入</option>
                  <option value="investment-out">投资支出</option>
                  <option value="transfer">转账</option>
                  <option value="other">其他</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="transaction-description" className="block text-sm font-medium text-text-primary">
                  交易描述 *
                </label>
                <input 
                  type="text" 
                  id="transaction-description" 
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  className={`w-full px-4 py-3 border border-border-light rounded-lg ${styles.formInputFocus} transition-all`}
                  placeholder="请输入交易描述" 
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="transaction-note" className="block text-sm font-medium text-text-primary">
                  备注
                </label>
                <textarea 
                  id="transaction-note" 
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  rows={3}
                  className={`w-full px-4 py-3 border border-border-light rounded-lg ${styles.formInputFocus} transition-all resize-none`}
                  placeholder="选填，可添加交易相关备注信息"
                />
              </div>
            </form>
          </div>
          
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-border-light bg-gray-50 rounded-b-xl flex-shrink-0">
            <button 
              type="button" 
              onClick={handleCloseModal}
              className="px-6 py-3 text-text-secondary border border-border-light rounded-lg hover:bg-gray-100 transition-all"
            >
              取消
            </button>
            <button 
              type="submit" 
              form="transaction-form"
              disabled={isLoading}
              className={`px-6 py-3 ${styles.gradientBg} text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50`}
            >
              <i className={`fas ${isEditMode ? 'fa-edit' : 'fa-save'} mr-2`}></i>
              {isEditMode ? '保存修改' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTransactionPage;

