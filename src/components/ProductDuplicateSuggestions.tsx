import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { Product } from '../types/index.ts';
import {
  findExactDuplicateProduct,
  searchDuplicateSuggestions,
} from '../utils/productDuplicate.ts';
import { cleanProductName, formatStock } from '../utils/units.ts';

interface ProductDuplicateSuggestionsProps {
  inputName: string;
  allProducts: Product[];
  onSelectProduct?: (product: Product) => void;
  ignoreProductId?: string;
  showSuggestions?: boolean;
  actionLabel?: string;
}

export const ProductDuplicateSuggestions: React.FC<ProductDuplicateSuggestionsProps> = ({
  inputName,
  allProducts,
  onSelectProduct,
  ignoreProductId,
  showSuggestions = true,
  actionLabel = 'Sélectionner',
}) => {
  const trimmed = inputName.trim();
  if (!trimmed) return null;

  const exactDuplicate = findExactDuplicateProduct(trimmed, allProducts, ignoreProductId);
  const suggestions = showSuggestions
    ? searchDuplicateSuggestions(trimmed, allProducts, {
        maxResults: 5,
        ignoreProductId,
      })
    : [];

  if (!exactDuplicate && suggestions.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Avertissement si doublon exact */}
      {exactDuplicate && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: 'var(--color-warning-light, #fef3c7)',
            border: '1px solid var(--color-warning, #f59e0b)',
            borderRadius: 'var(--radius-md, 6px)',
            color: '#92400e',
            fontSize: '12px',
            lineHeight: 1.4,
          }}
        >
          <AlertTriangle size={18} style={{ color: 'var(--color-warning, #f59e0b)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong>Ce produit existe déjà</strong>
            <span style={{ marginLeft: '6px' }}>
              : « {cleanProductName(exactDuplicate.name)} » ({formatStock(exactDuplicate.stock)} {exactDuplicate.unit} en stock
              {!exactDuplicate.isActive ? ' — désactivé' : ''})
            </span>
          </div>
        </div>
      )}

      {/* Liste de suggestions (masquée en mode édition) */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          style={{
            border: '1px solid var(--color-border, #e2e8f0)',
            borderRadius: 'var(--radius-md, 8px)',
            backgroundColor: 'var(--color-white, #ffffff)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '6px 12px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid var(--color-border, #e2e8f0)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-dark-light, #64748b)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Produits existants correspondants</span>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>{suggestions.length} trouvé(s)</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {suggestions.map((p) => {
              const isExact = exactDuplicate && exactDuplicate.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectProduct?.(p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    border: 'none',
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: isExact ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    fontSize: '12px',
                    gap: '12px',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isExact
                      ? 'rgba(245, 158, 11, 0.16)'
                      : 'var(--color-primary-light, #fff7ed)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isExact
                      ? 'rgba(245, 158, 11, 0.08)'
                      : 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontWeight: 600,
                        color: 'var(--color-dark, #0f172a)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cleanProductName(p.name)}
                    </span>
                    {p.brand && (
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--color-dark-light, #64748b)',
                          flexShrink: 0,
                        }}
                      >
                        ({p.brand})
                      </span>
                    )}
                    {!p.isActive && (
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#fee2e2',
                          color: '#991b1b',
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        désactivé
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-dark-light, #64748b)' }}>
                      Stock : <strong style={{ color: 'var(--color-dark, #0f172a)' }}>{formatStock(p.stock)} {p.unit}</strong>
                    </span>
                    {actionLabel && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--color-primary, #ea580c)',
                        }}
                      >
                        {actionLabel}
                        <ArrowRight size={12} />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
