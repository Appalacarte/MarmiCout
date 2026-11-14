import {
  normalizeUnit,
  getUnitFamily,
  convertUnits,
  convertUnitsWithInfo,
  areUnitsCompatible,
  ensureRequiredUnits,
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
