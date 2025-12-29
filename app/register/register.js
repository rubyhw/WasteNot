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
  const [role, setRole] = useState('recycler')

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

    // Validate role selection
    if (!role || (role !== 'recycler' && role !== 'centre_staff')) {
      setError('Please select a registration type.')
      return
    }

    setLoading(true)
    try {
      console.log('Starting registration with role:', role);
      
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

      console.log('Authentication created successfully. User ID:', data.user.id);
      
      // Step 2: Create profile in profiles table with correct role
      try {
        console.log('Creating profile with role:', role, 'for user:', data.user.id);
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
            console.log('Profile created successfully with role:', profileData.profile.role);
            
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
            
            console.log('✅ Registration complete! Authentication and profile both created successfully.');
            console.log('   - User ID:', data.user.id);
            console.log('   - Role in profiles table:', profileData.profile.role);
            
            // Registration successful - user is automatically logged in
            // Show success message and redirect to home page
            setMessage('Account successfully created!')
            
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
            <h1>Create an account</h1>
            <p className="auth-subtitle">Sign up for a WasteNot account</p>
          </div>

          {error && (
            <div className="auth-error">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="auth-success">
              <span className="success-icon">✅</span>
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="auth-form">
            {/* Role Selection */}
            <div className="form-group">
              <label>I am registering as:</label>
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
                  <span>Recycler (Normal User)</span>
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
                  <span>Collection Centre</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="name">
                {role === 'centre_staff' ? 'Collection Centre Name' : 'Full name'}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'centre_staff' ? 'Enter your collection centre name' : 'Your full name'}
                disabled={loading}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
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

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link href="/login" className="auth-link">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}