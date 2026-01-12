'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts';
import { useLanguage } from '../contexts/LanguageContexts';
import { supabase } from '@/lib/supabase';
import { RECYCLABLE_ITEMS } from '../config/recyclableItems';

export default function TransactionsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isCentreStaff, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const hasRefreshedRef = useRef(false);
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
  const [currentPage, setCurrentPage] = useState(1);
  const sessionsPerPage = 10;

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

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const url = selectedRecycler 
        ? `/api/staff/transactions?recyclerId=${selectedRecycler.id}&_t=${Date.now()}&_r=${Math.random()}`
        : `/api/staff/transactions?_t=${Date.now()}&_r=${Math.random()}`;

      // Add aggressive cache-busting for Vercel deployment
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        cache: 'no-store', // Force no caching
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }

      const transactionsData = data.transactions || [];
      console.log(`[Transactions Page] Received ${transactionsData.length} transactions at ${new Date().toLocaleTimeString()}`);
      console.log(`[Transactions Page] Response timestamp: ${data._timestamp || 'not provided'}`);
      console.log(`[Transactions Page] Response request ID: ${data._requestId || 'not provided'}`);
      if (transactionsData.length > 0) {
        console.log('[Transactions Page] First transaction (newest):', transactionsData[0]);
        console.log('[Transactions Page] First transaction session_id:', transactionsData[0].session_id);
        console.log('[Transactions Page] First transaction created_at:', transactionsData[0].created_at);
        console.log('[Transactions Page] Last transaction (oldest):', transactionsData[transactionsData.length - 1]);
      } else {
        console.warn('[Transactions Page] WARNING: No transactions returned from API!');
      }
      
      setTransactions(transactionsData);
      setCentreTotals(data.centreTotals || {});
      setRecyclerTotals(data.recyclerTotals || null);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedRecycler]);

  // Track previous pathname to detect navigation
  const prevPathnameRef = useRef(pathname);
  const isNavigatingRef = useRef(false);

  // Fetch transactions on initial load and when recycler filter changes
  // But skip if we're navigating from another page (let the navigation effect handle it)
  useEffect(() => {
    if (user && isCentreStaff && !authLoading && pathname === '/transactions') {
      // Only fetch immediately if we're not navigating from another page
      if (!isNavigatingRef.current) {
        console.log('[Transactions Page] Fetching transactions (initial load or filter change)...');
        fetchTransactions();
      } else {
        console.log('[Transactions Page] Skipping initial fetch - navigation refresh will handle it');
        isNavigatingRef.current = false;
      }
    }
  }, [user, isCentreStaff, authLoading, selectedRecycler, fetchTransactions, pathname]);

  // Refresh transactions when navigating TO this page (e.g., after creating a session)
  useEffect(() => {
    if (!user || !isCentreStaff || authLoading) return;
    
    // Check if we just navigated TO this page (pathname changed from something else to /transactions)
    const justNavigatedToPage = prevPathnameRef.current !== pathname && pathname === '/transactions';
    
    if (pathname !== '/transactions') {
      prevPathnameRef.current = pathname;
      hasRefreshedRef.current = false;
      isNavigatingRef.current = false;
      return;
    }

    if (justNavigatedToPage) {
      console.log('[Transactions Page] Just navigated to transactions page, refreshing...');
      isNavigatingRef.current = true;
      
      // Clear any recycler filter to show all transactions when navigating from record recycling
      // This ensures new transactions appear in the "all transactions" view
      if (selectedRecycler) {
        console.log('[Transactions Page] Clearing recycler filter to show all transactions');
        setSelectedRecycler(null);
        setRecyclerSearch('');
      }
      
      // Create a function to fetch all transactions (without recycler filter)
      const fetchAllTransactions = async () => {
        try {
          setLoading(true);
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('Not authenticated');
          }

          const url = `/api/staff/transactions?_t=${Date.now()}&_r=${Math.random()}`;
          console.log(`[Transactions Page] Fetching all transactions from: ${url}`);
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
            cache: 'no-store', // Force no caching for Vercel
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch transactions');
          }

          const transactionsData = data.transactions || [];
          console.log(`[Transactions Page] Fetched ${transactionsData.length} transactions (all, no filter)`);
          console.log(`[Transactions Page] Response timestamp: ${data._timestamp || 'not provided'}`);
          console.log(`[Transactions Page] Response request ID: ${data._requestId || 'not provided'}`);
          if (transactionsData.length > 0) {
            console.log('[Transactions Page] First transaction (newest):', transactionsData[0]);
            console.log('[Transactions Page] First transaction session_id:', transactionsData[0].session_id);
            console.log('[Transactions Page] First transaction recycler:', transactionsData[0].recycler);
            console.log('[Transactions Page] First transaction collection_centre_id:', transactionsData[0].collection_centre_id);
            console.log('[Transactions Page] First transaction created_at:', transactionsData[0].created_at);
          } else {
            console.warn('[Transactions Page] WARNING: No transactions returned from API!');
          }
          setTransactions(transactionsData);
          setCentreTotals(data.centreTotals || {});
          setRecyclerTotals(null);
        } catch (err) {
          console.error('Error fetching all transactions:', err);
        } finally {
          setLoading(false);
        }
      };
      
      // Multiple refreshes with increasing delays to ensure we get the latest data
      // Use fetchAllTransactions to explicitly fetch without any recycler filter
      const timeout1 = setTimeout(() => {
        console.log('[Transactions Page] First refresh (2s delay) - fetching all transactions...');
        fetchAllTransactions();
      }, 2000);
      
      const timeout2 = setTimeout(() => {
        console.log('[Transactions Page] Second refresh (4s delay) - fetching all transactions...');
        fetchAllTransactions();
      }, 4000);
      
      const timeout3 = setTimeout(() => {
        console.log('[Transactions Page] Third refresh (6s delay) - fetching all transactions...');
        fetchAllTransactions();
        isNavigatingRef.current = false;
      }, 6000);
      
      prevPathnameRef.current = pathname;
      
      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
        clearTimeout(timeout3);
      };
    }
  }, [pathname, user, isCentreStaff, authLoading, fetchTransactions]);

  // Refresh when page becomes visible
  useEffect(() => {
    if (!user || !isCentreStaff || authLoading) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchTransactions();
      }
    };

    const handleFocus = () => {
      fetchTransactions();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, isCentreStaff, authLoading, fetchTransactions]);

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
    setCurrentPage(1); // Reset to first page when clearing filter
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    // Convert UTC timestamp to local time
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Use browser's local timezone
    });
  };

  const getItemName = (itemId) => {
    const item = RECYCLABLE_ITEMS.find(i => i.id === itemId);
    return item ? item.name : `Item ${itemId}`;
  };

  // Group transactions by session so each recycling session is shown in a single row
  // Use useMemo to ensure grouping happens when transactions change
  const sessionList = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      console.log('[Transactions Page] No transactions to group');
      return [];
    }

    console.log(`[Transactions Page] Grouping ${transactions.length} transactions into sessions`);
    console.log('[Transactions Page] Sample transactions:', transactions.slice(0, 3).map(tx => ({
      id: tx.id,
      session_id: tx.session_id,
      recycler_id: tx.recycler_id,
      recycler: tx.recycler,
      collection_centre_id: tx.collection_centre_id,
      created_at: tx.created_at
    })));

    const groupedSessions = transactions.reduce((groups, tx) => {
      const sessionId = tx.session_id || tx.id;
      if (!sessionId) {
        console.warn('[Transactions Page] Transaction missing session_id:', tx);
        return groups;
      }
      
      if (!groups[sessionId]) {
        // Use session's created_at if available, otherwise fall back to transaction's created_at
        const sessionCreatedAt = tx.session?.created_at || tx.created_at;
        groups[sessionId] = {
          sessionId,
          recycler: tx.recycler,
          created_at: sessionCreatedAt,
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

    const sessions = Object.values(groupedSessions);
    
    // Define the display order for items: Plastic Bottle, Aluminium Tin, Newspaper, Glass, Cardboard
    const itemDisplayOrder = [1, 2, 3, 4, 5]; // IDs: Plastic Bottle, Aluminium Tin, Newspaper, Glass, Cardboard
    
    // Sort items within each session according to the specified order
    sessions.forEach(session => {
      if (session.items && session.items.length > 0) {
        session.items.sort((a, b) => {
          const indexA = itemDisplayOrder.indexOf(a.itemId);
          const indexB = itemDisplayOrder.indexOf(b.itemId);
          // If item not in order list, put it at the end
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
      }
    });
    
    // Sort sessions by created_at descending (newest first)
    sessions.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB - dateA; // Descending order (newest first)
    });
    
    // Debug: Log grouped sessions
    console.log(`[Transactions Page] Total transactions: ${transactions.length}`);
    console.log(`[Transactions Page] Grouped into ${sessions.length} sessions`);
    if (transactions.length > 0) {
      console.log('[Transactions Page] First transaction (newest):', transactions[0]);
      console.log('[Transactions Page] First transaction session_id:', transactions[0].session_id);
      console.log('[Transactions Page] First transaction session:', transactions[0].session);
      console.log('[Transactions Page] First transaction created_at:', transactions[0].created_at);
    }
    if (sessions.length > 0) {
      console.log('[Transactions Page] First session (newest):', sessions[0]);
      console.log('[Transactions Page] First session created_at:', sessions[0].created_at);
      console.log('[Transactions Page] First session items:', sessions[0].items);
      console.log('[Transactions Page] First session items length:', sessions[0].items?.length || 0);
    } else if (transactions.length > 0) {
      console.warn('[Transactions Page] WARNING: Have transactions but no sessions grouped!');
      console.warn('[Transactions Page] Sample transaction session_id:', transactions[0].session_id);
    }
    
    return sessions;
  }, [transactions]);

  // Calculate pagination
  const totalPages = Math.ceil(sessionList.length / sessionsPerPage);
  const startIndex = (currentPage - 1) * sessionsPerPage;
  const endIndex = startIndex + sessionsPerPage;
  const paginatedSessions = sessionList.slice(startIndex, endIndex);

  // Reset to page 1 when recycler filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRecycler]);

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

      console.log('[Transactions Page] Transaction updated successfully in Supabase');
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

        console.log(`[Transactions Page] Session ${sessionId} deleted successfully from Supabase`);
        if (editingSession && editingSession.sessionId === sessionId) {
          closeEditModal();
        }
      }

      setSelectedSessions([]);
      console.log('[Transactions Page] All selected sessions deleted, refreshing transaction list');
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
        <div className="loading">{t('common.loading')}</div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-header">
        <h1>{t('transactions.title')}</h1>
        <p className="lede">{t('transactions.subtitle')}</p>
      </div>

      {/* Recycler Search */}
      <div className="recycler-search-section" style={{ marginBottom: '32px', padding: '20px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <h3 style={{ marginBottom: '16px' }}>{t('transactions.filterByRecycler')}</h3>
        <form onSubmit={handleRecyclerSearch} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="recyclerSearch" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
              {t('transactions.memberCode')}
            </label>
            <input
              id="recyclerSearch"
              type="text"
              value={recyclerSearch}
              onChange={(e) => setRecyclerSearch(e.target.value)}
              placeholder={t('transactions.enterMemberCode')}
              className="form-input"
              disabled={searchingRecycler}
            />
          </div>
          <button
            type="submit"
            className="btn primary"
            disabled={searchingRecycler}
          >
            {searchingRecycler ? t('transactions.searching') : t('transactions.search')}
          </button>
          {selectedRecycler && (
            <button
              type="button"
              onClick={clearRecyclerFilter}
              className="btn ghost"
            >
              {t('transactions.clear')}
            </button>
          )}
        </form>
        {selectedRecycler && (
          <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(35, 164, 85, 0.1)', borderRadius: '8px' }}>
            <strong>{t('transactions.selected')}:</strong> {selectedRecycler.full_name} ({selectedRecycler.public_id})
          </div>
        )}
      </div>

      {/* Totals Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {/* Recycler Totals (if selected) */}
        {selectedRecycler && recyclerTotals && (
          <div className="totals-card" style={{ padding: '20px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>
              {t('transactions.totalRecycledBy')} {selectedRecycler.full_name} {t('transactions.perItem')}
            </h3>
            {Object.keys(recyclerTotals).length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>{t('transactions.noTransactions')}</p>
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
          <div className="loading">{t('common.loading')}</div>
        ) : !sessionList || sessionList.length === 0 ? (
          <div className="empty-state">
            <p>{t('transactions.noTransactionsFound')}</p>
            <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--muted)' }}>
              {transactions.length > 0 
                ? `Found ${transactions.length} transactions but couldn't group them into sessions.`
                : 'No transactions found.'}
            </p>
          </div>
        ) : (
          <>
            <div className="transactions-list">
              {paginatedSessions && paginatedSessions.length > 0 ? (
                paginatedSessions.map((session, sessionIndex) => {
                  const index = startIndex + sessionIndex;
                  if (!session || !session.sessionId) {
                    console.warn('[Transactions Page] Invalid session:', session);
                    return null;
                  }
                  console.log(`[Transactions Page] Rendering session ${index}:`, session.sessionId, 'with', session.items?.length || 0, 'items');
                  return (
                    <div key={session.sessionId || `session-${index}`} className="transaction-card">
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
                      {t('transactions.edit')}
                    </button>
                  </div>
                </div>
                <div className="transaction-details">
                  {session.items && session.items.length > 0 ? (
                    session.items.map((item) => (
                      <div key={item.itemId} className="detail-item">
                        <span className="detail-label">{item.name}:</span>
                        <span className="detail-value weight">
                          {item.quantity.toFixed(
                            item.quantity % 1 === 0 ? 0 : 1
                          )}{' '}
                          {item.unit}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="detail-item">
                      <span className="detail-label" style={{ color: 'var(--muted)' }}>
                        No items in this session
                      </span>
                    </div>
                  )}
                  <div className="detail-item detail-item-timestamp">
                    <span className="detail-label">Timestamp:</span>
                    <span className="detail-value">
                      {formatDate(session.created_at)}
                    </span>
                  </div>
                </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state">
                  <p>No sessions to display</p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {sessionList.length > sessionsPerPage && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '12px', 
                marginTop: '32px',
                padding: '20px',
                background: 'var(--card)',
                borderRadius: '12px',
                border: '1px solid var(--border)'
              }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '8px 16px' }}
                >
                  Previous
                </button>
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  alignItems: 'center',
                  fontSize: '14px',
                  color: 'var(--text)'
                }}>
                  <span>Page</span>
                  <span style={{ fontWeight: 600 }}>{currentPage}</span>
                  <span>of</span>
                  <span style={{ fontWeight: 600 }}>{totalPages}</span>
                </div>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '8px 16px' }}
                >
                  Next
                </button>
              </div>
            )}
          </>
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


