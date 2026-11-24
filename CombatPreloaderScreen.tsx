import React, { useState, useEffect, useRef } from 'react';
import { loadingManagerBridge } from './loadingManagerBridge';
import { CachedImage } from './CachedImage';
import { isAndroidDevice } from './utils';
import {
  preloadCombatEnvironmentModel,
  isCombatEnvironmentLoadSettled,
} from './Game';

const MAIN_RAW_BASE = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';
const MAIN_CDN_BASE = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';

export interface CombatPreloaderScreenProps {
  isOpen: boolean;
  encounterTitle: string;
  encounterSubtitle?: string;
  accentColor?: string;
  bgUrl?: string;
  bgCandidates?: string[];
  onBoardReady?: () => void;
  onCancel?: () => void;
  onLoaded: () => void;
}

export const CombatPreloaderScreen: React.FC<CombatPreloaderScreenProps> = ({
  isOpen,
  encounterTitle,
  encounterSubtitle = 'Preparando el campo de batalla...',
  accentColor = '#f59e0b',
  bgUrl,
  bgCandidates,
  onBoardReady,
  onCancel,
  onLoaded,
}) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Invocando arena de combate...');
  const [isSlowNetwork, setIsSlowNetwork] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;
  const onBoardReadyRef = useRef(onBoardReady);
  onBoardReadyRef.current = onBoardReady;
  const isLoadedDispatchedRef = useRef(false);
  const isBoardReadyDispatchedRef = useRef(false);

  const fallbackCandidateUrls: string[] = [
    'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/coliseo_normal.webp',
    'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/coliseo_normal.webp',
    'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/coliseo.webp',
    'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/coliseo.webp',
  ];

  const candidateList = (
    bgCandidates && bgCandidates.length > 0
      ? [...bgCandidates, ...fallbackCandidateUrls]
      : bgUrl
      ? [
          bgUrl,
          bgUrl.replace(
            'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/',
            'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/'
          ),
          ...fallbackCandidateUrls,
        ]
      : fallbackCandidateUrls
  ).filter(Boolean);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setStatusText('Invocando arena de combate...');
      setIsSlowNetwork(false);
      isLoadedDispatchedRef.current = false;
      isBoardReadyDispatchedRef.current = false;
      return;
    }

    isLoadedDispatchedRef.current = false;
    isBoardReadyDispatchedRef.current = false;
    setIsSlowNetwork(false);
    let cancelled = false;
    let completed = false;
    let hasRealLoadingActivity = false;
    let hasManagerOnLoadFired = false;
    let isBoardSettled = isCombatEnvironmentLoadSettled();
    let lastActivityTimestamp = Date.now();
    const openTimestamp = Date.now();
    const SLOW_NETWORK_NOTICE_MS = 12000;
    let dispatchTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const notifyBoardReady = () => {
      if (cancelled) return;
      if (!isBoardReadyDispatchedRef.current) {
        isBoardReadyDispatchedRef.current = true;
        onBoardReadyRef.current?.();
      }
    };

    const dispatchLoaded = () => {
      if (cancelled || completed || isLoadedDispatchedRef.current) return;
      const boardReadyOrSettled = isBoardSettled || isCombatEnvironmentLoadSettled();

      if (!boardReadyOrSettled) {
        setStatusText('Montando geometría del campo 3D...');
        return;
      }

      notifyBoardReady();
      completed = true;
      isLoadedDispatchedRef.current = true;
      setIsSlowNetwork(false);
      setProgress(100);
      setStatusText('¡Arena lista para la batalla!');
      if (dispatchTimeoutId) clearTimeout(dispatchTimeoutId);
      dispatchTimeoutId = setTimeout(() => {
        if (!cancelled) {
          onLoadedRef.current();
        }
      }, 160);
    };

    if (isBoardSettled) {
      notifyBoardReady();
    } else {
      preloadCombatEnvironmentModel().then(() => {
        if (cancelled) return;
        isBoardSettled = true;
        notifyBoardReady();
        if (hasManagerOnLoadFired || !hasRealLoadingActivity) {
          dispatchLoaded();
        }
      });
    }

    const unsubscribe = loadingManagerBridge.subscribe({
      onProgress: (_url, itemsLoaded, itemsTotal) => {
        if (cancelled) return;
        hasRealLoadingActivity = true;
        lastActivityTimestamp = Date.now();
        if (!completed) {
          const pct = Math.min(92, Math.round((itemsLoaded / Math.max(1, itemsTotal)) * 100));
          setProgress(pct);
          if (pct < 35) {
            setStatusText('Sintonizando cuadrícula hexagonal y niebla...');
          } else if (pct < 70) {
            setStatusText('Descargando y optimizando modelo 3D del campo...');
          } else {
            setStatusText('Instanciando texturas y dados rúnicos...');
          }
        }
      },
      onLoad: () => {
        if (cancelled) return;
        hasManagerOnLoadFired = true;
        const boardReadyOrSettled = isBoardSettled || isCombatEnvironmentLoadSettled();
        if (boardReadyOrSettled) {
          dispatchLoaded();
        }
      },
    });

    const checkInterval = setInterval(() => {
      if (cancelled || completed) {
        clearInterval(checkInterval);
        return;
      }

      const elapsed = Date.now() - openTimestamp;
      const timeSinceLastActivity = Date.now() - lastActivityTimestamp;
      const boardReadyOrSettled = isBoardSettled || isCombatEnvironmentLoadSettled();

      if (!boardReadyOrSettled) {
        setProgress((prev) => Math.min(90, prev + (prev < 60 ? 8 : 2)));
        if (elapsed >= SLOW_NETWORK_NOTICE_MS) {
          setIsSlowNetwork(true);
          setStatusText('Conexión lenta: finalizando descarga del tablero 3D...');
        } else {
          setStatusText('Montando modelo 3D del campo de batalla...');
        }
        return;
      }

      if (hasManagerOnLoadFired) {
        clearInterval(checkInterval);
        dispatchLoaded();
        return;
      }

      if (hasRealLoadingActivity) {
        if (timeSinceLastActivity > 4000) {
          clearInterval(checkInterval);
          dispatchLoaded();
        }
        return;
      }

      if (elapsed > 260) {
        setProgress((prev) => {
          const next = prev + 25;
          if (next >= 100) {
            clearInterval(checkInterval);
            dispatchLoaded();
            return 100;
          }
          return next;
        });
      }
    }, 120);

    return () => {
      cancelled = true;
      clearInterval(checkInterval);
      if (dispatchTimeoutId) clearTimeout(dispatchTimeoutId);
      unsubscribe();
    };
  }, [isOpen, retryTrigger]);

  if (!isOpen) return null;

  const primaryBgKey = candidateList[0] || 'default';
  const isAndroid = isAndroidDevice();
  const panelBlur = isAndroid ? '' : 'backdrop-blur-md';
  const combatIconCandidates = [
    `${MAIN_CDN_BASE}/icono_coliseo.webp`,
    `${MAIN_RAW_BASE}/icono_coliseo.webp`,
    `${MAIN_CDN_BASE}/iconos/icono_coliseo.webp`,
    `${MAIN_RAW_BASE}/iconos/icono_coliseo.webp`,
  ];

  return (
    <div className="fixed inset-0 z-[260] overflow-hidden touch-none select-none bg-black flex flex-col items-center justify-between p-3 sm:p-6">
      {/* Fondo panorámico inmersivo temático de la arena */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
        <CachedImage
          key={`preloader_bg_${primaryBgKey}`}
          cacheKey={`combat_preloader_bg_${primaryBgKey}`}
          candidateUrls={candidateList}
          alt="Fondo Batalla"
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
          className={`flex flex-col text-left px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl bg-black/85 ${panelBlur} border shadow-lg`}
          style={{
            borderColor: `${accentColor}75`,
            boxShadow: `0 0 25px ${accentColor}25`,
          }}
        >
          <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase drop-shadow">
            ENTRANDO A COMBATE
          </span>
          <h2
            className="text-lg sm:text-2xl font-black font-serif tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,1)] uppercase"
            style={{ color: accentColor }}
          >
            {encounterTitle}
          </h2>
        </div>

        <div
          className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-2xl border-0 shrink-0 ${panelBlur}`}
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

      {/* CENTRO DESPEJADO PARA LUCIR LA ARENA */}
      <div className="flex-1 pointer-events-none" />

      {/* PIE DE PANTALLA: PANEL INFORMATIVO CON ICONO LUMINOSO Y BARRA DE PROGRESO */}
      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center pb-2 sm:pb-4">
        <div
          className={`w-full px-4 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-black/90 ${panelBlur} border shadow-2xl flex items-center gap-3.5 sm:gap-4`}
          style={{
            borderColor: `${accentColor}70`,
            boxShadow: `0 0 35px rgba(0,0,0,0.9), 0 0 25px ${accentColor}25`,
          }}
        >
          <div
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center p-1.5 relative overflow-hidden shrink-0 ${panelBlur}`}
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
              cacheKey="combat_loading_icon_coliseum"
              candidateUrls={combatIconCandidates}
              alt="Combate"
              loading="eager"
              className="w-full h-full object-contain filter brightness-115 contrast-110 relative z-10"
              style={{ mixBlendMode: 'screen' }}
              fallbackPlaceholder={
                <span className="text-xl relative z-10" style={{ color: accentColor }}>
                  ⚔️
                </span>
              }
            />
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-serif font-bold text-slate-100 truncate drop-shadow">
                {encounterSubtitle || statusText}
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
              <span className="truncate">{statusText}</span>
              <span className="text-amber-300/90 uppercase tracking-wider shrink-0">Arena 3D</span>
            </div>

            {isSlowNetwork && (
              <div className="flex items-center justify-end gap-2 pt-1.5">
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-[11px] font-serif font-bold transition active:scale-95 cursor-pointer"
                  >
                    VOLVER
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsSlowNetwork(false);
                    setStatusText('Reintentando descarga del tablero 3D...');
                    setRetryTrigger((n) => n + 1);
                  }}
                  className="px-3.5 py-1 rounded-xl text-black text-[11px] font-serif font-black tracking-wider transition active:scale-95 cursor-pointer shadow-lg"
                  style={{ backgroundColor: accentColor }}
                >
                  REINTENTAR
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CombatPreloaderScreen;
