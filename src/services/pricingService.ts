/**
 * Service de gestion dynamique des tarifs MarmiCout
 * Charge les forfaits depuis la table Supabase `plans` liée à l'application `marmicout-stock-restauration`.
 * Conserve `src/config/pricing.ts` comme solution de secours en cas d'indisponibilité ou hors connexion.
 */

import { supabase } from './supabaseClient.ts';
import { PRICING_CONFIG } from '../config/pricing.ts';

export interface SupabasePlanRow {
  id: string;
  app_id?: string;
  code: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  trial_days: number | null;
  features: string[] | null;
  display_order?: number;
  is_active?: boolean;
  visible_public?: boolean;
}

export interface MarmicoutPlanMeta {
  storage?: string;
  badge?: string;
  isRecommended?: boolean;
  scanQuota?: number | null;
  ctaText?: {
    available: string;
    comingSoon?: string;
  };
}

/**
 * Métadonnées spécifiques à MarmiCout non stockées dans la base centrale Appalacarte.
 * Indexées par code de forfait.
 */
export const MARMICOUT_PLANS_META: Record<string, MarmicoutPlanMeta> = {
  demo_14j: {
    storage: 'Navigateur',
    badge: '14 jours gratuits',
    scanQuota: 150,
    ctaText: { available: 'Démarrer mon essai gratuit' }
  },
  trial: {
    storage: 'Navigateur',
    badge: '14 jours gratuits',
    scanQuota: 150,
    ctaText: { available: 'Démarrer mon essai gratuit' }
  },
  essentiel: {
    storage: 'Navigateur (local)',
    scanQuota: 10,
    ctaText: { available: 'Choisir cette formule' }
  },
  pro: {
    storage: 'Navigateur (local)',
    scanQuota: 150,
    ctaText: { available: 'Choisir cette formule' }
  },
  pro_cloud: {
    storage: 'Sauvegarde en ligne + navigateur',
    badge: 'Recommandé',
    isRecommended: true,
    scanQuota: 150,
    ctaText: { available: 'Sécuriser mes données', comingSoon: 'Être prévenu du lancement' }
  }
};

export interface MergedPricingPlan {
  id: string; // Alias pour plan.code pour compatibilité ascendante
  code: string;
  name: string;
  tagline: string;
  badge?: string;
  isRecommended?: boolean;
  storage?: string;
  status: 'available' | 'coming_soon' | 'limited';
  scanQuota: number | null;
  monthlyPrice: {
    amount: number;
    formatted: string;
    period: string;
    stripePriceId?: string | null;
  } | null;
  yearlyPrice: {
    amount: number;
    formatted: string;
    period: string;
    equivalentMonthlyFormatted?: string;
    stripePriceId?: string | null;
  } | null;
  features: string[];
  trial_days: number;
  isTrial: boolean;
  ctaText: {
    available: string;
    comingSoon?: string;
  };
}

/**
 * Formate un montant en euros dans la typographie française officielle (espace insécable).
 */
export function formatPlanPrice(amount: number): string {
  if (amount === 0) {
    return '0\u00A0€';
  }
  if (Number.isInteger(amount)) {
    return `${amount}\u00A0€`;
  }
  return `${amount.toFixed(2).replace('.', ',')}\u00A0€`;
}

/**
 * Génère la liste des forfaits de secours depuis src/config/pricing.ts
 */
export function getFallbackPlans(): MergedPricingPlan[] {
  return PRICING_CONFIG.plans.map(p => {
    const isTrial = p.id === 'trial' || p.id === 'demo_14j';
    return {
      id: p.id,
      code: p.id,
      name: p.name,
      tagline: p.tagline,
      badge: p.badge,
      isRecommended: p.isRecommended,
      storage: p.storage,
      status: p.status,
      scanQuota: p.scanQuota,
      monthlyPrice: p.monthlyPrice,
      yearlyPrice: p.yearlyPrice,
      features: p.features,
      trial_days: isTrial ? 14 : 0,
      isTrial,
      ctaText: p.ctaText
    };
  });
}

/**
 * Transforme une ligne Supabase en forfait unifié enrichi de ses métadonnées Marmicout.
 */
export function mapRowToMergedPlan(row: SupabasePlanRow): MergedPricingPlan {
  const isTrial =
    row.code === 'demo_14j' ||
    (row.trial_days !== null && row.trial_days !== undefined && row.trial_days > 0) ||
    row.code === 'trial';

  const trialDays = row.trial_days ?? (isTrial ? 14 : 0);
  const meta = MARMICOUT_PLANS_META[row.code] || {};

  const monthlyAmount = Number(row.price_monthly) || 0;
  const yearlyAmount = Number(row.price_yearly) || 0;

  const monthlyPrice = isTrial
    ? {
        amount: 0,
        formatted: '0\u00A0€',
        period: `pendant ${trialDays} jours`,
        stripePriceId: null
      }
    : {
        amount: monthlyAmount,
        formatted: formatPlanPrice(monthlyAmount),
        period: '/ mois',
        stripePriceId: null
      };

  const yearlyPrice = isTrial
    ? null
    : {
        amount: yearlyAmount,
        formatted: formatPlanPrice(yearlyAmount),
        period: '/ an',
        equivalentMonthlyFormatted: formatPlanPrice(yearlyAmount / 12),
        stripePriceId: null
      };

  const defaultCtaText = isTrial
    ? { available: 'Démarrer mon essai gratuit' }
    : { available: 'Choisir cette formule' };

  return {
    id: row.code,
    code: row.code,
    name: row.name,
    tagline: row.description || '',
    badge: meta.badge,
    isRecommended: meta.isRecommended ?? false,
    storage: meta.storage,
    status:
      row.code === 'pro_cloud' && !PRICING_CONFIG.flags.cloudSyncEnabled
        ? 'coming_soon'
        : 'available',
    scanQuota: meta.scanQuota !== undefined ? meta.scanQuota : (isTrial ? 150 : null),
    monthlyPrice,
    yearlyPrice,
    features: Array.isArray(row.features) ? row.features : [],
    trial_days: trialDays,
    isTrial,
    ctaText: meta.ctaText || defaultCtaText
  };
}

/**
 * Vérifie si deux identifiants de forfait correspondent (en gérant l'équivalence trial <-> demo_14j).
 */
export function isSamePlanCode(currentCode: string | undefined, planCode: string, isTrial: boolean): boolean {
  if (!currentCode) return false;
  if (currentCode === planCode) return true;
  const isCurrentTrial = currentCode === 'trial' || currentCode === 'demo_14j';
  const isTargetTrial = planCode === 'trial' || planCode === 'demo_14j' || isTrial;
  return isCurrentTrial && isTargetTrial;
}

let cachedPlansResult: { plans: MergedPricingPlan[]; isOffline: boolean } | null = null;
let pendingFetchPromise: Promise<{ plans: MergedPricingPlan[]; isOffline: boolean }> | null = null;

export const pricingService = {
  getFallbackPlans,
  isSamePlanCode,

  /**
   * Charge les forfaits depuis Supabase (table plans liée à marmicout-stock-restauration).
   * Retourne les forfaits enrichis et le statut hors-ligne le cas échéant.
   */
  async getPlans(forceRefresh = false): Promise<{ plans: MergedPricingPlan[]; isOffline: boolean }> {
    if (cachedPlansResult && !forceRefresh) {
      return cachedPlansResult;
    }

    if (pendingFetchPromise && !forceRefresh) {
      return pendingFetchPromise;
    }

    pendingFetchPromise = (async () => {
      try {
        // 1. Requête jointe principale
        const { data, error } = await supabase
          .from('plans')
          .select('id, code, name, description, price_monthly, price_yearly, features, trial_days, display_order, is_active, visible_public, apps!inner(slug)')
          .eq('apps.slug', 'marmicout-stock-restauration')
          .eq('is_active', true)
          .eq('visible_public', true)
          .order('display_order', { ascending: true });

        if (!error && data && data.length > 0) {
          const mapped = (data as unknown as SupabasePlanRow[]).map(mapRowToMergedPlan);
          // Forfait d'essai en premier, puis forfaits payants dans l'ordre de l'admin
          const trialPlans = mapped.filter(p => p.isTrial);
          const paidPlans = mapped.filter(p => !p.isTrial);
          const result = {
            plans: [...trialPlans, ...paidPlans],
            isOffline: false
          };
          cachedPlansResult = result;
          return result;
        }

        // 2. Requête alternative en deux temps si apps!inner renvoie une erreur
        const { data: appData } = await supabase
          .from('apps')
          .select('id')
          .eq('slug', 'marmicout-stock-restauration')
          .maybeSingle();

        if (appData?.id) {
          const { data: plansData, error: errPlans } = await supabase
            .from('plans')
            .select('*')
            .eq('app_id', appData.id)
            .eq('is_active', true)
            .eq('visible_public', true)
            .order('display_order', { ascending: true });

          if (!errPlans && plansData && plansData.length > 0) {
            const mapped = (plansData as unknown as SupabasePlanRow[]).map(mapRowToMergedPlan);
            const trialPlans = mapped.filter(p => p.isTrial);
            const paidPlans = mapped.filter(p => !p.isTrial);
            const result = {
              plans: [...trialPlans, ...paidPlans],
              isOffline: false
            };
            cachedPlansResult = result;
            return result;
          }
        }
      } catch (err) {
        console.warn('[pricingService] Supabase indisponible ou hors connexion, utilisation des tarifs de secours :', err);
      }

      // 3. Fallback hors connexion
      const fallbackResult = {
        plans: getFallbackPlans(),
        isOffline: true
      };
      cachedPlansResult = fallbackResult;
      return fallbackResult;
    })();

    try {
      const result = await pendingFetchPromise;
      return result;
    } finally {
      pendingFetchPromise = null;
    }
  }
};
