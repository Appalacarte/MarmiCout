/**
 * Service de stockage IndexedDB pour Marmicout
 * Utilisé pour :
 * 1. Le forfait ESSENTIEL (stockage local pur sur l'appareil)
 * 2. Le cache local de consultation seule 72h pour les forfaits PRO / PRO CLOUD / DÉMO
 */

const DB_NAME = 'marmicout_local_db';
const DB_VERSION = 1;

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

  public async isCacheValid72h(): Promise<boolean> {
    const lastSync = await this.getLastSyncTimestamp();
    if (!lastSync) return false;
    const diffHours = (Date.now() - lastSync) / (1000 * 60 * 60);
    return diffHours <= 72;
  }
}

export const indexedDbService = new IndexedDbService();
