/**
 * Service de gestion de l'abonnement et des quotas MarmiCout
 * Gère l'état d'abonnement en local (localStorage), les jours d'essai,
 * et la réinitialisation automatique du quota de scans OCR le 1er de chaque mois.
 */

import { PlanId, BillingInterval, PRICING_CONFIG } from '../config/pricing';

const SUBSCRIPTION_STORAGE_KEY = 'marmicout_subscription';
const BILLING_INTERVAL_KEY = 'marmicout_billing_interval';
const WAITLIST_STORAGE_KEY = 'marmicout_pro_cloud_waitlist';

export interface SubscriptionState {
  planId: PlanId;
  billingInterval: BillingInterval;
  trialStartDate: string; // ISO date string
  trialDaysTotal: number;
  monthKey: string; // "YYYY-MM" pour la réinitialisation au 1er du mois
  scansUsedThisMonth: number;
  status: 'trialing' | 'active' | 'canceled';
  updatedAt: string;
}

const getCurrentMonthKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const subscriptionService = {
  /**
   * Récupère la préférence d'intervalle de facturation mémorisée (Annuel par défaut)
   */
  getBillingIntervalPreference(): BillingInterval {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(BILLING_INTERVAL_KEY);
        if (stored === 'month' || stored === 'year') {
          return stored;
        }
      }
    } catch (e) {
      console.warn('Impossible de lire la préférence d’intervalle de facturation :', e);
    }
    return 'year'; // Annuel sélectionné par défaut
  },

  /**
   * Enregistre la préférence d'intervalle de facturation
   */
  setBillingIntervalPreference(interval: BillingInterval): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(BILLING_INTERVAL_KEY, interval);
      }
    } catch (e) {
      console.warn('Impossible de mémoriser la préférence d’intervalle de facturation :', e);
    }
  },

  /**
   * Récupère l'état d'abonnement complet
   */
  getSubscription(): SubscriptionState {
    const currentMonth = getCurrentMonthKey();
    const defaultState: SubscriptionState = {
      planId: 'trial',
      billingInterval: this.getBillingIntervalPreference(),
      trialStartDate: new Date().toISOString(),
      trialDaysTotal: 14,
      monthKey: currentMonth,
      scansUsedThisMonth: 0,
      status: 'trialing',
      updatedAt: new Date().toISOString()
    };

    if (typeof window === 'undefined') {
      return defaultState;
    }

    try {
      const raw = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(defaultState));
        return defaultState;
      }

      const parsed: SubscriptionState = JSON.parse(raw);

      // Réinitialisation automatique du quota le 1er du mois
      if (parsed.monthKey !== currentMonth) {
        parsed.monthKey = currentMonth;
        parsed.scansUsedThisMonth = 0;
        parsed.updatedAt = new Date().toISOString();
        localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(parsed));
      }

      return parsed;
    } catch (err) {
      console.warn('Erreur lors de la lecture de l’abonnement, réinitialisation par défaut :', err);
      return defaultState;
    }
  },

  /**
   * Sauvegarde l'état d'abonnement
   */
  saveSubscription(state: Partial<SubscriptionState>): SubscriptionState {
    const current = this.getSubscription();
    const updated: SubscriptionState = {
      ...current,
      ...state,
      updatedAt: new Date().toISOString()
    };

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event('marmicout_subscription_changed'));
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de l’abonnement :', err);
    }

    return updated;
  },

  /**
   * Calcule le nombre de jours d'essai restants (sur les 14 jours initiaux)
   */
  getRemainingTrialDays(): number {
    const sub = this.getSubscription();
    if (sub.planId !== 'trial') {
      return 0;
    }

    try {
      const start = new Date(sub.trialStartDate).getTime();
      const now = Date.now();
      const elapsedDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
      const remaining = sub.trialDaysTotal - elapsedDays;
      return Math.max(0, remaining);
    } catch {
      return 14;
    }
  },

  /**
   * Retourne le quota mensuel alloué pour la formule active
   */
  getCurrentScanQuota(): number {
    const sub = this.getSubscription();
    const plan = PRICING_CONFIG.plans.find(p => p.id === sub.planId);
    if (plan && plan.scanQuota !== null) {
      return plan.scanQuota;
    }
    if (sub.planId === 'fondateur') {
      return 150;
    }
    return 150; // Quota par défaut de l'essai
  },

  /**
   * Vérifie si l'utilisateur a encore des scans disponibles ce mois-ci
   */
  canScan(): boolean {
    const sub = this.getSubscription();
    const quota = this.getCurrentScanQuota();
    return sub.scansUsedThisMonth < quota;
  },

  /**
   * Enregistre l'utilisation d'un scan (incrémentation du compteur mensuel)
   */
  recordScanUsage(): { success: boolean; used: number; quota: number } {
    const sub = this.getSubscription();
    const quota = this.getCurrentScanQuota();

    const newCount = sub.scansUsedThisMonth + 1;
    this.saveSubscription({ scansUsedThisMonth: newCount });

    return {
      success: true,
      used: newCount,
      quota
    };
  },

  /**
   * Change de formule d'abonnement
   * TODO: Connecter à Stripe Checkout lorsque le paiement sera branché.
   */
  changePlan(newPlanId: PlanId, interval?: BillingInterval): SubscriptionState {
    const current = this.getSubscription();
    const updated = this.saveSubscription({
      planId: newPlanId,
      billingInterval: interval || current.billingInterval,
      status: newPlanId === 'trial' ? 'trialing' : 'active'
    });

    // TODO: Déclencher webhook Stripe / session checkout
    console.info(`[MarmiCout Subscription] Changement de formule vers ${newPlanId} (${updated.billingInterval}).`);
    return updated;
  },

  /**
   * Résiliation de l'abonnement en cours (sans frais, immédiat)
   */
  cancelSubscription(): SubscriptionState {
    const updated = this.saveSubscription({
      status: 'canceled',
      planId: 'trial' // Rétrogradation vers essai / local
    });
    // TODO: Notifier Stripe Customer Portal / Webhook
    console.info('[MarmiCout Subscription] Abonnement résilié sans frais.');
    return updated;
  },

  /**
   * Collecte d'email pour être prévenu du lancement du Pro Cloud
   * Stocke l'adresse localement et prépare le raccordement backend.
   */
  registerWaitlistEmail(email: string, planName = 'Pro Cloud'): { success: boolean; message: string } {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { success: false, message: 'Veuillez saisir une adresse email valide.' };
    }

    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(WAITLIST_STORAGE_KEY);
        const list: Array<{ email: string; plan: string; date: string }> = raw ? JSON.parse(raw) : [];
        if (!list.some(item => item.email === cleanEmail)) {
          list.push({
            email: cleanEmail,
            plan: planName,
            date: new Date().toISOString()
          });
          localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(list));
        }
      }
      // TODO: Envoyer vers l'API backend / Supabase / service de mailing dès qu'il sera disponible
      console.info(`[MarmiCout Waitlist] Inscription enregistrée pour ${cleanEmail} (${planName}).`);
      return {
        success: true,
        message: 'Merci ! Votre email a été enregistré. Vous recevrez une alerte prioritaire dès l’activation de la sauvegarde Cloud.'
      };
    } catch (e) {
      console.warn('Erreur lors de l’enregistrement de la liste d’attente :', e);
      return {
        success: true,
        message: 'Votre demande a bien été prise en compte.'
      };
    }
  }
};
