import React, { useState, useEffect } from 'react';
import { parseDecimalInput } from '../utils';
import {
  Plus,
  ChefHat,
  Trash2,
  TrendingUp,
  Package,
  Clock,
  List,
  Scale,
  Search,
  Camera,
  AlertTriangle,
  Check,
  ClipboardList,
  Download,
  ExternalLink,
  ShoppingCart,
  Copy,
  ShieldAlert
} from 'lucide-react';
import { dbService } from '../services/db';
import {
  convertUnits,
  convertUnitsWithInfo,
  normalizeUnit,
  areUnitsCompatible,
  formatQtyFr,
  cleanProductName,
  formatStock,
  getLogicalStockUnit,
} from '../utils/units';
import { generateUUID } from '../services/cloudDbService';
import { Product, Recipe, RecipeIngredient, RecipePackaging, Production } from '../types';
import { Drawer } from './Drawer';
import { RecipeScanner } from './RecipeScanner';
import { RecipeImporter } from './RecipeImporter';
import { ShoppingListDrawer } from './ShoppingListDrawer';
import { ProductDuplicateSuggestions } from './ProductDuplicateSuggestions';
import { findExactDuplicateProduct } from '../utils/productDuplicate';
import {
  calculateRecipeAllergens,
  formatAllergensList,
  ALLERGEN_DISCLAIMER,
  type UnverifiedAllergenItem,
} from '../utils/allergens';

interface RecipesProps {
  initialTriggerAdd?: boolean;
  initialViewRecipeId?: string;
  onNavigate?: (tab: string, extraData?: Record<string, unknown>) => void;
}

export const Recipes: React.FC<RecipesProps> = ({ initialTriggerAdd, initialViewRecipeId, onNavigate }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const settings = dbService.getSettings();

  const handleOpenProductEquivalence = (productId: string) => {
    if (onNavigate) {
      onNavigate('Produits', { editProductId: productId, focusEquivalence: true });
    }
  };

  // Recherche & Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [copiedAllergens, setCopiedAllergens] = useState(false);

  const handleCopyAllergens = (allergens: string[], unverifiedItems?: UnverifiedAllergenItem[]) => {
    const text = formatAllergensList(allergens, unverifiedItems);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedAllergens(true);
    setTimeout(() => setCopiedAllergens(false), 2000);
  };

  // États du Drawer de Formulaire de Recette
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  // Valeurs du formulaire principal de Recette
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPortions, setFormPortions] = useState(10);
  const [formYieldQty, setFormYieldQty] = useState(1);
  const [formYieldUnit, setFormYieldUnit] = useState('pièce');
  const [formPrepTime, setFormPrepTime] = useState<number | undefined>(30);
  const [formUtensilsNotes, setFormUtensilsNotes] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Ingrédients dynamiques dans le formulaire
  const [formIngredients, setFormIngredients] = useState<Omit<RecipeIngredient, 'id' | 'recipeId'>[]>([]);
  // Emballages dynamiques dans le formulaire
  const [formPackagings, setFormPackagings] = useState<Omit<RecipePackaging, 'id' | 'recipeId'>[]>([]);

  // États de la vue de détail interactive
  const [selectedRecipeDetails, setSelectedRecipeDetails] = useState<Recipe | null>(null);
  const [detailsIngredients, setDetailsIngredients] = useState<RecipeIngredient[]>([]);
  const [detailsPackagings, setDetailsPackagings] = useState<RecipePackaging[]>([]);
  const [detailsCost, setDetailsCost] = useState<ReturnType<typeof dbService.calculateRecipeCost> | null>(null);

  // États du simulateur de prix interactif dans le panneau de détails
  const [simMargin, setSimMargin] = useState(60); // % de marge cible
  const [simSellPrice, setSimSellPrice] = useState(0); // Prix de vente simulé
  const [simSalesCount, setSimSalesCount] = useState(20); // Quantité vendue pour journée type

  // États de l'import par photo et portions cible
  const [isScanViewOpen, setIsScanViewOpen] = useState(false);
  const [isImportViewOpen, setIsImportViewOpen] = useState(false);
  const [portionsCible, setPortionsCible] = useState(1);
  const [copiedCourses, setCopiedCourses] = useState(false);
  // Résultat du bouton "Cuisiner" dans le panneau détail
  const [detailCookResult, setDetailCookResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [detailCookError, setDetailCookError] = useState('');
  const [quickProductError, setQuickProductError] = useState<string | null>(null);

  // État du modal de confirmation de création rapide d'un produit
  const [quickAddModal, setQuickAddModal] = useState<{
    isOpen: boolean;
    name: string;
    unit: string;
    cost: number;
    source: 'details' | 'form';
    recipeIngredient?: RecipeIngredient;
    formIndex?: number;
  } | null>(null);

  // États de la Liste de courses (sélection de recettes pour prestation)
  const [planningSelections, setPlanningSelections] = useState<Map<string, number>>(new Map());
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);

  const toggleRecipeSelection = (recipe: Recipe, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlanningSelections(prev => {
      const next = new Map(prev);
      if (next.has(recipe.id)) {
        next.delete(recipe.id);
      } else {
        next.set(recipe.id, recipe.portions);
      }
      return next;
    });
  };

  const updatePlanningPortions = (recipeId: string, portions: number) => {
    setPlanningSelections(prev => {
      const next = new Map(prev);
      next.set(recipeId, Math.max(1, portions));
      return next;
    });
  };

  const clearAllSelections = () => {
    setPlanningSelections(new Map());
    setIsShoppingListOpen(false);
  };

  const planningSelectionsArray = Array.from(planningSelections.entries())
    .map(([id, portions]) => {
      const recipe = recipes.find(r => r.id === id);
      return recipe ? { recipe, portions } : null;
    })
    .filter((x): x is { recipe: Recipe; portions: number } => x !== null);

  const handleImportedRecipe = (recipe: Recipe, importedIngredients: Omit<RecipeIngredient, 'id' | 'recipeId'>[]) => {
    setIsImportViewOpen(false);
    
    setEditingRecipe(null);
    setFormName(recipe.name);
    setFormCategory(settings.recipeCategories.includes(recipe.category) ? recipe.category : settings.recipeCategories[0]);
    setFormDescription(recipe.description);
    setFormPortions(recipe.portions);
    setFormYieldQty(recipe.yieldQty);
    setFormYieldUnit(recipe.yieldUnit);
    setFormPrepTime(recipe.prepTimeMinutes || 30);
    setFormUtensilsNotes(recipe.utensilsNotes || '');
    setFormInstructions(recipe.instructions || '');
    setFormNotes(recipe.notes || '');
    setFormIsActive(recipe.isActive);

    // Mettre à jour l'editing recipe avec l'externalId et les autres métadonnées de l'API
    setEditingRecipe({
      id: '',
      name: recipe.name,
      category: recipe.category,
      description: recipe.description,
      portions: recipe.portions,
      yieldQty: recipe.yieldQty,
      yieldUnit: recipe.yieldUnit,
      stock: 0,
      prepTimeMinutes: recipe.prepTimeMinutes,
      utensilsNotes: recipe.utensilsNotes,
      notes: recipe.notes,
      isActive: recipe.isActive,
      photo: recipe.photo,
      sourceImage: recipe.sourceImage,
      externalId: recipe.externalId,
      videoUrl: recipe.videoUrl,
      sourceUrl: recipe.sourceUrl,
      rawExtractedText: recipe.rawExtractedText
    });

    // Liaison floue intelligente avec les produits existants du stock
    const mappedIngredients = importedIngredients.map(ing => {
      const normalName = ing.customName?.toLowerCase() || '';
      const matched = products.find(p => {
        const prodName = p.name.toLowerCase();
        return prodName.includes(normalName) || normalName.includes(prodName);
      });
      const normIngUnit = normalizeUnit(ing.unit) || ing.unit || 'pièce';
      const finalUnit = matched
        ? (areUnitsCompatible(normIngUnit, matched.unit)
            ? normIngUnit
            : (normalizeUnit(matched.unit) || matched.unit))
        : normIngUnit;
      
      return {
        ...ing,
        unit: finalUnit,
        productId: matched ? matched.id : undefined,
        customName: matched ? undefined : ing.customName,
        customCostPerUnit: matched ? undefined : 0
      };
    });

    setFormIngredients(mappedIngredients);
    setFormPackagings([]);
    setIsFormOpen(true);
  };

  const loadData = () => {
    setRecipes(dbService.getRecipes());
    const all = dbService.getProducts();
    setAllProducts(all);
    setProducts(all.filter(p => p.isActive));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  useEffect(() => {
    const handleDataSynced = () => {
      loadData();
      if (selectedRecipeDetails) {
        const updatedRecipe = dbService.getRecipe(selectedRecipeDetails.id) || selectedRecipeDetails;
        const costInfo = dbService.calculateRecipeCost(updatedRecipe.id);
        setSelectedRecipeDetails(updatedRecipe);
        setDetailsIngredients(dbService.getRecipeIngredients(updatedRecipe.id));
        setDetailsPackagings(dbService.getRecipePackagings(updatedRecipe.id));
        setDetailsCost(costInfo);
      }
    };
    window.addEventListener('marmicout-data-synced', handleDataSynced);
    return () => window.removeEventListener('marmicout-data-synced', handleDataSynced);
  }, [selectedRecipeDetails]);

  // Préparer l'ajout d'un ingrédient non lié dans le détail de la recette (avec confirmation préalable)
  const handleOpenAddIngredientFromDetails = (ri: RecipeIngredient) => {
    const rawName = ri.customName || 'Ingrédient';
    const cleaned = cleanProductName(rawName);
    const stockUnit = getLogicalStockUnit(ri.unit);
    setQuickAddModal({
      isOpen: true,
      name: cleaned,
      unit: stockUnit,
      cost: ri.customCostPerUnit || 0,
      source: 'details',
      recipeIngredient: ri
    });
  };

  // Préparer l'ajout d'un ingrédient non lié dans le formulaire de recette (avec confirmation préalable)
  const handleOpenAddIngredientFromForm = (index: number) => {
    const ing = formIngredients[index];
    if (!ing) return;
    const rawName = ing.customName || 'Ingrédient';
    const cleaned = cleanProductName(rawName);
    const stockUnit = getLogicalStockUnit(ing.unit);
    setQuickAddModal({
      isOpen: true,
      name: cleaned,
      unit: stockUnit,
      cost: ing.customCostPerUnit || 0,
      source: 'form',
      formIndex: index
    });
  };

  // Sélectionner ou relier un produit existant depuis les suggestions d'ajout rapide
  const handleSelectExistingProductFromQuick = async (existingProd: Product) => {
    if (!quickAddModal) return;
    if (!existingProd.isActive) {
      await dbService.saveProduct({ ...existingProd, isActive: true });
    }
    try {
      if (quickAddModal.source === 'details' && quickAddModal.recipeIngredient && selectedRecipeDetails) {
        setQuickProductError(null);
        const targetId = quickAddModal.recipeIngredient.id;
        const ings = dbService.getRecipeIngredients(selectedRecipeDetails.id).map(({ id, recipeId: _rId, ...rest }) => {
          void _rId;
          if (id === targetId) {
            return {
              ...rest,
              productId: existingProd.id,
              customName: undefined,
              customCostPerUnit: undefined
            };
          }
          return rest;
        });
        const packs = dbService.getRecipePackagings(selectedRecipeDetails.id).map(({ id: _id, recipeId: _rId, ...rest }) => {
          void _id;
          void _rId;
          return rest;
        });

        await dbService.saveRecipe(selectedRecipeDetails, ings, packs);
        loadData();
        const updatedRecipe = dbService.getRecipe(selectedRecipeDetails.id) || selectedRecipeDetails;
        const costInfo = dbService.calculateRecipeCost(updatedRecipe.id);
        setSelectedRecipeDetails(updatedRecipe);
        setDetailsIngredients(dbService.getRecipeIngredients(updatedRecipe.id));
        setDetailsPackagings(dbService.getRecipePackagings(updatedRecipe.id));
        setDetailsCost(costInfo);
      } else if (quickAddModal.source === 'form' && quickAddModal.formIndex !== undefined) {
        setSaveError(null);
        loadData();
        const updated = [...formIngredients];
        const idx = quickAddModal.formIndex;
        updated[idx] = {
          ...updated[idx],
          productId: existingProd.id,
          customName: undefined,
          customCostPerUnit: undefined
        };
        setFormIngredients(updated);
      }
      setQuickAddModal(null);
    } catch (err: unknown) {
      console.error('Erreur lors de la liaison du produit existant:', err);
      if (quickAddModal.source === 'details') {
        setQuickProductError(err instanceof Error ? err.message : "Échec de la liaison du produit à vos stocks.");
      } else {
        setSaveError(err instanceof Error ? err.message : "Échec de la liaison du produit à vos stocks.");
      }
    }
  };

  // Confirmer la création rapide du produit et relier l'ingrédient
  const handleConfirmQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddModal) return;
    const finalName = cleanProductName(quickAddModal.name).trim();
    if (!finalName) {
      alert("Le nom du produit ne peut pas être vide.");
      return;
    }

    // Détection de doublon exact
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
      avgPurchasePrice: Number((quickAddModal.cost || 0).toFixed(4)),
      mainStoreId: stores[0]?.id || '',
      notes: '',
      isActive: true
    };

    try {
      if (quickAddModal.source === 'details' && quickAddModal.recipeIngredient && selectedRecipeDetails) {
        setQuickProductError(null);
        await dbService.saveProduct(newProduct);

        const targetId = quickAddModal.recipeIngredient.id;
        const ings = dbService.getRecipeIngredients(selectedRecipeDetails.id).map(({ id, recipeId: _rId, ...rest }) => {
          void _rId;
          if (id === targetId) {
            return {
              ...rest,
              productId: newProduct.id,
              customName: undefined,
              customCostPerUnit: undefined
            };
          }
          return rest;
        });
        const packs = dbService.getRecipePackagings(selectedRecipeDetails.id).map(({ id: _id, recipeId: _rId, ...rest }) => {
          void _id;
          void _rId;
          return rest;
        });

        await dbService.saveRecipe(selectedRecipeDetails, ings, packs);
        loadData();
        const updatedRecipe = dbService.getRecipe(selectedRecipeDetails.id) || selectedRecipeDetails;
        const costInfo = dbService.calculateRecipeCost(updatedRecipe.id);
        setSelectedRecipeDetails(updatedRecipe);
        setDetailsIngredients(dbService.getRecipeIngredients(updatedRecipe.id));
        setDetailsPackagings(dbService.getRecipePackagings(updatedRecipe.id));
        setDetailsCost(costInfo);
      } else if (quickAddModal.source === 'form' && quickAddModal.formIndex !== undefined) {
        setSaveError(null);
        await dbService.saveProduct(newProduct);
        loadData();
        const updated = [...formIngredients];
        const idx = quickAddModal.formIndex;
        updated[idx] = {
          ...updated[idx],
          productId: newProduct.id,
          customName: undefined,
          customCostPerUnit: undefined
        };
        setFormIngredients(updated);
      }
      setQuickAddModal(null);
    } catch (err: unknown) {
      console.error('Erreur lors de la création rapide du produit:', err);
      if (quickAddModal.source === 'details') {
        setQuickProductError(err instanceof Error ? err.message : "Échec de l'ajout du produit à vos stocks.");
      } else {
        setSaveError(err instanceof Error ? err.message : "Échec de l'ajout du produit à vos stocks.");
      }
    }
  };

  // Synchroniser le prix de vente simulé au chargement d'un détail de recette
  const handleOpenDetails = (recipe: Recipe) => {
    const costInfo = dbService.calculateRecipeCost(recipe.id);
    setSelectedRecipeDetails(recipe);
    setDetailsIngredients(dbService.getRecipeIngredients(recipe.id));
    setDetailsPackagings(dbService.getRecipePackagings(recipe.id));
    setDetailsCost(costInfo);

    // Si la recette est dans les sélections de planification, utiliser ces portions
    const plannedPortions = planningSelections.get(recipe.id);
    setPortionsCible(plannedPortions ?? recipe.portions);
    setSimMargin(settings.defaultTargetMargin);
    setSimSellPrice(costInfo.suggestedSellingPrice);
    setCopiedCourses(false);
    setDetailCookResult('idle');
    setDetailCookError('');
    setQuickProductError(null);
  };

  // Cuisiner depuis le panneau détail : crée une vraie production et déduit les stocks
  const handleCookFromDetail = async () => {
    if (!selectedRecipeDetails) return;
    const costInfo = dbService.calculateRecipeCost(selectedRecipeDetails.id);
    const factor = portionsCible / (selectedRecipeDetails.portions || 1);
    const prod: Production = {
      id: 'PR_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      date: new Date().toISOString().split('T')[0],
      recipeId: selectedRecipeDetails.id,
      portionsProduced: portionsCible,
      calculatedCost: Number((costInfo.totalCost * factor).toFixed(2))
    };
    const result = await dbService.addProduction(prod);
    if (result.success) {
      setDetailCookResult('success');
      loadData();
    } else {
      setDetailCookResult('error');
      setDetailCookError(result.error || 'Erreur inconnue');
    }
  };

  // Mettre à jour le prix de vente quand la marge change dans la simulation
  const handleMarginChange = (margin: number) => {
    setSimMargin(margin);
    if (detailsCost && margin < 100) {
      const newPrice = detailsCost.costPerPortion / (1 - (margin / 100));
      setSimSellPrice(Number(newPrice.toFixed(2)));
    }
  };

  // Mettre à jour la marge quand le prix de vente change dans la simulation
  const handleSellPriceChange = (price: number) => {
    setSimSellPrice(price);
    if (detailsCost && price > 0) {
      const margin = ((price - detailsCost.costPerPortion) / price) * 100;
      setSimMargin(Number(margin.toFixed(0)));
    }
  };

  // Formulaire d'ajout
  const handleOpenAddForm = () => {
    setEditingRecipe(null);
    setFormName('');
    setFormCategory(settings.recipeCategories[0] || 'Tarte');
    setFormDescription('');
    setFormPortions(8);
    setFormYieldQty(1);
    setFormYieldUnit('pièce');
    setFormPrepTime(30);
    setFormUtensilsNotes('');
    setFormInstructions('');
    setFormNotes('');
    setFormIsActive(true);
    setFormIngredients([]);
    setFormPackagings([]);
    setIsFormOpen(true);
  };

  // Déclenchements initiaux
  useEffect(() => {
    if (initialTriggerAdd) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleOpenAddForm();
    } else if (initialViewRecipeId) {
      const r = dbService.getRecipe(initialViewRecipeId);
      if (r) handleOpenDetails(r);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTriggerAdd, initialViewRecipeId]);

  // Formulaire d'édition
  const handleOpenEditForm = (recipe: Recipe, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRecipe(recipe);
    setFormName(recipe.name);
    setFormCategory(recipe.category);
    setFormDescription(recipe.description);
    setFormPortions(recipe.portions);
    setFormYieldQty(recipe.yieldQty);
    setFormYieldUnit(recipe.yieldUnit);
    setFormPrepTime(recipe.prepTimeMinutes);
    setFormUtensilsNotes(recipe.utensilsNotes || '');
    setFormInstructions(recipe.instructions || '');
    setFormNotes(recipe.notes || '');
    setFormIsActive(recipe.isActive);

    // Charger les ingrédients et emballages associés
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ings = dbService.getRecipeIngredients(recipe.id).map(({ id: _id, recipeId: _recipeId, ...rest }) => ({
      ...rest,
      unit: normalizeUnit(rest.unit) || rest.unit,
    }));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const packs = dbService.getRecipePackagings(recipe.id).map(({ id: _id, recipeId: _recipeId, ...rest }) => rest);
    
    setFormIngredients(ings);
    setFormPackagings(packs);
    setIsFormOpen(true);
  };

  // Ingrédients dynamiques dans le formulaire
  const handleAddIngredientLine = () => {
    setFormIngredients([...formIngredients, {
      customName: 'Nouvel ingrédient',
      qtyUsed: 100,
      unit: 'g',
      customCostPerUnit: 0
    }]);
  };

  const handleRemoveIngredientLine = (index: number) => {
    setFormIngredients(formIngredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: string, value: string | number) => {
    const updated = [...formIngredients];
    
    if (field === 'productId') {
      if (value === "") {
        // Devient libre / non lié
        updated[index] = {
          ...updated[index],
          productId: undefined,
          customName: updated[index].customName || 'Nouvel ingrédient',
          customCostPerUnit: updated[index].customCostPerUnit || 0
        };
      } else {
        // Devient lié au stock : garder l'unité de la recette si compatible, sinon proposer celle du produit
        const prod = products.find(p => p.id === value);
        const currentUnit = normalizeUnit(updated[index].unit) || updated[index].unit;
        const prodUnit = prod ? (normalizeUnit(prod.unit) || prod.unit) : currentUnit;
        updated[index] = {
          ...updated[index],
          productId: value as string,
          customName: undefined,
          customCostPerUnit: undefined,
          unit: prod ? (areUnitsCompatible(currentUnit, prodUnit) ? currentUnit : prodUnit) : currentUnit
        };
      }
    } else if (field === 'unit') {
      updated[index] = { ...updated[index], unit: normalizeUnit(String(value)) || String(value) };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }

    setFormIngredients(updated);
  };

  // Emballages dynamiques dans le formulaire
  const handleAddPackagingLine = () => {
    // Proposer par défaut le premier produit de catégorie 'Emballage' ou taper à la main
    const embProduct = products.find(p => p.category.toLowerCase() === 'emballage');
    setFormPackagings([...formPackagings, {
      name: embProduct ? embProduct.name : 'Barquette Carton',
      qtyUsed: 1,
      costPerUnit: embProduct ? embProduct.avgPurchasePrice : 0.20
    }]);
  };

  const handleRemovePackagingLine = (index: number) => {
    setFormPackagings(formPackagings.filter((_, i) => i !== index));
  };

  const handlePackagingChange = (index: number, field: string, value: string | number) => {
    const updated = [...formPackagings];
    updated[index] = { ...updated[index], [field]: value };

    // Si on tape un nom qui matche un produit, on charge son prix moyen
    if (field === 'name' && typeof value === 'string') {
      const prod = products.find(p => p.name.toLowerCase() === value.toLowerCase() || p.id === value);
      if (prod) {
        updated[index].costPerUnit = prod.avgPurchasePrice;
      }
    }

    setFormPackagings(updated);
  };

  // Enregistrer la recette complète
  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Veuillez donner un nom à la recette");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const recipeId = (editingRecipe && editingRecipe.id) 
      ? editingRecipe.id 
      : (editingRecipe?.externalId ? 'R_API_' + editingRecipe.externalId : 'R_' + Date.now());

    const newRecipe: Recipe = {
      id: recipeId,
      name: formName.trim(),
      category: formCategory,
      description: formDescription.trim(),
      portions: formPortions,
      yieldQty: formYieldQty,
      yieldUnit: formYieldUnit,
      stock: editingRecipe ? editingRecipe.stock : 0, // Conserver le stock produit fini existant
      prepTimeMinutes: formPrepTime,
      utensilsNotes: formUtensilsNotes.trim() || undefined,
      instructions: formInstructions.trim() || undefined,
      notes: formNotes.trim() || undefined,
      isActive: formIsActive,
      // Métadonnées d'importation
      photo: editingRecipe?.photo || undefined,
      sourceImage: editingRecipe?.sourceImage || undefined,
      externalId: editingRecipe?.externalId || undefined,
      videoUrl: editingRecipe?.videoUrl || undefined,
      sourceUrl: editingRecipe?.sourceUrl || undefined,
      rawExtractedText: editingRecipe?.rawExtractedText || undefined
    };

    // Nettoyer les ingrédients pour n'enregistrer que les champs pertinents
    const cleanedIngredients = formIngredients.map(ing => ({
      productId: ing.productId || undefined,
      customName: ing.productId ? undefined : (ing.customName || 'Ingrédient'),
      qtyUsed: ing.qtyUsed,
      unit: normalizeUnit(ing.unit) || ing.unit,
      originalQtyUsed: ing.qtyUsed,
      customCostPerUnit: ing.productId ? undefined : (ing.customCostPerUnit || 0)
    }));

    try {
      await dbService.saveRecipe(newRecipe, cleanedIngredients, formPackagings);
      setIsFormOpen(false);
      setSaveError(null);
      loadData();
      
      // Si on visualisait le détail, recharger le détail
      if (selectedRecipeDetails && selectedRecipeDetails.id === recipeId) {
        handleOpenDetails(newRecipe);
      }
    } catch (err: unknown) {
      console.error('Erreur sauvegarde recette:', err);
      setSaveError(err instanceof Error ? err.message : "Échec de l'enregistrement dans le Cloud. Vos données sont conservées.");
    } finally {
      setIsSaving(false);
    }
  };

  // Supprimer une recette
  const handleDeleteRecipe = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette recette et ses ingrédients ?")) {
      dbService.deleteRecipe(id);
      setSelectedRecipeDetails(null);
      loadData();
    }
  };

  // Filtrer la liste des recettes
  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '' || r.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (isScanViewOpen) {
    return (
      <RecipeScanner
        onClose={() => setIsScanViewOpen(false)}
        onSave={(newRecipe, newIngredients, newPackagings) => {
          dbService.saveRecipe(newRecipe, newIngredients, newPackagings);
          setIsScanViewOpen(false);
          loadData();
        }}
        products={products}
        settings={settings}
      />
    );
  }

  if (isImportViewOpen) {
    return (
      <RecipeImporter
        onClose={() => setIsImportViewOpen(false)}
        onImport={handleImportedRecipe}
        existingRecipes={recipes}
      />
    );
  }

  return (
    <div>
      {/* En-tête */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Recettes & Coûts de Revient</h1>
          <p className="page-subtitle">Calculez le coût exact de vos plats et déterminez vos prix de vente conseillés</p>
        </div>
        <div className="actions-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setIsImportViewOpen(true)}>
            <Download size={18} style={{ color: 'var(--color-primary)' }} />
            Importer une recette
          </button>
          <button className="btn btn-secondary" onClick={() => setIsScanViewOpen(true)}>
            <Camera size={18} style={{ color: 'var(--color-primary)' }} />
            Numériser une recette
          </button>
          <button className="btn btn-primary" onClick={handleOpenAddForm}>
            <Plus size={18} />
            Créer une recette
          </button>
        </div>
      </div>

      {/* Recherche et filtrage */}
      <div className="card filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher une recette par nom..."
            className="form-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <select 
          className="select-filter"
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">Toutes les catégories</option>
          {settings.recipeCategories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Grille des recettes */}
      {filteredRecipes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-dark-light)' }}>
          <ChefHat size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <p>Aucune recette trouvée. Lancez-vous en cliquant sur "Créer une recette" !</p>
        </div>
      ) : (
        <div className="grid-cols-1-2-3">
          {filteredRecipes.map(r => {
            const costInfo = dbService.calculateRecipeCost(r.id);
            const rIngredients = dbService.getRecipeIngredients(r.id);
            const allergenInfo = calculateRecipeAllergens(rIngredients, new Map(products.map(p => [p.id, p])));
            const isSelected = planningSelections.has(r.id);
            const selectedPortions = planningSelections.get(r.id) ?? r.portions;
            
            return (
              <div 
                key={r.id} 
                className="card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  borderTop: `4px solid ${isSelected ? 'var(--color-primary)' : costInfo.marginPercent < 45 ? 'var(--color-danger)' : 'var(--color-secondary)'}`,
                  outline: isSelected ? '2px solid var(--color-primary)' : 'none',
                  outlineOffset: '-2px',
                  transition: 'outline 0.15s ease, border-top-color 0.15s ease',
                  position: 'relative'
                }}
                onClick={() => handleOpenDetails(r)}
              >
                {/* Checkbox de sélection prestation — toujours visible */}
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 2
                  }}
                  onClick={e => toggleRecipeSelection(r, e)}
                >
                  <div style={{
                    width: '24px', height: '24px',
                    borderRadius: '6px',
                    border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    backgroundColor: isSelected ? 'var(--color-primary)' : 'rgba(255,255,255,0.9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.15s ease'
                  }}>
                    {isSelected && <Check size={13} style={{ color: '#fff' }} />}
                  </div>
                </div>

                {/* Ligne portions si sélectionnée */}
                {isSelected && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    marginBottom: '10px',
                    backgroundColor: 'var(--color-primary-light)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(var(--color-primary-rgb), 0.2)'
                  }}>
                    <ShoppingCart size={13} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-primary)', flex: 1 }}>Prestation</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-dark-light)' }}>Portions :</span>
                    <input
                      type="number"
                      min="1"
                      value={selectedPortions}
                      onClick={e => e.stopPropagation()}
                      onChange={e => updatePlanningPortions(r.id, parseDecimalInput(e.target.value))}
                      style={{
                        width: '54px',
                        height: '26px',
                        border: '1px solid var(--color-primary)',
                        borderRadius: '4px',
                        textAlign: 'center',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: 'var(--color-primary)',
                        padding: '0 4px',
                        backgroundColor: '#fff'
                      }}
                    />
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingRight: '36px' }}>
                    <span className="badge badge-info">{r.category}</span>
                    <span className="badge badge-success" style={{ backgroundColor: 'var(--color-light)', color: 'var(--color-dark)' }}>
                      Stock fini : {r.stock} u
                    </span>
                  </div>
                  
                  <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>{r.name}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-dark-light)', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {r.description || 'Aucune description.'}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: 'var(--color-dark-light)', marginBottom: '16px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {r.prepTimeMinutes || 'N/C'} min
                    </span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Scale size={12} /> {r.portions} portion(s)
                    </span>
                  </div>

                  {/* Badges allergènes dans la carte */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', marginBottom: '8px' }}>
                    {!allergenInfo.isFullyVerified && (
                      <span
                        className="badge badge-warning"
                        style={{ fontSize: '10px', padding: '1px 6px', fontWeight: '700' }}
                        title="Allergènes à vérifier : ingrédients non liés au stock ou non renseignés"
                      >
                        ⚠️ Allergènes à vérifier
                      </span>
                    )}
                    {allergenInfo.allergens.map(a => (
                      <span
                        key={a}
                        className="badge"
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          border: '1px solid #fde68a',
                          fontWeight: '600'
                        }}
                      >
                        {a}
                      </span>
                    ))}
                    {allergenInfo.isFullyVerified && allergenInfo.allergens.length === 0 && (
                      <span
                        className="badge"
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          backgroundColor: '#ecfdf5',
                          color: '#065f46',
                          border: '1px solid #a7f3d0'
                        }}
                      >
                        Sans allergène
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--color-dark-light)' }}>Coût / Port.</div>
                    <strong style={{ fontSize: '16px' }}>
                      {costInfo.isApproximate ? '≈ ' : ''}{costInfo.costPerPortion.toFixed(2)} {settings.currency}/portion
                    </strong>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: 'var(--color-dark-light)' }}>Prix Vente Conseillé</div>
                    <strong style={{ fontSize: '16px', color: 'var(--color-secondary)' }}>
                      {costInfo.isApproximate ? '≈ ' : ''}{costInfo.suggestedSellingPrice.toFixed(2)} {settings.currency}/portion
                    </strong>
                  </div>

                  {costInfo.hasIncompatibleUnits && (
                    <div style={{ width: '100%', fontSize: '11px', fontWeight: '700', color: 'var(--color-danger)', backgroundColor: 'rgba(220, 38, 38, 0.08)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                      ⚠️ Unités incompatibles dans les ingrédients
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Barre flottante — apparaît dès qu'une recette est cochée */}
      {planningSelections.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 800,
          backgroundColor: 'var(--color-primary)',
          color: '#fff',
          borderRadius: '50px',
          padding: '14px 20px 14px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          minWidth: '340px',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingCart size={20} />
            <span style={{ fontWeight: '600', fontSize: '14px' }}>
              {planningSelections.size} recette(s) · {planningSelectionsArray.reduce((s, x) => s + x.portions, 0)} portions
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={clearAllSelections}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                border: 'none',
                borderRadius: '50px',
                padding: '7px 14px',
                fontWeight: '600',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Tout effacer
            </button>
            <button
              type="button"
              onClick={() => setIsShoppingListOpen(true)}
              style={{
                backgroundColor: '#fff',
                color: 'var(--color-primary)',
                border: 'none',
                borderRadius: '50px',
                padding: '7px 18px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Voir la liste de courses →
            </button>
          </div>
        </div>
      )}

      {/* Drawer Liste de courses */}
      <ShoppingListDrawer
        selections={planningSelectionsArray}
        isOpen={isShoppingListOpen}
        onClose={() => setIsShoppingListOpen(false)}
        onUpdatePortions={updatePlanningPortions}
        onDataChanged={() => {
          loadData();
          if (selectedRecipeDetails) {
            const updatedRecipe = dbService.getRecipe(selectedRecipeDetails.id) || selectedRecipeDetails;
            const costInfo = dbService.calculateRecipeCost(updatedRecipe.id);
            setSelectedRecipeDetails(updatedRecipe);
            setDetailsIngredients(dbService.getRecipeIngredients(updatedRecipe.id));
            setDetailsPackagings(dbService.getRecipePackagings(updatedRecipe.id));
            setDetailsCost(costInfo);
          }
        }}
        onCookDone={() => {
          loadData();
          clearAllSelections();
        }}
      />

      {/* --- DRAWER FORMULAIRE (AJOUT / MODIFICATION DE RECETTE) --- */}
      <Drawer
        title={editingRecipe ? `Modifier ${editingRecipe.name}` : "Créer une recette"}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        zIndex={700}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)} disabled={isSaving}>Annuler</button>
            <button type="button" className="btn btn-primary" onClick={handleSaveRecipe} disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : saveError ? 'Réessayer' : 'Sauvegarder'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveRecipe}>
          {saveError && (
            <div style={{ marginBottom: '16px', padding: '12px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', color: '#991b1b', fontSize: '13px' }}>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>⚠️ Échec de l'enregistrement dans le Cloud</div>
              <div>{saveError}</div>
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#b91c1c' }}>Vos saisies ont été conservées intactes. Vous pouvez corriger ou cliquer sur Réessayer.</div>
            </div>
          )}
          
          <h4 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px', marginBottom: '12px' }}>
            Informations générales
          </h4>

          <div className="form-group">
            <label className="form-label">Nom du plat ou produit fini *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ex: Tarte aux Framboises, Confiture d'Oranges"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Catégorie</label>
              <select className="form-input" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                {settings.recipeCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Temps de préparation (minutes)</label>
              <input
                type="number"
                className="form-input"
                min="0"
                value={formPrepTime || ''}
                onChange={(e) => setFormPrepTime(e.target.value ? parseDecimalInput(e.target.value) : undefined)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description succincte</label>
            <textarea
              className="form-input"
              style={{ height: '60px' }}
              placeholder="Ex: Pâte sablée croustillante avec des framboises fraîches..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nombre de portions obtenues (Rendement lot) *</label>
              <input
                type="number"
                min="1"
                className="form-input"
                required
                value={formPortions}
                onChange={(e) => setFormPortions(parseDecimalInput(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ display: 'none' }}>
              {/* Rendement alternatif facultatif masqué pour simplifier */}
            </div>
          </div>

          {/* SECTION DES INGRÉDIENTS DYNAMIQUES */}
          <h4 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px', marginTop: '24px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Ingrédients</span>
            <button type="button" className="btn btn-secondary" style={{ height: '28px', padding: '0 8px', fontSize: '11px' }} onClick={handleAddIngredientLine}>
              + Ajouter ingrédient
            </button>
          </h4>

          {formIngredients.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--color-dark-light)', fontStyle: 'italic', marginBottom: '16px' }}>
              Aucun ingrédient ajouté pour l'instant. Utilisez le bouton ci-dessus.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {formIngredients.map((ing, idx) => {
                const isLinked = ing.productId !== undefined && ing.productId !== "";
                const selectedProd = products.find(p => p.id === ing.productId);
                const normIngUnit = normalizeUnit(ing.unit) || ing.unit || 'g';
                const unitOptions = settings.units.includes(normIngUnit)
                  ? settings.units
                  : [normIngUnit, ...settings.units];
                
                // Calcul coût ligne à la volée dans le formulaire
                const conv = isLinked && selectedProd
                  ? convertUnitsWithInfo(ing.qtyUsed, normIngUnit, selectedProd.unit, selectedProd)
                  : { value: ing.qtyUsed, approximate: false };
                const isIncompatible = isLinked && selectedProd && conv.value === null;
                let lineCost: number | null = 0;
                if (isLinked && selectedProd) {
                  lineCost = conv.value !== null ? conv.value * selectedProd.avgPurchasePrice : null;
                } else if (ing.customCostPerUnit) {
                  lineCost = ing.qtyUsed * ing.customCostPerUnit;
                }

                return (
                  <div 
                    key={idx} 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px', 
                      padding: '12px', 
                      backgroundColor: isIncompatible ? 'rgba(220, 38, 38, 0.05)' : (isLinked ? 'rgba(74, 155, 120, 0.04)' : 'rgba(242, 85, 34, 0.03)'), 
                      borderRadius: 'var(--radius-md)', 
                      border: `1px solid ${isIncompatible ? 'var(--color-danger)' : (isLinked ? 'var(--color-secondary-light)' : 'rgba(242, 85, 34, 0.15)')}` 
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {/* Nom de l'ingrédient ou produit */}
                      {isLinked && selectedProd ? (
                        <div style={{ flex: 2, fontSize: '13px', fontWeight: '700', color: 'var(--color-dark)', height: '38px', lineHeight: '38px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          📦 {selectedProd.name}
                        </div>
                      ) : (
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 2, height: '38px', padding: '0 8px', fontWeight: '600' }}
                          required
                          value={ing.customName || ''}
                          onChange={(e) => handleIngredientChange(idx, 'customName', e.target.value)}
                          placeholder="Nom de l'ingrédient"
                        />
                      )}

                      {/* Quantité */}
                      <input
                        type="number"
                        step="any"
                        className="form-input"
                        style={{ width: '65px', height: '38px', padding: '0 4px', textAlign: 'center' }}
                        required
                        min="0.001"
                        value={ing.qtyUsed}
                        onChange={(e) => handleIngredientChange(idx, 'qtyUsed', parseDecimalInput(e.target.value))}
                      />

                      {/* Unité */}
                      <select
                        className="form-input"
                        style={{ width: '68px', height: '38px', padding: '0 4px' }}
                        value={normIngUnit}
                        onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                      >
                        {unitOptions.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>

                      {/* Coût de ligne calculé */}
                      <span style={{ fontSize: '12px', fontWeight: '600', minWidth: '62px', textAlign: 'right', color: isIncompatible ? 'var(--color-danger)' : 'inherit' }}>
                        {lineCost === null ? '—' : `${conv.approximate ? '≈ ' : ''}${lineCost.toFixed(2)} ${settings.currency}`}
                      </span>

                      {/* Supprimer ligne */}
                      <button
                        type="button"
                        className="btn btn-danger btn-icon-only"
                        style={{ height: '38px', width: '38px' }}
                        onClick={() => handleRemoveIngredientLine(idx)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Liaison de stock */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px dashed var(--color-border)', paddingTop: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-dark-light)', fontWeight: '600' }}>
                        Liaison stock :
                      </span>
                      
                      <select
                        className="form-input"
                        style={{ flex: 1, height: '30px', padding: '0 4px', fontSize: '12px', minWidth: '160px' }}
                        value={ing.productId || ""}
                        onChange={(e) => handleIngredientChange(idx, 'productId', e.target.value)}
                      >
                        <option value="">-- Libre (non lié au stock) --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {cleanProductName(p.name)} ({p.avgPurchasePrice.toFixed(2).replace('.', ',')} {settings.currency}/{normalizeUnit(p.unit) || p.unit})
                          </option>
                        ))}
                      </select>

                      {/* Saisie coût estimé si libre */}
                      {!isLinked && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>Coût est. :</span>
                            <input
                              type="number"
                              step="any"
                              className="form-input"
                              style={{ width: '55px', height: '30px', padding: '0 4px', fontSize: '12px', textAlign: 'center' }}
                              value={ing.customCostPerUnit || 0}
                              onChange={(e) => handleIngredientChange(idx, 'customCostPerUnit', parseDecimalInput(e.target.value))}
                            />
                            <span style={{ fontSize: '11px' }}>{settings.currency}/{normIngUnit}</span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ height: '30px', padding: '0 8px', fontSize: '11px', whiteSpace: 'nowrap' }}
                            onClick={() => handleOpenAddIngredientFromForm(idx)}
                          >
                            <Plus size={12} /> Ajouter à mes produits
                          </button>
                        </>
                      )}

                      {isLinked && selectedProd && (
                        <span className="badge badge-success" style={{ fontSize: '10px', height: '24px', lineHeight: '20px' }}>
                          PMP : {selectedProd.avgPurchasePrice.toFixed(2).replace('.', ',')} {settings.currency}/{normalizeUnit(selectedProd.unit) || selectedProd.unit}
                        </span>
                      )}
                    </div>

                    {/* Détail du calcul ou avertissement d'unités incompatibles */}
                    <div style={{ fontSize: '12px', marginTop: '2px' }}>
                      {isIncompatible && selectedProd ? (
                        <div style={{ color: 'var(--color-danger)', fontWeight: '700', backgroundColor: 'rgba(220, 38, 38, 0.08)', padding: '6px 8px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                          <span>⚠️ Unités incompatibles : recette en {normIngUnit}, stock en {normalizeUnit(selectedProd.unit) || selectedProd.unit}</span>
                          <button
                            type="button"
                            onClick={() => handleOpenProductEquivalence(selectedProd.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '11px', fontWeight: '600', padding: 0 }}
                          >
                            Préciser l'équivalence
                          </button>
                        </div>
                      ) : isLinked && selectedProd && lineCost !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ color: 'var(--color-dark-light)', fontWeight: '500' }}>
                            {formatQtyFr(ing.qtyUsed)} {normIngUnit} × {selectedProd.avgPurchasePrice.toFixed(2).replace('.', ',')} {settings.currency}/{normalizeUnit(selectedProd.unit) || selectedProd.unit} {conv.approximate ? '≈' : '='} <strong style={{ color: 'var(--color-dark)' }}>{conv.approximate ? '≈ ' : ''}{lineCost.toFixed(2).replace('.', ',')} {settings.currency}</strong>
                          </span>
                          {conv.approximate && (
                            <button
                              type="button"
                              onClick={() => handleOpenProductEquivalence(selectedProd.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '11px', fontWeight: '600', padding: 0 }}
                            >
                              Préciser l'équivalence
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-dark-light)', fontWeight: '500' }}>
                          {formatQtyFr(ing.qtyUsed)} {normIngUnit} × {(ing.customCostPerUnit || 0).toFixed(2).replace('.', ',')} {settings.currency}/{normIngUnit} = <strong style={{ color: 'var(--color-dark)' }}>{(lineCost || 0).toFixed(2).replace('.', ',')} {settings.currency}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SECTION EMBALLAGES DYNAMIQUES */}
          <h4 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px', marginTop: '24px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Emballages & Récipients (Sachets, pots, étiquettes...)</span>
            <button type="button" className="btn btn-secondary" style={{ height: '28px', padding: '0 8px', fontSize: '11px' }} onClick={handleAddPackagingLine}>
              + Ajouter emballage
            </button>
          </h4>

          {formPackagings.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--color-dark-light)', fontStyle: 'italic', marginBottom: '16px' }}>
              Aucun emballage ou contenant ajouté.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {formPackagings.map((pack, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px', backgroundColor: 'var(--color-light)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                  
                  {/* Soit ils tapent à la main, soit ils choisissent un produit */}
                  <input
                    type="text"
                    className="form-input"
                    style={{ flex: 2, height: '38px', padding: '0 8px' }}
                    placeholder="Ex: Pot verre 375ml"
                    required
                    value={pack.name}
                    onChange={(e) => handlePackagingChange(idx, 'name', e.target.value)}
                    list="packaging-suggestions"
                  />
                  
                  <datalist id="packaging-suggestions">
                    {products.filter(p => p.category.toLowerCase() === 'emballage').map(p => (
                      <option key={p.id} value={p.name} />
                    ))}
                  </datalist>

                  <input
                    type="number"
                    className="form-input"
                    style={{ width: '60px', height: '38px', padding: '0 8px', textAlign: 'center' }}
                    required
                    min="1"
                    value={pack.qtyUsed}
                    onChange={(e) => handlePackagingChange(idx, 'qtyUsed', parseDecimalInput(e.target.value))}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', width: '80px' }}>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      style={{ width: '55px', height: '38px', padding: '0 4px', textAlign: 'center' }}
                      required
                      min="0"
                      value={pack.costPerUnit}
                      onChange={(e) => handlePackagingChange(idx, 'costPerUnit', parseDecimalInput(e.target.value))}
                    />
                    <span style={{ fontSize: '12px' }}>€/u</span>
                  </div>

                  <span style={{ fontSize: '12px', fontWeight: '600', width: '50px', textAlign: 'right' }}>
                    {(pack.qtyUsed * pack.costPerUnit).toFixed(2)}€
                  </span>

                  <button
                    type="button"
                    className="btn btn-danger btn-icon-only"
                    style={{ height: '38px', width: '38px' }}
                    onClick={() => handleRemovePackagingLine(idx)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* MATÉRIEL ET NOTES DE FABRICATION */}
          <h4 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px', marginTop: '24px', marginBottom: '12px' }}>
            Étapes & Fabrication (Informatif)
          </h4>

          <div className="form-group">
            <label className="form-label">Instructions / Étapes de préparation</label>
            <textarea
              className="form-input"
              style={{ height: '140px' }}
              placeholder="Saisissez les étapes de préparation de la recette..."
              value={formInstructions}
              onChange={(e) => setFormInstructions(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ustensiles requis</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Robot pâtissier, moule à manquer, douille 12..."
              value={formUtensilsNotes}
              onChange={(e) => setFormUtensilsNotes(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Conseils de fabrication / notes</label>
            <textarea
              className="form-input"
              style={{ height: '80px' }}
              placeholder="Notes de cuisson, de mélange, tour de main..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
            />
          </div>

        </form>
      </Drawer>

      {/* --- DRAWER DE DÉTAIL D'UNE RECETTE (INTERACTIF / PRESTATIONS DE CALCUL) --- */}
      <Drawer
        title={selectedRecipeDetails?.name || "Détails de la Recette"}
        isOpen={selectedRecipeDetails !== null}
        onClose={() => setSelectedRecipeDetails(null)}
      >
        {selectedRecipeDetails && detailsCost && (
          <div>
            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                <span className="badge badge-info">{selectedRecipeDetails.category}</span>
                <span style={{ fontSize: '12px', color: 'var(--color-dark-light)' }}>
                  Rendement : {selectedRecipeDetails.portions} portions ({selectedRecipeDetails.yieldQty} {selectedRecipeDetails.yieldUnit})
                </span>
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>{selectedRecipeDetails.name}</h2>
              {selectedRecipeDetails.description && (
                <p style={{ color: 'var(--color-dark-light)', fontSize: '13px', marginBottom: '16px' }}>{selectedRecipeDetails.description}</p>
              )}

              {/* Raccourci de production — crée vraiment une production */}
              {detailsCost.hasIncompatibleUnits && (
                <div style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-danger-light)',
                  border: '1px solid rgba(255,75,75,0.3)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '12px',
                  fontSize: '12px',
                  color: 'var(--color-danger)',
                  fontWeight: '600'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <AlertTriangle size={16} />
                    <span>Impossible de cuisiner : unités incompatibles</span>
                  </div>
                  <div style={{ fontWeight: '500' }}>
                    {detailsCost.incompatibleDetails.map((msg, i) => (
                      <div key={i}>• {msg}</div>
                    ))}
                  </div>
                </div>
              )}
              {detailCookResult === 'success' ? (
                <div style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-secondary-light)',
                  border: '1px solid rgba(50,180,100,0.3)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  color: 'var(--color-secondary)',
                  fontWeight: '600'
                }}>
                  <Check size={20} />
                  ✅ {portionsCible} portions produites ! Stock déduit avec succès.
                  <button
                    type="button"
                    onClick={() => setDetailCookResult('idle')}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
                  >×</button>
                </div>
              ) : detailCookResult === 'error' ? (
                <div style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-danger-light)',
                  border: '1px solid rgba(255,75,75,0.2)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  fontSize: '12px',
                  color: 'var(--color-danger)',
                  whiteSpace: 'pre-line'
                }}>
                  ❌ {detailCookError}
                  <button
                    type="button"
                    onClick={() => setDetailCookResult('idle')}
                    style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontWeight: '700' }}
                  >Réessayer</button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-success"
                  disabled={detailsCost.hasIncompatibleUnits}
                  style={{
                    width: '100%',
                    marginBottom: '16px',
                    opacity: detailsCost.hasIncompatibleUnits ? 0.55 : 1,
                    cursor: detailsCost.hasIncompatibleUnits ? 'not-allowed' : 'pointer'
                  }}
                  onClick={handleCookFromDetail}
                  title={detailsCost.hasIncompatibleUnits ? 'Unités incompatibles : corrigez les unités de la recette ou du stock' : undefined}
                >
                  <ChefHat size={18} />
                  {detailsCost.hasIncompatibleUnits
                    ? 'Cuisiner bloqué (unités incompatibles)'
                    : `Cuisiner ${portionsCible} portion(s) — Déduire du stock`}
                </button>
              )}

              {/* SÉLECTEUR DE PORTIONS CIBLE POUR MISE À L'ÉCHELLE */}
              <div style={{ padding: '12px', backgroundColor: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px dashed var(--color-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Scale size={16} /> Mise à l'échelle (portions) :</span>
                  <input
                    type="number"
                    min="1"
                    value={portionsCible}
                    onChange={e => setPortionsCible(Math.max(1, parseDecimalInput(e.target.value)))}
                    style={{
                      width: '72px',
                      height: '32px',
                      border: '2px solid var(--color-primary)',
                      borderRadius: '6px',
                      textAlign: 'center',
                      fontSize: '15px',
                      fontWeight: '700',
                      color: 'var(--color-primary)',
                      padding: '0 4px',
                      backgroundColor: '#fff'
                    }}
                  />
                </div>
                <input
                  type="range"
                  min="1"
                  max={Math.max(selectedRecipeDetails.portions * 20, 200)}
                  step="1"
                  value={Math.min(portionsCible, Math.max(selectedRecipeDetails.portions * 20, 200))}
                  onChange={(e) => setPortionsCible(parseDecimalInput(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-primary)', marginBottom: '8px', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--color-dark-light)' }}>
                  <span>Portions d'origine : {selectedRecipeDetails.portions} parts</span>
                  <span>Facteur : x{(portionsCible / selectedRecipeDetails.portions).toFixed(2)}</span>
                </div>
              </div>

              {/* GRILLE DES COÛTS FINANCIERS AJUSTÉS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                <div style={{ padding: '8px', backgroundColor: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--color-dark-light)' }}>Coût Lot Ajusté</div>
                  <strong style={{ fontSize: '14px' }}>
                    {detailsCost.isApproximate ? '≈ ' : ''}{(detailsCost.totalCost * (portionsCible / selectedRecipeDetails.portions)).toFixed(2)} {settings.currency}
                  </strong>
                </div>
                <div style={{ padding: '8px', backgroundColor: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--color-dark-light)' }}>Coût Unitaire</div>
                  <strong style={{ fontSize: '14px' }}>
                    {detailsCost.isApproximate ? '≈ ' : ''}{detailsCost.costPerPortion.toFixed(2)} {settings.currency}/portion
                  </strong>
                </div>
                <div style={{ padding: '8px', backgroundColor: 'var(--color-secondary-light)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--color-secondary)' }}>Prix Conseillé</div>
                  <strong style={{ fontSize: '14px', color: 'var(--color-secondary)' }}>
                    {detailsCost.isApproximate ? '≈ ' : ''}{detailsCost.suggestedSellingPrice.toFixed(2)} {settings.currency}/portion
                  </strong>
                </div>
              </div>
            </div>

            {/* SIMULATEUR DE PRIX & MARGES DYNAMIQUE */}
            <div className="recipe-simulator" style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <TrendingUp size={16} />
                Simulateur de vente & marge en direct
              </h4>

              {/* Curseur de marge */}
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600' }}>
                  <span>Marge souhaitée :</span>
                  <span style={{ color: 'var(--color-primary)' }}>{simMargin}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={simMargin}
                  onChange={(e) => handleMarginChange(parseDecimalInput(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                />
              </div>

              {/* Saisie prix de vente */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Prix de vente unitaire simulé ({settings.currency}/portion)</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  style={{ height: '40px' }}
                  value={simSellPrice || ''}
                  onChange={(e) => handleSellPriceChange(parseDecimalInput(e.target.value))}
                />
              </div>

              {/* Indicateurs de gains unitaires */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                <div style={{ padding: '10px', backgroundColor: 'var(--color-white)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--color-dark-light)' }}>Bénéfice par portion</div>
                  <strong style={{ color: 'var(--color-secondary)', fontSize: '14px' }}>
                    {detailsCost.isApproximate ? '≈ ' : ''}+{(simSellPrice - detailsCost.costPerPortion).toFixed(2)} {settings.currency}/portion
                  </strong>
                </div>
                <div style={{ padding: '10px', backgroundColor: 'var(--color-white)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--color-dark-light)' }}>Bénéfice par Lot ({portionsCible} u)</div>
                  <strong style={{ color: 'var(--color-secondary)', fontSize: '14px' }}>
                    {detailsCost.isApproximate ? '≈ ' : ''}+{((simSellPrice - detailsCost.costPerPortion) * portionsCible).toFixed(2)} {settings.currency}
                  </strong>
                </div>
              </div>

              {/* Estimateur sur une journée de marché */}
              <div style={{ borderTop: '1px solid rgba(242, 85, 34, 0.1)', paddingTop: '12px' }}>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label">Simuler pour une journée de marché (portions vendues)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    style={{ height: '36px' }}
                    value={simSalesCount}
                    onChange={(e) => setSimSalesCount(parseDecimalInput(e.target.value))}
                  />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Chiffre d'Affaires estimé :</span>
                  <strong>{(simSalesCount * simSellPrice).toFixed(2)} {settings.currency}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '4px' }}>
                  <span>Coût total de production :</span>
                  <span style={{ color: 'var(--color-danger)', fontWeight: '600' }}>{detailsCost.isApproximate ? '≈ ' : ''}{(simSalesCount * detailsCost.costPerPortion).toFixed(2)} {settings.currency}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '6px', borderTop: '1px dashed var(--color-border)', paddingTop: '6px' }}>
                  <span style={{ fontWeight: '700' }}>Bénéfice Net Estimé :</span>
                  <strong style={{ color: 'var(--color-secondary)', fontSize: '16px' }}>
                    {detailsCost.isApproximate ? '≈ ' : ''}{((simSellPrice - detailsCost.costPerPortion) * simSalesCount).toFixed(2)} {settings.currency}
                  </strong>
                </div>
              </div>
            </div>

            {/* SECTION ALLERGÈNES DÉCLARABLES (RÈGLEMENT UE) */}
            {(() => {
              const productMap = new Map(products.map(p => [p.id, p]));
              const allergenInfo = calculateRecipeAllergens(detailsIngredients, productMap);

              return (
                <div style={{
                  padding: '14px',
                  backgroundColor: '#fffbeb',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '20px',
                  border: '1px solid #fde68a'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldAlert size={16} style={{ color: '#b45309' }} />
                      <strong style={{ fontSize: '13px', color: '#92400e' }}>
                        Allergènes à déclaration obligatoire (UE)
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ height: '28px', padding: '0 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => handleCopyAllergens(allergenInfo.allergens, allergenInfo.unverifiedItems)}
                      title="Copier la liste des allergènes (inclut les avertissements si nécessaire)"
                    >
                      {copiedAllergens ? <Check size={12} style={{ color: 'var(--color-secondary)' }} /> : <Copy size={12} />}
                      {copiedAllergens ? 'Copié !' : 'Copier les allergènes'}
                    </button>
                  </div>

                  {!allergenInfo.isFullyVerified && (
                    <div style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid #fca5a5',
                      color: '#991b1b',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '6px' }}>
                        <AlertTriangle size={15} style={{ color: '#dc2626' }} />
                        <span>⚠️ Allergènes à vérifier ({allergenInfo.unverifiedItems.length} ingrédient{allergenInfo.unverifiedItems.length > 1 ? 's' : ''}) :</span>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.5' }}>
                        {allergenInfo.unverifiedItems.map((item, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: '600' }}>{item.name}</span>
                            <span style={{ color: '#7f1d1d', fontSize: '11px', marginLeft: '4px' }}>
                              ({item.reason === 'unlinked' ? 'ingrédient non lié au stock' : 'allergènes non renseignés'})
                            </span>
                            {item.productId && onNavigate && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{
                                  marginLeft: '8px',
                                  height: '20px',
                                  padding: '0 6px',
                                  fontSize: '10px',
                                  lineHeight: '1',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  color: 'var(--color-primary)',
                                  borderColor: 'var(--color-primary)',
                                  verticalAlign: 'middle'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNavigate('Produits', { editProductId: item.productId, focusAllergens: true });
                                }}
                                title="Ouvrir le produit pour renseigner ses allergènes"
                              >
                                Renseigner
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                    {allergenInfo.allergens.length > 0 ? (
                      allergenInfo.allergens.map(a => (
                        <span
                          key={a}
                          className="badge"
                          style={{
                            fontSize: '12px',
                            padding: '4px 10px',
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                            fontWeight: '700'
                          }}
                        >
                          {a}
                        </span>
                      ))
                    ) : allergenInfo.isFullyVerified ? (
                      <span style={{ fontSize: '12px', color: '#065f46', fontWeight: '700' }}>
                        ✅ Aucun allergène majeur détecté (tous les ingrédients sont vérifiés).
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#b45309', fontWeight: '600' }}>
                        Aucun allergène déclaré pour les produits vérifiés. Vérification nécessaire pour les ingrédients ci-dessus.
                      </span>
                    )}
                  </div>

                  <p style={{ margin: 0, fontSize: '11px', color: '#78350f', fontStyle: 'italic', lineHeight: '1.4' }}>
                    {ALLERGEN_DISCLAIMER}
                  </p>
                </div>
              );
            })()}

            {/* ALERTE DE DISPONIBILITÉ DES STOCKS */}
            {(() => {
              const scaleFactor = portionsCible / selectedRecipeDetails.portions;
              let isFullyFeasible = detailsIngredients.length > 0;
              let isPartiallyFeasible = false;
              let hasIncompatible = false;
              const hasIngredients = detailsIngredients.length > 0;
              let maxPortions = Infinity;

              detailsIngredients.forEach(ri => {
                const prod = ri.productId ? products.find(p => p.id === ri.productId) : undefined;
                if (prod) {
                  const qtyOrig = ri.originalQtyUsed || ri.qtyUsed;
                  const qtyAjust = qtyOrig * scaleFactor;
                  const neededQty = convertUnits(qtyAjust, ri.unit, prod.unit, prod);
                  const origConv = convertUnits(qtyOrig, ri.unit, prod.unit, prod);
                  if (neededQty === null || origConv === null) {
                    hasIncompatible = true;
                    isFullyFeasible = false;
                    maxPortions = 0;
                  } else {
                    if (prod.stock < neededQty) {
                      isFullyFeasible = false;
                      if (prod.stock > 0) isPartiallyFeasible = true;
                    }
                    const qtyPerPortion = origConv / selectedRecipeDetails.portions;
                    if (qtyPerPortion > 0) {
                      const maxForThis = Math.floor(prod.stock / qtyPerPortion);
                      if (maxForThis < maxPortions) maxPortions = maxForThis;
                    }
                  }
                } else {
                  // Ingrédient non lié ou produit introuvable : stock considéré à 0
                  isFullyFeasible = false;
                  maxPortions = 0;
                }
              });

              const displayMaxPortions = maxPortions === Infinity ? 'N/A' : maxPortions;

              return (
                <div style={{ marginBottom: '20px' }}>
                  {hasIngredients && (
                    <div 
                      style={{ 
                        padding: '12px', 
                        borderRadius: 'var(--radius-md)', 
                        fontSize: '13px',
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '6px',
                        backgroundColor: hasIncompatible ? 'var(--color-danger-light)' : (isFullyFeasible ? 'var(--color-secondary-light)' : (isPartiallyFeasible || (maxPortions !== Infinity && maxPortions > 0) ? 'var(--color-warning-light)' : 'var(--color-danger-light)')),
                        color: hasIncompatible ? 'var(--color-danger)' : (isFullyFeasible ? 'var(--color-secondary)' : (isPartiallyFeasible || (maxPortions !== Infinity && maxPortions > 0) ? 'var(--color-warning)' : 'var(--color-danger)')),
                        border: '1px solid rgba(0,0,0,0.05)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                        {isFullyFeasible && !hasIncompatible ? <Check size={18} /> : <AlertTriangle size={18} />}
                        <span>
                          {hasIncompatible
                            ? 'Unités incompatibles entre recette et stock (impossible de cuisiner)'
                            : isFullyFeasible 
                              ? `Recette réalisable (${portionsCible} parts en stock !)` 
                              : ((maxPortions !== Infinity && maxPortions > 0) 
                                ? `Partiellement faisable (${displayMaxPortions} parts max avec vos stocks)` 
                                : `Stocks insuffisants (0 part faisable)`)}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', opacity: 0.9 }}>
                        Quantité maximale de parts faisables avec le stock actuel : <strong>{displayMaxPortions} parts</strong>.
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* LISTE DES INGRÉDIENTS DÉTAILLÉS AJUSTÉS */}
            <div style={{ marginBottom: '20px' }}>
              {quickProductError && (
                <div style={{
                  marginBottom: '12px',
                  padding: '10px 12px',
                  backgroundColor: 'var(--color-danger-light)',
                  border: '1px solid rgba(255,75,75,0.3)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  color: 'var(--color-danger)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>❌ {quickProductError}</span>
                  <button
                    type="button"
                    onClick={() => setQuickProductError(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontWeight: 700, fontSize: '16px', lineHeight: 1 }}
                  >×</button>
                </div>
              )}
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <List size={16} />
                Ingrédients et stocks requis ({detailsIngredients.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {detailsIngredients.map(ri => {
                  const prod = products.find(p => p.id === ri.productId);
                  const qtyOrig = ri.originalQtyUsed || ri.qtyUsed;
                  const qtyAjust = qtyOrig * (portionsCible / selectedRecipeDetails.portions);
                  const normRiUnit = normalizeUnit(ri.unit) || ri.unit;
                  const normProdUnit = prod ? (normalizeUnit(prod.unit) || prod.unit) : normRiUnit;
                  
                  const conv = prod
                    ? convertUnitsWithInfo(qtyAjust, normRiUnit, normProdUnit, prod)
                    : { value: qtyAjust, approximate: false };
                  const isIncompatible = Boolean(ri.productId && prod && conv.value === null);
                  const costLine = prod
                    ? (conv.value !== null ? conv.value * prod.avgPurchasePrice : null)
                    : qtyAjust * (ri.customCostPerUnit || 0);

                  // Calcul stock et écart
                  let stockStatus = 'unlinked';
                  let stockDetail = '';
                  if (ri.productId && prod) {
                    if (conv.value === null) {
                      stockStatus = 'incompatible';
                      stockDetail = `Unités incompatibles : recette en ${normRiUnit}, stock en ${normProdUnit}`;
                    } else {
                      const needed = conv.value;
                      const approxPrefix = conv.approximate ? '≈ ' : '';
                      if (prod.stock >= needed) {
                        stockStatus = 'ok';
                        stockDetail = `En stock (${formatStock(prod.stock)} ${normProdUnit})`;
                      } else if (prod.stock > 0) {
                        stockStatus = 'partial';
                        stockDetail = `Insuffisant (Stock: ${formatStock(prod.stock)}, Manque: ${approxPrefix}${formatStock(needed - prod.stock)} ${normProdUnit})`;
                      } else {
                        stockStatus = 'empty';
                        stockDetail = `Rupture (Requis: ${approxPrefix}${formatStock(needed)} ${normProdUnit})`;
                      }
                    }
                  }

                  return (
                    <div 
                      key={ri.id} 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '4px',
                        padding: '10px', 
                        backgroundColor: isIncompatible ? 'rgba(220, 38, 38, 0.06)' : 'var(--color-light)', 
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${isIncompatible ? 'var(--color-danger)' : 'var(--color-border)'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span>{cleanProductName(prod?.name || ri.customName || 'Ingrédient')}</span>
                          {stockStatus === 'unlinked' && (
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
                              onClick={() => handleOpenAddIngredientFromDetails(ri)}
                            >
                              <Plus size={11} />
                              Ajouter à mes produits
                            </button>
                          )}
                        </div>
                        <strong style={{ color: isIncompatible ? 'var(--color-danger)' : 'inherit' }}>
                          {costLine === null ? '—' : `${conv.approximate ? '≈ ' : ''}${costLine.toFixed(2)} ${settings.currency}`}
                        </strong>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{ color: 'var(--color-dark-light)' }}>
                          {formatQtyFr(qtyOrig)} {normRiUnit} ➔ <strong style={{ color: 'var(--color-primary)' }}>{formatQtyFr(qtyAjust)} {normRiUnit}</strong>
                        </span>

                        {/* Badge de stock */}
                        {stockStatus === 'ok' && <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 6px' }}>{stockDetail}</span>}
                        {stockStatus === 'partial' && <span className="badge badge-warning" style={{ fontSize: '10px', padding: '2px 6px', color: 'var(--color-warning)', backgroundColor: 'var(--color-warning-light)' }}>{stockDetail}</span>}
                        {stockStatus === 'empty' && <span className="badge badge-danger" style={{ fontSize: '10px', padding: '2px 6px' }}>{stockDetail}</span>}
                        {stockStatus === 'incompatible' && <span className="badge badge-danger" style={{ fontSize: '10px', padding: '2px 6px' }}>⚠️ {stockDetail}</span>}
                        {stockStatus === 'unlinked' && <span className="badge" style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--color-dark-light)' }}>Non suivi en stock</span>}
                      </div>

                      {/* Détail du calcul unitaire */}
                      <div style={{ fontSize: '11px', color: isIncompatible ? 'var(--color-danger)' : 'var(--color-dark-light)', marginTop: '2px', fontWeight: isIncompatible ? '700' : '500', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        {isIncompatible && prod ? (
                          <>
                            <span>⚠️ Unités incompatibles : recette en {normRiUnit}, stock en {normProdUnit}</span>
                            <button
                              type="button"
                              onClick={() => handleOpenProductEquivalence(prod.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '11px', fontWeight: '600', padding: 0 }}
                            >
                              Préciser l'équivalence
                            </button>
                          </>
                        ) : prod && costLine !== null ? (
                          <>
                            <span>
                              {formatQtyFr(qtyAjust)} {normRiUnit} × {prod.avgPurchasePrice.toFixed(2).replace('.', ',')} {settings.currency}/{normProdUnit} {conv.approximate ? '≈' : '='} <strong>{conv.approximate ? '≈ ' : ''}{costLine.toFixed(2).replace('.', ',')} {settings.currency}</strong>
                            </span>
                            {conv.approximate && (
                              <button
                                type="button"
                                onClick={() => handleOpenProductEquivalence(prod.id)}
                                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '11px', fontWeight: '600', padding: 0 }}
                              >
                                Préciser l'équivalence
                              </button>
                            )}
                          </>
                        ) : (
                          <span>
                            {formatQtyFr(qtyAjust)} {normRiUnit} × {(ri.customCostPerUnit || 0).toFixed(2).replace('.', ',')} {settings.currency}/{normRiUnit} = <strong>{(costLine || 0).toFixed(2).replace('.', ',')} {settings.currency}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LISTE DES EMBALLAGES DÉTAILLÉS AJUSTÉS */}
            {detailsPackagings.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={16} />
                  Emballages & Contenants
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {detailsPackagings.map(rp => (
                    <div key={rp.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 8px', backgroundColor: 'var(--color-light)', borderRadius: 'var(--radius-sm)' }}>
                      <span>{rp.name} <span style={{ fontSize: '11px', color: 'var(--color-dark-light)' }}>({rp.costPerUnit.toFixed(2)} {settings.currency}/pièce)</span></span>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <span style={{ color: 'var(--color-dark-light)' }}>{(rp.qtyUsed * (portionsCible / selectedRecipeDetails.portions)).toFixed(1)} u</span>
                        <strong style={{ width: '50px', textAlign: 'right' }}>{(rp.qtyUsed * (portionsCible / selectedRecipeDetails.portions) * rp.costPerUnit).toFixed(2)}€</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LISTE DES INGRÉDIENTS MANQUANTS / LISTE DE COURSES */}
            {(() => {
              const scaleFactor = portionsCible / selectedRecipeDetails.portions;
              const missingList: { name: string; qty: number | null; unit: string; approximate?: boolean; incompatibleMsg?: string; unlinkedIngredient?: RecipeIngredient }[] = [];
              
              detailsIngredients.forEach(ri => {
                const qtyOrig = ri.originalQtyUsed || ri.qtyUsed;
                const qtyAjust = qtyOrig * scaleFactor;
                const normRiUnit = normalizeUnit(ri.unit) || ri.unit;
                const prod = ri.productId ? products.find(p => p.id === ri.productId) : undefined;
                if (prod) {
                  const normProdUnit = normalizeUnit(prod.unit) || prod.unit;
                  const conv = convertUnitsWithInfo(qtyAjust, normRiUnit, normProdUnit, prod);
                  if (conv.value === null) {
                    missingList.push({
                      name: prod.name,
                      qty: null,
                      unit: normRiUnit,
                      incompatibleMsg: `Unités incompatibles : recette en ${normRiUnit}, stock en ${normProdUnit}`
                    });
                  } else if (prod.stock < conv.value) {
                    const deficit = conv.value - prod.stock;
                    const deficitBack = convertUnitsWithInfo(deficit, normProdUnit, normRiUnit, prod);
                    missingList.push({
                      name: prod.name,
                      qty: deficitBack.value !== null ? deficitBack.value : deficit,
                      unit: deficitBack.value !== null ? normRiUnit : normProdUnit,
                      approximate: conv.approximate || deficitBack.approximate
                    });
                  }
                } else {
                  missingList.push({
                    name: ri.customName || 'Ingrédient',
                    qty: qtyAjust,
                    unit: normRiUnit,
                    unlinkedIngredient: ri
                  });
                }
              });

              if (missingList.length === 0) return null;

              return (
                <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid var(--color-danger)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <ClipboardList size={16} />
                    Ingrédients manquants (Liste de courses)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                    {missingList.map((m, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-dark)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span>• {m.name}</span>
                          {m.unlinkedIngredient && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{
                                height: '20px',
                                padding: '0 6px',
                                fontSize: '10px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              onClick={() => handleOpenAddIngredientFromDetails(m.unlinkedIngredient!)}
                            >
                              <Plus size={10} />
                              Ajouter à mes produits
                            </button>
                          )}
                        </div>
                        {m.incompatibleMsg ? (
                          <strong style={{ color: 'var(--color-danger)' }}>⚠️ {m.incompatibleMsg}</strong>
                        ) : (
                          <strong style={{ color: 'var(--color-danger)', whiteSpace: 'nowrap' }}>
                            Acheter : {m.approximate ? '≈ ' : ''}{(m.qty || 0).toFixed(1)} {m.unit}
                          </strong>
                        )}
                      </div>
                    ))}
                  </div>

                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ width: '100%', height: '32px', fontSize: '12px', padding: 0 }}
                    onClick={() => {
                      const text = missingList.map(m =>
                        m.incompatibleMsg
                          ? `- ${m.name} : ${m.incompatibleMsg}`
                          : `- ${m.name} : ${m.approximate ? '≈ ' : ''}${(m.qty || 0).toFixed(1)} ${m.unit}`
                      ).join('\n');
                      navigator.clipboard.writeText(`Liste de courses pour ${selectedRecipeDetails.name} (${portionsCible} portions) :\n${text}`);
                      setCopiedCourses(true);
                      setTimeout(() => setCopiedCourses(false), 2000);
                    }}
                  >
                    {copiedCourses ? '✅ Liste copiée !' : '📋 Copier la liste de courses'}
                  </button>
                </div>
              );
            })()}

            {/* INSTRUCTIONS DE PREPARATION */}
            {selectedRecipeDetails.instructions && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <List size={16} />
                  Préparation / Étapes
                </h4>
                <div style={{ padding: '12px', backgroundColor: 'var(--color-light)', borderRadius: 'var(--radius-md)', fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-line', border: '1px solid var(--color-border)' }}>
                  {selectedRecipeDetails.instructions}
                </div>
              </div>
            )}

            {/* LIENS EXTERNES IMPORTATION */}
            {(selectedRecipeDetails.videoUrl || selectedRecipeDetails.sourceUrl) && (
              <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selectedRecipeDetails.videoUrl && (
                  <a 
                    href={selectedRecipeDetails.videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="badge badge-danger" 
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '4px 8px' }}
                  >
                    <ExternalLink size={12} /> Vidéo YouTube
                  </a>
                )}
                {selectedRecipeDetails.sourceUrl && (
                  <a 
                    href={selectedRecipeDetails.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="badge badge-info" 
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '4px 8px' }}
                  >
                    <ExternalLink size={12} /> Site source
                  </a>
                )}
              </div>
            )}

            {/* USTENSILLES & CONSEILS */}
            {selectedRecipeDetails.utensilsNotes && (
              <div style={{ marginBottom: '16px', padding: '10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>🍳 Matériel & Ustensiles :</strong>
                <span style={{ color: 'var(--color-dark-light)' }}>{selectedRecipeDetails.utensilsNotes}</span>
              </div>
            )}

            {selectedRecipeDetails.notes && (
              <div style={{ padding: '10px', backgroundColor: 'var(--color-light)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '13px', fontStyle: 'italic', color: 'var(--color-dark-light)' }}>
                <strong>💡 Astuce de fabrication :</strong><br/>
                {selectedRecipeDetails.notes}
              </div>
            )}

            {/* ACTIONS FOOTER */}
            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--color-border)', marginTop: '24px', paddingTop: '16px' }}>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
                onClick={(e) => handleOpenEditForm(selectedRecipeDetails, e)}
              >
                Modifier Recette
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => handleDeleteRecipe(selectedRecipeDetails.id)}
              >
                Supprimer
              </button>
            </div>

          </div>
        )}
      </Drawer>

      {/* Modal de confirmation d'ajout rapide d'un produit au stock */}
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
          zIndex: 9999,
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
                  allProducts={allProducts}
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
    </div>
  );
};
