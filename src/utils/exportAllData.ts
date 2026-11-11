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
