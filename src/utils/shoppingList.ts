export interface ShoppingItemForGrouping {
  key: string;
  productName: string;
  productUnit: string;
  needed: number;
  inStock: number;
  toOrder: number;
  estimatedCost: number;
  avgPurchasePrice: number;
  mainStoreId?: string;
  isUnlinked?: boolean;
}

export interface StoreGroup<T extends ShoppingItemForGrouping = ShoppingItemForGrouping> {
  storeId: string;
  storeName: string;
  items: T[];
  estimatedCost: number;
}

/**
 * Regroupe les articles à commander par fournisseur habituel (mainStoreId).
 * Les articles sans magasin ou non trouvés sont placés dans « Sans fournisseur ».
 */
export function groupShoppingItemsByStore<T extends ShoppingItemForGrouping>(
  items: T[],
  storeMap: Map<string, string>
): StoreGroup<T>[] {
  const groupsMap = new Map<string, StoreGroup<T>>();

  for (const item of items) {
    const rawStoreId = item.mainStoreId || '';
    const hasStore = Boolean(rawStoreId && storeMap.has(rawStoreId));
    const groupId = hasStore ? rawStoreId : 'none';
    const storeName = hasStore ? (storeMap.get(rawStoreId) || 'Fournisseur inconnu') : 'Sans fournisseur';

    if (!groupsMap.has(groupId)) {
      groupsMap.set(groupId, {
        storeId: groupId,
        storeName,
        items: [],
        estimatedCost: 0,
      });
    }
    const group = groupsMap.get(groupId)!;
    group.items.push(item);
    group.estimatedCost = Number((group.estimatedCost + item.estimatedCost).toFixed(2));
  }

  const result = Array.from(groupsMap.values());
  result.sort((a, b) => {
    if (a.storeId === 'none') return 1;
    if (b.storeId === 'none') return -1;
    return a.storeName.localeCompare(b.storeName);
  });
  return result;
}

/**
 * Génère le texte copiable pour le presse-papier, en tenant compte du regroupement choisi.
 */
export function generateShoppingListText(params: {
  date: string;
  selections: { recipeName: string; portions: number }[];
  toOrderItems: ShoppingItemForGrouping[];
  totalEstimatedCost: number;
  currency: string;
  groupBy: 'store' | 'all';
  storeGroups: StoreGroup[];
  checkedKeys: Set<string>;
}): string {
  const {
    date,
    selections,
    toOrderItems,
    totalEstimatedCost,
    currency,
    groupBy,
    storeGroups,
    checkedKeys
  } = params;

  const lines: string[] = [];
  lines.push('🛒 LISTE DE COURSES — MarmiCout');
  lines.push(`📅 ${date}`);
  lines.push('');

  if (selections.length > 0) {
    lines.push('📋 Recettes planifiées :');
    selections.forEach(({ recipeName, portions }) => {
      lines.push(`  • ${recipeName} — ${portions} portion(s)`);
    });
    lines.push('');
  }

  if (toOrderItems.length > 0) {
    if (groupBy === 'store') {
      lines.push('🛒 À ACHETER (PAR FOURNISSEUR) :');
      storeGroups.forEach(group => {
        lines.push('');
        lines.push(`🏪 ${group.storeName.toUpperCase()} (${group.items.length} article${group.items.length > 1 ? 's' : ''}) — Estimé : ${group.estimatedCost.toFixed(2)}${currency}`);
        group.items.forEach(item => {
          const isChecked = checkedKeys.has(item.key);
          lines.push(
            `  ${isChecked ? '☑' : '□'} ${item.productName} — ${item.toOrder} ${item.productUnit}` +
            (item.estimatedCost > 0 ? ` (~${item.estimatedCost.toFixed(2)}${currency})` : '') +
            (isChecked ? ' [Acheté]' : '')
          );
        });
      });
      lines.push('');
      lines.push(`💰 Coût estimé total : ${totalEstimatedCost.toFixed(2)}${currency}`);
    } else {
      lines.push('🛒 À ACHETER :');
      toOrderItems.forEach(item => {
        const isChecked = checkedKeys.has(item.key);
        lines.push(
          `  ${isChecked ? '☑' : '□'} ${item.productName} — ${item.toOrder} ${item.productUnit}` +
          (item.estimatedCost > 0 ? ` (~${item.estimatedCost.toFixed(2)}${currency})` : '') +
          (isChecked ? ' [Acheté]' : '')
        );
      });
      lines.push('');
      lines.push(`💰 Coût estimé des achats : ${totalEstimatedCost.toFixed(2)}${currency}`);
    }
  }

  return lines.join('\n');
}

/**
 * Génère le contenu CSV en respectant le regroupement choisi et les cases cochées.
 */
export function generateShoppingListCsv(params: {
  selections: { recipeName: string; portions: number }[];
  toOrderItems: ShoppingItemForGrouping[];
  availableItems: { productName: string; needed: number; inStock: number; productUnit: string }[];
  groupBy: 'store' | 'all';
  storeGroups: StoreGroup[];
  checkedKeys: Set<string>;
}): string {
  const { selections, toOrderItems, availableItems, groupBy, storeGroups, checkedKeys } = params;
  const bom = '\uFEFF';
  const lines: string[] = [];

  lines.push('RECETTES PLANIFIÉES');
  lines.push('Recette,Portions cible');
  selections.forEach(({ recipeName, portions }) => {
    lines.push(`"${recipeName.replace(/"/g, '""')}",${portions}`);
  });
  lines.push('');

  if (toOrderItems.length > 0) {
    if (groupBy === 'store') {
      lines.push('INGRÉDIENTS À ACHETER (PAR FOURNISSEUR)');
      lines.push('Fournisseur,Ingrédient,Qté à commander,Unité,En stock,Besoin total,Coût estimé,Acheté');
      storeGroups.forEach(group => {
        group.items.forEach(item => {
          const isChecked = checkedKeys.has(item.key) ? 'Oui' : 'Non';
          lines.push(
            `"${group.storeName.replace(/"/g, '""')}","${item.productName.replace(/"/g, '""')}",${item.toOrder},"${item.productUnit}",${item.inStock},${item.needed},${item.estimatedCost.toFixed(2)},"${isChecked}"`
          );
        });
      });
      lines.push('');
    } else {
      lines.push('INGRÉDIENTS À ACHETER');
      lines.push('Ingrédient,Qté à commander,Unité,En stock,Besoin total,Coût estimé,Acheté');
      toOrderItems.forEach(item => {
        const isChecked = checkedKeys.has(item.key) ? 'Oui' : 'Non';
        lines.push(
          `"${item.productName.replace(/"/g, '""')}",${item.toOrder},"${item.productUnit}",${item.inStock},${item.needed},${item.estimatedCost.toFixed(2)},"${isChecked}"`
        );
      });
      lines.push('');
    }
  }

  if (availableItems.length > 0) {
    lines.push('DÉJÀ EN STOCK');
    lines.push('Ingrédient,Besoin,Stock actuel,Unité');
    availableItems.forEach(item => {
      lines.push(`"${item.productName.replace(/"/g, '""')}",${item.needed},${item.inStock},"${item.productUnit}"`);
    });
    lines.push('');
  }

  return bom + lines.join('\n');
}
