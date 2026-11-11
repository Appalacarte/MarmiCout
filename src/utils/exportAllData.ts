import { dbService } from '../services/db';
import { APP_VERSION } from '../version';

export interface MarmicoutFullExport {
  exportDate: string;
  application: string;
  version: string;
  format: 'marmicout_backup_v1';
  products: any[];
  stores: any[];
  purchases: any[];
  recipes: any[];
  recipe_ingredients: any[];
  recipe_packaging: any[];
  productions: any[];
  sales: any[];
  stock_movements: any[];
  settings: any;
}

/**
 * Exporte l'intégralité des 10 collections opérationnelles de Marmicout
 * strictement alignées sur le schéma Supabase (migration 20261111160000) et le schéma IndexedDB.
 */
export function exportAllDataAsJSON(): MarmicoutFullExport {
  const exportPayload: MarmicoutFullExport = {
    exportDate: new Date().toISOString(),
    application: 'Marmicout',
    version: APP_VERSION,
    format: 'marmicout_backup_v1',
    products: dbService.getProducts(),
    stores: dbService.getStores(),
    purchases: dbService.getPurchases(),
    recipes: dbService.getRecipes(),
    recipe_ingredients: dbService.getAllRecipeIngredients(),
    recipe_packaging: dbService.getAllRecipePackagings(),
    productions: dbService.getProductions(),
    sales: dbService.getSales(),
    stock_movements: dbService.getStockMovements(),
    settings: dbService.getSettings(),
  };

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marmicout-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return exportPayload;
}

export interface ImportResult {
  success: boolean;
  counts: Record<string, number>;
  error?: string;
}

/**
 * Réimporte l'intégralité des 10 collections dans Marmicout.
 * Si clearFirst === true, les anciennes données sont remplacées.
 */
export function importAllDataFromJSON(
  payload: MarmicoutFullExport,
  options: { clearFirst?: boolean } = { clearFirst: true }
): ImportResult {
  try {
    if (!payload || payload.format !== 'marmicout_backup_v1') {
      return {
        success: false,
        counts: {},
        error: 'Format d\'export invalide ou non supporté (attendu : marmicout_backup_v1).',
      };
    }

    if (options.clearFirst) {
      dbService.setStores(payload.stores || []);
      dbService.setProducts(payload.products || []);
      dbService.setPurchases(payload.purchases || []);
      dbService.setRecipes(payload.recipes || []);
      dbService.setAllRecipeIngredients(payload.recipe_ingredients || []);
      dbService.setAllRecipePackagings(payload.recipe_packaging || []);
      dbService.setProductions(payload.productions || []);
      dbService.setSales(payload.sales || []);
      dbService.setStockMovements(payload.stock_movements || []);
      if (payload.settings) {
        dbService.saveSettings(payload.settings);
      }
    } else {
      // Mode fusion (merge)
      const existingStores = dbService.getStores();
      const existingProducts = dbService.getProducts();
      const existingPurchases = dbService.getPurchases();
      const existingRecipes = dbService.getRecipes();
      const existingIng = dbService.getAllRecipeIngredients();
      const existingPack = dbService.getAllRecipePackagings();
      const existingProd = dbService.getProductions();
      const existingSales = dbService.getSales();
      const existingMovements = dbService.getStockMovements();

      const mergeById = <T extends { id: string }>(existing: T[], incoming: T[]): T[] => {
        const map = new Map<string, T>();
        existing.forEach(item => map.set(item.id, item));
        incoming.forEach(item => map.set(item.id, item));
        return Array.from(map.values());
      };

      dbService.setStores(mergeById(existingStores, payload.stores || []));
      dbService.setProducts(mergeById(existingProducts, payload.products || []));
      dbService.setPurchases(mergeById(existingPurchases, payload.purchases || []));
      dbService.setRecipes(mergeById(existingRecipes, payload.recipes || []));
      dbService.setAllRecipeIngredients(mergeById(existingIng, payload.recipe_ingredients || []));
      dbService.setAllRecipePackagings(mergeById(existingPack, payload.recipe_packaging || []));
      dbService.setProductions(mergeById(existingProd, payload.productions || []));
      dbService.setSales(mergeById(existingSales, payload.sales || []));
      dbService.setStockMovements(mergeById(existingMovements, payload.stock_movements || []));
      if (payload.settings) {
        dbService.saveSettings(payload.settings);
      }
    }

    return {
      success: true,
      counts: {
        stores: (payload.stores || []).length,
        products: (payload.products || []).length,
        purchases: (payload.purchases || []).length,
        recipes: (payload.recipes || []).length,
        recipe_ingredients: (payload.recipe_ingredients || []).length,
        recipe_packaging: (payload.recipe_packaging || []).length,
        productions: (payload.productions || []).length,
        sales: (payload.sales || []).length,
        stock_movements: (payload.stock_movements || []).length,
        settings: payload.settings ? 1 : 0,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      counts: {},
      error: err.message || 'Erreur lors de l\'importation.',
    };
  }
}
