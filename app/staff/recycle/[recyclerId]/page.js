'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts';
import { supabase } from '@/lib/supabase';

// Fixed recyclable items with icons
const RECYCLABLE_ITEMS = [
  { id: 1, name: 'Plastic Bottle', icon: '🥤' },
  { id: 2, name: 'Aluminium Tin', icon: '🥫' },
  { id: 3, name: 'Newspaper', icon: '📰' },
  { id: 4, name: 'Glass', icon: '🍶' },
  { id: 5, name: 'Cardboard', icon: '📦' },
];

export default function RecyclePage() {
  const params = useParams();
  const router = useRouter();
  const recyclerId = params.recyclerId;
  const { user, isCentreStaff, loading: authLoading } = useAuth();

  const [recycler, setRecycler] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Initialize quantities to 0 for all items
  useEffect(() => {
    const initialQuantities = {};
    RECYCLABLE_ITEMS.forEach(item => {
      initialQuantities[item.id] = 0;
    });
    setQuantities(initialQuantities);
  }, []);

  // Check authentication and role
  useEffect(() => {
    if (!authLoading) {
      if (!user || !isCentreStaff) {
        router.push('/');
        return;
      }
    }
  }, [user, isCentreStaff, authLoading, router]);

  // Fetch recycler details
  useEffect(() => {
    if (recyclerId && !authLoading && user) {
      fetchRecycler();
    }
  }, [recyclerId, authLoading, user]);

  const fetchRecycler = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, public_id, full_name')
        .eq('id', recyclerId)
        .eq('role', 'recycler')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Recycler not found');
        } else {
          setError(error.message);
        }
        setLoading(false);
        return;
      }

      setRecycler(data);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (itemId, delta) => {
    setQuantities(prev => {
      const newValue = (prev[itemId] || 0) + delta;
      return {
        ...prev,
        [itemId]: Math.max(0, newValue), // Ensure quantity doesn't go below 0
      };
    });
  };

  const handleConfirm = () => {
    // Check if at least one item has quantity > 0
    const hasItems = Object.values(quantities).some(qty => qty > 0);
    if (!hasItems) {
      setError('Please select at least one item with quantity > 0');
      return;
    }
    setShowModal(true);
    setError(null);
  };

  const handleModalConfirm = async () => {
    try {
      setSubmitting(true);
      setError(null);

      // Prepare items array
      const items = RECYCLABLE_ITEMS
        .filter(item => quantities[item.id] > 0)
        .map(item => ({
          itemId: item.id,
          quantity: quantities[item.id],
        }));

      // Call API to create session and transactions
      const response = await fetch('/api/staff/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recyclerId,
          items,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create recycling session');
      }

      // Success - redirect to home or show success message
      router.push('/?success=recycling-recorded');
    } catch (err) {
      setError(err.message || 'An error occurred while submitting');
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedItems = () => {
    return RECYCLABLE_ITEMS.filter(item => quantities[item.id] > 0);
  };

  if (authLoading || loading) {
    return (
      <main className="page">
        <div className="container">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !recycler) {
    return (
      <main className="page">
        <div className="container">
          <div className="error-card">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => router.push('/')} className="btn primary">
              Go Back
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!recycler) {
    return null;
  }

  return (
    <main className="page">
      <div className="container">
        <div className="recycling-header">
          <button onClick={() => router.push('/')} className="back-btn">
            ← Back
          </button>
          <div className="recycler-info-header">
            <h1>Record Recycling</h1>
            <div className="recycler-name">{recycler.full_name || 'N/A'}</div>
            <div className="member-code">Member Code: {recycler.public_id}</div>
          </div>
        </div>

        {error && (
          <div className="recycler-error" style={{ marginBottom: '20px' }}>
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="recycling-items-grid">
          {RECYCLABLE_ITEMS.map(item => (
            <div key={item.id} className="recycling-item-card">
              <div className="item-icon">{item.icon}</div>
              <h3>{item.name}</h3>
              <div className="quantity-controls">
                <button
                  className="quantity-btn minus"
                  onClick={() => handleQuantityChange(item.id, -1)}
                  disabled={!quantities[item.id] || quantities[item.id] === 0}
                >
                  −
                </button>
                <div className="quantity-display">{quantities[item.id] || 0}</div>
                <button
                  className="quantity-btn plus"
                  onClick={() => handleQuantityChange(item.id, 1)}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="recycling-actions">
          <button
            onClick={handleConfirm}
            className="btn primary large"
            disabled={!Object.values(quantities).some(qty => qty > 0)}
          >
            Confirm
          </button>
        </div>

        {/* Confirmation Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Confirm Recycling</h2>
              
              <div className="modal-recycler-info">
                <div className="modal-info-row">
                  <span className="modal-label">Recycler Name:</span>
                  <span className="modal-value">{recycler.full_name || 'N/A'}</span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-label">Member Code:</span>
                  <span className="modal-value">{recycler.public_id}</span>
                </div>
              </div>

              <div className="modal-items-list">
                <h3>Items to Record:</h3>
                {getSelectedItems().map(item => (
                  <div key={item.id} className="modal-item-row">
                    <span className="modal-item-name">
                      {item.icon} {item.name}
                    </span>
                    <span className="modal-item-quantity">
                      {quantities[item.id]} {quantities[item.id] === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="modal-actions">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn ghost"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleModalConfirm}
                  className="btn primary"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Confirm & Submit'}
                </button>
              </div>

              {error && (
                <div className="recycler-error" style={{ marginTop: '16px' }}>
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

