

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './styles.module.css';
import { loadAuditReminderSettings, saveAuditReminderSettings, AuditReminderFrequency } from '../../hooks/useAuditReminder';
import { fetchReminders, createReminder, updateReminder, updateReminderStatus } from '../../api/endpoints';
import type { ReminderItem } from '../../api/types';

interface ProfileFormData {
  username: string;
  email: string;
  phone: string;
  gender: string;
  address: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  billReminder: boolean;
  transactionNotification: boolean;
  productMaturity: boolean;
  systemNotification: boolean;
  emailNotification: boolean;
  smsNotification: boolean;
  pushNotification: boolean;
  inappNotification: boolean;
  auditCheckReminder?: boolean; // 新增：记账校对提醒开关
}

type SettingsTab = 'profile' | 'accounts' | 'security' | 'notifications' | 'risk';

const UserSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  
  const [profileFormData, setProfileFormData] = useState<ProfileFormData>({
    username: '张先生',
    email: 'zhang.san@example.com',
    phone: '138****8888',
    gender: 'male',
    address: '北京市朝阳区金融街88号'
  });

  const [passwordFormData, setPasswordFormData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    billReminder: true,
    transactionNotification: true,
    productMaturity: true,
    systemNotification: false,
    emailNotification: true,
    smsNotification: true,
    pushNotification: false,
    inappNotification: true,
    auditCheckReminder: false
  });

  // 记账校对提醒配置（本地持久化）
  const [auditEnabled, setAuditEnabled] = useState<boolean>(false);
  const [auditFrequency, setAuditFrequency] = useState<AuditReminderFrequency>('monthly');
  const [auditHour, setAuditHour] = useState<number>(20);
  const [auditReminderId, setAuditReminderId] = useState<string | null>(null);
  const [auditSaving, setAuditSaving] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  useEffect(() => {
    const originalTitle = document.title;
    document.title = '金智通 - 个人中心';
    return () => { document.title = originalTitle; };
  }, []);

  useEffect(() => {
    const s = loadAuditReminderSettings();
    setAuditEnabled(!!s.enabled);
    setAuditFrequency(s.frequency);
    setAuditHour(s.hour ?? 20);
    setNotificationSettings(prev => ({ ...prev, auditCheckReminder: !!s.enabled }));

    // 尝试加载服务端 AUDIT 提醒
    (async () => {
      try {
        const res = await fetchReminders();
        const list: ReminderItem[] = (res as any)?.data || [];
        const audit = list.find(r => r.type === 'AUDIT');
        if (audit) {
          setAuditReminderId(audit.id);
          const freq: AuditReminderFrequency = audit.config?.frequency === 'DAY' ? 'daily' : audit.config?.frequency === 'WEEK' ? 'weekly' : 'monthly';
          const hour = audit.config?.timeOfDay ? parseInt(audit.config.timeOfDay.split(':')[0]) : (s.hour ?? 20);
          setAuditEnabled(true);
          setAuditFrequency(freq);
          setAuditHour(isNaN(hour) ? 20 : hour);
          saveAuditReminderSettings({ enabled: true, frequency: freq, hour: hour, snoozeMinutes: s.snoozeMinutes });
          setNotificationSettings(prev => ({ ...prev, auditCheckReminder: true }));
        }
      } catch (e) {
        // 静默失败：保持本地模式
      }
    })();
  }, []);

  const handleProfileInputChange = (field: keyof ProfileFormData, value: string) => {
    setProfileFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordInputChange = (field: keyof PasswordFormData, value: string) => {
    setPasswordFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNotificationToggle = (field: keyof NotificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('保存基本资料', profileFormData);
    alert('基本资料保存成功！');
  };

  const handleProfileCancel = () => {
    setProfileFormData({
      username: '张先生',
      email: 'zhang.san@example.com',
      phone: '138****8888',
      gender: 'male',
      address: '北京市朝阳区金融街88号'
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordFormData.currentPassword || !passwordFormData.newPassword || !passwordFormData.confirmPassword) {
      alert('请填写完整的密码信息');
      return;
    }

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      alert('新密码与确认密码不一致');
      return;
    }

    console.log('修改密码', passwordFormData);
    alert('密码修改成功！');
    setPasswordFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handlePasswordCancel = () => {
    setPasswordFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuditError(null);
    setAuditSaving(true);
    console.log('保存通知偏好设置', notificationSettings);
    // 先保存本地配置（本地兜底）
    saveAuditReminderSettings({ enabled: auditEnabled, frequency: auditFrequency, hour: auditHour, snoozeMinutes: 120 });
    try {
      // 若开启
      if (auditEnabled) {
        const payload: Partial<ReminderItem> = {
          title: '记账校对',
          type: 'AUDIT',
          status: 'PENDING',
          // 简单策略：下一个提醒时间 = 今天指定 hour（若已过则顺延 1 小时）
          dueAt: (() => {
            const now = new Date();
            const d = new Date();
            d.setMinutes(0,0,0);
            d.setHours(auditHour,0,0,0);
            if (d <= now) d.setHours(d.getHours() + 1); // 轻量避免“已过期”
            return d.toISOString();
          })(),
          config: { frequency: auditFrequency === 'daily' ? 'DAY' : auditFrequency === 'weekly' ? 'WEEK' : 'MONTH', timeOfDay: `${String(auditHour).padStart(2,'0')}:00` }
        };
        if (!auditReminderId) {
          // 创建
            const created = await createReminder(payload);
            setAuditReminderId(created.data.id);
        } else {
          // 更新：若只是调整配置，用 updateReminder；如果需要重置状态也可调用 status 接口
          await updateReminder(auditReminderId, payload);
          // 保证状态为 PENDING（若后端需要显式更新，可再调用 status 接口）
          try { await updateReminderStatus(auditReminderId, 'PENDING'); } catch {}
        }
      } else {
        // 关闭提醒：若存在 id，可选择置为 DONE 或 SNOOZE（此处用 DONE）
        if (auditReminderId) {
          try { await updateReminderStatus(auditReminderId, 'DONE'); } catch {}
        }
      }
      alert('通知偏好设置保存成功！');
    } catch (err: any) {
      setAuditError(err?.message || '提醒配置同步后端失败，已本地保存');
      alert('部分成功：本地已保存，但后端同步失败');
    } finally {
      setAuditSaving(false);
    }
  };

  const handleNotificationCancel = () => {
    setNotificationSettings({
      billReminder: true,
      transactionNotification: true,
      productMaturity: true,
      systemNotification: false,
      emailNotification: true,
      smsNotification: true,
      pushNotification: false,
      inappNotification: true,
      auditCheckReminder: false
    });
  };

  const handleAddAccount = () => {
    console.log('添加新账户');
    alert('添加账户功能开发中...');
  };

  const handleAccountEdit = (accountId: string) => {
    console.log('编辑账户', accountId);
    alert('编辑账户功能开发中...');
  };

  const handleAccountDelete = (accountId: string) => {
    if (confirm('确定要删除这个账户吗？')) {
      console.log('删除账户', accountId);
      // 这里应该调用删除API
    }
  };

  const handleChangePhone = () => {
    console.log('更换手机号');
    alert('更换手机号功能开发中...');
  };

  const handleStartRiskAssessment = () => {
    console.log('开始风险测评');
    alert('即将跳转到风险测评页面...');
  };

  const handleViewRiskDetail = (date: string) => {
    console.log('查看测评详情', date);
    alert('查看测评详情功能开发中...');
  };

  return (
    <div className="p-6">
      {/* 页面头部 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-1">个人中心</h2>
            <nav className="text-sm text-text-secondary">
              <span>个人中心</span>
            </nav>
          </div>
        </div>
      </div>

      {/* 二级菜单和内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧二级菜单 */}
        <aside className="lg:col-span-1">
          <div className={`${styles.gradientCard} rounded-xl p-4 shadow-card`}>
            <h3 className="text-lg font-semibold text-text-primary mb-4">设置选项</h3>
            <nav className="space-y-2">
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-left ${
                  activeTab === 'profile' ? styles.settingsTabActive : `${styles.settingsTab} text-text-secondary`
                }`}
              >
                <i className="fas fa-user text-lg"></i>
                <span className="font-medium">基本资料</span>
              </button>
              <button 
                onClick={() => setActiveTab('accounts')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-left ${
                  activeTab === 'accounts' ? styles.settingsTabActive : `${styles.settingsTab} text-text-secondary`
                }`}
              >
                <i className="fas fa-university text-lg"></i>
                <span className="font-medium">账户管理</span>
              </button>
              <button 
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-left ${
                  activeTab === 'security' ? styles.settingsTabActive : `${styles.settingsTab} text-text-secondary`
                }`}
              >
                <i className="fas fa-shield-alt text-lg"></i>
                <span className="font-medium">安全设置</span>
              </button>
              <button 
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-left ${
                  activeTab === 'notifications' ? styles.settingsTabActive : `${styles.settingsTab} text-text-secondary`
                }`}
              >
                <i className="fas fa-bell text-lg"></i>
                <span className="font-medium">通知偏好</span>
              </button>
              <button 
                onClick={() => setActiveTab('risk')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-left ${
                  activeTab === 'risk' ? styles.settingsTabActive : `${styles.settingsTab} text-text-secondary`
                }`}
              >
                <i className="fas fa-chart-pie text-lg"></i>
                <span className="font-medium">风险测评</span>
              </button>
            </nav>
          </div>
        </aside>

        {/* 右侧内容区 */}
        <div className="lg:col-span-3 space-y-6">
          {/* 基本资料 */}
          <section className={activeTab === 'profile' ? styles.settingSectionActive : styles.settingSection}>
            <div className={`${styles.gradientCard} rounded-xl p-6 shadow-card`}>
              <h3 className="text-lg font-semibold text-text-primary mb-6">基本资料</h3>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="username" className="block text-sm font-medium text-text-primary">用户名</label>
                    <input 
                      type="text" 
                      id="username" 
                      name="username" 
                      className={`w-full px-4 py-3 border border-border-light rounded-lg ${styles.formInputFocus}`}
                      value={profileFormData.username}
                      onChange={(e) => handleProfileInputChange('username', e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-medium text-text-primary">邮箱</label>
                    <input 
                      type="email" 
                      id="email" 
                      name="email" 
                      className={`w-full px-4 py-3 border border-border-light rounded-lg ${styles.formInputFocus}`}
                      value={profileFormData.email}
                      onChange={(e) => handleProfileInputChange('email', e.target.value)}
                      required 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="phone" className="block text-sm font-medium text-text-primary">手机号</label>
                    <input 
                      type="tel" 
                      id="phone" 
                      name="phone" 
                      className={`w-full px-4 py-3 border border-border-light rounded-lg ${styles.formInputFocus}`}
                      value={profileFormData.phone}
                      onChange={(e) => handleProfileInputChange('phone', e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="gender" className="block text-sm font-medium text-text-primary">性别</label>
                    <select 
                      id="gender" 
                      name="gender" 
                      className={`w-full px-4 py-3 border border-border-light rounded-lg ${styles.formInputFocus}`}
                      value={profileFormData.gender}
                      onChange={(e) => handleProfileInputChange('gender', e.target.value)}
                    >
                      <option value="male">男</option>
                      <option value="female">女</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="address" className="block text-sm font-medium text-text-primary">联系地址</label>
                  <textarea 
                    id="address" 
                    name="address" 
                    rows={3}
                    className={`w-full px-4 py-3 border border-border-light rounded-lg ${styles.formInputFocus}`}
                    placeholder="请输入联系地址"
                    value={profileFormData.address}
                    onChange={(e) => handleProfileInputChange('address', e.target.value)}
                  />
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                  <button 
                    type="button" 
                    onClick={handleProfileCancel}
                    className="px-6 py-3 border border-border-light text-text-secondary rounded-lg hover:bg-gray-50 transition-all"
                  >
                    取消
                  </button>
                  <button 
                    type="submit" 
                    className={`${styles.gradientBg} text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all`}
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* 账户管理 */}
          <section className={activeTab === 'accounts' ? styles.settingSectionActive : styles.settingSection}>
            <div className={`${styles.gradientCard} rounded-xl p-6 shadow-card`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-text-primary">账户管理</h3>
                <button 
                  onClick={handleAddAccount}
                  className={`${styles.gradientBg} text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all text-sm`}
                >
                  <i className="fas fa-plus mr-2"></i>
                  添加账户
                </button>
              </div>
              <div className="space-y-4">
                <div className={`${styles.accountCard} rounded-lg p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-university text-blue-600 text-xl"></i>
                      </div>
                      <div>
                        <h4 className="font-medium text-text-primary">招商银行储蓄卡</h4>
                        <p className="text-sm text-text-secondary">****1234</p>
                        <p className="text-sm text-success">余额：¥85,680.00</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleAccountEdit('1')}
                        className="text-primary hover:text-secondary transition-colors"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        onClick={() => handleAccountDelete('1')}
                        className="text-danger hover:text-red-700 transition-colors"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className={`${styles.accountCard} rounded-lg p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-credit-card text-red-600 text-xl"></i>
                      </div>
                      <div>
                        <h4 className="font-medium text-text-primary">招商银行信用卡</h4>
                        <p className="text-sm text-text-secondary">****5678</p>
                        <p className="text-sm text-warning">欠款：¥5,280.00</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleAccountEdit('2')}
                        className="text-primary hover:text-secondary transition-colors"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        onClick={() => handleAccountDelete('2')}
                        className="text-danger hover:text-red-700 transition-colors"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className={`${styles.accountCard} rounded-lg p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <i className="fab fa-alipay text-green-600 text-xl"></i>
                      </div>
                      <div>
                        <h4 className="font-medium text-text-primary">支付宝</h4>
                        <p className="text-sm text-text-secondary">zhang.san@example.com</p>
                        <p className="text-sm text-success">余额：¥12,580.00</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleAccountEdit('3')}
                        className="text-primary hover:text-secondary transition-colors"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        onClick={() => handleAccountDelete('3')}
                        className="text-danger hover:text-red-700 transition-colors"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 安全设置 */}
          <section className={activeTab === 'security' ? styles.settingSectionActive : styles.settingSection}>
            <div className={`${styles.gradientCard} rounded-xl p-6 shadow-card`}>
              <h3 className="text-lg font-semibold text-text-primary mb-6">安全设置</h3>
              <div className="space-y-6">
                <div className="border-b border-border-light pb-6">
                  <h4 className="font-medium text-text-primary mb-4">修改密码</h4>
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="current-password" className="block text-sm font-medium text-text-primary">当前密码</label>
                        <input 
                          type="password" 
                          id="current-password" 
                          name="current-password" 
                          className={`w-full px-4 py-3 border border-border-light rounded-lg ${styles.formInputFocus}`}
                          placeholder="请输入当前密码"
                          value={passwordFormData.currentPassword}
                          onChange={(e) => handlePasswordInputChange('currentPassword', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="new-password" className="block text-sm font-medium text-text-primary">新密码</label>
                        <input 
                          type="password" 
                          id="new-password" 
                          name="new-password" 
                          className={`w-full px-4 py-3 border border-border-light rounded-lg ${styles.formInputFocus}`}
                          placeholder="请输入新密码"
                          value={passwordFormData.newPassword}
                          onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="confirm-password" className="block text-sm font-medium text-text-primary">确认新密码</label>
                      <input 
                        type="password" 
                        id="confirm-password" 
                        name="confirm-password" 
                        className={`w-full px-4 py-3 border border-border-light rounded-lg ${styles.formInputFocus}`}
                        placeholder="请再次输入新密码"
                        value={passwordFormData.confirmPassword}
                        onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end space-x-4">
                      <button 
                        type="button" 
                        onClick={handlePasswordCancel}
                        className="px-6 py-3 border border-border-light text-text-secondary rounded-lg hover:bg-gray-50 transition-all"
                      >
                        取消
                      </button>
                      <button 
                        type="submit" 
                        className={`${styles.gradientBg} text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all`}
                      >
                        保存
                      </button>
                    </div>
                  </form>
                </div>
                
                <div className="border-b border-border-light pb-6">
                  <h4 className="font-medium text-text-primary mb-4">绑定手机</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-text-primary">138****8888</p>
                      <p className="text-sm text-text-secondary">已绑定</p>
                    </div>
                    <button 
                      onClick={handleChangePhone}
                      className="px-4 py-2 border border-border-light text-text-secondary rounded-lg hover:bg-gray-50 transition-all"
                    >
                      更换
                    </button>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-text-primary mb-4">登录日志</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-text-primary">2024-01-15 14:30</p>
                        <p className="text-xs text-text-secondary">IP: 192.168.1.100 | 设备: Windows Chrome</p>
                      </div>
                      <span className="text-xs text-success">成功</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-text-primary">2024-01-14 09:15</p>
                        <p className="text-xs text-text-secondary">IP: 192.168.1.100 | 设备: Windows Chrome</p>
                      </div>
                      <span className="text-xs text-success">成功</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-text-primary">2024-01-13 20:45</p>
                        <p className="text-xs text-text-secondary">IP: 10.0.0.5 | 设备: Mac Safari</p>
                      </div>
                      <span className="text-xs text-success">成功</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 通知偏好 */}
          <section className={activeTab === 'notifications' ? styles.settingSectionActive : styles.settingSection}>
            <div className={`${styles.gradientCard} rounded-xl p-6 shadow-card`}>
              <h3 className="text-lg font-semibold text-text-primary mb-6">通知偏好</h3>
              <form onSubmit={handleNotificationSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-text-primary">账单提醒</h4>
                      <p className="text-sm text-text-secondary">信用卡还款、水电费等账单提醒</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={notificationSettings.billReminder}
                        onChange={() => handleNotificationToggle('billReminder')}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-text-primary">交易通知</h4>
                      <p className="text-sm text-text-secondary">大额交易、异常交易提醒</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={notificationSettings.transactionNotification}
                        onChange={() => handleNotificationToggle('transactionNotification')}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-text-primary">理财产品到期提醒</h4>
                      <p className="text-sm text-text-secondary">理财产品到期、收益变动通知</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={notificationSettings.productMaturity}
                        onChange={() => handleNotificationToggle('productMaturity')}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-text-primary">系统通知</h4>
                      <p className="text-sm text-text-secondary">系统更新、功能优化等通知</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={notificationSettings.systemNotification}
                        onChange={() => handleNotificationToggle('systemNotification')}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-text-primary">记账校对提醒</h4>
                      <p className="text-sm text-text-secondary">定期截图/核对分类是否正确，提升数据质量</p>
                      {auditError && <p className="text-xs text-danger mt-1">{auditError}</p>}
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={auditEnabled}
                        onChange={() => {
                          const next = !auditEnabled;
                          setAuditEnabled(next);
                          setNotificationSettings(prev => ({ ...prev, auditCheckReminder: next }));
                        }}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  {auditEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border-light rounded-lg">
                      <div>
                        <label className="block text-sm text-text-secondary mb-1">提醒频率</label>
                        <select value={auditFrequency} onChange={(e) => setAuditFrequency(e.target.value as AuditReminderFrequency)} className="w-full px-3 py-2 border border-border-light rounded-lg">
                          <option value="daily">每天</option>
                          <option value="weekly">每周</option>
                          <option value="monthly">每月</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-text-secondary mb-1">提醒时间（小时）</label>
                        <input type="number" min={0} max={23} value={auditHour} onChange={(e) => setAuditHour(Math.min(23, Math.max(0, Number(e.target.value))))} className="w-full px-3 py-2 border border-border-light rounded-lg" />
                      </div>
                      <div className="md:col-span-2 text-xs text-text-secondary">说明：每天/每周/每月到达指定小时后，系统会在首页提醒你对近期交易进行截图和分类核对。</div>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-border-light pt-6">
                  <h4 className="font-medium text-text-primary mb-4">通知方式</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={notificationSettings.emailNotification}
                          onChange={() => handleNotificationToggle('emailNotification')}
                        />
                        <div className="w-5 h-5 border-2 border-gray-300 rounded peer peer-checked:bg-primary peer-checked:border-primary"></div>
                      </label>
                      <span className="text-sm text-text-primary">邮件通知</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={notificationSettings.smsNotification}
                          onChange={() => handleNotificationToggle('smsNotification')}
                        />
                        <div className="w-5 h-5 border-2 border-gray-300 rounded peer peer-checked:bg-primary peer-checked:border-primary"></div>
                      </label>
                      <span className="text-sm text-text-primary">短信通知</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={notificationSettings.pushNotification}
                          onChange={() => handleNotificationToggle('pushNotification')}
                        />
                        <div className="w-5 h-5 border-2 border-gray-300 rounded peer peer-checked:bg-primary peer-checked:border-primary"></div>
                      </label>
                      <span className="text-sm text-text-primary">推送通知</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={notificationSettings.inappNotification}
                          onChange={() => handleNotificationToggle('inappNotification')}
                        />
                        <div className="w-5 h-5 border-2 border-gray-300 rounded peer peer-checked:bg-primary peer-checked:border-primary"></div>
                      </label>
                      <span className="text-sm text-text-primary">站内通知</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-4 pt-6">
                  <button 
                    type="button" 
                    onClick={handleNotificationCancel}
                    className="px-6 py-3 border border-border-light text-text-secondary rounded-lg hover:bg-gray-50 transition-all"
                  >
                    取消
                  </button>
                  <button 
                    type="submit" 
                    disabled={auditSaving}
                    className={`${styles.gradientBg} text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-60`}
                  >
                    {auditSaving ? '保存中…' : '保存'}
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* 风险测评 */}
          <section className={activeTab === 'risk' ? styles.settingSectionActive : styles.settingSection}>
            <div className={`${styles.gradientCard} rounded-xl p-6 shadow-card`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-text-primary">风险测评</h3>
                <button 
                  onClick={handleStartRiskAssessment}
                  className={`${styles.gradientBg} text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all`}
                >
                  开始测评
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="p-4 bg-success bg-opacity-10 rounded-lg border border-success border-opacity-20">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-success bg-opacity-20 rounded-lg flex items-center justify-center">
                      <i className="fas fa-check text-success text-lg"></i>
                    </div>
                    <div>
                      <h4 className="font-medium text-text-primary">已完成风险测评</h4>
                      <p className="text-sm text-text-secondary">测评时间：2024-01-01</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-primary">稳健型</p>
                      <p className="text-sm text-text-secondary">风险等级</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-success">75分</p>
                      <p className="text-sm text-text-secondary">测评得分</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-warning">中等</p>
                      <p className="text-sm text-text-secondary">承受能力</p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-border-light pt-6">
                  <h4 className="font-medium text-text-primary mb-4">历史测评记录</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-text-primary">2024-01-01</p>
                        <p className="text-xs text-text-secondary">稳健型 | 75分</p>
                      </div>
                      <button 
                        onClick={() => handleViewRiskDetail('2024-01-01')}
                        className="text-primary text-sm hover:underline"
                      >
                        查看详情
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-text-primary">2023-07-15</p>
                        <p className="text-xs text-text-secondary">稳健型 | 72分</p>
                      </div>
                      <button 
                        onClick={() => handleViewRiskDetail('2023-07-15')}
                        className="text-primary text-sm hover:underline"
                      >
                        查看详情
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-text-primary">2023-01-20</p>
                        <p className="text-xs text-text-secondary">保守型 | 65分</p>
                      </div>
                      <button 
                        onClick={() => handleViewRiskDetail('2023-01-20')}
                        className="text-primary text-sm hover:underline"
                      >
                        查看详情
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default UserSettingsPage;

