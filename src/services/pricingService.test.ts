import { 
  formatPlanPrice, 
  isSamePlanCode, 
  mapRowToMergedPlan, 
  getFallbackPlans
} from './pricingService.ts';
import type { SupabasePlanRow } from './pricingService.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`❌ ÉCHEC : ${msg}`);
  } else {
    console.log(`✅ PASS : ${msg}`);
  }
}

console.log('=== Tests unitaires src/services/pricingService.ts ===');

// 1. Tests formatPlanPrice
assert(formatPlanPrice(0) === '0\u00A0€', 'formatPlanPrice 0');
assert(formatPlanPrice(14.9) === '14,90\u00A0€', 'formatPlanPrice décimal 14.9');
assert(formatPlanPrice(149) === '149\u00A0€', 'formatPlanPrice entier 149');
assert(formatPlanPrice(39.9) === '39,90\u00A0€', 'formatPlanPrice décimal 39.9');

// 2. Tests isSamePlanCode (correspondance des codes et rétro-compatibilité essai)
assert(isSamePlanCode('demo_14j', 'demo_14j', true) === true, 'demo_14j correspond à demo_14j');
assert(isSamePlanCode('trial', 'demo_14j', true) === true, 'trial correspond à demo_14j (rétro-compatibilité)');
assert(isSamePlanCode('demo_14j', 'trial', true) === true, 'demo_14j correspond à trial');
assert(isSamePlanCode('essentiel', 'essentiel', false) === true, 'essentiel correspond à essentiel');
assert(isSamePlanCode('essentiel', 'pro', false) === false, 'essentiel différent de pro');
assert(isSamePlanCode(undefined, 'pro', false) === false, 'code indéfini renvoie false');

// 3. Tests mapRowToMergedPlan
const rowTrial: SupabasePlanRow = {
  id: '013a65cd-1c22-4b14-b98b-57bc6983297f',
  code: 'demo_14j',
  name: 'Essai gratuit 14 jours',
  description: '14 jours pour tester',
  price_monthly: 0,
  price_yearly: 0,
  trial_days: 14,
  features: ['Fonction 1', 'Fonction 2']
};
const planTrial = mapRowToMergedPlan(rowTrial);
assert(planTrial.isTrial === true, 'forfait demo_14j reconnu comme essai');
assert(planTrial.trial_days === 14, 'trial_days préservé');
assert(planTrial.monthlyPrice?.amount === 0, 'prix mensuel essai = 0');
assert(planTrial.yearlyPrice === null, 'prix annuel essai = null');
assert(planTrial.storage === 'Navigateur', 'métadonnée storage navigateur injectée pour essai');
assert(planTrial.ctaText.available === 'Démarrer mon essai gratuit', 'CTA essai');

const rowEssentiel: SupabasePlanRow = {
  id: 'e1fdf6c9-3bb2-4f6a-809b-1c408a595c65',
  code: 'essentiel',
  name: 'Essentiel',
  description: 'Gestion quotidienne',
  price_monthly: 14.9,
  price_yearly: 149,
  trial_days: 0,
  features: ['Stocks illimités']
};
const planEssentiel = mapRowToMergedPlan(rowEssentiel);
assert(planEssentiel.isTrial === false, 'essentiel est payant');
assert(planEssentiel.storage === 'Navigateur (local)', 'storage essentiel local');
assert(planEssentiel.monthlyPrice?.amount === 14.9, 'prix mensuel essentiel 14.9');
assert(planEssentiel.yearlyPrice?.amount === 149, 'prix annuel essentiel 149');
assert(planEssentiel.scanQuota === 10, 'quota scans essentiel = 10');

// Test forfait personnalisé sans métadonnées Marmicout (ex: forfait admin 't')
const rowUnknown: SupabasePlanRow = {
  id: 'custom-id',
  code: 't',
  name: 'Test admin',
  description: null,
  price_monthly: 19.9,
  price_yearly: 199,
  trial_days: 0,
  features: ['Option 1']
};
const planUnknown = mapRowToMergedPlan(rowUnknown);
assert(planUnknown.isTrial === false, 'forfait admin inconnu non essai');
assert(planUnknown.storage === undefined, 'pas de stockage inventé si absent de la config Marmicout');
assert(planUnknown.badge === undefined, 'pas de badge inventé');
assert(planUnknown.isRecommended === false, 'non recommandé par défaut');
assert(planUnknown.monthlyPrice?.formatted === '19,90\u00A0€', 'prix mensuel formaté 19,90 €');

// 4. Tests getFallbackPlans
const fallbackPlans = getFallbackPlans();
assert(fallbackPlans.length >= 4, 'au moins 4 forfaits de secours');
assert(fallbackPlans[0].isTrial === true, 'le premier forfait de secours est l’essai');
assert(fallbackPlans.some(p => p.code === 'essentiel'), 'présence d’essentiel en secours');
assert(fallbackPlans.some(p => p.code === 'pro'), 'présence de pro en secours');
assert(fallbackPlans.some(p => p.code === 'pro_cloud'), 'présence de pro_cloud en secours');

console.log('Tous les tests pricingService.ts ont réussi avec succès !');
