'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts';
import { useLanguage } from '../contexts/LanguageContexts';
import { supabase } from '@/lib/supabase';
import { RECYCLABLE_ITEMS } from '../config/recyclableItems';
import Image from 'next/image';

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const languageContext = useLanguage();
  const language = languageContext?.language || 'en';
  const switchLanguage = languageContext?.switchLanguage || (() => {});
  const t = languageContext?.t || ((key) => key);
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [vouchers, setVouchers] = useState([]);
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
    darkMode: false,
    language: language || 'en'
  });

  // Sync settings language with context language
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      language: language
    }));
  }, [language]);

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch user recycling transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('recycling_transactions')
        .select(`
          *,
          session:recycling_sessions!session_id (
            id,
            created_at,
            collection_centre:profiles!collection_centre_id (
              full_name
            )
          )
        `)
        .eq('recycler_id', user.id)
        .order('created_at', { ascending: false });

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
      } else {
        // Group transactions by session and calculate points per session
        const sessionMap = {};
        (transactionsData || []).forEach(tx => {
          if (!sessionMap[tx.session_id]) {
            sessionMap[tx.session_id] = {
              id: tx.session_id,
              created_at: tx.session?.created_at || tx.created_at,
              session: tx.session,
              items: {},
              points_earned: 0
            };
          }
          // Store quantity for each item
          sessionMap[tx.session_id].items[tx.item_id] = tx.quantity;
          // Calculate points: 1 point per item (for quantity) or per kg converted from grams (for weight)
          const weightBasedItems = [3, 5]; // Newspaper and Cardboard
          if (weightBasedItems.includes(tx.item_id)) {
            sessionMap[tx.session_id].points_earned += Math.floor(tx.quantity / 1000); // Convert grams to kg for points
          } else {
            sessionMap[tx.session_id].points_earned += tx.quantity;
          }
        });
        
        // Convert session map to array and flatten item data
        const processedTransactions = Object.values(sessionMap).map(session => ({
          ...session,
          ...session.items // Spread items as properties like {1: 5, 2: 3, ...}
        }));
        
        setTransactions(processedTransactions);
      }

      // Fetch available vouchers
      const { data: vouchersData, error: vouchersError } = await supabase
        .from('vouchers')
        .select('*')
        .eq('is_active', true)
        .order('points_cost', { ascending: true });

      if (vouchersError) {
        console.error('Error fetching vouchers:', vouchersError);
      } else {
        setVouchers(vouchersData || []);
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

  const generatePublicId = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/create-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          fullName: profile.full_name || '',
          email: user.email || '',
          role: profile.role || 'recycler'
        }),
      });

      if (response.ok) {
        // Refresh the page or reload profile
        window.location.reload();
      }
    } catch (error) {
      console.error('Error generating public_id:', error);
    }
  }, [user?.id, user?.email, profile?.full_name, profile?.role]);

  // Generate public_id if missing
  useEffect(() => {
    if (profile && !profile.public_id && user) {
      generatePublicId();
    }
  }, [profile, user, generatePublicId]);

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
    if (setting === 'language') {
      switchLanguage(value);
    }
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
    // In a real app, you'd save this to the database
  };

  const exportUserData = () => {
    try {
      // Prepare user profile data
      const profileData = {
        'User ID': profile?.id || 'N/A',
        'Full Name': profile?.full_name || 'N/A',
        'Email': user?.email || 'N/A',
        'Phone': profile?.phone || 'N/A',
        'Address': profile?.address || 'N/A',
        'Role': profile?.role || 'N/A',
        'Member Since': profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A',
        'Total Transactions': transactions.length,
        'Settings': JSON.stringify(settings)
      };

      // Create CSV content with profile data
      const headers = Object.keys(profileData);
      const profileValues = Object.values(profileData).map(v => 
        typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))
          ? `"${v.replace(/"/g, '""')}"` 
          : v
      );
      
      let csvContent = headers.join(',') + '\n' + profileValues.join(',') + '\n\n';

      // Add transactions section
      if (transactions.length > 0) {
        csvContent += 'TRANSACTION HISTORY\n';
        const txHeaders = ['Date', 'Type', 'Amount', 'Status'];
        csvContent += txHeaders.join(',') + '\n';
        
        transactions.forEach(tx => {
          const date = new Date(tx.created_at).toLocaleDateString();
          const type = tx.type || 'N/A';
          const amount = tx.amount || 'N/A';
          const status = tx.status || 'N/A';
          csvContent += `${date},${type},${amount},${status}\n`;
        });
      }

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `wastenot_user_data_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    }
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
    // Use points_total from profile if available, otherwise calculate from transactions
    if (profile && profile.points_total !== null && profile.points_total !== undefined) {
      return profile.points_total;
    }
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
    <main className="page" key={language}>
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
          {t('profile.overview')}
        </button>
        <button
          className={`tab-button ${activeTab === 'vouchers' ? 'active' : ''}`}
          onClick={() => setActiveTab('vouchers')}
        >
          Voucher Catalogue
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
          {t('profile.settings')}
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
                  <div className="stat-item" style={{ gridColumn: 'span 3', backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '12px', border: '2px solid #86efac' }}>
                    <div className="stat-value" style={{ fontSize: '48px', color: '#16a34a', marginBottom: '8px' }}>
                      {getTotalPoints()}
                    </div>
                    <div className="stat-label" style={{ fontSize: '16px', color: '#15803d', fontWeight: '600' }}>
                      🏆 Total Recycling Points
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{getTotalRecycled()}</div>
                    <div className="stat-label">Items Recycled</div>
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
                        {transaction.session?.collection_centre?.full_name || 'Collection Centre'}
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

        {activeTab === 'vouchers' && (
          <div className="vouchers-section">
            <div className="vouchers-header">
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Voucher Catalogue</h2>
                <p style={{ color: 'var(--muted)', marginBottom: '16px' }}>
                  Redeem your recycling points for amazing rewards! You have <strong style={{ color: '#16a34a' }}>{getTotalPoints()} points</strong> available.
                </p>
              </div>
            </div>
            
            <div className="vouchers-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: '20px',
              marginTop: '24px'
            }}>
              {vouchers.length === 0 ? (
                <div style={{ 
                  gridColumn: '1 / -1', 
                  textAlign: 'center', 
                  padding: '60px 20px',
                  color: 'var(--muted)'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎁</div>
                  <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>No vouchers available yet</p>
                  <p>Check back later for exciting rewards!</p>
                </div>
              ) : (
                vouchers.map((voucher) => {
                  const canAfford = getTotalPoints() >= voucher.points_cost;
                  return (
                    <div 
                      key={voucher.id} 
                      className="voucher-card"
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '24px',
                        backgroundColor: canAfford ? '#ffffff' : '#f9fafb',
                        transition: 'all 0.2s',
                        position: 'relative',
                        opacity: canAfford ? 1 : 0.7
                      }}
                    >
                      {!canAfford && (
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          Insufficient Points
                        </div>
                      )}
                      
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '12px',
                          backgroundColor: '#fef3c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '32px',
                          marginBottom: '16px'
                        }}>
                          🎟️
                        </div>
                        
                        <h3 style={{ 
                          fontSize: '20px', 
                          fontWeight: '600', 
                          marginBottom: '8px',
                          color: '#1f2937'
                        }}>
                          {voucher.name}
                        </h3>
                        
                        <p style={{ 
                          fontSize: '14px', 
                          color: '#6b7280',
                          minHeight: '40px',
                          marginBottom: '16px'
                        }}>
                          {voucher.description || 'Redeem this voucher for great rewards!'}
                        </p>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '16px',
                        borderTop: '1px solid #e5e7eb'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: '#16a34a'
                          }}>
                            {voucher.points_cost}
                          </span>
                          <span style={{
                            fontSize: '14px',
                            color: '#6b7280',
                            fontWeight: '500'
                          }}>
                            points
                          </span>
                        </div>
                        
                        <button
                          className="btn primary small"
                          disabled={!canAfford}
                          style={{
                            opacity: canAfford ? 1 : 0.5,
                            cursor: canAfford ? 'pointer' : 'not-allowed'
                          }}
                          onClick={() => {
                            if (canAfford) {
                              alert('Voucher redemption feature coming soon! You will be able to redeem ' + voucher.name + ' for ' + voucher.points_cost + ' points.');
                            }
                          }}
                        >
                          {canAfford ? 'Redeem' : 'Locked'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
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
                        {transaction.session?.collection_centre?.full_name || 'Collection Centre'}
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
                <h3>{t('profile.accountSettings')}</h3>
              </div>

              <div className="settings-group">
                <h4>{t('profile.notifications')}</h4>
                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-label">{t('profile.emailNotifications')}</div>
                    <div className="setting-description">{t('profile.emailNotificationsDesc')}</div>
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
              </div>

              <div className="settings-group">
                <h4>{t('profile.preferences')}</h4>
                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-label">{t('profile.language')}</div>
                    <div className="setting-description">{t('profile.languageDesc')}</div>
                  </div>
                  <select
                    value={settings.language}
                    onChange={(e) => handleSettingsChange('language', e.target.value)}
                    className="setting-select"
                  >
                    <option value="en">English</option>
                    <option value="ms">Malay (Bahasa Melayu)</option>
                    <option value="zh">Chinese (中文)</option>
                  </select>
                </div>
              </div>

              <div className="settings-group">
                <h4>{t('profile.accountActions')}</h4>
                <div className="action-buttons">
                  <button className="btn secondary" onClick={exportUserData}>{t('profile.exportData')}</button>
                  <button className="btn danger" onClick={signOut}>{t('profile.signOut')}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}