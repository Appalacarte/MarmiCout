import {
  Product,
  Purchase,
  Store,
  Recipe,
  RecipeIngredient,
  RecipePackaging,
  Production,
  Sale,
  StockMovement,
  Settings
} from '../../types';

import {
  DEMO_SETTINGS,
  DEMO_STORES,
  DEMO_PRODUCTS,
  DEMO_RECIPES,
  DEMO_RECIPE_INGREDIENTS,
  DEMO_RECIPE_PACKAGING,
  DEMO_PURCHASES,
  DEMO_PRODUCTIONS,
  DEMO_SALES,
  DEMO_STOCK_MOVEMENTS
} from '../data/demoMockData';

// Clés spécifiques et isolées pour la démo
const DEMO_KEYS = {
  SETTINGS: 'marmicout_demo_settings',
  STORES: 'marmicout_demo_stores',
  PRODUCTS: 'marmicout_demo_products',
  PURCHASES: 'marmicout_demo_purchases',
  RECIPES: 'marmicout_demo_recipes',
  RECIPE_INGREDIENTS: 'marmicout_demo_recipe_ingredients',
  RECIPE_PACKAGING: 'marmicout_demo_recipe_packaging',
  PRODUCTIONS: 'marmicout_demo_productions',
  SALES: 'marmicout_demo_sales',
  STOCK_MOVEMENTS: 'marmicout_demo_stock_movements'
};

// Callback pour notifier l'interface d'une tentative d'écriture
type ReadOnlyCallback = (actionDescription: string) => void;
let readOnlyNotifier: ReadOnlyCallback | null = null;

export const setDemoReadOnlyNotifier = (callback: ReadOnlyCallback | null) => {
  readOnlyNotifier = callback;
};

export const notifyReadOnlyBlocked = (action: string = 'Cette action') => {
  if (readOnlyNotifier) {
    readOnlyNotifier(action);
  }
};

// Conversions d'unités (identique à la prod)
export function convertUnits(qty: number, fromUnit: string, toUnit: string): number {
  const f = fromUnit.trim().toLowerCase();
  const t = toUnit.trim().toLowerCase();
  if (f === t) return qty;

  // Conversions masse (base kg)
  if (f === 'g' && t === 'kg') return qty / 1000;
  if (f === 'kg' && t === 'g') return qty * 1000;

  // Conversions volume (base l)
  if (f === 'ml' && t === 'l') return qty / 1000;
  if (f === 'l' && t === 'ml') return qty * 1000;
  if (f === 'cl' && t === 'l') return qty / 100;
  if (f === 'l' && t === 'cl') return qty * 100;
  if (f === 'cl' && t === 'ml') return qty * 10;
  if (f === 'ml' && t === 'cl') return qty / 10;

  return qty;
}

// Initialisation de la base démo dans le LocalStorage dédié
const initDemoDB = () => {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(DEMO_KEYS.SETTINGS)) {
    localStorage.setItem(DEMO_KEYS.SETTINGS, JSON.stringify(DEMO_SETTINGS));
    localStorage.setItem(DEMO_KEYS.STORES, JSON.stringify(DEMO_STORES));
    localStorage.setItem(DEMO_KEYS.PRODUCTS, JSON.stringify(DEMO_PRODUCTS));
    localStorage.setItem(DEMO_KEYS.PURCHASES, JSON.stringify(DEMO_PURCHASES));
    localStorage.setItem(DEMO_KEYS.RECIPES, JSON.stringify(DEMO_RECIPES));
    localStorage.setItem(DEMO_KEYS.RECIPE_INGREDIENTS, JSON.stringify(DEMO_RECIPE_INGREDIENTS));
    localStorage.setItem(DEMO_KEYS.RECIPE_PACKAGING, JSON.stringify(DEMO_RECIPE_PACKAGING));
    localStorage.setItem(DEMO_KEYS.PRODUCTIONS, JSON.stringify(DEMO_PRODUCTIONS));
    localStorage.setItem(DEMO_KEYS.SALES, JSON.stringify(DEMO_SALES));
    localStorage.setItem(DEMO_KEYS.STOCK_MOVEMENTS, JSON.stringify(DEMO_STOCK_MOVEMENTS));
  }
};

initDemoDB();

function getDemoTable<T>(key: string, fallback: T[]): T[] {
  initDemoDB();
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

export const demoDbService = {
  // Réinitialiser les données de démo aux valeurs d'origine
  resetToDefault(): void {
    initDemoDB();
    localStorage.setItem(DEMO_KEYS.SETTINGS, JSON.stringify(DEMO_SETTINGS));
    localStorage.setItem(DEMO_KEYS.STORES, JSON.stringify(DEMO_STORES));
    localStorage.setItem(DEMO_KEYS.PRODUCTS, JSON.stringify(DEMO_PRODUCTS));
    localStorage.setItem(DEMO_KEYS.PURCHASES, JSON.stringify(DEMO_PURCHASES));
    localStorage.setItem(DEMO_KEYS.RECIPES, JSON.stringify(DEMO_RECIPES));
    localStorage.setItem(DEMO_KEYS.RECIPE_INGREDIENTS, JSON.stringify(DEMO_RECIPE_INGREDIENTS));
    localStorage.setItem(DEMO_KEYS.RECIPE_PACKAGING, JSON.stringify(DEMO_RECIPE_PACKAGING));
    localStorage.setItem(DEMO_KEYS.PRODUCTIONS, JSON.stringify(DEMO_PRODUCTIONS));
    localStorage.setItem(DEMO_KEYS.SALES, JSON.stringify(DEMO_SALES));
    localStorage.setItem(DEMO_KEYS.STOCK_MOVEMENTS, JSON.stringify(DEMO_STOCK_MOVEMENTS));
  },

  // --- PARAMÈTRES (SETTINGS) ---
  getSettings(): Settings {
    initDemoDB();
    try {
      const data = localStorage.getItem(DEMO_KEYS.SETTINGS);
      return data ? JSON.parse(data) : DEMO_SETTINGS;
    } catch {
      return DEMO_SETTINGS;
    }
  },

  saveSettings(_settings: Settings): void {
    // Verrouillé en lecture seule
    notifyReadOnlyBlocked('La modification des paramètres');
  },

  // --- MAGASINS (STORES) ---
  getStores(): Store[] {
    return getDemoTable<Store>(DEMO_KEYS.STORES, DEMO_STORES);
  },

  getStore(id: string): Store | undefined {
    return this.getStores().find(s => s.id === id);
  },

  saveStore(_store: Store): void {
    notifyReadOnlyBlocked("L'enregistrement de fournisseur");
  },

  deleteStore(_id: string): void {
    notifyReadOnlyBlocked('La suppression de fournisseur');
  },

  // --- PRODUITS (PRODUCTS) ---
  getProducts(): Product[] {
    return getDemoTable<Product>(DEMO_KEYS.PRODUCTS, DEMO_PRODUCTS);
  },

  getProduct(id: string): Product | undefined {
    return this.getProducts().find(p => p.id === id);
  },

  getProductByBarcode(barcode: string): Product | undefined {
    if (!barcode.trim()) return undefined;
    return this.getProducts().find(p => p.barcode === barcode.trim());
  },

  saveProduct(_product: Product): void {
    notifyReadOnlyBlocked("L'enregistrement de produit");
  },

  deleteProduct(_id: string): void {
    notifyReadOnlyBlocked('La suppression de produit');
  },

  updateProductStock(_id: string, _qtyChange: number): void {
    notifyReadOnlyBlocked('La modification de stock');
  },

  // --- ACHATS (PURCHASES) ---
  getPurchases(): Purchase[] {
    return getDemoTable<Purchase>(DEMO_KEYS.PURCHASES, DEMO_PURCHASES);
  },

  savePurchase(_purchase: Purchase): void {
    notifyReadOnlyBlocked("L'ajout d'achat");
  },

  deletePurchase(_id: string): void {
    notifyReadOnlyBlocked("La suppression d'achat");
  },

  // --- RECETTES (RECIPES) ---
  getRecipes(): Recipe[] {
    return getDemoTable<Recipe>(DEMO_KEYS.RECIPES, DEMO_RECIPES);
  },

  getRecipe(id: string): Recipe | undefined {
    return this.getRecipes().find(r => r.id === id);
  },

  getRecipeIngredients(recipeId: string): RecipeIngredient[] {
    return getDemoTable<RecipeIngredient>(DEMO_KEYS.RECIPE_INGREDIENTS, DEMO_RECIPE_INGREDIENTS)
      .filter(ri => ri.recipeId === recipeId);
  },

  getRecipePackagings(recipeId: string): RecipePackaging[] {
    return getDemoTable<RecipePackaging>(DEMO_KEYS.RECIPE_PACKAGING, DEMO_RECIPE_PACKAGING)
      .filter(rp => rp.recipeId === recipeId);
  },

  saveRecipe(_recipe: Recipe, _ingredients: RecipeIngredient[], _packaging: RecipePackaging[]): void {
    notifyReadOnlyBlocked("L'enregistrement de fiche technique / recette");
  },

  deleteRecipe(_id: string): void {
    notifyReadOnlyBlocked('La suppression de recette');
  },

  // --- CALCUL DU COÛT DE REVIENT ---
  calculateRecipeCost(recipeId: string): {
    ingredientsCost: number;
    packagingCost: number;
    totalCost: number;
    costPerPortion: number;
    marginPercent: number;
    suggestedSellingPrice: number;
  } {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) {
      return { ingredientsCost: 0, packagingCost: 0, totalCost: 0, costPerPortion: 0, marginPercent: 0, suggestedSellingPrice: 0 };
    }

    const ingredients = this.getRecipeIngredients(recipeId);
    const packagings = this.getRecipePackagings(recipeId);
    const products = this.getProducts();

    // 1. Coût des ingrédients
    let ingredientsCost = 0;
    ingredients.forEach(ing => {
      if (ing.productId) {
        const prod = products.find(p => p.id === ing.productId);
        if (prod) {
          const convertedQty = convertUnits(ing.qtyUsed, ing.unit, prod.unit);
          ingredientsCost += convertedQty * prod.avgPurchasePrice;
        }
      } else if (ing.customCostPerUnit) {
        ingredientsCost += ing.qtyUsed * ing.customCostPerUnit;
      }
    });

    // 2. Coût des emballages
    let packagingCost = 0;
    packagings.forEach(pack => {
      const prod = products.find(p => p.name.toLowerCase() === pack.name.toLowerCase() || p.id === pack.name);
      const unitCost = prod ? prod.avgPurchasePrice : pack.costPerUnit;
      packagingCost += pack.qtyUsed * unitCost;
    });

    const totalCost = ingredientsCost + packagingCost;
    const costPerPortion = recipe.portions > 0 ? totalCost / recipe.portions : totalCost;

    const settings = this.getSettings();
    const defaultMargin = settings.defaultTargetMargin;
    const suggestedSellingPrice = defaultMargin < 100
      ? costPerPortion / (1 - (defaultMargin / 100))
      : costPerPortion * 2;

    return {
      ingredientsCost: Number(ingredientsCost.toFixed(2)),
      packagingCost: Number(packagingCost.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      costPerPortion: Number(costPerPortion.toFixed(2)),
      marginPercent: defaultMargin,
      suggestedSellingPrice: Number(suggestedSellingPrice.toFixed(2))
    };
  },

  // --- PRODUCTIONS (FABRICATIONS) ---
  getProductions(): Production[] {
    return getDemoTable<Production>(DEMO_KEYS.PRODUCTIONS, DEMO_PRODUCTIONS);
  },

  addProduction(_production: Production): { success: boolean; error?: string } {
    notifyReadOnlyBlocked('Le lancement de production');
    return { success: false, error: 'Cette action est disponible dans la version complète.' };
  },

  deleteProduction(_id: string): void {
    notifyReadOnlyBlocked('La suppression de production');
  },

  // --- VENTES (SALES) ---
  getSales(): Sale[] {
    return getDemoTable<Sale>(DEMO_KEYS.SALES, DEMO_SALES);
  },

  saveSale(_sale: Sale): void {
    notifyReadOnlyBlocked("L'enregistrement de vente");
  },

  deleteSale(_id: string): void {
    notifyReadOnlyBlocked('La suppression de vente');
  },

  // --- MOUVEMENTS DE STOCK & HISTORIQUE ---
  getStockMovements(): StockMovement[] {
    return getDemoTable<StockMovement>(DEMO_KEYS.STOCK_MOVEMENTS, DEMO_STOCK_MOVEMENTS);
  },

  getProductStockMovements(productId: string): StockMovement[] {
    return this.getStockMovements()
      .filter(m => m.productId === productId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getProductPurchaseHistory(productId: string): Purchase[] {
    return this.getPurchases()
      .filter(p => p.productId === productId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
};
