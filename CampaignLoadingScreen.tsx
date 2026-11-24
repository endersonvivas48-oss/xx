import React, { useState, useEffect, useRef } from 'react';
import { loadingManagerBridge } from './loadingManagerBridge';
import {
  preloadCityEnvironmentModels,
  isCityEnvironmentLoadSettled,
  getCityPreloadProgress,
} from './cityEnvironmentPreloader';
import { getCampaignImageCandidateUrls } from './campaignImageMap';
import { CachedImage } from './CachedImage';

const MAIN_RAW_BASE = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';
const MAIN_CDN_BASE = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';

export interface CampaignLoadingScreenProps {
  isOpen: boolean;
  campaignTitle: string;
  campaignNumber: number;
  accentColor: string;
  bgUrl?: string;
  isSceneReady?: boolean;
  onModelsReady?: () => void;
  onCancel?: () => void;
  onLoaded: () => void;
}

export const CampaignLoadingScreen: React.FC<CampaignLoadingScreenProps> = ({
  isOpen,
  campaignTitle,
  campaignNumber,
  accentColor,
  bgUrl,
  isSceneReady = true,
  onModelsReady,
  onCancel,
  onLoaded,
}) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Iniciando reino...');
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;
  const onModelsReadyRef = useRef(onModelsReady);
  onModelsReadyRef.current = onModelsReady;
  const isSceneReadyRef = useRef(isSceneReady);
  isSceneReadyRef.current = isSceneReady;
  const isLoadedDispatchedRef = useRef(false);
  const isModelsReadyDispatchedRef = useRef(false);
  const triggerDispatchCheckRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setStatusText('Iniciando reino...');
      setLoadFailed(false);
      isLoadedDispatchedRef.current = false;
      isModelsReadyDispatchedRef.current = false;
      triggerDispatchCheckRef.current = null;
      return;
    }

    isLoadedDispatchedRef.current = false;
    isModelsReadyDispatchedRef.current = false;
    setLoadFailed(false);
    let cancelled = false;
    let completed = false;
    let dispatchTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const notifyModelsReady = () => {
      if (!isModelsReadyDispatchedRef.current) {
        isModelsReadyDispatchedRef.current = true;
        onModelsReadyRef.current?.();
      }
    };

    const tryDispatchLoaded = () => {
      if (cancelled || completed || isLoadedDispatchedRef.current) return;
      const settled = isCityEnvironmentLoadSettled();
      if (!settled) return;

      notifyModelsReady();
      const sceneMounted = isSceneReadyRef.current;

      if (!sceneMounted) {
        setProgress((prev) => Math.max(prev, 94));
        setStatusText('Montando modelos 3D en la Ciudadela...');
        return;
      }

      completed = true;
      isLoadedDispatchedRef.current = true;
      setProgress(100);
      setStatusText('¡Ciudadela 3D lista para explorar!');
      if (dispatchTimeoutId) clearTimeout(dispatchTimeoutId);
      dispatchTimeoutId = setTimeout(() => {
        onLoadedRef.current();
      }, 160);
    };

    triggerDispatchCheckRef.current = tryDispatchLoaded;

    const runPreloadStrictly = async () => {
      await preloadCityEnvironmentModels((loaded, total, currentLabel) => {
        if (cancelled || completed) return;
        const pct = Math.min(90, Math.round((loaded / Math.max(1, total)) * 90));
        setProgress((prev) => Math.max(prev, pct));
        if (loaded < total) {
          setStatusText(`${currentLabel} (${loaded}/${total})`);
        } else {
          setStatusText('Verificando modelos 3D...');
        }
      }).catch(() => null);

      if (cancelled || completed) return;

      if (!isCityEnvironmentLoadSettled()) {
        const snapshot = getCityPreloadProgress();
        setLoadFailed(true);
        setStatusText(
          typeof navigator !== 'undefined' && navigator.onLine === false
            ? `Sin conexión WiFi/red (${snapshot.loaded}/${snapshot.total} modelos cargados).`
            : `No se completaron todos los modelos (${snapshot.loaded}/${snapshot.total}). Revisa tu conexión.`
        );
        return;
      }

      setLoadFailed(false);
      notifyModelsReady();
      setProgress((prev) => Math.max(prev, 94));
      setStatusText('Montando modelos 3D en la Ciudadela...');
      tryDispatchLoaded();
    };

    if (!isCityEnvironmentLoadSettled()) {
      setStatusText('Descargando modelos 3D optimizados de la Ciudad...');
      runPreloadStrictly();
    } else {
      notifyModelsReady();
      setProgress(94);
      setStatusText('Montando modelos 3D en la Ciudadela...');
      tryDispatchLoaded();
    }

    const handleOnline = () => {
      if (!cancelled && !completed && !isCityEnvironmentLoadSettled()) {
        setRetryTrigger((n) => n + 1);
      }
    };
    window.addEventListener('online', handleOnline);

    const unsubscribe = loadingManagerBridge.subscribe({
      onProgress: (_url, itemsLoaded, itemsTotal) => {
        if (completed) return;
        const currentPreload = getCityPreloadProgress();
        if (currentPreload.loaded > 0 && currentPreload.total > 0) {
          const assetPct = Math.round((currentPreload.loaded / currentPreload.total) * 90);
          setProgress((prev) => Math.max(prev, Math.min(90, assetPct)));
        } else if (itemsTotal > 0) {
          const fallbackPct = Math.round((itemsLoaded / itemsTotal) * 45);
          setProgress((prev) => Math.max(prev, Math.min(45, fallbackPct)));
        }
      },
      onLoad: () => {
        tryDispatchLoaded();
      },
    });

    const checkInterval = setInterval(() => {
      if (completed) {
        clearInterval(checkInterval);
        return;
      }
      tryDispatchLoaded();
    }, 150);

    return () => {
      cancelled = true;
      triggerDispatchCheckRef.current = null;
      window.removeEventListener('online', handleOnline);
      clearInterval(checkInterval);
      if (dispatchTimeoutId) clearTimeout(dispatchTimeoutId);
      unsubscribe();
    };
  }, [isOpen, retryTrigger]);

  useEffect(() => {
    if (!isOpen || !isSceneReady || isLoadedDispatchedRef.current) return;
    triggerDispatchCheckRef.current?.();
  }, [isOpen, isSceneReady]);

  if (!isOpen) return null;

  const campaignIdx = Math.max(0, campaignNumber - 1);
  const campaignBgCandidates = getCampaignImageCandidateUrls(campaignIdx);
  const resolvedBgCandidates = (
    bgUrl
      ? [bgUrl, ...campaignBgCandidates.filter((u) => u !== bgUrl)]
      : campaignBgCandidates
  ).filter(Boolean);

  const cityIconCandidates = [
    `${MAIN_CDN_BASE}/iconos/icono_reanudar.webp`,
    `${MAIN_RAW_BASE}/iconos/icono_reanudar.webp`,
    `${MAIN_CDN_BASE}/iconos/icono_campana.webp`,
    `${MAIN_RAW_BASE}/iconos/icono_campana.webp`,
    `${MAIN_CDN_BASE}/icono_campana.webp`,
    `${MAIN_RAW_BASE}/icono_campana.webp`,
  ];

  return (
    <div className="fixed inset-0 z-[250] overflow-hidden touch-none select-none bg-black flex flex-col items-center justify-between p-3 sm:p-6">
      {/* Fondo panorámico completo sin blur sobre WebGL */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
        <CachedImage
          key={`camp_loading_bg_${campaignIdx}_${bgUrl || ''}`}
          cacheKey={`camp_bg_${campaignIdx}`}
          candidateUrls={resolvedBgCandidates}
          alt={`Cargando Campaña ${campaignNumber}`}
          loading="eager"
          className="w-full h-full object-cover object-center filter brightness-75 contrast-115 scale-100 pointer-events-none select-none"
          fallbackPlaceholder={
            <div
              className="w-full h-full"
              style={{
                background: `radial-gradient(circle at 50% 35%, ${accentColor}35 0%, #090d16 65%, #000000 100%)`,
              }}
            />
          }
        />
        <div className="absolute inset-0 bg-radial-vignette from-transparent via-black/30 to-black/80 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/45 pointer-events-none" />
      </div>

      {/* BARRA SUPERIOR ELEGANTE ALINEADA CON LAS OTRAS PANTALLAS */}
      <div className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 gap-2">
        <div
          className="flex flex-col text-left px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl bg-black/85 border shadow-lg"
          style={{
            borderColor: `${accentColor}75`,
            boxShadow: `0 0 25px ${accentColor}25`,
          }}
        >
          <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase drop-shadow">
            CAMPAÑA {campaignNumber} • EXPLORACIÓN 3D
          </span>
          <h2
            className="text-lg sm:text-2xl font-black font-serif tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,1)] uppercase"
            style={{ color: accentColor }}
          >
            {campaignTitle}
          </h2>
        </div>

        {/* Medallón luminoso superior derecho con porcentaje */}
        <div
          className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-2xl border-0 shrink-0"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            boxShadow: `0 0 30px ${accentColor}50, inset 0 0 16px ${accentColor}30`,
          }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: accentColor,
              boxShadow: `0 0 10px ${accentColor}`,
            }}
          />
          <span
            className="font-mono font-black text-xs sm:text-sm tracking-wider"
            style={{ color: accentColor }}
          >
            {progress}%
          </span>
        </div>
      </div>

      {/* CENTRO DESPEJADO PARA LUCIR LA ILUSTRACIÓN PANORÁMICA */}
      <div className="flex-1 pointer-events-none" />

      {/* PIE DE PANTALLA: PANEL INFORMATIVO CON ICONO LUMINOSO Y BARRA DE PROGRESO */}
      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center pb-2 sm:pb-4">
        <div
          className="w-full px-4 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-black/90 border shadow-2xl flex items-center gap-3.5 sm:gap-4"
          style={{
            borderColor: `${accentColor}70`,
            boxShadow: `0 0 35px rgba(0,0,0,0.9), 0 0 25px ${accentColor}25`,
          }}
        >
          {/* Icono oficial con halo radial estilo Campamento */}
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center p-1.5 relative overflow-hidden shrink-0"
            style={{
              backgroundColor: `${accentColor}25`,
              boxShadow: `0 0 28px ${accentColor}65, inset 0 0 14px ${accentColor}45`,
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at center, ${accentColor}60 0%, transparent 80%)`,
              }}
            />
            <CachedImage
              cacheKey="camp_loading_icon_city"
              candidateUrls={cityIconCandidates}
              alt="Ciudadela"
              loading="eager"
              className="w-full h-full object-contain filter brightness-115 contrast-110 relative z-10"
              style={{ mixBlendMode: 'screen' }}
              fallbackPlaceholder={
                <span className="text-xl relative z-10" style={{ color: accentColor }}>
                  🎲
                </span>
              }
            />
          </div>

          {/* Barra de progreso y descripción de carga */}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-serif font-bold text-slate-100 truncate drop-shadow">
                {statusText}
              </span>
              <span
                className="text-xs font-mono font-black shrink-0"
                style={{ color: accentColor }}
              >
                {progress}%
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-slate-950/90 border border-slate-700/80 overflow-hidden p-0.5 relative">
              <div
                className="h-full rounded-full transition-all duration-150 ease-out"
                style={{
                  width: `${progress}%`,
                  backgroundColor: accentColor,
                  boxShadow: `0 0 14px ${accentColor}`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-0.5">
              <span>Carga de reino optimizada</span>
              <span className="text-amber-300/90 uppercase tracking-wider">Ciudadela 3D</span>
            </div>

            {loadFailed && (
              <div className="flex items-center justify-end gap-2 pt-1.5">
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-serif font-bold transition active:scale-95 cursor-pointer"
                  >
                    VOLVER
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setLoadFailed(false);
                    setStatusText('Reintentando modelos pendientes...');
                    setRetryTrigger((n) => n + 1);
                  }}
                  className="px-4 py-1.5 rounded-xl text-black text-xs font-serif font-black tracking-wider transition active:scale-95 cursor-pointer shadow-lg"
                  style={{ backgroundColor: accentColor }}
                >
                  REINTENTAR CARGA
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignLoadingScreen;
