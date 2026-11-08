import React, { useEffect } from 'react';
import { ShieldCheck, ArrowLeft, FileText, Scale } from 'lucide-react';
import { APP_VERSION } from '../version';

interface CGUProps {
  onBack?: () => void;
}

export const CGU: React.FC<CGUProps> = ({ onBack }) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Conditions Générales d'Utilisation – App à la Carte";
    return () => {
      document.title = prevTitle;
    };
  }, []);

  const handleReturn = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Bouton retour et badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <button
          type="button"
          onClick={handleReturn}
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <ArrowLeft size={16} />
          Retour
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            className="badge"
            style={{
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ShieldCheck size={14} />
            Document Officiel
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-dark-light)' }}>
            Version {APP_VERSION}
          </span>
        </div>
      </div>

      {/* En-tête */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Conditions Générales d'Utilisation (CGU / CGV)</h1>
          <p className="page-subtitle" style={{ lineHeight: '1.5' }}>
            Modalités d'accès au service logiciel, conditions d'utilisation et cadre contractuel.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Statut : En cours de rédaction */}
        <div className="card" style={{ padding: '24px', borderLeft: '4px solid var(--color-warning, #f59e0b)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-warning-light, rgba(245, 158, 11, 0.1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-warning, #f59e0b)',
              }}
            >
              <FileText size={20} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
              Statut : Document en cours de rédaction
            </h2>
          </div>
          <p style={{ fontSize: '14px', lineHeight: '1.6', margin: 0, color: 'var(--color-dark)' }}>
            Le document contractuel complet relatif aux Conditions Générales d'Utilisation et de Vente est actuellement en cours de rédaction par l'éditeur.
          </p>
        </div>

        {/* Modalités factuelles actuelles */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
              }}
            >
              <Scale size={20} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
              Modalités d'accès et d'évaluation
            </h2>
          </div>

          <div style={{ fontSize: '14px', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p>
              L'application <em>MarmiCout</em> est actuellement mise à disposition des professionnels de la cuisine et des traiteurs pour essai et évaluation autonome en environnement local.
            </p>
            <p>
              Les conditions contractuelles régissant les prestations sur-mesure, les abonnements professionnels personnalisés et l'assistance éditeur sont communiquées lors de l'établissement des devis ou adressées sur simple demande écrite :
            </p>
            <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-light)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              <strong>App à la Carte — Hervé CHAMPAGNE EI</strong><br />
              Email de contact officiel :{' '}
              <a href="mailto:contact@appalacarte.fr" style={{ color: 'var(--color-primary)', fontWeight: '600' }}>
                contact@appalacarte.fr
              </a><br />
              Téléphone :{' '}
              <a href="tel:+33769590470" style={{ color: 'var(--color-primary)', fontWeight: '600' }}>
                07 69 59 04 70
              </a>
            </div>
            <div style={{ marginTop: '8px' }}>
              <a
                href="/mentions-legales"
                style={{
                  color: 'var(--color-primary)',
                  fontWeight: '600',
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Consulter les Mentions Légales complètes →
              </a>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <footer style={{
          textAlign: 'center',
          padding: '24px 16px',
          fontSize: '12px',
          color: 'var(--color-dark-light)',
          borderTop: '1px solid var(--color-border)',
          marginTop: '20px',
          lineHeight: '1.8'
        }}>
          <div>
            <strong>App à la Carte — Hervé CHAMPAGNE EI</strong> | SIREN : 132 021 098 | v{APP_VERSION} |{' '}
            <a href="/mentions-legales" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Mentions légales</a>
            {' '}|{' '}
            <a href="/confidentialite" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Confidentialité</a>
            {' '}|{' '}
            <a href="/cgu" style={{ color: 'var(--color-primary)', textDecoration: 'underline', fontWeight: '700' }}>CGU</a>
          </div>
        </footer>
      </div>
    </div>
  );
};
