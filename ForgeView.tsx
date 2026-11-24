import React, { useState, useRef } from 'react';
import { gameAudio, isAndroidDevice, useCompactViewport } from './utils';
import { FORGE_MATERIALS, FORGE_RECIPES, ForgeMaterial, ForgeRecipe } from './forgeSystemData';
import { DieData, Orb, DieRarity } from './types';
import { getDieImageCandidateUrls, getDieImageCacheKey } from './diceImageMap';
import { getOrbAllCandidateUrls } from './irvbeOrbImages';
import { getForgeMaterialImageUrls, getForgeFailImageUrls } from './forgeImageMap';
import { CachedImage } from './CachedImage';

const MAIN_RAW_BASE = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';
const MAIN_CDN_BASE = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';
const MAX_FORGE_MASTERY_LEVEL = 12;

function resolveOrbRecipeElement(recipe: ForgeRecipe): Orb['element'] {
  if (recipe.orbStats?.element) {
    return recipe.orbStats.element;
  }
  const searchText = `${recipe.id} ${recipe.name} ${recipe.resultPreview.name} ${recipe.description}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (searchText.includes('fuego') || searchText.includes('ignea') || searchText.includes('fenix') || searchText.includes('llama')) return 'Fuego';
  if (searchText.includes('hielo') || searchText.includes('glacial') || searchText.includes('escarcha')) return 'Hielo';
  if (searchText.includes('rayo') || searchText.includes('relampago') || searchText.includes('trueno') || searchText.includes('electric')) return 'Rayo';
  if (searchText.includes('vampir') || searchText.includes('oscur') || searchText.includes('sangre') || searchText.includes('abisal')) return 'Oscuro';
  if (searchText.includes('viento') || searchText.includes('cefiro') || searchText.includes('aire')) return 'Viento';
  if (searchText.includes('sombra') || searchText.includes('umbri')) return 'Sombra';
  if (searchText.includes('luz') || searchText.includes('solar') || searchText.includes('alba') || searchText.includes('sagrad')) return 'Luz';
  if (searchText.includes('venen') || searchText.includes('toxic')) return 'Veneno';
  if (searchText.includes('metal') || searchText.includes('acero') || searchText.includes('adamantio')) return 'Metal';
  if (searchText.includes('cosm') || searchText.includes('astral') || searchText.includes('singularidad')) return 'Cosmico';
  return 'Tierra';
}

export interface ForgeResultData {
  success: boolean;
  title: string;
  itemName: string;
  itemDetails: string;
  color: string;
  icon: string;
  expGained: number;
  message: string;
  itemType?: 'DIE' | 'ORB';
  itemId?: string;
  itemRarity?: string;
  itemElement?: Orb['element'];
}

export interface ForgeViewProps {
  setPlayerDeck: React.Dispatch<React.SetStateAction<DieData[]>>;
  setOrbBank: React.Dispatch<React.SetStateAction<Orb[]>>;
  forgeInventory: Record<string, number>;
  setForgeInventory: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  forgeMasteryLevel: number;
  setForgeMasteryLevel: React.Dispatch<React.SetStateAction<number>>;
  forgeMasteryExp: number;
  setForgeMasteryExp: React.Dispatch<React.SetStateAction<number>>;
  forgeTotalAttempts: number;
  setForgeTotalAttempts: React.Dispatch<React.SetStateAction<number>>;
  forgeTotalSuccesses: number;
  setForgeTotalSuccesses: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
  activeCampaignIndex: number;
  triggerNotification?: (text: string, color?: string) => void;
  RARIDADES: Record<string, DieRarity>;
  descFontSize?: number;
  FullscreenForgeBackground: React.FC<{ className?: string }>;
}

export const ForgeView: React.FC<ForgeViewProps> = ({
  setPlayerDeck,
  setOrbBank,
  forgeInventory,
  setForgeInventory,
  forgeMasteryLevel,
  setForgeMasteryLevel,
  forgeMasteryExp,
  setForgeMasteryExp,
  forgeTotalAttempts,
  setForgeTotalAttempts,
  forgeTotalSuccesses,
  setForgeTotalSuccesses,
  onClose,
  activeCampaignIndex,
  triggerNotification,
  RARIDADES,
  descFontSize = 12,
  FullscreenForgeBackground,
}) => {
  const [forgeTab, setForgeTab] = useState<'RECETAS_DADOS' | 'RECETAS_ORBES' | 'INVENTARIO'>('RECETAS_DADOS');
  const [isSectionModalOpen, setIsSectionModalOpen] = useState<boolean>(false);
  const isSectionModalOpenRef = useRef<boolean>(false);
  isSectionModalOpenRef.current = isSectionModalOpen;
  const isCompact = useCompactViewport(460, 640);
  const isAndroid = isAndroidDevice();
  const blurMd = isAndroid ? '' : 'backdrop-blur-md';
  const blurSoft = isAndroid ? '' : 'backdrop-blur-[3px]';
  const [selectedForgeCatalyst, setSelectedForgeCatalyst] = useState<string | null>(null);
  const selectedForgeCatalystRef = useRef<string | null>(selectedForgeCatalyst);
  selectedForgeCatalystRef.current = selectedForgeCatalyst;
  const [forgeResultModal, setForgeResultModal] = useState<ForgeResultData | null>(null);
  const forgeResultModalRef = useRef<ForgeResultData | null>(forgeResultModal);
  forgeResultModalRef.current = forgeResultModal;

  const forgeInventoryRef = useRef<Record<string, number>>(forgeInventory);
  forgeInventoryRef.current = forgeInventory;
  const forgeMasteryLevelRef = useRef<number>(forgeMasteryLevel);
  forgeMasteryLevelRef.current = forgeMasteryLevel;
  const forgeMasteryExpRef = useRef<number>(forgeMasteryExp);
  forgeMasteryExpRef.current = forgeMasteryExp;

  const openForgeResultModal = (data: ForgeResultData) => {
    forgeResultModalRef.current = data;
    setForgeResultModal(data);
  };

  const closeForgeResultModal = () => {
    forgeResultModalRef.current = null;
    setForgeResultModal(null);
  };

  const activeCatalyst = selectedForgeCatalyst ? FORGE_MATERIALS[selectedForgeCatalyst] : null;
  const isAtMaxMastery = forgeMasteryLevel >= MAX_FORGE_MASTERY_LEVEL;
  const currentLevelExpCap = Math.min(MAX_FORGE_MASTERY_LEVEL, forgeMasteryLevel) * 100;
  const displayedMasteryExp = Math.min(forgeMasteryExp, currentLevelExpCap);
  const isMasteryCappedOut = isAtMaxMastery && displayedMasteryExp >= currentLevelExpCap;

  const resolveForgeAttempt = (
    recipe: ForgeRecipe
  ): {
    aborted: boolean;
    isSuccess: boolean;
    expGained: number;
    catalystConsumed: boolean;
    catalystSnapshot: ForgeMaterial | null;
    isGuaranteed: boolean;
  } => {
    // Bloqueo síncrono si ya hay un resultado de forja desplegado o en curso en este frame
    if (forgeResultModalRef.current) {
      return {
        aborted: true,
        isSuccess: false,
        expGained: 0,
        catalystConsumed: false,
        catalystSnapshot: null,
        isGuaranteed: false,
      };
    }

    const liveInventory = forgeInventoryRef.current;
    const hasEnoughMaterials = recipe.requiredMaterials.every(
      (req) => (liveInventory[req.materialId] || 0) >= req.amount
    );
    if (!hasEnoughMaterials) {
      gameAudio.playErrorBuzz();
      return {
        aborted: true,
        isSuccess: false,
        expGained: 0,
        catalystConsumed: false,
        catalystSnapshot: null,
        isGuaranteed: false,
      };
    }

    const activeCatId = selectedForgeCatalystRef.current;
    const rawCatalystSnapshot =
      activeCatId && (liveInventory[activeCatId] || 0) > 0
        ? FORGE_MATERIALS[activeCatId] || null
        : null;
    // Salvaguarda: los catalizadores exclusivos de ranuras (+1 Ranura) no aplican en cristalización de Orbes
    const catalystSnapshot =
      recipe.type === 'ORB' && rawCatalystSnapshot?.bonusSlots
        ? null
        : rawCatalystSnapshot;

    const liveLevel = forgeMasteryLevelRef.current;
    const liveExp = forgeMasteryExpRef.current;
    const masteryBonus = (liveLevel - 1) * 5;
    const isGuaranteed = Boolean(catalystSnapshot?.guaranteesSuccess);
    const effectiveRate = isGuaranteed ? 100 : Math.min(100, recipe.baseSuccessRate + masteryBonus);

    const roll = Math.random() * 100;
    const isSuccess = roll < effectiveRate;

    const consumeCatalyst = Boolean(
      catalystSnapshot &&
        (isSuccess || catalystSnapshot.guaranteesSuccess) &&
        (liveInventory[catalystSnapshot.id] || 0) > 0
    );

    const applyInventoryDeduction = (inv: Record<string, number>) => {
      const next = { ...inv };
      recipe.requiredMaterials.forEach((req) => {
        next[req.materialId] = Math.max(0, (next[req.materialId] || 0) - req.amount);
      });
      if (consumeCatalyst && catalystSnapshot && (next[catalystSnapshot.id] || 0) > 0) {
        next[catalystSnapshot.id] -= 1;
        if (next[catalystSnapshot.id] <= 0) {
          delete next[catalystSnapshot.id];
        }
      }
      return next;
    };

    const nextLiveInventory = applyInventoryDeduction(liveInventory);
    forgeInventoryRef.current = nextLiveInventory;
    if (consumeCatalyst && catalystSnapshot && (nextLiveInventory[catalystSnapshot.id] || 0) <= 0) {
      selectedForgeCatalystRef.current = null;
      setSelectedForgeCatalyst((curr) => (curr === catalystSnapshot.id ? null : curr));
    }

    setForgeInventory((prev) => applyInventoryDeduction(prev));
    setForgeTotalAttempts((prev) => prev + 1);

    const rawExpGain = isSuccess ? 15 : 5;
    const liveCap = Math.min(MAX_FORGE_MASTERY_LEVEL, liveLevel) * 100;
    const clampedCurrentExp = Math.min(liveExp, liveCap);
    let expGained = 0;

    if (liveLevel >= MAX_FORGE_MASTERY_LEVEL) {
      const nextClampedExp = Math.min(liveCap, clampedCurrentExp + rawExpGain);
      expGained = Math.max(0, nextClampedExp - clampedCurrentExp);
      forgeMasteryExpRef.current = nextClampedExp;
      setForgeMasteryExp((prevExp) => {
        const cap = MAX_FORGE_MASTERY_LEVEL * 100;
        return Math.min(cap, Math.min(prevExp, cap) + rawExpGain);
      });
    } else {
      expGained = rawExpGain;
      const nextExpTotal = clampedCurrentExp + rawExpGain;
      const didLevelUpMastery = nextExpTotal >= liveCap;

      if (didLevelUpMastery) {
        const nextLevel = Math.min(MAX_FORGE_MASTERY_LEVEL, liveLevel + 1);
        const overflowExp = nextExpTotal - liveCap;
        const nextCap = nextLevel * 100;
        const clampedOverflow = Math.min(nextCap, overflowExp);

        forgeMasteryLevelRef.current = nextLevel;
        forgeMasteryExpRef.current = clampedOverflow;

        setForgeMasteryLevel((prevLvl) => Math.min(MAX_FORGE_MASTERY_LEVEL, prevLvl + 1));
        setForgeMasteryExp(() => clampedOverflow);
        gameAudio.playLevelUpStinger();
        if (triggerNotification) {
          triggerNotification(
            nextLevel >= MAX_FORGE_MASTERY_LEVEL
              ? `¡MAESTRÍA MÁXIMA ALCANZADA! Nivel ${nextLevel}/${MAX_FORGE_MASTERY_LEVEL} (+${(nextLevel - 1) * 5}% Éxito permanente)`
              : `Subida de Maestría de Forja: Nivel ${nextLevel} (+5% Éxito permanente)`,
            '#fbbf24'
          );
        }
      } else {
        forgeMasteryExpRef.current = nextExpTotal;
        setForgeMasteryExp((prevExp) => {
          const currentCap = Math.min(MAX_FORGE_MASTERY_LEVEL, forgeMasteryLevelRef.current) * 100;
          return Math.min(currentCap, Math.min(prevExp, currentCap) + rawExpGain);
        });
      }
    }

    return {
      aborted: false,
      isSuccess,
      expGained,
      catalystConsumed: consumeCatalyst,
      catalystSnapshot,
      isGuaranteed,
    };
  };

  const exitIconCandidates = [
    `${MAIN_CDN_BASE}/icono_salir.webp`,
    `${MAIN_RAW_BASE}/icono_salir.webp`,
    './assets/icono_salir.webp',
  ];

  const getForgeIconCandidates = (primaryNames: string[]) => {
    const urls: string[] = [];
    primaryNames.forEach((fileBase) => {
      urls.push(
        `${MAIN_CDN_BASE}/${fileBase}.webp`,
        `${MAIN_RAW_BASE}/${fileBase}.webp`,
        `${MAIN_CDN_BASE}/iconos/${fileBase}.webp`,
        `${MAIN_RAW_BASE}/iconos/${fileBase}.webp`,
        `${MAIN_CDN_BASE}/${fileBase}.png`,
        `${MAIN_RAW_BASE}/${fileBase}.png`,
        `${MAIN_CDN_BASE}/iconos/${fileBase}.png`,
        `${MAIN_RAW_BASE}/iconos/${fileBase}.png`,
        `./assets/${fileBase}.webp`,
        `./assets/iconos/${fileBase}.webp`
      );
    });
    return urls;
  };

  const dieRecipesCount = FORGE_RECIPES.filter((r) => r.type === 'DIE').length;
  const orbRecipesCount = FORGE_RECIPES.filter((r) => r.type === 'ORB').length;
  const totalMaterialsCount = Object.values(forgeInventory).reduce<number>(
    (acc, qty) => acc + (Number(qty) || 0),
    0
  );

  const forgeSections = [
    {
      id: 'RECETAS_DADOS' as const,
      title: 'FORJAR DADOS',
      sub: 'Yunque de Aleaciones Élite',
      color: '#c084fc',
      badge: `${dieRecipesCount} Recetas de Dados`,
      desc: 'Forja dados Raros, Épicos y Legendarios combinando minerales rúnicos y catalizadores astrales.',
      iconCandidates: getForgeIconCandidates(['icono_forja_dados']),
    },
    {
      id: 'RECETAS_ORBES' as const,
      title: 'CRISTALIZAR ORBES',
      sub: 'Alquimia Elemental',
      color: '#38bdf8',
      badge: `${orbRecipesCount} Recetas de Orbes`,
      desc: 'Sintetiza orbes mágicos de alta potencia canalizando esencias puras y catalizadores en la fragua.',
      iconCandidates: getForgeIconCandidates(['icono_forja_orbes']),
    },
    {
      id: 'INVENTARIO' as const,
      title: 'MATERIALES',
      sub: 'Alforja y Maestría del Herrero',
      color: '#f59e0b',
      badge: `${totalMaterialsCount} Materiales • Nv. ${forgeMasteryLevel}${isAtMaxMastery ? ' (MÁX)' : ''}`,
      desc: 'Consulta tu alforja de minerales, catalizadores astrales y tu progreso de Maestría en la Gran Fragua.',
      iconCandidates: getForgeIconCandidates(['icono_forja_materiales']),
    },
  ];

  const selectedSec = forgeSections.find((s) => s.id === forgeTab) || forgeSections[0];

  const openSectionModal = (tabId: typeof forgeTab) => {
    if (isSectionModalOpenRef.current) return;
    isSectionModalOpenRef.current = true;
    gameAudio.playConfirmSelect();
    if (
      tabId === 'RECETAS_ORBES' &&
      selectedForgeCatalystRef.current &&
      FORGE_MATERIALS[selectedForgeCatalystRef.current]?.bonusSlots
    ) {
      selectedForgeCatalystRef.current = null;
      setSelectedForgeCatalyst(null);
    }
    setForgeTab(tabId);
    setIsSectionModalOpen(true);
  };

  const closeSectionModal = () => {
    isSectionModalOpenRef.current = false;
    setIsSectionModalOpen(false);
  };

  return (
    <div className="absolute inset-0 overflow-hidden select-none bg-black z-20 flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn">
      {/* FONDO OFICIAL PANORÁMICO DE LA GRAN FRAGUA */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
        <FullscreenForgeBackground />
        <div className="absolute inset-0 bg-radial-vignette from-transparent via-black/25 to-black/75 pointer-events-none" />
      </div>

      {!isSectionModalOpen && (
        <>
      {/* BARRA SUPERIOR ELEGANTE ESTILO CÓDICE */}
      <div className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 pointer-events-auto gap-2">
        <div className={`flex flex-col text-left px-3 py-1.5 rounded-2xl bg-black/85 border border-purple-500/50 shadow-lg ${blurMd}`}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold tracking-widest text-purple-300 uppercase drop-shadow">
              GRAN FRAGUA DE DADOS Y ORBES
            </span>
            {activeCampaignIndex === 3 && (
              <span className="text-[8.5px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono font-bold animate-pulse">
                CAMPAÑA 4
              </span>
            )}
          </div>
          <h2
            className="text-lg sm:text-2xl font-black font-serif tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,1)] uppercase transition-colors"
            style={{ color: selectedSec.color }}
          >
            {selectedSec.title}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            gameAudio.playCrispClick();
            onClose();
          }}
          className={`flex flex-col items-center justify-center p-1.5 sm:p-2 px-2.5 sm:px-3 rounded-2xl border-0 outline-none focus:outline-none transition-all duration-300 transform active:scale-95 cursor-pointer group relative ${blurMd} shrink-0`}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            boxShadow: '0 0 35px rgba(168, 85, 247, 0.55), inset 0 0 20px rgba(168, 85, 247, 0.35)',
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
          <span className="font-serif font-bold tracking-widest text-slate-300 group-hover:text-purple-300 transition-colors text-[9px] sm:text-[10px] mt-0.5">
            VOLVER
          </span>
        </button>
      </div>

      {/* CUERPO CENTRAL: 3 ICONOS LUMINOSOS ADAPTABLES SIN RECORTE NI SOLAPAMIENTO */}
      <div
        className="relative z-10 w-full max-w-5xl flex-1 min-h-0 flex flex-row items-center justify-start pointer-events-auto px-2 sm:px-6 my-auto gap-4 overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`${
            isCompact
              ? 'flex flex-row flex-wrap items-center justify-start gap-3.5 max-h-full overflow-y-auto touch-pan-y py-3 px-2'
              : 'flex flex-col items-center justify-center gap-3.5 sm:gap-5 shrink-0 px-4 sm:px-6 py-4 overflow-visible'
          } [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
        >
          {forgeSections.map((sec) => {
            const isSelected = forgeTab === sec.id;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={(e) => {
                  if (forgeTab === sec.id || e.detail >= 2) {
                    openSectionModal(sec.id);
                  } else {
                    setForgeTab(sec.id);
                    gameAudio.playCrispClick();
                  }
                }}
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse' && forgeTab !== sec.id) {
                    setForgeTab(sec.id);
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
                  width: isCompact ? undefined : 'clamp(50px, 13vh, 78px)',
                  height: isCompact ? undefined : 'clamp(50px, 13vh, 78px)',
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
                  cacheKey={`forge_sec_icon_${sec.id}`}
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
          className={`w-full max-w-lg px-6 py-2.5 rounded-2xl bg-black/85 border border-purple-500/40 hover:border-purple-400 ${blurMd} text-center shadow-2xl animate-fadeIn transition transform active:scale-[0.99] cursor-pointer`}
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

      {/* MODAL DETALLADO DE LA PANTALLA SELECCIONADA DE LA FORJA (reutiliza el único fondo de la Forja) */}
      {isSectionModalOpen && (
        <div
          className={`fixed inset-0 z-50 overflow-hidden select-none ${isAndroid ? 'bg-black/80' : `bg-black/70 ${blurSoft}`} flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn`}
          onClick={closeSectionModal}
        >

          {/* Barra superior dentro de la sección seleccionada */}
          <div
            className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 mb-2 pointer-events-auto gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex flex-col text-left px-3 py-1.5 rounded-2xl bg-black/85 border border-purple-500/50 shadow-lg ${blurMd}`}>
              <span className="text-[10px] font-mono font-bold tracking-widest text-purple-300 uppercase drop-shadow">
                GRAN FRAGUA DE DADOS Y ORBES
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
              className={`flex flex-col items-center justify-center p-1.5 sm:p-2 px-2.5 sm:px-3 rounded-2xl border-0 outline-none focus:outline-none transition-all duration-300 transform active:scale-95 cursor-pointer group relative ${blurMd} shrink-0`}
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                boxShadow: '0 0 35px rgba(168, 85, 247, 0.55), inset 0 0 20px rgba(168, 85, 247, 0.35)',
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
              <span className="font-serif font-bold tracking-widest text-slate-300 group-hover:text-purple-300 transition-colors text-[9px] sm:text-[10px] mt-0.5">
                VOLVER
              </span>
            </button>
          </div>

          {/* Contenedor central translúcido de la sección activa */}
          <div
            className="relative z-10 w-full max-w-5xl flex-1 min-h-0 flex flex-col justify-start pointer-events-auto overflow-y-auto touch-pan-y px-1 sm:px-3 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            onClick={(e) => e.stopPropagation()}
          >

            {/* SELECTOR DE CATALIZADOR OPCIONAL (EN RECETAS DE DADOS Y ORBES) */}
            {(forgeTab === 'RECETAS_DADOS' || forgeTab === 'RECETAS_ORBES') && (
              <div className={`mb-4 p-3 rounded-2xl bg-black/80 border border-purple-500/40 shadow-lg ${blurMd}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🌟</span>
                    <div>
                      <h4 className="font-serif font-black text-xs text-amber-300">
                        CATALIZADOR DE IMBUICIÓN ASTRAL (OPCIONAL)
                      </h4>
                      <p className="text-[10px] text-slate-400 font-sans">
                        {forgeTab === 'RECETAS_ORBES'
                          ? 'Garantiza 100% éxito o añade bonificaciones de salud y ataque al orbe (los de estadísticas se preservan si falla).'
                          : 'Garantiza 100% éxito o añade bonificaciones de salud, ataque y ranuras (los de estadísticas se preservan si falla).'}
                      </p>
                    </div>
                  </div>
                  {selectedForgeCatalyst && (
                    <button
                      type="button"
                      onClick={() => setSelectedForgeCatalyst(null)}
                      className="text-[10px] font-mono text-rose-400 hover:text-rose-300 underline cursor-pointer"
                    >
                      Quitar Catalizador
                    </button>
                  )}
                </div>

                <div className={`grid gap-2 ${forgeTab === 'RECETAS_ORBES' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
                  {Object.values(FORGE_MATERIALS)
                    .filter((m) => m.isCatalyst && (forgeTab !== 'RECETAS_ORBES' || !m.bonusSlots))
                    .map((cat) => {
                      const owned = forgeInventory[cat.id] || 0;
                      const isSelected = selectedForgeCatalyst === cat.id;
                      const catImgUrls = getForgeMaterialImageUrls(cat.id, cat.name);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          disabled={owned <= 0}
                          onClick={() => {
                            if (owned <= 0) return;
                            setSelectedForgeCatalyst(isSelected ? null : cat.id);
                            gameAudio.playCrispClick();
                          }}
                          className={`p-2 rounded-xl border text-left transition relative flex flex-col justify-between ${
                            isSelected
                              ? 'bg-amber-950/70 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                              : owned > 0
                              ? 'bg-slate-950/80 border-slate-800 hover:border-slate-600 cursor-pointer'
                              : 'bg-black/40 border-slate-900 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="w-7 h-7 rounded-lg bg-black/80 border border-slate-700/80 overflow-hidden shrink-0 flex items-center justify-center relative">
                              <CachedImage
                                cacheKey={`forge_cat_${cat.id}`}
                                candidateUrls={catImgUrls}
                                alt={cat.name}
                                className="w-full h-full object-cover"
                              />
                              <span className="text-sm absolute inset-0 flex items-center justify-center -z-10">{cat.icon}</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-amber-300">
                              x{owned}
                            </span>
                          </div>
                          <span
                            className="font-serif font-bold text-[11px] truncate block"
                            style={{ color: cat.rarityColor }}
                          >
                            {cat.name.split(' ')[0]} {cat.name.split(' ')[1] || ''}
                          </span>
                          <span className="text-[9px] text-cyan-300 font-mono mt-0.5 block">
                            {cat.guaranteesSuccess && '100% Éxito'}
                            {cat.bonusHp ? `+${cat.bonusHp} HP` : ''}
                            {cat.bonusAtk ? `+${cat.bonusAtk} ATK` : ''}
                            {cat.bonusSlots ? `+${cat.bonusSlots} Ranura` : ''}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 1. RECETAS DE DADOS */}
            {forgeTab === 'RECETAS_DADOS' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-4">
                {FORGE_RECIPES.filter((r) => r.type === 'DIE').map((recipe) => {
                  const missingMats = recipe.requiredMaterials.filter(
                    (m) => (forgeInventory[m.materialId] || 0) < m.amount
                  );
                  const canCraft = missingMats.length === 0;

                  const masteryBonus = (forgeMasteryLevel - 1) * 5;
                  const isGuaranteed = Boolean(activeCatalyst?.guaranteesSuccess);
                  const effectiveRate = isGuaranteed
                    ? 100
                    : Math.min(100, recipe.baseSuccessRate + masteryBonus);
                  const recipeRarityName =
                    recipe.id === 'recipe_die_legendary'
                      ? RARIDADES.LEGENDARIO.name
                      : recipe.id === 'recipe_die_epic'
                      ? RARIDADES.EPICO.name
                      : RARIDADES.RARO.name;
                  const candidateUrls = getDieImageCandidateUrls(
                    recipe.resultPreview.name,
                    recipe.id,
                    recipeRarityName
                  );

                  return (
                    <div
                      key={recipe.id}
                      className={`p-3.5 rounded-2xl bg-black/85 border flex flex-col justify-between shadow-lg hover:border-purple-400 transition group ${blurMd}`}
                      style={{ borderColor: `${recipe.resultPreview.color}60` }}
                    >
                      <div>
                        <div className="w-full h-32 rounded-xl bg-slate-950/80 border border-slate-800/80 overflow-hidden relative mb-2.5 flex items-center justify-center">
                          <CachedImage
                            cacheKey={`forge_die_recipe_${recipe.id}`}
                            candidateUrls={candidateUrls}
                            alt={recipe.resultPreview.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span
                            className="absolute top-1.5 right-1.5 text-[9px] px-2 py-0.5 rounded-full font-serif font-bold border bg-black/80"
                            style={{ borderColor: recipe.resultPreview.color, color: recipe.resultPreview.color }}
                          >
                            {recipe.resultPreview.details}
                          </span>
                        </div>

                        <h5 className="font-serif font-bold text-xs sm:text-sm text-slate-100 group-hover:text-amber-300 transition truncate mb-1">
                          {recipe.resultPreview.name}
                        </h5>
                        <p
                          style={{ fontSize: `${descFontSize}px` }}
                          className="text-[11px] text-slate-300 font-sans leading-snug mb-2"
                        >
                          {recipe.description}
                        </p>

                        <div className="flex items-center justify-between bg-black/70 px-2.5 py-1 rounded-xl border border-slate-800 mb-2 text-[10.5px]">
                          <span className="text-slate-400 font-serif">Tasa de Éxito:</span>
                          <span
                            className={`font-mono font-bold ${
                              effectiveRate >= 100
                                ? 'text-yellow-400'
                                : effectiveRate >= 80
                                ? 'text-emerald-400'
                                : 'text-amber-300'
                            }`}
                          >
                            {isGuaranteed ? '100% GARANTIZADO' : `${effectiveRate}%`}
                          </span>
                        </div>

                        <div className="bg-black/80 rounded-xl p-2 border border-slate-800 space-y-1 mb-2">
                          <span className="text-[9.5px] font-serif font-bold text-slate-400 block mb-0.5">
                            Requisitos:
                          </span>
                          {recipe.requiredMaterials.map((req) => {
                            const matInfo = FORGE_MATERIALS[req.materialId];
                            const currentOwned = forgeInventory[req.materialId] || 0;
                            const hasEnough = currentOwned >= req.amount;
                            return (
                              <div
                                key={req.materialId}
                                className={`flex items-center justify-between text-[10px] ${
                                  hasEnough ? 'text-slate-300' : 'text-rose-400 font-bold'
                                }`}
                              >
                                <span>
                                  {matInfo?.icon} {matInfo?.name.split(' ')[0]}
                                </span>
                                <span className="font-mono">
                                  {currentOwned} / {req.amount}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] font-serif text-slate-400">
                          {canCraft ? 'Listo para forjar' : 'Faltan materiales'}
                        </span>
                        <button
                          type="button"
                          disabled={!canCraft}
                          onClick={() => {
                            if (!canCraft) return;

                            const { aborted, isSuccess, expGained, catalystSnapshot, isGuaranteed: resolvedGuaranteed } =
                              resolveForgeAttempt(recipe);
                            if (aborted) return;

                            if (isSuccess) {
                              setForgeTotalSuccesses((prev) => prev + 1);
                              const bonusHpFromCat = catalystSnapshot?.bonusHp || 0;
                              const bonusAtkFromCat = catalystSnapshot?.bonusAtk || 0;
                              const bonusSlotsFromCat = catalystSnapshot?.bonusSlots || 0;

                              const forgedRarity =
                                recipe.id === 'recipe_die_legendary'
                                  ? RARIDADES.LEGENDARIO
                                  : recipe.id === 'recipe_die_epic'
                                  ? RARIDADES.EPICO
                                  : RARIDADES.RARO;
                              const newDie: DieData = {
                                id: `d_forge_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                                name:
                                  recipe.resultPreview.name +
                                  (catalystSnapshot ? ` [${catalystSnapshot.name.split(' ')[0]}]` : ''),
                                rarity: {
                                  ...forgedRarity,
                                  slots: forgedRarity.slots + bonusSlotsFromCat,
                                },
                                level: 1,
                                attachedOrbs: [],
                                enMazo: false,
                                bonusHp: bonusHpFromCat,
                                bonusAtk: bonusAtkFromCat,
                              };
                              setPlayerDeck((prev) => [...prev, newDie]);
                              gameAudio.playVictoryFanfare();
                              openForgeResultModal({
                                success: true,
                                title: resolvedGuaranteed ? '¡FORJA ASTRAL GARANTIZADA!' : '¡FORJA EXITOSA!',
                                itemName: newDie.name,
                                itemDetails: `${recipe.resultPreview.details}${bonusSlotsFromCat ? ' • +1 Ranura Extra' : ''}${bonusHpFromCat ? ` • +${bonusHpFromCat} HP` : ''}${bonusAtkFromCat ? ` • +${bonusAtkFromCat} ATK` : ''}`,
                                color: recipe.resultPreview.color,
                                icon: '🎲',
                                expGained,
                                message: catalystSnapshot
                                  ? catalystSnapshot.guaranteesSuccess
                                    ? `¡El catalizador ${catalystSnapshot.name} garantizó la forja a la perfección!`
                                    : `¡El catalizador ${catalystSnapshot.name} imbuyó el dado con poder adicional!`
                                  : '¡La aleación mágica se ha consolidado a la perfección en el yunque!',
                                itemType: 'DIE',
                                itemId: newDie.id,
                                itemRarity: forgedRarity.name,
                              });
                              if (triggerNotification) {
                                triggerNotification(`¡ÉXITO EN LA FORJA! Has creado: ${newDie.name}.`, recipe.resultPreview.color);
                              }
                            } else {
                              gameAudio.playErrorBuzz();
                              const preservedCatalystNote = catalystSnapshot
                                ? ` Tu catalizador ${catalystSnapshot.name} fue preservado.`
                                : '';
                              openForgeResultModal({
                                success: false,
                                title: '¡FALLO EN LA FORJA!',
                                itemName: recipe.resultPreview.name,
                                itemDetails: 'Los materiales base se disiparon durante el proceso',
                                color: '#ef4444',
                                icon: '💥',
                                expGained,
                                message: `La aleación se desestabilizó y colapsó.${preservedCatalystNote}${expGained > 0 ? ' Has ganado Experiencia de Maestría.' : ''}`,
                                itemType: 'DIE',
                                itemId: recipe.id,
                              });
                              if (triggerNotification) {
                                triggerNotification(
                                  expGained > 0
                                    ? `¡FALLO EN LA FORJA! La aleación se desestabilizó.${preservedCatalystNote} Ganaste +${expGained} EXP de Maestría.`
                                    : `¡FALLO EN LA FORJA! La aleación se desestabilizó.${preservedCatalystNote}`,
                                  '#ef4444'
                                );
                              }
                            }
                          }}
                          className={`py-1.5 px-4 rounded-full font-serif font-bold text-xs tracking-wider border shadow transition transform active:scale-95 ${
                            canCraft
                              ? 'bg-slate-900 hover:bg-slate-800 text-purple-200 border-purple-500/50 cursor-pointer'
                              : 'bg-black/50 text-slate-600 border-slate-800 cursor-not-allowed'
                          }`}
                        >
                          Forjar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. RECETAS DE ORBES */}
            {forgeTab === 'RECETAS_ORBES' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-4">
                {FORGE_RECIPES.filter((r) => r.type === 'ORB').map((recipe) => {
                  const missingMats = recipe.requiredMaterials.filter(
                    (m) => (forgeInventory[m.materialId] || 0) < m.amount
                  );
                  const canCraft = missingMats.length === 0;

                  const masteryBonus = (forgeMasteryLevel - 1) * 5;
                  const isGuaranteed = Boolean(activeCatalyst?.guaranteesSuccess);
                  const effectiveRate = isGuaranteed
                    ? 100
                    : Math.min(100, recipe.baseSuccessRate + masteryBonus);
                  const orbElement = resolveOrbRecipeElement(recipe);
                  const candidateUrls = getOrbAllCandidateUrls(recipe.resultPreview.name, orbElement, recipe.id);

                  return (
                    <div
                      key={recipe.id}
                      className={`p-3.5 rounded-2xl bg-black/85 border flex flex-col justify-between shadow-lg hover:border-cyan-400 transition group ${blurMd}`}
                      style={{ borderColor: `${recipe.resultPreview.color}60` }}
                    >
                      <div>
                        <div className="w-full h-32 rounded-xl bg-slate-950/80 border border-slate-800/80 overflow-hidden relative mb-2.5 flex items-center justify-center">
                          <CachedImage
                            cacheKey={`forge_orb_recipe_${recipe.id}`}
                            candidateUrls={candidateUrls}
                            alt={recipe.resultPreview.name}
                            className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(56,189,248,0.4)] group-hover:scale-105 transition-transform duration-300"
                          />
                          <span
                            className="absolute top-1.5 right-1.5 text-[9px] px-2 py-0.5 rounded-full font-serif font-bold border bg-black/80"
                            style={{ borderColor: recipe.resultPreview.color, color: recipe.resultPreview.color }}
                          >
                            {recipe.resultPreview.details}
                          </span>
                        </div>

                        <h5 className="font-serif font-bold text-xs sm:text-sm text-slate-100 group-hover:text-cyan-300 transition truncate mb-1">
                          {recipe.resultPreview.name}
                        </h5>
                        <p
                          style={{ fontSize: `${descFontSize}px` }}
                          className="text-[11px] text-cyan-300 font-sans leading-snug mb-2"
                        >
                          {recipe.description}
                        </p>

                        <div className="flex items-center justify-between bg-black/70 px-2.5 py-1 rounded-xl border border-slate-800 mb-2 text-[10.5px]">
                          <span className="text-slate-400 font-serif">Tasa de Éxito:</span>
                          <span
                            className={`font-mono font-bold ${
                              effectiveRate >= 100
                                ? 'text-yellow-400'
                                : effectiveRate >= 80
                                ? 'text-emerald-400'
                                : 'text-amber-300'
                            }`}
                          >
                            {isGuaranteed ? '100% GARANTIZADO' : `${effectiveRate}%`}
                          </span>
                        </div>

                        <div className="bg-black/80 rounded-xl p-2 border border-slate-800 space-y-1 mb-2">
                          <span className="text-[9.5px] font-serif font-bold text-slate-400 block mb-0.5">
                            Requisitos:
                          </span>
                          {recipe.requiredMaterials.map((req) => {
                            const matInfo = FORGE_MATERIALS[req.materialId];
                            const currentOwned = forgeInventory[req.materialId] || 0;
                            const hasEnough = currentOwned >= req.amount;
                            return (
                              <div
                                key={req.materialId}
                                className={`flex items-center justify-between text-[10px] ${
                                  hasEnough ? 'text-slate-300' : 'text-rose-400 font-bold'
                                }`}
                              >
                                <span>
                                  {matInfo?.icon} {matInfo?.name.split(' ')[0]}
                                </span>
                                <span className="font-mono">
                                  {currentOwned} / {req.amount}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] font-serif text-slate-400">
                          {canCraft ? 'Listo para cristalizar' : 'Faltan materiales'}
                        </span>
                        <button
                          type="button"
                          disabled={!canCraft}
                          onClick={() => {
                            if (!canCraft) return;

                            const { aborted, isSuccess, expGained, catalystSnapshot, isGuaranteed: resolvedGuaranteed } =
                              resolveForgeAttempt(recipe);
                            if (aborted) return;

                            if (isSuccess) {
                              setForgeTotalSuccesses((prev) => prev + 1);
                              const bonusHpFromCat = catalystSnapshot?.bonusHp || 0;
                              const bonusAtkFromCat = catalystSnapshot?.bonusAtk || 0;
                              const baseHp = recipe.orbStats?.bonusHp ?? (recipe.id === 'recipe_orb_escudo_titan' ? 6 : 3);
                              const baseAtk = recipe.orbStats?.bonusAtk ?? (recipe.id === 'recipe_orb_vampirico' ? 2 : 1);

                              const newOrb: Orb = {
                                id: `o_forge_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                                templateId: recipe.id,
                                name:
                                  recipe.resultPreview.name +
                                  (catalystSnapshot ? ` [${catalystSnapshot.name.split(' ')[0]}]` : ''),
                                element: orbElement,
                                effect: recipe.resultPreview.details,
                                price: recipe.orbStats?.price ?? 250,
                                bonusHp: baseHp + bonusHpFromCat,
                                bonusAtk: baseAtk + bonusAtkFromCat,
                              };
                              setOrbBank((prev) => [...prev, newOrb]);
                              gameAudio.playVictoryFanfare();
                              openForgeResultModal({
                                success: true,
                                title: resolvedGuaranteed ? '¡CRISTALIZACIÓN ASTRAL GARANTIZADA!' : '¡CRISTALIZACIÓN EXITOSA!',
                                itemName: newOrb.name,
                                itemDetails: `${newOrb.effect}${bonusHpFromCat ? ` • +${bonusHpFromCat} HP` : ''}${bonusAtkFromCat ? ` • +${bonusAtkFromCat} ATK` : ''}`,
                                color: recipe.resultPreview.color,
                                icon: '🔮',
                                expGained,
                                message: catalystSnapshot
                                  ? catalystSnapshot.guaranteesSuccess
                                    ? `¡El catalizador ${catalystSnapshot.name} garantizó la cristalización a la perfección!`
                                    : bonusHpFromCat > 0 || bonusAtkFromCat > 0
                                    ? `¡El catalizador ${catalystSnapshot.name} potenció las estadísticas del orbe!`
                                    : '¡La energía elemental ha sido canalizada y cristalizada en la esfera!'
                                  : '¡La energía elemental ha sido canalizada y cristalizada en la esfera!',
                                itemType: 'ORB',
                                itemId: newOrb.id,
                                itemElement: newOrb.element,
                              });
                              if (triggerNotification) {
                                triggerNotification(`¡CRISTALIZACIÓN EXITOSA! Has creado: ${newOrb.name}.`, recipe.resultPreview.color);
                              }
                            } else {
                              gameAudio.playErrorBuzz();
                              const preservedCatalystNote = catalystSnapshot
                                ? ` Tu catalizador ${catalystSnapshot.name} fue preservado.`
                                : '';
                              openForgeResultModal({
                                success: false,
                                title: '¡FALLO AL CRISTALIZAR!',
                                itemName: recipe.resultPreview.name,
                                itemDetails: 'Los materiales base no pudieron contener la resonancia astral',
                                color: '#ef4444',
                                icon: '💥',
                                expGained,
                                message: `La energía cósmica colapsó antes de solidificar.${preservedCatalystNote}${expGained > 0 ? ' Has ganado Experiencia de Maestría.' : ''}`,
                                itemType: 'ORB',
                                itemId: recipe.id,
                                itemElement: orbElement,
                              });
                              if (triggerNotification) {
                                triggerNotification(
                                  expGained > 0
                                    ? `¡FALLO AL CRISTALIZAR! La energía astral colapsó.${preservedCatalystNote} Ganaste +${expGained} EXP de Maestría.`
                                    : `¡FALLO AL CRISTALIZAR! La energía astral colapsó.${preservedCatalystNote}`,
                                  '#ef4444'
                                );
                              }
                            }
                          }}
                          className={`py-1.5 px-4 rounded-full font-serif font-bold text-xs tracking-wider border shadow transition transform active:scale-95 ${
                            canCraft
                              ? 'bg-slate-900 hover:bg-slate-800 text-cyan-200 border-cyan-500/50 cursor-pointer'
                              : 'bg-black/50 text-slate-600 border-slate-800 cursor-not-allowed'
                          }`}
                        >
                          Cristalizar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. MATERIALES */}
            {forgeTab === 'INVENTARIO' && (
              <div className="space-y-4 pb-4">
                <div className={`p-3.5 bg-purple-950/60 border border-purple-500/50 rounded-2xl text-xs text-slate-200 leading-relaxed font-sans ${blurMd}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-500/30 pb-2.5 mb-2.5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-serif font-black text-amber-300">
                          Maestría del Herrero: Nivel {forgeMasteryLevel}/{MAX_FORGE_MASTERY_LEVEL}
                        </span>
                        {isAtMaxMastery && (
                          <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 font-mono font-bold border border-amber-400/60">
                            NIVEL MÁXIMO
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/40">
                          +{(forgeMasteryLevel - 1) * 5}% Éxito Base
                        </span>
                      </div>
                      <span className="text-[9.5px] text-slate-300 font-sans block mt-0.5">
                        {isMasteryCappedOut
                          ? `EXP de Forja: ${currentLevelExpCap} / ${currentLevelExpCap} (MÁXIMA)`
                          : `EXP de Forja: ${displayedMasteryExp} / ${currentLevelExpCap}`} • Forjas: {forgeTotalSuccesses}/{forgeTotalAttempts} exitosas
                        {forgeTotalAttempts > 0 ? ` (${Math.round((forgeTotalSuccesses / forgeTotalAttempts) * 100)}%)` : ''}
                      </span>
                    </div>
                    <div className="w-full sm:w-48 h-2 bg-slate-900/90 rounded-full border border-purple-400/40 overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-300 shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                        style={{
                          width: `${isMasteryCappedOut ? 100 : Math.min(100, (displayedMasteryExp / Math.max(1, currentLevelExpCap)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <strong>Sistema de Probabilidades y Maestría de la Forja:</strong>
                  <p className="mt-1 text-slate-300 text-[11px]">
                    La forja de artefactos de alta rareza no siempre está garantizada: las recetas poseen porcentajes base de éxito y fallo. Sin embargo, <strong>cada intento en el yunque otorga Experiencia de Maestría</strong> (+15 en acierto, +5 en fallo).
                  </p>
                  <p className="mt-1 text-amber-300 text-[11px] font-bold">
                    Al subir de Nivel de Maestría aumentas permanentemente un +5% la probabilidad de éxito en todas tus recetas hasta garantizar el 100% de efectividad en el taller.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.values(FORGE_MATERIALS).map((mat) => {
                    const matImgUrls = getForgeMaterialImageUrls(mat.id, mat.name);
                    return (
                      <div
                        key={mat.id}
                        className={`p-3.5 rounded-2xl bg-black/85 border flex flex-col justify-between shadow-lg ${blurMd}`}
                        style={{ borderColor: `${mat.rarityColor}50` }}
                      >
                        <div>
                          <div className="w-full h-32 rounded-xl bg-slate-950/80 border border-slate-800/80 overflow-hidden relative mb-2.5 flex items-center justify-center">
                            <CachedImage
                              cacheKey={`forge_mat_card_${mat.id}`}
                              candidateUrls={matImgUrls}
                              alt={mat.name}
                              className="w-full h-full object-cover"
                            />
                            <span className="text-3xl absolute inset-0 flex items-center justify-center -z-10">{mat.icon}</span>
                            <span
                              className="absolute top-1.5 right-1.5 text-[9px] px-2 py-0.5 rounded-full font-serif font-bold border bg-black/80"
                              style={{ borderColor: mat.rarityColor, color: mat.rarityColor }}
                            >
                              {mat.category === 'CATALYST' ? 'CATALIZADOR' : mat.category}
                            </span>
                          </div>

                          <h5
                            className="font-serif font-bold text-xs sm:text-sm truncate mb-1"
                            style={{ color: mat.rarityColor }}
                          >
                            {mat.name}
                          </h5>
                          <p
                            style={{ fontSize: `${descFontSize}px` }}
                            className="text-[11px] text-slate-300 font-sans leading-snug mb-2"
                          >
                            {mat.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-serif font-bold">
                          <span className="text-slate-400">En inventario:</span>
                          <span className="text-amber-300 font-mono">{forgeInventory[mat.id] || 0} unidades</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL INFORMATIVO DE RESULTADO DE FORJA (ÉXITO O FALLO) */}
      {forgeResultModal && (
        <div
          className={`fixed inset-0 bg-black/90 z-[195] overflow-y-auto touch-pan-y p-4 flex flex-col items-center justify-center ${blurMd} animate-fadeIn [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
          onClick={closeForgeResultModal}
        >
          <div
            className="m-auto max-w-sm w-full bg-black/95 border-2 rounded-3xl p-5 sm:p-6 shadow-[0_0_60px_rgba(0,0,0,0.95)] text-center flex flex-col items-center max-h-[92dvh] overflow-y-auto touch-pan-y pointer-events-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            style={{
              borderColor: forgeResultModal.color,
              boxShadow: `0 0 50px ${forgeResultModal.color}50`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-full h-40 sm:h-44 rounded-2xl border-2 overflow-hidden relative mb-3 shadow-[0_0_35px_rgba(0,0,0,0.9)] flex items-center justify-center bg-black/90"
              style={{
                borderColor: forgeResultModal.color,
                boxShadow: `0 0 30px ${forgeResultModal.color}60`,
              }}
            >
              {forgeResultModal.success ? (
                forgeResultModal.itemType === 'DIE' ? (
                  (() => {
                    const dieUrls = getDieImageCandidateUrls(
                      forgeResultModal.itemName,
                      forgeResultModal.itemId,
                      forgeResultModal.itemRarity
                    );
                    return (
                      <CachedImage
                        cacheKey={getDieImageCacheKey(
                          forgeResultModal.itemName,
                          forgeResultModal.itemId,
                          forgeResultModal.itemRarity
                        )}
                        candidateUrls={dieUrls}
                        alt={forgeResultModal.itemName}
                        className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] transform scale-105"
                      />
                    );
                  })()
                ) : (
                  (() => {
                    const orbUrls = getOrbAllCandidateUrls(
                      forgeResultModal.itemName,
                      forgeResultModal.itemElement || 'Oscuro',
                      forgeResultModal.itemId
                    );
                    return (
                      <CachedImage
                        cacheKey={`forge_res_orb_${forgeResultModal.itemId || forgeResultModal.itemName}`}
                        candidateUrls={orbUrls}
                        alt={forgeResultModal.itemName}
                        className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(168,85,247,0.4)] transform scale-105"
                      />
                    );
                  })()
                )
              ) : (
                (() => {
                  const failUrls = getForgeFailImageUrls(forgeResultModal.itemType === 'ORB' ? 'ORB' : 'DIE');
                  return (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <CachedImage
                        cacheKey={`forge_fail_${forgeResultModal.itemType}`}
                        candidateUrls={failUrls}
                        alt={forgeResultModal.title}
                        className="w-full h-full object-contain filter drop-shadow-[0_0_25px_rgba(239,68,68,0.7)]"
                      />
                      <span className="text-5xl absolute -z-10 animate-bounce">{forgeResultModal.icon}</span>
                    </div>
                  );
                })()
              )}
            </div>

            <span
              className="text-[10px] font-mono uppercase tracking-widest font-bold px-3 py-0.5 rounded-full mb-1 border"
              style={{
                color: forgeResultModal.color,
                backgroundColor: `${forgeResultModal.color}15`,
                borderColor: `${forgeResultModal.color}40`,
              }}
            >
              {forgeResultModal.success ? 'RANGO DE ARTÍFICE' : 'INESTABILIDAD MATERIAL'}
            </span>

            <h3
              className="text-lg sm:text-xl font-black font-serif tracking-widest mb-1 leading-tight"
              style={{ color: forgeResultModal.color }}
            >
              {forgeResultModal.title}
            </h3>

            <div className="w-full bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800 mb-3 text-center flex flex-col gap-1 shadow-inner">
              <span className="font-serif font-black text-sm text-slate-100">
                {forgeResultModal.itemName}
              </span>
              <span className="text-[11px] text-slate-400 font-sans leading-tight">
                {forgeResultModal.itemDetails}
              </span>
              <p className="text-[10px] text-slate-300 font-serif italic mt-1 border-t border-slate-800/80 pt-1.5">
                «{forgeResultModal.message}»
              </p>
            </div>

            <div className="w-full bg-purple-950/40 border border-purple-500/40 rounded-xl p-2 mb-4 flex items-center justify-between text-xs font-serif font-bold text-purple-200">
              <span>Experiencia de Maestría:</span>
              <span className="text-amber-300 font-mono">
                {forgeResultModal.expGained > 0
                  ? `+${forgeResultModal.expGained} EXP`
                  : `NIVEL MÁXIMO (${MAX_FORGE_MASTERY_LEVEL}/${MAX_FORGE_MASTERY_LEVEL})`}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                closeForgeResultModal();
                gameAudio.playCrispClick();
              }}
              className="w-full py-2.5 px-6 rounded-full font-serif font-black text-xs sm:text-sm tracking-wider uppercase transition transform active:scale-95 shadow-xl border cursor-pointer text-black"
              style={{
                backgroundColor: forgeResultModal.color,
                borderColor: '#ffffff',
                boxShadow: `0 0 20px ${forgeResultModal.color}80`,
              }}
            >
              {forgeResultModal.success ? 'RECOGER ARTÍCULO' : 'CONTINUAR'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgeView;
