import React, { useState, useRef } from 'react';
import { Orb } from './types';
import { gameAudio, isAndroidDevice, useCompactViewport } from './utils';
import { getOrbAllCandidateUrls } from './irvbeOrbImages';
import { getCachedVerifiedUrl } from './imageOptimizer';
import {
  MASTER_BACKGROUND_CANDIDATES,
  MASTER_AVATAR_CANDIDATES,
  getHaloCandidateUrls,
} from './masterImageMap';
import { CachedImage } from './CachedImage';

const MAIN_RAW_BASE = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';
const MAIN_CDN_BASE = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';

export interface MasterCustomizationData {
  title: string;
  avatarColor: string;
  attachedOrbs: Orb[];
  orbSlots?: (Orb | null)[];
}

interface MasterPieceModalProps {
  playerName: string;
  playerLevel: number;
  maxPlayerHp?: number;
  masterAtkBonus?: number;
  masterCustomization: MasterCustomizationData;
  onUpdateMasterCustomization: React.Dispatch<React.SetStateAction<MasterCustomizationData>>;
  orbBank: Orb[];
  onUpdateOrbBank: (updater: (prev: Orb[]) => Orb[]) => void;
  triggerNotification?: (text: string, color?: string) => void;
  onClose: () => void;
}

const EXIT_ICON_CANDIDATES = [
  `${MAIN_CDN_BASE}/icono_salir.webp`,
  `${MAIN_RAW_BASE}/icono_salir.webp`,
  './assets/icono_salir.webp',
];

function getNormalizedOrbSlots(customization: MasterCustomizationData): (Orb | null)[] {
  if (Array.isArray(customization.orbSlots)) {
    return [0, 1, 2].map((idx) => customization.orbSlots![idx] ?? null);
  }
  const attached = customization.attachedOrbs || [];
  return [0, 1, 2].map((idx) => attached[idx] ?? null);
}

const AVATAR_COLORS = [
  { label: 'Rey Celeste', hex: '#38bdf8', bg: 'bg-cyan-500' },
  { label: 'Aura Solar', hex: '#fbbf24', bg: 'bg-amber-500' },
  { label: 'Esmeralda Vital', hex: '#10b981', bg: 'bg-emerald-500' },
  { label: 'Carmesí Real', hex: '#ef4444', bg: 'bg-rose-500' },
  { label: 'Amatista Arcana', hex: '#a855f7', bg: 'bg-purple-500' },
  { label: 'Acero de Platino', hex: '#e2e8f0', bg: 'bg-slate-200' },
];

const MASTER_TITLES = [
  'Rey Soberano Celeste',
  'Campeón de los Siete Dados',
  'Comandante de la Orden Astral',
  'Señor del Trono Dorado',
  'Guardián de la Callejuela',
  'Invocador Legendario',
];

function FullscreenMasterBackground() {
  const cachedBg = getCachedVerifiedUrl('master_throne');
  const candidateUrls = cachedBg
    ? [cachedBg, ...MASTER_BACKGROUND_CANDIDATES.filter((u) => u !== cachedBg)]
    : MASTER_BACKGROUND_CANDIDATES;

  return (
    <CachedImage
      cacheKey="master_throne"
      candidateUrls={candidateUrls}
      alt="Trono del Rey Soberano"
      loading="eager"
      className="absolute inset-0 w-full h-full object-cover object-center filter brightness-90 contrast-105 transition-opacity duration-300 pointer-events-none select-none"
    />
  );
}

export function MasterPieceModal({
  playerName,
  playerLevel,
  maxPlayerHp = 20,
  masterAtkBonus = 0,
  masterCustomization,
  onUpdateMasterCustomization,
  orbBank,
  onUpdateOrbBank,
  triggerNotification,
  onClose,
}: MasterPieceModalProps) {
  const [activeTab, setActiveTab] = useState<'IDENTIDAD' | 'AUREOLA' | 'ORBES'>('IDENTIDAD');
  const [isSectionModalOpen, setIsSectionModalOpen] = useState<boolean>(false);
  const isSectionModalOpenRef = useRef<boolean>(false);
  isSectionModalOpenRef.current = isSectionModalOpen;
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const selectedSlotIndexRef = useRef<number | null>(selectedSlotIndex);
  selectedSlotIndexRef.current = selectedSlotIndex;
  const masterCustomizationRef = useRef<MasterCustomizationData>(masterCustomization);
  masterCustomizationRef.current = masterCustomization;
  const orbBankRef = useRef<Orb[]>(orbBank);
  orbBankRef.current = orbBank;
  const isCompact = useCompactViewport(460, 640);
  const isAndroid = isAndroidDevice();
  const blurMd = isAndroid ? '' : 'backdrop-blur-md';
  const blurSoft = isAndroid ? '' : 'backdrop-blur-[3px]';

  const maxSlots = playerLevel >= 7 ? 3 : playerLevel >= 5 ? 2 : playerLevel >= 3 ? 1 : 0;
  const nextSlotUnlockLevel = playerLevel < 3 ? 3 : playerLevel < 5 ? 5 : playerLevel < 7 ? 7 : null;

  const totalStats = masterCustomization.attachedOrbs.reduce(
    (acc, orb) => {
      acc.hp += orb.bonusHp || 0;
      acc.atk += orb.bonusAtk || 0;
      return acc;
    },
    { hp: 0, atk: 0 }
  );

  const cachedAvatar = getCachedVerifiedUrl('master_avatar');
  const avatarCandidates = cachedAvatar
    ? [cachedAvatar, ...MASTER_AVATAR_CANDIDATES.filter((u) => u !== cachedAvatar)]
    : MASTER_AVATAR_CANDIDATES;

  const orbSlots = getNormalizedOrbSlots(masterCustomization);
  const currentHaloUrls = getHaloCandidateUrls(masterCustomization.avatarColor);
  const cachedHalo = getCachedVerifiedUrl(`halo_${masterCustomization.avatarColor}`);
  const haloCandidates = cachedHalo
    ? [cachedHalo, ...currentHaloUrls.filter((u) => u !== cachedHalo)]
    : currentHaloUrls;

  const getMasterIconCandidates = (primaryNames: string[]) => {
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

  const masterSections = [
    {
      id: 'IDENTIDAD' as const,
      title: 'REY SOBERANO',
      sub: `Comandante ${playerName} • Nivel ${playerLevel}`,
      color: masterCustomization.avatarColor || '#38bdf8',
      badge: `${maxPlayerHp + totalStats.hp} HP • ${6 + masterAtkBonus + totalStats.atk} ATK`,
      desc: 'Inspecciona el retrato de tu Ficha Maestra, consulta sus atributos base y elige tu título heráldico real.',
      iconCandidates: getMasterIconCandidates(['icono_ficha_maestra']),
    },
    {
      id: 'AUREOLA' as const,
      title: 'AUREOLA ELEMENTAL',
      sub: AVATAR_COLORS.find((c) => c.hex === masterCustomization.avatarColor)?.label || 'Rey Celeste',
      color: '#fbbf24',
      badge: AVATAR_COLORS.find((c) => c.hex === masterCustomization.avatarColor)?.label || 'Aura Activa',
      desc: 'Sintoniza el color y el resplandor de la aureola elemental que rodea a tu Soberano en el tablero 3D.',
      iconCandidates: getMasterIconCandidates(['icono_forja_orbes']),
    },
    {
      id: 'ORBES' as const,
      title: 'RANURAS DE ORBES',
      sub: 'Engarce de Poder Permanente',
      color: '#a855f7',
      badge: `${masterCustomization.attachedOrbs.length}/${maxSlots} Ranuras • ${orbBank.length} Orbes`,
      desc: 'Engarza orbes elementales directamente en tu Rey Soberano para potenciar permanentemente su salud y ataque.',
      iconCandidates: getMasterIconCandidates(['icono_taller_orbes']),
    },
  ];

  const selectedSec = masterSections.find((s) => s.id === activeTab) || masterSections[0];

  const openSectionModal = (tabId: typeof activeTab) => {
    if (isSectionModalOpenRef.current) return;
    isSectionModalOpenRef.current = true;
    gameAudio.playConfirmSelect();
    setActiveTab(tabId);
    setIsSectionModalOpen(true);
  };

  const closeSectionModal = () => {
    isSectionModalOpenRef.current = false;
    setIsSectionModalOpen(false);
  };

  const handleEquipOrb = (orbToEquip: Orb) => {
    if (orbToEquip.minHeroLevel && playerLevel < orbToEquip.minHeroLevel) {
      gameAudio.playErrorBuzz();
      if (triggerNotification) {
        triggerNotification(
          `🔒 Requiere que tu héroe alcance el Nivel ${orbToEquip.minHeroLevel} para poder engarzar el ${orbToEquip.name}.`,
          '#f59e0b'
        );
      }
      return;
    }

    const liveBank = orbBankRef.current;
    const liveBankIdx =
      liveBank.indexOf(orbToEquip) !== -1
        ? liveBank.indexOf(orbToEquip)
        : orbToEquip.id
        ? liveBank.findIndex((o) => o.id === orbToEquip.id)
        : -1;
    // Bloqueo síncrono contra doble tap: si el orbe ya salió del banco en este render, ignorar
    if (liveBankIdx === -1) return;

    const liveCustom = masterCustomizationRef.current;
    const liveSlots = getNormalizedOrbSlots(liveCustom);
    // Evitar duplicar si el mismo orbe ya quedó engarzado en alguna ranura
    if (
      liveSlots.some(
        (slotOrb) =>
          slotOrb === orbToEquip || (Boolean(orbToEquip.id) && slotOrb?.id === orbToEquip.id)
      )
    ) {
      return;
    }

    let targetSlot = selectedSlotIndexRef.current;
    if (targetSlot === null || targetSlot >= maxSlots) {
      const firstFree = [0, 1, 2].slice(0, maxSlots).find((idx) => !liveSlots[idx]);
      targetSlot = firstFree !== undefined ? firstFree : 0;
    }

    if (targetSlot >= maxSlots) return;

    const liveOrbToEquip = liveBank[liveBankIdx];
    const existingOrb = liveSlots[targetSlot];
    const nextSlots = [...liveSlots];
    nextSlots[targetSlot] = liveOrbToEquip;

    const nextCustom: MasterCustomizationData = {
      ...liveCustom,
      orbSlots: nextSlots,
      attachedOrbs: nextSlots.filter((o): o is Orb => Boolean(o)),
    };
    masterCustomizationRef.current = nextCustom;

    const filteredLiveBank = liveBank.filter((_, idx) => idx !== liveBankIdx);
    const shouldReturnExistingLive =
      existingOrb &&
      !filteredLiveBank.includes(existingOrb) &&
      (!existingOrb.id || !filteredLiveBank.some((o) => o.id === existingOrb.id));
    orbBankRef.current = shouldReturnExistingLive
      ? [...filteredLiveBank, existingOrb]
      : filteredLiveBank;

    selectedSlotIndexRef.current = null;
    setSelectedSlotIndex(null);
    onUpdateMasterCustomization((prev) => ({
      ...prev,
      orbSlots: nextSlots,
      attachedOrbs: nextSlots.filter((o): o is Orb => Boolean(o)),
    }));

    onUpdateOrbBank((prev) => {
      const refIdx = prev.indexOf(liveOrbToEquip);
      const targetIdx =
        refIdx !== -1
          ? refIdx
          : liveOrbToEquip.id
          ? prev.findIndex((o) => o.id === liveOrbToEquip.id)
          : -1;
      // Sin fallback destructivo por índice: si ya fue removido, no tocar otros orbes ni devolver existingOrb otra vez
      if (targetIdx === -1) return prev;

      const filtered = prev.filter((_, idx) => idx !== targetIdx);
      if (
        existingOrb &&
        !filtered.includes(existingOrb) &&
        (!existingOrb.id || !filtered.some((o) => o.id === existingOrb.id))
      ) {
        return [...filtered, existingOrb];
      }
      return filtered;
    });

    gameAudio.playPowerupChime();
  };

  const handleUnequipOrb = (slotIdx: number) => {
    const liveCustom = masterCustomizationRef.current;
    const liveSlots = getNormalizedOrbSlots(liveCustom);
    const orbToUnequip = liveSlots[slotIdx];
    // Bloqueo síncrono contra doble tap: si la ranura ya fue vaciada en este frame, ignorar
    if (!orbToUnequip) return;

    const nextSlots = [...liveSlots];
    nextSlots[slotIdx] = null;
    const nextCustom: MasterCustomizationData = {
      ...liveCustom,
      orbSlots: nextSlots,
      attachedOrbs: nextSlots.filter((o): o is Orb => Boolean(o)),
    };
    masterCustomizationRef.current = nextCustom;

    const liveBank = orbBankRef.current;
    const alreadyInLiveBank =
      liveBank.includes(orbToUnequip) ||
      (Boolean(orbToUnequip.id) && liveBank.some((o) => o.id === orbToUnequip.id));
    if (!alreadyInLiveBank) {
      orbBankRef.current = [...liveBank, orbToUnequip];
    }

    onUpdateMasterCustomization((prev) => ({
      ...prev,
      orbSlots: nextSlots,
      attachedOrbs: nextSlots.filter((o): o is Orb => Boolean(o)),
    }));
    onUpdateOrbBank((prev) => {
      const existsInPrev =
        prev.includes(orbToUnequip) ||
        (Boolean(orbToUnequip.id) && prev.some((o) => o.id === orbToUnequip.id));
      if (existsInPrev) return prev;
      return [...prev, orbToUnequip];
    });

    if (selectedSlotIndexRef.current === slotIdx) {
      selectedSlotIndexRef.current = null;
      setSelectedSlotIndex(null);
    }
    gameAudio.playCrispClick();
  };

  const renderVolverButton = (handleBack: () => void) => (
    <button
      type="button"
      onClick={() => {
        gameAudio.playCrispClick();
        handleBack();
      }}
      className={`flex flex-col items-center justify-center p-1.5 sm:p-2 px-2.5 sm:px-3 rounded-2xl border-0 outline-none focus:outline-none transition-all duration-300 transform active:scale-95 cursor-pointer group relative ${blurMd} shrink-0`}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        boxShadow: '0 0 35px rgba(56, 189, 248, 0.55), inset 0 0 20px rgba(56, 189, 248, 0.35)',
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
      <span className="font-serif font-bold tracking-widest text-slate-300 group-hover:text-cyan-300 transition-colors text-[9px] sm:text-[10px] mt-0.5">
        VOLVER
      </span>
    </button>
  );

  const renderSovereignCard = () => (
    <div
      className={`p-4 sm:p-5 rounded-2xl bg-black/85 border-2 flex flex-col items-center text-center shadow-2xl relative overflow-hidden ${blurMd}`}
      style={{
        borderColor: `${masterCustomization.avatarColor}90`,
        boxShadow: `0 0 35px ${masterCustomization.avatarColor}30`,
      }}
    >
      <div className="relative w-36 h-36 flex items-center justify-center mb-3">
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center scale-125 z-0">
          <CachedImage
            key={`halo_preview_${masterCustomization.avatarColor}`}
            cacheKey={`halo_${masterCustomization.avatarColor}`}
            candidateUrls={haloCandidates}
            alt="Aureola de Poder"
            loading="eager"
            fallbackPlaceholder={<></>}
            className="w-full h-full object-contain mix-blend-screen animate-pulse"
            style={{
              filter: `drop-shadow(0 0 12px ${masterCustomization.avatarColor})`,
            }}
          />
        </div>

        <div
          className="w-24 h-24 rounded-2xl overflow-hidden relative z-10 border-2 shadow-[0_0_25px_rgba(0,0,0,0.8)] bg-slate-950 flex items-center justify-center"
          style={{ borderColor: masterCustomization.avatarColor }}
        >
          <CachedImage
            cacheKey="master_avatar"
            candidateUrls={avatarCandidates}
            alt="Rey Soberano"
            className="w-full h-full object-cover"
          />
          <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded-md bg-black/85 text-[10px] font-mono font-bold text-amber-300 border border-amber-400/50">
            Lv.{playerLevel}
          </span>
        </div>
      </div>

      <h3
        className="font-serif font-black text-sm sm:text-base tracking-wide relative z-10"
        style={{ color: masterCustomization.avatarColor }}
      >
        {masterCustomization.title}
      </h3>
      <span className="text-xs text-slate-300 font-mono mt-0.5 relative z-10">
        Comandante {playerName}
      </span>

      <div className="grid grid-cols-2 gap-2.5 w-full mt-4 pt-3 border-t border-slate-800 relative z-10">
        <div className="bg-slate-950/90 rounded-xl p-2.5 border border-slate-800">
          <span className="text-[10px] text-slate-400 block font-mono">SALUD REAL</span>
          <strong className="text-rose-400 font-serif font-black text-sm">
            {maxPlayerHp + totalStats.hp} HP
            {totalStats.hp > 0 && <span className="text-xs text-emerald-400"> (+{totalStats.hp})</span>}
          </strong>
        </div>
        <div className="bg-slate-950/90 rounded-xl p-2.5 border border-slate-800">
          <span className="text-[10px] text-slate-400 block font-mono">ATAQUE REAL</span>
          <strong className="text-amber-400 font-serif font-black text-sm">
            {6 + masterAtkBonus + totalStats.atk} ATK
            {totalStats.atk > 0 && <span className="text-xs text-emerald-400"> (+{totalStats.atk})</span>}
          </strong>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[150] overflow-hidden select-none bg-black flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn">
      {/* FONDO PANORÁMICO COMPLETO DE LA SALA DEL TRONO */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
        <FullscreenMasterBackground />
        <div className="absolute inset-0 bg-radial-vignette from-transparent via-black/25 to-black/75 pointer-events-none" />
      </div>

      {!isSectionModalOpen && (
        <>
      {/* BARRA SUPERIOR ELEGANTE ESTILO CÓDICE / TALLER / FORJA */}
      <div className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 pointer-events-auto gap-2">
        <div className={`flex flex-col text-left px-3 py-1.5 rounded-2xl bg-black/85 border border-cyan-500/50 shadow-lg ${blurMd}`}>
          <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase drop-shadow">
            FICHA MAESTRA • NIVEL {playerLevel} ({maxSlots} RANURAS)
          </span>
          <h2
            className="text-lg sm:text-2xl font-black font-serif tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,1)] uppercase transition-colors"
            style={{ color: selectedSec.color }}
          >
            {selectedSec.title}
          </h2>
        </div>

        {renderVolverButton(onClose)}
      </div>

      {/* CUERPO CENTRAL: 3 ICONOS LUMINOSOS ADAPTABLES SIN RECORTE */}
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
          {masterSections.map((sec) => {
            const isSelected = activeTab === sec.id;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={(e) => {
                  if (activeTab === sec.id || e.detail >= 2) {
                    openSectionModal(sec.id);
                  } else {
                    setActiveTab(sec.id);
                    gameAudio.playCrispClick();
                  }
                }}
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse' && activeTab !== sec.id) {
                    setActiveTab(sec.id);
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
                <div
                  className="absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden pointer-events-none transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle at center, ${sec.color}65 0%, transparent 80%)`,
                    opacity: isSelected ? 1 : 0.6,
                  }}
                />

                <CachedImage
                  cacheKey={`master_sec_icon_${sec.id}`}
                  candidateUrls={sec.iconCandidates}
                  alt={sec.title}
                  loading="eager"
                  fallbackPlaceholder={<></>}
                  className="w-full h-full object-contain filter brightness-110 contrast-110 pointer-events-none select-none transition-transform duration-300 relative z-10"
                  style={{ mixBlendMode: 'screen' }}
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

      {/* PIE DE PANTALLA: PANEL INFORMATIVO TRANSLÚCIDO CON ACCESO DIRECTO */}
      <div
        className="relative z-10 w-full max-w-4xl flex items-center justify-center pb-3 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => openSectionModal(selectedSec.id)}
          className={`w-full max-w-lg px-6 py-2.5 rounded-2xl bg-black/85 border border-cyan-500/40 hover:border-cyan-400 ${blurMd} text-center shadow-2xl animate-fadeIn transition transform active:scale-[0.99] cursor-pointer`}
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

      {/* SUB-VISTA DETALLADA DE LA SECCIÓN ACTIVA SIN CAJA MODAL OPACA (reutiliza el único fondo del Trono) */}
      {isSectionModalOpen && (
        <div
          className={`fixed inset-0 z-[155] overflow-hidden touch-auto select-none ${isAndroid ? 'bg-black/80' : `bg-black/70 ${blurSoft}`} flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn`}
          onClick={closeSectionModal}
        >

          {/* Barra superior de la sub-vista */}
          <div
            className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 mb-2 pointer-events-auto gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex flex-col text-left px-3 py-1.5 rounded-2xl bg-black/85 border border-cyan-500/50 shadow-lg ${blurMd}`}>
              <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase drop-shadow">
                FICHA MAESTRA • PERSONALIZACIÓN
              </span>
              <h2
                className="text-lg sm:text-2xl font-black font-serif tracking-wider drop-shadow uppercase"
                style={{ color: selectedSec.color }}
              >
                {selectedSec.title}
              </h2>
            </div>

            {renderVolverButton(closeSectionModal)}
          </div>

          {/* Contenido central translúcido */}
          <div
            className="relative z-10 w-full max-w-5xl flex-1 min-h-0 flex flex-col justify-start pointer-events-auto my-auto overflow-y-auto touch-pan-y px-1 sm:px-3 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* SECCIÓN 1: IDENTIDAD Y TÍTULO HERÁLDICO */}
            {activeTab === 'IDENTIDAD' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pb-4">
                <div className="md:col-span-5">{renderSovereignCard()}</div>

                <div className="md:col-span-7 flex flex-col gap-3.5">
                  <div className={`p-4 rounded-2xl bg-black/85 border border-cyan-500/40 ${blurMd} shadow-xl`}>
                    <h4 className="text-xs sm:text-sm font-serif font-black text-cyan-300 mb-1">
                      TÍTULO HERÁLDICO DEL SOBERANO
                    </h4>
                    <p className="text-[11px] text-slate-300 font-sans mb-3">
                      Elige el blasón y título oficial con el que tu Rey Soberano liderará tus ejércitos en la arena.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {MASTER_TITLES.map((titleOption) => {
                        const isSelectedTitle = masterCustomization.title === titleOption;
                        return (
                          <button
                            key={titleOption}
                            type="button"
                            onClick={() => {
                              gameAudio.playConfirmSelect();
                              const nextCustom: MasterCustomizationData = {
                                ...masterCustomizationRef.current,
                                title: titleOption,
                              };
                              masterCustomizationRef.current = nextCustom;
                              onUpdateMasterCustomization((prev) => ({
                                ...prev,
                                title: titleOption,
                              }));
                            }}
                            className={`p-3 rounded-xl border text-left transition transform active:scale-95 cursor-pointer flex items-center justify-between gap-2 ${
                              isSelectedTitle
                                ? 'bg-cyan-950/75 border-cyan-400 text-cyan-200 shadow-[0_0_18px_rgba(56,189,248,0.45)]'
                                : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-cyan-500/50 hover:text-white'
                            }`}
                          >
                            <span className="font-serif font-bold text-xs">{titleOption}</span>
                            {isSelectedTitle && (
                              <span className="text-[10px] font-mono font-black text-cyan-300 shrink-0">
                                ACTIVO
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECCIÓN 2: AUREOLA ELEMENTAL */}
            {activeTab === 'AUREOLA' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pb-4">
                <div className="md:col-span-5">{renderSovereignCard()}</div>

                <div className="md:col-span-7 flex flex-col gap-3.5">
                  <div className={`p-4 rounded-2xl bg-black/85 border border-amber-500/40 ${blurMd} shadow-xl`}>
                    <h4 className="text-xs sm:text-sm font-serif font-black text-amber-300 mb-1">
                      SELECCIÓN DE AUREOLA ELEMENTAL
                    </h4>
                    <p className="text-[11px] text-slate-300 font-sans mb-3">
                      Define la frecuencia luminosa del aura que envuelve a tu Ficha Maestra y a sus marcos de rango.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {AVATAR_COLORS.map((c) => {
                        const isSelected = masterCustomization.avatarColor === c.hex;
                        return (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => {
                              gameAudio.playConfirmSelect();
                              const nextCustom: MasterCustomizationData = {
                                ...masterCustomizationRef.current,
                                avatarColor: c.hex,
                              };
                              masterCustomizationRef.current = nextCustom;
                              onUpdateMasterCustomization((prev) => ({
                                ...prev,
                                avatarColor: c.hex,
                              }));
                            }}
                            className={`p-3 rounded-xl border-2 text-left transition transform active:scale-95 cursor-pointer flex items-center gap-3 ${
                              isSelected
                                ? 'bg-black/90 border-white shadow-lg scale-[1.01]'
                                : 'bg-slate-950/80 border-slate-800 opacity-85 hover:opacity-100 hover:border-slate-600'
                            }`}
                            style={{
                              boxShadow: isSelected ? `0 0 24px ${c.hex}65` : undefined,
                            }}
                          >
                            <span
                              className={`w-8 h-8 rounded-xl border border-white/50 shrink-0 ${c.bg}`}
                              style={{ boxShadow: `0 0 14px ${c.hex}` }}
                            />
                            <div className="min-w-0 flex-1">
                              <span className="font-serif font-black text-xs block truncate" style={{ color: c.hex }}>
                                {c.label}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {isSelected ? 'Aureola equipada' : 'Tocar para activar'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECCIÓN 3: RANURAS ELEMENTALES Y BANCO DE ORBES */}
            {activeTab === 'ORBES' && (
              <div className="space-y-4 pb-4">
                <div className={`p-4 rounded-2xl bg-black/85 border border-cyan-500/40 ${blurMd} shadow-xl`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-xs sm:text-sm font-serif font-black text-cyan-300">
                        RANURAS DE ORBES ELEMENTALES ({masterCustomization.attachedOrbs.length}/{maxSlots})
                      </h4>
                      <p className="text-[11px] text-slate-300 font-sans">
                        Los orbes engarzados potencian permanentemente a tu Rey Soberano en todos los modos.
                      </p>
                    </div>
                    {nextSlotUnlockLevel && (
                      <span className="text-[10px] text-amber-300 font-mono px-2.5 py-1 rounded-full bg-amber-950/50 border border-amber-500/40">
                        🔒 Siguiente ranura en Nivel {nextSlotUnlockLevel}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[0, 1, 2].map((slotIdx) => {
                      const isUnlocked = slotIdx < maxSlots;
                      const attached = orbSlots[slotIdx];
                      const isSelected = selectedSlotIndex === slotIdx;

                      if (!isUnlocked) {
                        const unlockLevel = slotIdx === 0 ? 3 : slotIdx === 1 ? 5 : 7;
                        return (
                          <div
                            key={slotIdx}
                            className="h-32 rounded-2xl border border-dashed border-slate-700 bg-black/50 flex flex-col items-center justify-center p-3 text-center opacity-60"
                          >
                            <span className="text-2xl mb-1">🔒</span>
                            <span className="text-xs text-slate-300 font-serif font-bold">
                              Ranura {slotIdx + 1}
                            </span>
                            <span className="text-[10px] text-amber-400 font-mono mt-0.5">
                              Desbloquea en Lv.{unlockLevel}
                            </span>
                          </div>
                        );
                      }

                      if (attached) {
                        const orbCandidateUrls = getOrbAllCandidateUrls(attached.name, attached.element, attached.id);
                        return (
                          <div
                            key={slotIdx}
                            className="h-32 rounded-2xl border-2 border-purple-500/80 bg-purple-950/30 flex flex-col items-center justify-between p-2.5 text-center shadow-lg"
                          >
                            <div className="w-11 h-11 rounded-xl overflow-hidden bg-black/80 border border-purple-400/50 flex items-center justify-center p-0.5">
                              <CachedImage
                                cacheKey={`master_slot_orb_${attached.id || attached.name}`}
                                candidateUrls={orbCandidateUrls}
                                alt={attached.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="min-w-0 w-full">
                              <span className="font-serif font-black text-xs text-purple-200 block truncate leading-tight">
                                {attached.name}
                              </span>
                              <span className="text-[10px] text-purple-300 font-mono block">
                                +{attached.bonusHp || 0} HP • +{attached.bonusAtk || 0} ATK
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUnequipOrb(slotIdx)}
                              className="px-3 py-0.5 rounded-full bg-rose-900/70 hover:bg-rose-700 text-rose-200 text-[10px] font-serif font-bold border border-rose-500/50 cursor-pointer active:scale-95 transition"
                            >
                              Quitar
                            </button>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={slotIdx}
                          type="button"
                          onClick={() => {
                            gameAudio.playCrispClick();
                            setSelectedSlotIndex(isSelected ? null : slotIdx);
                          }}
                          className={`h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center transition cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-950/45 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                              : 'border-cyan-600/50 hover:border-cyan-400 bg-black/60'
                          }`}
                        >
                          <span className="text-xl mb-1 text-cyan-300">➕</span>
                          <span className="text-xs font-serif font-bold text-cyan-300">
                            Ranura {slotIdx + 1} Libre
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            {isSelected ? 'Elige un orbe abajo' : 'Toca para engarzar'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Banco de Orbes Disponibles */}
                <div className={`p-4 rounded-2xl bg-black/85 border border-purple-500/40 ${blurMd} shadow-xl`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs sm:text-sm font-serif font-black text-purple-300">
                      BANCO DE ORBES DISPONIBLES ({orbBank.length})
                    </h4>
                    {selectedSlotIndex !== null && (
                      <span className="text-[10px] text-cyan-300 font-mono animate-pulse">
                        Engarzando en Ranura {selectedSlotIndex + 1}
                      </span>
                    )}
                  </div>

                  {orbBank.length === 0 ? (
                    <div className="p-6 text-center rounded-xl bg-black/60 border border-slate-800 text-slate-400 text-xs font-sans">
                      <span className="block font-serif font-bold text-slate-300 mb-1">
                        No tienes orbes disponibles en tu banco.
                      </span>
                      <span>
                        Gana batallas en la Callejuela o compra orbes en la Tienda de Solomon.
                      </span>
                    </div>
                  ) : maxSlots === 0 ? (
                    <div className="p-6 text-center rounded-xl bg-black/60 border border-amber-500/30 text-amber-400 text-xs font-sans">
                      <span className="block font-serif font-bold mb-1">
                        🔒 Las ranuras de la Ficha Maestra están bloqueadas.
                      </span>
                      <span className="text-slate-300">
                        Alcanza el Nivel 3 venciendo duelistas en la Callejuela para desbloquear tu primera ranura.
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {orbBank.map((orb, oIdx) => {
                        const orbCandidateUrls = getOrbAllCandidateUrls(orb.name, orb.element, orb.id);
                        const isLevelLocked = Boolean(orb.minHeroLevel && playerLevel < orb.minHeroLevel);
                        return (
                          <button
                            key={`${orb.id}_${oIdx}`}
                            type="button"
                            onClick={() => handleEquipOrb(orb)}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition active:scale-95 ${
                              isLevelLocked
                                ? 'border-amber-500/40 bg-slate-950/60 opacity-70 cursor-not-allowed'
                                : 'border-purple-500/50 hover:border-purple-300 bg-slate-950/85 hover:bg-purple-950/40 cursor-pointer'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/80 border border-purple-500/40 flex items-center justify-center shrink-0 p-0.5">
                              <CachedImage
                                cacheKey={`master_bank_orb_${orb.id || orb.name}`}
                                candidateUrls={orbCandidateUrls}
                                alt={orb.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-serif font-bold text-xs text-purple-200 block truncate">
                                {orb.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono block truncate">
                                +{orb.bonusHp || 0} HP • +{orb.bonusAtk || 0} ATK
                              </span>
                              {isLevelLocked && (
                                <span className="text-[9px] text-amber-400 font-mono font-bold block mt-0.5">
                                  🔒 Req. Nivel {orb.minHeroLevel}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
