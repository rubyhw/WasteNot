'use client';

import Image from "next/image";
import { useState } from 'react';
import { useAuth } from './contexts';
import { supabase } from '@/lib/supabase';

const highlights = [
  { title: "Smart Sorting", text: "Learn what goes in recycling, compost, or landfill with simple guides." },
  { title: "Local Drop-offs", text: "Find nearby collection points for glass, electronics, batteries, and more." },
  { title: "Pickups & Reminders", text: "Schedule pickups and get reminders so you never miss collection day." },
];

const steps = [
  { label: "Scan or search", detail: "Look up an item and see how to recycle it properly." },
  { label: "Drop or schedule", detail: "Get directions to a drop-off or book a pickup." },
  { label: "Track impact", detail: "See how much waste you've diverted from landfills." },
];

const stats = [
  { value: "12k+", label: "Households guided" },
  { value: "180t", label: "Waste diverted" },
  { value: "92%", label: "Sorting accuracy" },
];

export default function Home() {
  const { isCentreStaff, user, loading: authLoading } = useAuth();
  const [memberCode, setMemberCode] = useState('');
  const [recyclerData, setRecyclerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
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
    setRecyclerData(null);

    try {
      // Fetch profile from profiles table using public_id (member code)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('public_id', memberCode.trim())
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          setError('User not found');
        } else {
          setError(profileError.message);
        }
        setLoading(false);
        return;
      }

      // Get email from profile (if stored there) or leave as null
      // Note: Email from auth.users requires admin API, so we use profile data
      setRecyclerData({
        name: profile.full_name || profile.name || 'N/A',
        email: profile.email || null,
        points: profile.points_total || profile.points || 0,
      });
    } catch (err) {
      setError(err.message || 'An error occurred while fetching user data');
    } finally {
      setLoading(false);
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

            {recyclerData && (
              <div className="recycler-info">
                <h3>Recycler Information</h3>
                <div className="recycler-details">
                  <div className="detail-row">
                    <span className="detail-label">Name:</span>
                    <span className="detail-value">{recyclerData.name}</span>
                  </div>
                  {recyclerData.email && (
                    <div className="detail-row">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{recyclerData.email}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Current Points:</span>
                    <span className="detail-value points">{recyclerData.points}</span>
                  </div>
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
          Give waste a second life with
          <span className="gradient"> WasteNot</span>
        </h1>
        <p className="lede">
          WasteNot is your green companion for smarter recycling. Learn what to
          recycle, find the right drop-off spots, and see your impact in real time.
        </p>
        <div className="actions">
          <button className="btn primary">Get started</button>
          <button className="btn ghost">See how it works</button>
        </div>
        <div className="hero-card">
          <div>
            <h3>Pickups, reminders, and guides</h3>
            <p>Stop guessing—know exactly where each item goes.</p>
            <div className="chips">
              <span className="chip">Paper & Cardboard</span>
              <span className="chip">Glass & Metals</span>
              <span className="chip">E-waste</span>
              <span className="chip">Batteries</span>
            </div>
          </div>
          <Image
            src="https://images.unsplash.com/photo-1508873699372-7aeab60b44ab?auto=format&fit=crop&w=600&q=80"
            alt="Recycling bins"
            width={240}
            height={160}
            className="hero-img"
            priority
          />
        </div>
      </div>

      <section className="grid">
        {highlights.map((item) => (
          <div key={item.title} className="card">
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </div>
        ))}
      </section>

      <section className="stats">
        {stats.map((item) => (
          <div key={item.label} className="stat">
            <div className="stat-value">{item.value}</div>
            <div className="stat-label">{item.label}</div>
          </div>
        ))}
      </section>

      <section className="steps">
        <div className="steps-header">
          <h2>How WasteNot works</h2>
          <p>Three simple steps to recycle with confidence.</p>
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
          <a href="#">Guides</a>
          <a href="#">Drop-offs</a>
          <a href="#">Contact</a>
        </div>
      </footer>
        </>
      )}
    </main>
  );
}

