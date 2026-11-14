import React, { useState, useEffect } from 'react';
import { parseDecimalInput } from '../utils';
import { 
  Plus, 
  ShoppingCart, 
  Barcode, 
  Trash2, 
  Calendar, 
  AlertTriangle,
  FileText
} from 'lucide-react';
import { dbService } from '../services/db';
import { 
  convertUnits, 
  convertUnitsWithInfo, 
  normalizeUnit, 
  cleanProductName, 
  formatStock, 
  getCompatiblePurchaseUnits, 
  getLogicalStockUnit 
} from '../utils/units';
import { Product, Purchase, Store } from '../types';
import { Drawer } from './Drawer';
import { BarcodeScanner } from './BarcodeScanner';
import { LookupResult } from '../services/barcodeLookupService';
import { InvoiceScanner } from './InvoiceScanner';
import { ProductDuplicateSuggestions } from './ProductDuplicateSuggestions';
import { findExactDuplicateProduct } from '../utils/productDuplicate';
import { formatExpiryDate, getDaysUntilExpiry } from '../utils/expiry';

interface PurchasesProps {
  initialTriggerScan?: boolean;
  initialPrefillProductId?: string;
}

export const Purchases: React.FC<PurchasesProps> = ({ initialTriggerScan, initialPrefillProductId }) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const settings = dbService.getSettings();

  // État du Drawer de Formulaire d'Achat
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isInvoiceScannerOpen, setIsInvoiceScannerOpen] = useState(false);
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);

  // Valeurs du formulaire d'achat
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formProductId, setFormProductId] = useState('');
  const [formQty, setFormQty] = useState('1');
  const [formUnit, setFormUnit] = useState('kg');
  const [formPricePaid, setFormPricePaid] = useState('');
  const [formStoreId, setFormStoreId] = useState('');
  const [formBatchNo, setFormBatchNo] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // État du Drawer de Création Rapide de Produit (si code-barres inconnu)
  const [isQuickProductOpen, setIsQuickProductOpen] = useState(false);
  const [quickBarcode, setQuickBarcode] = useState('');
  const [quickName, setQuickName] = useState('');
  const [quickCategory, setQuickCategory] = useState(settings.categories[0] || '');
  const [quickUnit, setQuickUnit] = useState(settings.units[0] || 'kg');
  const [quickBrand, setQuickBrand] = useState('');
  const [quickFormat, setQuickFormat] = useState('Unité');

  const loadData = () => {
    setPurchases(dbService.getPurchases().sort((a, b) => b.date.localeCompare(a.date)));
    const all = dbService.getProducts();
    setAllProducts(all);
    setProducts(all.filter(p => p.isActive));
    setStores(dbService.getStores());
  };

  const handleOpenAddForm = () => {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormProductId(products[0]?.id || '');
    setFormQty('1');
    setFormPricePaid('');
    setFormStoreId(stores[0]?.id || '');
    setFormBatchNo('');
    setFormExpiryDate('');
    setFormNotes('');
    setIsFormOpen(true);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    const handleDataSynced = () => loadData();
    window.addEventListener('marmicout-data-synced', handleDataSynced);
    return () => window.removeEventListener('marmicout-data-synced', handleDataSynced);
  }, []);

  // Déclencher le scanneur ou le préremplissage initial
  useEffect(() => {
    if (initialTriggerScan) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleOpenAddForm();
      setIsScannerOpen(true);
    } else if (initialPrefillProductId) {
      handleOpenAddForm();
      setFormProductId(initialPrefillProductId);
      const prod = dbService.getProduct(initialPrefillProductId);
      if (prod) {
        setFormUnit(prod.unit);
        if (prod.mainStoreId) setFormStoreId(prod.mainStoreId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTriggerScan, initialPrefillProductId]);

  // Pré-remplir l'unité lorsqu'on change de produit dans le formulaire d'achat
  useEffect(() => {
    if (formProductId) {
      const prod = products.find(p => p.id === formProductId);
      if (prod) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormUnit(prod.unit);
        if (prod.mainStoreId && !formStoreId) {
          setFormStoreId(prod.mainStoreId);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formProductId, products]);

  // Traiter un scan de code-barres avec recherche locale et externe
  const handleBarcodeScanned = (barcode: string, result: LookupResult) => {
    setIsScannerOpen(false);
    
    // Rechercher si le produit existe localement
    if (result.state === 'local_found' && result.localProduct) {
      setFormProductId(result.localProduct.id);
      setFormUnit(result.localProduct.unit);
      if (result.localProduct.mainStoreId) {
        setFormStoreId(result.localProduct.mainStoreId);
      }
    } else if (result.state === 'external_found' && result.externalProduct) {
      // Produit trouvé à l'externe : préremplir le Drawer de création rapide
      setQuickBarcode(result.externalProduct.barcode);
      setQuickName(cleanProductName(result.externalProduct.name));
      setQuickBrand(result.externalProduct.brand);
      setQuickFormat(result.externalProduct.format);
      
      // Mappage flou de la catégorie
      let category = settings.categories[0] || '';
      if (result.externalProduct.category) {
        const extCat = result.externalProduct.category.toLowerCase();
        const matched = settings.categories.find(c => 
          extCat.includes(c.toLowerCase()) || c.toLowerCase().includes(extCat)
        );
        if (matched) category = matched;
      }
      setQuickCategory(category);
      setQuickUnit(getLogicalStockUnit(result.externalProduct.format || 'kg'));
      setIsQuickProductOpen(true);
    } else {
      // Produit non répertorié ou erreur réseau : préremplir uniquement le code-barres
      setQuickBarcode(barcode);
      setQuickName('');
      setQuickBrand('');
      setQuickFormat('Unité');
      setQuickCategory(settings.categories[0] || '');
      setQuickUnit(settings.units[0] || 'kg');
      setIsQuickProductOpen(true);
      if (result.state === 'error' && result.error) {
        alert(result.error);
      }
    }
  };

  // Sélectionner un produit existant depuis les suggestions de création rapide
  const handleSelectExistingProductFromQuick = async (existingProd: Product) => {
    if (!existingProd.isActive) {
      await dbService.saveProduct({ ...existingProd, isActive: true });
    }
    const all = dbService.getProducts();
    setAllProducts(all);
    setProducts(all.filter(p => p.isActive));
    setFormProductId(existingProd.id);
    setFormUnit(existingProd.unit);
    if (existingProd.mainStoreId) {
      setFormStoreId(existingProd.mainStoreId);
    }
    setIsQuickProductOpen(false);
  };

  // Enregistrer le produit rapide puis l'associer au formulaire d'achat
  const handleSaveQuickProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;

    // Détection de doublon exact
    const duplicate = findExactDuplicateProduct(quickName, allProducts);
    if (duplicate) {
      const confirmMsg =
        `Ce produit existe déjà ("${duplicate.name}"${!duplicate.isActive ? ' — désactivé' : ''}).\n\n` +
        `Voulez-vous vraiment enregistrer ce doublon ?`;
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    const newProd: Product = {
      id: 'P_' + Date.now(),
      barcode: quickBarcode,
      name: cleanProductName(quickName),
      category: quickCategory,
      unit: quickUnit,
      brand: quickBrand.trim(),
      format: quickFormat.trim(),
      stock: 0,
      minStockAlert: settings.defaultMinStockAlert,
      avgPurchasePrice: 0,
      mainStoreId: formStoreId || (stores[0]?.id || ''),
      notes: 'Créé via scan rapide code-barres',
      isActive: true
    };

    dbService.saveProduct(newProd);
    
    // Mettre à jour l'état local et pré-remplir l'achat avec ce produit
    const all = dbService.getProducts();
    setAllProducts(all);
    setProducts(all.filter(p => p.isActive));
    setFormProductId(newProd.id);
    setFormUnit(newProd.unit);
    setIsQuickProductOpen(false);
  };

  // Enregistrer l'achat complet
  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProductId) {
      alert("Veuillez sélectionner ou scanner un produit");
      return;
    }
    const qtyNum = parseDecimalInput(formQty);
    const pricePaidNum = parseDecimalInput(formPricePaid);

    if (qtyNum <= 0) {
      alert("La quantité doit être supérieure à 0");
      return;
    }
    if (pricePaidNum <= 0) {
      alert("Le prix payé doit être supérieur à 0");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const newPurchase: Purchase = {
      id: 'A_' + Date.now(),
      date: formDate,
      productId: formProductId,
      qty: qtyNum,
      unit: formUnit,
      pricePaid: pricePaidNum,
      unitPrice: Number((pricePaidNum / qtyNum).toFixed(4)),
      storeId: formStoreId,
      batchNo: formBatchNo.trim() || undefined,
      expiryDate: formExpiryDate || undefined,
      notes: formNotes.trim() || undefined
    };

    try {
      await dbService.addPurchase(newPurchase);
      setIsFormOpen(false);
      setSaveError(null);
      loadData();
    } catch (err: unknown) {
      console.error('Erreur achat:', err);
      setSaveError(err instanceof Error ? err.message : "Échec de l'enregistrement de l'achat dans le Cloud.");
    } finally {
      setIsSaving(false);
    }
  };

  // Enregistrer les achats extraits du scanner de factures
  const handleSaveInvoicePurchases = (scannedPurchases: Omit<Purchase, 'id'>[]) => {
    scannedPurchases.forEach(p => {
      const fullPurchase: Purchase = {
        id: 'A_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        ...p
      };
      dbService.addPurchase(fullPurchase);
    });
    setIsInvoiceScannerOpen(false);
    loadData();
  };

  // Supprimer un achat
  const handleDeletePurchase = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet achat ? Le stock associé sera déduit.")) {
      dbService.deletePurchase(id);
      loadData();
    }
  };

  const qtyNum = parseDecimalInput(formQty);
  const pricePaidNum = parseDecimalInput(formPricePaid);
  const calculatedUnitPrice = qtyNum > 0 ? (pricePaidNum / qtyNum).toFixed(2) : '0.00';

  const selectedProduct = products.find(p => p.id === formProductId);
  const compatiblePurchaseUnits = selectedProduct
    ? getCompatiblePurchaseUnits(selectedProduct.unit)
    : [formUnit || 'kg'];

  const normFormUnit = normalizeUnit(formUnit) || formUnit;
  const normProdStockUnit = selectedProduct ? (normalizeUnit(selectedProduct.unit) || selectedProduct.unit) : '';
  const isUnitDifferent = Boolean(selectedProduct && normFormUnit !== normProdStockUnit);

  let pricePerStockUnit: number | null = null;
  if (isUnitDifferent && selectedProduct && qtyNum > 0 && pricePaidNum > 0) {
    const qtyInStockUnit = convertUnits(qtyNum, formUnit, selectedProduct.unit);
    if (qtyInStockUnit !== null && qtyInStockUnit > 0) {
      pricePerStockUnit = pricePaidNum / qtyInStockUnit;
    }
  }

  return (
    <div>
      {/* En-tête */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Achats & Approvisionnement</h1>
          <p className="page-subtitle">Enregistrez vos factures et réapprovisionnez votre stock</p>
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
            Enregistrer un achat
          </button>
        </div>
      </div>

      {/* Liste des achats récents */}
      <div className="table-container">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Derniers achats enregistrés</h3>
          <span className="badge badge-info">{purchases.length} transaction(s)</span>
        </div>

        {purchases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-dark-light)' }}>
            <ShoppingCart size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <p>Aucun achat enregistré. Cliquez sur "Enregistrer un achat" pour commencer.</p>
          </div>
        ) : (
          <table className="custom-table adaptive-table-wrap">
            <thead>
              <tr>
                <th>Date</th>
                <th>Produit</th>
                <th>Quantité</th>
                <th>Prix Total</th>
                <th>Prix Unitaire</th>
                <th>Magasin</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map(p => {
                const prod = dbService.getProduct(p.productId);
                const store = stores.find(s => s.id === p.storeId);
                const normPUnit = normalizeUnit(p.unit) || p.unit;
                const conv = prod ? convertUnitsWithInfo(p.qty, normPUnit, prod.unit) : { value: p.qty, approximate: false };
                
                return (
                  <tr key={p.id}>
                    <td data-label="Date">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} style={{ color: 'var(--color-dark-light)' }} />
                        <span>{p.date}</span>
                      </div>
                    </td>
                    <td data-label="Produit" style={{ fontWeight: '600' }}>
                      {prod ? cleanProductName(prod.name) : 'Produit inconnu'}
                      {(p.batchNo || p.expiryDate) && (
                        <div style={{ fontSize: '10px', color: 'var(--color-dark-light)', fontWeight: 'normal', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                          {p.batchNo && <span>Lot: {p.batchNo}</span>}
                          {p.batchNo && p.expiryDate && <span>•</span>}
                          {p.expiryDate && (
                            <span style={{
                              fontWeight: 600,
                              color: (getDaysUntilExpiry(p.expiryDate) ?? 999) < 0 ? 'var(--color-danger)' : (getDaysUntilExpiry(p.expiryDate) ?? 999) <= (settings.expiryAlertDays ?? 7) ? '#d97706' : 'inherit'
                            }}>
                              DLC : {formatExpiryDate(p.expiryDate)}
                            </span>
                          )}
                        </div>
                      )}
                      {prod && conv.value === null && (
                        <div style={{ fontSize: '11px', color: 'var(--color-danger)', fontWeight: '700', marginTop: '2px' }}>
                          ⚠️ Unités incompatibles : achat en {normPUnit}, stock en {normalizeUnit(prod.unit) || prod.unit}
                        </div>
                      )}
                    </td>
                    <td data-label="Quantité">
                      {conv.approximate ? '≈ ' : ''}{p.qty} {normPUnit}
                    </td>
                    <td data-label="Prix Total" style={{ fontWeight: '600', color: 'var(--color-dark)' }}>
                      {p.pricePaid.toFixed(2)} {settings.currency}
                    </td>
                    <td data-label="Prix Unitaire">
                      {p.unitPrice.toFixed(2)} {settings.currency}/{normPUnit}
                    </td>
                    <td data-label="Magasin">
                      {store ? store.name : 'Inconnu'}
                    </td>
                    <td data-label="Actions" style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-danger btn-icon-only" 
                        style={{ height: '36px', width: '36px' }}
                        onClick={() => handleDeletePurchase(p.id)}
                        title="Supprimer l'achat"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* --- DRAWER D'AJOUT D'ACHAT --- */}
      <Drawer
        title="Nouvel Achat"
        isOpen={isFormOpen}
        width="1200px"
        onClose={() => {
          setIsFormOpen(false);
          setIsScannerOpen(false);
        }}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)} disabled={isSaving}>Annuler</button>
            <button type="button" className="btn btn-primary" onClick={handleSavePurchase} disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : saveError ? 'Réessayer' : "Valider l'achat"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSavePurchase}>
          {saveError && (
            <div style={{ marginBottom: '16px', padding: '12px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', color: '#991b1b', fontSize: '13px' }}>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>⚠️ Échec de l'enregistrement dans le Cloud</div>
              <div>{saveError}</div>
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#b91c1c' }}>Vos saisies ont été conservées intactes. Vous pouvez corriger ou cliquer sur Réessayer.</div>
            </div>
          )}
          
          {/* Scanner de Code-barres */}
          <div style={{ marginBottom: '20px', padding: '12px', border: '1px dashed var(--color-primary)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isScannerOpen ? '12px' : 0 }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Barcode size={16} />
                Scan rapide de l'article
              </span>
              <button
                type="button"
                className="btn btn-primary"
                style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
                onClick={() => setIsScannerOpen(!isScannerOpen)}
              >
                {isScannerOpen ? 'Masquer' : 'Scanner Code-barres'}
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

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date de l'achat</label>
              <input
                type="date"
                className="form-input"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Magasin / Fournisseur</label>
              <select className="form-input" required value={formStoreId} onChange={(e) => setFormStoreId(e.target.value)}>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Produit / Ingrédient acheté *</label>
            <select className="form-input" required value={formProductId} onChange={(e) => setFormProductId(e.target.value)}>
              <option value="" disabled>Sélectionner un produit...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{cleanProductName(p.name)} ({p.brand || 'Sans marque'} - Stock: {formatStock(p.stock)} {p.unit})</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quantité achetée *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  inputMode="decimal"
                  className="form-input"
                  style={{ flex: 1 }}
                  required
                  placeholder="0"
                  value={formQty}
                  onChange={(e) => setFormQty(e.target.value)}
                />
                <select
                  className="form-input"
                  style={{ width: '90px' }}
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  title="Unité d'achat"
                >
                  {compatiblePurchaseUnits.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Prix Total Payé ({settings.currency}) *</label>
              <input
                type="text"
                inputMode="decimal"
                className="form-input"
                required
                placeholder="0.00"
                value={formPricePaid}
                onChange={(e) => setFormPricePaid(e.target.value)}
              />
            </div>
          </div>

          {/* Prix unitaire calculé en temps réel */}
          <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-light)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-dark-light)' }}>Prix unitaire calculé :</span>
              <strong>{calculatedUnitPrice} {settings.currency}/{normFormUnit}</strong>
            </div>
            {isUnitDifferent && pricePerStockUnit !== null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-primary)', fontWeight: '600', borderTop: '1px dashed var(--color-border)', paddingTop: '4px', marginTop: '2px' }}>
                <span>Équivalent unité du stock :</span>
                <span>soit {pricePerStockUnit.toFixed(2)} {settings.currency}/{normProdStockUnit}</span>
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Numéro de lot (facultatif)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: LOT-2026-A"
                value={formBatchNo}
                onChange={(e) => setFormBatchNo(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date limite / DLUO (facultatif)</label>
              <input
                type="date"
                className="form-input"
                value={formExpiryDate}
                onChange={(e) => setFormExpiryDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes de l'achat</label>
            <textarea
              className="form-input"
              placeholder="Notes complémentaires..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
            />
          </div>

        </form>
      </Drawer>

      {/* --- DRAWER DE CRÉATION RAPIDE DE PRODUIT SI CODE-BARRES INCONNU --- */}
      <Drawer
        title="Créer rapidement le produit"
        isOpen={isQuickProductOpen}
        onClose={() => setIsQuickProductOpen(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsQuickProductOpen(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleSaveQuickProduct}>Créer & Sélectionner</button>
          </>
        }
      >
        <div className="card" style={{ backgroundColor: 'var(--color-warning-light)', borderColor: 'rgba(242, 185, 34, 0.2)', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' }}>
          <AlertTriangle size={24} style={{ color: 'var(--color-warning)' }} />
          <span>Le code-barres <strong>{quickBarcode}</strong> ne correspond à aucun produit. Créez-le rapidement ci-dessous.</span>
        </div>

        <form onSubmit={handleSaveQuickProduct}>
          <div className="form-group">
            <label className="form-label">Code-barres</label>
            <input type="text" className="form-input" value={quickBarcode} disabled />
          </div>

          <div className="form-group">
            <label className="form-label">Nom du produit/ingrédient *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ex: Purée de fraise 1kg"
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
            />
            <ProductDuplicateSuggestions
              inputName={quickName}
              allProducts={allProducts}
              showSuggestions={true}
              actionLabel="Sélectionner"
              onSelectProduct={handleSelectExistingProductFromQuick}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Marque</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Lu, Francine"
                value={quickBrand}
                onChange={(e) => setQuickBrand(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Format / Conditionnement</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Bouteille 75cl, Paquet 1kg"
                value={quickFormat}
                onChange={(e) => setQuickFormat(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Catégorie</label>
              <select className="form-input" value={quickCategory} onChange={(e) => setQuickCategory(e.target.value)}>
                {settings.categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Unité de stock *</label>
              <select className="form-input" value={quickUnit} onChange={(e) => setQuickUnit(e.target.value)}>
                {settings.units.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
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
