import React, { useState, useRef } from 'react';
import { gameAudio, isAndroidDevice, useCompactViewport } from './utils';
import { DieData, Orb } from './types';
import { IsometricDieCard } from './IsometricDieCard';
import { getOrbAllCandidateUrls } from './irvbeOrbImages';
import { getDieImageCandidateUrls, getDieImageCacheKey } from './diceImageMap';
import { CachedImage } from './CachedImage';

const MAIN_RAW_BASE = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';
const MAIN_CDN_BASE = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';

export interface DeckPreset {
  name: string;
  dieIds: string[];
}

export interface WorkshopViewProps {
  playerDeck: DieData[];
  setPlayerDeck: React.Dispatch<React.SetStateAction<DieData[]>>;
  orbBank: Orb[];
  setOrbBank: React.Dispatch<React.SetStateAction<Orb[]>>;
  playerLevel: number;
  onClose: () => void;
  checkDeckComplete: (destinationName?: string) => boolean;
  triggerNotification?: (text: string, color?: string) => void;
  descFontSize?: number;
  deckPresets: DeckPreset[];
  activeDeckPresetIndex: number | null;
  saveCurrentDeckToPreset: (presetIdx: number) => void;
  loadDeckFromPreset: (presetIdx: number) => void;
  onClearActivePreset?: () => void;
  fuseDice: (diceIds: string[], targetRarity: 'RARO' | 'EPICO' | 'LEGENDARIO') => void;
  FullscreenWorkshopBackground: React.FC<{ className?: string }>;
}

export const WorkshopView: React.FC<WorkshopViewProps> = ({
  playerDeck,
  setPlayerDeck,
  orbBank,
  setOrbBank,
  playerLevel,
  onClose,
  checkDeckComplete,
  triggerNotification,
  descFontSize = 12,
  deckPresets,
  activeDeckPresetIndex,
  saveCurrentDeckToPreset,
  loadDeckFromPreset,
  onClearActivePreset,
  fuseDice,
  FullscreenWorkshopBackground,
}) => {
  const [workshopTab, setWorkshopTab] = useState<'EQUIPADOS' | 'RESERVA' | 'ORBES' | 'FUSION'>('EQUIPADOS');
  const [isSectionModalOpen, setIsSectionModalOpen] = useState<boolean>(false);
  const isSectionModalOpenRef = useRef<boolean>(false);
  isSectionModalOpenRef.current = isSectionModalOpen;
  const isCompact = useCompactViewport(500, 640);
  const isAndroid = isAndroidDevice();
  const blurMd = isAndroid ? '' : 'backdrop-blur-md';
  const blurSoft = isAndroid ? '' : 'backdrop-blur-[3px]';
  const [workshopRarityFilter, setWorkshopRarityFilter] = useState<'TODOS' | 'CON_RANURAS' | 'NORMAL' | 'RARO' | 'EPICO' | 'LEGENDARIO'>('TODOS');
  const [selectedDieId, setSelectedDieId] = useState<string | null>(null);
  const [fusionTargetRarity, setFusionTargetRarity] = useState<'RARO' | 'EPICO' | 'LEGENDARIO' | null>(null);
  const [selectedFusionDieIds, setSelectedFusionDieIds] = useState<string[]>([]);
  const fusionSubmittingRef = useRef<boolean>(false);
  const selectedDieForOrbs = playerDeck.find((d) => d.id === selectedDieId) ?? null;
  const playerDeckRef = useRef<DieData[]>(playerDeck);
  playerDeckRef.current = playerDeck;
  const orbBankRef = useRef<Orb[]>(orbBank);
  orbBankRef.current = orbBank;

  const getPresetNumbersForDie = (dieId: string): number[] =>
    deckPresets
      .map((preset, idx) => (preset.dieIds && preset.dieIds.includes(dieId) ? idx + 1 : null))
      .filter((num): num is number => num !== null);

  const openFusionSelector = (targetRarity: 'RARO' | 'EPICO' | 'LEGENDARIO') => {
    gameAudio.playConfirmSelect();
    fusionSubmittingRef.current = false;
    setSelectedFusionDieIds([]);
    setFusionTargetRarity(targetRarity);
  };

  const closeFusionSelector = () => {
    fusionSubmittingRef.current = false;
    setFusionTargetRarity(null);
    setSelectedFusionDieIds([]);
  };

  const toggleFusionDieSelection = (dieId: string) => {
    setSelectedFusionDieIds((prev) => {
      if (prev.includes(dieId)) {
        gameAudio.playCrispClick();
        return prev.filter((id) => id !== dieId);
      }
      if (prev.length >= 3) {
        gameAudio.playErrorBuzz();
        if (triggerNotification) {
          triggerNotification('⚠️ Ya seleccionaste 3 dados. Desmarca uno para elegir otro.', '#f59e0b');
        }
        return prev;
      }
      gameAudio.playCrispClick();
      return [...prev, dieId];
    });
  };

  const getRarityWeight = (d: DieData) => {
    const rName = d?.rarity?.name || 'Normal';
    if (rName === 'Legendario') return 4;
    if (rName === 'Épico') return 3;
    if (rName === 'Raro') return 2;
    return 1;
  };

  const filterDiceByRarity = (list: DieData[]) => {
    if (workshopRarityFilter === 'TODOS') return list;
    if (workshopRarityFilter === 'CON_RANURAS') return list.filter((d) => (d?.rarity?.slots || 0) > 0);
    return list.filter((d) => {
      const normalizedName = (d?.rarity?.name || 'Normal')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
      return normalizedName === workshopRarityFilter;
    });
  };

  const activeDice = playerDeck.filter((d) => d.enMazo);
  const reserveDiceList = playerDeck.filter((d) => !d.enMazo);

  const sortedActiveDice = filterDiceByRarity(
    [...activeDice].sort((a, b) => {
      const diffRarity = getRarityWeight(b) - getRarityWeight(a);
      if (diffRarity !== 0) return diffRarity;
      return (b.level || 1) - (a.level || 1) || a.name.localeCompare(b.name);
    })
  );

  const sortedReserveDice = filterDiceByRarity(
    [...reserveDiceList].sort((a, b) => {
      const diffRarity = getRarityWeight(b) - getRarityWeight(a);
      if (diffRarity !== 0) return diffRarity;
      return (b.level || 1) - (a.level || 1) || a.name.localeCompare(b.name);
    })
  );

  const toggleDieInDeck = (dieId: string, addToDeck: boolean) => {
    const currentSnapshot = playerDeckRef.current;
    const currentTarget = currentSnapshot.find((d) => d.id === dieId);
    if (!currentTarget || currentTarget.enMazo === addToDeck) {
      return;
    }

    const activeCount = currentSnapshot.filter((d) => d.enMazo).length;
    if (addToDeck && activeCount >= 24) {
      gameAudio.playErrorBuzz();
      if (triggerNotification) {
        triggerNotification('⚠️ ¡Límite de Mazo Alcanzado (24/24)! Desequipa un dado antes de añadir otro.', '#f59e0b');
      }
      return;
    }

    playerDeckRef.current = currentSnapshot.map((d) =>
      d.id === dieId ? { ...d, enMazo: addToDeck } : d
    );

    setPlayerDeck((prev) => {
      const target = prev.find((d) => d.id === dieId);
      if (!target || target.enMazo === addToDeck) {
        return prev;
      }
      if (addToDeck && prev.filter((d) => d.enMazo).length >= 24) {
        return prev;
      }
      return prev.map((d) => (d.id === dieId ? { ...d, enMazo: addToDeck } : d));
    });
    if (onClearActivePreset) {
      onClearActivePreset();
    }
    gameAudio.playCrispClick();
  };

  const equipSpecificOrbToDie = (dieId: string, orbId: string) => {
    const liveDeck = playerDeckRef.current;
    const liveBank = orbBankRef.current;

    const targetDie = liveDeck.find((d) => d.id === dieId);
    if (!targetDie) return;
    if (targetDie.rarity.slots === 0) {
      if (triggerNotification) triggerNotification('Los dados Normales no tienen ranuras para orbes.', '#ef4444');
      return;
    }
    if (targetDie.attachedOrbs.length >= targetDie.rarity.slots) {
      if (triggerNotification) triggerNotification('Este dado ya tiene todas sus ranuras ocupadas.', '#ef4444');
      return;
    }
    if (targetDie.attachedOrbs.some((o) => o.id === orbId)) {
      return;
    }

    const orbIndex = liveBank.findIndex((o) => o.id === orbId);
    if (orbIndex === -1) {
      return;
    }

    const orbToEquip = liveBank[orbIndex];
    if (orbToEquip.minHeroLevel && playerLevel < orbToEquip.minHeroLevel) {
      if (triggerNotification) {
        triggerNotification(`🔒 Requiere que tu héroe alcance el Nivel ${orbToEquip.minHeroLevel} para poder engarzar el ${orbToEquip.name}.`, '#f59e0b');
      }
      gameAudio.playErrorBuzz();
      return;
    }

    // Actualizar referencias síncronas inmediatamente para bloquear duplicación por doble toque rápido
    orbBankRef.current = liveBank.filter((_, idx) => idx !== orbIndex);
    playerDeckRef.current = liveDeck.map((d) =>
      d.id === dieId ? { ...d, attachedOrbs: [...d.attachedOrbs, orbToEquip] } : d
    );

    setOrbBank((prev) => {
      const idx = prev.findIndex((o) => o.id === orbId);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });

    setPlayerDeck((prev) =>
      prev.map((d) => {
        if (d.id !== dieId) return d;
        if (d.attachedOrbs.length >= d.rarity.slots) return d;
        if (d.attachedOrbs.some((o) => o.id === orbToEquip.id)) return d;
        return { ...d, attachedOrbs: [...d.attachedOrbs, orbToEquip] };
      })
    );
    gameAudio.playConfirmSelect();
  };

  const unequipSpecificOrbFromDie = (dieId: string, orbIndex: number, expectedOrbId?: string) => {
    const liveDeck = playerDeckRef.current;
    const targetDie = liveDeck.find((d) => d.id === dieId);
    if (!targetDie) return;

    const resolvedIdx = expectedOrbId
      ? targetDie.attachedOrbs[orbIndex]?.id === expectedOrbId
        ? orbIndex
        : targetDie.attachedOrbs.findIndex((o) => o.id === expectedOrbId)
      : orbIndex;
    if (resolvedIdx === -1 || !targetDie.attachedOrbs[resolvedIdx]) return;

    const removedOrb = targetDie.attachedOrbs[resolvedIdx];
    if (expectedOrbId && removedOrb.id !== expectedOrbId) return;

    // Actualizar referencias síncronas inmediatamente para impedir devolver copias duplicadas en doble tap
    playerDeckRef.current = liveDeck.map((d) =>
      d.id === dieId
        ? { ...d, attachedOrbs: d.attachedOrbs.filter((_, idx) => idx !== resolvedIdx) }
        : d
    );
    orbBankRef.current =
      removedOrb.id && orbBankRef.current.some((o) => o.id === removedOrb.id)
        ? orbBankRef.current
        : [...orbBankRef.current, removedOrb];

    setPlayerDeck((prev) =>
      prev.map((d) => {
        if (d.id !== dieId) return d;
        const idxToRemove = expectedOrbId
          ? d.attachedOrbs[orbIndex]?.id === expectedOrbId
            ? orbIndex
            : d.attachedOrbs.findIndex((o) => o.id === expectedOrbId)
          : orbIndex;
        if (idxToRemove === -1 || !d.attachedOrbs[idxToRemove]) return d;
        return {
          ...d,
          attachedOrbs: d.attachedOrbs.filter((_, idx) => idx !== idxToRemove),
        };
      })
    );

    setOrbBank((prev) =>
      removedOrb.id && prev.some((o) => o.id === removedOrb.id) ? prev : [...prev, removedOrb]
    );
    gameAudio.playCrispClick();
  };

  const exitIconCandidates = [
    `${MAIN_CDN_BASE}/icono_salir.webp`,
    `${MAIN_RAW_BASE}/icono_salir.webp`,
    './assets/icono_salir.webp',
  ];

  const getWorkshopIconCandidates = (primaryNames: string[]) => {
    const urls: string[] = [];
    primaryNames.forEach((fileBase) => {
      urls.push(
        `${MAIN_CDN_BASE}/${fileBase}.webp`,
        `${MAIN_RAW_BASE}/${fileBase}.webp`
      );
    });
    return urls;
  };

  const workshopSections = [
    {
      id: 'EQUIPADOS' as const,
      title: 'DADOS EQUIPADOS',
      sub: 'Mazo de Batalla Activo',
      color: '#f59e0b',
      badge: `${activeDice.length}/24 Dados`,
      desc: 'Gestiona tus 24 dados equipados para combate, engarza orbes elementales y alterna entre 3 preajustes de mazo.',
      iconCandidates: getWorkshopIconCandidates(['icono_taller_equipados']),
    },
    {
      id: 'RESERVA' as const,
      title: 'INVENTARIO',
      sub: 'Reserva de Dados',
      color: '#38bdf8',
      badge: `${reserveDiceList.length} en Reserva`,
      desc: 'Inspecciona los dados guardados en tu reserva, personaliza sus ranuras y añádelos a tu mazo de batalla.',
      iconCandidates: getWorkshopIconCandidates(['icono_taller_inventario']),
    },
    {
      id: 'ORBES' as const,
      title: 'COFRE DE ORBES',
      sub: 'Reliquias Elementales',
      color: '#a855f7',
      badge: `${orbBank.length} Orbes`,
      desc: 'Revisa los orbes elementales disponibles en tu cofre para imbuir poder arcano en dados Raros, Épicos y Legendarios.',
      iconCandidates: getWorkshopIconCandidates(['icono_taller_orbes']),
    },
    {
      id: 'FUSION' as const,
      title: 'FUSIÓN DE DADOS',
      sub: 'Caldero de Transmutación',
      color: '#ec4899',
      badge: 'Aumentar Rareza',
      desc: 'Transmuta 3 dados de reserva de igual rareza para forjar dados superiores con más ranuras de orbes.',
      iconCandidates: getWorkshopIconCandidates(['icono_taller_fusion']),
    },
  ];

  const selectedSec = workshopSections.find((s) => s.id === workshopTab) || workshopSections[0];

  const openSectionModal = (tabId: typeof workshopTab) => {
    if (isSectionModalOpenRef.current) return;
    isSectionModalOpenRef.current = true;
    gameAudio.playConfirmSelect();
    setFusionTargetRarity(null);
    setSelectedFusionDieIds([]);
    setWorkshopTab(tabId);
    setIsSectionModalOpen(true);
  };

  const closeSectionModal = () => {
    isSectionModalOpenRef.current = false;
    closeFusionSelector();
    setIsSectionModalOpen(false);
  };

  return (
    <div className="absolute inset-0 overflow-hidden select-none bg-black z-20 flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn">
      {/* FONDO OFICIAL PANORÁMICO DEL TALLER DE DADOS */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
        <FullscreenWorkshopBackground />
        <div className="absolute inset-0 bg-radial-vignette from-transparent via-black/25 to-black/75 pointer-events-none" />
      </div>

      {!isSectionModalOpen && (
        <>
          {/* BARRA SUPERIOR ELEGANTE ESTILO CÓDICE */}
          <div className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 pointer-events-auto gap-2">
            <div className={`flex flex-col text-left px-3 py-1.5 rounded-2xl bg-black/85 border border-amber-500/50 shadow-lg ${blurMd}`}>
              <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase drop-shadow">
                TALLER Y GESTIÓN DE DADOS
              </span>
              <div className="flex items-center gap-2">
                <h2
                  className="text-lg sm:text-2xl font-black font-serif tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,1)] uppercase transition-colors"
                  style={{ color: selectedSec.color }}
                >
                  {selectedSec.title}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                gameAudio.playCrispClick();
                if (!checkDeckComplete('salir del taller')) return;
                onClose();
              }}
              className={`flex flex-col items-center justify-center p-1.5 sm:p-2 px-2.5 sm:px-3 rounded-2xl border-0 transition-all duration-300 transform active:scale-95 cursor-pointer group relative ${blurMd} shrink-0`}
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

          {/* CUERPO CENTRAL: 4 ICONOS LUMINOSOS ADAPTABLES EN FILA/COLUMNA SIN RECORTE NI SOLAPAMIENTO */}
          <div
            className="relative z-10 w-full max-w-5xl flex-1 min-h-0 flex flex-row items-center justify-start pointer-events-auto px-2 sm:px-6 my-auto gap-4 overflow-visible"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`${
                isCompact
                  ? 'flex flex-row flex-wrap items-center justify-start gap-3 sm:gap-3.5 max-w-[290px] sm:max-w-sm max-h-full overflow-y-auto touch-pan-y py-3 px-2'
                  : 'flex flex-col items-center justify-center gap-3 sm:gap-4 shrink-0 px-4 sm:px-6 py-4 overflow-visible'
              } [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
            >
              {workshopSections.map((sec) => {
                const isSelected = workshopTab === sec.id;

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={(e) => {
                      if (workshopTab === sec.id || e.detail >= 2) {
                        openSectionModal(sec.id);
                      } else {
                        setWorkshopTab(sec.id);
                        gameAudio.playCrispClick();
                      }
                    }}
                    onPointerEnter={(e) => {
                      if (e.pointerType === 'mouse' && workshopTab !== sec.id) {
                        setWorkshopTab(sec.id);
                        gameAudio.playCrispClick();
                      }
                    }}
                    className={`${
                      isCompact ? 'w-12 h-12 sm:w-14 sm:h-14' : ''
                    } shrink-0 rounded-2xl sm:rounded-3xl border-0 outline-none focus:outline-none flex items-center justify-center p-1.5 sm:p-2 transition-all duration-300 transform active:scale-95 cursor-pointer relative ${
                      isAndroid ? '' : 'backdrop-blur-md'
                    } overflow-visible ${
                      isSelected
                        ? isCompact
                          ? 'scale-110 z-30'
                          : 'scale-115 sm:scale-125 z-30 translate-x-1 sm:translate-x-2'
                        : 'scale-95 sm:scale-100 opacity-90 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{
                      width: isCompact ? undefined : 'clamp(48px, 12vh, 74px)',
                      height: isCompact ? undefined : 'clamp(48px, 12vh, 74px)',
                      backgroundColor: isSelected ? `${sec.color}35` : 'rgba(0, 0, 0, 0.5)',
                      boxShadow: isSelected
                        ? `0 0 35px ${sec.color}, inset 0 0 15px ${sec.color}50`
                        : `0 0 15px ${sec.color}30`,
                    }}
                    aria-label={sec.title}
                  >
                    {/* Resplandor radial contenido en la silueta redondeada sin recortar el icono */}
                    <div
                      className="absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden pointer-events-none transition-opacity duration-300"
                      style={{
                        background: `radial-gradient(circle at center, ${sec.color}65 0%, transparent 80%)`,
                        opacity: isSelected ? 1 : 0.6,
                      }}
                    />

                    <CachedImage
                      cacheKey={`workshop_sec_icon_${sec.id}`}
                      candidateUrls={sec.iconCandidates}
                      alt={sec.title}
                      loading="eager"
                      fallbackPlaceholder={<></>}
                      className="w-full h-full object-contain filter brightness-110 contrast-110 pointer-events-none select-none transition-transform duration-300 relative z-10"
                      style={{
                        mixBlendMode: 'screen',
                      }}
                    />

                    {isSelected && (
                      <div
                        className="absolute -bottom-1 w-2 h-2 rounded-full shadow-[0_0_12px_currentColor] z-20 animate-pulse"
                        style={{ backgroundColor: sec.color, color: sec.color }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PIE DE PANTALLA: PANEL INFORMATIVO CON DESCRIPCIÓN Y ACCESO DIRECTO */}
          <div
            className="relative z-10 w-full max-w-4xl flex items-center justify-center pb-3 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => openSectionModal(selectedSec.id)}
              className={`w-full max-w-lg px-6 py-2.5 rounded-2xl bg-black/85 border border-amber-500/40 hover:border-amber-400 ${blurMd} text-center shadow-2xl animate-fadeIn transition transform active:scale-[0.99] cursor-pointer`}
            >
              <span className="text-xs sm:text-sm font-serif font-black block" style={{ color: selectedSec.color }}>
                {selectedSec.desc}
              </span>
              <span
                className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border"
                style={{
                  color: selectedSec.color,
                  borderColor: `${selectedSec.color}60`,
                  backgroundColor: `${selectedSec.color}18`,
                }}
              >
                <span>{selectedSec.badge}</span>
                <span>• ENTRAR</span>
              </span>
            </button>
          </div>
        </>
      )}

      {/* MODAL DETALLADO DE LA PANTALLA SELECCIONADA DEL TALLER (reutiliza el único fondo del Taller) */}
      {isSectionModalOpen && (
        <div
          className={`fixed inset-0 z-50 overflow-hidden select-none ${isAndroid ? 'bg-black/75' : `bg-black/60 ${blurSoft}`} flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn`}
          onClick={closeSectionModal}
        >

          {/* Barra superior dentro del catálogo del Taller */}
          <div
            className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 mb-2 pointer-events-auto gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex flex-col text-left px-3 py-1.5 rounded-2xl bg-black/85 border border-amber-500/50 shadow-lg ${blurMd}`}>
              <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase drop-shadow">
                TALLER Y GESTIÓN DE DADOS
              </span>
              <h2
                className="text-lg sm:text-2xl font-black font-serif tracking-wider drop-shadow uppercase"
                style={{ color: selectedSec.color }}
              >
                {selectedSec.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                gameAudio.playCrispClick();
                closeSectionModal();
              }}
              className={`flex flex-col items-center justify-center p-1.5 sm:p-2 px-2.5 sm:px-3 rounded-2xl border-0 transition-all duration-300 transform active:scale-95 cursor-pointer group relative ${blurMd} shrink-0`}
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

          {/* Contenedor central translúcido de gestión */}
          <div
            className="relative z-10 w-full max-w-5xl flex-1 min-h-0 flex flex-col justify-start pointer-events-auto my-auto overflow-y-auto touch-pan-y px-1 sm:px-3 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            onClick={(e) => e.stopPropagation()}
          >

            {/* PREAJUSTES DE MAZOS (DECK PRESETS 1, 2 Y 3) */}
            {workshopTab === 'EQUIPADOS' && (
              <div className={`mb-4 p-3 bg-black/80 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner ${blurMd}`}>
                <div className="flex items-center gap-2">
                  <span className="text-base">🗂️</span>
                  <div>
                    <span className="text-xs font-serif font-bold text-amber-300 block">
                      PREAJUSTES DE MAZO (DECK PRESETS)
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans">
                      Guarda hasta 3 configuraciones de 24 dados y altérnalas al instante.
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
                  {(() => {
                    const activeDieIdSet = new Set(activeDice.map((d) => d.id));
                    return deckPresets.map((preset, pIdx) => {
                      const hasSavedData = Boolean(preset.dieIds && preset.dieIds.length > 0);
                      const presetSet = new Set(preset.dieIds || []);
                      const matchesCurrentDeck =
                        hasSavedData &&
                        presetSet.size === activeDieIdSet.size &&
                        (preset.dieIds || []).every((id) => activeDieIdSet.has(id));
                      const isLoaded = activeDeckPresetIndex === pIdx && matchesCurrentDeck;
                      return (
                        <div key={pIdx} className="flex items-center gap-1 bg-black/80 p-1 rounded-xl border border-slate-800">
                          <button
                            type="button"
                            onClick={() => loadDeckFromPreset(pIdx)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-serif font-black transition ${
                              isLoaded
                                ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.7)]'
                                : hasSavedData
                                ? 'bg-slate-800 text-amber-300 hover:bg-slate-700'
                                : 'bg-slate-900 text-slate-500'
                            }`}
                          >
                            #{pIdx + 1} {hasSavedData ? '✓' : '(Vacío)'}
                          </button>
                          <button
                            type="button"
                            onClick={() => saveCurrentDeckToPreset(pIdx)}
                            className="px-1.5 py-1 rounded-lg bg-black hover:bg-slate-800 text-cyan-300 text-[9px] font-mono border border-cyan-500/40"
                          >
                            GUARDAR
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* VISTA 1: DADOS EQUIPADOS */}
            {workshopTab === 'EQUIPADOS' && (
              <div>
                <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 p-3 rounded-2xl bg-black/80 border border-amber-500/40 ${blurMd}`}>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold font-serif text-amber-300">
                      DADOS EN MAZO DE BATALLA ACTIVO (ORGANIZADOS POR RAREZA)
                    </h4>
                    <p className="text-[11px] text-slate-300 font-sans">
                      Ordenados por jerarquía: Legendarios, Épicos, Raros y Normales. Toca un dado para engarzar orbes.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap items-center gap-1 bg-black/80 p-1 rounded-xl border border-slate-800 text-[10px] font-serif">
                      {(['TODOS', 'CON_RANURAS', 'LEGENDARIO', 'EPICO', 'RARO', 'NORMAL'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            gameAudio.playCrispClick();
                            setWorkshopRarityFilter(r);
                          }}
                          className={`px-2 py-0.5 rounded-lg font-bold transition ${
                            workshopRarityFilter === r
                              ? 'bg-amber-500 text-black shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {r === 'TODOS' ? 'Todos' : r === 'CON_RANURAS' ? 'Con Ranuras' : r === 'LEGENDARIO' ? 'Legendario' : r === 'EPICO' ? 'Épico' : r === 'RARO' ? 'Raro' : 'Normal'}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-500/40 shrink-0">
                      {activeDice.length} / 24 DADOS
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mb-4">
                  {sortedActiveDice.map((die) => (
                    <IsometricDieCard
                      key={die.id}
                      die={die}
                      isSelected={selectedDieId === die.id}
                      onClick={() => setSelectedDieId(die.id)}
                      onAction={() => toggleDieInDeck(die.id, false)}
                      actionLabel="✕ Retirar del Mazo"
                      actionClass="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-600/50"
                    />
                  ))}
                </div>

                {sortedActiveDice.length === 0 && (
                  <div className={`p-8 text-center bg-black/75 rounded-2xl border border-slate-800 text-slate-300 font-serif ${blurMd}`}>
                    {activeDice.length === 0
                      ? 'No tienes dados equipados en tu mazo. Pasa a la pestaña "Inventario" para equipar.'
                      : 'Ningún dado equipado coincide con el filtro seleccionado. Elige "Todos" para ver la lista completa.'}
                  </div>
                )}
              </div>
            )}

            {/* VISTA 2: DADOS EN INVENTARIO (RESERVA) */}
            {workshopTab === 'RESERVA' && (
              <div>
                <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 p-3 rounded-2xl bg-black/80 border border-cyan-500/40 ${blurMd}`}>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold font-serif text-cyan-300">
                      DADOS GUARDADOS EN TU INVENTARIO DE RESERVA
                    </h4>
                    <p className="text-[11px] text-slate-300 font-sans">
                      Ordenados por jerarquía: Legendarios, Épicos, Raros y Normales. Toca "+ Añadir al Mazo" para equipar.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap items-center gap-1 bg-black/80 p-1 rounded-xl border border-slate-800 text-[10px] font-serif">
                      {(['TODOS', 'CON_RANURAS', 'LEGENDARIO', 'EPICO', 'RARO', 'NORMAL'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            gameAudio.playCrispClick();
                            setWorkshopRarityFilter(r);
                          }}
                          className={`px-2 py-0.5 rounded-lg font-bold transition ${
                            workshopRarityFilter === r
                              ? 'bg-cyan-500 text-black shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {r === 'TODOS' ? 'Todos' : r === 'CON_RANURAS' ? 'Con Ranuras' : r === 'LEGENDARIO' ? 'Legendario' : r === 'EPICO' ? 'Épico' : r === 'RARO' ? 'Raro' : 'Normal'}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-500/40 shrink-0">
                      {reserveDiceList.length} Dados
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mb-4">
                  {sortedReserveDice.map((die) => (
                    <IsometricDieCard
                      key={die.id}
                      die={die}
                      isSelected={selectedDieId === die.id}
                      onClick={() => setSelectedDieId(die.id)}
                      onAction={() => toggleDieInDeck(die.id, true)}
                      actionLabel="+ Añadir al Mazo"
                      actionClass="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-600/50"
                    />
                  ))}
                </div>

                {sortedReserveDice.length === 0 && (
                  <div className={`p-8 text-center bg-black/75 rounded-2xl border border-slate-800 text-slate-300 font-serif ${blurMd}`}>
                    {reserveDiceList.length === 0
                      ? 'Tu inventario de reserva está vacío. Forja nuevos dados en la Fragua o cómpralos en el Bazar de Solomon.'
                      : 'Ningún dado en reserva coincide con el filtro seleccionado. Elige "Todos" para ver la lista completa.'}
                  </div>
                )}
              </div>
            )}

            {/* VISTA 3: ORBES EN POSESIÓN */}
            {workshopTab === 'ORBES' && (
              <div>
                <div className={`flex items-center justify-between mb-3 p-3 rounded-2xl bg-black/80 border border-purple-500/40 ${blurMd}`}>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold font-serif text-purple-300">
                      COFRE DE ORBES ELEMENTALES DISPONIBLES
                    </h4>
                    <p className="text-[11px] text-slate-300 font-sans">
                      Orbes que tienes en tu poder listos para ser engarzados en las ranuras de tus dados.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-400 bg-purple-950/60 px-2.5 py-1 rounded-full border border-purple-500/40 shrink-0">
                    {orbBank.length} Orbes
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mb-4">
                  {orbBank.map((orb, orbIdx) => {
                    const candidateUrls = getOrbAllCandidateUrls(orb.name, orb.element, orb.id);
                    return (
                      <div
                        key={orb.id || orbIdx}
                        className={`p-3.5 rounded-2xl bg-black/85 border border-purple-500/40 flex flex-col justify-between shadow-lg hover:border-amber-400 transition ${blurMd}`}
                      >
                        <div>
                          <div className="w-full h-28 rounded-xl bg-slate-950/80 border border-slate-800/80 overflow-hidden relative mb-2 flex items-center justify-center">
                            <CachedImage
                              cacheKey={`workshop_bank_orb_${orb.id || orb.name}`}
                              candidateUrls={candidateUrls}
                              alt={orb.name}
                              className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                            />
                            <span className="text-[9.5px] px-2 py-0.5 rounded-full font-serif font-bold bg-purple-950/80 text-purple-300 border border-purple-500/50 absolute top-2 right-2">
                              {orb.element}
                            </span>
                          </div>
                          <span className="font-serif font-bold text-xs sm:text-sm text-slate-100 truncate block mb-1">
                            {orb.name}
                          </span>
                          <p
                            style={{ fontSize: `${descFontSize}px` }}
                            className="text-[11px] text-cyan-300 font-sans leading-snug mb-2"
                          >
                            {orb.effect}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-serif font-bold">
                          <span className="text-emerald-400">+{orb.bonusHp || 0} HP Máx</span>
                          <span className="text-rose-400">+{orb.bonusAtk || 0} ATK</span>
                          <span className="text-[10px] text-purple-300 font-mono">Disponible</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {orbBank.length === 0 && (
                  <div className={`p-8 text-center bg-black/75 rounded-2xl border border-slate-800 text-slate-300 font-serif ${blurMd}`}>
                    No tienes orbes en tu inventario. Cristalízalos en la Fragua o cómpralos en el Bazar.
                  </div>
                )}
              </div>
            )}

            {/* VISTA 4: FUSIÓN DE DADOS */}
            {workshopTab === 'FUSION' && (() => {
              const normalDiceInReserve = playerDeck.filter((d) => !d.enMazo && d.rarity.name === 'Normal');
              const canFuseNormal = normalDiceInReserve.length >= 3;

              const rareDiceInReserve = playerDeck.filter((d) => !d.enMazo && d.rarity.name === 'Raro');
              const canFuseRare = rareDiceInReserve.length >= 3;

              const epicDiceInReserve = playerDeck.filter((d) => !d.enMazo && d.rarity.name === 'Épico');
              const canFuseEpic = epicDiceInReserve.length >= 3;

              const resultUrlsRare = getDieImageCandidateUrls('Dado Raro', 'dado_raro', 'Raro');
              const resultUrlsEpic = getDieImageCandidateUrls('Dado Épico', 'dado_epico', 'Épico');
              const resultUrlsLegendary = getDieImageCandidateUrls('Dado Legendario', 'dado_legendario', 'Legendario');

              return (
                <div>
                  <div className={`flex items-center justify-between mb-3 p-3 rounded-2xl bg-black/80 border border-fuchsia-500/40 ${blurMd}`}>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold font-serif text-fuchsia-300">
                        CALDERO DE TRANSMUTACIÓN Y AUMENTO DE RAREZA
                      </h4>
                      <p className="text-[11px] text-slate-300 font-sans">
                        Los dados no tienen nivel: cualquier dado puede invocar criaturas del 1 al 6 según tu tirada. Al transmutar <strong>3 dados de igual categoría</strong> aumentas su rareza para <strong>desbloquear más ranuras de orbes elementales</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-4">
                    {/* TRANSMUTACIÓN 1: 3 NORMALES -> 1 RARO (1 RANURA) */}
                    <div
                      className={`p-3.5 rounded-2xl border flex flex-col justify-between transition ${blurMd} ${
                        canFuseNormal
                          ? 'bg-fuchsia-950/60 border-fuchsia-500/80 shadow-[0_0_20px_rgba(236,72,153,0.3)]'
                          : 'bg-black/75 border-slate-800 opacity-70'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-serif font-black text-xs sm:text-sm text-slate-100">
                            Dados Normales
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                              canFuseNormal
                                ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/50'
                                : 'bg-slate-900 text-slate-500 border-slate-800'
                            }`}
                          >
                            {normalDiceInReserve.length} / 3 dados
                          </span>
                        </div>

                        <div className="w-full h-32 rounded-xl bg-slate-950/80 border border-cyan-500/40 overflow-hidden relative mb-2.5 flex items-center justify-center p-1.5 shadow-inner">
                          <CachedImage
                            cacheKey="workshop_fuse_rare"
                            candidateUrls={resultUrlsRare}
                            alt="Dado Raro"
                            className="w-full h-full object-cover filter drop-shadow-[0_0_12px_rgba(56,189,248,0.5)] transition transform hover:scale-105"
                          />
                          <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded text-[9px] font-bold font-serif bg-black/85 text-cyan-300 border border-cyan-500/50">
                            RARO
                          </span>
                          <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[8.5px] font-mono bg-black/85 text-fuchsia-300 border border-fuchsia-500/40">
                            💎 1 Ranura de Orbe
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-300 font-sans leading-tight mb-3">
                          Transmuta 3 Dados Normales para forjar un <strong className="text-cyan-300">Dado Raro</strong> y desbloquear <strong className="text-amber-300">1 ranura de orbe</strong>.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={!canFuseNormal}
                        onClick={() => {
                          if (!canFuseNormal) return;
                          openFusionSelector('RARO');
                        }}
                        className={`w-full py-2 px-3 rounded-full font-serif font-black text-xs tracking-wider border shadow transition transform active:scale-95 ${
                          canFuseNormal
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-cyan-300 cursor-pointer shadow-[0_0_15px_rgba(56,189,248,0.7)]'
                            : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                        }`}
                      >
                        {canFuseNormal ? 'ELEGIR 3 Y FORJAR RARO' : 'Faltan dados normales'}
                      </button>
                    </div>

                    {/* TRANSMUTACIÓN 2: 3 RAROS -> 1 ÉPICO (2 RANURAS) */}
                    <div
                      className={`p-3.5 rounded-2xl border flex flex-col justify-between transition ${blurMd} ${
                        canFuseRare
                          ? 'bg-purple-950/60 border-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                          : 'bg-black/75 border-slate-800 opacity-70'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-serif font-black text-xs sm:text-sm text-slate-100">
                            Dados Raros
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                              canFuseRare
                                ? 'bg-purple-500/20 text-purple-300 border-purple-400/50'
                                : 'bg-slate-900 text-slate-500 border-slate-800'
                            }`}
                          >
                            {rareDiceInReserve.length} / 3 dados
                          </span>
                        </div>

                        <div className="w-full h-32 rounded-xl bg-slate-950/80 border border-purple-500/40 overflow-hidden relative mb-2.5 flex items-center justify-center p-1.5 shadow-inner">
                          <CachedImage
                            cacheKey="workshop_fuse_epic"
                            candidateUrls={resultUrlsEpic}
                            alt="Dado Épico"
                            className="w-full h-full object-cover filter drop-shadow-[0_0_12px_rgba(192,132,252,0.5)] transition transform hover:scale-105"
                          />
                          <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded text-[9px] font-bold font-serif bg-black/85 text-purple-300 border border-purple-500/50">
                            ÉPICO
                          </span>
                          <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[8.5px] font-mono bg-black/85 text-purple-300 border border-purple-500/40">
                            💎 2 Ranuras de Orbes
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-300 font-sans leading-tight mb-3">
                          Transmuta 3 Dados Raros para forjar un <strong className="text-purple-300">Dado Épico</strong> y desbloquear <strong className="text-amber-300">2 ranuras de orbes</strong>.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={!canFuseRare}
                        onClick={() => {
                          if (!canFuseRare) return;
                          openFusionSelector('EPICO');
                        }}
                        className={`w-full py-2 px-3 rounded-full font-serif font-black text-xs tracking-wider border shadow transition transform active:scale-95 ${
                          canFuseRare
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-purple-300 cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.7)]'
                            : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                        }`}
                      >
                        {canFuseRare ? 'ELEGIR 3 Y FORJAR ÉPICO' : 'Faltan dados raros'}
                      </button>
                    </div>

                    {/* TRANSMUTACIÓN 3: 3 ÉPICOS -> 1 LEGENDARIO (3 RANURAS) */}
                    <div
                      className={`p-3.5 rounded-2xl border flex flex-col justify-between transition ${blurMd} ${
                        canFuseEpic
                          ? 'bg-amber-950/60 border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                          : 'bg-black/75 border-slate-800 opacity-70'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-serif font-black text-xs sm:text-sm text-slate-100">
                            Dados Épicos
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                              canFuseEpic
                                ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                                : 'bg-slate-900 text-slate-500 border-slate-800'
                            }`}
                          >
                            {epicDiceInReserve.length} / 3 dados
                          </span>
                        </div>

                        <div className="w-full h-32 rounded-xl bg-slate-950/80 border border-amber-500/40 overflow-hidden relative mb-2.5 flex items-center justify-center p-1.5 shadow-inner">
                          <CachedImage
                            cacheKey="workshop_fuse_legendary"
                            candidateUrls={resultUrlsLegendary}
                            alt="Dado Legendario"
                            className="w-full h-full object-cover filter drop-shadow-[0_0_12px_rgba(245,158,11,0.5)] transition transform hover:scale-105"
                          />
                          <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded text-[9px] font-bold font-serif bg-black/85 text-amber-300 border border-amber-500/50">
                            LEGENDARIO
                          </span>
                          <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[8.5px] font-mono bg-black/85 text-amber-300 border border-amber-500/40">
                            💎 3 Ranuras de Orbes
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-300 font-sans leading-tight mb-3">
                          Transmuta 3 Dados Épicos para forjar un <strong className="text-amber-300">Dado Legendario</strong> con <strong className="text-amber-300">3 ranuras de orbes</strong>.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={!canFuseEpic}
                        onClick={() => {
                          if (!canFuseEpic) return;
                          openFusionSelector('LEGENDARIO');
                        }}
                        className={`w-full py-2 px-3 rounded-full font-serif font-black text-xs tracking-wider border shadow transition transform active:scale-95 ${
                          canFuseEpic
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black border-amber-200 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.7)]'
                            : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                        }`}
                      >
                        {canFuseEpic ? 'ELEGIR 3 Y FORJAR LEGENDARIO' : 'Faltan dados épicos'}
                      </button>
                    </div>
                  </div>

                  {reserveDiceList.length === 0 && (
                    <div className={`p-8 text-center bg-black/75 rounded-2xl border border-slate-800 text-slate-300 font-serif ${blurMd}`}>
                      No tienes dados en tu reserva para transmutar. Retira dados del mazo activo o adquiere dados en la tienda.
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL DE SELECCIÓN MANUAL DE LOS 3 DADOS PARA FUSIÓN CON AVISOS DE ORBES Y PRESETS */}
      {isSectionModalOpen && workshopTab === 'FUSION' && fusionTargetRarity && (() => {
        const sourceRarityName =
          fusionTargetRarity === 'RARO'
            ? 'Normal'
            : fusionTargetRarity === 'EPICO'
            ? 'Raro'
            : 'Épico';
        const targetLabel =
          fusionTargetRarity === 'RARO'
            ? 'Dado Raro (1 Ranura)'
            : fusionTargetRarity === 'EPICO'
            ? 'Dado Épico (2 Ranuras)'
            : 'Dado Legendario (3 Ranuras)';
        const accentHex =
          fusionTargetRarity === 'LEGENDARIO'
            ? '#f59e0b'
            : fusionTargetRarity === 'EPICO'
            ? '#c084fc'
            : '#38bdf8';

        const eligibleDice = playerDeck
          .filter((d) => !d.enMazo && (d.rarity?.name || 'Normal') === sourceRarityName)
          .sort((a, b) => {
            const aOrbs = a.attachedOrbs?.length || 0;
            const bOrbs = b.attachedOrbs?.length || 0;
            const aPresets = getPresetNumbersForDie(a.id).length;
            const bPresets = getPresetNumbersForDie(b.id).length;
            const aRisk = (aOrbs > 0 ? 4 : 0) + (aPresets > 0 ? 2 : 0) + ((a.bonusHp || 0) > 0 || (a.bonusAtk || 0) > 0 ? 1 : 0);
            const bRisk = (bOrbs > 0 ? 4 : 0) + (bPresets > 0 ? 2 : 0) + ((b.bonusHp || 0) > 0 || (b.bonusAtk || 0) > 0 ? 1 : 0);
            if (aRisk !== bRisk) return aRisk - bRisk;
            return a.name.localeCompare(b.name);
          });

        const eligibleIdSet = new Set(eligibleDice.map((d) => d.id));
        const validSelectedIds = selectedFusionDieIds.filter((id) => eligibleIdSet.has(id));
        const selectedDiceObjs = eligibleDice.filter((d) => validSelectedIds.includes(d.id));

        const selectedOrbs = selectedDiceObjs.flatMap((d) => d.attachedOrbs || []);
        const diceWithOrbsCount = selectedDiceObjs.filter((d) => (d.attachedOrbs?.length || 0) > 0).length;
        const affectedPresetSet = new Set<number>();
        const diceInPresetsCount = selectedDiceObjs.filter((d) => {
          const pNums = getPresetNumbersForDie(d.id);
          pNums.forEach((n) => affectedPresetSet.add(n));
          return pNums.length > 0;
        }).length;
        const affectedPresetsSorted = Array.from(affectedPresetSet).sort((a, b) => a - b);
        const hasCatalystDice = selectedDiceObjs.some((d) => (d.bonusHp || 0) > 0 || (d.bonusAtk || 0) > 0);
        const canConfirmFusion = validSelectedIds.length === 3;

        const safeDiceOnly = eligibleDice.filter(
          (d) =>
            (d.attachedOrbs?.length || 0) === 0 &&
            getPresetNumbersForDie(d.id).length === 0 &&
            (d.bonusHp || 0) === 0 &&
            (d.bonusAtk || 0) === 0
        );

        return (
          <div
            className={`fixed inset-0 bg-black/90 z-[75] overflow-hidden p-2 sm:p-4 md:p-6 flex items-center justify-center ${blurMd} animate-fadeIn`}
            onClick={closeFusionSelector}
          >
            <div
              className={`w-full max-w-2xl bg-black/95 border-2 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-2xl text-slate-200 ${blurMd} max-h-[92dvh] flex flex-col pointer-events-auto relative z-10`}
              style={{
                borderColor: `${accentHex}99`,
                boxShadow: `0 0 45px ${accentHex}40`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabecera del selector */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5 mb-2.5 shrink-0">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest block" style={{ color: accentHex }}>
                    SELECCIÓN DE SACRIFICIO PARA TRANSMUTACIÓN
                  </span>
                  <h3 className="text-sm sm:text-base font-black font-serif text-white truncate">
                    Elige 3 Dados {sourceRarityName} {'->'} {targetLabel}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playCrispClick();
                    closeFusionSelector();
                  }}
                  className="px-3 py-1 rounded-full bg-black/80 hover:bg-rose-950 text-rose-300 font-serif font-bold text-[10px] sm:text-xs border border-rose-500/70 transition shrink-0 active:scale-95 cursor-pointer"
                >
                  ✕ Cancelar
                </button>
              </div>

              {/* Barra de estado y atajos rápidos */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 px-2.5 py-2 rounded-xl bg-slate-950/90 border border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                      canConfirmFusion
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    Seleccionados: {validSelectedIds.length} / 3
                  </span>
                  <span className="text-[10px] text-slate-400 font-sans hidden sm:inline">
                    Toca los dados que deseas sacrificar en el caldero.
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {safeDiceOnly.length >= 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        gameAudio.playConfirmSelect();
                        setSelectedFusionDieIds(safeDiceOnly.slice(0, 3).map((d) => d.id));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 text-[10px] font-serif font-bold transition cursor-pointer active:scale-95"
                    >
                      ✓ Elegir 3 sin orbes/preajuste
                    </button>
                  )}
                  {validSelectedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        gameAudio.playCrispClick();
                        setSelectedFusionDieIds([]);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-serif font-bold transition cursor-pointer active:scale-95"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* Lista desplazable de dados elegibles en reserva */}
              <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y pr-1 space-y-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {eligibleDice.length < 3 ? (
                  <div className="p-6 text-center rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 text-xs font-serif">
                    Ya no tienes suficientes dados de rareza {sourceRarityName} en reserva para realizar esta fusión.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {eligibleDice.map((die) => {
                      const selIdx = validSelectedIds.indexOf(die.id);
                      const isPicked = selIdx !== -1;
                      const presetNums = getPresetNumbersForDie(die.id);
                      const hasOrbs = (die.attachedOrbs?.length || 0) > 0;
                      const hasCatalyst = (die.bonusHp || 0) > 0 || (die.bonusAtk || 0) > 0;
                      const candidateUrls = getDieImageCandidateUrls(die.name, die.id, die.rarity?.name);

                      return (
                        <button
                          key={die.id}
                          type="button"
                          onClick={() => toggleFusionDieSelection(die.id)}
                          className={`w-full text-left p-2.5 rounded-xl border-2 transition flex items-center gap-2.5 cursor-pointer active:scale-[0.99] ${
                            isPicked
                              ? 'bg-amber-950/45 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                              : 'bg-slate-950/85 border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-lg bg-black/90 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                            <CachedImage
                              cacheKey={getDieImageCacheKey(die.name, die.id, die.rarity?.name)}
                              candidateUrls={candidateUrls}
                              alt={die.name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="font-serif font-black text-xs text-white truncate">
                                {die.name}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded-md text-[9.5px] font-mono font-bold border shrink-0 ${
                                  isPicked
                                    ? 'bg-amber-400 text-black border-amber-200'
                                    : 'bg-black/70 text-slate-400 border-slate-700'
                                }`}
                              >
                                {isPicked ? `✓ #${selIdx + 1}` : 'Elegir'}
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap gap-1">
                              {hasOrbs && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-sans font-bold bg-purple-950/90 text-purple-200 border border-purple-500/60">
                                  💎 {die.attachedOrbs.length} Orbe{die.attachedOrbs.length > 1 ? 's' : ''}: {die.attachedOrbs.map((o) => o.name.replace('Orbe de ', '')).join(', ')}
                                </span>
                              )}
                              {presetNums.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-950/90 text-cyan-200 border border-cyan-500/60">
                                  🗂️ Preajuste {presetNums.map((n) => `#${n}`).join(', ')}
                                </span>
                              )}
                              {hasCatalyst && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-orange-950/90 text-orange-200 border border-orange-500/60">
                                  ⚒️ +{die.bonusHp || 0}HP/+{die.bonusAtk || 0}ATK
                                </span>
                              )}
                              {!hasOrbs && presetNums.length === 0 && !hasCatalyst && (
                                <span className="text-[9.5px] text-emerald-400/90 font-sans">
                                  ✓ Sin orbes ni preajustes asociados
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Avisos dinámicos si alguno de los dados elegidos tiene orbes, pertenece a un DeckPreset o tiene catalizador */}
              {(selectedOrbs.length > 0 || affectedPresetsSorted.length > 0 || hasCatalystDice) && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/60 space-y-1 text-[10.5px] font-sans shrink-0">
                  {selectedOrbs.length > 0 && (
                    <p className="text-purple-200 leading-snug">
                      <strong>💎 Aviso de Orbes ({diceWithOrbsCount} {diceWithOrbsCount === 1 ? 'dado' : 'dados'}):</strong>{' '}
                      Se desengarzarán <strong>{selectedOrbs.length}</strong> orbe(s) ({selectedOrbs.map((o) => o.name).join(', ')}) y volverán automáticamente a tu Cofre de Orbes.
                    </p>
                  )}
                  {affectedPresetsSorted.length > 0 && (
                    <p className="text-cyan-200 leading-snug">
                      <strong>🗂️ Aviso de Preajustes ({diceInPresetsCount} {diceInPresetsCount === 1 ? 'dado' : 'dados'}):</strong>{' '}
                      Pertenecen al {affectedPresetsSorted.length === 1 ? 'Preajuste guardado' : 'los Preajustes guardados'}{' '}
                      <strong>{affectedPresetsSorted.map((n) => `#${n}`).join(', ')}</strong>. Al sacrificarlos, ese mazo guardado quedará incompleto y deberá autocompletarse con otros dados al cargarlo.
                    </p>
                  )}
                  {hasCatalystDice && (
                    <p className="text-orange-200 leading-snug">
                      <strong>⚒️ Aviso de Forja:</strong> Uno o más dados elegidos tienen bonos permanentes de catalizador (+HP/+ATK) que se perderán al transmutarlos.
                    </p>
                  )}
                </div>
              )}

              {/* Pie de confirmación */}
              <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playCrispClick();
                    closeFusionSelector();
                  }}
                  className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-serif font-bold text-xs transition cursor-pointer active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!canConfirmFusion}
                  onClick={() => {
                    if (!canConfirmFusion || !fusionTargetRarity || fusionSubmittingRef.current) return;
                    fusionSubmittingRef.current = true;
                    if (selectedDieId && validSelectedIds.includes(selectedDieId)) {
                      setSelectedDieId(null);
                    }
                    fuseDice(validSelectedIds, fusionTargetRarity);
                    closeFusionSelector();
                  }}
                  className={`px-5 py-2 rounded-full font-serif font-black text-xs tracking-wider border transition transform active:scale-95 ${
                    canConfirmFusion
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black border-amber-200 cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.65)]'
                      : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                  }`}
                >
                  {canConfirmFusion
                    ? `CONFIRMAR FUSIÓN (${validSelectedIds.length}/3)`
                    : `ELIGE 3 DADOS (${validSelectedIds.length}/3)`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL DE PERSONALIZACIÓN Y ENGARCE DE ORBES AL INSPECCIONAR DADO (reutiliza el único fondo del Taller con overlay oscuro) */}
      {selectedDieForOrbs && (
        <div
          className={`fixed inset-0 ${isAndroid ? 'bg-black/95' : `bg-black/85 ${blurMd}`} z-[75] overflow-y-auto touch-pan-y p-2 sm:p-4 md:p-6 flex flex-col items-center justify-start sm:justify-center animate-fadeIn`}
          onClick={() => setSelectedDieId(null)}
        >
          <div
            className={`my-auto w-full max-w-md bg-black/95 border-2 border-amber-500/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-[0_0_50px_rgba(245,158,11,0.4)] text-slate-200 ${blurMd} max-h-[92dvh] flex flex-col pointer-events-auto relative z-10`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-amber-500/30 pb-2 mb-2.5 shrink-0">
              <div className="min-w-0 pr-2">
                <h3 className="text-sm sm:text-base font-black font-serif text-amber-300 truncate">
                  {selectedDieForOrbs.name}
                </h3>
                <span className={`text-[10px] sm:text-xs font-serif font-bold ${selectedDieForOrbs.rarity.class}`}>
                  Rareza: {selectedDieForOrbs.rarity.name} ({selectedDieForOrbs.rarity.slots} {selectedDieForOrbs.rarity.slots === 1 ? 'ranura' : 'ranuras'})
                </span>
              </div>
              <button
                onClick={() => setSelectedDieId(null)}
                className="px-3 py-1 rounded-full bg-black/80 hover:bg-rose-950 text-rose-300 font-serif font-bold text-[10px] sm:text-xs border border-rose-500/70 transition shrink-0 active:scale-95"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y pr-1 space-y-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex items-center justify-center p-2.5 rounded-2xl bg-black/60 border border-amber-500/30">
                <div className="flex items-center gap-3">
                  {(() => {
                    const inspectCandidateUrls = getDieImageCandidateUrls(
                      selectedDieForOrbs.name,
                      selectedDieForOrbs.id,
                      selectedDieForOrbs.rarity?.name
                    );
                    return (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black/90 border-2 border-amber-400 overflow-hidden flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                        <CachedImage
                          cacheKey={getDieImageCacheKey(selectedDieForOrbs.name, selectedDieForOrbs.id, selectedDieForOrbs.rarity?.name)}
                          candidateUrls={inspectCandidateUrls}
                          alt={selectedDieForOrbs.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    );
                  })()}
                  <div>
                    <span className="text-[11px] sm:text-xs font-mono font-bold text-amber-300 block">
                      Rareza: {selectedDieForOrbs.rarity.name}
                    </span>
                    <span className="text-[10px] text-slate-300 font-sans">
                      {selectedDieForOrbs.rarity.slots} {selectedDieForOrbs.rarity.slots === 1 ? 'ranura de engarce disponible' : 'ranuras de engarce disponibles'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] font-serif font-bold text-amber-300">
                    Ranuras de Orbes: {selectedDieForOrbs.attachedOrbs.length} / {selectedDieForOrbs.rarity.slots}
                  </span>
                  {selectedDieForOrbs.rarity.slots === 0 && (
                    <span className="text-[9.5px] text-slate-500 font-sans">Los dados Normales no admiten orbes</span>
                  )}
                </div>

                {selectedDieForOrbs.rarity.slots > 0 ? (
                  <div className="space-y-1.5">
                    {Array.from({ length: selectedDieForOrbs.rarity.slots }).map((_, slotIdx) => {
                      const equipped = selectedDieForOrbs.attachedOrbs[slotIdx];
                      return (
                        <div
                          key={slotIdx}
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                            equipped
                              ? 'bg-black/90 border-amber-500/70 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                              : 'bg-black/40 border-dashed border-slate-700 text-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-1">
                            <span className="w-5 h-5 rounded-full bg-black border border-amber-500/40 flex items-center justify-center text-[9px] font-bold text-amber-400 shrink-0">
                              #{slotIdx + 1}
                            </span>
                            {equipped ? (
                              <div className="min-w-0">
                                <div className="truncate">
                                  <span className="font-serif font-bold text-amber-300 text-[11px]">{equipped.name}</span>
                                  <span className="text-[9px] text-purple-400 ml-1">({equipped.element})</span>
                                </div>
                                <div className="text-[9.5px] text-cyan-300 font-sans leading-tight">{equipped.effect}</div>
                              </div>
                            ) : (
                              <span className="italic text-slate-500 font-sans text-[10px]">Ranura vacía</span>
                            )}
                          </div>

                          {equipped && (
                            <button
                              onClick={() => unequipSpecificOrbFromDie(selectedDieForOrbs.id, slotIdx, equipped.id)}
                              className="px-2.5 py-1 rounded-full bg-black/80 hover:bg-rose-950 text-rose-300 font-serif font-bold text-[9.5px] border border-rose-500/70 shadow transition shrink-0 active:scale-95"
                            >
                              Desequipar
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-2.5 bg-black/80 rounded-xl border border-amber-500/30 text-[10px] text-slate-400 font-sans text-center">
                    Consigue dados Raros, Épicos o Legendarios en la Tienda para desbloquear ranuras de orbes.
                  </div>
                )}
              </div>

              {selectedDieForOrbs.rarity.slots > selectedDieForOrbs.attachedOrbs.length && (
                <div className="pt-1 border-t border-slate-800">
                  <h4 className="text-[11px] font-serif font-bold text-purple-300 mb-1.5">
                    Equipar Orbe desde tu Banco ({orbBank.length} disponibles):
                  </h4>

                  {orbBank.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic bg-black/60 p-2 rounded-xl border border-slate-800 text-center font-sans">
                      No tienes orbes en el banco. Adquiere más en la Tienda Mágica.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto touch-pan-y pr-1">
                      {orbBank.map((orb) => (
                        <div
                          key={orb.id}
                          className="p-2 rounded-xl bg-black/85 border border-purple-500/40 flex items-center justify-between text-xs hover:border-purple-400 transition"
                        >
                          <div className="min-w-0 pr-1">
                            <strong className="text-slate-200 font-serif text-[11px] truncate block">{orb.name}</strong>
                            <div className="text-[9.5px] text-cyan-300 font-sans leading-tight">{orb.effect}</div>
                          </div>
                          <button
                            onClick={() => equipSpecificOrbToDie(selectedDieForOrbs.id, orb.id)}
                            className="px-2.5 py-1 rounded-full bg-purple-700 hover:bg-purple-600 text-white font-serif font-bold text-[9.5px] border border-purple-400/50 shadow transition shrink-0 active:scale-95"
                          >
                            + Equipar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopView;
