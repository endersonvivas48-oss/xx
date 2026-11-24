import React, { useState, useEffect, useRef } from 'react';
import { getCachedVerifiedUrl, saveVerifiedUrl, invalidateVerifiedUrl } from './imageOptimizer';

export interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  cacheKey: string;
  candidateUrls: string[];
  fallbackPlaceholder?: React.ReactNode;
}

function buildOrderedUrls(cacheKey: string, candidateUrls: string[]): string[] {
  const cached = getCachedVerifiedUrl(cacheKey);
  const seen = new Set<string>();
  const ordered: string[] = [];

  const pushUnique = (url?: string | null) => {
    if (url && !seen.has(url)) {
      seen.add(url);
      ordered.push(url);
    }
  };

  // Nunca priorizar blob: temporales que pudieron quedar de sesiones previas
  if (cached && !cached.startsWith('blob:')) {
    pushUnique(cached);
  }
  candidateUrls.forEach((url) => pushUnique(url));
  return ordered;
}

/**
 * Componente unificado para renderizar imágenes remotas con caché verificada
 * y soporte determinista de cascada de fallback sin peticiones 404 repetidas.
 */
export const CachedImage: React.FC<CachedImageProps> = ({
  cacheKey,
  candidateUrls,
  fallbackPlaceholder,
  alt = '',
  className = '',
  style,
  onError: userOnError,
  onLoad: userOnLoad,
  src: _ignoredSrc,
  loading = 'lazy',
  decoding = 'async',
  ...restProps
}) => {
  const [urlsToTry, setUrlsToTry] = useState<string[]>(() =>
    buildOrderedUrls(cacheKey, candidateUrls)
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const prevCacheKeyRef = useRef(cacheKey);
  const loadedSrcRef = useRef<string>('');
  const currentSrcRef = useRef<string>('');

  const urlsKey = candidateUrls.filter(Boolean).join('|');

  useEffect(() => {
    const nextUrls = buildOrderedUrls(cacheKey, candidateUrls);
    const cacheKeyChanged = prevCacheKeyRef.current !== cacheKey;
    prevCacheKeyRef.current = cacheKey;

    if (cacheKeyChanged) {
      loadedSrcRef.current = '';
      setUrlsToTry(nextUrls);
      setCurrentIdx(0);
      setFailed(nextUrls.length === 0);
      return;
    }

    // Si el padre reconstruyó el array con otro orden pero la URL ya cargada o en curso
    // sigue estando disponible, mantener su índice para no reiniciar la descarga/render.
    const activeSrc = loadedSrcRef.current || currentSrcRef.current;
    const preservedIdx = activeSrc ? nextUrls.indexOf(activeSrc) : -1;

    setUrlsToTry(nextUrls);
    if (preservedIdx !== -1) {
      setCurrentIdx(preservedIdx);
      setFailed(false);
    } else {
      loadedSrcRef.current = '';
      setCurrentIdx(0);
      setFailed(nextUrls.length === 0);
    }
  }, [cacheKey, urlsKey]);

  const currentSrc = urlsToTry[currentIdx] || '';
  currentSrcRef.current = currentSrc;

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (loadedSrcRef.current === currentSrc) {
      loadedSrcRef.current = '';
    }
    if (currentSrc) {
      invalidateVerifiedUrl(cacheKey, currentSrc);
    }

    if (currentIdx < urlsToTry.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      return;
    }

    setFailed(true);
    userOnError?.(e);
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (currentSrc) {
      loadedSrcRef.current = currentSrc;
      if (!currentSrc.startsWith('blob:') && !currentSrc.startsWith('data:')) {
        saveVerifiedUrl(cacheKey, currentSrc);
      }
    }
    userOnLoad?.(e);
  };

  if (failed || !currentSrc) {
    if (fallbackPlaceholder) {
      return <>{fallbackPlaceholder}</>;
    }
    return (
      <div className={`flex items-center justify-center bg-slate-900 text-slate-500 text-xs font-serif ${className}`}>
        <span>{alt || 'Sin imagen'}</span>
      </div>
    );
  }

  return (
    <img
      {...restProps}
      src={currentSrc}
      alt={alt}
      loading={loading}
      decoding={decoding}
      className={className}
      style={style}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
};

export default CachedImage;
