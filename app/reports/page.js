'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts';

export default function ReportsPage() {
  const router = useRouter();
  const { user, isCentreStaff, loading: authLoading } = useAuth();
  const [timeRange, setTimeRange] = useState('month');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is authenticated and is centre_staff
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (!isCentreStaff) {
        router.push('/');
        return;
      }
    }
  }, [user, isCentreStaff, authLoading, router]);

  // Mock data for demonstration
  const reportData = {
    month: {
      totalRecycled: 45.2,
      categories: [
        { name: 'Paper & Cardboard', weight: 18.5, percentage: 41 },
        { name: 'Glass & Metals', weight: 12.3, percentage: 27 },
        { name: 'Compost', weight: 8.9, percentage: 20 },
        { name: 'E-waste', weight: 3.2, percentage: 7 },
        { name: 'Batteries', weight: 2.3, percentage: 5 },
      ],
      impact: {
        co2Saved: 125,
        treesSaved: 3,
        landfillDiverted: 45.2,
      },
      trends: [
        { week: 'Week 1', weight: 10.5 },
        { week: 'Week 2', weight: 12.3 },
        { week: 'Week 3', weight: 11.8 },
        { week: 'Week 4', weight: 10.6 },
      ],
    },
    year: {
      totalRecycled: 542.8,
      categories: [
        { name: 'Paper & Cardboard', weight: 222.1, percentage: 41 },
        { name: 'Glass & Metals', weight: 147.6, percentage: 27 },
        { name: 'Compost', weight: 106.8, percentage: 20 },
        { name: 'E-waste', weight: 38.4, percentage: 7 },
        { name: 'Batteries', weight: 27.9, percentage: 5 },
      ],
      impact: {
        co2Saved: 1500,
        treesSaved: 36,
        landfillDiverted: 542.8,
      },
      trends: [
        { month: 'Jan', weight: 45.2 },
        { month: 'Feb', weight: 48.5 },
        { month: 'Mar', weight: 52.1 },
        { month: 'Apr', weight: 50.8 },
        { month: 'May', weight: 55.3 },
        { month: 'Jun', weight: 58.9 },
      ],
    },
  };

  const currentData = reportData[timeRange];

  // Show loading or redirect message while checking auth
  if (authLoading || !user || !isCentreStaff) {
    return (
      <main className="page">
        <div className="loading">Loading...</div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-header">
        <h1>Reports & Analytics</h1>
        <p className="lede">Track your environmental impact and recycling progress</p>
      </div>

      {/* Time Range Selector */}
      <div className="time-range-selector">
        <button 
          className={`range-btn ${timeRange === 'month' ? 'active' : ''}`}
          onClick={() => setTimeRange('month')}
        >
          This Month
        </button>
        <button 
          className={`range-btn ${timeRange === 'year' ? 'active' : ''}`}
          onClick={() => setTimeRange('year')}
        >
          This Year
        </button>
      </div>

      {/* Impact Cards */}
      <div className="impact-grid">
        <div className="impact-card">
          <div className="impact-icon">🌱</div>
          <div className="impact-value">{currentData.totalRecycled} kg</div>
          <div className="impact-label">Total Recycled</div>
        </div>
        <div className="impact-card">
          <div className="impact-icon">🌍</div>
          <div className="impact-value">{currentData.impact.co2Saved} kg</div>
          <div className="impact-label">CO₂ Saved</div>
        </div>
        <div className="impact-card">
          <div className="impact-icon">🌳</div>
          <div className="impact-value">{currentData.impact.treesSaved}</div>
          <div className="impact-label">Trees Saved</div>
        </div>
        <div className="impact-card">
          <div className="impact-icon">♻️</div>
          <div className="impact-value">{currentData.impact.landfillDiverted} kg</div>
          <div className="impact-label">Diverted from Landfill</div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="report-section">
        <h2>Category Breakdown</h2>
        <div className="category-breakdown">
          {currentData.categories.map((category, index) => (
            <div key={index} className="category-item">
              <div className="category-header">
                <span className="category-name">{category.name}</span>
                <span className="category-weight">{category.weight} kg</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${category.percentage}%`,
                    background: `linear-gradient(135deg, #23a455, #0fa761)`
                  }}
                />
              </div>
              <div className="category-percentage">{category.percentage}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Trends Chart */}
      <div className="report-section">
        <h2>Recycling Trends</h2>
        <div className="trends-chart">
          {currentData.trends.map((trend, index) => {
            const maxWeight = Math.max(...currentData.trends.map(t => t.weight));
            const height = (trend.weight / maxWeight) * 100;
            return (
              <div key={index} className="trend-bar">
                <div 
                  className="bar-fill"
                  style={{ 
                    height: `${height}%`,
                    background: `linear-gradient(to top, #23a455, #0fa761)`
                  }}
                />
                <div className="bar-label">{trend[timeRange === 'month' ? 'week' : 'month']}</div>
                <div className="bar-value">{trend.weight} kg</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievements */}
      <div className="report-section">
        <h2>Achievements</h2>
        <div className="achievements-grid">
          <div className="achievement-card">
            <div className="achievement-icon">🏆</div>
            <h3>Consistent Recycler</h3>
            <p>Recycled every week this month</p>
          </div>
          <div className="achievement-card">
            <div className="achievement-icon">⭐</div>
            <h3>50kg Milestone</h3>
            <p>Reached 50kg recycled this year</p>
          </div>
          <div className="achievement-card">
            <div className="achievement-icon">🌿</div>
            <h3>Eco Warrior</h3>
            <p>Diverted 500kg from landfills</p>
          </div>
        </div>
      </div>
    </main>
  );
}

