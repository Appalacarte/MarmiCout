import {
  suggestAllergensFromName,
  calculateRecipeAllergens,
  formatAllergensList,
  OFFICIAL_ALLERGENS,
} from './allergens.ts';

function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message ? message + ' — ' : ''}Attendu : ${String(expected)}, obtenu : ${String(actual)}`
    );
  }
}

console.log('=== Tests unitaires src/utils/allergens.ts ===');

// 1. Test des 14 allergènes officiels
assertEqual(OFFICIAL_ALLERGENS.length, 14, 'Doit contenir exactement les 14 allergènes officiels UE');

// 2. Suggestions automatiques d'après le nom
const farineAllergens = suggestAllergensFromName('Farine de Blé T55');
assert(farineAllergens.includes('gluten'), 'Farine doit suggérer gluten');
assertEqual(farineAllergens.length, 1, 'Farine doit suggérer uniquement gluten');

const beurreAllergens = suggestAllergensFromName('Beurre doux de tourage 82% MG');
assert(beurreAllergens.includes('lait'), 'Beurre doit suggérer lait');

const tarteAllergens = suggestAllergensFromName('Pâte brisée pur beurre aux œufs frais');
assert(tarteAllergens.includes('gluten'), 'Pâte doit suggérer gluten');
assert(tarteAllergens.includes('lait'), 'Beurre doit suggérer lait');
assert(tarteAllergens.includes('œufs'), 'Œufs doit suggérer œufs');

const crevettesAllergens = suggestAllergensFromName('Crevettes roses cuites');
assert(crevettesAllergens.includes('crustacés'), 'Crevettes doit suggérer crustacés');

const saumonAllergens = suggestAllergensFromName('Filet de saumon frais');
assert(saumonAllergens.includes('poissons'), 'Saumon doit suggérer poissons');

const vinAllergens = suggestAllergensFromName('Vin blanc de cuisine');
assert(vinAllergens.includes('sulfites'), 'Vin blanc doit suggérer sulfites');

const moutardeAllergens = suggestAllergensFromName('Moutarde à l\'ancienne');
assert(moutardeAllergens.includes('moutarde'), 'Moutarde doit suggérer moutarde');

const amandesAllergens = suggestAllergensFromName('Poudre d\'amandes');
assert(amandesAllergens.includes('fruits à coque'), 'Amandes doit suggérer fruits à coque');

const neutreAllergens = suggestAllergensFromName('Pommes de terre');
assertEqual(neutreAllergens.length, 0, 'Pommes de terre ne doit suggérer aucun allergène');

console.log('✅ PASS : Détection et suggestions automatiques par nom de produit');

// 3. Calcul des allergènes d'une recette
const productMap = new Map([
  ['p1', { allergens: ['gluten'] }], // Farine
  ['p2', { allergens: ['lait'] }],   // Beurre
  ['p3', { allergens: ['œufs'] }],   // Œufs
  ['p4', { allergens: [] }],         // Sucre
]);

// Recette entièrement liée
const resultLinked = calculateRecipeAllergens(
  [{ productId: 'p1' }, { productId: 'p2' }, { productId: 'p4' }],
  productMap
);
assertEqual(resultLinked.allergens.length, 2, 'Doit trouver gluten et lait');
assert(resultLinked.allergens.includes('gluten'));
assert(resultLinked.allergens.includes('lait'));
assertEqual(resultLinked.hasUnlinkedIngredients, false, 'Tous les ingrédients sont liés');
assertEqual(resultLinked.unlinkedCount, 0);

console.log('✅ PASS : Calcul automatique des allergènes sur recette entièrement liée');

// Recette avec ingrédient non lié
const resultUnlinked = calculateRecipeAllergens(
  [{ productId: 'p1' }, { customName: 'Poudre mystère' }],
  productMap
);
assertEqual(resultUnlinked.hasUnlinkedIngredients, true, 'Doit détecter l\'ingrédient non lié');
assertEqual(resultUnlinked.unlinkedCount, 1);
assert(resultUnlinked.allergens.includes('gluten'));

console.log('✅ PASS : Alerte "Allergènes à vérifier" si ingrédient non lié');

// 4. Formatage texte pour copie
const formatted = formatAllergensList(['gluten', 'lait', 'œufs']);
assertEqual(formatted, 'Gluten, Lait, Œufs');

const emptyFormatted = formatAllergensList([]);
assertEqual(emptyFormatted, 'Aucun allergène majeur détecté');

console.log('✅ PASS : Formatage pour bouton "Copier les allergènes"');
console.log('Tous les tests allergens.ts ont réussi avec succès !');
