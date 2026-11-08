import React from 'react';
import {
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  ChefHat,
  Sparkles,
  DollarSign,
  Activity,
  Plus
} from 'lucide-react';
import { demoDbService } from '../services/demoDb';

interface DemoDashboardProps {
  onNavigate: (tab: string, extraData?: Record<string, unknown>) => void;
}

export const DemoDashboard: React.FC<DemoDashboardProps> = ({ onNavigate }) => {
  const products = demoDbService.getProducts();
  const recipes = demoDbService.getRecipes();
  const sales = demoDbService.getSales();
  const purchases = demoDbService.getPurchases();
  const settings = demoDbService.getSettings();
  const productions = demoDbService.getProductions();

  // 1. Chiffre d'Affaires (CA)
  const totalCA = sales.reduce((acc, sale) => acc + (sale.qtySold * sale.unitPrice), 0);

  // 2. Coût de revient total des ventes et Bénéfice
  let totalCostOfSales = 0;
  sales.forEach(sale => {
    if (sale.itemType === 'RECIPE') {
      const costInfo = demoDbService.calculateRecipeCost(sale.itemId);
      totalCostOfSales += sale.qtySold * costInfo.costPerPortion;
    } else {
      const prod = products.find(p => p.id === sale.itemId);
      if (prod) {
        totalCostOfSales += sale.qtySold * prod.avgPurchasePrice;
      }
    }
  });
  const estimatedBenefit = totalCA - totalCostOfSales;

  // 3. Produits en alerte stock
  const lowStockProducts = products.filter(p => p.isActive && p.stock <= p.minStockAlert);
  const outOfStockCount = products.filter(p => p.isActive && p.stock === 0).length;

  // 4. Coût moyen des productions
  const avgProductionCost = productions.length > 0
    ? productions.reduce((acc, pr) => acc + pr.calculatedCost, 0) / productions.length
    : 0;

  // 5. Recettes les plus rentables
  const recipesWithProfit = recipes.map(recipe => {
    const costInfo = demoDbService.calculateRecipeCost(recipe.id);
    const recipeSales = sales.filter(s => s.itemType === 'RECIPE' && s.itemId === recipe.id);
    const avgSalePrice = recipeSales.length > 0
      ? recipeSales.reduce((acc, s) => acc + s.unitPrice, 0) / recipeSales.length
      : costInfo.suggestedSellingPrice;

    const profitUnit = avgSalePrice - costInfo.costPerPortion;
    const marginPercent = avgSalePrice > 0 ? (profitUnit / avgSalePrice) * 100 : 0;

    return {
      recipe,
      costInfo,
      avgSalePrice,
      profitUnit,
      marginPercent
    };
  }).sort((a, b) => b.marginPercent - a.marginPercent);

  const lowMarginRecipes = recipesWithProfit.filter(r => r.marginPercent < settings.defaultTargetMargin);

  return (
    <div>
      {/* SECTION ACCUEIL HERO BANNER */}
      <div className="card" style={{ 
        padding: 0, 
        overflow: 'hidden', 
        marginBottom: '28px', 
        border: 'none', 
        boxShadow: 'var(--shadow-md)',
        borderRadius: 'var(--radius-md)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          backgroundColor: 'var(--color-dark)',
          color: '#fff',
        }}>
          <div style={{ 
            flex: '1 1 360px', 
            padding: '32px 28px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            gap: '12px' 
          }}>
            <span className="badge" style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.1)', 
              color: 'var(--color-secondary-light)', 
              fontWeight: '700', 
              fontSize: '10px',
              width: 'fit-content',
              padding: '4px 10px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              MarmiCout — Démonstration Vitrine
            </span>
            <h1 style={{ 
              fontSize: '26px', 
              fontWeight: '800', 
              lineHeight: '1.25', 
              color: 'var(--color-white)',
              margin: 0 
            }}>
              {settings.businessName}
            </h1>
            <p style={{ 
              fontSize: '13px', 
              color: 'rgba(255, 255, 255, 0.75)', 
              lineHeight: '1.5',
              margin: 0,
              maxWidth: '480px'
            }}>
              Découvrez la gestion en direct des stocks, fiches techniques de recettes, calculs automatiques des coûts de revient par portion et marges bénéficiaires pour les métiers de bouche.
            </p>
          </div>
          <div style={{ 
            flex: '1 1 200px',
            minHeight: '200px', 
            background: 'linear-gradient(135deg, #312e81, #4338ca)'
          }} />
        </div>
      </div>

      {/* --- CARTES DE MESURES (KPIs) --- */}
      <div className="grid-cols-1-4" style={{ marginBottom: '28px' }}>
        
        {/* Chiffre d'Affaires */}
        <div className="card metric-card" style={{ borderLeft: '4px solid var(--color-secondary)' }}>
          <div className="metric-icon-box" style={{ backgroundColor: 'var(--color-secondary-light)', color: 'var(--color-secondary)' }}>
            <DollarSign size={24} />
          </div>
          <div className="metric-data">
            <span className="metric-value">{totalCA.toFixed(2)} {settings.currency}</span>
            <span className="metric-label">Chiffre d'Affaires</span>
          </div>
        </div>

        {/* Bénéfice Estimé */}
        <div className="card metric-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <div className="metric-icon-box" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="metric-data">
            <span className="metric-value" style={{ color: estimatedBenefit >= 0 ? 'var(--color-secondary)' : 'var(--color-danger)' }}>
              {estimatedBenefit.toFixed(2)} {settings.currency}
            </span>
            <span className="metric-label">Bénéfice estimé</span>
          </div>
        </div>

        {/* Alertes Stock */}
        <div className="card metric-card" style={{ borderLeft: `4px solid ${lowStockProducts.length > 0 ? 'var(--color-danger)' : 'var(--color-secondary)'}` }}>
          <div className="metric-icon-box" style={{ 
            backgroundColor: lowStockProducts.length > 0 ? 'var(--color-danger-light)' : 'var(--color-secondary-light)', 
            color: lowStockProducts.length > 0 ? 'var(--color-danger)' : 'var(--color-secondary)' 
          }}>
            <AlertTriangle size={24} />
          </div>
          <div className="metric-data">
            <span className="metric-value">{lowStockProducts.length}</span>
            <span className="metric-label">{outOfStockCount > 0 ? `${outOfStockCount} rupture(s) de stock` : 'Stocks faibles'}</span>
          </div>
        </div>

        {/* Coût moyen production */}
        <div className="card metric-card" style={{ borderLeft: '4px solid var(--color-dark-light)' }}>
          <div className="metric-icon-box" style={{ backgroundColor: 'hsl(215, 20%, 93%)', color: 'var(--color-dark)' }}>
            <Activity size={24} />
          </div>
          <div className="metric-data">
            <span className="metric-value">{avgProductionCost.toFixed(2)} {settings.currency}</span>
            <span className="metric-label">Coût moy. production</span>
          </div>
        </div>

      </div>

      {/* --- RACCOURCIS RAPIDES --- */}
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Explorer la démo</h3>
      <div className="quick-links" style={{ marginBottom: '28px' }}>
        <button className="quick-link-btn" onClick={() => onNavigate('Achats')}>
          <ShoppingCart size={22} style={{ color: 'var(--color-primary)' }} />
          <span>Consulter Achats</span>
        </button>
        <button className="quick-link-btn" onClick={() => onNavigate('Produits')}>
          <Plus size={22} style={{ color: 'var(--color-dark)' }} />
          <span>Ingrédients & Stocks</span>
        </button>
        <button className="quick-link-btn" onClick={() => onNavigate('Recettes')}>
          <ChefHat size={22} style={{ color: 'var(--color-secondary)' }} />
          <span>Fiches Recettes</span>
        </button>
        <button className="quick-link-btn" onClick={() => onNavigate('Production')}>
          <Sparkles size={22} style={{ color: 'var(--color-warning)' }} />
          <span>Suivi Production</span>
        </button>
        <button className="quick-link-btn" onClick={() => onNavigate('Ventes')}>
          <DollarSign size={22} style={{ color: 'var(--color-secondary)' }} />
          <span>Historique Ventes</span>
        </button>
      </div>

      {/* --- SECTION DES ALERTES DÉTECTÉES --- */}
      {(lowStockProducts.length > 0 || lowMarginRecipes.length > 0) && (
        <div className="card" style={{ marginBottom: '28px', backgroundColor: 'var(--color-danger-light)', borderColor: 'rgba(255, 75, 75, 0.2)' }}>
          <div className="card-title" style={{ color: 'var(--color-danger)', marginBottom: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} />
              Alertes automatiques détectées
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {lowStockProducts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--color-dark)' }}>⚠️ Ingrédients sous le seuil d'alerte :</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {lowStockProducts.map(p => (
                    <span 
                      key={p.id} 
                      className={`badge ${p.stock === 0 ? 'badge-danger' : 'badge-warning'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onNavigate('Produits')}
                    >
                      {p.name} ({p.stock} {p.unit} restants • alerte à {p.minStockAlert} {p.unit})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SECTIONS D'ANALYSE --- */}
      <div className="grid-cols-details">
        {/* Recettes les plus rentables */}
        <div className="card">
          <div className="card-title">
            <span>✨ Recettes & Marges calculées</span>
            <span style={{ fontSize: '12px', color: 'var(--color-dark-light)', fontWeight: 'normal' }}>Marge cible : {settings.defaultTargetMargin}%</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recipesWithProfit.slice(0, 4).map(({ recipe, costInfo, profitUnit, marginPercent }) => (
              <div 
                key={recipe.id}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '12px 16px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer'
                }}
                onClick={() => onNavigate('Recettes')}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <strong style={{ fontSize: '14px' }}>{recipe.name}</strong>
                  <span style={{ fontSize: '12px', color: 'var(--color-dark-light)' }}>
                    Prix conseillé : {costInfo.suggestedSellingPrice.toFixed(2)} {settings.currency} (Coût de revient : {costInfo.costPerPortion.toFixed(2)} {settings.currency})
                  </span>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span 
                    className={`badge ${marginPercent >= settings.defaultTargetMargin ? 'badge-success' : 'badge-warning'}`}
                    style={{ fontSize: '12px' }}
                  >
                    Marge {marginPercent.toFixed(0)}%
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-secondary)', fontWeight: '600' }}>
                    +{profitUnit.toFixed(2)} {settings.currency} / portion
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Derniers achats */}
        <div className="card">
          <div className="card-title">
            <span>🛒 Derniers achats ingrédients</span>
            <button className="btn btn-secondary" style={{ height: '32px', fontSize: '12px', padding: '0 12px' }} onClick={() => onNavigate('Achats')}>
              Voir tout
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {purchases.slice(-4).reverse().map(p => {
              const prod = products.find(prod => prod.id === p.productId);
              return (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                  <div>
                    <strong>{prod?.name || 'Produit inconnu'}</strong>
                    <div style={{ color: 'var(--color-dark-light)', fontSize: '11px' }}>{p.date} • {p.qty} {p.unit}</div>
                  </div>
                  <div style={{ fontWeight: '600' }}>
                    {p.pricePaid.toFixed(2)} {settings.currency}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
