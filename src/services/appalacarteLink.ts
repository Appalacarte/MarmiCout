/**
 * Lien vers App à la Carte, la plateforme de vente commune à toutes les applis.
 * Quand un client clique sur un forfait dans l'appli, il est redirigé vers la page
 * d'arrivée de CETTE appli sur appalacarte.fr, avec le forfait choisi mis en avant.
 *
 * À reprendre tel quel dans les autres applis : seul APP_SLUG change
 * (et APP_LINK_CODE pour une appli privée, à copier depuis l'admin App à la Carte).
 */

import type { BillingInterval } from '../config/pricing';

const APPALACARTE_URL = (import.meta.env.VITE_APPALACARTE_URL || 'https://appalacarte.fr').replace(/\/+$/, '');

/** Identifiant de l'appli dans App à la Carte (colonne « slug » de l'admin). */
export const APP_SLUG = 'marmicout-stock-restauration';

/**
 * Code d'un lien dédié (admin App à la Carte → Applications & Forfaits → Liens).
 * Obligatoire seulement si l'appli est PRIVÉE ; laisser vide pour une appli publique.
 */
const APP_LINK_CODE = '';

export function buildSubscribeUrl(planCode: string, interval: BillingInterval): string {
  const params = new URLSearchParams();
  // Les essais gratuits s'appellent « demo_14j » dans App à la Carte
  params.set('plan', planCode === 'trial' ? 'demo_14j' : planCode);
  params.set('cycle', interval === 'year' ? 'yearly' : 'monthly');
  params.set('src', 'app');

  const base = APP_LINK_CODE
    ? `${APPALACARTE_URL}/a/${APP_LINK_CODE}`
    : `${APPALACARTE_URL}/souscrire/${APP_SLUG}`;

  return `${base}?${params.toString()}`;
}
