import React, { useState } from 'react';
import { Sparkles, Plus, Lock } from 'lucide-react';
import { demoDbService, notifyReadOnlyBlocked } from '../services/demoDb';
import { Production } from '../../types';

export const DemoProductions: React.FC = () => {
  const [productions] = useState<Production[]>(() => demoDbService.getProductions());
  const [recipes] = useState(() => demoDbService.getRecipes());
  const settings = demoDbService.getSettings();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Productions de Lots</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-dark-light)', margin: '4px 0 0 0' }}>
            Historique des fabrications en cuisine avec déduction automatique des ingrédients du stock.
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={() => notifyReadOnlyBlocked('Le lancement de lot de production')}
          title="Réservé à la version complète"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          <span>Produire un Lot</span>
          <Lock size={12} style={{ opacity: 0.6 }} />
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '12px 16px' }}>Date</th>
              <th style={{ padding: '12px 16px' }}>Recette fabriquée</th>
              <th style={{ padding: '12px 16px' }}>Quantité produite</th>
              <th style={{ padding: '12px 16px' }}>Coût de fabrication</th>
              <th style={{ padding: '12px 16px' }}>Notes / Fournée</th>
              <th style={{ padding: '12px 16px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {productions.map(prod => {
              const recipe = recipes.find(r => r.id === prod.recipeId);
              return (
                <tr key={prod.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{prod.date}</td>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1e293b' }}>
                    {recipe?.name || 'Recette'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="badge" style={{ background: '#dcfce7', color: '#166534' }}>
                      {prod.portionsProduced} portions
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>
                    {prod.calculatedCost.toFixed(2)} {settings.currency}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>
                    {prod.notes || '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '11px', padding: '4px 8px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => notifyReadOnlyBlocked('La consultation détaillée du lot')}
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
  );
};
