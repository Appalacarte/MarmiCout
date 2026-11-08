import React from 'react';
import { Sparkles, ArrowLeft, RotateCcw, ShieldCheck } from 'lucide-react';
import { demoDbService } from '../services/demoDb';

interface DemoBannerProps {
  onReset?: () => void;
  appalacarteUrl?: string;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ 
  onReset,
  appalacarteUrl = (import.meta.env.VITE_APPALACARTE_URL || 'https://appalacarte.fr')
}) => {
  const handleReset = () => {
    if (window.confirm('Voulez-vous restaurer les données d’exemple initiales de la démo ?')) {
      demoDbService.resetToDefault();
      if (onReset) onReset();
      window.location.reload();
    }
  };

  return (
    <aside 
      aria-label="Mode démonstration"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
        color: '#ffffff',
        padding: '8px 16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        fontSize: '13px',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
      }}
    >
      {/* Côté gauche : Badge & Titre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span 
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '3px 8px',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          <Sparkles size={12} />
          DÉMO
        </span>

        <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span>Mode démo — données d’exemple</span>
          <span 
            style={{ 
              opacity: 0.75, 
              fontSize: '12px',
              fontWeight: 400,
              display: 'none'
            }}
            className="demo-desktop-only"
          >
            • Navigation complète en lecture seule
          </span>
        </span>
      </div>

      {/* Côté droit : Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={handleReset}
          title="Restaurer les données d'exemple"
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            padding: '5px 10px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.22)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)')}
        >
          <RotateCcw size={13} />
          <span style={{ display: 'inline' }}>Réinitialiser</span>
        </button>

        <a
          href={appalacarteUrl}
          style={{
            background: '#ffffff',
            color: '#1e1b4b',
            textDecoration: 'none',
            padding: '5px 12px',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'transform 0.15s, background 0.15s'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
          onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
        >
          <ArrowLeft size={13} />
          <span>Retour à Appalacarte</span>
        </a>
      </div>
    </aside>
  );
};
