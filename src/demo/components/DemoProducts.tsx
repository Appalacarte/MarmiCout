import React, { useState } from 'react';
import { 
  Plus,
  Search,
  Barcode,
  History,
  Archive,
  ArrowRightLeft,
  FileText,
  Lock
} from 'lucide-react';
import { demoDbService, notifyReadOnlyBlocked } from '../services/demoDb';
import { Product, StockMovement, Purchase } from '../../types';
import { Drawer } from '../../components/Drawer';

interface DemoProductsProps {
  onNavigate?: (tab: string, extraData?: Record<string, unknown>) => void;
}

export const DemoProducts: React.FC<DemoProductsProps> = ({ onNavigate }) => {
  const [products] = useState<Product[]>(() => demoDbService.getProducts());
  const [stores] = useState(() => demoDbService.getStores());
  const settings = demoDbService.getSettings();

  // États de recherche et filtrage
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStockFilter, setSelectedStockFilter] = useState('');

  // État du Drawer de Détail / Historique
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);
  const [stockHistory, setStockHistory] = useState<StockMovement[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<Purchase[]>([]);

  const handleOpenDetails = (prod: Product) => {
    setSelectedProductDetails(prod);
    setStockHistory(demoDbService.getProductStockMovements(prod.id));
    setPurchaseHistory(demoDbService.getProductPurchaseHistory(prod.id));
  };

  // Filtrage des produits
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === '' || p.category === selectedCategory;

    let matchesStock = true;
    if (selectedStockFilter === 'alert') {
      matchesStock = p.stock <= p.minStockAlert;
    } else if (selectedStockFilter === 'ok') {
      matchesStock = p.stock > p.minStockAlert;
    } else if (selectedStockFilter === 'empty') {
      matchesStock = p.stock === 0;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <div>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Ingrédients & Stocks</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-dark-light)', margin: '4px 0 0 0' }}>
            Consultez les {products.length} articles d’exemple avec gestion des seuils d'alerte et coûts moyens.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => notifyReadOnlyBlocked('Le scanneur de facture')}
            title="Réservé à la version complète"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileText size={16} />
            <span>Scanner Facture (IA)</span>
            <Lock size={12} style={{ opacity: 0.6 }} />
          </button>

          <button 
            className="btn btn-primary"
            onClick={() => notifyReadOnlyBlocked("L'ajout d'ingrédient")}
            title="Réservé à la version complète"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            <span>Nouvel Ingrédient</span>
            <Lock size={12} style={{ opacity: 0.6 }} />
          </button>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Rechercher par nom, marque, code-barres..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '38px', width: '100%' }}
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="form-control"
              style={{ width: '100%' }}
            >
              <option value="">Toutes les catégories</option>
              {settings.categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStockFilter}
              onChange={e => setSelectedStockFilter(e.target.value)}
              className="form-control"
              style={{ width: '100%' }}
            >
              <option value="">Tous les états de stock</option>
              <option value="alert">⚠️ Stock faible / alerte</option>
              <option value="ok">✅ Stock suffisant</option>
              <option value="empty">🛑 Rupture de stock (0)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste / Grille des Produits */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {filteredProducts.map(prod => {
          const store = stores.find(s => s.id === prod.mainStoreId);
          const isAlert = prod.stock <= prod.minStockAlert;
          return (
            <div 
              key={prod.id} 
              className="card"
              style={{ 
                padding: '16px', 
                cursor: 'pointer',
                borderLeft: isAlert ? '4px solid var(--color-danger)' : '4px solid var(--color-secondary)',
                transition: 'transform 0.15s, box-shadow 0.15s'
              }}
              onClick={() => handleOpenDetails(prod)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '11px' }}>
                  {prod.category}
                </span>
                <span className={`badge ${isAlert ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '11px' }}>
                  {prod.stock} {prod.unit}
                </span>
              </div>

              <h4 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 4px 0', color: 'var(--color-dark)' }}>
                {prod.name}
              </h4>

              <div style={{ fontSize: '12px', color: 'var(--color-dark-light)', marginBottom: '12px' }}>
                {prod.brand} {prod.format && `• ${prod.format}`}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '8px', color: '#64748b' }}>
                <span>Prix moyen : <strong>{prod.avgPurchasePrice.toFixed(2)} {settings.currency}</strong>/{prod.unit}</span>
                {store && <span>{store.name}</span>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '4px 8px', height: 'auto' }}
                  onClick={e => {
                    e.stopPropagation();
                    handleOpenDetails(prod);
                  }}
                >
                  <History size={12} style={{ marginRight: '4px' }} />
                  Voir la fiche & historique
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drawer de Consultation Produit & Historique */}
      <Drawer
        isOpen={Boolean(selectedProductDetails)}
        onClose={() => setSelectedProductDetails(null)}
        title={selectedProductDetails ? selectedProductDetails.name : 'Détails Ingrédient'}
      >
        {selectedProductDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div><strong>Catégorie :</strong> {selectedProductDetails.category}</div>
                <div><strong>Marque :</strong> {selectedProductDetails.brand || '—'}</div>
                <div><strong>Conditionnement :</strong> {selectedProductDetails.format || '—'}</div>
                <div><strong>Code-barres :</strong> {selectedProductDetails.barcode || '—'}</div>
                <div><strong>Stock actuel :</strong> <span style={{ fontWeight: '700', color: selectedProductDetails.stock <= selectedProductDetails.minStockAlert ? 'var(--color-danger)' : 'var(--color-secondary)' }}>{selectedProductDetails.stock} {selectedProductDetails.unit}</span></div>
                <div><strong>Seuil alerte :</strong> {selectedProductDetails.minStockAlert} {selectedProductDetails.unit}</div>
                <div><strong>Prix d’achat moyen :</strong> {selectedProductDetails.avgPurchasePrice.toFixed(2)} {settings.currency} / {selectedProductDetails.unit}</div>
              </div>
              {selectedProductDetails.notes && (
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                  Note : {selectedProductDetails.notes}
                </div>
              )}
            </div>

            {/* Historique des Achats */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>Derniers achats</h4>
              {purchaseHistory.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>Aucun achat enregistré pour ce produit.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {purchaseHistory.map(pur => (
                    <div key={pur.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}>
                      <div>
                        <span>{pur.date}</span> • <strong>{pur.qty} {pur.unit}</strong>
                      </div>
                      <div style={{ fontWeight: '600' }}>
                        {pur.pricePaid.toFixed(2)} {settings.currency} ({pur.unitPrice.toFixed(2)}/u)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mouvements de stock */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>Mouvements de stock</h4>
              {stockHistory.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>Aucun mouvement enregistré.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {stockHistory.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}>
                      <div>
                        <span style={{ fontWeight: '600', color: m.qty > 0 ? 'var(--color-secondary)' : 'var(--color-danger)' }}>
                          {m.qty > 0 ? `+${m.qty}` : m.qty} {selectedProductDetails.unit}
                        </span>
                        <span style={{ color: '#64748b', marginLeft: '8px' }}>({m.type})</span>
                      </div>
                      <span style={{ color: '#94a3b8' }}>{m.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Boutons d'action en lecture seule */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => notifyReadOnlyBlocked("La modification de l'ingrédient")}
              >
                <span>Modifier</span>
                <Lock size={12} />
              </button>
              <button
                className="btn btn-danger"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => notifyReadOnlyBlocked("La suppression de l'ingrédient")}
              >
                <span>Supprimer</span>
                <Lock size={12} />
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
