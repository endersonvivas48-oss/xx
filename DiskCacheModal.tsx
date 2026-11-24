import React, { useEffect, useMemo, useRef, useState } from 'react';
import { gameAudio, isAndroidDevice } from './utils';
import { saveVerifiedUrl } from './imageOptimizer';
import { CRITICAL_ASSET_MANIFEST, AssetDownloadItem } from './assetManifest';

const CACHE_NAME = 'torneo-campeones-disk-cache-v1';

function hasCacheStorageSupport(): boolean {
  try {
    return typeof window !== 'undefined' && 'caches' in window && Boolean(window.caches);
  } catch {
    return false;
  }
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  parentSignal?: AbortSignal
): Promise<Response | null> {
  if (parentSignal?.aborted) return null;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let onParentAbort: (() => void) | null = null;
  if (controller && parentSignal) {
    onParentAbort = () => controller.abort();
    parentSignal.addEventListener('abort', onParentAbort, { once: true });
  }
  const timer = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const res = await fetch(url, {
      mode: 'cors',
      cache: 'default',
      signal: controller ? controller.signal : undefined,
    });
    return res;
  } catch (_) {
    return null;
  } finally {
    if (timer !== null) clearTimeout(timer);
    if (parentSignal && onParentAbort) {
      parentSignal.removeEventListener('abort', onParentAbort);
    }
  }
}

function registerVerifiedItemUrl(item: AssetDownloadItem, url: string): void {
  saveVerifiedUrl(item.id, url);
  if (item.extraCacheKeys) {
    item.extraCacheKeys.forEach((k) => saveVerifiedUrl(k, url));
  }
}

function isPoisonedContentType(contentType: string, isGlb: boolean): boolean {
  if (!contentType) return false;
  const ct = contentType.toLowerCase();
  if (
    ct.includes('text/html') ||
    ct.includes('application/xhtml') ||
    ct.includes('text/xml') ||
    ct.includes('application/xml') ||
    ct.includes('application/json') ||
    ct.includes('text/javascript') ||
    ct.includes('application/javascript') ||
    ct.includes('text/css') ||
    ct.includes('text/plain')
  ) {
    return true;
  }
  if (isGlb) {
    if (ct.startsWith('image/') || ct.startsWith('text/')) return true;
  } else {
    if (ct.startsWith('text/') || ct.startsWith('model/')) return true;
  }
  return false;
}

function hasValidMagicHeader(bytes: Uint8Array, isGlb: boolean): boolean {
  if (!bytes || bytes.length < 4) return false;

  // Descartar de inmediato HTML, XML, JSON o scripts disfrazados con 200 OK (portales cautivos / fallbacks SPA)
  let firstNonWs = 0;
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    firstNonWs = 3;
  }
  while (
    firstNonWs < bytes.length &&
    (bytes[firstNonWs] === 0x20 ||
      bytes[firstNonWs] === 0x09 ||
      bytes[firstNonWs] === 0x0a ||
      bytes[firstNonWs] === 0x0d)
  ) {
    firstNonWs++;
  }
  if (firstNonWs < bytes.length) {
    const ch = bytes[firstNonWs];
    if (ch === 0x3c || ch === 0x7b || ch === 0x5b) {
      return false;
    }
  }

  if (isGlb) {
    // Cabecera binaria glTF v2: "glTF" (0x67 0x6C 0x54 0x46) + versión uint32 LE = 2
    return (
      bytes.length >= 12 &&
      bytes[0] === 0x67 &&
      bytes[1] === 0x6c &&
      bytes[2] === 0x54 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x02 &&
      bytes[5] === 0x00 &&
      bytes[6] === 0x00 &&
      bytes[7] === 0x00
    );
  }

  // WebP: "RIFF" .... "WEBP"
  const isWebp =
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  if (isWebp) return true;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  if (isPng) return true;

  // JPEG: FF D8 FF
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (isJpeg) return true;

  // GIF: "GIF8"
  const isGif =
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38;
  if (isGif) return true;

  // AVIF / HEIF: "....ftyp"
  const isIsoBmff =
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70;
  if (isIsoBmff) return true;

  return false;
}

async function validateCachedResponse(res: Response, isGlb: boolean): Promise<boolean> {
  if (!res || !res.ok || res.status === 206) return false;
  const ct = res.headers.get('content-type') || '';
  if (isPoisonedContentType(ct, isGlb)) {
    try {
      await res.body?.cancel();
    } catch (_) {}
    return false;
  }

  if (res.body && typeof res.body.getReader === 'function') {
    const reader = res.body.getReader();
    try {
      const headerBuf = new Uint8Array(16);
      let collected = 0;
      while (collected < 12) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        const take = Math.min(value.byteLength, 16 - collected);
        headerBuf.set(value.subarray(0, take), collected);
        collected += take;
      }
      return hasValidMagicHeader(headerBuf.subarray(0, collected), isGlb);
    } finally {
      try {
        await reader.cancel();
      } catch (_) {}
    }
  }

  try {
    const buf = await res.arrayBuffer();
    return hasValidMagicHeader(new Uint8Array(buf, 0, Math.min(16, buf.byteLength)), isGlb);
  } catch {
    return false;
  }
}

async function buildValidatedCacheResponse(res: Response, isGlb: boolean): Promise<Response | null> {
  if (!res || !res.ok || res.status === 206) {
    try {
      await res?.body?.cancel();
    } catch (_) {}
    return null;
  }

  const contentType = res.headers.get('content-type') || '';
  if (isPoisonedContentType(contentType, isGlb)) {
    try {
      await res.body?.cancel();
    } catch (_) {}
    return null;
  }

  if (!res.body || typeof res.body.getReader !== 'function' || typeof ReadableStream === 'undefined') {
    const buf = await res.arrayBuffer();
    const head = new Uint8Array(buf, 0, Math.min(16, buf.byteLength));
    if (!hasValidMagicHeader(head, isGlb)) {
      return null;
    }
    return new Response(buf, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  }

  const reader = res.body.getReader();
  const initialChunks: Uint8Array[] = [];
  let collected = 0;

  while (collected < 12) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value && value.byteLength > 0) {
      initialChunks.push(value);
      collected += value.byteLength;
    }
  }

  const headerBytes = new Uint8Array(Math.min(16, collected));
  let offset = 0;
  for (const chunk of initialChunks) {
    if (offset >= headerBytes.length) break;
    const take = Math.min(chunk.byteLength, headerBytes.length - offset);
    headerBytes.set(chunk.subarray(0, take), offset);
    offset += take;
  }

  if (!hasValidMagicHeader(headerBytes, isGlb)) {
    try {
      await reader.cancel();
    } catch (_) {}
    return null;
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of initialChunks) {
        controller.enqueue(chunk);
      }
    },
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        if (value) {
          controller.enqueue(value);
        }
      } catch (err) {
        controller.error(err);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });

  return new Response(stream, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

/**
 * Descarga y transmite un asset directamente a Cache Storage (Disco) sin usar res.clone()
 * para evitar duplicar buffers en RAM, validando Content-Type y cabecera mágica antes de guardar.
 */
async function cacheAssetToDisk(
  item: AssetDownloadItem,
  cache: Cache,
  cachedUrlSet: Set<string>,
  abortSignal?: AbortSignal
): Promise<boolean> {
  const timeoutMs = item.type === 'Modelo 3D' ? 25000 : 7000;

  for (const url of item.urls) {
    if (abortSignal?.aborted) return false;
    const isGlb = item.type === 'Modelo 3D' || /\.glb(?:[?#]|$)/i.test(url);

    if (cachedUrlSet.has(url)) {
      try {
        const existing = await cache.match(url);
        if (existing && (await validateCachedResponse(existing, isGlb))) {
          registerVerifiedItemUrl(item, url);
          return true;
        }
      } catch (_) {}
      // Purgar entrada corrupta o envenenada previa para volver a descargarla limpiamente
      cachedUrlSet.delete(url);
      try {
        await cache.delete(url);
      } catch (_) {}
    }

    try {
      const res = await fetchWithTimeout(url, timeoutMs, abortSignal);
      if (!res) continue;

      const validatedRes = await buildValidatedCacheResponse(res, isGlb);
      if (validatedRes) {
        await cache.put(url, validatedRes);
        cachedUrlSet.add(url);
        registerVerifiedItemUrl(item, url);
        return true;
      }
    } catch (_) {
      // Intentar con la siguiente URL candidata
    }
  }

  return false;
}

export function DiskCacheModal({ onClose, isOpen = true }: { onClose: () => void; isOpen?: boolean }) {
  const [downloading, setDownloading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [successCount, setSuccessCount] = useState(0);
  const [alreadyCachedCount, setAlreadyCachedCount] = useState<number | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const downloadAbortRef = useRef<AbortController | null>(null);
  const activeDownloadIdRef = useRef<number>(0);
  const isAndroid = isAndroidDevice();

  const categorySummary = useMemo(() => {
    let bgAndLogo = 0;
    let glbModels = 0;
    let dice = 0;
    let portraitsAndUnits = 0;
    let orbs = 0;
    let extras = 0;

    for (const item of CRITICAL_ASSET_MANIFEST) {
      if (item.type === 'Fondo' || item.type === 'Logo') bgAndLogo++;
      else if (item.type === 'Modelo 3D') glbModels++;
      else if (item.type === 'Dado') dice++;
      else if (item.type === 'Retrato' || item.type === 'Criatura' || item.type === 'Titán') portraitsAndUnits++;
      else if (item.type === 'Orbe') orbs++;
      else extras++;
    }

    return { bgAndLogo, glbModels, dice, portraitsAndUnits, orbs, extras };
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      activeDownloadIdRef.current += 1;
      downloadAbortRef.current?.abort();
      downloadAbortRef.current = null;
    };
  }, []);

  // Si se cierra o reabre el modal, abortar descargas pendientes y limpiar el estado de descarga bloqueado
  useEffect(() => {
    if (!isOpen) {
      activeDownloadIdRef.current += 1;
      if (downloadAbortRef.current) {
        downloadAbortRef.current.abort();
        downloadAbortRef.current = null;
      }
      setDownloading(false);
      setCurrentFile('');
    } else if (!downloadAbortRef.current) {
      setDownloading(false);
    }
  }, [isOpen]);

  // Comprobación O(1) en memoria usando una única llamada cache.keys() en lugar de cientos de cache.match()
  useEffect(() => {
    if (!isOpen || !hasCacheStorageSupport()) {
      setAlreadyCachedCount(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const cache = await window.caches.open(CACHE_NAME);
        const requests = await cache.keys();
        if (cancelled || !isMountedRef.current) return;

        const cachedUrlSet = new Set<string>();
        for (const req of requests) {
          cachedUrlSet.add(req.url);
        }

        let found = 0;
        for (const item of CRITICAL_ASSET_MANIFEST) {
          if (item.urls.some((u) => cachedUrlSet.has(u))) {
            found++;
          }
        }
        setAlreadyCachedCount(found);
      } catch (_) {}
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isCacheSupported = hasCacheStorageSupport();
  const totalAssets = CRITICAL_ASSET_MANIFEST.length;

  const startDiskCache = async () => {
    if (downloading || downloadAbortRef.current) return;

    if (!isCacheSupported) {
      setStorageError(
        'Cache Storage API no está disponible en este navegador o contexto actual (requiere HTTPS o entorno compatible). No se almacenaron archivos en disco.'
      );
      setCompleted(false);
      setProgress(0);
      setSuccessCount(0);
      gameAudio.playErrorBuzz();
      return;
    }

    const runId = ++activeDownloadIdRef.current;
    const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
    downloadAbortRef.current = abortController;

    setStorageError(null);
    setDownloading(true);
    setCompleted(false);
    setProgress(0);
    setSuccessCount(0);
    gameAudio.playPowerupChime();

    try {
      let cache: Cache;
      let cachedUrlSet = new Set<string>();
      try {
        cache = await window.caches.open(CACHE_NAME);
        const existingReqs = await cache.keys();
        cachedUrlSet = new Set(existingReqs.map((req) => req.url));
      } catch (_) {
        if (!isMountedRef.current || activeDownloadIdRef.current !== runId) return;
        setStorageError(
          'No se pudo abrir el almacenamiento local en disco (Cache Storage bloqueado o sin cuota disponible).'
        );
        setCompleted(false);
        setProgress(0);
        setSuccessCount(0);
        gameAudio.playErrorBuzz();
        return;
      }

      if (!isMountedRef.current || !isOpenRef.current || abortController?.signal.aborted || activeDownloadIdRef.current !== runId) {
        return;
      }

      const total = CRITICAL_ASSET_MANIFEST.length;
      let loaded = 0;
      let successes = 0;

      // Separar archivos ligeros (lotes pequeños de 2 en Android / 4 en PC) de los modelos 3D GLB pesados (estrictamente secuencial 1 a 1)
      const lightItems = CRITICAL_ASSET_MANIFEST.filter((item) => item.type !== 'Modelo 3D');
      const heavyGlbItems = CRITICAL_ASSET_MANIFEST.filter((item) => item.type === 'Modelo 3D');

      const lightBatchSize = isAndroid ? 2 : 4;
      for (let i = 0; i < lightItems.length; i += lightBatchSize) {
        if (!isMountedRef.current || !isOpenRef.current || abortController?.signal.aborted || activeDownloadIdRef.current !== runId) return;

        const batch = lightItems.slice(i, i + lightBatchSize);
        const activeLabels = new Set(batch.map((item) => `[${item.type}] ${item.name}`));
        setCurrentFile(`Guardando (${loaded + 1}/${total}): ${batch[0]?.name || ''}`);

        await Promise.all(
          batch.map(async (item) => {
            const itemLabel = `[${item.type}] ${item.name}`;
            const ok = await cacheAssetToDisk(item, cache, cachedUrlSet, abortController?.signal);
            if (!isMountedRef.current || !isOpenRef.current || abortController?.signal.aborted || activeDownloadIdRef.current !== runId) return;

            activeLabels.delete(itemLabel);
            if (ok) {
              successes++;
              setSuccessCount(successes);
            }
            loaded++;
            setProgress(Math.min(100, Math.round((loaded / total) * 100)));

            if (activeLabels.size > 0) {
              setCurrentFile(`Descargando (${loaded}/${total}): ${Array.from(activeLabels)[0]}`);
            } else {
              setCurrentFile(`Guardado (${loaded}/${total}): ${itemLabel}`);
            }
          })
        );

        if (!isMountedRef.current || !isOpenRef.current || abortController?.signal.aborted || activeDownloadIdRef.current !== runId) return;
        await new Promise((r) => setTimeout(r, isAndroid ? 16 : 8));
      }

      // Modelos 3D (.glb) pesados: estrictamente secuenciales (1 a la vez) para evitar picos de RAM/OOM en Android
      for (const item of heavyGlbItems) {
        if (!isMountedRef.current || !isOpenRef.current || abortController?.signal.aborted || activeDownloadIdRef.current !== runId) return;

        const itemLabel = `[${item.type}] ${item.name}`;
        setCurrentFile(`Descargando (${loaded + 1}/${total}): ${itemLabel}`);

        const ok = await cacheAssetToDisk(item, cache, cachedUrlSet, abortController?.signal);
        if (!isMountedRef.current || !isOpenRef.current || abortController?.signal.aborted || activeDownloadIdRef.current !== runId) return;

        if (ok) {
          successes++;
          setSuccessCount(successes);
        }
        loaded++;
        setProgress(Math.min(100, Math.round((loaded / total) * 100)));
        setCurrentFile(`Guardado (${loaded}/${total}): ${itemLabel}`);

        // Pausa breve entre GLBs grandes para permitir que el navegador libere el buffer nativo
        await new Promise((r) => setTimeout(r, isAndroid ? 48 : 16));
      }

      if (!isMountedRef.current || !isOpenRef.current || abortController?.signal.aborted || activeDownloadIdRef.current !== runId) return;

      setProgress(100);
      setCompleted(true);
      setAlreadyCachedCount(successes);
      if (successes === 0) {
        setStorageError('No se pudo descargar ningún archivo al almacenamiento en disco. Verifica tu conexión.');
        gameAudio.playErrorBuzz();
      } else {
        gameAudio.playVictoryFanfare();
      }
    } finally {
      if (activeDownloadIdRef.current === runId) {
        downloadAbortRef.current = null;
        if (isMountedRef.current) {
          setDownloading(false);
        }
      }
    }
  };

  const allSucceeded = completed && successCount === totalAssets;
  const partialSuccess = completed && successCount > 0 && successCount < totalAssets;
  const noneSucceeded = completed && successCount === 0;

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto touch-auto animate-fadeIn p-2 sm:p-4 md:p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex items-center justify-center ${
        isAndroid ? 'bg-black/90' : 'bg-black/85 backdrop-blur-md'
      }`}
    >
      <div className="relative w-full max-w-lg bg-slate-950/95 border-2 border-cyan-500/80 rounded-2xl sm:rounded-3xl p-3 sm:p-5 md:p-6 shadow-[0_0_60px_rgba(6,182,212,0.4)] flex flex-col text-slate-100 max-h-[92dvh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden my-auto">
        <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2 mb-2 sm:mb-3 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-cyan-500/20 border border-cyan-500/60 flex items-center justify-center text-base sm:text-xl shadow-lg shrink-0">
              💾
            </div>
            <div>
              <h2 className="text-[11px] sm:text-sm md:text-base font-serif font-black tracking-wide text-cyan-300 leading-tight">
                GUARDAR ASSETS EN DISCO LOCAL (SIN USAR RAM)
              </h2>
              <p className="text-[9.5px] sm:text-[11px] text-slate-400 leading-tight">
                Guarda los {totalAssets} archivos del juego en el disco de tu dispositivo (Cache Storage)
                {alreadyCachedCount !== null && alreadyCachedCount > 0 && !downloading && !completed
                  ? ` • Ya en disco: ${alreadyCachedCount}/${totalAssets}`
                  : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              downloadAbortRef.current?.abort();
              gameAudio.playCrispClick();
              onClose();
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 hover:bg-rose-950 text-rose-300 border border-rose-500/60 flex items-center justify-center text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer shrink-0 ml-2"
          >
            ✕
          </button>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl sm:rounded-2xl p-2 sm:p-3.5 mb-2.5 text-xs space-y-1 sm:space-y-1.5 shrink-0">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-[10.5px] sm:text-xs">Almacenamiento permanente seguro:</span>
            <strong className="text-cyan-400 font-mono font-bold text-xs sm:text-sm">
              {isCacheSupported ? 'Cache Storage API (Disco)' : 'No disponible en este contexto'}
            </strong>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9.5px] sm:text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 leading-tight">
            <span>• {categorySummary.bgAndLogo} Fondos, Campañas y Logo</span>
            <span>• {categorySummary.glbModels} Modelos 3D GLB oficiales</span>
            <span>• {categorySummary.dice} Dados Reales de Combate</span>
            <span>• {categorySummary.portraitsAndUnits} Retratos, Criaturas y Titanes</span>
            <span>• {categorySummary.orbs} Orbes Elementales</span>
            <span>• {categorySummary.extras} Insignias, Hechizos, Forja e Iconos</span>
          </div>
          <div className="text-[9px] sm:text-[10.5px] text-emerald-400/90 pt-1 border-t border-slate-800/80 leading-tight flex items-center gap-1">
            <span>🛡️</span>
            <span>
              <strong>Cero impacto en RAM:</strong> Los archivos se transmiten al disco interno de uno en uno para modelos 3D sin acumular buffers en memoria.
            </span>
          </div>
        </div>

        {(!isCacheSupported || storageError) && (
          <div className="bg-rose-950/60 border border-rose-500/60 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 mb-2.5 text-rose-200 text-[10px] sm:text-xs font-sans flex items-start gap-2 shrink-0 leading-snug">
            <span className="shrink-0">⚠️</span>
            <span>
              {storageError ||
                'Tu navegador o contexto actual no permite usar Cache Storage API (requiere conexión segura HTTPS o contexto compatible). La descarga offline en disco no está disponible aquí.'}
            </span>
          </div>
        )}

        {(downloading || completed) && (
          <div className="bg-black/60 border border-slate-800 rounded-xl sm:rounded-2xl p-2 sm:p-3 mb-2.5 flex flex-col gap-1 sm:gap-1.5 shrink-0">
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-slate-300 font-serif font-bold text-[10px] sm:text-xs truncate flex-1 min-w-0">
                {allSucceeded
                  ? '¡Todos los assets guardados en Disco Local!'
                  : partialSuccess
                  ? `Almacenados en Disco: ${successCount}/${totalAssets} archivos disponibles`
                  : noneSucceeded
                  ? 'No se pudieron guardar los archivos en Disco'
                  : currentFile}
              </span>
              <span className="text-cyan-400 font-mono font-bold text-xs shrink-0">{progress}%</span>
            </div>

            <div className="w-full h-2 sm:h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700/80 p-0.5 relative shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  allSucceeded
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]'
                    : partialSuccess
                    ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.7)]'
                    : noneSucceeded
                    ? 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.7)]'
                    : 'bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {completed && allSucceeded && (
              <div className="flex items-center gap-1.5 mt-0.5 text-emerald-400 text-[10px] sm:text-xs font-serif font-bold animate-fadeIn leading-tight">
                <span>✅</span>
                <span>
                  ¡Completado! {successCount}/{totalAssets} archivos almacenados en disco listos para juego offline y carga en 0 ms.
                </span>
              </div>
            )}

            {completed && partialSuccess && (
              <div className="flex items-center gap-1.5 mt-0.5 text-amber-300 text-[10px] sm:text-xs font-serif font-bold animate-fadeIn leading-tight">
                <span>⚠️</span>
                <span>
                  Descarga finalizada: {successCount}/{totalAssets} archivos almacenados en disco ({totalAssets - successCount} opcionales no publicados en origen).
                </span>
              </div>
            )}

            {completed && noneSucceeded && (
              <div className="flex items-center gap-1.5 mt-0.5 text-rose-300 text-[10px] sm:text-xs font-serif font-bold animate-fadeIn leading-tight">
                <span>❌</span>
                <span>0/{totalAssets} archivos guardados en disco. Revisa tu conexión o permisos de almacenamiento.</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 sm:gap-3 pt-1 mt-auto shrink-0 pb-1">
          {!completed && (
            <button
              disabled={downloading || !isCacheSupported}
              onClick={startDiskCache}
              className={`w-full sm:w-auto py-2 px-4 sm:px-6 rounded-full font-serif font-black text-xs tracking-wider border transition transform active:scale-95 flex items-center justify-center gap-2 ${
                downloading || !isCacheSupported
                  ? 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-500 text-black border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:brightness-110 cursor-pointer'
              }`}
            >
              <span>
                {!isCacheSupported
                  ? '⚠️ CACHE STORAGE NO DISPONIBLE'
                  : downloading
                  ? '⏳ GUARDANDO EN DISCO LOCAL...'
                  : `💾 DESCARGAR ASSETS A DISCO (${totalAssets} ARCHIVOS)`}
              </span>
            </button>
          )}

          {completed && (
            <button
              onClick={() => {
                gameAudio.playConfirmSelect();
                onClose();
              }}
              className="w-full sm:w-auto py-2 px-4 sm:px-6 rounded-full font-serif font-black text-xs tracking-wider bg-gradient-to-r from-emerald-500 to-teal-500 text-black border border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.7)] transition transform active:scale-95 cursor-pointer text-center"
            >
              CERRAR Y JUGAR
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
