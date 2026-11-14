import {
  singularizeFrenchToken,
  tokenizeAndNormalize,
  normalizeProductName,
  isExactProductNameMatch,
  findExactDuplicateProduct,
  searchDuplicateSuggestions,
} from './productDuplicate.ts';
import type { Product } from '../types/index.ts';

function assert(condition: boolean, message?: string): void {
  if (!condition) {
    throw new Error(`Échec assertion : ${message || 'Condition non vérifiée'}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message ? message + ' — ' : ''}Attendu : ${String(expected)}, obtenu : ${String(actual)}`
    );
  }
}

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    barcode: '',
    name: 'Olives noires',
    category: 'Épicerie',
    unit: 'kg',
    brand: 'Tramier',
    format: 'Bocal',
    stock: 2.5,
    minStockAlert: 1,
    avgPurchasePrice: 4.5,
    mainStoreId: 's1',
    notes: '',
    isActive: true,
  },
  {
    id: 'prod-2',
    barcode: '',
    name: 'Farine de Blé T55',
    category: 'Épicerie',
    unit: 'kg',
    brand: 'Francine',
    format: '1 kg',
    stock: 10,
    minStockAlert: 2,
    avgPurchasePrice: 1.2,
    mainStoreId: 's1',
    notes: '',
    isActive: true,
  },
  {
    id: 'prod-3',
    barcode: '',
    name: 'Choux rouges',
    category: 'Fruits & Légumes',
    unit: 'pièce',
    brand: '',
    format: 'Unité',
    stock: 4,
    minStockAlert: 1,
    avgPurchasePrice: 1.8,
    mainStoreId: 's1',
    notes: '',
    isActive: false, // Inactif !
  },
  {
    id: 'prod-4',
    barcode: '',
    name: 'Poireaux émincés',
    category: 'Fruits & Légumes',
    unit: 'kg',
    brand: '',
    format: 'Vrac',
    stock: 3.2,
    minStockAlert: 1,
    avgPurchasePrice: 2.5,
    mainStoreId: 's1',
    notes: '',
    isActive: true,
  },
  {
    id: 'prod-5',
    barcode: '',
    name: 'Oignons jaunes',
    category: 'Fruits & Légumes',
    unit: 'kg',
    brand: '',
    format: 'Filet 1kg',
    stock: 5,
    minStockAlert: 2,
    avgPurchasePrice: 1.1,
    mainStoreId: 's1',
    notes: '',
    isActive: true,
  },
  {
    id: 'prod-6',
    barcode: '',
    name: 'Oranges sanguines',
    category: 'Fruits & Légumes',
    unit: 'kg',
    brand: '',
    format: 'Filet',
    stock: 6,
    minStockAlert: 1,
    avgPurchasePrice: 2.2,
    mainStoreId: 's1',
    notes: '',
    isActive: true,
  },
  {
    id: 'prod-7',
    barcode: '',
    name: 'Oreillons d\'abricots',
    category: 'Épicerie',
    unit: 'boîte',
    brand: '',
    format: 'Boîte',
    stock: 8,
    minStockAlert: 2,
    avgPurchasePrice: 3.0,
    mainStoreId: 's1',
    notes: '',
    isActive: true,
  },
  {
    id: 'prod-8',
    barcode: '',
    name: 'Oeufs bio',
    category: 'Crémerie',
    unit: 'pièce',
    brand: '',
    format: 'Boîte de 6',
    stock: 24,
    minStockAlert: 6,
    avgPurchasePrice: 0.35,
    mainStoreId: 's1',
    notes: '',
    isActive: true,
  },
];

console.log('--- Exécution des tests productDuplicate.ts ---');

// 1. Singularisation
assertEqual(singularizeFrenchToken('olives'), 'olive', 'olives -> olive');
assertEqual(singularizeFrenchToken('noires'), 'noire', 'noires -> noire');
assertEqual(singularizeFrenchToken('choux'), 'chou', 'choux -> chou');
assertEqual(singularizeFrenchToken('poireaux'), 'poireau', 'poireaux -> poireau');
assertEqual(singularizeFrenchToken('bocaux'), 'bocal', 'bocaux -> bocal');
assertEqual(singularizeFrenchToken('oeufs'), 'oeuf', 'oeufs -> oeuf');
assertEqual(singularizeFrenchToken('aulx'), 'ail', 'aulx -> ail');
assertEqual(singularizeFrenchToken('ail'), 'ail', 'ail -> ail');
assertEqual(singularizeFrenchToken('riz'), 'riz', 'riz -> riz (court)');

// 2. Normalisation et tokens
const tokens = tokenizeAndNormalize('Poireaux (kg)');
assertEqual(tokens.length, 1, 'Un seul token pour Poireaux (kg)');
assertEqual(tokens[0], 'poireau', 'Token singularisé sans parenthèse unité');
assertEqual(normalizeProductName('  Olives   noires  '), 'olive noire', 'Espaces et pluriel');
assertEqual(normalizeProductName('Échalotes fraîches'), 'echalote fraiche', 'Accents et pluriels');
assertEqual(normalizeProductName('Poireaux (kg)'), 'poireau', 'Retrait unité parenthèse');

// 3. Exact match
assert(
  isExactProductNameMatch('olive noire', 'Olives noires'),
  '"olive noire" doit correspondre exactement à "Olives noires"'
);
assert(
  isExactProductNameMatch('  OLIVES   NOIRES  ', 'olive noire'),
  'Majuscules et espaces multiples'
);
assert(
  isExactProductNameMatch('noires olives', 'Olives noires'),
  'Ordre des mots toléré pour exact match'
);
assert(
  isExactProductNameMatch('chou rouge', 'Choux rouges'),
  '"chou rouge" doit correspondre à "Choux rouges"'
);
assert(
  !isExactProductNameMatch('olive verte', 'Olives noires'),
  '"olive verte" n\'est pas un doublon de "Olives noires"'
);

// 4. Détection de doublon exact
const exactDup = findExactDuplicateProduct('olive noire', mockProducts);
assert(exactDup !== undefined, 'Doit trouver le doublon exact');
assertEqual(exactDup?.id, 'prod-1', 'Doit être Olives noires');

const dupIgnored = findExactDuplicateProduct('olive noire', mockProducts, 'prod-1');
assert(dupIgnored === undefined, 'En édition, doit ignorer son propre id');

// 5. Recherche dès la 1ère lettre tapée
const suggestionsO = searchDuplicateSuggestions('o', mockProducts);
assert(suggestionsO.length > 0, 'La lettre "o" doit retourner des suggestions');
assert(suggestionsO.length <= 5, 'Maximum 5 suggestions');
// Doit contenir Olives noires, Oignons, Oranges sanguines, Oreillons, Oeufs...
console.log('Suggestions pour "o" :', suggestionsO.map(p => p.name));

// 6. Recherche "olive noire" trouve "Olives noires"
const suggestionsOliveNoire = searchDuplicateSuggestions('olive noire', mockProducts);
assert(suggestionsOliveNoire.length > 0, 'Recherche "olive noire"');
assertEqual(suggestionsOliveNoire[0].id, 'prod-1', 'Premier résultat = Olives noires');

// 7. Inclusion des produits inactifs avec mention
const suggestionsChou = searchDuplicateSuggestions('chou', mockProducts);
assert(suggestionsChou.some(p => p.id === 'prod-3'), 'Doit inclure Choux rouges (désactivé)');
const chouxRouges = suggestionsChou.find(p => p.id === 'prod-3');
assertEqual(chouxRouges?.isActive, false, 'Le produit est bien désactivé');

console.log('Tous les tests productDuplicate.ts ont réussi avec succès !');
