import React from 'react';
import { ExternalLink, ShieldCheck, X } from 'lucide-react';

interface Props {
  planName: string;
  isTrial: boolean;
  targetUrl: string;
  onCancel: () => void;
}

/**
 * Popup affichée quand le client clique sur un forfait :
 * elle le prévient qu'il va être redirigé vers App à la Carte (l'application de vente)
 * pour créer son profil et finaliser son essai ou son abonnement.
 */
export const AppalacarteRedirectModal: React.FC<Props> = ({ planName, isTrial, targetUrl, onCancel }) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="appalacarte-redirect-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '32px 28px',
          maxWidth: '460px',
          width: '100%',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          position: 'relative',
          color: '#1e1b4b'
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Fermer"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            border: 'none',
            background: 'transparent',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '6px'
          }}
        >
          <X size={18} />
        </button>

        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          backgroundColor: '#eef2ff',
          color: '#4338ca',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <ExternalLink size={26} />
        </div>

        <h3
          id="appalacarte-redirect-title"
          style={{ fontSize: '20px', fontWeight: 800, textAlign: 'center', margin: '0 0 10px' }}
        >
          Vous allez être redirigé vers App à la Carte
        </h3>

        <p style={{ fontSize: '14px', color: '#475569', textAlign: 'center', lineHeight: 1.55, margin: '0 0 18px' }}>
          {isTrial ? (
            <>Pour démarrer votre <strong>essai gratuit</strong>, vous allez passer sur App à la Carte, notre plateforme d&apos;abonnement.</>
          ) : (
            <>Pour souscrire la formule <strong>{planName}</strong>, vous allez passer sur App à la Carte, notre plateforme d&apos;abonnement.</>
          )}
        </p>

        <ul style={{
          listStyle: 'none',
          padding: '14px 16px',
          margin: '0 0 22px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          fontSize: '13px',
          color: '#334155',
          lineHeight: 1.7
        }}>
          <li>1. Créez votre profil ou connectez-vous</li>
          <li>2. Confirmez {isTrial ? 'votre essai' : 'votre formule'}</li>
          <li>3. Recevez par e-mail le lien pour finaliser</li>
        </ul>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Annuler
          </button>
          <a
            href={targetUrl}
            style={{
              flex: 2,
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#6366f1',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'center',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            Continuer
            <ExternalLink size={15} />
          </a>
        </div>

        <p style={{
          fontSize: '11px',
          color: '#94a3b8',
          textAlign: 'center',
          margin: '14px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}>
          <ShieldCheck size={13} />
          Abonnement et paiement sécurisés sur appalacarte.fr
        </p>
      </div>
    </div>
  );
};
