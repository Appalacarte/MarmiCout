import assert from 'node:assert';
import {
  groupShoppingItemsByStore,
  generateShoppingListText,
  generateShoppingListCsv,
} from './shoppingList.ts';
import type { ShoppingItemForGrouping } from './shoppingList.ts';

console.log('=== Tests unitaires src/utils/shoppingList.ts ===');

const mockStoreMap = new Map<string, string>([
  ['s1', 'Metro Cash & Carry'],
  ['s2', 'Grand Frais'],
]);

const mockItems: ShoppingItemForGrouping[] = [
  {
    key: 'p1',
    productName: 'Farine T55',
    productUnit: 'kg',
    needed: 10,
    inStock: 2,
    toOrder: 8,
    estimatedCost: 12.0,
    avgPurchasePrice: 1.5,
    mainStoreId: 's1',
  },
  {
    key: 'p2',
    productName: 'Sucre en Poudre',
    productUnit: 'kg',
    needed: 5,
    inStock: 1,
    toOrder: 4,
    estimatedCost: 7.2,
    avgPurchasePrice: 1.8,
    mainStoreId: 's1',
  },
  {
    key: 'p3',
    productName: 'Pommes Golden',
    productUnit: 'kg',
    needed: 6,
    inStock: 0,
    toOrder: 6,
    estimatedCost: 15.0,
    avgPurchasePrice: 2.5,
    mainStoreId: 's2',
  },
  {
    key: 'p4',
    productName: 'Épices secrètes',
    productUnit: 'pièce',
    needed: 2,
    inStock: 0,
    toOrder: 2,
    estimatedCost: 4.5,
    avgPurchasePrice: 2.25,
    mainStoreId: '', // Sans fournisseur
  },
  {
    key: 'p5',
    productName: 'Ingrédient Inconnu',
    productUnit: 'g',
    needed: 100,
    inStock: 0,
    toOrder: 100,
    estimatedCost: 3.0,
    avgPurchasePrice: 0.03,
    mainStoreId: 's999_non_existant', // Magasin introuvable -> Sans fournisseur
  },
];

// Test 1: groupShoppingItemsByStore regroupe par magasin et place 'Sans fournisseur' en fin de liste
const groups = groupShoppingItemsByStore(mockItems, mockStoreMap);
assert.strictEqual(groups.length, 3, 'Doit créer 3 groupes (2 magasins + Sans fournisseur)');

// Ordre alphabétique des magasins connus
assert.strictEqual(groups[0].storeName, 'Grand Frais');
assert.strictEqual(groups[0].items.length, 1);
assert.strictEqual(groups[0].estimatedCost, 15.0);

assert.strictEqual(groups[1].storeName, 'Metro Cash & Carry');
assert.strictEqual(groups[1].items.length, 2);
assert.strictEqual(groups[1].estimatedCost, 19.2);

// 'Sans fournisseur' en dernier
assert.strictEqual(groups[2].storeName, 'Sans fournisseur');
assert.strictEqual(groups[2].items.length, 2);
assert.strictEqual(groups[2].estimatedCost, 7.5);
console.log('✅ PASS : Regroupement par fournisseur habituel et Sans fournisseur avec calcul de coût estimé');

// Test 2: generateShoppingListText format par fournisseur vs tous
const checkedKeys = new Set<string>(['p1']);

const textByStore = generateShoppingListText({
  date: '14/11/2026',
  selections: [{ recipeName: 'Tarte aux Pommes', portions: 8 }],
  toOrderItems: mockItems,
  totalEstimatedCost: 41.7,
  currency: '€',
  groupBy: 'store',
  storeGroups: groups,
  checkedKeys,
});

assert(textByStore.includes('PAR FOURNISSEUR'), 'Le titre doit mentionner PAR FOURNISSEUR');
assert(textByStore.includes('METRO CASH & CARRY'), 'Doit inclure le nom du magasin');
assert(textByStore.includes('☑ Farine T55'), 'L\'article coché doit avoir la case cochée');
assert(textByStore.includes('[Acheté]'), 'L\'article coché doit avoir la mention Acheté');
assert(textByStore.includes('□ Pommes Golden'), 'L\'article non coché doit avoir la case vide');
console.log('✅ PASS : Format texte avec regroupement fournisseur et cases cochées');

const textAll = generateShoppingListText({
  date: '14/11/2026',
  selections: [{ recipeName: 'Tarte aux Pommes', portions: 8 }],
  toOrderItems: mockItems,
  totalEstimatedCost: 41.7,
  currency: '€',
  groupBy: 'all',
  storeGroups: groups,
  checkedKeys,
});
assert(textAll.includes('🛒 À ACHETER :'), 'Format standard pour "all"');
console.log('✅ PASS : Format texte pour affichage global "all"');

// Test 3: generateShoppingListCsv avec colonne Fournisseur et Acheté
const csvByStore = generateShoppingListCsv({
  selections: [{ recipeName: 'Tarte aux Pommes', portions: 8 }],
  toOrderItems: mockItems,
  availableItems: [{ productName: 'Beurre', needed: 0.5, inStock: 1, productUnit: 'kg' }],
  groupBy: 'store',
  storeGroups: groups,
  checkedKeys,
});

assert(csvByStore.includes('Fournisseur,Ingrédient,Qté à commander,Unité,En stock,Besoin total,Coût estimé,Acheté'));
assert(csvByStore.includes('"Metro Cash & Carry","Farine T55",8,"kg",2,10,12.00,"Oui"'));
assert(csvByStore.includes('"Grand Frais","Pommes Golden",6,"kg",0,6,15.00,"Non"'));
assert(csvByStore.includes('"Sans fournisseur","Épices secrètes",2,"pièce",0,2,4.50,"Non"'));
console.log('✅ PASS : Export CSV avec regroupement fournisseur, statut Acheté et BOM Excel');

console.log('Tous les tests shoppingList.ts ont réussi avec succès !');
