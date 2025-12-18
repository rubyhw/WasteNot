'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, signOut, isCentreStaff, loading } = useAuth();

  // Base navigation items
  const baseNavItems = [
    { label: 'Home', href: '/' },
  ];

  // Only show Transaction and Report for centre_staff
  const centreStaffNavItems = isCentreStaff
    ? [
        { label: 'Transaction', href: '/transactions' },
        { label: 'Report', href: '/reports' },
      ]
    : [];

  const navItems = [...baseNavItems, ...centreStaffNavItems];

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-logo">
          <span className="logo-text">WasteNot</span>
        </div>
        
        <nav className="header-nav">
          {/* Desktop Navigation */}
          <div className="desktop-nav">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href} className="nav-link">
                {item.label}
              </Link>
            ))}
          </div>
          
          {/* Mobile Hamburger Menu */}
          <button 
            className="menu-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
          
          {/* Mobile Dropdown Menu */}
          <div className={`dropdown-menu ${isMenuOpen ? 'open' : ''}`}>
            {navItems.map((item) => (
              <Link 
                key={item.label} 
                href={item.href} 
                className="dropdown-item"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
          
          <div className="header-actions">
            {!loading && user ? (
              <>
                <div className="user-info">
                  <span className="user-name">
                    {profile?.email || profile?.full_name || user.email}
                  </span>
                  {isCentreStaff && (
                    <span className="user-role">Centre Staff</span>
                  )}
                </div>
                <button onClick={signOut} className="btn-login">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-login">Login</Link>
                <Link href="/register" className="btn-register">Register</Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

