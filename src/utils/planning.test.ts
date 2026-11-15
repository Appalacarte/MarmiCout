import {
  getMondayOfWeek,
  getWeekDays,
  getWeekRangeLabel,
  calculateWeekFinancials,
  calculateWeekRequirements,
  prepareShoppingSelections,
} from './planning.ts';
import type { PlannedRecipe, Recipe, RecipeIngredient, Product } from '../types/index.ts';

function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(`${message ? message + ' : ' : ''}Attendu ${expected}, reçu ${actual}`);
  }
}

console.log('=== Tests unitaires src/utils/planning.ts ===');

// 1. Tests des dates et de la semaine
const wednesday = new Date(2026, 10, 18); // 18 novembre 2026 (Mercredi)
const monday = getMondayOfWeek(wednesday);
assertEqual(monday.getDate(), 16, 'Lundi doit être le 16 novembre');
assertEqual(monday.getMonth(), 10, 'Mois de novembre');

const sunday = new Date(2026, 10, 22); // Dimanche
const mondayFromSunday = getMondayOfWeek(sunday);
assertEqual(mondayFromSunday.getDate(), 16, 'Le dimanche 22 appartient à la semaine du lundi 16');

const weekDays = getWeekDays(wednesday);
assertEqual(weekDays.length, 7, 'Une semaine doit compter 7 jours');
assertEqual(weekDays[0].dayName, 'Lundi');
assertEqual(weekDays[0].date, '2026-11-16');
assertEqual(weekDays[6].dayName, 'Dimanche');
assertEqual(weekDays[6].date, '2026-11-22');

const rangeLabel = getWeekRangeLabel(wednesday);
assert(rangeLabel.includes('16'), 'Le libellé inclut le 16');
assert(rangeLabel.includes('22'), 'Le libellé inclut le 22');
assert(rangeLabel.includes('novembre'), 'Le libellé inclut novembre');
console.log('✅ PASS : Fonctions de calendrier hebdomadaire (getMondayOfWeek, getWeekDays, getWeekRangeLabel)');

// 2. Tests financiers (calculateWeekFinancials)
const dummyRecipes: Recipe[] = [
  { id: 'R1', name: 'Tarte aux Pommes', category: 'Tarte', description: '', portions: 8, yieldQty: 1, yieldUnit: 'pièce', stock: 0, isActive: true },
  { id: 'R2', name: 'Soupe Potiron', category: 'Soupe', description: '', portions: 4, yieldQty: 1, yieldUnit: 'l', stock: 0, isActive: true },
];

const mockCostCalculator = (recipeId: string) => {
  if (recipeId === 'R1') {
    return { costPerPortion: 1.5, suggestedSellingPrice: 4.5 };
  }
  return { costPerPortion: 1.0, suggestedSellingPrice: 3.0 };
};

const dummyPlanned: PlannedRecipe[] = [
  { id: 'PL1', date: '2026-11-16', recipeId: 'R1', portions: 8, isDone: false }, // Coût: 12, CA: 36
  { id: 'PL2', date: '2026-11-17', recipeId: 'R2', portions: 4, isDone: true },  // Coût: 4, CA: 12
  { id: 'PL3', date: '2026-11-19', recipeId: 'R1', portions: 4, isDone: false }, // Coût: 6, CA: 18
];

const financials = calculateWeekFinancials(dummyPlanned, dummyRecipes, mockCostCalculator);
assertEqual(financials.totalCount, 3);
assertEqual(financials.completedCount, 1);
assertEqual(financials.totalPortions, 16);
assertEqual(financials.completedPortions, 4);
assertEqual(financials.totalCost, 22.0, '12 + 4 + 6 = 22');
assertEqual(financials.totalPotentialRevenue, 66.0, '36 + 12 + 18 = 66');
assertEqual(financials.totalGrossMargin, 44.0, '66 - 22 = 44');
assertEqual(financials.marginPercent, 66.7, '44 / 66 = ~66.7%');
console.log('✅ PASS : Indicateurs financiers prévisionnels (coût de revient prévu, CA potentiel et marge)');

// 3. Tests des besoins en ingrédients et stocks manquants
const dummyProducts: Product[] = [
  { id: 'P1', barcode: '', name: 'Pommes Golden', category: 'Fruits', unit: 'kg', brand: '', format: '', stock: 2.0, minStockAlert: 1, avgPurchasePrice: 2.5, mainStoreId: '', notes: '', isActive: true },
  { id: 'P2', barcode: '', name: 'Beurre Doux', category: 'Frais', unit: 'kg', brand: '', format: '', stock: 0.1, minStockAlert: 0.5, avgPurchasePrice: 8.0, mainStoreId: '', notes: '', isActive: true },
  { id: 'P3', barcode: '', name: 'Potiron', category: 'Légumes', unit: 'kg', brand: '', format: '', stock: 5.0, minStockAlert: 1, avgPurchasePrice: 1.5, mainStoreId: '', notes: '', isActive: true },
];

const dummyIngredients: RecipeIngredient[] = [
  // R1 (8 portions) : 1 kg de pommes, 200 g de beurre
  { id: 'RI1', recipeId: 'R1', productId: 'P1', qtyUsed: 1.0, unit: 'kg' },
  { id: 'RI2', recipeId: 'R1', productId: 'P2', qtyUsed: 200, unit: 'g' },
  // R2 (4 portions) : 1 kg de potiron
  { id: 'RI3', recipeId: 'R2', productId: 'P3', qtyUsed: 1.0, unit: 'kg' },
];

const reqs = calculateWeekRequirements(dummyPlanned, dummyRecipes, dummyIngredients, dummyProducts);
assertEqual(reqs.items.length, 3, '3 ingrédients distincts');
assertEqual(reqs.missingCount, 1, '1 ingrédient manquant (beurre)');
assertEqual(reqs.hasMissing, true);
assertEqual(reqs.totalMissingCost, 1.6);

const butterItem = reqs.items.find((i) => i.name === 'Beurre Doux');
assert(butterItem !== undefined, 'Beurre trouvé');
assertEqual(butterItem.isMissing, true);
assertEqual(butterItem.missingQty, 0.2);
assertEqual(butterItem.requiredQty, 0.3);

const appleItem = reqs.items.find((i) => i.name === 'Pommes Golden');
assert(appleItem !== undefined, 'Pommes trouvées');
assertEqual(appleItem.isMissing, false);
assertEqual(appleItem.requiredQty, 1.5);
assertEqual(appleItem.missingQty, 0);

console.log('✅ PASS : Calcul des besoins en ingrédients, détection des ruptures de stock et valorisation');

// 4. Tests de la préparation pour ShoppingListDrawer
const selections = prepareShoppingSelections(dummyPlanned, dummyRecipes);
assertEqual(selections.length, 2, '2 recettes distinctes');
const r1Sel = selections.find((s) => s.recipe.id === 'R1');
assert(r1Sel !== undefined);
assertEqual(r1Sel.portions, 12, '8 + 4 = 12 portions pour R1');

const r2Sel = selections.find((s) => s.recipe.id === 'R2');
assert(r2Sel !== undefined);
assertEqual(r2Sel.portions, 4, '4 portions pour R2');
console.log('✅ PASS : Agrégation des recettes de la semaine pour la liste de courses');

console.log('Tous les tests planning.ts ont réussi avec succès !');
