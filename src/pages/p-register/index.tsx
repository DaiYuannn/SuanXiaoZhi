

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './styles.module.css';

interface FormData {
  username: string;
  contact: string;
  password: string;
  confirmPassword: string;
  verificationCode: string;
  agreement: boolean;
}

interface FormErrors {
  username: string;
  contact: string;
  password: string;
  confirmPassword: string;
  verificationCode: string;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  
  // 表单数据状态
  const [formData, setFormData] = useState<FormData>({
    username: '',
    contact: '',
    password: '',
    confirmPassword: '',
    verificationCode: '',
    agreement: false
  });

  // 错误信息状态
  const [formErrors, setFormErrors] = useState<FormErrors>({
    username: '',
    contact: '',
    password: '',
    confirmPassword: '',
    verificationCode: ''
  });

  // UI状态
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRegisterSuccess, setShowRegisterSuccess] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [isGetCodeDisabled, setIsGetCodeDisabled] = useState(false);

  // 定时器引用
  const countdownTimerRef = useRef<number | null>(null);

  // 设置页面标题
  useEffect(() => {
    const originalTitle = document.title;
    document.title = '金智通 - 注册';
    return () => {
      document.title = originalTitle;
    };
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  // 表单输入处理
  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 清除对应字段的错误信息
    if (typeof value === 'string' && formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // 表单验证函数
  const validateUsername = (): boolean => {
    const username = formData.username.trim();
    if (!username) {
      setFormErrors(prev => ({ ...prev, username: '请输入用户名' }));
      return false;
    }
    if (username.length < 3 || username.length > 20) {
      setFormErrors(prev => ({ ...prev, username: '用户名长度应为3-20个字符' }));
      return false;
    }
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
      setFormErrors(prev => ({ ...prev, username: '用户名只能包含字母、数字、下划线和中文' }));
      return false;
    }
    setFormErrors(prev => ({ ...prev, username: '' }));
    return true;
  };

  const validateContact = (): boolean => {
    const contact = formData.contact.trim();
    if (!contact) {
      setFormErrors(prev => ({ ...prev, contact: '请输入手机号或邮箱' }));
      return false;
    }
    const phoneRegex = /^1[3-9]\d{9}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!phoneRegex.test(contact) && !emailRegex.test(contact)) {
      setFormErrors(prev => ({ ...prev, contact: '请输入正确的手机号或邮箱格式' }));
      return false;
    }
    setFormErrors(prev => ({ ...prev, contact: '' }));
    return true;
  };

  const validatePassword = (): boolean => {
    const password = formData.password;
    if (!password) {
      setFormErrors(prev => ({ ...prev, password: '请输入密码' }));
      return false;
    }
    if (password.length < 8 || password.length > 20) {
      setFormErrors(prev => ({ ...prev, password: '密码长度应为8-20个字符' }));
      return false;
    }
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      setFormErrors(prev => ({ ...prev, password: '密码必须包含字母和数字' }));
      return false;
    }
    setFormErrors(prev => ({ ...prev, password: '' }));
    return true;
  };

  const validateConfirmPassword = (): boolean => {
    const confirmPassword = formData.confirmPassword;
    if (!confirmPassword) {
      setFormErrors(prev => ({ ...prev, confirmPassword: '请确认密码' }));
      return false;
    }
    if (formData.password !== confirmPassword) {
      setFormErrors(prev => ({ ...prev, confirmPassword: '两次输入的密码不一致' }));
      return false;
    }
    setFormErrors(prev => ({ ...prev, confirmPassword: '' }));
    return true;
  };

  const validateVerificationCode = (): boolean => {
    const code = formData.verificationCode.trim();
    if (!code) {
      setFormErrors(prev => ({ ...prev, verificationCode: '请输入验证码' }));
      return false;
    }
    if (code.length !== 6) {
      setFormErrors(prev => ({ ...prev, verificationCode: '验证码应为6位数字' }));
      return false;
    }
    if (!/^\d{6}$/.test(code)) {
      setFormErrors(prev => ({ ...prev, verificationCode: '验证码只能包含数字' }));
      return false;
    }
    setFormErrors(prev => ({ ...prev, verificationCode: '' }));
    return true;
  };

  // 密码显示切换
  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // 获取验证码
  const handleGetVerificationCode = () => {
    if (!validateContact()) {
      return;
    }

    console.log('发送验证码到:', formData.contact.trim());
    
    // 开始倒计时
    startCountdown();
  };

  const startCountdown = () => {
    setCountdownSeconds(60);
    setIsGetCodeDisabled(true);

    countdownTimerRef.current = window.setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          setIsGetCodeDisabled(false);
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 验证所有字段
    const isUsernameValid = validateUsername();
    const isContactValid = validateContact();
    const isPasswordValid = validatePassword();
    const isConfirmPasswordValid = validateConfirmPassword();
    const isVerificationCodeValid = validateVerificationCode();

    if (!formData.agreement) {
      alert('请先同意用户协议和隐私政策');
      return;
    }

    if (!isUsernameValid || !isContactValid || !isPasswordValid || !isConfirmPasswordValid || !isVerificationCodeValid) {
      return;
    }

    // 显示加载状态
    setIsSubmitting(true);

    // 模拟注册请求
    setTimeout(() => {
      setIsSubmitting(false);
      setShowRegisterSuccess(true);

      // 3秒后跳转到登录页
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }, 2000);
  };

  // 键盘导航处理
  const handleKeyDown = (e: React.KeyboardEvent, nextField?: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (nextField) {
        nextField();
      }
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* 注册容器 */}
      <div className={`${styles.registerContainer} rounded-2xl p-8 w-full max-w-md shadow-card`}>
        {/* Logo和品牌 */}
        <div className="text-center mb-8">
          <div className={`w-16 h-16 ${styles.gradientBg} rounded-xl flex items-center justify-center mx-auto mb-4`}>
            <i className="fas fa-chart-line text-white text-2xl"></i>
          </div>
          <h1 className={`text-2xl font-bold ${styles.gradientText} mb-2`}>金智通</h1>
          <p className="text-text-secondary text-sm">智能金融管家，让理财更简单</p>
        </div>

        {/* 注册表单 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 用户名 */}
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium text-text-primary">用户名 *</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              onBlur={validateUsername}
              onKeyDown={(e) => handleKeyDown(e, () => document.getElementById('contact')?.focus())}
              className={`w-full px-4 py-3 border border-border-light rounded-lg ${styles.formInputFocus} transition-all`}
              placeholder="请输入用户名"
              required
            />
            {formErrors.username && (
              <div className={styles.errorMessage}>{formErrors.username}</div>
            )}
          </div>

          {/* 手机号/邮箱 */}
          <div className="space-y-2">
            <label htmlFor="contact" className="block text-sm font-medium text-text-primary">手机号/邮箱 *</label>
            <input
              type="text"
              id="contact"
              name="contact"
              value={formData.contact}
              onChange={(e) => handleInputChange('contact', e.target.value)}
              onBlur={validateContact}
              onKeyDown={(e) => handleKeyDown(e, () => document.getElementById('password')?.focus())}
              className={`w-full px-4 py-3 border border-border-light rounded-lg ${styles.formInputFocus} transition-all`}
              placeholder="请输入手机号或邮箱"
              required
            />
            {formErrors.contact && (
              <div className={styles.errorMessage}>{formErrors.contact}</div>
            )}
          </div>

          {/* 密码 */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-text-primary">密码 *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onBlur={validatePassword}
                onKeyDown={(e) => handleKeyDown(e, () => document.getElementById('confirm-password')?.focus())}
                className={`w-full px-4 py-3 pr-12 border border-border-light rounded-lg ${styles.formInputFocus} transition-all`}
                placeholder="请输入密码（8-20位，包含字母和数字）"
                required
              />
              <button
                type="button"
                onClick={handleTogglePassword}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-primary transition-colors"
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
            {formErrors.password && (
              <div className={styles.errorMessage}>{formErrors.password}</div>
            )}
          </div>

          {/* 确认密码 */}
          <div className="space-y-2">
            <label htmlFor="confirm-password" className="block text-sm font-medium text-text-primary">确认密码 *</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirm-password"
                name="confirm-password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                onBlur={validateConfirmPassword}
                onKeyDown={(e) => handleKeyDown(e, () => document.getElementById('verification-code')?.focus())}
                className={`w-full px-4 py-3 pr-12 border border-border-light rounded-lg ${styles.formInputFocus} transition-all`}
                placeholder="请再次输入密码"
                required
              />
              <button
                type="button"
                onClick={handleToggleConfirmPassword}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-primary transition-colors"
              >
                <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
            {formErrors.confirmPassword && (
              <div className={styles.errorMessage}>{formErrors.confirmPassword}</div>
            )}
          </div>

          {/* 验证码 */}
          <div className="space-y-2">
            <label htmlFor="verification-code" className="block text-sm font-medium text-text-primary">验证码 *</label>
            <div className="flex space-x-3">
              <input
                type="text"
                id="verification-code"
                name="verification-code"
                value={formData.verificationCode}
                onChange={(e) => handleInputChange('verificationCode', e.target.value)}
                onBlur={validateVerificationCode}
                onKeyDown={(e) => handleKeyDown(e, () => {
                  if (formData.agreement) {
                    handleSubmit(e as any);
                  }
                })}
                className={`flex-1 px-4 py-3 border border-border-light rounded-lg ${styles.formInputFocus} transition-all`}
                placeholder="请输入验证码"
                maxLength={6}
                required
              />
              <button
                type="button"
                onClick={handleGetVerificationCode}
                disabled={isGetCodeDisabled}
                className={`px-4 py-3 ${styles.gradientBg} text-white rounded-lg font-medium hover:shadow-lg transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {countdownSeconds > 0 ? `${countdownSeconds}秒后重发` : '获取验证码'}
              </button>
            </div>
            {formErrors.verificationCode && (
              <div className={styles.errorMessage}>{formErrors.verificationCode}</div>
            )}
          </div>

          {/* 用户协议 */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="agreement"
              name="agreement"
              checked={formData.agreement}
              onChange={(e) => handleInputChange('agreement', e.target.checked)}
              className="mt-1 w-4 h-4 text-primary border-border-light rounded focus:ring-primary focus:ring-2"
              required
            />
            <label htmlFor="agreement" className="text-sm text-text-secondary">
              我已阅读并同意
              <button type="button" className="text-primary hover:underline mx-1" onClick={() => console.log('打开用户协议')}>《用户协议》</button>
              和
              <button type="button" className="text-primary hover:underline ml-1" onClick={() => console.log('打开隐私政策')}>《隐私政策》</button>
            </label>
          </div>

          {/* 注册按钮 */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full ${styles.gradientBg} text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? (
              <div className={`${styles.loadingSpinner} mx-auto`}></div>
            ) : (
              '注册'
            )}
          </button>

          {/* 注册成功提示 */}
          {showRegisterSuccess && (
            <div className={`${styles.successMessage} text-center`}>
              <i className="fas fa-check-circle mr-2"></i>
              注册成功！正在跳转到登录页面...
            </div>
          )}
        </form>

        {/* 登录链接 */}
        <div className="text-center mt-6 pt-6 border-t border-border-light">
          <p className="text-text-secondary text-sm">
            已有账号？
            <Link to="/login" className="text-primary hover:underline font-medium ml-1">立即登录</Link>
          </p>
        </div>
      </div>

      {/* 底部版权信息 */}
      <div className="text-center mt-8">
        <p className="text-text-secondary text-sm">
          © 2024 金智通金融科技有限公司
          <button type="button" className="hover:underline ml-2" onClick={() => console.log('打开隐私政策')}>隐私政策</button>
          <button type="button" className="hover:underline ml-2" onClick={() => console.log('打开服务条款')}>服务条款</button>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;

