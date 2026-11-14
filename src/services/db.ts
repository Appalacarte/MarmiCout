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
} from '../types';
import {
  cloudDbService,
  isUUID,
  generateUUID,
  notifyCloudError
} from './cloudDbService';
import { indexedDbService } from './indexedDbService';
import { accessVerificationService } from './accessVerificationService';
import {
  convertUnits,
  convertUnitsWithInfo,
  normalizeUnit,
  ensureRequiredUnits,
  DEFAULT_UNITS,
} from '../utils/units';

export { convertUnits, convertUnitsWithInfo, normalizeUnit, ensureRequiredUnits };

export function isCloudMode(): boolean {
  const last = accessVerificationService.getLastResult();
  if (last && last.hasAccess) {
    return (
      last.planCode === 'pro' ||
      last.planCode === 'pro_cloud' ||
      last.planCode === 'demo_14j' ||
      last.status === 'demo' ||
      last.status === 'demo_active'
    );
  }
  return false;
}

export function isLocalMode(): boolean {
  const last = accessVerificationService.getLastResult();
  if (last && last.hasAccess) {
    return last.planCode === 'essentiel';
  }
  return false;
}

export function isAccessKnown(): boolean {
  return accessVerificationService.getLastResult() !== null;
}

export function assertAccessKnown(): void {
  if (!isAccessKnown()) {
    throw new Error("Impossible d'enregistrer : vérification des droits d'accès en cours.");
  }
}

// Détection du code testeur dans l'URL (uniquement pour les utilisateurs non abonnés payants)
const getTesterCode = (): string | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (params.has('sso_token')) return null;
  const last = accessVerificationService.getLastResult();
  if (
    last &&
    last.hasAccess &&
    (last.planCode === 'pro' || last.planCode === 'pro_cloud' || last.planCode === 'essentiel')
  ) {
    return null;
  }
  return params.get('code');
};

const testerCode = getTesterCode();
const prefix = testerCode ? `${testerCode.trim().toLowerCase()}_` : '';

// Clés LocalStorage dynamiques selon le testeur
const KEYS = {
  PRODUCTS: `${prefix}marmicout_products`,
  PURCHASES: `${prefix}marmicout_purchases`,
  STORES: `${prefix}marmicout_stores`,
  RECIPES: `${prefix}marmicout_recipes`,
  RECIPE_INGREDIENTS: `${prefix}marmicout_recipe_ingredients`,
  RECIPE_PACKAGING: `${prefix}marmicout_recipe_packaging`,
  PRODUCTIONS: `${prefix}marmicout_productions`,
  SALES: `${prefix}marmicout_sales`,
  STOCK_MOVEMENTS: `${prefix}marmicout_stock_movements`,
  SETTINGS: `${prefix}marmicout_settings`
};

export const getActiveTesterCode = (): string | null => getTesterCode();

// --- DONNÉES DE DÉMONSTRATION INITIALES ---
const INITIAL_STORES: Store[] = [
  { id: 'S1', name: 'Grand Frais', type: 'Supermarché', address: 'Zone Commerciale, Lyon', phone: '0472000000', notes: 'Bons fruits et légumes' },
  { id: 'S2', name: 'Biocoop La Source', type: 'Producteur local', address: '12 Rue des Producteurs, Lyon', phone: '0478000000', notes: 'Produits bio de qualité' },
  { id: 'S3', name: 'Metro Lyon', type: 'Grossiste', address: 'Boulevard Industriel, Venissieux', phone: '0472111111', notes: 'Idéal pour le vrac et emballages' }
];

const INITIAL_PRODUCTS: Product[] = [
  { id: 'P1', barcode: '3151240010205', name: 'Farine de Blé T55', category: 'Épicerie', unit: 'kg', brand: 'Francine', format: '1 kg', stock: 8.5, minStockAlert: 3.0, avgPurchasePrice: 1.50, mainStoreId: 'S3', notes: 'Farine standard', isActive: true },
  { id: 'P2', barcode: '3174660006265', name: 'Sucre en Poudre', category: 'Épicerie', unit: 'kg', brand: 'Daddy', format: '1 kg', stock: 12.0, minStockAlert: 4.0, avgPurchasePrice: 1.80, mainStoreId: 'S3', notes: 'Sucre blanc en sachet', isActive: true },
  { id: 'P3', barcode: '3228022010121', name: 'Beurre Doux Gastronomique', category: 'Frais', unit: 'kg', brand: 'Président', format: '500 g', stock: 2.2, minStockAlert: 1.0, avgPurchasePrice: 8.50, mainStoreId: 'S1', notes: 'Beurre à 82% MG', isActive: true },
  { id: 'P4', barcode: '4012', name: 'Pommes Golden des Alpes', category: 'Frais', unit: 'kg', brand: 'Verger Sol', format: 'Vrac', stock: 15.0, minStockAlert: 5.0, avgPurchasePrice: 2.20, mainStoreId: 'S2', notes: 'Pommes pour tartes et compotes', isActive: true },
  { id: 'P5', barcode: '3560070364964', name: 'Œufs Bio de Poule', category: 'Frais', unit: 'pièce', brand: 'Ferme des Prés', format: 'Boîte de 30', stock: 45, minStockAlert: 15, avgPurchasePrice: 0.35, mainStoreId: 'S2', notes: 'Taille M', isActive: true },
  { id: 'P6', barcode: '3328170002128', name: 'Pots en Verre 375ml', category: 'Emballage', unit: 'pièce', brand: 'Le Parfait', format: 'Carton de 12', stock: 36, minStockAlert: 12, avgPurchasePrice: 0.85, mainStoreId: 'S3', notes: 'Pour confitures avec capsule', isActive: true },
  { id: 'P7', barcode: '3328170002500', name: 'Barquettes Carton 28cm', category: 'Emballage', unit: 'pièce', brand: 'EcoPack', format: 'Lot de 50', stock: 24, minStockAlert: 10, avgPurchasePrice: 0.25, mainStoreId: 'S3', notes: 'Pour tartes familiales', isActive: true },
  { id: 'P8', barcode: '3560070817000', name: 'Abricots du Roussillon', category: 'Frais', unit: 'kg', brand: 'Vrac', format: 'Cagette 5kg', stock: 0.8, minStockAlert: 5.0, avgPurchasePrice: 3.80, mainStoreId: 'S2', notes: 'Abricots mûrs pour confiture', isActive: true },
  { id: 'P9', barcode: '3155250001009', name: 'Lait Demi-Écrémé', category: 'Frais', unit: 'l', brand: 'Lactel', format: 'Bouteille 1L', stock: 6.0, minStockAlert: 2.0, avgPurchasePrice: 1.10, mainStoreId: 'S1', notes: 'Lait UHT', isActive: true },
  { id: 'P10', barcode: '3760114002100', name: 'Gousses de Vanille', category: 'Épicerie', unit: 'pièce', brand: 'Madagascar', format: 'Tube de 5', stock: 8, minStockAlert: 3, avgPurchasePrice: 2.50, mainStoreId: 'S3', notes: 'Gousses de 15cm parfumées', isActive: true }
];

const INITIAL_PURCHASES: Purchase[] = [
  { id: 'A1', date: '2026-06-10', productId: 'P1', qty: 10, unit: 'kg', pricePaid: 15.0, unitPrice: 1.5, storeId: 'S3', notes: 'Achat de gros', batchNo: 'LOT-FAR-99', expiryDate: '2026-12-15' },
  { id: 'A2', date: '2026-06-10', productId: 'P2', qty: 15, unit: 'kg', pricePaid: 27.0, unitPrice: 1.8, storeId: 'S3', notes: 'Achat de gros', batchNo: 'LOT-SUC-26', expiryDate: '2026-11-10' },
  { id: 'A3', date: '2026-06-11', productId: 'P3', qty: 3, unit: 'kg', pricePaid: 25.5, unitPrice: 8.5, storeId: 'S1', notes: 'Beurre frais', batchNo: 'LOT-BEU-14', expiryDate: '2026-11-17' },
  { id: 'A4', date: '2026-06-12', productId: 'P4', qty: 20, unit: 'kg', pricePaid: 44.0, unitPrice: 2.2, storeId: 'S2', notes: 'Pommes fraîches', batchNo: 'LOT-POM-08', expiryDate: '2026-11-20' },
  { id: 'A5', date: '2026-06-12', productId: 'P5', qty: 60, unit: 'pièce', pricePaid: 21.0, unitPrice: 0.35, storeId: 'S2', notes: '2 cartons de 30', batchNo: 'LOT-OEU-72', expiryDate: '2026-11-14' }
];

const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'R1',
    name: 'Tarte aux Pommes Familiale',
    category: 'Tarte',
    description: 'Tarte traditionnelle croustillante aux pommes Golden avec pâte brisée maison.',
    portions: 8,
    yieldQty: 1.0,
    yieldUnit: 'pièce',
    stock: 2,
    prepTimeMinutes: 45,
    utensilsNotes: 'Moule à tarte de 28cm, rouleau à pâtisserie, éplucheur.',
    notes: 'Cuisson recommandée : 35-40 minutes à 180°C.',
    isActive: true
  },
  {
    id: 'R2',
    name: "Confiture d'Abricots Maison",
    category: 'Confiture',
    description: 'Confiture artisanale onctueuse cuite au chaudron, 60% fruits minimum.',
    portions: 10,
    yieldQty: 10.0,
    yieldUnit: 'pièce', // 10 pots
    stock: 12,
    prepTimeMinutes: 60,
    utensilsNotes: 'Chaudron en cuivre ou grande marmite en inox, louche, entonnoir.',
    notes: 'Mettre en pot immédiatement après cuisson et retourner les pots.',
    isActive: true
  }
];

const INITIAL_RECIPE_INGREDIENTS: RecipeIngredient[] = [
  // Tarte aux pommes (R1)
  { id: 'RI1', recipeId: 'R1', productId: 'P1', qtyUsed: 250, unit: 'g' }, // Farine (0.25 kg)
  { id: 'RI2', recipeId: 'R1', productId: 'P3', qtyUsed: 125, unit: 'g' }, // Beurre (0.125 kg)
  { id: 'RI3', recipeId: 'R1', productId: 'P2', qtyUsed: 100, unit: 'g' }, // Sucre (0.1 kg)
  { id: 'RI4', recipeId: 'R1', productId: 'P4', qtyUsed: 1.0, unit: 'kg' }, // Pommes
  { id: 'RI5', recipeId: 'R1', productId: 'P5', qtyUsed: 1, unit: 'pièce' }, // Œuf

  // Confiture d'Abricots (R2)
  { id: 'RI6', recipeId: 'R2', productId: 'P8', qtyUsed: 3.0, unit: 'kg' }, // Abricots
  { id: 'RI7', recipeId: 'R2', productId: 'P2', qtyUsed: 2.5, unit: 'kg' }  // Sucre
];

const INITIAL_RECIPE_PACKAGING: RecipePackaging[] = [
  // Tarte aux pommes
  { id: 'RP1', recipeId: 'R1', name: 'Barquettes Carton 28cm', qtyUsed: 1, costPerUnit: 0.25 },
  { id: 'RP2', recipeId: 'R1', name: 'Étiquette autocollante', qtyUsed: 1, costPerUnit: 0.05 },

  // Confiture
  { id: 'RP3', recipeId: 'R2', name: 'Pots en Verre 375ml', qtyUsed: 10, costPerUnit: 0.85 },
  { id: 'RP4', recipeId: 'R2', name: 'Étiquette autocollante', qtyUsed: 10, costPerUnit: 0.05 }
];

const INITIAL_PRODUCTIONS: Production[] = [
  { id: 'PR1', date: '2026-06-12', recipeId: 'R1', portionsProduced: 4, notes: 'Première fournée de tarte', calculatedCost: 4.47 },
  { id: 'PR2', date: '2026-06-12', recipeId: 'R2', portionsProduced: 12, notes: 'Première cuvée de confiture', calculatedCost: 24.90 }
];

const INITIAL_SALES: Sale[] = [
  { id: 'V1', date: '2026-06-13', itemId: 'R1', itemType: 'RECIPE', qtySold: 2, unitPrice: 12.00, location: 'Marché', notes: 'Vente directe au marché le matin' },
  { id: 'V2', date: '2026-06-13', itemId: 'R2', itemType: 'RECIPE', qtySold: 4, unitPrice: 5.50, location: 'Marché', notes: 'Bons retours sur le goût' }
];

const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [
  // Mouvements initiaux basés sur les achats
  { id: 'M1', date: '2026-06-10', productId: 'P1', qty: 10, type: 'ACHAT', refId: 'A1', notes: 'Entrée achat' },
  { id: 'M2', date: '2026-06-10', productId: 'P2', qty: 15, type: 'ACHAT', refId: 'A2', notes: 'Entrée achat' },
  { id: 'M3', date: '2026-06-11', productId: 'P3', qty: 3, type: 'ACHAT', refId: 'A3', notes: 'Entrée achat' },
  { id: 'M4', date: '2026-06-12', productId: 'P4', qty: 20, type: 'ACHAT', refId: 'A4', notes: 'Entrée achat' },
  { id: 'M5', date: '2026-06-12', productId: 'P5', qty: 60, type: 'ACHAT', refId: 'A5', notes: 'Entrée achat' }
];

const INITIAL_SETTINGS: Settings = {
  businessName: 'Les Delices de Marmie',
  currency: '€',
  defaultTargetMargin: 60, // 60%
  categories: ['Épicerie', 'Frais', 'Sec', 'Liquide', 'Emballage', 'Autre'],
  recipeCategories: ['Tarte', 'Confiture', 'Gâteau', 'Plat Cuisiné', 'Autre'],
  units: [...DEFAULT_UNITS],
  salesLocations: ['Marché', 'Commande', 'En Ligne', 'Domicile', 'Autre'],
  defaultMinStockAlert: 2,
  expiryAlertDays: 7,
  googleSheetId: '',
  googleSheetLink: '',
  googleWebAppUrl: ''
};

// --- INITIALISATION DU LOCALSTORAGE ---
const initDB = () => {
  if (!localStorage.getItem(KEYS.SETTINGS)) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    localStorage.setItem(KEYS.STORES, JSON.stringify(INITIAL_STORES));
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    localStorage.setItem(KEYS.PURCHASES, JSON.stringify(INITIAL_PURCHASES));
    localStorage.setItem(KEYS.RECIPES, JSON.stringify(INITIAL_RECIPES));
    localStorage.setItem(KEYS.RECIPE_INGREDIENTS, JSON.stringify(INITIAL_RECIPE_INGREDIENTS));
    localStorage.setItem(KEYS.RECIPE_PACKAGING, JSON.stringify(INITIAL_RECIPE_PACKAGING));
    localStorage.setItem(KEYS.PRODUCTIONS, JSON.stringify(INITIAL_PRODUCTIONS));
    localStorage.setItem(KEYS.SALES, JSON.stringify(INITIAL_SALES));
    localStorage.setItem(KEYS.STOCK_MOVEMENTS, JSON.stringify(INITIAL_STOCK_MOVEMENTS));
  } else {
    // S'assurer que les unités cs/cc sont bien présentes sans jamais écraser les réglages utilisateur
    try {
      const settingsStr = localStorage.getItem(KEYS.SETTINGS);
      if (settingsStr) {
        const currentSettings = JSON.parse(settingsStr);
        let changed = false;
        const ensuredUnits = ensureRequiredUnits(currentSettings.units);
        if (JSON.stringify(ensuredUnits) !== JSON.stringify(currentSettings.units)) {
          currentSettings.units = ensuredUnits;
          changed = true;
        }
        if (changed) {
          localStorage.setItem(KEYS.SETTINGS, JSON.stringify(currentSettings));
        }
      }
    } catch (e) {
      console.error('Erreur lors de la mise à jour automatique des paramètres', e);
    }
  }
};

initDB();

// --- CACHE MÉMOIRE LIÉ À INDEXEDDB (MODE CLOUD & HORS LIGNE) ---
export const inMemoryCache: Record<string, unknown[]> = {
  products: [],
  stores: [],
  purchases: [],
  recipes: [],
  recipe_ingredients: [],
  recipe_packaging: [],
  productions: [],
  sales: [],
  stock_movements: [],
};
let inMemorySettings: Settings | null = null;

export async function loadCacheFromIndexedDb(): Promise<void> {
  try {
    const [
      products,
      stores,
      purchases,
      recipes,
      recipe_ingredients,
      recipe_packaging,
      productions,
      sales,
      stock_movements,
      settingsItems,
    ] = await Promise.all([
      indexedDbService.getAll<Product>('products'),
      indexedDbService.getAll<Store>('stores'),
      indexedDbService.getAll<Purchase>('purchases'),
      indexedDbService.getAll<Recipe>('recipes'),
      indexedDbService.getAll<RecipeIngredient>('recipe_ingredients'),
      indexedDbService.getAll<RecipePackaging>('recipe_packaging'),
      indexedDbService.getAll<Production>('productions'),
      indexedDbService.getAll<Sale>('sales'),
      indexedDbService.getAll<StockMovement>('stock_movements'),
      indexedDbService.getAll<{ key: string; value: Settings }>('settings'),
    ]);

    inMemoryCache.products = products || [];
    inMemoryCache.stores = stores || [];
    inMemoryCache.purchases = purchases || [];
    inMemoryCache.recipes = recipes || [];
    inMemoryCache.recipe_ingredients = recipe_ingredients || [];
    inMemoryCache.recipe_packaging = recipe_packaging || [];
    inMemoryCache.productions = productions || [];
    inMemoryCache.sales = sales || [];
    inMemoryCache.stock_movements = stock_movements || [];

    const appSettings = (settingsItems || []).find((s) => s.key === 'app_settings');
    if (appSettings && appSettings.value) {
      inMemorySettings = appSettings.value;
    }
  } catch (err) {
    console.warn('[db.ts] Erreur loadCacheFromIndexedDb:', err);
  }
}

if (typeof window !== 'undefined') {
  void loadCacheFromIndexedDb();
}

// --- SERVICES DE BASE (HELPERS INTERNES) ---
function getTable<T>(key: string): T[] {
  initDB();
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function getTableData<T>(storeName: string, legacyKey: string): T[] {
  if (isCloudMode()) {
    // Mode cloud : les données proviennent EXCLUSIVEMENT d'IndexedDB / cache mémoire, JAMAIS de localStorage (Point 6)
    return (inMemoryCache[storeName] || []) as T[];
  }
  // Mode Essentiel local : utilise le cache mémoire si disponible, sinon fallback localStorage
  if (inMemoryCache[storeName] && inMemoryCache[storeName].length > 0) {
    return inMemoryCache[storeName] as T[];
  }
  return getTable<T>(legacyKey);
}

function saveTable<T>(key: string, data: T[]): void {
  // En mode cloud, aucune écriture dans localStorage pour les données métier (Point 6)
  if (isCloudMode()) return;
  localStorage.setItem(key, JSON.stringify(data));
}

// --- CONVERSION DÉTERMINISTE DES IDENTIFIANTS VERS UUID (POUR IMPORT CLOUD / LOCAL) ---
export function toDeterministicUUID(rawId: unknown): string {
  if (!rawId || typeof rawId !== 'string') return generateUUID();
  const trimmed = rawId.trim();
  if (isUUID(trimmed)) return trimmed;
  // Algorithme FNV-1a compact produisant un UUID v4 déterministe
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0x7fedcba9, h4 = 0x1337c0de;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822519);
    h4 = Math.imul(h4 ^ ch, 3266489917);
  }
  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  const hex = toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
  const p1 = hex.substring(0, 8);
  const p2 = hex.substring(8, 12);
  const p3 = '4' + hex.substring(13, 16);
  const vChar = ['8', '9', 'a', 'b'][parseInt(hex.charAt(16), 16) % 4];
  const p4 = vChar + hex.substring(17, 20);
  const p5 = hex.substring(20, 32);
  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
}

// --- API DE DONNÉES ---

export const dbService = {
  // --- METADATA & REINITIALISATION ---
  resetToDefault(): void {
    localStorage.removeItem(KEYS.SETTINGS);
    localStorage.removeItem(KEYS.STORES);
    localStorage.removeItem(KEYS.PRODUCTS);
    localStorage.removeItem(KEYS.PURCHASES);
    localStorage.removeItem(KEYS.RECIPES);
    localStorage.removeItem(KEYS.RECIPE_INGREDIENTS);
    localStorage.removeItem(KEYS.RECIPE_PACKAGING);
    localStorage.removeItem(KEYS.PRODUCTIONS);
    localStorage.removeItem(KEYS.SALES);
    localStorage.removeItem(KEYS.STOCK_MOVEMENTS);
    initDB();
  },

  clearAllData(): void {
    const current = this.getSettings();
    const cleanSettings: Settings = {
      ...current,
      businessName: current.businessName === 'Les Délices de Marmie' ? 'Mon Atelier Culinaire' : current.businessName
    };
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(cleanSettings));
    localStorage.setItem(KEYS.STORES, JSON.stringify([]));
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify([]));
    localStorage.setItem(KEYS.PURCHASES, JSON.stringify([]));
    localStorage.setItem(KEYS.RECIPES, JSON.stringify([]));
    localStorage.setItem(KEYS.RECIPE_INGREDIENTS, JSON.stringify([]));
    localStorage.setItem(KEYS.RECIPE_PACKAGING, JSON.stringify([]));
    localStorage.setItem(KEYS.PRODUCTIONS, JSON.stringify([]));
    localStorage.setItem(KEYS.SALES, JSON.stringify([]));
    localStorage.setItem(KEYS.STOCK_MOVEMENTS, JSON.stringify([]));
  },

  // --- SYNCHRONISATION CLOUD & FAÇADE ---
  async checkUnsyncedOfflineData(): Promise<{
    hasUnsynced: boolean;
    unsyncedCount: number;
    localItemsCount: number;
    isLocalOnlyPlan: boolean;
  }> {
    const unsyncedCount = await indexedDbService.getUnsyncedOperationsCount();
    const isLocalOnly = isLocalMode();
    const [products, recipes, purchases, productions, sales] = await Promise.all([
      indexedDbService.getAll<Product>('products'),
      indexedDbService.getAll<Recipe>('recipes'),
      indexedDbService.getAll<Purchase>('purchases'),
      indexedDbService.getAll<Production>('productions'),
      indexedDbService.getAll<Sale>('sales'),
    ]);
    const localItemsCount =
      products.length + recipes.length + purchases.length + productions.length + sales.length;
    const isOfflineNow = typeof navigator !== 'undefined' && !navigator.onLine;
    const hasUnsynced =
      unsyncedCount > 0 || (isLocalOnly && localItemsCount > 0) || (isOfflineNow && localItemsCount > 0);

    return {
      hasUnsynced,
      unsyncedCount: unsyncedCount > 0 ? unsyncedCount : (hasUnsynced ? localItemsCount : 0),
      localItemsCount,
      isLocalOnlyPlan: isLocalOnly,
    };
  },

  async syncFromCloud(): Promise<void> {
    if (!isCloudMode()) return;
    try {
      const data = await cloudDbService.syncAllFromCloud();
      // Point 6 : En mode cloud, AUCUNE écriture dans localStorage pour les données métier.
      // Stockage local STRICTEMENT dans IndexedDB et le cache mémoire.
      await Promise.all([
        indexedDbService.setAll('recipes', data.recipes || []),
        indexedDbService.setAll('products', data.products || []),
        indexedDbService.setAll('stores', data.stores || []),
        indexedDbService.setAll('purchases', data.purchases || []),
        indexedDbService.setAll('productions', data.productions || []),
        indexedDbService.setAll('sales', data.sales || []),
        indexedDbService.setAll('stock_movements', data.stockMovements || []),
        indexedDbService.setAll('recipe_ingredients', data.recipeIngredients || []),
        indexedDbService.setAll('recipe_packaging', data.recipePackaging || []),
      ]);
      if (data.settings) {
        await indexedDbService.put('settings', { key: 'app_settings', value: data.settings });
      }

      inMemoryCache.recipes = data.recipes || [];
      inMemoryCache.products = data.products || [];
      inMemoryCache.stores = data.stores || [];
      inMemoryCache.purchases = data.purchases || [];
      inMemoryCache.productions = data.productions || [];
      inMemoryCache.sales = data.sales || [];
      inMemoryCache.stock_movements = data.stockMovements || [];
      inMemoryCache.recipe_ingredients = data.recipeIngredients || [];
      inMemoryCache.recipe_packaging = data.recipePackaging || [];
      if (data.settings) inMemorySettings = data.settings;

      await indexedDbService.setLastSyncTimestamp(Date.now());
      await indexedDbService.clearUnsyncedOperations();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('marmicout-data-synced'));
      }
    } catch (err: unknown) {
      console.error('[dbService] Erreur lors de la synchronisation cloud:', err);
      notifyCloudError('Erreur de synchronisation cloud', err instanceof Error ? err.message : String(err));
    }
  },

  // --- PARAMÈTRES (SETTINGS) ---
  getSettings(): Settings {
    const localExpiry = typeof localStorage !== 'undefined' ? (Number(localStorage.getItem('marmicout_expiry_alert_days')) || 7) : 7;
    if (isCloudMode() && inMemorySettings) {
      return {
        ...inMemorySettings,
        expiryAlertDays: inMemorySettings.expiryAlertDays ?? localExpiry,
        units: ensureRequiredUnits(inMemorySettings.units),
      };
    }
    initDB();
    const data = localStorage.getItem(KEYS.SETTINGS);
    const parsed: Settings = data ? JSON.parse(data) : INITIAL_SETTINGS;
    return {
      ...parsed,
      expiryAlertDays: parsed.expiryAlertDays ?? localExpiry,
      units: ensureRequiredUnits(parsed.units),
    };
  },

  async saveSettings(settings: Settings): Promise<void> {
    assertAccessKnown();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('marmicout_expiry_alert_days', String(settings.expiryAlertDays ?? 7));
    }
    if (isCloudMode()) {
      try {
        await cloudDbService.saveSettings(settings);
      } catch (err: unknown) {
        notifyCloudError('Enregistrement paramètres cloud refusé', err instanceof Error ? err.message : String(err));
        throw err;
      }
      inMemorySettings = settings;
      await indexedDbService.put('settings', { key: 'app_settings', value: settings });
      return;
    }
    // Mode local (Essentiel)
    inMemorySettings = settings;
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    await indexedDbService.put('settings', { key: 'app_settings', value: settings });
  },

  // --- MAGASINS (STORES) ---
  getStores(): Store[] {
    return getTableData<Store>('stores', KEYS.STORES);
  },

  getStore(id: string): Store | undefined {
    return this.getStores().find(s => s.id === id);
  },

  async saveStore(store: Store): Promise<void> {
    assertAccessKnown();
    if (!isUUID(store.id)) {
      store.id = generateUUID();
    }
    if (isCloudMode()) {
      try {
        await cloudDbService.saveStore(store);
      } catch (err: unknown) {
        notifyCloudError('Enregistrement magasin cloud refusé', err instanceof Error ? err.message : String(err));
        throw err;
      }
      const stores = (inMemoryCache.stores as Store[]).filter(s => s.id !== store.id);
      stores.push(store);
      inMemoryCache.stores = stores;
      await indexedDbService.put('stores', store);
      return;
    }
    const stores = this.getStores();
    const index = stores.findIndex(s => s.id === store.id);
    if (index >= 0) {
      stores[index] = store;
    } else {
      stores.push(store);
    }
    inMemoryCache.stores = stores;
    saveTable(KEYS.STORES, stores);
    await indexedDbService.put('stores', store);
  },

  async deleteStore(id: string): Promise<void> {
    assertAccessKnown();
    if (isCloudMode()) {
      try {
        await cloudDbService.deleteStore(id);
      } catch (err: unknown) {
        notifyCloudError('Suppression magasin cloud refusée', err instanceof Error ? err.message : String(err));
        throw err;
      }
      inMemoryCache.stores = (inMemoryCache.stores as Store[]).filter(s => s.id !== id);
      await indexedDbService.delete('stores', id);
      return;
    }
    const stores = this.getStores().filter(s => s.id !== id);
    inMemoryCache.stores = stores;
    saveTable(KEYS.STORES, stores);
    await indexedDbService.delete('stores', id);
  },

  setStores(stores: Store[]): void {
    inMemoryCache.stores = stores;
    saveTable(KEYS.STORES, stores);
    indexedDbService.setAll('stores', stores);
  },

  // --- PRODUITS (PRODUCTS) ---
  getProducts(): Product[] {
    return getTableData<Product>('products', KEYS.PRODUCTS);
  },

  setProducts(products: Product[]): void {
    inMemoryCache.products = products;
    saveTable(KEYS.PRODUCTS, products);
    indexedDbService.setAll('products', products);
  },

  getProduct(id: string): Product | undefined {
    return this.getProducts().find(p => p.id === id);
  },

  getProductByBarcode(barcode: string): Product | undefined {
    if (!barcode.trim()) return undefined;
    return this.getProducts().find(p => p.barcode === barcode.trim());
  },

  async saveProduct(product: Product): Promise<void> {
    assertAccessKnown();
    if (!isUUID(product.id)) {
      product.id = generateUUID();
    }
    if (isCloudMode()) {
      try {
        await cloudDbService.saveProduct(product);
      } catch (err: unknown) {
        notifyCloudError('Enregistrement produit cloud refusé', err instanceof Error ? err.message : String(err));
        throw err;
      }
      const products = (inMemoryCache.products as Product[]).filter(p => p.id !== product.id);
      products.push(product);
      inMemoryCache.products = products;
      await indexedDbService.put('products', product);
      return;
    }
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      products[index] = product;
    } else {
      products.push(product);
    }
    inMemoryCache.products = products;
    saveTable(KEYS.PRODUCTS, products);
    await indexedDbService.put('products', product);
  },

  async deleteProduct(id: string): Promise<void> {
    assertAccessKnown();
    if (isCloudMode()) {
      try {
        await cloudDbService.deleteProduct(id);
      } catch (err: unknown) {
        notifyCloudError('Suppression produit cloud refusée', err instanceof Error ? err.message : String(err));
        throw err;
      }
      inMemoryCache.products = (inMemoryCache.products as Product[]).filter(p => p.id !== id);
      await indexedDbService.delete('products', id);
      return;
    }
    const products = this.getProducts().filter(p => p.id !== id);
    inMemoryCache.products = products;
    saveTable(KEYS.PRODUCTS, products);
    await indexedDbService.delete('products', id);
  },

  // --- ACHATS (PURCHASES) ---
  getPurchases(): Purchase[] {
    return getTableData<Purchase>('purchases', KEYS.PURCHASES);
  },

  setPurchases(purchases: Purchase[]): void {
    inMemoryCache.purchases = purchases;
    saveTable(KEYS.PURCHASES, purchases);
    indexedDbService.setAll('purchases', purchases);
  },

  async addPurchase(purchase: Purchase): Promise<void> {
    assertAccessKnown();
    if (!isUUID(purchase.id)) {
      purchase.id = generateUUID();
    }

    const products = this.getProducts();
    const product = products.find(p => p.id === purchase.productId);
    const qtyInProductUnit = product ? convertUnits(purchase.qty, purchase.unit, product.unit, product) : purchase.qty;

    if (product && qtyInProductUnit === null) {
      throw new Error(
        `Unités incompatibles : achat en ${normalizeUnit(purchase.unit) || purchase.unit}, stock en ${normalizeUnit(product.unit) || product.unit}`
      );
    }

    if (isCloudMode()) {
      try {
        await cloudDbService.savePurchase(purchase);
      } catch (err: unknown) {
        notifyCloudError('Enregistrement achat cloud refusé', err instanceof Error ? err.message : String(err));
        throw err;
      }
      const purchases = (inMemoryCache.purchases as Purchase[]).filter(p => p.id !== purchase.id);
      purchases.push(purchase);
      inMemoryCache.purchases = purchases;
      await indexedDbService.put('purchases', purchase);
    } else {
      const purchases = this.getPurchases();
      purchases.push(purchase);
      inMemoryCache.purchases = purchases;
      saveTable(KEYS.PURCHASES, purchases);
      await indexedDbService.put('purchases', purchase);
    }

    // Mettre à jour le stock et le prix moyen du produit
    if (product && qtyInProductUnit !== null) {
      const oldStock = product.stock;
      const oldAvgPrice = product.avgPurchasePrice;

      // Calcul du nouveau PMP (Prix Moyen Pondéré)
      let newAvgPrice: number;
      if (oldStock <= 0) {
        newAvgPrice = qtyInProductUnit > 0 ? purchase.pricePaid / qtyInProductUnit : 0;
      } else {
        const totalCostBefore = oldStock * oldAvgPrice;
        const totalCostNew = purchase.pricePaid;
        const totalStockNew = oldStock + qtyInProductUnit;
        newAvgPrice = totalStockNew > 0 ? (totalCostBefore + totalCostNew) / totalStockNew : 0;
      }

      product.stock = oldStock + qtyInProductUnit;
      product.avgPurchasePrice = Number(newAvgPrice.toFixed(4));
      product.mainStoreId = purchase.storeId;
      await this.saveProduct(product);

      await this.addStockMovement({
        id: generateUUID(),
        date: purchase.date,
        productId: purchase.productId,
        qty: qtyInProductUnit,
        type: 'ACHAT',
        refId: purchase.id,
        notes: `Achat chez ${this.getStore(purchase.storeId)?.name || 'Magasin Inconnu'}`
      });
    }
  },

  async deletePurchase(id: string): Promise<void> {
    assertAccessKnown();
    if (isCloudMode()) {
      try {
        await cloudDbService.deletePurchase(id);
      } catch (err: unknown) {
        notifyCloudError('Suppression achat cloud refusée', err instanceof Error ? err.message : String(err));
        throw err;
      }
      inMemoryCache.purchases = (inMemoryCache.purchases as Purchase[]).filter(p => p.id !== id);
      await indexedDbService.delete('purchases', id);
    }
    const purchases = this.getPurchases();
    const purchase = purchases.find(p => p.id === id);
    if (!purchase) return;

    // Déduire le stock
    const products = this.getProducts();
    const product = products.find(p => p.id === purchase.productId);
    if (product) {
      const qtyInProductUnit = convertUnits(purchase.qty, purchase.unit, product.unit, product);
      if (qtyInProductUnit !== null) {
        product.stock = Math.max(0, product.stock - qtyInProductUnit);
        await this.saveProduct(product);
      }
    }

    const updatedPurchases = purchases.filter(p => p.id !== id);
    inMemoryCache.purchases = updatedPurchases;
    saveTable(KEYS.PURCHASES, updatedPurchases);
    await indexedDbService.delete('purchases', id);

    const movements = this.getStockMovements().filter(m => !(m.type === 'ACHAT' && m.refId === id));
    inMemoryCache.stock_movements = movements;
    saveTable(KEYS.STOCK_MOVEMENTS, movements);
    await indexedDbService.setAll('stock_movements', movements);
  },

  async savePurchase(purchase: Purchase): Promise<void> {
    assertAccessKnown();
    if (!isUUID(purchase.id)) {
      purchase.id = generateUUID();
    }
    if (isCloudMode()) {
      try {
        await cloudDbService.savePurchase(purchase);
      } catch (err: unknown) {
        notifyCloudError('Enregistrement achat cloud refusé', err instanceof Error ? err.message : String(err));
        throw err;
      }
      const purchases = (inMemoryCache.purchases as Purchase[]).filter(p => p.id !== purchase.id);
      purchases.push(purchase);
      inMemoryCache.purchases = purchases;
      await indexedDbService.put('purchases', purchase);
      return;
    }
    const purchases = this.getPurchases().filter(p => p.id !== purchase.id);
    purchases.push(purchase);
    inMemoryCache.purchases = purchases;
    saveTable(KEYS.PURCHASES, purchases);
    await indexedDbService.put('purchases', purchase);
  },

  // --- MOUVEMENTS DE STOCK (STOCK MOVEMENTS) ---
  getStockMovements(): StockMovement[] {
    return getTableData<StockMovement>('stock_movements', KEYS.STOCK_MOVEMENTS);
  },

  setStockMovements(movements: StockMovement[]): void {
    inMemoryCache.stock_movements = movements;
    saveTable(KEYS.STOCK_MOVEMENTS, movements);
    indexedDbService.setAll('stock_movements', movements);
  },

  async addStockMovement(movement: StockMovement): Promise<void> {
    assertAccessKnown();
    if (!isUUID(movement.id)) {
      movement.id = generateUUID();
    }
    if (isCloudMode()) {
      try {
        await cloudDbService.saveStockMovement(movement);
      } catch (err: unknown) {
        notifyCloudError('Enregistrement mouvement stock cloud refusé', err instanceof Error ? err.message : String(err));
        throw err;
      }
      const movements = (inMemoryCache.stock_movements as StockMovement[]).filter(m => m.id !== movement.id);
      movements.push(movement);
      inMemoryCache.stock_movements = movements;
      await indexedDbService.put('stock_movements', movement);
      return;
    }
    const movements = this.getStockMovements();
    movements.push(movement);
    inMemoryCache.stock_movements = movements;
    saveTable(KEYS.STOCK_MOVEMENTS, movements);
    await indexedDbService.put('stock_movements', movement);
  },

  getProductStockMovements(productId: string): StockMovement[] {
    return this.getStockMovements()
      .filter(m => m.productId === productId)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  getProductPurchaseHistory(productId: string): Purchase[] {
    return this.getPurchases()
      .filter(p => p.productId === productId)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  // --- RECETTES (RECIPES) ---
  getRecipes(): Recipe[] {
    return getTableData<Recipe>('recipes', KEYS.RECIPES);
  },

  setRecipes(recipes: Recipe[]): void {
    inMemoryCache.recipes = recipes;
    saveTable(KEYS.RECIPES, recipes);
    indexedDbService.setAll('recipes', recipes);
  },

  getRecipe(id: string): Recipe | undefined {
    return this.getRecipes().find(r => r.id === id);
  },

  getRecipeIngredients(recipeId: string): RecipeIngredient[] {
    return this.getAllRecipeIngredients().filter(ri => ri.recipeId === recipeId);
  },

  getAllRecipeIngredients(): RecipeIngredient[] {
    return getTableData<RecipeIngredient>('recipe_ingredients', KEYS.RECIPE_INGREDIENTS);
  },

  setAllRecipeIngredients(ingredients: RecipeIngredient[]): void {
    inMemoryCache.recipe_ingredients = ingredients;
    saveTable(KEYS.RECIPE_INGREDIENTS, ingredients);
    indexedDbService.setAll('recipe_ingredients', ingredients);
  },

  getRecipePackagings(recipeId: string): RecipePackaging[] {
    return this.getAllRecipePackagings().filter(rp => rp.recipeId === recipeId);
  },

  getAllRecipePackagings(): RecipePackaging[] {
    return getTableData<RecipePackaging>('recipe_packaging', KEYS.RECIPE_PACKAGING);
  },

  setAllRecipePackagings(packagings: RecipePackaging[]): void {
    inMemoryCache.recipe_packaging = packagings;
    saveTable(KEYS.RECIPE_PACKAGING, packagings);
    indexedDbService.setAll('recipe_packaging', packagings);
  },

  async saveRecipe(
    recipe: Recipe,
    ingredients?: Omit<RecipeIngredient, 'id' | 'recipeId'>[],
    packagings?: Omit<RecipePackaging, 'id' | 'recipeId'>[]
  ): Promise<void> {
    assertAccessKnown();
    if (!isUUID(recipe.id)) {
      recipe.id = generateUUID();
    }

    // 1. SI MODE CLOUD : SUPABASE D'ABORD (AUCUNE MODIFICATION LOCALE SI ÉCHEC)
    if (isCloudMode()) {
      try {
        await cloudDbService.saveRecipe(recipe, ingredients, packagings);
      } catch (err: unknown) {
        notifyCloudError('Enregistrement recette cloud refusé', err instanceof Error ? err.message : String(err));
        // NE PAS MODIFIER LE STOCKAGE LOCAL EN CAS DE REJET
        throw err;
      }
      const recipes = (inMemoryCache.recipes as Recipe[]).filter(r => r.id !== recipe.id);
      recipes.push(recipe);
      inMemoryCache.recipes = recipes;
      await indexedDbService.put('recipes', recipe);

      if (ingredients) {
        const allIngs = (inMemoryCache.recipe_ingredients as RecipeIngredient[]).filter(ri => ri.recipeId !== recipe.id);
        const newIngs = ingredients.map(ing => ({ ...ing, id: generateUUID(), recipeId: recipe.id }));
        inMemoryCache.recipe_ingredients = [...allIngs, ...newIngs];
        await indexedDbService.setAll('recipe_ingredients', [...allIngs, ...newIngs]);
      }

      if (packagings) {
        const allPacks = (inMemoryCache.recipe_packaging as RecipePackaging[]).filter(rp => rp.recipeId !== recipe.id);
        const newPacks = packagings.map(p => ({ ...p, id: generateUUID(), recipeId: recipe.id }));
        inMemoryCache.recipe_packaging = [...allPacks, ...newPacks];
        await indexedDbService.setAll('recipe_packaging', [...allPacks, ...newPacks]);
      }
      return;
    }

    // 2. SUPABASE A CONFIRMÉ (OU MODE ESSENTIEL LOCAL) : METTRE À JOUR LE LOCAL
    const recipes = this.getRecipes();
    const index = recipes.findIndex(r => r.id === recipe.id);
    if (index >= 0) {
      recipes[index] = recipe;
    } else {
      recipes.push(recipe);
    }
    inMemoryCache.recipes = recipes;
    saveTable(KEYS.RECIPES, recipes);
    await indexedDbService.put('recipes', recipe);

    if (ingredients) {
      const allIngredients = getTable<RecipeIngredient>(KEYS.RECIPE_INGREDIENTS).filter(ri => ri.recipeId !== recipe.id);
      const newIngredients = ingredients.map((ing) => ({
        ...ing,
        id: generateUUID(),
        recipeId: recipe.id
      }));
      inMemoryCache.recipe_ingredients = [...allIngredients, ...newIngredients];
      saveTable(KEYS.RECIPE_INGREDIENTS, [...allIngredients, ...newIngredients]);
      await indexedDbService.setAll('recipe_ingredients', [...allIngredients, ...newIngredients]);
    }

    if (packagings) {
      const allPackagings = getTable<RecipePackaging>(KEYS.RECIPE_PACKAGING).filter(rp => rp.recipeId !== recipe.id);
      const newPackagings = packagings.map((pack) => ({
        ...pack,
        id: generateUUID(),
        recipeId: recipe.id
      }));
      inMemoryCache.recipe_packaging = [...allPackagings, ...newPackagings];
      saveTable(KEYS.RECIPE_PACKAGING, [...allPackagings, ...newPackagings]);
      await indexedDbService.setAll('recipe_packaging', [...allPackagings, ...newPackagings]);
    }
  },

  async saveRecipeIngredient(ingredient: RecipeIngredient): Promise<void> {
    assertAccessKnown();
    if (!isUUID(ingredient.id)) ingredient.id = generateUUID();
    if (isCloudMode()) {
      try {
        await cloudDbService.saveRecipeIngredient(ingredient);
      } catch (err: unknown) {
        notifyCloudError('Enregistrement ingrédient cloud refusé', err instanceof Error ? err.message : String(err));
        throw err;
      }
      const list = (inMemoryCache.recipe_ingredients as RecipeIngredient[]).filter(i => i.id !== ingredient.id);
      list.push(ingredient);
      inMemoryCache.recipe_ingredients = list;
      await indexedDbService.put('recipe_ingredients', ingredient);
      return;
    }
    const list = this.getAllRecipeIngredients().filter(i => i.id !== ingredient.id);
    list.push(ingredient);
    this.setAllRecipeIngredients(list);
  },

  async saveRecipePackaging(packaging: RecipePackaging): Promise<void> {
    assertAccessKnown();
    if (!isUUID(packaging.id)) packaging.id = generateUUID();
    if (isCloudMode()) {
      try {
        await cloudDbService.saveRecipePackaging(packaging);
      } catch (err: unknown) {
        notifyCloudError('Enregistrement emballage cloud refusé', err instanceof Error ? err.message : String(err));
        throw err;
      }
      const list = (inMemoryCache.recipe_packaging as RecipePackaging[]).filter(p => p.id !== packaging.id);
      list.push(packaging);
      inMemoryCache.recipe_packaging = list;
      await indexedDbService.put('recipe_packaging', packaging);
      return;
    }
    const list = this.getAllRecipePackagings().filter(p => p.id !== packaging.id);
    list.push(packaging);
    this.setAllRecipePackagings(list);
  },

  async deleteRecipe(id: string): Promise<void> {
    assertAccessKnown();
    if (isCloudMode()) {
      try {
        await cloudDbService.deleteRecipe(id);
      } catch (err: unknown) {
        notifyCloudError('Suppression recette cloud refusée', err instanceof Error ? err.message : String(err));
        throw err;
      }
      inMemoryCache.recipes = (inMemoryCache.recipes as Recipe[]).filter(r => r.id !== id);
      await indexedDbService.delete('recipes', id);

      inMemoryCache.recipe_ingredients = (inMemoryCache.recipe_ingredients as RecipeIngredient[]).filter(ri => ri.recipeId !== id);
      await indexedDbService.setAll('recipe_ingredients', inMemoryCache.recipe_ingredients as RecipeIngredient[]);

      inMemoryCache.recipe_packaging = (inMemoryCache.recipe_packaging as RecipePackaging[]).filter(rp => rp.recipeId !== id);
      await indexedDbService.setAll('recipe_packaging', inMemoryCache.recipe_packaging as RecipePackaging[]);
      return;
    }
    const recipes = this.getRecipes().filter(r => r.id !== id);
    inMemoryCache.recipes = recipes;
    saveTable(KEYS.RECIPES, recipes);
    await indexedDbService.delete('recipes', id);

    const ingredients = getTable<RecipeIngredient>(KEYS.RECIPE_INGREDIENTS).filter(ri => ri.recipeId !== id);
    inMemoryCache.recipe_ingredients = ingredients;
    saveTable(KEYS.RECIPE_INGREDIENTS, ingredients);
    await indexedDbService.setAll('recipe_ingredients', ingredients);

    const packagings = getTable<RecipePackaging>(KEYS.RECIPE_PACKAGING).filter(rp => rp.recipeId !== id);
    inMemoryCache.recipe_packaging = packagings;
    saveTable(KEYS.RECIPE_PACKAGING, packagings);
    await indexedDbService.setAll('recipe_packaging', packagings);
  },

  // --- CALCUL DU COÛT DE REVIENT ---
  calculateRecipeCost(recipeId: string): {
    ingredientsCost: number;
    packagingCost: number;
    totalCost: number;
    costPerPortion: number;
    marginPercent: number;
    suggestedSellingPrice: number;
    hasIncompatibleUnits: boolean;
    incompatibleDetails: string[];
    isApproximate: boolean;
  } {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) {
      return {
        ingredientsCost: 0,
        packagingCost: 0,
        totalCost: 0,
        costPerPortion: 0,
        marginPercent: 0,
        suggestedSellingPrice: 0,
        hasIncompatibleUnits: false,
        incompatibleDetails: [],
        isApproximate: false,
      };
    }

    const ingredients = this.getRecipeIngredients(recipeId);
    const packagings = this.getRecipePackagings(recipeId);
    const products = this.getProducts();

    // 1. Coût des ingrédients
    let ingredientsCost = 0;
    let hasIncompatibleUnits = false;
    let isApproximate = false;
    const incompatibleDetails: string[] = [];

    ingredients.forEach(ing => {
      if (ing.productId) {
        const prod = products.find(p => p.id === ing.productId);
        if (prod) {
          // Convertir la quantité de la recette vers l'unité de stock du produit
          const conv = convertUnitsWithInfo(ing.qtyUsed, ing.unit, prod.unit, prod);
          if (conv.value === null) {
            hasIncompatibleUnits = true;
            incompatibleDetails.push(
              `${prod.name} : Unités incompatibles : recette en ${normalizeUnit(ing.unit) || ing.unit}, stock en ${normalizeUnit(prod.unit) || prod.unit}`
            );
          } else {
            if (conv.approximate) {
              isApproximate = true;
            }
            ingredientsCost += conv.value * prod.avgPurchasePrice;
          }
        }
      } else if (ing.customCostPerUnit) {
        // Ingrédient non lié avec coût estimé
        ingredientsCost += ing.qtyUsed * ing.customCostPerUnit;
      }
    });

    // 2. Coût des emballages
    let packagingCost = 0;
    packagings.forEach(pack => {
      // Si l'emballage correspond à un produit enregistré en stock, on utilise son prix d'achat moyen
      const prod = products.find(p => p.name.toLowerCase() === pack.name.toLowerCase() || p.id === pack.name);
      const unitCost = prod ? prod.avgPurchasePrice : pack.costPerUnit;
      packagingCost += pack.qtyUsed * unitCost;
    });

    const totalCost = ingredientsCost + packagingCost;
    const costPerPortion = recipe.portions > 0 ? totalCost / recipe.portions : totalCost;

    // Calcul du prix suggéré selon la marge cible par défaut
    const settings = this.getSettings();
    const defaultMargin = settings.defaultTargetMargin; // ex 60%
    // Prix = Cout / (1 - Marge)
    const suggestedSellingPrice = defaultMargin < 100 
      ? costPerPortion / (1 - (defaultMargin / 100)) 
      : costPerPortion * 2;

    // Calcul de la marge actuelle théorique en pourcentage (nous le ferons au niveau du composant avec le prix réel)
    return {
      ingredientsCost: Number(ingredientsCost.toFixed(2)),
      packagingCost: Number(packagingCost.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      costPerPortion: Number(costPerPortion.toFixed(2)),
      marginPercent: defaultMargin,
      suggestedSellingPrice: Number(suggestedSellingPrice.toFixed(2)),
      hasIncompatibleUnits,
      incompatibleDetails,
      isApproximate,
    };
  },

  // --- PRODUCTIONS (FABRICATIONS) ---
  getProductions(): Production[] {
    return getTableData<Production>('productions', KEYS.PRODUCTIONS);
  },

  async addProduction(production: Production): Promise<{ success: boolean; error?: string }> {
    assertAccessKnown();
    const recipe = this.getRecipe(production.recipeId);
    if (!recipe) return { success: false, error: 'Recette non trouvée' };

    const ingredients = this.getRecipeIngredients(production.recipeId);
    const packagings = this.getRecipePackagings(production.recipeId);
    const products = this.getProducts();

    // Facteur d'échelle de la production (portions produites / portions de base de la recette)
    const factor = production.portionsProduced / recipe.portions;

    // 1. Vérifier les unités compatibles et si les stocks sont suffisants
    const incompatibleItems: string[] = [];
    const missingItems: string[] = [];
    ingredients.forEach(ing => {
      const prod = products.find(p => p.id === ing.productId);
      if (prod) {
        const qtyNeeded = convertUnits(ing.qtyUsed * factor, ing.unit, prod.unit, prod);
        if (qtyNeeded === null) {
          incompatibleItems.push(
            `${prod.name} (Unités incompatibles : recette en ${normalizeUnit(ing.unit) || ing.unit}, stock en ${normalizeUnit(prod.unit) || prod.unit})`
          );
        } else if (prod.stock < qtyNeeded) {
          missingItems.push(`${prod.name} (Requis: ${qtyNeeded.toFixed(2)} ${prod.unit}, En Stock: ${prod.stock.toFixed(2)} ${prod.unit})`);
        }
      }
    });

    if (incompatibleItems.length > 0) {
      return {
        success: false,
        error: `Impossible de cuisiner — unités incompatibles :\n- ${incompatibleItems.join('\n- ')}`,
      };
    }

    // Vérifier aussi les emballages s'ils sont gérés en stock
    packagings.forEach(pack => {
      const prod = products.find(p => p.name.toLowerCase() === pack.name.toLowerCase());
      if (prod) {
        const qtyNeeded = pack.qtyUsed * factor;
        if (prod.stock < qtyNeeded) {
          missingItems.push(`${prod.name} (Requis: ${qtyNeeded} pièces, En Stock: ${prod.stock} pièces)`);
        }
      }
    });

    if (missingItems.length > 0) {
      return { 
        success: false, 
        error: `Stocks insuffisants pour :\n- ${missingItems.join('\n- ')}` 
      };
    }

    if (!isUUID(production.id)) {
      production.id = generateUUID();
    }

    // CLOUD FIRST : Écriture dans Supabase D'ABORD si mode cloud
    if (isCloudMode()) {
      try {
        await cloudDbService.saveProduction(production);
      } catch (err: unknown) {
        notifyCloudError('Enregistrement fabrication cloud refusé', err instanceof Error ? err.message : String(err));
        throw err;
      }
    }

    // 2. Déduire les ingrédients du stock
    for (const ing of ingredients) {
      const prod = products.find(p => p.id === ing.productId);
      if (prod) {
        const qtyNeeded = convertUnits(ing.qtyUsed * factor, ing.unit, prod.unit, prod);
        if (qtyNeeded === null) continue;
        prod.stock = Math.max(0, prod.stock - qtyNeeded);
        await this.saveProduct(prod);

        // Enregistrer le mouvement de stock négatif
        await this.addStockMovement({
          id: generateUUID(),
          date: production.date,
          productId: prod.id,
          qty: -qtyNeeded,
          type: 'PRODUCTION_CONSOMMATION',
          refId: production.id,
          notes: `Consommation pour la production de ${production.portionsProduced} portions de ${recipe.name}`
        });
      }
    }

    // 3. Déduire les emballages du stock
    for (const pack of packagings) {
      const prod = products.find(p => p.name.toLowerCase() === pack.name.toLowerCase());
      if (prod) {
        const qtyNeeded = pack.qtyUsed * factor;
        prod.stock = Math.max(0, prod.stock - qtyNeeded);
        await this.saveProduct(prod);

        // Enregistrer le mouvement de stock négatif
        await this.addStockMovement({
          id: generateUUID(),
          date: production.date,
          productId: prod.id,
          qty: -qtyNeeded,
          type: 'PRODUCTION_CONSOMMATION',
          refId: production.id,
          notes: `Consommation emballage pour la production de ${recipe.name}`
        });
      }
    }

    // 4. Augmenter le stock de produit fini de la recette
    const recipes = this.getRecipes();
    const recipeIndex = recipes.findIndex(r => r.id === recipe.id);
    if (recipeIndex >= 0) {
      recipes[recipeIndex].stock += production.portionsProduced;
      if (isCloudMode()) {
        try {
          await cloudDbService.saveRecipe(recipes[recipeIndex]);
        } catch (err: unknown) {
          console.warn('[dbService] Erreur mise à jour stock recette cloud:', err);
        }
      }
      inMemoryCache.recipes = recipes;
      saveTable(KEYS.RECIPES, recipes);
      await indexedDbService.put('recipes', recipes[recipeIndex]);
    }

    // 5. Enregistrer la production
    if (isCloudMode()) {
      const prods = (inMemoryCache.productions as Production[]).filter(p => p.id !== production.id);
      prods.push(production);
      inMemoryCache.productions = prods;
      await indexedDbService.put('productions', production);
    } else {
      const productions = this.getProductions();
      productions.push(production);
      inMemoryCache.productions = productions;
      saveTable(KEYS.PRODUCTIONS, productions);
      await indexedDbService.put('productions', production);
    }

    return { success: true };
  },

  async saveProduction(production: Production): Promise<void> {
    assertAccessKnown();
    if (!isUUID(production.id)) {
      production.id = generateUUID();
    }
    if (isCloudMode()) {
      try {
        await cloudDbService.saveProduction(production);
      } catch (err: unknown) {
        notifyCloudError('Enregistrement fabrication cloud refusé', err instanceof Error ? err.message : String(err));
        throw err;
      }
      const prods = (inMemoryCache.productions as Production[]).filter(p => p.id !== production.id);
      prods.push(production);
      inMemoryCache.productions = prods;
      await indexedDbService.put('productions', production);
      return;
    }
    const prods = this.getProductions().filter(p => p.id !== production.id);
    prods.push(production);
    inMemoryCache.productions = prods;
    saveTable(KEYS.PRODUCTIONS, prods);
    await indexedDbService.put('productions', production);
  },

  async deleteProduction(id: string): Promise<{ success: boolean; error?: string }> {
    assertAccessKnown();
    const productions = this.getProductions();
    const production = productions.find(p => p.id === id);
    if (!production) {
      return { success: false, error: 'Fabrication introuvable.' };
    }

    const recipe = this.getRecipe(production.recipeId);

    // 1. Remettre en stock les ingrédients consommés (d’après les mouvements de stock liés à cette production)
    const allMovements = this.getStockMovements();
    const prodMovements = allMovements.filter(m => m.refId === production.id);

    if (prodMovements.length > 0) {
      for (const m of prodMovements) {
        const prod = this.getProduct(m.productId);
        if (prod) {
          prod.stock += Math.abs(m.qty);
          await this.saveProduct(prod);
        }
      }
    } else if (recipe) {
      // Fallback si la fabrication n'avait pas de mouvements de stock explicites (anciennes données démo)
      const ingredients = this.getRecipeIngredients(production.recipeId);
      const packagings = this.getRecipePackagings(production.recipeId);
      const factor = production.portionsProduced / recipe.portions;
      const products = this.getProducts();

      for (const ing of ingredients) {
        const prod = products.find(p => p.id === ing.productId);
        if (prod) {
          const qtyNeeded = convertUnits(ing.qtyUsed * factor, ing.unit, prod.unit, prod);
          if (qtyNeeded !== null) {
            prod.stock += qtyNeeded;
            await this.saveProduct(prod);
          }
        }
      }

      for (const pack of packagings) {
        const prod = products.find(p => p.name.toLowerCase() === pack.name.toLowerCase());
        if (prod) {
          const qtyNeeded = pack.qtyUsed * factor;
          prod.stock += qtyNeeded;
          await this.saveProduct(prod);
        }
      }
    }

    // 2. Retirer les portions du stock de produits finis
    if (recipe) {
      recipe.stock = Math.max(0, recipe.stock - production.portionsProduced);
      if (isCloudMode()) {
        try {
          await cloudDbService.saveRecipe(recipe);
        } catch (err: unknown) {
          console.warn('[dbService] Erreur mise à jour stock recette cloud lors de l\'annulation:', err);
        }
      }
      const recipes = this.getRecipes();
      const rIdx = recipes.findIndex(r => r.id === recipe.id);
      if (rIdx >= 0) {
        recipes[rIdx].stock = recipe.stock;
        inMemoryCache.recipes = recipes;
        saveTable(KEYS.RECIPES, recipes);
        await indexedDbService.put('recipes', recipes[rIdx]);
      }
    }

    // 3. Supprimer les mouvements de stock associés à cette production
    if (isCloudMode()) {
      try {
        await cloudDbService.deleteStockMovementsByRefId(production.id);
      } catch (err: unknown) {
        console.warn('[dbService] Erreur suppression mouvements cloud:', err);
      }
      inMemoryCache.stock_movements = (inMemoryCache.stock_movements as StockMovement[]).filter(m => m.refId !== production.id);
      await indexedDbService.setAll('stock_movements', inMemoryCache.stock_movements as StockMovement[]);
    } else {
      const remainingMovements = allMovements.filter(m => m.refId !== production.id);
      this.setStockMovements(remainingMovements);
    }

    // 4. Supprimer la fabrication
    if (isCloudMode()) {
      try {
        await cloudDbService.deleteProduction(production.id);
      } catch (err: unknown) {
        notifyCloudError('Suppression de la fabrication refusée', err instanceof Error ? err.message : String(err));
        throw err;
      }
      inMemoryCache.productions = (inMemoryCache.productions as Production[]).filter(p => p.id !== production.id);
      await indexedDbService.delete('productions', production.id);
    } else {
      const remainingProds = productions.filter(p => p.id !== production.id);
      this.setProductions(remainingProds);
      await indexedDbService.delete('productions', production.id);
    }

    return { success: true };
  },

  setProductions(productions: Production[]): void {
    inMemoryCache.productions = productions;
    saveTable(KEYS.PRODUCTIONS, productions);
    indexedDbService.setAll('productions', productions);
  },

  // --- VENTES (SALES) ---
  getSales(): Sale[] {
    return getTableData<Sale>('sales', KEYS.SALES);
  },

  setSales(sales: Sale[]): void {
    inMemoryCache.sales = sales;
    saveTable(KEYS.SALES, sales);
    indexedDbService.setAll('sales', sales);
  },

  async addSale(sale: Sale): Promise<void> {
    assertAccessKnown();
    if (!isUUID(sale.id)) {
      sale.id = generateUUID();
    }

    // CLOUD FIRST : Écriture dans Supabase D'ABORD si mode cloud
    if (isCloudMode()) {
      try {
        await cloudDbService.saveSale(sale);
      } catch (err: unknown) {
        notifyCloudError('Enregistrement vente cloud refusé', err instanceof Error ? err.message : String(err));
        throw err;
      }
      const sales = (inMemoryCache.sales as Sale[]).filter(s => s.id !== sale.id);
      sales.push(sale);
      inMemoryCache.sales = sales;
      await indexedDbService.put('sales', sale);
    } else {
      const sales = this.getSales();
      sales.push(sale);
      inMemoryCache.sales = sales;
      saveTable(KEYS.SALES, sales);
      await indexedDbService.put('sales', sale);
    }

    // Déduction automatique du stock de produit fini ou d'ingrédient direct
    if (sale.itemType === 'RECIPE') {
      const recipes = this.getRecipes();
      const recipe = recipes.find(r => r.id === sale.itemId);
      if (recipe) {
        recipe.stock = Math.max(0, recipe.stock - sale.qtySold);
        inMemoryCache.recipes = recipes;
        saveTable(KEYS.RECIPES, recipes);
        await indexedDbService.put('recipes', recipe);
      }
    } else {
      const products = this.getProducts();
      const product = products.find(p => p.id === sale.itemId);
      if (product) {
        product.stock = Math.max(0, product.stock - sale.qtySold);
        await this.saveProduct(product);

        // Créer un mouvement de stock
        await this.addStockMovement({
          id: generateUUID(),
          date: sale.date,
          productId: sale.itemId,
          qty: -sale.qtySold,
          type: 'VENTE_DIRECTE',
          refId: sale.id,
          notes: `Vente directe (${sale.location})`
        });
      }
    }
  },

  async deleteSale(id: string): Promise<void> {
    assertAccessKnown();
    if (isCloudMode()) {
      try {
        await cloudDbService.deleteSale(id);
      } catch (err: unknown) {
        notifyCloudError('Suppression vente cloud refusée', err instanceof Error ? err.message : String(err));
        throw err;
      }
      inMemoryCache.sales = (inMemoryCache.sales as Sale[]).filter(s => s.id !== id);
      await indexedDbService.delete('sales', id);
    } else {
      const updatedSales = this.getSales().filter(s => s.id !== id);
      inMemoryCache.sales = updatedSales;
      saveTable(KEYS.SALES, updatedSales);
      await indexedDbService.delete('sales', id);
    }

    const sale = this.getSales().find(s => s.id === id);
    if (!sale) return;

    // Rétablir le stock
    if (sale.itemType === 'RECIPE') {
      const recipes = this.getRecipes();
      const recipe = recipes.find(r => r.id === sale.itemId);
      if (recipe) {
        recipe.stock += sale.qtySold;
        inMemoryCache.recipes = recipes;
        saveTable(KEYS.RECIPES, recipes);
        await indexedDbService.put('recipes', recipe);
      }
    } else {
      const products = this.getProducts();
      const product = products.find(p => p.id === sale.itemId);
      if (product) {
        product.stock += sale.qtySold;
        await this.saveProduct(product);
      }

      // Supprimer le mouvement de stock
      const movements = this.getStockMovements().filter(m => !(m.type === 'VENTE_DIRECTE' && m.refId === id));
      inMemoryCache.stock_movements = movements;
      saveTable(KEYS.STOCK_MOVEMENTS, movements);
      await indexedDbService.setAll('stock_movements', movements);
    }
  },

  async saveSale(sale: Sale): Promise<void> {
    assertAccessKnown();
    if (!isUUID(sale.id)) {
      sale.id = generateUUID();
    }
    if (isCloudMode()) {
      try {
        await cloudDbService.saveSale(sale);
      } catch (err: unknown) {
        notifyCloudError('Enregistrement vente cloud refusé', err instanceof Error ? err.message : String(err));
        throw err;
      }
      const sales = (inMemoryCache.sales as Sale[]).filter(s => s.id !== sale.id);
      sales.push(sale);
      inMemoryCache.sales = sales;
      await indexedDbService.put('sales', sale);
      return;
    }
    const sales = this.getSales().filter(s => s.id !== sale.id);
    sales.push(sale);
    inMemoryCache.sales = sales;
    saveTable(KEYS.SALES, sales);
    await indexedDbService.put('sales', sale);
  },

  // --- EXPORTATION ET IMPORTATION CSV (GOOGLE SHEETS COMPATIBLE) ---
  exportToCSV(tableName: keyof typeof KEYS): string {
    const dataMap: Record<keyof typeof KEYS, () => Record<string, unknown>[]> = {
      PRODUCTS: () => dbService.getProducts() as unknown as Record<string, unknown>[],
      PURCHASES: () => dbService.getPurchases() as unknown as Record<string, unknown>[],
      STORES: () => dbService.getStores() as unknown as Record<string, unknown>[],
      RECIPES: () => dbService.getRecipes() as unknown as Record<string, unknown>[],
      RECIPE_INGREDIENTS: () => dbService.getAllRecipeIngredients() as unknown as Record<string, unknown>[],
      RECIPE_PACKAGING: () => dbService.getAllRecipePackagings() as unknown as Record<string, unknown>[],
      PRODUCTIONS: () => dbService.getProductions() as unknown as Record<string, unknown>[],
      SALES: () => dbService.getSales() as unknown as Record<string, unknown>[],
      STOCK_MOVEMENTS: () => dbService.getStockMovements() as unknown as Record<string, unknown>[],
      SETTINGS: () => [dbService.getSettings() as unknown as Record<string, unknown>],
    };

    const getter = dataMap[tableName];
    const data = getter ? getter() : getTable<Record<string, unknown>>(KEYS[tableName]);
    if (data.length === 0) return '';

    // Déterminer les colonnes (les clés du premier objet)
    const headers = Object.keys(data[0]);
    
    // Générer la chaîne CSV avec point-virgule (préféré en France pour Google Sheets)
    const csvRows = [];
    csvRows.push(headers.join(';'));

    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        if (val === undefined || val === null) {
          return '';
        }
        
        // Convertir en string et échapper les double quotes et les points-virgules
        let valStr = String(val);
        if (typeof val === 'number') {
          // Utiliser la virgule pour les décimaux sur les nombres pour la compatibilité Excel/Sheets FR
          valStr = valStr.replace('.', ',');
        }
        
        if (valStr.includes(';') || valStr.includes('\n') || valStr.includes('"')) {
          valStr = `"${valStr.replace(/"/g, '""')}"`;
        }
        return valStr;
      });
      csvRows.push(values.join(';'));
    }

    return csvRows.join('\n');
  },

  async importFromCSV(
    tableName: keyof typeof KEYS,
    csvText: string,
    merge = true
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length <= 1) return { success: false, count: 0, error: 'Fichier vide ou sans en-tête' };

      // Deviner le séparateur (; ou ,)
      const firstLine = lines[0];
      const sep = firstLine.includes(';') ? ';' : ',';
      
      const headers = firstLine.split(sep).map(h => h.trim().replace(/^"|"$/g, ''));
      
      const parsedData: Record<string, unknown>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        let cells: string[] = [];
        if (sep === ';') {
          cells = line.match(/(".*?"|[^;]+)(?=\s*;|\s*$)/g) || line.split(';');
        } else {
          cells = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || line.split(',');
        }

        cells = cells.map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

        const obj: Record<string, unknown> = {};
        headers.forEach((header, idx) => {
          const rawCell = cells[idx] !== undefined ? cells[idx] : '';
          let cellValue: string | number | boolean;

          if (rawCell === 'true') cellValue = true;
          else if (rawCell === 'false') cellValue = false;
          else if (rawCell !== '' && !isNaN(Number(rawCell.replace(',', '.')))) {
            cellValue = Number(rawCell.replace(',', '.'));
          } else {
            cellValue = rawCell;
          }

          obj[header] = cellValue;
        });

        if (obj.id || obj.name || obj.businessName) {
          parsedData.push(obj);
        }
      }

      if (parsedData.length === 0) {
        return { success: false, count: 0, error: 'Aucune ligne valide trouvée dans le fichier.' };
      }

      // En mode Cloud : passer obligatoirement par les services dbService existants avec UUID valides
      if (isCloudMode()) {
        let importedCount = 0;
        for (const row of parsedData) {
          const rowId = toDeterministicUUID(row.id);
          switch (tableName) {
            case 'STORES': {
              const store: Store = {
                id: rowId,
                name: String(row.name || '').trim(),
                type: String(row.type || 'Autre'),
                address: row.address ? String(row.address) : undefined,
                phone: row.phone ? String(row.phone) : undefined,
                notes: row.notes ? String(row.notes) : undefined,
              };
              await this.saveStore(store);
              importedCount++;
              break;
            }
            case 'PRODUCTS': {
              const product: Product = {
                id: rowId,
                barcode: row.barcode ? String(row.barcode) : '',
                name: String(row.name || '').trim(),
                category: String(row.category || 'Épicerie'),
                unit: String(row.unit || 'kg'),
                brand: row.brand ? String(row.brand) : '',
                format: row.format ? String(row.format) : '',
                stock: Number(row.stock ?? 0),
                minStockAlert: Number(row.minStockAlert ?? 0),
                avgPurchasePrice: Number(row.avgPurchasePrice ?? 0),
                mainStoreId: row.mainStoreId ? toDeterministicUUID(row.mainStoreId) : '',
                notes: row.notes ? String(row.notes) : '',
                isActive: row.isActive !== false,
                photo: row.photo ? String(row.photo) : undefined,
                unitWeightG: row.unitWeightG != null && !isNaN(Number(row.unitWeightG)) ? Number(row.unitWeightG) : (row.unit_weight_g != null && !isNaN(Number(row.unit_weight_g)) ? Number(row.unit_weight_g) : undefined),
                densityGPerMl: row.densityGPerMl != null && !isNaN(Number(row.densityGPerMl)) ? Number(row.densityGPerMl) : (row.density_g_per_ml != null && !isNaN(Number(row.density_g_per_ml)) ? Number(row.density_g_per_ml) : undefined),
                allergens: Array.isArray(row.allergens) ? row.allergens : (typeof row.allergens === 'string' ? (row.allergens as string).split(';').map((s: string) => s.trim()).filter(Boolean) : []),
              };
              await this.saveProduct(product);
              importedCount++;
              break;
            }
            case 'RECIPES': {
              const recipe: Recipe = {
                id: rowId,
                name: String(row.name || '').trim(),
                category: String(row.category || 'Plats'),
                description: row.description ? String(row.description) : '',
                portions: Number(row.portions ?? 1),
                yieldQty: Number(row.yieldQty ?? 1),
                yieldUnit: String(row.yieldUnit || 'portion'),
                stock: Number(row.stock ?? 0),
                prepTimeMinutes: row.prepTimeMinutes ? Number(row.prepTimeMinutes) : undefined,
                utensilsNotes: row.utensilsNotes ? String(row.utensilsNotes) : undefined,
                notes: row.notes ? String(row.notes) : undefined,
                isActive: row.isActive !== false,
                photo: row.photo ? String(row.photo) : undefined,
                instructions: row.instructions ? String(row.instructions) : undefined,
              };
              await this.saveRecipe(recipe);
              importedCount++;
              break;
            }
            case 'RECIPE_INGREDIENTS': {
              const ing: RecipeIngredient = {
                id: rowId,
                recipeId: toDeterministicUUID(row.recipeId),
                productId: row.productId ? toDeterministicUUID(row.productId) : '',
                customName: row.customName ? String(row.customName) : undefined,
                qtyUsed: Number(row.qtyUsed ?? 0),
                unit: String(row.unit || 'g'),
                customCostPerUnit: row.customCostPerUnit ? Number(row.customCostPerUnit) : undefined,
              };
              await this.saveRecipeIngredient(ing);
              importedCount++;
              break;
            }
            case 'RECIPE_PACKAGING': {
              const pack: RecipePackaging = {
                id: rowId,
                recipeId: toDeterministicUUID(row.recipeId),
                name: String(row.name || '').trim(),
                qtyUsed: Number(row.qtyUsed ?? 1),
                costPerUnit: Number(row.costPerUnit ?? 0),
              };
              await this.saveRecipePackaging(pack);
              importedCount++;
              break;
            }
            case 'PURCHASES': {
              const purchase: Purchase = {
                id: rowId,
                date: String(row.date || new Date().toISOString().split('T')[0]),
                productId: toDeterministicUUID(row.productId),
                qty: Number(row.qty ?? 0),
                unit: String(row.unit || 'kg'),
                pricePaid: Number(row.pricePaid ?? 0),
                unitPrice: Number(row.unitPrice ?? 0),
                storeId: row.storeId ? toDeterministicUUID(row.storeId) : '',
                batchNo: row.batchNo ? String(row.batchNo) : undefined,
                expiryDate: row.expiryDate ? String(row.expiryDate) : undefined,
                notes: row.notes ? String(row.notes) : undefined,
              };
              await this.savePurchase(purchase);
              importedCount++;
              break;
            }
            case 'PRODUCTIONS': {
              const prod: Production = {
                id: rowId,
                date: String(row.date || new Date().toISOString().split('T')[0]),
                recipeId: toDeterministicUUID(row.recipeId),
                portionsProduced: Number(row.portionsProduced ?? 1),
                calculatedCost: Number(row.calculatedCost ?? 0),
                notes: row.notes ? String(row.notes) : undefined,
              };
              await this.saveProduction(prod);
              importedCount++;
              break;
            }
            case 'SALES': {
              const sale: Sale = {
                id: rowId,
                date: String(row.date || new Date().toISOString().split('T')[0]),
                itemId: toDeterministicUUID(row.itemId),
                itemType: (row.itemType === 'PRODUCT' ? 'PRODUCT' : 'RECIPE') as 'RECIPE' | 'PRODUCT',
                qtySold: Number(row.qtySold ?? 1),
                unitPrice: Number(row.unitPrice ?? 0),
                location: String(row.location || 'Boutique'),
                notes: row.notes ? String(row.notes) : undefined,
              };
              await this.saveSale(sale);
              importedCount++;
              break;
            }
            case 'STOCK_MOVEMENTS': {
              const movement: StockMovement = {
                id: rowId,
                date: String(row.date || new Date().toISOString().split('T')[0]),
                productId: toDeterministicUUID(row.productId),
                qty: Number(row.qty ?? 0),
                type: (row.type as StockMovement['type']) || 'AJUSTEMENT',
                refId: row.refId ? (row.refId === 'MANUAL' ? 'MANUAL' : toDeterministicUUID(row.refId)) : 'MANUAL',
                notes: row.notes ? String(row.notes) : undefined,
              };
              await this.addStockMovement(movement);
              importedCount++;
              break;
            }
            case 'SETTINGS': {
              const settings: Settings = {
                ...INITIAL_SETTINGS,
                ...row,
              } as Settings;
              await this.saveSettings(settings);
              importedCount++;
              break;
            }
          }
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('marmicout-data-synced'));
          window.dispatchEvent(new Event('storage'));
        }

        return { success: true, count: importedCount };
      }

      // Mode Local (Essentiel) : mise à jour avec conversion UUID déterministe et stockage local
      const mappedData = parsedData.map(row => {
        const normalized = { ...row };
        if (normalized.id) normalized.id = toDeterministicUUID(normalized.id);
        if (normalized.mainStoreId) normalized.mainStoreId = toDeterministicUUID(normalized.mainStoreId);
        if (normalized.recipeId) normalized.recipeId = toDeterministicUUID(normalized.recipeId);
        if (normalized.productId) normalized.productId = toDeterministicUUID(normalized.productId);
        if (normalized.storeId) normalized.storeId = toDeterministicUUID(normalized.storeId);
        if (normalized.itemId) normalized.itemId = toDeterministicUUID(normalized.itemId);
        if (normalized.refId && normalized.refId !== 'MANUAL') normalized.refId = toDeterministicUUID(normalized.refId);
        return normalized;
      });

      const existingData = merge ? getTable<Record<string, unknown>>(KEYS[tableName]) : [];
      const mergedMap = new Map();
      existingData.forEach(item => mergedMap.set(item.id, item));
      mappedData.forEach(item => mergedMap.set(item.id, item));

      const finalData = Array.from(mergedMap.values());
      saveTable(KEYS[tableName], finalData);

      // Synchroniser également le cache mémoire et IndexedDB en local
      const storeNameMap: Record<keyof typeof KEYS, string> = {
        PRODUCTS: 'products',
        PURCHASES: 'purchases',
        STORES: 'stores',
        RECIPES: 'recipes',
        RECIPE_INGREDIENTS: 'recipe_ingredients',
        RECIPE_PACKAGING: 'recipe_packaging',
        PRODUCTIONS: 'productions',
        SALES: 'sales',
        STOCK_MOVEMENTS: 'stock_movements',
        SETTINGS: 'settings',
      };
      const storeName = storeNameMap[tableName];
      if (storeName && storeName !== 'settings') {
        inMemoryCache[storeName] = finalData;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await indexedDbService.setAll(storeName as any, finalData);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('marmicout-data-synced'));
        window.dispatchEvent(new Event('storage'));
      }

      return { success: true, count: mappedData.length };
    } catch (err: unknown) {
      return { success: false, count: 0, error: (err as Error).message || 'Erreur inconnue de lecture CSV' };
    }
  }
};
