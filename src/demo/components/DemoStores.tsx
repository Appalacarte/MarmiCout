import React, { useState } from 'react';
import { Store as StoreIcon, Plus, Lock, MapPin, Phone } from 'lucide-react';
import { demoDbService, notifyReadOnlyBlocked } from '../services/demoDb';
import { Store } from '../../types';

export const DemoStores: React.FC = () => {
  const [stores] = useState<Store[]>(() => demoDbService.getStores());

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Fournisseurs & Magasins</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-dark-light)', margin: '4px 0 0 0' }}>
            Gestion de vos grossistes, producteurs bio et fournisseurs d'emballage.
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={() => notifyReadOnlyBlocked("L'ajout de fournisseur")}
          title="Réservé à la version complète"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          <span>Nouveau Fournisseur</span>
          <Lock size={12} style={{ opacity: 0.6 }} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {stores.map(store => (
          <div key={store.id} className="card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                {store.type}
              </span>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 10px 0' }}>
              {store.name}
            </h3>

            {store.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                <MapPin size={14} style={{ flexShrink: 0 }} />
                <span>{store.address}</span>
              </div>
            )}

            {store.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                <Phone size={14} style={{ flexShrink: 0 }} />
                <span>{store.phone}</span>
              </div>
            )}

            {store.notes && (
              <p style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', margin: '10px 0 0 0', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                {store.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
