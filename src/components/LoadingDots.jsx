import { useEffect, useState } from 'react';

const LoadingDots = ({ position }) => {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev + 1) % 4);
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y - 30, // Position above cursor
        zIndex: 1000,
        backgroundColor: '#2d2d2d',
        padding: '4px 8px',
        borderRadius: '4px',
        color: '#fff',
        fontSize: '16px',
        display: 'flex',
        gap: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transform: 'translateX(-50%)', // Center horizontally
      }}
    >
      {[...Array(3)].map((_, i) => (
        <span
          key={i}
          style={{
            opacity: i < dots ? 1 : 0.3,
            transition: 'opacity 0.15s ease',
            width: '6px',
            height: '6px',
            backgroundColor: '#fff',
            borderRadius: '50%',
            display: 'inline-block'
          }}
        />
      ))}
    </div>
  );
};

export default LoadingDots;
