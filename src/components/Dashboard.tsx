import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  ChefHat,
  Sparkles,
  DollarSign,
  Activity,
  Plus,
  Clock,
  Calendar,
  ArrowUp,
  ArrowDown,
  BarChart3
} from 'lucide-react';
import { dbService } from '../services/db';
import { cleanProductName, formatStock } from '../utils/units';
import { getExpiringPurchases } from '../utils/expiry';
import {
  PeriodKey,
  PERIOD_OPTIONS,
  getPeriodRange,
  calculateMetricDiff,
  computePeriodSummary,
  computeRecipesWithProfitForPeriod,
  generateSalesChartData,
  ChartDataPoint,
  MetricDiff
} from '../utils/dashboardPeriod';

interface DashboardProps {
  onNavigate: (tab: string, extraData?: Record<string, unknown>) => void;
}

const STORAGE_PERIOD_KEY = 'marmicout_dashboard_period';

function getInitialPeriod(): PeriodKey {
  try {
    const saved = localStorage.getItem(STORAGE_PERIOD_KEY) as PeriodKey | null;
    if (saved && ['today', '7days', 'this_month', 'last_month', 'this_year', 'all'].includes(saved)) {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'this_month';
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [, setSyncTick] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>(getInitialPeriod);
  const [userGranularity, setUserGranularity] = useState<'day' | 'month' | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);

  useEffect(() => {
    const handleDataSynced = () => setSyncTick(t => t + 1);
    window.addEventListener('marmicout-data-synced', handleDataSynced);
    return () => window.removeEventListener('marmicout-data-synced', handleDataSynced);
  }, []);

  const handlePeriodChange = (newPeriod: PeriodKey) => {
    setSelectedPeriod(newPeriod);
    setUserGranularity(null); // Réinitialise pour adapter automatiquement jour/mois selon la période
    setHoveredPoint(null);
    try {
      localStorage.setItem(STORAGE_PERIOD_KEY, newPeriod);
    } catch {
      // ignore
    }
  };

  const products = dbService.getProducts();
  const recipes = dbService.getRecipes();
  const sales = dbService.getSales();
  const purchases = dbService.getPurchases();
  const settings = dbService.getSettings();
  const productions = dbService.getProductions();
  const stores = dbService.getStores();

  // Alertes DLC / DLUO (sur stocks actifs)
  const alertDays = settings.expiryAlertDays ?? 7;
  const expiringPurchases = getExpiringPurchases(purchases, products, stores, alertDays);
  const expiredCount = expiringPurchases.filter(item => item.isExpired).length;
  const warningCount = expiringPurchases.filter(item => !item.isExpired).length;

  // Stocks faibles ou ruptures (état instantané du stock physique)
  const lowStockProducts = products.filter(p => p.isActive && p.stock <= p.minStockAlert);
  const outOfStockCount = products.filter(p => p.isActive && p.stock === 0).length;

  // --- DÉFINITION DE LA PÉRIODE & CALCULS COMPARATIFS ---
  const periodRange = getPeriodRange(selectedPeriod);
  const activeGranularity: 'day' | 'month' =
    userGranularity || (selectedPeriod === 'this_year' || selectedPeriod === 'all' ? 'month' : 'day');

  // Résumé de la période courante
  const curSummary = computePeriodSummary(
    sales,
    purchases,
    productions,
    products,
    id => dbService.calculateRecipeCost(id),
    periodRange.current
  );

  // Résumé de la période précédente (pour calcul des écarts)
  const prevSummary = periodRange.previous
    ? computePeriodSummary(
        sales,
        purchases,
        productions,
        products,
        id => dbService.calculateRecipeCost(id),
        periodRange.previous
      )
    : null;

  // Calcul des écarts en % et flèches
  const diffCA = calculateMetricDiff(curSummary.salesRevenue, prevSummary ? prevSummary.salesRevenue : null);
  const diffProfit = calculateMetricDiff(curSummary.estimatedProfit, prevSummary ? prevSummary.estimatedProfit : null);
  const diffPurchases = calculateMetricDiff(curSummary.purchasesTotal, prevSummary ? prevSummary.purchasesTotal : null);
  const diffProdCost = calculateMetricDiff(curSummary.avgProductionCost, prevSummary ? prevSummary.avgProductionCost : null);

  // Recettes les plus rentables recalculées sur la période
  const recipesWithProfit = computeRecipesWithProfitForPeriod(
    recipes,
    sales,
    periodRange.current,
    id => dbService.calculateRecipeCost(id)
  );
  const lowMarginRecipes = recipesWithProfit.filter(r => r.marginPercent < settings.defaultTargetMargin);

  // Données pour le petit graphique de chiffre d'affaires
  const chartData = generateSalesChartData(sales, periodRange.current, selectedPeriod, activeGranularity);

  // Formateur du badge d'écart sous chaque indicateur
  const renderDiffBadge = (
    diff: MetricDiff,
    polarity: 'higher-is-good' | 'lower-is-good' | 'neutral' = 'higher-is-good'
  ) => {
    if (diff.percent === null || !periodRange.prevLabel) {
      return (
        <div style={{ fontSize: '11px', color: 'var(--color-dark-light)', marginTop: '5px' }}>
          Historique global
        </div>
      );
    }

    let color = 'var(--color-dark-light)';
    if (diff.arrow === 'up') {
      if (polarity === 'higher-is-good') color = 'var(--color-secondary)';
      else if (polarity === 'lower-is-good') color = 'var(--color-danger)';
      else color = 'var(--color-dark)';
    } else if (diff.arrow === 'down') {
      if (polarity === 'higher-is-good') color = 'var(--color-danger)';
      else if (polarity === 'lower-is-good') color = 'var(--color-secondary)';
      else color = 'var(--color-dark)';
    }

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          marginTop: '5px',
          flexWrap: 'wrap'
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            fontWeight: '700',
            color
          }}
        >
          {diff.arrow === 'up' && <ArrowUp size={12} />}
          {diff.arrow === 'down' && <ArrowDown size={12} />}
          {diff.arrow === 'flat' && '→ '}
          {diff.text}
        </span>
        <span style={{ color: 'var(--color-dark-light)' }}>
          vs {periodRange.prevLabel}
        </span>
      </div>
    );
  };

  return (
    <div>
      {/* SECTION ACCUEIL HERO BANNER - SPÉCIALITÉ PLATS CUISINÉS */}
      <div
        className="card"
        style={{
          padding: 0,
          overflow: 'hidden',
          marginBottom: '24px',
          border: 'none',
          boxShadow: 'var(--shadow-md)',
          borderRadius: 'var(--radius-md)'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            backgroundColor: 'var(--color-dark)',
            color: '#fff'
          }}
        >
          <div
            style={{
              flex: '1 1 360px',
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'var(--color-secondary-light)',
                fontWeight: '700',
                fontSize: '10px',
                width: 'fit-content',
                padding: '4px 10px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
            >
              MarmiCout — Traiteur & Plats Cuisinés
            </span>
            <h1
              style={{
                fontSize: '26px',
                fontWeight: '800',
                lineHeight: '1.25',
                color: 'var(--color-white)',
                margin: 0
              }}
            >
              Pilotez la rentabilité de votre activité culinaire
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.75)',
                lineHeight: '1.5',
                margin: 0,
                maxWidth: '480px'
              }}
            >
              Calculez précisément vos coûts de revient, optimisez les stocks de vos ingrédients (portions individuelles, familiales) et maximisez vos bénéfices lors de vos séances de cuisine et de vos ventes.
            </p>
          </div>
          <div
            style={{
              flex: '1 1 200px',
              minHeight: '200px',
              background: 'url(/cooked_dishes_banner.png) center/cover no-repeat'
            }}
          />
        </div>
      </div>

      {/* --- SÉLECTEUR DE PÉRIODE --- */}
      <div
        className="card"
        style={{
          marginBottom: '24px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Calendar size={18} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-dark)' }}>
              Période d'analyse
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-dark-light)' }}>
              {periodRange.current.start && periodRange.current.end ? (
                <>
                  <span style={{ fontWeight: '600' }}>{periodRange.label}</span> (du {periodRange.current.start.split('-').reverse().join('/')} au {periodRange.current.end.split('-').reverse().join('/')})
                </>
              ) : (
                <span style={{ fontWeight: '600' }}>{periodRange.label}</span>
              )}
              {periodRange.prevLabel && (
                <span> • comparé à : {periodRange.prevLabel}</span>
              )}
            </div>
          </div>
        </div>

        {/* Boutons de sélection de période */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}
        >
          {PERIOD_OPTIONS.map(opt => {
            const isActive = selectedPeriod === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => handlePeriodChange(opt.key)}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: isActive ? '700' : '500',
                  borderRadius: '20px',
                  border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-light)',
                  color: isActive ? '#fff' : 'var(--color-dark)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  boxShadow: isActive ? '0 2px 8px rgba(234, 88, 12, 0.25)' : 'none'
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- CARTES DE MESURES (KPIs DYNAMIQUES AVEC ÉCARTS) --- */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}
      >
        {/* 1. Chiffre d'Affaires */}
        <div className="card metric-card" style={{ borderLeft: '4px solid var(--color-secondary)' }}>
          <div className="metric-icon-box" style={{ backgroundColor: 'var(--color-secondary-light)', color: 'var(--color-secondary)' }}>
            <DollarSign size={24} />
          </div>
          <div className="metric-data" style={{ flex: 1 }}>
            <span className="metric-value">{curSummary.salesRevenue.toFixed(2)} {settings.currency}</span>
            <span className="metric-label">Chiffre d'Affaires</span>
            {renderDiffBadge(diffCA, 'higher-is-good')}
          </div>
        </div>

        {/* 2. Bénéfice Estimé */}
        <div className="card metric-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <div className="metric-icon-box" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="metric-data" style={{ flex: 1 }}>
            <span
              className="metric-value"
              style={{ color: curSummary.estimatedProfit >= 0 ? 'var(--color-secondary)' : 'var(--color-danger)' }}
            >
              {curSummary.estimatedProfit.toFixed(2)} {settings.currency}
            </span>
            <span className="metric-label">Bénéfice estimé</span>
            {renderDiffBadge(diffProfit, 'higher-is-good')}
          </div>
        </div>

        {/* 3. Total des Achats de la période */}
        <div className="card metric-card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <div className="metric-icon-box" style={{ backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            <ShoppingCart size={24} />
          </div>
          <div className="metric-data" style={{ flex: 1 }}>
            <span className="metric-value">{curSummary.purchasesTotal.toFixed(2)} {settings.currency}</span>
            <span className="metric-label">Total des achats</span>
            {renderDiffBadge(diffPurchases, 'neutral')}
          </div>
        </div>

        {/* 4. Coût moyen de production */}
        <div className="card metric-card" style={{ borderLeft: '4px solid var(--color-dark-light)' }}>
          <div className="metric-icon-box" style={{ backgroundColor: 'hsl(215, 20%, 93%)', color: 'var(--color-dark)' }}>
            <Activity size={24} />
          </div>
          <div className="metric-data" style={{ flex: 1 }}>
            <span className="metric-value">{curSummary.avgProductionCost.toFixed(2)} {settings.currency}</span>
            <span className="metric-label">
              Coût moy. production {curSummary.productionsCount > 0 ? `(${curSummary.productionsCount} lot${curSummary.productionsCount > 1 ? 's' : ''})` : ''}
            </span>
            {renderDiffBadge(diffProdCost, 'lower-is-good')}
          </div>
        </div>

        {/* 5. Alertes Stock (instantané) */}
        <div
          className="card metric-card"
          style={{ borderLeft: `4px solid ${lowStockProducts.length > 0 ? 'var(--color-danger)' : 'var(--color-secondary)'}` }}
        >
          <div
            className="metric-icon-box"
            style={{
              backgroundColor: lowStockProducts.length > 0 ? 'var(--color-danger-light)' : 'var(--color-secondary-light)',
              color: lowStockProducts.length > 0 ? 'var(--color-danger)' : 'var(--color-secondary)'
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <div className="metric-data" style={{ flex: 1 }}>
            <span className="metric-value">{lowStockProducts.length}</span>
            <span className="metric-label">{outOfStockCount > 0 ? `${outOfStockCount} rupture(s) de stock` : 'Stocks faibles'}</span>
            <div style={{ fontSize: '11px', color: 'var(--color-dark-light)', marginTop: '5px' }}>
              {lowStockProducts.length === 0 ? '✅ Tous stocks OK' : '⚠️ Réapprovisionnement'}
            </div>
          </div>
        </div>
      </div>

      {/* --- GRAPHIQUE DU CHIFFRE D'AFFAIRES (PAR JOUR OU PAR MOIS) --- */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div
          className="card-title"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={20} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontWeight: '700', fontSize: '16px' }}>
              Évolution du Chiffre d'Affaires
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-dark-light)', fontWeight: 'normal' }}>
              ({periodRange.label})
            </span>
          </div>

          {/* Bascule de granularité : jour ou mois */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-dark-light)', marginRight: '2px' }}>
              Vue :
            </span>
            <button
              type="button"
              onClick={() => setUserGranularity('day')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                borderRadius: 'var(--radius-sm)',
                border: activeGranularity === 'day' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                backgroundColor: activeGranularity === 'day' ? 'var(--color-primary-light)' : 'var(--color-white)',
                color: activeGranularity === 'day' ? 'var(--color-primary)' : 'var(--color-dark)',
                fontWeight: activeGranularity === 'day' ? '700' : '500',
                cursor: 'pointer'
              }}
            >
              Par jour
            </button>
            <button
              type="button"
              onClick={() => setUserGranularity('month')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                borderRadius: 'var(--radius-sm)',
                border: activeGranularity === 'month' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                backgroundColor: activeGranularity === 'month' ? 'var(--color-primary-light)' : 'var(--color-white)',
                color: activeGranularity === 'month' ? 'var(--color-primary)' : 'var(--color-dark)',
                fontWeight: activeGranularity === 'month' ? '700' : '500',
                cursor: 'pointer'
              }}
            >
              Par mois
            </button>
          </div>
        </div>

        {chartData.length === 0 || curSummary.salesRevenue === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--color-dark-light)' }}>
            <DollarSign size={36} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
              Aucune vente enregistrée sur cette période ({periodRange.label}).
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
              Enregistrez vos premières ventes ou sélectionnez une autre période dans le filtre ci-dessus.
            </p>
          </div>
        ) : (
          <div>
            <div style={{ width: '100%', overflowX: 'auto' }}>
              {(() => {
                const svgWidth = 760;
                const svgHeight = 180;
                const padLeft = 55;
                const padRight = 20;
                const padTop = 20;
                const padBottom = 30;
                const plotWidth = svgWidth - padLeft - padRight;
                const plotHeight = svgHeight - padTop - padBottom;

                const maxRevenue = Math.max(...chartData.map(d => d.revenue), 10);
                const barStep = plotWidth / chartData.length;
                const barWidth = Math.max(4, Math.min(32, barStep * 0.68));
                const gridSteps = [1, 0.5, 0];

                return (
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    style={{ width: '100%', height: 'auto', maxHeight: '220px', display: 'block' }}
                  >
                    {/* Lignes de repère horizontales */}
                    {gridSteps.map((step, idx) => {
                      const y = padTop + plotHeight * (1 - step);
                      const val = maxRevenue * step;
                      return (
                        <g key={idx}>
                          <line
                            x1={padLeft}
                            y1={y}
                            x2={svgWidth - padRight}
                            y2={y}
                            stroke="var(--color-border)"
                            strokeDasharray={step > 0 ? '3 3' : 'none'}
                            strokeWidth="1"
                          />
                          <text
                            x={padLeft - 8}
                            y={y + 4}
                            textAnchor="end"
                            fontSize="10"
                            fill="var(--color-dark-light)"
                          >
                            {val.toFixed(0)} {settings.currency}
                          </text>
                        </g>
                      );
                    })}

                    {/* Barres verticales */}
                    {chartData.map((d, i) => {
                      const x = padLeft + i * barStep + (barStep - barWidth) / 2;
                      const h = maxRevenue > 0 ? (d.revenue / maxRevenue) * plotHeight : 0;
                      const y = padTop + plotHeight - h;
                      const isHovered = hoveredPoint?.key === d.key;
                      const hasRevenue = d.revenue > 0;

                      const showLabel =
                        chartData.length <= 14 ||
                        i % Math.ceil(chartData.length / 10) === 0 ||
                        i === chartData.length - 1;

                      return (
                        <g
                          key={d.key}
                          onMouseEnter={() => setHoveredPoint(d)}
                          onMouseLeave={() => setHoveredPoint(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          <title>
                            {`${d.fullLabel} : ${d.revenue.toFixed(2)} ${settings.currency} (${d.salesCount} vente${d.salesCount > 1 ? 's' : ''})`}
                          </title>
                          {/* Zone de survol transparente */}
                          <rect
                            x={padLeft + i * barStep}
                            y={padTop}
                            width={barStep}
                            height={plotHeight}
                            fill="transparent"
                          />
                          {/* Barre */}
                          <rect
                            x={x}
                            y={hasRevenue ? y : padTop + plotHeight - 2}
                            width={barWidth}
                            height={hasRevenue ? Math.max(3, h) : 2}
                            rx="3"
                            ry="3"
                            fill={
                              isHovered
                                ? 'var(--color-primary-hover)'
                                : hasRevenue
                                ? 'var(--color-primary)'
                                : 'hsl(215, 20%, 90%)'
                            }
                            style={{
                              transition: 'fill 0.15s ease, opacity 0.15s ease',
                              opacity: hoveredPoint && !isHovered ? 0.5 : 1
                            }}
                          />
                          {/* Label X */}
                          {showLabel && (
                            <text
                              x={padLeft + i * barStep + barStep / 2}
                              y={svgHeight - 10}
                              textAnchor="middle"
                              fontSize="10"
                              fill={isHovered ? 'var(--color-primary)' : 'var(--color-dark-light)'}
                              fontWeight={isHovered ? '700' : 'normal'}
                            >
                              {d.label}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>

            {/* Résumé interactif */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '12px',
                paddingTop: '10px',
                borderTop: '1px solid var(--color-border)',
                fontSize: '12px',
                color: 'var(--color-dark-light)',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div>
                {hoveredPoint ? (
                  <span style={{ color: 'var(--color-dark)', fontWeight: '600' }}>
                    📍 {hoveredPoint.fullLabel} :{' '}
                    <span style={{ color: 'var(--color-primary)' }}>
                      {hoveredPoint.revenue.toFixed(2)} {settings.currency}
                    </span>{' '}
                    ({hoveredPoint.salesCount} vente{hoveredPoint.salesCount > 1 ? 's' : ''})
                  </span>
                ) : (
                  <span>💡 Survolez une barre pour voir le détail quotidien ou mensuel</span>
                )}
              </div>
              <div style={{ fontWeight: '600', color: 'var(--color-dark)' }}>
                Total période :{' '}
                <span style={{ color: 'var(--color-secondary)' }}>
                  {curSummary.salesRevenue.toFixed(2)} {settings.currency}
                </span>{' '}
                • {curSummary.salesCount} vente{curSummary.salesCount > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- RACCOURCIS RAPIDES --- */}
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Raccourcis rapides</h3>
      <div className="quick-links" style={{ marginBottom: '28px' }}>
        <button className="quick-link-btn" onClick={() => onNavigate('Achats', { triggerScan: true })}>
          <ShoppingCart size={22} style={{ color: 'var(--color-primary)' }} />
          <span>Scanner Achat</span>
        </button>
        <button className="quick-link-btn" onClick={() => onNavigate('Produits', { triggerAdd: true })}>
          <Plus size={22} style={{ color: 'var(--color-dark)' }} />
          <span>Ingrédient</span>
        </button>
        <button className="quick-link-btn" onClick={() => onNavigate('Recettes', { triggerAdd: true })}>
          <ChefHat size={22} style={{ color: 'var(--color-secondary)' }} />
          <span>Créer Recette</span>
        </button>
        <button className="quick-link-btn" onClick={() => onNavigate('Production', { triggerAdd: true })}>
          <Sparkles size={22} style={{ color: 'var(--color-warning)' }} />
          <span>Produire Lot</span>
        </button>
        <button className="quick-link-btn" onClick={() => onNavigate('Ventes', { triggerAdd: true })}>
          <DollarSign size={22} style={{ color: 'var(--color-secondary)' }} />
          <span>Enregistrer Vente</span>
        </button>
      </div>

      {/* --- BLOC « À CONSOMMER BIENTÔT » (DLC / DLUO) --- */}
      <div
        className="card"
        style={{
          marginBottom: '28px',
          borderLeft: `4px solid ${expiredCount > 0 ? 'var(--color-danger)' : warningCount > 0 ? 'var(--color-warning)' : 'var(--color-secondary)'}`,
          backgroundColor: expiredCount > 0 ? 'rgba(239, 68, 68, 0.04)' : warningCount > 0 ? 'rgba(245, 158, 11, 0.04)' : 'var(--color-surface)'
        }}
      >
        <div
          className="card-title"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '16px' }}>
            <Clock size={20} style={{ color: expiredCount > 0 ? 'var(--color-danger)' : warningCount > 0 ? 'var(--color-warning)' : 'var(--color-secondary)' }} />
            À consommer bientôt
          </span>
          <div style={{ display: 'flex', gap: '6px', fontSize: '12px' }}>
            {expiredCount > 0 && (
              <span className="badge badge-danger" style={{ padding: '3px 8px', fontWeight: '700' }}>
                {expiredCount} dépassé{expiredCount > 1 ? 's' : ''}
              </span>
            )}
            {warningCount > 0 && (
              <span className="badge badge-warning" style={{ padding: '3px 8px', fontWeight: '700' }}>
                {warningCount} dans les {alertDays} jours
              </span>
            )}
            {expiringPurchases.length === 0 && (
              <span className="badge badge-success" style={{ padding: '3px 8px' }}>
                Tous les stocks à jour
              </span>
            )}
          </div>
        </div>

        {expiringPurchases.length === 0 ? (
          <p style={{ color: 'var(--color-dark-light)', fontSize: '13px', margin: 0, fontStyle: 'italic' }}>
            ✅ Aucun achat à date limite dépassée ou arrivant dans les {alertDays} jours pour les produits actuellement en stock.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {expiringPurchases.map(item => {
              const isPast = item.isExpired;
              return (
                <div
                  key={item.purchase.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isPast ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                    backgroundColor: isPast ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '220px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong
                        style={{ fontSize: '14px', cursor: 'pointer', color: 'var(--color-primary)' }}
                        onClick={() => onNavigate('Produits', { selectedProductId: item.product.id })}
                      >
                        {cleanProductName(item.product.name)}
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--color-dark-light)' }}>
                        ({formatStock(item.product.stock)} {item.product.unit} en stock)
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-dark-light)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                      <span>
                        <strong>Lot :</strong> {item.purchase.batchNo || 'Non précisé'}
                      </span>
                      <span>
                        <strong>Fournisseur :</strong> {item.store?.name || 'Inconnu'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: isPast ? '#dc2626' : '#b45309' }}>
                        {item.formattedDate}
                      </div>
                      <div style={{ fontSize: '11px', color: isPast ? '#dc2626' : '#b45309', fontWeight: '500' }}>
                        {item.label}
                      </div>
                    </div>
                    <span
                      className={`badge ${isPast ? 'badge-danger' : 'badge-warning'}`}
                      style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '700' }}
                    >
                      {isPast ? 'DÉPASSÉE' : 'À CONSOMMER'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- SECTION DES ALERTES DÉTECTÉES --- */}
      {(lowStockProducts.length > 0 || lowMarginRecipes.length > 0) && (
        <div className="card" style={{ marginBottom: '28px', backgroundColor: 'var(--color-danger-light)', borderColor: 'rgba(255, 75, 75, 0.2)' }}>
          <div className="card-title" style={{ color: 'var(--color-danger)', marginBottom: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} />
              Alertes importantes nécessitant votre attention
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Alerte stock faible */}
            {lowStockProducts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--color-dark)' }}>⚠️ Ingrédients en stock faible ou critique :</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {lowStockProducts.map(p => (
                    <span 
                      key={p.id} 
                      className={`badge ${p.stock === 0 ? 'badge-danger' : 'badge-warning'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onNavigate('Achats', { prefillProductId: p.id })}
                    >
                      {cleanProductName(p.name)} ({formatStock(p.stock)} {p.unit} restants) + Réapprovisionner
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Alerte Marge Faible (recalculée sur la période) */}
            {lowMarginRecipes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255, 75, 75, 0.1)', paddingTop: '12px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--color-dark)' }}>💸 Recettes avec marges sous la cible ({settings.defaultTargetMargin}%) sur la période :</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {lowMarginRecipes.slice(0, 3).map(r => (
                    <span 
                      key={r.recipe.id} 
                      className="badge badge-danger"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onNavigate('Recettes', { viewRecipeId: r.recipe.id })}
                    >
                      {r.recipe.name} (Marge : {r.marginPercent.toFixed(0)}%) - Ajuster prix
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- DEUX SECTIONS PRINCIPALES D'ANALYSE --- */}
      <div className="grid-cols-details">
        {/* Recettes les plus rentables recalculées sur la période */}
        <div className="card">
          <div className="card-title">
            <span>✨ Recettes les plus rentables</span>
            <span style={{ fontSize: '12px', color: 'var(--color-dark-light)', fontWeight: 'normal' }}>
              {periodRange.label} • Trié par marge %
            </span>
          </div>

          {recipesWithProfit.length === 0 ? (
            <p style={{ color: 'var(--color-dark-light)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
              Aucune recette enregistrée. Créez-en une pour estimer sa rentabilité !
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recipesWithProfit.slice(0, 4).map(({ recipe, costInfo, profitUnit, marginPercent, qtySoldInPeriod }) => (
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
                  onClick={() => onNavigate('Recettes', { viewRecipeId: recipe.id })}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <strong style={{ fontSize: '14px' }}>{recipe.name}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--color-dark-light)' }}>
                      Prix constaté : {costInfo.isApproximate ? '≈ ' : ''}{costInfo.suggestedSellingPrice.toFixed(2)} {settings.currency}/portion (Coût : {costInfo.isApproximate ? '≈ ' : ''}{costInfo.costPerPortion.toFixed(2)} {settings.currency}/portion)
                    </span>
                    {costInfo.hasIncompatibleUnits && (
                      <span style={{ fontSize: '11px', color: 'var(--color-danger)', fontWeight: '700' }}>
                        ⚠️ Unités incompatibles
                      </span>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span 
                      className={`badge ${marginPercent >= settings.defaultTargetMargin ? 'badge-success' : 'badge-warning'}`}
                      style={{ fontSize: '12px' }}
                    >
                      Marge {costInfo.isApproximate ? '≈ ' : ''}{marginPercent.toFixed(0)}%
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-secondary)', fontWeight: '600' }}>
                      {costInfo.isApproximate ? '≈ ' : ''}+{profitUnit.toFixed(2)} {settings.currency}/portion
                    </span>
                    {qtySoldInPeriod > 0 && (
                      <span style={{ fontSize: '10px', color: 'var(--color-dark-light)' }}>
                        {qtySoldInPeriod} vendue{qtySoldInPeriod > 1 ? 's' : ''} sur la période
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historique récent des achats */}
        <div className="card">
          <div className="card-title">
            <span>🛒 Derniers achats</span>
            <button className="btn btn-secondary" style={{ height: '32px', fontSize: '12px', padding: '0 12px' }} onClick={() => onNavigate('Achats')}>
              Voir tout
            </button>
          </div>

          {purchases.length === 0 ? (
            <p style={{ color: 'var(--color-dark-light)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
              Aucun achat enregistré.
            </p>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};
