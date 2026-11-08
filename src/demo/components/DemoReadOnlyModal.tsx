import React from 'react';
import { Lock, Sparkles, X, ArrowRight, ExternalLink } from 'lucide-react';

interface DemoReadOnlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionName?: string;
  appalacarteUrl?: string;
}

export const DemoReadOnlyModal: React.FC<DemoReadOnlyModalProps> = ({
  isOpen,
  onClose,
  actionName = 'Cette action',
  appalacarteUrl = (import.meta.env.VITE_APPALACARTE_URL || 'https://appalacarte.fr')
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '32px 28px',
          maxWidth: '460px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          textAlign: 'center'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px'
          }}
          aria-label="Fermer"
        >
          <X size={20} />
        </button>

        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
            color: '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 16px rgba(79, 70, 229, 0.12)'
          }}
        >
          <Lock size={32} />
        </div>

        <h3
          style={{
            fontSize: '20px',
            fontWeight: 800,
            color: '#0f172a',
            marginBottom: '10px'
          }}
        >
          Mode Démonstration
        </h3>

        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '16px',
            color: '#334155',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          {actionName} est disponible dans la <strong>version complète</strong>.
        </div>

        <p
          style={{
            fontSize: '13px',
            color: '#64748b',
            lineHeight: 1.5,
            marginBottom: '24px'
          }}
        >
          Dans cette version de démonstration publique, les modifications, ajouts et suppressions sont verrouillés pour préserver la cohérence des données pour tous les visiteurs.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <a
            href={appalacarteUrl}
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
              color: '#ffffff',
              textDecoration: 'none',
              padding: '12px 20px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}
          >
            <span>Découvrir la version complète sur Appalacarte</span>
            <ExternalLink size={16} />
          </a>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: '#64748b',
              border: '1px solid #cbd5e1',
              padding: '10px 16px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Continuer la visite de démonstration
          </button>
        </div>
      </div>
    </div>
  );
};
