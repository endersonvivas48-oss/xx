import React, { useState, useRef } from 'react';
import { gameAudio, isAndroidDevice, useCompactViewport } from './utils';
import { getSpellImageCandidateUrls } from './spellImageMap';
import { GoldCoinIcon } from './GoldCoinIcon';
import { CachedImage } from './CachedImage';

export interface SpellItem {
  id: string;
  name: string;
  category: 'Básico' | 'Avanzado';
  cost: number;
  desc: string;
  icon: string;
  color: string;
  unlockedByDefault: boolean;
  price: number;
  minHeroLevel?: number;
}

export interface GrimoireViewProps {
  unlockedSpells: string[];
  maxSpellSlots: number;
  equippedSpells: string[];
  setEquippedSpells: React.Dispatch<React.SetStateAction<string[]>>;
  playerLevel?: number;
  onClose: () => void;
  onOpenShop: () => void;
  FullscreenLibroBackground: React.FC<{ className?: string }>;
  GRIMOIRE_SPELLS: Record<string, SpellItem>;
  MAIN_CDN_BASE: string;
  MAIN_RAW_BASE: string;
  descFontSize?: number;
  triggerNotification?: (text: string, color?: string) => void;
}

export const GrimoireView: React.FC<GrimoireViewProps> = ({
  unlockedSpells,
  maxSpellSlots,
  equippedSpells,
  setEquippedSpells,
  playerLevel = 1,
  onClose,
  onOpenShop,
  FullscreenLibroBackground,
  GRIMOIRE_SPELLS,
  MAIN_CDN_BASE,
  MAIN_RAW_BASE,
  descFontSize = 12,
  triggerNotification,
}) => {
  const [grimorioActiveSection, setGrimorioActiveSection] = useState<'equipados' | 'basicos' | 'avanzados'>('equipados');
  const [isGrimorioCatalogModalOpen, setIsGrimorioCatalogModalOpen] = useState(false);
  const isGrimorioCatalogModalOpenRef = useRef<boolean>(false);
  isGrimorioCatalogModalOpenRef.current = isGrimorioCatalogModalOpen;
  const equippedSpellsRef = useRef<string[]>(equippedSpells);
  equippedSpellsRef.current = equippedSpells;
  const isCompact = useCompactViewport(460, 640);
  const isAndroid = isAndroidDevice();
  const blurMd = isAndroid ? '' : 'backdrop-blur-md';
  const blurSoft = isAndroid ? '' : 'backdrop-blur-[2px]';

  const handleEquipSpell = (sp: SpellItem, isLevelLocked: boolean, requiredLevel: number) => {
    if (isLevelLocked) {
      gameAudio.playErrorBuzz();
      if (triggerNotification) {
        triggerNotification(`🔒 ${sp.name} requiere Nivel de Héroe ${requiredLevel} para equiparse.`, '#f59e0b');
      }
      return;
    }

    const liveEquipped = equippedSpellsRef.current;
    if (liveEquipped.includes(sp.id)) return;
    if (liveEquipped.length >= maxSpellSlots) {
      gameAudio.playErrorBuzz();
      if (triggerNotification) {
        triggerNotification(`Has alcanzado el límite de ${maxSpellSlots} ranuras de hechizos.`, '#f59e0b');
      }
      return;
    }

    equippedSpellsRef.current = [...liveEquipped, sp.id];
    setEquippedSpells((prev) => {
      if (prev.includes(sp.id) || prev.length >= maxSpellSlots) {
        return prev;
      }
      return [...prev, sp.id];
    });
    gameAudio.playConfirmSelect();
  };

  const handleUnequipSpell = (spellId: string) => {
    equippedSpellsRef.current = equippedSpellsRef.current.filter((id) => id !== spellId);
    setEquippedSpells((prev) => prev.filter((id) => id !== spellId));
    gameAudio.playCrispClick();
  };

  const allSpells = Object.values(GRIMOIRE_SPELLS) as SpellItem[];
  const getRequiredSpellLevel = (sp: SpellItem) => sp.minHeroLevel ?? (sp.category === 'Avanzado' ? 10 : 1);
  const exitIconCandidates = [
    `${MAIN_CDN_BASE}/icono_salir.webp`,
    `${MAIN_RAW_BASE}/icono_salir.webp`,
    'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/icono_salir.webp',
    'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/icono_salir.webp',
  ];

  const grimorioSections = [
    {
      id: 'equipados' as const,
      title: 'RANURAS ACTIVAS',
      sub: 'Hechizos en combate',
      badge: `${equippedSpells.length}/${maxSpellSlots} Slots`,
      color: '#34d399',
      iconName: 'icono_grimorio_equipados',
      desc: 'Gestiona tus ranuras activas para combate. Puedes desequipar conjuros o adquirir ranuras adicionales en la tienda de Salomón.',
      bonus: `${equippedSpells.length}/${maxSpellSlots} Ranuras en uso`,
    },
    {
      id: 'basicos' as const,
      title: 'HECHIZOS BÁSICOS',
      sub: 'Magia de inicio (Nv. 1-9)',
      badge: `${allSpells.filter((s) => s.category === 'Básico').length} Conjuros`,
      color: '#38bdf8',
      iconName: 'icono_grimorio_basicos',
      desc: 'Fundamentos arcanos del invocador. Conjuros elementales de bajo coste de Maná para las primeras fases de combate.',
      bonus: 'Bajo coste de Maná (2 a 4M)',
    },
    {
      id: 'avanzados' as const,
      title: 'HECHIZOS AVANZADOS',
      sub: 'Alta magia (Nv. 10+)',
      badge: `${allSpells.filter((s) => s.category === 'Avanzado').length} Supremos`,
      color: '#c084fc',
      iconName: 'icono_grimorio_avanzados',
      desc: 'Magia devastadora de máximo calibre con efectos decisivos capaces de cambiar el curso de la batalla.',
      bonus: 'Efectos decisivos en batalla',
    },
  ];

  const selectedSec = grimorioSections.find((s) => s.id === grimorioActiveSection) || grimorioSections[0];

  const getGrimorioIconCandidates = (fileBase: string) => [
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

  const openSectionModal = (secId: 'equipados' | 'basicos' | 'avanzados') => {
    if (isGrimorioCatalogModalOpenRef.current) return;
    isGrimorioCatalogModalOpenRef.current = true;
    gameAudio.playConfirmSelect();
    setGrimorioActiveSection(secId);
    setIsGrimorioCatalogModalOpen(true);
  };

  const closeSectionModal = () => {
    isGrimorioCatalogModalOpenRef.current = false;
    setIsGrimorioCatalogModalOpen(false);
  };

  return (
    <div className="absolute inset-0 overflow-hidden select-none bg-black z-20 flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn">
      {/* FONDO DE PANTALLA COMPLETO CON LA ILUSTRACIÓN OFICIAL DEL GRIMORIO */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
        <FullscreenLibroBackground />
        <div className="absolute inset-0 bg-radial-vignette from-transparent via-black/35 to-black/80 pointer-events-none" />
      </div>

      {!isGrimorioCatalogModalOpen && (
        <>
      {/* BARRA SUPERIOR ELEGANTE Y DESPEJADA */}
      <div className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 pointer-events-auto">
        <div className={`flex flex-col text-left px-3 py-1.5 rounded-2xl bg-black/85 border border-amber-500/50 shadow-lg ${blurMd}`}>
          <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase drop-shadow">
            LIBRO DE HECHIZOS Y ARCANOS
          </span>
          <div className="flex items-center gap-2">
            <h2
              className="text-lg sm:text-2xl font-black font-serif tracking-wider uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,1)]"
              style={{ color: selectedSec.color }}
            >
              {selectedSec.title}
            </h2>
          </div>
        </div>

        {/* BOTÓN SUPERIOR DERECHO PARA SALIR: sin borde, solo brillo de fondo y texto debajo */}
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

      {/* CUERPO CENTRAL: 3 ICONOS LUMINOSOS ADAPTABLES SIN RECORTE NI SOLAPAMIENTO */}
      <div
        className="relative z-10 w-full max-w-5xl flex-1 min-h-0 flex flex-row items-center justify-start pointer-events-auto px-2 sm:px-6 my-auto gap-3 sm:gap-5 overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`${
            isCompact
              ? 'flex flex-row flex-wrap items-center justify-start gap-3.5 max-h-full overflow-y-auto touch-pan-y py-3 px-2'
              : 'flex flex-col items-center justify-center gap-3 sm:gap-4 shrink-0 px-4 sm:px-6 py-4 overflow-visible'
          } [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
        >
          {grimorioSections.map((sec) => {
            const isSelected = grimorioActiveSection === sec.id;
            const iconCandidates = getGrimorioIconCandidates(sec.iconName);

            return (
              <button
                key={sec.id}
                type="button"
                onClick={(e) => {
                  if (grimorioActiveSection === sec.id || e.detail >= 2) {
                    openSectionModal(sec.id);
                  } else {
                    setGrimorioActiveSection(sec.id);
                    gameAudio.playCrispClick();
                  }
                }}
                onPointerEnter={(e) => {
                  // Solo seleccionar por hover si proviene de un puntero de ratón real
                  if (e.pointerType === 'mouse' && grimorioActiveSection !== sec.id) {
                    setGrimorioActiveSection(sec.id);
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
                {/* Resplandor radial de fondo idéntico al menú inicial */}
                <div
                  className="absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden pointer-events-none transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle at center, ${sec.color}65 0%, transparent 80%)`,
                    opacity: isSelected ? 1 : 0.6,
                  }}
                />

                {/* Ilustración oficial con mixBlendMode screen para fundir el fondo negro en el halo brillante */}
                <CachedImage
                  cacheKey={`grimorio_sec_icon_${sec.id}`}
                  candidateUrls={iconCandidates}
                  alt={sec.title}
                  loading="eager"
                  fallbackPlaceholder={<></>}
                  className="w-full h-full object-contain filter brightness-110 contrast-110 pointer-events-none select-none transition-transform duration-300 relative z-10"
                  style={{
                    mixBlendMode: 'screen',
                  }}
                />

                {/* Pequeño punto indicador luminoso debajo al seleccionar/posarse */}
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

      {/* MODAL DETALLADO DE GESTIÓN Y CATÁLOGO DE HECHIZOS (reutiliza el único fondo del Grimorio) */}
      {isGrimorioCatalogModalOpen && (
        <div
          className={`fixed inset-0 z-50 overflow-hidden select-none ${isAndroid ? 'bg-black/75' : `bg-black/60 ${blurSoft}`} flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn`}
          onClick={closeSectionModal}
        >

          {/* BARRA SUPERIOR ELEGANTE CON BOTÓN VERTICAL VOLVER */}
          <div
            className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 mb-2 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex flex-col text-left px-3 py-1.5 rounded-2xl bg-black/85 border border-amber-500/50 shadow-lg ${blurMd}`}>
              <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase drop-shadow">
                LIBRO DE HECHIZOS Y ARCANOS
              </span>
              <div className="flex items-center gap-2">
                <h2
                  className="text-lg sm:text-2xl font-black font-serif tracking-wider uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,1)]"
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
                closeSectionModal();
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

          {/* CONTENEDOR FLOTANTE CENTRAL TRANSPARENTE */}
          <div
            className="relative z-10 w-full max-w-5xl flex-1 min-h-0 flex flex-col justify-start pointer-events-auto my-auto overflow-y-auto touch-pan-y px-1 sm:px-3 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* PESTAÑAS DE NAVEGACIÓN FLOTANTES TRANSLÚCIDAS */}
            <div className="flex flex-wrap items-center gap-2 mb-3 shrink-0">
              <button
                onClick={() => {
                  setGrimorioActiveSection('equipados');
                  gameAudio.playCrispClick();
                }}
                className={`flex-1 py-1.5 px-3 rounded-full font-serif font-black text-xs uppercase tracking-wider transition border ${blurMd} ${
                  grimorioActiveSection === 'equipados'
                    ? 'bg-emerald-950/85 text-emerald-200 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.7)] scale-[1.01]'
                    : 'bg-black/60 text-slate-300 border-slate-700/80 hover:text-white hover:bg-black/80'
                }`}
              >
                RANURAS ACTIVAS
              </button>
              <button
                onClick={() => {
                  setGrimorioActiveSection('basicos');
                  gameAudio.playCrispClick();
                }}
                className={`flex-1 py-1.5 px-3 rounded-full font-serif font-black text-xs uppercase tracking-wider transition border ${blurMd} ${
                  grimorioActiveSection === 'basicos'
                    ? 'bg-cyan-950/85 text-cyan-200 border-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.7)] scale-[1.01]'
                    : 'bg-black/60 text-slate-300 border-slate-700/80 hover:text-white hover:bg-black/80'
                }`}
              >
                HECHIZOS BÁSICOS
              </button>
              <button
                onClick={() => {
                  setGrimorioActiveSection('avanzados');
                  gameAudio.playCrispClick();
                }}
                className={`flex-1 py-1.5 px-3 rounded-full font-serif font-black text-xs uppercase tracking-wider transition border ${blurMd} ${
                  grimorioActiveSection === 'avanzados'
                    ? 'bg-purple-950/85 text-purple-200 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.7)] scale-[1.01]'
                    : 'bg-black/60 text-slate-300 border-slate-700/80 hover:text-white hover:bg-black/80'
                }`}
              >
                HECHIZOS AVANZADOS
              </button>
            </div>

            {/* VISTA A: RANURAS ACTIVAS */}
            {grimorioActiveSection === 'equipados' && (
              <div className="space-y-3">
                <div className={`flex justify-between items-center bg-black/75 p-2.5 rounded-2xl border border-emerald-500/40 ${blurMd} shadow-lg`}>
                  <span className="text-xs font-serif font-bold text-slate-200">
                    Ranuras de Combate Desbloqueadas: <strong className="text-emerald-300">{equippedSpells.length} / {maxSpellSlots}</strong>
                  </span>
                  <button
                    onClick={() => {
                      gameAudio.playCrispClick();
                      closeSectionModal();
                      onOpenShop();
                    }}
                    className="text-[10px] font-serif font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer"
                  >
                    + Comprar más ranuras en Tienda
                  </button>
                </div>

                {/* Fila de Ranuras Adaptable */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5">
                  {Array.from({ length: maxSpellSlots }).map((_, slotIdx) => {
                    const spellId = equippedSpells[slotIdx];
                    const spell = spellId ? GRIMOIRE_SPELLS[spellId] : null;

                    return (
                      <div
                        key={slotIdx}
                        className={`p-2 sm:p-2.5 rounded-2xl border flex flex-col justify-between min-h-[110px] sm:min-h-[140px] transition ${blurMd} ${
                          spell
                            ? 'bg-black/85 border-emerald-400/90 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                            : 'bg-black/45 border-dashed border-slate-700/90 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[8.5px] sm:text-[9px] font-mono text-emerald-400 font-bold">Ranura #{slotIdx + 1}</span>
                          {spell && (
                            <span className="text-[8.5px] sm:text-[9.5px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/50">
                              {spell.cost}M
                            </span>
                          )}
                        </div>

                        {spell ? (
                          <div className="flex flex-col gap-1 sm:gap-1.5">
                            <div className="w-full h-16 sm:h-24 rounded-xl bg-slate-950/80 border border-emerald-500/40 overflow-hidden relative flex items-center justify-center p-1">
                              <CachedImage
                                cacheKey={`spell_card_${spell.id}`}
                                candidateUrls={getSpellImageCandidateUrls(spell.id, spell.name)}
                                alt={spell.name}
                                className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 pr-1">
                                <div className="font-serif font-bold text-[11px] sm:text-xs text-slate-100 truncate">
                                  {spell.name}
                                </div>
                                <div className="text-[8.5px] sm:text-[9px] text-slate-400">{spell.category}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUnequipSpell(spell.id)}
                                className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-rose-950/90 hover:bg-rose-900 text-rose-200 text-[8.5px] sm:text-[9.5px] font-bold border border-rose-500/60 shadow active:scale-95 shrink-0 cursor-pointer"
                              >
                                Quitar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 sm:py-6 text-[10px] sm:text-xs italic text-slate-400 font-sans flex flex-col items-center justify-center gap-1">
                            <span className="text-base sm:text-lg opacity-40">⭐</span>
                            <span>Ranura Vacía</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Hechizos Desbloqueados Listos para Equipar */}
                <div className="pt-2">
                  <h4 className="text-xs sm:text-sm font-serif font-bold text-amber-300 drop-shadow mb-2">
                    Hechizos Desbloqueados para Asignar ({unlockedSpells.filter((id) => !equippedSpells.includes(id)).length} disponibles):
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
                    {unlockedSpells
                      .filter((id) => !equippedSpells.includes(id))
                      .map((spId) => {
                        const sp = GRIMOIRE_SPELLS[spId];
                        if (!sp) return null;
                        const spellImgUrls = getSpellImageCandidateUrls(sp.id, sp.name);
                        const requiredLevel = getRequiredSpellLevel(sp);
                        const isLevelLocked = playerLevel < requiredLevel;
                        const isEquipDisabled = equippedSpells.length >= maxSpellSlots || isLevelLocked;

                        return (
                          <div
                            key={sp.id}
                            className={`p-2.5 sm:p-3 rounded-2xl bg-black/80 border border-amber-500/50 hover:border-amber-400 flex flex-col justify-between transition shadow-xl group ${blurMd}`}
                            style={{ borderColor: `${sp.color}60` }}
                          >
                            <div>
                              <div
                                className="w-full h-20 sm:h-28 rounded-xl bg-slate-950/80 border border-slate-800/80 overflow-hidden relative mb-2 flex items-center justify-center p-1"
                                style={{ borderColor: `${sp.color}40` }}
                              >
                                <CachedImage
                                  cacheKey={`spell_card_${sp.id}`}
                                  candidateUrls={spellImgUrls}
                                  alt={sp.name}
                                  className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(251,191,36,0.4)] group-hover:scale-105 transition-transform duration-300"
                                />
                                <span
                                  className="absolute top-1.5 right-1.5 text-[8.5px] sm:text-[9px] px-1.5 sm:px-2 py-0.5 rounded-full font-serif font-bold border bg-black/80"
                                  style={{ borderColor: sp.color, color: sp.color }}
                                >
                                  {sp.category} • Coste: {sp.cost}M
                                </span>
                              </div>

                              <h5 className="font-serif font-bold text-xs sm:text-sm text-slate-100 mb-0.5 group-hover:text-amber-300 transition">
                                {sp.name}
                              </h5>
                              <p
                                style={{ fontSize: `${descFontSize}px` }}
                                className="text-[11px] text-slate-300 leading-snug font-sans mb-2"
                              >
                                {sp.desc}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-serif font-bold">
                              <span className={`text-[9.5px] font-serif font-bold ${isLevelLocked ? 'text-amber-400' : 'text-cyan-300'}`}>
                                {isLevelLocked ? `Requiere Lv.${requiredLevel}` : 'Desbloqueado'}
                              </span>
                              <button
                                type="button"
                                disabled={isEquipDisabled}
                                onClick={() => handleEquipSpell(sp, isLevelLocked, requiredLevel)}
                                className={
                                  isEquipDisabled
                                    ? 'py-1 px-3.5 rounded-full font-serif font-bold text-[10px] tracking-wider transition border bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
                                    : 'py-1 px-3.5 rounded-full font-serif font-bold text-[10px] tracking-wider transition border bg-emerald-950/90 hover:bg-emerald-900 text-emerald-200 border-emerald-500/60 shadow active:scale-95 cursor-pointer'
                                }
                              >
                                {isLevelLocked ? `Lv.${requiredLevel} Requerido` : 'Equipar'}
                              </button>
                            </div>
                          </div>
                        );
                      })}

                    {unlockedSpells.filter((id) => !equippedSpells.includes(id)).length === 0 && (
                      <div className={`col-span-full text-center py-4 bg-black/60 rounded-2xl border border-slate-800 text-[11px] text-slate-300 font-sans italic ${blurMd}`}>
                        Todos tus hechizos desbloqueados ya están equipados en las ranuras activas.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* VISTA B & C: HECHIZOS BÁSICOS O AVANZADOS */}
            {(grimorioActiveSection === 'basicos' || grimorioActiveSection === 'avanzados') && (
              <div className="space-y-3">
                <div className={`flex justify-between items-center bg-black/75 p-2.5 rounded-2xl border border-slate-800 ${blurMd} shadow-lg`}>
                  <span className="text-xs font-serif font-bold text-slate-200">
                    Ranuras en Uso: <strong className="text-emerald-300">{equippedSpells.length} / {maxSpellSlots}</strong>
                  </span>
                  <span className="text-[10px] font-mono text-amber-300">
                    {grimorioActiveSection === 'basicos'
                      ? `Magia de Inicio (Nv. 1-9) • Tu Nivel: ${playerLevel}`
                      : `Alta Magia (Nv. 10+) • Tu Nivel: ${playerLevel}`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
                  {allSpells
                    .filter((sp: SpellItem) => (grimorioActiveSection === 'basicos' ? sp.category === 'Básico' : sp.category === 'Avanzado'))
                    .map((sp: SpellItem) => {
                      const isUnlocked = unlockedSpells.includes(sp.id);
                      const isEquipped = equippedSpells.includes(sp.id);
                      const requiredLevel = getRequiredSpellLevel(sp);
                      const isLevelLocked = playerLevel < requiredLevel;
                      const isEquipDisabled = equippedSpells.length >= maxSpellSlots || isLevelLocked;
                      const spellImgUrls = getSpellImageCandidateUrls(sp.id, sp.name);

                      return (
                        <div
                          key={sp.id}
                          className={isEquipped ? `p-2.5 sm:p-3 rounded-2xl border flex flex-col justify-between transition shadow-xl group ${blurMd} bg-slate-950/90 border-emerald-400/90 shadow-[0_0_20px_rgba(16,185,129,0.35)]` : isUnlocked && !isLevelLocked ? `p-2.5 sm:p-3 rounded-2xl border flex flex-col justify-between transition shadow-xl group ${blurMd} bg-black/80 border-amber-500/50 hover:border-amber-400` : `p-2.5 sm:p-3 rounded-2xl border flex flex-col justify-between transition shadow-xl group ${blurMd} bg-black/60 border-slate-800/80 opacity-75`}
                          style={{ borderColor: isEquipped ? undefined : `${sp.color}60` }}
                        >
                          <div>
                            <div
                              className="w-full h-20 sm:h-28 rounded-xl bg-slate-950/80 border border-slate-800/80 overflow-hidden relative mb-2 flex items-center justify-center p-1"
                              style={{ borderColor: `${sp.color}40` }}
                            >
                              <CachedImage
                                cacheKey={`spell_card_${sp.id}`}
                                candidateUrls={spellImgUrls}
                                alt={sp.name}
                                className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(251,191,36,0.4)] group-hover:scale-105 transition-transform duration-300"
                              />
                              <span
                                className="absolute top-1.5 right-1.5 text-[8.5px] sm:text-[9px] px-1.5 sm:px-2 py-0.5 rounded-full font-serif font-bold border bg-black/80"
                                style={{ borderColor: sp.color, color: sp.color }}
                              >
                                {sp.category} • Coste: {sp.cost}M
                              </span>
                            </div>

                            <h5 className="font-serif font-bold text-xs sm:text-sm text-slate-100 mb-0.5 group-hover:text-amber-300 transition">
                              {sp.name}
                            </h5>
                            <p
                              style={{ fontSize: `${descFontSize}px` }}
                              className="text-[11px] text-slate-300 leading-snug font-sans mb-2"
                            >
                              {sp.desc}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-serif font-bold">
                            <span className="text-[9.5px] font-serif font-bold">
                              {isEquipped ? (
                                <span className="text-emerald-300">Equipado</span>
                              ) : isUnlocked ? (
                                <span className={isLevelLocked ? 'text-amber-400' : 'text-cyan-300'}>
                                  {isLevelLocked ? `Requiere Lv.${requiredLevel}` : 'Desbloqueado'}
                                </span>
                              ) : (
                                <span className="text-slate-400 flex items-center gap-1">
                                  <span>{isLevelLocked ? `Nv.${requiredLevel}+ (` : 'Bloqueado ('}{sp.price}</span>
                                  <GoldCoinIcon size={11} />
                                  <span>)</span>
                                </span>
                              )}
                            </span>

                            {isUnlocked ? (
                              isEquipped ? (
                                <button
                                  type="button"
                                  onClick={() => handleUnequipSpell(sp.id)}
                                  className="py-1 px-3 rounded-full bg-rose-950/90 hover:bg-rose-900 text-rose-200 font-serif font-bold text-[10px] tracking-wider border border-rose-500/60 shadow transition transform active:scale-95 cursor-pointer"
                                >
                                  Desequipar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isEquipDisabled}
                                  onClick={() => handleEquipSpell(sp, isLevelLocked, requiredLevel)}
                                  className={
                                    isEquipDisabled
                                      ? 'py-1 px-3.5 rounded-full font-serif font-bold text-[10px] tracking-wider transition border bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
                                      : 'py-1 px-3.5 rounded-full font-serif font-bold text-[10px] tracking-wider transition border bg-slate-900/90 hover:bg-slate-800 text-emerald-200 border-emerald-500/60 shadow active:scale-95 cursor-pointer'
                                  }
                                >
                                  {isLevelLocked ? `Lv.${requiredLevel} Requerido` : 'Equipar'}
                                </button>
                              )
                            ) : (
                              <button
                                disabled={isLevelLocked}
                                onClick={() => {
                                  if (isLevelLocked) {
                                    gameAudio.playErrorBuzz();
                                    if (triggerNotification) {
                                      triggerNotification(`🔒 ${sp.name} requiere Nivel de Héroe ${requiredLevel} para adquirirse en la Tienda.`, '#f59e0b');
                                    }
                                    return;
                                  }
                                  gameAudio.playCrispClick();
                                  closeSectionModal();
                                  onOpenShop();
                                }}
                                className={
                                  isLevelLocked
                                    ? 'py-1 px-3 rounded-full font-serif font-bold text-[10px] tracking-wider border bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
                                    : 'py-1 px-3 rounded-full bg-slate-900/90 hover:bg-slate-800 text-amber-200 font-serif font-bold text-[10px] tracking-wider border border-amber-600/60 shadow active:scale-95 cursor-pointer'
                                }
                              >
                                {isLevelLocked ? `Lv.${requiredLevel} Requerido` : 'Ir a Tienda'}
                              </button>
                            )}
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
    </div>
  );
};
export default GrimoireView;
