/**
 * Service de stockage IndexedDB pour Marmicout
 * Utilisé pour :
 * 1. Le forfait ESSENTIEL (stockage local pur sur l'appareil)
 * 2. Le cache local de consultation seule 72h pour les forfaits PRO / PRO CLOUD / DÉMO
 */

const DB_NAME = 'marmicout_local_db';
const DB_VERSION = 2;

export const INDEXEDDB_STORES = [
  'products',
  'stores',
  'purchases',
  'recipes',
  'recipe_ingredients',
  'recipe_packaging',
  'productions',
  'sales',
  'stock_movements',
  'planning',
  'settings',
  'cache_meta',
] as const;

export type StoreName = (typeof INDEXEDDB_STORES)[number];

class IndexedDbService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB non disponible dans cet environnement'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        INDEXEDDB_STORES.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            // Pour settings et cache_meta on utilise un keyPath 'key'
            if (storeName === 'settings' || storeName === 'cache_meta') {
              db.createObjectStore(storeName, { keyPath: 'key' });
            } else {
              db.createObjectStore(storeName, { keyPath: 'id' });
            }
          }
        });
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  public async getAll<T>(storeName: StoreName): Promise<T[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result || []) as T[]);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn(`[IndexedDB getAll error for ${storeName}]`, err);
      return [];
    }
  }

  public async setAll<T>(storeName: StoreName, items: T[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async put<T>(storeName: StoreName, item: T): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async delete(storeName: StoreName, key: string | number): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async clear(storeName: StoreName): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async setLastSyncTimestamp(timestamp: number = Date.now()): Promise<void> {
    await this.put('cache_meta', { key: 'last_cloud_sync', value: timestamp });
  }

  public async getLastSyncTimestamp(): Promise<number | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('cache_meta', 'readonly');
        const store = tx.objectStore('cache_meta');
        const req = store.get('last_cloud_sync');
        req.onsuccess = () => resolve(req.result ? (req.result.value as number) : null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  public async markUnsyncedOperation(delta: number = 1): Promise<void> {
    try {
      const current = await this.getUnsyncedOperationsCount();
      const next = Math.max(0, current + delta);
      if (typeof window !== 'undefined') {
        localStorage.setItem('marmicout_unsynced_ops', String(next));
      }
      await this.put('cache_meta', {
        key: 'unsynced_operations_count',
        value: next,
        updatedAt: Date.now(),
      });
    } catch {
      // Ignorer
    }
  }

  public async clearUnsyncedOperations(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('marmicout_unsynced_ops');
      }
      await this.put('cache_meta', {
        key: 'unsynced_operations_count',
        value: 0,
        updatedAt: Date.now(),
      });
    } catch {
      // Ignorer
    }
  }

  public async getUnsyncedOperationsCount(): Promise<number> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('cache_meta', 'readonly');
        const store = tx.objectStore('cache_meta');
        const req = store.get('unsynced_operations_count');
        req.onsuccess = () => {
          const val = req.result ? Number(req.result.value || 0) : 0;
          resolve(Number.isFinite(val) ? val : 0);
        };
        req.onerror = () => resolve(0);
      });
    } catch {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('marmicout_unsynced_ops');
        return raw ? Number(raw) || 0 : 0;
      }
      return 0;
    }
  }

  public async isCacheValid72h(): Promise<boolean> {
    const lastSync = await this.getLastSyncTimestamp();
    if (!lastSync) return false;
    const diffHours = (Date.now() - lastSync) / (1000 * 60 * 60);
    return diffHours <= 72;
  }

  /**
   * Migration automatique de localStorage vers IndexedDB pour le mode Essentiel
   * Garantit l'absence de saturation du localStorage et la persistance Safari
   */
  public async migrateLocalStorageToIndexedDB(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const alreadyMigrated = localStorage.getItem('marmicout_indexeddb_migrated');
      if (alreadyMigrated === 'true') return;

      const keysMap: Record<string, StoreName> = {
        marmicout_products: 'products',
        marmicout_stores: 'stores',
        marmicout_purchases: 'purchases',
        marmicout_recipes: 'recipes',
        marmicout_recipe_ingredients: 'recipe_ingredients',
        marmicout_recipe_packaging: 'recipe_packaging',
        marmicout_productions: 'productions',
        marmicout_sales: 'sales',
        marmicout_stock_movements: 'stock_movements',
      };

      for (const [lsKey, storeName] of Object.entries(keysMap)) {
        const raw = localStorage.getItem(lsKey);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              await this.setAll(storeName, parsed);
            }
          } catch (e) {
            console.warn(`[Migration IDB] Erreur sur ${lsKey}`, e);
          }
        }
      }

      const settingsRaw = localStorage.getItem('marmicout_settings');
      if (settingsRaw) {
        try {
          const parsedSettings = JSON.parse(settingsRaw);
          await this.put('settings', { key: 'app_settings', value: parsedSettings });
        } catch (e) {
          console.warn('[Migration IDB] Erreur sur settings', e);
        }
      }

      localStorage.setItem('marmicout_indexeddb_migrated', 'true');
      console.log('✅ [IndexedDB] Migration des données locales localStorage -> IndexedDB effectuée avec succès.');
    } catch (err) {
      console.error('[IndexedDB] Erreur lors de la migration localStorage -> IndexedDB:', err);
    }
  }
}

export const indexedDbService = new IndexedDbService();
