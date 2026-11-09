import React, { useState } from 'react';
import { 
  Check, 
  Minus, 
  Sparkles, 
  ShieldCheck, 
  Cloud, 
  ChevronDown, 
  ChevronUp, 
  Mail, 
  HelpCircle, 
  Zap,
  Star,
  Info,
  Laptop
} from 'lucide-react';
import { 
  PRICING_CONFIG, 
  BillingInterval, 
  PlanId, 
  PricingPlan 
} from '../config/pricing';
import { subscriptionService } from '../services/subscriptionService';

interface PricingSectionProps {
  currentPlanId?: PlanId;
  onSelectPlan?: (planId: PlanId, interval: BillingInterval) => void;
  onStartTrial?: () => void;
  showArguments?: boolean;
  showFaq?: boolean;
  isInsideSettings?: boolean;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  currentPlanId,
  onSelectPlan,
  onStartTrial,
  showArguments = true,
  showFaq = true,
  isInsideSettings = false
}) => {
  const [interval, setInterval] = useState<BillingInterval>(() => 
    subscriptionService.getBillingIntervalPreference()
  );
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Modale pour être prévenu du Pro Cloud
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState<{ message: string; success?: boolean } | null>(null);

  const handleIntervalToggle = (newInterval: BillingInterval) => {
    setInterval(newInterval);
    subscriptionService.setBillingIntervalPreference(newInterval);
  };

  const handlePlanCta = (plan: PricingPlan) => {
    if (plan.id === 'trial') {
      if (onStartTrial) {
        onStartTrial();
      } else if (onSelectPlan) {
        onSelectPlan('trial', interval);
      }
      return;
    }

    if (plan.id === 'pro_cloud' && !PRICING_CONFIG.flags.cloudSyncEnabled) {
      setIsWaitlistOpen(true);
      return;
    }

    if (onSelectPlan) {
      onSelectPlan(plan.id, interval);
    }
  };

  const handleFounderCta = () => {
    if (!PRICING_CONFIG.flags.cloudSyncEnabled) {
      setIsWaitlistOpen(true);
      return;
    }
    if (onSelectPlan) {
      onSelectPlan('fondateur', 'year');
    }
  };

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = subscriptionService.registerWaitlistEmail(waitlistEmail, 'Pro Cloud');
    setWaitlistStatus({ message: result.message, success: result.success });
    if (result.success) {
      setTimeout(() => {
        setIsWaitlistOpen(false);
        setWaitlistEmail('');
        setWaitlistStatus(null);
      }, 2800);
    }
  };

  return (
    <section 
      id="tarifs" 
      aria-label="Grille tarifaire et formules MarmiCout"
      style={{
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: isInsideSettings ? '20px 0' : '40px 20px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {/* 1. En-tête de section avec argumentaire principal */}
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '9999px',
          backgroundColor: '#eef2ff',
          color: '#4338ca',
          fontSize: '13px',
          fontWeight: '700',
          marginBottom: '14px'
        }}>
          <Sparkles size={16} />
          Tarification claire et sans mauvaise surprise
        </div>

        <h2 style={{
          fontSize: 'clamp(26px, 4vw, 36px)',
          fontWeight: '800',
          color: '#1e1b4b',
          lineHeight: '1.25',
          margin: '0 0 14px'
        }}>
          {PRICING_CONFIG.copy.title}
        </h2>

        <p style={{
          fontSize: 'clamp(15px, 2vw, 18px)',
          color: '#64748b',
          maxWidth: '680px',
          margin: '0 auto',
          lineHeight: '1.6'
        }}>
          {PRICING_CONFIG.copy.subtitle}
        </p>

        {/* 2. Toggle Mensuel / Annuel accessible au clavier */}
        <div style={{
          marginTop: '28px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: '#f1f5f9',
          padding: '4px',
          borderRadius: '9999px',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)'
        }}>
          <button
            type="button"
            role="switch"
            aria-checked={interval === 'month'}
            onClick={() => handleIntervalToggle('month')}
            style={{
              padding: '10px 22px',
              borderRadius: '9999px',
              border: 'none',
              fontSize: '14px',
              fontWeight: interval === 'month' ? '700' : '600',
              color: interval === 'month' ? '#1e1b4b' : '#64748b',
              backgroundColor: interval === 'month' ? '#ffffff' : 'transparent',
              boxShadow: interval === 'month' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
          >
            Paiement mensuel
          </button>

          <button
            type="button"
            role="switch"
            aria-checked={interval === 'year'}
            onClick={() => handleIntervalToggle('year')}
            style={{
              padding: '10px 22px',
              borderRadius: '9999px',
              border: 'none',
              fontSize: '14px',
              fontWeight: interval === 'year' ? '700' : '600',
              color: interval === 'year' ? '#4338ca' : '#64748b',
              backgroundColor: interval === 'year' ? '#ffffff' : 'transparent',
              boxShadow: interval === 'year' ? '0 2px 8px rgba(99,102,241,0.15)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              outline: 'none'
            }}
          >
            <span>Paiement annuel</span>
            <span style={{
              backgroundColor: '#dcfce7',
              color: '#15803d',
              fontSize: '11px',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '9999px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              2 mois offerts
            </span>
          </button>
        </div>
      </div>

      {/* 3. Grille des 4 formules */}
      <style>{`
        .marmicout-pricing-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          align-items: stretch;
          margin-bottom: 24px;
        }
        @media (max-width: 1024px) {
          .marmicout-pricing-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .marmicout-pricing-grid {
            display: flex;
            flex-direction: column;
          }
          .marmicout-card-pro-cloud {
            order: -1 !important; /* Pro Cloud en premier sur mobile */
          }
        }
      `}</style>

      <div className="marmicout-pricing-grid">
        {PRICING_CONFIG.plans.map(plan => {
          const isProCloud = plan.id === 'pro_cloud';
          const isTrial = plan.id === 'trial';
          const isCurrent = currentPlanId === plan.id;
          const isComingSoon = plan.id === 'pro_cloud' && !PRICING_CONFIG.flags.cloudSyncEnabled;

          // Déterminer le prix affiché selon l'intervalle sélectionné
          let displayPrice = '0\u00A0€';
          let displayPeriod = '';
          let subText = '';

          if (isTrial) {
            displayPrice = '0\u00A0€';
            displayPeriod = 'pendant 14 jours';
            subText = 'Sans carte bancaire requise';
          } else if (interval === 'month') {
            displayPrice = plan.monthlyPrice?.formatted || '';
            displayPeriod = '/ mois';
            subText = 'Sans engagement, résiliable à tout moment';
          } else {
            displayPrice = plan.yearlyPrice?.formatted || '';
            displayPeriod = '/ an';
            subText = plan.yearlyPrice?.equivalentMonthlyFormatted 
              ? `Soit ${plan.yearlyPrice.equivalentMonthlyFormatted} / mois (2 mois offerts)`
              : '';
          }

          // Déterminer le libellé du bouton CTA
          let ctaLabel = plan.ctaText.available;
          if (isComingSoon && plan.ctaText.comingSoon) {
            ctaLabel = plan.ctaText.comingSoon;
          } else if (isCurrent) {
            ctaLabel = 'Formule actuelle';
          }

          return (
            <div
              key={plan.id}
              className={isProCloud ? 'marmicout-card-pro-cloud' : ''}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '20px',
                padding: '28px 24px',
                backgroundColor: isProCloud ? '#ffffff' : '#ffffff',
                border: isProCloud 
                  ? '2px solid #6366f1' 
                  : isCurrent 
                    ? '2px solid #10b981' 
                    : '1px solid #e2e8f0',
                boxShadow: isProCloud 
                  ? '0 12px 36px rgba(99,102,241,0.18)' 
                  : '0 4px 16px rgba(0,0,0,0.04)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
            >
              {/* Badge supérieur */}
              {isProCloud && (
                <div style={{
                  position: 'absolute',
                  top: '-13px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#6366f1',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '800',
                  padding: '4px 14px',
                  borderRadius: '9999px',
                  boxShadow: '0 4px 10px rgba(99,102,241,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  letterSpacing: '0.3px',
                  whiteSpace: 'nowrap'
                }}>
                  <Star size={13} fill="#facc15" color="#facc15" />
                  {isComingSoon ? 'Bientôt disponible' : 'Recommandé'}
                </div>
              )}

              {plan.badge && !isProCloud && (
                <div style={{
                  position: 'absolute',
                  top: '-11px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#e0e7ff',
                  color: '#3730a3',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '3px 12px',
                  borderRadius: '9999px',
                  letterSpacing: '0.3px',
                  whiteSpace: 'nowrap'
                }}>
                  {plan.badge}
                </div>
              )}

              {/* Titre & Description */}
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{
                  fontSize: '22px',
                  fontWeight: '800',
                  color: '#1e1b4b',
                  margin: '0 0 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {plan.name}
                  {isProCloud && <span style={{ fontSize: '18px' }}>⭐</span>}
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: '#64748b',
                  lineHeight: '1.4',
                  minHeight: '38px',
                  margin: 0
                }}>
                  {plan.tagline}
                </p>
              </div>

              {/* Prix */}
              <div style={{
                padding: '16px 0',
                borderTop: '1px solid #f1f5f9',
                borderBottom: '1px solid #f1f5f9',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{
                    fontSize: '32px',
                    fontWeight: '900',
                    color: isProCloud ? '#4338ca' : '#0f172a',
                    letterSpacing: '-0.5px'
                  }}>
                    {displayPrice}
                  </span>
                  <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
                    {displayPeriod}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600', marginTop: '4px', minHeight: '18px' }}>
                  {subText}
                </div>
              </div>

              {/* Stockage des données (exigence d'honnêteté) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: '8px',
                backgroundColor: isProCloud ? '#f5f3ff' : '#f8fafc',
                fontSize: '12px',
                color: isProCloud ? '#6b21a8' : '#475569',
                fontWeight: '600',
                marginBottom: '16px'
              }}>
                {isProCloud ? <Cloud size={16} /> : <Laptop size={16} />}
                <span>Stockage : {plan.storage}</span>
              </div>

              {/* Liste des fonctionnalités */}
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 24px',
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                {plan.features.map((feat, idx) => (
                  <li key={idx} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    fontSize: '13px',
                    color: '#334155',
                    lineHeight: '1.4'
                  }}>
                    <div style={{
                      flexShrink: 0,
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: isProCloud ? '#e0e7ff' : '#f1f5f9',
                      color: isProCloud ? '#4338ca' : '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '1px'
                    }}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {/* Bouton d'action CTA */}
              <button
                type="button"
                onClick={() => handlePlanCta(plan)}
                disabled={isCurrent}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: isComingSoon 
                    ? '2px dashed #818cf8' 
                    : isProCloud 
                      ? 'none' 
                      : '1px solid #cbd5e1',
                  backgroundColor: isCurrent
                    ? '#e2e8f0'
                    : isComingSoon
                      ? '#eef2ff'
                      : isProCloud
                        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                        : isTrial
                          ? '#1e1b4b'
                          : '#ffffff',
                  color: isCurrent
                    ? '#64748b'
                    : isComingSoon
                      ? '#4338ca'
                      : (isProCloud || isTrial)
                        ? '#ffffff'
                        : '#1e1b4b',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: isCurrent ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: isProCloud && !isComingSoon ? '0 6px 20px rgba(99,102,241,0.35)' : 'none',
                  transition: 'opacity 0.2s, transform 0.1s',
                  outline: 'none'
                }}
              >
                {isComingSoon && <Mail size={16} />}
                {isTrial && <Zap size={16} />}
                {ctaLabel}
              </button>
            </div>
          );
        })}
      </div>

      {/* 4. Bandeau séparé pour l'Offre Fondateur */}
      {PRICING_CONFIG.flags.founderOfferEnabled && (
        <div style={{
          position: 'relative',
          borderRadius: '20px',
          padding: '24px 28px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          color: '#ffffff',
          marginBottom: '24px',
          boxShadow: '0 12px 30px rgba(30,27,75,0.25)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          <div style={{ maxWidth: '640px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#f59e0b',
              color: '#78350f',
              padding: '3px 12px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '10px'
            }}>
              <Star size={13} fill="#78350f" color="#78350f" />
              {PRICING_CONFIG.founderOffer.badge}
              {PRICING_CONFIG.flags.founderSeatsLeft !== null && (
                <span>— Plus que {PRICING_CONFIG.flags.founderSeatsLeft} places</span>
              )}
            </div>

            <h3 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px', color: '#ffffff' }}>
              {PRICING_CONFIG.founderOffer.name} — {PRICING_CONFIG.founderOffer.priceFormatted} la 1ʳᵉ année
            </h3>

            <p style={{ fontSize: '13px', color: '#cbd5e1', margin: '0 0 12px', lineHeight: '1.5' }}>
              Profitez immédiatement de la formule Pro Cloud complète et verrouillez votre tarif de lancement garanti à vie au renouvellement.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '12px', color: '#e0e7ff' }}>
              <span>✓ Sauvegarde en ligne + synchronisation</span>
              <span>✓ 150 scans factures/mois</span>
              <span>✓ Tarif Pro Cloud garanti à vie</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={handleFounderCta}
              style={{
                padding: '14px 26px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(245,158,11,0.4)',
                whiteSpace: 'nowrap',
                transition: 'opacity 0.2s',
                outline: 'none'
              }}
            >
              {PRICING_CONFIG.founderOffer.ctaText} →
            </button>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Sauvegarde en ligne — Accès prioritaire
            </span>
          </div>
        </div>
      )}

      {/* 5. Bandeau de réassurance et Mention légale fiscale */}
      <div style={{
        textAlign: 'center',
        padding: '16px 20px',
        backgroundColor: '#f8fafc',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        marginBottom: '40px'
      }}>
        <p style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#334155',
          margin: '0 0 6px',
          lineHeight: '1.5'
        }}>
          {PRICING_CONFIG.copy.reassuranceBanner}
        </p>
        <p style={{
          fontSize: '12px',
          color: '#64748b',
          margin: 0
        }}>
          {PRICING_CONFIG.copy.taxNotice}
        </p>
      </div>

      {/* 6. Blocs d'argumentaire : Le calcul qui convainc, Pourquoi le cloud, Positionnement */}
      {showArguments && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          {/* Bloc 1 : Le calcul qui convainc */}
          <div style={{
            padding: '24px',
            borderRadius: '16px',
            backgroundColor: '#ffffff',
            border: '1px solid #e0e7ff',
            boxShadow: '0 4px 12px rgba(99,102,241,0.06)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#eef2ff',
              color: '#4338ca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px'
            }}>
              <Zap size={22} />
            </div>
            <h4 style={{ fontSize: '17px', fontWeight: '800', color: '#1e1b4b', margin: '0 0 10px' }}>
              {PRICING_CONFIG.copy.convincingCalculation.title}
            </h4>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: 0 }}>
              {PRICING_CONFIG.copy.convincingCalculation.text}
            </p>
          </div>

          {/* Bloc 2 : Pourquoi choisir le Cloud ? */}
          <div style={{
            padding: '24px',
            borderRadius: '16px',
            backgroundColor: '#ffffff',
            border: '1px solid #e0e7ff',
            boxShadow: '0 4px 12px rgba(99,102,241,0.06)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#f5f3ff',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px'
            }}>
              <Cloud size={22} />
            </div>
            <h4 style={{ fontSize: '17px', fontWeight: '800', color: '#1e1b4b', margin: '0 0 10px' }}>
              {PRICING_CONFIG.copy.whyCloud.title}
            </h4>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: 0 }}>
              {PRICING_CONFIG.copy.whyCloud.text}
            </p>
          </div>

          {/* Bloc 3 : Positionnement indépendant */}
          <div style={{
            padding: '24px',
            borderRadius: '16px',
            backgroundColor: '#ffffff',
            border: '1px solid #e0e7ff',
            boxShadow: '0 4px 12px rgba(99,102,241,0.06)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px'
            }}>
              <ShieldCheck size={22} />
            </div>
            <h4 style={{ fontSize: '17px', fontWeight: '800', color: '#1e1b4b', margin: '0 0 10px' }}>
              {PRICING_CONFIG.copy.positioning.title}
            </h4>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: 0 }}>
              {PRICING_CONFIG.copy.positioning.text}
            </p>
          </div>
        </div>
      )}

      {/* 7. Tableau comparatif repliable (« Comparer toutes les fonctionnalités ») */}
      <div style={{
        marginBottom: '40px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        <button
          type="button"
          onClick={() => setIsComparisonOpen(!isComparisonOpen)}
          style={{
            width: '100%',
            padding: '18px 24px',
            backgroundColor: '#f8fafc',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '700',
            color: '#1e1b4b',
            outline: 'none'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Info size={18} color="#6366f1" />
            Comparer toutes les fonctionnalités en détail
          </span>
          {isComparisonOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {isComparisonOpen && (
          <div style={{ overflowX: 'auto', padding: '16px 20px' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              textAlign: 'left'
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 14px', color: '#1e1b4b', fontWeight: '800', width: '36%' }}>Fonctionnalités</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', color: '#64748b' }}>Essai (14j)</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', color: '#64748b' }}>Essentiel</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', color: '#64748b' }}>Pro</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', color: '#4338ca', fontWeight: '800', backgroundColor: '#eef2ff' }}>Pro Cloud</th>
                </tr>
              </thead>
              <tbody>
                {PRICING_CONFIG.comparison.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', color: '#334155', fontWeight: '500' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>
                        {row.category}
                      </span>
                      {row.name}
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                      {typeof row.trial === 'boolean' ? (
                        row.trial ? <Check size={16} color="#10b981" style={{ margin: '0 auto' }} /> : <Minus size={16} color="#cbd5e1" style={{ margin: '0 auto' }} />
                      ) : (
                        <span style={{ fontSize: '12px', color: '#475569' }}>{row.trial}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                      {typeof row.essentiel === 'boolean' ? (
                        row.essentiel ? <Check size={16} color="#10b981" style={{ margin: '0 auto' }} /> : <Minus size={16} color="#cbd5e1" style={{ margin: '0 auto' }} />
                      ) : (
                        <span style={{ fontSize: '12px', color: '#475569' }}>{row.essentiel}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                      {typeof row.pro === 'boolean' ? (
                        row.pro ? <Check size={16} color="#10b981" style={{ margin: '0 auto' }} /> : <Minus size={16} color="#cbd5e1" style={{ margin: '0 auto' }} />
                      ) : (
                        <span style={{ fontSize: '12px', color: '#475569' }}>{row.pro}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'center', backgroundColor: '#f8faff' }}>
                      {typeof row.proCloud === 'boolean' ? (
                        row.proCloud ? <Check size={16} color="#6366f1" style={{ margin: '0 auto' }} /> : <Minus size={16} color="#cbd5e1" style={{ margin: '0 auto' }} />
                      ) : (
                        <span style={{ fontSize: '12px', color: '#4338ca', fontWeight: '600' }}>{row.proCloud}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 8. FAQ Tarifs (accordéon) */}
      {showFaq && (
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '800',
              color: '#1e1b4b',
              margin: '0 0 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <HelpCircle size={22} color="#6366f1" />
              Questions fréquentes sur les tarifs
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              Tout ce que vous devez savoir avant de choisir votre formule.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {PRICING_CONFIG.faq.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  style={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      fontSize: '15px',
                      fontWeight: '700',
                      color: isOpen ? '#4338ca' : '#1e1b4b',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <span>{item.question}</span>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>

                  {isOpen && (
                    <div style={{
                      padding: '0 20px 16px',
                      fontSize: '14px',
                      color: '#475569',
                      lineHeight: '1.6'
                    }}>
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modale Collecte Email « Être prévenu » pour Pro Cloud */}
      {isWaitlistOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '32px 28px',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            position: 'relative'
          }}>
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
              <Cloud size={28} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1e1b4b', textAlign: 'center', margin: '0 0 8px' }}>
              Sauvegarde en ligne Pro Cloud
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', lineHeight: '1.5', margin: '0 0 20px' }}>
              La sauvegarde automatique et l'accès multi-appareils sont actuellement en cours de finalisation. Laissez votre adresse pour être prévenu en priorité dès l'ouverture officielle.
            </p>

            {waitlistStatus ? (
              <div style={{
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: waitlistStatus.success ? '#dcfce7' : '#fee2e2',
                color: waitlistStatus.success ? '#15803d' : '#b91c1c',
                fontSize: '13px',
                textAlign: 'center',
                lineHeight: '1.4'
              }}>
                {waitlistStatus.message}
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Votre adresse email professionnelle
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="chef@atelier-gourmand.fr"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                      color: '#1e1b4b'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => { setIsWaitlistOpen(false); setWaitlistStatus(null); }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    style={{
                      flex: 2,
                      padding: '12px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: '#6366f1',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Être prévenu
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
