import React, { useState, useRef } from 'react';
import { gameAudio, isAndroidDevice, useCompactViewport } from './utils';
import { getDieImageCandidateUrls, getDieImageCacheKey } from './diceImageMap';
import { getOrbAllCandidateUrls } from './irvbeOrbImages';
import { OrbThumbnail } from './OrbThumbnail';
import { getGladiatorPortraitUrls } from './gladiatorImageMap';
import { getSpellImageCandidateUrls } from './spellImageMap';
import { DieData, Orb } from './types';
import { CampaignProgressData } from './playerPersistenceStore';
import {
  ALLEY_OPPONENTS_ROSTER,
  TOURNAMENT_CONTENDERS_ROSTER,
  DUNGEON_LORDS_QUALIFIERS_ROSTER,
  DUNGEON_LORDS_TOURNAMENT_ROSTER,
  RECRUIT_PRACTICE_ROSTER,
  RECRUIT_TOURNAMENT_ROSTER,
  SHADOW_THRONE_PURGE_ROSTER,
  SHADOW_THRONE_TOURNAMENT_ROSTER,
} from './campaignData';
import { CachedImage } from './CachedImage';

const MAIN_RAW_BASE = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';
const MAIN_CDN_BASE = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';
const JUGADOR2_CDN_BASE = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/jugador-2@main';

import {
  CATALOG_ASCENDED_TITANS as ASCENDED_TITANS_LIST,
  CATALOG_CREATURES_J1 as CODEX_CREATURES_J1,
  CATALOG_CREATURES_J2 as CODEX_CREATURES_J2,
  CATALOG_GRIMOIRE_SPELLS as CODEX_SPELLS_MAP,
  CATALOG_PURCHASABLE_DICE,
  CatalogSpell,
} from './gameCatalogData';

const CODEX_SPELLS_LIST: CatalogSpell[] = Object.values(CODEX_SPELLS_MAP);

// 1. DADOS BÁSICOS COMPRABLES EN LA TIENDA DE SALOMÓN (Fuente compartida desde gameCatalogData)
export const CODEX_PURCHASABLE_DICE = CATALOG_PURCHASABLE_DICE;

export interface CodexViewProps {
  playerDeck?: DieData[];
  orbBank?: Orb[];
  unlockedSpells?: string[];
  defeatedAlleyOpponents?: string[];
  defeatedTournamentContenders?: string[];
  isChampion?: boolean;
  tournamentRound?: number;
  campaignPhase?: 'ALLEY' | 'TOURNAMENT';
  activeCampaignIndex?: number;
  campaignsProgress?: Record<number, CampaignProgressData>;
  onClose: () => void;
  FullscreenCodexBackground: React.FC<{ className?: string }>;
  initialTab?: 'j1' | 'j2' | 'titanes' | 'bestiario' | 'dados' | 'dados_especiales' | 'orbes' | 'hechizos';
}

export const CodexView = ({
  playerDeck = [] as DieData[],
  orbBank = [] as Orb[],
  unlockedSpells = ['rayo', 'escudo'] as string[],
  defeatedAlleyOpponents = [] as string[],
  defeatedTournamentContenders = [] as string[],
  isChampion = false,
  tournamentRound = 1,
  campaignPhase = 'ALLEY',
  activeCampaignIndex = 0,
  campaignsProgress,
  onClose,
  FullscreenCodexBackground,
  initialTab = 'j1',
}: CodexViewProps) => {
  const [activeTab, setActiveTab] = useState<'j1' | 'j2' | 'titanes' | 'bestiario' | 'dados' | 'dados_especiales' | 'orbes' | 'hechizos'>(
    initialTab || 'j1'
  );
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const isCatalogModalOpenRef = useRef<boolean>(false);
  isCatalogModalOpenRef.current = isCatalogModalOpen;
  const isCompact = useCompactViewport(660, 640);
  const isAndroid = isAndroidDevice();
  const blurMd = isAndroid ? '' : 'backdrop-blur-md';
  const blurSm = isAndroid ? '' : 'backdrop-blur-sm';
  const blurSoft = isAndroid ? '' : 'backdrop-blur-[3px]';
  const [inspectedItem, setInspectedItem] = useState<{
    title: string;
    sub: string;
    desc: string;
    color: string;
    imgUrl?: string;
    candidateUrls?: string[];
    stats?: { label: string; value: string | number; color?: string }[];
  } | null>(null);

  // Nombres canónicos de los 4 dados comprables estándar de la tienda
  const purchasableNamesSet = new Set(
    CODEX_PURCHASABLE_DICE.map((p) => p.name.trim().toLowerCase())
  );

  // FILTRO ESTRICTO: NINGÚN DADO DEL INVENTARIO O MAZO BASE (1..24) DEBE MOSTRARSE EN DADOS ESPECIALES
  const specialAcquiredDiceMap = new Map<string, DieData>();
  playerDeck.forEach((d) => {
    if (!d) return;
    const rawName = (d.name || '').trim();
    const lowerName = rawName.toLowerCase();
    const id = (d.id || '').trim();

    // 1. Excluir nombres genéricos numerados: "Dado 1", "Dado 2", "Dado Normal", "Dado Básico", etc.
    if (/^dado\s+(\d+|normal|básico|épico\s+\d+|legendario\s+\d+|raro\s+\d+)$/i.test(rawName)) {
      return;
    }

    // 2. Excluir IDs de mazo inicial d_1 a d_24
    if (/^d_\d+$/i.test(id)) {
      return;
    }

    // 3. Excluir los 4 dados estándar comprables de la tienda
    if (purchasableNamesSet.has(lowerName)) {
      return;
    }

    // 4. Excluir cualquier dado sin nombre propio distintivo
    if (!rawName || lowerName === 'dado normal' || lowerName === 'dado') {
      return;
    }

    // Si es un dado especial con nombre auténtico adquirido en campaña o forjado, agregarlo una sola vez
    if (!specialAcquiredDiceMap.has(rawName)) {
      specialAcquiredDiceMap.set(rawName, d);
    }
  });
  const specialAcquiredDiceList = Array.from(specialAcquiredDiceMap.values());

  // Orbes conocidos/poseídos en banco o equipados (únicos con información enciclopédica sin contadores)
  const ownedOrbsMap = new Map<string, { orb: Orb; equippedIn: string[] }>();
  playerDeck.forEach((d) => {
    (d.attachedOrbs || []).forEach((o) => {
      if (o && o.name) {
        const key = o.name.trim();
        if (!ownedOrbsMap.has(key)) {
          ownedOrbsMap.set(key, { orb: o, equippedIn: [d.name] });
        } else {
          const entry = ownedOrbsMap.get(key)!;
          if (!entry.equippedIn.includes(d.name)) {
            entry.equippedIn.push(d.name);
          }
        }
      }
    });
  });
  orbBank.forEach((o) => {
    if (o && o.name) {
      const key = o.name.trim();
      if (!ownedOrbsMap.has(key)) {
        ownedOrbsMap.set(key, { orb: o, equippedIn: [] });
      }
    }
  });
  const consolidatedOrbs = Array.from(ownedOrbsMap.values());

  // Rivales derrotados en Callejuela (incluyendo todas las campañas jugadas)
  const allCampaignRosters = [
    ...ALLEY_OPPONENTS_ROSTER,
    ...DUNGEON_LORDS_QUALIFIERS_ROSTER,
    ...RECRUIT_PRACTICE_ROSTER,
    ...SHADOW_THRONE_PURGE_ROSTER,
  ];

  // Filtrar oponentes únicos derrotados a lo largo de todas las campañas
  const seenAlleyIds = new Set<string>();
  const defeatedAlley = allCampaignRosters.filter((opp) => {
    if (defeatedAlleyOpponents.includes(opp.id) && !seenAlleyIds.has(opp.id)) {
      seenAlleyIds.add(opp.id);
      return true;
    }
    return false;
  });

  // Rivales derrotados en el Torneo calculados de forma determinista mediante registro de IDs
  const allTournamentContendersMap = new Map<string, typeof TOURNAMENT_CONTENDERS_ROSTER[0]>();
  [
    ...TOURNAMENT_CONTENDERS_ROSTER,
    ...DUNGEON_LORDS_TOURNAMENT_ROSTER,
    ...RECRUIT_TOURNAMENT_ROSTER,
    ...SHADOW_THRONE_TOURNAMENT_ROSTER,
  ].forEach((c) => {
    if (c && c.id) allTournamentContendersMap.set(c.id, c);
  });

  const campaignTournamentRosters: Record<number, typeof TOURNAMENT_CONTENDERS_ROSTER> = {
    0: TOURNAMENT_CONTENDERS_ROSTER,
    1: DUNGEON_LORDS_TOURNAMENT_ROSTER,
    2: RECRUIT_TOURNAMENT_ROSTER,
    3: SHADOW_THRONE_TOURNAMENT_ROSTER,
  };

  const defeatedTournament: typeof TOURNAMENT_CONTENDERS_ROSTER = [];
  const seenTournamentIds = new Set<string>();

  // 1. Agregar primero los contendientes registrados fehacientemente por ID derrotado
  defeatedTournamentContenders.forEach((cId) => {
    const contender = allTournamentContendersMap.get(cId);
    if (contender && !seenTournamentIds.has(contender.id)) {
      seenTournamentIds.add(contender.id);
      defeatedTournament.push(contender);
    }
  });

  // 2. Complementar con el progreso persistido de campañas por si hubo partidas anteriores
  [0, 1, 2, 3].forEach((cIdx) => {
    const roster = campaignTournamentRosters[cIdx] || TOURNAMENT_CONTENDERS_ROSTER;
    const prog = campaignsProgress ? campaignsProgress[cIdx] : null;

    const isCurrentActive = cIdx === activeCampaignIndex;
    const cCompleted = isCurrentActive
      ? Boolean(isChampion || prog?.completed)
      : Boolean(prog?.completed);
    const cPhase = isCurrentActive ? campaignPhase : prog?.phase;
    const cRound = isCurrentActive ? tournamentRound : (prog?.round || 1);

    // Agrupar contendientes de este roster por phaseRound
    const contendersByRound: Record<number, typeof TOURNAMENT_CONTENDERS_ROSTER> = {
      1: [],
      2: [],
      3: [],
    };
    roster.forEach((c) => {
      if (contendersByRound[c.phaseRound]) {
        contendersByRound[c.phaseRound].push(c);
      }
    });

    // En el juego real, startCampaignEncounter solo enfrenta a contendersInRound[0] para cada ronda
    const maxWonRound = cCompleted ? 3 : cPhase === 'TOURNAMENT' ? cRound - 1 : 0;
    for (let r = 1; r <= maxWonRound; r++) {
      const targetContender = contendersByRound[r]?.[0];
      if (targetContender && !seenTournamentIds.has(targetContender.id)) {
        seenTournamentIds.add(targetContender.id);
        defeatedTournament.push(targetContender);
      }
    }
  });

  // Definición de las 8 secciones completas del Códice
  const codexSections: Array<{
    id: 'j1' | 'j2' | 'titanes' | 'bestiario' | 'dados' | 'dados_especiales' | 'orbes' | 'hechizos';
    title: string;
    sub: string;
    color: string;
    iconFile: string;
    fallbackIconFile?: string;
    desc: string;
    badge: string;
  }> = [
    {
      id: 'j1' as const,
      title: 'CRIATURAS J1',
      sub: 'Aliados del Invocador Celeste',
      color: '#38bdf8',
      iconFile: 'icono_codice_j1',
      desc: 'Compendio ilustrado de las criaturas y campeones aliados invocables por el Jugador 1.',
      badge: `${CODEX_CREATURES_J1.length} Aliados`,
    },
    {
      id: 'j2' as const,
      title: 'CRIATURAS J2',
      sub: 'Fuerzas del Invocador Carmesí',
      color: '#f43f5e',
      iconFile: 'icono_codice_j2',
      desc: 'Registro de unidades y criaturas rivales comandadas por el contrincante en la arena.',
      badge: `${CODEX_CREATURES_J2.length} Rivales`,
    },
    {
      id: 'titanes' as const,
      title: 'TITANES',
      sub: 'Entidades Ascendidas de Tirada Triple',
      color: '#f59e0b',
      iconFile: 'icono_codice_titanes',
      desc: 'Monstruos colosales y entidades legendarias de máximo poder invocadas con triples rúnicos.',
      badge: '6 Titanes',
    },
    {
      id: 'bestiario' as const,
      title: 'BESTIARIO',
      sub: 'Rivales y Duelistas Vencidos',
      color: '#ef4444',
      iconFile: 'icono_codice_bestiario',
      desc: 'Expedientes tácticos y debilidades de los duelistas de la callejuela y gladiadores que has vencido.',
      badge: `${defeatedAlley.length + defeatedTournament.length} Vencidos`,
    },
    {
      id: 'dados' as const,
      title: 'DADOS BÁSICOS',
      sub: 'Las 4 Rarezas Comprables en la Tienda',
      color: '#34d399',
      iconFile: 'icono_codice_dados',
      desc: 'Catálogo de los dados estándar de las 4 rarezas adquiribles en el Bazar de Salomón.',
      badge: `${CODEX_PURCHASABLE_DICE.length} Comprables`,
    },
    {
      id: 'dados_especiales' as const,
      title: 'DADOS ESPECIALES',
      sub: 'Dados Especiales Adquiridos en Campañas y Forja',
      color: '#eab308',
      iconFile: 'icono_codice_dados_esp',
      fallbackIconFile: 'icono_codice_dados_especiales',
      desc: 'Dados especiales y reliquias de combate desbloqueados a medida que los vas adquiriendo.',
      badge: `${specialAcquiredDiceList.length} Especiales`,
    },
    {
      id: 'orbes' as const,
      title: 'ORBES',
      sub: 'Esferas de Poder y Reliquias',
      color: '#a855f7',
      iconFile: 'icono_codice_orbes',
      desc: 'Orbes arcanos y reliquias elementales que has adquirido e incorporado a tus dados.',
      badge: `${consolidatedOrbs.length} Descubiertos`,
    },
    {
      id: 'hechizos' as const,
      title: 'HECHIZOS',
      sub: 'Conjuros Arcanos del Grimorio',
      color: '#e879f9',
      iconFile: 'icono_codice_hechizos',
      desc: 'Compendio de conjuros tácticos de inicio y alta magia del gran grimorio del reino.',
      badge: `${unlockedSpells.length}/${CODEX_SPELLS_LIST.length} Aprendidos`,
    },
  ];

  const selectedSec = codexSections.find((s) => s.id === activeTab) || codexSections[0];
  const exitIconCandidates = [
    `${MAIN_CDN_BASE}/icono_salir.webp`,
    `${MAIN_RAW_BASE}/icono_salir.webp`,
    'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/icono_salir.webp',
    'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/icono_salir.webp',
  ];

  const getCodiceIconCandidates = (fileBase: string, fallbackBase?: string) => [
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
    ...(fallbackBase ? [
      `${MAIN_CDN_BASE}/${fallbackBase}.webp`,
      `${MAIN_RAW_BASE}/${fallbackBase}.webp`,
      `${MAIN_CDN_BASE}/iconos/${fallbackBase}.webp`,
      `${MAIN_RAW_BASE}/iconos/${fallbackBase}.webp`,
    ] : []),
  ];

  const openSectionModal = (tabId: typeof activeTab) => {
    if (isCatalogModalOpenRef.current) return;
    isCatalogModalOpenRef.current = true;
    gameAudio.playConfirmSelect();
    setActiveTab(tabId);
    setIsCatalogModalOpen(true);
  };

  const closeCatalogModal = () => {
    isCatalogModalOpenRef.current = false;
    setIsCatalogModalOpen(false);
  };

  return (
    <div className="absolute inset-0 overflow-hidden select-none bg-black z-20 flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn">
      {/* FONDO OFICIAL PANORÁMICO DEL CÓDICE (único montaje compartido con sub-modales) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
        <FullscreenCodexBackground />
        <div
          className={`absolute inset-0 bg-radial-vignette pointer-events-none ${
            inspectedItem ? 'from-transparent via-black/40 to-black/85' : 'from-transparent via-black/25 to-black/75'
          }`}
        />
      </div>

      {!isCatalogModalOpen && !inspectedItem && (
        <>
      {/* BARRA SUPERIOR ELEGANTE CON BOTÓN VERTICAL VOLVER */}
      <div className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 pointer-events-auto">
        <div className={`flex flex-col text-left px-3 py-1.5 rounded-2xl bg-black/85 border border-amber-500/50 shadow-lg ${blurMd}`}>
          <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase drop-shadow">
            ENCICLOPEDIA DEL SABER
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

      {/* CUERPO CENTRAL: ICONOS ADAPTABLES PARA PANTALLAS PEQUEÑAS SIN AGRUPARSE NI APLASTARSE */}
      <div
        className="relative z-10 w-full max-w-5xl flex-1 min-h-0 flex flex-row items-center justify-start pointer-events-auto px-2 sm:px-6 my-auto gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`${
            isCompact
              ? 'flex flex-row flex-wrap items-center justify-start gap-3 sm:gap-3.5 max-w-[270px] sm:max-w-[310px] max-h-full overflow-y-auto touch-pan-y py-3 px-2'
              : 'flex flex-col items-center justify-start gap-2 shrink-0 max-h-full overflow-y-auto touch-pan-y py-3 px-4 -mx-2'
          } [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
        >
          {codexSections.map((sec) => {
            const isSelected = activeTab === sec.id;
            const iconCandidates = getCodiceIconCandidates(sec.iconFile, sec.fallbackIconFile);

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
                  // Solo seleccionar por hover si proviene de un puntero de ratón real
                  if (e.pointerType === 'mouse' && activeTab !== sec.id) {
                    setActiveTab(sec.id);
                    gameAudio.playCrispClick();
                  }
                }}
                className={`${
                  isCompact ? 'w-12 h-12 sm:w-13 sm:h-13' : 'w-12 h-12 md:w-14 md:h-14'
                } shrink-0 rounded-2xl sm:rounded-3xl border-0 outline-none focus:outline-none flex items-center justify-center transition-all duration-300 transform active:scale-95 cursor-pointer relative ${
                  isAndroid ? '' : 'backdrop-blur-md'
                } overflow-hidden ${
                  isSelected
                    ? isCompact
                      ? 'scale-110 z-30'
                      : 'scale-120 sm:scale-125 z-30 translate-x-2'
                    : 'scale-95 opacity-85 hover:opacity-100 hover:scale-105'
                }`}
                style={{
                  backgroundColor: isSelected ? `${sec.color}35` : 'rgba(0, 0, 0, 0.5)',
                  boxShadow: isSelected
                    ? `0 0 35px ${sec.color}, inset 0 0 15px ${sec.color}50`
                    : `0 0 15px ${sec.color}30`,
                }}
                aria-label={sec.title}
              >
                <CachedImage
                  cacheKey={`codex_sec_icon_${sec.id}`}
                  candidateUrls={iconCandidates}
                  alt={sec.title}
                  fallbackPlaceholder={<></>}
                  className={`w-full h-full object-cover filter brightness-105 contrast-110 pointer-events-none select-none transition-transform duration-300 ${
                    isSelected ? 'scale-110' : 'scale-100'
                  }`}
                />

                {isSelected && (
                  <div
                    className="absolute -bottom-1 w-2.5 h-2.5 rounded-full shadow-[0_0_12px_currentColor] z-30 animate-pulse"
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

      {/* MODAL DETALLADO DE PÁGINAS Y CARTAS DEL CÓDICE (reutiliza el único fondo del Códice) */}
      {isCatalogModalOpen && (
        <div
          className={`fixed inset-0 z-50 overflow-hidden select-none ${isAndroid ? 'bg-black/80' : `bg-black/70 ${blurSoft}`} flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn ${
            inspectedItem ? 'invisible pointer-events-none' : ''
          }`}
          onClick={closeCatalogModal}
        >

          {/* Barra superior del catálogo */}
          <div
            className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex flex-col text-left px-3 py-1.5 rounded-2xl bg-black/85 border border-amber-500/50 shadow-lg ${blurMd}`}>
              <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase drop-shadow">
                ENCICLOPEDIA DEL SABER
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
                closeCatalogModal();
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

          {/* Contenedor central de cartas ilustradas */}
          <div
            className="relative z-10 w-full max-w-5xl flex-1 min-h-0 flex flex-col justify-start pointer-events-auto my-auto overflow-y-auto touch-pan-y px-1 sm:px-3 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* VISTA 1: CRIATURAS J1 CON SUS NOMBRES Y FICHAS ORIGINALES (SIN ICONOS DE CORAZÓN NI ESPADA) */}
            {activeTab === 'j1' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mb-4">
                {CODEX_CREATURES_J1.map((c) => {
                  const candidateUrls = [
                    `${MAIN_CDN_BASE}/${c.id}.webp`,
                    `${MAIN_RAW_BASE}/${c.id}.webp`,
                    `${MAIN_CDN_BASE}/${c.id}.png`,
                    `${MAIN_RAW_BASE}/${c.id}.png`,
                  ];
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setInspectedItem({
                          title: c.nombre,
                          sub: `Lv.${c.nivel} [${c.rango}]`,
                          desc: c.desc,
                          color: c.color,
                          imgUrl: candidateUrls[0],
                          candidateUrls,
                          stats: [
                            { label: 'Vida', value: `${c.hp} HP`, color: '#10b981' },
                            { label: 'Ataque', value: `${c.atk} ATK`, color: '#ef4444' },
                            { label: 'Movimiento', value: `${c.mov} casilla${c.mov > 1 ? 's' : ''}`, color: '#38bdf8' },
                          ],
                        });
                        gameAudio.playCrispClick();
                      }}
                      className="p-3 rounded-2xl bg-black/85 border border-cyan-500/50 hover:border-cyan-300 transition cursor-pointer flex flex-col justify-between shadow-lg"
                    >
                      <div className="w-full h-32 rounded-xl bg-slate-950 overflow-hidden mb-2 relative flex items-center justify-center p-1">
                        <CachedImage
                          cacheKey={`codex_j1_${c.id}`}
                          candidateUrls={candidateUrls}
                          alt={c.nombre}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-serif font-bold text-xs text-white">{c.nombre}</span>
                        <span className="text-[9px] px-2 py-0.2 rounded font-mono text-cyan-300 border border-cyan-500/40">Lv.{c.nivel} [{c.rango}]</span>
                      </div>
                      <p className="text-[10px] text-slate-300 font-sans mb-2 leading-tight line-clamp-3">{c.desc}</p>
                      <div className="flex justify-between text-xs font-serif font-bold pt-1.5 border-t border-slate-800">
                        <span className="text-emerald-400 font-mono">{c.hp} HP</span>
                        <span className="text-rose-400 font-mono">{c.atk} ATK</span>
                        <span className="text-cyan-300 text-[10px] font-mono">Mov: {c.mov}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VISTA 2: CRIATURAS J2 CON SUS NOMBRES Y FICHAS ORIGINALES (SIN ICONOS DE CORAZÓN NI ESPADA) */}
            {activeTab === 'j2' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mb-4">
                {CODEX_CREATURES_J2.map((c) => {
                  const candidateUrls = [
                    `${JUGADOR2_CDN_BASE}/${c.id.replace('j2_', '')}.webp`,
                    `https://raw.githubusercontent.com/endersonvivas48-oss/jugador-2/main/${c.id.replace('j2_', '')}.webp`,
                    `${JUGADOR2_CDN_BASE}/${c.id.replace('j2_', '')}.png`,
                  ];
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setInspectedItem({
                          title: c.nombre,
                          sub: `Lv.${c.nivel} [${c.rango}]`,
                          desc: c.desc,
                          color: c.color,
                          imgUrl: candidateUrls[0],
                          candidateUrls,
                          stats: [
                            { label: 'Vida', value: `${c.hp} HP`, color: '#10b981' },
                            { label: 'Ataque', value: `${c.atk} ATK`, color: '#ef4444' },
                            { label: 'Movimiento', value: `${c.mov} casilla${c.mov > 1 ? 's' : ''}`, color: '#f43f5e' },
                          ],
                        });
                        gameAudio.playCrispClick();
                      }}
                      className="p-3 rounded-2xl bg-black/85 border border-rose-500/50 hover:border-rose-300 transition cursor-pointer flex flex-col justify-between shadow-lg"
                    >
                      <div className="w-full h-32 rounded-xl bg-slate-950 overflow-hidden mb-2 relative flex items-center justify-center p-1">
                        <CachedImage
                          cacheKey={`codex_j2_${c.id}`}
                          candidateUrls={candidateUrls}
                          alt={c.nombre}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-serif font-bold text-xs text-white">{c.nombre}</span>
                        <span className="text-[9px] px-2 py-0.2 rounded font-mono text-rose-300 border border-rose-500/40">Lv.{c.nivel} [{c.rango}]</span>
                      </div>
                      <p className="text-[10px] text-slate-300 font-sans mb-2 leading-tight line-clamp-3">{c.desc}</p>
                      <div className="flex justify-between text-xs font-serif font-bold pt-1.5 border-t border-slate-800">
                        <span className="text-emerald-400 font-mono">{c.hp} HP</span>
                        <span className="text-rose-400 font-mono">{c.atk} ATK</span>
                        <span className="text-rose-300 text-[10px] font-mono">Mov: {c.mov}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VISTA 3: TITANES (SIN ICONOS DE CORAZÓN NI ESPADA Y SIN NUMERACIÓN 1-1-1) */}
            {activeTab === 'titanes' && (
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mb-4">
                {ASCENDED_TITANS_LIST.map((titan) => {
                  const candidateUrls = [
                    titan.imgUrl,
                    `${MAIN_RAW_BASE}/asc${titan.id}.webp`,
                    `${MAIN_CDN_BASE}/asc${titan.id}.png`,
                    `${MAIN_RAW_BASE}/asc${titan.id}.png`,
                  ];
                  return (
                    <div
                      key={titan.id}
                      onClick={() => {
                        setInspectedItem({
                          title: titan.name,
                          sub: `Titán Ascendido • ${titan.element}`,
                          desc: `${titan.desc} ${titan.habilidad}`,
                          color: titan.color,
                          imgUrl: candidateUrls[0],
                          candidateUrls,
                          stats: [
                            { label: 'Salud', value: `${titan.hp} HP`, color: '#10b981' },
                            { label: 'Ataque', value: `${titan.atk} ATK`, color: '#ef4444' },
                            { label: 'Elemento', value: titan.element, color: titan.color },
                          ],
                        });
                        gameAudio.playCrispClick();
                      }}
                      className={`bg-black/85 border border-amber-500/50 rounded-2xl p-3.5 flex flex-col justify-between hover:border-amber-400 transition shadow-lg cursor-pointer group ${blurMd}`}
                    >
                      <div>
                        <div className="w-full h-40 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative mb-2.5 flex items-center justify-center p-1.5 shadow-inner">
                          <CachedImage
                            cacheKey={`codex_titan_${titan.id}`}
                            candidateUrls={candidateUrls}
                            alt={titan.name}
                            className="w-full h-full object-contain filter drop-shadow group-hover:scale-105 transition duration-300"
                          />
                        </div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-serif font-black text-sm text-slate-100 group-hover:text-amber-300 transition">
                            {titan.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-cyan-300">
                            {titan.element}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-serif font-bold text-[11px] leading-snug mb-1">
                          {titan.habilidad}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 font-serif font-bold">
                        <span className="text-emerald-400 font-mono">{titan.hp} HP</span>
                        <span className="text-rose-400 font-mono">{titan.atk} ATK</span>
                        <span className="text-amber-400 text-[10px]">🔍 Detalle</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VISTA 4: BESTIARIO (SIN ICONOS DE CORAZÓN NI ESPADA) */}
            {activeTab === 'bestiario' && (
              <div className="w-full space-y-4">
                <div className={`p-3 bg-black/80 rounded-2xl border border-red-500/40 ${blurMd} flex items-center justify-between`}>
                  <div>
                    <h5 className="font-serif font-bold text-xs sm:text-sm text-red-300">
                      RIVALES Y GLADIADORES VENCIDOS
                    </h5>
                    <p className="text-[11px] text-slate-300 font-sans">
                      Expedientes de los contrincantes derrotados en la Callejuela y en el Torneo.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-red-400 bg-red-950/60 px-3 py-1 rounded-full border border-red-500/40">
                    {defeatedAlley.length + defeatedTournament.length} DERROTADOS
                  </span>
                </div>

                {defeatedAlley.length === 0 && defeatedTournament.length === 0 ? (
                  <div className={`p-8 bg-black/75 rounded-2xl border border-dashed border-red-500/40 text-center space-y-2 ${blurMd}`}>
                    <h6 className="font-serif font-bold text-xs sm:text-red-200">
                      Aún no has derrotado a ningún rival
                    </h6>
                    <p className="text-[11px] text-slate-400 font-sans">
                      Vence a los duelistas en las Callejuelas o conquista rondas de la Gran Arena para registrar sus fichas.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {defeatedAlley.map((opp) => {
                      const portraits = getGladiatorPortraitUrls(opp.id, opp.name);
                      return (
                        <div
                          key={opp.id}
                          onClick={() => {
                            setInspectedItem({
                              title: opp.name,
                              sub: `${opp.title} • [${opp.archetype}]`,
                              desc: `${opp.description} Mazo: ${opp.deckTheme}. Recompensa de victoria: +${opp.rewards.gold} Oro.`,
                              color: opp.avatarColor || '#ef4444',
                              imgUrl: portraits[0] || '',
                              candidateUrls: portraits,
                              stats: [
                                { label: 'Vida', value: `${opp.masterHp} HP`, color: '#10b981' },
                                { label: 'Ataque', value: `${opp.masterAtk} ATK`, color: '#ef4444' },
                                { label: 'Estado', value: '✓ Vencido', color: '#fbbf24' },
                              ],
                            });
                            gameAudio.playCrispClick();
                          }}
                          className={`p-3.5 rounded-2xl border-2 bg-black/85 border-emerald-500/60 hover:border-emerald-400 flex flex-col justify-between transition shadow-lg group ${blurMd} cursor-pointer`}
                        >
                          <div>
                            <div className="w-full h-36 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden relative mb-2.5 flex items-center justify-center">
                              <CachedImage
                                cacheKey={`gladiator_portrait_${opp.id}`}
                                candidateUrls={portraits}
                                alt={opp.name}
                                className="w-full h-full object-cover filter brightness-95 group-hover:scale-105 transition duration-300"
                              />
                              <span className={`absolute top-1.5 right-1.5 text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border ${blurSm} bg-emerald-950/90 text-emerald-300 border-emerald-400`}>
                                ✓ DERROTADO
                              </span>
                            </div>
                            <div className="flex items-center justify-between mb-0.5">
                              <h5 className="font-serif font-black text-xs sm:text-sm text-slate-100 group-hover:text-purple-300 transition truncate">
                                {opp.name}
                              </h5>
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full font-serif font-bold border" style={{ borderColor: opp.avatarColor, color: opp.avatarColor }}>
                                {opp.archetype}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 font-sans leading-snug mb-2">
                              {opp.description}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-serif font-bold">
                            <span className="text-emerald-400 font-mono">{opp.masterHp} HP</span>
                            <span className="text-rose-400 font-mono">{opp.masterAtk} ATK</span>
                            <span className="text-amber-400 font-mono text-[10px]">+{opp.rewards.gold} Oro</span>
                          </div>
                        </div>
                      );
                    })}

                    {defeatedTournament.map((contender) => {
                      const portraits = getGladiatorPortraitUrls(contender.id, contender.name);
                      return (
                        <div
                          key={contender.id}
                          onClick={() => {
                            setInspectedItem({
                              title: contender.name,
                              sub: `${contender.title} • ${contender.difficulty}`,
                              desc: `${contender.lore} ${contender.quote} Aura: ${contender.specialAura}.`,
                              color: contender.avatarColor || '#fbbf24',
                              imgUrl: portraits[0] || '',
                              candidateUrls: portraits,
                              stats: [
                                { label: 'Vida', value: `${contender.masterHp} HP`, color: '#10b981' },
                                { label: 'Ataque', value: `${contender.masterAtk} ATK`, color: '#ef4444' },
                                { label: 'Fase', value: `Ronda ${contender.phaseRound}/3`, color: '#fbbf24' },
                              ],
                            });
                            gameAudio.playCrispClick();
                          }}
                          className={`p-3.5 rounded-2xl border-2 bg-black/85 border-amber-400 hover:border-yellow-300 flex flex-col justify-between transition shadow-lg group ${blurMd} cursor-pointer`}
                        >
                          <div>
                            <div className="w-full h-36 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden relative mb-2.5 flex items-center justify-center">
                              <CachedImage
                                cacheKey={`gladiator_portrait_${contender.id}`}
                                candidateUrls={portraits}
                                alt={contender.name}
                                className="w-full h-full object-cover filter brightness-100 group-hover:scale-105 transition duration-300"
                              />
                              <span className={`absolute top-1.5 right-1.5 text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border ${blurSm} bg-amber-500 text-black border-amber-300`}>
                                👑 DESTRONADO
                              </span>
                            </div>
                            <div className="flex items-center justify-between mb-0.5">
                              <h5 className="font-serif font-black text-xs sm:text-sm text-amber-300 group-hover:text-yellow-200 truncate">
                                {contender.name}
                              </h5>
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                                Ronda {contender.phaseRound}/3
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 font-sans leading-snug mb-2 line-clamp-3">
                              {contender.lore}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-serif font-bold">
                            <span className="text-emerald-400 font-mono">{contender.masterHp} HP</span>
                            <span className="text-rose-400 font-mono">{contender.masterAtk} ATK</span>
                            <span className="text-cyan-300 font-mono text-[10px]">{contender.difficulty}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* VISTA 5: DADOS BÁSICOS (LAS 4 RAREZAS COMPRABLES EN LA TIENDA DE SALOMÓN) */}
            {activeTab === 'dados' && (
              <div className="w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 mb-4">
                  {CODEX_PURCHASABLE_DICE.map((dieItem) => {
                    const candidateUrls = [
                      `${MAIN_CDN_BASE}/${dieItem.key}.jpg`,
                      `${MAIN_RAW_BASE}/${dieItem.key}.jpg`,
                      `${MAIN_CDN_BASE}/dado/${dieItem.key}.jpg`,
                      `${MAIN_RAW_BASE}/dado/${dieItem.key}.jpg`,
                      ...getDieImageCandidateUrls(dieItem.name, dieItem.key, dieItem.rarity),
                    ];
                    const isLegendary = dieItem.rarity === 'Legendario';
                    const isEpic = dieItem.rarity === 'Épico';
                    const isRare = dieItem.rarity === 'Raro';
                    const cubeBg = isLegendary
                      ? 'bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-600 text-black'
                      : isEpic
                      ? 'bg-gradient-to-br from-purple-600 via-fuchsia-500 to-purple-800 text-white'
                      : isRare
                      ? 'bg-gradient-to-br from-cyan-500 via-sky-400 to-blue-600 text-white'
                      : 'bg-gradient-to-br from-slate-600 via-slate-500 to-slate-700 text-white';

                    return (
                      <div
                        key={dieItem.key}
                        onClick={() => {
                          setInspectedItem({
                            title: dieItem.name,
                            sub: `Dado Comprable • [${dieItem.rarity}] (${dieItem.slots} Ranuras)`,
                            desc: `${dieItem.desc} Disponible para su adquisición en el Bazar de Salomón por ${dieItem.price} Monedas de Oro.`,
                            color: dieItem.color,
                            imgUrl: candidateUrls[0] || '',
                            candidateUrls,
                            stats: [
                              { label: 'Rareza', value: dieItem.rarity, color: dieItem.color },
                              { label: 'Ranuras Orbe', value: `${dieItem.slots} Orbes`, color: '#fbbf24' },
                              { label: 'Precio Tienda', value: `${dieItem.price} Oro`, color: '#38bdf8' },
                            ],
                          });
                          gameAudio.playCrispClick();
                        }}
                        className={`p-3.5 rounded-2xl bg-black/85 border-2 flex flex-col justify-between shadow-lg group ${blurMd} cursor-pointer hover:border-emerald-300 transition`}
                        style={{ borderColor: `${dieItem.color}80` }}
                      >
                        <div>
                          <div className="w-full h-32 rounded-xl bg-slate-950/90 border border-slate-800 overflow-hidden relative mb-2.5 flex items-center justify-center p-2">
                            <CachedImage
                              cacheKey={`codex_die_basic_${dieItem.key}`}
                              candidateUrls={candidateUrls}
                              alt={dieItem.name}
                              className="w-full h-full object-contain filter drop-shadow group-hover:scale-105 transition duration-300 relative z-10"
                            />
                            {/* Cubo de respaldo ornamental */}
                            <div className={`absolute inset-0 flex items-center justify-center ${cubeBg} -z-0 rounded-lg p-1 opacity-20`}>
                              <svg viewBox="0 0 100 100" className="w-16 h-16 block">
                                <circle cx="50" cy="50" r="10" fill={isLegendary ? '#fbbf24' : isEpic ? '#c084fc' : isRare ? '#38bdf8' : '#ffffff'} />
                              </svg>
                            </div>

                            <span
                              className="absolute top-1.5 right-1.5 text-[9px] px-2 py-0.5 rounded-full font-mono font-bold bg-black/85 border text-amber-300 border-amber-500 z-20"
                            >
                              {dieItem.price} Oro
                            </span>
                          </div>
                          <div className="flex items-center justify-between mb-1">
                            <h5 className="font-serif font-black text-xs sm:text-sm text-slate-100 group-hover:text-amber-300 truncate" style={{ color: dieItem.color }}>
                              {dieItem.name}
                            </h5>
                            <span className="text-[9.5px] px-2 py-0.5 rounded-full font-serif font-bold border" style={{ borderColor: dieItem.color, color: dieItem.color }}>
                              {dieItem.rarity}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 font-sans leading-snug mb-2 line-clamp-2">
                            {dieItem.desc}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-serif font-bold">
                          <span className="text-emerald-400 text-[10px]">Bazar de Salomón</span>
                          <span className="text-cyan-300 text-[10px]">🔍 Detalle</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VISTA 5.5: DADOS ESPECIALES */}
            {activeTab === 'dados_especiales' && (
              <div className="w-full">
                {specialAcquiredDiceList.length === 0 ? (
                  <div className={`p-8 sm:p-12 bg-black/75 rounded-2xl border border-dashed border-amber-500/40 text-center space-y-2.5 ${blurMd}`}>
                    <h6 className="font-serif font-black text-sm sm:text-base text-amber-300">
                      Aún no has adquirido dados especiales
                    </h6>
                    <p className="text-xs text-slate-300 font-sans max-w-md mx-auto leading-relaxed">
                      Los dados especiales con orbes engarzados, recetas forjadas en el Taller de Vulkan o reliquias únicas de Campaña aparecerán aquí <strong>a medida que los vayas forjando o desbloqueando</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mb-4">
                    {specialAcquiredDiceList.map((die) => {
                      const candidateUrls = getDieImageCandidateUrls(die.name, die.id, die.rarity?.name);
                      const color = die.rarity?.color || '#eab308';
                      const attachedCount = die.attachedOrbs?.length || 0;
                      const isLegendary = die.rarity?.name === 'Legendario';
                      const isEpic = die.rarity?.name === 'Épico';
                      const isRare = die.rarity?.name === 'Raro';
                      const cubeBg = isLegendary
                        ? 'bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-600 text-black'
                        : isEpic
                        ? 'bg-gradient-to-br from-purple-600 via-fuchsia-500 to-purple-800 text-white'
                        : isRare
                        ? 'bg-gradient-to-br from-cyan-500 via-sky-400 to-blue-600 text-white'
                        : 'bg-gradient-to-br from-slate-600 via-slate-500 to-slate-700 text-white';

                      return (
                        <div
                          key={die.name}
                          onClick={() => {
                            setInspectedItem({
                              title: die.name,
                              sub: `Dado Especial • [${die.rarity?.name || 'Raro'}] (${die.rarity?.slots || 1} Ranuras)`,
                              desc: `Artefacto especial en tu poder. Ranuras: ${die.rarity?.slots || 1} | Orbes engarzados: ${attachedCount}.`,
                              color,
                              imgUrl: candidateUrls[0] || '',
                              candidateUrls,
                              stats: [
                                { label: 'Rareza', value: die.rarity?.name || 'Especial', color },
                                { label: 'Ranuras Orbe', value: `${die.rarity?.slots || 1} Orbes`, color: '#fbbf24' },
                                { label: 'Engarzados', value: `${attachedCount} Activos`, color: '#38bdf8' },
                              ],
                            });
                            gameAudio.playCrispClick();
                          }}
                          className={`p-3.5 rounded-2xl bg-black/85 border-2 flex flex-col justify-between shadow-xl group ${blurMd} cursor-pointer hover:border-amber-300 transition`}
                          style={{ borderColor: `${color}90`, boxShadow: `0 0 20px ${color}30` }}
                        >
                          <div>
                            <div className="w-full h-32 rounded-xl bg-slate-950/80 border border-slate-800 overflow-hidden relative mb-2.5 flex items-center justify-center p-2">
                              <CachedImage
                                cacheKey={getDieImageCacheKey(die.name, die.id, die.rarity?.name)}
                                candidateUrls={candidateUrls}
                                alt={die.name}
                                className="w-full h-full object-contain filter drop-shadow group-hover:scale-105 transition duration-300 relative z-10"
                              />
                              <div className={`absolute inset-0 flex items-center justify-center ${cubeBg} -z-0 rounded-lg p-1 opacity-20`}>
                                <svg viewBox="0 0 100 100" className="w-16 h-16 block">
                                  <circle cx="50" cy="50" r="10" fill={isLegendary ? '#fbbf24' : isEpic ? '#c084fc' : isRare ? '#38bdf8' : '#ffffff'} />
                                </svg>
                              </div>
                              <span
                                className="absolute top-1.5 right-1.5 text-[9px] px-2 py-0.5 rounded-full font-mono font-bold bg-black/85 border z-20"
                                style={{ borderColor: color, color }}
                              >
                                {die.rarity?.name || 'Especial'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mb-1">
                              <h5 className="font-serif font-black text-xs sm:text-sm text-slate-100 truncate" style={{ color }}>
                                {die.name}
                              </h5>
                              <span className="text-[9.5px] px-2 py-0.5 rounded-full font-serif font-bold border" style={{ borderColor: color, color }}>
                                {die.rarity?.slots || 1} Ranuras
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 font-sans leading-snug mb-2">
                              Ranuras: {die.rarity?.slots || 1} • Orbes Engarzados: {attachedCount}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-serif font-bold">
                            <span className="text-amber-400 text-[10px]">
                              {die.enMazo ? 'En Mazo de Batalla' : 'Reserva de Dados'}
                            </span>
                            <span className="text-cyan-300 text-[10px]">🔍 Detalle</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* VISTA 6: ORBES */}
            {activeTab === 'orbes' && (
              <div className="w-full">
                {consolidatedOrbs.length === 0 ? (
                  <div className={`p-8 bg-black/75 rounded-2xl border border-dashed border-purple-500/40 text-center space-y-2 ${blurMd}`}>
                    <h6 className="font-serif font-bold text-xs sm:text-sm text-purple-200">
                      Aún no has descubierto ningún orbe elemental
                    </h6>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {consolidatedOrbs.map(({ orb, equippedIn }) => {
                      const candidateUrls = getOrbAllCandidateUrls(orb.name, orb.element, orb.id);
                      return (
                        <div
                          key={orb.name}
                          onClick={() => {
                            setInspectedItem({
                              title: orb.name,
                              sub: `Elemento: ${orb.element}`,
                              desc: `${orb.effect || 'Potenciador mágico de dados.'}${equippedIn.length > 0 ? ` (Engarzado en: ${equippedIn.join(', ')})` : ''}`,
                              color: '#a855f7',
                              imgUrl: candidateUrls[0] || '',
                              candidateUrls,
                              stats: [
                                { label: 'Elemento', value: orb.element, color: '#38bdf8' },
                                { label: 'Bono Vida', value: `+${orb.bonusHp || 0} HP`, color: '#10b981' },
                                { label: 'Bono Daño', value: `+${orb.bonusAtk || 0} ATK`, color: '#ef4444' },
                              ],
                            });
                            gameAudio.playCrispClick();
                          }}
                          className={`p-3.5 rounded-2xl bg-black/85 border border-purple-500/50 flex flex-col justify-between shadow-lg group ${blurMd} cursor-pointer hover:border-purple-300 transition`}
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
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-serif font-bold bg-purple-950/80 text-purple-300 border border-purple-500/50">
                                {orb.element}
                              </span>
                            </div>
                            <p className="text-[11px] text-cyan-300 font-sans leading-snug mb-2">
                              {orb.effect}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-serif font-bold">
                            <span className="text-emerald-400 font-mono">+{orb.bonusHp || 0} HP</span>
                            <span className="text-rose-400 font-mono">+{orb.bonusAtk || 0} ATK</span>
                            <span className="text-cyan-400 text-[10px]">🔍 Detalle</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* VISTA 7: HECHIZOS DEL CÓDICE */}
            {activeTab === 'hechizos' && (
              <div className="w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mb-4">
                  {CODEX_SPELLS_LIST.map((sp) => {
                    const isLearned = unlockedSpells.includes(sp.id);
                    const candidateUrls = getSpellImageCandidateUrls(sp.id, sp.name);

                    return (
                      <div
                        key={sp.id}
                        onClick={() => {
                          setInspectedItem({
                            title: sp.name,
                            sub: `${sp.category} • Coste: ${sp.cost} Maná`,
                            desc: sp.desc,
                            color: sp.color,
                            imgUrl: candidateUrls[0] || '',
                            candidateUrls,
                            stats: [
                              { label: 'Categoría', value: sp.category, color: sp.color },
                              { label: 'Coste Maná', value: `${sp.cost}M`, color: '#38bdf8' },
                              { label: 'Estado', value: isLearned ? 'Desbloqueado' : 'Disponible en Tienda', color: isLearned ? '#10b981' : '#fbbf24' },
                            ],
                          });
                          gameAudio.playCrispClick();
                        }}
                        className={`p-3.5 rounded-2xl bg-black/85 border flex flex-col justify-between shadow-lg group ${blurMd} cursor-pointer transition ${
                          isLearned ? 'hover:border-fuchsia-300' : 'opacity-70 hover:opacity-100 hover:border-slate-500'
                        }`}
                        style={{ borderColor: isLearned ? `${sp.color}80` : '#334155' }}
                      >
                        <div>
                          <div className="w-full h-32 rounded-xl bg-slate-950/80 border border-slate-800 overflow-hidden relative mb-2.5 flex items-center justify-center p-2">
                            <CachedImage
                              cacheKey={`codex_spell_${sp.id}`}
                              candidateUrls={candidateUrls}
                              alt={sp.name}
                              className="w-full h-full object-contain filter drop-shadow group-hover:scale-105 transition duration-300"
                            />
                            <span
                              className="absolute top-1.5 right-1.5 text-[9px] px-2 py-0.5 rounded-full font-mono font-bold bg-black/85 border"
                              style={{ borderColor: sp.color, color: sp.color }}
                            >
                              {sp.cost} Maná
                            </span>
                          </div>

                          <div className="flex items-center justify-between mb-1">
                            <h5 className="font-serif font-black text-xs sm:text-sm text-slate-100 group-hover:text-amber-300 truncate">
                              {sp.name}
                            </h5>
                            <span
                              className={`text-[8.5px] px-1.5 py-0.2 rounded font-mono font-bold border shrink-0 ${
                                isLearned
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                                  : 'bg-slate-900 text-slate-500 border-slate-700'
                              }`}
                            >
                              {isLearned ? 'DESBLOQUEADO' : 'BLOQUEADO'}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-300 font-sans leading-snug mb-2">
                            {sp.desc}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-serif font-bold">
                          <span style={{ color: sp.color }}>{sp.category}</span>
                          <span className="text-cyan-300 text-[10px]">🔍 Detalle</span>
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

      {/* PANTALLA DE OBSERVACIÓN / INSPECCIÓN DETALLADA CON BOTÓN SALIR SUPERIOR DERECHO (reutiliza el único fondo del Códice) */}
      {inspectedItem && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-3 sm:p-6 select-none ${isAndroid ? 'bg-black/90' : `bg-black/80 ${blurSm}`} animate-fadeIn`}
          onClick={() => setInspectedItem(null)}
        >

          {/* BARRA SUPERIOR CON TÍTULO DE OBSERVACIÓN Y BOTÓN VERTICAL SALIR EN LA ESQUINA SUPERIOR DERECHA */}
          <div
            className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex flex-col text-left px-3 py-1.5 rounded-2xl bg-black/85 border border-amber-500/50 shadow-lg ${blurMd}`}>
              <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase drop-shadow">
                INSPECCIÓN DEL SABER
              </span>
              <div className="flex items-center gap-2">
                <h2
                  className="text-lg sm:text-2xl font-black font-serif tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,1)] uppercase"
                  style={{ color: inspectedItem.color }}
                >
                  {inspectedItem.title}
                </h2>
              </div>
            </div>

            {/* BOTÓN SALIR VERTICAL EN LA ESQUINA SUPERIOR DERECHA */}
            <button
              type="button"
              onClick={() => {
                gameAudio.playCrispClick();
                setInspectedItem(null);
              }}
              className={`flex flex-col items-center justify-center p-1.5 sm:p-2 px-2.5 sm:px-3 rounded-2xl border-0 transition-all duration-300 transform active:scale-95 cursor-pointer group relative ${blurMd}`}
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                boxShadow: '0 0 35px rgba(245, 158, 11, 0.55), inset 0 0 20px rgba(245, 158, 11, 0.35)',
              }}
              aria-label="Salir de la observación"
            >
              <CachedImage
                cacheKey="icono_salir_main"
                candidateUrls={exitIconCandidates}
                alt="Salir"
                loading="eager"
                fallbackPlaceholder={<></>}
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain filter brightness-110 contrast-110 pointer-events-none group-hover:scale-110 transition-transform"
                style={{ mixBlendMode: 'screen' }}
              />
              <span className="font-serif font-bold tracking-widest text-slate-300 group-hover:text-amber-300 transition-colors text-[9px] sm:text-[10px] mt-0.5">
                SALIR
              </span>
            </button>
          </div>

          {/* CONTENEDOR CENTRAL DE OBSERVACIÓN: ILUSTRACIÓN EXPANDIDA Y ATRIBUTOS */}
          <div
            className={`relative z-10 max-w-xl w-full my-auto flex flex-col items-center gap-3.5 text-center pointer-events-auto p-4 sm:p-6 bg-black/80 border-2 rounded-3xl ${blurMd} animate-scaleUp max-h-[82dvh] overflow-y-auto touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
            style={{ borderColor: inspectedItem.color, boxShadow: `0 0 50px ${inspectedItem.color}50` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* IMAGEN DE REFERENCIA EXPANDIDA DE ALTO IMPACTO */}
            {inspectedItem.imgUrl && (
              <div
                className="w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-2xl border-2 overflow-hidden shadow-2xl bg-black/60 p-2.5 flex items-center justify-center relative shrink-0"
                style={{ borderColor: `${inspectedItem.color}90`, boxShadow: `0 0 35px ${inspectedItem.color}40` }}
              >
                <CachedImage
                  cacheKey={`codex_inspect_${inspectedItem.title}`}
                  candidateUrls={inspectedItem.candidateUrls || (inspectedItem.imgUrl ? [inspectedItem.imgUrl] : [])}
                  alt={inspectedItem.title}
                  className="w-full h-full object-contain filter drop-shadow-[0_4px_14px_rgba(0,0,0,0.95)]"
                />
              </div>
            )}

            {/* Subtítulo / Rango */}
            <div>
              <span
                className="text-xs font-mono font-bold uppercase tracking-widest block drop-shadow"
                style={{ color: inspectedItem.color }}
              >
                {inspectedItem.sub}
              </span>
            </div>

            {/* Descripción detallada */}
            <p className="text-xs sm:text-sm text-slate-200 font-sans leading-relaxed max-w-md drop-shadow">
              {inspectedItem.desc}
            </p>

            {/* Atributos y estadísticas (SIN ICONOS DE CORAZÓN NI ESPADA) */}
            {inspectedItem.stats && inspectedItem.stats.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 w-full pt-1 max-w-md">
                {inspectedItem.stats.map((st, sIdx) => (
                  <div key={sIdx} className="p-2 sm:p-2.5 rounded-xl bg-black/80 border border-slate-800 text-center shadow-inner">
                    <span className="text-[9.5px] text-slate-400 block font-serif">{st.label}</span>
                    <span className="text-xs sm:text-sm font-mono font-bold" style={{ color: st.color || '#ffffff' }}>{st.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Espaciador inferior para centrado óptico */}
          <div className="w-full h-2" />
        </div>
      )}
    </div>
  );
};

export default CodexView;
