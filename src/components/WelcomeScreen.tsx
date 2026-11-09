import React, { useState, useRef } from 'react';
import { ChefHat, ArrowDown, Sparkles, CheckCircle2, ShieldCheck, Zap, Layers } from 'lucide-react';
import { APP_VERSION } from '../version';
import { PricingSection } from './PricingSection';
import { PlanId, BillingInterval } from '../config/pricing';
import { subscriptionService } from '../services/subscriptionService';

/**
 * Page d'accueil / Landing Page MarmiCout
 * Présente le produit, l'accès direct par prénom à l'espace local,
 * et la section complète Grille tarifaire & argumentaire.
 */
export const WelcomeScreen: React.FC = () => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const startWithCode = (codeValue: string, planId?: PlanId, interval?: BillingInterval) => {
    const cleaned = codeValue.trim().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .toLowerCase();

    if (!cleaned || cleaned.length < 2) {
      setError('Veuillez entrer un prénom ou un nom d\'au moins 2 caractères.');
      if (nameInputRef.current) {
        nameInputRef.current.focus();
        nameInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (planId) {
      subscriptionService.changePlan(planId, interval || 'year');
    }

    const url = new URL(window.location.href);
    url.searchParams.set('code', cleaned);
    window.location.href = url.toString();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startWithCode(name);
  };

  const handleStartTrial = () => {
    if (name.trim().length >= 2) {
      startWithCode(name, 'trial');
    } else {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
        nameInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleSelectPlan = (planId: PlanId, interval: BillingInterval) => {
    if (name.trim().length >= 2) {
      startWithCode(name, planId, interval);
    } else {
      // Si pas encore de prénom, remonter au formulaire avec focus
      if (nameInputRef.current) {
        nameInputRef.current.focus();
        nameInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      color: '#0f172a',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* 1. Barre de navigation supérieure */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e2e8f0',
        padding: '14px 24px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99,102,241,0.25)'
            }}>
              <ChefHat size={22} color="white" />
            </div>
            <div>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#1e1b4b', letterSpacing: '-0.3px' }}>
                MarmiCout
              </span>
              <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: '700', marginLeft: '6px' }}>
                v{APP_VERSION}
              </span>
            </div>
          </div>

          {/* Liens d'action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <a
              href="#tarifs"
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#475569',
                textDecoration: 'none',
                padding: '8px 12px',
                borderRadius: '8px',
                transition: 'color 0.2s'
              }}
            >
              Tarifs
            </a>

            <button
              type="button"
              onClick={handleStartTrial}
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
                whiteSpace: 'nowrap'
              }}
            >
              Essai gratuit 14j →
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section avec Formulaire d'accès rapide */}
      <section style={{
        background: 'linear-gradient(180deg, #eef2ff 0%, #f8fafc 100%)',
        padding: '60px 20px 40px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ffffff',
            color: '#4338ca',
            border: '1px solid #c7d2fe',
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: '700',
            marginBottom: '20px',
            boxShadow: '0 2px 6px rgba(99,102,241,0.08)'
          }}>
            <Sparkles size={16} />
            Le calcul de coûts de revient pour traiteurs, pâtissiers & artisans de bouche
          </div>

          <h1 style={{
            fontSize: 'clamp(30px, 5vw, 48px)',
            fontWeight: '900',
            color: '#1e1b4b',
            lineHeight: '1.2',
            margin: '0 0 16px',
            letterSpacing: '-0.5px'
          }}>
            Maîtrisez vos coûts de revient.<br />
            Protégez vos marges. Cuisinez l'esprit tranquille.
          </h1>

          <p style={{
            fontSize: 'clamp(16px, 2.2vw, 19px)',
            color: '#475569',
            lineHeight: '1.6',
            maxWidth: '680px',
            margin: '0 auto 36px'
          }}>
            Enregistrez vos achats, automatisez le calcul du coût matière de chaque portion et déstockez vos ingrédients en un clic. Sans tableaux complexes, sans erreurs de calcul.
          </p>

          {/* Boîte de démarrage direct */}
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '36px 32px',
            maxWidth: '480px',
            margin: '0 auto 36px',
            boxShadow: '0 20px 50px rgba(99,102,241,0.12)',
            border: '1px solid #e0e7ff',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Zap size={20} color="#6366f1" />
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e1b4b', margin: 0 }}>
                Démarrez votre essai gratuit de 14 jours
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
              Sans carte bancaire. Entrez votre prénom pour ouvrir immédiatement votre atelier culinaire de démonstration.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>
                  Votre prénom ou pseudo d'atelier
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setError(''); }}
                  placeholder="Ex : Marie, Chef1, Jean..."
                  maxLength={20}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: `2px solid ${error ? '#f43f5e' : '#cbd5e1'}`,
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    color: '#1e1b4b',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => { if (!error) e.target.style.borderColor = '#6366f1'; }}
                  onBlur={e => { if (!error) e.target.style.borderColor = '#cbd5e1'; }}
                />
                {error && (
                  <p style={{ color: '#f43f5e', fontSize: '12px', marginTop: '6px', margin: '6px 0 0' }}>{error}</p>
                )}
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '15px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '700',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(99,102,241,0.3)',
                  transition: 'opacity 0.2s'
                }}
              >
                Accéder à mon espace atelier →
              </button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '14px',
                fontSize: '12px',
                color: '#64748b'
              }}>
                <ShieldCheck size={16} color="#10b981" />
                <span>Données enregistrées en local dans votre navigateur · 100% confidentiel</span>
              </div>
            </form>
          </div>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '24px',
            fontSize: '13px',
            color: '#475569',
            fontWeight: '600'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} color="#10b981" /> Fiches techniques au centime près
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} color="#10b981" /> Déstockage automatique par lot
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} color="#10b981" /> Scan de factures d'achat (OCR)
            </span>
          </div>
        </div>
      </section>

      {/* 3. Section Grille Tarifaire & Argumentaire Complète */}
      <div style={{ padding: '20px 0 60px' }}>
        <PricingSection
          onSelectPlan={handleSelectPlan}
          onStartTrial={handleStartTrial}
          showArguments={true}
          showFaq={true}
        />
      </div>

      {/* 4. Pied de page légal sobre et certifié (Obligation LCEN / SREN 2024) */}
      <footer style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '24px 20px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#64748b',
        lineHeight: '1.8'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div>
            © 2026 App à la Carte ·{' '}
            <a href="/mentions-legales" style={{ color: '#6366f1', textDecoration: 'underline' }}>Mentions légales</a>
            {' · '}
            <a href="/confidentialite" style={{ color: '#6366f1', textDecoration: 'underline' }}>Confidentialité</a>
            {' · '}
            <a href="/cgu" style={{ color: '#6366f1', textDecoration: 'underline' }}>CGU</a>
            {' · '}
            <a href="mailto:contact@appalacarte.fr" style={{ color: '#6366f1', textDecoration: 'underline' }}>Contact</a>
            {' · '}
            <span>v{APP_VERSION}</span>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#94a3b8' }}>
            MarmiCout — Application web de gestion de coûts de revient et fiches techniques pour artisans culinaires.
          </p>
        </div>
      </footer>
    </div>
  );
};
