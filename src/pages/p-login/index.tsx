

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './styles.module.css';

interface ValidationResult {
  valid: boolean;
  message: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // 设置页面标题
  useEffect(() => {
    const originalTitle = document.title;
    document.title = '金智通 - 登录';
    return () => { document.title = originalTitle; };
  }, []);

  // 页面加载时聚焦到用户名输入框
  useEffect(() => {
    const timer = setTimeout(() => {
      const usernameInput = document.getElementById('username') as HTMLInputElement;
      if (usernameInput) {
        usernameInput.focus();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isLoading) {
          handleSubmit(e as any);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, username, password]);

  // 验证函数
  const validateUsername = (usernameValue: string): ValidationResult => {
    if (!usernameValue.trim()) {
      return { valid: false, message: '请输入用户名或手机号' };
    }
    
    // 简单的手机号验证
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (phoneRegex.test(usernameValue)) {
      return { valid: true, message: '' };
    }
    
    // 简单的用户名验证（3-20位字母数字下划线）
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (usernameRegex.test(usernameValue)) {
      return { valid: true, message: '' };
    }
    
    return { valid: false, message: '请输入有效的用户名或手机号' };
  };

  const validatePassword = (passwordValue: string): ValidationResult => {
    if (!passwordValue.trim()) {
      return { valid: false, message: '密码不能为空' };
    }
    
    if (passwordValue.length < 6) {
      return { valid: false, message: '密码长度至少6位' };
    }
    
    return { valid: true, message: '' };
  };

  // 显示错误信息
  const showError = (field: 'username' | 'password', message: string) => {
    if (field === 'username') {
      setUsernameError(message);
    } else {
      setPasswordError(message);
    }
  };

  // 隐藏错误信息
  const hideError = (field: 'username' | 'password') => {
    if (field === 'username') {
      setUsernameError('');
    } else {
      setPasswordError('');
    }
  };

  // 处理用户名失焦验证
  const handleUsernameBlur = () => {
    const validation = validateUsername(username);
    if (!validation.valid) {
      showError('username', validation.message);
    } else {
      hideError('username');
    }
  };

  // 处理密码失焦验证
  const handlePasswordBlur = () => {
    const validation = validatePassword(password);
    if (!validation.valid) {
      showError('password', validation.message);
    } else {
      hideError('password');
    }
  };

  // 处理用户名输入
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    hideError('username');
  };

  // 处理密码输入
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    hideError('password');
  };

  // 切换密码显示状态
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const usernameValidation = validateUsername(username);
    const passwordValidation = validatePassword(password);
    
    let hasErrors = false;
    
    if (!usernameValidation.valid) {
      showError('username', usernameValidation.message);
      hasErrors = true;
    } else {
      hideError('username');
    }
    
    if (!passwordValidation.valid) {
      showError('password', passwordValidation.message);
      hasErrors = true;
    } else {
      hideError('password');
    }
    
    if (hasErrors) {
      return;
    }
    
    // 开始登录流程
    setIsLoading(true);
    
    // 模拟登录请求
    setTimeout(() => {
      // 登录成功，跳转到首页
      navigate('/home');
    }, 1500);
  };

  // 处理忘记密码点击
  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    alert('忘记密码功能将在后续版本中提供');
  };

  return (
    <div className={styles.pageWrapper}>
      <div className="w-full max-w-md">
        {/* Logo和品牌区域 */}
        <div className="text-center mb-8">
          <div className={`w-20 h-20 ${styles.gradientBg} rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
            <i className="fas fa-chart-line text-white text-3xl"></i>
          </div>
          <h1 className={`text-3xl font-bold ${styles.gradientText} mb-2`}>金智通</h1>
          <p className="text-text-secondary">智能金融管家，让理财更简单</p>
        </div>

        {/* 登录表单容器 */}
        <div className={`${styles.loginContainer} rounded-2xl p-8 shadow-login-card border border-border-light`}>
          <h2 className="text-2xl font-bold text-text-primary text-center mb-6">欢迎登录</h2>
          
          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 用户名/手机号输入框 */}
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium text-text-primary">
                用户名/手机号
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  id="username" 
                  name="username" 
                  value={username}
                  onChange={handleUsernameChange}
                  onBlur={handleUsernameBlur}
                  className={`w-full px-4 py-3 border ${usernameError ? 'border-danger' : 'border-border-light'} rounded-lg ${styles.formInputFocus} transition-all`}
                  placeholder="请输入用户名或手机号"
                  required
                />
                <i className="fas fa-user absolute right-4 top-1/2 transform -translate-y-1/2 text-text-secondary"></i>
              </div>
              <div className={`${styles.errorMessage} ${usernameError ? styles.show : ''}`}>
                {usernameError}
              </div>
            </div>

            {/* 密码输入框 */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-text-primary">
                密码
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  id="password" 
                  name="password" 
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  className={`w-full px-4 py-3 border ${passwordError ? 'border-danger' : 'border-border-light'} rounded-lg ${styles.formInputFocus} transition-all pr-12`}
                  placeholder="请输入密码"
                  required
                />
                <button 
                  type="button" 
                  onClick={togglePasswordVisibility}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              <div className={`${styles.errorMessage} ${passwordError ? styles.show : ''}`}>
                {passwordError}
              </div>
            </div>

            {/* 记住密码和忘记密码 */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-primary border-border-light rounded focus:ring-primary"
                />
                <span className="text-sm text-text-secondary">记住密码</span>
              </label>
              <button 
                type="button"
                onClick={handleForgotPassword}
                className={`text-sm text-primary ${styles.linkHover}`}
              >
                忘记密码？
              </button>
            </div>

            {/* 登录按钮 */}
            <button 
              type="submit" 
              disabled={isLoading}
              className={`${styles.loginButton} w-full py-3 px-4 text-white font-medium rounded-lg shadow-lg`}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  登录中...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  登录
                </>
              )}
            </button>

            {/* 登录状态提示 */}
            {isLoading && (
              <div className="text-center text-sm text-text-secondary">
                <i className="fas fa-spinner fa-spin mr-2"></i>
                正在登录...
              </div>
            )}
          </form>

          {/* 注册链接 */}
          <div className="mt-6 text-center">
            <p className="text-text-secondary">
              还没有账号？
              <Link to="/register" className={`text-primary font-medium ${styles.linkHover} ml-1`}>
                立即注册
              </Link>
            </p>
          </div>
        </div>

        {/* 底部版权信息 */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-sm text-text-secondary">
            © 2024 金智通金融科技有限公司
          </p>
          <div className="flex justify-center space-x-4 text-sm">
            <button className={`text-text-secondary ${styles.linkHover}`}>隐私政策</button>
            <button className={`text-text-secondary ${styles.linkHover}`}>服务条款</button>
            <button className={`text-text-secondary ${styles.linkHover}`}>联系我们</button>
          </div>
        </div>
      </div>
    </div>
  );
}

