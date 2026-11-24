import React, { useState } from 'react';
import { gameAudio, isAndroidDevice, useCompactViewport } from './utils';
import { CachedImage } from './CachedImage';

const MAIN_RAW_BASE = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';
const MAIN_CDN_BASE = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';

const SAVE_ICON_CANDIDATES = [
  `${MAIN_CDN_BASE}/icono_guardar.webp`,
  `${MAIN_RAW_BASE}/icono_guardar.webp`,
  './assets/icono_guardar.webp',
];

const EXIT_ICON_CANDIDATES = [
  `${MAIN_CDN_BASE}/icono_salir.webp`,
  `${MAIN_RAW_BASE}/icono_salir.webp`,
  './assets/icono_salir.webp',
];

const CAMP_BG_CANDIDATES = [
  `${MAIN_CDN_BASE}/campamento.webp`,
  `${MAIN_RAW_BASE}/campamento.webp`,
  `${MAIN_CDN_BASE}/campamento.jpg`,
  `${MAIN_RAW_BASE}/campamento.jpg`,
  './assets/campamento.webp',
  './assets/campamento.jpg',
];

export interface CampaignHubViewProps {
  onReturnToTitle: () => void;
  onEnterCity: () => void;
  onOpenCampaigns: () => void;
  onOpenColiseum: () => void;
  onOpenWorkshop: () => void;
  onOpenShop: () => void;
  onOpenCodex: () => void;
  onOpenSpellbook: () => void;
  onOpenGameMenu?: () => void;
  onSaveGame?: () => void;
  hasStartedAnyCampaign?: boolean;
  hasEnteredCampaignSession?: boolean;
  isForgeUnlocked?: boolean;
  onOpenForge?: () => void;
}

export const CampaignHubView: React.FC<CampaignHubViewProps> = ({
  onReturnToTitle,
  onEnterCity,
  onOpenCampaigns,
  onOpenColiseum,
  onOpenWorkshop,
  onOpenShop,
  onOpenCodex,
  onOpenSpellbook,
  onOpenGameMenu,
  onSaveGame,
  hasStartedAnyCampaign = false,
  hasEnteredCampaignSession = false,
  isForgeUnlocked = false,
  onOpenForge,
}) => {
  // Estado del elemento activo/posado para el cambio de fondo dinámico en tiempo real
  const [activeItemKey, setActiveItemKey] = useState<string>('campamento');
  const isCompact = useCompactViewport(500, 640);
  const isAndroid = isAndroidDevice();
  const blurMd = isAndroid ? '' : 'backdrop-blur-md';

  const getCampIconCandidates = (fileBase: string) => [
    `${MAIN_CDN_BASE}/${fileBase}.webp`,
    `${MAIN_RAW_BASE}/${fileBase}.webp`,
    `${MAIN_CDN_BASE}/iconos/${fileBase}.webp`,
    `${MAIN_RAW_BASE}/iconos/${fileBase}.webp`,
    `${MAIN_CDN_BASE}/${fileBase}.png`,
    `${MAIN_RAW_BASE}/${fileBase}.png`,
    `${MAIN_CDN_BASE}/iconos/${fileBase}.png`,
    `${MAIN_RAW_BASE}/iconos/${fileBase}.png`,
    `./assets/${fileBase}.webp`,
    `./assets/iconos/${fileBase}.webp`,
  ];

  // El icono de CIUDAD solo debe aparecer cuando ya se ha iniciado la campaña en curso
  const canShowCity = Boolean(hasStartedAnyCampaign && hasEnteredCampaignSession);

  const hubItems = [
    ...(canShowCity
      ? [
          {
            id: 'city',
            title: 'CIUDAD',
            sub: 'Exploración Urbana 3D',
            iconFile: 'icono_reanudar',
            color: '#10b981',
            bgCandidates: [
              `${MAIN_CDN_BASE}/fondo_cyty.webp`,
              `${MAIN_RAW_BASE}/fondo_cyty.webp`,
              `${MAIN_CDN_BASE}/fondo_cyty.jpg`,
              `${MAIN_RAW_BASE}/fondo_cyty.jpg`,
              `${MAIN_CDN_BASE}/menu.webp`,
              `${MAIN_RAW_BASE}/menu.webp`,
              './assets/fondo_cyty.webp',
              './assets/fondo_cyty.jpg',
            ],
            action: onEnterCity,
          },
        ]
      : []),
    {
      id: 'campaign',
      title: 'CAMPAÑAS',
      sub: 'Selector de Desafíos',
      iconFile: 'icono_campana',
      color: '#f59e0b',
      bgCandidates: [
        `${MAIN_CDN_BASE}/campana_1.webp`,
        `${MAIN_RAW_BASE}/campana_1.webp`,
        `${MAIN_CDN_BASE}/campana_1.jpg`,
        `${MAIN_RAW_BASE}/campana_1.jpg`,
        './assets/campana_1.webp',
        './assets/campana_1.jpg',
      ],
      action: onOpenCampaigns,
    },
    {
      id: 'coliseum',
      title: 'COLISEO',
      sub: 'Gran Arena y Supervivencia',
      iconFile: 'icono_coliseo',
      color: '#f43f5e',
      bgCandidates: [
        `${MAIN_CDN_BASE}/coliseo_fondo.webp`,
        `${MAIN_RAW_BASE}/coliseo_fondo.webp`,
        `${MAIN_CDN_BASE}/coliseo_fondo.jpg`,
        `${MAIN_RAW_BASE}/coliseo_fondo.jpg`,
        './assets/coliseo_fondo.webp',
        './assets/coliseo_fondo.jpg',
      ],
      action: onOpenColiseum,
    },
    {
      id: 'workshop',
      title: 'TALLER',
      sub: 'Gestión de Dados y Orbes',
      iconFile: 'icono_taller',
      color: '#38bdf8',
      bgCandidates: [
        `${MAIN_CDN_BASE}/fondo_taller.webp`,
        `${MAIN_RAW_BASE}/fondo_taller.webp`,
        `${MAIN_CDN_BASE}/fondo_taller.jpg`,
        `${MAIN_RAW_BASE}/fondo_taller.jpg`,
        `${MAIN_CDN_BASE}/taller.webp`,
        `${MAIN_RAW_BASE}/taller.webp`,
        './assets/fondo_taller.webp',
        './assets/fondo_taller.jpg',
      ],
      action: onOpenWorkshop,
    },
    ...(isForgeUnlocked && onOpenForge
      ? [
          {
            id: 'forge',
            title: 'FORJA',
            sub: 'Gran Fragua Alquímica',
            iconFile: 'icono_forja',
            color: '#c084fc',
            bgCandidates: [
              `${MAIN_CDN_BASE}/forja_fondo.webp`,
              `${MAIN_RAW_BASE}/forja_fondo.webp`,
              `${MAIN_CDN_BASE}/forja.webp`,
              `${MAIN_RAW_BASE}/forja.webp`,
              './assets/forja_fondo.webp',
            ],
            action: onOpenForge,
          },
        ]
      : []),
    {
      id: 'shop',
      title: 'TIENDA',
      sub: 'Bazar Místico de Salomón',
      iconFile: 'icono_tienda',
      color: '#e879f9',
      bgCandidates: [
        `${MAIN_CDN_BASE}/tienda.webp`,
        `${MAIN_RAW_BASE}/tienda.webp`,
        `${MAIN_CDN_BASE}/solomon.webp`,
        `${MAIN_RAW_BASE}/solomon.webp`,
        `${MAIN_CDN_BASE}/tienda.jpg`,
        `${MAIN_RAW_BASE}/tienda.jpg`,
        './assets/tienda.webp',
        './assets/solomon.webp',
      ],
      action: onOpenShop,
    },
    {
      id: 'codex',
      title: 'CÓDICE',
      sub: 'Compendio y Bestiario',
      iconFile: 'icono_codice',
      color: '#fbbf24',
      bgCandidates: [
        `${MAIN_CDN_BASE}/codice.webp`,
        `${MAIN_RAW_BASE}/codice.webp`,
        `${MAIN_CDN_BASE}/codice.jpg`,
        `${MAIN_RAW_BASE}/codice.jpg`,
        './assets/codice.webp',
        './assets/codice.jpg',
      ],
      action: onOpenCodex,
    },
    {
      id: 'spellbook',
      title: 'GRIMORIO',
      sub: 'Libro de Hechizos',
      iconFile: 'icono_grimorio',
      color: '#34d399',
      bgCandidates: [
        `${MAIN_CDN_BASE}/libro.webp`,
        `${MAIN_RAW_BASE}/libro.webp`,
        `${MAIN_CDN_BASE}/libro.jpg`,
        `${MAIN_RAW_BASE}/libro.jpg`,
        './assets/libro.webp',
        './assets/libro.jpg',
      ],
      action: onOpenSpellbook,
    },
  ];

  // Determinar los candidatos de fondo según el elemento activo/posado
  const activeHubItem = hubItems.find((item) => item.id === activeItemKey);
  const bgCacheKey = activeHubItem ? `hub_bg_${activeHubItem.id}` : 'bg_camp';
  const currentBgCandidates = activeHubItem
    ? Array.from(new Set([...activeHubItem.bgCandidates, ...CAMP_BG_CANDIDATES]))
    : CAMP_BG_CANDIDATES;

  // Título y categoría dinámica de la pantalla actual en la cabecera superior
  const currentScreenTitle = activeHubItem ? activeHubItem.title : 'CAMPAMENTO';
  const currentScreenCategory = activeHubItem ? activeHubItem.sub : 'CAMPAMENTO DE GUERRA';
  const currentScreenColor = activeHubItem ? activeHubItem.color : '#f59e0b';

  return (
    <div className="absolute inset-0 overflow-hidden select-none bg-black z-20 flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn">
      {/* FONDO CAMBIANTE EN TIEMPO REAL AL POSARSE SOBRE CADA ICONO (con CachedImage y sin bucles onError) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
        <CachedImage
          key={bgCacheKey}
          cacheKey={bgCacheKey}
          candidateUrls={currentBgCandidates}
          alt={currentScreenTitle}
          loading="eager"
          fallbackPlaceholder={
            <div className="w-full h-full bg-gradient-to-br from-slate-950 via-amber-950/30 to-black" />
          }
          className="w-full h-full object-cover object-center filter brightness-65 contrast-115 scale-100 transition-all duration-500 animate-fadeIn pointer-events-none select-none"
        />
        <div className="absolute inset-0 bg-radial-vignette from-transparent via-black/35 to-black/80 pointer-events-none" />
      </div>

      {/* BARRA SUPERIOR ELEGANTE CON EL NOMBRE DIRECTO DE LA PANTALLA Y BOTÓN MENÚ DE JUEGO */}
      <div className="relative z-10 w-full max-w-5xl flex items-start justify-between pt-1 pointer-events-auto">
        <div className="flex flex-col text-left">
          <span
            className="text-[10px] sm:text-[11px] font-mono font-bold tracking-widest uppercase drop-shadow transition-colors duration-300"
            style={{ color: currentScreenColor }}
          >
            {currentScreenCategory}
          </span>
          <div className="flex items-center gap-2">
            <h2
              className="text-lg sm:text-2xl font-black font-serif tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,1)] uppercase transition-colors duration-300"
              style={{ color: currentScreenColor }}
            >
              {currentScreenTitle}
            </h2>
          </div>
        </div>

        {/* BOTÓN SUPERIOR DERECHO: MENÚ DE JUEGO DE LA CIUDAD */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              gameAudio.playCrispClick();
              if (onOpenGameMenu) {
                onOpenGameMenu();
              } else {
                onSaveGame?.();
              }
            }}
            className={`w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-2xl sm:rounded-3xl border-0 flex items-center justify-center p-1 sm:p-1.5 transition-all duration-300 transform active:scale-95 cursor-pointer group relative overflow-hidden ${blurMd}`}
            aria-label="Abrir menú de juego"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              boxShadow: '0 0 35px rgba(16, 185, 129, 0.55), inset 0 0 20px rgba(16, 185, 129, 0.35)',
            }}
          >
            {/* Brillo radial de fondo */}
            <div
              className="absolute inset-0 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity"
              style={{
                background: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.5) 0%, transparent 75%)',
              }}
            />
            <CachedImage
              cacheKey="icono_guardar_main"
              candidateUrls={SAVE_ICON_CANDIDATES}
              alt="Menú de Juego"
              loading="eager"
              fallbackPlaceholder={<></>}
              className="w-11 h-11 sm:w-13 sm:h-13 md:w-15 md:h-15 object-contain filter brightness-110 contrast-110 pointer-events-none group-hover:scale-110 transition-transform relative z-10"
              style={{ mixBlendMode: 'screen' }}
            />
          </button>
        </div>
      </div>

      {/* FILA CENTRAL DE ICONOS FLOTANTES */}
      <div className="relative z-10 w-full max-w-4xl flex-1 min-h-0 flex items-center justify-center my-auto pointer-events-auto py-2 overflow-y-auto touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 md:gap-5 p-3">
          {hubItems.map((item) => {
            const isHovered = activeItemKey === item.id;
            const iconCandidates = getCampIconCandidates(item.iconFile);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (activeItemKey === item.id) {
                    gameAudio.playConfirmSelect();
                    item.action();
                  } else {
                    gameAudio.playCrispClick();
                    setActiveItemKey(item.id);
                  }
                }}
                onMouseEnter={() => {
                  if (activeItemKey !== item.id) {
                    setActiveItemKey(item.id);
                    gameAudio.playHoverMicroTone();
                  }
                }}
                onFocus={() => {
                  setActiveItemKey(item.id);
                }}
                className={`${
                  isCompact ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20'
                } shrink-0 rounded-2xl sm:rounded-3xl border-0 outline-none focus:outline-none flex items-center justify-center p-1 sm:p-1.5 transition-all duration-300 transform active:scale-95 cursor-pointer relative ${
                  isAndroid ? '' : 'backdrop-blur-md'
                } overflow-hidden ${
                  isHovered
                    ? isCompact
                      ? 'scale-110 z-30'
                      : 'scale-120 sm:scale-125 z-30 -translate-y-2'
                    : 'scale-95 sm:scale-100 opacity-90 hover:opacity-100 hover:scale-105'
                }`}
                style={{
                  backgroundColor: isHovered ? `${item.color}35` : 'rgba(0, 0, 0, 0.45)',
                  boxShadow: isHovered
                    ? `0 0 35px ${item.color}, inset 0 0 20px ${item.color}60`
                    : `0 0 30px ${item.color}50, inset 0 0 15px ${item.color}30`,
                }}
                aria-label={item.title}
              >
                {/* Resplandor radial de fondo */}
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle at center, ${item.color}65 0%, transparent 80%)`,
                    opacity: isHovered ? 1 : 0.6,
                  }}
                />

                {/* Ilustración oficial con Caché Persistente */}
                <CachedImage
                  cacheKey={`hub_icon_${item.iconFile}`}
                  candidateUrls={iconCandidates}
                  alt={item.title}
                  loading="eager"
                  fallbackPlaceholder={<></>}
                  className={`w-12 h-12 sm:w-16 sm:h-16 md:w-17 md:h-17 object-contain filter brightness-110 contrast-110 pointer-events-none select-none transition-transform duration-300 relative z-10 ${
                    isHovered ? 'scale-110' : 'scale-100'
                  }`}
                  style={{
                    mixBlendMode: 'screen',
                  }}
                />

                {/* Pequeño punto indicador luminoso debajo al posarse */}
                {isHovered && (
                  <div
                    className="absolute bottom-1 w-2 h-2 rounded-full shadow-[0_0_12px_currentColor] z-20 animate-pulse"
                    style={{ backgroundColor: item.color, color: item.color }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* PIE DE PANTALLA: ACCIÓN EXPLÍCITA DE ENTRAR (ACCESIBILIDAD MÓVIL) Y BOTÓN SALIR */}
      <div className="relative z-10 w-full max-w-5xl flex items-center justify-between pb-1 pointer-events-auto">
        {/* BOTÓN EXPLÍCITO DE ENTRAR / ABRIR PARA PANTALLAS TÁCTILES Y MÓVILES */}
        {activeHubItem ? (
          <button
            type="button"
            onClick={() => {
              gameAudio.playConfirmSelect();
              activeHubItem.action();
            }}
            className={`flex items-center gap-2 py-2.5 px-5 sm:px-6 rounded-2xl border transition-all duration-300 transform active:scale-95 cursor-pointer ${blurMd} shadow-2xl animate-fadeIn`}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              borderColor: activeHubItem.color,
              boxShadow: `0 0 25px ${activeHubItem.color}60, inset 0 0 12px ${activeHubItem.color}40`,
            }}
          >
            <span className="text-xs sm:text-sm font-black font-serif tracking-widest uppercase" style={{ color: activeHubItem.color }}>
              ENTRAR A {activeHubItem.title}
            </span>
          </button>
        ) : (
          <div className="w-10" />
        )}

        <button
          type="button"
          onClick={() => {
            gameAudio.playCrispClick();
            onReturnToTitle();
          }}
          className={`w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-2xl sm:rounded-3xl border-0 flex items-center justify-center p-1 sm:p-1.5 transition-all duration-300 transform active:scale-95 cursor-pointer group relative overflow-hidden ${blurMd}`}
          aria-label="Salir a la Portada Principal"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            boxShadow: '0 0 35px rgba(245, 158, 11, 0.55), inset 0 0 20px rgba(245, 158, 11, 0.35)',
          }}
        >
          {/* Brillo radial de fondo */}
          <div
            className="absolute inset-0 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity"
            style={{
              background: 'radial-gradient(circle at center, rgba(245, 158, 11, 0.5) 0%, transparent 75%)',
            }}
          />
          <CachedImage
            cacheKey="icono_salir_main"
            candidateUrls={EXIT_ICON_CANDIDATES}
            alt="Salir"
            loading="eager"
            fallbackPlaceholder={<></>}
            className="w-11 h-11 sm:w-13 sm:h-13 md:w-15 md:h-15 object-contain filter brightness-110 contrast-110 pointer-events-none group-hover:scale-110 transition-transform relative z-10"
            style={{ mixBlendMode: 'screen' }}
          />
        </button>
      </div>
    </div>
  );
};

export default CampaignHubView;
