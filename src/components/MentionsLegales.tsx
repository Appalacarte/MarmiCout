import React from 'react';
import { ShieldCheck, Building2, User, Mail, Server, Globe, FileText, Lock } from 'lucide-react';
import { APP_VERSION } from '../version';

export const MentionsLegales: React.FC = () => {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* En-tête */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} />
              Informations Officielles
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-dark-light)' }}>
              Version {APP_VERSION}
            </span>
          </div>
          <h1 className="page-title">Mentions Légales & Informations Éditeur</h1>
          <p className="page-subtitle">
            Conformément aux dispositions des articles 6-III et 19 de la loi n° 2004-575 du 21 juin 2004 pour la Confiance dans l'Économie Numérique (L.C.E.N.).
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* 1. Éditeur de l'application */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              backgroundColor: 'var(--color-primary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-primary)'
            }}>
              <Building2 size={20} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
              1. Éditeur de l'Application
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', fontSize: '14px' }}>
            <div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '12px' }}>Nom commercial</div>
              <div style={{ fontWeight: '600' }}>App à la Carte</div>
            </div>

            <div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '12px' }}>Entrepreneur</div>
              <div style={{ fontWeight: '600' }}>Hervé CHAMPAGNE</div>
            </div>

            <div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '12px' }}>Forme juridique</div>
              <div style={{ fontWeight: '600' }}>Entrepreneur individuel (EI)</div>
            </div>

            <div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '12px' }}>Adresse professionnelle</div>
              <div style={{ fontWeight: '600' }}>173 rue de Courcelles, 75017 Paris, France</div>
            </div>

            <div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '12px' }}>Société de domiciliation</div>
              <div style={{ fontWeight: '600' }}>HelloDom (SIREN : 878 831 312)</div>
            </div>

            <div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '12px' }}>Numéro SIREN</div>
              <div style={{ fontWeight: '600' }}>132 021 098</div>
            </div>

            <div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '12px' }}>Numéro SIRET</div>
              <div style={{ fontWeight: '600' }}>132 021 098 00018</div>
            </div>

            <div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '12px' }}>Activité principale (Code APE)</div>
              <div style={{ fontWeight: '600' }}>6201Z - Programmation informatique</div>
            </div>

            <div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '12px' }}>Immatriculation RNE</div>
              <div style={{ fontWeight: '600' }}>26 octobre 2026 (Début d'activité : 21/10/2026)</div>
            </div>

            <div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '12px' }}>Directeur de la publication</div>
              <div style={{ fontWeight: '600' }}>Hervé CHAMPAGNE (EI)</div>
            </div>

            <div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '12px' }}>Contact électronique officiel</div>
              <div>
                <a href="mailto:contact@appalacarte.fr" style={{ fontWeight: '600', color: 'var(--color-primary)', textDecoration: 'none' }}>
                  contact@appalacarte.fr
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Régime Fiscal & TVA */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              backgroundColor: 'var(--color-secondary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-secondary)'
            }}>
              <FileText size={20} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
              2. Régime Fiscal & Mention TVA
            </h2>
          </div>

          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <p style={{ marginBottom: '8px' }}>
              <strong>Régime fiscal :</strong> Micro-BIC (sans option versement libératoire).
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong>Régime social :</strong> Micro-social simplifié (versement trimestriel).
            </p>
            <p style={{ padding: '12px 16px', backgroundColor: 'var(--color-light)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontWeight: '600', color: 'var(--color-dark)' }}>
              Mention légale TVA : « TVA non applicable, article 293 B du CGI » (Franchise en base de TVA).
            </p>
          </div>
        </div>

        {/* 3. Hébergement & Nom de Domaine */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              backgroundColor: 'rgba(52, 199, 89, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#34c759'
            }}>
              <Server size={20} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
              3. Hébergement & Infrastructure
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', fontSize: '14px' }}>
            <div style={{ padding: '12px', backgroundColor: 'var(--color-light)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Server size={16} /> Hébergeur Web
              </div>
              <div><strong>Vercel Inc.</strong></div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '13px' }}>440 N Barranca Ave #4133</div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '13px' }}>Covina, CA 91723, USA</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>
                  vercel.com
                </a>
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--color-light)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={16} /> Registrar Domaines / DNS
              </div>
              <div><strong>OVHcloud (OVH SAS)</strong></div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '13px' }}>2 rue Kellermann</div>
              <div style={{ color: 'var(--color-dark-light)', fontSize: '13px' }}>59100 Roubaix, France</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                <a href="https://www.ovhcloud.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>
                  ovhcloud.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Données Personnelles & Confidentialité Locale */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              backgroundColor: 'var(--color-warning-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-warning)'
            }}>
              <Lock size={20} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
              4. Respect de la Vie Privée & Stockage Local (RGPD)
            </h2>
          </div>

          <div style={{ fontSize: '14px', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p>
              <strong>Architecture locale & Zéro fuite de données :</strong> L'application <em>MarmiCout</em> fonctionne selon une logique de stockage local autonome (dans la mémoire de votre navigateur via <code>localStorage</code>). Vos recettes secrètes, listes d'ingrédients, prix de revient, coefficients de marge et registres de ventes restent enregistrés <strong>exclusivement sur votre appareil</strong> (ordinateur, tablette ou smartphone).
            </p>
            <p>
              Aucun cookie publicitaire, aucun traceur de profilage commercial et aucune base de données centrale ne collecte vos données culinaires sans votre accord formel.
            </p>
            <p>
              <strong>Formulaires de contact et devis :</strong> Lorsque vous transmettez un message ou une suggestion via le formulaire de contact, les informations communiquées (nom, email, message) sont destinées exclusivement au traitement de votre demande par Hervé CHAMPAGNE (EI) et ne sont en aucun cas cédées ni vendues à des tiers. Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et d'effacement de vos coordonnées en écrivant à :{' '}
              <a href="mailto:contact@appalacarte.fr" style={{ color: 'var(--color-primary)', fontWeight: '600' }}>
                contact@appalacarte.fr
              </a>.
            </p>
          </div>
        </div>

        {/* 5. Propriété Intellectuelle */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              backgroundColor: 'var(--color-primary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-primary)'
            }}>
              <User size={20} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
              5. Propriété Intellectuelle
            </h2>
          </div>

          <p style={{ fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
            L'ensemble des composants de l'application <em>MarmiCout</em> (architecture logicielle, code source, interfaces graphiques, ergonomie, logos, marques et fiches techniques) sont protégés par les lois françaises et internationales relatives à la propriété intellectuelle. Toute reproduction, représentation, adaptation ou exploitation non autorisée, intégrale ou partielle, est strictement interdite sans accord écrit préalable de l'éditeur <strong>App à la Carte — Hervé CHAMPAGNE EI</strong>.
          </p>
        </div>

      </div>
    </div>
  );
};
