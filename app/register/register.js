'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '../contexts/LanguageContexts'

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState('recycler')

  async function handleRegister(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!name || !name.trim()) {
      setError('Full name is required.')
      return
    }
    if (!email || !password) {
      setError('Email and password are required.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    // Validate role selection
    if (!role || (role !== 'recycler' && role !== 'centre_staff')) {
      setError('Please select a registration type.')
      return
    }

    setLoading(true)
    try {
      // Step 1: Create authentication user in Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp(
        { 
          email, 
          password
        },
        {
          data: { full_name: name }
        }
      )
      
      if (signUpError) {
        console.error('Authentication signup error:', signUpError);
        setError(signUpError.message || 'Registration failed.')
        setLoading(false)
        return
      }

      if (!data || !data.user) {
        console.error('No user data returned from signup');
        setError('Registration failed. Please try again.')
        setLoading(false)
        return
      }

      // Step 2: Create profile in profiles table with correct role
      try {
          const profileResponse = await fetch('/api/auth/create-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: data.user?.id,
              fullName: name,
              email: email,
              role: role
            }),
          });

          const profileData = await profileResponse.json();

          if (!profileResponse.ok) {
            console.error('Profile creation failed:', profileData);
            // Show more detailed error message
            let errorMsg = profileData.error || 'Failed to create profile. Please contact support.';
            if (profileData.details) {
              errorMsg += ` (${profileData.details})`;
            }
            setError(errorMsg);
            setLoading(false);
            return;
          }

          // Verify the role was set correctly in profiles table
          if (profileData.profile && profileData.profile.role) {
            // Verify centre_staff role
            if (role === 'centre_staff' && profileData.profile.role !== 'centre_staff') {
              console.error('Role mismatch! Expected centre_staff but got:', profileData.profile.role);
              setError('Failed to set collection centre role. Please contact support.');
              setLoading(false);
              return;
            }
            
            // Verify recycler role
            if (role === 'recycler' && profileData.profile.role !== 'recycler') {
              console.error('Role mismatch! Expected recycler but got:', profileData.profile.role);
              setError('Failed to set recycler role. Please contact support.');
              setLoading(false);
              return;
            }
            
            // Registration successful - user is automatically logged in
            // Show success message and redirect to home page
            setMessage(t('auth.register.accountCreated'))
            
            // Wait for auth context to update, then redirect
            setTimeout(() => {
              router.push('/')
            }, 2000)
          } else {
            console.error('Profile created but role is missing');
            setError('Profile created but role verification failed. Please contact support.');
            setLoading(false);
            return;
          }
      } catch (profileError) {
        console.error('Profile creation error:', profileError);
        setError('Failed to create profile. Please try again or contact support.');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Unexpected error.')
    } finally {
      setLoading(false)
    }
  }


  return (
    <main className="page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>{t('auth.register.title')}</h1>
            <p className="auth-subtitle">{t('auth.register.subtitle')}</p>
          </div>

          {error && (
            <div className="auth-error">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="auth-success">
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="auth-form">
            {/* Role Selection */}
            <div className="form-group">
              <label>{t('auth.register.roleLabel')}</label>
              <div className="role-selection">
                <label className="role-option">
                  <input
                    type="radio"
                    name="role"
                    value="recycler"
                    checked={role === 'recycler'}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={loading}
                  />
                  <span>{t('auth.register.recycler')}</span>
                </label>
                <label className="role-option">
                  <input
                    type="radio"
                    name="role"
                    value="centre_staff"
                    checked={role === 'centre_staff'}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={loading}
                  />
                  <span>{t('auth.register.centreStaff')}</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="name">
                {role === 'centre_staff' ? t('auth.register.centreName') : t('auth.register.fullName')}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'centre_staff' ? t('auth.register.centreNamePlaceholder') : t('auth.register.fullNamePlaceholder')}
                disabled={loading}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">{t('auth.register.email')}</label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.register.emailPlaceholder')}
                disabled={loading}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">{t('auth.register.password')}</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.register.passwordPlaceholder')}
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

            <div className="form-group">
              <label htmlFor="confirm">{t('auth.register.confirmPassword')}</label>
              <input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t('auth.register.confirmPasswordPlaceholder')}
                required
                disabled={loading}
                className="form-input"
              />
            </div>

            <button type="submit" disabled={loading} className="btn primary auth-submit">
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  {t('auth.register.creatingAccount')}
                </>
              ) : (
                t('auth.register.createAccount')
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              {t('auth.register.haveAccount')}{' '}
              <Link href="/login" className="auth-link">
                {t('auth.register.signIn')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}