/**
 * Capa de abstracción IndexedDB tipo Dexie / Promise-based Database Engine
 * Provee transacciones asíncronas basadas en promesas, cero bloqueos en el hilo principal
 * y soporte resiliente offline para inventario de dados, orbes, progresos y personalización.
 * Incluye gestión de cuota (QuotaExceededError), limpieza selectiva de cachés temporales
 * y doble capa de respaldo (LocalStorage / Memoria Volátil) sin borrar partidas guardadas.
 */

const DB_NAME = 'TorneoCampeonesDB';
const DB_VERSION = 1;

export interface DBRecord<T = unknown> {
  key: string;
  data: T;
  updatedAt: number;
}

class TacticalDexieDB {
  private dbPromise: Promise<IDBDatabase> | null = null;
  // Estrategia de respaldo 3 en memoria por si IndexedDB y LocalStorage fallan simultáneamente
  private memoryFallback: Map<string, unknown> = new Map();

  private isQuotaExceededError(err: any): boolean {
    if (!err) return false;
    return (
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 ||
      err.code === 1014
    );
  }

  /**
   * Elimina ÚNICAMENTE claves efímeras de caché o fallback en localStorage,
   * preservando intactas las partidas guardadas (dungeon_dice_save, campañas, presets y tutoriales).
   */
  private purgeLocalStorageCacheKeys(excludeKey?: string): number {
    if (typeof window === 'undefined' || !window.localStorage) return 0;

    const keysToRemove: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || k === excludeKey) continue;
        if (
          k.startsWith('cache_') ||
          k.startsWith('temp_') ||
          k.startsWith('asset_candidate_') ||
          k.startsWith('idb_fallback_')
        ) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch (_) {}
      });
    } catch (_) {}

    return keysToRemove.length;
  }

  private getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.reject(new Error('IndexedDB not supported in this environment'));
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Stores organizados para consultas complejas y alto rendimiento
        if (!db.objectStoreNames.contains('gameProgress')) {
          db.createObjectStore('gameProgress', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('inventory')) {
          db.createObjectStore('inventory', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('customization')) {
          db.createObjectStore('customization', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Limpieza de emergencia por cuota de almacenamiento agotada (QuotaExceededError).
   * Elimina únicamente registros temporales/caché de IndexedDB y LocalStorage,
   * protegiendo las partidas, inventarios y personalizaciones del jugador.
   */
  async purgeStaleCache(): Promise<void> {
    try {
      const db = await this.getDB();
      const storeNames: Array<'gameProgress' | 'inventory' | 'customization'> = [
        'customization',
        'inventory',
      ];

      for (const sName of storeNames) {
        try {
          await new Promise<void>((resolve) => {
            const tx = db.transaction(sName, 'readwrite');
            const store = tx.objectStore(sName);
            const req = store.openCursor();

            req.onsuccess = (e) => {
              const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
              if (cursor) {
                const record = cursor.value as DBRecord;
                if (
                  record?.key &&
                  (record.key.startsWith('temp_') ||
                    record.key.startsWith('cache_') ||
                    record.key.startsWith('asset_candidate_'))
                ) {
                  cursor.delete();
                }
                cursor.continue();
              }
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
          });
        } catch (_) {}
      }
    } catch (_) {}

    // Limpieza selectiva en LocalStorage de entradas no críticas
    this.purgeLocalStorageCacheKeys();
  }

  async set<T>(storeName: 'gameProgress' | 'inventory' | 'customization', key: string, data: T): Promise<void> {
    const memoryKey = `${storeName}_${key}`;
    this.memoryFallback.set(memoryKey, data);

    const writeToIdb = async () => {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const record: DBRecord<T> = { key, data, updatedAt: Date.now() };
        const req = store.put(record);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.onerror = () => reject(tx.error);
      });
    };

    try {
      await writeToIdb();
    } catch (err: any) {
      // Si la cuota de disco se agotó, purgar cachés temporales y reintentar una vez
      if (this.isQuotaExceededError(err)) {
        try {
          await this.purgeStaleCache();
          await writeToIdb();
          return;
        } catch (_) {}
      }

      // Fallback 1: LocalStorage con protección selectiva ante fallo de cuota
      const fallbackKey = `idb_fallback_${storeName}_${key}`;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(fallbackKey, JSON.stringify(data));
        }
      } catch (lsErr: any) {
        // Si localStorage también se llena, purgar ÚNICAMENTE cachés y fallbacks obsoletos (nunca localStorage.clear())
        if (this.isQuotaExceededError(lsErr)) {
          try {
            const removed = this.purgeLocalStorageCacheKeys(fallbackKey);
            if (removed > 0) {
              localStorage.setItem(fallbackKey, JSON.stringify(data));
            }
          } catch (_) {}
        }
      }
    }
  }

  async get<T>(storeName: 'gameProgress' | 'inventory' | 'customization', key: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      const result = await new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);

        req.onsuccess = () => {
          const res = req.result as DBRecord<T> | undefined;
          resolve(res ? res.data : null);
        };
        req.onerror = () => reject(req.error);
      });

      if (result !== null) {
        return result;
      }
    } catch (_) {}

    // Fallback 1: LocalStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(`idb_fallback_${storeName}_${key}`);
        if (raw) return JSON.parse(raw);
      }
    } catch (_) {}

    // Fallback 2: Memoria volátil
    const mem = this.memoryFallback.get(`${storeName}_${key}`) as T | undefined;
    return mem !== undefined ? mem : null;
  }

  async delete(storeName: 'gameProgress' | 'inventory' | 'customization', key: string): Promise<void> {
    this.memoryFallback.delete(`${storeName}_${key}`);

    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (_) {}

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(`idb_fallback_${storeName}_${key}`);
      }
    } catch (_) {}
  }
}

export const dexieStorage = new TacticalDexieDB();
