import React from 'react';
import { Recipe, RecipeIngredient, RecipePackaging, Product } from '../../types';
import { formatQtyFr, normalizeUnit, convertUnitsWithInfo } from '../../utils/units';
import { calculateRecipeAllergens, ALLERGEN_DISCLAIMER } from '../../utils/allergens';

interface RecipeTechSheetProps {
  recipe: Recipe;
  ingredients: RecipeIngredient[];
  packagings: RecipePackaging[];
  products: Product[];
  portions: number;
  withCosts: boolean;
  costInfo: {
    totalCost: number;
    costPerPortion: number;
    suggestedSellingPrice: number;
  } | null;
  sellingPrice?: number;
  margin?: number;
  establishmentName: string;
  currency: string;
}

export const RecipeTechSheet: React.FC<RecipeTechSheetProps> = ({
  recipe,
  ingredients,
  packagings,
  products,
  portions,
  withCosts,
  costInfo,
  sellingPrice,
  margin = 60,
  establishmentName,
  currency,
}) => {
  const scaleFactor = portions / (recipe.portions || 1);
  const productMap = new Map(products.map(p => [p.id, p]));
  const allergenInfo = calculateRecipeAllergens(ingredients, productMap);

  const formattedDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Découpage des instructions en étapes propres
  const steps = recipe.instructions
    ? recipe.instructions
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="tech-sheet-document">
      {/* EN-TÊTE ÉTABLISSEMENT & TITRE */}
      <header className="tech-sheet-header">
        <div className="header-left">
          <div className="establishment-name">{establishmentName || 'MarmiCout'}</div>
          <h1 className="sheet-title">FICHE TECHNIQUE DE FABRICATION</h1>
          <div className="sheet-subtitle">
            Éditée le {formattedDate} {withCosts ? '• Version chiffrée (gestion)' : '• Version cuisine (atelier)'}
          </div>
        </div>
        <div className="header-right">
          <div className="category-badge">{recipe.category || 'Non catégorisé'}</div>
          <div className="meta-grid">
            <div className="meta-item">
              <span className="meta-label">Portions :</span>
              <strong className="meta-value">{portions} {portions > 1 ? 'parts' : 'part'}</strong>
            </div>
            {recipe.portions !== portions && (
              <div className="meta-sub">
                (recette de base : {recipe.portions} p.)
              </div>
            )}
            <div className="meta-item">
              <span className="meta-label">Temps :</span>
              <strong className="meta-value">{recipe.prepTimeMinutes ? `${recipe.prepTimeMinutes} min` : '—'}</strong>
            </div>
            {recipe.yieldQty > 0 && (
              <div className="meta-item">
                <span className="meta-label">Rendement :</span>
                <strong className="meta-value">
                  {(recipe.yieldQty * scaleFactor).toFixed(1)} {recipe.yieldUnit || 'u'}
                </strong>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* TITRE DE LA RECETTE ET PHOTO */}
      <section className="recipe-hero-section">
        <div className="recipe-hero-info">
          <h2 className="recipe-main-name">{recipe.name}</h2>
          {recipe.description && (
            <p className="recipe-desc">{recipe.description}</p>
          )}
        </div>
        {recipe.photo && (
          <div className="recipe-photo-wrapper">
            <img src={recipe.photo} alt={recipe.name} className="recipe-photo-img" />
          </div>
        )}
      </section>

      {/* BLOC FINANCIER (UNIQUEMENT SI OPTION AVEC LES COÛTS) */}
      {withCosts && costInfo && (
        <section className="costs-summary-box">
          <div className="cost-summary-item">
            <span className="cost-label">Coût de revient du lot</span>
            <strong className="cost-value highlight">
              {(costInfo.totalCost * scaleFactor).toFixed(2)} {currency}
            </strong>
            <span className="cost-detail">pour {portions} portion(s)</span>
          </div>
          <div className="cost-summary-item">
            <span className="cost-label">Coût par portion</span>
            <strong className="cost-value">
              {costInfo.costPerPortion.toFixed(2)} {currency}
            </strong>
            <span className="cost-detail">coût unitaire matière</span>
          </div>
          <div className="cost-summary-item">
            <span className="cost-label">Prix de vente conseillé</span>
            <strong className="cost-value secondary">
              {((sellingPrice || costInfo.suggestedSellingPrice)).toFixed(2)} {currency}
            </strong>
            <span className="cost-detail">par portion TTC</span>
          </div>
          <div className="cost-summary-item">
            <span className="cost-label">Taux de marge cible</span>
            <strong className="cost-value">
              {margin}%
            </strong>
            <span className="cost-detail">brute sur coût</span>
          </div>
        </section>
      )}

      {/* CORPS PRINCIPAL EN 2 COLONNES */}
      <div className="tech-sheet-body">
        {/* COLONNE GAUCHE : INGRÉDIENTS & MATÉRIEL */}
        <div className="column-left">
          {/* TABLEAU DES INGRÉDIENTS */}
          <div className="section-block">
            <h3 className="section-title">
              Ingrédients requis ({ingredients.length})
            </h3>
            <table className="print-table ingredients-table">
              <thead>
                <tr>
                  <th style={{ width: '55%' }}>Ingrédient</th>
                  <th style={{ width: '25%', textAlign: 'right' }}>Quantité</th>
                  <th style={{ width: '20%' }}>Unité</th>
                  {withCosts && <th style={{ width: '25%', textAlign: 'right' }}>Coût</th>}
                </tr>
              </thead>
              <tbody>
                {ingredients.map(ri => {
                  const prod = ri.productId ? productMap.get(ri.productId) : undefined;
                  const qtyOrig = ri.originalQtyUsed || ri.qtyUsed;
                  const qtyAjust = qtyOrig * scaleFactor;
                  const normRiUnit = normalizeUnit(ri.unit) || ri.unit;
                  const normProdUnit = prod ? (normalizeUnit(prod.unit) || prod.unit) : normRiUnit;
                  const conv = prod
                    ? convertUnitsWithInfo(qtyAjust, normRiUnit, normProdUnit, prod)
                    : { value: qtyAjust, approximate: false };
                  const costLine = prod
                    ? (conv.value !== null ? conv.value * prod.avgPurchasePrice : null)
                    : qtyAjust * (ri.customCostPerUnit || 0);

                  return (
                    <tr key={ri.id}>
                      <td className="ingredient-name">
                        <strong>{prod?.name || ri.customName || 'Ingrédient'}</strong>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>{formatQtyFr(qtyAjust)}</strong>
                      </td>
                      <td className="unit-cell">{normRiUnit}</td>
                      {withCosts && (
                        <td style={{ textAlign: 'right' }} className="cost-cell">
                          {costLine !== null ? `${costLine.toFixed(2)} ${currency}` : '—'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* EMBALLAGES (SI PRÉSENTS) */}
          {packagings.length > 0 && (
            <div className="section-block packagings-block">
              <h3 className="section-title">Emballages & Conditionnement</h3>
              <table className="print-table">
                <thead>
                  <tr>
                    <th>Emballage</th>
                    <th style={{ textAlign: 'right' }}>Quantité</th>
                    {withCosts && <th style={{ textAlign: 'right' }}>Coût</th>}
                  </tr>
                </thead>
                <tbody>
                  {packagings.map(rp => (
                    <tr key={rp.id}>
                      <td>{rp.name}</td>
                      <td style={{ textAlign: 'right' }}>
                        {(rp.qtyUsed * scaleFactor).toFixed(1)} u
                      </td>
                      {withCosts && (
                        <td style={{ textAlign: 'right' }}>
                          {(rp.qtyUsed * scaleFactor * rp.costPerUnit).toFixed(2)} {currency}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* MATÉRIEL ET USTENSILES */}
          {recipe.utensilsNotes && (
            <div className="section-block utensils-block">
              <h3 className="section-title">Matériel & Ustensiles</h3>
              <div className="utensils-content">
                {recipe.utensilsNotes}
              </div>
            </div>
          )}

          {/* ALLERGÈNES UE */}
          <div className="section-block allergens-block">
            <h3 className="section-title">
              Allergènes (Règlement UE n° 1169/2011)
            </h3>
            {allergenInfo.allergens.length > 0 ? (
              <div className="allergens-declared">
                <span className="allergens-label">Présence déclarée : </span>
                {allergenInfo.allergens.map((allergen, idx) => (
                  <span key={allergen} className="allergen-tag">
                    <strong>{allergen.toUpperCase()}</strong>
                    {idx < allergenInfo.allergens.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            ) : allergenInfo.isFullyVerified ? (
              <div className="allergens-safe">
                ✓ Aucun des 14 allergènes majeurs (ingrédients vérifiés)
              </div>
            ) : (
              <div className="allergens-warning">
                ⚠️ Aucun allergène sur les ingrédients vérifiés, mais certains ingrédients restent à valider.
              </div>
            )}

            {!allergenInfo.isFullyVerified && allergenInfo.unverifiedItems.length > 0 && (
              <div className="unverified-items">
                <small>
                  À vérifier : {allergenInfo.unverifiedItems.map(i => i.name).join(', ')}
                </small>
              </div>
            )}
            <div className="allergen-disclaimer">
              {ALLERGEN_DISCLAIMER}
            </div>
          </div>
        </div>

        {/* COLONNE DROITE : ÉTAPES & NOTES */}
        <div className="column-right">
          {/* ÉTAPES DE PRÉPARATION */}
          <div className="section-block instructions-block">
            <h3 className="section-title">Étapes de Préparation</h3>
            {steps.length > 0 ? (
              <ol className="steps-list">
                {steps.map((step, idx) => (
                  <li key={idx} className="step-item">
                    <span className="step-num">{idx + 1}</span>
                    <span className="step-text">{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="no-steps">
                Aucune étape renseignée pour cette recette.
              </div>
            )}
          </div>

          {/* ASTUCE / CONSEILS DU CHEF */}
          {recipe.notes && (
            <div className="section-block notes-block">
              <h3 className="section-title">Conseils & Astuces du Chef</h3>
              <div className="notes-content">
                {recipe.notes}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PIED DE PAGE DISCRET */}
      <footer className="tech-sheet-footer">
        <span>MarmiCout • {establishmentName || 'Mon Établissement'}</span>
        <span>Fiche technique de cuisine • Conforme aux normes HACCP</span>
      </footer>
    </div>
  );
};
