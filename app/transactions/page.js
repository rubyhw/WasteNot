'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts';
import { supabase } from '@/lib/supabase';
import { RECYCLABLE_ITEMS } from '../config/recyclableItems';

export default function TransactionsPage() {
  const router = useRouter();
  const { user, isCentreStaff, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [centreTotals, setCentreTotals] = useState({});
  const [recyclerTotals, setRecyclerTotals] = useState(null);
  const [selectedRecycler, setSelectedRecycler] = useState(null);
  const [recyclerSearch, setRecyclerSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchingRecycler, setSearchingRecycler] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

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

  // Fetch transactions
  useEffect(() => {
    if (user && isCentreStaff && !authLoading) {
      fetchTransactions();
    }
  }, [user, isCentreStaff, authLoading, selectedRecycler]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const url = selectedRecycler 
        ? `/api/staff/transactions?recyclerId=${selectedRecycler.id}`
        : '/api/staff/transactions';

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }

      setTransactions(data.transactions || []);
      setCentreTotals(data.centreTotals || {});
      setRecyclerTotals(data.recyclerTotals || null);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecyclerSearch = async (e) => {
    e.preventDefault();
    if (!recyclerSearch.trim()) {
      setSelectedRecycler(null);
      return;
    }

    setSearchingRecycler(true);
    try {
      const response = await fetch('/api/staff/lookup-recycler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberCode: recyclerSearch.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Recycler not found');
        setSelectedRecycler(null);
        return;
      }

      setSelectedRecycler(data.profile);
    } catch (err) {
      alert('Error searching for recycler');
    } finally {
      setSearchingRecycler(false);
    }
  };

  const clearRecyclerFilter = () => {
    setSelectedRecycler(null);
    setRecyclerSearch('');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getItemName = (itemId) => {
    const item = RECYCLABLE_ITEMS.find(i => i.id === itemId);
    return item ? item.name : `Item ${itemId}`;
  };

  // Group transactions by session so each recycling session is shown in a single row
  const groupedSessions = transactions.reduce((groups, tx) => {
    const sessionId = tx.session_id || tx.id;
    if (!groups[sessionId]) {
      groups[sessionId] = {
        sessionId,
        recycler: tx.recycler,
        created_at: tx.created_at,
        items: [],
      };
    }

    const quantity =
      tx.displayQuantity !== undefined
        ? tx.displayQuantity
        : tx.quantity;

    const existingItem = groups[sessionId].items.find(
      (item) => item.itemId === tx.item_id
    );

    const unit =
      RECYCLABLE_ITEMS.find((i) => i.id === tx.item_id)?.unit || 'units';

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      groups[sessionId].items.push({
        itemId: tx.item_id,
        name: getItemName(tx.item_id),
        unit,
        quantity,
      });
    }

    return groups;
  }, {});

  const sessionList = Object.values(groupedSessions);

  const toggleSessionSelected = (sessionId) => {
    setSelectedSessions((prev) =>
      prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const openEditModal = (session) => {
    const items = session.items.map((item) => ({
      itemId: item.itemId,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
    }));
    setEditingSession(session);
    setEditItems(items);
  };

  const closeEditModal = () => {
    setEditingSession(null);
    setEditItems([]);
  };

  const handleEditQuantityChange = (itemId, value) => {
    setEditItems((prev) =>
      prev.map((item) =>
        item.itemId === itemId
          ? {
              ...item,
              quantity:
                value === ''
                  ? ''
                  : isNaN(parseFloat(value))
                  ? item.quantity
                  : parseFloat(value),
            }
          : item
      )
    );
  };

  const handleSaveEdit = async () => {
    if (!editingSession) return;

    try {
      setEditSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const itemsPayload = editItems
        .map((item) => ({
          itemId: item.itemId,
          quantity:
            typeof item.quantity === 'string'
              ? parseFloat(item.quantity)
              : item.quantity,
        }))
        .filter(
          (item) => item.quantity && !isNaN(item.quantity) && item.quantity > 0
        );

      if (itemsPayload.length === 0) {
        alert('Please enter at least one item with quantity/weight > 0');
        setEditSubmitting(false);
        return;
      }

      const response = await fetch(
        `/api/staff/transactions/${editingSession.sessionId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ items: itemsPayload }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update transaction');
      }

      closeEditModal();
      await fetchTransactions();
    } catch (err) {
      console.error('Error updating transaction:', err);
      alert(err.message || 'Error updating transaction');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedSessions.length === 0) return;

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedSessions.length} transaction(s)?`
      )
    ) {
      return;
    }

    try {
      setDeleteSubmitting(true);
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        throw new Error('Not authenticated');
      }

      // Delete each selected session
      for (const sessionId of selectedSessions) {
        const response = await fetch(`/api/staff/transactions/${sessionId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authSession.access_token}`,
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to delete transaction');
        }

        if (editingSession && editingSession.sessionId === sessionId) {
          closeEditModal();
        }
      }

      setSelectedSessions([]);
      await fetchTransactions();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert(err.message || 'Error deleting transaction');
    } finally {
      setDeleteSubmitting(false);
    }
  };


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
        <h1>Transactions</h1>
        <p className="lede">View recycling transactions and totals</p>
      </div>

      {/* Recycler Search */}
      <div className="recycler-search-section" style={{ marginBottom: '32px', padding: '20px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <h3 style={{ marginBottom: '16px' }}>Filter by Recycler</h3>
        <form onSubmit={handleRecyclerSearch} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="recyclerSearch" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
              Member Code
            </label>
            <input
              id="recyclerSearch"
              type="text"
              value={recyclerSearch}
              onChange={(e) => setRecyclerSearch(e.target.value)}
              placeholder="Enter member code"
              className="form-input"
              disabled={searchingRecycler}
            />
          </div>
          <button
            type="submit"
            className="btn primary"
            disabled={searchingRecycler}
          >
            {searchingRecycler ? 'Searching...' : 'Search'}
          </button>
          {selectedRecycler && (
            <button
              type="button"
              onClick={clearRecyclerFilter}
              className="btn ghost"
            >
              Clear
            </button>
          )}
        </form>
        {selectedRecycler && (
          <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(35, 164, 85, 0.1)', borderRadius: '8px' }}>
            <strong>Selected:</strong> {selectedRecycler.full_name} ({selectedRecycler.public_id})
          </div>
        )}
      </div>

      {/* Totals Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {/* Collection Centre Totals */}
        <div className="totals-card" style={{ padding: '20px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Total Collected by Centre (Per Item)</h3>
          {Object.keys(centreTotals).length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No data available</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(centreTotals).map(([itemName, total]) => (
                <div key={itemName} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 500 }}>{itemName}:</span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{total} {RECYCLABLE_ITEMS.find(i => i.name === itemName)?.unit || 'units'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recycler Totals (if selected) */}
        {selectedRecycler && recyclerTotals && (
          <div className="totals-card" style={{ padding: '20px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>
              Total Recycled by {selectedRecycler.full_name} (Per Item)
            </h3>
            {Object.keys(recyclerTotals).length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>No transactions for this recycler</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(recyclerTotals).map(([itemName, total]) => (
                  <div key={itemName} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 500 }}>{itemName}:</span>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{total} {RECYCLABLE_ITEMS.find(i => i.name === itemName)?.unit || 'units'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transactions List (grouped by session) */}
      <div style={{ marginTop: '32px' }}>
        <h2 style={{ marginBottom: '20px' }}>Transaction History</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
          <div />
          <div style={{ display: 'flex', gap: '8px' }}>
            {isDeleteMode && (
              <button
                type="button"
                className="btn ghost"
                style={{ padding: '8px 14px', fontSize: '14px' }}
                onClick={() => {
                  setIsDeleteMode(false);
                  setSelectedSessions([]);
                }}
                disabled={deleteSubmitting}
              >
                Cancel
              </button>
            )}
            {isDeleteMode ? (
              <button
                type="button"
                className="btn danger"
                style={{ padding: '8px 14px', fontSize: '14px' }}
                onClick={handleDeleteSelected}
                disabled={deleteSubmitting || selectedSessions.length === 0}
              >
                {deleteSubmitting
                  ? 'Deleting...'
                  : `Delete Selected (${selectedSessions.length})`}
              </button>
            ) : (
              <button
                type="button"
                className="btn danger"
                style={{ padding: '8px 14px', fontSize: '14px' }}
                onClick={() => setIsDeleteMode(true)}
              >
                Delete
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <div className="loading">Loading transactions...</div>
        ) : sessionList.length === 0 ? (
          <div className="empty-state">
            <p>No transactions found</p>
          </div>
        ) : (
          <div className="transactions-list">
            {sessionList.map((session, index) => (
              <div key={session.sessionId} className="transaction-card">
                <div className="transaction-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isDeleteMode && (
                      <input
                        type="checkbox"
                        checked={selectedSessions.includes(session.sessionId)}
                        onChange={() => toggleSessionSelected(session.sessionId)}
                      />
                    )}
                    <div>
                      <h3
                        style={{
                          margin: '0 0 4px',
                          fontSize: '16px',
                          fontWeight: 600,
                          color: '#0f2418',
                        }}
                      >
                        {index + 1}. ID: {session.sessionId}
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          color: 'var(--muted)',
                          fontSize: '14px',
                        }}
                      >
                        {session.recycler?.public_id || 'N/A'}
                        {session.recycler?.full_name &&
                          ` - ${session.recycler.full_name}`}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ padding: '6px 10px', fontSize: '13px' }}
                      onClick={() => openEditModal(session)}
                      disabled={deleteSubmitting}
                    >
                      Edit
                    </button>
                  </div>
                </div>
                <div className="transaction-details">
                  {session.items.map((item) => (
                    <div key={item.itemId} className="detail-item">
                      <span className="detail-label">{item.name}:</span>
                      <span className="detail-value weight">
                        {item.quantity.toFixed(
                          item.quantity % 1 === 0 ? 0 : 1
                        )}{' '}
                        {item.unit}
                      </span>
                    </div>
                  ))}
                  <div className="detail-item">
                    <span className="detail-label">Timestamp:</span>
                    <span className="detail-value">
                      {formatDate(session.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Transaction Modal */}
      {editingSession && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Transaction</h2>
            <div className="modal-recycler-info">
              <div className="modal-info-row">
                <span className="modal-label">Recycler:</span>
                <span className="modal-value">
                  {editingSession.recycler?.public_id || 'N/A'}
                  {editingSession.recycler?.full_name &&
                    ` - ${editingSession.recycler.full_name}`}
                </span>
              </div>
              <div className="modal-info-row">
                <span className="modal-label">Transaction ID:</span>
                <span className="modal-value">{editingSession.sessionId}</span>
              </div>
            </div>

            <div className="modal-items-list">
              <h3>Items</h3>
              {editItems.map((item) => (
                <div key={item.itemId} className="modal-item-row">
                  <span className="modal-item-name">{item.name}</span>
                  <span className="modal-item-quantity">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={
                        item.quantity === ''
                          ? ''
                          : Number(item.quantity).toString()
                      }
                      onChange={(e) =>
                        handleEditQuantityChange(item.itemId, e.target.value)
                      }
                      style={{
                        width: '90px',
                        marginRight: '8px',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                      }}
                    />
                    {item.unit}
                  </span>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={closeEditModal}
                disabled={editSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={handleSaveEdit}
                disabled={editSubmitting}
              >
                {editSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


