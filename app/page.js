'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './contexts';
import { useLanguage } from './contexts/LanguageContexts';
import { supabase } from '@/lib/supabase';
import { RECYCLABLE_ITEMS } from './config/recyclableItems';

// Collection centers data
const collectionCenters = [
  {
    id: 1,
    name: "George Town Recycling Center",
    address: "Jalan Penang, George Town, 10200 Penang",
    distance: "0.8 km",
    hours: "Mon-Fri: 8AM-6PM",
    phone: "+604-261-1234",
    coordinates: { lat: 5.4141, lng: 100.3288 }
  },
  {
    id: 2,
    name: "Bayan Lepas Eco Collection Point",
    address: "Jalan Bayan Lepas, Bayan Lepas, 11900 Penang",
    distance: "1.2 km",
    hours: "Mon-Sat: 9AM-5PM",
    phone: "+604-642-5678",
    coordinates: { lat: 5.2897, lng: 100.2631 }
  },
  {
    id: 3,
    name: "Butterworth Green Hub",
    address: "Jalan Bagan Luar, Butterworth, 12000 Penang",
    distance: "2.1 km",
    hours: "Tue-Sun: 10AM-4PM",
    phone: "+604-331-9012",
    coordinates: { lat: 5.4380, lng: 100.3885 }
  },
  {
    id: 4,
    name: "Jelutong Sustainable Solutions",
    address: "Jalan Jelutong, Jelutong, 11600 Penang",
    distance: "2.8 km",
    hours: "Mon-Fri: 7AM-7PM",
    phone: "+604-281-3456",
    coordinates: { lat: 5.3971, lng: 100.3188 }
  }
];

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
  const { isCentreStaff, user, profile, role, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [memberCode, setMemberCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recyclerProfile, setRecyclerProfile] = useState(null);

  // Redirect admin to /admin
  useEffect(() => {
    if (!authLoading && user && role === 'admin') {
      router.push('/admin');
    }
  }, [authLoading, user, role, router]);

  // Recycler stats state
  const [recyclerStats, setRecyclerStats] = useState({
    totalRecycled: 0,
    totalPoints: 0,
    visits: 0,
    transactions: []
  });
  const [loadingStats, setLoadingStats] = useState(false);
  
  // Collection centers state
  const [userLocation, setUserLocation] = useState(null);
  const [nearestCenters, setNearestCenters] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [showCenters, setShowCenters] = useState(false);
  
  // Determine what content to show
  // Only redirect if user and role are loaded
  const isRecycler = !authLoading && user && !isCentreStaff && role !== 'admin';
  const showGeneralContent = !authLoading && !user;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!memberCode.trim()) {
      setError(t('centreStaff.pleaseEnterCode'));
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
        // Group transactions by session
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
          sessionMap[tx.session_id].items[tx.item_id] = tx.quantity;
          // Calculate points
          const weightBasedItems = [3, 5];
          if (weightBasedItems.includes(tx.item_id)) {
            sessionMap[tx.session_id].points_earned += Math.floor(tx.quantity / 1000);
          } else {
            sessionMap[tx.session_id].points_earned += tx.quantity;
          }
        });
        
        const transactions = Object.values(sessionMap).map(session => ({
          ...session,
          ...session.items
        }));
        
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

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get user's location and find nearest collection centers
  const findNearestCenters = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);
    setShowCenters(true); // Show centers immediately

    // Show centers with default distances first
    const defaultCoords = { lat: 5.4141, lng: 100.3288 }; // George Town, Penang
    const centersWithDistance = collectionCenters.map(center => ({
      ...center,
      actualDistance: calculateDistance(
        defaultCoords.lat,
        defaultCoords.lng,
        center.coordinates.lat,
        center.coordinates.lng
      )
    }));

    const nearest = centersWithDistance
      .sort((a, b) => a.actualDistance - b.actualDistance)
      .slice(0, 3)
      .map(center => ({
        ...center,
        distance: `${center.actualDistance.toFixed(1)} km`
      }));

    setNearestCenters(nearest);

    try {
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by this browser. Showing centers with default location.');
        setLocationLoading(false);
        return;
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const userCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      setUserLocation(userCoords);

      // Recalculate with actual user location
      const centersWithActualDistance = collectionCenters.map(center => ({
        ...center,
        actualDistance: calculateDistance(
          userCoords.lat,
          userCoords.lng,
          center.coordinates.lat,
          center.coordinates.lng
        )
      }));

      // Sort by distance and take top 3
      const nearestWithActual = centersWithActualDistance
        .sort((a, b) => a.actualDistance - b.actualDistance)
        .slice(0, 3)
        .map(center => ({
          ...center,
          distance: `${center.actualDistance.toFixed(1)} km`
        }));

      setNearestCenters(nearestWithActual);
      setLocationError(null); // Clear any previous error
    } catch (err) {
      setLocationError('Using default location (Penang). Please enable location permissions for accurate results.');
    } finally {
      setLocationLoading(false);
    }
  }, []);

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
            <div className="badge">{t('dashboard.welcomeBack')}</div>
            <h1>{t('dashboard.hello')}, {profile?.full_name || user?.email}!</h1>
            <p className="lede">{t('dashboard.trackProgress')}</p>
          </div>

          <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            {/* Member ID Card */}
            <div className="member-id-card" style={{ padding: '24px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '24px' }}>🆔</div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{t('dashboard.memberId')}</h3>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px', fontFamily: 'monospace' }}>
                {profile?.public_id || t('dashboard.loading')}
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
                {t('dashboard.showIdAtCentres')}
              </p>
              <button
                className="btn secondary small"
                style={{ marginTop: '12px', width: '100%' }}
                onClick={() => navigator.clipboard.writeText(profile?.public_id || '')}
              >
                {t('dashboard.copyId')}
              </button>
            </div>

            {/* Quick Stats */}
            <div className="stats-card" style={{ padding: '24px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '24px' }}>📊</div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{t('dashboard.quickStats')}</h3>
              </div>
              {loadingStats ? (
                <p style={{ color: 'var(--muted)' }}>{t('dashboard.loadingStats')}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)' }}>
                      {recyclerStats.totalRecycled}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>{t('dashboard.itemsRecycled')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)' }}>
                      {recyclerStats.totalPoints}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>{t('dashboard.pointsEarned')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)' }}>
                      {recyclerStats.visits}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>{t('dashboard.collectionVisits')}</div>
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
                    {t('dashboard.viewProfile')}
                  </button>
                </Link>
                <button
                  className="btn secondary"
                  style={{ width: '100%' }}
                  onClick={findNearestCenters}
                  disabled={locationLoading}
                >
                  {locationLoading ? t('dashboard.locatingCentres') : t('dashboard.findNearestCenters')}
                </button>
              </div>
            </div>
          </div>

          {/* Nearest Collection Centers */}
          {showCenters && (
            <section className="centers-section" style={{ marginBottom: '32px' }}>
              <h2>Nearest Collection Centres</h2>
              {locationError && (
                <div className="auth-error" style={{ marginBottom: '16px' }}>
                  <span className="error-icon">⚠️</span>
                  <span>{locationError}</span>
                </div>
              )}
              <div className="centers-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                {nearestCenters.map((center) => (
                  <div key={center.id} className="center-card" style={{ padding: '20px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ fontSize: '24px' }}>🏭</div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{center.name}</h3>
                        <div style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 500 }}>{center.distance} {t('dashboard.away')}</div>
                      </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '4px' }}>📍 {center.address}</div>
                      <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '4px' }}>🕒 {center.hours}</div>
                      <div style={{ fontSize: '14px', color: 'var(--muted)' }}>📞 {center.phone}</div>
                    </div>
                    <button
                      className="btn secondary small"
                      style={{ width: '100%' }}
                      onClick={() => {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${center.coordinates.lat},${center.coordinates.lng}`;
                        window.open(url, '_blank');
                      }}
                    >
                      {t('dashboard.getDirections')}
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button
                  className="btn ghost small"
                  onClick={() => setShowCenters(false)}
                >
                  {t('dashboard.hideCentres')}
                </button>
              </div>
            </section>
          )}

          {/* Accepted Items */}
          <section className="accepted-section">
            <h2>{t('items.title')}</h2>
            <p className="lede">
              {t('items.description')}
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
            <h2>{t('centreStaff.findRecycler')}</h2>
            <p className="section-subtitle">{t('centreStaff.searchByMemberCode')}</p>

            <form onSubmit={handleSearch} className="find-recycler-form">
              <div className="form-group">
                <label htmlFor="memberCode">{t('centreStaff.memberCode')}</label>
                <input
                  id="memberCode"
                  type="text"
                  value={memberCode}
                  onChange={(e) => setMemberCode(e.target.value)}
                  placeholder={t('centreStaff.enterMemberCode')}
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
                {loading ? t('centreStaff.searching') : t('centreStaff.search')}
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
                    <p className="recycler-profile-code">{t('centreStaff.memberCode')}: {recyclerProfile.public_id}</p>
                  </div>
                </div>
                <div className="recycler-profile-action">
                  <span className="action-text">{t('centreStaff.clickToRecord')}</span>
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
            <div className="badge">{t('hero.badge')}</div>
            <h1>
              {t('hero.title')}
              <span className="gradient"> {t('hero.subtitle')}</span>
            </h1>
            <p className="lede">
              {t('hero.description')}
            </p>
            <div className="actions">
              <Link href="/register">
                <button className="btn primary">{t('hero.getStarted')}</button>
              </Link>
              <Link href="/learn-more">
                <button className="btn ghost">{t('hero.howItWorks')}</button>
              </Link>
            </div>
          </div>

          <section className="accepted-section">
            <h2>{t('items.title')}</h2>
            <p className="lede">
              {t('items.description')}
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
              <h2>{t('steps.title')}</h2>
              <p>{t('steps.subtitle')}</p>
            </div>
            <div className="steps-grid">
              {['step1', 'step2', 'step3', 'step4', 'step5'].map((stepKey, idx) => (
                <div key={stepKey} className="step-card">
                  <div className="step-number">0{idx + 1}</div>
                  <h3>{t(`steps.${stepKey}.label`)}</h3>
                  <p>{t(`steps.${stepKey}.detail`)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="cta">
            <div>
              <p className="badge">{t('cta.badge')}</p>
              <h2>{t('cta.title')}</h2>
              <p className="lede">
                {t('cta.description')}
              </p>
            </div>
            <div className="cta-actions">
              <Link href="/register">
                <button className="btn primary">{t('cta.createAccount')}</button>
              </Link>
              <Link href="/learn-more">
                <button className="btn ghost">{t('cta.learnMore')}</button>
              </Link>
            </div>
          </section>

          <footer className="footer">
            <div>{t('footer.tagline')}</div>
            <div className="footer-links">
              <span>{t('footer.by')}</span>
            </div>
          </footer>
        </>
      )}
    </main>
  );
}

