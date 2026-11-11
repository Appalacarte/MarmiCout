/**
 * Service d'accès Cloud direct Supabase pour Marmicout (Forfaits Pro, Pro Cloud & Démo 14j)
 * Architecture simplifiée :
 * - En ligne : Écritures et lectures directes dans Supabase (PostgreSQL / RLS)
 * - Mise en miroir immédiate dans IndexedDB pour alimenter le cache local
 * - Hors ligne : Bascule automatique vers le cache local IndexedDB en consultation seule (72h)
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

export class CloudDbService {
  private establishmentId: string | null = null;

  public setEstablishmentId(id: string | null) {
    this.establishmentId = id;
  }

  public getEstablishmentId(): string | null {
    return this.establishmentId;
  }

  public isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
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

  public async saveStore(store: Store): Promise<void> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h. Reconnectez-vous pour enregistrer.');
    }
    const payload: any = {
      name: store.name,
      type: store.type,
      address: store.address || null,
      phone: store.phone || null,
      notes: store.notes || null,
    };
    if (this.establishmentId) payload.establishment_id = this.establishmentId;

    if (store.id && !store.id.startsWith('temp_')) {
      await supabase.from('marmicout_stores').update(payload).eq('id', store.id);
    } else {
      await supabase.from('marmicout_stores').insert(payload);
    }
    await indexedDbService.put('stores', store);
  }

  public async deleteStore(id: string): Promise<void> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h.');
    }
    await supabase.from('marmicout_stores').delete().eq('id', id);
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
    }));
    await indexedDbService.setAll('products', products);
    await indexedDbService.setLastSyncTimestamp();
    return products;
  }

  public async saveProduct(product: Product): Promise<void> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h. Reconnectez-vous pour enregistrer.');
    }
    const payload: any = {
      barcode: product.barcode || null,
      name: product.name,
      category: product.category,
      unit: product.unit,
      brand: product.brand || null,
      format: product.format || null,
      stock: product.stock,
      min_stock_alert: product.minStockAlert,
      avg_purchase_price: product.avgPurchasePrice,
      main_store_id: product.mainStoreId || null,
      notes: product.notes || null,
      is_active: product.isActive !== false,
      photo: product.photo || null,
    };
    if (this.establishmentId) payload.establishment_id = this.establishmentId;

    if (product.id && !product.id.startsWith('temp_')) {
      await supabase.from('marmicout_products').update(payload).eq('id', product.id);
    } else {
      await supabase.from('marmicout_products').insert(payload);
    }
    await indexedDbService.put('products', product);
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
    }));
    await indexedDbService.setAll('recipes', recipes);
    await indexedDbService.setLastSyncTimestamp();
    return recipes;
  }

  public async saveRecipe(recipe: Recipe): Promise<void> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h. Reconnectez-vous pour enregistrer.');
    }
    const payload: any = {
      name: recipe.name,
      category: recipe.category,
      description: recipe.description || null,
      portions: recipe.portions,
      yield_qty: recipe.yieldQty,
      yield_unit: recipe.yieldUnit,
      stock: recipe.stock,
      prep_time_minutes: recipe.prepTimeMinutes || null,
      utensils_notes: recipe.utensilsNotes || null,
      notes: recipe.notes || null,
      is_active: recipe.isActive !== false,
      photo: recipe.photo || null,
      original_portions: recipe.originalPortions || null,
      instructions: recipe.instructions || null,
    };
    if (this.establishmentId) payload.establishment_id = this.establishmentId;

    if (recipe.id && !recipe.id.startsWith('temp_')) {
      await supabase.from('marmicout_recipes').update(payload).eq('id', recipe.id);
    } else {
      await supabase.from('marmicout_recipes').insert(payload);
    }
    await indexedDbService.put('recipes', recipe);
  }

  // --- PURCHASES ---
  public async getPurchases(): Promise<Purchase[]> {
    if (!this.isOnline()) {
      return indexedDbService.getAll<Purchase>('purchases');
    }
    const { data, error } = await supabase
      .from('marmicout_purchases')
      .select('*')
      .order('date', { ascending: false });
    if (error) {
      console.warn('[CloudDbService] getPurchases fallback to cache:', error);
      return indexedDbService.getAll<Purchase>('purchases');
    }
    const purchases: Purchase[] = (data || []).map((row: any) => ({
      id: row.id,
      date: row.date,
      productId: row.product_id,
      qty: Number(row.quantity),
      unit: row.unit || 'kg',
      pricePaid: Number(row.price_paid || row.unit_price_ht * row.quantity),
      unitPrice: Number(row.unit_price_ht || 0),
      storeId: row.store_id || '',
      batchNo: row.batch_no || undefined,
      expiryDate: row.expiry_date || undefined,
      notes: row.notes || undefined,
    }));
    await indexedDbService.setAll('purchases', purchases);
    await indexedDbService.setLastSyncTimestamp();
    return purchases;
  }

  public async savePurchase(purchase: Purchase): Promise<void> {
    if (!this.isOnline()) {
      throw new Error('Hors connexion : consultation seule pendant 72 h. Reconnectez-vous pour enregistrer.');
    }
    const payload: any = {
      date: purchase.date,
      store_id: purchase.storeId || null,
      product_id: purchase.productId,
      quantity: purchase.qty,
      unit: purchase.unit,
      unit_price_ht: purchase.unitPrice,
      price_paid: purchase.pricePaid,
      batch_no: purchase.batchNo || null,
      expiry_date: purchase.expiryDate || null,
      notes: purchase.notes || null,
    };
    if (this.establishmentId) payload.establishment_id = this.establishmentId;

    if (purchase.id && !purchase.id.startsWith('temp_')) {
      await supabase.from('marmicout_purchases').update(payload).eq('id', purchase.id);
    } else {
      await supabase.from('marmicout_purchases').insert(payload);
    }
    await indexedDbService.put('purchases', purchase);
  }

  // --- RECIPE INGREDIENTS ---
  public async getRecipeIngredients(recipeId?: string): Promise<RecipeIngredient[]> {
    if (!this.isOnline()) {
      const all = await indexedDbService.getAll<RecipeIngredient>('recipe_ingredients');
      return recipeId ? all.filter((i) => i.recipeId === recipeId) : all;
    }
    let query = supabase.from('marmicout_recipe_ingredients').select('*');
    if (recipeId) query = query.eq('recipe_id', recipeId);
    const { data, error } = await query;
    if (error) {
      const all = await indexedDbService.getAll<RecipeIngredient>('recipe_ingredients');
      return recipeId ? all.filter((i) => i.recipeId === recipeId) : all;
    }
    const list: RecipeIngredient[] = (data || []).map((row: any) => ({
      id: row.id,
      recipeId: row.recipe_id,
      productId: row.product_id || undefined,
      customName: row.custom_name || undefined,
      qtyUsed: Number(row.quantity || row.qty_used || 0),
      unit: row.unit || 'g',
      originalQtyUsed: row.original_qty_used ? Number(row.original_qty_used) : undefined,
      customCostPerUnit: row.custom_cost_per_unit ? Number(row.custom_cost_per_unit) : undefined,
    }));
    await indexedDbService.setAll('recipe_ingredients', list);
    return list;
  }

  // --- RECIPE PACKAGING ---
  public async getRecipePackaging(recipeId?: string): Promise<RecipePackaging[]> {
    if (!this.isOnline()) {
      const all = await indexedDbService.getAll<RecipePackaging>('recipe_packaging');
      return recipeId ? all.filter((p) => p.recipeId === recipeId) : all;
    }
    let query = supabase.from('marmicout_recipe_packaging').select('*');
    if (recipeId) query = query.eq('recipe_id', recipeId);
    const { data, error } = await query;
    if (error) {
      const all = await indexedDbService.getAll<RecipePackaging>('recipe_packaging');
      return recipeId ? all.filter((p) => p.recipeId === recipeId) : all;
    }
    const list: RecipePackaging[] = (data || []).map((row: any) => ({
      id: row.id,
      recipeId: row.recipe_id,
      name: row.name || 'Emballage',
      qtyUsed: Number(row.quantity || row.qty_used || 1),
      costPerUnit: Number(row.cost_per_unit || 0),
    }));
    await indexedDbService.setAll('recipe_packaging', list);
    return list;
  }

  // --- PRODUCTIONS ---
  public async getProductions(): Promise<Production[]> {
    if (!this.isOnline()) {
      return indexedDbService.getAll<Production>('productions');
    }
    const { data, error } = await supabase
      .from('marmicout_productions')
      .select('*')
      .order('date', { ascending: false });
    if (error) {
      return indexedDbService.getAll<Production>('productions');
    }
    const list: Production[] = (data || []).map((row: any) => ({
      id: row.id,
      date: row.date,
      recipeId: row.recipe_id,
      portionsProduced: Number(row.portions_produced),
      calculatedCost: Number(row.calculated_cost || 0),
      notes: row.notes || undefined,
    }));
    await indexedDbService.setAll('productions', list);
    return list;
  }

  // --- SALES ---
  public async getSales(): Promise<Sale[]> {
    if (!this.isOnline()) {
      return indexedDbService.getAll<Sale>('sales');
    }
    const { data, error } = await supabase
      .from('marmicout_sales')
      .select('*')
      .order('date', { ascending: false });
    if (error) {
      return indexedDbService.getAll<Sale>('sales');
    }
    const list: Sale[] = (data || []).map((row: any) => ({
      id: row.id,
      date: row.date,
      itemId: row.item_id,
      itemType: (row.item_type || 'RECIPE') as 'RECIPE' | 'PRODUCT',
      qtySold: Number(row.qty_sold || row.quantity || 0),
      unitPrice: Number(row.unit_price || 0),
      location: row.location || 'Marché',
      notes: row.notes || undefined,
    }));
    await indexedDbService.setAll('sales', list);
    return list;
  }

  // --- STOCK MOVEMENTS ---
  public async getStockMovements(): Promise<StockMovement[]> {
    if (!this.isOnline()) {
      return indexedDbService.getAll<StockMovement>('stock_movements');
    }
    const { data, error } = await supabase
      .from('marmicout_stock_movements')
      .select('*')
      .order('date', { ascending: false });
    if (error) {
      return indexedDbService.getAll<StockMovement>('stock_movements');
    }
    const list: StockMovement[] = (data || []).map((row: any) => ({
      id: row.id,
      date: row.date,
      productId: row.product_id,
      qty: Number(row.qty || row.quantity || 0),
      type: (row.type || 'AJUSTEMENT') as 'ACHAT' | 'PRODUCTION_CONSOMMATION' | 'VENTE_DIRECTE' | 'AJUSTEMENT',
      refId: row.ref_id || row.reference_id || 'MANUAL',
      notes: row.notes || undefined,
    }));
    await indexedDbService.setAll('stock_movements', list);
    return list;
  }

  // --- SETTINGS ---
  public async getSettings(): Promise<Settings | null> {
    if (!this.isOnline()) {
      const items = await indexedDbService.getAll<any>('settings');
      return items.find((i) => i.key === 'app_settings')?.value || null;
    }
    const { data, error } = await supabase
      .from('marmicout_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      const items = await indexedDbService.getAll<any>('settings');
      return items.find((i) => i.key === 'app_settings')?.value || null;
    }
    const settings: Settings = {
      businessName: data.business_name || 'Mon Établissement',
      currency: data.currency || '€',
      defaultTargetMargin: Number(data.default_target_margin || 60),
      categories: data.categories || [],
      recipeCategories: data.recipe_categories || ['Entrée', 'Plat', 'Dessert', 'Boisson'],
      units: data.units || ['kg', 'g', 'l', 'cl', 'ml', 'pièce'],
      salesLocations: data.sales_locations || ['Marché', 'Commande', 'En Ligne', 'Domicile', 'Autre'],
      defaultMinStockAlert: Number(data.default_min_stock_alert || 2),
      googleSheetId: data.google_sheet_id || undefined,
      googleSheetLink: data.google_sheet_link || undefined,
      googleWebAppUrl: data.google_web_app_url || undefined,
    };
    await indexedDbService.put('settings', { key: 'app_settings', value: settings });
    return settings;
  }
}

export const cloudDbService = new CloudDbService();
