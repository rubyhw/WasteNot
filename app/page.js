'use client';

import Image from "next/image";
import { useState } from 'react';
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
  const { isCentreStaff, user, loading: authLoading } = useAuth();
  const [memberCode, setMemberCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recyclerProfile, setRecyclerProfile] = useState(null);
  
  // Show general content only if not logged in or not centre_staff
  const showGeneralContent = !authLoading && (!user || !isCentreStaff);

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

  return (
    <main className="page">
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

      {/* General Home Page Content - Only for non-logged-in users or non-centre_staff */}
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
          <button className="btn primary">Get started</button>
          <button className="btn ghost">See how it works</button>
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
          <button className="btn primary">Create account</button>
          <button className="btn ghost">Learn more</button>
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

