

import React, { useState, useEffect } from 'react';
import styles from './styles.module.css';
import { classifyAccounting, fetchTransactions, scanTransactionAnomalies } from '../../api/endpoints';
import type { TransactionItem } from '../../api/types';
import DynamicAlert, { DynamicAlertItem } from '../../components/DynamicAlert';
import { auditUI, auditError } from '../../analytics/audit';

interface Transaction {
  id: string;
  time: string;
  description: string;
  category: string;
  amount: number;
  account: string;
  note: string;
  isAnomaly?: boolean;
}

interface CategoryOption {
  value: string;
  label: string;
}

interface TimeOption {
  value: string;
  label: string;
}

interface AccountOption {
  value: string;
  label: string;
}

const AccountingPage: React.FC = () => {
  // 分类显示层映射：后端内部码 -> 中文
  const toCnCategory = (code?: string): string => {
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
      'investment-out': '投资',
      'other-income': '其他收入',
      transfer: '转账',
      other: '其他',
    };
    if (!code) return '其他';
    return map[code] || code;
  };
  // 快速分类：输入与结果状态
  const [quickText, setQuickText] = useState<string>('');
  const [quickFiles, setQuickFiles] = useState<File[]>([]);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickPrefill, setQuickPrefill] = useState<{
    date: string;
    type: 'expense' | 'income';
    amount: string;
    account: string;
    category: string;
    description: string;
    note: string;
  } | null>(null);
  
  // 模拟交易数据（后端不可用时的回退）
  const mockTransactions: Transaction[] = [
    {
      id: 'tx001',
      time: '2024-01-15 14:30',
      description: '星巴克咖啡',
      category: '餐饮',
      amount: -45.00,
      account: '招商银行储蓄卡',
      note: '下午茶'
    },
    {
      id: 'tx002',
      time: '2024-01-15 10:15',
      description: '工资收入',
      category: '工资',
      amount: 15680.00,
      account: '工商银行储蓄卡',
      note: '月度工资'
    },
    {
      id: 'tx003',
      time: '2024-01-14 19:45',
      description: '超市购物',
      category: '购物',
      amount: -236.80,
      account: '支付宝',
      note: '生活用品'
    },
    {
      id: 'tx004',
      time: '2024-01-14 16:20',
      description: '理财产品申购',
      category: '投资',
      amount: -10000.00,
      account: '建设银行储蓄卡',
      note: '稳健理财'
    },
    {
      id: 'tx005',
      time: '2024-01-14 09:30',
      description: '地铁出行',
      category: '交通',
      amount: -6.00,
      account: '交通卡',
      note: '上班通勤'
    },
    {
      id: 'tx006',
      time: '2024-01-13 20:15',
      description: '餐厅晚餐',
      category: '餐饮',
      amount: -158.50,
      account: '招商银行储蓄卡',
      note: '朋友聚餐'
    },
    {
      id: 'tx007',
      time: '2024-01-13 15:30',
      description: '网购衣服',
      category: '购物',
      amount: -299.00,
      account: '支付宝',
      note: '冬季外套'
    },
    {
      id: 'tx008',
      time: '2024-01-12 11:20',
      description: '打车',
      category: '交通',
      amount: -35.00,
      account: '支付宝',
      note: '机场接送'
    },
    {
      id: 'tx009',
      time: '2024-01-12 08:45',
      description: '早餐',
      category: '餐饮',
      amount: -12.50,
      account: '交通卡',
      note: '包子铺'
    },
    {
      id: 'tx010',
      time: '2024-01-11 16:00',
      description: '理财产品赎回',
      category: '投资',
      amount: 50500.00,
      account: '建设银行储蓄卡',
      note: '到期赎回'
    }
  ];

  // 状态管理
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('7');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState<boolean>(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState<boolean>(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<DynamicAlertItem[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [showOnlyAnomaly, setShowOnlyAnomaly] = useState<boolean>(false);
  const [anomalyIds, setAnomalyIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('anomaly_tx_ids');
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch { return new Set(); }
  });

  const persistAnomalyIds = (ids: Set<string>) => {
    try { localStorage.setItem('anomaly_tx_ids', JSON.stringify(Array.from(ids))); } catch {}
  };

  // 筛选选项
  const categoryOptions: CategoryOption[] = [
    { value: '餐饮', label: '餐饮' },
    { value: '购物', label: '购物' },
    { value: '交通', label: '交通' },
    { value: '工资', label: '工资' },
    { value: '投资', label: '投资' }
  ];

  const timeOptions: TimeOption[] = [
    { value: '7', label: '最近7天' },
    { value: '30', label: '最近30天' },
    { value: '90', label: '最近3个月' },
    { value: '365', label: '最近1年' }
  ];

  const accountOptions: AccountOption[] = [
    { value: 'all', label: '全部账户' },
    { value: '招商银行储蓄卡', label: '招商银行储蓄卡' },
    { value: '工商银行储蓄卡', label: '工商银行储蓄卡' },
    { value: '支付宝', label: '支付宝' },
    { value: '建设银行储蓄卡', label: '建设银行储蓄卡' },
    { value: '交通卡', label: '交通卡' }
  ];

  // 设置页面标题
  useEffect(() => {
    const originalTitle = document.title;
    document.title = '金智通 - 智能记账';
    return () => { document.title = originalTitle; };
  }, []);

  // 从本地存储读取本地占位交易
  const loadLocalTransactions = (): Transaction[] => {
    try {
      const list = JSON.parse(localStorage.getItem('local_transactions') || '[]');
      if (!Array.isArray(list)) return [];
      return list as Transaction[];
    } catch { return []; }
  };

  // 将后端返回的 TransactionItem 映射为本页使用的 Transaction
  const mapFromApi = (item: TransactionItem): Transaction => {
    const amountYuan = (item.amount ?? 0) / 100; // 假设后端最小单位为“分”
    return {
      id: item.transactionId || `${item.accountId}-${item.time}`,
      time: new Date(item.time).toLocaleString(),
      description: item.description || item.merchant || '交易',
      category: toCnCategory(item.category) || '其他',
      amount: item.type === 'INCOME' ? Math.abs(amountYuan) : -Math.abs(amountYuan),
      account: item.accountId || '账户',
      note: item.remark || '',
      isAnomaly: item.isAnomaly || anomalyIds.has(item.transactionId || `${item.accountId}-${item.time}`),
    };
  };

  // 加载交易（优先后端，失败回退 mock + 本地）
  const loadTransactions = async () => {
    try {
      // 取近90天数据作为客户端筛选基础
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 90);
  const res = await fetchTransactions({ page: 1, size: 200, from: from.toISOString(), to: to.toISOString() });
  const list: TransactionItem[] = (res as any)?.data?.list || [];
      const apiTx = list.map(mapFromApi);
      const locals = loadLocalTransactions();
      setAllTransactions([...locals, ...apiTx].map(t => ({ ...t, isAnomaly: t.isAnomaly || anomalyIds.has(t.id) })));
    } catch (e) {
      const locals = loadLocalTransactions();
      setAllTransactions([...locals, ...mockTransactions].map(t => ({ ...t, isAnomaly: t.isAnomaly || anomalyIds.has(t.id) })));
    }
  };

  useEffect(() => {
    loadTransactions();
    const onFocus = () => setAllTransactions(prev => {
      // 合并最新本地数据（避免重复简单用 id 去重）
      const locals = loadLocalTransactions();
      const map = new Map<string, Transaction>();
      [...locals, ...prev].forEach(t => map.set(t.id, t));
      return Array.from(map.values());
    });
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // 解析文本到预填（本地启发式）
  const guessFromText = (text: string) => {
    const t = text.trim();
    const amtMatch = t.match(/([¥￥]?\s*-?\d{1,6}(?:\.\d{1,2})?)/);
    const amountNum = amtMatch ? parseFloat(amtMatch[1].replace(/[^\d.-]/g, '')) : 0;
    const isIncome = /(收入|到账|工资|refund|入账)/i.test(t);
    const isExpense = /(支出|消费|付款|扣款|支付)/i.test(t) || !isIncome;
    let category = 'other';
    const map: Array<[RegExp, string]> = [
      [/(餐|饭|外卖|咖啡|奶茶|食堂)/, 'food'],
      [/(超市|购物|电商|淘宝|京东|拼多多)/, 'shopping'],
      [/(地铁|公交|滴滴|打车|出行|交通)/, 'transport'],
      [/(娱乐|电影|游戏|KTV)/, 'entertainment'],
      [/(医疗|医院|药店|体检)/, 'medical'],
      [/(教育|培训|学费|课程)/, 'education'],
      [/(房租|房贷|物业|住房)/, 'housing'],
      [/(水电|燃气|宽带|话费|电费|水费|煤气)/, 'utilities'],
      [/(工资|薪|bonus|提成)/i, 'salary'],
      [/(理财|基金|申购|定投|买入|投资)/, 'investment-out'],
      [/(赎回|分红|收益|卖出)/, 'investment'],
    ];
    for (const [re, cat] of map) { if (re.test(t)) { category = cat; break; } }
    const description = t.split(/\n|\r/)[0].slice(0, 30) || '快速分类';
    const type: 'expense' | 'income' = isIncome && !isExpense ? 'income' : 'expense';
    const amount = (amountNum || 0).toFixed(2);
    const date = new Date().toISOString().split('T')[0];
    return { date, type, amount, account: '', category, description, note: t.slice(0, 140) };
  };

  const handleQuickFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    setQuickFiles(files);
  };

  const handleQuickClassify = async () => {
    setQuickError(null);
    setQuickPrefill(null);
    setQuickLoading(true);
    try {
      if (quickFiles.length > 0) {
        const res = await classifyAccounting({ images: quickFiles });
        const data = res.data;
        const amountNum = typeof data.amount === 'number' ? data.amount : 0;
        const bestCat = (data.categories || []).sort((a,b) => (b.score||0) - (a.score||0))[0]?.label || '';
        const labelMap: Record<string, string> = {
          '餐饮': 'food', '购物': 'shopping', '交通': 'transport', '娱乐': 'entertainment',
          '医疗': 'medical', '教育': 'education', '住房': 'housing', '水电煤': 'utilities',
          '工资': 'salary', '投资支出': 'investment-out', '投资': 'investment', '其他': 'other'
        };
        const mappedCat = labelMap[bestCat] || guessFromText(bestCat).category;
        const type: 'expense' | 'income' = amountNum >= 0 ? 'income' : 'expense';
        const absAmt = Math.abs(amountNum);
        const date = data.ts ? new Date(data.ts).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const description = data.merchant || '账单分类';
        setQuickPrefill({
          date,
          type,
          amount: absAmt.toFixed(2),
          account: '',
          category: mappedCat,
          description,
          note: (data.ocr?.map(b => b.text).join(' ') || '').slice(0, 140)
        });
        auditUI('quick_classify_image', { images: quickFiles.length, category: mappedCat });
      } else if (quickText.trim()) {
        const guess = guessFromText(quickText);
        setQuickPrefill(guess);
        auditUI('quick_classify_text', { category: guess.category });
      } else {
        setQuickError('请先粘贴文字或选择图片');
      }
    } catch (e: any) {
      setQuickError(e?.message || '分类失败，请稍后重试');
      auditError('quick_classify_error', e);
    } finally {
      setQuickLoading(false);
    }
  };

  const handleQuickConfirm = () => {
    if (!quickPrefill) return;
    const params = new URLSearchParams();
    Object.entries(quickPrefill).forEach(([k, v]) => params.set(k, String(v)));
    window.location.assign(`/add-transaction?${params.toString()}`);
  };

  // 筛选和排序逻辑
  useEffect(() => {
    let filtered = allTransactions.filter(tx => {
      // 搜索过滤
      const matchesSearch = !searchTerm || 
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.account.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 分类过滤
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(tx.category);
      
      // 账户过滤
      const matchesAccount = selectedAccount === 'all' || tx.account === selectedAccount;
      
      return matchesSearch && matchesCategory && matchesAccount;
    });

    // 排序
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortField as keyof Transaction];
        let bValue: any = b[sortField as keyof Transaction];
        
        if (sortField === 'time') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else if (sortField === 'amount') {
          aValue = parseFloat(aValue.toString());
          bValue = parseFloat(bValue.toString());
        }
        
        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }

    // 仅看异常筛选
    if (showOnlyAnomaly) {
      filtered = filtered.filter(tx => !!tx.isAnomaly);
    }
    setFilteredTransactions(filtered);
    setCurrentPage(1);
  }, [allTransactions, searchTerm, selectedCategories, selectedTimeRange, selectedAccount, sortField, sortDirection, showOnlyAnomaly]);

  // 处理点击其他地方关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('#category-filter-btn') && !target.closest('#category-dropdown')) {
        setShowCategoryDropdown(false);
      }
      if (!target.closest('#time-filter-btn') && !target.closest('#time-dropdown')) {
        setShowTimeDropdown(false);
      }
      if (!target.closest('#account-filter-btn') && !target.closest('#account-dropdown')) {
        setShowAccountDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // 事件处理函数
  const handleAddTransaction = () => {
    window.location.assign('/add-transaction');
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleCategoryToggle = (category: string) => {
    if (category === 'all') {
      if (selectedCategories.length === categoryOptions.length) {
        setSelectedCategories([]);
      } else {
        setSelectedCategories(categoryOptions.map(option => option.value));
      }
    } else {
      const newSelectedCategories = selectedCategories.includes(category)
        ? selectedCategories.filter(c => c !== category)
        : [...selectedCategories, category];
      setSelectedCategories(newSelectedCategories);
    }
  };

  const handleTimeRangeSelect = (value: string) => {
    setSelectedTimeRange(value);
    setShowTimeDropdown(false);
  };

  const handleAccountSelect = (value: string) => {
    setSelectedAccount(value);
    setShowAccountDropdown(false);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    const currentPageTransactions = getCurrentPageTransactions();
    if (checked) {
      setSelectedTransactions(new Set([...selectedTransactions, ...currentPageTransactions.map(tx => tx.id)]));
    } else {
      const newSelected = new Set(selectedTransactions);
      currentPageTransactions.forEach(tx => newSelected.delete(tx.id));
      setSelectedTransactions(newSelected);
    }
  };

  const handleTransactionSelect = (txId: string, checked: boolean) => {
    const newSelected = new Set(selectedTransactions);
    if (checked) {
      newSelected.add(txId);
    } else {
      newSelected.delete(txId);
    }
    setSelectedTransactions(newSelected);
  };

  const handleBatchEdit = () => {
    if (selectedTransactions.size > 0) {
      console.log('批量编辑选中的交易:', Array.from(selectedTransactions));
      // 实际项目中这里会打开批量编辑功能
    }
  };

  const handleAnomalyScan = async () => {
    setScanLoading(true);
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - 30);
      const res = await scanTransactionAnomalies(sinceDate.toISOString());
      const anomalies: string[] = res?.data?.anomalies || [];
      if (anomalies.length > 0) {
        // 合并异常ID并持久化
        setAnomalyIds(prev => {
          const next = new Set(prev);
          anomalies.forEach(id => next.add(id));
          persistAnomalyIds(next);
          // 同步到交易列表
          setAllTransactions(list => list.map(t => next.has(t.id) ? { ...t, isAnomaly: true } : t));
          return next;
        });
        setAlerts([{
          id: 'anomaly-scan',
          type: 'warning',
          title: `发现 ${anomalies.length} 条可能异常交易`,
          desc: '建议核对分类与金额，必要时更新或标记为异常。',
          actionText: '去处理',
          onAction: () => {
            // 简单做法：按金额倒序+支出优先，方便用户检查
            setSortField('amount');
            setSortDirection('desc');
            setShowOnlyAnomaly(true);
          }
        }]);
      } else {
        setAlerts([{
          id: 'anomaly-ok',
          type: 'success',
          title: '未发现异常交易',
          desc: '近30天交易看起来一切正常。'
        }]);
      }
    } catch (e) {
      setAlerts([{
        id: 'anomaly-error',
        type: 'danger',
        title: '异常检测失败',
        desc: '网络或服务暂不可用，请稍后重试。'
      }]);
    } finally {
      setScanLoading(false);
    }
  };

  // 行级：标记/取消异常
  const toggleTransactionAnomaly = (txId: string) => {
    setAnomalyIds(prev => {
      const next = new Set(prev);
      if (next.has(txId)) next.delete(txId); else next.add(txId);
      persistAnomalyIds(next);
      setAllTransactions(list => list.map(t => t.id === txId ? { ...t, isAnomaly: next.has(txId) } : t));
      return next;
    });
  };

  const handleBatchDelete = () => {
    if (selectedTransactions.size > 0) {
      if (confirm(`确定要删除选中的 ${selectedTransactions.size} 笔交易吗？`)) {
        console.log('批量删除选中的交易:', Array.from(selectedTransactions));
        // 实际项目中这里会执行删除操作
        setSelectedTransactions(new Set());
      }
    }
  };

  const handleTransactionView = (txId: string) => {
    console.log('查看交易详情:', txId);
    // 实际项目中这里会打开P-TRANSACTION_DETAIL弹窗
  };

  const handleTransactionEdit = (txId: string) => {
    console.log('编辑交易:', txId);
    // 实际项目中这里会打开P-ADD_TRANSACTION弹窗进行编辑
  };

  const handleTransactionDelete = (txId: string) => {
    if (confirm('确定要删除这笔交易吗？')) {
      console.log('删除交易:', txId);
      // 实际项目中这里会执行删除操作
    }
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(parseInt(event.target.value));
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 辅助函数
  const getCurrentPageTransactions = (): Transaction[] => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredTransactions.slice(startIndex, endIndex);
  };

  const getCategoryColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      '餐饮': 'bg-warning bg-opacity-20 text-warning',
      '购物': 'bg-info bg-opacity-20 text-info',
      '交通': 'bg-accent bg-opacity-20 text-accent',
      '工资': 'bg-success bg-opacity-20 text-success',
      '投资': 'bg-secondary bg-opacity-20 text-secondary'
    };
    return colors[category] || 'bg-gray-100 text-gray-600';
  };

  const getTimeRangeLabel = (): string => {
    const option = timeOptions.find(opt => opt.value === selectedTimeRange);
    return option ? option.label : '最近7天';
  };

  const getAccountLabel = (): string => {
    const option = accountOptions.find(opt => opt.value === selectedAccount);
    return option ? option.label : '全部账户';
  };

  const isAllCategoriesSelected = (): boolean => {
    return selectedCategories.length === categoryOptions.length;
  };

  const getTotalPages = (): number => {
    return Math.ceil(filteredTransactions.length / pageSize);
  };

  const generatePageNumbers = (): number[] => {
    const totalPages = getTotalPages();
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  const currentPageTransactions = getCurrentPageTransactions();
  const totalPages = getTotalPages();

  return (
    <div className={styles.pageWrapper}>
      <div className="p-6">
        {/* 页面头部 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-1">智能记账</h2>
              <nav className="text-sm text-text-secondary">
                <span>首页</span>
                <span className="mx-2">/</span>
                <span>智能记账</span>
              </nav>
            </div>
            <div className="flex gap-3">
              <button onClick={handleAddTransaction} className={`${styles.gradientBg} text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all`}>
                <i className="fas fa-plus mr-2"></i>
                添加新交易
              </button>
              <button onClick={() => window.location.assign('/bill-upload')} className="bg-secondary text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all">
                <i className="fas fa-file-upload mr-2"></i>
                票据上传
              </button>
              <button onClick={handleAnomalyScan} disabled={scanLoading} className="border border-warning text-warning px-6 py-2 rounded-lg font-medium hover:bg-warning hover:text-white transition-all disabled:opacity-50">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                {scanLoading ? '检测中…' : '异常检测'}
              </button>
            </div>
          </div>
        </div>

        {/* 动态提醒/异常结果 */}
        {alerts.length > 0 && (
          <div className="mb-4">
            <DynamicAlert items={alerts} />
          </div>
        )}

        {/* 快速分类区域 */}
        <div className={`${styles.gradientCard} rounded-xl p-4 shadow-card mb-6`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-text-primary">快速分类</h3>
            {quickError && <span className="text-xs text-danger">{quickError}</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
            <div className="md:col-span-2">
              <textarea
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                rows={2}
                placeholder="粘贴账单文字/描述（可选）"
                className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <div className="flex items-center gap-3 mt-2">
                <input type="file" accept="image/*" multiple onChange={handleQuickFilesChange} />
                {quickFiles.length > 0 && (
                  <span className="text-xs text-text-secondary">已选 {quickFiles.length} 张图片</span>
                )}
              </div>
            </div>
            <div className="flex md:justify-end items-center gap-2">
              <button onClick={() => { setQuickText(''); setQuickFiles([]); setQuickError(null); setQuickPrefill(null); }} className="px-4 py-2 border border-border-light rounded-lg text-text-secondary hover:bg-gray-50">清空</button>
              <button onClick={handleQuickClassify} disabled={quickLoading} className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                {quickLoading ? '分类中…' : '快速分类'}
              </button>
            </div>
          </div>
          {quickPrefill && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-border-light">
              <div className="text-sm text-text-secondary mb-2">二次确认以下信息，点击“去填写”将自动跳转并预填表单</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div><span className="text-text-secondary">日期：</span><span className="text-text-primary">{quickPrefill.date}</span></div>
                <div><span className="text-text-secondary">类型：</span><span className="text-text-primary">{quickPrefill.type === 'income' ? '收入' : '支出'}</span></div>
                <div><span className="text-text-secondary">金额：</span><span className="text-text-primary">¥{quickPrefill.amount}</span></div>
                <div><span className="text-text-secondary">分类：</span><span className="text-text-primary">{toCnCategory(quickPrefill.category)}</span></div>
                <div className="md:col-span-2 truncate"><span className="text-text-secondary">描述：</span><span className="text-text-primary">{quickPrefill.description}</span></div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={() => setQuickPrefill(null)} className="px-3 py-2 border border-border-light rounded-lg text-text-secondary hover:bg-gray-100 text-xs">修改再试</button>
                <button onClick={handleQuickConfirm} className="px-3 py-2 bg-success text-white rounded-lg hover:opacity-90 text-xs">去填写</button>
              </div>
            </div>
          )}
        </div>

        {/* 工具栏区域 */}
        <div className={`${styles.gradientCard} rounded-xl p-4 shadow-card mb-6`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* 搜索和筛选 */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 flex-1">
              {/* 搜索框 */}
              <div className="relative flex-1 max-w-md">
                <input 
                  type="text" 
                  placeholder="搜索交易描述、分类..." 
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary"></i>
              </div>
              
              {/* 分类筛选 */}
              <div className="relative">
                <button 
                  id="category-filter-btn"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="flex items-center space-x-2 px-4 py-2 border border-border-light rounded-lg hover:border-primary transition-colors"
                >
                  <span>分类</span>
                  <i className="fas fa-chevron-down text-text-secondary"></i>
                </button>
                {showCategoryDropdown && (
                  <div id="category-dropdown" className="absolute top-full left-0 mt-1 w-48 bg-white border border-border-light rounded-lg shadow-lg z-10">
                    <div className="p-2">
                      <label className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={isAllCategoriesSelected()}
                          onChange={() => handleCategoryToggle('all')}
                        />
                        <span>全部</span>
                      </label>
                      {categoryOptions.map((option) => (
                        <label key={option.value} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={selectedCategories.includes(option.value)}
                            onChange={() => handleCategoryToggle(option.value)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* 时间范围选择 */}
              <div className="relative">
                <button 
                  id="time-filter-btn"
                  onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                  className="flex items-center space-x-2 px-4 py-2 border border-border-light rounded-lg hover:border-primary transition-colors"
                >
                  <span>{getTimeRangeLabel()}</span>
                  <i className="fas fa-chevron-down text-text-secondary"></i>
                </button>
                {showTimeDropdown && (
                  <div id="time-dropdown" className="absolute top-full left-0 mt-1 w-48 bg-white border border-border-light rounded-lg shadow-lg z-10">
                    <div className="p-2">
                      {timeOptions.map((option) => (
                        <div 
                          key={option.value}
                          onClick={() => handleTimeRangeSelect(option.value)}
                          className="p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          {option.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* 账户切换 */}
              <div className="relative">
                <button 
                  id="account-filter-btn"
                  onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                  className="flex items-center space-x-2 px-4 py-2 border border-border-light rounded-lg hover:border-primary transition-colors"
                >
                  <span>{getAccountLabel()}</span>
                  <i className="fas fa-chevron-down text-text-secondary"></i>
                </button>
                {showAccountDropdown && (
                  <div id="account-dropdown" className="absolute top-full left-0 mt-1 w-48 bg-white border border-border-light rounded-lg shadow-lg z-10">
                    <div className="p-2">
                      {accountOptions.map((option) => (
                        <div 
                          key={option.value}
                          onClick={() => handleAccountSelect(option.value)}
                          className="p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          {option.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* 批量操作 */}
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" checked={showOnlyAnomaly} onChange={(e) => setShowOnlyAnomaly(e.target.checked)} />
                <span>仅看异常</span>
              </label>
            </div>

            <div className={`flex items-center space-x-3 transition-all ${selectedTransactions.size > 0 ? '' : 'opacity-50 pointer-events-none'}`}>
              <button onClick={handleBatchEdit} className="px-4 py-2 border border-border-light rounded-lg hover:border-primary transition-colors">
                <i className="fas fa-edit mr-2"></i>批量编辑
              </button>
              <button onClick={handleBatchDelete} className="px-4 py-2 border border-danger rounded-lg hover:bg-danger hover:text-white transition-colors">
                <i className="fas fa-trash mr-2"></i>批量删除
              </button>
            </div>
          </div>
        </div>

        {/* 交易记录列表 */}
        <section className="mb-6">
          <div className={`${styles.gradientCard} rounded-xl shadow-card overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-border-light">
                  <tr>
                    <th className="text-left py-3 px-4 w-10">
                      <input 
                        type="checkbox" 
                        checked={currentPageTransactions.length > 0 && currentPageTransactions.every(tx => selectedTransactions.has(tx.id))}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-border-light"
                      />
                    </th>
                    <th 
                      className={`text-left py-3 px-4 text-sm font-medium text-text-secondary cursor-pointer hover:text-primary transition-colors ${sortField === 'time' ? (sortDirection === 'asc' ? styles.sortAsc : styles.sortDesc) : ''}`}
                      onClick={() => handleSort('time')}
                    >
                      交易时间
                      <i className={`fas fa-sort ml-1 ${styles.sortIcon}`}></i>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">交易描述</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">状态</th>
                    <th 
                      className={`text-left py-3 px-4 text-sm font-medium text-text-secondary cursor-pointer hover:text-primary transition-colors ${sortField === 'category' ? (sortDirection === 'asc' ? styles.sortAsc : styles.sortDesc) : ''}`}
                      onClick={() => handleSort('category')}
                    >
                      分类
                      <i className={`fas fa-sort ml-1 ${styles.sortIcon}`}></i>
                    </th>
                    <th 
                      className={`text-left py-3 px-4 text-sm font-medium text-text-secondary cursor-pointer hover:text-primary transition-colors ${sortField === 'amount' ? (sortDirection === 'asc' ? styles.sortAsc : styles.sortDesc) : ''}`}
                      onClick={() => handleSort('amount')}
                    >
                      金额
                      <i className={`fas fa-sort ml-1 ${styles.sortIcon}`}></i>
                    </th>
                    <th 
                      className={`text-left py-3 px-4 text-sm font-medium text-text-secondary cursor-pointer hover:text-primary transition-colors ${sortField === 'account' ? (sortDirection === 'asc' ? styles.sortAsc : styles.sortDesc) : ''}`}
                      onClick={() => handleSort('account')}
                    >
                      账户
                      <i className={`fas fa-sort ml-1 ${styles.sortIcon}`}></i>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">备注</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPageTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16">
                        <div className={`w-24 h-24 mx-auto mb-4 ${styles.gradientBg} rounded-full flex items-center justify-center`}>
                          <i className="fas fa-calculator text-white text-2xl"></i>
                        </div>
                        <h3 className="text-lg font-medium text-text-primary mb-2">暂无交易记录</h3>
                        <p className="text-text-secondary mb-6">开始记录您的第一笔交易吧</p>
                        <button onClick={handleAddTransaction} className={`${styles.gradientBg} text-white px-6 py-2 rounded-lg font-medium`}>
                          <i className="fas fa-plus mr-2"></i>添加交易
                        </button>
                      </td>
                    </tr>
                  ) : (
                    currentPageTransactions.map(tx => (
                      <tr 
                        key={tx.id}
                        className={`${styles.transactionRow} border-b border-border-light transition-all ${selectedTransactions.has(tx.id) ? styles.tableChecked : ''}`}
                      >
                        <td className="py-3 px-4">
                          <input 
                            type="checkbox" 
                            checked={selectedTransactions.has(tx.id)}
                            onChange={(e) => handleTransactionSelect(tx.id, e.target.checked)}
                            className="rounded border-border-light"
                          />
                        </td>
                        <td className="py-3 px-4 text-sm text-text-primary">{tx.time}</td>
                        <td className="py-3 px-4 text-sm text-text-primary">{tx.description}</td>
                        <td className="py-3 px-4 text-sm">
                          {tx.isAnomaly ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-danger bg-opacity-10 text-danger border border-danger border-opacity-20">异常</span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">正常</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 ${getCategoryColor(tx.category)} text-xs rounded-full`}>{tx.category}</span>
                        </td>
                        <td className={`py-3 px-4 text-sm font-medium ${tx.amount >= 0 ? 'text-success' : 'text-danger'}`}>
                          {tx.amount >= 0 ? '+' : ''}¥{tx.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-sm text-text-secondary">{tx.account}</td>
                        <td className="py-3 px-4 text-sm text-text-secondary">{tx.note}</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <button onClick={() => handleTransactionView(tx.id)} className="text-primary text-sm hover:underline">详情</button>
                            <button onClick={() => handleTransactionEdit(tx.id)} className="text-text-secondary text-sm hover:text-primary">编辑</button>
                            <button onClick={() => handleTransactionDelete(tx.id)} className="text-danger text-sm hover:underline">删除</button>
                            <button onClick={() => toggleTransactionAnomaly(tx.id)} className={`text-sm ${tx.isAnomaly ? 'text-warning' : 'text-accent'} hover:underline`}>
                              {tx.isAnomaly ? '取消异常' : '标记异常'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 分页区域 */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-secondary">
            共 <span>{filteredTransactions.length}</span> 条记录，每页显示 
            <select value={pageSize} onChange={handlePageSizeChange} className="border border-border-light rounded px-2 py-1 text-sm ml-1">
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select> 条
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-border-light rounded hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <div className="flex items-center space-x-1">
              {generatePageNumbers().map(page => (
                <button 
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 border rounded transition-colors ${page === currentPage ? 'bg-primary text-white border-primary' : 'border-border-light hover:border-primary'}`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 border border-border-light rounded hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingPage;

