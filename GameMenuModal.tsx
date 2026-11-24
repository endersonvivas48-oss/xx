import React, { useState, useEffect } from 'react';
import { gameAudio, isAndroidDevice, useCompactViewport } from './utils';
import { ASSET_MANIFEST } from './assetManifest';
import { CachedImage } from './CachedImage';

export interface GameMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: string;
  isSfxMuted: boolean;
  setIsSfxMuted: React.Dispatch<React.SetStateAction<boolean>>;
  isMusicMuted: boolean;
  setIsMusicMuted: React.Dispatch<React.SetStateAction<boolean>>;
  musicVolume: number;
  setMusicVolume: React.Dispatch<React.SetStateAction<number>>;
  descFontSize: number;
  setDescFontSize: (size: number) => void;
  isFullscreen: boolean;
  toggleAppFullscreen: () => void;
  onOpenMasterPiece: () => void;
  onOpenStats: () => void;
  onOpenTrophies?: () => void;
  onOpenTieredAchievements?: () => void;
  onOpenSaveMenu?: () => void;
  isSaveLockedInTournament?: boolean;
  onReturnToHub: () => void;
  FullscreenMenuBackground: React.FC<{ className?: string }>;
}

type MenuSectionId = 'audio' | 'ficha' | 'logros' | 'avanzados' | 'stats' | 'pantalla' | 'guardar' | 'salir';

const MAIN_REPO_CDN = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';
const MAIN_REPO_RAW = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';

const EXIT_ICON_CANDIDATES = [
  `${MAIN_REPO_CDN}/icono_salir.webp`,
  `${MAIN_REPO_RAW}/icono_salir.webp`,
  './assets/icono_salir.webp',
];

export const GameMenuModal: React.FC<GameMenuModalProps> = ({
  isOpen,
  onClose,
  currentScreen,
  isSfxMuted,
  setIsSfxMuted,
  isMusicMuted,
  setIsMusicMuted,
  musicVolume,
  setMusicVolume,
  descFontSize,
  setDescFontSize,
  isFullscreen,
  toggleAppFullscreen,
  onOpenMasterPiece,
  onOpenStats,
  onOpenTrophies,
  onOpenTieredAchievements,
  onOpenSaveMenu,
  isSaveLockedInTournament = false,
  onReturnToHub,
  FullscreenMenuBackground,
}) => {
  const [activeSection, setActiveSection] = useState<MenuSectionId>('audio');
  const [activeSubModal, setActiveSubModal] = useState<'audio' | 'pantalla' | null>(null);
  const [blockedNotice, setBlockedNotice] = useState<{ title: string; text: string } | null>(null);
  const isCompact = useCompactViewport(640, 640);
  const isAndroid = isAndroidDevice();
  const blurMd = isAndroid ? '' : 'backdrop-blur-md';
  const blurSm = isAndroid ? '' : 'backdrop-blur-sm';

  useEffect(() => {
    if (!isOpen || currentScreen !== 'COMBAT') {
      setBlockedNotice(null);
    }
    if (!isOpen) {
      setActiveSubModal(null);
    }
  }, [isOpen, currentScreen]);

  if (!isOpen) return null;

  const isExitLockedInCombat = currentScreen === 'COMBAT';

  const menuSections = [
    {
      id: 'audio' as const,
      title: 'AUDIO Y VOLUMEN',
      sub: 'Efectos sonoros y música ambiental',
      color: '#f59e0b',
      manifestKey: 'icon_audio',
      desc: 'Configuración acústica de la partida: haz clic para ajustar volumen y sonidos.',
    },
    {
      id: 'ficha' as const,
      title: 'FICHA MAESTRA',
      sub: 'Títulos reales y orbes engarzados',
      color: '#38bdf8',
      manifestKey: 'icon_ficha_maestra',
      desc: 'Personalización de tu Rey Soberano: haz clic para entrar a la sala del trono.',
    },
    {
      id: 'logros' as const,
      title: 'SALA DE LOGROS',
      sub: 'Trofeos de campaña y hazañas',
      color: '#f59e0b',
      manifestKey: 'icon_trophies',
      desc: 'Salón de trofeos y hazañas del reino: haz clic para ver tus logros.',
    },
    {
      id: 'avanzados' as const,
      title: 'LOGROS AVANZADOS',
      sub: 'Desafíos de maestría (Bronce, Plata, Oro, Leyenda)',
      color: '#c084fc',
      manifestKey: 'icon_advanced_achievements',
      desc: 'Desafíos escalonados de maestría: haz clic para ver y reclamar materiales de forja y oro.',
    },
    {
      id: 'stats' as const,
      title: 'ESTADÍSTICAS',
      sub: 'Registro histórico de tiradas y victorias',
      color: '#34d399',
      manifestKey: 'icon_stats',
      desc: 'Historial de combates y dados: haz clic para consultar estadísticas.',
    },
    {
      id: 'pantalla' as const,
      title: 'PANTALLA Y TEXTO',
      sub: 'Tamaño tipográfico e inmersión completa',
      color: '#fbbf24',
      manifestKey: 'icon_display',
      desc: 'Ajuste de tipografía y pantalla completa: haz clic para configurar.',
    },
    {
      id: 'guardar' as const,
      title: 'GUARDAR PARTIDA',
      sub: 'Grabar avance actual en piedra',
      color: '#10b981',
      manifestKey: 'icon_save',
      desc: isSaveLockedInTournament
        ? 'No puedes guardar mientras disputas el Gran Torneo. Concluye la Gran Final para guardar.'
        : 'Abre el menú de guardado para conservar tu progreso, dados forjados, orbes y oro.',
    },
    {
      id: 'salir' as const,
      title: 'SALIR AL CAMPAMENTO',
      sub: 'Regresar al cuartel del campamento',
      color: '#f43f5e',
      manifestKey: 'icon_camp_exit',
      desc: currentScreen === 'COMBAT'
        ? 'No puedes abandonar durante combate directo. Concluye la batalla o usa Rendirse.'
        : 'Regresa a la plaza del Campamento de Guerra (el progreso se guarda manualmente con el botón GUARDAR en este menú o la Ciudad).',
    },
  ];

  const selectedMeta = menuSections.find((s) => s.id === activeSection) || menuSections[0];

  const getMenuIconCandidateUrls = (manifestKey: string) => {
    const entry = ASSET_MANIFEST[manifestKey];
    if (entry) {
      return [entry.primary, entry.fallback];
    }
    return [];
  };

  const handleOpenSubScreen = (secId: MenuSectionId) => {
    if (secId === 'salir' && isExitLockedInCombat) {
      gameAudio.playErrorBuzz();
      setBlockedNotice({
        title: 'Salida bloqueada en combate',
        text: 'No puedes salir al campamento durante un combate activo. Concluye la batalla o usa el botón Rendirse en la arena.',
      });
      return;
    }

    if (secId === 'guardar' && isSaveLockedInTournament) {
      gameAudio.playErrorBuzz();
      setBlockedNotice({
        title: 'Guardado bloqueado en Torneo',
        text: '¡Torneo en curso! No puedes guardar hasta finalizar la Gran Final en la Gran Arena.',
      });
      return;
    }

    setBlockedNotice(null);
    gameAudio.playConfirmSelect();

    if (secId === 'audio') {
      setActiveSubModal('audio');
    } else if (secId === 'pantalla') {
      setActiveSubModal('pantalla');
    } else if (secId === 'ficha') {
      onClose();
      onOpenMasterPiece();
    } else if (secId === 'stats') {
      onClose();
      onOpenStats();
    } else if (secId === 'logros') {
      onClose();
      if (onOpenTrophies) onOpenTrophies();
    } else if (secId === 'avanzados') {
      onClose();
      if (onOpenTieredAchievements) onOpenTieredAchievements();
    } else if (secId === 'guardar') {
      onClose();
      if (onOpenSaveMenu) onOpenSaveMenu();
    } else if (secId === 'salir') {
      onClose();
      onReturnToHub();
    }
  };

  const handleIconClick = (secId: MenuSectionId) => {
    setActiveSection(secId);
    handleOpenSubScreen(secId);
  };

  return (
    <div
      className="fixed inset-0 z-[150] overflow-hidden select-none bg-black flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn"
      onClick={onClose}
    >
      {/* FONDO OFICIAL PANORÁMICO TOTALMENTE VISIBLE Y DESPEJADO */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
        <FullscreenMenuBackground />
        <div className="absolute inset-0 bg-radial-vignette from-transparent via-black/25 to-black/75 pointer-events-none" />
      </div>

      {/* BARRA SUPERIOR ELEGANTE Y DESPEJADA CON BOTÓN VOLVER VERTICAL SIN BORDE */}
      <div
        className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex flex-col text-left px-3 py-1.5 rounded-2xl bg-black/85 border border-amber-500/50 shadow-lg ${blurMd}`}>
          <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase drop-shadow">
            AJUSTES DEL REINO
          </span>
          <div className="flex items-center gap-2">
            <h2
              className="text-lg sm:text-2xl font-black font-serif tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,1)] uppercase transition-colors"
              style={{ color: selectedMeta.color }}
            >
              {selectedMeta.title}
            </h2>
            {selectedMeta.id === 'salir' && isExitLockedInCombat && (
              <span className="px-2 py-0.5 rounded-full bg-rose-950/90 border border-rose-500/70 text-[10px] font-mono font-bold text-rose-300 uppercase">
                🔒 Bloqueado en combate
              </span>
            )}
            {selectedMeta.id === 'guardar' && isSaveLockedInTournament && (
              <span className="px-2 py-0.5 rounded-full bg-rose-950/90 border border-rose-500/70 text-[10px] font-mono font-bold text-rose-300 uppercase">
                🔒 Bloqueado en Torneo
              </span>
            )}
          </div>
        </div>

        {/* BOTÓN VOLVER VERTICAL CON RESPLANDOR Y SIN BORDE */}
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
            candidateUrls={EXIT_ICON_CANDIDATES}
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

      {/* CUERPO CENTRAL: ADAPTADO PARA PANTALLAS PEQUEÑAS (REJILLA/FILAS SIN AGRUPAR NI APLASTAR ICONOS) */}
      <div
        className={`relative z-10 w-full max-w-5xl flex-1 min-h-0 flex ${
          isCompact ? 'flex-col sm:flex-row items-start sm:items-center' : 'flex-row items-center'
        } justify-start pointer-events-auto px-2 sm:px-6 my-auto gap-4`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`${
            isCompact
              ? 'flex flex-row flex-wrap items-center justify-start gap-3 sm:gap-3.5 max-w-[270px] sm:max-w-[320px] max-h-full overflow-y-auto touch-pan-y py-3 px-2'
              : 'flex flex-col items-center justify-start gap-2.5 shrink-0 max-h-full overflow-y-auto touch-pan-y py-3 px-4 -mx-2'
          } [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
        >
          {menuSections.map((sec) => {
            const isSelected = activeSection === sec.id;
            const isLocked =
              (sec.id === 'salir' && isExitLockedInCombat) ||
              (sec.id === 'guardar' && isSaveLockedInTournament);
            const candidateUrls = getMenuIconCandidateUrls(sec.manifestKey);

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleIconClick(sec.id)}
                aria-disabled={isLocked}
                className={`${
                  isCompact ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-12 h-12 sm:w-14 sm:h-14 md:w-15 md:h-15'
                } shrink-0 rounded-2xl sm:rounded-3xl border-0 flex items-center justify-center transition-all duration-300 transform relative ${
                  isAndroid ? '' : 'backdrop-blur-md'
                } overflow-hidden ${
                  isLocked
                    ? `opacity-45 grayscale cursor-not-allowed ${isSelected ? 'scale-105 z-20' : 'scale-95'}`
                    : `active:scale-95 cursor-pointer ${
                        isSelected
                          ? isCompact
                            ? 'scale-110 z-30'
                            : 'scale-120 sm:scale-125 z-30 translate-x-2'
                          : 'scale-95 opacity-85 hover:opacity-100 hover:scale-105'
                      }`
                }`}
                style={{
                  backgroundColor: isLocked
                    ? 'rgba(15, 23, 42, 0.7)'
                    : isSelected
                    ? `${sec.color}35`
                    : 'rgba(0, 0, 0, 0.45)',
                  boxShadow: isLocked
                    ? '0 0 10px rgba(244, 63, 94, 0.2), inset 0 0 8px rgba(15, 23, 42, 0.9)'
                    : isSelected
                    ? `0 0 45px ${sec.color}, inset 0 0 20px ${sec.color}60`
                    : `0 0 20px ${sec.color}40, inset 0 0 10px ${sec.color}30`,
                }}
                aria-label={isLocked ? `${sec.title} (Bloqueado en combate)` : sec.title}
              >
                {/* Imagen ilustrada del icono sin respaldo emoji */}
                <CachedImage
                  cacheKey={`menu_icon_${sec.manifestKey}`}
                  candidateUrls={candidateUrls}
                  alt={sec.title}
                  loading="eager"
                  fallbackPlaceholder={<></>}
                  className="w-full h-full object-contain p-2 filter brightness-110 contrast-110 pointer-events-none select-none transition-transform duration-300 group-hover:scale-110"
                  style={{ mixBlendMode: 'screen' }}
                />

                {isLocked && (
                  <span
                    className="absolute top-1 right-1 px-1 py-0.5 rounded-md bg-black/85 border border-rose-500/60 text-[10px] leading-none shadow z-30 pointer-events-none"
                    aria-hidden="true"
                  >
                    🔒
                  </span>
                )}

                {isSelected && !isLocked && (
                  <div
                    className="absolute -bottom-1 w-2.5 h-2.5 rounded-full shadow-[0_0_12px_currentColor] z-30 animate-pulse"
                    style={{ backgroundColor: sec.color, color: sec.color }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {(blockedNotice ||
          (activeSection === 'salir' && isExitLockedInCombat) ||
          (activeSection === 'guardar' && isSaveLockedInTournament)) && (
          <div className={`flex-1 max-w-md bg-black/90 border-2 border-rose-500/75 rounded-2xl p-4 shadow-[0_0_35px_rgba(244,63,94,0.45)] ${blurMd} animate-fadeIn`}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 text-rose-300 font-serif font-black text-xs sm:text-sm uppercase tracking-wider">
                <span>🔒</span>
                <span>
                  {blockedNotice?.title ||
                    (activeSection === 'guardar' ? 'Guardado bloqueado en Torneo' : 'Salida bloqueada en combate')}
                </span>
              </div>
              {blockedNotice && (
                <button
                  type="button"
                  onClick={() => setBlockedNotice(null)}
                  className="text-slate-400 hover:text-white text-xs font-mono px-1.5 py-0.5 rounded border border-slate-700 cursor-pointer"
                  aria-label="Cerrar aviso"
                >
                  ✕
                </button>
              )}
            </div>
            <p className="text-xs text-slate-200 font-sans leading-relaxed">
              {blockedNotice?.text || selectedMeta.desc}
            </p>
          </div>
        )}
      </div>

      {/* PIE DE PANTALLA VACÍO Y DESPEJADO */}
      <div className="w-full h-2" />

      {/* SUB-MODAL DE AUDIO Y VOLUMEN */}
      {activeSubModal === 'audio' && (
        <div
          className={`fixed inset-0 z-[160] overflow-y-auto touch-pan-y ${isAndroid ? 'bg-black/85' : `bg-black/75 ${blurSm}`} flex items-center justify-center p-4 animate-fadeIn [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
          onClick={() => setActiveSubModal(null)}
        >
          <div
            className="w-full max-w-md max-h-[90dvh] overflow-y-auto touch-pan-y p-6 rounded-3xl bg-black/90 border border-amber-500/60 shadow-[0_0_50px_rgba(245,158,11,0.5)] flex flex-col items-center space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full">
              <h3 className="font-serif font-black text-lg text-amber-300 uppercase tracking-wider">
                AJUSTES DE AUDIO
              </h3>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="text-slate-400 hover:text-white font-mono text-sm px-2 py-1 rounded-lg border border-slate-700 hover:border-slate-500 cursor-pointer"
              >
                CERRAR
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                type="button"
                onClick={() => {
                  const newMuted = gameAudio.toggleMute();
                  setIsSfxMuted(newMuted);
                }}
                className="py-3 px-3 rounded-2xl bg-black/70 hover:bg-slate-900 text-slate-200 font-serif font-bold text-xs tracking-wider border border-amber-500/40 hover:border-amber-400 transition cursor-pointer text-center"
              >
                SFX: <span className={isSfxMuted ? 'text-rose-400' : 'text-emerald-400'}>{isSfxMuted ? 'Silenciado' : 'Activado'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMusicMuted((prev) => !prev)}
                className="py-3 px-3 rounded-2xl bg-black/70 hover:bg-slate-900 text-slate-200 font-serif font-bold text-xs tracking-wider border border-amber-500/40 hover:border-amber-400 transition cursor-pointer text-center"
              >
                Música: <span className={isMusicMuted ? 'text-rose-400' : 'text-emerald-400'}>{isMusicMuted ? 'Silenciada' : 'Activada'}</span>
              </button>
            </div>

            <div className="w-full bg-slate-950/90 border border-amber-500/30 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-serif font-bold text-amber-300">
                <span>🎵 Volumen de Música:</span>
                <span className="font-mono text-cyan-300">{Math.round(musicVolume * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playCrispClick();
                    setMusicVolume((v) => Math.max(0, Math.round((v - 0.05) * 100) / 100));
                  }}
                  className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-bold flex items-center justify-center hover:bg-slate-800 active:scale-95 transition text-sm"
                >
                  -
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                  className="flex-1 accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playCrispClick();
                    setMusicVolume((v) => Math.min(1, Math.round((v + 0.05) * 100) / 100));
                  }}
                  className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-bold flex items-center justify-center hover:bg-slate-800 active:scale-95 transition text-sm"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL DE PANTALLA Y TEXTO */}
      {activeSubModal === 'pantalla' && (
        <div
          className={`fixed inset-0 z-[160] overflow-y-auto touch-pan-y ${isAndroid ? 'bg-black/85' : `bg-black/75 ${blurSm}`} flex items-center justify-center p-4 animate-fadeIn [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
          onClick={() => setActiveSubModal(null)}
        >
          <div
            className="w-full max-w-md max-h-[90dvh] overflow-y-auto touch-pan-y p-6 rounded-3xl bg-black/90 border border-amber-500/60 shadow-[0_0_50px_rgba(245,158,11,0.5)] flex flex-col items-center space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full">
              <h3 className="font-serif font-black text-lg text-amber-300 uppercase tracking-wider">
                PANTALLA Y TEXTO
              </h3>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="text-slate-400 hover:text-white font-mono text-sm px-2 py-1 rounded-lg border border-slate-700 hover:border-slate-500 cursor-pointer"
              >
                CERRAR
              </button>
            </div>

            <div className="w-full p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-serif font-bold text-amber-300">
                <span>Tamaño de Texto:</span>
                <span className="text-yellow-400 font-mono font-black">{descFontSize}px</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[11, 12, 14].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setDescFontSize(size);
                      gameAudio.playCrispClick();
                    }}
                    className={`py-2 px-2 rounded-xl font-serif font-bold text-xs tracking-wider border transition ${
                      descFontSize === size
                        ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                        : 'bg-black/60 text-slate-400 border-slate-800 hover:text-amber-200'
                    }`}
                  >
                    {size}px
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                gameAudio.playCrispClick();
                toggleAppFullscreen();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-black/70 hover:bg-slate-900 text-amber-300 font-serif font-bold text-xs tracking-wider border border-amber-500/40 hover:border-amber-400 transition cursor-pointer text-center flex items-center justify-center gap-2 active:scale-95 select-none"
            >
              {isFullscreen ? '🗗 Salir de Pantalla Completa' : '⛶ Pantalla Completa'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameMenuModal;
