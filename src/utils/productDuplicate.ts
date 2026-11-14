import type { Product } from '../types/index.ts';
import { cleanProductName } from './units.ts';

/**
 * Singularise un mot / token en français :
 * - Gère les pluriels réguliers en -s et -x (mots de plus de 3 lettres)
 * - Gère les pluriels en -eaux -> -eau
 * - Gère les pluriels en -eux -> -eu
 * - Gère les pluriels en -aux -> -al
 * - Gère quelques exceptions culinaires courantes (aulx -> ail, yeux -> oeil)
 * 
 * Puisque cette fonction est appliquée de manière symétrique à la fois
 * au texte de recherche et aux noms de produits existants, les mots invariables
 * terminant par s (comme 'radis', 'maïs', 'ananas', 'couscous') produiront la même
 * racine des deux côtés et continueront donc à correspondre parfaitement.
 */
export function singularizeFrenchToken(token: string): string {
  if (!token || token.length <= 2) return token;
  const t = token.toLowerCase();

  // Exceptions courantes
  if (t === 'aulx') return 'ail';
  if (t === 'yeux') return 'oeil';

  // -eaux -> -eau (ex: poireaux -> poireau, gâteaux -> gateau)
  if (t.endsWith('eaux')) {
    return t.slice(0, -1);
  }

  // -eux -> -eu (ex: cheveux -> cheveu)
  if (t.endsWith('eux')) {
    return t.slice(0, -1);
  }

  // -aux -> -al pour mots > 3 lettres (ex: bocaux -> bocal, animaux -> animal)
  if (t.endsWith('aux') && t.length > 3) {
    return t.slice(0, -3) + 'al';
  }

  // -s ou -x final pour les mots de plus de 3 lettres
  // (ex: olives -> olive, noires -> noire, choux -> chou, pommes -> pomme)
  if ((t.endsWith('s') || t.endsWith('x')) && t.length > 3) {
    return t.slice(0, -1);
  }

  return t;
}

/**
 * Découpe une chaîne en tokens normalisés :
 * 1. Nettoyage préliminaire du nom de produit (retrait des unités entre parenthèses)
 * 2. Suppression des accents (NFD)
 * 3. Passage en minuscules
 * 4. Remplacement de la ponctuation et caractères spéciaux par des espaces
 * 5. Découpage par espaces et singularisation de chaque mot
 */
export function tokenizeAndNormalize(str: string): string[] {
  if (!str) return [];
  const cleaned = cleanProductName(str);
  const noAccents = cleaned
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  
  // Remplace tout ce qui n'est pas lettre ou chiffre par un espace
  const alphaNumOnly = noAccents.replace(/[^a-z0-9]/g, ' ');

  return alphaNumOnly
    .split(/\s+/)
    .filter(Boolean)
    .map(singularizeFrenchToken);
}

/**
 * Normalise une chaîne en phrase nettoyée (sans accents, singulier, espaces simples).
 */
export function normalizeProductName(str: string): string {
  return tokenizeAndNormalize(str).join(' ');
}

/**
 * Normalise une chaîne avec tri alphabétique des tokens
 * pour comparaison insensible à l'ordre des mots (ex: "olives noires" === "noires olives").
 */
export function normalizeProductNameSorted(str: string): string {
  return tokenizeAndNormalize(str).sort().join(' ');
}

/**
 * Vérifie si deux noms de produits correspondent exactement après normalisation :
 * - Ignore la casse
 * - Ignore les accents
 * - Ignore les espaces multiples et début/fin
 * - Ignore le singulier / pluriel ("olive noire" === "Olives noires")
 * - Tolère l'ordre des mots si les tokens sont identiques
 */
export function isExactProductNameMatch(nameA: string, nameB: string): boolean {
  const normA = normalizeProductName(nameA);
  const normB = normalizeProductName(nameB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  const sortedA = normalizeProductNameSorted(nameA);
  const sortedB = normalizeProductNameSorted(nameB);
  return sortedA === sortedB;
}

/**
 * Trouve le premier produit existant qui correspond exactement (après normalisation).
 * @param inputName Le nom saisi dans le formulaire
 * @param existingProducts La liste complète des produits (actifs et inactifs)
 * @param ignoreProductId Optionnel : ID du produit actuellement édité pour ne pas se détecter soi-même
 */
export function findExactDuplicateProduct(
  inputName: string,
  existingProducts: Product[],
  ignoreProductId?: string
): Product | undefined {
  const trimmed = inputName.trim();
  if (!trimmed) return undefined;
  return existingProducts.find(
    p => p.id !== ignoreProductId && isExactProductNameMatch(trimmed, p.name)
  );
}

export interface DuplicateSearchOptions {
  maxResults?: number;
  ignoreProductId?: string;
}

/**
 * Recherche les produits existants correspondants pour suggestions (5 max par défaut) :
 * - Dès le premier caractère saisi
 * - Insensible majuscules, accents, espaces, pluriel
 * - Inclut les produits désactivés (avec badge/mention)
 * - Ordonne par pertinence décroissante :
 *   100 = Correspondance exacte (singulier/pluriel ou ordre des mots)
 *    80 = Débute par la requête
 *    60 = Contient la requête comme sous-chaîne
 *    40 = Tous les mots de la requête sont présents dans le nom du produit
 */
export function searchDuplicateSuggestions(
  inputName: string,
  existingProducts: Product[],
  options?: DuplicateSearchOptions
): Product[] {
  const query = inputName.trim();
  if (!query) return [];

  const maxResults = options?.maxResults ?? 5;
  const ignoreId = options?.ignoreProductId;

  const queryTokens = tokenizeAndNormalize(query);
  if (queryTokens.length === 0) return [];

  const queryNorm = queryTokens.join(' ');
  const querySorted = queryTokens.slice().sort().join(' ');

  const matches: { product: Product; score: number }[] = [];

  for (const prod of existingProducts) {
    if (ignoreId && prod.id === ignoreId) continue;

    const prodTokens = tokenizeAndNormalize(prod.name);
    if (prodTokens.length === 0) continue;

    const prodNorm = prodTokens.join(' ');
    const prodSorted = prodTokens.slice().sort().join(' ');

    let score = 0;

    // 1. Exact match normalisé (avec singulier/pluriel et ordre des mots)
    if (prodNorm === queryNorm || prodSorted === querySorted) {
      score = 100;
    }
    // 2. Début de chaîne
    else if (prodNorm.startsWith(queryNorm)) {
      score = 80;
    }
    // 3. Contient la sous-chaîne complète
    else if (prodNorm.includes(queryNorm)) {
      score = 60;
    }
    // 4. Tous les tokens de la requête correspondent à au moins un token du produit
    else {
      const allTokensMatch = queryTokens.every(qTok =>
        prodTokens.some(pTok => pTok.startsWith(qTok) || pTok.includes(qTok))
      );
      if (allTokensMatch) {
        score = 40;
      }
    }

    if (score > 0) {
      matches.push({ product: prod, score });
    }
  }

  // Trier par score décroissant, puis par ordre alphabétique
  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.product.name.localeCompare(b.product.name);
  });

  return matches.slice(0, maxResults).map(m => m.product);
}
