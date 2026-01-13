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
  
  // --- ADDED: New State for Leaderboard and Redemptions ---
  const [leaderboard, setLeaderboard] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  
  // --- ADDED: State for QR Popup ---
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [updatedPointsTotal, setUpdatedPointsTotal] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [editData, setEditData] = useState({
    full_name: '',
    email: ''
  });

  // Settings state
  const [settings, setSettings] = useState({
    emailNotifications: true,
    darkMode: false
  });

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
        let totalCalculatedPoints = 0;
        
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
          let pointsForThisItem = 0;
          if (weightBasedItems.includes(tx.item_id)) {
            pointsForThisItem = Math.floor(tx.quantity / 1000); // Convert grams to kg for points
          } else {
            pointsForThisItem = tx.quantity;
          }
          sessionMap[tx.session_id].points_earned += pointsForThisItem;
          totalCalculatedPoints += pointsForThisItem;
        });
        
        // Convert session map to array and flatten item data
        const processedTransactions = Object.values(sessionMap).map(session => ({
          ...session,
          ...session.items // Spread items as properties like {1: 5, 2: 3, ...}
        }));
        
        setTransactions(processedTransactions);

        // --- ADDED: Fetch Redemptions (Now with Voucher Name) ---
        const { data: redemptionData } = await supabase
          .from('voucher_redemptions')
          .select('*, is_used, voucher:vouchers(name)')  // <--- This is the key change
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }); // Newest redemptions first
        
        const totalSpent = redemptionData?.reduce((acc, r) => acc + r.points_spent, 0) || 0;
        setRedemptions(redemptionData || []);
        
        // Net Points = Earned - Spent
        const netPoints = totalCalculatedPoints - totalSpent;
        setUpdatedPointsTotal(netPoints);

        // Update database with net points
        if (user?.id) {
          await supabase.from('profiles').update({ points_total: netPoints }).eq('id', user.id);
        }
        // --------------------------------------------------------
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

      // --- ADDED: Fetch Leaderboard Data ---
      try {
        const lbRes = await fetch(`/api/leaderboard?_t=${Date.now()}`, {
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        const lbData = await lbRes.json();
        if (lbData.leaderboard) {
          console.log('[Profile Page] Leaderboard fetched:', lbData.leaderboard.length, 'users');
          setLeaderboard(lbData.leaderboard);
        }
      } catch (err) {
        console.error("Leaderboard fetch error", err);
      }
      // -------------------------------------

      // Set edit data from profile
      if (profile) {
        setEditData({
          full_name: profile.full_name || '',
          email: user.email || ''
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

  // Fetch leaderboard when leaderboard tab is active
  const fetchLeaderboard = useCallback(async () => {
    try {
      const lbRes = await fetch(`/api/leaderboard?_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const lbData = await lbRes.json();
      if (lbData.leaderboard) {
        console.log('[Profile Page] Leaderboard refreshed:', lbData.leaderboard.length, 'users');
        setLeaderboard(lbData.leaderboard);
      }
    } catch (err) {
      console.error("Leaderboard fetch error", err);
    }
  }, []);

  // Refresh leaderboard when tab is switched to leaderboard
  useEffect(() => {
    if (activeTab === 'leaderboard' && user) {
      console.log('[Profile Page] Leaderboard tab activated, fetching latest data...');
      fetchLeaderboard();
    }
  }, [activeTab, user, fetchLeaderboard]);

  // --- ADDED: Redeem Function Logic ---
  const handleRedeem = async (voucher) => {
    if (updatedPointsTotal < voucher.points_cost) {
      alert("Insufficient points!");
      return;
    }

    const confirm = window.confirm(`Redeem ${voucher.name} for ${voucher.points_cost} points?`);
    if (!confirm) return;

    try {
      const res = await fetch('/api/vouchers/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          voucherId: voucher.id,
          cost: voucher.points_cost
        })
      });

      const result = await res.json();
      if (result.success) {
        alert("Voucher redeemed successfully!");
        fetchUserData(); // Refresh to update points balance
      } else {
        alert("Redemption failed: " + (result.error || 'Unknown error'));
      }
    } catch (e) {
      alert("System error during redemption");
    }
  };
  // ------------------------------------

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
        window.location.reload();
      }
    } catch (error) {
      console.error('Error generating public_id:', error);
    }
  }, [user?.id, user?.email, profile?.full_name, profile?.role]);

  useEffect(() => {
    if (profile && !profile.public_id && user) {
      generatePublicId();
    }
  }, [profile, user, generatePublicId]);

  const handleUpdateProfile = async () => {
    try {
      setUpdating(true);
      setSuccessMessage(null);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editData.full_name
        })
        .eq('id', user.id);

      if (error) throw error;

      setEditMode(false);
      setSuccessMessage('Full name updated successfully!');
      
      // Refresh profile data
      await fetchUserData();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
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
  };

  const exportUserData = () => {
    try {
      // Prepare user profile data
      const profileData = {
        'User ID': profile?.id || 'N/A',
        'Full Name': profile?.full_name || 'N/A',
        'Email': user?.email || 'N/A',
        'Role': profile?.role || 'N/A',
        'Member Since': profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }) : 'N/A',
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
    // Logic mostly unchanged
    const weightBasedItems = [3, 5];
    let totalQuantity = 0;
    let totalWeight = 0; 
    
    transactions.forEach(transaction => {
      RECYCLABLE_ITEMS.forEach(item => {
        const quantity = transaction[item.id] || 0;
        if (quantity > 0) {
          if (weightBasedItems.includes(item.id)) {
            totalWeight += quantity / 1000;
          } else {
            totalQuantity += quantity;
          }
        }
      });
    });
    
    if (totalWeight > 0 && totalQuantity > 0) {
      return `${totalQuantity} items, ${totalWeight.toFixed(1)} kg`;
    } else if (totalWeight > 0) {
      return `${totalWeight.toFixed(1)} kg`;
    } else {
      return totalQuantity;
    }
  };

  const getItemBreakdown = () => {
    const breakdown = {};
    const weightBasedItems = [3, 5];
    
    RECYCLABLE_ITEMS.forEach(item => {
      const total = transactions.reduce((sum, transaction) => {
        const quantity = transaction[item.id] || 0;
        if (weightBasedItems.includes(item.id)) {
          return sum + (quantity / 1000);
        } else {
          return sum + quantity;
        }
      }, 0);
      breakdown[item.id] = total;
    });
    return breakdown;
  };

  const getTotalPoints = () => {
    // Return the calculated net points
    if (updatedPointsTotal !== null) {
      return updatedPointsTotal;
    }
    // Fallback if needed
    if (profile && profile.points_total !== null && profile.points_total !== undefined) {
      return profile.points_total;
    }
    return 0;
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
        {/* --- ADDED: Leaderboard Tab --- */}
        <button
          className={`tab-button ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          Leaderboard
        </button>
        {/* ----------------------------- */}
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

              {/* Quick Statistics */}
              <div className="stats-card">
                <div className="card-header">
                  <h3>Quick Statistics</h3>
                </div>
                <div className="stats-grid">
                  <div className="stat-item" style={{ gridColumn: 'span 3', backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '12px', border: '2px solid #86efac' }}>
                    <div className="stat-value" style={{ fontSize: '48px', color: '#16a34a', marginBottom: '8px' }}>
                      {getTotalPoints()}
                    </div>
                    <div className="stat-label" style={{ fontSize: '16px', color: '#15803d', fontWeight: '600' }}>
                      Current Points Balance
                    </div>
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

        {/* --- ADDED: Leaderboard Content --- */}
        {activeTab === 'leaderboard' && (
          <div className="leaderboard-section">
            <div className="history-card">
              <div className="card-header">
                <h3>Community Leaderboard</h3>
                <p style={{fontSize: '14px', color: '#666', marginTop: '5px'}}>Top recyclers in the community</p>
              </div>
              <div className="transaction-list" style={{ marginTop: '15px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left', color: '#666' }}>
                      <th style={{ padding: '15px' }}>Rank</th>
                      <th style={{ padding: '15px' }}>User</th>
                      <th style={{ padding: '15px', textAlign: 'right' }}>Total Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.length === 0 ? (
                      <tr><td colSpan="3" style={{padding: '20px', textAlign: 'center'}}>Loading leaderboard...</td></tr>
                    ) : (
                      leaderboard.map((u, index) => (
                        <tr key={u.id} style={{ 
                          borderBottom: '1px solid #f0f0f0', 
                          backgroundColor: u.id === user?.id ? '#f0fdf4' : 'transparent' 
                        }}>
                          <td style={{ padding: '15px', fontWeight: 'bold', color: index < 3 ? '#d97706' : '#444' }}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </td>
                          <td style={{ padding: '15px' }}>
                            <div style={{fontWeight: '600'}}>{u.full_name || 'Anonymous User'}</div>
                            <div style={{fontSize: '12px', color: '#888'}}>ID: {u.public_id}</div>
                          </td>
                          <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                            {u.points_total}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {/* ---------------------------------- */}

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
            
            <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', alignItems: 'flex-start' }}>
              
              {/* LEFT: Catalogue */}
              <div style={{ flex: '1', minWidth: '0' }}>
                <div className="vouchers-grid" style={{ 
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px'
                }}>
                  {vouchers.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
                      <p style={{ fontSize: '18px', fontWeight: '500' }}>No vouchers available yet</p>
                    </div>
                  ) : (
                    vouchers.map((voucher) => {
                      const canAfford = getTotalPoints() >= voucher.points_cost;
                      return (
                        <div key={voucher.id} className="voucher-card" style={{
                            border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px',
                            backgroundColor: canAfford ? '#ffffff' : '#f9fafb',
                            position: 'relative', opacity: canAfford ? 1 : 0.7
                          }}>
                          {!canAfford && (
                            <div style={{
                              position: 'absolute', top: '12px', right: '12px',
                              backgroundColor: '#fee2e2', color: '#dc2626',
                              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600'
                            }}>Insufficient Points</div>
                          )}
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{
                              width: '60px', height: '60px', borderRadius: '12px',
                              backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '32px', marginBottom: '16px'
                            }}>🎁</div>
                            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>{voucher.name}</h3>
                            <p style={{ fontSize: '14px', color: '#6b7280', minHeight: '40px' }}>{voucher.description || 'Redeem for rewards!'}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                            <span style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a' }}>{voucher.points_cost} pts</span>
                            <button className="btn primary small" disabled={!canAfford}
                              style={{ opacity: canAfford ? 1 : 0.5, cursor: canAfford ? 'pointer' : 'not-allowed' }}
                              onClick={() => canAfford && handleRedeem(voucher)}>
                              {canAfford ? 'Redeem' : 'Locked'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT: History & Active */}
              <div style={{ width: '350px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 1. History Table */}
                <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px' }}>History</h3>
                  {redemptions.length === 0 ? (
                    <p style={{ fontSize: '14px', color: '#9ca3af', textAlign: 'center' }}>No history yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                      {redemptions.map((r) => (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                          <span style={{ color: '#374151' }}>{r.voucher?.name}</span>
                          <span style={{ color: '#6b7280' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Active Vouchers Table (Clickable) */}
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #bbf7d0', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '18px' }}>🎫</span>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#166534' }}>Active Vouchers</h3>
                  </div>
                  
                  {redemptions.filter(r => r.is_used === false).length === 0 ? (
                    <p style={{ fontSize: '14px', color: '#15803d', textAlign: 'center', opacity: 0.8 }}>No active vouchers.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {redemptions.filter(r => r.is_used === false).map((r) => (
                        <div 
                          key={r.id} 
                          onClick={() => setSelectedVoucher(r)} // <--- CLICK TO OPEN MODAL
                          style={{ 
                            backgroundColor: 'white', padding: '12px', borderRadius: '8px', 
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #bbf7d0',
                            cursor: 'pointer', transition: 'transform 0.1s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <div style={{ fontWeight: '600', color: '#166534', marginBottom: '4px' }}>{r.voucher?.name}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#ffffff', backgroundColor: '#16a34a', padding: '2px 8px', borderRadius: '10px' }}>
                              CLICK TO USE
                            </span>
                            <span style={{ fontSize: '12px', color: '#15803d' }}>-{r.points_spent} pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* --- QR CODE MODAL --- */}
            {selectedVoucher && (
              <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000, backdropFilter: 'blur(4px)'
              }} onClick={() => setSelectedVoucher(null)}>
                <div style={{
                  backgroundColor: 'white', padding: '30px', borderRadius: '20px',
                  maxWidth: '350px', width: '90%', textAlign: 'center',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  position: 'relative', animation: 'fadeIn 0.2s ease-out'
                }} onClick={(e) => e.stopPropagation()}>
                  
                  {/* Close Button */}
                  <button 
                    onClick={() => setSelectedVoucher(null)}
                    style={{
                      position: 'absolute', top: '15px', right: '15px',
                      background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280'
                    }}
                  >
                    ×
                  </button>

                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', marginBottom: '8px' }}>
                    {selectedVoucher.voucher?.name}
                  </h3>
                  <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                    Show this QR code to the merchant
                  </p>

                  {/* QR Code Image (Using Public API) */}
                  <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '12px', border: '2px dashed #e5e7eb', display: 'inline-block', marginBottom: '20px' }}>
                    <Image 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedVoucher.id}`}
                      alt="Voucher QR Code"
                      width={200}
                      height={200}
                    />
                  </div>

                  <div style={{ fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace' }}>
                    ID: {selectedVoucher.id.slice(0, 8)}...
                  </div>

                  <button 
                    onClick={() => setSelectedVoucher(null)}
                    className="btn primary"
                    style={{ width: '100%', marginTop: '20px' }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
            {/* --------------------- */}

          </div>
        )}

        {activeTab === 'personal' && (
          <div className="personal-section">
            {successMessage && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#d1fae5',
                border: '1px solid #86efac',
                borderRadius: '8px',
                color: '#166534',
                marginBottom: '20px'
              }}>
                {successMessage}
              </div>
            )}
            <div className="personal-card">
              <div className="card-header">
                <h3>Personal Information</h3>
                {!editMode && (
                  <button
                    className="btn secondary small"
                    onClick={() => {
                      setEditMode(true);
                      setSuccessMessage(null);
                    }}
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
                      required
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
                    <span className="info-label">Member Since:</span>
                    <span className="info-value">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                      }) : 'Unknown'}
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
                <h3>Recycling History Report</h3>
              </div>

              {/* Summary Stats */}
              <div className="history-summary">
                <div className="summary-grid">
                  <div className="summary-item" style={{
                    background: 'linear-gradient(135deg, rgba(35, 164, 85, 0.1), rgba(15, 167, 97, 0.05))',
                    border: '2px solid rgba(35, 164, 85, 0.3)',
                    borderRadius: '12px'
                  }}>
                    <div className="summary-value" style={{ 
                      fontSize: '36px', 
                      color: '#16a34a',
                      fontWeight: '700'
                    }}>
                      {getTotalPoints()}
                    </div>
                    <div className="summary-label" style={{ 
                      fontSize: '14px', 
                      color: '#15803d',
                      fontWeight: '600',
                      marginTop: '8px'
                    }}>
                      Current Points Balance
                    </div>
                  </div>
                  <div className="summary-item" style={{
                    background: 'linear-gradient(135deg, rgba(35, 164, 85, 0.1), rgba(15, 167, 97, 0.05))',
                    border: '2px solid rgba(35, 164, 85, 0.3)',
                    borderRadius: '12px'
                  }}>
                    <div className="summary-value" style={{ 
                      fontSize: '36px', 
                      color: '#16a34a',
                      fontWeight: '700'
                    }}>
                      {transactions.length}
                    </div>
                    <div className="summary-label" style={{ 
                      fontSize: '14px', 
                      color: '#15803d',
                      fontWeight: '600',
                      marginTop: '8px'
                    }}>
                      Collection Visits
                    </div>
                  </div>
                </div>
              </div>

              {/* Item Breakdown */}
              <div className="item-breakdown">
                <h4>Items Recycled by Type</h4>
                <div className="breakdown-grid">
                  {RECYCLABLE_ITEMS.map((item) => {
                    const count = getItemBreakdown()[item.id] || 0;
                    const weightBasedItems = [3, 5]; // Newspaper and Cardboard
                    const isWeightBased = weightBasedItems.includes(item.id);
                    const displayValue = isWeightBased 
                      ? `${count.toFixed(1)} kg` 
                      : count > 0 
                        ? `${Math.round(count)} ${item.unit || 'items'}` 
                        : '0 items';
                    
                    return (
                      <div 
                        key={item.id} 
                        className="breakdown-item"
                        style={{
                          background: count > 0 ? 'linear-gradient(135deg, rgba(35, 164, 85, 0.08), rgba(15, 167, 97, 0.05))' : '#f9fafb',
                          border: count > 0 ? '2px solid rgba(35, 164, 85, 0.2)' : '1px solid #e5e7eb',
                          borderRadius: '12px',
                          padding: '16px',
                          transition: 'all 0.2s ease',
                          opacity: count > 0 ? 1 : 0.6
                        }}
                      >
                        <div className="breakdown-icon" style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '10px',
                          background: count > 0 ? 'rgba(35, 164, 85, 0.1)' : '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '12px'
                        }}>
                          <Image
                            src={item.icon}
                            alt={item.name}
                            width={32}
                            height={32}
                            style={{ objectFit: 'contain' }}
                          />
                        </div>
                        <div className="breakdown-info" style={{ textAlign: 'center', width: '100%' }}>
                          <div className="breakdown-name" style={{
                            fontWeight: '600',
                            fontSize: '15px',
                            color: '#1f2937',
                            marginBottom: '8px'
                          }}>
                            {item.name}
                          </div>
                          <div className="breakdown-count" style={{
                            fontSize: '20px',
                            fontWeight: '700',
                            color: count > 0 ? '#16a34a' : '#9ca3af'
                          }}>
                            {displayValue}
                          </div>
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
                          const quantity = transaction[item.id] || 0;
                          if (quantity <= 0) return null;
                          
                          const weightBasedItems = [3, 5]; // Newspaper (id: 3) and Cardboard (id: 5)
                          const isWeightBased = weightBasedItems.includes(item.id);
                          const displayValue = isWeightBased 
                            ? `${(quantity / 1000).toFixed(1)} kg` 
                            : `${quantity} ${item.unit || 'items'}`;
                          
                          return (
                            <span key={item.id} className="item-tag">
                              {item.name}: {displayValue}
                            </span>
                          );
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