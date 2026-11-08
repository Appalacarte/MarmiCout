import React, { useEffect } from 'react';
import { ShieldCheck, ArrowLeft, Lock, FileText } from 'lucide-react';
import { APP_VERSION } from '../version';

interface ConfidentialiteProps {
  onBack?: () => void;
}

export const Confidentialite: React.FC<ConfidentialiteProps> = ({ onBack }) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Politique de confidentialité – App à la Carte';
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
          <h1 className="page-title">Politique de Confidentialité</h1>
          <p className="page-subtitle" style={{ lineHeight: '1.5' }}>
            Protection de vos données personnelles et respect du Règlement Général sur la Protection des Données (RGPD).
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
            Le document contractuel complet relatif à la Politique de Confidentialité est actuellement en cours de finalisation par l'éditeur.
          </p>
        </div>

        {/* Règles factuelles temporaires et stockage local */}
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
              <Lock size={20} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
              Engagements de confidentialité applicables
            </h2>
          </div>

          <div style={{ fontSize: '14px', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p>
              Dans l'attente de la publication des stipulations détaillées, les engagements relatifs à la confidentialité et au traitement des données applicables à l'application <em>MarmiCout</em> sont ceux précisés à la section 4 des mentions légales :
            </p>
            <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <strong>Stockage local autonome :</strong> Vos données métiers (produits, fiches recettes, productions, registres d'achats et ventes) sont conservées exclusivement sur votre terminal (via <code>localStorage</code>) et ne font l'objet d'aucune transmission distante.
              </li>
              <li>
                <strong>Absence de traceurs publicitaires :</strong> Aucun cookie publicitaire ni solution tierce de profilage n'est activé sur ce service.
              </li>
              <li>
                <strong>Hébergement Vercel et conformité RGPD :</strong> L'infrastructure est encadrée par le cadre transatlantique de protection des données (<em>Data Privacy Framework</em> UE-États-Unis).
              </li>
              <li>
                <strong>Exercice de vos droits :</strong> Pour toute question relative à vos données ou formulaires transmis, contactez l'éditeur à <a href="mailto:contact@appalacarte.fr" style={{ color: 'var(--color-primary)', fontWeight: '600' }}>contact@appalacarte.fr</a>.
              </li>
            </ul>
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
            © 2026 App à la Carte ·{' '}
            <a href="/mentions-legales" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Mentions légales</a>
            {' · '}
            <a href="/confidentialite" style={{ color: 'var(--color-primary)', textDecoration: 'underline', fontWeight: '700' }}>Confidentialité</a>
            {' · '}
            <a href="/cgu" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>CGU</a>
            {' · '}
            <a href="mailto:contact@appalacarte.fr" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Contact</a>
            {' · '}
            <span>v{APP_VERSION}</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
