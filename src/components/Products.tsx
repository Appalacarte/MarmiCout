import React, { useState, useEffect } from 'react';
import { parseDecimalInput } from '../utils';
import { 
  Plus,
  Search,
  Barcode,
  Edit,
  Archive,
  ArrowRightLeft,
  FileText,
  Trash2,
  SlidersHorizontal,
  Calendar,
  TrendingUp,
  Scale,
  ShieldAlert,
  Sparkles,
  Check,
  ArrowLeft
} from 'lucide-react';
import { dbService } from '../services/db';
import { generateUUID } from '../services/cloudDbService';
import { Product, Store, StockMovement, Purchase } from '../types';
import { Drawer } from './Drawer';
import { BarcodeScanner } from './BarcodeScanner';
import { LookupResult } from '../services/barcodeLookupService';
import { InvoiceScanner } from './InvoiceScanner';
import {
  cleanProductName,
  formatStock,
  areUnitsCompatible,
  convertProductUnitValues,
  convertUnits,
} from '../utils/units';
import { getProductNextExpiry, formatExpiryDate, getDaysUntilExpiry } from '../utils/expiry';
import { ProductDuplicateSuggestions } from './ProductDuplicateSuggestions';
import { findExactDuplicateProduct } from '../utils/productDuplicate';
import { OFFICIAL_ALLERGENS, suggestAllergensFromName, ALLERGEN_DISCLAIMER } from '../utils/allergens';

interface ProductsProps {
  initialTriggerAdd?: boolean;
  initialSelectedProductId?: string;
  initialEditProductId?: string;
  initialFocusEquivalence?: boolean;
  initialFocusAllergens?: boolean;
  initialPrefillName?: string;
  initialReturnToRecipeId?: string;
  initialReturnToRecipeName?: string;
  onClearExtraData?: () => void;
  onNavigate?: (tab: string, extraData?: Record<string, unknown>) => void;
}

const PROPOSED_DENSITIES = [
  { label: 'eau', value: '1' },
  { label: 'huile', value: '0.92' },
  { label: 'lait', value: '1.03' },
  { label: 'farine', value: '0.55' },
  { label: 'sucre', value: '0.85' },
  { label: 'miel', value: '1.4' },
] as const;

const STOCK_CORRECTION_REASONS = [
  'Inventaire',
  'Casse / perte',
  'Erreur de saisie',
  'Autre'
] as const;

export const Products: React.FC<ProductsProps> = ({
  initialTriggerAdd,
  initialSelectedProductId,
  initialEditProductId,
  initialFocusEquivalence,
  initialFocusAllergens,
  initialPrefillName,
  initialReturnToRecipeId,
  initialReturnToRecipeName,
  onClearExtraData,
  onNavigate,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const settings = dbService.getSettings();

  // États de recherche et filtrage
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStockFilter, setSelectedStockFilter] = useState('');
  const [selectedAllergensFilter, setSelectedAllergensFilter] = useState('');

  // États du Drawer de Formulaire
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingProductHasPurchases, setEditingProductHasPurchases] = useState(false);
  const [isUnitReset, setIsUnitReset] = useState(false);

  // Valeurs du formulaire
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formFormat, setFormFormat] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formMinStock, setFormMinStock] = useState(settings.defaultMinStockAlert.toString());
  const [formAvgPrice, setFormAvgPrice] = useState('');
  const [formMainStore, setFormMainStore] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formUnitWeight, setFormUnitWeight] = useState('');
  const [formDensity, setFormDensity] = useState('');
  const [formAllergens, setFormAllergens] = useState<string[]>([]);
  const [formNoAllergensVerified, setFormNoAllergensVerified] = useState(false);
  const returnToRecipe = initialReturnToRecipeId ? { id: initialReturnToRecipeId, name: initialReturnToRecipeName } : null;
  const [savedReturnToRecipe, setSavedReturnToRecipe] = useState<{ id: string; name?: string } | null>(null);

  // État du scanneur dans le formulaire
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // État du Drawer de Détail / Historique
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);
  const [stockHistory, setStockHistory] = useState<StockMovement[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<Purchase[]>([]);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [isInvoiceScannerOpen, setIsInvoiceScannerOpen] = useState(false);
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);

  // États pour « Corriger le stock »
  const [stockCorrectionTarget, setStockCorrectionTarget] = useState<Product | null>(null);
  const [correctionRealQty, setCorrectionRealQty] = useState('');
  const [correctionReason, setCorrectionReason] = useState<string>(STOCK_CORRECTION_REASONS[0]);
  const [correctionCustomNote, setCorrectionCustomNote] = useState('');
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  // États pour « Supprimer » ou désactiver dans le formulaire d'édition
  const [deleteDialogState, setDeleteDialogState] = useState<{
    isOpen: boolean;
    canHardDelete: boolean;
    usageReasons: string[];
  }>({ isOpen: false, canHardDelete: true, usageReasons: [] });
  const [isDeletingOrDeactivating, setIsDeletingOrDeactivating] = useState(false);
  // Suppression forcée (corbeille) depuis le message « Suppression impossible »
  const [recipeUsageCount, setRecipeUsageCount] = useState(0);
  const [isForceDeleteConfirmOpen, setIsForceDeleteConfirmOpen] = useState(false);

  // Charger les données au montage
  const loadData = () => {
    const allProds = dbService.getProducts();
    setProducts(allProds);
    setStores(dbService.getStores());
    setSelectedProductDetails(prev => {
      if (!prev) return null;
      const refreshed = allProds.find(p => p.id === prev.id);
      if (refreshed) {
        setStockHistory(dbService.getProductStockMovements(refreshed.id));
        setPurchaseHistory(dbService.getProductPurchaseHistory(refreshed.id));
      }
      return refreshed || null;
    });
  };

  // Ouvrir le formulaire en mode Ajout
  const handleOpenAddForm = () => {
    setEditingProduct(null);
    setEditingProductHasPurchases(false);
    setIsUnitReset(false);
    setSaveError(null);
    setDeleteDialogState({ isOpen: false, canHardDelete: true, usageReasons: [] });
    setFormBarcode('');
    setFormName('');
    setFormCategory(settings.categories[0] || '');
    setFormUnit(settings.units[0] || 'kg');
    setFormBrand('');
    setFormFormat('Unité');
    setFormStock('');
    setFormMinStock(settings.defaultMinStockAlert.toString());
    setFormAvgPrice('');
    setFormMainStore(stores[0]?.id || '');
    setFormNotes('');
    setFormIsActive(true);
    setFormUnitWeight('');
    setFormDensity('');
    setFormAllergens([]);
    setFormNoAllergensVerified(false);
    setIsFormOpen(true);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    if (initialTriggerAdd) {
      handleOpenAddForm();
      if (initialPrefillName) {
        setFormName(initialPrefillName);
      }
      if (initialFocusAllergens) {
        setTimeout(() => {
          const el = document.getElementById('product-allergens-section');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 250);
      }
      onClearExtraData?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTriggerAdd, initialPrefillName, initialFocusAllergens]);

  useEffect(() => {
    const handleDataSynced = () => loadData();
    window.addEventListener('marmicout-data-synced', handleDataSynced);
    return () => window.removeEventListener('marmicout-data-synced', handleDataSynced);
  }, []);

  // Ouvrir le formulaire en mode Édition
  const handleOpenEditForm = (prod: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const hasPurchases = dbService.getProductPurchaseHistory(prod.id).length > 0;
    setEditingProduct(prod);
    setEditingProductHasPurchases(hasPurchases);
    setIsUnitReset(false);
    setSaveError(null);
    setDeleteDialogState({ isOpen: false, canHardDelete: true, usageReasons: [] });
    setFormBarcode(prod.barcode);
    setFormName(prod.name);
    setFormCategory(prod.category);
    setFormUnit(prod.unit);
    setFormBrand(prod.brand);
    setFormFormat(prod.format);
    setFormStock(prod.stock.toString());
    setFormMinStock(prod.minStockAlert.toString());
    setFormAvgPrice(prod.avgPurchasePrice.toString());
    setFormMainStore(prod.mainStoreId);
    setFormNotes(prod.notes);
    setFormIsActive(prod.isActive);
    setFormUnitWeight(prod.unitWeightG != null ? prod.unitWeightG.toString() : '');
    setFormDensity(prod.densityGPerMl != null ? prod.densityGPerMl.toString() : '');
    if (Array.isArray(prod.allergens)) {
      if (prod.allergens.length === 0) {
        setFormAllergens([]);
        setFormNoAllergensVerified(true);
      } else {
        setFormAllergens([...prod.allergens]);
        setFormNoAllergensVerified(false);
      }
    } else {
      setFormAllergens([]);
      setFormNoAllergensVerified(false);
    }
    setIsFormOpen(true);
  };

  // Gestion du changement d'unité en édition (conversion automatique si compatible, confirmation si incompatible)
  const handleUnitChange = (newUnit: string) => {
    const oldUnit = formUnit;
    if (!oldUnit || oldUnit === newUnit) {
      setFormUnit(newUnit);
      return;
    }

    if (editingProduct) {
      const isCompatible = areUnitsCompatible(oldUnit, newUnit);

      if (isCompatible) {
        const curStock = parseDecimalInput(formStock);
        const curMinStock = parseDecimalInput(formMinStock);
        const curAvgPrice = parseDecimalInput(formAvgPrice);

        const conv = convertProductUnitValues(
          oldUnit,
          newUnit,
          curStock,
          curMinStock,
          curAvgPrice
        );

        if (conv) {
          if (conv.stock !== null) {
            setFormStock(conv.stock.toString());
          }
          if (conv.minStockAlert !== null) {
            setFormMinStock(conv.minStockAlert.toString());
          }
          if (conv.avgPurchasePrice !== null) {
            setFormAvgPrice(conv.avgPurchasePrice.toString());
          }
        }
        setFormUnit(newUnit);
      } else {
        const confirmed = window.confirm(
          `L'unité "${newUnit}" n'est pas compatible avec l'unité actuelle "${oldUnit}".\n\n` +
          `Le stock actuel, le seuil d'alerte et le prix moyen ne peuvent pas être convertis automatiquement et devront être ressaisis.\n\n` +
          `Voulez-vous vraiment changer l'unité ?`
        );

        if (!confirmed) {
          return;
        }

        setFormUnit(newUnit);
        setFormStock('');
        setFormMinStock('');
        setFormAvgPrice('');
        setIsUnitReset(true);
      }
    } else {
      setFormUnit(newUnit);
    }
  };

  // Ouvrir le panneau de détails
  const handleOpenDetails = (prod: Product) => {
    setDetailsError(null);
    setSelectedProductDetails(prod);
    setStockHistory(dbService.getProductStockMovements(prod.id));
    setPurchaseHistory(dbService.getProductPurchaseHistory(prod.id));
  };

  useEffect(() => {
    if (initialSelectedProductId) {
      const target = products.find(p => p.id === initialSelectedProductId) || dbService.getProduct(initialSelectedProductId);
      if (target) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        handleOpenDetails(target);
        onClearExtraData?.();
      }
    }
  }, [initialSelectedProductId, onClearExtraData, products]);

  useEffect(() => {
    if (initialEditProductId) {
      const target = products.find(p => p.id === initialEditProductId) || dbService.getProduct(initialEditProductId);
      if (target) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        handleOpenEditForm(target);
        if (initialFocusEquivalence) {
          setTimeout(() => {
            const el = document.getElementById('product-equivalences-section');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              const input = el.querySelector('input');
              if (input) (input as HTMLInputElement).focus();
            }
          }, 250);
        } else if (initialFocusAllergens) {
          setTimeout(() => {
            const el = document.getElementById('product-allergens-section');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 250);
        }
        onClearExtraData?.();
      }
    }
  }, [initialEditProductId, initialFocusEquivalence, initialFocusAllergens, onClearExtraData, products]);

  // Ouvrir la fenêtre « Corriger le stock »
  const handleOpenStockCorrection = (prod: Product) => {
    setStockCorrectionTarget(prod);
    setCorrectionRealQty(prod.stock.toString());
    setCorrectionReason(STOCK_CORRECTION_REASONS[0]);
    setCorrectionCustomNote('');
    setCorrectionError(null);
  };

  // Valider la correction de stock
  const handleConfirmStockCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockCorrectionTarget) return;

    const realQty = parseDecimalInput(correctionRealQty);
    if (isNaN(realQty) || realQty < 0) {
      setCorrectionError('Veuillez saisir une quantité réelle valide (supérieure ou égale à 0).');
      return;
    }

    const oldStock = stockCorrectionTarget.stock;
    const diff = Number((realQty - oldStock).toFixed(4));
    if (diff === 0) {
      setCorrectionError('La quantité saisie est identique au stock actuel.');
      return;
    }

    setIsSubmittingCorrection(true);
    setCorrectionError(null);

    try {
      const updatedProd: Product = {
        ...stockCorrectionTarget,
        stock: realQty
      };

      await dbService.saveProduct(updatedProd);

      const reasonLabel = correctionCustomNote.trim()
        ? `${correctionReason} — ${correctionCustomNote.trim()}`
        : correctionReason;

      await dbService.addStockMovement({
        id: generateUUID(),
        date: new Date().toISOString().split('T')[0],
        productId: updatedProd.id,
        qty: diff,
        type: 'AJUSTEMENT',
        refId: 'MANUAL',
        notes: `Correction de stock (${reasonLabel}) : ${oldStock.toFixed(2)} → ${realQty.toFixed(2)} ${updatedProd.unit}`
      });

      loadData();

      if (editingProduct && editingProduct.id === updatedProd.id) {
        setEditingProduct(updatedProd);
        setFormStock(updatedProd.stock.toString());
      }
      if (selectedProductDetails && selectedProductDetails.id === updatedProd.id) {
        setSelectedProductDetails(updatedProd);
        setStockHistory(dbService.getProductStockMovements(updatedProd.id));
        setPurchaseHistory(dbService.getProductPurchaseHistory(updatedProd.id));
      }

      setStockCorrectionTarget(null);
    } catch (err: unknown) {
      console.error('Erreur correction stock:', err);
      const msg = err instanceof Error ? err.message : 'Erreur lors de la correction du stock.';
      setCorrectionError(msg);
      if (selectedProductDetails) setDetailsError(msg);
      if (isFormOpen) setSaveError(msg);
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  // Préparer la suppression / désactivation du produit en édition
  const handleRequestDeleteProduct = () => {
    if (!editingProduct) return;
    setSaveError(null);

    const usedInRecipes = dbService.getAllRecipeIngredients().filter(ri => ri.productId === editingProduct.id);
    const usedInPurchases = dbService.getProductPurchaseHistory(editingProduct.id);
    const usedInMovements = dbService.getProductStockMovements(editingProduct.id);

    const usageReasons: string[] = [];
    if (usedInRecipes.length > 0) {
      usageReasons.push(`${usedInRecipes.length} ingrédient(s) de recette`);
    }
    if (usedInPurchases.length > 0) {
      usageReasons.push(`${usedInPurchases.length} achat(s) enregistré(s)`);
    }
    if (usedInMovements.length > 0) {
      usageReasons.push(`${usedInMovements.length} mouvement(s) de stock`);
    }

    setRecipeUsageCount(usedInRecipes.length);
    setIsForceDeleteConfirmOpen(false);
    setDeleteDialogState({
      isOpen: true,
      canHardDelete: usageReasons.length === 0,
      usageReasons
    });
  };

  // Exécuter la suppression définitive ou la désactivation (isActive = false)
  const handleConfirmDeleteOrDeactivate = async () => {
    if (!editingProduct) return;
    setIsDeletingOrDeactivating(true);
    setSaveError(null);

    try {
      if (deleteDialogState.canHardDelete) {
        await dbService.deleteProduct(editingProduct.id);
        if (selectedProductDetails?.id === editingProduct.id) {
          setSelectedProductDetails(null);
        }
      } else {
        const deactivatedProduct: Product = {
          ...editingProduct,
          barcode: formBarcode.trim(),
          name: formName.trim() || editingProduct.name,
          category: formCategory || editingProduct.category,
          unit: formUnit || editingProduct.unit,
          brand: formBrand.trim(),
          format: formFormat.trim(),
          minStockAlert: parseDecimalInput(formMinStock),
          avgPurchasePrice: editingProductHasPurchases ? editingProduct.avgPurchasePrice : parseDecimalInput(formAvgPrice),
          mainStoreId: formMainStore,
          notes: formNotes.trim(),
          isActive: false,
          allergens: formNoAllergensVerified ? [] : (formAllergens.length > 0 ? formAllergens : null),
        };
        await dbService.saveProduct(deactivatedProduct);
      }

      setDeleteDialogState({ isOpen: false, canHardDelete: true, usageReasons: [] });
      setIsFormOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error('Erreur suppression / désactivation produit:', err);
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Échec de la suppression ou désactivation du produit.'
      );
    } finally {
      setIsDeletingOrDeactivating(false);
    }
  };

  // Suppression forcée : produit + achats + mouvements de stock (bouton corbeille)
  const handleForceDeleteProduct = async () => {
    if (!editingProduct) return;
    setIsDeletingOrDeactivating(true);
    setSaveError(null);
    try {
      await dbService.deleteProductWithHistory(editingProduct.id);
      if (selectedProductDetails?.id === editingProduct.id) {
        setSelectedProductDetails(null);
      }
      setDeleteDialogState({ isOpen: false, canHardDelete: true, usageReasons: [] });
      setIsFormOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error('Erreur suppression forcée produit:', err);
      setSaveError(err instanceof Error ? err.message : 'Échec de la suppression du produit.');
    } finally {
      setIsDeletingOrDeactivating(false);
    }
  };

  // Enregistrer le produit (Ajout ou Édition)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    // Détection de doublon exact
    const duplicate = findExactDuplicateProduct(
      formName,
      products,
      editingProduct ? editingProduct.id : undefined
    );

    if (duplicate) {
      const confirmMsg =
        `Ce produit existe déjà ("${duplicate.name}"${!duplicate.isActive ? ' — désactivé' : ''}).\n\n` +
        `Voulez-vous vraiment enregistrer ce doublon ?`;
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    setIsSaving(true);
    setSaveError(null);

    const stockNum = parseDecimalInput(formStock);
    const minStockNum = parseDecimalInput(formMinStock);
    const avgPriceNum = parseDecimalInput(formAvgPrice);
    const unitWeightNum = formUnitWeight.trim() ? parseDecimalInput(formUnitWeight) : undefined;
    const densityNum = formDensity.trim() ? parseDecimalInput(formDensity) : undefined;

    const updatedProduct: Product = {
      id: editingProduct ? editingProduct.id : generateUUID(),
      barcode: formBarcode.trim(),
      name: cleanProductName(formName),
      category: formCategory,
      unit: formUnit,
      brand: formBrand.trim(),
      format: formFormat.trim(),
      stock: stockNum,
      minStockAlert: minStockNum,
      avgPurchasePrice: avgPriceNum,
      mainStoreId: formMainStore,
      notes: formNotes.trim(),
      isActive: formIsActive,
      unitWeightG: (unitWeightNum !== undefined && Number.isFinite(unitWeightNum) && unitWeightNum > 0) ? unitWeightNum : undefined,
      densityGPerMl: (densityNum !== undefined && Number.isFinite(densityNum) && densityNum > 0) ? densityNum : undefined,
      allergens: formNoAllergensVerified ? [] : (formAllergens.length > 0 ? formAllergens : null),
    };

    try {
      await dbService.saveProduct(updatedProduct);
      
      // Si c'est un nouveau produit et qu'il y a un stock initial > 0, on enregistre un mouvement de stock
      if (!editingProduct && stockNum > 0) {
        await dbService.addStockMovement({
          id: generateUUID(),
          date: new Date().toISOString().split('T')[0],
          productId: updatedProduct.id,
          qty: stockNum,
          type: 'AJUSTEMENT',
          refId: 'MANUAL',
          notes: 'Stock initial renseigné à la création'
        });
      } else if (editingProduct && editingProduct.unit !== formUnit) {
        await dbService.addStockMovement({
          id: generateUUID(),
          date: new Date().toISOString().split('T')[0],
          productId: updatedProduct.id,
          qty: 0,
          type: 'AJUSTEMENT',
          refId: 'MANUAL',
          notes: `Changement d'unité de ${editingProduct.unit} vers ${formUnit} (stock : ${stockNum} ${formUnit})`
        });
      }
      
      if (returnToRecipe) {
        setSavedReturnToRecipe(returnToRecipe);
      }
      setIsFormOpen(false);
      setSaveError(null);
      loadData();
    } catch (err: unknown) {
      console.error('Erreur sauvegarde produit:', err);
      setSaveError(err instanceof Error ? err.message : "Échec de l'enregistrement dans le Cloud. Vos données sont conservées.");
    } finally {
      setIsSaving(false);
    }
  };

  // Enregistrer les achats extraits du scanner de factures pour mettre à jour le stock
  const handleSaveInvoicePurchases = (scannedPurchases: Omit<Purchase, 'id'>[]) => {
    scannedPurchases.forEach(p => {
      const fullPurchase: Purchase = {
        id: generateUUID(),
        ...p
      };
      dbService.addPurchase(fullPurchase);
    });
    setIsInvoiceScannerOpen(false);
    loadData();
  };

  // Traiter le scan de code-barres dans le formulaire avec recherche locale et externe
  const handleBarcodeScanned = (barcode: string, result: LookupResult) => {
    setIsScannerOpen(false);
    
    if (result.state === 'local_found' && result.localProduct) {
      alert(`Ce code-barres est déjà attribué au produit existant : ${result.localProduct.name}. Modification en cours.`);
      handleOpenEditForm(result.localProduct, { stopPropagation: () => {} } as unknown as React.MouseEvent);
    } else if (result.state === 'external_found' && result.externalProduct) {
      setFormBarcode(result.externalProduct.barcode);
      setFormName(result.externalProduct.name);
      setFormBrand(result.externalProduct.brand);
      setFormFormat(result.externalProduct.format);
      if (result.externalProduct.notes) {
        setFormNotes(result.externalProduct.notes);
      } else {
        setFormNotes('Produit importé via recherche de code-barres externe.');
      }
      
      // Essayer de mapper la catégorie externe de manière floue avec nos catégories internes
      if (result.externalProduct.category) {
        const extCat = result.externalProduct.category.toLowerCase();
        const matchedCat = settings.categories.find(c => 
          extCat.includes(c.toLowerCase()) || c.toLowerCase().includes(extCat)
        );
        if (matchedCat) {
          setFormCategory(matchedCat);
        } else {
          setFormCategory(settings.categories[0] || '');
        }
      }
    } else {
      // Produit non trouvé ou erreur réseau : préremplir le code-barres pour création manuelle
      setFormBarcode(barcode);
      setFormName('');
      setFormBrand('');
      setFormFormat('Unité');
      setFormNotes('');
      if (result.state === 'error' && result.error) {
        alert(result.error);
      }
    }
  };

  // Filtrer les produits
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.barcode.includes(searchQuery);
    
    const matchesCategory = selectedCategory === '' || p.category === selectedCategory;
    
    let matchesStock = true;
    if (selectedStockFilter === 'rupture') {
      matchesStock = p.stock === 0;
    } else if (selectedStockFilter === 'faible') {
      matchesStock = p.stock > 0 && p.stock <= p.minStockAlert;
    } else if (selectedStockFilter === 'ok') {
      matchesStock = p.stock > p.minStockAlert;
    }

    let matchesAllergens = true;
    if (selectedAllergensFilter === 'unspecified') {
      matchesAllergens = p.allergens === null || p.allergens === undefined;
    }

    return matchesSearch && matchesCategory && matchesStock && matchesAllergens;
  });

  return (
    <div>
      {/* En-tête */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Ingrédients & Produits</h1>
          <p className="page-subtitle">Gérez vos matières premières, emballages et stocks</p>
        </div>
        <div className="actions-group">
          <button className="btn btn-secondary" onClick={() => { setIsAiScannerOpen(true); setIsInvoiceScannerOpen(true); }} style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
            <FileText size={18} />
            Scanner une facture avec IA
          </button>
          <button className="btn btn-secondary" onClick={() => { setIsAiScannerOpen(false); setIsInvoiceScannerOpen(true); }}>
            <FileText size={18} />
            Scanner une facture
          </button>
          <button className="btn btn-primary" onClick={handleOpenAddForm}>
            <Plus size={18} />
            Ajouter un produit
          </button>
        </div>
      </div>

      {/* Bouton de retour à la recette après enregistrement */}
      {savedReturnToRecipe && (
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontSize: '13px', fontWeight: '600' }}>
            <Check size={18} style={{ color: '#059669', flexShrink: 0 }} />
            <span>Produit enregistré avec succès ! Vous pouvez revenir à votre recette.</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ height: '34px', padding: '0 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => {
                if (onNavigate) {
                  onNavigate('Recettes', { viewRecipeId: savedReturnToRecipe.id });
                }
              }}
            >
              <ArrowLeft size={16} />
              Retour à la recette {savedReturnToRecipe.name ? `« ${savedReturnToRecipe.name} »` : ''}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ height: '34px', padding: '0 10px', fontSize: '12px' }}
              onClick={() => setSavedReturnToRecipe(null)}
              title="Fermer ce message"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Barre de Recherche et Filtres */}
      <div className="card filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher par nom, marque ou code-barres..."
            className="form-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '560px' }}>
          <select 
            className="select-filter" 
            style={{ flex: 1 }}
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Toutes les catégories</option>
            {settings.categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select 
            className="select-filter" 
            style={{ flex: 1 }}
            value={selectedStockFilter} 
            onChange={(e) => setSelectedStockFilter(e.target.value)}
          >
            <option value="">Tous les stocks</option>
            <option value="rupture">En rupture (0)</option>
            <option value="faible">Stock faible</option>
            <option value="ok">Stock suffisant</option>
          </select>

          <select 
            className="select-filter" 
            style={{ flex: 1 }}
            value={selectedAllergensFilter} 
            onChange={(e) => setSelectedAllergensFilter(e.target.value)}
            title="Filtrer selon l'état des allergènes"
          >
            <option value="">Tous les allergènes</option>
            <option value="unspecified">⚠️ Non renseignés</option>
          </select>
        </div>
      </div>

      {/* Liste des Produits */}
      {filteredProducts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-dark-light)' }}>
          <Archive size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <p>Aucun produit trouvé avec ces critères de recherche.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table adaptive-table-wrap">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Catégorie</th>
                <th>Stock Actuel</th>
                <th>Seuil Alerte</th>
                <th>Prix d'Achat Moyen</th>
                <th>Fournisseur Habituel</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const store = stores.find(s => s.id === p.mainStoreId);
                const isLowStock = p.stock <= p.minStockAlert;
                
                return (
                  <tr 
                    key={p.id} 
                    style={{ cursor: 'pointer', opacity: p.isActive ? 1 : 0.6 }}
                    onClick={() => handleOpenDetails(p)}
                  >
                    <td data-label="Produit">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: '600' }}>{cleanProductName(p.name)}</span>
                          {(p.allergens === null || p.allergens === undefined) && (
                            <span
                              className="badge"
                              style={{ fontSize: '9px', padding: '1px 5px', backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontWeight: '700' }}
                              title="Allergènes non renseignés"
                            >
                              ⚠️ Allergènes ?
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--color-dark-light)' }}>
                          {p.brand ? `${p.brand} • ` : ''}{p.format}
                          {p.barcode ? ` • Code: ${p.barcode}` : ''}
                        </span>
                      </div>
                    </td>
                    <td data-label="Catégorie">
                      <span className="badge badge-info" style={{ backgroundColor: 'var(--color-light)', color: 'var(--color-dark)' }}>
                        {p.category}
                      </span>
                    </td>
                    <td data-label="Stock Actuel">
                      <span className={`badge ${p.stock === 0 ? 'badge-danger' : isLowStock ? 'badge-warning' : 'badge-success'}`}>
                        {formatStock(p.stock)} {p.unit}
                      </span>
                    </td>
                    <td data-label="Seuil Alerte">
                      {formatStock(p.minStockAlert)} {p.unit}
                    </td>
                    <td data-label="Prix d'Achat Moyen">
                      {p.avgPurchasePrice.toFixed(2)} {settings.currency}/{p.unit}
                    </td>
                    <td data-label="Fournisseur">
                      {store ? store.name : 'Non défini'}
                    </td>
                    <td data-label="Actions" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-secondary btn-icon-only" 
                          style={{ height: '36px', width: '36px' }}
                          onClick={(e) => handleOpenEditForm(p, e)}
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- DRAWER FORMULAIRE (AJOUT / MODIFICATION) --- */}
      <Drawer
        title={editingProduct ? "Modifier le produit" : "Ajouter un produit"}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setIsScannerOpen(false);
          setDeleteDialogState({ isOpen: false, canHardDelete: true, usageReasons: [] });
        }}
        footer={
          <div style={{ display: 'flex', justifyContent: editingProduct ? 'space-between' : 'flex-end', alignItems: 'center', width: '100%', gap: '8px' }}>
            {editingProduct && (
              <button
                type="button"
                className="btn"
                onClick={handleRequestDeleteProduct}
                disabled={isSaving || isDeletingOrDeactivating}
                style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
              >
                <Trash2 size={16} />
                Supprimer
              </button>
            )}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {returnToRecipe && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsFormOpen(false);
                    onNavigate?.('Recettes', { viewRecipeId: returnToRecipe.id });
                  }}
                  title="Revenir directement à la recette"
                >
                  <ArrowLeft size={14} style={{ marginRight: '4px' }} />
                  Retour à la recette
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)} disabled={isSaving || isDeletingOrDeactivating}>Annuler</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveProduct} disabled={isSaving || isDeletingOrDeactivating}>
                {isSaving ? 'Enregistrement...' : saveError ? 'Réessayer' : 'Enregistrer'}
              </button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSaveProduct}>
          {returnToRecipe && (
            <div style={{
              marginBottom: '14px',
              padding: '10px 14px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              fontSize: '12px',
              color: '#1e40af'
            }}>
              <span>Lien actif vers la recette <strong>« {returnToRecipe.name || returnToRecipe.id} »</strong></span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: '26px', padding: '0 8px', fontSize: '11px', backgroundColor: '#fff', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                onClick={() => {
                  setIsFormOpen(false);
                  onNavigate?.('Recettes', { viewRecipeId: returnToRecipe.id });
                }}
              >
                Retour à la recette
              </button>
            </div>
          )}
          {saveError && (
            <div style={{ marginBottom: '16px', padding: '12px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', color: '#991b1b', fontSize: '13px' }}>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>⚠️ Échec de l'enregistrement</div>
              <div>{saveError}</div>
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#b91c1c' }}>Vos saisies ont été conservées intactes. Vous pouvez corriger ou cliquer sur Réessayer.</div>
            </div>
          )}

          {editingProduct && deleteDialogState.isOpen && (
            <div style={{ marginBottom: '16px', padding: '14px', background: deleteDialogState.canHardDelete ? '#fef2f2' : '#fffbeb', border: `1px solid ${deleteDialogState.canHardDelete ? '#ef4444' : '#f59e0b'}`, borderRadius: '8px', fontSize: '13px' }}>
              {deleteDialogState.canHardDelete ? (
                <>
                  <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: '6px' }}>
                    Confirmer la suppression de « {editingProduct.name} » ?
                  </div>
                  <div style={{ color: '#7f1d1d', marginBottom: '12px' }}>
                    Ce produit n'est utilisé dans aucune recette, aucun achat et aucun mouvement de stock. Sa suppression est définitive.
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
                      onClick={() => setDeleteDialogState({ isOpen: false, canHardDelete: true, usageReasons: [] })}
                      disabled={isDeletingOrDeactivating}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ height: '32px', padding: '0 12px', fontSize: '12px', backgroundColor: '#dc2626', color: '#fff', border: 'none' }}
                      onClick={handleConfirmDeleteOrDeactivate}
                      disabled={isDeletingOrDeactivating}
                    >
                      {isDeletingOrDeactivating ? 'Suppression...' : 'Confirmer la suppression'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '6px' }}>
                    Suppression impossible : produit utilisé dans l'historique
                  </div>
                  <div style={{ color: '#78350f', marginBottom: '8px' }}>
                    « {editingProduct.name} » est référencé dans : <strong>{deleteDialogState.usageReasons.join(', ')}</strong>. Le supprimer fausserait vos coûts de recettes et votre historique.
                  </div>
                  <div style={{ color: '#78350f', marginBottom: '12px' }}>
                    Vous pouvez en revanche <strong>désactiver ce produit</strong> afin qu'il n'apparaisse plus dans les sélections actives tout en préservant l'historique.
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
                      onClick={() => setDeleteDialogState({ isOpen: false, canHardDelete: true, usageReasons: [] })}
                      disabled={isDeletingOrDeactivating}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ height: '32px', padding: '0 12px', fontSize: '12px', backgroundColor: '#d97706', color: '#fff', border: 'none' }}
                      onClick={handleConfirmDeleteOrDeactivate}
                      disabled={isDeletingOrDeactivating}
                    >
                      {isDeletingOrDeactivating ? 'Désactivation...' : 'Désactiver ce produit'}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      title={recipeUsageCount > 0 ? 'Retirez d\'abord ce produit des recettes qui l\'utilisent' : 'Supprimer quand même ce produit et son historique'}
                      style={{ height: '32px', padding: '0 12px', fontSize: '12px', backgroundColor: '#fff', color: '#dc2626', border: '1px solid #dc2626', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: recipeUsageCount > 0 ? 0.5 : 1 }}
                      onClick={() => setIsForceDeleteConfirmOpen(true)}
                      disabled={isDeletingOrDeactivating || recipeUsageCount > 0}
                    >
                      <Trash2 size={14} /> Supprimer quand même
                    </button>
                  </div>
                  {recipeUsageCount > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#78350f' }}>
                      Pour pouvoir le supprimer, retirez-le d'abord des recettes qui l'utilisent.
                    </div>
                  )}
                  {isForceDeleteConfirmOpen && recipeUsageCount === 0 && (
                    <div style={{ marginTop: '12px', padding: '12px', background: '#fef2f2', border: '1px solid #ef4444', borderRadius: '8px' }}>
                      <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: '6px' }}>
                        Supprimer définitivement « {editingProduct.name} » ?
                      </div>
                      <div style={{ color: '#7f1d1d', marginBottom: '12px' }}>
                        Le produit sera supprimé ainsi que tout son historique : <strong>{deleteDialogState.usageReasons.join(', ')}</strong>. Cette action est irréversible et peut modifier vos totaux d'achats passés.
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
                          onClick={() => setIsForceDeleteConfirmOpen(false)}
                          disabled={isDeletingOrDeactivating}
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          className="btn"
                          style={{ height: '32px', padding: '0 12px', fontSize: '12px', backgroundColor: '#dc2626', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          onClick={handleForceDeleteProduct}
                          disabled={isDeletingOrDeactivating}
                        >
                          <Trash2 size={14} /> {isDeletingOrDeactivating ? 'Suppression...' : 'Supprimer définitivement'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {/* Scanner Intégration */}
          <div style={{ marginBottom: '20px', padding: '12px', border: '1px dashed var(--color-primary)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isScannerOpen ? '12px' : 0 }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-primary)' }}>
                {formBarcode ? `Code-barres associé : ${formBarcode}` : 'Aucun code-barres associé'}
              </span>
              <button
                type="button"
                className="btn btn-primary"
                style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
                onClick={() => setIsScannerOpen(!isScannerOpen)}
              >
                <Barcode size={14} style={{ marginRight: '6px' }} />
                {isScannerOpen ? 'Masquer scanner' : 'Scanner Code'}
              </button>
            </div>
            
            {isScannerOpen && (
              <div style={{ marginTop: '12px' }}>
                <BarcodeScanner
                  onScan={handleBarcodeScanned}
                  onClose={() => setIsScannerOpen(false)}
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Nom du produit/ingrédient *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ex: Farine de Blé T55 Bio"
              value={formName}
              onChange={(e) => {
                setFormName(e.target.value);
              }}
            />
            <ProductDuplicateSuggestions
              inputName={formName}
              allProducts={products}
              ignoreProductId={editingProduct?.id}
              showSuggestions={!editingProduct}
              actionLabel="Modifier"
              onSelectProduct={(selectedProd) => {
                handleOpenEditForm(selectedProd);
              }}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Catégorie</label>
              <select className="form-input" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                {settings.categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Marque</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Daddy, Francine"
                value={formBrand}
                onChange={(e) => setFormBrand(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Format / Conditionnement</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Paquet 1kg, Bouteille 75cl, Vrac"
                value={formFormat}
                onChange={(e) => setFormFormat(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Unité de gestion du stock *</label>
              <select className="form-input" value={formUnit} onChange={(e) => handleUnitChange(e.target.value)}>
                {settings.units.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                {editingProduct ? `Stock actuel (${formUnit})` : `Stock initial (${formUnit})`}
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  inputMode="decimal"
                  className="form-input"
                  style={{ flex: 1 }}
                  value={formStock}
                  placeholder="0"
                  onChange={(e) => setFormStock(e.target.value)}
                  disabled={editingProduct !== null && !isUnitReset}
                />
                {editingProduct && !isUnitReset && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ whiteSpace: 'nowrap', height: '40px', padding: '0 12px', fontSize: '12px' }}
                    onClick={() => handleOpenStockCorrection(editingProduct)}
                  >
                    <SlidersHorizontal size={14} />
                    Corriger le stock
                  </button>
                )}
              </div>
              {editingProduct && !isUnitReset && (
                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-dark-light)' }}>
                  Le stock se modifie par un achat ou par “Corriger le stock”
                </div>
              )}
              {isUnitReset && (
                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-primary)', fontWeight: '600' }}>
                  ⚠️ Unité modifiée vers une unité incompatible : veuillez saisir le nouveau stock.
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Seuil d'alerte stock bas</label>
              <input
                type="text"
                inputMode="decimal"
                className="form-input"
                value={formMinStock}
                placeholder="0"
                onChange={(e) => setFormMinStock(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Prix d'achat moyen ({settings.currency} / {formUnit})</label>
              <input
                type="text"
                inputMode="decimal"
                className="form-input"
                value={formAvgPrice}
                placeholder="0.00"
                onChange={(e) => setFormAvgPrice(e.target.value)}
                disabled={editingProduct !== null && editingProductHasPurchases && !isUnitReset}
              />
              {isUnitReset ? (
                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-primary)', fontWeight: '600' }}>
                  ⚠️ Veuillez saisir le nouveau prix d'achat moyen par {formUnit}.
                </div>
              ) : editingProduct && (
                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-dark-light)' }}>
                  Calculé automatiquement à partir de vos achats
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Magasin / Fournisseur habituel</label>
              <select className="form-input" value={formMainStore} onChange={(e) => setFormMainStore(e.target.value)}>
                <option value="">Aucun</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION ÉQUIVALENCES */}
          <div
            id="product-equivalences-section"
            style={{
              marginTop: '16px',
              marginBottom: '20px',
              padding: '14px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(0, 0, 0, 0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Scale size={16} style={{ color: 'var(--color-primary)' }} />
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: 'var(--color-dark)' }}>
                Équivalences
              </h4>
              <span style={{ fontSize: '11px', color: 'var(--color-dark-light)', fontWeight: 'normal' }}>
                (facultatif)
              </span>
            </div>

            <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: 'var(--color-dark-light)' }}>
              Permet les conversions précises masse ↔ volume et comptage ↔ masse/volume dans vos recettes.
            </p>

            {/* Phrase 1 : 1 [unité] pèse … g */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-dark)' }}>
                  1 <strong>{formUnit || 'pièce'}</strong> pèse
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="form-input"
                  style={{ width: '100px', height: '36px', textAlign: 'center' }}
                  placeholder="…"
                  value={formUnitWeight}
                  onChange={(e) => setFormUnitWeight(e.target.value)}
                />
                <span style={{ fontSize: '13px', color: 'var(--color-dark)' }}>g</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-dark-light)', display: 'block', marginTop: '4px' }}>
                Poids d'une pièce, d'un sachet, d'un pot… en grammes (ex: 1 œuf = 60 g, 1 sachet de levure = 11 g).
              </span>
            </div>

            {/* Phrase 2 : 1 litre pèse … kg */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-dark)' }}>
                  1 litre pèse
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="form-input"
                  style={{ width: '100px', height: '36px', textAlign: 'center' }}
                  placeholder="…"
                  value={formDensity}
                  onChange={(e) => setFormDensity(e.target.value)}
                />
                <span style={{ fontSize: '13px', color: 'var(--color-dark)' }}>kg</span>
              </div>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-dark-light)' }}>Valeurs proposées :</span>
                {PROPOSED_DENSITIES.map(prop => (
                  <button
                    key={prop.label}
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      height: '24px',
                      padding: '0 8px',
                      fontSize: '11px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      border: formDensity === prop.value ? '1px solid var(--color-primary)' : undefined,
                      backgroundColor: formDensity === prop.value ? 'var(--color-primary-light)' : undefined,
                      color: formDensity === prop.value ? 'var(--color-primary)' : undefined
                    }}
                    onClick={() => setFormDensity(prop.value)}
                  >
                    {prop.label} {prop.value.replace('.', ',')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION ALLERGÈNES (14 ALLERGÈNES OBLIGATOIRES UE) */}
          <div
            id="product-allergens-section"
            style={{
              marginTop: '16px',
              marginBottom: '20px',
              padding: '14px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(0, 0, 0, 0.02)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <ShieldAlert size={16} style={{ color: '#b45309' }} />
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: 'var(--color-dark)' }}>
                  Allergènes à déclaration obligatoire (UE)
                </h4>
                {formNoAllergensVerified ? (
                  <span className="badge badge-success" style={{ fontSize: '11px', padding: '1px 6px', fontWeight: '700' }}>
                    Vérifié sans allergène
                  </span>
                ) : formAllergens.length > 0 ? (
                  <span className="badge badge-warning" style={{ fontSize: '11px', padding: '1px 6px', fontWeight: '700' }}>
                    {formAllergens.length} sélectionné{formAllergens.length > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="badge" style={{ fontSize: '11px', padding: '1px 6px', fontWeight: '600', backgroundColor: '#f1f5f9', color: '#64748b' }}>
                    Non renseigné
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ height: '26px', padding: '0 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => {
                    const auto = suggestAllergensFromName(formName);
                    if (auto.length > 0) {
                      setFormAllergens(auto);
                      setFormNoAllergensVerified(false);
                    } else {
                      alert('Aucun des 14 allergènes officiels UE n\'a été détecté d\'après ce nom de produit.');
                    }
                  }}
                  title="Analyser le nom pour détecter les allergènes probables"
                >
                  <Sparkles size={12} />
                  Suggérer d'après le nom
                </button>
                {(formAllergens.length > 0 || formNoAllergensVerified) && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ height: '26px', padding: '0 8px', fontSize: '11px' }}
                    onClick={() => {
                      setFormAllergens([]);
                      setFormNoAllergensVerified(false);
                    }}
                    title="Remettre dans l'état non renseigné"
                  >
                    Effacer (non renseigné)
                  </button>
                )}
              </div>
            </div>

            {/* Proposition automatique d'après le nom (non appliquée tant que non validée) */}
            {(() => {
              const suggestions = formName.trim() ? suggestAllergensFromName(formName) : [];
              const notYetApplied = suggestions.length > 0 && !formNoAllergensVerified && (
                suggestions.some(s => !formAllergens.includes(s)) || formAllergens.length === 0
              );
              if (!notYetApplied) return null;
              return (
                <div style={{
                  marginBottom: '10px',
                  padding: '8px 10px',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#92400e'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} style={{ color: '#b45309', flexShrink: 0 }} />
                    <span>Suggestion d'après le nom : <strong>{suggestions.join(', ')}</strong></span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ height: '24px', padding: '0 8px', fontSize: '11px', whiteSpace: 'nowrap', backgroundColor: '#fff' }}
                    onClick={() => {
                      setFormAllergens(suggestions);
                      setFormNoAllergensVerified(false);
                    }}
                  >
                    Valider la suggestion
                  </button>
                </div>
              );
            })()}

            {/* Case Aucun allergène (vérifié) */}
            <div
              style={{
                marginBottom: '10px',
                padding: '8px 12px',
                backgroundColor: formNoAllergensVerified ? '#ecfdf5' : '#fff',
                border: `1px solid ${formNoAllergensVerified ? '#a7f3d0' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
              onClick={() => {
                const nextVal = !formNoAllergensVerified;
                setFormNoAllergensVerified(nextVal);
                if (nextVal) {
                  setFormAllergens([]);
                }
              }}
            >
              <input
                type="checkbox"
                id="checkbox-no-allergens-verified"
                checked={formNoAllergensVerified}
                onChange={(e) => {
                  setFormNoAllergensVerified(e.target.checked);
                  if (e.target.checked) {
                    setFormAllergens([]);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-secondary)' }}
              />
              <label
                htmlFor="checkbox-no-allergens-verified"
                style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: formNoAllergensVerified ? '#065f46' : 'var(--color-dark)', cursor: 'pointer' }}
                onClick={(e) => e.stopPropagation()}
              >
                Aucun allergène (vérifié)
              </label>
              <span style={{ fontSize: '11px', color: 'var(--color-dark-light)', marginLeft: 'auto' }}>
                {formNoAllergensVerified ? 'Enregistre un tableau vide []' : 'Cocher pour certifier l\'absence totale d\'allergène'}
              </span>
            </div>

            <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: 'var(--color-dark-light)' }}>
              Cochez les allergènes présents. Si aucune case n'est cochée (ni allergène, ni « Aucun allergène »), le produit reste « non renseigné ».
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '8px',
              padding: '10px',
              backgroundColor: '#fff',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)'
            }}>
              {OFFICIAL_ALLERGENS.map(allergen => {
                const isChecked = formAllergens.includes(allergen);
                return (
                  <label
                    key={allergen}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      backgroundColor: isChecked ? '#fef3c7' : 'transparent',
                      color: isChecked ? '#92400e' : 'var(--color-dark)',
                      fontWeight: isChecked ? '700' : '500',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setFormNoAllergensVerified(false);
                        setFormAllergens(prev =>
                          prev.includes(allergen) ? prev.filter(a => a !== allergen) : [...prev, allergen]
                        );
                      }}
                      style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                    />
                    <span>{allergen.charAt(0).toUpperCase() + allergen.slice(1)}</span>
                  </label>
                );
              })}
            </div>

            <span style={{ fontSize: '10px', color: 'var(--color-dark-light)', fontStyle: 'italic', display: 'block', marginTop: '6px' }}>
              {ALLERGEN_DISCLAIMER}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Notes facultatives</label>
            <textarea
              className="form-input"
              placeholder="Ex: À conserver au sec..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="isActive"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              style={{ width: '20px', height: '20px' }}
            />
            <label className="form-label" htmlFor="isActive" style={{ cursor: 'pointer', marginBottom: 0 }}>
              Produit Actif (disponible pour les recettes et achats)
            </label>
          </div>
        </form>
      </Drawer>

      {/* --- DRAWER DE DÉTAIL & HISTORIQUE D'UN PRODUIT --- */}
      <Drawer
        title={selectedProductDetails?.name || "Détails du produit"}
        isOpen={selectedProductDetails !== null}
        onClose={() => {
          setSelectedProductDetails(null);
          setDetailsError(null);
        }}
      >
        {selectedProductDetails && (
          <div>
            {detailsError && (
              <div style={{ marginBottom: '16px', padding: '12px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', color: '#991b1b', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '2px' }}>⚠️ Une erreur est survenue</div>
                  <div>{detailsError}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailsError(null)}
                  style={{ background: 'transparent', border: 'none', color: '#991b1b', fontWeight: 700, cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
            )}

            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                <span className="badge badge-info">{selectedProductDetails.category}</span>
                <span style={{ fontSize: '13px', color: 'var(--color-dark-light)' }}>
                  Code : {selectedProductDetails.barcode || 'Aucun'}
                </span>
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>{cleanProductName(selectedProductDetails.name)}</h2>
              <p style={{ color: 'var(--color-dark-light)', fontSize: '14px', marginBottom: '16px' }}>
                Marque: {selectedProductDetails.brand || 'Non spécifiée'} • Format: {selectedProductDetails.format}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', backgroundColor: 'var(--color-light)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-dark-light)' }}>Stock actuel</div>
                    <strong style={{ fontSize: '18px' }}>{formatStock(selectedProductDetails.stock)} {selectedProductDetails.unit}</strong>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ height: '28px', padding: '0 8px', fontSize: '11px', alignSelf: 'flex-start' }}
                    onClick={() => handleOpenStockCorrection(selectedProductDetails)}
                  >
                    <SlidersHorizontal size={12} />
                    Corriger le stock
                  </button>
                </div>
                <div style={{ padding: '12px', backgroundColor: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-dark-light)' }}>Coût unitaire moyen</div>
                  <strong style={{ fontSize: '18px' }}>{selectedProductDetails.avgPurchasePrice.toFixed(2)} {settings.currency}/{selectedProductDetails.unit}</strong>
                </div>
              </div>

              {/* Prochaine date limite (DLC / DLUO) */}
              {(() => {
                const nextExpiry = getProductNextExpiry(selectedProductDetails.id, purchaseHistory, settings.expiryAlertDays ?? 7);
                return (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: nextExpiry ? (nextExpiry.statusLevel === 'danger' ? 'rgba(239, 68, 68, 0.08)' : nextExpiry.statusLevel === 'warning' ? 'rgba(245, 158, 11, 0.08)' : 'var(--color-light)') : 'var(--color-light)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${nextExpiry ? (nextExpiry.statusLevel === 'danger' ? 'rgba(239, 68, 68, 0.35)' : nextExpiry.statusLevel === 'warning' ? 'rgba(245, 158, 11, 0.35)' : 'var(--color-border)') : 'var(--color-border)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: nextExpiry ? (nextExpiry.statusLevel === 'danger' ? 'rgba(239, 68, 68, 0.15)' : nextExpiry.statusLevel === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.12)') : 'rgba(100, 116, 139, 0.1)',
                        color: nextExpiry ? (nextExpiry.statusLevel === 'danger' ? '#dc2626' : nextExpiry.statusLevel === 'warning' ? '#d97706' : 'var(--color-primary)') : 'var(--color-dark-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Calendar size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--color-dark-light)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                          Prochaine date limite
                        </div>
                        {nextExpiry ? (
                          <div style={{ fontSize: '14px', fontWeight: 700, color: nextExpiry.statusLevel === 'danger' ? '#dc2626' : nextExpiry.statusLevel === 'warning' ? '#b45309' : 'var(--color-dark)' }}>
                            {nextExpiry.formattedDate}
                            {nextExpiry.batchNo && (
                              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-dark-light)', marginLeft: '8px' }}>
                                (Lot : {nextExpiry.batchNo})
                              </span>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: '13px', color: 'var(--color-dark-light)', fontStyle: 'italic' }}>
                            Aucune date limite renseignée sur les achats
                          </div>
                        )}
                      </div>
                    </div>
                    {nextExpiry && (
                      <span className={`badge ${nextExpiry.statusLevel === 'danger' ? 'badge-danger' : nextExpiry.statusLevel === 'warning' ? 'badge-warning' : 'badge-info'}`} style={{ padding: '4px 8px', fontWeight: '700' }}>
                        {nextExpiry.label}
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Allergènes du produit */}
              <div style={{ marginTop: '14px', padding: '10px 12px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-dark-light)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldAlert size={14} style={{ color: '#b45309' }} />
                  Allergènes déclarables (UE)
                </div>
                {Array.isArray(selectedProductDetails.allergens) && selectedProductDetails.allergens.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedProductDetails.allergens.map(a => (
                      <span key={a} className="badge" style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontWeight: '700' }}>
                        {a}
                      </span>
                    ))}
                  </div>
                ) : Array.isArray(selectedProductDetails.allergens) && selectedProductDetails.allergens.length === 0 ? (
                  <span style={{ fontSize: '12px', color: '#065f46', fontWeight: '600' }}>
                    ✅ Vérifié : aucun allergène
                  </span>
                ) : (
                  <span style={{ fontSize: '12px', color: '#b45309', fontWeight: '600' }}>
                    ⚠️ Non renseigné (allergènes à vérifier)
                  </span>
                )}
              </div>

              {selectedProductDetails.notes && (
                <div style={{ marginTop: '16px', fontSize: '13px', fontStyle: 'italic', color: 'var(--color-dark-light)' }}>
                  Notes : {selectedProductDetails.notes}
                </div>
              )}
            </div>

            {/* Onglets / Liste des Historiques */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowRightLeft size={16} />
                Mouvements de stock récents
              </h3>
              
              {stockHistory.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--color-dark-light)', padding: '10px 0' }}>Aucun mouvement enregistré pour le moment.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {stockHistory.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid var(--color-border)', fontSize: '12px' }}>
                      <div>
                        <strong>{m.type}</strong>
                        <div style={{ color: 'var(--color-dark-light)' }}>{m.date} • {m.notes}</div>
                      </div>
                      <strong style={{ color: m.qty > 0 ? 'var(--color-secondary)' : 'var(--color-danger)' }}>
                        {m.qty > 0 ? `+${m.qty.toFixed(2)}` : m.qty.toFixed(2)} {selectedProductDetails.unit}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Évolution du prix d'achat et Historique des achats */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} />
                Évolution du prix d'achat
              </h3>
              
              {purchaseHistory.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--color-dark-light)', padding: '10px 0' }}>Aucun achat enregistré pour ce produit.</p>
              ) : (() => {
                const purchasesWithStockPrice = purchaseHistory.map(p => {
                  const stockUnit = selectedProductDetails.unit;
                  const convQty = convertUnits(p.qty, p.unit, stockUnit);
                  const pricePerStockUnit = (convQty !== null && convQty > 0)
                    ? (p.pricePaid / convQty)
                    : (p.unit === stockUnit ? p.pricePaid / p.qty : p.unitPrice);

                  return {
                    ...p,
                    pricePerStockUnit: Number(pricePerStockUnit.toFixed(4)),
                    convQty
                  };
                });

                // Tri chronologique croissant pour tracer la courbe dans le bon ordre temporel
                const chronologicalPurchases = [...purchasesWithStockPrice].sort((a, b) => a.date.localeCompare(b.date));

                const svgWidth = 380;
                const svgHeight = 90;
                const padLeft = 48;
                const padRight = 18;
                const padTop = 14;
                const padBottom = 22;
                const plotW = svgWidth - padLeft - padRight;
                const plotH = svgHeight - padTop - padBottom;

                const prices = chronologicalPurchases.map(p => p.pricePerStockUnit);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const priceRange = maxPrice - minPrice || (minPrice > 0 ? minPrice * 0.1 : 1);

                const firstPrice = chronologicalPurchases[0].pricePerStockUnit;
                const lastPrice = chronologicalPurchases[chronologicalPurchases.length - 1].pricePerStockUnit;
                const trendDiffPercent = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

                const coords = chronologicalPurchases.map((p, idx) => {
                  const x = chronologicalPurchases.length === 1 
                    ? padLeft + plotW / 2 
                    : padLeft + (idx / (chronologicalPurchases.length - 1)) * plotW;
                  const normY = (p.pricePerStockUnit - minPrice) / priceRange;
                  const y = padTop + plotH * (1 - normY);
                  return { x, y, p };
                });

                const polylinePoints = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
                const areaPath = coords.length > 1
                  ? `M ${coords[0].x},${padTop + plotH} ` +
                    coords.map(c => `L ${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ') +
                    ` L ${coords[coords.length - 1].x},${padTop + plotH} Z`
                  : '';

                return (
                  <div>
                    {/* Petite courbe d'évolution */}
                    <div style={{
                      marginBottom: '16px',
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-light)',
                      border: '1px solid var(--color-border)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px' }}>
                        <span style={{ color: 'var(--color-dark-light)', fontWeight: 500 }}>
                          Courbe ({chronologicalPurchases.length} achat{chronologicalPurchases.length > 1 ? 's' : ''})
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {chronologicalPurchases.length > 1 && (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: trendDiffPercent > 0 ? 'var(--color-danger)' : trendDiffPercent < 0 ? 'var(--color-secondary)' : 'var(--color-dark-light)'
                            }}>
                              {trendDiffPercent > 0 ? `↗ +${trendDiffPercent.toFixed(1)} %` : trendDiffPercent < 0 ? `↘ ${trendDiffPercent.toFixed(1)} %` : '→ Stable'}
                            </span>
                          )}
                          <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                            Dernier : {lastPrice.toFixed(2)} {settings.currency}/{selectedProductDetails.unit}
                          </span>
                        </div>
                      </div>

                      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                        <defs>
                          <linearGradient id="priceCurveGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>

                        {/* Ligne repère prix max */}
                        <line x1={padLeft} y1={padTop} x2={svgWidth - padRight} y2={padTop} stroke="var(--color-border)" strokeDasharray="3 3" strokeWidth="1" />
                        <text x={padLeft - 6} y={padTop + 4} textAnchor="end" fontSize="9" fill="var(--color-dark-light)">
                          {maxPrice.toFixed(2)}
                        </text>

                        {/* Ligne repère prix min */}
                        <line x1={padLeft} y1={padTop + plotH} x2={svgWidth - padRight} y2={padTop + plotH} stroke="var(--color-border)" strokeWidth="1" />
                        <text x={padLeft - 6} y={padTop + plotH + 3} textAnchor="end" fontSize="9" fill="var(--color-dark-light)">
                          {minPrice.toFixed(2)}
                        </text>

                        {/* Remplissage dégradé sous la courbe */}
                        {areaPath && <path d={areaPath} fill="url(#priceCurveGrad)" />}

                        {/* Tracé de la courbe */}
                        {coords.length > 1 && (
                          <polyline
                            fill="none"
                            stroke="var(--color-primary)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={polylinePoints}
                          />
                        )}

                        {/* Points d'achats avec infobulle native */}
                        {coords.map((c, i) => {
                          const st = stores.find(s => s.id === c.p.storeId);
                          return (
                            <g key={c.p.id || i}>
                              <title>{`${c.p.date} : ${c.p.pricePerStockUnit.toFixed(2)} ${settings.currency}/${selectedProductDetails.unit} (${st ? st.name : 'Fournisseur'})`}</title>
                              <circle
                                cx={c.x}
                                cy={c.y}
                                r="4"
                                fill="#ffffff"
                                stroke="var(--color-primary)"
                                strokeWidth="2"
                              />
                            </g>
                          );
                        })}

                        {/* Dates extrêmes */}
                        <text x={coords[0].x} y={svgHeight - 4} fontSize="9" fill="var(--color-dark-light)" textAnchor="start">
                          {chronologicalPurchases[0].date}
                        </text>
                        {coords.length > 1 && (
                          <text x={coords[coords.length - 1].x} y={svgHeight - 4} fontSize="9" fill="var(--color-dark-light)" textAnchor="end">
                            {chronologicalPurchases[chronologicalPurchases.length - 1].date}
                          </text>
                        )}
                      </svg>
                    </div>

                    {/* Liste des derniers achats avec prix ramené à l'unité de stock */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                      {purchasesWithStockPrice.map(p => {
                        const st = stores.find(s => s.id === p.storeId);
                        const isDifferentUnit = p.unit !== selectedProductDetails.unit;
                        return (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', backgroundColor: '#ffffff' }}>
                            <div>
                              <strong style={{ fontSize: '13px', color: 'var(--color-dark)' }}>{st ? st.name : 'Fournisseur inconnu'}</strong>
                              <div style={{ color: 'var(--color-dark-light)', marginTop: '2px' }}>
                                {p.date} • {p.qty} {p.unit} achetés pour {p.pricePaid.toFixed(2)} {settings.currency}
                                {p.batchNo && <span> • Lot : {p.batchNo}</span>}
                                {p.expiryDate && (
                                  <span style={{
                                    marginLeft: '6px',
                                    fontWeight: 600,
                                    color: (getDaysUntilExpiry(p.expiryDate) ?? 999) < 0 ? '#dc2626' : (getDaysUntilExpiry(p.expiryDate) ?? 999) <= (settings.expiryAlertDays ?? 7) ? '#d97706' : 'inherit'
                                  }}>
                                    • DLC : {formatExpiryDate(p.expiryDate)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                              <strong style={{ fontSize: '13px', color: 'var(--color-primary)' }}>
                                {p.pricePerStockUnit.toFixed(2)} {settings.currency}/{selectedProductDetails.unit}
                              </strong>
                              {isDifferentUnit && (
                                <div style={{ fontSize: '10px', color: 'var(--color-dark-light)' }}>
                                  ({(p.pricePaid / p.qty).toFixed(2)} {settings.currency}/{p.unit})
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => {
                  const prodToEdit = selectedProductDetails;
                  setSelectedProductDetails(null);
                  handleOpenEditForm(prodToEdit);
                }}
              >
                <Edit size={16} />
                Modifier
              </button>
              <button 
                type="button"
                className="btn btn-primary" 
                style={{ flex: 1 }}
                onClick={() => {
                  setSelectedProductDetails(null);
                  if (onNavigate) {
                    onNavigate('Achats', { prefillProductId: selectedProductDetails.id });
                  }
                }}
              >
                Approvisionner (+ Achat)
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* --- DRAWER DE CORRECTION DE STOCK --- */}
      <Drawer
        title={stockCorrectionTarget ? `Corriger le stock — ${cleanProductName(stockCorrectionTarget.name)}` : "Corriger le stock"}
        isOpen={stockCorrectionTarget !== null}
        onClose={() => {
          if (!isSubmittingCorrection) {
            setStockCorrectionTarget(null);
            setCorrectionError(null);
          }
        }}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setStockCorrectionTarget(null);
                setCorrectionError(null);
              }}
              disabled={isSubmittingCorrection}
            >
              Annuler
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmStockCorrection}
              disabled={isSubmittingCorrection}
            >
              {isSubmittingCorrection ? 'Enregistrement...' : 'Valider la correction'}
            </button>
          </>
        }
      >
        {stockCorrectionTarget && (
          <form onSubmit={handleConfirmStockCorrection}>
            {correctionError && (
              <div style={{ marginBottom: '16px', padding: '12px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', color: '#991b1b', fontSize: '13px' }}>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>⚠️ Erreur</div>
                <div>{correctionError}</div>
              </div>
            )}

            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--color-light)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
              <div>Stock théorique actuel : <strong>{stockCorrectionTarget.stock.toFixed(2)} {stockCorrectionTarget.unit}</strong></div>
              {correctionRealQty.trim() !== '' && !isNaN(parseDecimalInput(correctionRealQty)) && (
                <div style={{ marginTop: '4px', color: 'var(--color-dark-light)' }}>
                  Écart calculé :{' '}
                  <strong style={{ color: parseDecimalInput(correctionRealQty) - stockCorrectionTarget.stock >= 0 ? 'var(--color-secondary)' : 'var(--color-danger)' }}>
                    {parseDecimalInput(correctionRealQty) - stockCorrectionTarget.stock >= 0 ? '+' : ''}
                    {(parseDecimalInput(correctionRealQty) - stockCorrectionTarget.stock).toFixed(2)} {stockCorrectionTarget.unit}
                  </strong>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Quantité réelle constatée ({stockCorrectionTarget.unit}) *</label>
              <input
                type="text"
                inputMode="decimal"
                className="form-input"
                required
                value={correctionRealQty}
                onChange={(e) => setCorrectionRealQty(e.target.value)}
                placeholder="Ex: 5.5"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Motif de la correction *</label>
              <select
                className="form-input"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
              >
                {STOCK_CORRECTION_REASONS.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Précision facultative</label>
              <input
                type="text"
                className="form-input"
                value={correctionCustomNote}
                onChange={(e) => setCorrectionCustomNote(e.target.value)}
                placeholder="Ex: Inventaire de fin de mois..."
              />
            </div>
          </form>
        )}
      </Drawer>

      {/* Drawer de Scan de Facture */}
      <Drawer
        title={isAiScannerOpen ? "Scanner une facture avec IA" : "Scanner et importer une facture"}
        isOpen={isInvoiceScannerOpen}
        onClose={() => setIsInvoiceScannerOpen(false)}
        width="1200px"
      >
        <InvoiceScanner
          onClose={() => setIsInvoiceScannerOpen(false)}
          onSave={handleSaveInvoicePurchases}
          products={products}
          stores={stores}
          settings={settings}
          useCloudOcr={isAiScannerOpen}
        />
      </Drawer>
    </div>
  );
};
