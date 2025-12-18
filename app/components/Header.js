'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Transactions', href: '/transactions' },
    { label: 'Reports', href: '/reports' },
  ];

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
            <Link href="/login" className="btn-login">Login</Link>
            <Link href="/register" className="btn-register">Register</Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

