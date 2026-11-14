import React, { useMemo, useState } from 'react';
import { parseDecimalInput } from '../utils';
import {
  ShoppingCart,
  Check,
  AlertTriangle,
  Copy,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  X,
  FileSpreadsheet,
  ChefHat,
  PackageCheck,
  Plus,
  Store as StoreIcon,
  ShoppingBag
} from 'lucide-react';
import { Recipe, Production, Product, Purchase } from '../types';
import { dbService } from '../services/db';
import {
  convertUnitsWithInfo,
  normalizeUnit,
  cleanProductName,
  formatStock,
  getLogicalStockUnit,
} from '../utils/units';
import {
  groupShoppingItemsByStore,
  generateShoppingListText,
  generateShoppingListCsv,
} from '../utils/shoppingList';
import { generateUUID } from '../services/cloudDbService';
import { ProductDuplicateSuggestions } from './ProductDuplicateSuggestions';
import { findExactDuplicateProduct } from '../utils/productDuplicate';

interface RecipeSelection {
  recipe: Recipe;
  portions: number;
}

interface ShoppingListDrawerProps {
  selections: RecipeSelection[];
  isOpen: boolean;
  onClose: () => void;
  /** Appelé après une production réussie — recharger les données + vider les sélections */
  onCookDone?: () => void;
  /** Appelé quand un produit est créé / un ingrédient est lié depuis ce panneau */
  onDataChanged?: () => void;
  /** Mettre à jour les portions d'une recette directement depuis cette fenêtre */
  onUpdatePortions?: (recipeId: string, portions: number) => void;
}

interface ShoppingItem {
  key: string;
  productId?: string;
  productName: string;
  productUnit: string;
  needed: number;
  inStock: number;
  toOrder: number;
  estimatedCost: number;
  avgPurchasePrice: number;
  fromRecipes: string[];
  isUnlinked?: boolean;
  isApproximate?: boolean;
  unlinkedRefs?: { recipeId: string; ingredientId: string }[];
  mainStoreId?: string;
}

interface PurchaseValidationRow {
  itemKey: string;
  productId: string;
  productName: string;
  productUnit: string;
  storeId: string;
  qty: number;
  unit: string;
  pricePaid: number;
}

interface IncompatibleShoppingItem {
  key: string;
  recipeName: string;
  productName: string;
  recipeUnit: string;
  stockUnit: string;
}

export const ShoppingListDrawer: React.FC<ShoppingListDrawerProps> = ({
  selections,
  isOpen,
  onClose,
  onCookDone,
  onDataChanged,
  onUpdatePortions
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [showAvailable, setShowAvailable] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);

  // Mode de regroupement : 'store' (par fournisseur) ou 'all' (liste globale)
  const [groupBy, setGroupBy] = useState<'store' | 'all'>('store');

  // Articles cochés « achetés », mémorisés tant que la liste est ouverte
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());

  // État de validation des achats
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseRows, setPurchaseRows] = useState<PurchaseValidationRow[]>([]);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccessMessage, setPurchaseSuccessMessage] = useState<string | null>(null);
  const [isSubmittingPurchases, setIsSubmittingPurchases] = useState(false);

  // Modal de confirmation de création rapide d'un produit
  const [quickAddModal, setQuickAddModal] = useState<{
    isOpen: boolean;
    name: string;
    unit: string;
    item: ShoppingItem;
  } | null>(null);

  // États du flux cuisine
  type CookState = 'idle' | 'confirming' | 'done';
  const [cookingState, setCookingState] = useState<CookState>('idle');
  const [cookResults, setCookResults] = useState<{ recipeName: string; success: boolean; error?: string }[]>([]);

  const settings = dbService.getSettings();

  const { toOrderItems, availableItems, incompatibleItems, totalEstimatedCost, hasApproximateCost } = useMemo(() => {
    void refreshTick;
    if (!selections.length) {
      return { toOrderItems: [], availableItems: [], incompatibleItems: [] as IncompatibleShoppingItem[], totalEstimatedCost: 0, hasApproximateCost: false };
    }

    const productNeeds = new Map<string, { needed: number; fromRecipes: string[]; isApproximate: boolean }>();
    const incompatibleItems: IncompatibleShoppingItem[] = [];
    const customNeeds = new Map<string, {
      name: string;
      totalQty: number;
      unit: string;
      customCostSum: number;
      fromRecipes: string[];
      unlinkedRefs: { recipeId: string; ingredientId: string }[];
    }>();

    for (const { recipe, portions } of selections) {
      const factor = portions / (recipe.portions || 1);
      const ingredients = dbService.getRecipeIngredients(recipe.id);

      for (const ing of ingredients) {
        const product = ing.productId ? dbService.getProduct(ing.productId) : undefined;
        if (product) {
          const conv = convertUnitsWithInfo(ing.qtyUsed * factor, ing.unit, product.unit, product);
          if (conv.value === null) {
            incompatibleItems.push({
              key: `${recipe.id}_${ing.id}`,
              recipeName: recipe.name,
              productName: product.name,
              recipeUnit: normalizeUnit(ing.unit) || ing.unit,
              stockUnit: normalizeUnit(product.unit) || product.unit,
            });
          } else {
            const qtyNeeded = conv.value;
            const existing = productNeeds.get(product.id);
            if (existing) {
              existing.needed += qtyNeeded;
              if (conv.approximate) existing.isApproximate = true;
              if (!existing.fromRecipes.includes(recipe.name)) {
                existing.fromRecipes.push(recipe.name);
              }
            } else {
              productNeeds.set(product.id, {
                needed: qtyNeeded,
                fromRecipes: [recipe.name],
                isApproximate: conv.approximate,
              });
            }
          }
        } else {
          const rawName = (ing.customName || 'Ingrédient').trim();
          const normIngUnit = normalizeUnit(ing.unit) || ing.unit;
          const key = `custom_${rawName.toLowerCase()}_${normIngUnit}`;
          const qtyNeeded = ing.qtyUsed * factor;
          const lineCost = qtyNeeded * (ing.customCostPerUnit || 0);
          const existing = customNeeds.get(key);
          if (existing) {
            existing.totalQty += qtyNeeded;
            existing.customCostSum += lineCost;
            if (!existing.fromRecipes.includes(recipe.name)) {
              existing.fromRecipes.push(recipe.name);
            }
            existing.unlinkedRefs.push({ recipeId: recipe.id, ingredientId: ing.id });
          } else {
            customNeeds.set(key, {
              name: rawName.charAt(0).toUpperCase() + rawName.slice(1),
              totalQty: qtyNeeded,
              unit: normIngUnit,
              customCostSum: lineCost,
              fromRecipes: [recipe.name],
              unlinkedRefs: [{ recipeId: recipe.id, ingredientId: ing.id }]
            });
          }
        }
      }
    }

    const toOrderItems: ShoppingItem[] = [];
    const availableItems: ShoppingItem[] = [];

    for (const [productId, { needed, fromRecipes, isApproximate }] of productNeeds.entries()) {
      const product = dbService.getProduct(productId);
      if (!product) continue;

      const toOrder = Math.max(0, needed - product.stock);
      const item: ShoppingItem = {
        key: productId,
        productId,
        productName: product.name,
        productUnit: normalizeUnit(product.unit) || product.unit,
        needed: Math.round(needed * 1000) / 1000,
        inStock: product.stock,
        toOrder: Math.round(toOrder * 1000) / 1000,
        estimatedCost: toOrder * product.avgPurchasePrice,
        avgPurchasePrice: product.avgPurchasePrice,
        fromRecipes,
        isApproximate,
        mainStoreId: product.mainStoreId || '',
      };

      if (toOrder > 0) {
        toOrderItems.push(item);
      } else {
        availableItems.push(item);
      }
    }

    for (const [key, val] of customNeeds.entries()) {
      const roundedQty = Math.round(val.totalQty * 1000) / 1000;
      if (roundedQty > 0) {
        toOrderItems.push({
          key,
          productName: val.name,
          productUnit: val.unit,
          needed: roundedQty,
          inStock: 0,
          toOrder: roundedQty,
          estimatedCost: val.customCostSum,
          avgPurchasePrice: val.totalQty > 0 ? val.customCostSum / val.totalQty : 0,
          fromRecipes: val.fromRecipes,
          isUnlinked: true,
          unlinkedRefs: val.unlinkedRefs,
          mainStoreId: '',
        });
      }
    }

    toOrderItems.sort((a, b) => b.estimatedCost - a.estimatedCost);

    const totalEstimatedCost = toOrderItems.reduce((sum, item) => sum + item.estimatedCost, 0);
    const hasApproximateCost = toOrderItems.some(i => i.isApproximate);

    return { toOrderItems, availableItems, incompatibleItems, totalEstimatedCost, hasApproximateCost };
  }, [selections, refreshTick]);

  const stores = useMemo(() => {
    void refreshTick;
    return dbService.getStores();
  }, [refreshTick]);
  const storeMap = useMemo(() => new Map<string, string>(stores.map(s => [s.id, s.name])), [stores]);

  const storeGroups = useMemo(() => {
    return groupShoppingItemsByStore(toOrderItems, storeMap);
  }, [toOrderItems, storeMap]);

  // Cocher / Décocher un article (mémorisé tant que le drawer est ouvert)
  const toggleChecked = (key: string) => {
    setCheckedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Articles cochés et liés à un produit en stock
  const checkedLinkedItems = useMemo(() => {
    return toOrderItems.filter(i => checkedKeys.has(i.key) && i.productId && !i.isUnlinked);
  }, [toOrderItems, checkedKeys]);

  // Ouvrir l'écran de validation des achats
  const handleStartPurchaseValidation = () => {
    if (checkedLinkedItems.length === 0) return;

    const rows: PurchaseValidationRow[] = checkedLinkedItems.map(item => {
      const product = item.productId ? dbService.getProduct(item.productId) : undefined;
      const storeId = product?.mainStoreId || stores[0]?.id || '';
      return {
        itemKey: item.key,
        productId: item.productId!,
        productName: item.productName,
        productUnit: item.productUnit,
        storeId,
        qty: item.toOrder,
        unit: item.productUnit,
        pricePaid: Number(item.estimatedCost.toFixed(2)),
      };
    });

    setPurchaseRows(rows);
    setPurchaseError(null);
    setIsPurchasing(true);
  };

  // Confirmer et enregistrer les achats avec dbService.addPurchase
  const handleConfirmPurchases = async () => {
    if (purchaseRows.length === 0) return;

    for (const row of purchaseRows) {
      if (!row.qty || row.qty <= 0) {
        setPurchaseError(`Quantité invalide pour « ${cleanProductName(row.productName)} ». Elle doit être supérieure à 0.`);
        return;
      }
      if (row.pricePaid === undefined || row.pricePaid < 0 || isNaN(row.pricePaid)) {
        setPurchaseError(`Prix payé invalide pour « ${cleanProductName(row.productName)} ».`);
        return;
      }
    }

    setIsSubmittingPurchases(true);
    setPurchaseError(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const recordedKeys = new Set<string>();

      for (const row of purchaseRows) {
        const newPurchase: Purchase = {
          id: generateUUID(),
          date: today,
          productId: row.productId,
          qty: row.qty,
          unit: row.unit,
          pricePaid: row.pricePaid,
          unitPrice: row.qty > 0 ? Number((row.pricePaid / row.qty).toFixed(4)) : 0,
          storeId: row.storeId || stores[0]?.id || '',
          notes: 'Enregistré depuis la liste de courses',
        };
        await dbService.addPurchase(newPurchase);
        recordedKeys.add(row.itemKey);
      }

      // Décocher les articles enregistrés
      setCheckedKeys(prev => {
        const next = new Set(prev);
        recordedKeys.forEach(k => next.delete(k));
        return next;
      });

      setPurchaseSuccessMessage(`${purchaseRows.length} achat(s) enregistré(s) avec succès ! Les stocks et prix moyens ont été mis à jour.`);
      setTimeout(() => {
        setPurchaseSuccessMessage(null);
      }, 5000);

      setRefreshTick(t => t + 1);
      onDataChanged?.();
      setIsPurchasing(false);
    } catch (err: unknown) {
      console.error("Erreur lors de l'enregistrement des achats:", err);
      setPurchaseError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement des achats.");
    } finally {
      setIsSubmittingPurchases(false);
    }
  };

  // --- Ouvrir le modal de confirmation d'ajout rapide ---
  const handleOpenAddModal = (item: ShoppingItem) => {
    const cleaned = cleanProductName(item.productName);
    const stockUnit = getLogicalStockUnit(item.productUnit);
    setQuickAddModal({
      isOpen: true,
      name: cleaned,
      unit: stockUnit,
      item
    });
  };

  // --- Sélectionner ou relier un produit existant depuis les suggestions d'ajout rapide ---
  const handleSelectExistingProductFromQuick = async (existingProd: Product) => {
    if (!quickAddModal) return;
    const item = quickAddModal.item;
    if (!item.unlinkedRefs || item.unlinkedRefs.length === 0) return;

    if (!existingProd.isActive) {
      await dbService.saveProduct({ ...existingProd, isActive: true });
    }

    try {
      setQuickAddError(null);

      // Regrouper les références par recette
      const refsByRecipe = new Map<string, Set<string>>();
      for (const ref of item.unlinkedRefs) {
        if (!refsByRecipe.has(ref.recipeId)) {
          refsByRecipe.set(ref.recipeId, new Set());
        }
        refsByRecipe.get(ref.recipeId)!.add(ref.ingredientId);
      }

      for (const [recipeId, ingIds] of refsByRecipe.entries()) {
        const recipe = dbService.getRecipe(recipeId);
        if (!recipe) continue;
        const ings = dbService.getRecipeIngredients(recipeId).map(({ id, recipeId: _rId, ...rest }) => {
          void _rId;
          if (ingIds.has(id)) {
            return {
              ...rest,
              productId: existingProd.id,
              customName: undefined,
              customCostPerUnit: undefined
            };
          }
          return rest;
        });
        const packs = dbService.getRecipePackagings(recipeId).map(({ id: _id, recipeId: _rId, ...rest }) => {
          void _id;
          void _rId;
          return rest;
        });
        await dbService.saveRecipe(recipe, ings, packs);
      }

      setRefreshTick(t => t + 1);
      onDataChanged?.();
      setQuickAddModal(null);
    } catch (err: unknown) {
      console.error('Erreur lors de la liaison du produit existant:', err);
      setQuickAddError(err instanceof Error ? err.message : "Échec de la liaison du produit à vos stocks.");
    }
  };

  // --- Confirmer la création du produit et relier l'ingrédient ---
  const handleConfirmQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddModal) return;
    const item = quickAddModal.item;
    if (!item.unlinkedRefs || item.unlinkedRefs.length === 0) return;
    const finalName = cleanProductName(quickAddModal.name).trim();
    if (!finalName) {
      alert("Le nom du produit ne peut pas être vide.");
      return;
    }

    // Détection de doublon exact
    const allProducts = dbService.getProducts();
    const duplicate = findExactDuplicateProduct(finalName, allProducts);
    if (duplicate) {
      const confirmMsg =
        `Ce produit existe déjà ("${duplicate.name}"${!duplicate.isActive ? ' — désactivé' : ''}).\n\n` +
        `Voulez-vous vraiment enregistrer ce doublon ?`;
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    const finalUnit = quickAddModal.unit || 'kg';
    const stores = dbService.getStores();

    const newProduct: Product = {
      id: generateUUID(),
      barcode: '',
      name: finalName,
      category: settings.categories[0] || 'Épicerie',
      unit: finalUnit,
      brand: '',
      format: 'Unité',
      stock: 0,
      minStockAlert: settings.defaultMinStockAlert,
      avgPurchasePrice: Number((item.avgPurchasePrice || 0).toFixed(4)),
      mainStoreId: stores[0]?.id || '',
      notes: '',
      isActive: true
    };

    try {
      setQuickAddError(null);
      await dbService.saveProduct(newProduct);

      // Regrouper les références par recette
      const refsByRecipe = new Map<string, Set<string>>();
      for (const ref of item.unlinkedRefs) {
        if (!refsByRecipe.has(ref.recipeId)) {
          refsByRecipe.set(ref.recipeId, new Set());
        }
        refsByRecipe.get(ref.recipeId)!.add(ref.ingredientId);
      }

      for (const [recipeId, ingIds] of refsByRecipe.entries()) {
        const recipe = dbService.getRecipe(recipeId);
        if (!recipe) continue;
        const ings = dbService.getRecipeIngredients(recipeId).map(({ id, recipeId: _rId, ...rest }) => {
          void _rId;
          if (ingIds.has(id)) {
            return {
              ...rest,
              productId: newProduct.id,
              customName: undefined,
              customCostPerUnit: undefined
            };
          }
          return rest;
        });
        const packs = dbService.getRecipePackagings(recipeId).map(({ id: _id, recipeId: _rId, ...rest }) => {
          void _id;
          void _rId;
          return rest;
        });
        await dbService.saveRecipe(recipe, ings, packs);
      }

      setRefreshTick(t => t + 1);
      onDataChanged?.();
      setQuickAddModal(null);
    } catch (err: unknown) {
      console.error('Erreur lors de la création rapide du produit:', err);
      setQuickAddError(err instanceof Error ? err.message : "Échec de l'ajout du produit à vos stocks.");
    }
  };

  // --- Copier la liste en texte ---
  const handleCopyText = () => {
    const text = generateShoppingListText({
      date: new Date().toLocaleDateString('fr-FR'),
      selections: selections.map(s => ({ recipeName: s.recipe.name, portions: s.portions })),
      toOrderItems,
      totalEstimatedCost,
      currency: settings.currency,
      groupBy,
      storeGroups,
      checkedKeys,
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    });
  };

  // --- Exporter en CSV (compatible Excel) ---
  const handleExportCsv = () => {
    const csvContent = generateShoppingListCsv({
      selections: selections.map(s => ({ recipeName: s.recipe.name, portions: s.portions })),
      toOrderItems,
      availableItems: availableItems.map(a => ({
        productName: a.productName,
        needed: a.needed,
        inStock: a.inStock,
        productUnit: a.productUnit,
      })),
      groupBy,
      storeGroups,
      checkedKeys,
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MarmiCout_ListeCourses_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- Cuisiner : créer les productions et déduire les stocks ---
  const handleCook = async () => {
    const today = new Date().toISOString().split('T')[0];
    const results: { recipeName: string; success: boolean; error?: string }[] = [];

    for (const { recipe, portions } of selections) {
      const costInfo = dbService.calculateRecipeCost(recipe.id);
      const factor = portions / (recipe.portions || 1);
      const calculatedCost = costInfo.totalCost * factor;

      const prod: Production = {
        id: 'PR_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        date: today,
        recipeId: recipe.id,
        portionsProduced: portions,
        calculatedCost: Number(calculatedCost.toFixed(2))
      };

      try {
        const result = await dbService.addProduction(prod);
        results.push({
          recipeName: recipe.name,
          success: result.success,
          error: result.error
        });
      } catch (err: unknown) {
        results.push({
          recipeName: recipe.name,
          success: false,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }

    setCookResults(results);
    setCookingState('done');

    // Si au moins une production a réussi → recharger + vider les sélections
    if (results.some(r => r.success) && onCookDone) {
      onCookDone();
    }
  };

  // --- Rendu d'une carte d'article de course ---
  const renderItemCard = (item: ShoppingItem, showStoreBadge = false) => {
    const isChecked = checkedKeys.has(item.key);
    const rawStoreId = item.mainStoreId || '';
    const storeName = rawStoreId && storeMap.has(rawStoreId)
      ? storeMap.get(rawStoreId)
      : 'Sans fournisseur';

    return (
      <div
        key={item.key}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 14px',
          backgroundColor: isChecked ? 'rgba(74, 155, 120, 0.08)' : 'var(--color-danger-light)',
          borderRadius: 'var(--radius-md)',
          border: isChecked ? '1px solid rgba(74, 155, 120, 0.35)' : '1px solid rgba(255, 75, 75, 0.15)',
          transition: 'all 0.15s ease'
        }}
      >
        {/* Case à cocher Acheté */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            flexShrink: 0
          }}
          title={isChecked ? 'Article marqué comme acheté' : 'Cocher comme acheté'}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => toggleChecked(item.key)}
            style={{
              width: '18px',
              height: '18px',
              cursor: 'pointer',
              accentColor: 'var(--color-secondary)'
            }}
          />
        </label>

        {/* Pastille icône */}
        <div style={{
          width: '32px', height: '32px',
          borderRadius: '50%',
          backgroundColor: isChecked ? 'var(--color-secondary)' : 'var(--color-danger)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          color: '#fff'
        }}>
          {isChecked ? <Check size={16} /> : <AlertTriangle size={16} />}
        </div>

        {/* Détails produit */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
            <span style={{
              fontWeight: '700',
              fontSize: '14px',
              color: 'var(--color-dark)',
              textDecoration: isChecked ? 'line-through' : 'none',
              opacity: isChecked ? 0.8 : 1
            }}>
              {cleanProductName(item.productName)}
            </span>

            {isChecked && (
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: 'var(--color-secondary)',
                color: '#fff'
              }}>
                Acheté
              </span>
            )}

            {showStoreBadge && (
              <span style={{
                fontSize: '10px',
                fontWeight: '600',
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--color-primary)'
              }}>
                🏪 {storeName}
              </span>
            )}

            {item.isUnlinked && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  height: '22px',
                  padding: '0 8px',
                  fontSize: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
                onClick={() => handleOpenAddModal(item)}
              >
                <Plus size={11} />
                Ajouter à mes produits
              </button>
            )}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-dark-light)' }}>
            Besoin : {item.isApproximate ? '≈ ' : ''}{formatStock(item.needed)} {item.productUnit} • {item.isUnlinked ? 'Non suivi en stock' : `Stock : ${formatStock(item.inStock)} ${item.productUnit}`} • {item.avgPurchasePrice.toFixed(2)} {settings.currency}/{item.productUnit}
          </div>
          {item.fromRecipes.length > 0 && (
            <div style={{ fontSize: '10px', color: 'var(--color-dark-light)', marginTop: '2px' }}>
              Pour : {item.fromRecipes.join(', ')}
            </div>
          )}
        </div>

        {/* Quantité & coût */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontWeight: '700',
            fontSize: '15px',
            color: isChecked ? 'var(--color-secondary)' : 'var(--color-danger)'
          }}>
            {item.isApproximate ? '≈ ' : ''}{formatStock(item.toOrder)} {item.productUnit}
          </div>
          {item.estimatedCost > 0 && (
            <div style={{ fontSize: '11px', color: 'var(--color-dark-light)' }}>
              {item.isApproximate ? '≈ ' : '~'}{item.estimatedCost.toFixed(2)} {settings.currency}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          zIndex: 900,
          backdropFilter: 'blur(2px)'
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: 'min(540px, 100vw)',
        backgroundColor: 'var(--color-white)',
        zIndex: 901,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.15)',
        animation: 'slideIn 0.25s ease'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'var(--color-primary-light)'
        }}>
          <ShoppingCart size={24} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-dark)', margin: 0 }}>
              {isPurchasing
                ? 'Enregistrer mes achats'
                : cookingState === 'confirming'
                ? 'Confirmer la production'
                : cookingState === 'done'
                ? 'Production terminée'
                : 'Liste de courses'}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-dark-light)', margin: 0, marginTop: '2px' }}>
              {isPurchasing
                ? `${purchaseRows.length} article(s) à confirmer`
                : `${selections.length} recette(s) — ${selections.reduce((s, x) => s + x.portions, 0)} portion(s) total`}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-icon-only"
            onClick={() => {
              if (isPurchasing) {
                setIsPurchasing(false);
                setPurchaseError(null);
              } else {
                onClose();
              }
            }}
            style={{ height: '36px', width: '36px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Récapitulatif recettes avec portions éditables */}
        {!isPurchasing && cookingState === 'idle' && (
          <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-light)',
          fontSize: '12px',
          color: 'var(--color-dark-light)'
        }}>
          <strong style={{ display: 'block', marginBottom: '6px', color: 'var(--color-dark)' }}>Recettes — ajustez les portions ici :</strong>
          {selections.map(({ recipe, portions }) => (
            <div key={recipe.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', gap: '8px' }}>
              <span style={{ flex: 1, fontWeight: '600', color: 'var(--color-dark)' }}>• {recipe.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <input
                  type="number"
                  min="1"
                  value={portions}
                  onChange={e => onUpdatePortions?.(recipe.id, Math.max(1, parseDecimalInput(e.target.value)))}
                  style={{
                    width: '68px',
                    height: '30px',
                    border: '2px solid var(--color-primary)',
                    borderRadius: '6px',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: 'var(--color-primary)',
                    padding: '0 4px',
                    backgroundColor: '#fff'
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--color-dark-light)' }}>port.</span>
              </div>
            </div>
          ))}
          <p style={{ fontSize: '10px', color: 'var(--color-dark-light)', marginTop: '6px', fontStyle: 'italic' }}>
            ↑ Changez le nombre de portions — la liste se recalcule instantanément.
          </p>
        </div>
      )}

        {/* ── ÉTAT NORMAL / ACHATS : liste de courses ou validation ── */}
        {cookingState === 'idle' && (
          isPurchasing ? (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              <div style={{
                marginBottom: '16px',
                padding: '14px 16px',
                backgroundColor: 'var(--color-primary-light)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(99, 102, 241, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <ShoppingBag size={18} style={{ color: 'var(--color-primary)' }} />
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-primary)', margin: 0 }}>
                    Validation de vos achats
                  </h3>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--color-dark)', margin: 0, lineHeight: 1.4 }}>
                  Confirmez ou corrigez la quantité, l'unité, le magasin et le prix payé de chaque article.
                  <strong> Rien ne sera enregistré sans votre validation ci-dessous.</strong>
                </p>
              </div>

              {purchaseError && (
                <div style={{
                  marginBottom: '16px',
                  padding: '10px 14px',
                  backgroundColor: 'var(--color-danger-light)',
                  border: '1px solid rgba(255, 75, 75, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  color: 'var(--color-danger)'
                }}>
                  ⚠️ {purchaseError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {purchaseRows.map((row, index) => {
                  const calculatedUnit = row.qty > 0 ? (row.pricePaid / row.qty) : 0;
                  return (
                    <div
                      key={row.itemKey}
                      style={{
                        padding: '14px 16px',
                        backgroundColor: 'var(--color-white)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--color-dark)' }}>
                          {cleanProductName(row.productName)}
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon-only"
                          style={{ width: '28px', height: '28px', color: 'var(--color-danger)' }}
                          onClick={() => {
                            setPurchaseRows(prev => prev.filter((_, i) => i !== index));
                          }}
                          title="Ne pas enregistrer cet article"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--color-dark-light)', marginBottom: '4px' }}>
                            Quantité achetée *
                          </label>
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            value={row.qty}
                            onChange={e => {
                              const val = parseDecimalInput(e.target.value);
                              setPurchaseRows(prev => prev.map((r, i) => i === index ? { ...r, qty: val } : r));
                            }}
                            style={{
                              width: '100%',
                              height: '36px',
                              border: '1px solid var(--color-border)',
                              borderRadius: '6px',
                              padding: '0 8px',
                              fontSize: '13px',
                              fontWeight: '600'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--color-dark-light)', marginBottom: '4px' }}>
                            Unité *
                          </label>
                          <select
                            value={row.unit}
                            onChange={e => {
                              const unitVal = e.target.value;
                              setPurchaseRows(prev => prev.map((r, i) => i === index ? { ...r, unit: unitVal } : r));
                            }}
                            style={{
                              width: '100%',
                              height: '36px',
                              border: '1px solid var(--color-border)',
                              borderRadius: '6px',
                              padding: '0 8px',
                              fontSize: '13px',
                              backgroundColor: '#fff'
                            }}
                          >
                            {settings.units.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--color-dark-light)', marginBottom: '4px' }}>
                            Prix payé ({settings.currency}) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.pricePaid}
                            onChange={e => {
                              const val = parseDecimalInput(e.target.value);
                              setPurchaseRows(prev => prev.map((r, i) => i === index ? { ...r, pricePaid: val } : r));
                            }}
                            style={{
                              width: '100%',
                              height: '36px',
                              border: '1px solid var(--color-border)',
                              borderRadius: '6px',
                              padding: '0 8px',
                              fontSize: '13px',
                              fontWeight: '600'
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ flex: 1, minWidth: '160px' }}>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--color-dark-light)', marginBottom: '4px' }}>
                            Fournisseur / Magasin
                          </label>
                          <select
                            value={row.storeId}
                            onChange={e => {
                              const storeVal = e.target.value;
                              setPurchaseRows(prev => prev.map((r, i) => i === index ? { ...r, storeId: storeVal } : r));
                            }}
                            style={{
                              width: '100%',
                              height: '34px',
                              border: '1px solid var(--color-border)',
                              borderRadius: '6px',
                              padding: '0 8px',
                              fontSize: '12px',
                              backgroundColor: '#fff'
                            }}
                          >
                            <option value="">-- Sans fournisseur --</option>
                            {stores.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--color-dark-light)' }}>
                          Prix unitaire calculé :
                          <strong style={{ color: 'var(--color-primary)', marginLeft: '4px' }}>
                            {calculatedUnit.toFixed(2)} {settings.currency}/{row.unit}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {purchaseRows.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--color-dark-light)' }}>
                  Tous les articles ont été retirés. Cliquez sur « Annuler » ci-dessous pour revenir à la liste.
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {purchaseSuccessMessage && (
                <div style={{
                  marginBottom: '16px',
                  padding: '10px 14px',
                  backgroundColor: 'rgba(74, 155, 120, 0.15)',
                  border: '1px solid rgba(74, 155, 120, 0.4)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  color: 'var(--color-secondary)',
                  fontWeight: '600',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>🎉 {purchaseSuccessMessage}</span>
                  <button
                    type="button"
                    onClick={() => setPurchaseSuccessMessage(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-secondary)', fontWeight: 700, fontSize: '14px' }}
                  >×</button>
                </div>
              )}

              {quickAddError && (
                <div style={{
                  marginBottom: '16px',
                  padding: '10px 14px',
                  backgroundColor: 'var(--color-danger-light)',
                  border: '1px solid rgba(255, 75, 75, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  color: 'var(--color-danger)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>❌ {quickAddError}</span>
                  <button
                    type="button"
                    onClick={() => setQuickAddError(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontWeight: 700, fontSize: '16px', lineHeight: 1 }}
                  >×</button>
                </div>
              )}

              {/* Avertissement unités incompatibles */}
              {incompatibleItems.length > 0 && (
                <div style={{
                  marginBottom: '16px',
                  padding: '12px 14px',
                  backgroundColor: 'var(--color-danger-light)',
                  border: '1px solid rgba(255, 75, 75, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  color: 'var(--color-danger)',
                  fontWeight: '600'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <AlertTriangle size={16} />
                    <span>Unités incompatibles détectées (production bloquée) :</span>
                  </div>
                  {incompatibleItems.map(inc => (
                    <div key={inc.key} style={{ fontWeight: '500', marginTop: '2px' }}>
                      • <strong>{inc.productName}</strong> ({inc.recipeName}) : Unités incompatibles : recette en {inc.recipeUnit}, stock en {inc.stockUnit}
                    </div>
                  ))}
                </div>
              )}

              {/* Bannière d'action si articles cochés prêts à être enregistrés */}
              {checkedLinkedItems.length > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  backgroundColor: 'rgba(74, 155, 120, 0.12)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(74, 155, 120, 0.3)',
                  marginBottom: '16px',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-secondary)' }}>
                    ✓ {checkedLinkedItems.length} article{checkedLinkedItems.length > 1 ? 's' : ''} coché{checkedLinkedItems.length > 1 ? 's' : ''} prêt{checkedLinkedItems.length > 1 ? 's' : ''} à enregistrer
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      height: '32px',
                      fontSize: '12px',
                      fontWeight: '700',
                      padding: '0 12px',
                      backgroundColor: 'var(--color-secondary)',
                      color: '#fff',
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onClick={handleStartPurchaseValidation}
                  >
                    <ShoppingBag size={14} />
                    Enregistrer mes achats ({checkedLinkedItems.length})
                  </button>
                </div>
              )}

              {/* Total estimé */}
              {toOrderItems.length > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  backgroundColor: 'var(--color-warning-light)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(242, 185, 34, 0.3)',
                  marginBottom: '20px'
                }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-dark)' }}>
                    💰 Coût estimé des achats
                  </span>
                  <strong style={{ fontSize: '18px', color: 'var(--color-primary)' }}>
                    {hasApproximateCost ? '≈ ' : '~'}{totalEstimatedCost.toFixed(2)} {settings.currency}
                  </strong>
                </div>
              )}

              {/* Section À ACHETER */}
              {toOrderItems.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <h3 style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: 'var(--color-danger)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      margin: 0,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      <ShoppingCart size={14} />
                      À acheter ({toOrderItems.length})
                    </h3>

                    {/* Sélecteur de regroupement : Par fournisseur vs Tous */}
                    <div style={{
                      display: 'inline-flex',
                      backgroundColor: 'var(--color-light)',
                      padding: '2px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)'
                    }}>
                      <button
                        type="button"
                        onClick={() => setGroupBy('store')}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: '600',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: groupBy === 'store' ? '#fff' : 'transparent',
                          color: groupBy === 'store' ? 'var(--color-primary)' : 'var(--color-dark-light)',
                          boxShadow: groupBy === 'store' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <StoreIcon size={12} />
                        Par fournisseur
                      </button>
                      <button
                        type="button"
                        onClick={() => setGroupBy('all')}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: '600',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: groupBy === 'all' ? '#fff' : 'transparent',
                          color: groupBy === 'all' ? 'var(--color-primary)' : 'var(--color-dark-light)',
                          boxShadow: groupBy === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        Tous ({toOrderItems.length})
                      </button>
                    </div>
                  </div>

                  {/* Affichage groupé par fournisseur */}
                  {groupBy === 'store' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {storeGroups.map(group => (
                        <div
                          key={group.storeId}
                          style={{
                            backgroundColor: 'var(--color-light)',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px',
                            border: '1px solid var(--color-border)'
                          }}
                        >
                          {/* En-tête fournisseur avec coût estimé par magasin */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px',
                            paddingBottom: '8px',
                            borderBottom: '1px solid rgba(0,0,0,0.06)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '28px', height: '28px',
                                borderRadius: '6px',
                                backgroundColor: 'var(--color-primary-light)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--color-primary)'
                              }}>
                                <StoreIcon size={16} />
                              </div>
                              <div>
                                <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--color-dark)' }}>
                                  {group.storeName}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--color-dark-light)', marginLeft: '6px' }}>
                                  ({group.items.length} article{group.items.length > 1 ? 's' : ''})
                                </span>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '10px', color: 'var(--color-dark-light)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                Estimé magasin
                              </div>
                              <strong style={{ fontSize: '13px', color: 'var(--color-primary)' }}>
                                ~{group.estimatedCost.toFixed(2)} {settings.currency}
                              </strong>
                            </div>
                          </div>

                          {/* Liste des articles du magasin */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {group.items.map(item => renderItemCard(item, false))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Affichage liste globale */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {toOrderItems.map(item => renderItemCard(item, true))}
                    </div>
                  )}
                </div>
              )}

            {/* Section En stock */}
            {availableItems.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'var(--color-secondary)',
                    padding: '0 0 10px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  onClick={() => setShowAvailable(v => !v)}
                >
                  {showAvailable ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Check size={14} />
                  Déjà en stock ({availableItems.length})
                </button>

                {showAvailable && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {availableItems.map(item => (
                      <div
                        key={item.key}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          backgroundColor: 'rgba(74, 155, 120, 0.06)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid rgba(74, 155, 120, 0.15)'
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--color-dark)' }}>
                            ✅ {cleanProductName(item.productName)}
                          </span>
                          <div style={{ fontSize: '10px', color: 'var(--color-dark-light)', marginTop: '2px' }}>
                            Besoin : {formatStock(item.needed)} {item.productUnit} • Stock : {formatStock(item.inStock)} {item.productUnit}
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--color-secondary)', fontWeight: '600' }}>
                          OK
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Si rien à acheter */}
            {toOrderItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Check size={48} style={{ margin: '0 auto 16px', color: 'var(--color-secondary)', opacity: 0.7 }} />
                <p style={{ fontWeight: '700', fontSize: '16px', color: 'var(--color-secondary)' }}>
                  Vous avez tout en stock ! 🎉
                </p>
                <p style={{ fontSize: '13px', color: 'var(--color-dark-light)', marginTop: '8px' }}>
                  Tous les ingrédients sont disponibles en quantité suffisante.
                </p>
              </div>
            )}
          </div>
        ))}

        {/* ── ÉTAT CONFIRMATION ── */}
        {cookingState === 'confirming' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <ChefHat size={48} style={{ color: 'var(--color-primary)', margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: '13px', color: 'var(--color-dark-light)', maxWidth: '320px', margin: '0 auto' }}>
                En confirmant, les ingrédients de chaque recette seront
                <strong> immédiatement déduits</strong> de vos stocks et les productions seront enregistrées.
              </p>
            </div>

            {/* Récap des productions à lancer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {selections.map(({ recipe, portions }) => {
                const costInfo = dbService.calculateRecipeCost(recipe.id);
                const factor = portions / (recipe.portions || 1);
                const cost = costInfo.totalCost * factor;
                return (
                  <div key={recipe.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 16px',
                    backgroundColor: 'var(--color-primary-light)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(99, 102, 241, 0.2)'
                  }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px' }}>{recipe.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-dark-light)', marginTop: '2px' }}>
                        Coût estimé du lot : {cost.toFixed(2)} {settings.currency}
                      </div>
                    </div>
                    <span style={{ color: 'var(--color-primary)', fontWeight: '700', fontSize: '16px' }}>
                      {portions} port.
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Avertissement si manque de stock */}
            {toOrderItems.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '10px',
                padding: '12px 14px',
                backgroundColor: 'var(--color-warning-light)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(242, 185, 34, 0.3)',
                fontSize: '12px',
                color: 'var(--color-dark)'
              }}>
                <AlertTriangle size={18} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                <span>
                  <strong>Attention :</strong> Certains ingrédients sont en stock insuffisant. Les recettes concernées seront bloquées lors de la production.
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── ÉTAT RÉSULTATS ── */}
        {cookingState === 'done' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <PackageCheck size={48} style={{ color: 'var(--color-secondary)', margin: '0 auto 12px', display: 'block' }} />
              <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '4px' }}>Productions terminées</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-dark-light)' }}>
                {cookResults.filter(r => r.success).length} réussie(s) · {cookResults.filter(r => !r.success).length} échouée(s)
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {cookResults.map((r, i) => (
                <div key={i} style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: r.success ? 'var(--color-secondary-light)' : 'var(--color-danger-light)',
                  border: `1px solid ${r.success ? 'rgba(50,180,100,0.3)' : 'rgba(255,75,75,0.2)'}`
                }}>
                  <span style={{ fontSize: '22px', lineHeight: 1 }}>{r.success ? '✅' : '❌'}</span>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>{r.recipeName}</div>
                    {r.success && (
                      <div style={{ fontSize: '12px', color: 'var(--color-secondary)' }}>
                        Stock déduit et production enregistrée avec succès.
                      </div>
                    )}
                    {r.error && (
                      <div style={{ fontSize: '12px', color: 'var(--color-danger)' }}>
                        {r.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FOOTER DYNAMIQUE ── */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {cookingState === 'idle' && isPurchasing && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: '46px', padding: '0 20px' }}
                onClick={() => {
                  setIsPurchasing(false);
                  setPurchaseError(null);
                }}
                disabled={isSubmittingPurchases}
              >
                ← Annuler
              </button>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'right', fontSize: '12px' }}>
                  <span style={{ color: 'var(--color-dark-light)' }}>Total payé : </span>
                  <strong style={{ fontSize: '15px', color: 'var(--color-primary)' }}>
                    {purchaseRows.reduce((sum, r) => sum + (r.pricePaid || 0), 0).toFixed(2)} {settings.currency}
                  </strong>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ height: '46px', padding: '0 20px', minWidth: '160px' }}
                  disabled={purchaseRows.length === 0 || isSubmittingPurchases}
                  onClick={handleConfirmPurchases}
                >
                  <PackageCheck size={18} />
                  {isSubmittingPurchases ? 'Enregistrement...' : `Confirmer (${purchaseRows.length})`}
                </button>
              </div>
            </>
          )}

          {cookingState === 'idle' && !isPurchasing && (
            <>
              {/* Bouton principal : Cuisiner */}
              <button
                type="button"
                className="btn btn-primary"
                disabled={incompatibleItems.length > 0}
                style={{
                  flex: 1,
                  height: '46px',
                  minWidth: '160px',
                  opacity: incompatibleItems.length > 0 ? 0.55 : 1,
                  cursor: incompatibleItems.length > 0 ? 'not-allowed' : 'pointer',
                }}
                onClick={() => setCookingState('confirming')}
                title={incompatibleItems.length > 0 ? 'Unités incompatibles détectées' : undefined}
              >
                <ChefHat size={18} />
                {incompatibleItems.length > 0 ? 'Cuisiner bloqué (unités incompatibles)' : 'Cuisiner & déduire du stock'}
              </button>

              {/* Bouton Enregistrer mes achats */}
              <button
                type="button"
                className="btn btn-secondary"
                disabled={checkedLinkedItems.length === 0}
                style={{
                  height: '46px',
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: checkedLinkedItems.length === 0 ? 0.55 : 1,
                  cursor: checkedLinkedItems.length === 0 ? 'not-allowed' : 'pointer'
                }}
                onClick={handleStartPurchaseValidation}
                title={checkedLinkedItems.length === 0 ? "Cochez des articles pour enregistrer vos achats" : "Enregistrer les achats cochés"}
              >
                <ShoppingBag size={18} />
                <span>Enregistrer mes achats {checkedLinkedItems.length > 0 ? `(${checkedLinkedItems.length})` : ''}</span>
              </button>

              {/* Export Excel (CSV) */}
              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: '46px', padding: '0 14px' }}
                onClick={handleExportCsv}
                title="Exporter vers Excel (.csv)"
              >
                <FileSpreadsheet size={18} />
              </button>

              {/* Copier texte */}
              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: '46px', padding: '0 14px' }}
                onClick={handleCopyText}
                title="Copier la liste en texte"
              >
                {copiedText ? <CheckCheck size={18} /> : <Copy size={18} />}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: '46px', padding: '0 20px' }}
                onClick={onClose}
              >
                Fermer
              </button>
            </>
          )}

          {cookingState === 'confirming' && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: '46px', padding: '0 20px' }}
                onClick={() => setCookingState('idle')}
              >
                ← Retour
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, height: '46px' }}
                onClick={handleCook}
              >
                <PackageCheck size={18} />
                Confirmer &amp; déduire du stock
              </button>
            </>
          )}

          {cookingState === 'done' && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1, height: '46px' }}
              onClick={onClose}
            >
              Fermer
            </button>
          )}
        </div>
      </div>

      {/* Modal de confirmation d'ajout rapide à mes produits */}
      {quickAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '16px'
        }}>
          <div className="card" style={{ maxWidth: '420px', width: '100%', backgroundColor: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>
              Ajouter à mes produits
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-dark-light)', marginBottom: '16px' }}>
              Vérifiez le nom et l'unité de stock de ce produit avant sa création :
            </p>

            <form onSubmit={handleConfirmQuickAdd}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>Nom du produit *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={quickAddModal.name}
                  onChange={(e) => setQuickAddModal({ ...quickAddModal, name: e.target.value })}
                />
                <ProductDuplicateSuggestions
                  inputName={quickAddModal.name}
                  allProducts={dbService.getProducts()}
                  showSuggestions={true}
                  actionLabel="Relier"
                  onSelectProduct={handleSelectExistingProductFromQuick}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>Unité de gestion du stock *</label>
                <select
                  className="form-input"
                  value={quickAddModal.unit}
                  onChange={(e) => setQuickAddModal({ ...quickAddModal, unit: e.target.value })}
                >
                  {settings.units.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setQuickAddModal(null)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Créer le produit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
