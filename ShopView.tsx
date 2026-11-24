import React, { useState, useRef, useEffect } from 'react';
import { gameAudio, isAndroidDevice } from './utils';
import { getSpellImageCandidateUrls } from './spellImageMap';
import { getDieImageCandidateUrls, getDieImageCacheKey } from './diceImageMap';
import { DieData, Orb } from './types';
import { CATALOG_PURCHASABLE_DICE, CatalogSpell, RARIDADES } from './gameCatalogData';
import { OrbThumbnailProps } from './OrbThumbnail';
import { CachedImage } from './CachedImage';

export interface ShopViewProps {
  playerGold: number;
  setPlayerGold: React.Dispatch<React.SetStateAction<number>>;
  playerDeck: DieData[];
  setPlayerDeck: React.Dispatch<React.SetStateAction<DieData[]>>;
  orbBank: Orb[];
  setOrbBank: React.Dispatch<React.SetStateAction<Orb[]>>;
  unlockedSpells: string[];
  setUnlockedSpells: React.Dispatch<React.SetStateAction<string[]>>;
  maxSpellSlots: number;
  setMaxSpellSlots: React.Dispatch<React.SetStateAction<number>>;
  playerLevel?: number;
  onClose: () => void;
  GRIMOIRE_SPELLS: Record<string, CatalogSpell>;
  ELEMENT_ORBS: Orb[];
  OrbThumbnail: React.FC<OrbThumbnailProps>;
  GoldCoinIcon: React.FC<{ size?: number }>;
  FullscreenShopBackground: React.FC;
  MAIN_CDN_BASE: string;
  MAIN_RAW_BASE: string;
}

export const ShopView: React.FC<ShopViewProps> = ({
  playerGold,
  setPlayerGold,
  playerDeck,
  setPlayerDeck,
  orbBank,
  setOrbBank,
  unlockedSpells,
  setUnlockedSpells,
  maxSpellSlots,
  setMaxSpellSlots,
  playerLevel = 1,
  onClose,
  GRIMOIRE_SPELLS,
  ELEMENT_ORBS,
  OrbThumbnail,
  GoldCoinIcon,
  FullscreenShopBackground,
  MAIN_CDN_BASE,
  MAIN_RAW_BASE,
}) => {
  const isAndroid = isAndroidDevice();
  const blurMd = isAndroid ? '' : 'backdrop-blur-md';
  const blurSoft = isAndroid ? '' : 'backdrop-blur-[2px]';
  const [shopMode, setShopMode] = useState<'BUY' | 'SELL'>('BUY');
  const [shopCatalogTab, setShopCatalogTab] = useState<'dados' | 'orbes' | 'hechizos'>('dados');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localNotification, setLocalNotification] = useState<{ text: string; color: string } | null>(null);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const playerGoldRef = useRef<number>(playerGold);
  playerGoldRef.current = playerGold;
  const orbBankRef = useRef<Orb[]>(orbBank);
  orbBankRef.current = orbBank;
  const playerDeckRef = useRef<DieData[]>(playerDeck);
  playerDeckRef.current = playerDeck;
  const unlockedSpellsRef = useRef<string[]>(unlockedSpells);
  unlockedSpellsRef.current = unlockedSpells;
  const maxSpellSlotsRef = useRef<number>(maxSpellSlots);
  maxSpellSlotsRef.current = maxSpellSlots;
  const soldOrbsWeakSetRef = useRef<WeakSet<Orb>>(new WeakSet());
  const soldDiceWeakSetRef = useRef<WeakSet<DieData>>(new WeakSet());
  const soldDieIdsRef = useRef<Set<string>>(new Set());
  const [sellingDieIds, setSellingDieIds] = useState<string[]>([]);
  const [sellingOrbIds, setSellingOrbIds] = useState<string[]>([]);

  useEffect(() => {
    const deckIdSet = new Set(playerDeck.map((d) => d.id));
    soldDieIdsRef.current.forEach((id) => {
      if (!deckIdSet.has(id)) {
        soldDieIdsRef.current.delete(id);
      }
    });
    setSellingDieIds((prev) => {
      const next = prev.filter((id) => deckIdSet.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [playerDeck]);

  useEffect(() => {
    const orbIdSet = new Set(orbBank.map((o) => o.id).filter(Boolean));
    setSellingOrbIds((prev) => {
      const next = prev.filter((id) => orbIdSet.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [orbBank]);

  const notify = (text: string, color: string) => {
    if (!isMountedRef.current) return;
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    setLocalNotification({ text, color });
    notificationTimerRef.current = setTimeout(() => {
      notificationTimerRef.current = null;
      if (!isMountedRef.current) return;
      setLocalNotification(null);
    }, 2500);
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
        notificationTimerRef.current = null;
      }
    };
  }, []);

  const sellableDice = playerDeck.filter(
    (d) =>
      !d.enMazo &&
      !soldDiceWeakSetRef.current.has(d) &&
      (!d.id || !soldDieIdsRef.current.has(d.id))
  );

  return (
    <div className="absolute inset-0 overflow-hidden select-none bg-black z-20 flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn">
      {/* FONDO OFICIAL DE LA TIENDA DE SALOMÓN EN PANTALLA COMPLETA */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
        <FullscreenShopBackground />
        <div className="absolute inset-0 bg-radial-vignette from-transparent via-black/20 to-black/75 pointer-events-none" />
      </div>

      {!isModalOpen && (
        <>
      {/* BARRA SUPERIOR ELEGANTE */}
      <div className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 pointer-events-auto">
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase drop-shadow">
            BAZAR MÍSTICO
          </span>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-2xl font-black font-serif tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,1)] text-amber-300 uppercase">
              LA TIENDA DE SALOMÓN
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/85 border border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.35)] ${blurMd}`}>
            <GoldCoinIcon size={16} />
            <span className="font-mono font-black text-amber-300 text-xs sm:text-sm drop-shadow">
              {playerGold} ORO
            </span>
          </div>

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
              candidateUrls={[
                `${MAIN_CDN_BASE}/icono_salir.webp`,
                `${MAIN_RAW_BASE}/icono_salir.webp`,
                'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/icono_salir.webp',
                'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/icono_salir.webp',
              ]}
              alt="Volver"
              fallbackPlaceholder={<></>}
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain filter brightness-110 contrast-110 pointer-events-none group-hover:scale-110 transition-transform"
            />
            <span className="font-serif font-bold tracking-widest text-slate-300 group-hover:text-amber-300 transition-colors text-[9px] sm:text-[10px] mt-0.5">
              VOLVER
            </span>
          </button>
        </div>
      </div>

      {/* ZONA CENTRAL LIBRE */}
      <div className="relative z-10 w-full max-w-5xl flex-1 flex items-center justify-center pointer-events-none" />

      {/* FRANJA INFERIOR FLOTANTE CON ACCIONES */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center justify-center pb-2 sm:pb-4 pointer-events-auto gap-2.5">
        <div className={`w-full max-w-md px-4 py-1.5 rounded-full bg-black/80 border border-amber-500/40 ${blurMd} text-center shadow-lg animate-fadeIn`}>
          <span className="text-[11px] sm:text-xs font-serif font-bold text-amber-200">
            «¿Qué quieres hacer hoy, viajero?»
          </span>
        </div>

        <div className="flex items-center justify-center gap-6 sm:gap-8 w-full max-w-lg">
          {/* BOTÓN COMPRAR: SOLO TEXTO SIN BORDES, CON BRILLO DE FONDO */}
          <button
            type="button"
            onClick={() => {
              setShopMode('BUY');
              setIsModalOpen(true);
              gameAudio.playConfirmSelect();
            }}
            className={`flex items-center justify-center py-2.5 sm:py-3 px-8 sm:px-10 rounded-2xl border-0 transition-all duration-300 transform active:scale-95 cursor-pointer group relative ${blurMd}`}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              boxShadow: '0 0 35px rgba(245, 158, 11, 0.6), inset 0 0 20px rgba(245, 158, 11, 0.35)',
            }}
            aria-label="Comprar"
          >
            <span className="font-serif font-black tracking-widest text-amber-300 group-hover:text-yellow-200 transition-colors text-xs sm:text-sm uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
              COMPRAR
            </span>
          </button>

          {/* BOTÓN VENDER: SOLO TEXTO SIN BORDES, CON BRILLO DE FONDO */}
          <button
            type="button"
            onClick={() => {
              setShopMode('SELL');
              setShopCatalogTab('dados');
              setIsModalOpen(true);
              gameAudio.playConfirmSelect();
            }}
            className={`flex items-center justify-center py-2.5 sm:py-3 px-8 sm:px-10 rounded-2xl border-0 transition-all duration-300 transform active:scale-95 cursor-pointer group relative ${blurMd}`}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              boxShadow: '0 0 35px rgba(16, 185, 129, 0.6), inset 0 0 20px rgba(16, 185, 129, 0.35)',
            }}
            aria-label="Vender"
          >
            <span className="font-serif font-black tracking-widest text-emerald-300 group-hover:text-emerald-200 transition-colors text-xs sm:text-sm uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
              VENDER
            </span>
          </button>
        </div>
      </div>
        </>
      )}

      {/* MODAL DETALLADO DE COMPRA / VENTA (reutiliza el único fondo de la Tienda) */}
      {isModalOpen && (
        <div
          className={`fixed inset-0 z-50 overflow-hidden select-none ${isAndroid ? 'bg-black/75' : `bg-black/60 ${blurSoft}`} flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn`}
          onClick={() => setIsModalOpen(false)}
        >

          {/* AVISO VISUAL FLOTANTE */}
          {localNotification && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 pointer-events-none animate-fadeIn">
              <div
                className={`px-6 py-4 sm:px-8 sm:py-5 max-w-md w-auto rounded-3xl border-2 bg-black/95 shadow-[0_0_50px_rgba(0,0,0,0.95)] ${blurMd} text-sm sm:text-base font-serif font-black tracking-wide text-center`}
                style={{
                  borderColor: localNotification.color,
                  color: localNotification.color,
                  boxShadow: `0 0 35px ${localNotification.color}70`,
                }}
              >
                <div className="flex justify-center items-center mb-2">
                  {localNotification.color === '#ef4444' ? (
                    <span className="text-2xl">⚠️</span>
                  ) : (
                    <GoldCoinIcon size={26} />
                  )}
                </div>
                <div>{localNotification.text}</div>
              </div>
            </div>
          )}

          {/* BARRA SUPERIOR DEL MODAL */}
          <div
            className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase drop-shadow">
                BAZAR DE SALOMÓN • {shopMode === 'BUY' ? 'ADQUISICIONES' : 'VENTA Y TRUEQUE'}
              </span>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-black font-serif tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,1)] text-amber-300 uppercase">
                  {shopMode === 'BUY' ? 'COMPRAR ARTÍCULOS' : 'VENDER PERTENENCIAS'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/85 border border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.35)] ${blurMd}`}>
                <GoldCoinIcon size={16} />
                <span className="font-mono font-black text-amber-300 text-xs sm:text-sm drop-shadow">
                  {playerGold} ORO
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  gameAudio.playCrispClick();
                  setIsModalOpen(false);
                }}
                className={`flex flex-col items-center justify-center p-1.5 sm:p-2 px-2.5 sm:px-3 rounded-2xl border-0 transition-all duration-300 transform active:scale-95 cursor-pointer group relative ${blurMd}`}
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  boxShadow: '0 0 35px rgba(245, 158, 11, 0.55), inset 0 0 20px rgba(245, 158, 11, 0.35)',
                }}
                aria-label="Volver"
              >
                <CachedImage
                  cacheKey="icono_salir_modal"
                  candidateUrls={[
                    `${MAIN_CDN_BASE}/icono_salir.webp`,
                    `${MAIN_RAW_BASE}/icono_salir.webp`,
                    'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/icono_salir.webp',
                    'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/icono_salir.webp',
                  ]}
                  alt="Volver"
                  fallbackPlaceholder={<></>}
                  className="w-7 h-7 sm:w-8 sm:h-8 object-contain filter brightness-110 contrast-110 pointer-events-none group-hover:scale-110 transition-transform"
                />
                <span className="font-serif font-bold tracking-widest text-slate-300 group-hover:text-amber-300 transition-colors text-[9px] sm:text-[10px] mt-0.5">
                  VOLVER
                </span>
              </button>
            </div>
          </div>

          {/* CONTENEDOR CENTRAL */}
          <div
            className="relative z-10 w-full max-w-5xl flex-1 min-h-0 flex flex-col justify-start pointer-events-auto my-auto overflow-y-auto touch-pan-y px-1 sm:px-3 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pestañas de la Tienda */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3 shrink-0">
              {[
                { id: 'dados' as const, title: 'DADOS DE COMBATE', color: '#34d399' },
                { id: 'orbes' as const, title: 'ORBES ELEMENTALES', color: '#60a5fa' },
                ...(shopMode === 'BUY'
                  ? [{ id: 'hechizos' as const, title: 'HECHIZOS Y RANURAS', color: '#e879f9' }]
                  : []),
              ].map((tab) => {
                const isActive = shopCatalogTab === tab.id || (shopMode === 'SELL' && shopCatalogTab === 'hechizos' && tab.id === 'dados');
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setShopCatalogTab(tab.id);
                      gameAudio.playCrispClick();
                    }}
                    className={`py-1.5 px-3 rounded-full font-serif font-black text-xs uppercase tracking-wider transition border ${blurMd} ${
                      isActive
                        ? 'bg-black/90 text-white shadow-[0_0_20px_rgba(255,255,255,0.7)] scale-105'
                        : 'bg-black/60 text-slate-300 border-slate-700/80 hover:text-white hover:bg-black/80'
                    }`}
                    style={{
                      borderColor: isActive ? tab.color : undefined,
                      color: isActive ? tab.color : undefined,
                    }}
                  >
                    {tab.title}
                  </button>
                );
              })}
            </div>

            {/* ARTÍCULOS SEGÚN PESTAÑA */}
            <div className="w-full">
              {/* 1. DADOS */}
              {shopCatalogTab === 'dados' && (
                shopMode === 'BUY' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {CATALOG_PURCHASABLE_DICE.map((die) => {
                      const candidateUrls = getDieImageCandidateUrls(die.name, die.key, die.rarity);
                      return (
                        <div
                          key={die.key}
                          className={`p-3.5 rounded-2xl bg-black/85 border flex flex-col justify-between shadow-lg group ${blurMd}`}
                          style={{ borderColor: `${die.color}60` }}
                        >
                          <div>
                            <div className="w-full h-32 rounded-xl bg-slate-950/80 border border-slate-800 overflow-hidden relative mb-2.5 flex items-center justify-center">
                              <CachedImage
                                cacheKey={`shop_die_${die.key}`}
                                candidateUrls={candidateUrls}
                                alt={die.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                            </div>
                            <div className="flex items-center justify-between mb-1">
                              <h5 className="font-serif font-bold text-xs sm:text-sm text-slate-100" style={{ color: die.color }}>
                                {die.name}
                              </h5>
                              <span className="text-[9.5px] px-2 py-0.5 rounded-full font-serif font-bold border" style={{ borderColor: die.color, color: die.color }}>
                                {die.slots} {die.slots === 1 ? 'Ranura' : 'Ranuras'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 font-sans leading-snug mb-2">
                              {die.desc}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-serif font-bold">
                            <span className="text-amber-400 flex items-center gap-1">
                              <span>{die.price}</span>
                              <GoldCoinIcon size={12} />
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (playerGoldRef.current < die.price) {
                                  notify('No tienes suficiente oro para adquirir este dado.', '#ef4444');
                                  gameAudio.playErrorBuzz();
                                  return;
                                }
                                playerGoldRef.current -= die.price;
                                const canonicalRarity =
                                  die.rarity === 'Legendario'
                                    ? RARIDADES.LEGENDARIO
                                    : die.rarity === 'Épico'
                                    ? RARIDADES.EPICO
                                    : die.rarity === 'Raro'
                                    ? RARIDADES.RARO
                                    : RARIDADES.NORMAL;
                                const newDie: DieData = {
                                  id: `d_shop_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                                  name: die.name,
                                  rarity: {
                                    ...canonicalRarity,
                                    slots: die.slots,
                                  },
                                  level: 1,
                                  enMazo: false,
                                  attachedOrbs: [],
                                };
                                playerDeckRef.current = [...playerDeckRef.current, newDie];
                                setPlayerGold((prev) => Math.max(0, prev - die.price));
                                setPlayerDeck((prev) => [...prev, newDie]);
                                gameAudio.playPowerupChime();
                                notify(`¡Has adquirido el ${die.name}! Guardado en Reserva.`, '#34d399');
                              }}
                              className="py-1 px-3.5 rounded-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 text-[10.5px] font-bold shadow active:scale-95 transition cursor-pointer"
                            >
                              Comprar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div>
                    {sellableDice.length === 0 ? (
                      <div className={`p-8 sm:p-10 bg-black/75 rounded-2xl border border-dashed border-amber-500/40 text-center space-y-2 ${blurMd}`}>
                        <h6 className="font-serif font-bold text-xs sm:text-sm text-amber-200">
                          No tienes dados disponibles para vender
                        </h6>
                        <p className="text-[11px] text-slate-400 max-w-lg mx-auto font-sans leading-relaxed">
                          Los dados equipados en tu baraja activa están protegidos para el combate. Solo puedes vender dados que estén en la reserva.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                        {sellableDice.map((die) => {
                          const rarityName = die.rarity?.name || 'Normal';
                          const candidateUrls = getDieImageCandidateUrls(die.name, die.id, rarityName);
                          const baseSellPrice =
                            rarityName === 'Legendario'
                              ? 300
                              : rarityName === 'Épico'
                              ? 140
                              : rarityName === 'Raro'
                              ? 60
                              : 15;
                          const baseRaritySlots =
                            rarityName === 'Legendario'
                              ? RARIDADES.LEGENDARIO.slots
                              : rarityName === 'Épico'
                              ? RARIDADES.EPICO.slots
                              : rarityName === 'Raro'
                              ? RARIDADES.RARO.slots
                              : RARIDADES.NORMAL.slots;
                          const extraSlots = Math.max(0, (die.rarity?.slots || 0) - baseRaritySlots);
                          const bonusHp = die.bonusHp || 0;
                          const bonusAtk = die.bonusAtk || 0;
                          const isForged = die.id?.startsWith('d_forge_');
                          const catalystBonusGold =
                            bonusHp * 25 +
                            bonusAtk * 35 +
                            extraSlots * 200 +
                            (isForged ? 40 : 0);
                          const sellPrice = baseSellPrice + catalystBonusGold;
                          const color = die.rarity?.color || '#38bdf8';

                          return (
                            <div
                              key={die.id}
                              className={`p-3.5 rounded-2xl bg-black/85 border-2 border-emerald-500/60 flex flex-col justify-between shadow-lg group ${blurMd}`}
                            >
                              <div>
                                <div className="w-full h-32 rounded-xl bg-slate-950/80 border border-slate-800 overflow-hidden relative mb-2.5 flex items-center justify-center">
                                  <CachedImage
                                    cacheKey={getDieImageCacheKey(die.name, die.id, rarityName)}
                                    candidateUrls={candidateUrls}
                                    alt={die.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                  />
                                  <span className="absolute top-1.5 right-1.5 text-[9px] px-2 py-0.5 rounded-full font-mono font-bold bg-black/85 text-emerald-300 border border-emerald-500/40">
                                    En Reserva
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mb-1">
                                  <h5 className="font-serif font-bold text-xs sm:text-sm text-slate-100 truncate" style={{ color }}>
                                    {die.name}
                                  </h5>
                                  <span className="text-[9.5px] px-2 py-0.5 rounded-full font-serif font-bold border" style={{ borderColor: color, color }}>
                                    {die.rarity?.name || 'Normal'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-300 font-sans leading-snug mb-2">
                                  Ranuras: {die.rarity?.slots || 0} • Orbes engarzados: {die.attachedOrbs?.length || 0}
                                </p>
                                {(bonusHp > 0 || bonusAtk > 0 || extraSlots > 0) && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {bonusHp > 0 && (
                                      <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-mono">
                                        +{bonusHp} HP Forjado
                                      </span>
                                    )}
                                    {bonusAtk > 0 && (
                                      <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-500/40 font-mono">
                                        +{bonusAtk} ATK Forjado
                                      </span>
                                    )}
                                    {extraSlots > 0 && (
                                      <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/40 font-mono">
                                        +{extraSlots} Ranura Extra
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-serif font-bold">
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <span>+{sellPrice}</span>
                                  <GoldCoinIcon size={12} />
                                </span>
                                <button
                                  type="button"
                                  disabled={sellingDieIds.includes(die.id)}
                                  onClick={() => {
                                    if (
                                      soldDiceWeakSetRef.current.has(die) ||
                                      (die.id && soldDieIdsRef.current.has(die.id))
                                    ) {
                                      return;
                                    }
                                    const currentDeck = playerDeckRef.current;
                                    const exactRefIdx = currentDeck.indexOf(die);
                                    const resolvedIdx =
                                      exactRefIdx !== -1 && !currentDeck[exactRefIdx].enMazo
                                        ? exactRefIdx
                                        : currentDeck.findIndex((d) => d.id === die.id && !d.enMazo);
                                    if (resolvedIdx === -1) return;

                                    const liveDie = currentDeck[resolvedIdx];
                                    soldDiceWeakSetRef.current.add(die);
                                    soldDiceWeakSetRef.current.add(liveDie);
                                    if (die.id) soldDieIdsRef.current.add(die.id);
                                    if (liveDie.id) soldDieIdsRef.current.add(liveDie.id);
                                    setSellingDieIds((prev) =>
                                      liveDie.id && !prev.includes(liveDie.id) ? [...prev, liveDie.id] : prev
                                    );

                                    playerDeckRef.current = currentDeck.filter((_, idx) => idx !== resolvedIdx);
                                    playerGoldRef.current += sellPrice;

                                    if (liveDie.attachedOrbs && liveDie.attachedOrbs.length > 0) {
                                      const existingBankIds = new Set(
                                        orbBankRef.current.map((o) => o.id).filter(Boolean)
                                      );
                                      const orbsToReturn = liveDie.attachedOrbs.filter(
                                        (o) => !orbBankRef.current.includes(o) && (!o.id || !existingBankIds.has(o.id))
                                      );
                                      if (orbsToReturn.length > 0) {
                                        orbBankRef.current = [...orbBankRef.current, ...orbsToReturn];
                                      }
                                      setOrbBank((prev) => {
                                        const prevIdSet = new Set(prev.map((o) => o.id).filter(Boolean));
                                        const dedupedOrbs = liveDie.attachedOrbs.filter(
                                          (o) => !prev.includes(o) && (!o.id || !prevIdSet.has(o.id))
                                        );
                                        return dedupedOrbs.length > 0 ? [...prev, ...dedupedOrbs] : prev;
                                      });
                                    }

                                    setPlayerGold((prev) => prev + sellPrice);
                                    setPlayerDeck((prev) => {
                                      const refIdx = prev.indexOf(liveDie);
                                      if (refIdx !== -1) {
                                        return prev.filter((_, idx) => idx !== refIdx);
                                      }
                                      const idIdx = prev.findIndex((d) => d.id === liveDie.id && !d.enMazo);
                                      if (idIdx !== -1) {
                                        return prev.filter((_, idx) => idx !== idIdx);
                                      }
                                      return prev;
                                    });
                                    gameAudio.playPowerupChime();
                                    const orbsNote = (liveDie.attachedOrbs && liveDie.attachedOrbs.length > 0)
                                      ? ` (sus ${liveDie.attachedOrbs.length} orbe(s) fueron devueltos a tu cofre)`
                                      : '';
                                    notify(`¡Has vendido ${liveDie.name} por +${sellPrice} Oro!${orbsNote}`, '#34d399');
                                  }}
                                  className={`py-1 px-3.5 rounded-full font-serif font-bold text-[10.5px] shadow transition ${
                                    sellingDieIds.includes(die.id)
                                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                      : 'bg-emerald-600 hover:bg-emerald-500 text-black active:scale-95 cursor-pointer'
                                  }`}
                                >
                                  {sellingDieIds.includes(die.id) ? 'Vendido' : 'Vender'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )
              )}

              {/* 2. ORBES */}
              {shopCatalogTab === 'orbes' && (
                shopMode === 'BUY' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {ELEMENT_ORBS.map((orb) => {
                      const isLevelLocked = Boolean(orb.minHeroLevel && playerLevel < orb.minHeroLevel);
                      return (
                        <div
                          key={orb.id}
                          className={`p-3.5 rounded-2xl bg-black/85 border flex flex-col justify-between shadow-lg group ${blurMd} transition ${
                            isLevelLocked ? 'border-slate-800 opacity-75' : 'border-blue-500/50'
                          }`}
                        >
                          <div>
                            <OrbThumbnail
                              element={orb.element}
                              name={orb.name}
                              orbId={orb.id}
                              isLargeCard={true}
                            />
                            <div className="flex items-center justify-between mb-1 gap-1.5">
                              <span className="font-serif font-bold text-xs text-slate-100 truncate">
                                {orb.name}
                              </span>
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-serif font-bold bg-blue-950/80 text-blue-300 border border-blue-500/50 shrink-0">
                                {orb.element}
                              </span>
                            </div>
                            <p className="text-[11px] text-cyan-300 font-sans leading-snug mb-2">
                              {orb.effect}
                            </p>
                            {orb.minHeroLevel && orb.minHeroLevel > 1 && (
                              <div
                                className={`mb-2 text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                                  isLevelLocked
                                    ? 'bg-slate-900/90 text-amber-300 border-amber-500/40'
                                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                                }`}
                              >
                                <span>{isLevelLocked ? '🔒' : '✓'}</span>
                                <span>Nivel Héroe: Lv.{orb.minHeroLevel}</span>
                              </div>
                            )}
                          </div>
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-serif font-bold">
                            <span className="text-amber-400 flex items-center gap-1">
                              <span>{orb.price}</span>
                              <GoldCoinIcon size={12} />
                            </span>
                            <button
                              type="button"
                              disabled={isLevelLocked}
                              onClick={() => {
                                if (isLevelLocked) {
                                  notify(`🔒 Este orbe requiere Nivel de Héroe ${orb.minHeroLevel} para ser engarzado en el Taller.`, '#f59e0b');
                                  gameAudio.playErrorBuzz();
                                  return;
                                }
                                if (playerGoldRef.current < orb.price) {
                                  notify('No tienes suficiente oro para comprar este orbe.', '#ef4444');
                                  gameAudio.playErrorBuzz();
                                  return;
                                }
                                playerGoldRef.current -= orb.price;
                                const purchasedOrb: Orb = {
                                  ...orb,
                                  templateId: orb.templateId || orb.id,
                                  id: 'o_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                                };
                                orbBankRef.current = [...orbBankRef.current, purchasedOrb];
                                setPlayerGold((prev) => Math.max(0, prev - orb.price));
                                setOrbBank((prev) => [...prev, purchasedOrb]);
                                gameAudio.playPowerupChime();
                                notify(`¡Has adquirido el ${orb.name}! Guardado en tu cofre del Taller.`, '#60a5fa');
                              }}
                              className={`py-1 px-3.5 rounded-full font-serif font-black text-[10.5px] transition border ${
                                isLevelLocked
                                  ? 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-slate-950 border-cyan-300 shadow active:scale-95 cursor-pointer'
                              }`}
                            >
                              {isLevelLocked ? `Lv.${orb.minHeroLevel} Requerido` : 'Comprar'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div>
                    {orbBank.length === 0 ? (
                      <div className={`p-8 sm:p-10 bg-black/75 rounded-2xl border border-dashed border-blue-500/40 text-center space-y-2 ${blurMd}`}>
                        <h6 className="font-serif font-bold text-xs sm:text-sm text-blue-200">
                          No tienes orbes en tu inventario para vender
                        </h6>
                        <p className="text-[11px] text-slate-400 max-w-lg mx-auto font-sans leading-relaxed">
                          Solo puedes vender orbes que se encuentren en tu cofre libre del Taller. Los orbes engarzados en dados deben desengarzarse primero en el taller si deseas venderlos.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                        {orbBank.map((orb, oIdx) => {
                          const sellPrice = Math.floor((orb.price || 100) * 0.6);
                          return (
                            <div
                              key={orb.id || oIdx}
                              className={`p-3.5 rounded-2xl bg-black/85 border-2 border-blue-500/60 flex flex-col justify-between shadow-lg group ${blurMd}`}
                            >
                              <div>
                                <OrbThumbnail
                                  element={orb.element}
                                  name={orb.name}
                                  orbId={orb.id}
                                  isLargeCard={true}
                                />
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-serif font-bold text-xs text-slate-100 truncate">
                                    {orb.name}
                                  </span>
                                  <span className="text-[9px] px-2 py-0.5 rounded-full font-serif font-bold bg-blue-950/80 text-blue-300 border border-blue-500/50">
                                    {orb.element}
                                  </span>
                                </div>
                                <p className="text-[11px] text-cyan-300 font-sans leading-snug mb-2">
                                  {orb.effect}
                                </p>
                              </div>
                              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-serif font-bold">
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <span>+{sellPrice}</span>
                                  <GoldCoinIcon size={12} />
                                </span>
                                <button
                                  type="button"
                                  disabled={Boolean(orb.id && sellingOrbIds.includes(orb.id))}
                                  onClick={() => {
                                    if (soldOrbsWeakSetRef.current.has(orb)) return;
                                    const currentBank = orbBankRef.current;
                                    const exactRefIdx = currentBank.indexOf(orb);
                                    const resolvedIdx =
                                      exactRefIdx !== -1
                                        ? exactRefIdx
                                        : orb.id
                                        ? currentBank.findIndex((o) => o.id === orb.id)
                                        : -1;
                                    if (resolvedIdx === -1) return;

                                    const liveOrb = currentBank[resolvedIdx];
                                    soldOrbsWeakSetRef.current.add(orb);
                                    soldOrbsWeakSetRef.current.add(liveOrb);
                                    if (liveOrb.id) {
                                      setSellingOrbIds((prev) =>
                                        prev.includes(liveOrb.id) ? prev : [...prev, liveOrb.id]
                                      );
                                    }
                                    orbBankRef.current = currentBank.filter((_, idx) => idx !== resolvedIdx);
                                    playerGoldRef.current += sellPrice;

                                    setPlayerGold((prev) => prev + sellPrice);
                                    setOrbBank((prev) => {
                                      const refIdx = prev.indexOf(orb);
                                      if (refIdx !== -1) {
                                        return prev.filter((_, idx) => idx !== refIdx);
                                      }
                                      if (orb.id) {
                                        const idIdx = prev.findIndex((o) => o.id === orb.id);
                                        if (idIdx !== -1) {
                                          return prev.filter((_, idx) => idx !== idIdx);
                                        }
                                      }
                                      return prev;
                                    });
                                    gameAudio.playPowerupChime();
                                    notify(`¡Has vendido ${orb.name} por +${sellPrice} Oro!`, '#34d399');
                                  }}
                                  className={`py-1 px-3.5 rounded-full font-serif font-bold text-[10.5px] shadow transition ${
                                    orb.id && sellingOrbIds.includes(orb.id)
                                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                      : 'bg-emerald-600 hover:bg-emerald-500 text-black active:scale-95 cursor-pointer'
                                  }`}
                                >
                                  {orb.id && sellingOrbIds.includes(orb.id) ? 'Vendido' : 'Vender'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )
              )}

              {/* 3. HECHIZOS Y RANURAS (BUY ONLY) */}
              {shopCatalogTab === 'hechizos' && shopMode === 'BUY' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  <div className={`p-3.5 rounded-2xl bg-black/85 border-2 border-amber-500/80 flex flex-col justify-between shadow-[0_0_20px_rgba(245,158,11,0.3)] group ${blurMd}`}>
                    <div>
                      <div className="w-full h-32 rounded-xl bg-slate-950/80 border border-amber-500/40 overflow-hidden relative mb-2.5 flex items-center justify-center">
                        <CachedImage
                          cacheKey="ranura_hechizo"
                          candidateUrls={[
                            `${MAIN_CDN_BASE}/ranura_hechizo.webp`,
                            `${MAIN_RAW_BASE}/ranura_hechizo.webp`,
                            `${MAIN_CDN_BASE}/ranura_hechizo.png`,
                            `${MAIN_RAW_BASE}/ranura_hechizo.png`,
                          ]}
                          alt="Ranura de Hechizo"
                          className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] group-hover:scale-105 transition duration-300"
                        />
                        <span className="absolute top-1.5 right-1.5 text-[9px] px-2 py-0.5 rounded-full font-serif font-bold border bg-black/85 border-amber-400 text-amber-300">
                          {maxSpellSlots}/4 Ranuras
                        </span>
                      </div>
                      <h5 className="font-serif font-black text-xs sm:text-sm text-amber-300 mb-1">
                        Ranura de Hechizo
                      </h5>
                      <p className="text-[11px] text-slate-300 font-sans leading-snug mb-2">
                        Amplía el límite de tu Grimorio para equipar un conjuro táctico adicional en batalla (hasta 4 ranuras completas).
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-serif font-bold">
                      <span className="text-amber-400 flex items-center gap-1">
                        <span>250</span>
                        <GoldCoinIcon size={12} />
                      </span>

                      <button
                        type="button"
                        disabled={maxSpellSlots >= 4}
                        onClick={() => {
                          if (maxSpellSlotsRef.current >= 4) {
                            notify('Has alcanzado el límite máximo de 4 ranuras de combate.', '#f59e0b');
                            return;
                          }
                          if (playerGoldRef.current < 250) {
                            notify('No tienes suficiente oro para ampliar tus ranuras.', '#ef4444');
                            gameAudio.playErrorBuzz();
                            return;
                          }
                          playerGoldRef.current -= 250;
                          const nextSlots = Math.min(4, maxSpellSlotsRef.current + 1);
                          maxSpellSlotsRef.current = nextSlots;
                          setPlayerGold((prev) => Math.max(0, prev - 250));
                          setMaxSpellSlots((prev) => Math.min(4, prev + 1));
                          gameAudio.playPowerupChime();
                          notify(`¡Ranura de Hechizo desbloqueada! (${nextSlots}/4)`, '#fbbf24');
                        }}
                        className={`py-1 px-3.5 rounded-full font-serif font-black text-[10.5px] transition border ${
                          maxSpellSlots >= 4
                            ? 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
                            : 'bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 border-amber-300 shadow active:scale-95 cursor-pointer'
                        }`}
                      >
                        {maxSpellSlots >= 4 ? 'Máximo' : 'Desbloquear'}
                      </button>
                    </div>
                  </div>

                  {(Object.values(GRIMOIRE_SPELLS) as CatalogSpell[]).map((sp) => {
                    const isUnlocked = unlockedSpells.includes(sp.id);
                    const requiredLevel = sp.minHeroLevel ?? (sp.category === 'Avanzado' ? 10 : 1);
                    const isLevelLocked = playerLevel < requiredLevel;
                    const candidateUrls = getSpellImageCandidateUrls(sp.id, sp.name);

                    return (
                      <div
                        key={sp.id}
                        className={`p-3.5 rounded-2xl bg-black/85 border flex flex-col justify-between shadow-lg group ${blurMd}`}
                        style={{ borderColor: `${sp.color}60` }}
                      >
                        <div>
                          <div className="w-full h-32 rounded-xl bg-slate-950/80 border border-slate-800 overflow-hidden relative mb-2.5 flex items-center justify-center">
                            <CachedImage
                              cacheKey={`shop_spell_${sp.id}`}
                              candidateUrls={candidateUrls}
                              alt={sp.name}
                              className="w-full h-full object-contain filter drop-shadow group-hover:scale-105 transition duration-300"
                            />
                            <span className="absolute top-1.5 right-1.5 text-[9px] px-2 py-0.5 rounded-full font-serif font-bold border bg-black/80" style={{ borderColor: sp.color, color: sp.color }}>
                              {sp.category}{requiredLevel > 1 ? ` • Nv.${requiredLevel}+` : ''} • {sp.cost}M
                            </span>
                          </div>
                          <h5 className="font-serif font-bold text-xs sm:text-sm text-slate-100 mb-1" style={{ color: sp.color }}>
                            {sp.name}
                          </h5>
                          <p className="text-[11px] text-slate-300 font-sans leading-snug mb-2">
                            {sp.desc}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-serif font-bold">
                          <span className="text-amber-400 flex items-center gap-1">
                            <span>{sp.price}</span>
                            <GoldCoinIcon size={12} />
                          </span>
                          {isUnlocked ? (
                            <span className="text-emerald-300 text-[10px] font-serif font-bold">
                              Ya Adquirido
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isLevelLocked}
                              onClick={() => {
                                if (isLevelLocked) {
                                  notify(`🔒 ${sp.name} requiere Nivel de Héroe ${requiredLevel} para aprenderse.`, '#f59e0b');
                                  gameAudio.playErrorBuzz();
                                  return;
                                }
                                if (unlockedSpellsRef.current.includes(sp.id)) {
                                  return;
                                }
                                if (playerGoldRef.current < sp.price) {
                                  notify('No tienes suficiente oro para aprender este hechizo.', '#ef4444');
                                  gameAudio.playErrorBuzz();
                                  return;
                                }
                                playerGoldRef.current -= sp.price;
                                unlockedSpellsRef.current = [...unlockedSpellsRef.current, sp.id];
                                setPlayerGold((prev) => Math.max(0, prev - sp.price));
                                setUnlockedSpells((prev) => (prev.includes(sp.id) ? prev : [...prev, sp.id]));
                                gameAudio.playPowerupChime();
                                notify(`¡Has aprendido ${sp.name}! Añadido a tu Grimorio.`, '#e879f9');
                              }}
                              className={`py-1 px-3.5 rounded-full font-serif font-black text-[10.5px] transition border ${
                                isLevelLocked
                                  ? 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-fuchsia-600 to-purple-500 hover:from-fuchsia-500 hover:to-purple-400 text-white border-fuchsia-400/60 shadow active:scale-95 cursor-pointer'
                              }`}
                            >
                              {isLevelLocked ? `Lv.${requiredLevel} Requerido` : 'Aprender'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ShopView;
