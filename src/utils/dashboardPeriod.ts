import type { Sale, Purchase, Production, Recipe, Product } from '../types/index.ts';

export type PeriodKey = 'today' | '7days' | 'this_month' | 'last_month' | 'this_year' | 'all';

export interface PeriodOption {
  key: PeriodKey;
  label: string;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: '7days', label: '7 jours' },
  { key: 'this_month', label: 'Ce mois' },
  { key: 'last_month', label: 'Mois dernier' },
  { key: 'this_year', label: 'Cette année' },
  { key: 'all', label: 'Tout' }
];

export interface DateRange {
  start: string | null; // 'YYYY-MM-DD'
  end: string | null;   // 'YYYY-MM-DD'
}

export interface PeriodRangeInfo {
  current: DateRange;
  previous: DateRange | null;
  label: string;
  prevLabel: string | null;
}

export function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatDateToKey(d: Date): string {
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
}

export function getPeriodRange(period: PeriodKey, baseDate: Date = new Date()): PeriodRangeInfo {
  const y = baseDate.getFullYear();
  const m = baseDate.getMonth();
  const d = baseDate.getDate();

  switch (period) {
    case 'today': {
      const todayStr = formatDateToKey(baseDate);
      const yesterday = new Date(y, m, d - 1);
      const yesterdayStr = formatDateToKey(yesterday);
      return {
        current: { start: todayStr, end: todayStr },
        previous: { start: yesterdayStr, end: yesterdayStr },
        label: "Aujourd'hui",
        prevLabel: 'hier'
      };
    }
    case '7days': {
      const curEnd = formatDateToKey(baseDate);
      const curStart = formatDateToKey(new Date(y, m, d - 6));
      const prevEnd = formatDateToKey(new Date(y, m, d - 7));
      const prevStart = formatDateToKey(new Date(y, m, d - 13));
      return {
        current: { start: curStart, end: curEnd },
        previous: { start: prevStart, end: prevEnd },
        label: '7 jours',
        prevLabel: '7 j. précédents'
      };
    }
    case 'this_month': {
      const curStart = formatDateToKey(new Date(y, m, 1));
      const curEnd = formatDateToKey(new Date(y, m + 1, 0));
      const prevStart = formatDateToKey(new Date(y, m - 1, 1));
      const prevEnd = formatDateToKey(new Date(y, m, 0));
      return {
        current: { start: curStart, end: curEnd },
        previous: { start: prevStart, end: prevEnd },
        label: 'Ce mois',
        prevLabel: 'mois dernier'
      };
    }
    case 'last_month': {
      const curStart = formatDateToKey(new Date(y, m - 1, 1));
      const curEnd = formatDateToKey(new Date(y, m, 0));
      const prevStart = formatDateToKey(new Date(y, m - 2, 1));
      const prevEnd = formatDateToKey(new Date(y, m - 1, 0));
      return {
        current: { start: curStart, end: curEnd },
        previous: { start: prevStart, end: prevEnd },
        label: 'Mois dernier',
        prevLabel: 'mois précédent'
      };
    }
    case 'this_year': {
      const curStart = `${y}-01-01`;
      const curEnd = `${y}-12-31`;
      const prevStart = `${y - 1}-01-01`;
      const prevEnd = `${y - 1}-12-31`;
      return {
        current: { start: curStart, end: curEnd },
        previous: { start: prevStart, end: prevEnd },
        label: 'Cette année',
        prevLabel: 'année précédente'
      };
    }
    case 'all':
    default:
      return {
        current: { start: null, end: null },
        previous: null,
        label: 'Tout l\'historique',
        prevLabel: null
      };
  }
}

export function isDateInRange(dateStr: string | undefined, range: DateRange | null): boolean {
  if (!range || !range.start || !range.end) return true;
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= range.start && d <= range.end;
}

export interface MetricDiff {
  percent: number | null; // null si pas de période précédente
  arrow: 'up' | 'down' | 'flat' | 'none';
  text: string;
  isPositive: boolean;
  isNegative: boolean;
}

export function calculateMetricDiff(current: number, previous: number | null | undefined): MetricDiff {
  if (previous === null || previous === undefined) {
    return {
      percent: null,
      arrow: 'none',
      text: '—',
      isPositive: false,
      isNegative: false
    };
  }

  if (previous === 0) {
    if (current === 0) {
      return { percent: 0, arrow: 'flat', text: '0%', isPositive: false, isNegative: false };
    }
    if (current > 0) {
      return { percent: 100, arrow: 'up', text: '+100%', isPositive: true, isNegative: false };
    }
    return { percent: -100, arrow: 'down', text: '-100%', isPositive: false, isNegative: true };
  }

  const diff = current - previous;
  const pct = (diff / Math.abs(previous)) * 100;
  const rounded = Math.round(pct * 10) / 10;
  const formattedPct = `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}%`;

  if (Math.abs(rounded) < 0.05) {
    return { percent: 0, arrow: 'flat', text: '0.0%', isPositive: false, isNegative: false };
  }

  return {
    percent: rounded,
    arrow: rounded > 0 ? 'up' : 'down',
    text: formattedPct,
    isPositive: rounded > 0,
    isNegative: rounded < 0
  };
}

export interface PeriodSummary {
  salesRevenue: number;
  costOfSales: number;
  estimatedProfit: number;
  purchasesTotal: number;
  productionsCost: number;
  avgProductionCost: number;
  productionsCount: number;
  salesCount: number;
}

export function computePeriodSummary(
  sales: Sale[],
  purchases: Purchase[],
  productions: Production[],
  products: Product[],
  calculateRecipeCost: (recipeId: string) => { costPerPortion: number },
  range: DateRange | null
): PeriodSummary {
  const filteredSales = sales.filter(s => isDateInRange(s.date, range));
  const filteredPurchases = purchases.filter(p => isDateInRange(p.date, range));
  const filteredProductions = productions.filter(pr => isDateInRange(pr.date, range));

  // 1. Chiffre d'Affaires
  const salesRevenue = filteredSales.reduce((acc, sale) => acc + (sale.qtySold * sale.unitPrice), 0);

  // 2. Coût des ventes & Bénéfice
  let costOfSales = 0;
  filteredSales.forEach(sale => {
    if (sale.itemType === 'RECIPE') {
      const costInfo = calculateRecipeCost(sale.itemId);
      costOfSales += sale.qtySold * costInfo.costPerPortion;
    } else {
      const prod = products.find(p => p.id === sale.itemId);
      if (prod) {
        costOfSales += sale.qtySold * prod.avgPurchasePrice;
      }
    }
  });
  const estimatedProfit = salesRevenue - costOfSales;

  // 3. Total des achats
  const purchasesTotal = filteredPurchases.reduce((acc, p) => acc + p.pricePaid, 0);

  // 4. Coût moyen des fabrications
  const productionsCost = filteredProductions.reduce((acc, pr) => acc + pr.calculatedCost, 0);
  const productionsCount = filteredProductions.length;
  const avgProductionCost = productionsCount > 0 ? productionsCost / productionsCount : 0;

  return {
    salesRevenue,
    costOfSales,
    estimatedProfit,
    purchasesTotal,
    productionsCost,
    avgProductionCost,
    productionsCount,
    salesCount: filteredSales.length
  };
}

export interface RecipeProfitPeriodItem {
  recipe: Recipe;
  costInfo: {
    costPerPortion: number;
    suggestedSellingPrice: number;
    isApproximate?: boolean;
    hasIncompatibleUnits?: boolean;
  };
  avgSalePrice: number;
  profitUnit: number;
  marginPercent: number;
  salesCountInPeriod: number;
  qtySoldInPeriod: number;
}

export function computeRecipesWithProfitForPeriod(
  recipes: Recipe[],
  sales: Sale[],
  range: DateRange | null,
  calculateRecipeCost: (recipeId: string) => {
    costPerPortion: number;
    suggestedSellingPrice: number;
    isApproximate?: boolean;
    hasIncompatibleUnits?: boolean;
  }
): RecipeProfitPeriodItem[] {
  const filteredSales = sales.filter(s => isDateInRange(s.date, range));

  return recipes.map(recipe => {
    const costInfo = calculateRecipeCost(recipe.id);
    const recipeSales = filteredSales.filter(s => s.itemType === 'RECIPE' && s.itemId === recipe.id);
    
    let avgSalePrice: number;
    let qtySoldInPeriod = 0;

    if (recipeSales.length > 0) {
      const totalRevenue = recipeSales.reduce((acc, s) => acc + (s.qtySold * s.unitPrice), 0);
      qtySoldInPeriod = recipeSales.reduce((acc, s) => acc + s.qtySold, 0);
      avgSalePrice = qtySoldInPeriod > 0 ? totalRevenue / qtySoldInPeriod : costInfo.suggestedSellingPrice;
    } else {
      avgSalePrice = costInfo.suggestedSellingPrice;
    }

    const profitUnit = avgSalePrice - costInfo.costPerPortion;
    const marginPercent = avgSalePrice > 0 ? (profitUnit / avgSalePrice) * 100 : 0;

    return {
      recipe,
      costInfo,
      avgSalePrice,
      profitUnit,
      marginPercent,
      salesCountInPeriod: recipeSales.length,
      qtySoldInPeriod
    };
  }).sort((a, b) => b.marginPercent - a.marginPercent);
}

export interface ChartDataPoint {
  key: string;       // e.g. '2026-11-14' ou '2026-11'
  label: string;     // e.g. '14/11' ou 'Nov.'
  fullLabel: string; // e.g. '14 novembre 2026' ou 'Novembre 2026'
  revenue: number;
  salesCount: number;
}

const MONTH_NAMES_FR = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
const FULL_MONTH_NAMES_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export function generateSalesChartData(
  sales: Sale[],
  range: DateRange | null,
  periodKey: PeriodKey,
  forceGranularity?: 'day' | 'month'
): ChartDataPoint[] {
  const filteredSales = sales.filter(s => isDateInRange(s.date, range));

  // Décision de la granularité si non forcée :
  // 'today', '7days', 'this_month', 'last_month' => par jour
  // 'this_year', 'all' => par mois
  const granularity = forceGranularity || (periodKey === 'this_year' || periodKey === 'all' ? 'month' : 'day');

  if (granularity === 'day') {
    // Si on a une plage définie (start et end), générons tous les jours pour avoir une continuité graphique
    const pointsMap = new Map<string, { revenue: number; salesCount: number }>();

    if (range && range.start && range.end) {
      const [startYear, startMonth, startDay] = range.start.split('-').map(Number);
      const [endYear, endMonth, endDay] = range.end.split('-').map(Number);
      const startDate = new Date(startYear, startMonth - 1, startDay);
      const endDate = new Date(endYear, endMonth - 1, endDay);

      // Limiter à un maximum raisonnable de 31 jours continus
      const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays >= 0 && diffDays <= 35) {
        const iter = new Date(startDate);
        while (iter <= endDate) {
          const key = formatDateToKey(iter);
          pointsMap.set(key, { revenue: 0, salesCount: 0 });
          iter.setDate(iter.getDate() + 1);
        }
      }
    }

    filteredSales.forEach(s => {
      const key = s.date.slice(0, 10);
      const cur = pointsMap.get(key) || { revenue: 0, salesCount: 0 };
      cur.revenue += s.qtySold * s.unitPrice;
      cur.salesCount += 1;
      pointsMap.set(key, cur);
    });

    const sortedKeys = Array.from(pointsMap.keys()).sort();
    return sortedKeys.map(key => {
      const data = pointsMap.get(key)!;
      const parts = key.split('-');
      const day = parts[2] || '';
      const month = parts[1] || '';
      const year = parts[0] || '';
      const mIdx = Number(month) - 1;
      const monthLabel = mIdx >= 0 && mIdx < 12 ? MONTH_NAMES_FR[mIdx] : month;
      return {
        key,
        label: `${day}/${month}`,
        fullLabel: `${day} ${monthLabel} ${year}`,
        revenue: Math.round(data.revenue * 100) / 100,
        salesCount: data.salesCount
      };
    });
  } else {
    // Granularité par mois
    const pointsMap = new Map<string, { revenue: number; salesCount: number }>();

    if (periodKey === 'this_year' && range && range.start) {
      const y = Number(range.start.slice(0, 4));
      for (let m = 0; m < 12; m++) {
        const key = `${y}-${padZero(m + 1)}`;
        pointsMap.set(key, { revenue: 0, salesCount: 0 });
      }
    }

    filteredSales.forEach(s => {
      const key = s.date.slice(0, 7); // 'YYYY-MM'
      const cur = pointsMap.get(key) || { revenue: 0, salesCount: 0 };
      cur.revenue += s.qtySold * s.unitPrice;
      cur.salesCount += 1;
      pointsMap.set(key, cur);
    });

    const sortedKeys = Array.from(pointsMap.keys()).sort();
    return sortedKeys.map(key => {
      const data = pointsMap.get(key)!;
      const [year, month] = key.split('-');
      const mIdx = Number(month) - 1;
      const shortName = mIdx >= 0 && mIdx < 12 ? MONTH_NAMES_FR[mIdx] : month;
      const fullName = mIdx >= 0 && mIdx < 12 ? FULL_MONTH_NAMES_FR[mIdx] : month;
      return {
        key,
        label: shortName,
        fullLabel: `${fullName} ${year}`,
        revenue: Math.round(data.revenue * 100) / 100,
        salesCount: data.salesCount
      };
    });
  }
}
