import React from 'react';
import { Settings as SettingsIcon, Lock, RotateCcw } from 'lucide-react';
import { demoDbService, notifyReadOnlyBlocked } from '../services/demoDb';

export const DemoSettings: React.FC = () => {
  const settings = demoDbService.getSettings();

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Paramètres de l'Atelier</h2>
        <p style={{ fontSize: '13px', color: 'var(--color-dark-light)', margin: '4px 0 0 0' }}>
          Configuration de votre établissement, devise, taux de marge cible et catégories.
        </p>
      </div>

      <div className="card" style={{ padding: '24px', maxWidth: '640px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Nom de l'établissement
            </label>
            <input
              type="text"
              className="form-control"
              value={settings.businessName}
              readOnly
              style={{ background: '#f8fafc' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Devise
              </label>
              <input
                type="text"
                className="form-control"
                value={settings.currency}
                readOnly
                style={{ background: '#f8fafc' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Taux de marge cible (%)
              </label>
              <input
                type="number"
                className="form-control"
                value={settings.defaultTargetMargin}
                readOnly
                style={{ background: '#f8fafc' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Catégories d'ingrédients ({settings.categories.length})
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {settings.categories.map(cat => (
                <span key={cat} className="badge" style={{ background: '#f1f5f9', color: '#334155' }}>
                  {cat}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Catégories de recettes ({settings.recipeCategories.length})
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {settings.recipeCategories.map(cat => (
                <span key={cat} className="badge" style={{ background: '#f1f5f9', color: '#334155' }}>
                  {cat}
                </span>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (window.confirm('Voulez-vous restaurer les données d’exemple initiales de la démo ?')) {
                  demoDbService.resetToDefault();
                  window.location.reload();
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCcw size={14} />
              <span>Réinitialiser les données démo</span>
            </button>

            <button
              className="btn btn-primary"
              onClick={() => notifyReadOnlyBlocked('La sauvegarde des paramètres')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>Enregistrer</span>
              <Lock size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
