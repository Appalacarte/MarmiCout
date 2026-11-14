import {
  normalizeUnit,
  getUnitFamily,
  convertUnits,
  convertUnitsWithInfo,
  areUnitsCompatible,
  ensureRequiredUnits,
  cleanProductName,
  getLogicalStockUnit,
  getCompatiblePurchaseUnits,
  formatStock,
  convertProductUnitValues,
} from './units.ts';

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message ? message + ' — ' : ''}Attendu : ${String(expected)}, obtenu : ${String(actual)}`
    );
  }
}

interface TestCase {
  name: string;
  fn: () => void;
}

const tests: TestCase[] = [
  {
    name: '500 g -> 0,5 kg (conversion exacte masse)',
    fn: () => {
      const res = convertUnitsWithInfo(500, 'g', 'kg');
      assertEqual(res.value, 0.5);
      assertEqual(res.approximate, false);
      assertEqual(convertUnits(500, 'g', 'kg'), 0.5);
    },
  },
  {
    name: '2 cs -> 30 ml (conversion exacte volume, 1 cs = 15 ml)',
    fn: () => {
      const res = convertUnitsWithInfo(2, 'cs', 'ml');
      assertEqual(res.value, 30);
      assertEqual(res.approximate, false);
      assertEqual(convertUnits(2, 'cs', 'ml'), 30);
    },
  },
  {
    name: '1 cc -> 5 ml (conversion exacte volume, 1 cc = 5 ml)',
    fn: () => {
      const res = convertUnitsWithInfo(1, 'cc', 'ml');
      assertEqual(res.value, 5);
      assertEqual(res.approximate, false);
      assertEqual(convertUnits(1, 'cc', 'ml'), 5);
    },
  },
  {
    name: '500 g -> 0,5 l (conversion approximative masse <-> volume)',
    fn: () => {
      const res = convertUnitsWithInfo(500, 'g', 'l');
      assertEqual(res.value, 0.5);
      assertEqual(res.approximate, true);
      assertEqual(convertUnits(500, 'g', 'l'), 0.5);
    },
  },
  {
    name: '3 pièces -> kg = impossible (null)',
    fn: () => {
      const res = convertUnitsWithInfo(3, 'pièces', 'kg');
      assertEqual(res.value, null);
      assertEqual(res.approximate, false);
      assertEqual(convertUnits(3, 'pièces', 'kg'), null);
      assertEqual(areUnitsCompatible('pièce', 'kg'), false);
    },
  },
  {
    name: 'Reconnaissance des variantes : "gr", "Litre", "c. à soupe", etc.',
    fn: () => {
      assertEqual(normalizeUnit('gr'), 'g');
      assertEqual(normalizeUnit('grammes'), 'g');
      assertEqual(normalizeUnit('kilo'), 'kg');
      assertEqual(normalizeUnit('Litre'), 'l');
      assertEqual(normalizeUnit('L'), 'l');
      assertEqual(normalizeUnit('c. à soupe'), 'cs');
      assertEqual(normalizeUnit('c.à.s'), 'cs');
      assertEqual(normalizeUnit('cas'), 'cs');
      assertEqual(normalizeUnit('tbsp'), 'cs');
      assertEqual(normalizeUnit('c. à café'), 'cc');
      assertEqual(normalizeUnit('cac'), 'cc');
      assertEqual(normalizeUnit('tsp'), 'cc');
      assertEqual(normalizeUnit('pièces'), 'pièce');
      assertEqual(normalizeUnit('unité'), 'pièce');
      assertEqual(normalizeUnit('boîte'), 'boite');
    },
  },
  {
    name: 'Comptage : non convertibles entre eux (pièce <-> sachet/pot/boite = null), identiques = exact',
    fn: () => {
      assertEqual(convertUnits(2, 'pièce', 'sachet'), null);
      assertEqual(convertUnits(1, 'pot', 'boite'), null);
      assertEqual(convertUnits(4, 'bouteille', 'l'), null);
      assertEqual(convertUnits(3, 'pièces', 'pièce'), 3);
      assertEqual(getUnitFamily('pièce'), 'count');
      assertEqual(getUnitFamily('sachet'), 'count');
      assertEqual(getUnitFamily('pot'), 'count');
      assertEqual(getUnitFamily('bouteille'), 'count');
      assertEqual(getUnitFamily('boite'), 'count');
    },
  },
  {
    name: 'Conversions complémentaires (mg, cl, dl, cs <-> g approximatif)',
    fn: () => {
      assertEqual(convertUnits(1000, 'mg', 'g'), 1);
      assertEqual(convertUnits(25, 'cl', 'l'), 0.25);
      assertEqual(convertUnits(2, 'dl', 'ml'), 200);
      const csToG = convertUnitsWithInfo(2, 'cs', 'g');
      assertEqual(csToG.value, 30);
      assertEqual(csToG.approximate, true);
    },
  },
  {
    name: 'ensureRequiredUnits ajoute cs et cc aux réglages existants',
    fn: () => {
      const updated = ensureRequiredUnits(['kg', 'g', 'l', 'pièce']);
      assertEqual(updated.includes('cs'), true);
      assertEqual(updated.includes('cc'), true);
    },
  },
  {
    name: 'cleanProductName : retire suffixes (g), (cs), (haché) et parenthèses',
    fn: () => {
      assertEqual(cleanProductName('Farine de blé (g)'), 'Farine de blé');
      assertEqual(cleanProductName('Persil (cs)'), 'Persil');
      assertEqual(cleanProductName('Oignon (haché)'), 'Oignon');
      assertEqual(cleanProductName('Carottes (râpées)'), 'Carottes');
      assertEqual(cleanProductName('Lait demi-écrémé (l)'), 'Lait demi-écrémé');
      assertEqual(cleanProductName('Pommes (kg)'), 'Pommes');
      assertEqual(cleanProductName('Basilic (c. à s.)'), 'Basilic');
      assertEqual(cleanProductName('Beurre doux'), 'Beurre doux');
    },
  },
  {
    name: 'getLogicalStockUnit : g/kg -> kg, ml/cl/l/cs/cc -> l, sinon pièce',
    fn: () => {
      assertEqual(getLogicalStockUnit('g'), 'kg');
      assertEqual(getLogicalStockUnit('kg'), 'kg');
      assertEqual(getLogicalStockUnit('mg'), 'kg');
      assertEqual(getLogicalStockUnit('ml'), 'l');
      assertEqual(getLogicalStockUnit('cl'), 'l');
      assertEqual(getLogicalStockUnit('l'), 'l');
      assertEqual(getLogicalStockUnit('cs'), 'l');
      assertEqual(getLogicalStockUnit('cc'), 'l');
      assertEqual(getLogicalStockUnit('pièce'), 'pièce');
      assertEqual(getLogicalStockUnit('sachet'), 'pièce');
      assertEqual(getLogicalStockUnit(undefined), 'pièce');
    },
  },
  {
    name: 'getCompatiblePurchaseUnits : kg -> [kg, g], l -> [l, cl, ml], pièce -> [pièce]',
    fn: () => {
      const massUnits = getCompatiblePurchaseUnits('kg');
      assertEqual(massUnits.length, 2);
      assertEqual(massUnits[0], 'kg');
      assertEqual(massUnits[1], 'g');

      const volUnits = getCompatiblePurchaseUnits('l');
      assertEqual(volUnits.length, 3);
      assertEqual(volUnits[0], 'l');
      assertEqual(volUnits[1], 'cl');
      assertEqual(volUnits[2], 'ml');

      const pieceUnits = getCompatiblePurchaseUnits('pièce');
      assertEqual(pieceUnits.length, 1);
      assertEqual(pieceUnits[0], 'pièce');
    },
  },
  {
    name: 'formatStock : max 2 décimales sans zéros superflus',
    fn: () => {
      assertEqual(formatStock(10), '10');
      assertEqual(formatStock(1.5), '1,5');
      assertEqual(formatStock(1.25), '1,25');
      assertEqual(formatStock(4.1234), '4,12');
      assertEqual(formatStock(0), '0');
    },
  },
  {
    name: 'convertProductUnitValues : conversion stock, seuil et prix compatible ou null si incompatible',
    fn: () => {
      // 4 g à 0.02 €/g convertis vers kg (seuil 500 g)
      const toKg = convertProductUnitValues('g', 'kg', 4, 500, 0.02);
      assertEqual(toKg !== null, true);
      assertEqual(toKg?.stock, 0.004); // 4 g -> 0.004 kg
      assertEqual(toKg?.minStockAlert, 0.5); // 500 g -> 0.5 kg
      assertEqual(toKg?.avgPurchasePrice, 20); // 0.02 €/g * 1000 = 20 €/kg

      // 2 kg à 10 €/kg convertis vers g
      const toG = convertProductUnitValues('kg', 'g', 2, 1, 10);
      assertEqual(toG !== null, true);
      assertEqual(toG?.stock, 2000);
      assertEqual(toG?.minStockAlert, 1000);
      assertEqual(toG?.avgPurchasePrice, 0.01);

      // Incompatible : g vers pièce
      const incompatible = convertProductUnitValues('g', 'pièce', 4, 500, 0.02);
      assertEqual(incompatible, null);
    },
  },
];

export function runUnitTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  console.log('=== Tests unitaires src/utils/units.ts ===');
  for (const t of tests) {
    try {
      t.fn();
      passed++;
      console.log(`✅ PASS : ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`❌ FAIL : ${t.name}`);
      console.error(err);
    }
  }

  console.log(`\nRésultat : ${passed}/${tests.length} tests réussis.`);
  return { passed, failed };
}

runUnitTests();
