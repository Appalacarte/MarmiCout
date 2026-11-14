/**
 * Gestion des 14 allergènes à déclaration obligatoire en Europe (Règlement UE n° 1169/2011 INCO) :
 * gluten, crustacés, œufs, poissons, arachides, soja, lait, fruits à coque,
 * céleri, moutarde, sésame, sulfites, lupin, mollusques.
 */

export const OFFICIAL_ALLERGENS = [
  'gluten',
  'crustacés',
  'œufs',
  'poissons',
  'arachides',
  'soja',
  'lait',
  'fruits à coque',
  'céleri',
  'moutarde',
  'sésame',
  'sulfites',
  'lupin',
  'mollusques',
] as const;

export type Allergen = (typeof OFFICIAL_ALLERGENS)[number];

export const ALLERGEN_DISCLAIMER =
  'Cette information est une aide au calcul basée sur vos fiches produits. Le professionnel reste seul responsable de la vérification et de la déclaration des allergènes (Règlement UE n° 1169/2011 INCO).';

/**
 * Mots-clés de détection automatique pour chaque allergène d'après le libellé du produit.
 */
const ALLERGEN_KEYWORDS: Record<Allergen, string[]> = {
  gluten: [
    'farine',
    'ble',
    'blé',
    'seigle',
    'orge',
    'avoine',
    'epeautre',
    'épeautre',
    'kamut',
    'pain',
    'pate',
    'pâte',
    'pates',
    'pâtes',
    'chapelure',
    'semoule',
    'couscous',
    'biere',
    'bière',
    'biscuit',
    'brioche',
    'croissant',
    'feuilletee',
    'feuilletée',
    'brisee',
    'brisée',
    'spaghetti',
    'penne',
    'tagliatelle',
  ],
  crustacés: [
    'crevette',
    'crevettes',
    'crabe',
    'homard',
    'langouste',
    'langoustine',
    'langoustines',
    'ecrevisse',
    'écrevisse',
    'écrevisses',
    'gambas',
    'scampi',
  ],
  œufs: [
    'oeuf',
    'oeufs',
    'œuf',
    'œufs',
    'jaune d',
    'blanc d',
    'mayonnaise',
    'meringue',
    'omelette',
  ],
  poissons: [
    'poisson',
    'poissons',
    'saumon',
    'thon',
    'cabillaud',
    'colin',
    'truite',
    'merlu',
    'anchois',
    'sardine',
    'sardines',
    'maquereau',
    'bar',
    'dorade',
    'morue',
    'sole',
    'lieu',
    'hareng',
    'eglefin',
    'églefin',
  ],
  arachides: [
    'arachide',
    'arachides',
    'cacahuete',
    'cacahuète',
    'cacahuetes',
    'cacahuètes',
    'peanut',
  ],
  soja: [
    'soja',
    'tofu',
    'edamame',
    'tamari',
    'miso',
    'shoyu',
    'lecithine de soja',
    'lécithine de soja',
  ],
  lait: [
    'lait',
    'beurre',
    'creme',
    'crème',
    'fromage',
    'yaourt',
    'yogourt',
    'parmesan',
    'emmental',
    'mozzarella',
    'gruyere',
    'gruyère',
    'mascarpone',
    'ricotta',
    'lactoserum',
    'lactosérum',
    'chevre',
    'chèvre',
    'roquefort',
    'comte',
    'comté',
    'gorgonzola',
  ],
  'fruits à coque': [
    'amande',
    'amandes',
    'noisette',
    'noisettes',
    'noix',
    'pistache',
    'pistaches',
    'cajou',
    'pecan',
    'pécan',
    'macadamia',
    'praline',
    'praliné',
    'marron',
    'chataigne',
    'châtaigne',
  ],
  céleri: ['celeri', 'céleri', 'celeri-rave', 'céleri-rave'],
  moutarde: ['moutarde'],
  sésame: ['sesame', 'sésame', 'tahini', 'tahin', 'gomasio'],
  sulfites: [
    'vin',
    'vinaigre',
    'cidre',
    'raisins secs',
    'abricots secs',
    'fruits secs',
    'sulfite',
    'sulfites',
    'e220',
    'e221',
    'e222',
    'e223',
    'e224',
    'e226',
    'e227',
    'e228',
  ],
  lupin: ['lupin'],
  mollusques: [
    'moule',
    'moules',
    'huitre',
    'huître',
    'huitres',
    'huîtres',
    'saint-jacques',
    'saint jacques',
    'calmar',
    'calamar',
    'encornet',
    'poulpe',
    'seiche',
    'escargot',
    'escargots',
    'palourde',
    'palourdes',
    'coque',
    'coques',
    'bulot',
    'bulots',
  ],
};

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Propose automatiquement une liste d'allergènes d'après le nom d'un produit.
 */
export function suggestAllergensFromName(name: string | undefined | null): Allergen[] {
  if (!name) return [];
  const normalized = normalizeString(name);
  const detected = new Set<Allergen>();

  for (const allergen of OFFICIAL_ALLERGENS) {
    const keywords = ALLERGEN_KEYWORDS[allergen];
    for (const kw of keywords) {
      const normKw = normalizeString(kw);
      // Correspondance par mot entier ou sous-chaîne distincte
      const regex = new RegExp(`(^|[^a-z0-9])${normKw}([^a-z0-9]|$)`, 'i');
      if (regex.test(normalized)) {
        detected.add(allergen);
        break;
      }
    }
  }

  return OFFICIAL_ALLERGENS.filter(a => detected.has(a));
}

export interface RecipeAllergensResult {
  allergens: Allergen[];
  hasUnlinkedIngredients: boolean;
  unlinkedCount: number;
}

/**
 * Calcule automatiquement les allergènes déclarables d'une recette à partir de ses ingrédients liés.
 */
export function calculateRecipeAllergens(
  ingredients: Array<{ productId?: string; customName?: string }>,
  productMap: Map<string, { allergens?: string[] | null }>
): RecipeAllergensResult {
  const detected = new Set<Allergen>();
  let unlinkedCount = 0;

  for (const ing of ingredients) {
    if (!ing.productId) {
      unlinkedCount++;
      continue;
    }

    const prod = productMap.get(ing.productId);
    if (!prod) {
      unlinkedCount++;
      continue;
    }

    if (Array.isArray(prod.allergens)) {
      for (const a of prod.allergens) {
        const lower = a.trim().toLowerCase();
        if ((OFFICIAL_ALLERGENS as readonly string[]).includes(lower)) {
          detected.add(lower as Allergen);
        }
      }
    }
  }

  return {
    allergens: OFFICIAL_ALLERGENS.filter(a => detected.has(a)),
    hasUnlinkedIngredients: unlinkedCount > 0,
    unlinkedCount,
  };
}

/**
 * Formate la liste des allergènes pour la copie ou l'affichage (ex: "Gluten, Lait, Œufs").
 */
export function formatAllergensList(allergens: string[]): string {
  if (!allergens || allergens.length === 0) return 'Aucun allergène majeur détecté';
  return allergens
    .map(a => a.charAt(0).toUpperCase() + a.slice(1))
    .join(', ');
}
