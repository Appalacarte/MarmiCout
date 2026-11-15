import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  ChefHat,
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit2,
  DollarSign,
  TrendingUp,
  Package,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { dbService, isCloudMode } from '../services/db';
import { generateUUID, isUUID } from '../services/cloudDbService';
import { PlannedRecipe, Recipe, Product, RecipeIngredient } from '../types';
import {
  getWeekDays,
  getWeekRangeLabel,
  calculateWeekFinancials,
  calculateWeekRequirements,
  prepareShoppingSelections,
  WeekDay,
} from '../utils/planning';
import { Drawer } from './Drawer';
import { ShoppingListDrawer } from './ShoppingListDrawer';
import { parseDecimalInput } from '../utils';

interface PlanningProps {
  onNavigate?: (tab: string, extraData?: Record<string, unknown>) => void;
}

export const Planning: React.FC<PlanningProps> = ({ onNavigate }) => {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [planning, setPlanning] = useState<PlannedRecipe[]>(() => dbService.getPlanning());
  const [recipes, setRecipes] = useState<Recipe[]>(() => dbService.getRecipes().filter((r) => r.isActive));
  const [products, setProducts] = useState<Product[]>(() => dbService.getProducts());
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(() => dbService.getAllRecipeIngredients());
  const settings = dbService.getSettings();

  // Drawer d'ajout / modification de recette planifiée
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PlannedRecipe | null>(null);
  const [formDate, setFormDate] = useState('');
  const [formRecipeId, setFormRecipeId] = useState('');
  const [formPortions, setFormPortions] = useState(1);
  const [formMealSlot, setFormMealSlot] = useState<'midi' | 'soir' | 'journee'>('journee');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Drawer Liste de courses existant
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);

  // Filtre pour la liste des ingrédients requis
  const [showOnlyMissingIngredients, setShowOnlyMissingIngredients] = useState(false);

  // Notification d'action (cuisiné avec succès)
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Chargement des données
  const loadData = () => {
    setPlanning(dbService.getPlanning());
    setRecipes(dbService.getRecipes().filter((r) => r.isActive));
    setProducts(dbService.getProducts());
    setIngredients(dbService.getAllRecipeIngredients());
  };

  useEffect(() => {
    const handleSync = () => loadData();
    window.addEventListener('marmicout-data-synced', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('marmicout-data-synced', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Détermination des 7 jours de la semaine courante
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const weekDates = useMemo(() => weekDays.map((d) => d.date), [weekDays]);
  const weekRangeLabel = useMemo(() => getWeekRangeLabel(currentDate), [currentDate]);

  // Recettes planifiées sur cette semaine
  const weekPlanned = useMemo(() => {
    return planning.filter((p) => weekDates.includes(p.date));
  }, [planning, weekDates]);

  // Map des recettes pour accès direct
  const recipeMap = useMemo(() => {
    return new Map<string, Recipe>(recipes.map((r) => [r.id, r]));
  }, [recipes]);

  // Calcul du coût et des indicateurs financiers prévisionnels
  const financials = useMemo(() => {
    return calculateWeekFinancials(weekPlanned, recipes, (recipeId) => {
      return dbService.calculateRecipeCost(recipeId);
    });
  }, [weekPlanned, recipes]);

  // Calcul des besoins en ingrédients et stocks manquants
  const requirementsResult = useMemo(() => {
    return calculateWeekRequirements(weekPlanned, recipes, ingredients, products);
  }, [weekPlanned, recipes, ingredients, products]);

  // Sélections pour le ShoppingListDrawer
  const shoppingSelections = useMemo(() => {
    return prepareShoppingSelections(weekPlanned, recipes);
  }, [weekPlanned, recipes]);

  // Navigation dans le temps
  const handlePrevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Ouverture du formulaire d'ajout
  const handleOpenAddForm = (defaultDate?: string) => {
    setEditingItem(null);
    setFormDate(defaultDate || weekDays[0].date);
    const firstRecipe = recipes[0];
    setFormRecipeId(firstRecipe ? firstRecipe.id : '');
    setFormPortions(firstRecipe ? firstRecipe.portions : 1);
    setFormMealSlot('journee');
    setFormNotes('');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Ouverture du formulaire de modification
  const handleOpenEditForm = (item: PlannedRecipe) => {
    setEditingItem(item);
    setFormDate(item.date);
    setFormRecipeId(item.recipeId);
    setFormPortions(item.portions);
    setFormMealSlot((item.mealSlot as 'midi' | 'soir' | 'journee') || 'journee');
    setFormNotes(item.notes || '');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Enregistrement d'un item planifié
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRecipeId) {
      setFormError('Veuillez sélectionner une recette.');
      return;
    }
    if (isCloudMode() && !isUUID(formRecipeId)) {
      setFormError(
        `L'identifiant de la recette sélectionnée (« ${formRecipeId} ») n'est pas un UUID valide pour la base de données.`
      );
      return;
    }
    if (!formDate) {
      setFormError('Veuillez choisir une date.');
      return;
    }
    if (formPortions <= 0) {
      setFormError('Le nombre de portions doit être supérieur à 0.');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      // production_id doit être envoyé à null (jamais une chaîne vide) tant que la recette n'est pas cuisinée
      const validProductionId =
        editingItem && editingItem.isDone && editingItem.productionId && isUUID(editingItem.productionId)
          ? editingItem.productionId
          : null;

      const itemToSave: PlannedRecipe = {
        id: editingItem ? editingItem.id : generateUUID(),
        date: formDate,
        recipeId: formRecipeId,
        portions: Number(formPortions),
        mealSlot: formMealSlot,
        notes: formNotes.trim(),
        isDone: editingItem ? Boolean(editingItem.isDone) : false,
        productionId: validProductionId,
      };

      await dbService.savePlannedRecipe(itemToSave);
      loadData();
      setIsFormOpen(false);
      setToastMessage({
        type: 'success',
        text: editingItem ? 'Recette planifiée modifiée.' : 'Recette ajoutée au planning.',
      });
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  // Suppression d'un item planifié
  const handleDeleteItem = async (item: PlannedRecipe) => {
    const recipe = recipeMap.get(item.recipeId);
    const name = recipe ? recipe.name : 'cette recette';
    if (!window.confirm(`Retirer « ${name} » du planning du ${item.date} ?`)) {
      return;
    }
    try {
      await dbService.deletePlannedRecipe(item.id);
      loadData();
      setToastMessage({ type: 'success', text: `« ${name} » retirée du planning.` });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la suppression.';
      setToastMessage({ type: 'error', text: msg });
      setTimeout(() => setToastMessage(null), 8000);
    }
  };

  // Action CUISINER : Lance la production existante et marque comme faite
  const handleCookRecipe = async (item: PlannedRecipe) => {
    const recipe = recipeMap.get(item.recipeId);
    if (!recipe) {
      setToastMessage({ type: 'error', text: 'Recette introuvable.' });
      return;
    }

    if (isCloudMode() && !isUUID(item.recipeId)) {
      setToastMessage({
        type: 'error',
        text: `Identifiant de recette non conforme (« ${item.recipeId} ») : un UUID valide est requis.`,
      });
      setTimeout(() => setToastMessage(null), 8000);
      return;
    }

    const costInfo = dbService.calculateRecipeCost(recipe.id);
    const factor = item.portions / (recipe.portions > 0 ? recipe.portions : 1);
    const calculatedCost = Number((costInfo.totalCost * factor).toFixed(2));

    const confirmMsg =
      `Lancer la production de ${item.portions} portion(s) de « ${recipe.name} » ?\n\n` +
      `• Les ingrédients consommés seront déduits de votre stock.\n` +
      `• Le stock de la recette sera augmenté de ${item.portions} portion(s).\n` +
      `• Coût calculé : ${calculatedCost.toFixed(2)} ${settings.currency}.\n` +
      `• Cette recette sera marquée comme « Fait » dans votre planning.`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      const prodUUID = generateUUID();
      const res = await dbService.addProduction({
        id: prodUUID,
        date: item.date,
        recipeId: item.recipeId,
        portionsProduced: item.portions,
        notes: `Fabrication depuis planning (${item.date})`,
        calculatedCost,
      });

      if (!res.success) {
        setToastMessage({ type: 'error', text: res.error || 'Impossible de lancer la production.' });
        setTimeout(() => setToastMessage(null), 8000);
        return;
      }

      // Marquer comme fait dans le planning avec UUID de fabrication
      const updatedItem: PlannedRecipe = {
        ...item,
        isDone: true,
        productionId: prodUUID,
      };
      await dbService.savePlannedRecipe(updatedItem);
      loadData();

      setToastMessage({
        type: 'success',
        text: `🎉 « ${recipe.name} » cuisinée avec succès ! Stocks et fabrication mis à jour.`,
      });
      setTimeout(() => setToastMessage(null), 4500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la fabrication.';
      setToastMessage({ type: 'error', text: msg });
      setTimeout(() => setToastMessage(null), 8000);
    }
  };

  // Action ANNULER LA FABRICATION : Rétablit les stocks et repasse la ligne en « non cuisinée »
  const handleCancelCook = async (item: PlannedRecipe) => {
    const recipe = recipeMap.get(item.recipeId);
    const recipeName = recipe ? recipe.name : 'cette recette';

    if (
      !window.confirm(
        `Annuler la fabrication de « ${recipeName} » (${item.portions} portion(s)) ?\n\n` +
        `• Les ingrédients et emballages consommés seront réintégrés dans vos stocks.\n` +
        `• Les portions produites seront déduites du stock de la recette.\n` +
        `• Cette ligne de planning repassera à « À cuisiner ».\n\n` +
        `Confirmez-vous l'annulation ?`
      )
    ) {
      return;
    }

    try {
      if (item.productionId) {
        const res = await dbService.deleteProduction(item.productionId);
        if (!res.success) {
          setToastMessage({ type: 'error', text: res.error || "Impossible d'annuler cette fabrication." });
          setTimeout(() => setToastMessage(null), 8000);
          return;
        }
      } else {
        const reverted: PlannedRecipe = {
          ...item,
          isDone: false,
          productionId: null,
        };
        await dbService.savePlannedRecipe(reverted);
      }
      loadData();
      setToastMessage({
        type: 'success',
        text: `Fabrication de « ${recipeName} » annulée. La recette est revenue à « À cuisiner ».`,
      });
      setTimeout(() => setToastMessage(null), 4500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'annulation de la fabrication.";
      setToastMessage({ type: 'error', text: msg });
      setTimeout(() => setToastMessage(null), 8000);
    }
  };

  // Ingrédients filtrés selon l'option "Manquants seulement"
  const displayedRequirements = useMemo(() => {
    if (showOnlyMissingIngredients) {
      return requirementsResult.items.filter((i) => i.isMissing);
    }
    return requirementsResult.items;
  }, [requirementsResult.items, showOnlyMissingIngredients]);

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      {/* Toast de confirmation */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: toastMessage.type === 'success' ? '#059669' : '#dc2626',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: '600',
            fontSize: '14px',
            maxWidth: '90vw',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* EN-TÊTE DE LA PAGE */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarIcon size={28} style={{ color: 'var(--color-primary)' }} />
            Planning de la semaine
          </h1>
          <p className="page-subtitle">
            Planifiez vos recettes, anticipez les stocks requis et suivez votre rentabilité
          </p>
        </div>

        {/* Barre d'actions & Navigation semaine */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#fff',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '2px',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePrevWeek}
              title="Semaine précédente"
              style={{ border: 'none', padding: '6px 10px' }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleToday}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                fontWeight: '600',
                fontSize: '13px',
                padding: '6px 12px',
              }}
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleNextWeek}
              title="Semaine suivante"
              style={{ border: 'none', padding: '6px 10px' }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenAddForm()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={18} />
            Planifier une recette
          </button>
        </div>
      </div>

      {/* BANDEAU LIBELLÉ SEMAINE */}
      <div
        className="card"
        style={{
          marginBottom: '20px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#f8fafc',
          borderLeft: '4px solid var(--color-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarIcon size={20} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontWeight: '700', fontSize: '16px', color: 'var(--color-dark)' }}>
            {weekRangeLabel}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
          <span>
            <strong>{financials.totalCount}</strong> recette(s) planifiée(s)
          </span>
          <span>•</span>
          <span>
            <strong>{financials.totalPortions}</strong> portion(s) au total
          </span>
          <span>•</span>
          <span style={{ color: financials.completedCount === financials.totalCount && financials.totalCount > 0 ? '#059669' : 'inherit' }}>
            <strong>{financials.completedCount}</strong> cuisinée(s)
          </span>
        </div>
      </div>

      {/* KPIS DE LA SEMAINE : COÛT DE REVIENT, CA POTENTIEL & MARGE */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* KPI 1 : Coût de revient prévu */}
        <div className="card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-dark-light)' }}>
              Coût de revient prévu
            </span>
            <div
              style={{
                backgroundColor: '#fef3c7',
                color: '#d97706',
                borderRadius: '8px',
                padding: '6px',
                display: 'flex',
              }}
            >
              <Package size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-dark)', marginBottom: '4px' }}>
            {financials.totalCost.toFixed(2)} {settings.currency}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-dark-light)' }}>
            Sur {financials.totalPortions} portion(s) de recettes planifiées
          </div>
        </div>

        {/* KPI 2 : Chiffre d'affaires potentiel */}
        <div className="card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-dark-light)' }}>
              CA potentiel estimé
            </span>
            <div
              style={{
                backgroundColor: '#dcfce7',
                color: '#059669',
                borderRadius: '8px',
                padding: '6px',
                display: 'flex',
              }}
            >
              <DollarSign size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#059669', marginBottom: '4px' }}>
            {financials.totalPotentialRevenue.toFixed(2)} {settings.currency}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-dark-light)' }}>
            Au prix conseillé avec marge cible ({settings.defaultTargetMargin}%)
          </div>
        </div>

        {/* KPI 3 : Marge brute prévisionnelle */}
        <div className="card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-dark-light)' }}>
              Marge brute prévisionnelle
            </span>
            <div
              style={{
                backgroundColor: '#e0e7ff',
                color: '#4f46e5',
                borderRadius: '8px',
                padding: '6px',
                display: 'flex',
              }}
            >
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#4f46e5', marginBottom: '4px' }}>
            +{financials.totalGrossMargin.toFixed(2)} {settings.currency}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-dark-light)' }}>
            Taux de marge prévisionnel : <strong>{financials.marginPercent}%</strong>
          </div>
        </div>

        {/* KPI 4 : État des stocks requis */}
        <div className="card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-dark-light)' }}>
              Stocks & Courses
            </span>
            <div
              style={{
                backgroundColor: requirementsResult.hasMissing ? '#fee2e2' : '#dcfce7',
                color: requirementsResult.hasMissing ? '#dc2626' : '#059669',
                borderRadius: '8px',
                padding: '6px',
                display: 'flex',
              }}
            >
              {requirementsResult.hasMissing ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            </div>
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: '800',
              color: requirementsResult.hasMissing ? '#dc2626' : '#059669',
              marginBottom: '4px',
            }}
          >
            {requirementsResult.missingCount > 0
              ? `${requirementsResult.missingCount} manquant(s)`
              : 'Stocks complets'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-dark-light)' }}>
            {requirementsResult.missingCount > 0
              ? `Achats estimés : ~${requirementsResult.totalMissingCost.toFixed(2)} ${settings.currency}`
              : 'Tous les ingrédients sont disponibles'}
          </div>
        </div>
      </div>

      {/* GRILLE HEBDOMADAIRE (7 JOURS) */}
      <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px', color: 'var(--color-dark)' }}>
        Vue de la semaine
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '14px',
          marginBottom: '32px',
        }}
      >
        {weekDays.map((day: WeekDay) => {
          const dayItems = weekPlanned.filter((p) => p.date === day.date);

          return (
            <div
              key={day.date}
              className="card"
              style={{
                padding: '14px',
                backgroundColor: day.isToday ? '#f0fdf4' : '#fff',
                borderColor: day.isToday ? '#86efac' : 'var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '260px',
              }}
            >
              {/* Entête du jour */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: '800', fontSize: '15px', color: 'var(--color-dark)' }}>
                      {day.dayName}
                    </span>
                    {day.isToday && (
                      <span
                        className="badge badge-success"
                        style={{ fontSize: '10px', padding: '2px 6px' }}
                      >
                        Aujourd'hui
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--color-dark-light)' }}>
                    {day.shortDate}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleOpenAddForm(day.date)}
                  title={`Ajouter une recette le ${day.dayName}`}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    borderRadius: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={14} />
                  Ajouter
                </button>
              </div>

              {/* Liste des recettes du jour */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dayItems.length === 0 ? (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-dark-light)',
                      fontSize: '12px',
                      padding: '20px 0',
                      border: '1px dashed #cbd5e1',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: day.isToday ? '#f8fafc' : '#fcfcfc',
                    }}
                  >
                    <span>Rien de planifié</span>
                    <button
                      type="button"
                      onClick={() => handleOpenAddForm(day.date)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary)',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '700',
                        marginTop: '6px',
                      }}
                    >
                      + Ajouter une recette
                    </button>
                  </div>
                ) : (
                  dayItems.map((item) => {
                    const recipe = recipeMap.get(item.recipeId);
                    if (!recipe) return null;

                    const costInfo = dbService.calculateRecipeCost(recipe.id);
                    const factor = item.portions / (recipe.portions > 0 ? recipe.portions : 1);
                    const totalItemCost = costInfo.totalCost * factor;
                    const totalItemRev = costInfo.suggestedSellingPrice * item.portions;

                    return (
                      <div
                        key={item.id}
                        style={{
                          backgroundColor: item.isDone ? '#f0fdf4' : '#fff',
                          border: `1px solid ${item.isDone ? '#bbf7d0' : '#e2e8f0'}`,
                          borderRadius: 'var(--radius-md)',
                          padding: '10px 12px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          position: 'relative',
                        }}
                      >
                        {/* En-tête recette & Catégorie */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px', marginBottom: '6px' }}>
                          <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--color-dark)' }}>
                            {recipe.name}
                          </span>
                          <span
                            className="badge badge-info"
                            style={{ fontSize: '10px', padding: '2px 6px', flexShrink: 0 }}
                          >
                            {recipe.category}
                          </span>
                        </div>

                        {/* Créneau & Portions */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '12px',
                            color: 'var(--color-dark-light)',
                            marginBottom: '8px',
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Layers size={13} style={{ color: 'var(--color-primary)' }} />
                            <strong>{item.portions}</strong> portion(s)
                          </span>

                          {item.mealSlot && item.mealSlot !== 'journee' && (
                            <span
                              style={{
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                textTransform: 'capitalize',
                              }}
                            >
                              {item.mealSlot}
                            </span>
                          )}
                        </div>

                        {/* Rentabilité prévue */}
                        <div
                          style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '10px',
                          }}
                        >
                          <span>
                            Coût : <strong>{totalItemCost.toFixed(2)} {settings.currency}</strong>
                          </span>
                          <span>
                            CA : <strong style={{ color: '#059669' }}>{totalItemRev.toFixed(2)} {settings.currency}</strong>
                          </span>
                        </div>

                        {/* Notes facultatives */}
                        {item.notes && (
                          <p
                            style={{
                              fontSize: '11px',
                              fontStyle: 'italic',
                              color: '#64748b',
                              marginBottom: '8px',
                              wordBreak: 'break-word',
                            }}
                          >
                            « {item.notes} »
                          </p>
                        )}

                        {/* Actions : Bouton Cuisiner & Gestion */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '6px',
                            borderTop: '1px dashed #e2e8f0',
                          }}
                        >
                          {item.isDone ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  color: '#059669',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                }}
                              >
                                <CheckCircle2 size={15} />
                                Cuisiné
                              </span>
                              {item.productionId && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelCook(item)}
                                  title="Annuler la production associée et restaurer les stocks"
                                  style={{
                                    border: '1px solid #cbd5e1',
                                    backgroundColor: '#fff',
                                    color: '#64748b',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    padding: '2px 6px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <RotateCcw size={11} />
                                  Annuler
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => handleCookRecipe(item)}
                              title="Lancer la production et déduire les ingrédients du stock"
                              style={{
                                padding: '5px 12px',
                                fontSize: '12px',
                                fontWeight: '700',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                backgroundColor: 'var(--color-primary)',
                                color: '#fff',
                                borderRadius: 'var(--radius-md)',
                              }}
                            >
                              <ChefHat size={14} />
                              Cuisiner
                            </button>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditForm(item)}
                              title="Modifier portions / date"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#64748b',
                                cursor: 'pointer',
                                padding: '4px',
                              }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item)}
                              title="Supprimer du planning"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '4px',
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION BESOINS EN INGRÉDIENTS & LISTE DE COURSES */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '16px',
            paddingBottom: '14px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: 0,
                color: 'var(--color-dark)',
              }}
            >
              <Package size={20} style={{ color: 'var(--color-primary)' }} />
              Besoins totaux en ingrédients pour la semaine
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-dark-light)', margin: '4px 0 0 0' }}>
              Calculés automatiquement selon les portions planifiées et comparés à vos stocks réels
            </p>
          </div>

          {/* Boutons d'action : Liste de courses & Filtre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                userSelect: 'none',
                color: 'var(--color-dark)',
              }}
            >
              <input
                type="checkbox"
                checked={showOnlyMissingIngredients}
                onChange={(e) => setShowOnlyMissingIngredients(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              Afficher seulement les manquants ({requirementsResult.missingCount})
            </label>

            <button
              type="button"
              className="btn btn-primary"
              disabled={weekPlanned.length === 0}
              onClick={() => setIsShoppingListOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                fontWeight: '700',
                fontSize: '13px',
              }}
            >
              <ShoppingCart size={17} />
              Ouvrir la liste de courses ({shoppingSelections.length} recette{shoppingSelections.length > 1 ? 's' : ''})
            </button>
          </div>
        </div>

        {/* Tableau ou état vide des ingrédients requis */}
        {weekPlanned.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--color-dark-light)' }}>
            <CalendarIcon size={36} style={{ marginBottom: '8px', opacity: 0.4 }} />
            <p style={{ margin: 0, fontWeight: '600' }}>Aucune recette planifiée sur cette semaine</p>
            <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>
              Ajoutez des recettes ci-dessus pour calculer les ingrédients et préparer votre liste de courses.
            </p>
          </div>
        ) : displayedRequirements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: '#059669' }}>
            <CheckCircle2 size={32} style={{ marginBottom: '6px' }} />
            <p style={{ margin: 0, fontWeight: '700' }}>Tous les ingrédients requis sont en stock !</p>
            <p style={{ fontSize: '13px', margin: '4px 0 0 0', color: 'var(--color-dark-light)' }}>
              Aucun ingrédient ne manque pour les fabrications prévues cette semaine.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Ingrédient</th>
                  <th style={{ textAlign: 'left' }}>Catégorie</th>
                  <th style={{ textAlign: 'right' }}>Besoin semaine</th>
                  <th style={{ textAlign: 'right' }}>En stock actuel</th>
                  <th style={{ textAlign: 'left', paddingLeft: '16px' }}>État & Manquant</th>
                  <th style={{ textAlign: 'right' }}>Coût estimé</th>
                  <th style={{ textAlign: 'left' }}>Recettes prévues</th>
                </tr>
              </thead>
              <tbody>
                {displayedRequirements.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      backgroundColor: item.isMissing ? '#fff7ed' : 'transparent',
                    }}
                  >
                    {/* Nom ingrédient */}
                    <td style={{ fontWeight: '600', color: 'var(--color-dark)' }}>
                      {item.name}
                      {item.hasIncompatibleUnit && (
                        <span
                          title="Attention : unités incompatibles détectées dans certaines recettes"
                          style={{ color: '#dc2626', marginLeft: '6px', cursor: 'help' }}
                        >
                          ⚠️
                        </span>
                      )}
                    </td>

                    {/* Catégorie */}
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '11px' }}>
                        {item.category}
                      </span>
                    </td>

                    {/* Besoin total */}
                    <td style={{ textAlign: 'right', fontWeight: '700' }}>
                      {item.requiredQty} {item.unit}
                    </td>

                    {/* En stock */}
                    <td style={{ textAlign: 'right', color: 'var(--color-dark-light)' }}>
                      {item.availableStock} {item.stockUnit}
                    </td>

                    {/* État / Manquant */}
                    <td style={{ paddingLeft: '16px' }}>
                      {item.isMissing ? (
                        <span
                          className="badge badge-danger"
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <AlertTriangle size={12} />
                          Manque {item.missingQty} {item.unit}
                        </span>
                      ) : (
                        <span
                          className="badge badge-success"
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <CheckCircle2 size={12} />
                          En stock
                        </span>
                      )}
                    </td>

                    {/* Coût estimé si manquant */}
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>
                      {item.isMissing ? (
                        <span style={{ color: '#dc2626' }}>
                          ~{item.estimatedMissingCost.toFixed(2)} {settings.currency}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>

                    {/* Recettes concernées */}
                    <td style={{ fontSize: '11px', color: 'var(--color-dark-light)' }}>
                      {item.recipesUsing.map((u) => `${u.recipeName} (${u.portions}p)`).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DRAWER D'AJOUT / MODIFICATION D'UNE RECETTE PLANIFIÉE */}
      <Drawer
        title={editingItem ? 'Modifier la recette planifiée' : 'Planifier une recette'}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      >
        <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {formError && (
            <div
              style={{
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              {formError}
            </div>
          )}

          {/* Date de la planification */}
          <div>
            <label className="form-label" style={{ fontWeight: '700' }}>
              Jour de la semaine *
            </label>
            <select
              className="form-input"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              required
            >
              {weekDays.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.dayName} {d.shortDate} {d.isToday ? "(Aujourd'hui)" : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Choix de la recette */}
          <div>
            <label className="form-label" style={{ fontWeight: '700' }}>
              Recette à planifier *
            </label>
            <select
              className="form-input"
              value={formRecipeId}
              onChange={(e) => {
                const newId = e.target.value;
                setFormRecipeId(newId);
                const rec = recipeMap.get(newId);
                if (rec && !editingItem) {
                  setFormPortions(rec.portions || 1);
                }
              }}
              required
            >
              <option value="">-- Sélectionnez une recette --</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.category} • base {r.portions} portions)
                </option>
              ))}
            </select>
            {recipes.length === 0 && onNavigate && (
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#64748b' }}>
                Aucune recette active disponible.{' '}
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: '6px', fontSize: '12px', display: 'inline-block' }}
                  onClick={() => {
                    setIsFormOpen(false);
                    onNavigate('Recettes', { triggerAdd: true });
                  }}
                >
                  Créer une recette
                </button>
              </div>
            )}
          </div>

          {/* Nombre de portions */}
          <div>
            <label className="form-label" style={{ fontWeight: '700' }}>
              Nombre de portions à préparer *
            </label>
            <input
              type="number"
              className="form-input"
              min="0.5"
              step="any"
              value={formPortions}
              onChange={(e) => setFormPortions(Math.max(0.1, parseDecimalInput(e.target.value)))}
              required
            />
            {formRecipeId && recipeMap.get(formRecipeId) && (
              <p style={{ fontSize: '12px', color: 'var(--color-dark-light)', marginTop: '4px' }}>
                Recette de base calibrée pour {recipeMap.get(formRecipeId)!.portions} portion(s).
              </p>
            )}
          </div>

          {/* Créneau repas */}
          <div>
            <label className="form-label" style={{ fontWeight: '700' }}>
              Créneau / Moment (facultatif)
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {(['journee', 'midi', 'soir'] as const).map((slot) => (
                <label
                  key={slot}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${formMealSlot === slot ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    backgroundColor: formMealSlot === slot ? '#f0fdf4' : '#fff',
                    color: formMealSlot === slot ? 'var(--color-primary)' : 'var(--color-dark)',
                    fontWeight: formMealSlot === slot ? '700' : '500',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textTransform: 'capitalize',
                  }}
                >
                  <input
                    type="radio"
                    name="mealSlot"
                    value={slot}
                    checked={formMealSlot === slot}
                    onChange={() => setFormMealSlot(slot)}
                    style={{ display: 'none' }}
                  />
                  {slot === 'journee' ? 'Toute la journée' : slot}
                </label>
              ))}
            </div>
          </div>

          {/* Notes / Remarques */}
          <div>
            <label className="form-label">Notes ou consignes particulières</label>
            <textarea
              className="form-input"
              rows={3}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Ex: Commande traiteur entreprise, option sans gluten..."
            />
          </div>

          {/* Aperçu du coût et du CA pour cette ligne */}
          {formRecipeId && recipeMap.get(formRecipeId) && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
              }}
            >
              <span style={{ fontWeight: '700', color: 'var(--color-dark)' }}>
                Estimation financière pour cette ligne :
              </span>
              {(() => {
                const rec = recipeMap.get(formRecipeId)!;
                const costInfo = dbService.calculateRecipeCost(rec.id);
                const factor = formPortions / (rec.portions > 0 ? rec.portions : 1);
                const lineCost = costInfo.totalCost * factor;
                const lineRev = costInfo.suggestedSellingPrice * formPortions;
                const lineMargin = lineRev - lineCost;
                return (
                  <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Coût : <strong>{lineCost.toFixed(2)} {settings.currency}</strong></span>
                    <span>CA potentiel : <strong style={{ color: '#059669' }}>{lineRev.toFixed(2)} {settings.currency}</strong></span>
                    <span>Marge : <strong style={{ color: '#4f46e5' }}>+{lineMargin.toFixed(2)} {settings.currency}</strong></span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Boutons d'action */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsFormOpen(false)}
              style={{ flex: 1 }}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
              style={{ flex: 2 }}
            >
              {isSaving ? 'Enregistrement...' : editingItem ? 'Mettre à jour' : 'Ajouter au planning'}
            </button>
          </div>
        </form>
      </Drawer>

      {/* DRAWER LISTE DE COURSES EXISTANT (AVEC CES RECETTES) */}
      <ShoppingListDrawer
        selections={shoppingSelections}
        isOpen={isShoppingListOpen}
        onClose={() => setIsShoppingListOpen(false)}
        onDataChanged={() => loadData()}
      />
    </div>
  );
};
