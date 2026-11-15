import React from 'react';
import { formatQtyFr } from '../../utils/units';

export interface ShoppingPrintItem {
  key: string;
  productName: string;
  productUnit: string;
  toOrder: number;
  needed: number;
  inStock: number;
  estimatedCost: number;
  avgPurchasePrice: number;
  fromRecipes: string[];
  mainStoreId?: string;
  isUnlinked?: boolean;
}

export interface ShoppingPrintStoreGroup {
  storeId: string;
  storeName: string;
  items: ShoppingPrintItem[];
  subtotal?: number;
  estimatedCost?: number;
}

interface ShoppingListPrintProps {
  establishmentName: string;
  selections: { recipeName: string; portions: number }[];
  toOrderItems: ShoppingPrintItem[];
  availableItems?: ShoppingPrintItem[];
  groupBy: 'store' | 'all';
  storeGroups: ShoppingPrintStoreGroup[];
  totalEstimatedCost: number;
  currency: string;
  withCosts?: boolean;
}

export const ShoppingListPrint: React.FC<ShoppingListPrintProps> = ({
  establishmentName,
  selections,
  toOrderItems,
  groupBy,
  storeGroups,
  totalEstimatedCost,
  currency,
  withCosts = true,
}) => {
  const formattedDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="shopping-print-document">
      {/* EN-TÊTE DE LA LISTE DE COURSES */}
      <header className="shopping-print-header">
        <div className="header-left">
          <div className="establishment-name">{establishmentName || 'MarmiCout'}</div>
          <h1 className="shopping-title">LISTE DE COURSES</h1>
          <div className="shopping-subtitle">Éditée le {formattedDate}</div>
        </div>
        <div className="header-right">
          <div className="shopping-stats-badge">
            <span className="stats-count">{toOrderItems.length} article(s) à acheter</span>
            {withCosts && totalEstimatedCost > 0 && (
              <strong className="stats-total">
                Total estimé : {totalEstimatedCost.toFixed(2)} {currency}
              </strong>
            )}
          </div>
        </div>
      </header>

      {/* RECETTES CIBLES */}
      {selections.length > 0 && (
        <section className="shopping-selections-box">
          <span className="selections-title">Recettes cibles pour cette commande :</span>
          <div className="selections-tags">
            {selections.map((s, idx) => (
              <span key={idx} className="selection-tag">
                <strong>{s.recipeName}</strong> ({s.portions} portions)
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ARTICLES À ACHETER */}
      {toOrderItems.length === 0 ? (
        <div className="shopping-empty-box">
          ✓ Tous les ingrédients requis sont déjà en stock ! Aucun achat nécessaire.
        </div>
      ) : groupBy === 'store' && storeGroups.length > 0 ? (
        /* AFFICHAGE GROUPÉ PAR FOURNISSEUR */
        <div className="shopping-groups">
          {storeGroups.map(group => (
            <div key={group.storeId} className="shopping-store-group">
              <div className="store-group-header">
                <h3 className="store-group-name">
                  🏪 {group.storeName}
                  <span className="store-count"> ({group.items.length} articles)</span>
                </h3>
                {withCosts && (group.subtotal || group.estimatedCost || 0) > 0 && (
                  <span className="store-subtotal">
                    Sous-total : <strong>{((group.subtotal ?? group.estimatedCost) || 0).toFixed(2)} {currency}</strong>
                  </span>
                )}
              </div>

              <table className="print-table shopping-table">
                <thead>
                  <tr>
                    <th style={{ width: '38px', textAlign: 'center' }}>✓</th>
                    <th>Article</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Quantité</th>
                    <th style={{ width: '70px' }}>Unité</th>
                    {withCosts && <th style={{ width: '90px', textAlign: 'right' }}>Prix est.</th>}
                    <th>Pour recettes</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map(item => (
                    <tr key={item.key}>
                      <td style={{ textAlign: 'center' }}>
                        <span className="print-checkbox">□</span>
                      </td>
                      <td>
                        <strong>{item.productName}</strong>
                        {item.isUnlinked && (
                          <span className="unlinked-note"> (non lié au stock)</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>{formatQtyFr(item.toOrder)}</strong>
                      </td>
                      <td className="unit-cell">{item.productUnit}</td>
                      {withCosts && (
                        <td style={{ textAlign: 'right' }} className="cost-cell">
                          {item.estimatedCost > 0 ? `${item.estimatedCost.toFixed(2)} ${currency}` : '—'}
                        </td>
                      )}
                      <td className="from-recipes-cell">
                        {item.fromRecipes.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        /* AFFICHAGE GLOBAL */
        <div className="shopping-global-list">
          <table className="print-table shopping-table">
            <thead>
              <tr>
                <th style={{ width: '38px', textAlign: 'center' }}>✓</th>
                <th>Article</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Quantité</th>
                <th style={{ width: '70px' }}>Unité</th>
                {withCosts && <th style={{ width: '90px', textAlign: 'right' }}>Prix est.</th>}
                <th>Pour recettes</th>
              </tr>
            </thead>
            <tbody>
              {toOrderItems.map(item => (
                <tr key={item.key}>
                  <td style={{ textAlign: 'center' }}>
                    <span className="print-checkbox">□</span>
                  </td>
                  <td>
                    <strong>{item.productName}</strong>
                    {item.isUnlinked && (
                      <span className="unlinked-note"> (non lié au stock)</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <strong>{formatQtyFr(item.toOrder)}</strong>
                  </td>
                  <td className="unit-cell">{item.productUnit}</td>
                  {withCosts && (
                    <td style={{ textAlign: 'right' }} className="cost-cell">
                      {item.estimatedCost > 0 ? `${item.estimatedCost.toFixed(2)} ${currency}` : '—'}
                    </td>
                  )}
                  <td className="from-recipes-cell">
                    {item.fromRecipes.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ZONE DE NOTES MANUSCRITES DU CHEF */}
      <section className="shopping-notes-box">
        <h4 className="notes-box-title">Notes & Substitutions sur le marché :</h4>
        <div className="handwriting-lines">
          <div className="handwriting-line"></div>
          <div className="handwriting-line"></div>
        </div>
      </section>

      {/* PIED DE PAGE */}
      <footer className="shopping-print-footer">
        <span>MarmiCout • {establishmentName || 'Mon Établissement'}</span>
        <span>Cochez les cases au fur et à mesure de vos achats</span>
      </footer>
    </div>
  );
};
