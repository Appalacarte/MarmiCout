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

export interface UnverifiedAllergenItem {
  name: string;
  productId?: string;
  reason: 'unspecified' | 'unlinked';
}

export interface RecipeAllergensResult {
  allergens: Allergen[];
  isFullyVerified: boolean;
  hasUnlinkedIngredients: boolean;
  unlinkedCount: number;
  hasUnspecifiedProducts: boolean;
  unspecifiedCount: number;
  unverifiedItems: UnverifiedAllergenItem[];
}

/**
 * Calcule automatiquement les allergènes déclarables d'une recette à partir de ses ingrédients liés.
 * Un produit vérifié est soit un tableau d'allergènes déclaré, soit un tableau vide (vérifié sans allergène).
 * Si allergens est absent ou null, le produit est considéré non renseigné.
 */
export function calculateRecipeAllergens(
  ingredients: Array<{ productId?: string; customName?: string }>,
  productMap: Map<string, { id?: string; name?: string; allergens?: string[] | null }>
): RecipeAllergensResult {
  const detected = new Set<Allergen>();
  const unverifiedMap = new Map<string, UnverifiedAllergenItem>();

  for (const ing of ingredients) {
    if (!ing.productId) {
      const name = ing.customName?.trim() || 'Ingrédient sans produit lié';
      const key = `unlinked:${name}`;
      if (!unverifiedMap.has(key)) {
        unverifiedMap.set(key, {
          name,
          reason: 'unlinked',
        });
      }
      continue;
    }

    const prod = productMap.get(ing.productId);
    if (!prod) {
      const name = ing.customName?.trim() || 'Produit introuvable';
      const key = `unlinked:${ing.productId}`;
      if (!unverifiedMap.has(key)) {
        unverifiedMap.set(key, {
          name,
          productId: ing.productId,
          reason: 'unlinked',
        });
      }
      continue;
    }

    // Trois états : null/undefined = non renseigné ; [] = vérifié sans allergène ; [...] = déclarés
    if (prod.allergens === null || prod.allergens === undefined) {
      const name = prod.name || ing.customName?.trim() || 'Produit';
      const key = `unspecified:${prod.id || ing.productId}`;
      if (!unverifiedMap.has(key)) {
        unverifiedMap.set(key, {
          name,
          productId: prod.id || ing.productId,
          reason: 'unspecified',
        });
      }
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

  const unverifiedItems = Array.from(unverifiedMap.values());
  const unlinkedCount = unverifiedItems.filter(item => item.reason === 'unlinked').length;
  const unspecifiedCount = unverifiedItems.filter(item => item.reason === 'unspecified').length;

  return {
    allergens: OFFICIAL_ALLERGENS.filter(a => detected.has(a)),
    isFullyVerified: unverifiedItems.length === 0,
    hasUnlinkedIngredients: unlinkedCount > 0,
    unlinkedCount,
    hasUnspecifiedProducts: unspecifiedCount > 0,
    unspecifiedCount,
    unverifiedItems,
  };
}

/**
 * Formate la liste des allergènes pour la copie ou l'affichage (ex: "Gluten, Lait, Œufs").
 * Inclut l'avertissement et la liste des produits concernés si des ingrédients ne sont pas vérifiés.
 */
export function formatAllergensList(
  allergens: string[],
  unverifiedItems?: UnverifiedAllergenItem[]
): string {
  const parts: string[] = [];

  if (allergens && allergens.length > 0) {
    const formatted = allergens
      .map(a => a.charAt(0).toUpperCase() + a.slice(1))
      .join(', ');
    parts.push(formatted);
  } else {
    parts.push('Aucun allergène déclaré');
  }

  if (unverifiedItems && unverifiedItems.length > 0) {
    const details = unverifiedItems
      .map(item => `${item.name} (${item.reason === 'unlinked' ? 'non lié au stock' : 'non renseigné'})`)
      .join(', ');
    parts.push(`⚠️ Allergènes à vérifier pour : ${details}`);
  }

  return parts.join('\n');
}
