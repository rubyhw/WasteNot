'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './contexts';
import { supabase } from '@/lib/supabase';
import { RECYCLABLE_ITEMS } from './config/recyclableItems';

const steps = [
  {
    label: "Register an Account",
    detail:
      "Users create an account on the WasteNot website using a valid email and password.",
  },
  {
    label: "Bring Recyclable Items to a Collection Centre",
    detail:
      "Users bring accepted recyclable items to a WasteNot recycling collection centre.",
  },
  {
    label: "Provide Member Code to Staff",
    detail:
      "Users present their WasteNot Member Code to the collection centre staff for identification.",
  },
  {
    label: "Staff Records Recycled Items",
    detail:
      "Collection centre staff calculate and record the quantities of recycled items for the user in the system.",
  },
  {
    label: "Earn Rewards Points",
    detail:
      "Reward points are automatically awarded for every recycling activity and can be used to redeem available vouchers.",
  },
];

const stats = [
  { value: "12k+", label: "Households guided" },
  { value: "180t", label: "Waste diverted" },
  { value: "92%", label: "Sorting accuracy" },
];

export default function Home() {
  const router = useRouter();
  const { isCentreStaff, user, profile, loading: authLoading } = useAuth();
  const [memberCode, setMemberCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recyclerProfile, setRecyclerProfile] = useState(null);
  
  // Recycler stats state
  const [recyclerStats, setRecyclerStats] = useState({
    totalRecycled: 0,
    totalPoints: 0,
    visits: 0,
    transactions: []
  });
  const [loadingStats, setLoadingStats] = useState(false);
  
  // Determine what content to show
  const isRecycler = !authLoading && user && !isCentreStaff;
  const showGeneralContent = !authLoading && !user;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!memberCode.trim()) {
      setError('Please enter a member code');
      return;
    }

    setLoading(true);
    setError(null);
    setRecyclerProfile(null);

    try {
      // Call API to lookup recycler by public_id
      const response = await fetch('/api/staff/lookup-recycler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberCode: memberCode.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Display the error message (which includes role info if applicable)
        setError(data.error || 'Recycler not found');
        setLoading(false);
        return;
      }

      // Store the recycler profile to display
      setRecyclerProfile(data.profile);
    } catch (err) {
      setError(err.message || 'An error occurred while fetching recycler data');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = () => {
    if (recyclerProfile) {
      router.push(`/staff/recycle/${recyclerProfile.id}`);
    }
  };

  // Fetch recycler stats
  const fetchRecyclerStats = useCallback(async () => {
    if (!user || isCentreStaff) return;
    
    try {
      setLoadingStats(true);
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('recycler_id', user.id)
        .order('created_at', { ascending: false });

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
      } else {
        const transactions = transactionsData || [];
        const totalRecycled = transactions.reduce((total, transaction) => {
          return total + RECYCLABLE_ITEMS.reduce((itemTotal, item) => {
            return itemTotal + (transaction[item.id] || 0);
          }, 0);
        }, 0);
        const totalPoints = transactions.reduce((total, transaction) => {
          return total + (transaction.points_earned || 0);
        }, 0);

        setRecyclerStats({
          totalRecycled,
          totalPoints,
          visits: transactions.length,
          transactions: transactions.slice(0, 3) // Recent 3 transactions
        });
      }
    } catch (err) {
      console.error('Error fetching recycler stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [user, isCentreStaff]);

  useEffect(() => {
    if (isRecycler) {
      fetchRecyclerStats();
    }
  }, [isRecycler, fetchRecyclerStats]);

  return (
    <main className="page">
      {/* Recycler Dashboard - Only for Recyclers */}
      {isRecycler && (
        <section className="recycler-dashboard">
          <div className="page-header">
            <div className="badge">Welcome back</div>
            <h1>Hello, {profile?.full_name || user?.email}!</h1>
            <p className="lede">Track your recycling progress and manage your account</p>
          </div>

          <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            {/* Member ID Card */}
            <div className="member-id-card" style={{ padding: '24px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '24px' }}>🆔</div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Member ID</h3>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px', fontFamily: 'monospace' }}>
                {profile?.public_id || 'Loading...'}
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
                Show this ID at collection centres
              </p>
              <button
                className="btn secondary small"
                style={{ marginTop: '12px', width: '100%' }}
                onClick={() => navigator.clipboard.writeText(profile?.public_id || '')}
              >
                Copy ID
              </button>
            </div>

            {/* Quick Stats */}
            <div className="stats-card" style={{ padding: '24px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '24px' }}>📊</div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Quick Stats</h3>
              </div>
              {loadingStats ? (
                <p style={{ color: 'var(--muted)' }}>Loading stats...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)' }}>
                      {recyclerStats.totalRecycled}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Items Recycled</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)' }}>
                      {recyclerStats.totalPoints}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Points Earned</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)' }}>
                      {recyclerStats.visits}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Collection Visits</div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="actions-card" style={{ padding: '24px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '24px' }}>⚡</div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Quick Actions</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Link href="/profile">
                  <button className="btn primary" style={{ width: '100%' }}>
                    View Profile
                  </button>
                </Link>
                <Link href="/profile">
                  <button className="btn secondary" style={{ width: '100%' }}>
                    View History
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Accepted Items */}
          <section className="accepted-section">
            <h2>Recyclable Items Accepted</h2>
            <p className="lede">
              WasteNot accepts five types of recyclable items at our collection centres:
            </p>
            <div className="accepted-grid">
              {RECYCLABLE_ITEMS.map((item) => (
                <div key={item.id} className="accepted-card">
                  <div className="accepted-icon">
                    <Image
                      src={item.icon}
                      alt={item.name}
                      width={48}
                      height={48}
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                  <div className="accepted-info">
                    <h3>{item.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>
      )}

      {/* Find Recycler Section - Only for Centre Staff */}
      {!authLoading && isCentreStaff && (
        <section className="find-recycler-section">
          <div className="find-recycler-card">
            <h2>Find Recycler</h2>
            <p className="section-subtitle">Search for a recycler by member code</p>
            
            <form onSubmit={handleSearch} className="find-recycler-form">
              <div className="form-group">
                <label htmlFor="memberCode">Member Code</label>
                <input
                  id="memberCode"
                  type="text"
                  value={memberCode}
                  onChange={(e) => setMemberCode(e.target.value)}
                  placeholder="Enter member code"
                  required
                  disabled={loading}
                  className="form-input"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn primary"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>

            {error && (
              <div className="recycler-error">
                <span className="error-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {recyclerProfile && (
              <div className="recycler-profile-card" onClick={handleProfileClick}>
                <div className="recycler-profile-header">
                  <div className="recycler-profile-icon">👤</div>
                  <div className="recycler-profile-info">
                    <h3 className="recycler-profile-name">{recyclerProfile.full_name || 'N/A'}</h3>
                    <p className="recycler-profile-code">Member Code: {recyclerProfile.public_id}</p>
                  </div>
                </div>
                <div className="recycler-profile-action">
                  <span className="action-text">Click to record recycling →</span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* General Home Page Content - Only for non-logged-in users */}
      {showGeneralContent && (
        <>
      <div className="hero">
        <div className="badge">WasteNot · Recycle better</div>
        <h1>
          Recycle Smarter. Earn Rewards.
          <span className="gradient"> Protect the Environment.</span>
        </h1>
        <p className="lede">
          WasteNot helps users track recycling activities, earn points, and redeem rewards while supporting sustainable waste management.
        </p>
        <div className="actions">
          <button className="btn primary">See how it works</button>
        </div>
      </div>

      <section className="accepted-section">
        <h2>Recyclable Items Accepted</h2>
        <p className="lede">
          WasteNot accepts five types of recyclable items at our collection centres:
        </p>
        <div className="accepted-grid">
          {RECYCLABLE_ITEMS.map((item) => (
            <div key={item.id} className="accepted-card">
              <div className="accepted-icon">
                <Image
                  src={item.icon}
                  alt={item.name}
                  width={48}
                  height={48}
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <div className="accepted-info">
                <h3>{item.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="steps">
        <div className="steps-header">
          <h2>How WasteNot Works</h2>
          <p>Follow these steps to start recycling, earning points, and redeeming rewards.</p>
        </div>
        <div className="steps-grid">
          {steps.map((step, idx) => (
            <div key={step.label} className="step-card">
              <div className="step-number">0{idx + 1}</div>
              <h3>{step.label}</h3>
              <p>{step.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta">
        <div>
          <p className="badge">Join the movement</p>
          <h2>Start recycling smarter today</h2>
          <p className="lede">
            Set your location, get custom tips, and keep your community green.
          </p>
        </div>
        <div className="cta-actions">
          <Link href="/register">
            <button className="btn primary">Create account</button>
          </Link>
          <Link href="/learn-more">
            <button className="btn ghost">Learn more</button>
          </Link>
        </div>
      </section>

      <footer className="footer">
        <div>WasteNot · Recycling made simple</div>
        <div className="footer-links">
          <span>By CodeZap</span>
        </div>
      </footer>
        </>
      )}
    </main>
  );
}

