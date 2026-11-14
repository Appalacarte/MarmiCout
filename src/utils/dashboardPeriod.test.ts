import {
  getPeriodRange,
  isDateInRange,
  calculateMetricDiff,
  computePeriodSummary,
  computeRecipesWithProfitForPeriod,
  generateSalesChartData
} from './dashboardPeriod.ts';
import type { Sale, Purchase, Production, Recipe, Product } from '../types/index.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`❌ ÉCHEC : ${msg}`);
  } else {
    console.log(`✅ PASS : ${msg}`);
  }
}

console.log('=== Tests unitaires src/utils/dashboardPeriod.ts ===');

// 1. Plages de dates
const fixedDate = new Date(2026, 10, 14); // 14 novembre 2026 (mois = 10 car 0-indexed)

const todayRange = getPeriodRange('today', fixedDate);
assert(todayRange.current.start === '2026-11-14' && todayRange.current.end === '2026-11-14', 'today range');
assert(todayRange.previous?.start === '2026-11-13' && todayRange.previous?.end === '2026-11-13', 'yesterday range');

const sevenDaysRange = getPeriodRange('7days', fixedDate);
assert(sevenDaysRange.current.start === '2026-11-08' && sevenDaysRange.current.end === '2026-11-14', '7 days current range');
assert(sevenDaysRange.previous?.start === '2026-11-01' && sevenDaysRange.previous?.end === '2026-11-07', '7 days previous range');

const thisMonthRange = getPeriodRange('this_month', fixedDate);
assert(thisMonthRange.current.start === '2026-11-01' && thisMonthRange.current.end === '2026-11-30', 'this month current range');
assert(thisMonthRange.previous?.start === '2026-10-01' && thisMonthRange.previous?.end === '2026-10-31', 'this month previous range (october)');

const lastMonthRange = getPeriodRange('last_month', fixedDate);
assert(lastMonthRange.current.start === '2026-10-01' && lastMonthRange.current.end === '2026-10-31', 'last month current range');
assert(lastMonthRange.previous?.start === '2026-09-01' && lastMonthRange.previous?.end === '2026-09-30', 'last month previous range');

const thisYearRange = getPeriodRange('this_year', fixedDate);
assert(thisYearRange.current.start === '2026-01-01' && thisYearRange.current.end === '2026-12-31', 'this year current range');
assert(thisYearRange.previous?.start === '2025-01-01' && thisYearRange.previous?.end === '2025-12-31', 'this year previous range');

const allRange = getPeriodRange('all', fixedDate);
assert(allRange.current.start === null && allRange.current.end === null, 'all range current null');
assert(allRange.previous === null, 'all range previous null');

// 2. isDateInRange
assert(isDateInRange('2026-11-10', { start: '2026-11-01', end: '2026-11-30' }), 'date in range true');
assert(!isDateInRange('2026-10-31', { start: '2026-11-01', end: '2026-11-30' }), 'date in range false before');
assert(!isDateInRange('2026-12-01', { start: '2026-11-01', end: '2026-11-30' }), 'date in range false after');
assert(isDateInRange('2026-10-15', { start: null, end: null }), 'date in range true with null range');
assert(!isDateInRange(undefined, { start: '2026-11-01', end: '2026-11-30' }), 'undefined date returns false');

// 3. calculateMetricDiff
const diffAll = calculateMetricDiff(500, null);
assert(diffAll.percent === null && diffAll.arrow === 'none' && diffAll.text === '—', 'metric diff for null prev');

const diffZeroToPos = calculateMetricDiff(200, 0);
assert(diffZeroToPos.percent === 100 && diffZeroToPos.arrow === 'up' && diffZeroToPos.text === '+100%', 'metric diff 0 to 200');

const diffZeroToZero = calculateMetricDiff(0, 0);
assert(diffZeroToZero.percent === 0 && diffZeroToZero.arrow === 'flat' && diffZeroToZero.text === '0%', 'metric diff 0 to 0');

const diffUp = calculateMetricDiff(120, 100);
assert(diffUp.percent === 20 && diffUp.arrow === 'up' && diffUp.text === '+20.0%', 'metric diff +20%');

const diffDown = calculateMetricDiff(75, 100);
assert(diffDown.percent === -25 && diffDown.arrow === 'down' && diffDown.text === '-25.0%', 'metric diff -25%');

// 4. computePeriodSummary
const mockProducts: Product[] = [
  {
    id: 'P1',
    barcode: '123',
    name: 'Tomates',
    category: 'Légumes',
    unit: 'kg',
    brand: 'Bio',
    format: '1 kg',
    stock: 10,
    minStockAlert: 2,
    avgPurchasePrice: 2.5,
    mainStoreId: 'S1',
    notes: '',
    isActive: true
  }
];

const mockSales: Sale[] = [
  { id: 'S1', date: '2026-11-10', itemId: 'P1', itemType: 'PRODUCT', qtySold: 4, unitPrice: 5.0, location: 'Magasin' },
  { id: 'S2', date: '2026-10-20', itemId: 'P1', itemType: 'PRODUCT', qtySold: 2, unitPrice: 5.0, location: 'Magasin' }
];

const mockPurchases: Purchase[] = [
  { id: 'PU1', date: '2026-11-05', productId: 'P1', qty: 10, unit: 'kg', pricePaid: 25, unitPrice: 2.5, storeId: 'S1' },
  { id: 'PU2', date: '2026-10-15', productId: 'P1', qty: 5, unit: 'kg', pricePaid: 15, unitPrice: 3.0, storeId: 'S1' }
];

const mockProductions: Production[] = [
  { id: 'PR1', date: '2026-11-08', recipeId: 'R1', portionsProduced: 10, calculatedCost: 40 },
  { id: 'PR2', date: '2026-10-12', recipeId: 'R1', portionsProduced: 5, calculatedCost: 20 }
];

const summaryNov = computePeriodSummary(
  mockSales,
  mockPurchases,
  mockProductions,
  mockProducts,
  () => ({ costPerPortion: 3.0 }),
  { start: '2026-11-01', end: '2026-11-30' }
);

assert(summaryNov.salesRevenue === 20, 'nov salesRevenue = 4 * 5 = 20');
assert(summaryNov.costOfSales === 10, 'nov costOfSales = 4 * 2.5 = 10');
assert(summaryNov.estimatedProfit === 10, 'nov estimatedProfit = 20 - 10 = 10');
assert(summaryNov.purchasesTotal === 25, 'nov purchasesTotal = 25');
assert(summaryNov.productionsCost === 40 && summaryNov.avgProductionCost === 40, 'nov productionsCost');

// 5. computeRecipesWithProfitForPeriod
const mockRecipes: Recipe[] = [
  {
    id: 'R1',
    name: 'Quiche',
    category: 'Plat',
    description: '',
    portions: 4,
    yieldQty: 1,
    yieldUnit: 'pièce',
    stock: 2,
    isActive: true
  }
];

const mockRecipeSales: Sale[] = [
  { id: 'RS1', date: '2026-11-10', itemId: 'R1', itemType: 'RECIPE', qtySold: 2, unitPrice: 8.0, location: 'Marché' }
];

const recipesProfit = computeRecipesWithProfitForPeriod(
  mockRecipes,
  mockRecipeSales,
  { start: '2026-11-01', end: '2026-11-30' },
  () => ({ costPerPortion: 4.0, suggestedSellingPrice: 7.0 })
);

assert(recipesProfit.length === 1, 'recipesProfit length');
assert(recipesProfit[0].avgSalePrice === 8.0, 'recipesProfit avgSalePrice based on period sales');
assert(recipesProfit[0].profitUnit === 4.0, 'recipesProfit profitUnit');
assert(recipesProfit[0].marginPercent === 50, 'recipesProfit marginPercent');

// 6. generateSalesChartData
const chartData = generateSalesChartData(mockSales, { start: '2026-11-08', end: '2026-11-14' }, '7days');
assert(chartData.length === 7, '7 days chart has 7 points');
const dayWithSale = chartData.find(d => d.key === '2026-11-10');
assert(dayWithSale?.revenue === 20 && dayWithSale?.salesCount === 1, 'chart point revenue');

console.log('Tous les tests dashboardPeriod.ts ont réussi avec succès !');
