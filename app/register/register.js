'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  // Password reset UI state (keeps previous reset feature)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState(null)
  const [resetMessage, setResetMessage] = useState(null)

  async function handleRegister(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!email || !password) {
      setError('Email and password are required.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp(
        { email, password },
        { data: { full_name: name } }
      )
      if (signUpError) {
        setError(signUpError.message || 'Registration failed.')
      } else {
        setMessage('Registration successful. Check your email (if required). Redirecting to login...')
        setTimeout(() => router.push('/login'), 1400)
      }
    } catch (err) {
      setError(err.message || 'Unexpected error.')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setResetError(null)
    setResetMessage(null)

    if (!resetEmail) {
      setResetError('Please enter your email.')
      return
    }

    setResetLoading(true)
    try {
      let res, err
      if (supabase.auth && typeof supabase.auth.resetPasswordForEmail === 'function') {
        ({ data: res, error: err } = await supabase.auth.resetPasswordForEmail(resetEmail))
      } else if (supabase.auth && supabase.auth.api && typeof supabase.auth.api.resetPasswordForEmail === 'function') {
        ({ data: res, error: err } = await supabase.auth.api.resetPasswordForEmail(resetEmail))
      } else {
        throw new Error('Password reset not supported by this Supabase client version.')
      }

      if (err) {
        setResetError(err.message || 'Failed to send reset email.')
      } else {
        setResetMessage('If an account exists, a password reset email was sent.')
        setTimeout(() => {
          setShowReset(false)
          setResetEmail('')
        }, 1500)
      }
    } catch (err) {
      setResetError(err.message || 'Unexpected error.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <main className="page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Create an account</h1>
            <p className="auth-subtitle">Sign up for a WasteNot account</p>
          </div>

          {error && (
            <div className="auth-error">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                disabled={loading}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a password"
                  required
                  disabled={loading}
                  className="form-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm password"
                required
                disabled={loading}
                className="form-input"
              />
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                className="forgot-link"
                onClick={() => { setShowReset(s => !s); setResetError(null); setResetMessage(null); }}
              >
                Forgot password?
              </button>
            </div>

            <button type="submit" disabled={loading} className="btn primary auth-submit">
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          {showReset && (
            <form onSubmit={handleReset} style={{marginTop:12, borderTop:'1px solid #eee', paddingTop:12}}>
              <h3>Reset password</h3>
              <div className="form-group">
                <label htmlFor="resetEmail">Email</label>
                <input
                  id="resetEmail"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="form-input"
                />
              </div>
              <div style={{marginTop:8}}>
                <button type="submit" disabled={resetLoading} className="btn">
                  {resetLoading ? 'Sending…' : 'Send reset email'}
                </button>
              </div>
              {resetError && <p style={{color:'red', marginTop:8}}>{resetError}</p>}
              {resetMessage && <p style={{color:'green', marginTop:8}}>{resetMessage}</p>}
            </form>
          )}

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link href="/login" className="auth-link">
                Sign in
              </Link>
            </p>
            {message && <p style={{color:'green', marginTop:8}}>{message}</p>}
          </div>
        </div>
      </div>
    </main>
  )
}