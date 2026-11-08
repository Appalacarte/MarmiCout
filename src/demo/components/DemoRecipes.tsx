import React, { useState } from 'react';
import { ChefHat, Plus, Search, Lock, Clock, Sparkles } from 'lucide-react';
import { demoDbService, notifyReadOnlyBlocked } from '../services/demoDb';
import { Recipe, RecipeIngredient, RecipePackaging } from '../../types';
import { Drawer } from '../../components/Drawer';

export const DemoRecipes: React.FC = () => {
  const [recipes] = useState<Recipe[]>(() => demoDbService.getRecipes());
  const [products] = useState(() => demoDbService.getProducts());
  const settings = demoDbService.getSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [recipePackagings, setRecipePackagings] = useState<RecipePackaging[]>([]);

  const handleOpenRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setRecipeIngredients(demoDbService.getRecipeIngredients(recipe.id));
    setRecipePackagings(demoDbService.getRecipePackagings(recipe.id));
  };

  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === '' || r.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Fiches Techniques & Coûts de Revient</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-dark-light)', margin: '4px 0 0 0' }}>
            Calcul instantané des marges et du coût par portion selon les prix réels de vos ingrédients et emballages.
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={() => notifyReadOnlyBlocked("La création de nouvelle fiche recette")}
          title="Réservé à la version complète"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          <span>Créer Fiche Recette</span>
          <Lock size={12} style={{ opacity: 0.6 }} />
        </button>
      </div>

      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Rechercher une recette ou plat..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '38px', width: '100%' }}
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="form-control"
              style={{ width: '100%' }}
            >
              <option value="">Toutes les catégories</option>
              {settings.recipeCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {filteredRecipes.map(recipe => {
          const costInfo = demoDbService.calculateRecipeCost(recipe.id);
          return (
            <div
              key={recipe.id}
              className="card"
              style={{
                padding: '20px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.15s, box-shadow 0.15s'
              }}
              onClick={() => handleOpenRecipe(recipe)}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '11px' }}>
                    {recipe.category}
                  </span>
                  {recipe.prepTimeMinutes && (
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} />
                      {recipe.prepTimeMinutes} min
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
                  {recipe.name}
                </h3>

                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                  {recipe.description}
                </p>
              </div>

              <div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '14px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Coût portion :</span><br />
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{costInfo.costPerPortion.toFixed(2)} {settings.currency}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Prix conseillé :</span><br />
                    <strong style={{ fontSize: '14px', color: 'var(--color-secondary)' }}>{costInfo.suggestedSellingPrice.toFixed(2)} {settings.currency}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Rendement :</span><br />
                    <strong>{recipe.portions} portions</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Marge cible :</span><br />
                    <strong style={{ color: '#3730a3' }}>{settings.defaultTargetMargin}%</strong>
                  </div>
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={e => {
                    e.stopPropagation();
                    handleOpenRecipe(recipe);
                  }}
                >
                  <ChefHat size={14} />
                  <span>Consulter la fiche technique</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drawer de la Fiche Technique */}
      <Drawer
        isOpen={Boolean(selectedRecipe)}
        onClose={() => setSelectedRecipe(null)}
        title={selectedRecipe ? `Fiche : ${selectedRecipe.name}` : 'Fiche Technique'}
      >
        {selectedRecipe && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                <div><strong>Catégorie :</strong> {selectedRecipe.category}</div>
                <div><strong>Rendement :</strong> {selectedRecipe.portions} {selectedRecipe.yieldUnit}</div>
                <div><strong>Temps préparation :</strong> {selectedRecipe.prepTimeMinutes || '—'} minutes</div>
                <div><strong>Stock actuel fini :</strong> {selectedRecipe.stock} portions</div>
              </div>
              {selectedRecipe.utensilsNotes && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#475569' }}>
                  <strong>Matériel requis :</strong> {selectedRecipe.utensilsNotes}
                </div>
              )}
            </div>

            {/* Ingrédients */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>Ingrédients nécessaires</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {recipeIngredients.map(ri => {
                  const prod = products.find(p => p.id === ri.productId);
                  return (
                    <div key={ri.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}>
                      <div>
                        <strong>{prod?.name || ri.customName || 'Ingrédient'}</strong>
                      </div>
                      <div style={{ fontWeight: '600', color: '#3730a3' }}>
                        {ri.qtyUsed} {ri.unit}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Emballages */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>Emballages & Conditionnement</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {recipePackagings.map(rp => (
                  <div key={rp.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}>
                    <span>{rp.name} (x{rp.qtyUsed})</span>
                    <span style={{ fontWeight: '600' }}>{(rp.qtyUsed * rp.costPerUnit).toFixed(2)} {settings.currency}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            {selectedRecipe.instructions && (
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>Étapes de fabrication</h4>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '12px', whiteSpace: 'pre-line', lineHeight: 1.5, color: '#334155' }}>
                  {selectedRecipe.instructions}
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => notifyReadOnlyBlocked('La modification de la fiche recette')}
              >
                <span>Modifier</span>
                <Lock size={12} />
              </button>
              <button
                className="btn btn-danger"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => notifyReadOnlyBlocked('La suppression de la fiche recette')}
              >
                <span>Supprimer</span>
                <Lock size={12} />
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
