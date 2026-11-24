/**
 * Sistema de Optimización y Caché Persistente Integral para Dungeon Dice Battle.
 *
 * Estrategias implementadas:
 * 1. Caché persistente en Memoria RAM viva: Map de HTMLImageElement para retener bitmaps decodificados sin recargas.
 * 2. Caché persistente de Blobs (Blob Object URLs): Las imágenes descargadas se convierten en URLs locales de 0ms sin tráfico de red.
 * 3. Cache Storage API ('ddb-images-cache-v1'): Guarda los activos en el disco local del navegador para no re-descargar entre pestañas o reinicios.
 * 4. URLs verificadas en sessionStorage & memory: Evita reintentos o 404 al cambiar entre pantallas (Tienda, Taller, Forja, Logros, Campamento).
 * 5. Preconnect & DNS-Prefetch en el DOM.
 */

// 1. URLs verificadas en memoria y caché persistente
const verifiedUrlCache = new Map<string, string>();

// 2. Caché en memoria de elementos HTMLImageElement vivos (evita que el navegador descarte el bitmap decodificado)
const activeImageElementCache = new Map<string, HTMLImageElement>();

// 3. Caché de URLs de Blob locales (carga instantánea en 0 milisegundos desde memoria local)
const blobUrlCache = new Map<string, string>();

// 4. Promesas de carga en vuelo (para evitar peticiones duplicadas simultáneas)
const inFlightRequests = new Map<string, Promise<string>>();

const CACHE_NAME = 'ddb-images-cache-v4';
const IDB_DB_NAME = 'ddb_blobs_db_v4';
const IDB_STORE_NAME = 'blobs';
const STORAGE_CACHE_KEY = 'DDB_VERIFIED_IMG_CACHE_V4';
const MAX_RAM_BLOB_URLS = 32;

function registerBlobUrlInMemory(cacheKey: string, objectUrl: string): void {
  if (!cacheKey || !objectUrl) return;
  if (blobUrlCache.has(cacheKey)) {
    const existing = blobUrlCache.get(cacheKey);
    if (existing && existing !== objectUrl && existing.startsWith('blob:')) {
      // Solo revocar si ninguna otra clave sigue apuntando a la misma Blob URL
      let stillReferenced = false;
      blobUrlCache.forEach((val, k) => {
        if (k !== cacheKey && val === existing) stillReferenced = true;
      });
      if (!stillReferenced) {
        try {
          URL.revokeObjectURL(existing);
        } catch (_) {}
      }
    }
    blobUrlCache.delete(cacheKey);
  }

  blobUrlCache.set(cacheKey, objectUrl);

  // Evicción FIFO acotada para no saturar RAM en móviles
  while (blobUrlCache.size > MAX_RAM_BLOB_URLS) {
    const oldestKey = blobUrlCache.keys().next().value;
    if (!oldestKey) break;
    const oldestUrl = blobUrlCache.get(oldestKey);
    blobUrlCache.delete(oldestKey);
    if (oldestUrl && oldestUrl.startsWith('blob:')) {
      let stillReferenced = false;
      blobUrlCache.forEach((val) => {
        if (val === oldestUrl) stillReferenced = true;
      });
      if (!stillReferenced) {
        try {
          URL.revokeObjectURL(oldestUrl);
        } catch (_) {}
        removeVerifiedUrlIfBlob(oldestKey, oldestUrl);
      }
    }
  }
}

// Inicializar almacenamiento persistente en IndexedDB para retener Blobs reales entre pantallas y recargas
let idbPromise: Promise<IDBDatabase> | null = null;
function getIndexedDB(): Promise<IDBDatabase> {
  if (idbPromise) return idbPromise;
  idbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject('IndexedDB not supported');
      return;
    }
    const timer = setTimeout(() => {
      reject(new Error('IndexedDB open timeout'));
    }, 1500);
    try {
      const req = window.indexedDB.open(IDB_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME);
        }
      };
      req.onsuccess = () => {
        clearTimeout(timer);
        resolve(req.result);
      };
      req.onerror = () => {
        clearTimeout(timer);
        reject(req.error);
      };
    } catch (err) {
      clearTimeout(timer);
      reject(err);
    }
  });
  return idbPromise;
}

// Almacenar Blob binario en IndexedDB
async function storeBlobInIDB(key: string, blob: Blob): Promise<void> {
  try {
    const db = await getIndexedDB();
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
    tx.objectStore(IDB_STORE_NAME).put(blob, key);
  } catch (_) {}
}

// Recuperar Blob binario desde IndexedDB
async function getBlobFromIDB(key: string): Promise<Blob | null> {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const req = tx.objectStore(IDB_STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (_) {
    return null;
  }
}

// Solicitar almacenamiento persistente al navegador
try {
  if (typeof window !== 'undefined' && navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
} catch (_) {}

// Restaurar previamente las Blobs y URLs desde IndexedDB y localStorage
if (typeof window !== 'undefined') {
  // 1. Limpieza de versiones viejas de caché en localStorage
  try {
    ['DDB_VERIFIED_IMG_CACHE', 'DDB_VERIFIED_IMG_CACHE_V2', 'DDB_VERIFIED_IMG_CACHE_V3'].forEach((oldK) => {
      localStorage.removeItem(oldK);
      sessionStorage.removeItem(oldK);
    });
  } catch (_) {}

  // 2. Restaurar URLs verificadas desde localStorage
  try {
    if (typeof window.localStorage !== 'undefined') {
      const localRaw = localStorage.getItem(STORAGE_CACHE_KEY);
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        if (parsed && typeof parsed === 'object') {
          let hadInvalidBlob = false;
          Object.entries(parsed).forEach(([k, v]) => {
            if (typeof v === 'string') {
              if (v.startsWith('blob:')) {
                hadInvalidBlob = true;
              } else {
                verifiedUrlCache.set(k, v);
              }
            }
          });
          if (hadInvalidBlob) {
            persistVerifiedUrlCache();
          }
        }
      }
    }
  } catch (_) {}

  // Los Blobs almacenados en IndexedDB se leen bajo demanda en cacheImageBinary()
  // para evitar crear cientos de Object URLs en RAM durante el arranque.
}

/**
 * Obtiene la URL verificada o Blob local disponible en caché.
 */
export function getCachedVerifiedUrl(key: string): string | null {
  if (blobUrlCache.has(key)) {
    return blobUrlCache.get(key)!;
  }
  return verifiedUrlCache.get(key) || null;
}

/**
 * Libera los Blob URLs y referencias HTMLImageElement retenidas en memoria RAM
 * coordinado con UniversalAssetCache.releaseMemory(), preservando intactos
 * el almacenamiento en disco (IndexedDB / Cache Storage) y verifiedUrlCache HTTP.
 */
export function releaseImageMemory(): void {
  const revokedUrls = new Set<string>();
  blobUrlCache.forEach((blobUrl, key) => {
    if (blobUrl && blobUrl.startsWith('blob:')) {
      if (!revokedUrls.has(blobUrl)) {
        revokedUrls.add(blobUrl);
        try {
          URL.revokeObjectURL(blobUrl);
        } catch (_) {}
      }
      removeVerifiedUrlIfBlob(key, blobUrl);
    }
  });
  blobUrlCache.clear();
  activeImageElementCache.clear();
  inFlightRequests.clear();
}

function persistVerifiedUrlCache(): void {
  try {
    if (typeof window === 'undefined') return;
    const obj: Record<string, string> = {};
    verifiedUrlCache.forEach((v, k) => {
      // No almacenar blob URLs efímeros en almacenamiento serializado
      if (!v.startsWith('blob:')) {
        obj[k] = v;
      }
    });
    const serialized = JSON.stringify(obj);

    // Persistencia permanente en localStorage (no se borra al cerrar el navegador o la pestaña)
    if (typeof window.localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_CACHE_KEY, serialized);
    }
    // Respaldo en sessionStorage
    if (typeof window.sessionStorage !== 'undefined') {
      sessionStorage.setItem(STORAGE_CACHE_KEY, serialized);
    }
  } catch (_) {}
}

/**
 * Registra una URL exitosa en caché síncrona y la persiste permanentemente en localStorage y sessionStorage.
 */
export function saveVerifiedUrl(key: string, url: string): void {
  if (!key || !url || url.startsWith('blob:') || url.startsWith('data:')) return;
  verifiedUrlCache.set(key, url);
  persistVerifiedUrlCache();
}

/**
 * Invalida de forma segura una URL cacheada que falló al cargarse (corrupta, revocada o caducada)
 * tanto de memoria RAM como del almacenamiento persistente.
 */
export function invalidateVerifiedUrl(key: string, failedUrl?: string): void {
  if (!key) return;

  if (blobUrlCache.has(key)) {
    const cachedBlob = blobUrlCache.get(key);
    if (!failedUrl || cachedBlob === failedUrl) {
      blobUrlCache.delete(key);
      if (cachedBlob && cachedBlob.startsWith('blob:')) {
        let stillReferenced = false;
        blobUrlCache.forEach((val) => {
          if (val === cachedBlob) stillReferenced = true;
        });
        if (!stillReferenced) {
          try {
            URL.revokeObjectURL(cachedBlob);
          } catch (_) {}
        }
      }
    }
  }

  const currentVerified = verifiedUrlCache.get(key);
  if (currentVerified && (!failedUrl || currentVerified === failedUrl)) {
    verifiedUrlCache.delete(key);
    persistVerifiedUrlCache();
  }

  activeImageElementCache.delete(key);
  if (failedUrl) {
    activeImageElementCache.delete(failedUrl);
  }
}

/**
 * Elimina de forma segura un Blob URL revocado o expirado de verifiedUrlCache
 * para evitar que los componentes intenten renderizar una imagen muerta con error 404.
 */
export function removeVerifiedUrlIfBlob(key: string, blobUrl?: string): void {
  if (!key) return;
  const current = verifiedUrlCache.get(key);
  if (current && current.startsWith('blob:')) {
    if (!blobUrl || current === blobUrl) {
      verifiedUrlCache.delete(key);
    }
  }
}

/**
 * Descarga y almacena una imagen en Cache Storage y crea una Blob URL de alta velocidad.
 */
export async function cacheImageBinary(url: string, key?: string): Promise<string> {
  if (!url || typeof window === 'undefined') return url;

  // Si ya tenemos un Blob URL generado en RAM, devolverlo de inmediato (0ms)
  if (key && blobUrlCache.has(key)) {
    return blobUrlCache.get(key)!;
  }
  if (blobUrlCache.has(url)) {
    return blobUrlCache.get(url)!;
  }

  // Si ya hay una descarga en curso para esta URL, reusarla
  const activeKey = key || url;
  if (inFlightRequests.has(activeKey)) {
    return inFlightRequests.get(activeKey)!;
  }

  const fetchPromise = (async (): Promise<string> => {
    try {
      // 1. Comprobar si existe en memoria o en IndexedDB
      const idbBlob = await getBlobFromIDB(activeKey);
      if (idbBlob && idbBlob.size > 0) {
        const objectUrl = URL.createObjectURL(idbBlob);
        registerBlobUrlInMemory(url, objectUrl);
        if (key) registerBlobUrlInMemory(key, objectUrl);
        return objectUrl;
      }

      // 2. Comprobar si existe en Cache Storage API (caché de imágenes o descarga masiva en disco)
      if ('caches' in window) {
        try {
          for (const cName of [CACHE_NAME, 'torneo-campeones-disk-cache-v1']) {
            const cache = await caches.open(cName);
            const cachedResponse = await cache.match(url);
            if (cachedResponse && cachedResponse.ok) {
              const blob = await cachedResponse.blob();
              if (blob && blob.size > 0) {
                const objectUrl = URL.createObjectURL(blob);
                registerBlobUrlInMemory(url, objectUrl);
                if (key) registerBlobUrlInMemory(key, objectUrl);
                storeBlobInIDB(activeKey, blob);
                return objectUrl;
              }
            }
          }
        } catch (_) {}
      }

      // 3. Si no estaba en caché, descargar mediante fetch con retención total
      const resp = await fetch(url, { mode: 'cors', cache: 'force-cache' });
      if (resp && resp.ok) {
        if ('caches' in window) {
          try {
            const cache = await caches.open(CACHE_NAME);
            cache.put(url, resp.clone()).catch(() => {});
          } catch (_) {}
        }

        const blob = await resp.blob();
        if (blob && blob.size > 0) {
          const objectUrl = URL.createObjectURL(blob);
          registerBlobUrlInMemory(url, objectUrl);
          if (key) {
            registerBlobUrlInMemory(key, objectUrl);
            saveVerifiedUrl(key, url);
          }

          // Guardar permanentemente en IndexedDB
          storeBlobInIDB(activeKey, blob);
          if (key && key !== activeKey) {
            storeBlobInIDB(key, blob);
          }

          return objectUrl;
        }
      }
    } catch (_) {}

    return url;
  })();

  inFlightRequests.set(activeKey, fetchPromise);

  try {
    const finalUrl = await fetchPromise;
    return finalUrl;
  } finally {
    inFlightRequests.delete(activeKey);
  }
}

/**
 * Inyecta enlaces rel="preconnect" y rel="dns-prefetch" para los dominios de activos.
 */
export function initImageDnsPreconnect(): void {
  if (typeof document === 'undefined') return;

  const domains = [
    'https://raw.githubusercontent.com',
    'https://cdn.jsdelivr.net',
    'https://fastly.jsdelivr.net',
    'https://wsrv.nl',
  ];

  domains.forEach((href) => {
    if (!document.querySelector(`link[rel="dns-prefetch"][href="${href}"]`)) {
      const linkDns = document.createElement('link');
      linkDns.rel = 'dns-prefetch';
      linkDns.href = href;
      document.head.appendChild(linkDns);
    }
    if (!document.querySelector(`link[rel="preconnect"][href="${href}"]`)) {
      const linkPre = document.createElement('link');
      linkPre.rel = 'preconnect';
      linkPre.href = href;
      linkPre.crossOrigin = 'anonymous';
      document.head.appendChild(linkPre);
    }
  });
}

/**
 * Detecta si el dispositivo es un móvil o pantalla táctil con recursos ajustados
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Convierte una URL directa de raw.githubusercontent.com en su equivalente de CDN Edge acelerada (jsDelivr),
 * y aplica compresión WebP adaptativa en móviles para reducir la carga de VRAM y evitar stuttering.
 */
export function toFastCdnMirror(githubRawUrl: string): string {
  if (!githubRawUrl || !githubRawUrl.includes('raw.githubusercontent.com')) {
    return githubRawUrl;
  }

  // Si ya es un archivo WebP nativo o modelo GLB, servirlo directamente a través del CDN Edge ultrarrápido de jsDelivr
  if (githubRawUrl.endsWith('.webp') || githubRawUrl.endsWith('.glb')) {
    return githubRawUrl.replace(
      /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/,
      'https://cdn.jsdelivr.net/gh/$1/$2@$3/$4'
    );
  }

  const isMobile = isMobileDevice();
  // En móviles para archivos JPG/PNG pesados, emplear compresión adaptativa si es necesario
  if (isMobile) {
    return `https://wsrv.nl/?url=${encodeURIComponent(githubRawUrl)}&w=800&output=webp&q=82`;
  }

  return githubRawUrl.replace(
    /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/,
    'https://cdn.jsdelivr.net/gh/$1/$2@$3/$4'
  );
}

/**
 * Crea una lista optimizada de URLs priorizando primero la URL en caché o Blob local,
 * luego espejos de CDN rápida y finalmente el fallback directo.
 */
export function optimizeCandidateUrls(cacheKey: string, candidateUrls: string[]): string[] {
  const verified = getCachedVerifiedUrl(cacheKey);
  if (verified) {
    return [verified, ...candidateUrls.filter((u) => u !== verified)];
  }

  const result: string[] = [];
  const seen = new Set<string>();

  const add = (url: string) => {
    if (url && !seen.has(url)) {
      seen.add(url);
      result.push(url);
    }
  };

  candidateUrls.slice(0, 3).forEach((url) => {
    const cdnUrl = toFastCdnMirror(url);
    if (cdnUrl !== url) {
      add(cdnUrl);
    }
    add(url);
  });

  candidateUrls.slice(3).forEach((url) => {
    add(url);
  });

  return result;
}

/**
 * Precarga una imagen en la memoria caché del navegador de forma no bloqueante y la retiene viva en RAM.
 */
export function preloadSingleImage(url: string, keyToCache?: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !url) {
      resolve(false);
      return;
    }

    // Comprobar si ya existe en la caché viva
    const existing = activeImageElementCache.get(url);
    if (existing && existing.complete && existing.naturalWidth > 0) {
      if (keyToCache) {
        saveVerifiedUrl(keyToCache, url);
      }
      resolve(true);
      return;
    }

    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      // Retener el objeto en memoria viva para que nunca se descarte el bitmap
      activeImageElementCache.set(url, img);
      if (keyToCache) {
        saveVerifiedUrl(keyToCache, url);
        activeImageElementCache.set(keyToCache, img);
      }
      // Almacenar también binario en Cache Storage
      cacheImageBinary(url, keyToCache).catch(() => {});
      resolve(true);
    };
    img.onerror = () => {
      // Si la URL principal falló y era raw.githubusercontent.com, intentar mirror CDN
      if (url.includes('raw.githubusercontent.com')) {
        const mirror = toFastCdnMirror(url);
        if (mirror !== url) {
          const fallbackImg = new Image();
          fallbackImg.decoding = 'async';
          fallbackImg.onload = () => {
            activeImageElementCache.set(mirror, fallbackImg);
            if (keyToCache) {
              saveVerifiedUrl(keyToCache, mirror);
              activeImageElementCache.set(keyToCache, fallbackImg);
            }
            cacheImageBinary(mirror, keyToCache).catch(() => {});
            resolve(true);
          };
          fallbackImg.onerror = () => resolve(false);
          fallbackImg.src = mirror;
          return;
        }
      }
      resolve(false);
    };
    img.src = url;
  });
}

/**
 * Precarga masiva en segundo plano de todos los activos clave del juego.
 */
export function preloadGameAssetsInBackground(urlsToPreload: { key?: string; url: string }[]): void {
  if (typeof window === 'undefined' || !urlsToPreload || urlsToPreload.length === 0) return;

  // Ejecutar con retraso y en lotes pequeños para no saturar la red ni bloquear el arranque del juego
  setTimeout(() => {
    // Solo precargar los primeros 5 elementos prioritarios
    const essential = urlsToPreload.slice(0, 6);
    essential.forEach((item) => {
      if (item && item.url) {
        preloadSingleImage(item.url, item.key).catch(() => {});
      }
    });
  }, 2500);
}
