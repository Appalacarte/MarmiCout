/**
 * Service d'accès Cloud direct Supabase pour Marmicout (Forfaits Pro, Pro Cloud & Démo 14j)
 * Architecture :
 * - Mode Cloud : Écritures et lectures directes dans Supabase (PostgreSQL / RLS)
 * - Cache local : Synchronisation miroir dans IndexedDB et localStorage
 * - Mode Local (Essentiel) : Zéro appel Supabase, stockage local exclusif
 * - Erreurs explicites : Alerte visuelle et log console immédiat à chaque échec
 */

import { supabase } from './supabaseClient';
import { indexedDbService } from './indexedDbService';
import {
  Product,
  Store,
  Purchase,
  Recipe,
  RecipeIngredient,
  RecipePackaging,
  Production,
  Sale,
  StockMovement,
  Settings,
} from '../types';

export function isUUID(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function notifyCloudError(title: string, details: string) {
  console.error(`[Marmicout Cloud Error] ${title} :`, details);
  void indexedDbService.markUnsyncedOperation(1);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('marmicout-cloud-error', {
        detail: { title, details, timestamp: Date.now() },
      })
    );
  }
}

export class CloudDbService {
  private establishmentId: string | null =
    typeof window !== 'undefined' ? localStorage.getItem('marmicout_establishment_id') : null;

  public setEstablishmentId(id: string | null) {
    this.establishmentId = id;
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem('marmicout_establishment_id', id);
      } else {
        localStorage.removeItem('marmicout_establishment_id');
      }
    }
  }

  public getEstablishmentId(): string | null {
    if (this.establishmentId && isUUID(this.establishmentId)) {
      return this.establishmentId;
    }
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('marmicout_establishment_id');
      if (stored && isUUID(stored)) {
        this.establishmentId = stored;
        return stored;
      }
    }
    return null;
  }

  public isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  public async ensureEstablishmentId(): Promise<string> {
    const existing = this.getEstablishmentId();
    if (existing && isUUID(existing)) {
      return existing;
    }

    // Récupérer depuis les membres Supabase si non initialisé en mémoire
    try {
      const { data: member, error } = await supabase
        .from('marmicout_members')
        .select('establishment_id')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (!error && member?.establishment_id) {
        this.setEstablishmentId(member.establishment_id);
        return member.establishment_id;
      }

      // Fallback direct sur les établissements accessibles
      const { data: est } = await supabase
        .from('marmicout_establishments')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (est?.id) {
        this.setEstablishmentId(est.id);
        return est.id;
      }
    } catch (e) {
      console.warn('[CloudDbService] Impossible de récupérer l\'establishment_id', e);
    }

    throw new Error('Établissement manquant. Veuillez recharger la page pour synchroniser votre compte.');
  }

  // --- STORES ---
  public async getStores(): Promise<Store[]> {
    if (!this.isOnline()) {
      return indexedDbService.getAll<Store>('stores');
    }
    const { data, error } = await supabase
      .from('marmicout_stores')
      .select('*')
      .order('name');
    if (error) {
      console.warn('[CloudDbService] getStores fallback to cache:', error);
      return indexedDbService.getAll<Store>('stores');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stores: Store[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type || 'Supermarché',
      address: row.address || '',
      phone: row.phone || '',
      notes: row.notes || '',
    }));
    await indexedDbService.setAll('stores', stores);
    await indexedDbService.setLastSyncTimestamp();
    return stores;
  }

  public async saveStore(store: Store): Promise<string> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h. Reconnectez-vous pour enregistrer.');
    }
    const estId = await this.ensureEstablishmentId();
    const storeUUID = isUUID(store.id) ? store.id : generateUUID();
    store.id = storeUUID;

    const payload: Record<string, unknown> = {
      id: storeUUID,
      establishment_id: estId,
      name: (store.name || '').trim(),
      type: store.type || 'Grossiste',
      address: store.address ?? '',
      phone: store.phone ?? '',
      notes: store.notes ?? '',
    };

    const { error } = await supabase.from('marmicout_stores').upsert(payload, { onConflict: 'id' });
    if (error) {
      notifyCloudError('Enregistrement du magasin refusé', error.message);
      throw new Error(`Erreur Supabase marmicout_stores (${error.code || 'RLS'}): ${error.message}`);
    }
    await indexedDbService.put('stores', store);
    return storeUUID;
  }

  public async deleteStore(id: string): Promise<void> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h.');
    }
    const { error } = await supabase.from('marmicout_stores').delete().eq('id', id);
    if (error) {
      notifyCloudError('Suppression du magasin refusée', error.message);
      throw new Error(`Erreur suppression magasin: ${error.message}`);
    }
    await indexedDbService.delete('stores', id);
  }

  // --- PRODUCTS ---
  public async getProducts(): Promise<Product[]> {
    if (!this.isOnline()) {
      return indexedDbService.getAll<Product>('products');
    }
    const { data, error } = await supabase
      .from('marmicout_products')
      .select('*')
      .order('name');
    if (error) {
      console.warn('[CloudDbService] getProducts fallback to cache:', error);
      return indexedDbService.getAll<Product>('products');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const products: Product[] = (data || []).map((row: any) => ({
      id: row.id,
      barcode: row.barcode || '',
      name: row.name,
      category: row.category || 'Épicerie',
      unit: row.unit || 'kg',
      brand: row.brand || '',
      format: row.format || '',
      stock: Number(row.stock || 0),
      minStockAlert: Number(row.min_stock_alert || 0),
      avgPurchasePrice: Number(row.avg_purchase_price || 0),
      mainStoreId: row.main_store_id || '',
      notes: row.notes || '',
      isActive: row.is_active !== false,
      photo: row.photo || undefined,
      unitWeightG: row.unit_weight_g != null ? Number(row.unit_weight_g) : undefined,
      densityGPerMl: row.density_g_per_ml != null ? Number(row.density_g_per_ml) : undefined,
    }));
    await indexedDbService.setAll('products', products);
    await indexedDbService.setLastSyncTimestamp();
    return products;
  }

  public async saveProduct(product: Product): Promise<string> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h. Reconnectez-vous pour enregistrer.');
    }
    const estId = await this.ensureEstablishmentId();
    const productUUID = isUUID(product.id) ? product.id : generateUUID();
    product.id = productUUID;

    const payload: Record<string, unknown> = {
      id: productUUID,
      establishment_id: estId,
      barcode: product.barcode ?? '',
      name: (product.name || '').trim(),
      category: product.category || 'Épicerie',
      unit: product.unit || 'kg',
      brand: product.brand ?? '',
      format: product.format ?? '',
      stock: Number(product.stock ?? 0),
      min_stock_alert: Number(product.minStockAlert ?? 0),
      avg_purchase_price: Number(product.avgPurchasePrice ?? 0),
      main_store_id: isUUID(product.mainStoreId) ? product.mainStoreId : null,
      notes: product.notes ?? '',
      is_active: product.isActive !== false,
      photo: product.photo || null,
      unit_weight_g: product.unitWeightG != null && Number.isFinite(product.unitWeightG) ? Number(product.unitWeightG) : null,
      density_g_per_ml: product.densityGPerMl != null && Number.isFinite(product.densityGPerMl) ? Number(product.densityGPerMl) : null,
    };

    const { error } = await supabase.from('marmicout_products').upsert(payload, { onConflict: 'id' });
    if (error) {
      notifyCloudError('Enregistrement du produit refusé', error.message);
      throw new Error(`Erreur Supabase marmicout_products (${error.code || 'RLS'}): ${error.message}`);
    }
    await indexedDbService.put('products', product);
    return productUUID;
  }

  public async deleteProduct(id: string): Promise<void> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h.');
    }
    const { error } = await supabase.from('marmicout_products').delete().eq('id', id);
    if (error) {
      notifyCloudError('Suppression du produit refusée', error.message);
      throw new Error(`Erreur suppression produit: ${error.message}`);
    }
    await indexedDbService.delete('products', id);
  }

  // --- RECIPES ---
  public async getRecipes(): Promise<Recipe[]> {
    if (!this.isOnline()) {
      return indexedDbService.getAll<Recipe>('recipes');
    }
    const { data, error } = await supabase
      .from('marmicout_recipes')
      .select('*')
      .order('name');
    if (error) {
      console.warn('[CloudDbService] getRecipes fallback to cache:', error);
      return indexedDbService.getAll<Recipe>('recipes');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recipes: Recipe[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      category: row.category || 'Général',
      description: row.description || '',
      portions: Number(row.portions || 1),
      yieldQty: Number(row.yield_qty || 1),
      yieldUnit: row.yield_unit || 'portion',
      stock: Number(row.stock || 0),
      prepTimeMinutes: row.prep_time_minutes ? Number(row.prep_time_minutes) : undefined,
      utensilsNotes: row.utensils_notes || undefined,
      notes: row.notes || undefined,
      isActive: row.is_active !== false,
      photo: row.photo || undefined,
      originalPortions: row.original_portions ? Number(row.original_portions) : undefined,
      instructions: row.instructions || undefined,
      sourceImage: row.source_image || undefined,
      rawExtractedText: row.raw_extracted_text || undefined,
      externalId: row.external_id || undefined,
      videoUrl: row.video_url || undefined,
      sourceUrl: row.source_url || undefined,
    }));
    await indexedDbService.setAll('recipes', recipes);
    await indexedDbService.setLastSyncTimestamp();
    return recipes;
  }

  public async getAllRecipeIngredients(): Promise<RecipeIngredient[]> {
    if (!this.isOnline()) {
      return indexedDbService.getAll<RecipeIngredient>('recipe_ingredients');
    }
    const { data, error } = await supabase
      .from('marmicout_recipe_ingredients')
      .select('*');
    if (error) {
      console.warn('[CloudDbService] getAllRecipeIngredients fallback:', error);
      return indexedDbService.getAll<RecipeIngredient>('recipe_ingredients');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list: RecipeIngredient[] = (data || []).map((row: any) => ({
      id: row.id,
      recipeId: row.recipe_id,
      productId: row.product_id || '',
      customName: row.custom_name || undefined,
      qtyUsed: Number(row.qty_used || 0),
      unit: row.unit || 'g',
      originalQtyUsed: row.qty_used ? Number(row.qty_used) : undefined,
      customCostPerUnit: row.custom_cost_per_unit ? Number(row.custom_cost_per_unit) : undefined,
    }));
    await indexedDbService.setAll('recipe_ingredients', list);
    return list;
  }

  public async getAllRecipePackaging(): Promise<RecipePackaging[]> {
    if (!this.isOnline()) {
      return indexedDbService.getAll<RecipePackaging>('recipe_packaging');
    }
    const { data, error } = await supabase
      .from('marmicout_recipe_packaging')
      .select('*');
    if (error) {
      console.warn('[CloudDbService] getAllRecipePackaging fallback:', error);
      return indexedDbService.getAll<RecipePackaging>('recipe_packaging');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list: RecipePackaging[] = (data || []).map((row: any) => ({
      id: row.id,
      recipeId: row.recipe_id,
      name: row.name,
      qtyUsed: Number(row.qty_used || 1),
      costPerUnit: Number(row.cost_per_unit || 0),
    }));
    await indexedDbService.setAll('recipe_packaging', list);
    return list;
  }

  public async saveRecipe(
    recipe: Recipe,
    ingredients?: Omit<RecipeIngredient, 'id' | 'recipeId'>[],
    packagings?: Omit<RecipePackaging, 'id' | 'recipeId'>[]
  ): Promise<string> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h. Reconnectez-vous pour enregistrer.');
    }
    const estId = await this.ensureEstablishmentId();
    const recipeUUID = isUUID(recipe.id) ? recipe.id : generateUUID();
    recipe.id = recipeUUID;

    const payload: Record<string, unknown> = {
      id: recipeUUID,
      establishment_id: estId,
      name: (recipe.name || '').trim(),
      category: recipe.category || 'Plats',
      description: recipe.description ? recipe.description.trim() : '',
      portions: Number(recipe.portions ?? 1),
      yield_qty: Number(recipe.yieldQty ?? 1),
      yield_unit: recipe.yieldUnit || 'portion',
      stock: Number(recipe.stock ?? 0),
      prep_time_minutes: recipe.prepTimeMinutes ? Number(recipe.prepTimeMinutes) : null,
      utensils_notes: recipe.utensilsNotes ? recipe.utensilsNotes.trim() : '',
      notes: recipe.notes ? recipe.notes.trim() : '',
      is_active: recipe.isActive !== false,
      photo: recipe.photo || null,
      instructions: recipe.instructions ? recipe.instructions.trim() : '',
    };

    if (recipe.originalPortions) payload.original_portions = Number(recipe.originalPortions);
    if (recipe.sourceImage) payload.source_image = recipe.sourceImage;
    if (recipe.rawExtractedText) payload.raw_extracted_text = recipe.rawExtractedText;
    if (recipe.externalId) payload.external_id = recipe.externalId;
    if (recipe.videoUrl) payload.video_url = recipe.videoUrl;
    if (recipe.sourceUrl) payload.source_url = recipe.sourceUrl;

    const { error: recipeErr } = await supabase
      .from('marmicout_recipes')
      .upsert(payload, { onConflict: 'id' });

    if (recipeErr) {
      notifyCloudError('Enregistrement de la recette refusé', recipeErr.message);
      throw new Error(`Erreur écriture recette Supabase (${recipeErr.code || 'RLS'}): ${recipeErr.message}`);
    }

    // Ingrédients
    if (ingredients) {
      await supabase.from('marmicout_recipe_ingredients').delete().eq('recipe_id', recipeUUID);
      if (ingredients.length > 0) {
        const ingPayloads = ingredients.map((ing) => ({
          id: generateUUID(),
          establishment_id: estId,
          recipe_id: recipeUUID,
          product_id: ing.productId && isUUID(ing.productId) ? ing.productId : null,
          custom_name: ing.customName ?? '',
          qty_used: Number(ing.qtyUsed ?? 0),
          unit: ing.unit || 'g',
          custom_cost_per_unit: Number(ing.customCostPerUnit ?? 0),
        }));
        const { error: ingErr } = await supabase.from('marmicout_recipe_ingredients').insert(ingPayloads);
        if (ingErr) {
          console.error('[Supabase recipe_ingredients error]', ingErr);
          notifyCloudError('Erreur ingrédients recette', ingErr.message);
          throw new Error(`Erreur Supabase marmicout_recipe_ingredients: ${ingErr.message}`);
        }
      }
    }

    // Emballages
    if (packagings) {
      await supabase.from('marmicout_recipe_packaging').delete().eq('recipe_id', recipeUUID);
      if (packagings.length > 0) {
        const packPayloads = packagings.map((pack) => ({
          id: generateUUID(),
          establishment_id: estId,
          recipe_id: recipeUUID,
          name: (pack.name || '').trim(),
          qty_used: Number(pack.qtyUsed ?? 1),
          cost_per_unit: Number(pack.costPerUnit ?? 0),
        }));
        const { error: packErr } = await supabase.from('marmicout_recipe_packaging').insert(packPayloads);
        if (packErr) {
          console.error('[Supabase recipe_packaging error]', packErr);
          notifyCloudError('Erreur emballages recette', packErr.message);
          throw new Error(`Erreur Supabase marmicout_recipe_packaging: ${packErr.message}`);
        }
      }
    }

    await indexedDbService.put('recipes', recipe);
    return recipeUUID;
  }

  public async deleteRecipe(id: string): Promise<void> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h.');
    }
    const { error } = await supabase.from('marmicout_recipes').delete().eq('id', id);
    if (error) {
      notifyCloudError('Suppression de la recette refusée', error.message);
      throw new Error(`Erreur suppression recette: ${error.message}`);
    }
    await indexedDbService.delete('recipes', id);
  }

  public async saveRecipeIngredient(ingredient: RecipeIngredient): Promise<string> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h.');
    }
    const estId = await this.ensureEstablishmentId();
    const ingUUID = isUUID(ingredient.id) ? ingredient.id : generateUUID();
    ingredient.id = ingUUID;
    const payload = {
      id: ingUUID,
      establishment_id: estId,
      recipe_id: ingredient.recipeId,
      product_id: ingredient.productId && isUUID(ingredient.productId) ? ingredient.productId : null,
      custom_name: ingredient.customName ?? '',
      qty_used: Number(ingredient.qtyUsed ?? 0),
      unit: ingredient.unit || 'g',
      custom_cost_per_unit: Number(ingredient.customCostPerUnit ?? 0),
    };
    const { error } = await supabase.from('marmicout_recipe_ingredients').upsert(payload, { onConflict: 'id' });
    if (error) {
      notifyCloudError('Enregistrement ingrédient refusé', error.message);
      throw new Error(`Erreur Supabase marmicout_recipe_ingredients: ${error.message}`);
    }
    await indexedDbService.put('recipe_ingredients', ingredient);
    return ingUUID;
  }

  public async saveRecipePackaging(pack: RecipePackaging): Promise<string> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h.');
    }
    const estId = await this.ensureEstablishmentId();
    const packUUID = isUUID(pack.id) ? pack.id : generateUUID();
    pack.id = packUUID;
    const payload = {
      id: packUUID,
      establishment_id: estId,
      recipe_id: pack.recipeId,
      name: (pack.name || '').trim(),
      qty_used: Number(pack.qtyUsed ?? 1),
      cost_per_unit: Number(pack.costPerUnit ?? 0),
    };
    const { error } = await supabase.from('marmicout_recipe_packaging').upsert(payload, { onConflict: 'id' });
    if (error) {
      notifyCloudError('Enregistrement emballage refusé', error.message);
      throw new Error(`Erreur Supabase marmicout_recipe_packaging: ${error.message}`);
    }
    await indexedDbService.put('recipe_packaging', pack);
    return packUUID;
  }

  // --- PURCHASES ---
  public async getPurchases(): Promise<Purchase[]> {
    if (!this.isOnline()) {
      return indexedDbService.getAll<Purchase>('purchases');
    }
    const { data, error } = await supabase
      .from('marmicout_purchases')
      .select('*')
      .order('purchase_date', { ascending: false });
    if (error) {
      console.warn('[CloudDbService] getPurchases fallback to cache:', error);
      return indexedDbService.getAll<Purchase>('purchases');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const purchases: Purchase[] = (data || []).map((row: any) => ({
      id: row.id,
      date: row.purchase_date,
      productId: row.product_id,
      qty: Number(row.qty || 0),
      unit: row.unit || 'kg',
      pricePaid: Number(row.price_paid || 0),
      unitPrice: Number(row.unit_price || 0),
      storeId: row.store_id || '',
      batchNo: row.batch_no || undefined,
      expiryDate: row.expiry_date || undefined,
      notes: row.notes || undefined,
    }));
    await indexedDbService.setAll('purchases', purchases);
    await indexedDbService.setLastSyncTimestamp();
    return purchases;
  }

  public async savePurchase(purchase: Purchase): Promise<string> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h. Reconnectez-vous pour enregistrer.');
    }
    const estId = await this.ensureEstablishmentId();
    const purchaseUUID = isUUID(purchase.id) ? purchase.id : generateUUID();
    purchase.id = purchaseUUID;

    const payload: Record<string, unknown> = {
      id: purchaseUUID,
      establishment_id: estId,
      purchase_date: purchase.date || new Date().toISOString().split('T')[0],
      store_id: isUUID(purchase.storeId) ? purchase.storeId : null,
      product_id: isUUID(purchase.productId) ? purchase.productId : null,
      qty: Number(purchase.qty ?? 0),
      unit: purchase.unit || 'kg',
      unit_price: Number(purchase.unitPrice ?? 0),
      price_paid: Number(purchase.pricePaid ?? 0),
      batch_no: purchase.batchNo ?? '',
      expiry_date: purchase.expiryDate || null,
      notes: purchase.notes ?? '',
    };

    const { error } = await supabase.from('marmicout_purchases').upsert(payload, { onConflict: 'id' });
    if (error) {
      notifyCloudError('Enregistrement de l\'achat refusé', error.message);
      throw new Error(`Erreur Supabase marmicout_purchases (${error.code || 'RLS'}): ${error.message}`);
    }
    await indexedDbService.put('purchases', purchase);
    return purchaseUUID;
  }

  public async deletePurchase(id: string): Promise<void> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h.');
    }
    const { error } = await supabase.from('marmicout_purchases').delete().eq('id', id);
    if (error) {
      notifyCloudError('Suppression de l\'achat refusée', error.message);
      throw new Error(`Erreur suppression achat: ${error.message}`);
    }
    await indexedDbService.delete('purchases', id);
  }

  // --- PRODUCTIONS ---
  public async getProductions(): Promise<Production[]> {
    if (!this.isOnline()) {
      return indexedDbService.getAll<Production>('productions');
    }
    const { data, error } = await supabase
      .from('marmicout_productions')
      .select('*')
      .order('production_date', { ascending: false });
    if (error) {
      return indexedDbService.getAll<Production>('productions');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list: Production[] = (data || []).map((row: any) => ({
      id: row.id,
      date: row.production_date,
      recipeId: row.recipe_id,
      portionsProduced: Number(row.portions_produced),
      calculatedCost: Number(row.calculated_cost || 0),
      notes: row.notes || undefined,
    }));
    await indexedDbService.setAll('productions', list);
    return list;
  }

  public async saveProduction(production: Production): Promise<string> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h.');
    }
    const estId = await this.ensureEstablishmentId();
    const prodUUID = isUUID(production.id) ? production.id : generateUUID();
    production.id = prodUUID;
    if (!isUUID(production.recipeId)) {
      throw new Error('Recette invalide pour la production.');
    }

    const payload: Record<string, unknown> = {
      id: prodUUID,
      establishment_id: estId,
      production_date: production.date || new Date().toISOString().split('T')[0],
      recipe_id: production.recipeId,
      portions_produced: Number(production.portionsProduced ?? 1),
      calculated_cost: Number(production.calculatedCost ?? 0),
      notes: production.notes ?? '',
    };

    const { error } = await supabase.from('marmicout_productions').upsert(payload, { onConflict: 'id' });
    if (error) {
      notifyCloudError('Enregistrement de fabrication refusé', error.message);
      throw new Error(`Erreur Supabase marmicout_productions (${error.code || 'RLS'}): ${error.message}`);
    }
    await indexedDbService.put('productions', production);
    return prodUUID;
  }

  public async deleteProduction(id: string): Promise<void> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h.');
    }
    const { error } = await supabase.from('marmicout_productions').delete().eq('id', id);
    if (error) {
      notifyCloudError('Suppression de fabrication refusée', error.message);
      throw new Error(`Erreur suppression fabrication: ${error.message}`);
    }
    await indexedDbService.delete('productions', id);
  }

  // --- SALES ---
  public async getSales(): Promise<Sale[]> {
    if (!this.isOnline()) {
      return indexedDbService.getAll<Sale>('sales');
    }
    const { data, error } = await supabase
      .from('marmicout_sales')
      .select('*')
      .order('sale_date', { ascending: false });
    if (error) {
      return indexedDbService.getAll<Sale>('sales');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list: Sale[] = (data || []).map((row: any) => ({
      id: row.id,
      date: row.sale_date,
      itemId: row.item_id,
      itemType: (row.item_type || 'RECIPE') as 'RECIPE' | 'PRODUCT',
      qtySold: Number(row.qty_sold || 0),
      unitPrice: Number(row.unit_price || 0),
      location: row.location || 'Boutique',
      notes: row.notes || undefined,
    }));
    await indexedDbService.setAll('sales', list);
    return list;
  }

  public async saveSale(sale: Sale): Promise<string> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h.');
    }
    const estId = await this.ensureEstablishmentId();
    const saleUUID = isUUID(sale.id) ? sale.id : generateUUID();
    sale.id = saleUUID;
    if (!isUUID(sale.itemId)) {
      throw new Error('Article invalide pour la vente.');
    }

    const payload: Record<string, unknown> = {
      id: saleUUID,
      establishment_id: estId,
      sale_date: sale.date || new Date().toISOString().split('T')[0],
      item_id: sale.itemId,
      item_type: sale.itemType || 'RECIPE',
      qty_sold: Number(sale.qtySold ?? 1),
      unit_price: Number(sale.unitPrice ?? 0),
      location: sale.location || 'Boutique',
      notes: sale.notes ?? '',
    };

    const { error } = await supabase.from('marmicout_sales').upsert(payload, { onConflict: 'id' });
    if (error) {
      notifyCloudError('Enregistrement de vente refusé', error.message);
      throw new Error(`Erreur Supabase marmicout_sales (${error.code || 'RLS'}): ${error.message}`);
    }
    await indexedDbService.put('sales', sale);
    return saleUUID;
  }

  public async deleteSale(id: string): Promise<void> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h.');
    }
    const { error } = await supabase.from('marmicout_sales').delete().eq('id', id);
    if (error) {
      notifyCloudError('Suppression de vente refusée', error.message);
      throw new Error(`Erreur suppression vente: ${error.message}`);
    }
    await indexedDbService.delete('sales', id);
  }

  // --- STOCK MOVEMENTS ---
  public async getStockMovements(): Promise<StockMovement[]> {
    if (!this.isOnline()) {
      return indexedDbService.getAll<StockMovement>('stock_movements');
    }
    const { data, error } = await supabase
      .from('marmicout_stock_movements')
      .select('*')
      .order('movement_date', { ascending: false });
    if (error) {
      return indexedDbService.getAll<StockMovement>('stock_movements');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list: StockMovement[] = (data || []).map((row: any) => ({
      id: row.id,
      date: row.movement_date,
      productId: row.product_id,
      qty: Number(row.qty || 0),
      type: (row.type || 'AJUSTEMENT') as 'ACHAT' | 'PRODUCTION_CONSOMMATION' | 'VENTE_DIRECTE' | 'AJUSTEMENT',
      refId: row.ref_id || 'MANUAL',
      notes: row.notes || undefined,
    }));
    await indexedDbService.setAll('stock_movements', list);
    return list;
  }

  public async saveStockMovement(movement: StockMovement): Promise<string> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h.');
    }
    const estId = await this.ensureEstablishmentId();
    const smUUID = isUUID(movement.id) ? movement.id : generateUUID();
    movement.id = smUUID;
    if (!isUUID(movement.productId)) {
      throw new Error('Produit invalide pour le mouvement de stock.');
    }

    const payload: Record<string, unknown> = {
      id: smUUID,
      establishment_id: estId,
      movement_date: movement.date || new Date().toISOString().split('T')[0],
      product_id: movement.productId,
      qty: Number(movement.qty ?? 0),
      type: movement.type || 'AJUSTEMENT',
      ref_id: movement.refId || 'MANUAL',
      notes: movement.notes ?? '',
    };

    const { error } = await supabase.from('marmicout_stock_movements').upsert(payload, { onConflict: 'id' });
    if (error) {
      notifyCloudError('Mouvement de stock refusé', error.message);
      throw new Error(`Erreur Supabase marmicout_stock_movements (${error.code || 'RLS'}): ${error.message}`);
    }
    await indexedDbService.put('stock_movements', movement);
    return smUUID;
  }

  public async deleteStockMovementsByRefId(refId: string): Promise<void> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h.');
    }
    const { error } = await supabase.from('marmicout_stock_movements').delete().eq('ref_id', refId);
    if (error) {
      notifyCloudError('Suppression des mouvements de stock refusée', error.message);
      throw new Error(`Erreur suppression mouvements de stock: ${error.message}`);
    }
    const movements = await indexedDbService.getAll<StockMovement>('stock_movements');
    const filtered = movements.filter((m) => m.refId !== refId);
    await indexedDbService.setAll('stock_movements', filtered);
  }

  // --- SETTINGS ---
  public async getSettings(): Promise<Settings | null> {
    if (!this.isOnline()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = await indexedDbService.getAll<any>('settings');
      return items.find((i) => i.key === 'app_settings')?.value || null;
    }
    const { data, error } = await supabase
      .from('marmicout_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = await indexedDbService.getAll<any>('settings');
      return items.find((i) => i.key === 'app_settings')?.value || null;
    }
    const localExpiry = typeof localStorage !== 'undefined' ? (Number(localStorage.getItem('marmicout_expiry_alert_days')) || 7) : 7;
    const settings: Settings = {
      businessName: data.business_name || 'Mon Établissement',
      currency: data.currency || '€',
      defaultTargetMargin: Number(data.default_target_margin || 60),
      categories: data.categories || [],
      recipeCategories: data.recipe_categories || ['Entrée', 'Plat', 'Dessert', 'Boisson'],
      units: data.units || ['kg', 'g', 'l', 'cl', 'ml', 'cs', 'cc', 'pièce'],
      salesLocations: data.sales_locations || ['Marché', 'Commande', 'En Ligne', 'Domicile', 'Autre'],
      defaultMinStockAlert: Number(data.default_min_stock_alert || 2),
      expiryAlertDays: localExpiry,
      googleSheetId: data.google_sheet_id || undefined,
      googleSheetLink: data.google_sheet_link || undefined,
      googleWebAppUrl: data.google_web_app_url || undefined,
    };
    await indexedDbService.put('settings', { key: 'app_settings', value: settings });
    return settings;
  }

  public async saveSettings(settings: Settings): Promise<void> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h.');
    }
    const estId = await this.ensureEstablishmentId();
    const payload: Record<string, unknown> = {
      establishment_id: estId,
      business_name: settings.businessName || 'Mon Atelier Traiteur',
      currency: settings.currency || '€',
      default_target_margin: Number(settings.defaultTargetMargin ?? 60),
      categories: settings.categories || [],
      recipe_categories: settings.recipeCategories || [],
      units: settings.units || [],
      sales_locations: settings.salesLocations || [],
      default_min_stock_alert: Number(settings.defaultMinStockAlert ?? 2),
      google_sheet_link: settings.googleSheetLink ?? '',
      google_sheet_id: settings.googleSheetId ?? '',
      google_web_app_url: settings.googleWebAppUrl ?? '',
    };

    const { error } = await supabase
      .from('marmicout_settings')
      .upsert(payload, { onConflict: 'establishment_id' });

    if (error) {
      notifyCloudError('Enregistrement des paramètres refusé', error.message);
      throw new Error(`Erreur Supabase marmicout_settings: ${error.message}`);
    }
    await indexedDbService.put('settings', { key: 'app_settings', value: settings });
  }

  // --- SYNCHRONISATION INITIALE COMPLÈTE DEPUIS LE CLOUD ---
  public async syncAllFromCloud(): Promise<{
    recipes: Recipe[];
    products: Product[];
    stores: Store[];
    purchases: Purchase[];
    productions: Production[];
    sales: Sale[];
    stockMovements: StockMovement[];
    recipeIngredients: RecipeIngredient[];
    recipePackaging: RecipePackaging[];
    settings: Settings | null;
  }> {
    const [
      recipes,
      products,
      stores,
      purchases,
      productions,
      sales,
      stockMovements,
      recipeIngredients,
      recipePackaging,
      settings,
    ] = await Promise.all([
      this.getRecipes(),
      this.getProducts(),
      this.getStores(),
      this.getPurchases(),
      this.getProductions(),
      this.getSales(),
      this.getStockMovements(),
      this.getAllRecipeIngredients(),
      this.getAllRecipePackaging(),
      this.getSettings(),
    ]);

    return {
      recipes,
      products,
      stores,
      purchases,
      productions,
      sales,
      stockMovements,
      recipeIngredients,
      recipePackaging,
      settings,
    };
  }
}

export const cloudDbService = new CloudDbService();
