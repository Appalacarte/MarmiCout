export type UnitFamily = 'mass' | 'volume' | 'count';

/**
 * Facteurs de conversion vers l'unité de base de la famille :
 * - Masse : base = g (gramme)
 * - Volume : base = ml (millilitre)
 */
export const MASS_UNITS: Record<string, number> = {
  mg: 0.001,
  g: 1,
  kg: 1000,
};

export const VOLUME_UNITS: Record<string, number> = {
  ml: 1,
  cl: 10,
  dl: 100,
  l: 1000,
  cc: 5,   // cuillère à café = 5 ml
  cs: 15,  // cuillère à soupe = 15 ml
};

export const COUNT_UNITS: ReadonlySet<string> = new Set([
  'pièce',
  'sachet',
  'pot',
  'bouteille',
  'boite',
]);

export const DEFAULT_UNITS: string[] = [
  'kg',
  'g',
  'mg',
  'l',
  'dl',
  'cl',
  'ml',
  'cs',
  'cc',
  'pièce',
  'sachet',
  'pot',
  'bouteille',
  'boite',
];

const UNIT_ALIASES: Record<string, string> = {
  // Masse
  mg: 'mg',
  'mg.': 'mg',
  mgr: 'mg',
  milligramme: 'mg',
  milligrammes: 'mg',
  milligram: 'mg',
  milligrams: 'mg',

  g: 'g',
  'g.': 'g',
  gr: 'g',
  'gr.': 'g',
  gramme: 'g',
  grammes: 'g',
  gram: 'g',
  grams: 'g',

  kg: 'kg',
  'kg.': 'kg',
  kilo: 'kg',
  kilos: 'kg',
  kilogramme: 'kg',
  kilogrammes: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',

  // Volume
  ml: 'ml',
  'ml.': 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',

  cl: 'cl',
  'cl.': 'cl',
  centilitre: 'cl',
  centilitres: 'cl',
  centiliter: 'cl',
  centiliters: 'cl',

  dl: 'dl',
  'dl.': 'dl',
  décilitre: 'dl',
  décilitres: 'dl',
  decilitre: 'dl',
  decilitres: 'dl',
  deciliter: 'dl',
  deciliters: 'dl',

  l: 'l',
  'l.': 'l',
  litre: 'l',
  litres: 'l',
  liter: 'l',
  liters: 'l',

  // Cuillère à soupe (15 ml)
  cs: 'cs',
  'c.s': 'cs',
  'c.s.': 'cs',
  cas: 'cs',
  'c.a.s': 'cs',
  'c.a.s.': 'cs',
  'c.à.s': 'cs',
  'c.à.s.': 'cs',
  'c à s': 'cs',
  'c a s': 'cs',
  'c. à s.': 'cs',
  'c. a s.': 'cs',
  'c. à soupe': 'cs',
  'c. a soupe': 'cs',
  'c à soupe': 'cs',
  'c a soupe': 'cs',
  'cuil. à soupe': 'cs',
  'cuil. a soupe': 'cs',
  'cuil à soupe': 'cs',
  'cuil a soupe': 'cs',
  'cuillère à soupe': 'cs',
  'cuillères à soupe': 'cs',
  'cuillere a soupe': 'cs',
  'cuilleres a soupe': 'cs',
  tbsp: 'cs',
  'tbsp.': 'cs',
  tbs: 'cs',
  'tbs.': 'cs',
  tablespoon: 'cs',
  tablespoons: 'cs',

  // Cuillère à café (5 ml)
  cc: 'cc',
  'c.c': 'cc',
  'c.c.': 'cc',
  cac: 'cc',
  'c.a.c': 'cc',
  'c.a.c.': 'cc',
  'c.à.c': 'cc',
  'c.à.c.': 'cc',
  'c à c': 'cc',
  'c a c': 'cc',
  'c. à c.': 'cc',
  'c. a c.': 'cc',
  'c. à café': 'cc',
  'c. a cafe': 'cc',
  'c. à cafe': 'cc',
  'c. a café': 'cc',
  'c à café': 'cc',
  'c a cafe': 'cc',
  'c à cafe': 'cc',
  'c a café': 'cc',
  'cuil. à café': 'cc',
  'cuil. a cafe': 'cc',
  'cuil à café': 'cc',
  'cuil a cafe': 'cc',
  'cuillère à café': 'cc',
  'cuillères à café': 'cc',
  'cuillere a cafe': 'cc',
  'cuilleres a cafe': 'cc',
  'cuillère': 'cc',
  'cuillères': 'cc',
  cuillere: 'cc',
  cuilleres: 'cc',
  tsp: 'cc',
  'tsp.': 'cc',
  teaspoon: 'cc',
  teaspoons: 'cc',

  // Comptage
  'pièce': 'pièce',
  'pièces': 'pièce',
  piece: 'pièce',
  pieces: 'pièce',
  pc: 'pièce',
  pcs: 'pièce',
  pce: 'pièce',
  'unité': 'pièce',
  'unités': 'pièce',
  unite: 'pièce',
  unites: 'pièce',
  u: 'pièce',
  'u.': 'pièce',
  unit: 'pièce',
  units: 'pièce',

  sachet: 'sachet',
  sachets: 'sachet',
  paquet: 'sachet',
  paquets: 'sachet',
  pack: 'sachet',
  packs: 'sachet',
  packet: 'sachet',
  packets: 'sachet',

  pot: 'pot',
  pots: 'pot',
  bocal: 'pot',
  bocaux: 'pot',
  jar: 'pot',
  jars: 'pot',

  bouteille: 'bouteille',
  bouteilles: 'bouteille',
  btl: 'bouteille',
  bottle: 'bouteille',
  bottles: 'bouteille',

  boite: 'boite',
  boites: 'boite',
  'boîte': 'boite',
  'boîtes': 'boite',
  can: 'boite',
  cans: 'boite',
  box: 'boite',
  boxes: 'boite',
  barquette: 'boite',
  barquettes: 'boite',
};

/**
 * Normalise le libellé d'une unité vers sa forme canonique
 * ('mg', 'g', 'kg', 'ml', 'cl', 'dl', 'l', 'cc', 'cs', 'pièce', 'sachet', 'pot', 'bouteille', 'boite').
 */
export function normalizeUnit(unit: string | undefined | null): string {
  if (!unit) return '';
  const cleaned = unit
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  if (!cleaned) return '';

  if (UNIT_ALIASES[cleaned]) {
    return UNIT_ALIASES[cleaned];
  }

  // Gestion des variantes souples de cuillères
  if (
    /^(c\.?\s*[àa]\s*s\.?|c\.?\s*[àa]\s*soupe|cuill[èe]res?\s+[àa]\s+soupe|tbsp\.?|tablespoons?)$/i.test(
      cleaned
    )
  ) {
    return 'cs';
  }
  if (
    /^(c\.?\s*[àa]\s*c\.?|c\.?\s*[àa]\s*caf[ée]|cuill[èe]res?\s+[àa]\s+caf[ée]|tsp\.?|teaspoons?)$/i.test(
      cleaned
    )
  ) {
    return 'cc';
  }

  return cleaned;
}

/**
 * Retourne la famille d'une unité ('mass' | 'volume' | 'count') ou null si inconnue.
 */
export function getUnitFamily(unit: string | undefined | null): UnitFamily | null {
  const norm = normalizeUnit(unit);
  if (!norm) return null;
  if (norm in MASS_UNITS) return 'mass';
  if (norm in VOLUME_UNITS) return 'volume';
  if (COUNT_UNITS.has(norm)) return 'count';
  return null;
}

export interface UnitConversionResult {
  value: number | null;
  approximate: boolean;
}

/**
 * Convertit une quantité d'une unité source vers une unité cible avec indication d'approximation.
 * - Masse <-> Masse : conversion exacte (via g)
 * - Volume <-> Volume : conversion exacte (via ml, avec 1 cc = 5 ml et 1 cs = 15 ml)
 * - Masse <-> Volume : conversion approximative (1 ml = 1 g), approximate = true
 * - Comptage : uniquement si l'unité normalisée est strictement identique (ex: pièce -> pièce),
 *   non convertible entre unités de comptage différentes ni avec masse/volume.
 * - Si impossible : renvoie { value: null, approximate: false } (jamais la quantité inchangée).
 */
export function convertUnitsWithInfo(
  qty: number,
  fromUnit: string,
  toUnit: string
): UnitConversionResult {
  const fromNorm = normalizeUnit(fromUnit);
  const toNorm = normalizeUnit(toUnit);

  if (!fromNorm || !toNorm || !Number.isFinite(qty)) {
    return { value: null, approximate: false };
  }

  const fromFamily = getUnitFamily(fromNorm);
  const toFamily = getUnitFamily(toNorm);

  // Même unité normalisée (ex: pièce -> pièce, kg -> kg, ou unité personnalisée identique)
  if (fromNorm === toNorm) {
    return { value: qty, approximate: false };
  }

  // Si l'une des unités est inconnue ou de comptage (et différente de l'autre) -> impossible
  if (!fromFamily || !toFamily || fromFamily === 'count' || toFamily === 'count') {
    return { value: null, approximate: false };
  }

  // Masse -> Masse
  if (fromFamily === 'mass' && toFamily === 'mass') {
    const inGrams = qty * MASS_UNITS[fromNorm];
    return {
      value: inGrams / MASS_UNITS[toNorm],
      approximate: false,
    };
  }

  // Volume -> Volume
  if (fromFamily === 'volume' && toFamily === 'volume') {
    const inMl = qty * VOLUME_UNITS[fromNorm];
    return {
      value: inMl / VOLUME_UNITS[toNorm],
      approximate: false,
    };
  }

  // Masse -> Volume (approximation 1 g = 1 ml)
  if (fromFamily === 'mass' && toFamily === 'volume') {
    const inGrams = qty * MASS_UNITS[fromNorm];
    const inMl = inGrams; // 1 g ≈ 1 ml
    return {
      value: inMl / VOLUME_UNITS[toNorm],
      approximate: true,
    };
  }

  // Volume -> Masse (approximation 1 ml = 1 g)
  if (fromFamily === 'volume' && toFamily === 'mass') {
    const inMl = qty * VOLUME_UNITS[fromNorm];
    const inGrams = inMl; // 1 ml ≈ 1 g
    return {
      value: inGrams / MASS_UNITS[toNorm],
      approximate: true,
    };
  }

  return { value: null, approximate: false };
}

/**
 * Convertit une quantité entre deux unités.
 * Renvoie `null` lorsque la conversion est impossible (jamais la quantité inchangée).
 */
export function convertUnits(qty: number, fromUnit: string, toUnit: string): number | null {
  return convertUnitsWithInfo(qty, fromUnit, toUnit).value;
}

/**
 * Vérifie si deux unités sont compatibles (convertibles entre elles, exactement ou approximativement).
 */
export function areUnitsCompatible(fromUnit: string, toUnit: string): boolean {
  return convertUnitsWithInfo(1, fromUnit, toUnit).value !== null;
}

/**
 * S'assure qu'une liste d'unités contient bien 'cs' et 'cc' (ainsi que les unités de base si la liste est vide).
 */
export function ensureRequiredUnits(units?: string[] | null): string[] {
  if (!units || !Array.isArray(units) || units.length === 0) {
    return [...DEFAULT_UNITS];
  }
  const normalizedList = units.map(u => normalizeUnit(u) || u);
  const result = [...normalizedList];
  for (const req of ['cs', 'cc']) {
    if (!result.includes(req)) {
      result.push(req);
    }
  }
  return result;
}

/**
 * Formate une quantité numérique de façon lisible en français (ex: 300, 0,5, 12,25).
 */
export function formatQtyFr(qty: number): string {
  const rounded = Math.round(qty * 1000) / 1000;
  return rounded.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
}

/**
 * Affiche une quantité de stock lisible : pas plus de 2 décimales, sans zéros superflus.
 */
export function formatStock(stock: number | undefined | null): string {
  if (stock === undefined || stock === null || !Number.isFinite(stock)) return '0';
  const rounded = Math.round(stock * 100) / 100;
  return rounded.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

/**
 * Retire les suffixes d'unités ou de préparation entre parenthèses d'un nom de produit
 * (ex: "Farine (g)" -> "Farine", "Persil (cs)" -> "Persil", "Oignon (haché)" -> "Oignon").
 */
export function cleanProductName(name: string | undefined | null): string {
  if (!name) return '';
  let cleaned = name.trim();

  // 1. Remplacer les parenthèses d'unités ou préparations connues n'importe où
  const unitOrPrepRegex = /\s*\((?:g|kg|mg|l|cl|dl|ml|cs|cc|c\.?\s*[àa]\s*s\.?|c\.?\s*[àa]\s*c\.?|pi[èe]ces?|sachets?|pots?|bouteilles?|bo[îi]tes?|hach[ée]e?s?|r[âa]p[ée]e?s?|morceaux|en morceaux|en d[ée]s|entier|entiers|pel[ée]e?s?|crus?|cuits?|fra[iî]s|fra[iî]che)\)\s*/gi;
  cleaned = cleaned.replace(unitOrPrepRegex, ' ');

  // 2. Si le nom se termine par une parenthèse (ex: suffixe résiduel en fin de chaîne), le retirer
  cleaned = cleaned.replace(/\s*\([^)]*\)\s*$/g, '');

  // 3. Nettoyer les espaces multiples et la ponctuation finale (virgule, tiret)
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/[,;:\s-]+$/, '').trim();

  return cleaned || name.trim();
}

/**
 * Détermine l'unité de stock logique pour la création rapide :
 * - g ou kg donne kg
 * - ml, cl, l, cs ou cc donne l
 * - sinon pièce
 */
export function getLogicalStockUnit(inputUnit: string | undefined | null): string {
  const norm = normalizeUnit(inputUnit);
  if (norm === 'g' || norm === 'kg' || norm === 'mg') {
    return 'kg';
  }
  if (
    norm === 'ml' ||
    norm === 'cl' ||
    norm === 'dl' ||
    norm === 'l' ||
    norm === 'cs' ||
    norm === 'cc'
  ) {
    return 'l';
  }
  return 'pièce';
}

/**
 * Propose les unités d'achat compatibles avec l'unité du produit :
 * - Produit en kg : ['kg', 'g']
 * - Produit en l : ['l', 'cl', 'ml']
 * - Produit à la pièce : son unité seule (ex: ['pièce'])
 * Avec l'unité du produit sélectionnée par défaut (en tête de liste).
 */
export function getCompatiblePurchaseUnits(productUnit: string | undefined | null): string[] {
  const norm = normalizeUnit(productUnit);
  if (!norm) return ['pièce'];

  if (norm === 'kg') return ['kg', 'g'];
  if (norm === 'g') return ['g', 'kg'];
  if (norm === 'mg') return ['mg', 'g', 'kg'];

  if (norm === 'l') return ['l', 'cl', 'ml'];
  if (norm === 'cl') return ['cl', 'l', 'ml'];
  if (norm === 'ml') return ['ml', 'cl', 'l'];
  if (norm === 'dl') return ['dl', 'l', 'cl', 'ml'];

  const family = getUnitFamily(norm);
  if (family === 'mass') {
    return [norm, 'kg', 'g'].filter((u, i, arr) => arr.indexOf(u) === i);
  }
  if (family === 'volume') {
    return [norm, 'l', 'cl', 'ml'].filter((u, i, arr) => arr.indexOf(u) === i);
  }

  return [productUnit?.trim() || norm];
}

export interface ConvertedProductValues {
  stock: number | null;
  minStockAlert: number | null;
  avgPurchasePrice: number | null;
}

/**
 * Convertit automatiquement le stock, le seuil d'alerte et le prix moyen
 * lors d'un changement d'unité compatible (ex: g -> kg, ml -> l).
 * Renvoie null si les unités sont incompatibles.
 */
export function convertProductUnitValues(
  oldUnit: string,
  newUnit: string,
  stock: number,
  minStockAlert: number,
  avgPurchasePrice: number
): ConvertedProductValues | null {
  if (!areUnitsCompatible(oldUnit, newUnit)) {
    return null;
  }

  const newStock = convertUnits(stock, oldUnit, newUnit);
  const newMinStock = convertUnits(minStockAlert, oldUnit, newUnit);

  // Facteur pour le prix : 1 [newUnit] = factor * [oldUnit]
  // Ex: 1 kg = 1000 g -> prix au kg = (prix au g) * 1000
  // Ex: 1 g = 0.001 kg -> prix au g = (prix au kg) * 0.001
  const factor = convertUnits(1, newUnit, oldUnit);
  const newPrice = factor !== null ? avgPurchasePrice * factor : null;

  return {
    stock: newStock,
    minStockAlert: newMinStock,
    avgPurchasePrice: newPrice !== null ? Number(newPrice.toFixed(4)) : null,
  };
}
