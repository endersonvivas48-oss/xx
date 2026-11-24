import React from 'react';
import { gameAudio, isAndroidDevice, useCompactViewport } from './utils';
import { ColiseumDifficulty } from './types';
import { getColiseumImageCandidateUrls } from './coliseumImageMap';
import { CachedImage } from './CachedImage';

export interface ColiseumDifficultyModalProps {
  isOpen: boolean;
  onClose: () => void;
  survivalDifficulty: ColiseumDifficulty;
  setSurvivalDifficulty: (diff: ColiseumDifficulty) => void;
  onStartSurvival: (diff: ColiseumDifficulty) => void;
  MAIN_RAW_BASE: string;
  MAIN_CDN_BASE: string;
}

export const ColiseumDifficultyModal: React.FC<ColiseumDifficultyModalProps> = ({
  isOpen,
  onClose,
  survivalDifficulty,
  setSurvivalDifficulty,
  onStartSurvival,
  MAIN_RAW_BASE,
  MAIN_CDN_BASE,
}) => {
  const isCompact = useCompactViewport(460, 640);
  const isAndroid = isAndroidDevice();
  const blurMd = isAndroid ? '' : 'backdrop-blur-md';
  const exitIconCandidates = [
    `${MAIN_CDN_BASE}/icono_salir.webp`,
    `${MAIN_RAW_BASE}/icono_salir.webp`,
    './assets/icono_salir.webp',
  ];
  if (!isOpen) return null;

  const diffKey =
    survivalDifficulty === 'PESADILLA'
      ? 'NIGHTMARE'
      : survivalDifficulty === 'HEROICO'
      ? 'HEROIC'
      : 'NORMAL';

  const bgCandidates = [
    ...getColiseumImageCandidateUrls(diffKey),
    ...getColiseumImageCandidateUrls('GENERAL'),
  ];

  const coliseumDifficultiesList = [
    {
      id: 'NORMAL' as ColiseumDifficulty,
      mapKey: 'NORMAL' as const,
      title: 'NORMAL',
      badge: 'x1.0 Oro',
      color: '#38bdf8',
      desc: 'Reglas estándar de supervivencia. Los rivales escalan progresivamente en cada oleada.',
      bonus: 'Oro estándar',
      iconFile: 'normal',
      handicapKey: 'NORMAL' as const,
    },
    {
      id: 'HEROICO' as ColiseumDifficulty,
      mapKey: 'HEROIC' as const,
      title: 'HEROICO',
      badge: 'x1.8 Oro',
      color: '#f59e0b',
      desc: 'Los rivales inician con +2 HP extra y lanzan más hechizos agresivos en cada turno.',
      bonus: '+80% de Oro por oleada',
      iconFile: 'heroico',
      handicapKey: 'HARD' as const,
    },
    {
      id: 'PESADILLA' as ColiseumDifficulty,
      mapKey: 'NIGHTMARE' as const,
      title: 'PESADILLA',
      badge: 'x3.0 Oro + Minerales',
      color: '#f43f5e',
      desc: 'El Rey Carmesí ataca de inmediato. ¡Runas de terreno activas desde Oleada 3 y botín de forja garantizado!',
      bonus: 'x3 Oro + Botín de Fragua',
      iconFile: 'mitico',
      handicapKey: 'TITAN' as const,
    },
  ];

  const selectedDiffMeta =
    coliseumDifficultiesList.find((d) => d.id === survivalDifficulty) ||
    coliseumDifficultiesList[0];

  const getColiseumDifficultyIconCandidates = (diffItem: (typeof coliseumDifficultiesList)[0]) => {
    if (diffItem.id === 'NORMAL') {
      return [
        `${MAIN_RAW_BASE}/normal.webp`,
        `${MAIN_CDN_BASE}/normal.webp`,
        `${MAIN_RAW_BASE}/normal.jpg`,
        `${MAIN_CDN_BASE}/normal.jpg`,
        `${MAIN_RAW_BASE}/normal.png`,
        `${MAIN_CDN_BASE}/normal.png`,
        `${MAIN_RAW_BASE}/gladiador/normal.webp`,
        `${MAIN_CDN_BASE}/gladiador/normal.webp`,
        `${MAIN_RAW_BASE}/gladiador/normal.jpg`,
        `${MAIN_CDN_BASE}/gladiador/normal.jpg`,
      ];
    }
    if (diffItem.id === 'HEROICO') {
      return [
        `${MAIN_RAW_BASE}/heroico.webp`,
        `${MAIN_CDN_BASE}/heroico.webp`,
        `${MAIN_RAW_BASE}/heroico.jpg`,
        `${MAIN_CDN_BASE}/heroico.jpg`,
        `${MAIN_RAW_BASE}/heroico.png`,
        `${MAIN_CDN_BASE}/heroico.png`,
        `${MAIN_RAW_BASE}/gladiador/heroico.webp`,
        `${MAIN_CDN_BASE}/gladiador/heroico.webp`,
        `${MAIN_RAW_BASE}/gladiador/heroico.jpg`,
        `${MAIN_CDN_BASE}/gladiador/heroico.jpg`,
      ];
    }
    // PESADILLA
    return [
      `${MAIN_RAW_BASE}/mitico.webp`,
      `${MAIN_CDN_BASE}/mitico.webp`,
      `${MAIN_RAW_BASE}/mitico.jpg`,
      `${MAIN_CDN_BASE}/mitico.jpg`,
      `${MAIN_RAW_BASE}/mitico.png`,
      `${MAIN_CDN_BASE}/mitico.png`,
      `${MAIN_RAW_BASE}/gladiador/mitico.webp`,
      `${MAIN_CDN_BASE}/gladiador/mitico.webp`,
      `${MAIN_RAW_BASE}/gladiador/mitico.jpg`,
      `${MAIN_CDN_BASE}/gladiador/mitico.jpg`,
    ];
  };

  return (
    <div
      className="fixed inset-0 z-[150] overflow-hidden select-none bg-black flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn"
      onClick={onClose}
    >
      {/* FONDO DE PANTALLA COMPLETA CON TRANSICIÓN DINÁMICA SEGÚN DIFICULTAD */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
        <CachedImage
          key={`coli_full_bg_${diffKey}`}
          cacheKey={`coli_bg_${diffKey}`}
          candidateUrls={bgCandidates}
          alt={`Fondo Coliseo ${selectedDiffMeta.title}`}
          className="w-full h-full object-cover object-center filter brightness-65 contrast-120 scale-100 transition-all duration-500 animate-fadeIn pointer-events-none select-none"
        />
        <div className="absolute inset-0 bg-radial-vignette from-transparent via-black/35 to-black/80 pointer-events-none" />
      </div>

      {/* BARRA SUPERIOR ELEGANTE Y DESPEJADA */}
      <div
        className="relative z-10 w-full max-w-4xl flex items-center justify-between pt-1 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-mono font-bold tracking-widest text-rose-400 uppercase drop-shadow">
            COLISEO DE CAMPEONES
          </span>
          <div className="flex items-center gap-2">
            <h2
              className="text-lg sm:text-2xl font-black font-serif tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,1)] uppercase"
              style={{ color: selectedDiffMeta.color }}
            >
              DIFICULTAD {selectedDiffMeta.title}
            </h2>
          </div>
        </div>

        {/* Botón superior derecho para Volver al Campamento / Ciudad: sin borde, solo brillo de fondo y texto debajo */}
        <button
          type="button"
          onClick={() => {
            gameAudio.playCrispClick();
            onClose();
          }}
          className={`flex flex-col items-center justify-center p-1.5 sm:p-2 px-2.5 sm:px-3 rounded-2xl border-0 transition-all duration-300 transform active:scale-95 cursor-pointer group relative ${blurMd}`}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            boxShadow: '0 0 35px rgba(245, 158, 11, 0.55), inset 0 0 20px rgba(245, 158, 11, 0.35)',
          }}
          aria-label="Volver"
        >
          <CachedImage
            cacheKey="icono_salir_main"
            candidateUrls={exitIconCandidates}
            alt="Volver"
            loading="eager"
            fallbackPlaceholder={<></>}
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain filter brightness-110 contrast-110 pointer-events-none group-hover:scale-110 transition-transform"
            style={{ mixBlendMode: 'screen' }}
          />
          <span className="font-serif font-bold tracking-widest text-slate-300 group-hover:text-amber-300 transition-colors text-[9px] sm:text-[10px] mt-0.5">
            VOLVER
          </span>
        </button>
      </div>

      {/* CUERPO CENTRAL: ICONOS DE DIFICULTAD ADAPTABLES A PANTALLAS PEQUEÑAS Y HORIZONTALES */}
      <div
        className="relative z-10 w-full max-w-5xl flex-1 min-h-0 flex flex-row items-center justify-start pointer-events-auto px-2 sm:px-6 my-auto gap-3 sm:gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`${
            isCompact
              ? 'flex flex-row flex-wrap items-center justify-start gap-3.5 max-h-full overflow-y-auto touch-pan-y py-3 px-2'
              : 'flex flex-col items-center justify-start gap-2.5 sm:gap-3.5 shrink-0 py-3 px-4 -mx-2 max-h-full overflow-y-auto touch-pan-y'
          } [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
        >
          {coliseumDifficultiesList.map((diff) => {
            const isSelected = survivalDifficulty === diff.id;
            const iconCandidates = getColiseumDifficultyIconCandidates(diff);

            return (
              <button
                key={diff.id}
                type="button"
                onClick={() => {
                  setSurvivalDifficulty(diff.id);
                  gameAudio.playCrispClick();
                }}
                onPointerEnter={(e) => {
                  // Solo cambiar al pasar el cursor si proviene de un ratón real, no de taps en pantallas táctiles
                  if (e.pointerType === 'mouse' && survivalDifficulty !== diff.id) {
                    setSurvivalDifficulty(diff.id);
                    gameAudio.playCrispClick();
                  }
                }}
                className={`${
                  isCompact ? 'w-12 h-12 sm:w-14 sm:h-14' : ''
                } shrink-0 rounded-2xl sm:rounded-3xl border-0 flex items-center justify-center transition-all duration-300 transform active:scale-95 cursor-pointer relative ${
                  isAndroid ? '' : 'backdrop-blur-md'
                } overflow-hidden ${
                  isSelected
                    ? isCompact
                      ? 'scale-110 z-30 ring-2 ring-white/60'
                      : 'scale-110 sm:scale-120 z-30 translate-x-1 sm:translate-x-2 ring-2 ring-white/60'
                    : 'scale-95 opacity-85 hover:opacity-100 hover:scale-100'
                }`}
                style={{
                  width: isCompact ? undefined : 'clamp(46px, 13vh, 80px)',
                  height: isCompact ? undefined : 'clamp(46px, 13vh, 80px)',
                  backgroundColor: isSelected ? `${diff.color}35` : 'rgba(0, 0, 0, 0.45)',
                  boxShadow: isSelected
                    ? `0 0 35px ${diff.color}, inset 0 0 16px ${diff.color}60`
                    : `0 0 18px ${diff.color}50, inset 0 0 8px ${diff.color}30`,
                }}
                aria-label={`Dificultad ${diff.title}`}
              >
                <CachedImage
                  cacheKey={`coliseum_diff_icon_${diff.id}`}
                  candidateUrls={iconCandidates}
                  alt={diff.title}
                  className={`w-full h-full object-contain p-1 sm:p-1.5 filter brightness-105 contrast-110 pointer-events-none select-none transition-transform duration-300 ${
                    isSelected ? 'scale-105' : 'scale-100'
                  }`}
                />

                {isSelected && (
                  <div
                    className="absolute -bottom-1 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full shadow-[0_0_12px_#ffffff] z-30 animate-pulse"
                    style={{ backgroundColor: diff.color }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* PIE DE PANTALLA: PANEL INFORMATIVO CON BOTÓN DE ENTRADA EXPLÍCITO */}
      <div
        className="relative z-10 w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex-1 max-w-lg px-4 sm:px-6 py-2 rounded-2xl bg-black/85 border border-amber-500/40 ${blurMd} text-left sm:text-center shadow-2xl animate-fadeIn`}>
          <span className="text-xs sm:text-sm font-serif font-black" style={{ color: selectedDiffMeta.color }}>
            {selectedDiffMeta.desc}
          </span>
          <div className="text-[10.5px] sm:text-xs font-mono font-bold text-amber-300 mt-0.5">
            Bonificación: {selectedDiffMeta.bonus}
          </div>
        </div>

        {/* BOTÓN EXPLÍCITO DE INGRESAR AL COLISEO (ACCESIBILIDAD MÓVIL Y RATÓN) */}
        <button
          type="button"
          onClick={() => {
            gameAudio.playConfirmSelect();
            onStartSurvival(survivalDifficulty);
          }}
          className={`flex items-center gap-2 py-2.5 px-6 rounded-2xl border transition-all duration-300 transform active:scale-95 cursor-pointer ${blurMd} shadow-2xl shrink-0`}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            borderColor: selectedDiffMeta.color,
            boxShadow: `0 0 25px ${selectedDiffMeta.color}60, inset 0 0 12px ${selectedDiffMeta.color}40`,
          }}
        >
          <span
            className="text-xs sm:text-sm font-black font-serif tracking-widest uppercase"
            style={{ color: selectedDiffMeta.color }}
          >
            INGRESAR A LA ARENA ({selectedDiffMeta.title})
          </span>
        </button>
      </div>
    </div>
  );
};

export default ColiseumDifficultyModal;
