/**
 * Utilitaire de détection des variations significatives de prix d'achat
 * Règle : Si l'écart entre le prix unitaire (ramené à l'unité de stock) et le prix moyen
 * précédent dépasse 10 %, génère un message « Prix en hausse de X % » ou « Prix en baisse de X % ».
 */

export interface PriceAlertResult {
  hasAlert: boolean;
  type?: 'increase' | 'decrease';
  diffPercent?: number; // Valeur absolue du pourcentage d'écart
  message?: string; // « Prix en hausse de X % » ou « Prix en baisse de X % »
}

export function formatPercentNumber(value: number): string {
  const rounded = Number(value.toFixed(1));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Compare le prix unitaire d'un nouvel achat (ramené à l'unité de stock)
 * avec le prix moyen d'achat précédent du produit.
 */
export function comparePurchasePrice(
  unitPriceInStockUnit: number,
  previousAvgPrice: number
): PriceAlertResult {
  if (
    !Number.isFinite(unitPriceInStockUnit) ||
    !Number.isFinite(previousAvgPrice) ||
    previousAvgPrice <= 0 ||
    unitPriceInStockUnit <= 0
  ) {
    return { hasAlert: false };
  }

  // Éviter les imprécisions de virgule flottante JS (ex: 2.2 - 2.0 = 0.20000000000000018)
  const rawDiff = Number((((unitPriceInStockUnit - previousAvgPrice) / previousAvgPrice) * 100).toFixed(4));

  // Hausse strictement supérieure à 10 %
  if (rawDiff > 10) {
    const formattedDiff = formatPercentNumber(rawDiff);
    return {
      hasAlert: true,
      type: 'increase',
      diffPercent: Number(rawDiff.toFixed(1)),
      message: `Prix en hausse de ${formattedDiff} %`
    };
  }

  // Baisse strictement supérieure à 10 % (soit rawDiff < -10)
  if (rawDiff < -10) {
    const absDiff = Math.abs(rawDiff);
    const formattedDiff = formatPercentNumber(absDiff);
    return {
      hasAlert: true,
      type: 'decrease',
      diffPercent: Number(absDiff.toFixed(1)),
      message: `Prix en baisse de ${formattedDiff} %`
    };
  }

  return { hasAlert: false };
}
