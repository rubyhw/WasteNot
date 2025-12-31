export default function LoadingSpinner({ message = 'Loading...', size = 'medium' }) {
  const sizes = {
    small: { spinner: 24, font: 14 },
    medium: { spinner: 40, font: 16 },
    large: { spinner: 64, font: 18 }
  };

  const { spinner, font } = sizes[size] || sizes.medium;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      gap: '16px'
    }}>
      <div 
        className="loading-spinner"
        style={{
          width: `${spinner}px`,
          height: `${spinner}px`,
          border: `3px solid #e5e7eb`,
          borderTop: `3px solid #23a455`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
      <p style={{ 
        color: '#6b7280', 
        fontSize: `${font}px`,
        fontWeight: '500'
      }}>
        {message}
      </p>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
