import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Clock, 
  ScanLine, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { PRICING_CONFIG, PlanId, BillingInterval } from '../config/pricing';
import { subscriptionService, SubscriptionState } from '../services/subscriptionService';
import { PricingSection } from './PricingSection';

export const SubscriptionSettings: React.FC = () => {
  const [subscription, setSubscription] = useState<SubscriptionState>(() => 
    subscriptionService.getSubscription()
  );
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Synchronisation avec l'événement de changement d'abonnement
  useEffect(() => {
    const handleUpdate = () => {
      setSubscription(subscriptionService.getSubscription());
    };
    window.addEventListener('marmicout_subscription_changed', handleUpdate);
    return () => window.removeEventListener('marmicout_subscription_changed', handleUpdate);
  }, []);

  const remainingTrialDays = subscriptionService.getRemainingTrialDays();
  const currentPlan = PRICING_CONFIG.plans.find(p => p.id === subscription.planId) || {
    id: subscription.planId,
    name: subscription.planId === 'fondateur' ? 'Offre Fondateur' : 'Formule personnalisée',
    storage: 'Sauvegarde en ligne',
    scanQuota: 150
  };

  const scanQuota = subscriptionService.getCurrentScanQuota();
  const scansUsed = subscription.scansUsedThisMonth;
  const usagePercentage = Math.min(100, Math.round((scansUsed / scanQuota) * 100));

  const handleChangePlan = (newPlanId: PlanId, interval: BillingInterval) => {
    if (newPlanId === subscription.planId) {
      return;
    }

    const updated = subscriptionService.changePlan(newPlanId, interval);
    setSubscription(updated);
    setNotification({
      type: 'success',
      message: `Votre abonnement a été mis à jour vers la formule « ${newPlanId.toUpperCase()} ». Vos nouveaux quotas sont immédiatement actifs.`
    });

    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleCancel = () => {
    const confirmCancel = window.confirm(
      "Êtes-vous sûr de vouloir résilier votre abonnement ?\n\n" +
      "Vos recettes et vos données resteront intactes et enregistrées dans votre navigateur. Vous pourrez réactiver une formule à tout moment."
    );

    if (confirmCancel) {
      const updated = subscriptionService.cancelSubscription();
      setSubscription(updated);
      setNotification({
        type: 'info',
        message: 'Votre abonnement a été résilié sans aucun frais. Vos données locales restent disponibles.'
      });
      setTimeout(() => {
        setNotification(null);
      }, 4000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Notification temporaire */}
      {notification && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          backgroundColor: notification.type === 'success' ? '#dcfce7' : '#e0e7ff',
          color: notification.type === 'success' ? '#15803d' : '#3730a3',
          border: '1px solid currentColor',
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Résumé de l'abonnement actif */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: subscription.planId === 'trial' ? '#fef3c7' : '#dcfce7',
              color: subscription.planId === 'trial' ? '#92400e' : '#166534',
              fontSize: '12px',
              fontWeight: '700',
              marginBottom: '8px'
            }}>
              <Sparkles size={14} />
              {subscription.planId === 'trial' ? 'Période d\'essai gratuit active' : 'Abonnement actif'}
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e1b4b', margin: 0 }}>
              Formule active : {currentPlan.name}
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
              Stockage : {currentPlan.storage} · Facturation {subscription.billingInterval === 'year' ? 'Annuelle' : 'Mensuelle'}
            </p>
          </div>

          {subscription.planId === 'trial' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '12px',
              padding: '12px 18px'
            }}>
              <Clock size={24} color="#d97706" />
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#b45309' }}>
                  {remainingTrialDays} jour{remainingTrialDays > 1 ? 's' : ''} restant{remainingTrialDays > 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: '11px', color: '#92400e' }}>
                  Essai 14 jours sans engagement
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Barre de quota de scans OCR */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ScanLine size={16} color="#6366f1" />
              Scans de factures d'achat (OCR) ce mois-ci
            </span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: usagePercentage >= 100 ? '#dc2626' : '#4338ca' }}>
              {scansUsed} / {scanQuota} scans utilisés ({usagePercentage}%)
            </span>
          </div>

          <div style={{
            width: '100%',
            height: '10px',
            backgroundColor: '#f1f5f9',
            borderRadius: '9999px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${usagePercentage}%`,
              backgroundColor: usagePercentage >= 100 ? '#ef4444' : usagePercentage > 80 ? '#f59e0b' : '#6366f1',
              borderRadius: '9999px',
              transition: 'width 0.3s ease'
            }} />
          </div>

          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', lineHeight: '1.4' }}>
            💡 <strong>Règle de quota :</strong> Le quota de scans se réinitialise automatiquement le 1er de chaque mois. Si le quota est atteint, vous pouvez continuer à consulter et utiliser toutes vos recettes et produits sans aucune restriction.
          </p>
        </div>
      </div>

      {/* Grille de sélection & changement de formule */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1e1b4b', margin: '0 0 8px' }}>
          Changer de formule ou faire évoluer vos quotas
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>
          Le passage à une formule supérieure est immédiat et sans coupure de service.
        </p>

        <PricingSection
          currentPlanId={subscription.planId}
          onSelectPlan={handleChangePlan}
          isInsideSettings={true}
          showArguments={false}
          showFaq={true}
        />
      </div>

      {/* Bloc Résiliation & Mentions contractuelles */}
      <div className="card" style={{
        padding: '20px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '16px'
      }}>
        <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#1e1b4b', margin: '0 0 6px' }}>
          Conditions & Résiliation
        </h4>
        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: '0 0 14px' }}>
          Sans engagement. Vous pouvez modifier ou résilier votre formule à tout moment en un clic ci-dessous, ou en adressant un email à{' '}
          <a href="mailto:contact@appalacarte.fr" style={{ color: '#6366f1', textDecoration: 'underline' }}>
            contact@appalacarte.fr
          </a>. Aucun frais de résiliation. Vos données restent conservées sur votre appareil.
        </p>

        {subscription.planId !== 'trial' && (
          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#dc2626',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <XCircle size={16} />
            Résilier mon abonnement
          </button>
        )}
      </div>
    </div>
  );
};
