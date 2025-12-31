'use client';

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          maxWidth: '600px',
          margin: '40px auto',
          textAlign: 'center',
          border: '1px solid #fee2e2',
          borderRadius: '12px',
          backgroundColor: '#fef2f2'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px', color: '#dc2626' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            We&apos;re sorry for the inconvenience. The application encountered an unexpected error.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#23a455',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '500',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Reload Page
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{
              marginTop: '24px',
              textAlign: 'left',
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'monospace'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: '600', marginBottom: '8px' }}>
                Error Details (Development Mode)
              </summary>
              <pre style={{ whiteSpace: 'pre-wrap', color: '#dc2626' }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
