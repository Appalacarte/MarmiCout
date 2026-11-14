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


// --- LOGIQUE DE CONVERSION DES UNITES ---
export function convertUnits(qty: number, fromUnit: string, toUnit: string): number {
  const f = fromUnit.trim().toLowerCase();
  const t = toUnit.trim().toLowerCase();
  if (f === t) return qty;

  // Conversions de masse (base: kg)
  if (f === 'g' && t === 'kg') return qty / 1000;
  if (f === 'kg' && t === 'g') return qty * 1000;

  // Conversions de volume (base: l)
  if (f === 'ml' && t === 'l') return qty / 1000;
  if (f === 'l' && t === 'ml') return qty * 1000;
  if (f === 'cl' && t === 'l') return qty / 100;
  if (f === 'l' && t === 'cl') return qty * 100;
  if (f === 'cl' && t === 'ml') return qty * 10;
  if (f === 'ml' && t === 'cl') return qty / 10;

  return qty; // Non convertible ou identique
}

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
  { id: 'A1', date: '2026-06-10', productId: 'P1', qty: 10, unit: 'kg', pricePaid: 15.0, unitPrice: 1.5, storeId: 'S3', notes: 'Achat de gros' },
  { id: 'A2', date: '2026-06-10', productId: 'P2', qty: 15, unit: 'kg', pricePaid: 27.0, unitPrice: 1.8, storeId: 'S3', notes: 'Achat de gros' },
  { id: 'A3', date: '2026-06-11', productId: 'P3', qty: 3, unit: 'kg', pricePaid: 25.5, unitPrice: 8.5, storeId: 'S1', notes: 'Beurre frais' },
  { id: 'A4', date: '2026-06-12', productId: 'P4', qty: 20, unit: 'kg', pricePaid: 44.0, unitPrice: 2.2, storeId: 'S2', notes: 'Pommes fraîches' },
  { id: 'A5', date: '2026-06-12', productId: 'P5', qty: 60, unit: 'pièce', pricePaid: 21.0, unitPrice: 0.35, storeId: 'S2', notes: '2 cartons de 30' }
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
  units: ['kg', 'g', 'l', 'ml', 'cl', 'pièce', 'sachet', 'pot', 'bouteille', 'boite'],
  salesLocations: ['Marché', 'Commande', 'En Ligne', 'Domicile', 'Autre'],
  defaultMinStockAlert: 2,
  googleSheetId: '1SU8ypH5aufwKVoZLlCfhcw6nwdS6nBwNDvj8hKr0F2k',
  googleSheetLink: 'https://docs.google.com/spreadsheets/d/1SU8ypH5aufwKVoZLlCfhcw6nwdS6nBwNDvj8hKr0F2k/edit?usp=sharing',
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
    // S'assurer que le Google Sheet de l'utilisateur est bien configuré dans les paramètres existants
    try {
      const settingsStr = localStorage.getItem(KEYS.SETTINGS);
      if (settingsStr) {
        const currentSettings = JSON.parse(settingsStr);
        if (currentSettings.googleSheetId !== '1SU8ypH5aufwKVoZLlCfhcw6nwdS6nBwNDvj8hKr0F2k') {
          currentSettings.googleSheetId = '1SU8ypH5aufwKVoZLlCfhcw6nwdS6nBwNDvj8hKr0F2k';
          currentSettings.googleSheetLink = 'https://docs.google.com/spreadsheets/d/1SU8ypH5aufwKVoZLlCfhcw6nwdS6nBwNDvj8hKr0F2k/edit?usp=sharing';
          localStorage.setItem(KEYS.SETTINGS, JSON.stringify(currentSettings));
        }
      }
    } catch (e) {
      console.error('Erreur lors de la mise à jour automatique du Google Sheet dans les paramètres', e);
    }
  }
};

initDB();

// --- CACHE MÉMOIRE LIÉ À INDEXEDDB (MODE CLOUD & HORS LIGNE) ---
export const inMemoryCache: Record<string, any[]> = {
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
      indexedDbService.getAll<any>('settings'),
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

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('marmicout-data-synced'));
      }
    } catch (err: any) {
      console.error('[dbService] Erreur lors de la synchronisation cloud:', err);
      notifyCloudError('Erreur de synchronisation cloud', err.message || String(err));
    }
  },

  // --- PARAMÈTRES (SETTINGS) ---
  getSettings(): Settings {
    if (isCloudMode() && inMemorySettings) {
      return inMemorySettings;
    }
    initDB();
    const data = localStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : INITIAL_SETTINGS;
  },

  async saveSettings(settings: Settings): Promise<void> {
    assertAccessKnown();
    if (isCloudMode()) {
      try {
        await cloudDbService.saveSettings(settings);
      } catch (err: any) {
        notifyCloudError('Enregistrement paramètres cloud refusé', err.message || String(err));
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
      } catch (err: any) {
        notifyCloudError('Enregistrement magasin cloud refusé', err.message || String(err));
        throw err;
      }
      const stores = inMemoryCache.stores.filter(s => s.id !== store.id);
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
      } catch (err: any) {
        notifyCloudError('Suppression magasin cloud refusée', err.message || String(err));
        throw err;
      }
      inMemoryCache.stores = inMemoryCache.stores.filter(s => s.id !== id);
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
      } catch (err: any) {
        notifyCloudError('Enregistrement produit cloud refusé', err.message || String(err));
        throw err;
      }
      const products = inMemoryCache.products.filter(p => p.id !== product.id);
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
      } catch (err: any) {
        notifyCloudError('Suppression produit cloud refusée', err.message || String(err));
        throw err;
      }
      inMemoryCache.products = inMemoryCache.products.filter(p => p.id !== id);
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
    if (isCloudMode()) {
      try {
        await cloudDbService.savePurchase(purchase);
      } catch (err: any) {
        notifyCloudError('Enregistrement achat cloud refusé', err.message || String(err));
        throw err;
      }
      const purchases = inMemoryCache.purchases.filter(p => p.id !== purchase.id);
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
    const products = this.getProducts();
    const product = products.find(p => p.id === purchase.productId);
    if (product) {
      const oldStock = product.stock;
      const oldAvgPrice = product.avgPurchasePrice;
      const qtyInProductUnit = convertUnits(purchase.qty, purchase.unit, product.unit);

      // Calcul du nouveau PMP (Prix Moyen Pondéré)
      let newAvgPrice: number;
      if (oldStock <= 0) {
        newAvgPrice = purchase.pricePaid / qtyInProductUnit;
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
      } catch (err: any) {
        notifyCloudError('Suppression achat cloud refusée', err.message || String(err));
        throw err;
      }
      inMemoryCache.purchases = inMemoryCache.purchases.filter(p => p.id !== id);
      await indexedDbService.delete('purchases', id);
    }
    const purchases = this.getPurchases();
    const purchase = purchases.find(p => p.id === id);
    if (!purchase) return;

    // Déduire le stock
    const products = this.getProducts();
    const product = products.find(p => p.id === purchase.productId);
    if (product) {
      const qtyInProductUnit = convertUnits(purchase.qty, purchase.unit, product.unit);
      product.stock = Math.max(0, product.stock - qtyInProductUnit);
      await this.saveProduct(product);
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
      } catch (err: any) {
        notifyCloudError('Enregistrement mouvement stock cloud refusé', err.message || String(err));
        throw err;
      }
      const movements = inMemoryCache.stock_movements.filter(m => m.id !== movement.id);
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
    ingredients: Omit<RecipeIngredient, 'id' | 'recipeId'>[],
    packagings: Omit<RecipePackaging, 'id' | 'recipeId'>[]
  ): Promise<void> {
    assertAccessKnown();
    if (!isUUID(recipe.id)) {
      recipe.id = generateUUID();
    }

    // 1. SI MODE CLOUD : SUPABASE D'ABORD (AUCUNE MODIFICATION LOCALE SI ÉCHEC)
    if (isCloudMode()) {
      try {
        await cloudDbService.saveRecipe(recipe, ingredients, packagings);
      } catch (err: any) {
        notifyCloudError('Enregistrement recette cloud refusé', err.message || String(err));
        // NE PAS MODIFIER LE STOCKAGE LOCAL EN CAS DE REJET
        throw err;
      }
      const recipes = inMemoryCache.recipes.filter(r => r.id !== recipe.id);
      recipes.push(recipe);
      inMemoryCache.recipes = recipes;
      await indexedDbService.put('recipes', recipe);

      const allIngs = inMemoryCache.recipe_ingredients.filter(ri => ri.recipeId !== recipe.id);
      const newIngs = ingredients.map(ing => ({ ...ing, id: generateUUID(), recipeId: recipe.id }));
      inMemoryCache.recipe_ingredients = [...allIngs, ...newIngs];
      await indexedDbService.setAll('recipe_ingredients', [...allIngs, ...newIngs]);

      const allPacks = inMemoryCache.recipe_packaging.filter(rp => rp.recipeId !== recipe.id);
      const newPacks = packagings.map(p => ({ ...p, id: generateUUID(), recipeId: recipe.id }));
      inMemoryCache.recipe_packaging = [...allPacks, ...newPacks];
      await indexedDbService.setAll('recipe_packaging', [...allPacks, ...newPacks]);
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

    const allIngredients = getTable<RecipeIngredient>(KEYS.RECIPE_INGREDIENTS).filter(ri => ri.recipeId !== recipe.id);
    const newIngredients = ingredients.map((ing) => ({
      ...ing,
      id: generateUUID(),
      recipeId: recipe.id
    }));
    inMemoryCache.recipe_ingredients = [...allIngredients, ...newIngredients];
    saveTable(KEYS.RECIPE_INGREDIENTS, [...allIngredients, ...newIngredients]);
    await indexedDbService.setAll('recipe_ingredients', [...allIngredients, ...newIngredients]);

    const allPackagings = getTable<RecipePackaging>(KEYS.RECIPE_PACKAGING).filter(rp => rp.recipeId !== recipe.id);
    const newPackagings = packagings.map((pack) => ({
      ...pack,
      id: generateUUID(),
      recipeId: recipe.id
    }));
    inMemoryCache.recipe_packaging = [...allPackagings, ...newPackagings];
    saveTable(KEYS.RECIPE_PACKAGING, [...allPackagings, ...newPackagings]);
    await indexedDbService.setAll('recipe_packaging', [...allPackagings, ...newPackagings]);
  },

  async deleteRecipe(id: string): Promise<void> {
    assertAccessKnown();
    if (isCloudMode()) {
      try {
        await cloudDbService.deleteRecipe(id);
      } catch (err: any) {
        notifyCloudError('Suppression recette cloud refusée', err.message || String(err));
        throw err;
      }
      inMemoryCache.recipes = inMemoryCache.recipes.filter(r => r.id !== id);
      await indexedDbService.delete('recipes', id);

      inMemoryCache.recipe_ingredients = inMemoryCache.recipe_ingredients.filter(ri => ri.recipeId !== id);
      await indexedDbService.setAll('recipe_ingredients', inMemoryCache.recipe_ingredients);

      inMemoryCache.recipe_packaging = inMemoryCache.recipe_packaging.filter(rp => rp.recipeId !== id);
      await indexedDbService.setAll('recipe_packaging', inMemoryCache.recipe_packaging);
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
          // Convertir la quantité de la recette vers l'unité de stock du produit
          const convertedQty = convertUnits(ing.qtyUsed, ing.unit, prod.unit);
          ingredientsCost += convertedQty * prod.avgPurchasePrice;
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
      suggestedSellingPrice: Number(suggestedSellingPrice.toFixed(2))
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

    // 1. Vérifier si les stocks sont suffisants
    const missingItems: string[] = [];
    ingredients.forEach(ing => {
      const prod = products.find(p => p.id === ing.productId);
      if (prod) {
        const qtyNeeded = convertUnits(ing.qtyUsed * factor, ing.unit, prod.unit);
        if (prod.stock < qtyNeeded) {
          missingItems.push(`${prod.name} (Requis: ${qtyNeeded.toFixed(2)} ${prod.unit}, En Stock: ${prod.stock.toFixed(2)} ${prod.unit})`);
        }
      }
    });

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
      } catch (err: any) {
        notifyCloudError('Enregistrement fabrication cloud refusé', err.message || String(err));
        throw err;
      }
    }

    // 2. Déduire les ingrédients du stock
    for (const ing of ingredients) {
      const prod = products.find(p => p.id === ing.productId);
      if (prod) {
        const qtyNeeded = convertUnits(ing.qtyUsed * factor, ing.unit, prod.unit);
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
      inMemoryCache.recipes = recipes;
      saveTable(KEYS.RECIPES, recipes);
      await indexedDbService.put('recipes', recipes[recipeIndex]);
    }

    // 5. Enregistrer la production
    if (isCloudMode()) {
      const prods = inMemoryCache.productions.filter(p => p.id !== production.id);
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
      } catch (err: any) {
        notifyCloudError('Enregistrement vente cloud refusé', err.message || String(err));
        throw err;
      }
      const sales = inMemoryCache.sales.filter(s => s.id !== sale.id);
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
      } catch (err: any) {
        notifyCloudError('Suppression vente cloud refusée', err.message || String(err));
        throw err;
      }
      inMemoryCache.sales = inMemoryCache.sales.filter(s => s.id !== id);
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

  // --- EXPORTATION ET IMPORTATION CSV (GOOGLE SHEETS COMPATIBLE) ---
  exportToCSV(tableName: keyof typeof KEYS): string {
    const data = getTable<Record<string, unknown>>(KEYS[tableName]);
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

  importFromCSV(tableName: keyof typeof KEYS, csvText: string, merge = true): { success: boolean; count: number; error?: string } {
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
        // Split simple (attention aux quotes, mais pour Google Sheets simple c'est suffisant)
        // Expression régulière pour splitter par le séparateur en ignorant ceux dans les guillemets
        let cells: string[] = [];
        if (sep === ';') {
          // Split par ; en gérant les textes entre guillemets
          cells = line.match(/(".*?"|[^;]+)(?=\s*;|\s*$)/g) || line.split(';');
        } else {
          cells = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || line.split(',');
        }

        cells = cells.map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

        const obj: Record<string, unknown> = {};
        headers.forEach((header, idx) => {
          const rawCell = cells[idx] || '';
          let cellValue: string | number | boolean;

          // Typage intelligent
          if (rawCell === 'true') cellValue = true;
          else if (rawCell === 'false') cellValue = false;
          else if (rawCell !== '' && !isNaN(Number(rawCell.replace(',', '.')))) {
            cellValue = Number(rawCell.replace(',', '.'));
          } else {
            cellValue = rawCell;
          }

          obj[header] = cellValue;
        });

        if (obj.id) {
          parsedData.push(obj);
        }
      }

      if (parsedData.length === 0) return { success: false, count: 0, error: 'Aucune ligne valide avec une colonne "id" n\'a été trouvée.' };

      const existingData = merge ? getTable<Record<string, unknown>>(KEYS[tableName]) : [];
      
      // Fusionner les données (écraser par ID)
      const mergedMap = new Map();
      existingData.forEach(item => mergedMap.set(item.id, item));
      parsedData.forEach(item => mergedMap.set(item.id, item));

      const finalData = Array.from(mergedMap.values());
      saveTable(KEYS[tableName], finalData);

      return { success: true, count: parsedData.length };
    } catch (err: unknown) {
      return { success: false, count: 0, error: (err as Error).message || 'Erreur inconnue de lecture CSV' };
    }
  }
};
