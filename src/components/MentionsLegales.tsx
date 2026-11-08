import React, { useEffect } from 'react';
import { ShieldCheck, Building2, User, Mail, Phone, Server, Globe, FileText, Lock, ArrowLeft } from 'lucide-react';
import { APP_VERSION } from '../version';
import { LEGAL_CONFIG } from '../config/legalConfig';

interface MentionsLegalesProps {
  onBack?: () => void;
}

export const MentionsLegales: React.FC<MentionsLegalesProps> = ({ onBack }) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Mentions légales – App à la Carte';
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
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px' }}>
      {/* Bouton retour si affichage autonome */}
      {onBack && (
        <div style={{ marginBottom: '16px' }}>
          <button
            type="button"
            onClick={handleReturn}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
            Retour à l'application
          </button>
        </div>
      )}

      {/* En-tête */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
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
              Informations Officielles
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-dark-light)' }}>
              Version {APP_VERSION}
            </span>
          </div>
          <h1 className="page-title">Mentions Légales & Informations Éditeur</h1>
          <p className="page-subtitle" style={{ lineHeight: '1.5' }}>
            {LEGAL_CONFIG.legalBasis}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* 1. Éditeur de l'application */}
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
              <Building2 size={20} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
              1. Éditeur de l'Application
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              fontSize: '14px',
            }}
          >
            <div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '12px' }}>Nom commercial</div>
              <div style={{ fontWeight: '600' }}>{LEGAL_CONFIG.editor.commercialName}</div>
            </div>

            <div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '12px' }}>Éditeur</div>
              <div style={{ fontWeight: '600' }}>{LEGAL_CONFIG.editor.fullEditorDesignation}</div>
            </div>

            <div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '12px' }}>Adresse professionnelle</div>
              <div style={{ fontWeight: '600' }}>{LEGAL_CONFIG.editor.address}</div>
            </div>

            <div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '12px' }}>Numéro SIREN</div>
              <div style={{ fontWeight: '600' }}>{LEGAL_CONFIG.editor.siren}</div>
            </div>

            <div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '12px' }}>Numéro SIRET</div>
              <div style={{ fontWeight: '600' }}>{LEGAL_CONFIG.editor.siret}</div>
            </div>

            {LEGAL_CONFIG.editor.rcs ? (
              <div>
                <div style={{ color: 'var(--color-dark-light)', fontSize: '12px' }}>RCS</div>
                <div style={{ fontWeight: '600' }}>{LEGAL_CONFIG.editor.rcs}</div>
              </div>
            ) : null}

            <div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '12px' }}>Téléphone officiel</div>
              <div>
                <a
                  href={`tel:${LEGAL_CONFIG.editor.phoneRaw}`}
                  style={{
                    fontWeight: '600',
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Phone size={14} />
                  {LEGAL_CONFIG.editor.phone}
                </a>
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '12px' }}>Email de contact officiel</div>
              <div>
                <a
                  href={`mailto:${LEGAL_CONFIG.editor.email}`}
                  style={{
                    fontWeight: '600',
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Mail size={14} />
                  {LEGAL_CONFIG.editor.email}
                </a>
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '12px' }}>Directeur de la publication</div>
              <div style={{ fontWeight: '600' }}>{LEGAL_CONFIG.editor.publicationDirector}</div>
            </div>
          </div>
        </div>

        {/* 2. Mention TVA */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-secondary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-secondary)',
              }}
            >
              <FileText size={20} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
              2. TVA
            </h2>
          </div>

          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <p
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--color-light)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                fontWeight: '600',
                color: 'var(--color-dark)',
                margin: 0,
              }}
            >
              {LEGAL_CONFIG.tva.mention}
            </p>
          </div>
        </div>

        {/* 3. Hébergement & Infrastructure */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(52, 199, 89, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34c759',
              }}
            >
              <Server size={20} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
              3. Hébergement & Infrastructure
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              fontSize: '14px',
            }}
          >
            <div
              style={{
                padding: '14px',
                backgroundColor: 'var(--color-light)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ fontWeight: '700', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Server size={16} /> Hébergeur Web
              </div>
              <div style={{ fontWeight: '600' }}>{LEGAL_CONFIG.host.name}</div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '13px', marginTop: '2px' }}>
                {LEGAL_CONFIG.host.address}
              </div>
              <div style={{ fontSize: '13px', marginTop: '6px' }}>
                <span style={{ color: 'var(--color-dark-light)' }}>Téléphone : </span>
                <a
                  href={`tel:${LEGAL_CONFIG.host.phoneRaw}`}
                  style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none' }}
                >
                  {LEGAL_CONFIG.host.phone}
                </a>
              </div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>
                <a
                  href={LEGAL_CONFIG.host.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-primary)' }}
                >
                  vercel.com
                </a>
              </div>
            </div>

            <div
              style={{
                padding: '14px',
                backgroundColor: 'var(--color-light)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ fontWeight: '700', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={16} /> Registrar Domaines / DNS
              </div>
              <div style={{ fontWeight: '600' }}>{LEGAL_CONFIG.registrar.name}</div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '13px', marginTop: '2px' }}>
                {LEGAL_CONFIG.registrar.address}
              </div>
              <div style={{ fontSize: '13px', marginTop: '6px' }}>
                <span style={{ color: 'var(--color-dark-light)' }}>Téléphone : </span>
                <a
                  href={`tel:${LEGAL_CONFIG.registrar.phoneRaw}`}
                  style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none' }}
                >
                  {LEGAL_CONFIG.registrar.phone}
                </a>
              </div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>
                <a
                  href={LEGAL_CONFIG.registrar.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-primary)' }}
                >
                  ovhcloud.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Données Personnelles & Confidentialité (RGPD) */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-warning-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-warning)',
              }}
            >
              <Lock size={20} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
              4. Politique de Confidentialité & Protection des Données (RGPD)
            </h2>
          </div>

          <div style={{ fontSize: '14px', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p>
              <strong>Stockage local autonome :</strong> L'application <em>MarmiCout</em> est conçue selon un principe de confidentialité maximale. Les recettes, ingrédients, coûts de revient, coefficients de marge et registres de ventes sont conservés <strong>exclusivement sur votre équipement</strong> dans la mémoire locale de votre navigateur (<code>localStorage</code>). Aucune donnée métier n'est transmise ni stockée sur des serveurs distants sans action volontaire de synchronisation de votre part.
            </p>
            <p>
              <strong>Gestion des traceurs et cookies :</strong> Ce site n'utilise aucun cookie publicitaire, aucun traceur de profilage commercial et aucun outil intrusif de pistage tiers. Seuls des traceurs strictement techniques nécessaires au maintien de session et à l'exécution de l'application web peuvent être employés, conformément aux recommandations de la CNIL.
            </p>
            <p>
              <strong>Transferts de données hors UE et infrastructure Vercel :</strong> L'hébergement et la distribution du code statique de l'application sont assurés par la société <strong>Vercel Inc.</strong> (États-Unis). Les flux éventuels de données techniques de routage et d'accès sont strictement encadrés par le cadre transatlantique de protection des données (<strong>Data Privacy Framework - DPF UE-États-Unis</strong>) approuvé par la Commission Européenne, garantissant un niveau de sécurité et de conformité équivalent au RGPD.
            </p>
            <p>
              <strong>Droits des utilisateurs :</strong> Conformément au RGPD et à la loi Informatique et Libertés, pour toute demande d'information, d'accès ou d'effacement de données transmises lors de demandes de contact ou devis, vous pouvez contacter le responsable à l'adresse suivante :{' '}
              <a href={`mailto:${LEGAL_CONFIG.editor.email}`} style={{ color: 'var(--color-primary)', fontWeight: '600' }}>
                {LEGAL_CONFIG.editor.email}
              </a>.
            </p>
            <div style={{ marginTop: '8px' }}>
              <a
                href="/confidentialite"
                style={{
                  color: 'var(--color-primary)',
                  fontWeight: '600',
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Consulter la page Politique de Confidentialité dédiée →
              </a>
            </div>
          </div>
        </div>

        {/* 5. Conditions Générales (CGU / CGV) & Propriété Intellectuelle */}
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
              <User size={20} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
              5. Conditions Générales d'Utilisation (CGU / CGV) & Propriété Intellectuelle
            </h2>
          </div>

          <div style={{ fontSize: '14px', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p>
              <strong>Propriété intellectuelle :</strong> L'ensemble des éléments de l'application <em>MarmiCout</em> (architecture, code source, design d'interface, algorithmes de calcul de marges, graphismes et marques) sont la propriété exclusive de <strong>App à la Carte — Hervé CHAMPAGNE EI</strong>. Toute reproduction intégrale ou partielle sans autorisation expresse est prohibée.
            </p>
            <p style={{ color: 'var(--color-dark-light)' }}>
              <strong>Conditions contractuelles applicables :</strong> L'application est mise à disposition pour une utilisation professionnelle selon les modalités d'accès souscrites. Les Conditions Générales d'Utilisation (CGU) et Conditions Générales de Vente (CGV) régissant les abonnements personnalisés ou prestations sur-mesure sont communiquées lors de l'établissement des devis ou accessibles sur demande à <code>contact@appalacarte.fr</code>.
            </p>
            <div style={{ marginTop: '8px' }}>
              <a
                href="/cgu"
                style={{
                  color: 'var(--color-primary)',
                  fontWeight: '600',
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Consulter la page CGU / CGV dédiée →
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
            <a href="/mentions-legales" style={{ color: 'var(--color-primary)', textDecoration: 'underline', fontWeight: '700' }}>Mentions légales</a>
            {' '}|{' '}
            <a href="/confidentialite" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Confidentialité</a>
            {' '}|{' '}
            <a href="/cgu" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>CGU</a>
          </div>
        </footer>

      </div>
    </div>
  );
};
