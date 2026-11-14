import type { Purchase, Product, Store } from '../types/index';

export type ExpiryStatusLevel = 'danger' | 'warning' | 'normal';

export interface ExpiryStatus {
  diffDays: number;
  isExpired: boolean;
  isWarning: boolean;
  isAlert: boolean;
  statusLevel: ExpiryStatusLevel;
  formattedDate: string;
  label: string;
}

export interface ExpiringPurchaseItem {
  purchase: Purchase;
  product: Product;
  store?: Store;
  diffDays: number;
  isExpired: boolean;
  statusLevel: 'danger' | 'warning';
  formattedDate: string;
  label: string;
}

export interface ProductExpiryInfo {
  purchase: Purchase;
  formattedDate: string;
  batchNo?: string;
  diffDays: number;
  isExpired: boolean;
  statusLevel: ExpiryStatusLevel;
  label: string;
}

/**
 * Analyse une date au format YYYY-MM-DD (ou ISO) à minuit heure locale
 */
export function parseDateOnly(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  const parts = trimmed.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Formate une date en JJ/MM/AAAA
 */
export function formatExpiryDate(dateStr: string): string {
  const d = parseDateOnly(dateStr);
  if (!d) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Calcule l'écart en jours calendaires entre aujourd'hui et la date limite
 * < 0 : Dépassée (périmé)
 * = 0 : Expire aujourd'hui
 * > 0 : Expire dans X jours
 */
export function getDaysUntilExpiry(expiryDateStr: string, now = new Date()): number | null {
  const exp = parseDateOnly(expiryDateStr);
  if (!exp) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expDay = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
  const diffMs = expDay.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Fournit le libellé en français selon le nombre de jours restants
 */
export function getExpiryLabel(diffDays: number): string {
  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    return abs === 1 ? 'Périmé depuis hier' : `Dépassée depuis ${abs} j`;
  }
  if (diffDays === 0) {
    return "Expire aujourd'hui";
  }
  if (diffDays === 1) {
    return 'Expire demain';
  }
  return `Expire dans ${diffDays} j`;
}

/**
 * Évalue le statut complet d'une date limite par rapport au délai d'alerte
 */
export function getExpiryStatus(expiryDateStr: string, alertDays = 7, now = new Date()): ExpiryStatus | null {
  const diffDays = getDaysUntilExpiry(expiryDateStr, now);
  if (diffDays === null) return null;

  const isExpired = diffDays < 0;
  const isWarning = diffDays >= 0 && diffDays <= alertDays;
  const isAlert = isExpired || isWarning;
  const statusLevel: ExpiryStatusLevel = isExpired ? 'danger' : isWarning ? 'warning' : 'normal';

  return {
    diffDays,
    isExpired,
    isWarning,
    isAlert,
    statusLevel,
    formattedDate: formatExpiryDate(expiryDateStr),
    label: getExpiryLabel(diffDays),
  };
}

/**
 * Récupère tous les achats en alerte DLC (dépassée ou arrive dans alertDays jours)
 * avec filtrage strict : uniquement les produits dont le stock est supérieur à 0.
 */
export function getExpiringPurchases(
  purchases: Purchase[],
  products: Product[],
  stores: Store[] = [],
  alertDays = 7,
  now = new Date()
): ExpiringPurchaseItem[] {
  const activeProductsWithStock = new Map<string, Product>();
  for (const prod of products) {
    if (prod.isActive !== false && prod.stock > 0) {
      activeProductsWithStock.set(prod.id, prod);
    }
  }

  const storesMap = new Map<string, Store>();
  for (const st of stores) {
    storesMap.set(st.id, st);
  }

  const items: ExpiringPurchaseItem[] = [];

  for (const purchase of purchases) {
    if (!purchase.expiryDate) continue;

    const product = activeProductsWithStock.get(purchase.productId);
    if (!product) continue;

    const status = getExpiryStatus(purchase.expiryDate, alertDays, now);
    if (!status || !status.isAlert) continue;

    items.push({
      purchase,
      product,
      store: purchase.storeId ? storesMap.get(purchase.storeId) : undefined,
      diffDays: status.diffDays,
      isExpired: status.isExpired,
      statusLevel: status.isExpired ? 'danger' : 'warning',
      formattedDate: status.formattedDate,
      label: status.label,
    });
  }

  // Tri par urgence : les plus en retard d'abord, puis les plus proches
  items.sort((a, b) => a.diffDays - b.diffDays);

  return items;
}

/**
 * Trouve la prochaine date limite parmi les achats récents d'un produit
 */
export function getProductNextExpiry(
  productId: string,
  purchases: Purchase[],
  alertDays = 7,
  now = new Date()
): ProductExpiryInfo | null {
  const productPurchasesWithExpiry = purchases
    .filter(p => p.productId === productId && Boolean(p.expiryDate))
    .map(p => {
      const status = getExpiryStatus(p.expiryDate!, alertDays, now);
      return { purchase: p, status };
    })
    .filter((item): item is { purchase: Purchase; status: ExpiryStatus } => item.status !== null);

  if (productPurchasesWithExpiry.length === 0) return null;

  // Trier par diffDays croissant pour avoir la date la plus urgente
  productPurchasesWithExpiry.sort((a, b) => a.status.diffDays - b.status.diffDays);

  const nearest = productPurchasesWithExpiry[0];
  return {
    purchase: nearest.purchase,
    formattedDate: nearest.status.formattedDate,
    batchNo: nearest.purchase.batchNo,
    diffDays: nearest.status.diffDays,
    isExpired: nearest.status.isExpired,
    statusLevel: nearest.status.statusLevel,
    label: nearest.status.label,
  };
}
