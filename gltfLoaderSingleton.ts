import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three-stdlib';
import { markAsSharedAsset, disposeObject3DResources } from './ThreeSceneCleanup';
import {
  optimizeGlbSceneAsync,
  GlbOptimizationProfile,
  resolveMobileGlbUrls,
  isPreoptimizedMobileGlbUrl,
  isMobileOptimizationTarget,
} from './glbRuntimeOptimizer';

const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

let sharedDracoWasmLoader: DRACOLoader | null = null;
let sharedDracoJsLoader: DRACOLoader | null = null;
let sharedGltfWasmLoader: GLTFLoader | null = null;
let sharedGltfJsLoader: GLTFLoader | null = null;
let dracoWasmDisabled = typeof WebAssembly !== 'object';

function applyOptionalDecoders(loader: GLTFLoader): void {
  try {
    const rawDecoder: any = MeshoptDecoder;
    const dec = typeof rawDecoder === 'function' ? rawDecoder() : rawDecoder;
    if (dec && typeof dec === 'object' && 'supported' in dec) {
      loader.setMeshoptDecoder(dec);
    }
  } catch (_) {}
}

function getJsFallbackGltfLoader(): GLTFLoader {
  if (!sharedGltfJsLoader) {
    sharedDracoJsLoader = new DRACOLoader();
    sharedDracoJsLoader.setDecoderPath(DRACO_DECODER_PATH);
    sharedDracoJsLoader.setDecoderConfig({ type: 'js' });
    sharedDracoJsLoader.setWorkerLimit(1);

    sharedGltfJsLoader = new GLTFLoader();
    sharedGltfJsLoader.setDRACOLoader(sharedDracoJsLoader);
    applyOptionalDecoders(sharedGltfJsLoader);
  }
  return sharedGltfJsLoader;
}

export function getSharedGltfLoader(): GLTFLoader {
  if (dracoWasmDisabled) {
    return getJsFallbackGltfLoader();
  }
  if (!sharedGltfWasmLoader) {
    const workerLimit = isMobileOptimizationTarget() ? 1 : 2;
    sharedDracoWasmLoader = new DRACOLoader();
    sharedDracoWasmLoader.setDecoderPath(DRACO_DECODER_PATH);
    sharedDracoWasmLoader.setDecoderConfig({ type: 'wasm' });
    sharedDracoWasmLoader.setWorkerLimit(workerLimit);

    sharedGltfWasmLoader = new GLTFLoader();
    sharedGltfWasmLoader.setDRACOLoader(sharedDracoWasmLoader);
    applyOptionalDecoders(sharedGltfWasmLoader);
  }
  return sharedGltfWasmLoader;
}

function isLikelyDracoWasmError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '').toLowerCase();
  return (
    msg.includes('wasm') ||
    msg.includes('webassembly') ||
    msg.includes('draco') ||
    msg.includes('compile') ||
    msg.includes('instantiate')
  );
}

const DISK_CACHE_NAMES = ['torneo-campeones-disk-cache-v1', 'torneo-campeones-universal-v1'];
const PRIMARY_DISK_CACHE = 'torneo-campeones-disk-cache-v1';
const GLB_FETCH_TIMEOUT_MS = 14000;

// Cola global serializada para evitar saturar sockets WiFi en móvil cuando varios componentes solicitan GLBs
let activeNetworkDownloads = 0;
const networkQueue: Array<() => void> = [];

function acquireDownloadSlot(): Promise<void> {
  const maxConcurrent = isMobileOptimizationTarget() ? 1 : 2;
  if (activeNetworkDownloads < maxConcurrent) {
    activeNetworkDownloads += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    networkQueue.push(() => {
      activeNetworkDownloads += 1;
      resolve();
    });
  });
}

function releaseDownloadSlot(): void {
  activeNetworkDownloads = Math.max(0, activeNetworkDownloads - 1);
  const next = networkQueue.shift();
  if (next) next();
}

async function readBufferFromDiskCache(url: string): Promise<ArrayBuffer | null> {
  if (typeof window === 'undefined' || !('caches' in window) || !/^https?:\/\//i.test(url)) {
    return null;
  }
  try {
    for (const cName of DISK_CACHE_NAMES) {
      const cache = await window.caches.open(cName);
      const cachedResp = await cache.match(url);
      if (cachedResp && cachedResp.ok) {
        const buffer = await cachedResp.arrayBuffer();
        if (buffer && buffer.byteLength > 0) {
          return buffer;
        }
      }
    }
  } catch (_) {}
  return null;
}

async function fetchGlbBufferWithTimeout(url: string): Promise<ArrayBuffer> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Offline: no network connection');
  }

  await acquireDownloadSlot();
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
    ? window.setTimeout(() => controller.abort(), GLB_FETCH_TIMEOUT_MS)
    : null;

  try {
    const response = await fetch(url, {
      mode: 'cors',
      cache: 'default',
      signal: controller ? controller.signal : undefined,
    });

    if (!response || !response.ok) {
      try {
        await response?.body?.cancel();
      } catch (_) {}
      throw new Error(`HTTP ${response?.status || 0} loading ${url}`);
    }

    const buffer = await response.arrayBuffer();
    if (!buffer || buffer.byteLength === 0) {
      throw new Error(`Empty GLB response from ${url}`);
    }

    // Guardar en CacheStorage en segundo plano para evitar re-descargar por WiFi en futuras sesiones
    if (typeof window !== 'undefined' && 'caches' in window && /^https?:\/\//i.test(url)) {
      try {
        const cache = await window.caches.open(PRIMARY_DISK_CACHE);
        await cache.put(
          url,
          new Response(buffer, {
            status: 200,
            headers: { 'Content-Type': 'model/gltf-binary' },
          })
        );
      } catch (_) {}
    }

    return buffer;
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
    releaseDownloadSlot();
  }
}

async function parseGlbBuffer(loader: GLTFLoader, buffer: ArrayBuffer): Promise<any> {
  return await new Promise<any>((resolve, reject) => {
    // Clonar un slice mínimo en caso de que el worker transfiera el buffer en retry JS fallback
    loader.parse(buffer.slice(0), '', resolve, reject);
  });
}

/**
 * Carga un archivo GLB usando CacheStorage en disco primero, o descarga HTTP acotada por timeout
 * en cola serializada (1 a la vez en móvil para no saturar WiFi), con soporte Draco + Meshopt.
 */
export async function loadGltfFromUrl(url: string): Promise<any> {
  let buffer = await readBufferFromDiskCache(url);
  if (!buffer) {
    buffer = await fetchGlbBufferWithTimeout(url);
  }

  const primaryLoader = getSharedGltfLoader();
  try {
    return await parseGlbBuffer(primaryLoader, buffer);
  } catch (err) {
    if (!dracoWasmDisabled && isLikelyDracoWasmError(err)) {
      dracoWasmDisabled = true;
      const fallbackLoader = getJsFallbackGltfLoader();
      return await parseGlbBuffer(fallbackLoader, buffer);
    }
    throw err;
  }
}

export interface SharedGlbAssetHandle<T = THREE.Group> {
  load: () => Promise<T | null>;
  getCached: () => T | null;
  isSettled: () => boolean;
  disposeCachedAsset: () => void;
}

/**
 * Factoría única basada en promesas para carga perezosa, deduplicación de peticiones,
 * respaldo secuencial entre URLs candidatas, optimización de malla/texturas y caché compartida.
 */
export function createSharedGlbAssetLoader<T = THREE.Group>(
  urls: string[],
  processScene: (rootScene: THREE.Group, url: string) => T | null,
  logTag?: string,
  optimizationProfile?: GlbOptimizationProfile
): SharedGlbAssetHandle<T> {
  let cachedAsset: T | null = null;
  let inFlightPromise: Promise<T | null> | null = null;
  let settled = false;

  const load = (): Promise<T | null> => {
    if (cachedAsset !== null) {
      settled = true;
      return Promise.resolve(cachedAsset);
    }
    if (inFlightPromise) {
      return inFlightPromise;
    }

    inFlightPromise = (async () => {
      try {
        const effectiveUrls = resolveMobileGlbUrls(urls);
        for (const url of effectiveUrls) {
          try {
            const gltf = await loadGltfFromUrl(url);

            if (gltf && gltf.scene) {
              const rawScene = gltf.scene as THREE.Group;
              const preparedScene = optimizationProfile
                ? await optimizeGlbSceneAsync(rawScene, optimizationProfile, {
                    preoptimizedMobile: isPreoptimizedMobileGlbUrl(url),
                  })
                : rawScene;

              const processed = processScene(preparedScene, url);
              if (processed !== null) {
                markAsSharedAsset(preparedScene);
                if (processed instanceof THREE.Object3D) {
                  markAsSharedAsset(processed);
                } else if ((processed as any)?.scene instanceof THREE.Object3D) {
                  markAsSharedAsset((processed as any).scene);
                }
                cachedAsset = processed;
                settled = true;
                return processed;
              }
            }
          } catch (err) {
            if (logTag) {
              console.warn(`[${logTag}] Error cargando modelo desde ${url}:`, err);
            }
          }
        }

        settled = true;
        return null;
      } finally {
        inFlightPromise = null;
      }
    })();

    return inFlightPromise;
  };

  const disposeCachedAsset = () => {
    if (cachedAsset instanceof THREE.Object3D) {
      disposeObject3DResources(cachedAsset);
    }
    cachedAsset = null;
    settled = false;
  };

  return {
    load,
    getCached: () => cachedAsset,
    isSettled: () => settled,
    disposeCachedAsset,
  };
}

/**
 * Hook seguro ante desmontaje para consumir un SharedGlbAssetHandle en componentes R3F.
 */
export function useSharedGlbAsset<T = THREE.Group>(
  handle: SharedGlbAssetHandle<T>,
  disabled = false
): T | null {
  const [asset, setAsset] = useState<T | null>(() => (disabled ? null : handle.getCached()));

  useEffect(() => {
    if (disabled) {
      setAsset(null);
      return;
    }

    const cached = handle.getCached();
    if (cached !== null) {
      setAsset(cached);
      return;
    }

    let isMounted = true;
    handle
      .load()
      .then((loaded) => {
        if (isMounted && loaded !== null) {
          setAsset(loaded);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [handle, disabled]);

  return asset;
}

const glbCache: Record<string, THREE.Group> = {};
const glbPromises = new Map<string, Promise<THREE.Group | null>>();

export function loadGlbModelLazy(
  urls: string[],
  targetSize?: number,
  optimizationProfile: GlbOptimizationProfile = 'PROP'
): Promise<THREE.Group | null> {
  const normalizedUrls = Array.isArray(urls) ? urls.filter(Boolean) : [];
  if (normalizedUrls.length === 0) {
    return Promise.resolve(null);
  }

  const sizeKey = targetSize !== undefined && targetSize > 0 ? String(targetSize) : 'auto';
  const cacheKey = `${normalizedUrls.join('|')}::size:${sizeKey}::prof:${optimizationProfile}`;

  if (glbCache[cacheKey]) {
    return Promise.resolve(glbCache[cacheKey].clone(true));
  }

  const existing = glbPromises.get(cacheKey);
  if (existing) {
    return existing.then((cachedRoot) => (cachedRoot ? cachedRoot.clone(true) : null));
  }

  const promise = (async (): Promise<THREE.Group | null> => {
    const effectiveUrls = resolveMobileGlbUrls(normalizedUrls);
    for (const url of effectiveUrls) {
      try {
        const gltf = await loadGltfFromUrl(url);

        if (gltf && gltf.scene) {
          const root = await optimizeGlbSceneAsync(gltf.scene as THREE.Group, optimizationProfile, {
            preoptimizedMobile: isPreoptimizedMobileGlbUrl(url),
          });

          if (targetSize && targetSize > 0) {
            const box = new THREE.Box3().setFromObject(root);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = maxDim > 0 ? targetSize / maxDim : 1.0;
            root.scale.set(scale, scale, scale);
          }

          markAsSharedAsset(root);
          glbCache[cacheKey] = root;
          return root;
        }
      } catch (_) {}
    }
    return null;
  })().finally(() => {
    if (glbPromises.get(cacheKey) === promise) {
      glbPromises.delete(cacheKey);
    }
  });

  glbPromises.set(cacheKey, promise);
  return promise.then((cachedRoot) => (cachedRoot ? cachedRoot.clone(true) : null));
}

export function disposeLazyGlbCache(): void {
  Object.keys(glbCache).forEach((key) => {
    const asset = glbCache[key];
    if (asset) {
      disposeObject3DResources(asset);
    }
    delete glbCache[key];
  });
}
