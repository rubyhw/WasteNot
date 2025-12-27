'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts';
import { supabase } from '@/lib/supabase';
import { RECYCLABLE_ITEMS } from '../config/recyclableItems';
import Image from 'next/image';

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: ''
  });

  // Settings state
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    darkMode: false,
    language: 'en'
  });

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch user transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          sessions (
            id,
            created_at,
            centre_staff:profiles!sessions_created_by_fkey (
              full_name
            )
          )
        `)
        .eq('recycler_id', user.id)
        .order('created_at', { ascending: false });

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
      } else {
        setTransactions(transactionsData || []);
      }

      // Set edit data from profile
      if (profile) {
        setEditData({
          full_name: profile.full_name || '',
          email: user.email || '',
          phone: profile.phone || '',
          address: profile.address || ''
        });
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email, profile]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      fetchUserData();
    }
  }, [user, authLoading, router, fetchUserData]);

  const handleUpdateProfile = async () => {
    try {
      setUpdating(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editData.full_name,
          phone: editData.phone,
          address: editData.address
        })
        .eq('id', user.id);

      if (error) throw error;

      setEditMode(false);
      // Refresh profile data
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSettingsChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
    // In a real app, you'd save this to the database
  };

  const getTotalRecycled = () => {
    return transactions.reduce((total, transaction) => {
      return total + RECYCLABLE_ITEMS.reduce((itemTotal, item) => {
        return itemTotal + (transaction[item.id] || 0);
      }, 0);
    }, 0);
  };

  const getItemBreakdown = () => {
    const breakdown = {};
    RECYCLABLE_ITEMS.forEach(item => {
      breakdown[item.id] = transactions.reduce((total, transaction) => {
        return total + (transaction[item.id] || 0);
      }, 0);
    });
    return breakdown;
  };

  const getTotalPoints = () => {
    return transactions.reduce((total, transaction) => {
      return total + (transaction.points_earned || 0);
    }, 0);
  };

  if (authLoading || loading) {
    return (
      <main className="page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-header">
        <div className="badge">My Account</div>
        <h1>User Profile & History</h1>
        <p className="lede">
          Manage your account settings, view your recycling history, and access your unique member ID.
        </p>
      </div>

      {/* Profile Navigation Tabs */}
      <div className="profile-tabs">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-button ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          Personal Data
        </button>
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Recycling History
        </button>
        <button
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="overview-grid">
              {/* Member ID Card */}
              <div className="member-id-card">
                <div className="card-header">
                  <div className="card-icon">🆔</div>
                  <h3>Member ID</h3>
                </div>
                <div className="member-id-display">
                  <div className="id-number">{profile?.public_id || 'Loading...'}</div>
                  <p className="id-description">Use this ID when checking in at collection centres</p>
                </div>
                <button
                  className="btn secondary small"
                  onClick={() => navigator.clipboard.writeText(profile?.public_id || '')}
                >
                  Copy ID
                </button>
              </div>

              {/* Quick Stats */}
              <div className="stats-card">
                <div className="card-header">
                  <div className="card-icon">📊</div>
                  <h3>Quick Stats</h3>
                </div>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-value">{getTotalRecycled()}</div>
                    <div className="stat-label">Items Recycled</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{getTotalPoints()}</div>
                    <div className="stat-label">Points Earned</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{transactions.length}</div>
                    <div className="stat-label">Visits</div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="activity-card">
                <div className="card-header">
                  <div className="card-icon">🕒</div>
                  <h3>Recent Activity</h3>
                </div>
                <div className="activity-list">
                  {transactions.slice(0, 3).map((transaction) => (
                    <div key={transaction.id} className="activity-item">
                      <div className="activity-info">
                        <div className="activity-date">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </div>
                        <div className="activity-points">+{transaction.points_earned} points</div>
                      </div>
                      <div className="activity-centre">
                        {transaction.sessions?.centre_staff?.full_name || 'Collection Centre'}
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <p className="no-activity">No recycling activity yet. Start recycling to see your history!</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'personal' && (
          <div className="personal-section">
            <div className="personal-card">
              <div className="card-header">
                <div className="card-icon">👤</div>
                <h3>Personal Information</h3>
                {!editMode && (
                  <button
                    className="btn secondary small"
                    onClick={() => setEditMode(true)}
                  >
                    Edit
                  </button>
                )}
              </div>

              {editMode ? (
                <div className="edit-form">
                  <div className="form-group">
                    <label htmlFor="full_name">Full Name</label>
                    <input
                      id="full_name"
                      type="text"
                      value={editData.full_name}
                      onChange={(e) => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      id="email"
                      type="email"
                      value={editData.email}
                      disabled
                      className="form-input"
                    />
                    <small className="form-help">Email cannot be changed</small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      id="phone"
                      type="tel"
                      value={editData.phone}
                      onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="address">Address</label>
                    <textarea
                      id="address"
                      value={editData.address}
                      onChange={(e) => setEditData(prev => ({ ...prev, address: e.target.value }))}
                      className="form-input"
                      rows="3"
                    />
                  </div>
                  <div className="form-actions">
                    <button
                      className="btn secondary"
                      onClick={() => setEditMode(false)}
                      disabled={updating}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn primary"
                      onClick={handleUpdateProfile}
                      disabled={updating}
                    >
                      {updating ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="info-display">
                  <div className="info-item">
                    <span className="info-label">Full Name:</span>
                    <span className="info-value">{profile?.full_name || 'Not set'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{user?.email}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Phone:</span>
                    <span className="info-value">{profile?.phone || 'Not set'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Address:</span>
                    <span className="info-value">{profile?.address || 'Not set'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Member Since:</span>
                    <span className="info-value">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-section">
            <div className="history-card">
              <div className="card-header">
                <div className="card-icon">📈</div>
                <h3>Recycling History Report</h3>
              </div>

              {/* Summary Stats */}
              <div className="history-summary">
                <div className="summary-grid">
                  <div className="summary-item">
                    <div className="summary-value">{getTotalRecycled()}</div>
                    <div className="summary-label">Total Items Recycled</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-value">{getTotalPoints()}</div>
                    <div className="summary-label">Total Points Earned</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-value">{transactions.length}</div>
                    <div className="summary-label">Collection Visits</div>
                  </div>
                </div>
              </div>

              {/* Item Breakdown */}
              <div className="item-breakdown">
                <h4>Items Recycled by Type</h4>
                <div className="breakdown-grid">
                  {RECYCLABLE_ITEMS.map((item) => {
                    const count = getItemBreakdown()[item.id] || 0;
                    return (
                      <div key={item.id} className="breakdown-item">
                        <div className="breakdown-icon">
                          <Image
                            src={item.icon}
                            alt={item.name}
                            width={32}
                            height={32}
                            style={{ objectFit: 'contain' }}
                          />
                        </div>
                        <div className="breakdown-info">
                          <div className="breakdown-name">{item.name}</div>
                          <div className="breakdown-count">{count} items</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Transaction History */}
              <div className="transaction-history">
                <h4>Recent Transactions</h4>
                <div className="transaction-list">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="transaction-item">
                      <div className="transaction-header">
                        <div className="transaction-date">
                          {new Date(transaction.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="transaction-points">+{transaction.points_earned} points</div>
                      </div>
                      <div className="transaction-centre">
                        {transaction.sessions?.centre_staff?.full_name || 'Collection Centre'}
                      </div>
                      <div className="transaction-items">
                        {RECYCLABLE_ITEMS.map((item) => {
                          const count = transaction[item.id] || 0;
                          return count > 0 ? (
                            <span key={item.id} className="item-tag">
                              {item.name}: {count}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <p className="no-transactions">No transactions found. Start recycling to build your history!</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-section">
            <div className="settings-card">
              <div className="card-header">
                <div className="card-icon">⚙️</div>
                <h3>Account Settings</h3>
              </div>

              <div className="settings-group">
                <h4>Notifications</h4>
                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-label">Email Notifications</div>
                    <div className="setting-description">Receive updates about your recycling activity</div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => handleSettingsChange('emailNotifications', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-label">SMS Notifications</div>
                    <div className="setting-description">Get text messages for important updates</div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.smsNotifications}
                      onChange={(e) => handleSettingsChange('smsNotifications', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-group">
                <h4>Preferences</h4>
                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-label">Language</div>
                    <div className="setting-description">Choose your preferred language</div>
                  </div>
                  <select
                    value={settings.language}
                    onChange={(e) => handleSettingsChange('language', e.target.value)}
                    className="setting-select"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
              </div>

              <div className="settings-group">
                <h4>Account Actions</h4>
                <div className="action-buttons">
                  <button className="btn secondary">Export My Data</button>
                  <button className="btn danger" onClick={signOut}>Sign Out</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}