import React, { useState, useEffect } from 'react';
import { parseDecimalInput } from '../utils';
import { 
  Plus,
  Search,
  Barcode,
  Edit,
  History,
  Archive,
  ArrowRightLeft,
  FileText,
  Trash2,
  SlidersHorizontal
} from 'lucide-react';
import { dbService } from '../services/db';
import { generateUUID } from '../services/cloudDbService';
import { Product, Store, StockMovement, Purchase } from '../types';
import { Drawer } from './Drawer';
import { BarcodeScanner } from './BarcodeScanner';
import { LookupResult } from '../services/barcodeLookupService';
import { InvoiceScanner } from './InvoiceScanner';

interface ProductsProps {
  initialTriggerAdd?: boolean;
  onNavigate?: (tab: string, extraData?: Record<string, unknown>) => void;
}

const STOCK_CORRECTION_REASONS = [
  'Inventaire',
  'Casse / perte',
  'Erreur de saisie',
  'Autre'
] as const;

export const Products: React.FC<ProductsProps> = ({ initialTriggerAdd, onNavigate }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const settings = dbService.getSettings();

  // États de recherche et filtrage
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStockFilter, setSelectedStockFilter] = useState('');

  // États du Drawer de Formulaire
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingProductHasPurchases, setEditingProductHasPurchases] = useState(false);

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
    setIsFormOpen(true);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    if (initialTriggerAdd) {
      handleOpenAddForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTriggerAdd]);

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
    setIsFormOpen(true);
  };

  // Ouvrir le panneau de détails
  const handleOpenDetails = (prod: Product) => {
    setDetailsError(null);
    setSelectedProductDetails(prod);
    setStockHistory(dbService.getProductStockMovements(prod.id));
    setPurchaseHistory(dbService.getProductPurchaseHistory(prod.id));
  };

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
          isActive: false
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

  // Enregistrer le produit (Ajout ou Édition)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSaving(true);
    setSaveError(null);

    const stockNum = parseDecimalInput(formStock);
    const minStockNum = parseDecimalInput(formMinStock);
    const avgPriceNum = parseDecimalInput(formAvgPrice);

    const updatedProduct: Product = {
      id: editingProduct ? editingProduct.id : generateUUID(),
      barcode: formBarcode.trim(),
      name: formName.trim(),
      category: formCategory,
      unit: formUnit,
      brand: formBrand.trim(),
      format: formFormat.trim(),
      stock: stockNum,
      minStockAlert: minStockNum,
      avgPurchasePrice: avgPriceNum,
      mainStoreId: formMainStore,
      notes: formNotes.trim(),
      isActive: formIsActive
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

    return matchesSearch && matchesCategory && matchesStock;
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
        
        <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '380px' }}>
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
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600' }}>{p.name}</span>
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
                        {p.stock.toFixed(2)} {p.unit}
                      </span>
                    </td>
                    <td data-label="Seuil Alerte">
                      {p.minStockAlert} {p.unit}
                    </td>
                    <td data-label="Prix d'Achat Moyen">
                      {p.avgPurchasePrice.toFixed(2)} {settings.currency} / {p.unit}
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
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)} disabled={isSaving || isDeletingOrDeactivating}>Annuler</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveProduct} disabled={isSaving || isDeletingOrDeactivating}>
                {isSaving ? 'Enregistrement...' : saveError ? 'Réessayer' : 'Enregistrer'}
              </button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSaveProduct}>
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
                    Vous pouvez en revanche <strong>désactiver ce produit</strong> (<code>isActive = false</code>) afin qu'il n'apparaisse plus dans les sélections actives tout en préservant l'historique.
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
                  </div>
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
              onChange={(e) => setFormName(e.target.value)}
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
              <select className="form-input" value={formUnit} onChange={(e) => setFormUnit(e.target.value)}>
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
                  disabled={editingProduct !== null} // Désactivé en édition (doit passer par Achat ou Ajustement)
                />
                {editingProduct && (
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
              {editingProduct && (
                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-dark-light)' }}>
                  Le stock se modifie par un achat ou par “Corriger le stock”
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
                disabled={editingProduct !== null && editingProductHasPurchases}
              />
              {editingProduct && (
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
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>{selectedProductDetails.name}</h2>
              <p style={{ color: 'var(--color-dark-light)', fontSize: '14px', marginBottom: '16px' }}>
                Marque: {selectedProductDetails.brand || 'Non spécifiée'} • Format: {selectedProductDetails.format}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', backgroundColor: 'var(--color-light)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-dark-light)' }}>Stock actuel</div>
                    <strong style={{ fontSize: '18px' }}>{selectedProductDetails.stock.toFixed(2)} {selectedProductDetails.unit}</strong>
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
                  <strong style={{ fontSize: '18px' }}>{selectedProductDetails.avgPurchasePrice.toFixed(2)} {settings.currency}</strong>
                </div>
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

            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={16} />
                Historique des achats
              </h3>
              
              {purchaseHistory.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--color-dark-light)', padding: '10px 0' }}>Aucun achat enregistré pour ce produit.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {purchaseHistory.map(p => {
                    const st = stores.find(s => s.id === p.storeId);
                    return (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid var(--color-border)', fontSize: '12px' }}>
                        <div>
                          <strong>{st ? st.name : 'Magasin inconnu'}</strong>
                          <div style={{ color: 'var(--color-dark-light)' }}>{p.date} • {p.qty} {p.unit} achetés</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <strong>{p.pricePaid.toFixed(2)} {settings.currency}</strong>
                          <div style={{ fontSize: '10px', color: 'var(--color-dark-light)' }}>{(p.pricePaid / p.qty).toFixed(2)} / u</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
        title={stockCorrectionTarget ? `Corriger le stock — ${stockCorrectionTarget.name}` : "Corriger le stock"}
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
