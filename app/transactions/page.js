'use client';

import { useState, useEffect } from 'react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Mock data for demonstration - replace with actual Supabase queries
  const mockTransactions = [
    {
      id: 1,
      type: 'pickup',
      category: 'Paper & Cardboard',
      date: '2024-01-15',
      time: '10:30 AM',
      weight: '12.5 kg',
      status: 'completed',
      location: '123 Main St',
    },
    {
      id: 2,
      type: 'dropoff',
      category: 'E-waste',
      date: '2024-01-14',
      time: '2:15 PM',
      weight: '3.2 kg',
      status: 'completed',
      location: 'Electronics Recycling Center',
    },
    {
      id: 3,
      type: 'pickup',
      category: 'Glass & Metals',
      date: '2024-01-13',
      time: '9:00 AM',
      weight: '8.7 kg',
      status: 'completed',
      location: '456 Oak Ave',
    },
    {
      id: 4,
      type: 'pickup',
      category: 'Compost',
      date: '2024-01-20',
      time: '11:00 AM',
      weight: '15.0 kg',
      status: 'scheduled',
      location: '123 Main St',
    },
    {
      id: 5,
      type: 'dropoff',
      category: 'Batteries',
      date: '2024-01-12',
      time: '4:30 PM',
      weight: '1.5 kg',
      status: 'completed',
      location: 'Battery Collection Point',
    },
  ];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setTransactions(mockTransactions);
      setLoading(false);
    }, 500);
  }, []);

  const filteredTransactions = filter === 'all' 
    ? transactions 
    : transactions.filter(t => t.status === filter);

  const getStatusBadge = (status) => {
    const styles = {
      completed: { bg: 'rgba(35, 164, 85, 0.12)', color: 'var(--primary-dark)' },
      scheduled: { bg: 'rgba(255, 193, 7, 0.12)', color: '#b8860b' },
      cancelled: { bg: 'rgba(220, 53, 69, 0.12)', color: '#c82333' },
    };
    const style = styles[status] || styles.completed;
    return (
      <span 
        className="status-badge"
        style={{ background: style.bg, color: style.color }}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTypeIcon = (type) => {
    return type === 'pickup' ? '🚚' : '📍';
  };

  const stats = {
    total: transactions.length,
    completed: transactions.filter(t => t.status === 'completed').length,
    scheduled: transactions.filter(t => t.status === 'scheduled').length,
    totalWeight: transactions.reduce((sum, t) => sum + parseFloat(t.weight), 0).toFixed(1),
  };

  return (
    <main className="page">
      <div className="page-header">
        <h1>Transactions</h1>
        <p className="lede">Track your recycling pickups and drop-offs</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Transactions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.scheduled}</div>
          <div className="stat-label">Scheduled</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalWeight} kg</div>
          <div className="stat-label">Total Recycled</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button 
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
        <button 
          className={`filter-btn ${filter === 'scheduled' ? 'active' : ''}`}
          onClick={() => setFilter('scheduled')}
        >
          Scheduled
        </button>
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="loading">Loading transactions...</div>
      ) : filteredTransactions.length === 0 ? (
        <div className="empty-state">
          <p>No transactions found</p>
        </div>
      ) : (
        <div className="transactions-list">
          {filteredTransactions.map((transaction) => (
            <div key={transaction.id} className="transaction-card">
              <div className="transaction-header">
                <div className="transaction-type">
                  <span className="type-icon">{getTypeIcon(transaction.type)}</span>
                  <div>
                    <h3>{transaction.type === 'pickup' ? 'Pickup' : 'Drop-off'}</h3>
                    <p className="transaction-location">{transaction.location}</p>
                  </div>
                </div>
                {getStatusBadge(transaction.status)}
              </div>
              <div className="transaction-details">
                <div className="detail-item">
                  <span className="detail-label">Category:</span>
                  <span className="detail-value">{transaction.category}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">{transaction.date}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Time:</span>
                  <span className="detail-value">{transaction.time}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Weight:</span>
                  <span className="detail-value weight">{transaction.weight}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

