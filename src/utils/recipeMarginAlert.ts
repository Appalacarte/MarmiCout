import type { Recipe, RecipeIngredient, Product, Sale } from '../types/index.ts';
import type { DateRange } from './dashboardPeriod.ts';
import { isDateInRange } from './dashboardPeriod.ts';
import { convertUnitsWithInfo } from './units.ts';

export interface HeaviestIngredientInfo {
  name: string;
  cost: number; // coût total de cet ingrédient dans la recette
  costPerPortion: number; // coût ramené à la portion
  percentOfTotalCost: number; // % du coût total de la recette
}

export interface RecipeBelowTargetMargin {
  recipe: Recipe;
  currentMargin: number; // Marge observée en %
  targetMargin: number; // Marge cible configurée en %
  costPerPortion: number; // Coût de revient par portion
  observedSellingPrice: number; // Prix de vente constaté
  suggestedSellingPrice: number; // Prix de vente conseillé pour retrouver la marge cible
  priceGap: number; // suggestedSellingPrice - observedSellingPrice
  marginGap: number; // targetMargin - currentMargin
  heaviestIngredient: HeaviestIngredientInfo | null;
}

/**
 * Calcule le prix de vente conseillé pour atteindre une marge cible donnée.
 * Formule : Prix = Coût / (1 - (Marge / 100))
 */
export function calculateSuggestedSellingPrice(costPerPortion: number, targetMargin: number): number {
  if (!Number.isFinite(costPerPortion) || costPerPortion <= 0) return 0;
  if (targetMargin >= 100) return Number((costPerPortion * 2).toFixed(2));
  if (targetMargin <= 0) return Number(costPerPortion.toFixed(2));
  const price = costPerPortion / (1 - (targetMargin / 100));
  return Number(price.toFixed(2));
}

/**
 * Détermine l'ingrédient qui pèse le plus lourd dans le coût d'une recette.
 */
export function getHeaviestIngredient(
  recipeId: string,
  recipePortions: number,
  allIngredients: RecipeIngredient[],
  products: Product[],
  totalRecipeCost: number
): HeaviestIngredientInfo | null {
  const ingredients = allIngredients.filter(i => i.recipeId === recipeId);
  if (ingredients.length === 0) return null;

  let maxCost = -1;
  let heaviest: HeaviestIngredientInfo | null = null;
  const portions = recipePortions > 0 ? recipePortions : 1;

  for (const ing of ingredients) {
    let ingCost = 0;
    let ingName = ing.customName || 'Ingrédient sans nom';

    if (ing.productId) {
      const prod = products.find(p => p.id === ing.productId);
      if (prod) {
        ingName = prod.name;
        const conv = convertUnitsWithInfo(ing.qtyUsed, ing.unit, prod.unit);
        if (conv.value !== null) {
          ingCost = conv.value * prod.avgPurchasePrice;
        }
      }
    } else if (ing.customCostPerUnit) {
      ingCost = ing.qtyUsed * ing.customCostPerUnit;
    }

    if (ingCost > maxCost) {
      maxCost = ingCost;
      const percent = totalRecipeCost > 0 ? (ingCost / totalRecipeCost) * 100 : 0;
      heaviest = {
        name: ingName,
        cost: Number(ingCost.toFixed(2)),
        costPerPortion: Number((ingCost / portions).toFixed(2)),
        percentOfTotalCost: Number(percent.toFixed(1))
      };
    }
  }

  return heaviest;
}

export interface GetRecipesBelowTargetMarginParams {
  recipes: Recipe[];
  sales: Sale[];
  ingredients: RecipeIngredient[];
  products: Product[];
  targetMargin: number;
  calculateRecipeCost: (recipeId: string) => {
    costPerPortion: number;
    suggestedSellingPrice: number;
    totalCost: number;
  };
  periodRange?: DateRange | null;
}

/**
 * Liste les recettes passées sous la marge cible, avec :
 * - l'ingrédient qui pèse le plus dans le coût
 * - le prix de vente conseillé pour retrouver la marge cible
 */
export function getRecipesBelowTargetMargin({
  recipes,
  sales,
  ingredients,
  products,
  targetMargin,
  calculateRecipeCost,
  periodRange = null
}: GetRecipesBelowTargetMarginParams): RecipeBelowTargetMargin[] {
  const activeRecipes = recipes.filter(r => r.isActive);
  const results: RecipeBelowTargetMargin[] = [];

  for (const recipe of activeRecipes) {
    const costInfo = calculateRecipeCost(recipe.id);
    if (!costInfo || costInfo.costPerPortion <= 0) continue;

    // 1. Déterminer le prix de vente constaté
    // Priorité aux ventes dans la période sélectionnée
    const periodRecipeSales = sales.filter(
      s => s.itemType === 'RECIPE' && s.itemId === recipe.id && isDateInRange(s.date, periodRange)
    );

    let observedSellingPrice = 0;
    if (periodRecipeSales.length > 0) {
      const totalRev = periodRecipeSales.reduce((acc, s) => acc + s.qtySold * s.unitPrice, 0);
      const totalQty = periodRecipeSales.reduce((acc, s) => acc + s.qtySold, 0);
      observedSellingPrice = totalQty > 0 ? totalRev / totalQty : 0;
    } else {
      // Si aucune vente dans la période, rechercher dans l'historique complet des ventes de la recette
      const allRecipeSales = sales
        .filter(s => s.itemType === 'RECIPE' && s.itemId === recipe.id)
        .sort((a, b) => b.date.localeCompare(a.date));

      if (allRecipeSales.length > 0) {
        const totalRev = allRecipeSales.reduce((acc, s) => acc + s.qtySold * s.unitPrice, 0);
        const totalQty = allRecipeSales.reduce((acc, s) => acc + s.qtySold, 0);
        observedSellingPrice = totalQty > 0 ? totalRev / totalQty : 0;
      }
    }

    // Si aucune vente enregistrée, la recette n'a pas de prix effectif sous la marge
    if (observedSellingPrice <= 0) continue;

    // 2. Calculer la marge actuelle constatée
    const currentMargin = Number((((observedSellingPrice - costInfo.costPerPortion) / observedSellingPrice) * 100).toFixed(1));

    // 3. Vérifier si la recette est passée sous la marge cible
    if (currentMargin < targetMargin) {
      const heaviestIngredient = getHeaviestIngredient(
        recipe.id,
        recipe.portions,
        ingredients,
        products,
        costInfo.totalCost
      );

      const suggestedSellingPrice = calculateSuggestedSellingPrice(costInfo.costPerPortion, targetMargin);
      const priceGap = Number((suggestedSellingPrice - observedSellingPrice).toFixed(2));
      const marginGap = Number((targetMargin - currentMargin).toFixed(1));

      results.push({
        recipe,
        currentMargin,
        targetMargin,
        costPerPortion: Number(costInfo.costPerPortion.toFixed(2)),
        observedSellingPrice: Number(observedSellingPrice.toFixed(2)),
        suggestedSellingPrice,
        priceGap,
        marginGap,
        heaviestIngredient
      });
    }
  }

  // Trier par marge la plus faible en premier (urgence maximale)
  return results.sort((a, b) => a.currentMargin - b.currentMargin);
}
