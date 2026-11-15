import React from 'react';
import { Recipe } from '../../types';

export type LabelFormat = 'sheet21' | 'sheet24' | 'single';

interface RecipeLabelsProps {
  recipe: Recipe;
  establishmentName: string;
  allergens: string[];
  isFullyVerified?: boolean;
  manufactureDate: string; // YYYY-MM-DD
  conservationDays: number;
  format: LabelFormat;
  quantity: number;
}

export const RecipeLabels: React.FC<RecipeLabelsProps> = ({
  recipe,
  establishmentName,
  allergens,
  isFullyVerified = true,
  manufactureDate,
  conservationDays,
  format,
  quantity,
}) => {
  // Calcul de la DLC
  const mDate = manufactureDate ? new Date(manufactureDate) : new Date();
  const dlcDate = new Date(mDate);
  dlcDate.setDate(dlcDate.getDate() + (conservationDays || 0));

  const formatFrenchDate = (d: Date) => {
    return isNaN(d.getTime())
      ? '—'
      : d.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
  };

  const fabStr = formatFrenchDate(mDate);
  const dlcStr = formatFrenchDate(dlcDate);

  // Génération du tableau d'étiquettes
  const labelsCount = Math.max(1, quantity);
  const labelsArray = Array.from({ length: labelsCount }, (_, i) => i);

  return (
    <div className={`labels-container format-${format}`}>
      {labelsArray.map((_, index) => (
        <div key={index} className={`label-item format-${format}-item`}>
          <div className="label-header">
            <span className="label-establishment">{establishmentName || 'MarmiCout'}</span>
            <span className="label-haccp-badge">DLC</span>
          </div>

          <div className="label-product-name" title={recipe.name}>
            {recipe.name}
          </div>

          <div className="label-dates-grid">
            <div className="label-date-row">
              <span className="date-title">Fabrication :</span>
              <span className="date-val">{fabStr}</span>
            </div>
            <div className="label-date-row dlc-row">
              <span className="date-title">À consommer jusqu'au :</span>
              <strong className="date-val dlc-val">{dlcStr}</strong>
            </div>
          </div>

          <div className="label-allergens">
            <span className="allergens-prefix">Allergènes : </span>
            {allergens.length > 0 ? (
              <span className="allergens-list">
                {allergens.map((a, i) => (
                  <strong key={i} className="allergen-bold">
                    {a.toUpperCase()}
                    {i < allergens.length - 1 ? ', ' : ''}
                  </strong>
                ))}
              </span>
            ) : isFullyVerified ? (
              <span className="allergens-none">
                <strong>Aucun des 14 majeurs</strong>
              </span>
            ) : (
              <span className="allergens-warning">
                <strong>Présence possible</strong> (à valider)
              </span>
            )}
          </div>

          <div className="label-footer">
            <span className="label-storage">À conserver entre 0°C et +4°C</span>
            <span className="label-num">#{index + 1}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
