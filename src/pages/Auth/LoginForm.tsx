// src/pages/Auth/LoginForm.tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import './RegisterForm.css';
import LanguageSwitcher from '../../components/layout/LanguageSwitcher';
import { loginWorker } from '../../requests/worker';
import { setUser } from '../../store/slice';
import { WorkerLoginData } from '../../requests/worker/types';
import { toastError, toastSuccess } from '../../lib/toasts';
import i18n from '../../i18n/config';

const LoginForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    let telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (import.meta.env.VITE_DEBUG) {
      telegramUser = {
        id: 1359929127,
        username: 'testuser',
        language_code: 'en',
      };
    }

    const loginData: WorkerLoginData = {
      email,
      password,
      telegram_id: telegramUser?.id || undefined,
      username: telegramUser?.username || undefined,
      language_code: i18n.language || undefined,
    };

    const response = await loginWorker(loginData);
    
    if (response?.error) {
      console.log("Login error:", response);
      const errorData = response.data as any;
      const msg = errorData?.detail || errorData?.message || t('auth.loginError');
      toastError(`${t('auth.loginError')}: ${msg}`);
      setIsLoading(false);
      return;
    }
    
    // Check if response contains tokens (some login endpoints return tokens)
    const responseData = response.data as any;
    if (responseData?.access_token) {
      localStorage.setItem('authToken', responseData.access_token);
      if (responseData?.refresh_token) {
        localStorage.setItem('refreshToken', responseData.refresh_token);
      }
      localStorage.setItem('username', email);
    }
    
    dispatch(setUser(response.data));
    toastSuccess(t('auth.loginSuccess') || 'Successfully logged in');
    navigate('/');
    setIsLoading(false);
  };

  return (
    <div className="login-container">
      <LanguageSwitcher />
      <div className="login-card">
        <div className="login-decoration">
          <div className="decoration-orb orange"></div>
          <div className="decoration-orb gray"></div>
        </div>
        <div className="login-header">
          <h2>
            <span className="text-3xl">{t('auth.loginTitle')}</span>
          </h2>
          <p>{t('auth.loginSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              required
              disabled={isLoading}
              autoComplete="email"
            />
            <span className="input-highlight"></span>
          </div>

          <div className="input-group">
            <label htmlFor="password">{t('auth.password')}</label>
            <div className="password-wrap">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="pass-toggle"
                onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? t('auth.hidePasswordAria') : t('auth.showPasswordAria')}
                title={showPass ? t('auth.hidePasswordAria') : t('auth.showPasswordAria')}
              >
                {showPass ? t('auth.hidePassword') : t('auth.showPassword')}
              </button>
            </div>
            <span className="input-highlight"></span>
          </div>

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? <div className="spinner"></div> : t('auth.loginButton')}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {t('auth.noAccount')}{' '}
            <Link to="/register">{t('auth.registerLink')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;

