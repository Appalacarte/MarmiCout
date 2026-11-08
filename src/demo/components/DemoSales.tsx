import React, { useState } from 'react';
import { DollarSign, Plus, Lock } from 'lucide-react';
import { demoDbService, notifyReadOnlyBlocked } from '../services/demoDb';
import { Sale } from '../../types';

export const DemoSales: React.FC = () => {
  const [sales] = useState<Sale[]>(() => demoDbService.getSales());
  const [recipes] = useState(() => demoDbService.getRecipes());
  const settings = demoDbService.getSettings();

  const totalCA = sales.reduce((sum, s) => sum + (s.qtySold * s.unitPrice), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Ventes & Encaissements</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-dark-light)', margin: '4px 0 0 0' }}>
            Suivi des ventes par canal de distribution. Total encaissé : <strong>{totalCA.toFixed(2)} {settings.currency}</strong>
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={() => notifyReadOnlyBlocked("L'enregistrement d'une vente")}
          title="Réservé à la version complète"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          <span>Enregistrer Vente</span>
          <Lock size={12} style={{ opacity: 0.6 }} />
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '12px 16px' }}>Date</th>
              <th style={{ padding: '12px 16px' }}>Plat / Produit</th>
              <th style={{ padding: '12px 16px' }}>Canal de vente</th>
              <th style={{ padding: '12px 16px' }}>Quantité</th>
              <th style={{ padding: '12px 16px' }}>Prix Unitaire</th>
              <th style={{ padding: '12px 16px' }}>Total Vente</th>
              <th style={{ padding: '12px 16px' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(s => {
              const recipe = recipes.find(r => r.id === s.itemId);
              return (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{s.date}</td>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1e293b' }}>
                    {recipe?.name || s.itemId}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                      {s.location}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: '600' }}>
                    {s.qtySold}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>
                    {s.unitPrice.toFixed(2)} {settings.currency}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--color-secondary)' }}>
                    {(s.qtySold * s.unitPrice).toFixed(2)} {settings.currency}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>
                    {s.notes || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
