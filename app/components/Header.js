'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, profile, signOut, isCentreStaff, role, loading } = useAuth();

  // Base navigation items
  const baseNavItems = [
    { label: 'Home', href: role === 'admin' ? '/admin' : '/' },
  ];

  // Admin-specific navigation
  const adminNavItems = role === 'admin'
    ? [
        { label: 'Admin Panel', href: '/admin' },
        { label: 'Users', href: '/admin/users' },
        { label: 'Vouchers', href: '/admin/vouchers' },
        { label: 'Items', href: '/admin/items' },
      ]
    : [];

  // Only show Transaction and Report for centre_staff
  const centreStaffNavItems = isCentreStaff
    ? [
        { label: 'Home', href: '/' },
        { label: 'Transaction', href: '/transactions' },
        { label: 'Report', href: '/reports' },
      ]
    : [];

  // Show Profile for regular authenticated users
  const userNavItems = user && !isCentreStaff && role !== 'admin'
    ? [
        { label: 'Profile', href: '/profile' },
      ]
    : [];

  const navItems = [...(role === 'admin' ? adminNavItems : baseNavItems), ...centreStaffNavItems, ...userNavItems];

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-logo">
          <Image
            src="/favicon.png"
            alt="WasteNot Logo"
            width={40}
            height={40}
            className="logo-icon"
          />
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
                    {profile?.full_name || user.email}
                  </span>
                  {role === 'admin' && (
                    <span className="user-role" style={{ background: '#dc2626' }}>Admin</span>
                  )}
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
                {pathname !== '/register' && (
                  <Link href="/register" className="btn-register">Register</Link>
                )}
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

