'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '../contexts/LanguageContexts';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Authentication failed. Please try again.');
        setLoading(false);
        return;
      }

      // Verify user exists in profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        // If profile doesn't exist, that's okay - user is authenticated
        // But we might want to create a profile or handle this case
        console.warn('Profile not found:', profileError.message);
      }

      // Redirect based on role
      if (profileData?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>{t('auth.login.title')}</h1>
            <p className="auth-subtitle">{t('auth.login.subtitle')}</p>
          </div>

          {error && (
            <div className="auth-error">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">{t('auth.login.email')}</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.login.emailPlaceholder')}
                required
                disabled={loading}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">{t('auth.login.password')}</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.login.passwordPlaceholder')}
                  required
                  disabled={loading}
                  className="form-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                  disabled={loading}
                  aria-label={showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>{t('auth.login.rememberMe')}</span>
              </label>
              <Link href="/forgot-password" className="forgot-link">
                {t('auth.login.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn primary auth-submit"
            >
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  {t('auth.login.signingIn')}
                </>
              ) : (
                t('auth.login.signIn')
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              {t('auth.login.noAccount')}{' '}
              <Link href="/register" className="auth-link">
                {t('auth.login.signUp')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}


