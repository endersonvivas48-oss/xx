/**
 * UniversalAssetCache.ts
 * Gestor unificado de almacenamiento y recuperación de assets (Texturas, Modelos .glb, Imágenes).
 * Diseñado específicamente para entornos web modernos, iframes aislados de Google Playground
 * y dispositivos móviles Android con cuotas dinámicas de almacenamiento.
 *
 * Correcciones críticas aplicadas:
 * 1. Deduplicación de peticiones concurrentes (in-flight request deduplication) para evitar memory leaks.
 * 2. Revocación segura de Blob URLs y sincronización de ciclo de vida con verifiedUrlCache.
 * 3. Manejo seguro de response.clone() y esquemas no soportados por Cache API (file:, data:, etc.).
 * 4. Validación estricta de candidateUrls (evita TypeError si es nulo, undefined o no iterable).
 * 5. Detección segura de Cache API en modo incógnito e iframes con sandbox restrictivo.
 */

import { removeVerifiedUrlIfBlob, releaseImageMemory } from './imageOptimizer';

const CACHE_NAME = 'torneo-campeones-universal-v1';
const DISK_PRELOAD_CACHE_NAME = 'torneo-campeones-disk-cache-v1';

class UniversalAssetCacheManager {
  private memoryBlobUrls: Map<string, string> = new Map();
  private inFlightRequests: Map<string, Promise<string | null>> = new Map();
  private cacheAvailable: boolean | null = null;

  /**
   * Comprueba de manera segura si la Cache API es realmente accesible y no está bloqueada
   * por restricciones de Incógnito, Safari ITP o iframes con sandbox de seguridad (Google Playground).
   */
  private async isCacheUsable(): Promise<boolean> {
    if (this.cacheAvailable !== null) {
      return this.cacheAvailable;
    }
    if (typeof window === 'undefined' || !('caches' in window)) {
      this.cacheAvailable = false;
      return false;
    }
    try {
      const testCache = await caches.open('ddb-probe-cache-test');
      await testCache.keys();
      await caches.delete('ddb-probe-cache-test').catch(() => {});
      this.cacheAvailable = true;
    } catch (_) {
      // Modo incógnito estricto o iframe restringido (SecurityError: Access to Storage is denied)
      this.cacheAvailable = false;
    }
    return this.cacheAvailable;
  }

  /**
   * Determina si una URL posee un esquema seguro y compatible con Cache API (http / https).
   * Los esquemas locales como file:, blob:, data: lanzan TypeError al llamar a cache.put.
   */
  private isCacheableScheme(url: string): boolean {
    return /^https?:\/\//i.test(url);
  }

  /**
   * Obtiene la URL utilizable de un asset con deduplicación en vuelo,
   * lectura desde Cache API de disco y descarga con almacenamiento persistente.
   */
  async getAssetUrl(id: string, candidateUrls: string[]): Promise<string | null> {
    if (!id || typeof id !== 'string') return null;

    if (!candidateUrls || !Array.isArray(candidateUrls) || candidateUrls.length === 0) {
      return null;
    }

    if (this.memoryBlobUrls.has(id)) {
      return this.memoryBlobUrls.get(id)!;
    }

    const existingRequest = this.inFlightRequests.get(id);
    if (existingRequest) {
      return existingRequest;
    }

    const requestPromise = this.fetchAndCacheAsset(id, candidateUrls).finally(() => {
      if (this.inFlightRequests.get(id) === requestPromise) {
        this.inFlightRequests.delete(id);
      }
    });

    this.inFlightRequests.set(id, requestPromise);
    return requestPromise;
  }

  private async fetchAndCacheAsset(id: string, candidateUrls: string[]): Promise<string | null> {
    // 4. Validación defensiva de candidateUrls (evita TypeError: candidateUrls is not iterable)
    if (!candidateUrls || !Array.isArray(candidateUrls) || candidateUrls.length === 0) {
      return null;
    }

    const usableCache = await this.isCacheUsable();

    // 1. Revisar si ya está en la Cache API del navegador/sistema operativo (caché universal o descarga offline)
    if (usableCache) {
      try {
        const cacheNames = [CACHE_NAME, DISK_PRELOAD_CACHE_NAME];
        for (const cName of cacheNames) {
          const cache = await caches.open(cName);
          for (const url of candidateUrls) {
            if (!url || typeof url !== 'string' || !this.isCacheableScheme(url)) continue;
            try {
              const cachedResponse = await cache.match(url);
              if (cachedResponse && cachedResponse.ok) {
                const blob = await cachedResponse.blob();
                if (blob && blob.size > 0) {
                  // Comprobar antes de crear un nuevo Blob URL si otro flujo ya lo registró
                  if (this.memoryBlobUrls.has(id)) {
                    return this.memoryBlobUrls.get(id)!;
                  }
                  const blobUrl = URL.createObjectURL(blob);
                  this.memoryBlobUrls.set(id, blobUrl);
                  return blobUrl;
                }
              }
            } catch (_) {}
          }
        }
      } catch (_) {
        // En caso de modo incógnito o restricciones de seguridad en iframes, continuar al fetch
      }
    }

    // 2. Descarga desde la red iterando las réplicas CDN candidatas
    for (const url of candidateUrls) {
      if (!url || typeof url !== 'string') continue;
      try {
        const response = await fetch(url, { mode: 'cors' });
        if (response && response.ok) {
          // 3. Manejo seguro de Cache API con response.clone() protegido y validación de esquema
          if (usableCache && this.isCacheableScheme(url)) {
            try {
              const cache = await caches.open(CACHE_NAME);
              // Clonar antes de consumir el body para evitar "Body has already been consumed"
              const clone = response.clone();
              cache.put(url, clone).catch(() => {});
            } catch (_) {}
          }

          const blob = await response.blob();
          if (blob && blob.size > 0) {
            // Si durante el await de la red ya se registró una URL para este id, limpiar la previa
            if (this.memoryBlobUrls.has(id)) {
              const old = this.memoryBlobUrls.get(id)!;
              try {
                if (old.startsWith('blob:')) URL.revokeObjectURL(old);
              } catch (_) {}
            }

            const blobUrl = URL.createObjectURL(blob);
            this.memoryBlobUrls.set(id, blobUrl);
            return blobUrl;
          }
        }
      } catch (_) {
        // Intentar siguiente URL candidata
      }
    }

    return null;
  }

  /**
   * Limpieza de memoria RAM entre escenas (ej. de CityOverworld a COMBAT o HouseInteriorScene).
   * Revoca los Blob URLs en memoria RAM viva para no saturar dispositivos móviles con poca memoria,
   * manteniendo los archivos seguros en la Cache API de disco.
   *
   * CRÍTICO: Remueve además la referencia del verifiedUrlCache de imageOptimizer para evitar
   * que otros componentes sigan intentando cargar un Blob URL revocado.
   */
  releaseMemory() {
    this.memoryBlobUrls.forEach((blobUrl, id) => {
      try {
        if (blobUrl && blobUrl.startsWith('blob:')) {
          URL.revokeObjectURL(blobUrl);
          removeVerifiedUrlIfBlob(id, blobUrl);
        }
      } catch (_) {}
    });
    this.memoryBlobUrls.clear();
    this.inFlightRequests.clear();

    // Coordinar la liberación de Blob URLs y bitmaps en RAM dentro de imageOptimizer
    // manteniendo intacta la caché persistente en disco (Cache Storage / IndexedDB).
    releaseImageMemory();
  }

  /**
   * Limpieza explícita y manual de la caché persistente en disco (solo si se solicita borrar almacenamiento).
   */
  async clearDiskCache(): Promise<void> {
    this.releaseMemory();
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        await caches.delete(CACHE_NAME);
      } catch (_) {}
    }
  }

  /**
   * Obtiene la cantidad de assets en memoria RAM viva
   */
  getMemoryCount(): number {
    return this.memoryBlobUrls.size;
  }
}

export const UniversalAssetCache = new UniversalAssetCacheManager();
