import React, { useState } from 'react';
import { ShoppingCart, Plus, Search, Lock, FileText } from 'lucide-react';
import { demoDbService, notifyReadOnlyBlocked } from '../services/demoDb';
import { Purchase } from '../../types';

export const DemoPurchases: React.FC = () => {
  const [purchases] = useState<Purchase[]>(() => demoDbService.getPurchases());
  const [products] = useState(() => demoDbService.getProducts());
  const [stores] = useState(() => demoDbService.getStores());
  const settings = demoDbService.getSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState('');

  const totalSpent = purchases.reduce((sum, p) => sum + p.pricePaid, 0);

  const filteredPurchases = purchases.filter(pur => {
    const prod = products.find(p => p.id === pur.productId);
    const store = stores.find(s => s.id === pur.storeId);

    const matchesSearch = 
      (prod?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (store?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (pur.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesStore = selectedStore === '' || pur.storeId === selectedStore;

    return matchesSearch && matchesStore;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Achats & Réapprovisionnements</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-dark-light)', margin: '4px 0 0 0' }}>
            Suivi des entrées de stock et mise à jour automatique des coûts moyens d'achat. Total dépensé : <strong>{totalSpent.toFixed(2)} {settings.currency}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => notifyReadOnlyBlocked('Le scanneur IA de facture')}
            title="Réservé à la version complète"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileText size={16} />
            <span>Scanner Facture (IA)</span>
            <Lock size={12} style={{ opacity: 0.6 }} />
          </button>

          <button 
            className="btn btn-primary"
            onClick={() => notifyReadOnlyBlocked("L'enregistrement d'achat")}
            title="Réservé à la version complète"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            <span>Nouvel Achat</span>
            <Lock size={12} style={{ opacity: 0.6 }} />
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Rechercher un ingrédient ou fournisseur..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '38px', width: '100%' }}
            />
          </div>

          <div>
            <select
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              className="form-control"
              style={{ width: '100%' }}
            >
              <option value="">Tous les fournisseurs</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px' }}>Ingrédient</th>
                <th style={{ padding: '12px 16px' }}>Fournisseur</th>
                <th style={{ padding: '12px 16px' }}>Quantité</th>
                <th style={{ padding: '12px 16px' }}>Prix Unitaire</th>
                <th style={{ padding: '12px 16px' }}>Total Payé</th>
                <th style={{ padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map(pur => {
                const prod = products.find(p => p.id === pur.productId);
                const store = stores.find(s => s.id === pur.storeId);
                return (
                  <tr key={pur.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{pur.date}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1e293b' }}>
                      {prod?.name || 'Ingrédient'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {store?.name || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                        {pur.qty} {pur.unit}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {pur.unitPrice.toFixed(2)} {settings.currency}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--color-dark)' }}>
                      {pur.pricePaid.toFixed(2)} {settings.currency}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 8px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => notifyReadOnlyBlocked("La modification d'achat")}
                      >
                        <span>Détails</span>
                        <Lock size={10} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
