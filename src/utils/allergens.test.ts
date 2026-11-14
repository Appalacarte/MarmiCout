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

// 3. Calcul des allergènes d'une recette selon les trois états
const productMap = new Map([
  ['p1', { id: 'p1', name: 'Farine T55', allergens: ['gluten'] }],     // Déclaré
  ['p2', { id: 'p2', name: 'Beurre doux', allergens: ['lait'] }],      // Déclaré
  ['p3', { id: 'p3', name: 'Œufs frais', allergens: ['œufs'] }],       // Déclaré
  ['p4', { id: 'p4', name: 'Sucre blanc', allergens: [] }],            // Vérifié sans allergène
  ['p5', { id: 'p5', name: 'Sel fin', allergens: [] }],                // Vérifié sans allergène
  ['p6', { id: 'p6', name: 'Vanille liquide', allergens: null }],      // Non renseigné (null)
  ['p7', { id: 'p7', name: 'Arôme caramel', allergens: undefined }],  // Non renseigné (undefined)
]);

// 3.1 Recette entièrement vérifiée avec allergènes
const resultLinked = calculateRecipeAllergens(
  [{ productId: 'p1' }, { productId: 'p2' }, { productId: 'p4' }],
  productMap
);
assertEqual(resultLinked.allergens.length, 2, 'Doit trouver gluten et lait');
assert(resultLinked.allergens.includes('gluten'));
assert(resultLinked.allergens.includes('lait'));
assertEqual(resultLinked.isFullyVerified, true, 'Tous les ingrédients sont vérifiés');
assertEqual(resultLinked.unverifiedItems.length, 0);

// 3.2 Recette « Sans allergène » : tous les ingrédients vérifiés et aucun allergène
const resultSansAllergene = calculateRecipeAllergens(
  [{ productId: 'p4' }, { productId: 'p5' }],
  productMap
);
assertEqual(resultSansAllergene.allergens.length, 0, 'Aucun allergène présent');
assertEqual(resultSansAllergene.isFullyVerified, true, 'Doit être pleinement vérifié');
assertEqual(resultSansAllergene.unverifiedItems.length, 0);

// 3.3 Recette avec produit non renseigné (allergens null) : « Sans allergène » INTERDIT
const resultUnspecified = calculateRecipeAllergens(
  [{ productId: 'p4' }, { productId: 'p6' }],
  productMap
);
assertEqual(resultUnspecified.allergens.length, 0, 'Aucun allergène déclaré');
assertEqual(resultUnspecified.isFullyVerified, false, 'Ne doit PAS être considéré vérifié car p6 est null');
assertEqual(resultUnspecified.unverifiedItems.length, 1);
assertEqual(resultUnspecified.unverifiedItems[0].name, 'Vanille liquide');
assertEqual(resultUnspecified.unverifiedItems[0].reason, 'unspecified');
assertEqual(resultUnspecified.unverifiedItems[0].productId, 'p6');

// 3.4 Recette avec produit non renseigné (undefined) et allergènes déclarés
const resultMixed = calculateRecipeAllergens(
  [{ productId: 'p1' }, { productId: 'p7' }],
  productMap
);
assertEqual(resultMixed.allergens.length, 1, 'Doit contenir gluten');
assert(resultMixed.allergens.includes('gluten'));
assertEqual(resultMixed.isFullyVerified, false, 'Ne doit PAS être pleinement vérifié');
assertEqual(resultMixed.unverifiedItems.length, 1);
assertEqual(resultMixed.unverifiedItems[0].reason, 'unspecified');

// 3.5 Recette avec ingrédient libre non lié au stock
const resultUnlinked = calculateRecipeAllergens(
  [{ productId: 'p1' }, { customName: 'Poudre mystère' }],
  productMap
);
assertEqual(resultUnlinked.isFullyVerified, false, 'Doit être non vérifié');
assertEqual(resultUnlinked.hasUnlinkedIngredients, true, 'Doit détecter l\'ingrédient non lié');
assertEqual(resultUnlinked.unlinkedCount, 1);
assert(resultUnlinked.allergens.includes('gluten'));
assertEqual(resultUnlinked.unverifiedItems[0].name, 'Poudre mystère');
assertEqual(resultUnlinked.unverifiedItems[0].reason, 'unlinked');

console.log('✅ PASS : Calcul des 3 états (déclaré, vérifié sans allergène, non renseigné) et alertes recettes');

// 4. Formatage texte pour copie (avec avertissements)
const formattedVerified = formatAllergensList(['gluten', 'lait', 'œufs']);
assertEqual(formattedVerified, 'Gluten, Lait, Œufs');

const emptyFormatted = formatAllergensList([]);
assertEqual(emptyFormatted, 'Aucun allergène déclaré');

const formattedWithWarning = formatAllergensList(['gluten'], [
  { name: 'Vanille liquide', reason: 'unspecified' },
  { name: 'Poudre mystère', reason: 'unlinked' }
]);
assert(formattedWithWarning.includes('Gluten'), 'Doit inclure Gluten');
assert(formattedWithWarning.includes('⚠️ Allergènes à vérifier pour : Vanille liquide (non renseigné), Poudre mystère (non lié au stock)'), 'Doit inclure l\'avertissement complet');

console.log('✅ PASS : Formatage pour bouton "Copier les allergènes" avec inclusion des avertissements');
console.log('Tous les tests allergens.ts ont réussi avec succès !');
