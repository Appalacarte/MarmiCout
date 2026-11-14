/**
 * TEST D'INTÉGRITÉ DE L'EXPORT / RÉIMPORT SUR ÉTABLISSEMENT VIDE
 * Vérifie que l'intégralité des 10 collections est exportée puis réimportée
 * à l'identique, ligne pour ligne, sans aucune altération de données.
 */

import assert from 'assert';

// Mock minimal de LocalStorage pour Node.js
const storage = new Map();
global.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

global.window = { location: { search: '' } };
global.document = undefined;

// Import dynamique des services
const { dbService } = await import('../src/services/db.ts');
const { exportAllDataAsJSON, importAllDataFromJSON } = await import('../src/utils/exportAllData.ts');

console.log('\n=== TEST D\'INTÉGRITÉ EXPORT / RÉIMPORT MARMICOUT ===\n');

// 1. Peuplement initial de l'établissement A
console.log('1️⃣ Création d\'un jeu de données complet sur l\'établissement initial A...');

const initialStores = [
  { id: 'S1', name: 'Grand Frais Lyon', type: 'Supermarché', address: 'Zone Commerciale', phone: '0472000000', notes: 'Fruits et légumes' },
  { id: 'S2', name: 'Metro Lyon', type: 'Grossiste', address: 'Bvd Industriel', phone: '0472111111', notes: 'Emballages & vrac' },
];

const initialProducts = [
  { id: 'P1', barcode: '3151240010205', name: 'Farine T55', category: 'Épicerie', unit: 'kg', brand: 'Francine', format: '1 kg', stock: 15.5, minStockAlert: 5, avgPurchasePrice: 1.45, mainStoreId: 'S2', notes: 'Farine bio', isActive: true },
  { id: 'P2', barcode: '3228022010121', name: 'Beurre Doux', category: 'Frais', unit: 'kg', brand: 'Président', format: '500 g', stock: 4.2, minStockAlert: 2, avgPurchasePrice: 8.20, mainStoreId: 'S1', notes: 'Beurre pâtissier', isActive: true },
];

const initialPurchases = [
  { id: 'A1', date: '2026-11-01', productId: 'P1', qty: 20, unit: 'kg', pricePaid: 29.0, unitPrice: 1.45, storeId: 'S2', notes: 'Lot farine' },
  { id: 'A2', date: '2026-11-02', productId: 'P2', qty: 5, unit: 'kg', pricePaid: 41.0, unitPrice: 8.20, storeId: 'S1', notes: 'Beurre frais' },
];

const initialRecipes = [
  { id: 'R1', name: 'Brioche Pur Beurre', category: 'Viennoiserie', description: 'Brioche dorée traditionnelle', portions: 6, yieldQty: 1, yieldUnit: 'pièce', stock: 4, isActive: true },
];

const initialRecipeIngredients = [
  { id: 'RI1', recipeId: 'R1', productId: 'P1', qtyUsed: 500, unit: 'g' },
  { id: 'RI2', recipeId: 'R1', productId: 'P2', qtyUsed: 250, unit: 'g' },
];

const initialRecipePackaging = [
  { id: 'RP1', recipeId: 'R1', name: 'Sachet Viennoiserie', qtyUsed: 1, costPerUnit: 0.15 },
];

const initialProductions = [
  { id: 'PR1', date: '2026-11-05', recipeId: 'R1', portionsProduced: 6, calculatedCost: 3.25, notes: 'Fournée du matin' },
];

const initialSales = [
  { id: 'V1', date: '2026-11-06', itemId: 'R1', itemType: 'RECIPE', qtySold: 2, unitPrice: 5.50, location: 'Boutique', notes: 'Vente directe client' },
];

const initialStockMovements = [
  { id: 'SM1', date: '2026-11-01', productId: 'P1', qty: 20, type: 'ACHAT', refId: 'A1', notes: 'Entrée achat farine' },
  { id: 'SM2', date: '2026-11-05', productId: 'P1', qty: -3, type: 'PRODUCTION_CONSOMMATION', refId: 'PR1', notes: 'Consommation brioches' },
];

const initialSettings = {
  businessName: 'L\'Atelier Gourmand Test',
  currency: '€',
  defaultTargetMargin: 68,
  categories: ['Épicerie', 'Frais', 'Emballages'],
  recipeCategories: ['Viennoiserie', 'Pâtisserie'],
  units: ['kg', 'g', 'l', 'pièce'],
  salesLocations: ['Boutique', 'Marché'],
  defaultMinStockAlert: 3,
  googleSheetId: '',
  googleSheetLink: '',
};

// Injection
dbService.setStores(initialStores);
dbService.setProducts(initialProducts);
dbService.setPurchases(initialPurchases);
dbService.setRecipes(initialRecipes);
dbService.setAllRecipeIngredients(initialRecipeIngredients);
dbService.setAllRecipePackagings(initialRecipePackaging);
dbService.setProductions(initialProductions);
dbService.setSales(initialSales);
dbService.setStockMovements(initialStockMovements);
dbService.saveSettings(initialSettings);

console.log('✅ Établissement A initialisé avec les 10 collections complètes.');

// 2. Exportation des données de l'établissement A
console.log('\n2️⃣ Exportation au format standard marmicout_backup_v1...');
const exportedPayload = exportAllDataAsJSON();

assert.strictEqual(exportedPayload.format, 'marmicout_backup_v1');
assert.strictEqual(exportedPayload.stores.length, 2);
assert.strictEqual(exportedPayload.products.length, 2);
assert.strictEqual(exportedPayload.purchases.length, 2);
assert.strictEqual(exportedPayload.recipes.length, 1);
assert.strictEqual(exportedPayload.recipe_ingredients.length, 2);
assert.strictEqual(exportedPayload.recipe_packaging.length, 1);
assert.strictEqual(exportedPayload.productions.length, 1);
assert.strictEqual(exportedPayload.sales.length, 1);
assert.strictEqual(exportedPayload.stock_movements.length, 2);
assert.strictEqual(exportedPayload.settings.businessName, 'L\'Atelier Gourmand Test');

console.log('✅ Exportation réussie : les 10 tables contiennent l\'intégralité des données.');

// 3. Vidage complet de l'établissement (simulation établissement vierge B)
console.log('\n3️⃣ Simulation d\'un établissement B entièrement vide...');
dbService.setStores([]);
dbService.setProducts([]);
dbService.setPurchases([]);
dbService.setRecipes([]);
dbService.setAllRecipeIngredients([]);
dbService.setAllRecipePackagings([]);
dbService.setProductions([]);
dbService.setSales([]);
dbService.setStockMovements([]);

// Vérifier que tout est vide
assert.strictEqual(dbService.getStores().length, 0);
assert.strictEqual(dbService.getProducts().length, 0);
assert.strictEqual(dbService.getPurchases().length, 0);
assert.strictEqual(dbService.getRecipes().length, 0);
assert.strictEqual(dbService.getAllRecipeIngredients().length, 0);
assert.strictEqual(dbService.getAllRecipePackagings().length, 0);
assert.strictEqual(dbService.getProductions().length, 0);
assert.strictEqual(dbService.getSales().length, 0);
assert.strictEqual(dbService.getStockMovements().length, 0);
console.log('✅ Établissement B vérifié 100% vierge.');

// 4. Réimportation des données exportées dans l'établissement B
console.log('\n4️⃣ Réimportation des données dans l\'établissement vierge B...');
const importResult = importAllDataFromJSON(exportedPayload, { clearFirst: true });
assert.strictEqual(importResult.success, true);
console.log('✅ Résultat d\'importation :', importResult.counts);

// 5. Comparaison ligne pour ligne, table par table
console.log('\n5️⃣ Comparaison ligne pour ligne entre les données d\'origine et les données réimportées :');

const collectionsToVerify = [
  { name: 'stores (Magasins/Fournisseurs)', expected: initialStores, actual: dbService.getStores() },
  { name: 'products (Mercuriale Produits)', expected: initialProducts, actual: dbService.getProducts() },
  { name: 'purchases (Achats/Factures)', expected: initialPurchases, actual: dbService.getPurchases() },
  { name: 'recipes (Fiches Techniques)', expected: initialRecipes, actual: dbService.getRecipes() },
  { name: 'recipe_ingredients (Ingrédients)', expected: initialRecipeIngredients, actual: dbService.getAllRecipeIngredients() },
  { name: 'recipe_packaging (Conditionnements)', expected: initialRecipePackaging, actual: dbService.getAllRecipePackagings() },
  { name: 'productions (Fabrications)', expected: initialProductions, actual: dbService.getProductions() },
  { name: 'sales (Ventes directes)', expected: initialSales, actual: dbService.getSales() },
  { name: 'stock_movements (Mouvements Stock)', expected: initialStockMovements, actual: dbService.getStockMovements() },
  { name: 'settings (Paramètres)', expected: [initialSettings], actual: [dbService.getSettings()] },
];

for (const col of collectionsToVerify) {
  assert.strictEqual(
    col.actual.length,
    col.expected.length,
    `Nombre d'éléments divergent pour ${col.name}`
  );

  assert.deepStrictEqual(
    col.actual,
    col.expected,
    `Contenu divergent ligne pour ligne pour ${col.name}`
  );

  console.log(`  ✓ ${col.name.padEnd(42)} : ${col.actual.length} ligne(s) [100% CONFORME]`);
}

console.log('\n============================================================');
console.log('🎉 SUCCÈS TOTAL : EXPORT PUIS RÉIMPORT 100% INTÈGRE LIGNE POUR LIGNE !');
console.log('============================================================\n');
process.exit(0);
