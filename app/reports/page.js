'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts';
import { supabase } from '@/lib/supabase';
import { RECYCLABLE_ITEMS } from '../config/recyclableItems';

export default function ReportsPage() {
  const router = useRouter();
  const { user, isCentreStaff, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  // viewMode: 'month' | 'year'
  const [viewMode, setViewMode] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().getMonth() + 1
  );

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (!isCentreStaff) {
        router.push('/');
        return;
      }
      fetchYearData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isCentreStaff, authLoading]);

  const fetchYearData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Fetch current year's transactions; month filter is done client-side
      const response = await fetch('/api/staff/transactions?period=year', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load report data');
      }

      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Error loading report data:', err);
      setError(err.message || 'Error loading report data');
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    if (!transactions.length) {
      return {
        totalItems: 0,
        sessionCount: 0,
        uniqueRecyclers: 0,
        perItemTotals: {},
        mostCollectedItem: null,
        plasticsMetalsTop: null,
        newspaperKg: 0,
        cardboardKg: 0,
      };
    }

    // Filter by selected view mode (month or year)
    const now = new Date();
    const currentYear = now.getFullYear();
    const filtered = transactions.filter((tx) => {
      const d = new Date(tx.created_at);
      if (d.getFullYear() !== currentYear) return false;
      if (viewMode === 'month') {
        return d.getMonth() + 1 === selectedMonth;
      }
      return true; // year view: whole year
    });

    if (!filtered.length) {
      return {
        totalItems: 0,
        sessionCount: 0,
        uniqueRecyclers: 0,
        perItemTotals: {},
        mostCollectedItem: null,
        plasticsMetalsTop: null,
        newspaperKg: 0,
        cardboardKg: 0,
        plasticsMetalsRanking: [],
        rankedItems: [],
      };
    }

    const perItemTotals = {};
    const sessionIds = new Set();
    const recyclerIds = new Set();

    filtered.forEach((tx) => {
      sessionIds.add(tx.session_id);
      recyclerIds.add(tx.recycler_id);

      const itemConfig = RECYCLABLE_ITEMS.find((i) => i.id === tx.item_id);
      const key = itemConfig ? itemConfig.name : `Item ${tx.item_id}`;
      const qty =
        typeof tx.displayQuantity === 'number'
          ? tx.displayQuantity
          : tx.quantity;

      if (!perItemTotals[key]) {
        perItemTotals[key] = 0;
      }
      perItemTotals[key] += qty;
    });

    const totalItems = Object.values(perItemTotals).reduce(
      (sum, v) => sum + v,
      0
    );

    // Ranking among Plastic Bottle (1), Aluminium Tin (2), Glass (4)
    const targetIds = [1, 2, 4];
    const plasticsMetalsRanking = targetIds
      .map((id) => {
        const cfg = RECYCLABLE_ITEMS.find((i) => i.id === id);
        if (!cfg) return null;
        const qty = perItemTotals[cfg.name] || 0;
        return { name: cfg.name, quantity: qty, unit: cfg.unit };
      })
      .filter((item) => item !== null)
      .sort((a, b) => b.quantity - a.quantity);
    const plasticsMetalsTop = plasticsMetalsRanking[0] || null;

    const newspaperCfg = RECYCLABLE_ITEMS.find((i) => i.id === 3);
    const cardboardCfg = RECYCLABLE_ITEMS.find((i) => i.id === 5);
    const newspaperKg = newspaperCfg
      ? perItemTotals[newspaperCfg.name] || 0
      : 0;
    const cardboardKg = cardboardCfg
      ? perItemTotals[cardboardCfg.name] || 0
      : 0;

    let mostCollectedItem = null;
    let mostQty = -1;
    Object.entries(perItemTotals).forEach(([name, qty]) => {
      if (qty > mostQty) {
        mostQty = qty;
        const cfg = RECYCLABLE_ITEMS.find((i) => i.name === name);
        mostCollectedItem = {
          name,
          quantity: qty,
          unit: cfg?.unit || 'units',
        };
      }
    });

    // Build ranking for all items (top 3)
    const rankedItems = Object.entries(perItemTotals)
      .map(([name, qty]) => {
        const cfg = RECYCLABLE_ITEMS.find((i) => i.name === name);
        return {
          name,
          quantity: qty,
          unit: cfg?.unit || 'units',
        };
      })
      .sort((a, b) => b.quantity - a.quantity);

    return {
      totalItems,
      sessionCount: sessionIds.size,
      uniqueRecyclers: recyclerIds.size,
      perItemTotals,
      mostCollectedItem,
      plasticsMetalsTop,
      plasticsMetalsRanking,
      newspaperKg,
      cardboardKg,
      rankedItems,
    };
  }, [transactions, viewMode, selectedMonth]);

  if (authLoading || !user || !isCentreStaff) {
    return (
      <main className="page">
        <div className="loading">Loading...</div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="page">
        <div className="loading">Loading monthly report...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page">
        <div className="error-card">
          <h2>Report Error</h2>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-header">
        <h1>Report</h1>
        <p className="lede">
          {viewMode === 'month'
            ? `Collection summary for ${new Date(
                new Date().getFullYear(),
                selectedMonth - 1,
                1
              ).toLocaleString('default', { month: 'long' })}`
            : 'This yearʼs collection summary'}
        </p>
      </div>

      {/* View Mode & Month Selector */}
      <div className="time-range-selector" style={{ marginBottom: '16px' }}>
        <button
          className={`range-btn ${viewMode === 'month' ? 'active' : ''}`}
          onClick={() => setViewMode('month')}
        >
          Monthly
        </button>
        <button
          className={`range-btn ${viewMode === 'year' ? 'active' : ''}`}
          onClick={() => setViewMode('year')}
        >
          Annual
        </button>
      </div>
      {viewMode === 'month' && (
        <div
          className="time-range-selector"
          style={{
            marginBottom: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          {Array.from({ length: 12 }).map((_, idx) => {
            const monthNum = idx + 1;
            const label = new Date(
              new Date().getFullYear(),
              idx,
              1
            ).toLocaleString('default', { month: 'short' });
            return (
              <button
                key={monthNum}
                type="button"
                className={`range-btn ${
                  selectedMonth === monthNum ? 'active' : ''
                }`}
                onClick={() => setSelectedMonth(monthNum)}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Summary Cards */}
      <div className="impact-grid">
        <div className="impact-card">
          <div className="impact-icon">📦</div>
          <div className="impact-value">
            {summary.totalItems.toFixed(
              summary.totalItems % 1 === 0 ? 0 : 1
            )}
          </div>
          <div className="impact-label">
            Total Items Collected (
            {viewMode === 'month' ? 'Selected Month' : 'This Year'})
          </div>
        </div>
        <div className="impact-card">
          <div className="impact-icon">🧾</div>
          <div className="impact-value">{summary.sessionCount}</div>
          <div className="impact-label">Number of Recycling Sessions</div>
        </div>
        <div className="impact-card">
          <div className="impact-icon">👥</div>
          <div className="impact-value">{summary.uniqueRecyclers}</div>
          <div className="impact-label">Number of Unique Recyclers</div>
        </div>
        <div className="impact-card">
          <div className="impact-icon">🏆</div>
          <div className="impact-value">
            {summary.mostCollectedItem
              ? summary.mostCollectedItem.name
              : 'N/A'}
          </div>
          <div className="impact-label">Most Collected Item</div>
        </div>
      </div>

      {/* Total Collected by Centre (Per Item) */}
      <div className="report-section">
        <h2>Total Collected by Centre (Per Item)</h2>
        <div className="category-breakdown">
          {RECYCLABLE_ITEMS.map((item) => {
            const total = summary.perItemTotals[item.name] || 0;
            return (
              <div key={item.id} className="category-item">
                <div className="category-header">
                  <span className="category-name">{item.name}</span>
                  <span className="category-weight">
                    {total.toFixed(total % 1 === 0 ? 0 : 1)} {item.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Focus: Plastics & Metals */}
      <div className="report-section">
        <h2>Most Collected (Plastic Bottle, Aluminium Tin, Glass)</h2>
        {summary.plasticsMetalsRanking &&
        summary.plasticsMetalsRanking.length > 0 ? (
          <div className="plastics-ranking-grid">
            {summary.plasticsMetalsRanking.slice(0, 3).map((item, index) => (
              <div key={item.name} className="plastics-ranking-card">
                <div className="plastics-rank-badge">{index + 1}</div>
                <div className="plastics-ranking-info">
                  <div className="plastics-item-name">{item.name}</div>
                  <div className="plastics-item-qty">
                    {item.quantity.toFixed(
                      item.quantity % 1 === 0 ? 0 : 1
                    )}{' '}
                    {item.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No plastic, aluminium tin, or glass collected this month.</p>
        )}
      </div>

      {/* (Paper & Cardboard section removed as requested) */}
    </main>
  );
}

