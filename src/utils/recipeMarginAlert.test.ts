import { 
  calculateSuggestedSellingPrice, 
  getHeaviestIngredient, 
  getRecipesBelowTargetMargin 
} from './recipeMarginAlert.ts';
import type { Recipe, RecipeIngredient, Product, Sale } from '../types/index.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`❌ ÉCHEC : ${msg}`);
  } else {
    console.log(`✅ PASS : ${msg}`);
  }
}

// 1. calculateSuggestedSellingPrice
// Coût = 4.00 €, Marge cible = 60 % -> Prix = 4 / (1 - 0.6) = 10.00 €
assert(calculateSuggestedSellingPrice(4.0, 60) === 10.0, 'prix conseillé 60% pour coût 4.0');
// Coût = 2.00 €, Marge cible = 50 % -> Prix = 2 / 0.5 = 4.00 €
assert(calculateSuggestedSellingPrice(2.0, 50) === 4.0, 'prix conseillé 50% pour coût 2.0');
assert(calculateSuggestedSellingPrice(0, 60) === 0, 'coût 0 renvoie 0');

// 2. getHeaviestIngredient
const mockProducts: Product[] = [
  { id: 'P_BOEUF', barcode: '1', name: 'Bœuf braisé', category: 'Viande', unit: 'kg', brand: '', format: '', stock: 10, minStockAlert: 2, avgPurchasePrice: 15.0, mainStoreId: '', notes: '', isActive: true },
  { id: 'P_CAROTTE', barcode: '2', name: 'Carottes', category: 'Légume', unit: 'kg', brand: '', format: '', stock: 10, minStockAlert: 2, avgPurchasePrice: 1.5, mainStoreId: '', notes: '', isActive: true },
  { id: 'P_OIGNON', barcode: '3', name: 'Oignons', category: 'Légume', unit: 'g', brand: '', format: '', stock: 5000, minStockAlert: 1000, avgPurchasePrice: 0.002, mainStoreId: '', notes: '', isActive: true }
];

const mockIngredients: RecipeIngredient[] = [
  // 1 kg de boeuf = 15 €
  { id: 'I1', recipeId: 'R_BOURGUIGNON', productId: 'P_BOEUF', qtyUsed: 1.0, unit: 'kg' },
  // 2 kg de carottes = 3 €
  { id: 'I2', recipeId: 'R_BOURGUIGNON', productId: 'P_CAROTTE', qtyUsed: 2.0, unit: 'kg' },
  // 500 g d'oignons = 1 €
  { id: 'I3', recipeId: 'R_BOURGUIGNON', productId: 'P_OIGNON', qtyUsed: 500, unit: 'g' }
];

const totalCost = 15.0 + 3.0 + 1.0; // 19.0 € pour 4 portions = 4.75 €/portion
const heaviest = getHeaviestIngredient('R_BOURGUIGNON', 4, mockIngredients, mockProducts, totalCost);
assert(heaviest !== null, 'ingrédient principal trouvé');
assert(heaviest?.name === 'Bœuf braisé', 'nom ingrédient principal');
assert(heaviest?.cost === 15.0, 'coût ingrédient principal 15€');
assert(heaviest?.costPerPortion === 3.75, 'coût par portion 3.75€');
assert(heaviest?.percentOfTotalCost === 78.9, 'pourcentage du coût ~78.9%');

// 3. getRecipesBelowTargetMargin
const mockRecipes: Recipe[] = [
  { id: 'R_BOURGUIGNON', name: 'Bœuf Bourguignon', category: 'Plat', description: '', portions: 4, yieldQty: 4, yieldUnit: 'portion', stock: 5, isActive: true },
  { id: 'R_TARTE', name: 'Tarte Pommes', category: 'Dessert', description: '', portions: 8, yieldQty: 1, yieldUnit: 'pièce', stock: 2, isActive: true }
];

// Vente de boeuf bourguignon à 8 € par portion.
// Avec un coût de 4.75 €/portion, marge = (8 - 4.75) / 8 = 40.6 % (< 60 %)
// Vente de tarte à 25 € la tarte. Coût = 6.00 €, marge = 76 % (>= 60 %)
const mockSales: Sale[] = [
  { id: 'S1', date: '2026-11-10', itemId: 'R_BOURGUIGNON', itemType: 'RECIPE', qtySold: 4, unitPrice: 8.0, location: '' },
  { id: 'S2', date: '2026-11-12', itemId: 'R_TARTE', itemType: 'RECIPE', qtySold: 1, unitPrice: 25.0, location: '' }
];

const mockCalculateCost = (recipeId: string) => {
  if (recipeId === 'R_BOURGUIGNON') {
    return { costPerPortion: 4.75, totalCost: 19.0, suggestedSellingPrice: 11.88 };
  }
  return { costPerPortion: 6.0, totalCost: 6.0, suggestedSellingPrice: 15.0 };
};

const lowMargin = getRecipesBelowTargetMargin({
  recipes: mockRecipes,
  sales: mockSales,
  ingredients: mockIngredients,
  products: mockProducts,
  targetMargin: 60,
  calculateRecipeCost: mockCalculateCost,
  periodRange: null
});

assert(lowMargin.length === 1, 'une seule recette sous la marge cible');
assert(lowMargin[0].recipe.id === 'R_BOURGUIGNON', 'la recette est le Bœuf Bourguignon');
assert(lowMargin[0].currentMargin === 40.6, 'marge actuelle 40.6%');
assert(lowMargin[0].suggestedSellingPrice === 11.88, 'prix conseillé 11.88 €');
assert(lowMargin[0].heaviestIngredient?.name === 'Bœuf braisé', 'ingrédient principal bien identifié');

console.log('Tous les tests recipeMarginAlert.ts ont réussi avec succès !');
