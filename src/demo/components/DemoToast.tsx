import React, { useEffect } from 'react';
import { Lock } from 'lucide-react';

interface DemoToastProps {
  message: string | null;
  onClose: () => void;
  duration?: number;
}

export const DemoToast: React.FC<DemoToastProps> = ({ message, onClose, duration = 3500 }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, onClose, duration]);

  if (!message) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 10001,
        background: '#1e1b4b',
        color: '#ffffff',
        padding: '12px 18px',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '13px',
        fontWeight: 600,
        border: '1px solid #4338ca',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        style={{
          background: '#4f46e5',
          borderRadius: '6px',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Lock size={14} color="#ffffff" />
      </div>
      <span>{message}</span>
    </div>
  );
};
