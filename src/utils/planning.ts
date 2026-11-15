import type { PlannedRecipe, Recipe, RecipeIngredient, Product } from '../types/index.ts';
import { convertUnits, normalizeUnit } from './units.ts';

export interface WeekDay {
  date: string; // 'YYYY-MM-DD'
  dayName: string; // 'Lundi', 'Mardi', etc.
  shortDate: string; // '16 nov.'
  dayNumber: number; // 16
  monthName: string; // 'novembre'
  isToday: boolean;
}

export interface WeekFinancials {
  totalCount: number;
  completedCount: number;
  totalPortions: number;
  completedPortions: number;
  totalCost: number; // Coût de revient prévu total
  totalPotentialRevenue: number; // Chiffre d'affaires potentiel total
  totalGrossMargin: number; // Marge brute prévisionnelle (CA - Coût)
  marginPercent: number; // Taux de marge prévisionnelle
}

export interface WeekRequirementItem {
  id: string; // productId ou customName
  productId?: string;
  name: string;
  category: string;
  requiredQty: number;
  unit: string;
  availableStock: number;
  stockUnit: string;
  missingQty: number;
  isMissing: boolean;
  unitPrice: number;
  estimatedMissingCost: number;
  hasIncompatibleUnit: boolean;
  recipesUsing: { recipeName: string; portions: number }[];
}

export interface WeekRequirementsResult {
  items: WeekRequirementItem[];
  missingCount: number;
  totalMissingCost: number;
  hasMissing: boolean;
}

/**
 * Calcule la date du lundi de la semaine pour une date donnée
 */
export function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Dimanche, 1 = Lundi, ...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Retourne le numéro de semaine ISO 8601
 */
export function getWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Formate une date en chaîne ISO YYYY-MM-DD locale (sans décalage UTC)
 */
export function formatDateToISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

/**
 * Retourne les 7 jours de la semaine (du Lundi au Dimanche)
 */
export function getWeekDays(baseDate: Date): WeekDay[] {
  const monday = getMondayOfWeek(baseDate);
  const todayISO = formatDateToISO(new Date());

  const days: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);

    const iso = formatDateToISO(current);
    const dayName = DAY_NAMES[current.getDay()];
    const dayNumber = current.getDate();
    const monthShort = MONTH_NAMES[current.getMonth()].slice(0, 4) + '.';
    const monthName = MONTH_NAMES[current.getMonth()];

    days.push({
      date: iso,
      dayName,
      shortDate: `${dayNumber} ${monthShort}`,
      dayNumber,
      monthName,
      isToday: iso === todayISO,
    });
  }

  return days;
}

/**
 * Libellé complet de la semaine (ex: "Semaine 46 • 16 au 22 novembre 2026")
 */
export function getWeekRangeLabel(baseDate: Date): string {
  const days = getWeekDays(baseDate);
  const first = days[0];
  const last = days[6];
  const weekNo = getWeekNumber(new Date(first.date));

  const firstDate = new Date(first.date);
  const lastDate = new Date(last.date);

  if (firstDate.getMonth() === lastDate.getMonth()) {
    return `Semaine ${weekNo} • ${first.dayNumber} au ${last.dayNumber} ${first.monthName} ${firstDate.getFullYear()}`;
  }
  return `Semaine ${weekNo} • ${first.dayNumber} ${first.monthName} au ${last.dayNumber} ${last.monthName} ${lastDate.getFullYear()}`;
}

/**
 * Calcule les indicateurs financiers prévisionnels de la semaine (Coût prévu & CA potentiel)
 */
export function calculateWeekFinancials(
  plannedItems: PlannedRecipe[],
  recipes: Recipe[],
  costCalculator: (recipeId: string) => { costPerPortion: number; suggestedSellingPrice: number }
): WeekFinancials {
  let totalCost = 0;
  let totalPotentialRevenue = 0;
  let totalPortions = 0;
  let completedPortions = 0;
  let completedCount = 0;

  const recipeMap = new Map<string, Recipe>(recipes.map((r) => [r.id, r]));

  plannedItems.forEach((item) => {
    const recipe = recipeMap.get(item.recipeId);
    if (!recipe) return;

    const portions = Number(item.portions || 0);
    totalPortions += portions;
    if (item.isDone) {
      completedCount += 1;
      completedPortions += portions;
    }

    const costInfo = costCalculator(recipe.id);
    const costForThis = costInfo.costPerPortion * portions;
    const revForThis = costInfo.suggestedSellingPrice * portions;

    totalCost += costForThis;
    totalPotentialRevenue += revForThis;
  });

  const totalGrossMargin = totalPotentialRevenue - totalCost;
  const marginPercent =
    totalPotentialRevenue > 0
      ? Number(((totalGrossMargin / totalPotentialRevenue) * 100).toFixed(1))
      : 0;

  return {
    totalCount: plannedItems.length,
    completedCount,
    totalPortions,
    completedPortions,
    totalCost: Number(totalCost.toFixed(2)),
    totalPotentialRevenue: Number(totalPotentialRevenue.toFixed(2)),
    totalGrossMargin: Number(totalGrossMargin.toFixed(2)),
    marginPercent,
  };
}

/**
 * Calcule les besoins totaux en ingrédients de la semaine et les écarts par rapport au stock
 */
export function calculateWeekRequirements(
  plannedItems: PlannedRecipe[],
  recipes: Recipe[],
  allIngredients: RecipeIngredient[],
  products: Product[]
): WeekRequirementsResult {
  const recipeMap = new Map<string, Recipe>(recipes.map((r) => [r.id, r]));
  const productMap = new Map<string, Product>(products.map((p) => [p.id, p]));

  // Regroupement par ingrédient : clé = productId OU customName
  const groupMap = new Map<
    string,
    {
      productId?: string;
      name: string;
      category: string;
      requiredQty: number;
      unit: string;
      hasIncompatibleUnit: boolean;
      customCostPerUnit: number;
      recipesUsing: Map<string, { recipeName: string; portions: number }>;
    }
  >();

  plannedItems.forEach((item) => {
    const recipe = recipeMap.get(item.recipeId);
    if (!recipe) return;

    const recipePortions = recipe.portions > 0 ? recipe.portions : 1;
    const factor = (Number(item.portions) || 0) / recipePortions;
    const ingredients = allIngredients.filter((ri) => ri.recipeId === recipe.id);

    ingredients.forEach((ing) => {
      const prod = ing.productId ? productMap.get(ing.productId) : undefined;
      const key = ing.productId ? `prod_${ing.productId}` : `custom_${(ing.customName || 'Ingrédient').trim().toLowerCase()}`;
      const name = prod ? prod.name : (ing.customName || 'Ingrédient');
      const category = prod ? prod.category : 'Autre';

      let qtyNeededInStockUnit: number = ing.qtyUsed * factor;
      let displayUnit = ing.unit;
      let hasIncompatible = false;

      if (prod) {
        displayUnit = prod.unit;
        const converted = convertUnits(ing.qtyUsed * factor, ing.unit, prod.unit, prod);
        if (converted === null) {
          hasIncompatible = true;
          qtyNeededInStockUnit = ing.qtyUsed * factor;
          displayUnit = ing.unit;
        } else {
          qtyNeededInStockUnit = converted;
        }
      }

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          productId: ing.productId,
          name,
          category,
          requiredQty: 0,
          unit: displayUnit,
          hasIncompatibleUnit: false,
          customCostPerUnit: Number(ing.customCostPerUnit || 0),
          recipesUsing: new Map(),
        });
      }

      const grp = groupMap.get(key)!;
      grp.requiredQty += qtyNeededInStockUnit;
      if (hasIncompatible) grp.hasIncompatibleUnit = true;

      const existingRecipe = grp.recipesUsing.get(recipe.id);
      if (existingRecipe) {
        existingRecipe.portions += Number(item.portions) || 0;
      } else {
        grp.recipesUsing.set(recipe.id, {
          recipeName: recipe.name,
          portions: Number(item.portions) || 0,
        });
      }
    });
  });

  const items: WeekRequirementItem[] = [];
  let totalMissingCost = 0;
  let missingCount = 0;

  groupMap.forEach((grp, key) => {
    const prod = grp.productId ? productMap.get(grp.productId) : undefined;
    const availableStock = prod ? prod.stock : 0;
    const stockUnit = prod ? prod.unit : grp.unit;
    const unitPrice = prod ? prod.avgPurchasePrice : grp.customCostPerUnit;

    const requiredQty = Number(grp.requiredQty.toFixed(3));
    const missingQty = Math.max(0, Number((requiredQty - availableStock).toFixed(3)));
    const isMissing = missingQty > 0.0001;

    let estimatedMissingCost = 0;
    if (isMissing) {
      missingCount += 1;
      estimatedMissingCost = Number((missingQty * unitPrice).toFixed(2));
      totalMissingCost += estimatedMissingCost;
    }

    items.push({
      id: key,
      productId: grp.productId,
      name: grp.name,
      category: grp.category,
      requiredQty,
      unit: normalizeUnit(grp.unit) || grp.unit,
      availableStock,
      stockUnit: normalizeUnit(stockUnit) || stockUnit,
      missingQty,
      isMissing,
      unitPrice,
      estimatedMissingCost,
      hasIncompatibleUnit: grp.hasIncompatibleUnit,
      recipesUsing: Array.from(grp.recipesUsing.values()),
    });
  });

  // Trier : ingrédients manquants d'abord, puis par nom
  items.sort((a, b) => {
    if (a.isMissing && !b.isMissing) return -1;
    if (!a.isMissing && b.isMissing) return 1;
    return a.name.localeCompare(b.name, 'fr');
  });

  return {
    items,
    missingCount,
    totalMissingCost: Number(totalMissingCost.toFixed(2)),
    hasMissing: missingCount > 0,
  };
}

/**
 * Agrège les recettes planifiées de la semaine pour les transmettre au composant existant ShoppingListDrawer
 */
export function prepareShoppingSelections(
  plannedItems: PlannedRecipe[],
  recipes: Recipe[]
): { recipe: Recipe; portions: number }[] {
  const recipeMap = new Map<string, Recipe>(recipes.map((r) => [r.id, r]));
  const portionsByRecipe = new Map<string, number>();

  plannedItems.forEach((item) => {
    const current = portionsByRecipe.get(item.recipeId) || 0;
    portionsByRecipe.set(item.recipeId, current + (Number(item.portions) || 0));
  });

  const selections: { recipe: Recipe; portions: number }[] = [];
  portionsByRecipe.forEach((portions, recipeId) => {
    const recipe = recipeMap.get(recipeId);
    if (recipe && portions > 0) {
      selections.push({ recipe, portions });
    }
  });

  return selections;
}
