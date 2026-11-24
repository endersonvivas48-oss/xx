import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  useIsMobile,
  isAndroidDevice,
  gameAudio,
  GameState,
} from './utils';
import { getConfig } from './constants';
import { usePlayground, usePlaygroundGameLifecycle } from './utils/usePlayground';
import BackgroundMusic from './utils/BackgroundMusic';
import { getHexDistance, HEX_GRID, HEX_MAP, PLAYER_MASTER_START_HEX, AI_MASTER_START_HEX } from './hexGrid';
import { CityOverworld } from './CityOverworld';
import { disposeCombatBoardAsset, isCombatEnvironmentLoadSettled } from './Game';
import { ResidentialHouseData, getHouseSafeExitPos } from './MedievalHouse';
import { DailyContract, TavernDialogueData } from './TavernInterior';
import { ShopDialogueData } from './ShopInterior';
import { WorkshopDialogueData } from './WorkshopInterior';
import { ColiseumDialogueData } from './ColiseumInterior';
import { HOUSE_TUTORIAL_LESSONS, HouseTutorialLesson, isHouseBattleLesson } from './houseTutorialsData';
import { FORGE_MATERIALS } from './forgeSystemData';
import {
  generateCampaignThemedRewardDie,
  generateCampaignThemedRewardOrb,
} from './campaignThemeExclusives';
import { OrbThumbnail } from './OrbThumbnail';
import { InspectedImageRenderer } from './InspectedImageRenderer';
import { ShopView } from './ShopView';
import { CodexView } from './CodexView';
import { GrimoireView } from './GrimoireView';
import { ColiseumDifficultyModal } from './ColiseumDifficultyModal';
import { ColiseumView } from './ColiseumView';
import { WorkshopView } from './WorkshopView';
import { ForgeView } from './ForgeView';
import { CampaignSelectorModal } from './CampaignSelectorModal';
import { CampaignLoadingScreen } from './CampaignLoadingScreen';
import { isCityEnvironmentLoadSettled, disposeUnusedCityAssets } from './cityEnvironmentPreloader';
import { CombatPreloaderScreen } from './CombatPreloaderScreen';
import { prepareCombatSetup } from './useCombatController';
import { CombatArenaView } from './CombatArenaView';
import { CampaignHubView } from './CampaignHubView';
import { TitleView } from './TitleView';
import { getCampaignImageCandidateUrls } from './campaignImageMap';
import {
  getOrRotateDailyContracts,
  getTodayDateKey,
} from './dailyContractSystem';
import {
  initImageDnsPreconnect,
  getCachedVerifiedUrl,
} from './imageOptimizer';
import { CachedImage } from './CachedImage';
import { GoldCoinIcon } from './GoldCoinIcon';
import {
  DieData,
  DieRarity,
  Orb,
  UnitData,
  RolledDieResult,
  FloatingText,
  SpellVFX,
  ColiseumDifficulty,
  SpecialHexRune,
  BattleRewardModalData,
  CityDialogueData,
} from './types';
import {
  ALLEY_OPPONENTS_ROSTER,
  TOURNAMENT_CONTENDERS_ROSTER,
  DUNGEON_LORDS_QUALIFIERS_ROSTER,
  DUNGEON_LORDS_TOURNAMENT_ROSTER,
  RECRUIT_PRACTICE_ROSTER,
  RECRUIT_TOURNAMENT_ROSTER,
  SHADOW_THRONE_PURGE_ROSTER,
  SHADOW_THRONE_TOURNAMENT_ROSTER,
  AlleyOpponent,
  TournamentContender,
  GladiatorDuelHandicap,
  GLADIATOR_DUEL_HANDICAPS,
  calculateGladiatorDuelRewards,
} from './campaignData';
import { Achievement } from './TrophyModal';
import { GladiatorDuelModal } from './GladiatorDuelModal';
import { MasterPieceModal, MasterCustomizationData } from './MasterPieceModal';
import { LevelUpChoiceModal } from './LevelUpChoiceModal';
import { NewCampaignModal } from './NewCampaignModal';
import { DiskCacheModal } from './DiskCacheModal';
import { UniversalAssetCache } from './UniversalAssetCache';
import { ErrorBoundary } from './ErrorBoundary';
import { useTacticalBattleState } from './tacticalStateModules';
import { dexieStorage } from './dexieStorage';
import { INITIAL_TIERED_ACHIEVEMENTS, mergeTieredAchievementsWithDefaults } from './AchievementsModal';
import { AchievementProgression } from './types';
import { AchievementsManager } from './AchievementsManager';
import { TavernInteriorView } from './TavernInteriorView';
import { ShopInteriorView } from './ShopInteriorView';
import { WorkshopInteriorView } from './WorkshopInteriorView';
import { HouseInteriorView } from './HouseInteriorView';
import { BattleEndOverlays } from './BattleEndOverlays';
import { CityExplorationView } from './CityExplorationView';
import { ConfirmationModals } from './ConfirmationModals';
import { SecondaryModals } from './SecondaryModals';
import {
  savePlayerProgressToStorage,
  loadPlayerProgressFromStorageAsync,
  CampaignProgressData,
} from './playerPersistenceStore';
import {
  CATALOG_ASCENDED_TITANS,
  CATALOG_CREATURES_J1,
  CATALOG_CREATURES_J2,
  CATALOG_GRIMOIRE_SPELLS,
  CATALOG_ELEMENT_ORBS,
  CATALOG_MASTERY_TIERS,
  calculateCreatureStats,
  RARIDADES,
} from './gameCatalogData';
import { AiTactic } from './aiPlanner';
import { useCombatResolution, EmergentGladiatorBark } from './useCombatResolution';
import { calculateTitanEntryDirectDamageHp } from './tacticalCombatFormulas';
import { runAiTurn } from './aiTurnRunner';
import {
  MUTUAL_ACHIEVEMENT_LINKS,
  evaluateClassicAchievements,
  evaluateTieredAchievements,
  syncMutualAchievementClaims,
  ClassicAchievementSnapshot,
  TieredAchievementSnapshot,
} from './achievementEvaluator';
import { GameMenuModal } from './GameMenuModal';
import { StatsModal } from './StatsModal';
import {
  analyzeDiceCombination,
} from './combatStateMachine';
import {
  Settings,
} from 'lucide-react';

// Fast CDN & Raw GitHub para imágenes oficiales de UI y fondos (repositorio unificado: https://github.com/endersonvivas48-oss/main)
const MAIN_RAW_BASE = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';
const MAIN_CDN_BASE = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';

// Notificación inmediata al contenedor de Playground al evaluar el script
if (typeof window !== 'undefined' && window.parent) {
  try {
    window.parent.postMessage({ type: 'PREVIEW_READY' }, '*');
  } catch (_) {}
}

const ASCENDED_TITANS = CATALOG_ASCENDED_TITANS;
const CODEX_J1_CREATURES = CATALOG_CREATURES_J1;
const CODEX_J2_CREATURES = CATALOG_CREATURES_J2;
const GRIMOIRE_SPELLS = CATALOG_GRIMOIRE_SPELLS;
const ELEMENT_ORBS = CATALOG_ELEMENT_ORBS;
const MASTERY_TIERS = CATALOG_MASTERY_TIERS;

  // MasterCombatHUD ha sido modularizado y extraído a CombatArenaView.tsx

const LOGO_FAST_MIRROR = `${MAIN_CDN_BASE}/logo.png`;
const LOGO_RAW_GITHUB = `${MAIN_RAW_BASE}/logo.png`;
const SOLOMON_FAST_MIRROR = `${MAIN_CDN_BASE}/solomon.jpg`;
const SOLOMON_RAW_GITHUB = `${MAIN_RAW_BASE}/solomon.jpg`;
const CAMP_FAST_MIRROR = `${MAIN_CDN_BASE}/campamento.jpg`;
const CAMP_RAW_GITHUB = `${MAIN_RAW_BASE}/campamento.jpg`;
const CODEX_FAST_MIRROR = `${MAIN_CDN_BASE}/codice.jpg`;
const CODEX_RAW_GITHUB = `${MAIN_RAW_BASE}/codice.jpg`;
const LIBRO_FAST_MIRROR = `${MAIN_CDN_BASE}/libro.jpg`;
const LIBRO_RAW_GITHUB = `${MAIN_RAW_BASE}/libro.jpg`;

// Fullscreen Códice Artwork Background con Caché Persistente
function FullscreenCodexBackground({ className = '' }: { className?: string }) {
  const candidateUrls = [
    getCachedVerifiedUrl('bg_codex') || `${MAIN_CDN_BASE}/codice.webp`,
    `${MAIN_CDN_BASE}/codice.webp`,
    `${MAIN_RAW_BASE}/codice.webp`,
    CODEX_FAST_MIRROR,
    CODEX_RAW_GITHUB,
    './assets/codice.webp',
    './assets/codice.jpg',
  ];

  return (
    <CachedImage
      cacheKey="bg_codex"
      candidateUrls={candidateUrls}
      alt="Códice de Criaturas"
      className={`absolute inset-0 w-full h-full object-cover object-center filter brightness-90 transition-opacity duration-300 pointer-events-none select-none ${className}`}
    />
  );
}

// Fullscreen Libro de Hechizos Artwork Background con Caché Persistente
function FullscreenLibroBackground({ className = '' }: { className?: string }) {
  const candidateUrls = [
    getCachedVerifiedUrl('bg_libro') || `${MAIN_CDN_BASE}/libro.webp`,
    `${MAIN_CDN_BASE}/libro.webp`,
    `${MAIN_RAW_BASE}/libro.webp`,
    LIBRO_FAST_MIRROR,
    LIBRO_RAW_GITHUB,
    './assets/libro.webp',
    './assets/libro.jpg',
  ];

  return (
    <CachedImage
      cacheKey="bg_libro"
      candidateUrls={candidateUrls}
      alt="Libro de Hechizos"
      className={`absolute inset-0 w-full h-full object-cover object-center filter brightness-45 contrast-105 transition-opacity duration-300 pointer-events-none select-none ${className}`}
    />
  );
}

// Fullscreen Campamento Artwork con Caché Persistente
function FullscreenCampBackground({ className = '' }: { className?: string }) {
  const candidateUrls = [
    getCachedVerifiedUrl('bg_camp') || `${MAIN_CDN_BASE}/campamento.webp`,
    `${MAIN_CDN_BASE}/campamento.webp`,
    `${MAIN_RAW_BASE}/campamento.webp`,
    CAMP_FAST_MIRROR,
    CAMP_RAW_GITHUB,
    './assets/campamento.webp',
    './assets/campamento.jpg',
  ];

  return (
    <CachedImage
      cacheKey="bg_camp"
      candidateUrls={candidateUrls}
      alt="Campamento de Guerra"
      className={`absolute inset-0 w-full h-full object-cover object-center filter brightness-90 transition-opacity duration-300 pointer-events-none select-none ${className}`}
    />
  );
}

// Fullscreen Solomon Shop Artwork con Caché Persistente
function FullscreenShopBackground({ className = '' }: { className?: string }) {
  const candidateUrls = [
    getCachedVerifiedUrl('bg_solomon') || `${MAIN_CDN_BASE}/solomon.webp`,
    `${MAIN_CDN_BASE}/solomon.webp`,
    `${MAIN_RAW_BASE}/solomon.webp`,
    `${MAIN_CDN_BASE}/tienda.webp`,
    `${MAIN_RAW_BASE}/tienda.webp`,
    SOLOMON_FAST_MIRROR,
    SOLOMON_RAW_GITHUB,
    './assets/solomon.webp',
    './assets/tienda.webp',
  ];

  return (
    <CachedImage
      cacheKey="bg_solomon"
      candidateUrls={candidateUrls}
      alt="La Tienda de Solomon"
      className={`absolute inset-0 w-full h-full object-cover object-center filter brightness-90 transition-opacity duration-300 pointer-events-none select-none ${className}`}
    />
  );
}

// Fullscreen Logo Artwork con Caché Persistente
function FullscreenGameLogo({ className = '' }: { className?: string }) {
  const candidateUrls = [
    getCachedVerifiedUrl('bg_logo') || `${MAIN_CDN_BASE}/logo.webp`,
    `${MAIN_CDN_BASE}/logo.webp`,
    `${MAIN_RAW_BASE}/logo.webp`,
    LOGO_FAST_MIRROR,
    LOGO_RAW_GITHUB,
    './assets/logo.webp',
    './assets/logo.png',
  ];

  return (
    <CachedImage
      cacheKey="bg_logo"
      candidateUrls={candidateUrls}
      alt="Dungeon Dice Battle: El Legado"
      className={`absolute inset-0 w-full h-full object-cover object-center filter brightness-95 transition-opacity duration-300 pointer-events-none select-none ${className}`}
    />
  );
}

// Fullscreen Workshop (Taller de Dados) Background Artwork con Caché Persistente
function FullscreenWorkshopBackground({ className = '' }: { className?: string }) {
  const workshopSpecificCandidates = [
    `${MAIN_CDN_BASE}/forja.webp`,
    `${MAIN_RAW_BASE}/forja.webp`,
    `${MAIN_CDN_BASE}/forja_fondo.webp`,
    `${MAIN_RAW_BASE}/forja_fondo.webp`,
    `${MAIN_CDN_BASE}/fondo_taller.webp`,
    `${MAIN_RAW_BASE}/fondo_taller.webp`,
    `${MAIN_CDN_BASE}/taller.webp`,
    `${MAIN_RAW_BASE}/taller.webp`,
    `${MAIN_CDN_BASE}/forja.jpg`,
    `${MAIN_RAW_BASE}/forja.jpg`,
    './assets/forja.webp',
    './assets/forja_fondo.webp',
    './assets/taller.webp',
  ];
  const cachedUrl = getCachedVerifiedUrl('bg_workshop');
  const candidateUrls = cachedUrl && !cachedUrl.includes('taller_dados_fondo')
    ? [cachedUrl, ...workshopSpecificCandidates.filter((u) => u !== cachedUrl)]
    : workshopSpecificCandidates;

  return (
    <CachedImage
      cacheKey="bg_workshop"
      candidateUrls={candidateUrls}
      alt="Taller de Dados"
      className={`absolute inset-0 w-full h-full object-cover object-center filter brightness-90 transition-opacity duration-300 pointer-events-none select-none ${className}`}
    />
  );
}

// Fullscreen Gran Forja Background Artwork con URL exclusiva forja_fondo.webp
function FullscreenForgeBackground({ className = '' }: { className?: string }) {
  const candidateUrls = [
    'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/forja_fondo.webp',
    'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/forja_fondo.webp',
  ];

  return (
    <CachedImage
      cacheKey="bg_forge_exclusivo"
      candidateUrls={candidateUrls}
      alt="Gran Forja"
      className={`absolute inset-0 w-full h-full object-cover object-center filter brightness-90 transition-opacity duration-300 pointer-events-none select-none ${className}`}
    />
  );
}

const MENU_BG_CANDIDATES = [
  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/fondo_cyty.webp',
  'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/fondo_cyty.webp',
  'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/fondo_cyty.jpg',
  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/fondo_cyty.jpg',
  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/menu.webp',
  'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/menu.webp',
  'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/menu.jpg',
  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/menu.jpg',
];

// Fullscreen Menu de Juego Background Artwork con Caché Persistente
function FullscreenMenuBackground({ className = '' }: { className?: string }) {
  const candidateUrls = [
    getCachedVerifiedUrl('bg_menu_city') || MENU_BG_CANDIDATES[0],
    ...MENU_BG_CANDIDATES,
  ];

  return (
    <CachedImage
      cacheKey="bg_menu_city"
      candidateUrls={candidateUrls}
      alt="Fondo Menú Ciudad"
      className={`absolute inset-0 w-full h-full object-cover object-center filter brightness-90 transition-opacity duration-300 pointer-events-none select-none ${className}`}
    />
  );
}

const CAMPAIGN_LOADING_META: ReadonlyArray<{ title: string; accent: string }> = [
  { title: 'El Camino al Torneo', accent: '#f59e0b' },
  { title: 'Señores del Calabozo', accent: '#c084fc' },
  { title: 'Torneíllo del Recluta', accent: '#34d399' },
  { title: 'Trono de las Sombras', accent: '#f43f5e' },
];

function buildCampaignLoadingMeta(campaignIdx: number) {
  const meta = CAMPAIGN_LOADING_META[campaignIdx];
  const candidates = getCampaignImageCandidateUrls(campaignIdx);
  return {
    num: campaignIdx + 1,
    title: meta?.title || `Campaña ${campaignIdx + 1}`,
    accent: meta?.accent || '#f59e0b',
    bgUrl: candidates[0] || '',
  };
}

// Initial Master Units setup helper so units exist immediately
function createInitialMasters(): UnitData[] {
  const initialMasterHp = getConfig('masterMaxHp');
  return [
    {
      id: 'master_j2',
      nombre: 'REY CARMESÍ (J2)',
      nivel: 1,
      hpActual: initialMasterHp,
      hpMax: initialMasterHp,
      daño: 6,
      dueño: 2,
      posicion: AI_MASTER_START_HEX,
      yaSeMovio: false,
      esMaestra: true,
      esAscendido: false,
    },
    {
      id: 'master_j1',
      nombre: 'REY CELESTE (J1)',
      nivel: 1,
      hpActual: initialMasterHp,
      hpMax: initialMasterHp,
      daño: 6,
      dueño: 1,
      posicion: PLAYER_MASTER_START_HEX,
      yaSeMovio: false,
      esMaestra: true,
      esAscendido: false,
    },
  ];
}

function generateNewCampaignDeck(): { deck: DieData[]; hasEpic: boolean; hasLegendary: boolean } {
  const deck: DieData[] = [];
  // 50% de probabilidad de obtener un Dado Épico y 10% de obtener un Dado Legendario
  const hasLegendary = Math.random() < 0.10;
  const hasEpic = Math.random() < 0.50;

  const legendaryIdx = hasLegendary ? Math.floor(Math.random() * 24) + 1 : -1;
  let epicIdx = -1;
  if (hasEpic) {
    do {
      epicIdx = Math.floor(Math.random() * 24) + 1;
    } while (epicIdx === legendaryIdx);
  }

  for (let i = 1; i <= 24; i++) {
    const isLegendary = i === legendaryIdx;
    const isEpic = i === epicIdx;

    let rarity = RARIDADES.NORMAL;
    let name = `Dado ${i}`;

    if (isLegendary) {
      rarity = RARIDADES.LEGENDARIO;
      name = `Dado Legendario ${i}`;
    } else if (isEpic) {
      rarity = RARIDADES.EPICO;
      name = `Dado Épico ${i}`;
    }

    deck.push({
      id: 'd_' + i,
      name,
      rarity,
      level: 1, // Todos los dados inician estrictamente en Lv.1
      attachedOrbs: [], // Empieza sin ningún orbe equipado
      enMazo: true,
    });
  }

  return { deck, hasEpic, hasLegendary };
}

export type { BattleRewardModalData } from './types';

function generateRandomBattleRewardDie(fightNumber: number, heroLevel: number): { name: string; rarity: DieRarity; level: number } {
  const roll = Math.random();
  let rarity = RARIDADES.NORMAL;
  let level = 1;

  if (fightNumber >= 8 || heroLevel >= 6) {
    if (roll < 0.30) {
      rarity = RARIDADES.LEGENDARIO;
      level = Math.floor(Math.random() * 2) + 3; // 3 o 4
    } else if (roll < 0.75) {
      rarity = RARIDADES.EPICO;
      level = Math.floor(Math.random() * 2) + 2; // 2 o 3
    } else {
      rarity = RARIDADES.RARO;
      level = 2;
    }
  } else if (fightNumber >= 4 || heroLevel >= 3) {
    if (roll < 0.15) {
      rarity = RARIDADES.LEGENDARIO;
      level = 3;
    } else if (roll < 0.60) {
      rarity = RARIDADES.EPICO;
      level = Math.floor(Math.random() * 2) + 2; // 2 o 3
    } else {
      rarity = RARIDADES.RARO;
      level = 2;
    }
  } else {
    if (roll < 0.08) {
      rarity = RARIDADES.LEGENDARIO;
      level = 2;
    } else if (roll < 0.35) {
      rarity = RARIDADES.EPICO;
      level = 2;
    } else {
      rarity = RARIDADES.RARO;
      level = 1;
    }
  }

  const dieAdjectives = [
    'Astral', 'de Batalla', 'de Guerra', 'del Destino', 'de la Forja',
    'de Furia', 'del Alba', 'de la Tormenta', 'del Vencedor', 'de Acero'
  ];
  const adj = dieAdjectives[Math.floor(Math.random() * dieAdjectives.length)];
  const name = `Dado ${rarity.name} ${adj}`;

  return { name, rarity, level };
}

function generateRandomBattleRewardOrb(heroLevel: number): Orb {
  const availableOrbs = ELEMENT_ORBS.filter((o) => !o.minHeroLevel || o.minHeroLevel <= heroLevel + 2);
  const pool = availableOrbs.length > 0 ? availableOrbs : ELEMENT_ORBS;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return {
    ...picked,
    templateId: picked.templateId || picked.id,
    id: `o_rew_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
  };
}

export default function App() {
  const [isTopHudVisible, setIsTopHudVisible] = useState<boolean>(true);
  const [descFontSize, setDescFontSize] = useState<number>(12);
  const { sdk, isReady } = usePlayground();
  const isMobile = useIsMobile();
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Inicializar aceleración de red DNS, viewport 100dvh para móviles y señales de arranque
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.getElementById('root');
      if (root) {
        root.style.height = '100dvh';
        root.style.width = '100vw';
        root.style.overflow = 'hidden';
        if (root.firstElementChild) {
          (root.firstElementChild as HTMLElement).style.height = '100dvh';
          (root.firstElementChild as HTMLElement).style.width = '100vw';
          (root.firstElementChild as HTMLElement).style.overflow = 'hidden';
        }
      }
    }

    try {
      window.parent.postMessage({ type: 'PREVIEW_READY' }, '*');
    } catch (_) {}

    const handleParentPing = (e: MessageEvent) => {
      if (e.data && (e.data.type === 'PING' || e.data.type === 'CHECK_READY' || e.data.type === 'PREVIEW_PING')) {
        try {
          window.parent.postMessage({ type: 'PREVIEW_READY' }, '*');
        } catch (_) {}
      }
    };
    window.addEventListener('message', handleParentPing);

  // Aplicar volumen inicial de efectos configurado en constants / playground_config
    gameAudio.setVolume(getConfig('defaultSfxVolume'));

    // Inyectar preconnect ligero
    initImageDnsPreconnect();

    return () => window.removeEventListener('message', handleParentPing);
  }, []);

  // Auto-iniciar cuando ?autoplay está presente en la URL (utilizado por preview-cmd --screenshot)
  const hasAutoplayed = useRef(false);
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('autoplay')
    ) {
      if (!hasAutoplayed.current) {
        hasAutoplayed.current = true;
        setCurrentScreen('CITY_EXPLORATION');
        setGameState((prev) => ({ ...prev, status: 'PLAYING', score: 0, level: 1 }));
      }
      if (sdk && typeof sdk.startGame === 'function') {
        try {
          sdk.startGame();
        } catch (_) {}
      }
      try {
        window.parent.postMessage({ type: 'PREVIEW_READY' }, '*');
      } catch (_) {}
    }
  }, [sdk]);

  useEffect(() => {
    const checkTouch = () => {
      const hasTouch =
        typeof window !== 'undefined' &&
        ('ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          (navigator as any).msMaxTouchPoints > 0 ||
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
      setIsTouchDevice(Boolean(hasTouch || isMobile));
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, [isMobile]);

  // Screen View States: 'SPLASH' | 'TITLE' | 'CAMPAIGN_HUB' | 'WORKSHOP' | 'SHOP' | 'COMBAT' | 'SPELLBOOK' | 'CITY_EXPLORATION' | 'HOUSE_INTERIOR' | 'TAVERN_INTERIOR' | 'SHOP_INTERIOR' | 'WORKSHOP_INTERIOR' | 'COLISEUM_INTERIOR' | 'FORGE'
  const [currentScreen, setCurrentScreen] = useState<
    | 'SPLASH'
    | 'TITLE'
    | 'CAMPAIGN_HUB'
    | 'WORKSHOP'
    | 'SHOP'
    | 'COMBAT'
    | 'SPELLBOOK'
    | 'CITY_EXPLORATION'
    | 'HOUSE_INTERIOR'
    | 'TAVERN_INTERIOR'
    | 'SHOP_INTERIOR'
    | 'WORKSHOP_INTERIOR'
    | 'COLISEUM_INTERIOR'
    | 'FORGE'
    | 'CODEX_BOOK'
  >('TITLE');

  // Limpieza de memoria al salir de la sesión activa hacia Título/Splash
  // Mantiene los GLBs ya decimados intactos durante Ciudad ↔ Edificios ↔ Combate para evitar
  // re-decimar desde ArrayBuffer/Draco, reconstruir atlas y recompilar shaders en cada transición móvil.
  const prevScreenRef = useRef(currentScreen);
  useEffect(() => {
    if (prevScreenRef.current !== currentScreen) {
      if (currentScreen === 'TITLE' || currentScreen === 'SPLASH') {
        UniversalAssetCache.releaseMemory();
        disposeUnusedCityAssets(true);
        disposeCombatBoardAsset(true);
      }
      prevScreenRef.current = currentScreen;
    }
  }, [currentScreen]);

  // Estados elevados para Interiores 3D
  const [tavernActiveDialogue, setTavernActiveDialogue] = useState<TavernDialogueData | null>(null);
  const [isTavernContractBoardOpen, setIsTavernContractBoardOpen] = useState(false);
  const [isHouseDialogueOpen, setIsHouseDialogueOpen] = useState(false);
  const [shopActiveDialogue, setShopActiveDialogue] = useState<ShopDialogueData | null>(null);
  const [workshopActiveDialogue, setWorkshopActiveDialogue] = useState<WorkshopDialogueData | null>(null);
  const [coliseumActiveDialogue, setColiseumActiveDialogue] = useState<ColiseumDialogueData | null>(null);

  // Sistema de Contratos Diarios de Cazador en la Taberna (se persisten únicamente en el guardado manual unificado)
  const [dailyContracts, setDailyContracts] = useState<DailyContract[]>(() =>
    getOrRotateDailyContracts([0], 1, { persist: false, ignoreStorage: true })
  );

  // Asegurar que al cambiar de pantalla no se fuerce pantalla completa automáticamente
  useEffect(() => {
    // Intencionalmente no auto-reenganchamos pantalla completa por cambio de pantalla
  }, [currentScreen]);

  const createInitialForgeInventory = (): Record<string, number> => ({
    obsidiana_sombras: 0,
    polvo_astral: 0,
    lingote_runico: 0,
    chispa_vacio: 0,
    cristal_eterio: 0,
    lagrima_fenix: 0,
    piedra_filosofal_astral: 0,
    nucleo_adamantio_puro: 0,
    esencia_del_titan_belico: 0,
    orbe_de_ranura_ancestral: 0,
  });

  // Inventario de Materiales de Forja (Minerales y Esencias arcanas obtenidas a partir de Campaña 4)
  const [forgeInventory, setForgeInventory] = useState<Record<string, number>>(createInitialForgeInventory);

  const createDefaultDeckPresets = () => [
    { name: 'Mazo Principal (Equilibrado)', dieIds: [] as string[] },
    { name: 'Mazo Furia (Agresivo)', dieIds: [] as string[] },
    { name: 'Mazo Bastión (Defensivo)', dieIds: [] as string[] },
  ];

  // Preajustes de Mazos (Deck Presets): Guardar y alternar entre 3 configuraciones de mazo de 24 dados
  const [activeDeckPresetIndex, setActiveDeckPresetIndex] = useState<number | null>(null);
  const [deckPresets, setDeckPresets] = useState<{ name: string; dieIds: string[] }[]>(createDefaultDeckPresets);
  const playerDeckRef = useRef<DieData[]>([]);
  const loadProgressEpochRef = useRef<number>(0);

  // Maestría de la Gran Forja (desbloqueada en Campaña 4)
  // Cada nivel de Maestría otorga +5% de probabilidad de éxito en todas las recetas hasta alcanzar el 100%
  const [forgeMasteryLevel, setForgeMasteryLevel] = useState<number>(1);
  const [forgeMasteryExp, setForgeMasteryExp] = useState<number>(0);
  const [forgeTotalAttempts, setForgeTotalAttempts] = useState<number>(0);
  const [forgeTotalSuccesses, setForgeTotalSuccesses] = useState<number>(0);

  // Guardar configuración actual del mazo activo en el preset seleccionado
  const saveCurrentDeckToPreset = (presetIdx: number) => {
    const liveDeck = playerDeckRef.current;
    const activeDieIds = liveDeck.filter((d) => d.enMazo).map((d) => d.id);
    if (activeDieIds.length !== 24) {
      gameAudio.playErrorBuzz();
      triggerBattleMessage(
        `⚠️ Tu mazo debe tener exactamente 24 dados equipados para guardarlo en un preajuste (actual: ${activeDieIds.length}/24).`,
        '#f59e0b'
      );
      return;
    }

    const presetName = deckPresets[presetIdx]?.name || `Preajuste #${presetIdx + 1}`;
    setDeckPresets((prev) =>
      prev.map((preset, idx) =>
        idx === presetIdx ? { ...preset, dieIds: activeDieIds } : preset
      )
    );
    setActiveDeckPresetIndex(presetIdx);
    gameAudio.playPowerupChime();
    triggerBattleMessage(`💾 ¡Preajuste #${presetIdx + 1} (${presetName}) actualizado en el Taller!`, '#38bdf8');
  };

  // Cargar configuración de mazo desde un preset guardado
  const loadDeckFromPreset = (presetIdx: number) => {
    const preset = deckPresets[presetIdx];
    if (!preset || !preset.dieIds || preset.dieIds.length === 0) {
      gameAudio.playErrorBuzz();
      triggerBattleMessage(`⚠️ El Preajuste #${presetIdx + 1} está vacío. Configura tu mazo y pulsa \"Guardar Preajuste\".`, '#f59e0b');
      return;
    }

    // Comprobar cuáles dados siguen existiendo en el inventario usando referencia viva
    const liveDeck = playerDeckRef.current;
    const existingIds = new Set(preset.dieIds.filter((id) => liveDeck.some((d) => d.id === id)));
    let didAutoComplete = false;
    if (existingIds.size < 24) {
      // Si faltan dados (por venta o fusión), autocompletar con dados de reserva hasta llegar a 24
      const otherDice = liveDeck.filter((d) => !existingIds.has(d.id));
      for (const d of otherDice) {
        if (existingIds.size >= 24) break;
        existingIds.add(d.id);
        didAutoComplete = true;
      }
    }

    const presetSet = new Set(preset.dieIds);
    const matchesExactPreset =
      !didAutoComplete &&
      existingIds.size === presetSet.size &&
      preset.dieIds.every((id) => existingIds.has(id));

    const nextDeck = liveDeck.map((d) => ({
      ...d,
      enMazo: existingIds.has(d.id),
    }));
    playerDeckRef.current = nextDeck;

    setPlayerDeck((prev) =>
      prev.map((d) => ({
        ...d,
        enMazo: existingIds.has(d.id),
      }))
    );
    setActiveDeckPresetIndex(matchesExactPreset ? presetIdx : null);
    gameAudio.playConfirmSelect();
    triggerBattleMessage(
      matchesExactPreset
        ? `⚔️ ¡Preajuste #${presetIdx + 1} (${preset.name}) cargado al combate!`
        : `⚔️ ¡Preajuste #${presetIdx + 1} (${preset.name}) cargado y completado con dados de reserva!`,
      '#fbbf24'
    );
  };

  // Fusión Universal de Dados: Combina 3 dados de igual rareza de reserva para forjar 1 dado de rareza superior con más ranuras
  const fuseDice = (diceIds: string[], targetRarity: 'RARO' | 'EPICO' | 'LEGENDARIO') => {
    const uniqueSelectedIds = Array.from(new Set(diceIds));
    if (uniqueSelectedIds.length !== 3) return;
    const liveDeck = playerDeckRef.current;
    const selectedDice = liveDeck.filter((d) => uniqueSelectedIds.includes(d.id));
    if (selectedDice.length !== 3) return;

    // Validación estricta de regla de negocio:
    // 1. Ningún dado puede estar en el mazo activo (deben ser exclusivamente dados de reserva)
    if (selectedDice.some((d) => d.enMazo)) {
      gameAudio.playErrorBuzz();
      triggerBattleMessage('⚠️ Solo puedes fusionar dados que estén en la Reserva (fuera del mazo).', '#ef4444');
      return;
    }

    // 2. Verificar que los 3 dados pertenezcan a la rareza de origen esperada
    const expectedSourceRarityName =
      targetRarity === 'RARO'
        ? RARIDADES.NORMAL.name
        : targetRarity === 'EPICO'
        ? RARIDADES.RARO.name
        : RARIDADES.EPICO.name;

    if (selectedDice.some((d) => (d.rarity?.name || 'Normal') !== expectedSourceRarityName)) {
      gameAudio.playErrorBuzz();
      triggerBattleMessage(`⚠️ Para forjar un Dado ${targetRarity}, los 3 dados deben ser de rareza ${expectedSourceRarityName}.`, '#ef4444');
      return;
    }

    // Comprobar si algún dado sacrificado pertenecía a un DeckPreset guardado
    const affectedPresetNumbers = deckPresets
      .map((preset, idx) =>
        preset.dieIds && preset.dieIds.some((id) => uniqueSelectedIds.includes(id)) ? idx + 1 : null
      )
      .filter((num): num is number => num !== null);

    // Recuperar orbes engarzados si los hubiera
    const orbsToRecover: Orb[] = [];
    selectedDice.forEach((d) => {
      if (d.attachedOrbs && d.attachedOrbs.length > 0) {
        orbsToRecover.push(...d.attachedOrbs);
      }
    });

    const rarityObj = RARIDADES[targetRarity] || RARIDADES.RARO;
    const uniqueId = `d_fused_${targetRarity.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newFusedDie: DieData = {
      id: uniqueId,
      name: `Dado ${rarityObj.name}`,
      rarity: rarityObj,
      level: 1,
      attachedOrbs: [],
      enMazo: false,
    };

    // Actualizar referencia síncrona inmediatamente antes de los setters de React
    // para bloquear cualquier duplicación por doble tap antes del re-render
    playerDeckRef.current = [
      ...liveDeck.filter((d) => !uniqueSelectedIds.includes(d.id)),
      newFusedDie,
    ];

    if (orbsToRecover.length > 0) {
      setOrbBank((prev) => [...prev, ...orbsToRecover]);
    }

    // Remover los 3 dados sacrificados y añadir el nuevo dado de forma atómica
    setPlayerDeck((prev) => {
      const stillPresent = prev.filter((d) => uniqueSelectedIds.includes(d.id));
      if (stillPresent.length !== 3) return prev;
      return [...prev.filter((d) => !uniqueSelectedIds.includes(d.id)), newFusedDie];
    });
    gameAudio.playVictoryFanfare();
    triggerHapticFeedback([40, 60, 40]);
    const orbsNote = orbsToRecover.length > 0 ? ` (+${orbsToRecover.length} orbe(s) devueltos al cofre)` : '';
    const presetsNote =
      affectedPresetNumbers.length > 0
        ? ` (Preajuste ${affectedPresetNumbers.map((n) => `#${n}`).join(', ')} requerirá autocompletado)`
        : '';
    const slotsCount = rarityObj.slots;
    const accentColor = targetRarity === 'LEGENDARIO' ? '#f59e0b' : targetRarity === 'EPICO' ? '#c084fc' : '#38bdf8';
    triggerBattleMessage(
      `✨ ¡FUSIÓN EXITOSA! 3 dados transmutados en: Dado ${rarityObj.name} (${slotsCount} ${slotsCount === 1 ? 'Ranura' : 'Ranuras'})${orbsNote}${presetsNote}`,
      accentColor
    );
  };

  const hasIndexedDbSaveRef = useRef<boolean>(false);

  // Helper síncrono para verificar si el usuario tiene una partida guardada en localStorage o respaldada en IndexedDB
  const checkHasActualSavedGame = (): boolean => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('dungeon_dice_save');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && parsed.playerName) {
            return true;
          }
        }
      }
      return hasIndexedDbSaveRef.current;
    } catch {
      return hasIndexedDbSaveRef.current;
    }
  };

  // Casa actual visitada en el modo interior
  const [currentVisitedHouse, setCurrentVisitedHouse] = useState<ResidentialHouseData | null>(null);

  // Modal armonioso de despedida y conclusión didáctica al superar la lección del tutorial
  const [tutorialCompletionModal, setTutorialCompletionModal] = useState<{
    lessonTitle: string;
    residentName: string;
    residentTopic: string;
    residentColor: string;
    residentIcon: string;
    totalCompleted: number;
    exitPos: [number, number, number] | null;
  } | null>(null);

  // Modal y cola de Subida de Nivel y Elección de Mejoras de Características para la Ficha Maestra
  const [levelUpChoiceModal, setLevelUpChoiceModalState] = useState<{
    newLevel: number;
  } | null>(null);
  const levelUpChoiceModalRef = useRef<{ newLevel: number } | null>(null);
  const setLevelUpChoiceModal = useCallback((val: { newLevel: number } | null) => {
    levelUpChoiceModalRef.current = val;
    setLevelUpChoiceModalState(val);
  }, []);

  const [pendingLevelUpQueue, setPendingLevelUpQueueState] = useState<number[]>([]);
  const pendingLevelUpQueueRef = useRef<number[]>([]);
  const setPendingLevelUpQueue = useCallback((val: number[]) => {
    pendingLevelUpQueueRef.current = val;
    setPendingLevelUpQueueState(val);
  }, []);

  const applyHeroExpAndComputeLevelUps = useCallback(
    (currentExp: number, currentLevel: number, gainedExp: number) => {
      let nextExp = currentExp + gainedExp;
      let nextLevel = currentLevel;
      const gainedLevels: number[] = [];

      while (nextLevel < 20 && nextExp >= nextLevel * 180) {
        nextExp -= nextLevel * 180;
        nextLevel += 1;
        gainedLevels.push(nextLevel);
      }

      return {
        nextExp,
        nextLevel,
        hasLeveledUp: gainedLevels.length > 0,
        gainedLevels,
      };
    },
    []
  );

  const enqueueLevelUps = useCallback(
    (levels: number[]) => {
      if (!levels || levels.length === 0) return;
      if (!levelUpChoiceModalRef.current) {
        setLevelUpChoiceModal({ newLevel: levels[0] });
        if (levels.length > 1) {
          setPendingLevelUpQueue([...pendingLevelUpQueueRef.current, ...levels.slice(1)]);
        }
      } else {
        setPendingLevelUpQueue([...pendingLevelUpQueueRef.current, ...levels]);
      }
    },
    [setLevelUpChoiceModal, setPendingLevelUpQueue]
  );

  const advanceLevelUpModal = useCallback(
    (expectedLevel?: number) => {
      if (expectedLevel !== undefined && levelUpChoiceModalRef.current?.newLevel !== expectedLevel) {
        return;
      }
      const queue = pendingLevelUpQueueRef.current;
      if (queue.length > 0) {
        const [nextLevel, ...rest] = queue;
        setPendingLevelUpQueue(rest);
        setLevelUpChoiceModal({ newLevel: nextLevel });
        gameAudio.playLevelUpStinger();
      } else {
        setLevelUpChoiceModal(null);
      }
    },
    [setLevelUpChoiceModal, setPendingLevelUpQueue]
  );

  // Bonificaciones acumuladas por características de la Ficha Maestra
  const [masterAtkBonus, setMasterAtkBonus] = useState<number>(0);
  const [masterStartingManaBonus, setMasterStartingManaBonus] = useState<number>(0);
  const [masterShieldChargeLevel, setMasterShieldChargeLevel] = useState<number>(0);

  // Registro de tutoriales de casas completados (unificado al guardado manual)
  const [completedHouseTutorials, setCompletedHouseTutorials] = useState<string[]>([]);

  // Tutorial activo actual (si se está disputando una batalla didáctica de casa)
  const isTutorialBattleActiveRef = useRef<boolean>(false);
  const [activeHouseTutorial, setActiveHouseTutorial] = useState<HouseTutorialLesson | null>(null);
  const activeHouseTutorialRef = useRef<HouseTutorialLesson | null>(null);
  activeHouseTutorialRef.current = activeHouseTutorial;
  const [tutorialCurrentStep, setTutorialCurrentStep] = useState<number>(1);
  const tutorialSavedEquippedSpellsRef = useRef<string[] | null>(null);
  const restoreTutorialEquippedSpells = useCallback(() => {
    if (tutorialSavedEquippedSpellsRef.current !== null) {
      const savedSpells = tutorialSavedEquippedSpellsRef.current;
      tutorialSavedEquippedSpellsRef.current = null;
      setEquippedSpells(savedSpells);
    }
  }, []);

  // Detectar y forzar orientación horizontal en Android / Dispositivos Móviles
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  // Rastreo persistente de la preferencia de pantalla completa del jugador (para no perderla al modificar o cambiar de vista)
  const isFullscreenPreferredRef = useRef<boolean>(false);
  const fullscreenResizeTimeoutRef = useRef<number | null>(null);

  // Hook modularizado de Estado Táctico de Combate (Mensajes flotantes, feedback háptico y registro histórico)
  const {
    battleMessage,
    combatLog,
    setCombatLog,
    isLogOpen,
    setIsLogOpen,
    triggerHapticFeedback,
    triggerBattleMessage,
    setIsActionLocked: setTacticalActionLock,
    setIsAnimating: setCombatAnimating,
  } = useTacticalBattleState();
  // Función universal para solicitar pantalla completa e inmersión en Android y Web (ocultación de barras de navegación)
  const requestAppFullscreen = () => {
    isFullscreenPreferredRef.current = true;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('dungeon_dice_fullscreen_pref', 'true');
      }
    } catch (_) {}

    try {
      const doc = document as any;
      const docEl = document.documentElement as any;
      const body = document.body as any;

      if (
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      ) {
        setIsFullscreen(true);
        return;
      }

      const targets = [docEl, body, document.getElementById('root')].filter(Boolean);

      const requestMethods = [
        'requestFullscreen',
        'webkitRequestFullscreen',
        'webkitRequestFullScreen',
        'mozRequestFullScreen',
        'msRequestFullscreen',
      ];

      let fullscreenRequested = false;
      outerFullscreenLoop: for (const target of targets) {
        for (const method of requestMethods) {
          if (typeof target[method] === 'function') {
            try {
              const res = target[method]({ navigationUI: 'hide' });
              if (res && typeof res.then === 'function') {
                res
                  .then(() => setIsFullscreen(true))
                  .catch(() => {
                    try {
                      const fallback = target[method]();
                      if (fallback && typeof fallback.then === 'function') {
                        fallback.then(() => setIsFullscreen(true)).catch(() => {});
                      }
                    } catch (_) {}
                  });
              } else {
                setIsFullscreen(true);
              }
              fullscreenRequested = true;
              break outerFullscreenLoop;
            } catch (_) {
              try {
                target[method]();
                setIsFullscreen(true);
                fullscreenRequested = true;
                break outerFullscreenLoop;
              } catch (_) {}
            }
          }
        }
      }

      if (fullscreenResizeTimeoutRef.current !== null) {
        clearTimeout(fullscreenResizeTimeoutRef.current);
      }
      if (fullscreenRequested) {
        fullscreenResizeTimeoutRef.current = window.setTimeout(() => {
          fullscreenResizeTimeoutRef.current = null;
          if (!isAppMountedRef.current) return;
          try {
            window.dispatchEvent(new Event('resize'));
          } catch (_) {}
        }, 150);
      }

      // En Android Web / PWA / Cordova / Capacitor / WebView:
      const winAny = window as any;
      if (winAny?.StatusBar?.hide) {
        try { winAny.StatusBar.hide(); } catch (_) {}
      }
      if (winAny?.NavigationBar?.hide) {
        try { winAny.NavigationBar.hide(); } catch (_) {}
      }

      try {
        window.parent.postMessage({ type: 'REQUEST_FULLSCREEN', navigationUI: 'hide' }, '*');
        window.parent.postMessage({ type: 'TOGGLE_FULLSCREEN', navigationUI: 'hide' }, '*');
        window.parent.postMessage({ type: 'HIDE_NAVIGATION_BAR' }, '*');
      } catch (_) {}

      try {
        const screenAny = window.screen as any;
        if (screenAny?.orientation?.lock) {
          screenAny.orientation.lock('landscape').catch(() => {});
        }
      } catch (_) {}
    } catch (_) {}
  };

  const exitAppFullscreen = () => {
    isFullscreenPreferredRef.current = false;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('dungeon_dice_fullscreen_pref', 'false');
      }
    } catch (_) {}

    try {
      const doc = document as any;
      const exit =
        doc.exitFullscreen ||
        doc.webkitExitFullscreen ||
        doc.webkitCancelFullScreen ||
        doc.mozCancelFullScreen ||
        doc.msExitFullscreen;

      if (exit) {
        const p = exit.call(doc);
        if (p && typeof p.then === 'function') {
          p.then(() => setIsFullscreen(false)).catch(() => {});
        } else {
          setIsFullscreen(false);
        }
      } else {
        setIsFullscreen(false);
      }

      try {
        window.parent.postMessage({ type: 'EXIT_FULLSCREEN' }, '*');
      } catch (_) {}
    } catch (_) {
      setIsFullscreen(false);
    }
  };

  const toggleAppFullscreen = () => {
    const doc = document as any;
    const isCurrentlyFs = Boolean(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    if (isCurrentlyFs) {
      exitAppFullscreen();
    } else {
      requestAppFullscreen();
    }
  };

  useEffect(() => {
    // Cargar preferencia persistente previa de pantalla completa
    try {
      if (typeof localStorage !== 'undefined') {
        const savedPref = localStorage.getItem('dungeon_dice_fullscreen_pref');
        if (savedPref === 'true') {
          isFullscreenPreferredRef.current = true;
        }
      }
    } catch (_) {}

    const updateFsState = () => {
      const doc = document as any;
      const isFs = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(isFs);
      if (isFs) {
        isFullscreenPreferredRef.current = true;
      }
    };

    // Escuchar cambios de tamaño y orientación para desplegar aviso rotatorio si el móvil está vertical
    const checkOrientation = () => {
      const isVertical = window.innerHeight > window.innerWidth;
      setIsPortrait(isVertical && (isMobile || window.innerWidth < 800));
      updateFsState();
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    document.addEventListener('fullscreenchange', updateFsState);
    document.addEventListener('webkitfullscreenchange', updateFsState);
    document.addEventListener('mozfullscreenchange', updateFsState);
    document.addEventListener('MSFullscreenChange', updateFsState);

    return () => {
      if (fullscreenResizeTimeoutRef.current !== null) {
        clearTimeout(fullscreenResizeTimeoutRef.current);
        fullscreenResizeTimeoutRef.current = null;
      }
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      document.removeEventListener('fullscreenchange', updateFsState);
      document.removeEventListener('webkitfullscreenchange', updateFsState);
      document.removeEventListener('mozfullscreenchange', updateFsState);
      document.removeEventListener('MSFullscreenChange', updateFsState);
    };
  }, [isMobile]);
  const [previousScreenBeforeShop, setPreviousScreenBeforeShop] = useState<'CAMPAIGN_HUB' | 'CITY_EXPLORATION' | 'SHOP_INTERIOR' | 'SPELLBOOK'>('CAMPAIGN_HUB');
  const [previousScreenBeforeWorkshop, setPreviousScreenBeforeWorkshop] = useState<'CAMPAIGN_HUB' | 'CITY_EXPLORATION' | 'WORKSHOP_INTERIOR'>('CAMPAIGN_HUB');
  const [previousScreenBeforeSpellbook, setPreviousScreenBeforeSpellbook] = useState<'CAMPAIGN_HUB' | 'CITY_EXPLORATION' | 'TAVERN_INTERIOR'>('CAMPAIGN_HUB');
  const [previousScreenBeforeForge, setPreviousScreenBeforeForge] = useState<'CAMPAIGN_HUB' | 'CITY_EXPLORATION' | 'WORKSHOP_INTERIOR'>('CAMPAIGN_HUB');
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isCampaignSelectorOpen, setIsCampaignSelectorOpen] = useState(false);
  const [selectedCampaignIndex, setSelectedCampaignIndex] = useState(0);
  const [isCombatActionLocked, setIsCombatActionLocked] = useState<boolean>(false);
  const isCombatActionLockedRef = useRef<boolean>(false);
  const setCombatLock = (locked: boolean) => {
    isCombatActionLockedRef.current = locked;
    setIsCombatActionLocked(locked);
    setTacticalActionLock(locked);
    setCombatAnimating(locked);
  };
  const [isCampaignLoadingActive, setIsCampaignLoadingActive] = useState(false);
  const [isCityModelsReady, setIsCityModelsReady] = useState<boolean>(() => isCityEnvironmentLoadSettled());
  const [isCitySceneReady, setIsCitySceneReady] = useState(false);
  const [loadingCampaignMeta, setLoadingCampaignMeta] = useState<{
    num: number;
    title: string;
    accent: string;
    bgUrl?: string;
  } | null>(null);

  // Pantalla de precarga 3D antes de entrar a combate o coliseo
  const [isCombatLoadingActive, setIsCombatLoadingActive] = useState(false);
  const [isCombatBoardReady, setIsCombatBoardReady] = useState<boolean>(() => isCombatEnvironmentLoadSettled());
  const [combatLoadingMeta, setCombatLoadingMeta] = useState<{
    title: string;
    subtitle: string;
    accent: string;
    bgUrl?: string;
    bgCandidates?: string[];
  } | null>(null);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [showReturnTitleConfirmModal, setShowReturnTitleConfirmModal] = useState(false);
  const [lockedCampaignAlertModal, setLockedCampaignAlertModal] = useState<{
    campaignTitle: string;
    description: string;
    requirement: string;
    accentColor: string;
  } | null>(null);
  // Modal del Códice con navegación estilo Grimorio
  const [isCodexOpen, setIsCodexOpen] = useState(false);
  const [isConfirmNewCampaignOpen, setIsConfirmNewCampaignOpen] = useState(false);
  const [pendingCampaignTarget, setPendingCampaignTarget] = useState<number | null>(null);

  const executeStartCampaign = (targetIndex: number) => {
    setActiveCampaignIndex(targetIndex);
    setCurrentScreen('CAMPAIGN_HUB');
    gameAudio.playConfirmSelect();
  };

  const [titleSelectedIndex, setTitleSelectedIndex] = useState(0);
  const [hubSelectedIndex, setHubSelectedIndex] = useState(0);

  // Safeguard: Evitar que modales secundarios permanezcan abiertos simultáneamente
  useEffect(() => {
        if (currentScreen === 'TITLE' || currentScreen === 'SPLASH') {
          returnToMenuAfterModalRef.current = false;
          setIsCodexOpen(false);
          setIsGameMenuOpen(false);
          setIsHowToPlayOpen(false);
          setIsTrophyModalOpen(false);
          setIsTieredModalOpen(false);
          setIsStatsModalOpen(false);
          setIsMasterPieceModalOpen(false);
          setIsAssetDownloaderOpen(false);
          setIsColiseumDifficultyModalOpen(false);
          setIsGladiatorDuelModalOpen(false);
          setIsCampaignSelectorOpen(false);
          setIsConfirmNewCampaignOpen(false);
          setShowSaveConfirmModal(false);
          setShowExitConfirmModal(false);
          setShowReturnTitleConfirmModal(false);
          setShowResetConfirmModal(false);
          setShowNameModal(false);
          setLockedCampaignAlertModal(null);
          setDeckIncompleteModal(null);
          setDeckFullModal(false);
          setVictoryAchievementModal(null);
          setPendingRewardModal(null);
          setTutorialCompletionModal(null);
          setPendingLevelUpQueue([]);
          setLevelUpChoiceModal(null);
          setShowColiseumUnlockedHub(false);
          setSecretCodeActivatedModal(false);
          setAssignedSummary(null);
          setAscendedCutscene(null);
          setSelectBankedCrestModal(null);
          setIsCampaignLoadingActive(false);
          setIsCombatLoadingActive(false);
          setShowDevPanel(false);
          setShowDefeatResultModal(false);
          setShowSecretUnlockModal(false);
          setShowRetireConfirm(false);
          setModalEleccionDoble(null);
          setModalEscalera(null);
          setModalLimiteCriaturas(null);
          setSpellToConfirm(null);
          setInspectedCreature(null);
        }
  }, [currentScreen]);

  // Sistema de Ranuras y Desbloqueos del Libro de Hechizos
  const [unlockedSpells, setUnlockedSpells] = useState<string[]>(['rayo', 'escudo']);
  const [maxSpellSlots, setMaxSpellSlots] = useState<number>(1); // El personaje empieza con 1 ranura máxima
  const [equippedSpells, setEquippedSpells] = useState<string[]>([]); // La ranura inicia libre (sin hechizo pre-equipado)
  const [inspectedCreature, setInspectedCreature] = useState<{
    nombre: string;
    imgUrl: string;
    candidateUrls?: string[];
    nivel: number | string;
    rango: string;
    hp?: number;
    atk?: number;
    desc: string;
    color: string;
    extra?: string;
    isSpell?: boolean;
    costeMana?: number;
    category?: string;
  } | null>(null);
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState<number>(() => getConfig('defaultMusicVolume'));
  const [isSfxMuted, setIsSfxMuted] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(false);

  // Estado booleano estricto: ¿el jugador ha iniciado activamente una campaña en esta partida o sesión?
  const [hasStartedAnyCampaign, setHasStartedAnyCampaign] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(() => {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
      const raw = localStorage.getItem('dungeon_dice_save');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(parsed && typeof parsed === 'object' && parsed.playerName);
    } catch {
      return false;
    }
  });
  // Rastreo estricto de si el jugador ha entrado a jugar la campaña en esta sesión
  const [hasEnteredCampaignSession, setHasEnteredCampaignSession] = useState(false);

  // Campaign State
  const [playerName, setPlayerName] = useState<string>('Viajero');
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  // Modal especial para notificar la activación del código secreto
  const [secretCodeActivatedModal, setSecretCodeActivatedModal] = useState<boolean>(false);
  const [assignedSummary, setAssignedSummary] = useState<{
    name: string;
    hasEpic: boolean;
    hasLegendary: boolean;
    slots: number;
  } | null>(null);

  // Campaign Selection: 0 = 'El Camino al Torneo de Campeones', 1 = 'El Desafío de los Señores del Calabozo', 2 = 'El Torneíllo del Recluta', 3 = 'El Trono de las Sombras'
  const [activeCampaignIndex, setActiveCampaignIndex] = useState<number>(0);
  const [unlockedCampaigns, setUnlockedCampaigns] = useState<number[]>([0]);

  useEffect(() => {
    if (currentScreen !== 'CITY_EXPLORATION') {
      setIsCitySceneReady(false);
      return;
    }
    const settled = isCityEnvironmentLoadSettled();
    setIsCityModelsReady(settled);
    if (!settled) {
      setLoadingCampaignMeta(buildCampaignLoadingMeta(activeCampaignIndex));
      setIsCitySceneReady(false);
      setIsCampaignLoadingActive(true);
    } else {
      setIsCampaignLoadingActive(false);
    }
  }, [currentScreen, activeCampaignIndex]);

  // Per-Campaign Progress Storage (Guardado independiente por campaña):
  // Permite guardar y continuar el avance de cada una de las 4 campañas de forma individual,
  // registrar logros de victoria (condecoraciones/medallas), reclamar recompensas épicas
  // y repetir cualquier campaña completada cuantas veces se desee.
  type CampaignExecutionStatus = 'INACTIVA' | 'EN_PROGRESO' | 'PAUSADA' | 'FINALIZADA';

  // Estructura de Estado de RNG y Azar por Campaña Aislada
  interface CampaignRngState {
    seed: number; // [Seed_Aleatoria]: Semilla numérica única para esa partida
    rollCount: number; // [Contador_Tiradas]: Registro estricto de eventos de azar simulados en esta campaña
    luckModifier: number; // [Modificador_Suerte]: Parámetro dinámico según elecciones/bonos de la campaña
  }

  const [campaignsProgress, setCampaignsProgress] = useState<Record<number, CampaignProgressData>>({
    0: {
      status: 'EN_PROGRESO',
      phase: 'ALLEY',
      fight: 1,
      defeated: [],
      round: 1,
      completed: false,
      completionsCount: 0,
      claimedReward: false,
      campaignLosses: 0,
      rngState: { seed: 849201, rollCount: 0, luckModifier: 1.0 },
    },
    1: {
      status: 'INACTIVA',
      phase: 'ALLEY',
      fight: 1,
      defeated: [],
      round: 1,
      completed: false,
      completionsCount: 0,
      claimedReward: false,
      campaignLosses: 0,
      rngState: { seed: 624103, rollCount: 0, luckModifier: 1.0 },
    },
    2: {
      status: 'INACTIVA',
      phase: 'ALLEY',
      fight: 1,
      defeated: [],
      round: 1,
      completed: false,
      completionsCount: 0,
      claimedReward: false,
      campaignLosses: 0,
      rngState: { seed: 395817, rollCount: 0, luckModifier: 1.0 },
    },
    3: {
      status: 'INACTIVA',
      phase: 'ALLEY',
      fight: 1,
      defeated: [],
      round: 1,
      completed: false,
      completionsCount: 0,
      claimedReward: false,
      campaignLosses: 0,
      rngState: { seed: 918274, rollCount: 0, luckModifier: 1.0 },
    },
  });

  // Referencia síncrona en memoria para el estado de RNG de cada campaña.
  // CRÍTICO: Los estados de React son asíncronos. Si se llama a nextCampaignRandom 3 veces seguidas
  // en el mismo turno para los 3 dados y se lee del state `campaignsProgress`, lee exactamente
  // la misma semilla las 3 veces, provocando que los 3 dados obtengan SIEMPRE el mismo número (triples garantizados).
  // Con esta ref síncrona, cada dado avanza la semilla de forma inmediata y consecutiva.
  const campaignRngRef = useRef<Record<number, CampaignRngState>>({
    0: { seed: 849201, rollCount: 0, luckModifier: 1.0 },
    1: { seed: 624103, rollCount: 0, luckModifier: 1.0 },
    2: { seed: 395817, rollCount: 0, luckModifier: 1.0 },
    3: { seed: 918274, rollCount: 0, luckModifier: 1.0 },
  });

  // Generador pseudo-aleatorio lineal trazable y aislado por campaña
  const nextCampaignRandom = (campIdx = activeCampaignIndex): number => {
    const current = campaignRngRef.current[campIdx] || { seed: 849201 + campIdx * 1000, rollCount: 0, luckModifier: 1.0 };
    let s = current.seed;

    // Fórmula congruencial con mezcla de bits XOR-shift para dispersión perfecta e independencia estadística
    s = (s ^ (s >>> 13)) >>> 0;
    s = (Math.imul(s, 1597334677) + 1013904223) >>> 0;
    s = (s ^ (s >>> 16)) >>> 0;
    if (s === 0) s = 849201 + campIdx * 1000;

    const nextCount = current.rollCount + 1;
    const luck = current.luckModifier || 1.0;

    // Actualizar solo la referencia síncrona durante la batalla para evitar re-renders de React en cada tirada;
    // el volcado hacia campaignsProgress se realiza al finalizar el combate o al guardar partida.
    campaignRngRef.current[campIdx] = {
      seed: s,
      rollCount: nextCount,
      luckModifier: luck,
    };

    const rawNormalized = (s >>> 0) / 4294967296;
    return rawNormalized;
  };

  // Helper para generar una tirada de dado (1 a 6) usando el estado de azar de la campaña activa
  const rollDieWithCampaignRng = (campIdx = activeCampaignIndex): number => {
    const r = nextCampaignRandom(campIdx);
    return Math.floor(r * 6) + 1;
  };

  // Vuelca el estado de RNG en memoria (campaignRngRef) hacia campaignsProgress fuera del ciclo de tiradas
  const syncCampaignRngToProgress = (campIdx = activeCampaignIndex) => {
    const liveRng = campaignRngRef.current[campIdx];
    if (!liveRng) return;
    setCampaignsProgress((prev) => {
      const current = prev[campIdx];
      if (!current) return prev;
      if (
        current.rngState &&
        current.rngState.seed === liveRng.seed &&
        current.rngState.rollCount === liveRng.rollCount &&
        current.rngState.luckModifier === liveRng.luckModifier
      ) {
        return prev;
      }
      return {
        ...prev,
        [campIdx]: {
          ...current,
          rngState: { ...liveRng },
        },
      };
    });
  };

  // Modal especial de logro y recompensa de campaña completada
  const [victoryAchievementModal, setVictoryAchievementModal] = useState<{
    campaignIndex: number;
    title: string;
    badge: string;
    goldReward: number;
    specialBonus: string;
  } | null>(null);

  // Estados de Campaña Activa:
  // Fase 1: Callejuela / Clasificatorios (12 Combates)
  // Fase 2: Gran Torneo del Legado / Torneo Élite de los 8 Grandes (Cuartos, Semis, Final)
  const [campaignPhase, setCampaignPhase] = useState<'ALLEY' | 'TOURNAMENT'>('ALLEY');
  const [alleyCurrentFight, setAlleyCurrentFight] = useState<number>(1); // 1 a 12
  const [playerExp, setPlayerExp] = useState<number>(0);
  const [playerLevel, setPlayerLevel] = useState<number>(1);
  const [maxPlayerHp, setMaxPlayerHp] = useState<number>(() => getConfig('masterMaxHp'));
  const [tournamentRound, setTournamentRound] = useState<1 | 2 | 3>(1); // 1: Cuartos, 2: Semis, 3: Final
  const [defeatedAlleyOpponents, setDefeatedAlleyOpponents] = useState<string[]>([]);
  const [campaign1LossCount, setCampaign1LossCount] = useState<number>(0);
  const [tournamentSavedSnapshot, setTournamentSavedSnapshot] = useState<{
    gold: number;
    deck: DieData[];
    orbs: Orb[];
    maxHp: number;
    level: number;
    exp: number;
    forgeInventory: Record<string, number>;
    achievements: Achievement[];
    tieredAchievements: AchievementProgression[];
  } | null>(null);
  const [pendingRewardModal, setPendingRewardModal] = useState<BattleRewardModalData | null>(null);
  const [lastVictoryGoldReward, setLastVictoryGoldReward] = useState<number | null>(null);

  const [activeTournamentContender, setActiveTournamentContender] = useState<TournamentContender | null>(null);

  const [playerGold, setPlayerGold] = useState<number>(() => getConfig('startingGold'));
  const [statsWon, setStatsWon] = useState<number>(0);
  const [statsCampaignLosses, setStatsCampaignLosses] = useState<number>(0);
  const [statsColiseumLosses, setStatsColiseumLosses] = useState<number>(0);
  const [statsMinionsSummoned, setStatsMinionsSummoned] = useState<number>(0);
  const [statsTitansAwakened, setStatsTitansAwakened] = useState<number>(0);
  const [playerDeck, setPlayerDeck] = useState<DieData[]>(() => generateNewCampaignDeck().deck);
  playerDeckRef.current = playerDeck;
  const [orbBank, setOrbBank] = useState<Orb[]>([]); // Empieza sin orbes según el mandato

  // Sincronización automática de activeDeckPresetIndex cuando cambia el mazo activo o los preajustes
  useEffect(() => {
    if (activeDeckPresetIndex === null) return;
    const activePreset = deckPresets[activeDeckPresetIndex];
    if (!activePreset || !activePreset.dieIds || activePreset.dieIds.length === 0) {
      setActiveDeckPresetIndex(null);
      return;
    }
    const currentActiveIds = playerDeck.filter((d) => d.enMazo).map((d) => d.id);
    const presetSet = new Set(activePreset.dieIds);
    const stillMatches =
      currentActiveIds.length === presetSet.size &&
      currentActiveIds.every((id) => presetSet.has(id));
    if (!stillMatches) {
      setActiveDeckPresetIndex(null);
    }
  }, [playerDeck, deckPresets, activeDeckPresetIndex]);

  // Sistema de Logros y Recompensas (Salón de Trofeos de 4 Niveles)
  const [isTrophyModalOpen, setIsTrophyModalOpen] = useState(false);
  const [trophyCategory, setTrophyCategory] = useState<'ALL' | 'CONTRACTS' | 'COMBAT' | 'CAMPAIGN' | 'FORGE' | 'SPELLS' | 'COLISEUM'>('ALL');
  const [isTieredModalOpen, setIsTieredModalOpen] = useState(false);

  const [tieredAchievements, setTieredAchievements] = useState<AchievementProgression[]>(INITIAL_TIERED_ACHIEVEMENTS);
  const tieredAchievementsRef = useRef<AchievementProgression[]>(tieredAchievements);
  tieredAchievementsRef.current = tieredAchievements;
  const claimingTierKeysRef = useRef<Set<string>>(new Set());
  const claimingTrophyIdsRef = useRef<Set<string>>(new Set());

  // Modo Supervivencia / Coliseo Infinito con Niveles de Dificultad y Modificadores
  const [isSurvivalMode, setIsSurvivalMode] = useState<boolean>(false);
  const [survivalOriginScreen, setSurvivalOriginScreen] = useState<'CAMPAIGN_HUB' | 'COLISEUM_INTERIOR'>('COLISEUM_INTERIOR');
  const [survivalDifficulty, setSurvivalDifficulty] = useState<ColiseumDifficulty>('NORMAL');
  const [isColiseumDifficultyModalOpen, setIsColiseumDifficultyModalOpen] = useState<boolean>(false);
  const [isMasterPieceModalOpen, setIsMasterPieceModalOpen] = useState<boolean>(false);
  const [isAssetDownloaderOpen, setIsAssetDownloaderOpen] = useState<boolean>(false);
  const [masterCustomization, setMasterCustomization] = useState<MasterCustomizationData>(() => ({
    title: 'Rey Soberano Celeste',
    avatarColor: '#38bdf8',
    attachedOrbs: [],
  }));
  const [isGladiatorDuelModalOpen, setIsGladiatorDuelModalOpen] = useState<boolean>(false);
  const [isGladiatorDuelMode, setIsGladiatorDuelMode] = useState<boolean>(false);
  const [gladiatorDuelRival, setGladiatorDuelRival] = useState<TournamentContender | null>(null);
  const [gladiatorDuelHandicap, setGladiatorDuelHandicap] = useState<GladiatorDuelHandicap>('NORMAL');
  const [survivalWave, setSurvivalWave] = useState<number>(1);
  const [survivalHighScore, setSurvivalHighScore] = useState<number>(0);
  const [lastPlayerMoveAction, setLastPlayerMoveAction] = useState<{
    unitId: string;
    fromHex: number;
    toHex: number;
  } | null>(null);

  // Bandera de sesión exclusiva que se enciende ÚNICAMENTE cuando se gana la Ronda 3 (Gran Final) en este combate
  const [justCrownedChampion, setJustCrownedChampion] = useState(false);

  // Lista persistente de IDs de contrincantes de torneo derrotados (unificada al guardado manual)
  const [defeatedTournamentContenders, setDefeatedTournamentContenders] = useState<string[]>([]);

  // Units on the 3D board - initialized with default masters
  const [units, setUnits] = useState<UnitData[]>(() => createInitialMasters());
  const unitsRef = useRef<UnitData[]>(createInitialMasters());
  unitsRef.current = units;

  // Actualiza el estado de React y unitsRef.current de forma síncrona e inmediata
  // para evitar lecturas obsoletas dentro de timeouts encadenados o callbacks secuenciales.
  const updateUnitsSync = useCallback(
    (updater: UnitData[] | ((prev: UnitData[]) => UnitData[])): UnitData[] => {
      const nextUnits = typeof updater === 'function' ? updater(unitsRef.current) : updater;
      unitsRef.current = nextUnits;
      setUnits(nextUnits);
      return nextUnits;
    },
    []
  );

  const [fichas, setFichas] = useState<{ J1: Record<number, number>; J2: Record<number, number> }>({
    J1: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    J2: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  });
  const fichasRef = useRef(fichas);
  fichasRef.current = fichas;
  const [mana, setMana] = useState({ J1: 0, J2: 0 });
  const manaRef = useRef(mana);
  manaRef.current = mana;

  // Actualiza el estado de React y manaRef.current de forma síncrona e inmediata
  // para evitar lecturas obsoletas ante acciones consecutivas antes del re-render.
  const updateManaSync = useCallback(
    (
      updater:
        | { J1: number; J2: number }
        | ((prev: { J1: number; J2: number }) => { J1: number; J2: number })
    ): { J1: number; J2: number } => {
      const nextMana = typeof updater === 'function' ? updater(manaRef.current) : updater;
      manaRef.current = nextMana;
      setMana(nextMana);
      return nextMana;
    },
    []
  );
  const aiTimeoutsRef = useRef<number[]>([]);

  const clearAiTimeouts = () => {
    aiTimeoutsRef.current.forEach((t) => clearTimeout(t));
    aiTimeoutsRef.current = [];
    isAiRunningRef.current = false;
  };

  const rollDiceTimeoutRef = useRef<number | null>(null);
  const rollAudioTimeoutsRef = useRef<number[]>([]);
  const combatFxTimeoutsRef = useRef<number[]>([]);
  const isAppMountedRef = useRef(true);

  const clearCombatFxTimeouts = useCallback(() => {
    combatFxTimeoutsRef.current.forEach((t) => clearTimeout(t));
    combatFxTimeoutsRef.current = [];
  }, []);

  const scheduleCombatFxTimeout = useCallback((fn: () => void, delayMs: number) => {
    const id = window.setTimeout(() => {
      combatFxTimeoutsRef.current = combatFxTimeoutsRef.current.filter((t) => t !== id);
      if (!isAppMountedRef.current) return;
      fn();
    }, delayMs);
    combatFxTimeoutsRef.current.push(id);
  }, []);

  const clearRollDiceTimeout = useCallback(() => {
    if (rollDiceTimeoutRef.current !== null) {
      clearTimeout(rollDiceTimeoutRef.current);
      rollDiceTimeoutRef.current = null;
      setRollingDiceAnimation(false);
      setCombatLock(false);
    }
    rollAudioTimeoutsRef.current.forEach((t) => clearTimeout(t));
    rollAudioTimeoutsRef.current = [];
  }, []);

  useEffect(() => {
    isAppMountedRef.current = true;
    return () => {
      isAppMountedRef.current = false;
      clearAiTimeouts();
      clearRollDiceTimeout();
      clearCombatFxTimeouts();
    };
  }, [clearRollDiceTimeout, clearCombatFxTimeouts]);

  useEffect(() => {
    if (currentScreen !== 'COMBAT') {
      clearAiTimeouts();
      clearRollDiceTimeout();
      clearCombatFxTimeouts();
      setIsSurvivalMode(false);
      setIsGladiatorDuelMode(false);
      setGladiatorDuelRival(null);
    }
  }, [currentScreen, clearRollDiceTimeout, clearCombatFxTimeouts]);

  // Wrapper seguro para setAchievements:
  // Si hay una batalla de tutorial en curso, las batallas NO cuentan para logros de combate
  // (daño, triples, victorias de callejuela, etc.), PERO el logro de tutoriales (ach_all_tutorials)
  // SÍ debe actualizarse siempre.
  const setAchievements = (action: React.SetStateAction<Achievement[]>) => {
    if (isTutorialBattleActiveRef.current) {
      setAchievementsInternal((prev) => {
        const nextList = typeof action === 'function' ? action(prev) : action;
        return nextList.map((a) => {
          if (a.id === 'ach_all_tutorials') {
            return a;
          }
          // Mantener el estado previo para los logros de combate durante la batalla de tutorial
          const prevAch = prev.find((p) => p.id === a.id);
          return prevAch || a;
        });
      });
      return;
    }
    setAchievementsInternal(action);
  };

  useEffect(() => {
    if (currentScreen !== 'COMBAT') {
      isTutorialBattleActiveRef.current = false;
      setActiveHouseTutorial(null);
      restoreTutorialEquippedSpells();
    }
  }, [currentScreen, restoreTutorialEquippedSpells]);



  const [achievements, setAchievementsInternal] = useState<Achievement[]>([
    {
      id: 'ach_all_tutorials',
      category: 'CAMPAIGN',
      name: 'Gran Erudito de los Dados',
      desc: 'Lleva a la práctica y supera las 12 lecciones tutoriales en las casas de la Ciudad.',
      icon: '🎓',
      rewardType: 'HP',
      rewardAmount: 6,
      rewardGold: 1000,
      rewardLabel: '+6 HP Máx Permanente y +1000 Oro',
      isUnlocked: completedHouseTutorials.length >= 12,
      isClaimed: false,
      progress: Math.min(12, completedHouseTutorials.length),
      maxProgress: 12,
    },
    {
      id: 'ach_triple',



      category: 'COMBAT',
      name: 'Poder de los Titanes',
      desc: 'Obtén una tirada triple idéntica (1-1-1 a 6-6-6) y despierta a un Titán Ascendido.',
      icon: '⚡',
      rewardType: 'GOLD',
      rewardAmount: 300,
      rewardLabel: '+300 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 1,
    },
    {
      id: 'ach_damage_10',
      category: 'COMBAT',
      name: 'Impacto Demoledor',
      desc: 'Inflige 10 o más puntos de daño en un solo asalto cuerpo a cuerpo.',
      icon: '💥',
      rewardType: 'GOLD',
      rewardAmount: 200,
      rewardLabel: '+200 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 10,
    },
    {
      id: 'ach_minions_4',
      category: 'COMBAT',
      name: 'Falange Inquebrantable',
      desc: 'Mantén a 4 o más criaturas aliadas simultáneamente en el campo de batalla.',
      icon: '🛡️',
      rewardType: 'GOLD',
      rewardAmount: 250,
      rewardLabel: '+250 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 4,
    },
    {
      id: 'ach_untouchable_king',
      category: 'COMBAT',
      name: 'Soberano Intacto',
      desc: 'Gana un combate manteniendo a tu Rey Celeste al 100% de sus puntos de salud.',
      icon: '👑',
      rewardType: 'GOLD',
      rewardAmount: 350,
      rewardLabel: '+350 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 1,
    },
    {
      id: 'ach_full_minion_limit',
      category: 'COMBAT',
      name: 'Legión Legendaria',
      desc: 'Alcanza el límite máximo absoluto de 6 criaturas combatiendo en el tablero hexagonal.',
      icon: '⚔️',
      rewardType: 'GOLD',
      rewardAmount: 400,
      rewardLabel: '+400 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 6,
    },
    {
      id: 'ach_bank_master',
      category: 'COMBAT',
      name: 'Estratega de Reserva',
      desc: 'Acumula 5 o más fichas de criaturas guardadas en tu reserva táctica durante la partida.',
      icon: '📥',
      rewardType: 'GOLD',
      rewardAmount: 200,
      rewardLabel: '+200 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 5,
    },
    {
      id: 'ach_alley_first',
      category: 'CAMPAIGN',
      name: 'Primer Duelo Callejero',
      desc: 'Vence a tu primer contrincante en las callejuelas de la Ciudad.',
      icon: '⚔️',
      rewardType: 'GOLD',
      rewardAmount: 150,
      rewardLabel: '+150 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 1,
    },
    {
      id: 'ach_alley_12',
      category: 'CAMPAIGN',
      name: 'Rey de las Callejuelas',
      desc: 'Derrota a los 12 rivales de la fase clasificatoria para abrir la Gran Arena.',
      icon: '👑',
      rewardType: 'HP',
      rewardAmount: 4,
      rewardGold: 500,
      rewardLabel: '+4 HP Máx y +500 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 12,
    },
    {
      id: 'ach_tourney_champ',
      category: 'CAMPAIGN',
      name: 'Campeón Supremo del Legado',
      desc: 'Conquista la Campaña 1 (El Camino al Torneo de Campeones).',
      icon: '🏆',
      rewardType: 'GOLD',
      rewardAmount: 600,
      rewardLabel: '+600 Oro y Corona',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 1,
    },
    {
      id: 'ach_camp_2',
      category: 'CAMPAIGN',
      name: 'Señor del Calabozo',
      desc: 'Conquista la Campaña 2 (El Desafío de los Señores del Calabozo).',
      icon: '⚔️',
      rewardType: 'GOLD',
      rewardAmount: 800,
      rewardLabel: '+800 Oro y Ranura',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 1,
    },
    {
      id: 'ach_camp_3',
      category: 'CAMPAIGN',
      name: 'Graduado Ilustre',
      desc: 'Conquista la Campaña 3 (El Torneíllo del Recluta).',
      icon: '🛡️',
      rewardType: 'GOLD',
      rewardAmount: 500,
      rewardLabel: '+500 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 1,
    },
    {
      id: 'ach_camp_4',
      category: 'CAMPAIGN',
      name: 'Emperador del Abismo',
      desc: 'Conquista la Campaña 4 (El Trono de las Sombras - Modo Maestro).',
      icon: '🌑',
      rewardType: 'GOLD',
      rewardAmount: 1500,
      rewardLabel: '+1500 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 1,
    },
    {
      id: 'ach_all_campaigns',
      category: 'CAMPAIGN',
      name: 'Leyenda Viva del Cosmos',
      desc: 'Completa con éxito las 4 campañas del juego y corónate Señor de los Dados.',
      icon: '👑',
      rewardType: 'HP',
      rewardAmount: 10,
      rewardGold: 2000,
      rewardLabel: '+10 HP Permanente y +2000 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 4,
    },
    {
      id: 'ach_coliseum_first_win',
      category: 'COLISEUM',
      name: 'Bautismo de Arena',
      desc: 'Gana tu primer combate en el Coliseo Infinito (Oleada 1 superada).',
      icon: '⚔️',
      rewardType: 'GOLD',
      rewardAmount: 200,
      rewardLabel: '+200 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 1,
    },
    {
      id: 'ach_coliseum_wave_3',
      category: 'COLISEUM',
      name: 'Gladiador del Coliseo',
      desc: 'Supera con éxito la Oleada 3 en el Coliseo Infinito.',
      icon: '🛡️',
      rewardType: 'GOLD',
      rewardAmount: 350,
      rewardLabel: '+350 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 3,
    },
    {
      id: 'ach_coliseum_wave_5',
      category: 'COLISEUM',
      name: 'Veterano de la Arena',
      desc: 'Alcanza y supera la Oleada 5 en el Coliseo Infinito.',
      icon: '🔥',
      rewardType: 'HP',
      rewardAmount: 3,
      rewardGold: 500,
      rewardLabel: '+3 HP Máx y +500 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 5,
    },
    {
      id: 'ach_coliseum_wave_10',
      category: 'COLISEUM',
      name: 'Leyenda Inmortal del Coliseo',
      desc: 'Conquista la legendaria Oleada 10 en el Coliseo Infinito.',
      icon: '👑',
      rewardType: 'HP',
      rewardAmount: 6,
      rewardGold: 1000,
      rewardLabel: '+6 HP Permanente y +1000 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 10,
    },
    {
      id: 'ach_orb_equip',
      category: 'FORGE',
      name: 'Maestro de la Forja',
      desc: 'Engarza con éxito tu primer orbe elemental en un dado raro, épico o legendario.',
      icon: '🔮',
      rewardType: 'GOLD',
      rewardAmount: 150,
      rewardLabel: '+150 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 1,
    },
    {
      id: 'ach_orb_collector',
      category: 'FORGE',
      name: 'Coleccionista Elemental',
      desc: 'Acumula al menos 4 orbes elementales de tipos diferentes entre tu banco y tus dados equipados.',
      icon: '💎',
      rewardType: 'GOLD',
      rewardAmount: 300,
      rewardLabel: '+300 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 4,
    },
    {
      id: 'ach_legendary_gemmed',
      category: 'FORGE',
      name: 'Artefacto Divino Engarzado',
      desc: 'Forja un Dado Legendario completando sus 3 ranuras con 3 orbes elementales diferentes.',
      icon: '🌟',
      rewardType: 'HP',
      rewardAmount: 3,
      rewardGold: 400,
      rewardLabel: '+3 HP Máximo y +400 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 3,
    },
    {
      id: 'ach_deck_24',
      category: 'FORGE',
      name: 'Arsenal Completo',
      desc: 'Ten tu mazo activo completo con los 24 dados listos para el combate.',
      icon: '🎲',
      rewardType: 'GOLD',
      rewardAmount: 150,
      rewardLabel: '+150 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 24,
    },
    {
      id: 'ach_forge_first_die',
      category: 'FORGE',
      name: 'Herrero de las Sombras',
      desc: 'Forja tu primer dado en la Gran Fragua de la Campaña 4 usando minerales y esencias.',
      icon: '⚒️',
      rewardType: 'GOLD',
      rewardAmount: 400,
      rewardLabel: '+400 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 1,
      requiresCampaign4: true,
    },
    {
      id: 'ach_forge_orb_crystal',
      category: 'FORGE',
      name: 'Alquimista del Vacío',
      desc: 'Cristaliza un Orbe Arcano de poder oscuro en la Gran Fragua usando Chispas del Vacío.',
      icon: '🔮',
      rewardType: 'GOLD',
      rewardAmount: 500,
      rewardLabel: '+500 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 1,
      requiresCampaign4: true,
    },
    {
      id: 'ach_forge_legendary_throne',
      category: 'FORGE',
      name: 'Artífice del Trono Supremo',
      desc: 'Crea el legendario \"Dado Legendario del Trono Sombrío\" con 4 ranuras completas.',
      icon: '👑',
      rewardType: 'HP',
      rewardAmount: 5,
      rewardGold: 800,
      rewardLabel: '+5 HP Máx y +800 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 1,
      requiresCampaign4: true,
    },
    {
      id: 'ach_forge_materials_hoarder',
      category: 'FORGE',
      name: 'Magnate de Minerales',
      desc: 'Acumula un total de 15 o más materiales de forja entre minerales y esencias.',
      icon: '🖤',
      rewardType: 'GOLD',
      rewardAmount: 600,
      rewardLabel: '+600 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 15,
      requiresCampaign4: true,
    },
    {
      id: 'ach_spell_slot',
      category: 'SPELLS',
      name: 'Mente Expandida',
      desc: 'Desbloquea una ranura extra de hechizos para ampliar tu Grimorio en batalla.',
      icon: '📜',
      rewardType: 'GOLD',
      rewardAmount: 150,
      rewardLabel: '+150 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 2,
    },
    {
      id: 'ach_max_slots',
      category: 'SPELLS',
      name: 'Grimorio Supremo',
      desc: 'Desbloquea las 4 ranuras completas de hechizos de tu libro arcano.',
      icon: '📖',
      rewardType: 'HP',
      rewardAmount: 3,
      rewardGold: 500,
      rewardLabel: '+3 HP Máx y +500 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 4,
    },
    {
      id: 'ach_all_basic_spells',
      category: 'SPELLS',
      name: 'Erudito de los Fundamentos',
      desc: 'Desbloquea todos los hechizos de la categoría Básica en la Tienda (Relámpago, Escudo, Transposición y Juicio).',
      icon: '✨',
      rewardType: 'GOLD',
      rewardAmount: 300,
      rewardLabel: '+300 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 4,
    },
    {
      id: 'ach_all_advanced_spells',
      category: 'SPELLS',
      name: 'Maestro de la Alta Magia',
      desc: 'Aprende todos los hechizos Avanzados en la Tienda (Tormenta, Vínculo, Prisión, Ira de Ra, Gravedad y Sentencia Sagrada).',
      icon: '🔮',
      rewardType: 'HP',
      rewardAmount: 4,
      rewardGold: 500,
      rewardLabel: '+4 HP Máx y +500 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 6,
    },
    {
      id: 'ach_all_grimoire_spells',
      category: 'SPELLS',
      name: 'Archimago del Cosmos',
      desc: 'Domina el catálogo arcano al completo aprendiendo los 10 hechizos básicos y avanzados del juego.',
      icon: '🌌',
      rewardType: 'HP',
      rewardAmount: 6,
      rewardGold: 1000,
      rewardLabel: '+6 HP Permanente y +1000 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 10,
    },
    {
      id: 'ach_mana_surge',
      category: 'SPELLS',
      name: 'Sobrecarga de Maná',
      desc: 'Acumula el tope máximo de 10 puntos de Maná Cósmico durante una batalla.',
      icon: '⚡',
      rewardType: 'GOLD',
      rewardAmount: 200,
      rewardLabel: '+200 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 10,
    },
    // NUEVOS LOGROS DERIVADOS DE TODAS LAS MISIONES DEL TABLÓN DE CONTRATOS
    {
      id: 'ach_contract_first_claim',
      category: 'CONTRACTS',
      name: 'Primer Sello de Cazador',
      desc: 'Completa y cobra con éxito tu primer contrato diario en la Taberna.',
      icon: '📜',
      rewardType: 'GOLD',
      rewardAmount: 150,
      rewardLabel: '+150 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 1,
    },
    {
      id: 'ach_contract_five_claims',
      category: 'CONTRACTS',
      name: 'Cazador de Élite de la Taberna',
      desc: 'Cumple y cobra un total de 5 misiones del Tablón de Contratos.',
      icon: '🎖️',
      rewardType: 'GOLD',
      rewardAmount: 300,
      rewardLabel: '+300 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 5,
    },
    {
      id: 'ach_contract_master_slayer',
      category: 'CONTRACTS',
      name: 'Exterminador de Vanguardias',
      desc: 'Elimina esbirros enemigos cumpliendo la misión de Caza de Vanguardias.',
      icon: '🗡️',
      rewardType: 'GOLD',
      rewardAmount: 200,
      rewardLabel: '+200 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 4,
    },
    {
      id: 'ach_contract_coliseum_glory',
      category: 'CONTRACTS',
      name: 'Aclamación de la Arena',
      desc: 'Supera el contrato de Gloria del Coliseo resistiendo oleadas de gladiadores.',
      icon: '🏟️',
      rewardType: 'GOLD',
      rewardAmount: 250,
      rewardLabel: '+250 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 2,
    },
    {
      id: 'ach_contract_abyss_clear',
      category: 'CONTRACTS',
      name: 'Conquistador de la Fosa',
      desc: 'Completa la misión exclusiva de Campaña 2 venciendo guardianes en el Calabozo.',
      icon: '👁️',
      rewardType: 'HP',
      rewardAmount: 3,
      rewardGold: 300,
      rewardLabel: '+3 HP Máx y +300 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 3,
    },
    {
      id: 'ach_contract_recruit_clear',
      category: 'CONTRACTS',
      name: 'Honor del Recluta Legendario',
      desc: 'Cumple la misión de invocaciones tácticas en el Torneíllo del Recluta (Campaña 3).',
      icon: '🦁',
      rewardType: 'GOLD',
      rewardAmount: 250,
      rewardLabel: '+250 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 4,
    },
    {
      id: 'ach_contract_shadow_clear',
      category: 'CONTRACTS',
      name: 'Purga de los Emperadores Oscuros',
      desc: 'Supera el contrato supremo derrotando estrategas abisales en la Campaña 4.',
      icon: '👑',
      rewardType: 'HP',
      rewardAmount: 5,
      rewardGold: 500,
      rewardLabel: '+5 HP Máx y +500 Oro',
      isUnlocked: false,
      isClaimed: false,
      progress: 0,
      maxProgress: 2,
      requiresCampaign4: true,
    },
  ]);

  // Evaluación pura de logros bajo demanda (eventos clave, apertura de modales y guardado)
  const syncAchievementsNow = useCallback(
    (
      classicOverrides?: Partial<ClassicAchievementSnapshot>,
      tieredOverrides?: Partial<TieredAchievementSnapshot>
    ) => {
      const liveUnits = unitsRef.current.length > 0 ? unitsRef.current : units;
      const liveMinionsCount = liveUnits.filter((u) => u.dueño === 1 && !u.esMaestra).length;
      const liveBankedCount = Object.values(fichas.J1).reduce((acc, c) => acc + c, 0);

      const classicSnapshot: ClassicAchievementSnapshot = {
        completedHouseTutorialsCount: completedHouseTutorials.length,
        defeatedAlleyOpponentsCount: defeatedAlleyOpponents.length,
        campaignsProgress,
        playerDeck,
        maxSpellSlots,
        unlockedSpells,
        survivalHighScore,
        survivalWave,
        isSurvivalMode,
        orbBank,
        forgeInventory,
        manaJ1: manaRef.current.J1,
        myMinionsCount: liveMinionsCount,
        totalBankedCount: liveBankedCount,
        isTutorialBattleActive: isTutorialBattleActiveRef.current,
        ...classicOverrides,
      };

      const tieredSnapshot: TieredAchievementSnapshot = {
        statsWon,
        survivalHighScore,
        survivalWave,
        isSurvivalMode,
        survivalDifficulty,
        campaignsProgress,
        unlockedSpells,
        maxSpellSlots,
        playerDeck,
        forgeMasteryLevel,
        ...tieredOverrides,
      };

      setAchievements((prev) => evaluateClassicAchievements(prev, classicSnapshot));
      setTieredAchievements((prev) => evaluateTieredAchievements(prev, tieredSnapshot));
    },
    [
      units,
      fichas.J1,
      completedHouseTutorials.length,
      defeatedAlleyOpponents.length,
      campaignsProgress,
      playerDeck,
      maxSpellSlots,
      unlockedSpells,
      survivalHighScore,
      survivalWave,
      isSurvivalMode,
      survivalDifficulty,
      orbBank,
      forgeInventory,
      statsWon,
      forgeMasteryLevel,
    ]
  );

  const handleClaimTieredReward = (achId: string, levelNumber: number) => {
    const claimKey = `${achId}:${levelNumber}`;
    if (claimingTierKeysRef.current.has(claimKey)) return;

    const currentAch = tieredAchievementsRef.current.find((a) => a.id === achId);
    const targetTier = currentAch?.tiers.find((t) => t.levelNumber === levelNumber);
    if (
      !currentAch ||
      !targetTier ||
      currentAch.unlockedLevel < levelNumber ||
      currentAch.claimedLevels.includes(levelNumber)
    ) {
      return;
    }

    // Bloqueo síncrono inmediato contra reentradas y doble tap antes del re-render
    claimingTierKeysRef.current.add(claimKey);
    tieredAchievementsRef.current = tieredAchievementsRef.current.map((ach) =>
      ach.id === achId && !ach.claimedLevels.includes(levelNumber)
        ? { ...ach, claimedLevels: [...ach.claimedLevels, levelNumber] }
        : ach
    );

    // Asignación estructurada y directa de materiales desde targetTier.materialAwards
    const materialAwards = targetTier.materialAwards || {};

    // Inyectar materiales directamente al inventario de forja
    if (Object.keys(materialAwards).length > 0) {
      setForgeInventory((prev) => {
        const next = { ...prev };
        Object.entries(materialAwards).forEach(([matId, qty]) => {
          next[matId] = (next[matId] || 0) + qty;
        });
        return next;
      });
    }

    // Entregar oro dinámico
    setPlayerGold((g) => g + targetTier.rewardGold);

    setTieredAchievements((prev) =>
      prev.map((ach) => {
        if (ach.id !== achId) return ach;
        if (ach.claimedLevels.includes(levelNumber)) return ach;

        return {
          ...ach,
          claimedLevels: [...ach.claimedLevels, levelNumber],
        };
      })
    );

    // Sincronizar cobro mutuo con logros clásicos equivalentes
    const linkedClassicIds = Object.entries(MUTUAL_ACHIEVEMENT_LINKS)
      .filter(([, link]) => link.tieredId === achId && link.levelNumber === levelNumber)
      .map(([classicId]) => classicId);
    if (linkedClassicIds.length > 0) {
      linkedClassicIds.forEach((cid) => claimingTrophyIdsRef.current.add(cid));
      setAchievements((prev) =>
        prev.map((a) => (linkedClassicIds.includes(a.id) ? { ...a, isClaimed: true } : a))
      );
    }

    gameAudio.playVictoryFanfare();
    triggerBattleMessage(
      `🏆 ¡NIVEL ${targetTier.tierName.toUpperCase()} RECLAMADO! +${targetTier.rewardGold} ORO Y ${targetTier.rewardMaterials.toUpperCase()} AÑADIDOS A LA FORJA`,
      targetTier.badgeColor
    );
  };

  const handleClaimTrophyReward = (achId: string) => {
    if (claimingTrophyIdsRef.current.has(achId)) return;
    const target = achievements.find((a) => a.id === achId);
    if (!target || !target.isUnlocked || target.isClaimed) return;

    // REGLA ESTRICTA DE NO DUPLICACIÓN:
    // Si este logro equivalente ya fue cobrado en la Sala de Logros Avanzados, se bloquea el cobro duplicado
    const linkedTier = MUTUAL_ACHIEVEMENT_LINKS[achId];
    if (linkedTier) {
      const claimKey = `${linkedTier.tieredId}:${linkedTier.levelNumber}`;
      const advancedAch = tieredAchievementsRef.current.find((ta) => ta.id === linkedTier.tieredId);
      if (
        claimingTierKeysRef.current.has(claimKey) ||
        (advancedAch && advancedAch.claimedLevels.includes(linkedTier.levelNumber))
      ) {
        gameAudio.playErrorBuzz();
        triggerBattleMessage(`⚠️ Este logro ya fue cobrado en la Sala de Logros Avanzados (Nivel ${linkedTier.levelNumber}). No se puede duplicar.`, '#ef4444');
        return;
      }
      claimingTierKeysRef.current.add(claimKey);
      tieredAchievementsRef.current = tieredAchievementsRef.current.map((ta) =>
        ta.id === linkedTier.tieredId && !ta.claimedLevels.includes(linkedTier.levelNumber)
          ? { ...ta, claimedLevels: [...ta.claimedLevels, linkedTier.levelNumber] }
          : ta
      );
    }

    claimingTrophyIdsRef.current.add(achId);

    if (target.rewardType === 'GOLD') {
      setPlayerGold((g) => g + target.rewardAmount);
    } else if (target.rewardType === 'HP') {
      const goldPart = target.rewardGold ?? 0;
      if (goldPart > 0) {
        setPlayerGold((g) => g + goldPart);
      }
      setMaxPlayerHp((h) => h + target.rewardAmount);
    }

    setAchievements((prev) =>
      prev.map((a) => (a.id === achId ? { ...a, isClaimed: true } : a))
    );

    // Marcar como cobrado también en la Sala de Avanzados para que no pueda volver a reclamarse allí
    if (linkedTier) {
      setTieredAchievements((prev) =>
        prev.map((ta) => {
          if (ta.id !== linkedTier.tieredId) return ta;
          if (ta.claimedLevels.includes(linkedTier.levelNumber)) return ta;
          return {
            ...ta,
            claimedLevels: [...ta.claimedLevels, linkedTier.levelNumber],
          };
        })
      );
    }

    gameAudio.playPowerupChime();
    triggerBattleMessage(`🏆 ¡RECOMPENSA RECLAMADA: ${target.name}!`, '#fbbf24');
  };

  // Combat State
  const [gameState, setGameState] = useState<GameState>({
    status: 'START',
    score: 0,
    level: 1,
  });

  usePlaygroundGameLifecycle(gameState, sdk);

  // Deck during battle
  const [drawPile, setDrawPile] = useState<DieData[]>([]);
  const drawPileRef = useRef<DieData[]>([]);
  drawPileRef.current = drawPile;
  const [usedPile, setUsedPile] = useState<DieData[]>([]);
  const usedPileRef = useRef<DieData[]>([]);
  usedPileRef.current = usedPile;
  const [aiDrawPile, setAiDrawPile] = useState<DieData[]>([]);
  const aiDrawPileRef = useRef<DieData[]>([]);
  aiDrawPileRef.current = aiDrawPile;
  const [aiUsedPile, setAiUsedPile] = useState<DieData[]>([]);
  const aiUsedPileRef = useRef<DieData[]>([]);
  aiUsedPileRef.current = aiUsedPile;

  const [jugadorActivo, setJugadorActivo] = useState<1 | 2>(1);
  const jugadorActivoRef = useRef<1 | 2>(1);
  jugadorActivoRef.current = jugadorActivo;

  const isAiRunningRef = useRef(false);
  const [dadosLanzados, setDadosLanzados] = useState(false);
  const [rollingDiceAnimation, setRollingDiceAnimation] = useState(false);
  const [resultadoDados, setResultadoDados] = useState<RolledDieResult[]>([]);

  // Inventario detallado de fichas guardadas con sus orbes y maestría preservados
  interface BankedCrestItem {
    id: string;
    level: number;
    maestria: number;
    rangoNombre: string;
    orbs: Orb[];
    name?: string;
    catalystHp?: number;
    catalystAtk?: number;
  }
  const [bankedCrestsJ1, setBankedCrestsJ1] = useState<BankedCrestItem[]>([]);
  const bankedCrestsJ1Ref = useRef<BankedCrestItem[]>([]);
  bankedCrestsJ1Ref.current = bankedCrestsJ1;
  const [selectBankedCrestModal, setSelectBankedCrestModal] = useState<{
    level: number;
    crests: BankedCrestItem[];
  } | null>(null);

  // Estado modal de aviso cuando el mazo no tiene exactamente 24 dados
  const [deckIncompleteModal, setDeckIncompleteModal] = useState<{
    count: number;
    needed: number;
    destinationName: string;
  } | null>(null);

  // Estado modal de aviso cuando se intenta añadir un dado y ya hay 24 dados equipados (Límite Máximo)
  const [deckFullModal, setDeckFullModal] = useState<boolean>(false);

  // Helper para validar exactamente 24 dados antes de combatir o salir del taller
  const checkDeckComplete = (destinationName = 'combatir'): boolean => {
    const liveDeck = playerDeckRef.current.length > 0 ? playerDeckRef.current : playerDeck;
    const activeCount = liveDeck.filter((d) => d.enMazo).length;
    if (activeCount !== 24) {
      gameAudio.playErrorBuzz();
      setDeckIncompleteModal({
        count: activeCount,
        needed: 24 - activeCount,
        destinationName,
      });
      triggerBattleMessage(
        activeCount > 24
          ? `⚠️ ¡Exceso en el mazo! Llevas ${activeCount}/24 dados equipados.`
          : `⚠️ ¡Mazo incompleto! Llevas ${activeCount}/24 dados equipados.`,
        '#f59e0b'
      );
      return false;
    }
    return true;
  };
  // Check for saved campaign on mount (localStorage + IndexedDB fallback recovery)
  useEffect(() => {
    let isMounted = true;
    let foundLocal = false;

    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('dungeon_dice_save') : null;
      if (saved) {
        const data = JSON.parse(saved);
        if (data && typeof data === 'object' && data.playerName) {
          foundLocal = true;
          setHasSavedGame(true);
          if (data.claimedAchievements && Array.isArray(data.claimedAchievements)) {
            setAchievements((prev) =>
              prev.map((a) => (data.claimedAchievements.includes(a.id) ? { ...a, isClaimed: true } : a))
            );
          }
        }
      }
    } catch (_) {}

    if (!foundLocal) {
      setHasSavedGame(false);
      setHasStartedAnyCampaign(false);
    }

    loadPlayerProgressFromStorageAsync()
      .then((asyncData) => {
        if (!isMounted || !asyncData || !asyncData.playerName) return;
        hasIndexedDbSaveRef.current = true;
        setHasSavedGame(true);
        const asyncClaimedIds = asyncData.claimedAchievements;
        if (asyncClaimedIds && Array.isArray(asyncClaimedIds)) {
          setAchievements((prev) =>
            prev.map((a) => (asyncClaimedIds.includes(a.id) ? { ...a, isClaimed: true } : a))
          );
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const saveProgress = () => {
    // Si el jugador está dentro de la Gran Arena disputando el Torneo, NO se permite guardar hasta concluir
    if (campaignPhase === 'TOURNAMENT' && (currentScreen === 'COMBAT' || tournamentRound > 1)) {
      triggerBattleMessage('¡TORNEO EN CURSO! No puedes guardar hasta finalizar la Gran Final.', '#ef4444');
      gameAudio.playErrorBuzz();
      return;
    }
    // Abrir confirmación antes de guardar
    setShowSaveConfirmModal(true);
    gameAudio.playCrispClick();
  };

  const executeSaveGame = () => {
    loadProgressEpochRef.current += 1;
    try {
      // Volcar los estados de RNG vivos desde campaignRngRef hacia campaignsProgress antes de guardar
      const syncedProgress: Record<number, CampaignProgressData> = { ...campaignsProgress };
      [0, 1, 2, 3].forEach((idx) => {
        if (syncedProgress[idx] && campaignRngRef.current[idx]) {
          syncedProgress[idx] = {
            ...syncedProgress[idx],
            rngState: { ...campaignRngRef.current[idx] },
          };
        }
      });

      // Sincronizar el progreso de la campaña actual en el mapa de progreso
      const updatedCampaignsProgress = {
        ...syncedProgress,
        [activeCampaignIndex]: {
          status: (campaignsProgress[activeCampaignIndex]?.completed ? 'FINALIZADA' : 'PAUSADA') as CampaignExecutionStatus,
          phase: campaignPhase,
          fight: alleyCurrentFight,
          defeated: defeatedAlleyOpponents,
          round: tournamentRound,
          completed: campaignsProgress[activeCampaignIndex]?.completed || false,
          completionsCount: campaignsProgress[activeCampaignIndex]?.completionsCount || 0,
          claimedReward: campaignsProgress[activeCampaignIndex]?.claimedReward || false,
          campaignLosses: campaignsProgress[activeCampaignIndex]?.campaignLosses || 0,
          rngState: campaignRngRef.current[activeCampaignIndex]
            ? { ...campaignRngRef.current[activeCampaignIndex] }
            : campaignsProgress[activeCampaignIndex]?.rngState || { seed: 849201, rollCount: 0, luckModifier: 1.0 },
        },
      };

      const liveUnits = unitsRef.current.length > 0 ? unitsRef.current : units;
      const evaluatedClassic = evaluateClassicAchievements(achievements, {
        completedHouseTutorialsCount: completedHouseTutorials.length,
        defeatedAlleyOpponentsCount: defeatedAlleyOpponents.length,
        campaignsProgress: updatedCampaignsProgress,
        playerDeck,
        maxSpellSlots,
        unlockedSpells,
        survivalHighScore,
        survivalWave,
        isSurvivalMode,
        orbBank,
        forgeInventory,
        manaJ1: manaRef.current.J1,
        myMinionsCount: liveUnits.filter((u) => u.dueño === 1 && !u.esMaestra).length,
        totalBankedCount: Object.values(fichas.J1).reduce((acc, c) => acc + c, 0),
        isTutorialBattleActive: isTutorialBattleActiveRef.current,
      });
      const evaluatedTiered = evaluateTieredAchievements(tieredAchievements, {
        statsWon,
        survivalHighScore,
        survivalWave,
        isSurvivalMode,
        survivalDifficulty,
        campaignsProgress: updatedCampaignsProgress,
        unlockedSpells,
        maxSpellSlots,
        playerDeck,
        forgeMasteryLevel,
      });
      const { nextClassic, nextTiered } = syncMutualAchievementClaims(
        evaluatedClassic,
        evaluatedTiered
      );
      setAchievements(nextClassic);
      setTieredAchievements(nextTiered);

      const success = savePlayerProgressToStorage(
        {
          playerName,
          playerGold,
          playerDeck,
          orbBank,
          unlockedSpells,
          maxSpellSlots,
          equippedSpells: tutorialSavedEquippedSpellsRef.current !== null ? tutorialSavedEquippedSpellsRef.current : equippedSpells,
          activeCampaignIndex,
          unlockedCampaigns,
          campaignsProgress: updatedCampaignsProgress,
          campaignPhase,
          alleyCurrentFight,
          defeatedAlleyOpponents,
          campaign1LossCount,
          survivalHighScore,
          statsWon,
          statsCampaignLosses,
          statsColiseumLosses,
          statsMinionsSummoned,
          statsTitansAwakened,
          playerExp,
          playerLevel,
          maxPlayerHp,
          masterAtkBonus,
          masterStartingManaBonus,
          masterShieldChargeLevel,
          tournamentRound,
          defeatedTournamentContenders,
          forgeInventory,
          forgeMasteryLevel,
          forgeMasteryExp,
          forgeTotalAttempts,
          forgeTotalSuccesses,
          masterCustomization,
          completedHouseTutorials,
          deckPresets,
          activeDeckPresetIndex,
          dailyContracts,
          dailyContractsDate: getTodayDateKey(),
        },
        nextClassic,
        nextTiered
      );

      if (success) {
        // Persistir explícitamente en disco local y Dexie SOLO en el acto de guardado
        try {
          localStorage.setItem('dungeon_dice_master_customization', JSON.stringify(masterCustomization));
          localStorage.setItem('dungeon_dice_tiered_achievements', JSON.stringify(nextTiered));
        } catch (_) {}
        dexieStorage.set('customization', 'master_piece', masterCustomization);
        dexieStorage.set('customization', 'tiered_achievements', nextTiered);

        hasIndexedDbSaveRef.current = true;
        setCampaignsProgress(updatedCampaignsProgress);
        setHasSavedGame(true);
        setShowSaveConfirmModal(false);
        gameAudio.playPowerupChime();
        triggerBattleMessage('¡Progreso de campaña guardado con éxito!', '#10b981');
      } else {
        throw new Error('Save error');
      }
    } catch (e) {
      setShowSaveConfirmModal(false);
      triggerBattleMessage('No se pudo guardar la partida.', '#ef4444');
    }
  };

  const loadSavedProgress = async (options?: { targetScreen?: 'CAMPAIGN_HUB' | 'TITLE' }) => {
    const requestEpoch = ++loadProgressEpochRef.current;
    try {
      const targetScreen = options?.targetScreen ?? 'CAMPAIGN_HUB';
      const data = await loadPlayerProgressFromStorageAsync();
      if (!isAppMountedRef.current || requestEpoch !== loadProgressEpochRef.current) {
        return;
      }
      if (targetScreen === 'TITLE' && currentScreenRef.current !== 'TITLE') {
        return;
      }
      if (data) {
        hasIndexedDbSaveRef.current = true;
        setHasSavedGame(true);
        if (data.playerName) setPlayerName(data.playerName);
        if (data.playerGold !== undefined) setPlayerGold(data.playerGold);
        if (data.playerDeck) setPlayerDeck(data.playerDeck);
        if (data.orbBank) setOrbBank(data.orbBank);
        // Las fichas son exclusivamente temporales en batalla y se reinician en 0
        setFichas({
          J1: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          J2: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        });
        if (data.unlockedSpells) setUnlockedSpells(data.unlockedSpells);
        if (data.maxSpellSlots) setMaxSpellSlots(data.maxSpellSlots);
        if (data.equippedSpells) setEquippedSpells(data.equippedSpells);
        if (data.activeCampaignIndex !== undefined) setActiveCampaignIndex(data.activeCampaignIndex);
        if (data.unlockedCampaigns) setUnlockedCampaigns(data.unlockedCampaigns);
        const loadedProgress = data.campaignsProgress;
        if (loadedProgress) {
          setCampaignsProgress(loadedProgress);
          [0, 1, 2, 3].forEach((idx) => {
            const rngState = loadedProgress[idx]?.rngState;
            if (rngState) {
              campaignRngRef.current[idx] = { ...rngState };
            }
          });
        }
        if (data.campaignPhase) setCampaignPhase(data.campaignPhase);
        if (data.alleyCurrentFight) setAlleyCurrentFight(data.alleyCurrentFight);
        if (data.defeatedAlleyOpponents) setDefeatedAlleyOpponents(data.defeatedAlleyOpponents);
        if (data.survivalHighScore !== undefined) setSurvivalHighScore(data.survivalHighScore);
        if (data.campaign1LossCount !== undefined) setCampaign1LossCount(data.campaign1LossCount);
        if (data.statsWon !== undefined) setStatsWon(data.statsWon);
        if (data.statsCampaignLosses !== undefined) setStatsCampaignLosses(data.statsCampaignLosses);
        else if (data.statsLost !== undefined) setStatsCampaignLosses(data.statsLost);
        if (data.statsColiseumLosses !== undefined) setStatsColiseumLosses(data.statsColiseumLosses);
        if (data.statsMinionsSummoned !== undefined) setStatsMinionsSummoned(data.statsMinionsSummoned);
        if (data.statsTitansAwakened !== undefined) setStatsTitansAwakened(data.statsTitansAwakened);
        setPendingLevelUpQueue([]);
        setLevelUpChoiceModal(null);
        if (data.playerExp !== undefined) setPlayerExp(data.playerExp);
        if (data.playerLevel !== undefined) setPlayerLevel(data.playerLevel);
        if (data.maxPlayerHp !== undefined) setMaxPlayerHp(data.maxPlayerHp);
        if (data.masterAtkBonus !== undefined) setMasterAtkBonus(data.masterAtkBonus);
        if (data.masterStartingManaBonus !== undefined) setMasterStartingManaBonus(data.masterStartingManaBonus);
        if (data.masterShieldChargeLevel !== undefined) setMasterShieldChargeLevel(data.masterShieldChargeLevel);
        setIsSurvivalMode(false);
        setIsGladiatorDuelMode(false);
        setGladiatorDuelRival(null);
        setTournamentSavedSnapshot(null);
        if (data.tournamentRound) setTournamentRound(data.tournamentRound);
        if (data.defeatedTournamentContenders && Array.isArray(data.defeatedTournamentContenders)) {
          setDefeatedTournamentContenders(data.defeatedTournamentContenders);
        } else {
          setDefeatedTournamentContenders([]);
        }
        if (data.forgeInventory) setForgeInventory(data.forgeInventory);
        if (data.forgeMasteryLevel !== undefined) setForgeMasteryLevel(data.forgeMasteryLevel);
        if (data.forgeMasteryExp !== undefined) setForgeMasteryExp(data.forgeMasteryExp);
        if (data.forgeTotalAttempts !== undefined) setForgeTotalAttempts(data.forgeTotalAttempts);
        if (data.forgeTotalSuccesses !== undefined) setForgeTotalSuccesses(data.forgeTotalSuccesses);
        if (data.masterCustomization && typeof data.masterCustomization === 'object') {
          setMasterCustomization({
            title: data.masterCustomization.title || 'Rey Soberano Celeste',
            avatarColor: data.masterCustomization.avatarColor || '#38bdf8',
            attachedOrbs: Array.isArray(data.masterCustomization.attachedOrbs) ? data.masterCustomization.attachedOrbs : [],
            ...(Array.isArray(data.masterCustomization.orbSlots)
              ? { orbSlots: data.masterCustomization.orbSlots }
              : {}),
          });
        }
        const loadedClaimedIds = Array.isArray(data.claimedAchievements) ? data.claimedAchievements : [];
        const loadedTutorials = Array.isArray(data.completedHouseTutorials) ? data.completedHouseTutorials : [];
        setCompletedHouseTutorials(loadedTutorials);
        setAchievements((prev) =>
          prev.map((a) => {
            const isClaimed = loadedClaimedIds.includes(a.id);
            if (a.id === 'ach_all_tutorials') {
              return {
                ...a,
                isClaimed,
                progress: Math.min(12, loadedTutorials.length),
                isUnlocked: loadedTutorials.length >= 12,
              };
            }
            return { ...a, isClaimed };
          })
        );
        claimingTierKeysRef.current.clear();
        claimingTrophyIdsRef.current.clear();
        if (data.tieredAchievements && Array.isArray(data.tieredAchievements)) {
          const mergedTiered = mergeTieredAchievementsWithDefaults(data.tieredAchievements);
          tieredAchievementsRef.current = mergedTiered;
          setTieredAchievements(mergedTiered);
        } else {
          tieredAchievementsRef.current = INITIAL_TIERED_ACHIEVEMENTS;
          setTieredAchievements(INITIAL_TIERED_ACHIEVEMENTS);
        }
        const nextLoadedPresets =
          Array.isArray(data.deckPresets) && data.deckPresets.length > 0
            ? data.deckPresets
            : createDefaultDeckPresets();
        setDeckPresets(nextLoadedPresets);
        if (typeof data.activeDeckPresetIndex === 'number' && data.activeDeckPresetIndex >= 0) {
          const loadedDeck = Array.isArray(data.playerDeck) ? data.playerDeck : playerDeck;
          const candidatePreset = nextLoadedPresets[data.activeDeckPresetIndex];
          const activeIds = new Set(loadedDeck.filter((d) => d.enMazo).map((d) => d.id));
          const presetIds = candidatePreset?.dieIds || [];
          const presetSet = new Set(presetIds);
          const matchesPreset =
            presetIds.length > 0 &&
            presetSet.size === activeIds.size &&
            presetIds.every((id) => activeIds.has(id));
          setActiveDeckPresetIndex(matchesPreset ? data.activeDeckPresetIndex : null);
        } else {
          setActiveDeckPresetIndex(null);
        }
        if (
          Array.isArray(data.dailyContracts) &&
          data.dailyContracts.length > 0 &&
          data.dailyContractsDate === getTodayDateKey()
        ) {
          setDailyContracts(data.dailyContracts);
        } else {
          setDailyContracts(
            getOrRotateDailyContracts(data.unlockedCampaigns || [0], data.playerLevel || 1, {
              persist: false,
              ignoreStorage: true,
            })
          );
        }

        if (targetScreen === 'CAMPAIGN_HUB') {
          setHasStartedAnyCampaign(true);
          setHasEnteredCampaignSession(true);
          gameAudio.playConfirmSelect();
          setCurrentScreen('CAMPAIGN_HUB');
        } else {
          setCurrentScreen(targetScreen);
        }
      } else if (targetScreen === 'CAMPAIGN_HUB') {
        triggerBattleMessage('No se encontró ninguna partida guardada.', '#ef4444');
      }
    } catch (e) {
      triggerBattleMessage('Error al cargar la partida guardada.', '#ef4444');
    }
  };

  // Action target cells
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const selectedUnitIdRef = useRef<string | null>(null);
  selectedUnitIdRef.current = selectedUnitId;
  const [cellMov, setCellMov] = useState<number[]>([]);
  const cellMovRef = useRef<number[]>([]);
  cellMovRef.current = cellMov;
  const [cellAtq, setCellAtq] = useState<number[]>([]);
  const cellAtqRef = useRef<number[]>([]);
  cellAtqRef.current = cellAtq;
  const [cellInv, setCellInv] = useState<number[]>([]);
  const cellInvRef = useRef<number[]>([]);
  cellInvRef.current = cellInv;
  const [specialRunes, setSpecialRunes] = useState<SpecialHexRune[]>([]);
  const [invocacionPendiente, setInvocacionPendiente] = useState(false);
  const invocacionPendienteRef = useRef(false);
  invocacionPendienteRef.current = invocacionPendiente;
  const [nivelPendiente, setNivelPendiente] = useState(0);
  const [maestriaPendiente, setMaestriaPendiente] = useState(1);
  const [modalEleccionDoble, setModalEleccionDobleState] = useState<{ lvl: number; maestria: number } | null>(null);
  const modalEleccionDobleRef = useRef<{ lvl: number; maestria: number } | null>(null);
  const setModalEleccionDoble = useCallback((val: { lvl: number; maestria: number } | null) => {
    modalEleccionDobleRef.current = val;
    setModalEleccionDobleState(val);
  }, []);

  const [modalEscalera, setModalEscaleraState] = useState<{ d1: number; d2: number; d3: number } | null>(null);
  const modalEscaleraRef = useRef<{ d1: number; d2: number; d3: number } | null>(null);
  const setModalEscalera = useCallback((val: { d1: number; d2: number; d3: number } | null) => {
    modalEscaleraRef.current = val;
    setModalEscaleraState(val);
  }, []);

  const [modalLimiteCriaturas, setModalLimiteCriaturasState] = useState<{
    lvl: number;
    maestria: number;
    esAscendido: boolean;
    reason?: 'MAX_MINIONS' | 'NO_FREE_CELLS';
  } | null>(null);
  const modalLimiteCriaturasRef = useRef<{
    lvl: number;
    maestria: number;
    esAscendido: boolean;
    reason?: 'MAX_MINIONS' | 'NO_FREE_CELLS';
  } | null>(null);
  const setModalLimiteCriaturas = useCallback(
    (
      val: {
        lvl: number;
        maestria: number;
        esAscendido: boolean;
        reason?: 'MAX_MINIONS' | 'NO_FREE_CELLS';
      } | null
    ) => {
      modalLimiteCriaturasRef.current = val;
      setModalLimiteCriaturasState(val);
    },
    []
  );
  const pendingSummonOrbsRef = useRef<Orb[]>([]);
  // Usar tipos explícitos para las bonificaciones de catalizadores de forja en invocación
  const catalystBonusesRef = useRef<{ hp: number; atk: number }>({ hp: 0, atk: 0 });
  const [hechizoEnEspera, setHechizoEnEspera] = useState<string | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [spellVFXList, setSpellVFXList] = useState<SpellVFX[]>([]);
  const [showRetireConfirm, setShowRetireConfirm] = useState(false);

  // Rotación libre de la cámara en el mundo 3D de la campaña / Ciudadela (en radianes: 0, 45°, 90°, etc.)
  const [cityCameraAngle, setCityCameraAngle] = useState<number>(0);

  // Nivel de zoom de la cámara en la Ciudad: 1.0 (Normal), 1.35 (Cercano), 1.7 (Detallado)
  const [cityZoomLevel, setCityZoomLevel] = useState<number>(1.0);

  // Gestor dinámico de música de fondo según la fase o pantalla (se pospone mientras cargan los modelos 3D para no competir por red en móvil)
  const isMusicPlaying = Boolean(
    !isCampaignLoadingActive &&
    !isCombatLoadingActive &&
    ((currentScreen === 'COMBAT' && gameState.status === 'PLAYING') ||
      currentScreen === 'CITY_EXPLORATION' ||
      currentScreen === 'TAVERN_INTERIOR' ||
      currentScreen === 'SHOP_INTERIOR' ||
      currentScreen === 'HOUSE_INTERIOR' ||
      currentScreen === 'COLISEUM_INTERIOR' ||
      currentScreen === 'CAMPAIGN_HUB')
  );

  // Activación reactiva del ambiente sonoro diferenciado por campaña
  useEffect(() => {
    if (isMusicMuted || !isMusicPlaying) {
      gameAudio.stopAmbience();
      return;
    }

    if (currentScreen === 'COMBAT') {
      if (activeCampaignIndex === 1) {
        gameAudio.playCampaignAmbience('CALABOZO');
      } else if (activeCampaignIndex === 3) {
        gameAudio.playCampaignAmbience('SOMBRAS');
      } else {
        gameAudio.playCampaignAmbience('TORNEO');
      }
    } else {
      gameAudio.stopAmbience();
    }

    return () => {
      gameAudio.stopAmbience();
    };
  }, [currentScreen, activeCampaignIndex, isMusicMuted, isMusicPlaying]);

  const getDynamicBgmUrl = (): string => {
    // 1. En combate:
    if (currentScreen === 'COMBAT') {
      // Si es Gran Final o Modo Maestro Campaña 4 o Supervivencia avanzada
      if (
        (campaignPhase === 'TOURNAMENT' && tournamentRound === 3) ||
        activeCampaignIndex === 3 ||
        (isSurvivalMode && survivalWave >= 5) ||
        (isGladiatorDuelMode && gladiatorDuelHandicap === 'TITAN')
      ) {
        return 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/neon_runner.mp3';
      }
      // Combates regulares y primeras rondas de torneo
      return 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/titan_clash.mp3';
    }

    // 2. En la Ciudad, Taberna, Taller o Campamento:
    if (
      currentScreen === 'CITY_EXPLORATION' ||
      currentScreen === 'TAVERN_INTERIOR' ||
      currentScreen === 'SHOP_INTERIOR' ||
      currentScreen === 'HOUSE_INTERIOR' ||
      currentScreen === 'CAMPAIGN_HUB'
    ) {
      return 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/tavern_tales.mp3';
    }

    // 3. Coliseo interior
    if (currentScreen === 'COLISEUM_INTERIOR') {
      return 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/heroes_journey.mp3';
    }

    return '';
  };

  // Diálogo emergente del gladiador en combate con retrato
  const [emergentGladiatorBark, setEmergentGladiatorBark] = useState<EmergentGladiatorBark | null>(null);
  const hasTriggeredGladiatorBarkRef = useRef<boolean>(false);

  // Posición del jugador persistente en la Ciudad para reaparecer frente al edificio al salir
  const [lastCityPlayerPos, setLastCityPlayerPos] = useState<[number, number, number]>([0, 0, 15]);

  // Ciclo Día / Atardecer / Noche en tiempo real automático según la hora local del dispositivo del jugador:
  // - 0 (Día): 06:00 a 17:59
  // - 1 (Atardecer / Brasas): 18:00 a 20:59
  // - 2 (Noche / Polvo Cósmico): 21:00 a 05:59
  const getRealTimeOfDay = (): 0 | 1 | 2 => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 18) return 0; // Día
    if (hour >= 18 && hour < 21) return 1; // Atardecer
    return 2; // Noche
  };

  const [cityTimeOfDay, setCityTimeOfDay] = useState<0 | 1 | 2>(() => getRealTimeOfDay());

  // Actualización periódica en tiempo real cada 30 segundos
  useEffect(() => {
    const updateRealTime = () => {
      setCityTimeOfDay(getRealTimeOfDay());
    };
    updateRealTime();
    const interval = setInterval(updateRealTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Estado de diálogo de la Ciudad elevado a nivel de pantalla
  const [activeCityDialogue, setActiveCityDialogue] = useState<CityDialogueData | null>(null);

  const returnToMenuAfterModalRef = useRef<boolean>(false);

  // Callbacks memorizados estables para navegación y subárboles pesados de Three.js (Mejora 2)
  const handleReturnToHub = useCallback(() => {
    returnToMenuAfterModalRef.current = false;
    setIsGameMenuOpen(false);
    setCurrentScreen('CAMPAIGN_HUB');
    gameAudio.playCrispClick();
  }, []);

  const handleOpenMasterPiece = useCallback(() => {
    setIsGameMenuOpen(false);
    setIsMasterPieceModalOpen(true);
  }, []);

  const handleOpenStats = useCallback(() => {
    syncAchievementsNow();
    returnToMenuAfterModalRef.current = true;
    setIsGameMenuOpen(false);
    setIsStatsModalOpen(true);
  }, [syncAchievementsNow]);

  const handleOpenTrophies = useCallback(() => {
    syncAchievementsNow();
    returnToMenuAfterModalRef.current = true;
    setIsGameMenuOpen(false);
    setIsTrophyModalOpen(true);
  }, [syncAchievementsNow]);

  const handleOpenTieredAchievements = useCallback(() => {
    syncAchievementsNow();
    returnToMenuAfterModalRef.current = true;
    setIsGameMenuOpen(false);
    setIsTieredModalOpen(true);
  }, [syncAchievementsNow]);

  const handleEnterArena = useCallback(() => {
    setLastCityPlayerPos([0, 0, -58.0]);
    setColiseumActiveDialogue(null);
    setCurrentScreen('COLISEUM_INTERIOR');
    triggerBattleMessage('Has entrado al Coliseo de la Gran Arena', '#ef4444');
  }, [triggerBattleMessage]);

  const handleEnterShop = useCallback(() => {
    setPreviousScreenBeforeShop('CITY_EXPLORATION');
    setLastCityPlayerPos([-41.0, 0, 30]);
    setShopActiveDialogue(null);
    setCurrentScreen('SHOP_INTERIOR');
    triggerBattleMessage('Has entrado al Bazar de Dados de Solomon', '#c084fc');
  }, [triggerBattleMessage]);

  const handleEnterWorkshop = useCallback(() => {
    setPreviousScreenBeforeWorkshop('CITY_EXPLORATION');
    setLastCityPlayerPos([41.0, 0, -30]);
    setWorkshopActiveDialogue(null);
    setCurrentScreen('WORKSHOP_INTERIOR');
    triggerBattleMessage('Has entrado a la Forja y Taller de Vulkan', '#f97316');
  }, [triggerBattleMessage]);

  const handleEnterTavern = useCallback(() => {
    gameAudio.playConfirmSelect();
    setLastCityPlayerPos([41.0, 0, 30]);
    setCurrentScreen('TAVERN_INTERIOR');
    triggerBattleMessage('Has entrado a la Taberna del Dragón Astral', '#f59e0b');
  }, [triggerBattleMessage]);

  const handleOpenCodex = useCallback(() => {
    setIsCodexOpen(true);
  }, []);

  const handleOpenSpellbook = useCallback(() => {
    setPreviousScreenBeforeSpellbook('CITY_EXPLORATION');
    setCurrentScreen('SPELLBOOK');
  }, []);

  const handleEnterHouse = useCallback((house: ResidentialHouseData) => {
    gameAudio.playConfirmSelect();
    const exitPos = getHouseSafeExitPos(house);
    setLastCityPlayerPos(exitPos);
    setCurrentVisitedHouse(house);
    setIsHouseDialogueOpen(false);
    setCurrentScreen('HOUSE_INTERIOR');
    triggerBattleMessage(`Has entrado a ${house.houseName}`, house.resident.color);
  }, [triggerBattleMessage]);

  const handleExitShop = useCallback(() => {
    gameAudio.playConfirmSelect();
    setLastCityPlayerPos([-41.0, 0, 30]);
    setCurrentScreen('CITY_EXPLORATION');
  }, []);

  const handleExitWorkshop = useCallback(() => {
    gameAudio.playConfirmSelect();
    setLastCityPlayerPos([41.0, 0, -30]);
    setCurrentScreen('CITY_EXPLORATION');
  }, []);

  const handleExitColiseum = useCallback(() => {
    gameAudio.playConfirmSelect();
    setLastCityPlayerPos([0, 0, -58.0]);
    setCurrentScreen('CITY_EXPLORATION');
  }, []);

  const handleExitTavern = useCallback(() => {
    gameAudio.playConfirmSelect();
    setLastCityPlayerPos([41.0, 0, 30]);
    setCurrentScreen('CITY_EXPLORATION');
  }, []);

  // Expose back key handling to window
  useEffect(() => {
    (window as unknown as Record<string, unknown>).canHandleBackKey =
      ['PLAYING', 'PAUSED'].includes(gameState.status);
  }, [gameState.status]);

  // Referencias reactivas estables para el listener global de teclado (keydown)
  // Previene que se desmonte y vuelva a registrar el addEventListener en cada render o pulsación
  const currentScreenRef = useRef(currentScreen);
  currentScreenRef.current = currentScreen;
  const isHowToPlayOpenRef = useRef(isHowToPlayOpen);
  isHowToPlayOpenRef.current = isHowToPlayOpen;
  const isCodexOpenRef = useRef(isCodexOpen);
  isCodexOpenRef.current = isCodexOpen;
  const inspectedCreatureRef = useRef(inspectedCreature);
  inspectedCreatureRef.current = inspectedCreature;
  const hasSavedGameRef = useRef(hasSavedGame);
  hasSavedGameRef.current = hasSavedGame;
  const titleSelectedIndexRef = useRef(titleSelectedIndex);
  titleSelectedIndexRef.current = titleSelectedIndex;
  const hubSelectedIndexRef = useRef(hubSelectedIndex);
  hubSelectedIndexRef.current = hubSelectedIndex;
  const showNameModalRef = useRef(showNameModal);
  showNameModalRef.current = showNameModal;
  const isCampaignSelectorOpenRef = useRef(isCampaignSelectorOpen);
  isCampaignSelectorOpenRef.current = isCampaignSelectorOpen;
  const isColiseumDifficultyModalOpenRef = useRef(isColiseumDifficultyModalOpen);
  isColiseumDifficultyModalOpenRef.current = isColiseumDifficultyModalOpen;
  const currentVisitedHouseRef = useRef(currentVisitedHouse);
  currentVisitedHouseRef.current = currentVisitedHouse;
  const isGameMenuOpenRef = useRef(false);
  const isTrophyModalOpenRef = useRef(false);
  const isTieredModalOpenRef = useRef(false);
  const isStatsModalOpenRef = useRef(false);
  const isMasterPieceModalOpenRef = useRef(false);
  const isAssetDownloaderOpenRef = useRef(false);
  const showSaveConfirmModalRef = useRef(false);
  const showReturnTitleConfirmModalRef = useRef(false);
  const showExitConfirmModalRef = useRef(false);
  const showResetConfirmModalRef = useRef(false);
  const isHouseDialogueOpenRef = useRef(false);
  const isAnyGlobalModalOpenRef = useRef(false);
  const loadSavedProgressRef = useRef<() => void>(() => {});
  const startNewCampaignFlowRef = useRef<() => void>(() => {});
  const launchSelectedCampaignRef = useRef<(indexToLaunch?: number, restartForce?: boolean) => void>(() => {});

  loadSavedProgressRef.current = loadSavedProgress;

  // Escape key for menu & Press any key for splash screen & Keyboard Arrow Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const scr = currentScreenRef.current;

      if (scr === 'SPLASH') {
        gameAudio.playConfirmSelect();
        setCurrentScreen('TITLE');
        return;
      }

      if (e.key === 'Escape') {
        if (showNameModalRef.current) {
          setShowNameModal(false);
          return;
        }
        if (inspectedCreatureRef.current) {
          setInspectedCreature(null);
        } else if (isCodexOpenRef.current) {
          setIsCodexOpen(false);
        } else if (isHowToPlayOpenRef.current) {
          setIsHowToPlayOpen(false);
        } else if (isCampaignSelectorOpenRef.current) {
          setIsCampaignSelectorOpen(false);
        } else if (showSaveConfirmModalRef.current) {
          setShowSaveConfirmModal(false);
        } else if (showReturnTitleConfirmModalRef.current) {
          setShowReturnTitleConfirmModal(false);
        } else if (showExitConfirmModalRef.current) {
          setShowExitConfirmModal(false);
        } else if (showResetConfirmModalRef.current) {
          setShowResetConfirmModal(false);
        } else if (isMasterPieceModalOpenRef.current) {
          setIsMasterPieceModalOpen(false);
        } else if (isAssetDownloaderOpenRef.current) {
          setIsAssetDownloaderOpen(false);
        } else if (isTrophyModalOpenRef.current) {
          setIsTrophyModalOpen(false);
        } else if (isTieredModalOpenRef.current) {
          setIsTieredModalOpen(false);
        } else if (isStatsModalOpenRef.current) {
          setIsStatsModalOpen(false);
        } else if (isGameMenuOpenRef.current) {
          setIsGameMenuOpen(false);
        } else if (isAnyGlobalModalOpenRef.current) {
          // Si hay otro modal global bloqueante abierto (p.ej. recompensas, alertas o elección), no abandonar la casa
          return;
        } else if (scr === 'HOUSE_INTERIOR') {
          if (isHouseDialogueOpenRef.current) {
            setIsHouseDialogueOpen(false);
            return;
          }
          gameAudio.playConfirmSelect();
          const house = currentVisitedHouseRef.current;
          if (house) {
            setLastCityPlayerPos(getHouseSafeExitPos(house));
          }
          setIsHouseDialogueOpen(false);
          setActiveCityDialogue(null);
          setCurrentScreen('CITY_EXPLORATION');
        } else if (scr === 'COMBAT') {
          setIsGameMenuOpen((prev) => !prev);
        }
        return;
      }

      // Si el modal de nombre está activo
      if (showNameModalRef.current) {
        return;
      }

      if (isCampaignSelectorOpenRef.current) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          launchSelectedCampaignRef.current();
          return;
        }
        return;
      }

      if (scr === 'TITLE' && !isCodexOpenRef.current && !inspectedCreatureRef.current) {
        const hasActualSave = hasSavedGameRef.current || checkHasActualSavedGame();
        const optionCount = hasActualSave ? 3 : 2;
        if (e.key === 'ArrowDown' || e.key === 'Down') {
          e.preventDefault();
          gameAudio.playCrispClick();
          setTitleSelectedIndex((prev) => (prev + 1) % optionCount);
        } else if (e.key === 'ArrowUp' || e.key === 'Up') {
          e.preventDefault();
          gameAudio.playCrispClick();
          setTitleSelectedIndex((prev) => (prev - 1 + optionCount) % optionCount);
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          requestAppFullscreen();
          const selIdx = titleSelectedIndexRef.current;
          if (hasActualSave) {
            if (selIdx === 0) {
              loadSavedProgressRef.current();
            } else if (selIdx === 1) {
              startNewCampaignFlowRef.current();
            } else {
              const navAny = navigator as any;
              if (navAny?.app?.exitApp) navAny.app.exitApp();
              else if (navAny?.device?.exitApp) navAny.device.exitApp();
              else window.close();
              setShowExitConfirmModal(true);
            }
          } else {
            if (selIdx === 0) {
              startNewCampaignFlowRef.current();
            } else {
              const navAny = navigator as any;
              if (navAny?.app?.exitApp) navAny.app.exitApp();
              else if (navAny?.device?.exitApp) navAny.device.exitApp();
              else window.close();
              setShowExitConfirmModal(true);
            }
          }
        }
      }

      // Campaign Menu Arrow Navigation
      if (
        scr === 'CAMPAIGN_HUB' &&
        !isCodexOpenRef.current &&
        !inspectedCreatureRef.current &&
        !isCampaignSelectorOpenRef.current &&
        !isColiseumDifficultyModalOpenRef.current
      ) {
        if (e.key === 'ArrowRight' || e.key === 'Right') {
          e.preventDefault();
          gameAudio.playCrispClick();
          setHubSelectedIndex((prev) => (prev + 1) % 8);
        } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
          e.preventDefault();
          gameAudio.playCrispClick();
          setHubSelectedIndex((prev) => (prev - 1 + 8) % 8);
        } else if (e.key === 'ArrowDown' || e.key === 'Down') {
          e.preventDefault();
          gameAudio.playCrispClick();
          setHubSelectedIndex((prev) => (prev + 4) % 8);
        } else if (e.key === 'ArrowUp' || e.key === 'Up') {
          e.preventDefault();
          gameAudio.playCrispClick();
          setHubSelectedIndex((prev) => (prev - 4 + 8) % 8);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Función para iniciar o reanudar una campaña e ingresar inmediatamente a la Ciudad
  const launchSelectedCampaign = (indexToLaunch?: number, restartForce = false) => {
    loadProgressEpochRef.current += 1;
    const campaignIdx = indexToLaunch !== undefined ? indexToLaunch : selectedCampaignIndex;
    setIsCampaignSelectorOpen(false);
    gameAudio.playConfirmSelect();

    if ((campaignIdx === 1 || campaignIdx === 2 || campaignIdx === 3) && !unlockedCampaigns.includes(campaignIdx)) {
      gameAudio.playErrorBuzz();
      if (campaignIdx === 3) {
        setLockedCampaignAlertModal({
          campaignTitle: 'Campaña 4: El Trono de las Sombras',
          description: 'El Modo Maestro Táctico Supremo enfrenta a los 12 estrategas abisales y los 8 Emperadores con acceso exclusivo a la Gran Forja.',
          requirement: 'Debes coronarte Campeón Supremo en las Campañas 1, 2 y 3 para romper el sello del Trono.',
          accentColor: '#f43f5e',
        });
      } else if (campaignIdx === 1) {
        setLockedCampaignAlertModal({
          campaignTitle: 'Campaña 2: Señores del Calabozo',
          description: 'Enfrenta las profundidades abisales, rivales con defensas acorazadas y trampas corrosivas.',
          requirement: 'Debes vencer a Lady Aurelia y conquistar la Campaña 1 (El Camino al Torneo) para desbloquear este desafío.',
          accentColor: '#c084fc',
        });
      } else if (campaignIdx === 2) {
        setLockedCampaignAlertModal({
          campaignTitle: 'Campaña 3: El Torneíllo del Recluta',
          description: 'Senda didáctica y de perfeccionamiento táctico con combates didácticos y dados raros santificados.',
          requirement: 'Debes conquistar la Campaña 1 o resistir 20 combates en las Callejuelas para que el Gran Maestro te acepte.',
          accentColor: '#34d399',
        });
      }
      return;
    }

    // 1. Guardar estado de la campaña anterior antes de cambiar si es distinta
    if (activeCampaignIndex !== campaignIdx) {
      const prevData: CampaignProgressData = {
        status: (campaignsProgress[activeCampaignIndex]?.completed ? 'FINALIZADA' : 'PAUSADA') as CampaignExecutionStatus,
        phase: campaignPhase,
        fight: alleyCurrentFight,
        defeated: defeatedAlleyOpponents,
        round: tournamentRound,
        completed: campaignsProgress[activeCampaignIndex]?.completed || false,
        completionsCount: campaignsProgress[activeCampaignIndex]?.completionsCount || 0,
        claimedReward: campaignsProgress[activeCampaignIndex]?.claimedReward || false,
        campaignLosses: campaignsProgress[activeCampaignIndex]?.campaignLosses || 0,
        rngState: campaignRngRef.current[activeCampaignIndex]
          ? { ...campaignRngRef.current[activeCampaignIndex] }
          : campaignsProgress[activeCampaignIndex]?.rngState || { seed: 849201, rollCount: 0, luckModifier: 1.0 },
      };
      setCampaignsProgress((prev) => ({
        ...prev,
        [activeCampaignIndex]: prevData,
      }));
    }

    requestAppFullscreen();
    setIsSurvivalMode(false);
    setIsGladiatorDuelMode(false);
    setGladiatorDuelRival(null);
    setActiveCampaignIndex(campaignIdx);

    const targetProgress = campaignsProgress[campaignIdx];
    const isTargetRestart = restartForce || !targetProgress;

    // 2. Cargar o reiniciar el progreso específico de la historia en la campaña seleccionada
    // MIENTRAS QUE EL ARSENAL (DADOS, ORBES Y HECHIZOS) PERMANECE COMPARTIDO Y GLOBAL (OPCIÓN A)
    if (isTargetRestart) {
      // Reiniciar progreso de la campaña para jugarla de nuevo (Repetir campaña)
      setCampaignPhase('ALLEY');
      setAlleyCurrentFight(1);
      setDefeatedAlleyOpponents([]);
      setTournamentRound(1);
      setTournamentSavedSnapshot(null);
      setFichas({
        J1: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        J2: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      });
      setCampaignsProgress((prev) => ({
        ...prev,
        [campaignIdx]: {
          ...prev[campaignIdx],
          status: 'EN_PROGRESO',
          phase: 'ALLEY',
          fight: 1,
          defeated: [],
          round: 1,
        },
      }));
    } else {
      // Reanudar progreso guardado de la historia de esta campaña
      setCampaignPhase(targetProgress.phase || 'ALLEY');
      setAlleyCurrentFight(targetProgress.fight || 1);
      setDefeatedAlleyOpponents(targetProgress.defeated || []);
      setTournamentRound(targetProgress.round || 1);
      setTournamentSavedSnapshot(null);

      // Las fichas son exclusivamente temporales por batalla y se inician en 0 fuera de combate
      setFichas({
        J1: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        J2: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      });
      setCampaignsProgress((prev) => ({
        ...prev,
        [campaignIdx]: {
          ...prev[campaignIdx],
          status: 'EN_PROGRESO',
        },
      }));
    }

    // Bonos adicionales por campaña si desbloquea nuevos hechizos
    if (campaignIdx === 1) {
      if (!unlockedSpells.includes('transposicion')) {
        // En la Campaña 2 no se regalan hechizos comprables en la tienda, el jugador debe comprarlos
      }
    } else if (campaignIdx === 3) {
      if (!unlockedSpells.includes('ira_ra')) {
        // En la Campaña 4 no se regalan hechizos comprables en la tienda, el jugador debe comprarlos
      }
    }

    // Activar pantalla de espera de carga mientras se descargan y optimizan los modelos 3D sin montar <Canvas> aún
    const settledNow = isCityEnvironmentLoadSettled();
    setLoadingCampaignMeta(buildCampaignLoadingMeta(campaignIdx));
    setIsCityModelsReady(settledNow);
    setIsCitySceneReady(false);
    setIsCampaignLoadingActive(true);
    setCurrentScreen('CITY_EXPLORATION');
    setHasStartedAnyCampaign(true);
    setHasEnteredCampaignSession(true);
    triggerBattleMessage(
      restartForce
        ? `¡Campaña reiniciada! Disfruta nuevamente el desafío.`
        : campaignIdx === 3
        ? '👑 ¡Campaña 4: El Trono de las Sombras! ¡Modo Maestro Táctico Desbloqueado!'
        : campaignIdx === 2
        ? '¡Campaña 3: El Torneíllo del Recluta! ¡Modo Didáctico y Accesible!'
        : campaignIdx === 1
        ? '¡Campaña 2: El Desafío de los Señores del Calabozo! ¡Nivel Medio Desbloqueado!'
        : '¡Campaña 1: El Camino al Torneo de Campeones! Explora la Ciudad y lucha.',
      '#fbbf24'
    );
  };

  const spawnFloatingText = (text: string, hexId: number, color = '#f87171') => {
    const coord = HEX_MAP[hexId];
    if (!coord) return;
    const item: FloatingText = {
      id: Math.random().toString(),
      text,
      color,
      position: [coord.worldX, 1.8, coord.worldZ],
      life: 1.5,
    };
    setFloatingTexts((prev) => [...prev, item]);
    scheduleCombatFxTimeout(() => {
      setFloatingTexts((prev) => prev.filter((t) => t.id !== item.id));
    }, 1200);
  };

  const triggerSpellVFX = (type: SpellVFX['type'], hexId: number, color = '#38bdf8') => {
    const c = HEX_MAP[hexId];
    if (!c) return;
    const vfx: SpellVFX = {
      id: Math.random().toString(),
      type,
      origin: [c.worldX, 0.1, c.worldZ],
      color,
      startTime: Date.now() / 1000,
    };
    setSpellVFXList((prev) => [...prev, vfx]);
    scheduleCombatFxTimeout(() => {
      setSpellVFXList((prev) => prev.filter((item) => item.id !== vfx.id));
    }, 900);
  };

  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  // Handler para iniciar nueva campaña con ingreso de nombre y asignación probabilística
  const startNewCampaignFlow = () => {
    loadProgressEpochRef.current += 1;
    // Si ya existe una campaña iniciada o guardada, abrir modal HTML en pantalla (sin window.confirm nativo bloqueado)
    if (hasSavedGame || hasStartedAnyCampaign) {
      gameAudio.playCrispClick();
      setShowResetConfirmModal(true);
      return;
    }
    gameAudio.playConfirmSelect();
    setNameInput('');
    setShowNameModal(true);
  };

  startNewCampaignFlowRef.current = startNewCampaignFlow;
  launchSelectedCampaignRef.current = launchSelectedCampaign;

  const handleConfirmName = (e?: React.FormEvent): boolean => {
    if (e) e.preventDefault();
    if (!showNameModalRef.current) return false;
    loadProgressEpochRef.current += 1;
    showNameModalRef.current = false;
    const finalName = nameInput.trim() || 'Viajero';
    setPlayerName(finalName);
    setShowNameModal(false);

    // REGLA FUNDAMENTAL DE PROTECCIÓN:
    // Al iniciar una nueva campaña, NO se borra el archivo guardado previo de localStorage (dungeon_dice_save).
    // La partida anterior se mantiene intacta hasta que el jugador decida explícitamente pulsar "GUARDAR" en la nueva campaña.
    setHasStartedAnyCampaign(true);
    setHasEnteredCampaignSession(false);
    setCompletedHouseTutorials([]);
    setDefeatedTournamentContenders([]);

    // Reiniciar contratos diarios y preajustes en memoria para la nueva aventura (sin escribir en disco)
    const refreshedContracts = getOrRotateDailyContracts([0], 1, { persist: false, ignoreStorage: true });
    setDailyContracts(refreshedContracts);
    setDeckPresets(createDefaultDeckPresets());
    setActiveDeckPresetIndex(null);

    clearAiTimeouts();
    clearRollDiceTimeout();
    clearCombatFxTimeouts();
    clearCombatResolutionTimeouts();
    setCombatLock(false);

    // 1. Asignación de Dados con RNG de la campaña inicial:
    // 50% de probabilidad de dado épico y 10% de dado legendario
    const { deck, hasEpic, hasLegendary } = generateNewCampaignDeck();
    playerDeckRef.current = deck;
    setPlayerDeck(deck);

    // 2. Empezarás sin orbes
    setOrbBank([]);

    // 3. Empieza con 1 ranura de hechizo libre (y 3% de probabilidad de 2 ranuras iniciales)
    const initialSlots = Math.random() < 0.03 ? 2 : 1;
    setMaxSpellSlots(initialSlots);

    // OBTENCIÓN INICIAL DE HECHIZOS:
    // Entre los dos hechizos iniciales ('rayo' y 'escudo'), se otorga 1 AL AZAR en el inventario al comenzar,
    // pero la ranura de combate inicia LIBRE (sin equipar) para que el jugador elija cuál llevar
    const baseInitialSpells = ['rayo', 'escudo'];
    const randomIndex = Math.floor(Math.random() * baseInitialSpells.length);
    const chosenInitialSpell = baseInitialSpells[randomIndex];
    
    setEquippedSpells([]); // Ranura libre
    setUnlockedSpells([chosenInitialSpell]);
    setPlayerGold(getConfig('startingGold'));
    setActiveCampaignIndex(0);
    setSelectedCampaignIndex(0);

    // COMANDO ESPECIAL / EASTER EGG:
    // Si el jugador se coloca de nombre "shin" (o "Shin" / "SHIN"), desbloquea todas las 4 campañas de inmediato
    const isShinCheat = finalName.toLowerCase() === 'shin';
    const initialUnlockedCampaigns = isShinCheat ? [0, 1, 2, 3] : [0];
    setUnlockedCampaigns(initialUnlockedCampaigns);

    setCampaignPhase('ALLEY');
    setAlleyCurrentFight(1);
    setDefeatedAlleyOpponents([]);
    setTournamentSavedSnapshot(null);
    setPlayerExp(0);
    setPlayerLevel(1);
    setPendingLevelUpQueue([]);
    setLevelUpChoiceModal(null);
    setMaxPlayerHp(getConfig('masterMaxHp'));
    setMasterAtkBonus(0);
    setMasterStartingManaBonus(0);
    setMasterShieldChargeLevel(0);
    setTournamentRound(1);
    setCampaign1LossCount(0);
    setLastCityPlayerPos([0, 0, 15]);
    setActiveCityDialogue(null);
    setActiveHouseTutorial(null);
    setCurrentVisitedHouse(null);
    setStatsWon(0);
    setStatsCampaignLosses(0);
    setStatsColiseumLosses(0);
    setStatsMinionsSummoned(0);
    setStatsTitansAwakened(0);
    setSurvivalHighScore(0);
    setSurvivalWave(1);
    setIsSurvivalMode(false);
    setIsGladiatorDuelMode(false);
    setGladiatorDuelRival(null);
    campaignRngRef.current = {
      0: { seed: 849201, rollCount: 0, luckModifier: 1.0 },
      1: { seed: 624103, rollCount: 0, luckModifier: 1.0 },
      2: { seed: 395817, rollCount: 0, luckModifier: 1.0 },
      3: { seed: 918274, rollCount: 0, luckModifier: 1.0 },
    };
    setCampaignsProgress({
      0: { status: 'EN_PROGRESO', phase: 'ALLEY', fight: 1, defeated: [], round: 1, completed: false, completionsCount: 0, claimedReward: false, campaignLosses: 0, rngState: { seed: 849201, rollCount: 0, luckModifier: 1.0 } },
      1: { status: isShinCheat ? 'EN_PROGRESO' : 'INACTIVA', phase: 'ALLEY', fight: 1, defeated: [], round: 1, completed: false, completionsCount: 0, claimedReward: false, campaignLosses: 0, rngState: { seed: 624103, rollCount: 0, luckModifier: 1.0 } },
      2: { status: isShinCheat ? 'EN_PROGRESO' : 'INACTIVA', phase: 'ALLEY', fight: 1, defeated: [], round: 1, completed: false, completionsCount: 0, claimedReward: false, campaignLosses: 0, rngState: { seed: 395817, rollCount: 0, luckModifier: 1.0 } },
      3: { status: isShinCheat ? 'EN_PROGRESO' : 'INACTIVA', phase: 'ALLEY', fight: 1, defeated: [], round: 1, completed: false, completionsCount: 0, claimedReward: false, campaignLosses: 0, rngState: { seed: 918274, rollCount: 0, luckModifier: 1.0 } },
    });
    claimingTierKeysRef.current.clear();
    claimingTrophyIdsRef.current.clear();
    setAchievements((prev) => prev.map((a) => ({ ...a, isUnlocked: false, isClaimed: false, progress: 0 })));
    tieredAchievementsRef.current = INITIAL_TIERED_ACHIEVEMENTS;
    setTieredAchievements(INITIAL_TIERED_ACHIEVEMENTS);
    setMasterCustomization({
      title: 'Rey Soberano Celeste',
      avatarColor: '#38bdf8',
      attachedOrbs: [],
    });
    setFichas({
      J1: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      J2: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    });
    setForgeInventory(createInitialForgeInventory());
    setForgeMasteryLevel(1);
    setForgeMasteryExp(0);
    setForgeTotalAttempts(0);
    setForgeTotalSuccesses(0);
    bankedCrestsJ1Ref.current = [];
    setBankedCrestsJ1([]);
    setSelectBankedCrestModal(null);
    setCombatLog([]);
    setFloatingTexts([]);
    setSpellVFXList([]);
    setEmergentGladiatorBark(null);
    setModalEleccionDoble(null);
    setModalEscalera(null);
    setModalLimiteCriaturas(null);
    setSpellToConfirm(null);
    setHechizoEnEspera(null);
    setAscendedCutscene(null);
    setShowRetireConfirm(false);
    setShowDefeatResultModal(false);
    setShowSecretUnlockModal(false);
    setShowColiseumUnlockedHub(false);
    setVictoryAchievementModal(null);
    setPendingRewardModal(null);
    setTutorialCompletionModal(null);
    consecutiveWhiffsRef.current = 0;
    setConsecutiveWhiffs(0);
    setLastPlayerMoveAction(null);
    setLastVictoryGoldReward(null);
    setJustCrownedChampion(false);
    setActiveTournamentContender(null);
    updateManaSync({ J1: 0, J2: 0 });
    const resetMasters = createInitialMasters();
    unitsRef.current = resetMasters;
    setUnits(resetMasters);
    setGameState({ status: 'START', score: 0, level: 1 });

    if (isShinCheat) {
      gameAudio.playVictoryFanfare();
      setSecretCodeActivatedModal(true);
    }

    gameAudio.playPowerupChime();
    // Mostrar modal con el resumen de la asignación inicial de dados y rarezas obtenidas
    setAssignedSummary({
      name: finalName,
      hasEpic,
      hasLegendary,
      slots: initialSlots,
    });
    // Llevar al Campamento de Guerra de fondo (sin notificación flotante en esquina para no competir con el modal)
    setCurrentScreen('CAMPAIGN_HUB');
    return true;
  };

  // Iniciar la batalla práctica tutorial de una casa residencial
  const startHouseTutorialCombat = (house: ResidentialHouseData) => {
    // Si el consejo de la casa no es una lección de combate táctico, no inicia combate
    if (!isHouseBattleLesson(house.id)) {
      gameAudio.playPowerupChime();
      triggerBattleMessage(
        `¡Recomendación de ${house.resident.name} asimilada!`,
        house.resident.color
      );
      return;
    }
    setIsSurvivalMode(false);
    setIsGladiatorDuelMode(false);
    setGladiatorDuelRival(null);
    isTutorialBattleActiveRef.current = true;

    const lesson = HOUSE_TUTORIAL_LESSONS[house.id];
    if (!lesson) {
      isTutorialBattleActiveRef.current = false;
      return;
    }

    // LECCIÓN VI: Guardia del Rey Soberano (Baluarte del Soberano / Senescal Alistair)
    // Si el jugador no tiene equipado el hechizo de Escudo en sus ranuras activas,
    // se equipa provisionalmente para esta práctica didáctica y se restaura al terminar o salir.
    const baseEquippedSpells =
      tutorialSavedEquippedSpellsRef.current !== null
        ? tutorialSavedEquippedSpellsRef.current
        : equippedSpells;
    if (house.id === 'house_6') {
      if (!baseEquippedSpells.includes('escudo')) {
        tutorialSavedEquippedSpellsRef.current = [...baseEquippedSpells];
        setEquippedSpells(
          ['escudo', ...baseEquippedSpells.filter((id) => id !== 'escudo')].slice(
            0,
            Math.max(baseEquippedSpells.length, 1)
          )
        );
        triggerBattleMessage('🛡️ ¡Hechizo de Escudo equipado provisionalmente para la lección!', '#34d399');
      } else {
        tutorialSavedEquippedSpellsRef.current = null;
      }
    } else {
      restoreTutorialEquippedSpells();
    }

    setActiveHouseTutorial(lesson);
    setTutorialCurrentStep(1);

    // Preparar tablero de simulación didáctica
    const initialUnits: UnitData[] = [
      {
        id: 'master_j2',
        nombre: `INSTRUCTOR ${house.resident.name.toUpperCase().split(' ')[0]}`,
        nivel: 1,
        hpActual: 18,
        hpMax: 18,
        daño: 3,
        dueño: 2,
        posicion: AI_MASTER_START_HEX,
        yaSeMovio: false,
        esMaestra: true,
        esAscendido: false,
      },
      {
        id: 'master_j1',
        nombre: (masterCustomization?.title || 'REY CELESTE (J1)').toUpperCase(),
        nivel: 1,
        hpActual: maxPlayerHp + (masterCustomization?.attachedOrbs || []).reduce((acc, o) => acc + (o.bonusHp || 0), 0),
        hpMax: maxPlayerHp + (masterCustomization?.attachedOrbs || []).reduce((acc, o) => acc + (o.bonusHp || 0), 0),
        daño: 6 + masterAtkBonus + (masterCustomization?.attachedOrbs || []).reduce((acc, o) => acc + (o.bonusAtk || 0), 0),
        dueño: 1,
        posicion: PLAYER_MASTER_START_HEX,
        yaSeMovio: false,
        esMaestra: true,
        esAscendido: false,
        equippedOrbs: [...(masterCustomization?.attachedOrbs || [])],
        ...(() => {
          const hasOrbShield = (masterCustomization?.attachedOrbs || []).some(
            (o) => o.id === 'o9' || o.templateId === 'o9' || o.element === 'Metal'
          );
          const charges = masterShieldChargeLevel + (hasOrbShield ? 1 : 0);
          return charges > 0 ? { hasShield: true, shieldCharges: charges } : { hasShield: false, shieldCharges: 0 };
        })(),
      },
    ];

    const occupiedHexes = new Set<number>(initialUnits.map((u) => u.posicion));
    const pickValidFreeHex = (
      anchorHexId: number,
      preferredHexId?: number,
      preferForwardZ = true
    ): number | null => {
      if (
        preferredHexId !== undefined &&
        Boolean(HEX_MAP[preferredHexId]) &&
        !occupiedHexes.has(preferredHexId) &&
        getHexDistance(anchorHexId, preferredHexId) === 1
      ) {
        return preferredHexId;
      }
      const adjacentCandidates = HEX_GRID.filter(
        (c) => Boolean(HEX_MAP[c.id]) && !occupiedHexes.has(c.id) && getHexDistance(anchorHexId, c.id) === 1
      ).sort((a, b) =>
        preferForwardZ
          ? a.worldZ - b.worldZ || Math.abs(a.worldX) - Math.abs(b.worldX)
          : b.worldZ - a.worldZ || Math.abs(a.worldX) - Math.abs(b.worldX)
      );
      if (adjacentCandidates.length > 0) {
        return adjacentCandidates[0].id;
      }
      const fallbackCandidates = HEX_GRID.filter(
        (c) => Boolean(HEX_MAP[c.id]) && !occupiedHexes.has(c.id)
      ).sort((a, b) => getHexDistance(anchorHexId, a.id) - getHexDistance(anchorHexId, b.id));
      return fallbackCandidates.length > 0 ? fallbackCandidates[0].id : null;
    };

    if (lesson.aiUnitsCount >= 2) {
      const dummy1Hex = pickValidFreeHex(AI_MASTER_START_HEX, 5, false);
      if (dummy1Hex !== null) {
        occupiedHexes.add(dummy1Hex);
        initialUnits.push({
          id: 'dummy_minion_1',
          nombre: 'Maniquí de Práctica 1',
          nivel: 1,
          hpActual: 6,
          hpMax: 6,
          daño: 2,
          dueño: 2,
          posicion: dummy1Hex,
          yaSeMovio: true,
          esMaestra: false,
          esAscendido: false,
        });
      }
      const dummy2Hex = pickValidFreeHex(AI_MASTER_START_HEX, 6, false);
      if (dummy2Hex !== null) {
        occupiedHexes.add(dummy2Hex);
        initialUnits.push({
          id: 'dummy_minion_2',
          nombre: 'Maniquí de Práctica 2',
          nivel: 1,
          hpActual: 6,
          hpMax: 6,
          daño: 2,
          dueño: 2,
          posicion: dummy2Hex,
          yaSeMovio: true,
          esMaestra: false,
          esAscendido: false,
        });
      }
    }

    // Para la Lección V (Movimiento) y Lección XI (Ataque y Escudo), pre-posicionamos una tropa aliada en una casilla válida de HEX_MAP
    if (house.id === 'house_5' || house.id === 'house_11') {
      const allyPracticeHex = pickValidFreeHex(PLAYER_MASTER_START_HEX, undefined, true);
      if (allyPracticeHex !== null) {
        occupiedHexes.add(allyPracticeHex);
        initialUnits.push({
          id: 'ally_practice_unit',
          nombre: 'Caballero Aliado',
          nivel: 3,
          hpActual: 10,
          hpMax: 10,
          daño: 4,
          dueño: 1,
          posicion: allyPracticeHex,
          yaSeMovio: false,
          esMaestra: false,
          esAscendido: false,
        });
        if (house.id === 'house_11') {
          // En la lección XI, colocamos al maniquí enemigo en una casilla válida de HEX_MAP adyacente al Caballero Aliado
          const dummyTargetHex = pickValidFreeHex(allyPracticeHex, undefined, true);
          if (dummyTargetHex !== null) {
            occupiedHexes.add(dummyTargetHex);
            initialUnits.push({
              id: 'dummy_shield_target',
              nombre: 'Muñeco con Escudo',
              nivel: 2,
              hpActual: 8,
              hpMax: 8,
              daño: 2,
              dueño: 2,
              posicion: dummyTargetHex,
              yaSeMovio: true,
              esMaestra: false,
              esAscendido: false,
              hasShield: true,
            });
          }
        }
      }
    }

    setUnits(initialUnits);
    unitsRef.current = initialUnits;
    jugadorActivoRef.current = 1;
    setJugadorActivo(1);
    updateManaSync({ J1: lesson.startingMana, J2: 0 });
    setDadosLanzados(false);
    setResultadoDados([]);
    selectedUnitIdRef.current = null;
    setSelectedUnitId(null);
    cellMovRef.current = [];
    setCellMov([]);
    cellAtqRef.current = [];
    setCellAtq([]);
    cellInvRef.current = [];
    setCellInv([]);
    invocacionPendienteRef.current = false;
    setInvocacionPendiente(false);
    setNivelPendiente(0);
    setHechizoEnEspera(null);

    const activeDeck = playerDeck.filter((d) => d.enMazo);
    setDrawPile([...activeDeck]);
    setUsedPile([]);

    setCurrentScreen('COMBAT');
    setGameState((prev) => ({ ...prev, status: 'PLAYING' }));
    gameAudio.playConfirmSelect();
    triggerBattleMessage(`⚔️ ¡LECCIÓN PRÁCTICA: ${lesson.title.toUpperCase()}!`, house.resident.color);
  };

  const checkTutorialStepProgression = (actionDone: 'ROLL_DICE' | 'SUMMON' | 'MOVE' | 'ATTACK' | 'CAST_SPELL' | 'TRANSMUTE') => {
    if (!activeHouseTutorial) return;
    const currentStepDef = activeHouseTutorial.guideSteps.find((s) => s.stepNumber === tutorialCurrentStep);
    if (currentStepDef && currentStepDef.requiredAction === actionDone) {
      const nextStep = tutorialCurrentStep + 1;
      if (nextStep <= activeHouseTutorial.guideSteps.length) {
        setTutorialCurrentStep(nextStep);
        gameAudio.playPowerupChime();
        triggerBattleMessage(`✓ ¡Paso ${tutorialCurrentStep} completado! Siguiente instrucción lista`, '#34d399');
      } else {
        // Al cumplir la última indicación, preparamos la despedida armoniosa del instructor
        const houseId = activeHouseTutorial.houseId;
        let updatedCount = completedHouseTutorials.length;
        if (!completedHouseTutorials.includes(houseId)) {
          const updated = [...completedHouseTutorials, houseId];
          setCompletedHouseTutorials(updated);
          updatedCount = updated.length;
          setAchievementsInternal((prev) =>
            prev.map((a) =>
              a.id === 'ach_all_tutorials'
                ? {
                    ...a,
                    progress: Math.min(12, updated.length),
                    isUnlocked: updated.length >= 12,
                  }
                : a
            )
          );
          if (updated.length >= 12) {
            gameAudio.playVictoryFanfare();
            triggerBattleMessage('🏆 ¡LOGRO DESBLOQUEADO: GRAN ERUDITO DE LOS DADOS! (12/12 Lecciones)', '#fbbf24');
          }
        }

        // Presentación serena y armoniosa: no expulsa al jugador bruscamente, sino que despliega el mensaje de reconocimiento
        gameAudio.playVictoryFanfare();
        const exitPosCoord = currentVisitedHouse
          ? getHouseSafeExitPos(currentVisitedHouse)
          : null;
        setTutorialCompletionModal({
          lessonTitle: activeHouseTutorial.title,
          residentName: currentVisitedHouse?.resident.name || 'El Instructor',
          residentTopic: currentVisitedHouse?.resident.topic || activeHouseTutorial.topic,
          residentColor: currentVisitedHouse?.resident.color || '#38bdf8',
          residentIcon: currentVisitedHouse?.resident.icon || '🎓',
          totalCompleted: Math.min(12, updatedCount),
          exitPos: exitPosCoord,
        });
      }
    }
  };

  // Helper para generar el mazo y equipamiento de orbes personalizado de cada rival
  // asignado a su arquetipo, dificultad y campaña específica
  const generateAiCustomDeckAndProfile = (
    alleyOpp?: AlleyOpponent,
    tournamentContender?: TournamentContender,
    duelRival?: TournamentContender | null,
    campIdx = activeCampaignIndex,
    duelHandicapOverride?: GladiatorDuelHandicap
  ): {
    deck: DieData[];
    orbsPool: Orb[];
    tactics: 'AGGRESSIVE_ASSASSIN' | 'DEFENSIVE_TANK' | 'SPELL_CONTROL' | 'TRAP_AMBUSH' | 'BALANCED' | 'TITAN_COLOSSUS' | 'ENDGAME_BOSS';
    spells: string[];
    startingMana: number;
  } => {
    let tactics: 'AGGRESSIVE_ASSASSIN' | 'DEFENSIVE_TANK' | 'SPELL_CONTROL' | 'TRAP_AMBUSH' | 'BALANCED' | 'TITAN_COLOSSUS' | 'ENDGAME_BOSS' = 'BALANCED';
    let spells: string[] = ['rayo'];
    let orbsPool: Orb[] = [];
    let startingMana = 0;
    let baseDieName = 'Dado Rival';
    let distribution: { count: number; rarity: DieRarity; level: number; orbs: Orb[] }[] = [];

    // 1. MODO DUELO DE GLADIADORES
    if (duelRival) {
      const effectiveDuelHandicap = duelHandicapOverride || gladiatorDuelHandicap;
      tactics = effectiveDuelHandicap === 'TITAN' ? 'TITAN_COLOSSUS' : effectiveDuelHandicap === 'HARD' ? 'AGGRESSIVE_ASSASSIN' : 'BALANCED';
      baseDieName = `Dado de ${duelRival.name.split(' ')[0]}`;
      spells = ['rayo', 'escudo', 'tormenta', 'juicio'];
      startingMana = GLADIATOR_DUEL_HANDICAPS[effectiveDuelHandicap].startingMana;
      orbsPool = [ELEMENT_ORBS[0], ELEMENT_ORBS[2], ELEMENT_ORBS[3], ELEMENT_ORBS[4]]; // Fuego, Rayo, Vampírico, Viento

      distribution = [
        { count: 4, rarity: RARIDADES.LEGENDARIO, level: 4, orbs: [ELEMENT_ORBS[3], ELEMENT_ORBS[0]] },
        { count: 8, rarity: RARIDADES.EPICO, level: 3, orbs: [ELEMENT_ORBS[2]] },
        { count: 12, rarity: RARIDADES.RARO, level: 2, orbs: [ELEMENT_ORBS[4]] },
      ];
    }
    // 2. CONTENDIENTES DEL TORNEO (FASE 2)
    else if (tournamentContender) {
      baseDieName = `Dado de ${tournamentContender.name.split(' ')[0]}`;
      const round = tournamentContender.phaseRound || 1;

      if (round === 3) {
        // Gran Final
        tactics = 'ENDGAME_BOSS';
        spells = ['rayo', 'escudo', 'ira_ra', 'supremo', 'tormenta'];
        startingMana = campIdx === 3 ? 5 : 3;
        orbsPool = [ELEMENT_ORBS[7], ELEMENT_ORBS[9], ELEMENT_ORBS[3]]; // Luz Solar, Cósmico Supremo, Vampírico
        distribution = [
          { count: 8, rarity: RARIDADES.LEGENDARIO, level: campIdx === 3 ? 5 : 4, orbs: [ELEMENT_ORBS[9], ELEMENT_ORBS[7]] },
          { count: 10, rarity: RARIDADES.EPICO, level: 4, orbs: [ELEMENT_ORBS[3]] },
          { count: 6, rarity: RARIDADES.RARO, level: 3, orbs: [ELEMENT_ORBS[0]] },
        ];
      } else if (round === 2) {
        // Semifinales
        tactics = tournamentContender.styleArchetype?.includes('Agresiva') ? 'AGGRESSIVE_ASSASSIN' : 'SPELL_CONTROL';
        spells = ['rayo', 'escudo', 'tormenta', 'juicio'];
        startingMana = 2;
        orbsPool = [ELEMENT_ORBS[2], ELEMENT_ORBS[0], ELEMENT_ORBS[4]];
        distribution = [
          { count: 4, rarity: RARIDADES.LEGENDARIO, level: 4, orbs: [ELEMENT_ORBS[2]] },
          { count: 12, rarity: RARIDADES.EPICO, level: 3, orbs: [ELEMENT_ORBS[0]] },
          { count: 8, rarity: RARIDADES.RARO, level: 2, orbs: [ELEMENT_ORBS[4]] },
        ];
      } else {
        // Cuartos de Final
        tactics = tournamentContender.styleArchetype?.includes('Tanque') ? 'DEFENSIVE_TANK' : 'TRAP_AMBUSH';
        spells = ['rayo', 'escudo', 'transposicion'];
        startingMana = 1;
        orbsPool = [ELEMENT_ORBS[5], ELEMENT_ORBS[1], ELEMENT_ORBS[6]];
        distribution = [
          { count: 2, rarity: RARIDADES.LEGENDARIO, level: 3, orbs: [ELEMENT_ORBS[5]] },
          { count: 10, rarity: RARIDADES.EPICO, level: 3, orbs: [ELEMENT_ORBS[1]] },
          { count: 12, rarity: RARIDADES.RARO, level: 2, orbs: [] },
        ];
      }
    }
    // 3. RIVALES DE LA CALLEJUELA (FASE 1)
    else if (alleyOpp) {
      baseDieName = `${alleyOpp.deckTheme}`;

      // Configuración de táctica y orbes según arquetipo y campaña
      if (alleyOpp.archetype === 'Asesino Sombrío') {
        tactics = 'AGGRESSIVE_ASSASSIN';
        spells = ['rayo', 'transposicion'];
        orbsPool = [ELEMENT_ORBS[4], ELEMENT_ORBS[3]]; // Viento (+2 iniciativa), Vampírico (+2 HP robo)
        startingMana = campIdx === 3 ? 2 : 1;
        distribution = [
          { count: campIdx === 3 ? 6 : campIdx >= 1 ? 4 : 2, rarity: RARIDADES.EPICO, level: campIdx === 3 ? 4 : 3, orbs: [ELEMENT_ORBS[4]] },
          { count: 10, rarity: RARIDADES.RARO, level: 2, orbs: [ELEMENT_ORBS[3]] },
          { count: campIdx === 3 ? 8 : 12, rarity: RARIDADES.NORMAL, level: 1, orbs: [] },
        ];
      } else if (alleyOpp.archetype === 'Baluarte de Placas') {
        tactics = 'DEFENSIVE_TANK';
        spells = ['escudo', 'prision'];
        orbsPool = [ELEMENT_ORBS[5], ELEMENT_ORBS[8]]; // Tierra (+6 HP), Metal (+7 HP)
        startingMana = 1;
        distribution = [
          { count: campIdx === 3 ? 5 : campIdx >= 1 ? 3 : 1, rarity: RARIDADES.LEGENDARIO, level: campIdx === 3 ? 4 : 3, orbs: [ELEMENT_ORBS[8]] },
          { count: 11, rarity: RARIDADES.EPICO, level: 3, orbs: [ELEMENT_ORBS[5]] },
          { count: campIdx === 3 ? 8 : 12, rarity: RARIDADES.RARO, level: 2, orbs: [] },
        ];
      } else if (alleyOpp.archetype === 'Mago de Escarcha') {
        tactics = 'SPELL_CONTROL';
        spells = ['rayo', 'escudo', 'tormenta', 'juicio'];
        orbsPool = [ELEMENT_ORBS[1], ELEMENT_ORBS[2]]; // Hielo (Congela), Rayo (+1 Movimiento)
        startingMana = campIdx === 3 ? 3 : 2;
        distribution = [
          { count: campIdx === 3 ? 6 : 4, rarity: RARIDADES.EPICO, level: 3, orbs: [ELEMENT_ORBS[1]] },
          { count: 12, rarity: RARIDADES.RARO, level: 2, orbs: [ELEMENT_ORBS[2]] },
          { count: campIdx === 3 ? 6 : 8, rarity: RARIDADES.NORMAL, level: 1, orbs: [] },
        ];
      } else {
        // Especialista en Trampas
        tactics = 'TRAP_AMBUSH';
        spells = ['rayo', 'ira_ra', 'vinculo'];
        orbsPool = [ELEMENT_ORBS[0], ELEMENT_ORBS[6]]; // Fuego (+3 HP/+1 ATK), Veneno (+3 ATK)
        startingMana = campIdx === 3 ? 2 : 1;
        distribution = [
          { count: campIdx === 3 ? 6 : 3, rarity: RARIDADES.EPICO, level: 3, orbs: [ELEMENT_ORBS[0]] },
          { count: 10, rarity: RARIDADES.RARO, level: 2, orbs: [ELEMENT_ORBS[6]] },
          { count: campIdx === 3 ? 8 : 11, rarity: RARIDADES.NORMAL, level: 1, orbs: [] },
        ];
      }
    } else {
      // Fallback estándar
      tactics = 'BALANCED';
      spells = ['rayo', 'escudo'];
      distribution = [
        { count: 4, rarity: RARIDADES.RARO, level: 2, orbs: [ELEMENT_ORBS[0]] },
        { count: 20, rarity: RARIDADES.NORMAL, level: 1, orbs: [] },
      ];
    }

    // Construir el mazo de 24 dados exactos
    const deck: DieData[] = [];
    let dieCounter = 1;
    distribution.forEach((group) => {
      for (let i = 0; i < group.count; i++) {
        if (deck.length >= 24) break;
        deck.push({
          id: `ai_die_${dieCounter}`,
          name: `${baseDieName} ${dieCounter}`,
          rarity: group.rarity,
          level: group.level,
          attachedOrbs: [...group.orbs],
          enMazo: true,
        });
        dieCounter++;
      }
    });

    // Rellenar hasta 24 si faltan dados
    while (deck.length < 24) {
      deck.push({
        id: `ai_die_${dieCounter}`,
        name: `${baseDieName} ${dieCounter}`,
        rarity: RARIDADES.NORMAL,
        level: 1,
        attachedOrbs: [],
        enMazo: true,
      });
      dieCounter++;
    }

    const aiDiff = getConfig('aiDifficulty');
    if (aiDiff <= 1) {
      startingMana = Math.max(0, startingMana - 1);
    } else if (aiDiff >= 3) {
      startingMana = Math.min(10, startingMana + 1);
    }

    return { deck, orbsPool, tactics, spells, startingMana };
  };

  // Setup battle board
  const [currentOpponentId, setCurrentOpponentId] = useState<string>('default');
  const lastChallengedNpcCoordRef = useRef<[number, number, number] | null>(null);

  // Variable de estado para el perfil táctico de la IA en la partida en curso
  const [currentAiTactic, setCurrentAiTactic] = useState<AiTactic>('BALANCED');
  const [currentAiSpells, setCurrentAiSpells] = useState<string[]>(['rayo']);
  const currentAiTacticRef = useRef<AiTactic>('BALANCED');
  const currentAiSpellsRef = useRef<string[]>(['rayo']);

  const getTournamentRosterForCampaign = (campaignIdx: number): TournamentContender[] => {
    if (campaignIdx === 1) return DUNGEON_LORDS_TOURNAMENT_ROSTER;
    if (campaignIdx === 2) return RECRUIT_TOURNAMENT_ROSTER;
    if (campaignIdx === 3) return SHADOW_THRONE_TOURNAMENT_ROSTER;
    return TOURNAMENT_CONTENDERS_ROSTER;
  };

  // Iniciar combate según la campaña activa y su fase
  const startCampaignEncounter = (specificOppId?: string, npcWorldPos?: [number, number, number]) => {
    // Comprobación obligatoria de los 24 dados equipados para poder batallar
    if (!checkDeckComplete('entrar a la batalla')) {
      return;
    }

    if (npcWorldPos) {
      lastChallengedNpcCoordRef.current = npcWorldPos;
      setLastCityPlayerPos(npcWorldPos);
    }

    let currentQualifiersRoster = ALLEY_OPPONENTS_ROSTER;
    if (activeCampaignIndex === 1) {
      currentQualifiersRoster = DUNGEON_LORDS_QUALIFIERS_ROSTER;
    } else if (activeCampaignIndex === 2) {
      currentQualifiersRoster = RECRUIT_PRACTICE_ROSTER;
    } else if (activeCampaignIndex === 3) {
      currentQualifiersRoster = SHADOW_THRONE_PURGE_ROSTER;
    }
    const currentTournamentRoster = getTournamentRosterForCampaign(activeCampaignIndex);

    if (campaignPhase === 'ALLEY') {
      let opponent: AlleyOpponent | undefined;
      if (specificOppId) {
        opponent = currentQualifiersRoster.find((o) => o.id === specificOppId);
      }
      if (!opponent) {
        const oppIdx = Math.min(alleyCurrentFight - 1, currentQualifiersRoster.length - 1);
        opponent = currentQualifiersRoster[oppIdx] || currentQualifiersRoster[0];
      }
      enterCombat(opponent.id, opponent);
    } else {
      // Fase 2: Gran Torneo del Legado / Torneo Élite / Torneo de Aficionados
      if (tournamentRound === 1 && !tournamentSavedSnapshot) {
        setTournamentSavedSnapshot({
          gold: playerGold,
          deck: JSON.parse(JSON.stringify(playerDeck)),
          orbs: JSON.parse(JSON.stringify(orbBank)),
          maxHp: maxPlayerHp,
          level: playerLevel,
          exp: playerExp,
          forgeInventory: { ...forgeInventory },
          achievements: JSON.parse(JSON.stringify(achievements)),
          tieredAchievements: JSON.parse(JSON.stringify(tieredAchievements)),
        });
      }
      const contendersInRound = currentTournamentRoster.filter((c) => c.phaseRound === tournamentRound);
      const contender = contendersInRound[0] || currentTournamentRoster[0];
      setActiveTournamentContender(contender);
      enterCombat(contender.id, undefined, contender);
    }
  };

  const enterCombat = (
    opponentId: string = 'default',
    alleyOpp?: AlleyOpponent,
    tournamentContender?: TournamentContender,
    options?: {
      isSurvival?: boolean;
      survivalDiff?: ColiseumDifficulty;
      survivalWave?: number;
      isGladiatorDuel?: boolean;
      duelRival?: TournamentContender;
      duelHandicap?: 'NORMAL' | 'HARD' | 'TITAN';
    }
  ) => {
    // Salvaguarda final: no se puede ingresar a la arena sin los 24 dados equipados
    if (!checkDeckComplete('combatir')) {
      return;
    }

    clearAiTimeouts();
    clearRollDiceTimeout();
    clearCombatFxTimeouts();
    clearCombatResolutionTimeouts();

    restoreTutorialEquippedSpells();
    setActiveHouseTutorial(null);
    isTutorialBattleActiveRef.current = false;

    const nextIsSurvival =
      options?.isSurvival !== undefined
        ? Boolean(options.isSurvival)
        : opponentId.startsWith('survival_wave_');
    const nextIsGladiator =
      options?.isGladiatorDuel !== undefined
        ? Boolean(options.isGladiatorDuel)
        : opponentId.startsWith('duel_');
    const nextGladiatorRival = nextIsGladiator
      ? options?.duelRival !== undefined
        ? options.duelRival
        : gladiatorDuelRival
      : null;

    if (!nextIsSurvival) {
      setIsSurvivalMode(false);
    } else {
      setIsSurvivalMode(true);
      if (options?.survivalDiff) setSurvivalDifficulty(options.survivalDiff);
      if (options?.survivalWave !== undefined) setSurvivalWave(options.survivalWave);
    }

    if (!nextIsGladiator) {
      setIsGladiatorDuelMode(false);
      setGladiatorDuelRival(null);
    } else {
      setIsGladiatorDuelMode(true);
      if (nextGladiatorRival) setGladiatorDuelRival(nextGladiatorRival);
      if (options?.duelHandicap) setGladiatorDuelHandicap(options.duelHandicap);
    }
    if (!tournamentContender || nextIsGladiator || nextIsSurvival) {
      setActiveTournamentContender(null);
    }

    const setup = prepareCombatSetup(opponentId, alleyOpp, tournamentContender, options, {
      playerDeck: playerDeckRef.current.length > 0 ? playerDeckRef.current : playerDeck,
      maxPlayerHp,
      masterAtkBonus,
      masterStartingManaBonus,
      masterShieldChargeLevel,
      masterCustomization,
      activeCampaignIndex,
      survivalWave,
      survivalDifficulty,
      isSurvivalMode: nextIsSurvival,
      isGladiatorDuelMode: nextIsGladiator,
      gladiatorDuelRival: nextGladiatorRival,
      gladiatorDuelHandicap: options?.duelHandicap || gladiatorDuelHandicap,
      generateAiCustomDeckAndProfile,
    });

    setCurrentOpponentId(opponentId);
    setCombatLock(false);
    setJustCrownedChampion(false);
    setLastVictoryGoldReward(null);
    setFloatingTexts([]);
    setSpellVFXList([]);
    consecutiveWhiffsRef.current = 0;
    setConsecutiveWhiffs(0);
    setLastPlayerMoveAction(null);

    setCurrentAiTactic(setup.aiTactics);
    currentAiTacticRef.current = setup.aiTactics;
    setCurrentAiSpells(setup.aiSpells);
    currentAiSpellsRef.current = setup.aiSpells;

    setDrawPile(setup.shuffledPlayerDeck);
    drawPileRef.current = setup.shuffledPlayerDeck;
    setUsedPile([]);
    usedPileRef.current = [];
    setAiDrawPile(setup.shuffledAiDeck);
    aiDrawPileRef.current = setup.shuffledAiDeck;
    setAiUsedPile([]);
    aiUsedPileRef.current = [];

    const emptyFichas = {
      J1: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      J2: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    };
    fichasRef.current = emptyFichas;
    setFichas(emptyFichas);
    bankedCrestsJ1Ref.current = [];
    setBankedCrestsJ1([]);
    setSelectBankedCrestModal(null);

    jugadorActivoRef.current = 1;
    setJugadorActivo(1);
    isAiRunningRef.current = false;
    setDadosLanzados(false);
    setResultadoDados([]);
    selectedUnitIdRef.current = null;
    setSelectedUnitId(null);
    cellMovRef.current = [];
    setCellMov([]);
    cellAtqRef.current = [];
    setCellAtq([]);
    cellInvRef.current = [];
    setCellInv([]);
    invocacionPendienteRef.current = false;
    setInvocacionPendiente(false);
    setNivelPendiente(0);
    setMaestriaPendiente(1);
    setHechizoEnEspera(null);
    setSpellToConfirm(null);
    setModalEleccionDoble(null);
    setModalEscalera(null);
    setModalLimiteCriaturas(null);
    setAscendedCutscene(null);
    setShowRetireConfirm(false);
    setShowDefeatResultModal(false);
    esTransmutacionDirectaRef.current = false;
    setEsTransmutacionDirecta(false);
    pendingSummonOrbsRef.current = [];
    catalystBonusesRef.current = { hp: 0, atk: 0 };
    updateManaSync({ J1: masterStartingManaBonus, J2: setup.aiStartingMana });

    hasTriggeredGladiatorBarkRef.current = false;
    setEmergentGladiatorBark(null);
    setSpecialRunes(setup.specialRunes);

    setUnits(setup.initialUnits);
    unitsRef.current = setup.initialUnits;
    setCombatLog([]);

    setCombatLoadingMeta({
      title: setup.battleTitle,
      subtitle: setup.battleSubtitle,
      accent: setup.battleAccent,
      bgUrl: setup.battleBgUrl,
      bgCandidates: setup.battleBgCandidates,
    });
    setIsCombatBoardReady(isCombatEnvironmentLoadSettled());
    setIsCombatLoadingActive(true);

    setCurrentScreen('COMBAT');
    setGameState((prev) => ({ ...prev, status: 'PLAYING' }));
    if (sdk) sdk.startGame();
    gameAudio.playConfirmSelect();

    if (tournamentContender) {
      triggerBattleMessage(`¡${tournamentContender.difficulty.toUpperCase()}: ${tournamentContender.name.toUpperCase()}!`, '#f59e0b');
    } else if (alleyOpp) {
      triggerBattleMessage(`¡CALLEJUELA (${alleyCurrentFight}/12): ${alleyOpp.name.toUpperCase()} [${alleyOpp.archetype}]!`, alleyOpp.avatarColor);
    } else {
      triggerBattleMessage('¡COMIENZA EL COMBATE DE ENTRENAMIENTO!', '#38bdf8');
    }
  };

  // Draw 3 dice from combat deck - STRICTLY ONCE PER TURN
  const rollTurnDice = () => {
    if (dadosLanzados || rollingDiceAnimation || jugadorActivoRef.current !== 1 || isCombatActionLockedRef.current) {
      if (dadosLanzados) {
        triggerBattleMessage('Ya has lanzado los dados en este turno (1 tirada por turno).', '#fbbf24');
      }
      return;
    }
    setCombatLock(true);
    triggerHapticFeedback(25);
    gameAudio.playCrispClick();
    setRollingDiceAnimation(true);

    const tAudio1 = window.setTimeout(() => {
      // Reproducir sonido de impacto al rebotar físicamente contra la arena
      gameAudio.playJumpLandingThud();
    }, 850);

    const tAudio2 = window.setTimeout(() => {
      // Segundo rebote intermedio
      gameAudio.playJumpLandingThud();
    }, 1700);
    rollAudioTimeoutsRef.current.push(tAudio1, tAudio2);

    rollDiceTimeoutRef.current = window.setTimeout(() => {
      let currentDraw = [...drawPileRef.current];
      let currentUsed = [...usedPileRef.current];

      const drawn = currentDraw.splice(0, 3);
      if (drawn.length < 3 && currentUsed.length > 0) {
        triggerBattleMessage('¡Mazo agotado! Barajando descartes...', '#38bdf8');
        currentDraw = [...currentUsed];
        currentUsed = [];
        // Shuffle
        for (let i = currentDraw.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [currentDraw[i], currentDraw[j]] = [currentDraw[j], currentDraw[i]];
        }
        const needed = 3 - drawn.length;
        drawn.push(...currentDraw.splice(0, needed));
      }

      const drawnFromPiles = [...drawn];
      // Protección ante el caso borde de tener < 3 dados totales entre pila de robo y descarte
      if (drawn.length < 3) {
        const activeDeckFallback = playerDeckRef.current.filter((d) => d.enMazo);
        const fallbackPool = activeDeckFallback.length > 0 ? activeDeckFallback : playerDeckRef.current;
        let padIdx = 0;
        while (drawn.length < 3) {
          const candidate =
            fallbackPool.length > 0
              ? fallbackPool[padIdx % fallbackPool.length]
              : {
                  id: `d_fallback_${Date.now()}_${padIdx}`,
                  name: `Dado Auxiliar ${padIdx + 1}`,
                  rarity: RARIDADES.NORMAL,
                  level: 1,
                  attachedOrbs: [],
                  enMazo: true,
                };
          drawn.push(candidate);
          padIdx++;
        }
      }

      currentUsed.push(...drawnFromPiles);
      setDrawPile(currentDraw);
      drawPileRef.current = currentDraw;
      setUsedPile(currentUsed);
      usedPileRef.current = currentUsed;

    // Si es un tutorial con dados forzados pedagógicos (ej. parejitas o triples específicos de lección),
    // aplicamos esa tirada exacta para que el jugador siempre pueda cumplir la indicación sin atascos de azar
    const currentTutorial = activeHouseTutorialRef.current;
    let d1 = currentTutorial?.forcedDice ? currentTutorial.forcedDice[0] : rollDieWithCampaignRng(activeCampaignIndex);
    let d2 = currentTutorial?.forcedDice ? currentTutorial.forcedDice[1] : rollDieWithCampaignRng(activeCampaignIndex);
    let d3 = currentTutorial?.forcedDice ? currentTutorial.forcedDice[2] : rollDieWithCampaignRng(activeCampaignIndex);

    // SISTEMA DE EQUILIBRIO DE DADOS NATURAL Y RITMO TÁCTICO:
      // Probabilidad natural de 3 dados de 6 caras:
      // - Triples idénticos naturales (1-1-1 a 6-6-6): ~2.78% (1 de cada 36)
      // - Dobles naturales (pareja): ~41.67% (5 de cada 12 turnos)
      // - Sin pareja natural (gana +1 Maná): ~55.56% (5 de cada 9 turnos)
      //
      // SISTEMA DE PITY PROGRESSIVO SUAVE:
      // Si el jugador o la IA pasan 3 o más turnos consecutivos sin conseguir pareja (acumulando maná),
      // se activa una resonancia protectora para evitar rachas de sequía excesivas.
      const naturalTriple = d1 === d2 && d2 === d3;
      const naturalDoble = d1 === d2 || d1 === d3 || d2 === d3;
      const naturalSorted = [d1, d2, d3].sort((a, b) => a - b);
      const naturalEscalera = naturalSorted[0] + 1 === naturalSorted[1] && naturalSorted[1] + 1 === naturalSorted[2];

      if (!naturalTriple && !naturalDoble && !naturalEscalera) {
        if (consecutiveWhiffsRef.current >= 3) {
          // Tras 3 turnos seguidos sin pareja ni escalera, se ayuda alineando una pareja
          d2 = d1;
          setConsecutiveWhiffs(0);
        } else {
                  setConsecutiveWhiffs((prev) => prev + 1);
        }
      } else {
        setConsecutiveWhiffs(0);
      }

      const rollVals = [d1, d2, d3];

      // Los dados se categorizan por rareza y ranuras para orbes (Normal, Raro, Épico, Legendario)
      const results: RolledDieResult[] = rollVals.map((val, idx) => {
        const die = drawn[idx];
        const attached = die?.attachedOrbs || [];

        return {
          valor: val,
          tipo: `${die?.rarity?.name || 'Normal'} (${attached.length}/${die?.rarity?.slots || 0} ranuras)`,
          emoji: (die?.rarity?.slots || 0) > 0 ? '💎' : '🎲',
          color: die?.rarity?.color || '#94a3b8',
          dieRef: die,
        };
      });

      setResultadoDados(results);
      setDadosLanzados(true);
      setRollingDiceAnimation(false);
      gameAudio.playPowerupChime();
      checkTutorialStepProgression('ROLL_DICE');

      // Reglas de invocación:
      // Cualquier pareja de dados (d1=d2, d1=d3, o d2=d3) fija el Nivel de la Criatura invocada.
      // El tercer dado restante define la Maestría / Rango extra (1: Iniciado, 2: Novato, 3: Veterano, 4: Élite, 5: Experto, 6: Maestro).
      // EXCEPCIÓN SAGRADA: Tirada Triple Idéntica (1-1-1, 2-2-2, 3-3-3, 4-4-4, 5-5-5, 6-6-6) desata al Titán Ascendido correspondiente.
      // Las tiradas de Titanes Ascendidos son eventos épicos y raros (probabilidad matemática natural de 1 entre 36 = ~2.7%).
      // Si todos son distintos (sin pareja), no hay invocación este turno: maniobra o usa fichas guardadas.
      // Las variables d1, d2, d3 ya están normalizadas en rollVals
      const finalD1 = rollVals[0];
      const finalD2 = rollVals[1];
      const finalD3 = rollVals[2];

      const sortedRolls = [...rollVals].sort((a, b) => a - b);
      const rollAnalysis = analyzeDiceCombination([finalD1, finalD2, finalD3]);
      const esTriple = rollAnalysis.outcome === 'TRIPLE';
      const esDoble = rollAnalysis.outcome === 'DOUBLE';
      const esEscalera = rollAnalysis.outcome === 'LADDER';
      const nivelBase = rollAnalysis.level;
      const maestria = rollAnalysis.mastery;

      // Extraer orbes y bonificadores de forja ÚNICAMENTE de los dados que formaron la combinación invocadora:
      // - Triple: participan los 3 dados.
      // - Pareja (Doble): participan únicamente los 2 dados emparejados (se excluye el 3er dado de maestría).
      let summoningDice: DieData[] = [];
      if (esTriple) {
        summoningDice = drawn.filter(Boolean);
      } else if (esDoble) {
        if (finalD1 === finalD2) {
          summoningDice = [drawn[0], drawn[1]].filter(Boolean);
        } else if (finalD1 === finalD3) {
          summoningDice = [drawn[0], drawn[2]].filter(Boolean);
        } else if (finalD2 === finalD3) {
          summoningDice = [drawn[1], drawn[2]].filter(Boolean);
        }
      }

      const orbsFromSummoningDice: Orb[] = [];
      let catalystBonusHp = 0;
      let catalystBonusAtk = 0;
      const seenSummoningDieIds = new Set<string>();
      summoningDice.forEach((d) => {
        if (d.id && seenSummoningDieIds.has(d.id)) return;
        if (d.id) seenSummoningDieIds.add(d.id);
        if (d.attachedOrbs && d.attachedOrbs.length > 0) {
          orbsFromSummoningDice.push(...d.attachedOrbs);
        }
        if (d.bonusHp) catalystBonusHp += d.bonusHp;
        if (d.bonusAtk) catalystBonusAtk += d.bonusAtk;
      });
      pendingSummonOrbsRef.current = orbsFromSummoningDice;
      catalystBonusesRef.current = { hp: catalystBonusHp, atk: catalystBonusAtk };

      // Conteo actual de criaturas en el campo para el jugador activo (excluyendo al Rey)
      const liveUnits = unitsRef.current.length > 0 ? unitsRef.current : units;
      const currentMinionCount = liveUnits.filter((u) => u.dueño === 1 && !u.esMaestra).length;
      const LIMIT_MINIONS = 6;

      if (esTriple) {
        // Excepción Sagrada: Triples invocan a los Titanes Ascendidos
        const titanId = Math.min(6, Math.max(1, finalD1));
        const titan = ASCENDED_TITANS.find((t) => t.id === titanId) || ASCENDED_TITANS[0];

        setAchievements((prev) =>
          prev.map((a) => (a.id === 'ach_triple' ? { ...a, progress: 1, isUnlocked: true } : a))
        );

        triggerHapticFeedback([40, 60, 40]);

        // Progreso de contrato de cazador: Despertar del Titán
        setDailyContracts((prev) =>
          prev.map((c) =>
            c.id === 'contract_titan_awakening'
              ? { ...c, currentCount: Math.min(c.targetCount, c.currentCount + 1), isCompleted: true }
              : c
          )
        );

        // Disparar inmediatamente la animación cinemática y fanfarria para el jugador al obtener el triple
        gameAudio.playVictoryFanfare();
        setAscendedCutscene({
          titan,
          ownerName: playerName,
          isPlayer: true,
        });

        // Verificar límite de 6 criaturas en el campo o ausencia de casillas libres alrededor del Rey
        const availableZones = getAvailableInvocationZones(liveUnits, 1);
        if (currentMinionCount >= LIMIT_MINIONS || availableZones.length === 0) {
          const reason = currentMinionCount >= LIMIT_MINIONS ? 'MAX_MINIONS' : 'NO_FREE_CELLS';
          setModalLimiteCriaturas({ lvl: 7, maestria: titanId, esAscendido: true, reason });
          triggerBattleMessage(
            reason === 'MAX_MINIONS'
              ? `¡LÍMITE DE 6 CRIATURAS! Canaliza el poder del Titán en Maná (+3 Maná)`
              : `¡SIN CASILLAS LIBRES JUNTO AL SOBERANO! Canaliza el poder del Titán en Maná (+3 Maná)`,
            '#fbbf24'
          );
        } else {
          setNivelPendiente(7);
          setMaestriaPendiente(titanId);
          invocacionPendienteRef.current = true;
          setInvocacionPendiente(true);
          markInvocationZones(7);
          triggerBattleMessage(`¡TIRADA TRIPLE ${finalD1}-${finalD2}-${finalD3}! ¡DESPIERTA: ${titan.name.toUpperCase()}!`, titan.color);
        }
      } else if (esDoble) {
        // Doble obtenido: La pareja define el nivel de la criatura y el 3er dado otorga el rango de Maestría
        const tier = MASTERY_TIERS[maestria] || MASTERY_TIERS[1];

        // Verificar límite de 6 criaturas en el campo
        if (currentMinionCount >= LIMIT_MINIONS) {
          setModalLimiteCriaturas({ lvl: nivelBase, maestria, esAscendido: false });
          triggerBattleMessage(`¡LÍMITE DE 6 CRIATURAS! Debes Guardar o Convertir en Maná`, '#fbbf24');
        } else {
          setModalEleccionDoble({ lvl: nivelBase, maestria });
          triggerBattleMessage(`¡DOBLE (${nivelBase}-${nivelBase})! Criatura Lv.${nivelBase} con Rango ${tier.rango} (3er Dado: ${maestria})`, tier.color);
        }
      } else if (esEscalera) {
        // ¡ESCALERA TÁCTICA OBTENIDA! (1-2-3, 2-3-4, 3-4-5 o 4-5-6)
        pendingSummonOrbsRef.current = [];
        catalystBonusesRef.current = { hp: 0, atk: 0 };
        gameAudio.playVictoryFanfare();
        triggerHapticFeedback([30, 40, 50]);
        setModalEscalera({ d1: sortedRolls[0], d2: sortedRolls[1], d3: sortedRolls[2] });
        triggerBattleMessage(`✨ ¡ESCALERA TÁCTICA (${sortedRolls[0]}-${sortedRolls[1]}-${sortedRolls[2]})! Elige tu recompensa marcial`, '#fbbf24');
      } else {
        // Tirada sin pareja ni escalera: recompensa con +1 Maná astral
        pendingSummonOrbsRef.current = [];
        catalystBonusesRef.current = { hp: 0, atk: 0 };
        const nextMana = updateManaSync((prev) => ({
          ...prev,
          J1: Math.min(10, prev.J1 + 1),
        }));
        if (nextMana.J1 >= 10) {
          syncAchievementsNow({ manaJ1: nextMana.J1 });
        }
        gameAudio.playPowerupChime();
        triggerBattleMessage(`Tirada: ${finalD1}, ${finalD2}, ${finalD3} (Sin pareja). ¡Has ganado +1 de Maná!`, '#38bdf8');
      }
      setCombatLock(false);
    }, 2800);
  };

  const getAvailableInvocationZones = (liveUnits: UnitData[], activePlayer: 1 | 2): number[] => {
    const master = liveUnits.find((u) => u.dueño === activePlayer && u.esMaestra);
    if (!master) return [];
    const rivalGravityMasters = liveUnits.filter(
      (u) => u.dueño !== activePlayer && u.esMaestra && (u.gravityTurns || 0) > 0
    );
    const invocables: number[] = [];
    Object.keys(HEX_MAP).forEach((key) => {
      const cellId = parseInt(key, 10);
      const isOccupied = liveUnits.some((u) => u.posicion === cellId);
      const blockedByGravity = rivalGravityMasters.some((gm) => getHexDistance(gm.posicion, cellId) === 1);
      if (!isOccupied && !blockedByGravity && getHexDistance(master.posicion, cellId) === 1) {
        invocables.push(cellId);
      }
    });
    return invocables;
  };

  const markInvocationZones = (_lvl: number): number[] => {
    const invocables = getAvailableInvocationZones(unitsRef.current, jugadorActivoRef.current);
    cellInvRef.current = invocables;
    setCellInv(invocables);
    return invocables;
  };

  const bankLevelCrest = () => {
    // Las fichas transmutadas son de invocación directa y no pueden guardarse
    if (esTransmutacionDirectaRef.current) {
      gameAudio.playErrorBuzz();
      triggerBattleMessage('Las fichas transmutadas no pueden guardarse en la reserva.', '#ef4444');
      return;
    }

    const activeP = jugadorActivoRef.current;
    const playerKey = `J${activeP}` as 'J1' | 'J2';
    if (nivelPendiente === 7) {
      const nextMana = updateManaSync((prev) => ({
        ...prev,
        [playerKey]: Math.min(10, prev[playerKey] + 3),
      }));
      if (activeP === 1 && nextMana.J1 >= 10) {
        syncAchievementsNow({ manaJ1: nextMana.J1 });
      }
      gameAudio.playPowerupChime();
      triggerBattleMessage('⚡ ¡Poder del Titán canalizado (+3 Maná)!', '#fbbf24');
      cancelInvocation();
      checkTutorialStepProgression('SUMMON');
      return;
    }

    if (nivelPendiente > 0 && nivelPendiente < 7) {
      const stats = calculateCreatureStats(nivelPendiente, maestriaPendiente);
      const refList = activeP === 1 ? CODEX_J1_CREATURES : CODEX_J2_CREATURES;
      const catalogEntry = refList.find((c) => c.nivel === nivelPendiente);
      const creatureTitle = catalogEntry ? catalogEntry.nombre : `Guardián L${nivelPendiente}`;

      // Guardar ficha individual con sus orbes preservados intactos
      if (activeP === 1) {
        const newBankedItem: BankedCrestItem = {
          id: 'bcrest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          level: nivelPendiente,
          maestria: maestriaPendiente,
          rangoNombre: stats.rangoNombre,
          orbs: [...pendingSummonOrbsRef.current],
          name: creatureTitle,
          catalystHp: catalystBonusesRef.current.hp,
          catalystAtk: catalystBonusesRef.current.atk,
        };
        setBankedCrestsJ1((prev) => [...prev, newBankedItem]);
      }

      setFichas((prev) => ({
        ...prev,
        [playerKey]: {
          ...prev[playerKey],
          [nivelPendiente]: (prev[playerKey][nivelPendiente] || 0) + 1,
        },
      }));
      // Guardar criatura otorga +1 Maná astral al jugador
      const nextBankedCount =
        activeP === 1
          ? Object.values(fichasRef.current.J1).reduce((acc, c) => acc + c, 0) + 1
          : Object.values(fichasRef.current.J1).reduce((acc, c) => acc + c, 0);
      const nextMana = updateManaSync((prev) => ({
        ...prev,
        [playerKey]: Math.min(10, prev[playerKey] + 1),
      }));
      if (activeP === 1 && (nextBankedCount >= 5 || nextMana.J1 >= 10)) {
        syncAchievementsNow({ totalBankedCount: nextBankedCount, manaJ1: nextMana.J1 });
      }
      gameAudio.playCoinPickup();
      const orbsCount = pendingSummonOrbsRef.current.length;
      triggerBattleMessage(
        `Ficha Lv.${nivelPendiente} guardada (+1 Maná obtenido)${orbsCount > 0 ? ` con ${orbsCount} orbe(s) preservado(s)` : ''}`,
        '#10b981'
      );
    }
    cancelInvocation();
    checkTutorialStepProgression('SUMMON');
  };

  const cancelInvocation = () => {
    const shouldRefundTransmute =
      esTransmutacionDirectaRef.current &&
      invocacionPendienteRef.current &&
      cellInvRef.current.length === 0;
    cellInvRef.current = [];
    setCellInv([]);
    invocacionPendienteRef.current = false;
    setInvocacionPendiente(false);
    setNivelPendiente(0);
    setMaestriaPendiente(1);
    setModalEleccionDoble(null);
    setModalEscalera(null);
    setModalLimiteCriaturas(null);
    esTransmutacionDirectaRef.current = false;
    setEsTransmutacionDirecta(false);
    pendingSummonOrbsRef.current = [];
    catalystBonusesRef.current = { hp: 0, atk: 0 };
    if (shouldRefundTransmute) {
      updateManaSync((prev) => ({ ...prev, J1: Math.min(10, prev.J1 + 4) }));
      gameAudio.playConfirmSelect();
      triggerBattleMessage('↩️ Invocación cancelada sin casillas libres: +4 Maná reembolsado.', '#38bdf8');
    }
  };

  // Mecánica Dinámica de Suerte Táctica / Resonancia Arcana (Dice Pity System):
  // Lleva el conteo de tiradas consecutivas sin obtener pareja ni triple.
  // Cuando se acumulan tiradas sin invocación, la probabilidad de forzar una pareja o triple aumenta dinámicamente.
  const [consecutiveWhiffs, setConsecutiveWhiffs] = useState<number>(0);
  const consecutiveWhiffsRef = useRef<number>(0);
  consecutiveWhiffsRef.current = consecutiveWhiffs;

  const [isStatsModalOpen, setIsStatsModalOpen] = useState<boolean>(false);
  const [showDefeatResultModal, setShowDefeatResultModal] = useState<boolean>(false);
  const [showSecretUnlockModal, setShowSecretUnlockModal] = useState<boolean>(false);

  // Modal para cuando se derrota al rival 12 y se desbloquea el Coliseo / Gran Arena
  const [showColiseumUnlockedHub, setShowColiseumUnlockedHub] = useState<boolean>(false);

  // Modal y animación cinemática para el despertar de los Titanes Ascendidos
  const [ascendedCutscene, setAscendedCutscene] = useState<{
    titan: typeof ASCENDED_TITANS[0];
    ownerName: string;
    isPlayer: boolean;
  } | null>(null);

  const handleChooseInvocar = () => {
    if (!modalEleccionDobleRef.current || invocacionPendienteRef.current) return;
    const availableZones = getAvailableInvocationZones(unitsRef.current, 1);
    if (availableZones.length === 0) {
      gameAudio.playErrorBuzz();
      triggerBattleMessage(
        '⚠️ No hay casillas libres junto a tu Soberano (ocupadas o bloqueadas). Usa "Guardar Ficha" (+1 Maná).',
        '#f59e0b'
      );
      return;
    }
    const { lvl, maestria } = modalEleccionDobleRef.current;
    setModalEleccionDoble(null);
    const stats = calculateCreatureStats(lvl, maestria);
    setNivelPendiente(lvl);
    setMaestriaPendiente(maestria);
    invocacionPendienteRef.current = true;
    setInvocacionPendiente(true);
    markInvocationZones(lvl);
    gameAudio.playConfirmSelect();
    triggerBattleMessage(`Selecciona casilla dorada: Invocando Criatura Lv.${lvl} [${stats.rangoNombre}]`, stats.rangoColor);
  };

  const handleChooseGuardar = () => {
    if (!modalEleccionDobleRef.current) return;
    const { lvl, maestria } = modalEleccionDobleRef.current;
    setModalEleccionDoble(null);
    const activeP = jugadorActivoRef.current;
    if (lvl > 0 && lvl < 7) {
      const stats = calculateCreatureStats(lvl, maestria);
      const refList = activeP === 1 ? CODEX_J1_CREATURES : CODEX_J2_CREATURES;
      const catalogEntry = refList.find((c) => c.nivel === lvl);
      const creatureTitle = catalogEntry ? catalogEntry.nombre : `Guardián L${lvl}`;

      if (activeP === 1) {
        const newBankedItem: BankedCrestItem = {
          id: 'bcrest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          level: lvl,
          maestria,
          rangoNombre: stats.rangoNombre,
          orbs: [...pendingSummonOrbsRef.current],
          name: creatureTitle,
          catalystHp: catalystBonusesRef.current.hp,
          catalystAtk: catalystBonusesRef.current.atk,
        };
        setBankedCrestsJ1((prev) => [...prev, newBankedItem]);
      }

      const playerKey = `J${activeP}` as 'J1' | 'J2';
      setFichas((prev) => ({
        ...prev,
        [playerKey]: {
          ...prev[playerKey],
          [lvl]: (prev[playerKey][lvl] || 0) + 1,
        },
      }));
      // Guardar criatura otorga +1 Maná astral
      const nextBankedCount =
        activeP === 1
          ? Object.values(fichasRef.current.J1).reduce((acc, c) => acc + c, 0) + 1
          : Object.values(fichasRef.current.J1).reduce((acc, c) => acc + c, 0);
      const nextMana = updateManaSync((prev) => ({
        ...prev,
        [playerKey]: Math.min(10, prev[playerKey] + 1),
      }));
      if (activeP === 1 && (nextBankedCount >= 5 || nextMana.J1 >= 10)) {
        syncAchievementsNow({ totalBankedCount: nextBankedCount, manaJ1: nextMana.J1 });
      }
      gameAudio.playCoinPickup();
      const orbsCount = pendingSummonOrbsRef.current.length;
      triggerBattleMessage(
        `Ficha Lv.${lvl} guardada (+1 Maná obtenido)${orbsCount > 0 ? ` con ${orbsCount} orbe(s) preservado(s)` : ''}`,
        '#10b981'
      );
    }
    setModalEleccionDoble(null);
    cancelInvocation();
    checkTutorialStepProgression('SUMMON');
  };

  // Spend a banked level crest to summon that creature on any turn
  const summonBankedCrest = (lvl: number) => {
    if (
      isCombatActionLockedRef.current ||
      isAiRunningRef.current ||
      jugadorActivoRef.current !== 1 ||
      invocacionPendienteRef.current
    ) {
      return;
    }
    const liveUnits = unitsRef.current;
    const currentMinionCount = liveUnits.filter((u) => u.dueño === 1 && !u.esMaestra).length;
    if (currentMinionCount >= 6) {
      triggerBattleMessage('¡Límite alcanzado! No puedes tener más de 6 criaturas en el campo.', '#f87171');
      return;
    }
    const available = fichasRef.current.J1[lvl] || 0;
    if (available <= 0) {
      triggerBattleMessage(`No tienes fichas de Nivel ${lvl} guardadas.`, '#f87171');
      return;
    }

    // Filtrar fichas guardadas específicas de este nivel usando ref vivo
    const matchingCrests = bankedCrestsJ1Ref.current.filter((c) => c.level === lvl);

    // Si hay más de 1 ficha guardada del mismo nivel, abrir selector para elegir cuál invocar
    if (matchingCrests.length > 1) {
      setSelectBankedCrestModal({
        level: lvl,
        crests: matchingCrests,
      });
      gameAudio.playCrispClick();
      return;
    }

    // Si solo hay 1 ficha o ninguna en el registro detallado, invocar directamente
    const crestToUse = matchingCrests[0];
    executeSummonFromBank(lvl, crestToUse);
  };

  const executeSummonFromBank = (lvl: number, crestItem?: BankedCrestItem) => {
    if (
      invocacionPendienteRef.current ||
      isCombatActionLockedRef.current ||
      isAiRunningRef.current ||
      jugadorActivoRef.current !== 1
    ) {
      return;
    }
    if ((fichasRef.current.J1[lvl] || 0) <= 0) {
      setSelectBankedCrestModal(null);
      return;
    }
    const availableZones = getAvailableInvocationZones(unitsRef.current, 1);
    if (availableZones.length === 0) {
      gameAudio.playErrorBuzz();
      triggerBattleMessage('⚠️ No hay casillas libres junto a tu Soberano para invocar.', '#f59e0b');
      setSelectBankedCrestModal(null);
      return;
    }
    invocacionPendienteRef.current = true;
    fichasRef.current = {
      ...fichasRef.current,
      J1: {
        ...fichasRef.current.J1,
        [lvl]: Math.max(0, (fichasRef.current.J1[lvl] || 0) - 1),
      },
    };
    // Deduct one banked crest
    setFichas((prev) => ({
      ...prev,
      J1: {
        ...prev.J1,
        [lvl]: Math.max(0, (prev.J1[lvl] || 0) - 1),
      },
    }));

    // Si se usó un elemento específico, removerlo del registro
    if (crestItem) {
      setBankedCrestsJ1((prev) => {
        const idx = prev.findIndex((c) => c.id === crestItem.id);
        if (idx !== -1) {
          const next = [...prev];
          next.splice(idx, 1);
          return next;
        }
        return prev;
      });
    }

    // Asignar los orbes preservados en la ficha guardada (respetando si se guardó sin orbes / Stats Base)
    if (crestItem) {
      pendingSummonOrbsRef.current = [...(crestItem.orbs || [])];
    } else {
      // Fallback cuando la ficha en reserva no tiene registro detallado:
      // Los dados del mazo se inicializan en level: 1 y pueden sacar cualquier cara 1..6,
      // por lo que priorizamos coincidencia de nivel si existe y si no heredamos de hasta 2 dados activos (pareja) respetando todas sus ranuras.
      const liveDeck = playerDeckRef.current.length > 0 ? playerDeckRef.current : playerDeck;
      const activeDiceWithOrbs = liveDeck.filter((d) => d.enMazo && d.attachedOrbs.length > 0);
      const levelMatchedDice = activeDiceWithOrbs.filter((d) => d.level === lvl);
      const fallbackDice = levelMatchedDice.length > 0 ? levelMatchedDice : activeDiceWithOrbs;
      if (fallbackDice.length > 0) {
        const inheritedOrbs: Orb[] = [];
        fallbackDice.slice(0, 2).forEach((d) => inheritedOrbs.push(...d.attachedOrbs));
        pendingSummonOrbsRef.current = inheritedOrbs;
      } else {
        pendingSummonOrbsRef.current = [];
      }
    }
    catalystBonusesRef.current = {
      hp: crestItem?.catalystHp || 0,
      atk: crestItem?.catalystAtk || 0,
    };

    setNivelPendiente(lvl);
    setMaestriaPendiente(crestItem?.maestria || 1);
    setInvocacionPendiente(true);
    markInvocationZones(lvl);
    gameAudio.playConfirmSelect();
    const orbsInfo = pendingSummonOrbsRef.current.length > 0 ? ` (con ${pendingSummonOrbsRef.current.length} orbe(s))` : '';
    triggerBattleMessage(`¡Ficha Lv.${lvl} activada${orbsInfo}! Selecciona una casilla dorada junto a tu Rey`, '#fbbf24');
    setSelectBankedCrestModal(null);
  };

  // Botón de Maná para invocar por transmutación directa
  // CONDICIONES TÁCTICAS:
  // 1. Requiere 4 de Maná acumulado.
  // 2. Solo se activa si el enemigo tiene más unidades en el campo que el jugador (medida de remontada táctica).
  // 3. Posee un porcentaje de fallo del 30% (70% de éxito). Si falla, consume 2 de Maná por dispersión de energía arcana.
  // REGLAS ESTRICTAS DE TRANSMUTACIÓN:
  // - El nivel de la criatura transmutada es ALEATORIO (Lv.1 a Lv.4).
  // - Aparece estrictamente con sus ESTADÍSTICAS BASES (sin orbes asignados).
  // - Es una invocación directa de campo: NO puede guardarse en la reserva de fichas.
  const [esTransmutacionDirecta, setEsTransmutacionDirecta] = useState(false);
  const esTransmutacionDirectaRef = useRef(false);
  esTransmutacionDirectaRef.current = esTransmutacionDirecta;

  const summonWithMana = () => {
    if (
      isCombatActionLockedRef.current ||
      isAiRunningRef.current ||
      jugadorActivoRef.current !== 1 ||
      invocacionPendienteRef.current
    ) {
      return;
    }

    const liveUnits = unitsRef.current.length > 0 ? unitsRef.current : units;
    const playerUnitsCount = liveUnits.filter((u) => u.dueño === 1 && !u.esMaestra).length;
    const enemyUnitsCount = liveUnits.filter((u) => u.dueño === 2 && !u.esMaestra).length;

    if (enemyUnitsCount <= playerUnitsCount) {
      triggerBattleMessage('Solo disponible cuando el enemigo te supera en número de unidades.', '#f87171');
      gameAudio.playErrorBuzz();
      return;
    }

    if (playerUnitsCount >= 6) {
      triggerBattleMessage('¡Límite alcanzado! No puedes tener más de 6 criaturas en el campo.', '#f87171');
      gameAudio.playErrorBuzz();
      return;
    }

    if (manaRef.current.J1 < 4) {
      triggerBattleMessage('Requiere 4 de Maná para transmutar e invocar directamente.', '#f87171');
      gameAudio.playErrorBuzz();
      return;
    }

    // Validar que haya al menos una casilla libre adyacente al Rey antes de arriesgar o cobrar maná
    const availableZones = getAvailableInvocationZones(liveUnits, 1);
    if (availableZones.length === 0) {
      triggerBattleMessage('⚠️ No hay casillas libres junto a tu Soberano para invocar (ocupadas o bloqueadas).', '#f59e0b');
      gameAudio.playErrorBuzz();
      return;
    }

    // Porcentaje de fallo del 30% (70% de éxito de transmutación arcana)
    const successRate = activeHouseTutorial ? 1.0 : 0.70;
    const roll = Math.random();

    if (roll > successRate) {
      // Fallo de transmutación: se pierde la mitad del maná (2 de Maná) por disipación inestable
      updateManaSync((prev) => ({ ...prev, J1: Math.max(0, prev.J1 - 2) }));
      gameAudio.playErrorBuzz();
      spawnFloatingText('💥 TRANSMUTACIÓN FALLIDA (-2M)', liveUnits.find((u) => u.dueño === 1 && u.esMaestra)?.posicion || 0, '#f87171');
      triggerBattleMessage('💥 ¡Inestabilidad Arcana! La transmutación falló (se perdieron 2 de Maná).', '#f87171');
      return;
    }

    // Éxito en la transmutación: NIVEL ALEATORIO (Lv.1 a Lv.4), rango base (Maestría 1 = Iniciado), sin orbes y no guardable
    const randomLevel = Math.floor(Math.random() * 4) + 1; // 1, 2, 3 o 4
    updateManaSync((prev) => ({ ...prev, J1: Math.max(0, prev.J1 - 4) }));
    pendingSummonOrbsRef.current = []; // Estrictamente SIN orbes asignados
    catalystBonusesRef.current = { hp: 0, atk: 0 }; // Estrictamente SIN bonos de catalizador
    esTransmutacionDirectaRef.current = true;
    setEsTransmutacionDirecta(true); // Bloquea el botón de guardar
    setNivelPendiente(randomLevel);
    setMaestriaPendiente(1); // Estadística base (Iniciado)
    invocacionPendienteRef.current = true;
    setInvocacionPendiente(true);
    cellInvRef.current = availableZones;
    setCellInv(availableZones);
    gameAudio.playPowerupChime();
    triggerBattleMessage(`⚡ ¡Transmutación Arcana! Criatura pura Lv.${randomLevel} (Base, sin orbes). Colócala en el tablero.`, '#38bdf8');
    checkTutorialStepProgression('TRANSMUTE');
  };

  // Unit Interaction
  const handleUnitClick = (unit: UnitData) => {
    // Validación estricta de estado: rechazar clics si el sistema está bloqueado o resolviendo acciones
    if (isCombatActionLockedRef.current || isAiRunningRef.current || jugadorActivoRef.current !== 1) {
      return;
    }

    // Si hay una invocación pendiente, se bloquea la interacción con las piezas en el tablero
    // (el jugador solo puede tocar las celdas doradas de invocación o el botón de guardar ficha)
    if (invocacionPendienteRef.current) {
      triggerBattleMessage('Coloca la criatura en una casilla dorada o pulsa "Guardar Ficha".', '#fbbf24');
      return;
    }

    const activePlayer = jugadorActivoRef.current;
    const liveUnits = unitsRef.current;

    if (hechizoEnEspera) {
      // Filtrar y validar estrictamente según el objetivo del hechizo
      const spell = GRIMOIRE_SPELLS[hechizoEnEspera];
      if (!spell) {
        setHechizoEnEspera(null);
        return;
      }

      // Validar objetivo de acuerdo a la naturaleza de la magia
      if (hechizoEnEspera === 'rayo' && unit.dueño === activePlayer) {
        gameAudio.playErrorBuzz();
        triggerBattleMessage('Relámpago solo puede ser lanzado contra una unidad enemiga.', '#ef4444');
        return;
      }
      if (hechizoEnEspera === 'escudo' && unit.dueño !== activePlayer) {
        gameAudio.playErrorBuzz();
        triggerBattleMessage('Escudo solo puede ser otorgado a una unidad aliada.', '#ef4444');
        return;
      }
      if (hechizoEnEspera === 'juicio' && (unit.dueño === activePlayer || unit.esMaestra)) {
        gameAudio.playErrorBuzz();
        triggerBattleMessage('Juicio solo destruye criaturas enemigas no Maestras.', '#ef4444');
        return;
      }
      if (hechizoEnEspera === 'vinculo' && (unit.dueño !== activePlayer || unit.esMaestra)) {
        gameAudio.playErrorBuzz();
        triggerBattleMessage('Vínculo requiere sacrificar una criatura aliada no Maestra.', '#ef4444');
        return;
      }
      if (hechizoEnEspera === 'prision' && unit.dueño === activePlayer) {
        gameAudio.playErrorBuzz();
        triggerBattleMessage('Prisión solo se puede aplicar a criaturas enemigas.', '#ef4444');
        return;
      }
      if (hechizoEnEspera === 'transposicion') {
        const myMaster = liveUnits.find((u) => u.dueño === activePlayer && u.esMaestra);
        if (myMaster && unit.id === myMaster.id) {
          gameAudio.playErrorBuzz();
          triggerBattleMessage('Selecciona otra unidad en el tablero para intercambiar posición con tu Soberano.', '#ef4444');
          return;
        }
      }

      castSpellOnTarget(unit);
      return;
    }

    // Si vuelves a hacer clic sobre la criatura ya seleccionada, se DESELECCIONA
    if (selectedUnitIdRef.current === unit.id) {
      gameAudio.playCrispClick();
      clearSelection();
      triggerBattleMessage('Selección cancelada', '#94a3b8');
      return;
    }

    if (unit.dueño === activePlayer && unit.isFrozen) {
      gameAudio.playErrorBuzz();
      triggerBattleMessage(`❄️ ${unit.nombre} está congelada y no puede actuar este turno.`, '#38bdf8');
      return;
    }

    if (unit.dueño === activePlayer && unit.yaSeMovio) {
      gameAudio.playCrispClick();
      triggerBattleMessage(`⏳ ${unit.nombre} ya actuó o descansa tras ser invocada este turno.`, '#94a3b8');
      return;
    }

    if (unit.dueño === activePlayer && !unit.yaSeMovio && !unit.isFrozen) {
      gameAudio.playCrispClick();
      selectedUnitIdRef.current = unit.id;
      setSelectedUnitId(unit.id);

      // Calculate move range (Orbe de Rayo otorga +1 de movimiento extra a la criatura)
      // REGLA TÁCTICA FUNDAMENTAL: Las criaturas NO pueden saltar sobre otras si tienen una al frente / bloqueando el paso,
      // salvo que tengan habilidad de salto o vuelo (ej. Titanes Ascendidos alados, Orbe de Viento o espectros del vacío).
      const hasLightningOrb = (unit.equippedOrbs || []).some(
        (o) =>
          o.id === 'o3' ||
          o.templateId === 'o3' ||
          o.id === 'recipe_orb_rayo_arcano' ||
          o.templateId === 'recipe_orb_rayo_arcano' ||
          o.element === 'Rayo'
      );
      const hasWindOrb = (unit.equippedOrbs || []).some((o) => o.id === 'o5' || o.templateId === 'o5' || o.element === 'Viento');
      const canJumpOverUnits = unit.esAscendido || hasWindOrb;

      const baseRange = unit.esMaestra ? 1 : unit.nivel >= 4 ? 2 : 1;
      const maxRange = baseRange + (hasLightningOrb ? 1 : 0);
      const moves: number[] = [];
      const attacks: number[] = [];

      // Maestras rivales con hechizo Gravedad activo bloquean las casillas adyacentes a su posición
      const rivalGravityMasters = liveUnits.filter(
        (u) => u.dueño !== activePlayer && u.esMaestra && (u.gravityTurns || 0) > 0
      );
      const isHexBlockedByRivalGravity = (hexId: number) =>
        rivalGravityMasters.some((gm) => getHexDistance(gm.posicion, hexId) === 1);

      const occupiedHexMap = new Map<number, UnitData>();
      liveUnits.forEach((u) => occupiedHexMap.set(u.posicion, u));

      const allHexIds = Object.keys(HEX_MAP).map((k) => parseInt(k, 10));

      // Ataques cuerpo a cuerpo: solo a distancia 1
      allHexIds.forEach((id) => {
        if (getHexDistance(unit.posicion, id) === 1) {
          const occ = occupiedHexMap.get(id);
          if (occ && occ.dueño !== activePlayer) {
            attacks.push(id);
          }
        }
      });

      if (canJumpOverUnits) {
        // Con habilidad de salto/vuelo (Titán o Viento): alcanza cualquier casilla libre hasta maxRange (incluyendo dist === 3)
        allHexIds.forEach((id) => {
          const dist = getHexDistance(unit.posicion, id);
          if (dist >= 1 && dist <= maxRange && !occupiedHexMap.has(id) && !isHexBlockedByRivalGravity(id)) {
            moves.push(id);
          }
        });
      } else {
        // Sin habilidad de salto: BFS paso a paso desde la posición inicial hasta maxRange (1, 2, 3...)
        const visited = new Set<number>([unit.posicion]);
        let frontier: number[] = [unit.posicion];

        for (let step = 1; step <= maxRange; step++) {
          const nextFrontier: number[] = [];
          allHexIds.forEach((id) => {
            if (visited.has(id) || occupiedHexMap.has(id) || isHexBlockedByRivalGravity(id)) return;
            const isReachableFromFrontier = frontier.some((prevHex) => getHexDistance(prevHex, id) === 1);
            if (isReachableFromFrontier) {
              visited.add(id);
              moves.push(id);
              nextFrontier.push(id);
            }
          });
          frontier = nextFrontier;
          if (frontier.length === 0) break;
        }
      }

      cellMovRef.current = moves;
      setCellMov(moves);
      cellAtqRef.current = attacks;
      setCellAtq(attacks);
    } else if (unit.dueño !== activePlayer && selectedUnitIdRef.current) {
      const selected = liveUnits.find((u) => u.id === selectedUnitIdRef.current);
      if (selected && !selected.yaSeMovio && !selected.isFrozen && getHexDistance(selected.posicion, unit.posicion) === 1) {
        clearSelection();
        executeMeleeAttack(selected, unit);
      } else {
        gameAudio.playCrispClick();
        clearSelection();
      }
    }
  };

  const handleTileClick = (hexId: number) => {
    // Validación estricta de estado: rechazar interacción táctica si el sistema está ocupado
    if (isCombatActionLockedRef.current || isAiRunningRef.current || jugadorActivoRef.current !== 1) {
      return;
    }

    // Si hay una invocación pendiente, SOLO se permite interactuar con las casillas doradas de invocación
    if (invocacionPendienteRef.current) {
      if (cellInvRef.current.includes(hexId)) {
        // Bloquear de forma síncrona antes de cualquier actualización de estado para impedir invocación doble por doble toque
        const summonLevel = nivelPendiente;
        const summonMastery = maestriaPendiente;
        invocacionPendienteRef.current = false;
        setInvocacionPendiente(false);
        cellInvRef.current = [];
        setCellInv([]);

        // Ejecutar la invocación en la casilla dorada seleccionada
        gameAudio.playPowerupChime();
        let newUnit: UnitData;
        let summonedAnnouncement = '';

        // Extraer orbes que poseían los dados que participaron en esta invocación
        const orbsToApply = [...pendingSummonOrbsRef.current];
        let orbBonusHp = catalystBonusesRef.current.hp;
        let orbBonusAtk = catalystBonusesRef.current.atk;
        orbsToApply.forEach((o) => {
          orbBonusHp += o.bonusHp || 0;
          orbBonusAtk += o.bonusAtk || 0;
        });

        if (summonLevel === 7) {
          const titanId = summonMastery || 6;
          const titanInfo = ASCENDED_TITANS.find((t) => t.id === titanId) || ASCENDED_TITANS[5];
          summonedAnnouncement = `¡TITÁN ASCENDIDO: ${titanInfo.name.toUpperCase()}! (Descansa este turno)`;
          newUnit = {
            id: `u_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            nombre: titanInfo.name,
            nivel: 7,
            rangoNombre: `Ascendido (${titanInfo.roll})`,
            hpActual: titanInfo.hp + orbBonusHp,
            hpMax: titanInfo.hp + orbBonusHp,
            daño: titanInfo.atk + orbBonusAtk,
            dueño: jugadorActivoRef.current,
            posicion: hexId,
            yaSeMovio: true,
            esMaestra: false,
            esAscendido: true,
            ascendidoTipo: titanId,
            equippedOrbs: orbsToApply,
          };

          // Habilidades pasivas / activas de los Titanes Ascendidos
          if (titanId === 1) {
            const nextMana = updateManaSync((prev) => ({ ...prev, J1: Math.min(10, prev.J1 + 2) }));
            if (nextMana.J1 >= 10) {
              syncAchievementsNow({ manaJ1: nextMana.J1 });
            }
            scheduleCombatFxTimeout(() => {
              spawnFloatingText('🌌 VACÍO: +2 MANÁ', hexId, '#38bdf8');
            }, 300);
            triggerBattleMessage(`🌌 ¡Poder Cósmico de ${titanInfo.name}: +2 de Maná acumulado!`, '#38bdf8');
          } else if (titanId === 2) {
            updateUnitsSync((prev) =>
              prev.map((u) => {
                if (u.dueño === 1 && u.esMaestra) {
                  const nextCharges = (u.shieldCharges ?? (u.hasShield ? 1 : 0)) + 1;
                  return { ...u, hasShield: true, shieldCharges: nextCharges };
                }
                return u;
              })
            );
            scheduleCombatFxTimeout(() => {
              const king = unitsRef.current.find((u) => u.dueño === 1 && u.esMaestra);
              if (king) spawnFloatingText('🛡️ BARRERA SOLAR', king.posicion, '#fbbf24');
            }, 300);
            triggerBattleMessage(`🛡️ ¡Barrera Solar de ${titanInfo.name}: Escudo protector concedido a tu Soberano!`, '#fbbf24');
          } else if (titanId === 3) {
            const hasEnemiesNow = unitsRef.current.some((u) => u.dueño === 2);
            if (hasEnemiesNow) {
              setCombatLock(true);
              scheduleCombatFxTimeout(() => {
                let defeatedEnemyMaster = false;
                const enemies = unitsRef.current.filter((u) => u.dueño === 2);
                if (enemies.length > 0) {
                  const nearest = [...enemies].sort((a, b) => getHexDistance(hexId, a.posicion) - getHexDistance(hexId, b.posicion))[0];
                  let defeatedTarget = false;
                  let phoenixRevived = false;
                  updateUnitsSync((prev) =>
                    prev
                      .map((u) => {
                        if (u.id !== nearest.id) return u;
                        const res = calculateTitanEntryDirectDamageHp(u, 2);
                        if (u.esMaestra && u.dueño === 2 && res.nextHp <= 0) {
                          defeatedEnemyMaster = true;
                        }
                        defeatedTarget = res.defeatedMinion;
                        phoenixRevived = res.phoenixResurrected;
                        return {
                          ...u,
                          hpActual: res.nextHp,
                          ...(res.phoenixResurrected ? { hasResurrected: true } : {}),
                        };
                      })
                      .filter((u) => u.hpActual > 0 || u.esMaestra)
                  );
                  spawnFloatingText(
                    defeatedTarget || defeatedEnemyMaster
                      ? '💀 DEVORADO (-2)'
                      : phoenixRevived
                      ? '🔥 ¡RENACER ÍGNEO (10 HP)!'
                      : '🌑 DEVORADO (-2)',
                    nearest.posicion,
                    phoenixRevived ? '#f97316' : '#a855f7'
                  );
                  triggerBattleMessage(
                    `🌑 ¡Golpe Abisal de ${titanInfo.name}: infligió 2 de daño directo a ${nearest.nombre}${
                      defeatedTarget || defeatedEnemyMaster
                        ? ' y lo eliminó'
                        : phoenixRevived
                        ? ' (¡el Fénix renace con 10 HP!)'
                        : ''
                    }!`,
                    '#a855f7'
                  );
                }
                if (defeatedEnemyMaster) {
                  handleMasterDefeated(1);
                } else {
                  setCombatLock(false);
                }
              }, 400);
            }
          } else if (titanId === 4) {
            const hasAdjacentEnemies = unitsRef.current.some(
              (u) => u.dueño === 2 && getHexDistance(hexId, u.posicion) === 1
            );
            if (hasAdjacentEnemies) {
              setCombatLock(true);
              scheduleCombatFxTimeout(() => {
                const stunnedHexes: number[] = [];
                const killedHexes: number[] = [];
                const revivedHexes: number[] = [];
                let defeatedEnemyMaster = false;
                updateUnitsSync((prev) =>
                  prev
                    .map((u) => {
                      if (u.dueño === 2 && getHexDistance(hexId, u.posicion) === 1) {
                        const res = calculateTitanEntryDirectDamageHp(u, 2);
                        if (u.esMaestra && u.dueño === 2 && res.nextHp <= 0) {
                          defeatedEnemyMaster = true;
                          killedHexes.push(u.posicion);
                        } else if (res.defeatedMinion) {
                          killedHexes.push(u.posicion);
                        } else if (res.phoenixResurrected) {
                          revivedHexes.push(u.posicion);
                        } else {
                          stunnedHexes.push(u.posicion);
                        }
                        return {
                          ...u,
                          hpActual: res.nextHp,
                          ...(res.phoenixResurrected ? { hasResurrected: true } : {}),
                          isFrozen: res.nextHp > 0 ? true : u.isFrozen,
                          yaSeMovio: true,
                        };
                      }
                      return u;
                    })
                    .filter((u) => u.hpActual > 0 || u.esMaestra)
                );
                stunnedHexes.forEach((p) => spawnFloatingText('⚡ ATURDIDO (-2)', p, '#60a5fa'));
                killedHexes.forEach((p) => spawnFloatingText('💀 FULMINADO (-2)', p, '#60a5fa'));
                revivedHexes.forEach((p) => spawnFloatingText('🔥 ¡RENACER ÍGNEO (10 HP)!', p, '#f97316'));
                triggerBattleMessage(
                  `⚡ ¡Cólera del Trueno de ${titanInfo.name}: aturdió y dañó a los enemigos adyacentes!`,
                  '#60a5fa'
                );
                if (defeatedEnemyMaster) {
                  handleMasterDefeated(1);
                } else {
                  setCombatLock(false);
                }
              }, 350);
            }
          } else if (titanId === 5) {
            updateUnitsSync((prev) =>
              prev.map((u) =>
                u.dueño === 1 && u.esMaestra
                  ? { ...u, hpActual: Math.min(u.hpMax, u.hpActual + 4) }
                  : u
              )
            );
            scheduleCombatFxTimeout(() => {
              const king = unitsRef.current.find((u) => u.dueño === 1 && u.esMaestra);
              if (king) spawnFloatingText('🔥 LLAMA VITAL (+4 HP)', king.posicion, '#f97316');
            }, 300);
            triggerBattleMessage(`🔥 ¡Renacer Ígneo de ${titanInfo.name}: bendición vital al Soberano y aura de resurrección!`, '#f97316');
          } else if (titanId === 6) {
            scheduleCombatFxTimeout(() => {
              updateUnitsSync((prev) =>
                prev.map((u) => {
                  if (u.dueño === 1) {
                    const nextCharges = (u.shieldCharges ?? (u.hasShield ? 1 : 0)) + 1;
                    return { ...u, hasShield: true, shieldCharges: nextCharges };
                  }
                  return u;
                })
              );
              spawnFloatingText('⚖️ JUICIO: ESCUDO GLOBAL', hexId, '#e2e8f0');
              triggerBattleMessage(`⚖️ ¡Sentencia Celestial de ${titanInfo.name}: Escudo protector a todo el ejército aliado!`, '#e2e8f0');
            }, 300);
          }
        } else {
          const activeP = jugadorActivoRef.current;
          const stats = calculateCreatureStats(summonLevel, summonMastery);
          const refList = activeP === 1 ? CODEX_J1_CREATURES : CODEX_J2_CREATURES;
          const catalogEntry = refList.find((c) => c.nivel === summonLevel);
          const creatureTitle = catalogEntry ? catalogEntry.nombre : `Guardián L${summonLevel}`;
          const finalHp = stats.hp + orbBonusHp;
          const finalAtk = stats.atk + orbBonusAtk;
          const orbBadge = orbsToApply.length > 0 ? ` (+${orbBonusHp}HP/+${orbBonusAtk}ATK por Orbes)` : '';
          summonedAnnouncement = `¡Has invocado a ${creatureTitle.toUpperCase()} (${stats.rangoNombre})${orbBadge}! (Descansa este turno)`;

          newUnit = {
            id: `u_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            nombre: `${creatureTitle} [${stats.rangoNombre}]`,
            nivel: summonLevel,
            maestria: summonMastery,
            rangoNombre: stats.rangoNombre,
            hpActual: finalHp,
            hpMax: finalHp,
            daño: finalAtk,
            dueño: activeP,
            posicion: hexId,
            yaSeMovio: true,
            esMaestra: false,
            esAscendido: false,
            equippedOrbs: orbsToApply,
          };
        }

        if (summonLevel === 7) {
          setStatsTitansAwakened((prev) => prev + 1);
        } else {
          setStatsMinionsSummoned((prev) => prev + 1);
        }

        if (activeCampaignIndex === 2) {
          setDailyContracts((prev) =>
            prev.map((c) =>
              c.id === 'contract_camp3_recruit'
                ? {
                    ...c,
                    currentCount: Math.min(c.targetCount, c.currentCount + 1),
                    isCompleted: c.currentCount + 1 >= c.targetCount,
                  }
                : c
            )
          );
        }
        const updatedUnitsAfterSummon = updateUnitsSync((prev) => [...prev, newUnit]);
        setLastPlayerMoveAction(null);
        const myMinionsAfterSummon = updatedUnitsAfterSummon.filter((u) => u.dueño === 1 && !u.esMaestra).length;
        if (myMinionsAfterSummon >= 4) {
          syncAchievementsNow({ myMinionsCount: myMinionsAfterSummon });
        }
        spawnFloatingText(`+${newUnit.nombre}`, hexId, '#38bdf8');
        if (orbBonusHp > 0 || orbBonusAtk > 0) {
          scheduleCombatFxTimeout(() => {
            spawnFloatingText(`🔮 ORBE: +${orbBonusHp}HP / +${orbBonusAtk}ATK`, hexId, '#c084fc');
          }, 350);
        }
        triggerBattleMessage(summonedAnnouncement, '#38bdf8');
        checkTutorialStepProgression('SUMMON');
        pendingSummonOrbsRef.current = [];
        catalystBonusesRef.current = { hp: 0, atk: 0 };
        cancelInvocation();
      } else {
        // Tocar cualquier otra celda que no sea dorada durante la invocación queda bloqueado
        triggerBattleMessage('Solo puedes interactuar con las casillas doradas de invocación o "Guardar Ficha".', '#fbbf24');
      }
      return;
    }

    // Si se está en modo apuntar hechizo, no se debe interactuar con casillas de movimiento ni invocación
    if (hechizoEnEspera) {
      triggerBattleMessage('Selecciona una ficha objetivo en el tablero o pulsa CANCELAR HECHIZO.', '#f87171');
      gameAudio.playErrorBuzz();
      return;
    }

    // If empty tile clicked, check if it's a special rune to display immediate floating tooltip message
    const clickedRune = specialRunes.find((r) => r.hexId === hexId);
    if (clickedRune) {
      gameAudio.playCrispClick();
      triggerBattleMessage(`${clickedRune.symbol} ${clickedRune.title}: ${clickedRune.desc}`, clickedRune.emissive);
      spawnFloatingText(`${clickedRune.symbol} ${clickedRune.title.split(' ')[0]}`, hexId, clickedRune.emissive);
    }

    // Move Selected Unit
    const activeSelectedId = selectedUnitIdRef.current;
    if (activeSelectedId && cellMovRef.current.includes(hexId)) {
      const liveUnits = unitsRef.current.length > 0 ? unitsRef.current : units;
      const movingUnit = liveUnits.find((u) => u.id === activeSelectedId);
      // Limpiar selección de forma síncrona de inmediato para impedir doble movimiento ante doble toque rápido
      clearSelection();
      if (!movingUnit || movingUnit.yaSeMovio || movingUnit.isFrozen) {
        return;
      }

      gameAudio.playConfirmSelect();
      // Registrar acción para permitir deshacer antes de atacar o pasar de turno
      setLastPlayerMoveAction({
        unitId: activeSelectedId,
        fromHex: movingUnit.posicion,
        toHex: hexId,
      });

      updateUnitsSync((prev) =>
        prev.map((u) => (u.id === activeSelectedId ? { ...u, posicion: hexId, yaSeMovio: true } : u))
      );
      spawnFloatingText(`👟 ${movingUnit.nombre}`, hexId, '#38bdf8');
      triggerBattleMessage(`👟 Has movido a ${movingUnit.nombre}. (¡Puedes pulsar Deshacer si fue un error!)`, '#38bdf8');
      checkTutorialStepProgression('MOVE');
    } else if (activeSelectedId && !cellMovRef.current.includes(hexId)) {
      const liveUnits = unitsRef.current;
      const selectedU = liveUnits.find((u) => u.id === activeSelectedId);
      const rivalGravityMasters = liveUnits.filter(
        (u) => u.dueño !== jugadorActivoRef.current && u.esMaestra && (u.gravityTurns || 0) > 0
      );
      const blockedByGravity =
        selectedU &&
        getHexDistance(selectedU.posicion, hexId) <= 3 &&
        rivalGravityMasters.some((gm) => getHexDistance(gm.posicion, hexId) === 1);

      if (blockedByGravity) {
        gameAudio.playErrorBuzz();
        triggerBattleMessage(
          '🌌 ¡El campo de Gravedad bloquea el acceso a las casillas adyacentes al Soberano rival!',
          '#818cf8'
        );
      } else {
        gameAudio.playCrispClick();
      }
      clearSelection();
    }
  };

  const handleMasterDefeated = (winner: 1 | 2) => {
    clearAiTimeouts();
    clearRollDiceTimeout();
    clearCombatFxTimeouts();
    clearCombatResolutionTimeouts();
    setCombatLock(false); // Liberar cerrojo de combate para evitar softlocks al finalizar la batalla
    // Volcar el estado acumulado de campaignRngRef hacia campaignsProgress al finalizar el combate
    syncCampaignRngToProgress(activeCampaignIndex);
    // Obtener snapshot vivo y exacto del tablero desde unitsRef
    const currentUnitsSnapshot = unitsRef.current.length > 0 ? unitsRef.current : units;

    if (winner === 1) {
      // BOTÍN ESPECIAL DE CAMPAÑA 4: 10% de probabilidad de conseguir un material raro o catalizador sagrado
      if (activeCampaignIndex === 3) {
        const dropRoll = Math.random() * 100;
        if (dropRoll < 10) {
          const rareMaterialsPool = [
            'obsidiana_sombras',
            'polvo_astral',
            'lingote_runico',
            'chispa_vacio',
            'cristal_eterio',
            'lagrima_fenix',
            'piedra_filosofal_astral',
            'nucleo_adamantio_puro',
            'esencia_del_titan_belico',
            'orbe_de_ranura_ancestral',
          ];
          const droppedMatId = rareMaterialsPool[Math.floor(Math.random() * rareMaterialsPool.length)];
          const matInfo = FORGE_MATERIALS[droppedMatId];
          setForgeInventory((inv) => ({
            ...inv,
            [droppedMatId]: (inv[droppedMatId] || 0) + 1,
          }));

          scheduleCombatFxTimeout(() => {
            gameAudio.playPowerupChime();
            triggerBattleMessage(
              `🎁 ¡BOTÍN RARO DE CAMPAÑA 4! Obtuviste: ${matInfo?.icon || '💎'} ${matInfo?.name}`,
              matInfo?.rarityColor || '#fbbf24'
            );
          }, 1500);
        }
      }
      setStatsWon((prev) => prev + 1);
      gameAudio.playVictoryFanfare();

      // Flujo didáctico exclusivo si se estaba disputando una lección tutorial de casa
      if (activeHouseTutorial) {
        const houseId = activeHouseTutorial.houseId;
        let updatedCount = completedHouseTutorials.length;
        if (!completedHouseTutorials.includes(houseId)) {
          const updated = [...completedHouseTutorials, houseId];
          setCompletedHouseTutorials(updated);
          updatedCount = updated.length;
          setAchievementsInternal((prev) =>
            prev.map((a) =>
              a.id === 'ach_all_tutorials'
                ? {
                    ...a,
                    progress: Math.min(12, updated.length),
                    isUnlocked: updated.length >= 12,
                  }
                : a
            )
          );
          if (updated.length >= 12) {
            gameAudio.playVictoryFanfare();
            triggerBattleMessage('🏆 ¡LOGRO DESBLOQUEADO: GRAN ERUDITO DE LOS DADOS! (12/12 Lecciones)', '#fbbf24');
          }
        }
        const exitPosCoord = currentVisitedHouse
          ? getHouseSafeExitPos(currentVisitedHouse)
          : null;
        setTutorialCompletionModal({
          lessonTitle: activeHouseTutorial.title,
          residentName: currentVisitedHouse?.resident.name || 'El Instructor',
          residentTopic: currentVisitedHouse?.resident.topic || activeHouseTutorial.topic,
          residentColor: currentVisitedHouse?.resident.color || '#38bdf8',
          residentIcon: currentVisitedHouse?.resident.icon || '🎓',
          totalCompleted: Math.min(12, updatedCount),
          exitPos: exitPosCoord as [number, number, number] | null,
        });
        return;
      }

      // Flujo exclusivo de Modo Desafío de Gladiador (Duelos Directos)
      if (isGladiatorDuelMode && gladiatorDuelRival) {
        const { gold: rewardGold, exp: rewardExp, score: rewardScore } =
          calculateGladiatorDuelRewards(gladiatorDuelHandicap);
        setPlayerGold((g) => g + rewardGold);
        setLastVictoryGoldReward(rewardGold);

        const { nextExp, nextLevel, hasLeveledUp, gainedLevels } = applyHeroExpAndComputeLevelUps(
          playerExp,
          playerLevel,
          rewardExp
        );
        setPlayerExp(nextExp);
        if (hasLeveledUp) {
          setPlayerLevel(nextLevel);
          enqueueLevelUps(gainedLevels);
          gameAudio.playLevelUpStinger();
          triggerBattleMessage(
            `🎉 ¡SUBIDA DE NIVEL EN EL COLISEO: RANGO ${nextLevel}${gainedLevels.length > 1 ? ` (+${gainedLevels.length} MEJORAS)` : ''}!`,
            '#10b981'
          );
        }

        setDefeatedTournamentContenders((prev) => Array.from(new Set([...prev, gladiatorDuelRival.id])));
        setGameState((prev) => ({ ...prev, status: 'VICTORY', score: prev.score + rewardScore }));
        triggerBattleMessage(`⚔️ ¡HAS VENCIDO A ${gladiatorDuelRival.name.toUpperCase()}! (+${rewardGold} Oro • +${rewardExp} EXP)`, '#fbbf24');
        return;
      }

      // Flujo exclusivo de Modo Supervivencia (Coliseo Infinito)
      if (isSurvivalMode) {
        const clearedWave = survivalWave;
        const nextWave = survivalWave + 1;
        setSurvivalWave(nextWave);
        setSurvivalHighScore((prev) => Math.max(prev, clearedWave));
        const diffMultiplier = survivalDifficulty === 'PESADILLA' ? 3.0 : survivalDifficulty === 'HEROICO' ? 1.8 : 1.0;
        const rewardWaveGold = Math.round((150 + survivalWave * 60) * diffMultiplier);
        setPlayerGold((g) => g + rewardWaveGold);
        setLastVictoryGoldReward(rewardWaveGold);

        // En dificultad Pesadilla o cada 3 oleadas se otorga además un mineral de forja especial
        if (survivalDifficulty === 'PESADILLA' || nextWave % 3 === 0) {
          const forgeBonusMat = 'obsidiana_sombras';
          setForgeInventory((prev) => ({
            ...prev,
            [forgeBonusMat]: (prev[forgeBonusMat] || 0) + 1,
          }));
          triggerBattleMessage(`🎁 ¡BOTÍN DEL COLISEO: +1 Obsidiana de las Sombras!`, '#c084fc');
        }

        // Progreso de contrato diario: Gloria del Coliseo (superar 2 oleadas)
        setDailyContracts((prev) =>
          prev.map((c) =>
            c.id === 'contract_coliseum_gladiator'
              ? {
                  ...c,
                  currentCount: Math.min(c.targetCount, c.currentCount + 1),
                  isCompleted: c.currentCount + 1 >= c.targetCount,
                }
              : c
          )
        );

        setGameState((prev) => ({ ...prev, status: 'VICTORY', score: prev.score + Math.round(500 * survivalWave * diffMultiplier) }));
        triggerBattleMessage(`🔥 ¡OLEADA ${survivalWave} SUPERADA [${survivalDifficulty}]! (+${rewardWaveGold} Oro)`, '#fbbf24');
        return;
      }
      // Logro Soberano Intacto si el Rey nunca recibió daño (usando snapshot vivo)
      const pKing = currentUnitsSnapshot.find((u) => u.dueño === 1 && u.esMaestra);
      if (pKing && pKing.hpActual >= pKing.hpMax) {
        setAchievements((prev) =>
          prev.map((a) => (a.id === 'ach_untouchable_king' ? { ...a, progress: 1, isUnlocked: true } : a))
        );
        // Progreso de contrato de cazador: Soberano Intacto
        setDailyContracts((prev) =>
          prev.map((c) =>
            c.id === 'contract_untouchable'
              ? { ...c, currentCount: 1, isCompleted: true }
              : c
          )
        );
      }

      // Progreso de Contratos Exclusivos por Campañas 2 y 4 al vencer
      if (activeCampaignIndex === 1) {
        // Campaña 2: Señores del Calabozo
        setDailyContracts((prev) =>
          prev.map((c) =>
            c.id === 'contract_camp2_abyss'
              ? {
                  ...c,
                  currentCount: Math.min(c.targetCount, c.currentCount + 1),
                  isCompleted: c.currentCount + 1 >= c.targetCount,
                }
              : c
          )
        );
      } else if (activeCampaignIndex === 3) {
        // Campaña 4: El Trono de las Sombras
        setDailyContracts((prev) =>
          prev.map((c) =>
            c.id === 'contract_camp4_shadow'
              ? {
                  ...c,
                  currentCount: Math.min(c.targetCount, c.currentCount + 1),
                  isCompleted: c.currentCount + 1 >= c.targetCount,
                }
              : c
          )
        );
      }
      let currentQualifiersRoster = ALLEY_OPPONENTS_ROSTER;
      if (activeCampaignIndex === 1) currentQualifiersRoster = DUNGEON_LORDS_QUALIFIERS_ROSTER;
      else if (activeCampaignIndex === 2) currentQualifiersRoster = RECRUIT_PRACTICE_ROSTER;
      else if (activeCampaignIndex === 3) currentQualifiersRoster = SHADOW_THRONE_PURGE_ROSTER;

      if (campaignPhase === 'ALLEY') {
        const oppIdx = Math.min(alleyCurrentFight - 1, currentQualifiersRoster.length - 1);
        const currentOpp = currentQualifiersRoster.find((o) => o.id === currentOpponentId) || currentQualifiersRoster[oppIdx];
        const isCampCompleted = Boolean(campaignsProgress[activeCampaignIndex]?.completed);

        if (isCampCompleted) {
          // Si la campaña ya fue completada, recompensa exclusiva de la campaña activa
          const rewardGold = 100;
          const rewardExp = 80;
          const randomDie = generateCampaignThemedRewardDie(activeCampaignIndex, playerLevel);
          const randomOrb = generateCampaignThemedRewardOrb(activeCampaignIndex);

          setPlayerGold((g) => g + rewardGold);
          setLastVictoryGoldReward(rewardGold);
          if (currentOpp?.id) {
            setDefeatedAlleyOpponents((prev) => (prev.includes(currentOpp.id) ? prev : [...prev, currentOpp.id]));
          }

          // Cálculo síncrono e inmutable de experiencia y nivel con acumulación multinivel
          const {
            nextExp: currentExpTotal,
            nextLevel: calculatedLevel,
            hasLeveledUp,
            gainedLevels,
          } = applyHeroExpAndComputeLevelUps(playerExp, playerLevel, rewardExp);

          setPlayerExp(currentExpTotal);
          if (hasLeveledUp) {
            setPlayerLevel(calculatedLevel);
            gameAudio.playLevelUpStinger();
          }

          setPendingRewardModal({
            exp: rewardExp,
            gold: rewardGold,
            leveledUp: hasLeveledUp,
            newLevel: calculatedLevel,
            gainedLevels,
            randomDie,
            randomOrb,
          });
        } else {
          // Recompensa estándar temáticamente vinculada a la campaña activa
          const rewardGold = currentOpp?.rewards?.gold || (100 + alleyCurrentFight * 15);
          const rewardExp = currentOpp?.rewards?.exp || (120 + alleyCurrentFight * 20);
          const randomDie = generateCampaignThemedRewardDie(activeCampaignIndex, playerLevel);
          const randomOrb = generateCampaignThemedRewardOrb(activeCampaignIndex);

          setPlayerGold((g) => g + rewardGold);
          setLastVictoryGoldReward(rewardGold);
          setDefeatedAlleyOpponents((prev) => (prev.includes(currentOpp.id) ? prev : [...prev, currentOpp.id]));

          // RECOMPENSA DE MATERIALES DE FORJA A PARTIR DE LA CAMPAÑA 4:
          // Al vencer en combate en la Campaña 4 (El Trono de las Sombras), se obtienen materiales de forja
          if (activeCampaignIndex === 3) {
            const matRoll = Math.random();
            let droppedMat = 'obsidiana_sombras';
            let droppedAmt = 2;
            if (matRoll < 0.25) {
              droppedMat = 'chispa_vacio';
              droppedAmt = 1;
            } else if (matRoll < 0.6) {
              droppedMat = 'lingote_runico';
              droppedAmt = 2;
            } else if (matRoll < 0.8) {
              droppedMat = 'polvo_astral';
              droppedAmt = 3;
            }
            setForgeInventory((prev) => ({
              ...prev,
              [droppedMat]: (prev[droppedMat] || 0) + droppedAmt,
            }));
            const matInfo = FORGE_MATERIALS[droppedMat];
            if (matInfo) {
              triggerBattleMessage(`⚒️ ¡Material de Forja obtenido: +${droppedAmt} ${matInfo.name}!`, '#c084fc');
            }
          }

          // Cálculo síncrono e inmutable de experiencia y nivel con acumulación multinivel
          const {
            nextExp: currentExpTotal,
            nextLevel: calculatedLevel,
            hasLeveledUp,
            gainedLevels,
          } = applyHeroExpAndComputeLevelUps(playerExp, playerLevel, rewardExp);

          setPlayerExp(currentExpTotal);
          if (hasLeveledUp) {
            setPlayerLevel(calculatedLevel);
            gameAudio.playLevelUpStinger();
          }

          setPendingRewardModal({
            exp: rewardExp,
            gold: rewardGold,
            leveledUp: hasLeveledUp,
            newLevel: calculatedLevel,
            gainedLevels,
            randomDie,
            randomOrb,
          });
        }
        // Validar si el contrincante actual es nuevo antes de sumar 1 al conteo de derrotados
        const isNewVictory = currentOpp?.id && !defeatedAlleyOpponents.includes(currentOpp.id);
        const nextDefeatedCount = defeatedAlleyOpponents.length + (isNewVictory ? 1 : 0);

        // Si ya derrotó a los 12 rivales de la fase clasificatoria
        if (nextDefeatedCount >= 12) {
          setCampaignPhase('TOURNAMENT');
          setTournamentRound(1);
          if (!isCampCompleted) {
            setShowColiseumUnlockedHub(true); // Desplegar HUB informativo especial solo al desbloquear por primera vez
            gameAudio.playLevelUpStinger();
            triggerBattleMessage(
              activeCampaignIndex === 3
                ? '👑 ¡EL TRONO DE LAS SOMBRAS SE HA MANIFESTADO! ¡El Coliseo Supremo está disponible!'
                : activeCampaignIndex === 2
                ? '🛡️ ¡HAS CONQUISTADO LA PRÁCTICA! ¡El Torneíllo del Gran Maestro está disponible!'
                : activeCampaignIndex === 1
                ? '⚔️ ¡HAS DOBLEGADO LA FOSA! ¡El Torneo de los 8 Señores del Calabozo está abierto!'
                : '🏆 ¡HAS VENCIDO A LOS 12 RIVALES! ¡El Coliseo de Campeones ya está disponible!',
              '#fbbf24'
            );
          } else {
            triggerBattleMessage(
              '⚔️ ¡Fase clasificatoria completada! El Coliseo de la Gran Arena está listo para el Torneo.',
              '#fbbf24'
            );
          }
        } else {
          setAlleyCurrentFight((f) => f + 1);
        }
      } else if (!isSurvivalMode && !isGladiatorDuelMode) {
        // Torneo del Legado / Torneo Élite / Torneo de Aficionados / Torneo de los 8 Emperadores
        // ¡CRÍTICO!: Solo se entra a este bloque si la batalla que se acaba de disputar pertenecía AL TORNEO
        // (es decir, el rival era uno de los 8 gladiadores en la Gran Arena), NO si se acaba de ganar el combate 12 de la callejuela.
        const isCampAlreadyCompleted = Boolean(campaignsProgress[activeCampaignIndex]?.completed);
        const tourneyWinCount = (campaignsProgress[activeCampaignIndex]?.completionsCount || 0);

        // Registrar explícitamente al contendiente específico derrotado
        if (activeTournamentContender) {
          setDefeatedTournamentContenders((prev) => Array.from(new Set([...prev, activeTournamentContender.id])));
        }

        // REGLA: Durante la repetición del Torneo, las batallas intermedias (Cuartos y Semis) NO dan recompensa
        if (!isCampAlreadyCompleted || tourneyWinCount === 0) {
          setPlayerGold((g) => g + 400);
          setLastVictoryGoldReward(400);
        } else {
          setLastVictoryGoldReward(0);
          triggerBattleMessage('⚔️ ¡Victoria en la ronda del Torneo! (El premio final se entrega en la Gran Final)', '#38bdf8');
        }

        if (tournamentRound === 1) {
          setTournamentRound(2);
        } else if (tournamentRound === 2) {
          setTournamentRound(3);
        } else if (tournamentRound === 3) {
          // ¡CAMPEÓN ABSOLUTO DEL TORNEO! Se consolida la victoria, se desbloquean campañas adicionales y se entrega logro/recompensa
          setTournamentSavedSnapshot(null);
          setJustCrownedChampion(true);

          // 1. Actualizar estado de compleción y contador de victorias en la campaña actual
          const completions = tourneyWinCount + 1;

          setCampaignsProgress((prev) => ({
            ...prev,
            [activeCampaignIndex]: {
              status: 'FINALIZADA',
              phase: 'TOURNAMENT',
              fight: 12,
              defeated: defeatedAlleyOpponents,
              round: 3,
              completed: true,
              completionsCount: completions,
              claimedReward: true,
              campaignLosses: prev[activeCampaignIndex]?.campaignLosses || 0,
              rngState: campaignRngRef.current[activeCampaignIndex]
                ? { ...campaignRngRef.current[activeCampaignIndex] }
                : prev[activeCampaignIndex]?.rngState || { seed: 849201, rollCount: 0, luckModifier: 1.0 },
            },
          }));

          // REGLA: Si es una repetición del Torneo ya completado previamente,
          // se obtiene 1000 de Oro y un dado u orbe de nivel medio
          if (isCampAlreadyCompleted && tourneyWinCount >= 1) {
            setPlayerGold((g) => g + 1000);
            setLastVictoryGoldReward(1000);

            // Recompensa de nivel medio: Dado Raro/Épico o Orbe de nivel medio
            const isMediumDie = Math.random() < 0.5;
            let mediumBonusText = '';
            if (isMediumDie) {
              const mediumDie: DieData = {
                id: 'd_med_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                name: `Dado Campeón Veterano ${Math.floor(Math.random() * 6) + 1}`,
                rarity: Math.random() < 0.3 ? RARIDADES.EPICO : RARIDADES.RARO,
                level: 2,
                attachedOrbs: [],
                enMazo: false,
              };
              setPlayerDeck((prev) => [...prev, mediumDie]);
              mediumBonusText = `Dado ${mediumDie.rarity.name} (Nivel 2)`;
            } else {
              // Orbe medio (Rayo, Viento o Tierra) clonado con ID único
              const mediumOrbs = [ELEMENT_ORBS[2], ELEMENT_ORBS[4], ELEMENT_ORBS[5]];
              const chosenOrb = mediumOrbs[Math.floor(Math.random() * mediumOrbs.length)];
              const uniqueOrb = {
                ...chosenOrb,
                templateId: chosenOrb.templateId || chosenOrb.id,
                id: `o_med_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              };
              setOrbBank((prev) => [...prev, uniqueOrb]);
              mediumBonusText = `Orbe: ${uniqueOrb.name} (${uniqueOrb.element})`;
            }

            setVictoryAchievementModal({
              campaignIndex: activeCampaignIndex,
              title: 'Victoria de Torneo Repetido',
              badge: `👑 ${completions}ª Victoria en el Torneo`,
              goldReward: 1000,
              specialBonus: `+1000 de Oro y ${mediumBonusText}`,
            });
            triggerBattleMessage(`🏆 ¡Torneo conquistado nuevamente! +1000 Oro y ${mediumBonusText}`, '#fbbf24');
          } else {
            // Entrega de primera victoria épica original
            let achTitle = 'Campeón del Legado';
            let achBadge = '🏆 Corona del Alba';
            let achGold = 600;
            let achHpBonus = 6;
            let achBonus = '+6 HP Máximo Permanente y Dado Legendario Imperial';

            if (activeCampaignIndex === 1) {
              achTitle = 'Señor del Calabozo';
              achBadge = '⚔️ Blasón de los 8 Grandes';
              achGold = 1000;
              achHpBonus = 8;
              achBonus = '+8 HP Máximo, Orbe de Adamantio y Ranura Extra';
            } else if (activeCampaignIndex === 2) {
              achTitle = 'Graduado de Honor';
              achBadge = '🛡️ Medalla del Recluta Ilustre';
              achGold = 500;
              achHpBonus = 5;
              achBonus = '+5 HP Máximo y Dado Raro Santificado';
            } else if (activeCampaignIndex === 3) {
              achTitle = 'Emperador del Trono de las Sombras';
              achBadge = '🌑 Corona del Abismo Eterno';
              achGold = 2000;
              achHpBonus = 12;
              achBonus = '+12 HP Máximo, Dado Divino Supremo y Grimorio Maestro';
            }

            setPlayerGold((g) => g + achGold);
            setLastVictoryGoldReward(400 + achGold);
            setMaxPlayerHp((h) => h + achHpBonus);

            let grantedDie: DieData | null = null;
            let grantedOrb: Orb | null = null;
            let nextMaxSlots = maxSpellSlots;
            let nextUnlockedSpells = unlockedSpells;

            if (activeCampaignIndex === 0) {
              grantedDie = {
                id: `d_camp0_imperial_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                name: 'Dado Legendario Imperial',
                rarity: RARIDADES.LEGENDARIO,
                level: 1,
                attachedOrbs: [],
                enMazo: false,
              };
            } else if (activeCampaignIndex === 1) {
              grantedOrb = {
                id: `o_camp1_adamantio_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                templateId: 'o_camp1_adamantio',
                name: 'Orbe de Adamantio',
                element: 'Metal',
                effect: 'Blindaje de Adamantio: +8 HP Máx / +2 ATK',
                price: 380,
                bonusHp: 8,
                bonusAtk: 2,
              };
              nextMaxSlots = Math.min(4, maxSpellSlots + 1);
              setMaxSpellSlots((prev) => Math.min(4, prev + 1));
            } else if (activeCampaignIndex === 2) {
              grantedDie = {
                id: `d_camp2_santificado_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                name: 'Dado Raro Santificado',
                rarity: RARIDADES.RARO,
                level: 1,
                attachedOrbs: [],
                enMazo: false,
              };
            } else if (activeCampaignIndex === 3) {
              grantedDie = {
                id: `d_camp3_divino_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                name: 'Dado Divino Supremo',
                rarity: RARIDADES.LEGENDARIO,
                level: 1,
                attachedOrbs: [],
                enMazo: false,
              };
              const allSpellIds = Object.keys(CATALOG_GRIMOIRE_SPELLS);
              nextUnlockedSpells = Array.from(new Set([...unlockedSpells, ...allSpellIds]));
              setUnlockedSpells((prev) => Array.from(new Set([...prev, ...allSpellIds])));
              nextMaxSlots = 4;
              setMaxSpellSlots(4);
            }

            const nextDeck = grantedDie ? [...playerDeck, grantedDie] : playerDeck;
            const nextOrbBank = grantedOrb ? [...orbBank, grantedOrb] : orbBank;
            if (grantedDie) {
              setPlayerDeck((prev) => [...prev, grantedDie!]);
            }
            if (grantedOrb) {
              setOrbBank((prev) => [...prev, grantedOrb!]);
            }

            const nextCampaignsProgress: Record<number, CampaignProgressData> = {
              ...campaignsProgress,
              [activeCampaignIndex]: {
                status: 'FINALIZADA',
                phase: 'TOURNAMENT',
                fight: 12,
                defeated: defeatedAlleyOpponents,
                round: 3,
                completed: true,
                completionsCount: completions,
                claimedReward: true,
                campaignLosses: campaignsProgress[activeCampaignIndex]?.campaignLosses || 0,
                rngState: campaignRngRef.current[activeCampaignIndex]
                  ? { ...campaignRngRef.current[activeCampaignIndex] }
                  : campaignsProgress[activeCampaignIndex]?.rngState || { seed: 849201, rollCount: 0, luckModifier: 1.0 },
              },
            };

            syncAchievementsNow(
              {
                campaignsProgress: nextCampaignsProgress,
                playerDeck: nextDeck,
                orbBank: nextOrbBank,
                maxSpellSlots: nextMaxSlots,
                unlockedSpells: nextUnlockedSpells,
              },
              {
                statsWon: statsWon + 1,
                campaignsProgress: nextCampaignsProgress,
                playerDeck: nextDeck,
                maxSpellSlots: nextMaxSlots,
                unlockedSpells: nextUnlockedSpells,
              }
            );

            setVictoryAchievementModal({
              campaignIndex: activeCampaignIndex,
              title: achTitle,
              badge: achBadge,
              goldReward: achGold,
              specialBonus: achBonus,
            });

            if (activeCampaignIndex === 0) {
              setUnlockedCampaigns((prev) => {
                const set = new Set([...prev, 1, 2]);
                return Array.from(set);
              });
              triggerBattleMessage('👑 ¡NUEVAS CAMPAÑAS DESBLOQUEADAS: EL DESAFÍO DE LOS SEÑORES Y EL TORNEÍLLO DEL RECLUTA!', '#fbbf24');
            } else if (activeCampaignIndex === 1 || activeCampaignIndex === 2) {
              setUnlockedCampaigns((prev) => {
                const set = new Set([...prev, 3]);
                return Array.from(set);
              });
              triggerBattleMessage('🌑 ¡HAS DESBLOQUEADO EL TRONO DE LAS SOMBRAS: MODO MAESTRO SUPREMO!', '#f43f5e');
            }
          }
        }
      }

      setGameState((prev) => ({
        ...prev,
        status: 'VICTORY',
        score: prev.score + 1000,
      }));

      // Reinicio de fichas al finalizar la batalla con victoria
      setFichas({
        J1: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        J2: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      });
    } else {
      if (activeHouseTutorial) {
        // En batallas de entrenamiento didáctico, la rendición no computa como derrota militar de campaña
      } else if (isSurvivalMode || isGladiatorDuelMode) {
        // Las derrotas en modos del Coliseo (Supervivencia y Duelo de Gladiadores) no cuentan como derrotas militares de campaña
        setStatsColiseumLosses((prev) => prev + 1);
      } else {
        setStatsCampaignLosses((prev) => prev + 1);
        setCampaignsProgress((prev) => ({
          ...prev,
          [activeCampaignIndex]: {
            ...prev[activeCampaignIndex],
            campaignLosses: (prev[activeCampaignIndex]?.campaignLosses || 0) + 1,
            rngState: campaignRngRef.current[activeCampaignIndex]
              ? { ...campaignRngRef.current[activeCampaignIndex] }
              : prev[activeCampaignIndex]?.rngState || { seed: 849201, rollCount: 0, luckModifier: 1.0 },
          },
        }));
      }

      // DERROTA: Si pierde en el Gran Torneo, se pierden las recompensas del torneo y regresa a la ciudad a reintentar desde la Ronda 1
      if (!activeHouseTutorial && !isSurvivalMode && !isGladiatorDuelMode && campaignPhase === 'TOURNAMENT') {
        if (tournamentSavedSnapshot) {
          setPlayerGold(tournamentSavedSnapshot.gold);
          playerDeckRef.current = tournamentSavedSnapshot.deck;
          setPlayerDeck(tournamentSavedSnapshot.deck);
          setOrbBank(tournamentSavedSnapshot.orbs);
          setMaxPlayerHp(tournamentSavedSnapshot.maxHp);
          setPlayerLevel(tournamentSavedSnapshot.level);
          setPlayerExp(tournamentSavedSnapshot.exp);
          setForgeInventory(tournamentSavedSnapshot.forgeInventory);
          setAchievementsInternal(tournamentSavedSnapshot.achievements);
          tieredAchievementsRef.current = tournamentSavedSnapshot.tieredAchievements;
          setTieredAchievements(tournamentSavedSnapshot.tieredAchievements);

          claimingTrophyIdsRef.current.clear();
          tournamentSavedSnapshot.achievements.forEach((a) => {
            if (a.isClaimed) {
              claimingTrophyIdsRef.current.add(a.id);
            }
          });
          claimingTierKeysRef.current.clear();
          tournamentSavedSnapshot.tieredAchievements.forEach((ta) => {
            ta.claimedLevels.forEach((lvl) => {
              claimingTierKeysRef.current.add(`${ta.id}:${lvl}`);
            });
          });

          setTournamentSavedSnapshot(null);
        }
        setTournamentRound(1); // Debe reintentar el Torneo desde Cuartos de final
      }

      // Condición secreta: Contar derrotas EXCLUSIVAMENTE en Campaña 1. Si pierde 20 veces o más (sin necesidad de superarla), se desbloquea "El Torneíllo del Recluta" (Campaña 3, índice 2)
      if (!activeHouseTutorial && !isSurvivalMode && !isGladiatorDuelMode && activeCampaignIndex === 0) {
        setCampaign1LossCount((prev) => {
          const nextCount = prev + 1;
          if (nextCount >= 20 && !unlockedCampaigns.includes(2)) {
            setUnlockedCampaigns((prevUnlocked) => Array.from(new Set([...prevUnlocked, 2])));
            gameAudio.playVictoryFanfare();
            setShowSecretUnlockModal(true);
          }
          return nextCount;
        });
      }

      gameAudio.playDefeatMotif();
      // Reinicio de fichas al finalizar la batalla con derrota
      setFichas({
        J1: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        J2: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      });
      // Mostrar el modal informativo de derrota militar sin invocar 'GAME_OVER' en gameState
      setShowDefeatResultModal(true);
      setGameState((prev) => ({ ...prev, status: 'PLAYING' }));
    }
  };

  const clearSelection = () => {
    selectedUnitIdRef.current = null;
    cellMovRef.current = [];
    cellAtqRef.current = [];
    setSelectedUnitId(null);
    setCellMov([]);
    setCellAtq([]);
  };

  // Deshacer movimiento accidental de una criatura aliada
  const undoLastPlayerMove = () => {
    if (!lastPlayerMoveAction || jugadorActivoRef.current !== 1 || isCombatActionLockedRef.current || isAiRunningRef.current) return;
    const { unitId, fromHex } = lastPlayerMoveAction;
    const liveUnits = unitsRef.current.length > 0 ? unitsRef.current : units;
    const targetUnit = liveUnits.find((u) => u.id === unitId);
    if (!targetUnit) {
      setLastPlayerMoveAction(null);
      return;
    }
    const isFromHexOccupied = liveUnits.some((u) => u.id !== unitId && u.posicion === fromHex);
    if (isFromHexOccupied) {
      setLastPlayerMoveAction(null);
      clearSelection();
      gameAudio.playErrorBuzz();
      triggerBattleMessage('⚠️ No se puede deshacer el movimiento porque la casilla de origen ya está ocupada.', '#f59e0b');
      return;
    }

    updateUnitsSync((prev) =>
      prev.map((u) => (u.id === unitId ? { ...u, posicion: fromHex, yaSeMovio: false } : u))
    );
    setLastPlayerMoveAction(null);
    clearSelection();
    gameAudio.playPowerupChime();
    spawnFloatingText(`↩️ REGRESO`, fromHex, '#38bdf8');
    triggerBattleMessage(`↩️ Movimiento de ${targetUnit.nombre} deshecho con éxito.`, '#38bdf8');
  };

  const {
    spellToConfirm,
    setSpellToConfirm,
    executeMeleeAttack,
    selectSpell,
    confirmSpellCast,
    cancelSpellCast,
    castSpellOnTarget,
    clearCombatResolutionTimeouts,
  } = useCombatResolution({
    unitsRef,
    updateUnitsSync,
    manaRef,
    setMana,
    jugadorActivoRef,
    isCombatActionLockedRef,
    isAiRunningRef,
    hechizoEnEspera,
    setHechizoEnEspera,
    cityTimeOfDay,
    currentOpponentId,
    triggerHapticFeedback,
    triggerBattleMessage,
    spawnFloatingText,
    triggerSpellVFX,
    clearSelection,
    cancelInvocation,
    checkTutorialStepProgression,
    handleMasterDefeated,
    setAchievements,
    setDailyContracts,
    setLastPlayerMoveAction,
    hasTriggeredGladiatorBarkRef,
    setEmergentGladiatorBark,
  });

  useEffect(() => {
    if (currentScreen !== 'COMBAT') {
      clearCombatResolutionTimeouts();
    }
  }, [currentScreen, clearCombatResolutionTimeouts]);

  // Unifica la transición de turno consumiendo isFrozen (-> isFrozen: false, yaSeMovio: true),
  // liberando a las unidades no congeladas (yaSeMovio: false) y descontando turnos de Gravedad al iniciar el turno del invocador.
  const refreshUnitsForNextTurn = (unitsList: UnitData[], startingPlayer?: 1 | 2): UnitData[] =>
    unitsList.map((u) => {
      const nextGravityTurns =
        startingPlayer !== undefined && u.dueño === startingPlayer && (u.gravityTurns || 0) > 0
          ? Math.max(0, (u.gravityTurns || 0) - 1)
          : u.gravityTurns;
      return u.isFrozen
        ? { ...u, isFrozen: false, yaSeMovio: true, gravityTurns: nextGravityTurns }
        : { ...u, yaSeMovio: false, gravityTurns: nextGravityTurns };
    });

  // End Turn & Pass to other player safely using refs to prevent stale closure loops
  const passTurn = () => {
    if (isAiRunningRef.current || isCombatActionLockedRef.current) return;

    setLastPlayerMoveAction(null);
    cancelInvocation();
    clearSelection();
    setHechizoEnEspera(null);
    setModalEscalera(null);
    setDadosLanzados(false);
    setResultadoDados([]);
    setCombatLock(true);

    const currentP = jugadorActivoRef.current;

    // APLICAR EFECTOS DE CASILLAS ESPECIALES AL FINALIZAR EL TURNO DEL JUGADOR
    let currentUnitsForTurn = unitsRef.current.length > 0 ? unitsRef.current : units;
    if (specialRunes.length > 0) {
      let gainedMana = false;
      currentUnitsForTurn = currentUnitsForTurn.map((u) => {
        if (u.dueño === currentP) {
          const runeOnHex = specialRunes.find((r) => r.hexId === u.posicion);
          if (runeOnHex) {
            if (runeOnHex.type === 'LAVA') {
              const burnedHp = Math.max(1, u.hpActual - 1);
              spawnFloatingText('🔥 LAVA (-1 HP / +2 ATK)', u.posicion, '#f97316');
              triggerBattleMessage(`🔥 ${u.nombre} se impregna de Lava: -1 HP de quemadura pero +2 ATK en su próximo golpe.`, '#f97316');
              return {
                ...u,
                hpActual: burnedHp,
                bonusDamageNextTurn: (u.bonusDamageNextTurn || 0) + 2,
              };
            } else if (runeOnHex.type === 'HEAL') {
              const healedHp = Math.min(u.hpMax, u.hpActual + 2);
              spawnFloatingText('💧 MANANTIAL (+2 HP)', u.posicion, '#10b981');
              triggerBattleMessage(`💧 Fuente de Manantial: ${u.nombre} recupera +2 HP.`, '#10b981');
              return {
                ...u,
                hpActual: healedHp,
              };
            } else if (runeOnHex.type === 'MANA') {
              gainedMana = true;
              spawnFloatingText('⚡ MANÁ CÓSMICO (+1M)', u.posicion, '#38bdf8');
              triggerBattleMessage(`⚡ Runa Cósmica: Otorga +1 Maná adicional al Invocador.`, '#38bdf8');
            }
          }
        }
        return u;
      });

      if (gainedMana) {
        const playerKey = `J${currentP}` as 'J1' | 'J2';
        const nextMana = updateManaSync((m) => ({
          ...m,
          [playerKey]: Math.min(10, m[playerKey] + 1),
        }));
        if (currentP === 1 && nextMana.J1 >= 10) {
          syncAchievementsNow({ manaJ1: nextMana.J1 });
        }
      }
    }

    const nextPlayer: 1 | 2 = currentP === 1 ? 2 : 1;
    jugadorActivoRef.current = nextPlayer;
    setJugadorActivo(nextPlayer);

    // Consolidar un único estado síncrono para las unidades al pasar de turno
    const refreshedUnits = refreshUnitsForNextTurn(currentUnitsForTurn, nextPlayer);
    unitsRef.current = refreshedUnits;
    setUnits(refreshedUnits);

    triggerBattleMessage(`TURNO JUGADOR ${nextPlayer}`, nextPlayer === 1 ? '#38bdf8' : '#f43f5e');

    // If it's now AI turn (Player 2), run AI logic exactly once. If returning to Player 1, unlock immediately.
    if (nextPlayer === 2) {
      scheduleCombatFxTimeout(() => {
        executeAITurn();
      }, 800);
    } else {
      setCombatLock(false);
    }
  };

  const executeAITurn = () => {
    runAiTurn({
      isAiRunningRef,
      jugadorActivoRef,
      setJugadorActivo,
      setCombatLock,
      unitsRef,
      updateUnitsSync,
      manaRef,
      setMana,
      currentAiTacticRef,
      currentAiSpellsRef,
      aiDrawPileRef,
      aiDrawPile,
      setAiDrawPile,
      aiUsedPileRef,
      aiUsedPile,
      setAiUsedPile,
      activeCampaignIndex,
      rollDieWithCampaignRng,
      specialRunes,
      cityTimeOfDay,
      aiTimeoutsRef,
      setAscendedCutscene,
      setFichas,
      setDadosLanzados,
      setResultadoDados,
      spawnFloatingText,
      triggerSpellVFX,
      triggerBattleMessage,
      handleMasterDefeated,
      cancelInvocation,
      clearSelection,
      refreshUnitsForNextTurn,
    });
  };

  // Modales abiertos globales
  const isAnyGlobalModalOpen = Boolean(
    isGameMenuOpen ||
    isCodexOpen ||
    isTrophyModalOpen ||
    isTieredModalOpen ||
    isStatsModalOpen ||
    showSaveConfirmModal ||
    showExitConfirmModal ||
    showReturnTitleConfirmModal ||
    showResetConfirmModal ||
    isConfirmNewCampaignOpen ||
    lockedCampaignAlertModal ||
    secretCodeActivatedModal ||
    assignedSummary ||
    isHowToPlayOpen ||
    isCampaignSelectorOpen ||
    isCampaignLoadingActive ||
    isCombatLoadingActive ||
    isColiseumDifficultyModalOpen ||
    isMasterPieceModalOpen ||
    isAssetDownloaderOpen ||
    isGladiatorDuelModalOpen ||
    showNameModal ||
    showSecretUnlockModal ||
    showColiseumUnlockedHub ||
    showDefeatResultModal ||
    victoryAchievementModal ||
    pendingRewardModal ||
    deckFullModal ||
    deckIncompleteModal ||
    inspectedCreature ||
    tutorialCompletionModal ||
    levelUpChoiceModal ||
    showDevPanel ||
    gameState.status === 'VICTORY' ||
    gameState.status === 'GAME_OVER' ||
    gameState.status === 'PAUSED'
  );
  isGameMenuOpenRef.current = isGameMenuOpen;
  isTrophyModalOpenRef.current = isTrophyModalOpen;
  isTieredModalOpenRef.current = isTieredModalOpen;
  isStatsModalOpenRef.current = isStatsModalOpen;
  isMasterPieceModalOpenRef.current = isMasterPieceModalOpen;
  isAssetDownloaderOpenRef.current = isAssetDownloaderOpen;
  showSaveConfirmModalRef.current = showSaveConfirmModal;
  showReturnTitleConfirmModalRef.current = showReturnTitleConfirmModal;
  showExitConfirmModalRef.current = showExitConfirmModal;
  showResetConfirmModalRef.current = showResetConfirmModal;
  isHouseDialogueOpenRef.current = isHouseDialogueOpen;
  isAnyGlobalModalOpenRef.current = isAnyGlobalModalOpen;

  return (
    <ErrorBoundary
      key="eb_app_safe"
      fallbackTitle="SE PRODUJO UN ERROR INESPERADO"
      fallbackMessage="Se detectó un fallo de interfaz. Puedes regresar a la pantalla segura sin perder tu progreso."
      resetLabel="Volver al Título"
      onResetToSafeScreen={() => {
        clearAiTimeouts();
        clearRollDiceTimeout();
        clearCombatFxTimeouts();
        clearCombatResolutionTimeouts();
        setCombatLock(false);
        setPendingLevelUpQueue([]);
        setLevelUpChoiceModal(null);
        setIsCampaignLoadingActive(false);
        setIsCombatLoadingActive(false);
        setCurrentScreen('TITLE');
        setGameState((prev) => ({ ...prev, status: 'START' }));
      }}
    >
    <div
      className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col bg-slate-950 text-white font-sans select-none pr-[env(safe-area-inset-right,0px)] pl-[env(safe-area-inset-left,0px)]"
      style={{ height: '100dvh', width: '100vw' }}
    >
      {/* OVERLAY ORIENTACIÓN HORIZONTAL FORZADA EN ANDROID / MÓVILES */}
      {isPortrait && (
        <div
          onClick={async () => {
            try {
              const screenAny = window.screen as any;
              if (screenAny?.orientation?.lock) {
                await screenAny.orientation.lock('landscape');
              }
            } catch (e) {
              // Ignore
            }
          }}
          className={`fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-6 text-center select-none ${isAndroidDevice() ? '' : 'backdrop-blur-md'}`}
        >
          <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-4xl mb-4 shadow-[0_0_40px_rgba(245,158,11,0.6)] animate-pulse">
            🔄
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-serif tracking-widest text-amber-300 mb-2">
            GIRA TU DISPOSITIVO
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xs font-sans leading-relaxed mb-6">
            Para disfrutar de la mejor experiencia táctica en el tablero 3D y los dados, por favor <strong>coloca tu teléfono en posición horizontal</strong>.
          </p>
          <div className="px-5 py-2.5 rounded-full bg-black/90 border border-amber-500/60 text-xs font-serif font-bold text-amber-300 shadow">
            📱 Modo Horizontal (Landscape) Requerido
          </div>
        </div>
      )}

      {/* Background Music Player con selección dinámica según la fase */}
      <BackgroundMusic
        url={isMusicPlaying ? getDynamicBgmUrl() : ''}
        isPlaying={isMusicPlaying}
        isMuted={isMusicMuted}
        volume={musicVolume}
      />

      {/* BOTÓN FLOTANTE DEL ENGRANAJE (PARA MOSTRAR U OCULTAR LA BARRA SUPERIOR EN LA CIUDAD) */}
      {currentScreen === 'CITY_EXPLORATION' && (
        <button
          type="button"
          onClick={() => {
            gameAudio.playCrispClick();
            setIsTopHudVisible((prev) => !prev);
          }}
          className={`fixed top-2.5 right-2.5 z-40 p-2 sm:p-2.5 rounded-full border transition transform active:scale-90 shadow-2xl flex items-center justify-center cursor-pointer select-none ${isAndroidDevice() ? '' : 'backdrop-blur-md'} ${
            isTopHudVisible
              ? 'bg-black/85 sm:bg-black/90 text-amber-300 border-amber-500/70 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
              : 'bg-black/95 text-amber-400 border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.85)] animate-pulse'
          }`}
          aria-label="Alternar barra superior"
        >
          <Settings className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${isTopHudVisible ? '' : 'rotate-90 text-amber-300'}`} />
        </button>
      )}

      {/* TOP HEADER / SAFE HUD BAR (VISIBLE EXCLUSIVAMENTE EN LA CIUDAD) */}
      {currentScreen === 'CITY_EXPLORATION' && isTopHudVisible && (
        <header className={`h-14 border-b border-amber-500/30 bg-black/85 ${isAndroidDevice() ? '' : 'backdrop-blur'} px-4 pr-14 sm:pr-14 flex items-center justify-between z-30 shrink-0 shadow-lg animate-fadeIn transition-all`}>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* INDICADOR INFORMATIVO DEL CICLO DÍA / ATARDECER / NOCHE Y CLIMA */}
            {currentScreen === 'CITY_EXPLORATION' && (
              <div
                className="px-3 py-1 rounded-full text-xs font-serif font-black tracking-wide bg-black/90 text-amber-300 border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.6)] flex items-center gap-1.5"
              >
                <span className="text-sm">{cityTimeOfDay === 0 ? '☀️' : cityTimeOfDay === 1 ? '🌅' : '🌙'}</span>
                <span>{cityTimeOfDay === 0 ? 'DÍA' : cityTimeOfDay === 1 ? 'ATARDECER' : 'NOCHE'}</span>
                <span className="text-[9px] font-mono text-cyan-300 ml-0.5">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}

            {/* CONTROL DE ROTACIÓN DE VISTA 360° Y BOTÓN DE ZOOM DE LA CIUDAD */}
            {currentScreen === 'CITY_EXPLORATION' && (
              <div className="flex items-center gap-1.5">
                {/* Control de Rotación */}
                <div className="flex items-center gap-1 bg-black/90 px-2 py-0.5 rounded-full border border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playCrispClick();
                      setCityCameraAngle((prev) => prev - Math.PI / 4);
                    }}
                    className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/50 hover:border-amber-400 text-xs font-bold transition transform active:scale-90 cursor-pointer"
                    aria-label="Girar cámara a la izquierda"
                  >
                    ↺
                  </button>

                  <span className="text-[9px] font-mono font-bold text-cyan-300 px-1 select-none">
                    {Math.round(((cityCameraAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) * (180 / Math.PI))}°
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playCrispClick();
                      setCityCameraAngle((prev) => prev + Math.PI / 4);
                    }}
                    className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/50 hover:border-amber-400 text-xs font-bold transition transform active:scale-90 cursor-pointer"
                    aria-label="Girar cámara a la derecha"
                  >
                    ↻
                  </button>

                  {Math.abs(cityCameraAngle % (Math.PI * 2)) > 0.05 && (
                    <button
                      type="button"
                      onClick={() => {
                        gameAudio.playCrispClick();
                        setCityCameraAngle(0);
                      }}
                      className="px-1.5 py-0.2 rounded-full bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-400 font-mono text-[8px] font-bold transition transform active:scale-90 cursor-pointer"
                    >
                      0°
                    </button>
                  )}
                </div>

                {/* BOTÓN DE ZOOM DE LA CIUDAD (Aleja la vista panorámicamente para ver todo el mapa) */}
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playCrispClick();
                    setCityZoomLevel((prev) => (prev === 1.0 ? 1.6 : prev === 1.6 ? 2.4 : prev === 2.4 ? 3.4 : 1.0));
                  }}
                  className="px-2.5 py-1 rounded-full bg-black/90 hover:bg-slate-900 text-amber-300 border border-amber-500/60 hover:border-amber-400 text-xs font-serif font-black tracking-wider transition transform active:scale-95 shadow-[0_0_12px_rgba(245,158,11,0.3)] flex items-center gap-1 cursor-pointer"
                  aria-label="Alejar cámara de la ciudad"
                >
                  <span>🔭</span>
                  <span className="font-mono text-[10px] text-cyan-300">
                    {cityZoomLevel === 1.0
                      ? 'VISTA 1x'
                      : cityZoomLevel === 1.6
                      ? 'ALEJADO 1.6x'
                      : cityZoomLevel === 2.4
                      ? 'PANORÁMICA 2.4x'
                      : 'MAPA COMPLETO 3.4x'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Action Hub Navigation & Menu */}
          <div className="flex items-center gap-2">
            {/* Botón Pantalla Completa (Solo Icono sin texto para máxima limpieza) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                gameAudio.playCrispClick();
                toggleAppFullscreen();
              }}
              className="w-9 h-9 rounded-full bg-gradient-to-r from-amber-500/25 via-yellow-500/15 to-amber-500/25 hover:bg-amber-500/35 text-amber-300 border-2 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center justify-center text-sm font-bold active:scale-95 cursor-pointer select-none"
              aria-label="Alternar Pantalla Completa"
            >
              <span>{isFullscreen ? '🗗' : '⛶'}</span>
            </button>

            {/* Botón Guardar Progreso en el Header */}
            <button
              onClick={saveProgress}
              disabled={campaignPhase === 'TOURNAMENT' && tournamentRound > 1}
              className={`px-3.5 py-1 rounded-full text-xs font-serif font-bold border transition flex items-center gap-1 shadow active:scale-95 ${
                campaignPhase === 'TOURNAMENT' && tournamentRound > 1
                  ? 'bg-slate-900 text-slate-500 border-slate-700 cursor-not-allowed'
                  : 'bg-black/85 hover:bg-emerald-950 text-emerald-300 border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
              }`}
            >
              GUARDAR
            </button>

            <button
              onClick={() => setIsGameMenuOpen(true)}
              className="px-3.5 py-1 text-xs font-serif font-bold rounded-full bg-black/85 hover:bg-black/95 text-amber-300 border border-amber-500/80 hover:border-amber-400 transition flex items-center gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              MENÚ
            </button>
          </div>
        </header>
      )}

      {/* MAIN VIEW AREA */}
      <div className="flex-1 w-full min-h-0 relative flex flex-col overflow-hidden">
        {/* VIEW 0: SPLASH SCREEN (Full-screen logo with prompt) */}
        {currentScreen === 'SPLASH' && (
          <div
            onClick={() => {
              gameAudio.playConfirmSelect();
              setCurrentScreen('TITLE');
            }}
            className="absolute inset-0 flex flex-col items-center justify-end bg-black overflow-hidden z-30 cursor-pointer select-none pb-12 px-4"
          >
            {/* The Logo Image covering the entire screen */}
            <FullscreenGameLogo />

            {/* Gradient shadow at bottom to make prompt clearly legible */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />

            {/* Pulsing prompt banner */}
            <div className="relative z-10 flex flex-col items-center max-w-lg w-full text-center">
              <div className={`px-6 py-3 rounded-full bg-black/85 border border-amber-500/70 shadow-[0_0_30px_rgba(245,158,11,0.6)] animate-pulse ${isAndroidDevice() ? '' : 'backdrop-blur-md'}`}>
                <span className="text-xs sm:text-sm md:text-base font-black tracking-widest text-amber-300 font-serif">
                  PRESIONA CUALQUIER TECLA O TOCA LA PANTALLA
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-3 tracking-wider uppercase font-sans drop-shadow">
                Toca en cualquier parte para continuar
              </p>
            </div>
          </div>
        )}

        {/* VIEW 1: TITLE SCREEN (MODULARIZADO EN TitleView.tsx) */}
        {currentScreen === 'TITLE' && (
          <TitleView
            hasSavedGame={hasSavedGame}
            checkHasActualSavedGame={checkHasActualSavedGame}
            titleSelectedIndex={titleSelectedIndex}
            setTitleSelectedIndex={setTitleSelectedIndex}
            onContinue={() => {
              requestAppFullscreen();
              loadSavedProgress();
            }}
            onNewCampaign={() => {
              requestAppFullscreen();
              startNewCampaignFlow();
            }}
            onExit={() => {
              gameAudio.playCrispClick();
              const navAny = navigator as any;
              if (navAny?.app?.exitApp) {
                try { navAny.app.exitApp(); return; } catch (_) {}
              }
              if (navAny?.device?.exitApp) {
                try { navAny.device.exitApp(); return; } catch (_) {}
              }
              setShowExitConfirmModal(true);
              try {
                window.close();
              } catch (_) {}
            }}
            onOpenAssetDownloader={() => {
              gameAudio.playCrispClick();
              setIsAssetDownloaderOpen(true);
            }}
            FullscreenGameLogo={FullscreenGameLogo}
          />
        )}

        {/* VIEW 2: CAMPAIGN MENU / CAMPAMENTO (MODULARIZADO EN CampaignHubView.tsx) */}
        {currentScreen === 'CAMPAIGN_HUB' && (
          <CampaignHubView
            onReturnToTitle={() => setShowReturnTitleConfirmModal(true)}
            onEnterCity={() => {
              requestAppFullscreen();
              setCurrentScreen('CITY_EXPLORATION');
            }}
            onOpenCampaigns={() => {
              requestAppFullscreen();
              setIsCampaignSelectorOpen(true);
            }}
            onOpenColiseum={() => {
              if (!checkDeckComplete('entrar al Coliseo')) return;
              setSurvivalOriginScreen('CAMPAIGN_HUB');
              setIsColiseumDifficultyModalOpen(true);
            }}
            onOpenWorkshop={() => {
              setPreviousScreenBeforeWorkshop('CAMPAIGN_HUB');
              setCurrentScreen('WORKSHOP');
            }}
            onOpenShop={() => {
              setPreviousScreenBeforeShop('CAMPAIGN_HUB');
              setCurrentScreen('SHOP');
            }}
            onOpenCodex={() => {
              setCurrentScreen('CODEX_BOOK');
            }}
            onOpenSpellbook={() => {
              setPreviousScreenBeforeSpellbook('CAMPAIGN_HUB');
              setCurrentScreen('SPELLBOOK');
            }}
            onOpenGameMenu={() => setIsGameMenuOpen(true)}
            onSaveGame={saveProgress}
            hasStartedAnyCampaign={hasStartedAnyCampaign}
            hasEnteredCampaignSession={hasEnteredCampaignSession}
            isForgeUnlocked={unlockedCampaigns.includes(3)}
            onOpenForge={() => {
              setPreviousScreenBeforeForge('CAMPAIGN_HUB');
              setCurrentScreen('FORGE');
            }}
          />
        )}

        {/* VIEW 3: WORKSHOP (TALLER DE DADOS) (MODULARIZADO EN WorkshopView.tsx) */}
        {currentScreen === 'WORKSHOP' && (
          <WorkshopView
            playerDeck={playerDeck}
            setPlayerDeck={setPlayerDeck}
            orbBank={orbBank}
            setOrbBank={setOrbBank}
            playerLevel={playerLevel}
            onClose={() => setCurrentScreen(previousScreenBeforeWorkshop)}
            checkDeckComplete={checkDeckComplete}
            triggerNotification={(text, color) => triggerBattleMessage(text, color)}
            descFontSize={descFontSize}
            deckPresets={deckPresets}
            activeDeckPresetIndex={activeDeckPresetIndex}
            saveCurrentDeckToPreset={saveCurrentDeckToPreset}
            loadDeckFromPreset={loadDeckFromPreset}
            onClearActivePreset={() => setActiveDeckPresetIndex(null)}
            fuseDice={fuseDice}
            FullscreenWorkshopBackground={FullscreenWorkshopBackground}
          />
        )}

        {/* VIEW 4: GRAN FORJA DE DADOS Y ORBES (MODULARIZADO EN ForgeView.tsx) */}
        {currentScreen === 'FORGE' && (
          <ForgeView
            setPlayerDeck={setPlayerDeck}
            setOrbBank={setOrbBank}
            forgeInventory={forgeInventory}
            setForgeInventory={setForgeInventory}
            forgeMasteryLevel={forgeMasteryLevel}
            setForgeMasteryLevel={setForgeMasteryLevel}
            forgeMasteryExp={forgeMasteryExp}
            setForgeMasteryExp={setForgeMasteryExp}
            forgeTotalAttempts={forgeTotalAttempts}
            setForgeTotalAttempts={setForgeTotalAttempts}
            forgeTotalSuccesses={forgeTotalSuccesses}
            setForgeTotalSuccesses={setForgeTotalSuccesses}
            onClose={() => setCurrentScreen(previousScreenBeforeForge)}
            activeCampaignIndex={activeCampaignIndex}
            triggerNotification={(text, color) => triggerBattleMessage(text, color)}
            RARIDADES={RARIDADES}
            descFontSize={descFontSize}
            FullscreenForgeBackground={FullscreenForgeBackground}
          />
        )}

        {/* VIEW 5: LIBRO DE HECHIZOS (MODULARIZADO EN GrimoireView.tsx) */}
        {currentScreen === 'SPELLBOOK' && (
          <GrimoireView
            unlockedSpells={unlockedSpells}
            maxSpellSlots={maxSpellSlots}
            equippedSpells={equippedSpells}
            setEquippedSpells={setEquippedSpells}
            playerLevel={playerLevel}
            onClose={() => setCurrentScreen(previousScreenBeforeSpellbook || 'CAMPAIGN_HUB')}
            onOpenShop={() => {
              setPreviousScreenBeforeShop('SPELLBOOK');
              setCurrentScreen('SHOP');
            }}
            FullscreenLibroBackground={FullscreenLibroBackground}
            GRIMOIRE_SPELLS={GRIMOIRE_SPELLS}
            MAIN_CDN_BASE={MAIN_CDN_BASE}
            MAIN_RAW_BASE={MAIN_RAW_BASE}
            descFontSize={descFontSize}
            triggerNotification={(text, color) => triggerBattleMessage(text, color)}
          />
        )}

        {/* VIEW 5: CÓDICE DEL DESTINO / ENCICLOPEDIA (MODULARIZADO EN CodexView.tsx) */}
        {(currentScreen === 'CODEX_BOOK' || isCodexOpen) && (
          <CodexView
            playerDeck={playerDeck}
            orbBank={orbBank}
            unlockedSpells={unlockedSpells}
            defeatedAlleyOpponents={defeatedAlleyOpponents}
            defeatedTournamentContenders={defeatedTournamentContenders}
            isChampion={Boolean(campaignsProgress[activeCampaignIndex]?.completed)}
            tournamentRound={tournamentRound}
            campaignPhase={campaignPhase}
            activeCampaignIndex={activeCampaignIndex}
            campaignsProgress={campaignsProgress}
            onClose={() => {
              setIsCodexOpen(false);
              if (currentScreen === 'CODEX_BOOK') {
                setCurrentScreen('CAMPAIGN_HUB');
              }
            }}
            FullscreenCodexBackground={FullscreenCodexBackground}
          />
        )}

        {/* VIEW 6: TIENDA DE SALOMÓN (MODULARIZADO EN ShopView.tsx) */}
        {currentScreen === 'SHOP' && (
          <ShopView
            playerGold={playerGold}
            setPlayerGold={setPlayerGold}
            playerDeck={playerDeck}
            setPlayerDeck={setPlayerDeck}
            orbBank={orbBank}
            setOrbBank={setOrbBank}
            unlockedSpells={unlockedSpells}
            setUnlockedSpells={setUnlockedSpells}
            maxSpellSlots={maxSpellSlots}
            setMaxSpellSlots={setMaxSpellSlots}
            playerLevel={playerLevel}
            onClose={() => setCurrentScreen(previousScreenBeforeShop || 'CAMPAIGN_HUB')}
            GRIMOIRE_SPELLS={GRIMOIRE_SPELLS}
            ELEMENT_ORBS={ELEMENT_ORBS}
            OrbThumbnail={OrbThumbnail}
            GoldCoinIcon={GoldCoinIcon}
            FullscreenShopBackground={FullscreenShopBackground}
            MAIN_CDN_BASE={MAIN_CDN_BASE}
            MAIN_RAW_BASE={MAIN_RAW_BASE}
          />
        )}

        {/* VIEW 7: MUNDO 3D EXPLORABLE EN TIEMPO REAL - CIUDAD DE LAS SIETE PUERTAS (MODULARIZADO EN CityExplorationView.tsx) */}
        {currentScreen === 'CITY_EXPLORATION' && (!isCampaignLoadingActive || isCityModelsReady) && (
          <ErrorBoundary
            key="eb_city"
            fallbackTitle="ERROR EN EL ENTORNO 3D DE LA CIUDAD"
            fallbackMessage="El dispositivo no pudo renderizar la escena 3D de la Ciudadela."
            onResetToSafeScreen={() => {
              setIsCampaignLoadingActive(false);
              setCurrentScreen('CAMPAIGN_HUB');
            }}
          >
            <CityExplorationView
              playerName={playerName}
              activeCampaignIndex={activeCampaignIndex}
              isChampionOfCampaign={Boolean(campaignsProgress[activeCampaignIndex]?.completed)}
              completionsCount={campaignsProgress[activeCampaignIndex]?.completionsCount || 0}
              isGameMenuOpen={isGameMenuOpen}
              isCodexOpen={isCodexOpen}
              isTrophyOpen={isTrophyModalOpen}
              isSaveModalOpen={showSaveConfirmModal}
              isInspecting={Boolean(inspectedCreature)}
              pendingRewardModal={pendingRewardModal}
              isGlobalModalOpen={isAnyGlobalModalOpen}
              cityCameraAngle={cityCameraAngle}
              cityZoomLevel={cityZoomLevel}
              activeCityDialogue={activeCityDialogue}
              setActiveCityDialogue={setActiveCityDialogue}
              lastCityPlayerPos={lastCityPlayerPos}
              setLastCityPlayerPos={setLastCityPlayerPos}
              campaignPhase={campaignPhase}
              alleyCurrentFight={alleyCurrentFight}
              defeatedAlleyOpponents={defeatedAlleyOpponents}
              cityTimeOfDay={cityTimeOfDay}
              onStartAlleyFight={(oppId) => {
                startCampaignEncounter(oppId);
              }}
              onEnterArena={handleEnterArena}
              onEnterShop={handleEnterShop}
              onEnterWorkshop={handleEnterWorkshop}
              onEnterTavern={handleEnterTavern}
              onOpenCodex={handleOpenCodex}
              onOpenSpellbook={handleOpenSpellbook}
              onReturnToHub={handleReturnToHub}
              onEnterHouse={handleEnterHouse}
              onSceneReady={() => setIsCitySceneReady(true)}
            />
          </ErrorBoundary>
        )}

        {/* VIEW 7.7: INTERIOR 3D EXPLORABLE DE LA TIENDA DE DADOS DE SOLOMON (MODULARIZADO EN ShopInteriorView.tsx) */}
        {currentScreen === 'SHOP_INTERIOR' && (
          <ErrorBoundary
            key="eb_shop_interior"
            fallbackTitle="ERROR EN LA ESCENA 3D DE LA TIENDA"
            onResetToSafeScreen={() => setCurrentScreen('CAMPAIGN_HUB')}
          >
            <ShopInteriorView
              playerName={playerName}
              isModalActive={isAnyGlobalModalOpen || isTrophyModalOpen}
              shopActiveDialogue={shopActiveDialogue}
              setShopActiveDialogue={setShopActiveDialogue}
              onOpenStoreCatalog={() => {
                setPreviousScreenBeforeShop('SHOP_INTERIOR');
                setCurrentScreen('SHOP');
              }}
              onExitShop={handleExitShop}
            />
          </ErrorBoundary>
        )}

        {/* VIEW 7.8: INTERIOR 3D EXPLORABLE DEL TALLER Y FORJA DEL MAESTRO VULKAN (MODULARIZADO EN WorkshopInteriorView.tsx) */}
        {currentScreen === 'WORKSHOP_INTERIOR' && (
          <ErrorBoundary
            key="eb_workshop_interior"
            fallbackTitle="ERROR EN LA ESCENA 3D DEL TALLER"
            onResetToSafeScreen={() => setCurrentScreen('CAMPAIGN_HUB')}
          >
            <WorkshopInteriorView
              playerName={playerName}
              isForgeUnlocked={unlockedCampaigns.includes(3)}
              isModalActive={isAnyGlobalModalOpen || isTrophyModalOpen}
              workshopActiveDialogue={workshopActiveDialogue}
              setWorkshopActiveDialogue={setWorkshopActiveDialogue}
              onOpenWorkshopCatalog={() => {
                setPreviousScreenBeforeWorkshop('WORKSHOP_INTERIOR');
                setCurrentScreen('WORKSHOP');
              }}
              onOpenForgeCatalog={() => {
                if (!unlockedCampaigns.includes(3)) {
                  gameAudio.playErrorBuzz();
                  triggerBattleMessage('🔒 La Gran Fragua requiere desbloquear las campañas avanzadas.', '#f43f5e');
                  return;
                }
                setPreviousScreenBeforeForge('WORKSHOP_INTERIOR');
                setCurrentScreen('FORGE');
              }}
              onExitWorkshop={handleExitWorkshop}
            />
          </ErrorBoundary>
        )}

        {/* VIEW 7.9: INTERIOR 3D EXPLORABLE DEL COLISEO Y GRAN ARENA (MODULARIZADO EN ColiseumView.tsx) */}
        {currentScreen === 'COLISEUM_INTERIOR' && (
          <ErrorBoundary
            key="eb_coliseum_interior"
            fallbackTitle="ERROR EN LA ESCENA 3D DEL COLISEO"
            onResetToSafeScreen={() => setCurrentScreen('CAMPAIGN_HUB')}
          >
            <ColiseumView
              playerName={playerName}
              campaignPhase={campaignPhase}
              alleyFightNumber={alleyCurrentFight}
              isColiseumCleared={Boolean(campaignsProgress[0]?.completed || campaignsProgress[activeCampaignIndex]?.completed || (campaignsProgress[activeCampaignIndex]?.completionsCount || 0) > 0 || survivalHighScore >= 5)}
              isModalActive={isAnyGlobalModalOpen || isColiseumDifficultyModalOpen || isTrophyModalOpen}
              activeDialogue={coliseumActiveDialogue}
              setActiveDialogue={setColiseumActiveDialogue}
              onStartTournamentBattle={() => {
                startCampaignEncounter();
              }}
              onStartSurvivalColiseum={() => {
                setSurvivalOriginScreen('COLISEUM_INTERIOR');
                setIsColiseumDifficultyModalOpen(true);
              }}
              onOpenGladiatorDuel={() => {
                const isCleared = Boolean(campaignsProgress[0]?.completed || campaignsProgress[activeCampaignIndex]?.completed || (campaignsProgress[activeCampaignIndex]?.completionsCount || 0) > 0 || survivalHighScore >= 5);
                if (!isCleared) {
                  gameAudio.playErrorBuzz();
                  triggerBattleMessage('🔒 El Desafío de Gladiadores requiere haber superado el Coliseo.', '#f43f5e');
                  return;
                }
                setIsGladiatorDuelModalOpen(true);
              }}
              onExitColiseum={handleExitColiseum}
            />
          </ErrorBoundary>
        )}

        {/* VIEW 7.6: INTERIOR 3D EXPLORABLE DE LA TABERNA CON NPC Y TABLÓN DE CONTRATOS (MODULARIZADO EN TavernInteriorView.tsx) */}
        {currentScreen === 'TAVERN_INTERIOR' && (
          <ErrorBoundary
            key="eb_tavern_interior"
            fallbackTitle="ERROR EN LA ESCENA 3D DE LA TABERNA"
            onResetToSafeScreen={() => setCurrentScreen('CAMPAIGN_HUB')}
          >
            <TavernInteriorView
              playerName={playerName}
              dailyContracts={dailyContracts}
              setDailyContracts={setDailyContracts}
              playerLevel={playerLevel}
              playerGold={playerGold}
              setPlayerGold={setPlayerGold}
              unlockedCampaigns={unlockedCampaigns}
              isAnyGlobalModalOpen={isAnyGlobalModalOpen}
              isTrophyModalOpen={isTrophyModalOpen}
              tavernActiveDialogue={tavernActiveDialogue}
              setTavernActiveDialogue={setTavernActiveDialogue}
              isTavernContractBoardOpen={isTavernContractBoardOpen}
              setIsTavernContractBoardOpen={setIsTavernContractBoardOpen}
              onOpenSpellbook={() => {
                setPreviousScreenBeforeSpellbook('TAVERN_INTERIOR');
                setCurrentScreen('SPELLBOOK');
              }}
              onOpenCodex={() => {
                setIsCodexOpen(true);
              }}
              onExitTavern={handleExitTavern}
              onClaimContractAchievement={(cId) => {
                setAchievements((prev) =>
                  prev.map((a) => {
                    if (a.id === 'ach_contract_first_claim') {
                      return { ...a, progress: 1, isUnlocked: true };
                    }
                    if (a.id === 'ach_contract_five_claims') {
                      const nextP = Math.min(5, (a.progress || 0) + 1);
                      return { ...a, progress: nextP, isUnlocked: nextP >= 5 };
                    }
                    if (cId === 'contract_camp2_abyss' && a.id === 'ach_contract_abyss_clear') {
                      return { ...a, progress: 3, isUnlocked: true };
                    }
                    if (cId === 'contract_camp3_recruit' && a.id === 'ach_contract_recruit_clear') {
                      return { ...a, progress: 4, isUnlocked: true };
                    }
                    if (cId === 'contract_camp4_shadow' && a.id === 'ach_contract_shadow_clear') {
                      return { ...a, progress: 2, isUnlocked: true };
                    }
                    if (cId === 'contract_minion_slayer' && a.id === 'ach_contract_master_slayer') {
                      return { ...a, progress: 4, isUnlocked: true };
                    }
                    if (cId === 'contract_coliseum_gladiator' && a.id === 'ach_contract_coliseum_glory') {
                      return { ...a, progress: 2, isUnlocked: true };
                    }
                    return a;
                  })
                );
              }}
              triggerNotification={(text, color) => triggerBattleMessage(text, color)}
            />
          </ErrorBoundary>
        )}

        {/* VIEW 7.5: INTERIOR DE CASA RESIDENCIAL 3D TRANSITABLE (MODULARIZADO EN HouseInteriorView.tsx) */}
        {currentScreen === 'HOUSE_INTERIOR' && currentVisitedHouse && (
          <ErrorBoundary
            key="eb_house_interior"
            fallbackTitle="ERROR EN EL INTERIOR 3D"
            onResetToSafeScreen={() => setCurrentScreen('CAMPAIGN_HUB')}
          >
            <HouseInteriorView
              currentVisitedHouse={currentVisitedHouse}
              playerName={playerName}
              isAnyGlobalModalOpen={isAnyGlobalModalOpen}
              isHouseDialogueOpen={isHouseDialogueOpen}
              setIsHouseDialogueOpen={setIsHouseDialogueOpen}
              completedHouseTutorials={completedHouseTutorials}
              setCompletedHouseTutorials={setCompletedHouseTutorials}
              onExit={() => {
                gameAudio.playConfirmSelect();
                if (currentVisitedHouse) {
                  setLastCityPlayerPos(getHouseSafeExitPos(currentVisitedHouse));
                }
                setIsHouseDialogueOpen(false);
                setCurrentScreen('CITY_EXPLORATION');
              }}
              onStartLessonCombat={(house) => startHouseTutorialCombat(house)}
              onUnlockAllTutorialsAchievement={() => {
                setAchievementsInternal((prev) =>
                  prev.map((a) =>
                    a.id === 'ach_all_tutorials'
                      ? {
                          ...a,
                          progress: 12,
                          isUnlocked: true,
                        }
                      : a
                  )
                );
                gameAudio.playVictoryFanfare();
                triggerBattleMessage('🏆 ¡LOGRO DESBLOQUEADO: GRAN ERUDITO DE LOS DADOS! (12/12 Lecciones)', '#fbbf24');
              }}
              triggerNotification={(text, color) => triggerBattleMessage(text, color)}
            />
          </ErrorBoundary>
        )}

        {/* VIEW 8: 3D COMBAT ARENA (ENCAPSULADO EN CombatArenaView.tsx PARA AISLAR ESTADOS Y RE-RENDERS) */}
        {currentScreen === 'COMBAT' && (!isCombatLoadingActive || isCombatBoardReady) && (
          <ErrorBoundary
            key="eb_combat"
            fallbackTitle="ERROR EN LA ARENA DE COMBATE 3D"
            fallbackMessage="Ocurrió un error al cargar el tablero o los modelos 3D del combate."
            onResetToSafeScreen={() => {
              clearAiTimeouts();
              clearRollDiceTimeout();
              clearCombatFxTimeouts();
              clearCombatResolutionTimeouts();
              setCombatLock(false);
              clearSelection();
              cancelInvocation();
              setHechizoEnEspera(null);
              setSpellToConfirm(null);
              setFloatingTexts([]);
              setSpellVFXList([]);
              setEmergentGladiatorBark(null);
              setModalEleccionDoble(null);
              setModalEscalera(null);
              setModalLimiteCriaturas(null);
              setPendingRewardModal(null);
              setShowRetireConfirm(false);
              setShowDefeatResultModal(false);
              setSelectBankedCrestModal(null);
              setAscendedCutscene(null);
              setTutorialCompletionModal(null);
              setVictoryAchievementModal(null);
              setShowColiseumUnlockedHub(false);
              setShowSecretUnlockModal(false);
              setLastVictoryGoldReward(null);
              setPendingLevelUpQueue([]);
              setLevelUpChoiceModal(null);
              setIsCombatLoadingActive(false);
              setIsSurvivalMode(false);
              setIsGladiatorDuelMode(false);
              setGladiatorDuelRival(null);
              setActiveHouseTutorial(null);
              isTutorialBattleActiveRef.current = false;
              restoreTutorialEquippedSpells();
              setCurrentScreen('CAMPAIGN_HUB');
              setGameState((prev) => ({ ...prev, status: 'START' }));
            }}
          >
            <CombatArenaView
            units={units}
            selectedUnitId={selectedUnitId}
            cellMov={cellMov}
            cellAtq={cellAtq}
            cellInv={cellInv}
            rollingDiceAnimation={rollingDiceAnimation}
            floatingTexts={floatingTexts}
            spellVFXList={spellVFXList}
            specialRunes={specialRunes}
            resultadoDados={resultadoDados}
            cityTimeOfDay={cityTimeOfDay}
            isGameMenuOpen={isGameMenuOpen}
            isHowToPlayOpen={isHowToPlayOpen}
            isCombatLoadingActive={isCombatLoadingActive}
            gameStateStatus={gameState.status}
            onTileClick={handleTileClick}
            onUnitClick={handleUnitClick}
            jugadorActivo={jugadorActivo}
            mana={mana}
            playerName={playerName}
            dadosLanzados={dadosLanzados}
            isCombatActionLocked={isCombatActionLocked || isAiRunningRef.current}
            onRollDice={rollTurnDice}
            invocacionPendiente={invocacionPendiente}
            nivelPendiente={nivelPendiente}
            esTransmutacionDirecta={esTransmutacionDirecta}
            onBankCrest={bankLevelCrest}
            onCancelInvocation={cancelInvocation}
            onSummonWithMana={summonWithMana}
            equippedSpells={equippedSpells}
            hechizoEnEspera={hechizoEnEspera}
            onSelectSpell={selectSpell}
            onCancelSpell={cancelSpellCast}
            lastPlayerMoveAction={lastPlayerMoveAction}
            onUndoMove={undoLastPlayerMove}
            onPassTurn={passTurn}
            onRetire={() => {
              if (campaignPhase === 'TOURNAMENT' && !isSurvivalMode && !isGladiatorDuelMode) {
                triggerBattleMessage('¡NO PUEDES RETIRARTE DEL GRAN TORNEO!', '#ef4444');
                gameAudio.playErrorBuzz();
                return;
              }
              gameAudio.playCrispClick();
              setShowRetireConfirm(true);
            }}
            campaignPhase={campaignPhase}
            isSurvivalMode={isSurvivalMode}
            isGladiatorDuelMode={isGladiatorDuelMode}
            fichas={fichas}
            onSummonBankedCrest={summonBankedCrest}
            isLogOpen={isLogOpen}
            setIsLogOpen={setIsLogOpen}
            combatLog={combatLog}
            currentOpponentId={currentOpponentId}
            selectBankedCrestModal={selectBankedCrestModal}
            onCloseBankedCrestModal={() => setSelectBankedCrestModal(null)}
            onExecuteSummonFromBank={(lvl, crest) => executeSummonFromBank(lvl, crest)}
            modalLimiteCriaturas={modalLimiteCriaturas}
            onCloseModalLimiteCriaturas={() => {
              // Evitar descartar la tirada por cierre accidental; el jugador debe elegir Guardar Ficha o Convertir en Maná
            }}
            onBankCrestFromLimit={(lvl) => {
              if (!modalLimiteCriaturasRef.current) return;
              const limitSnapshot = modalLimiteCriaturasRef.current;
              setModalLimiteCriaturas(null);
              if (lvl > 0 && lvl < 7) {
                const maestriaVal = limitSnapshot.maestria || 1;
                const stats = calculateCreatureStats(lvl, maestriaVal);
                const catalogEntry = CODEX_J1_CREATURES.find((c) => c.nivel === lvl);
                const creatureTitle = catalogEntry ? catalogEntry.nombre : `Guardián L${lvl}`;
                const newBankedItem: BankedCrestItem = {
                  id: 'bcrest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                  level: lvl,
                  maestria: maestriaVal,
                  rangoNombre: stats.rangoNombre,
                  orbs: [...pendingSummonOrbsRef.current],
                  name: creatureTitle,
                  catalystHp: catalystBonusesRef.current.hp,
                  catalystAtk: catalystBonusesRef.current.atk,
                };
                const nextBankedCount = Object.values(fichasRef.current.J1).reduce((acc, c) => acc + c, 0) + 1;
                setBankedCrestsJ1((prev) => [...prev, newBankedItem]);
                setFichas((prev) => ({
                  ...prev,
                  J1: {
                    ...prev.J1,
                    [lvl]: (prev.J1[lvl] || 0) + 1,
                  },
                }));
                const nextMana = updateManaSync((prev) => ({ ...prev, J1: Math.min(10, prev.J1 + 1) }));
                if (nextBankedCount >= 5 || nextMana.J1 >= 10) {
                  syncAchievementsNow({ totalBankedCount: nextBankedCount, manaJ1: nextMana.J1 });
                }
                triggerBattleMessage(`Ficha Lv.${lvl} guardada en tu reserva (+1 Maná)`, '#10b981');
              } else {
                const nextMana = updateManaSync((prev) => ({ ...prev, J1: Math.min(10, prev.J1 + 3) }));
                if (nextMana.J1 >= 10) {
                  syncAchievementsNow({ manaJ1: nextMana.J1 });
                }
                triggerBattleMessage(`¡Poder del Titán canalizado (+3 Maná)!`, '#fbbf24');
              }
              gameAudio.playCoinPickup();
              cancelInvocation();
            }}
            onConvertCrestToMana={() => {
              if (!modalLimiteCriaturasRef.current) return;
              setModalLimiteCriaturas(null);
              const nextMana = updateManaSync((prev) => ({ ...prev, J1: Math.min(10, prev.J1 + 3) }));
              if (nextMana.J1 >= 10) {
                syncAchievementsNow({ manaJ1: nextMana.J1 });
              }
              gameAudio.playPowerupChime();
              triggerBattleMessage(`¡Tirada convertida en +3 Maná Astral!`, '#38bdf8');
              cancelInvocation();
            }}
            showRetireConfirm={showRetireConfirm}
            onCloseRetireConfirm={() => setShowRetireConfirm(false)}
            onExecuteRetire={() => {
              setShowRetireConfirm(false);
              handleMasterDefeated(2);
            }}
            modalEleccionDoble={modalEleccionDoble}
            onCloseModalEleccionDoble={() => cancelInvocation()}
            onSummonDouble={handleChooseInvocar}
            onBankDouble={handleChooseGuardar}
            modalEscalera={modalEscalera}
            onCloseModalEscalera={() => setModalEscalera(null)}
            onChooseLadderBuff={(choice) => {
              if (!modalEscaleraRef.current) return;
              setModalEscalera(null);
              const liveUnits = unitsRef.current.length > 0 ? unitsRef.current : units;
              const king = liveUnits.find((u) => u.dueño === 1 && u.esMaestra);
              if (choice === 'HP') {
                if (king) spawnFloatingText('💧 +3 HP & 🛡️ ESCUDO', king.posicion, '#10b981');
                updateUnitsSync((prev) =>
                  prev.map((u) => {
                    if (u.dueño === 1 && u.esMaestra) {
                      const nextCharges = (u.shieldCharges ?? (u.hasShield ? 1 : 0)) + 1;
                      return {
                        ...u,
                        hpActual: Math.min(u.hpMax, u.hpActual + 3),
                        hasShield: true,
                        shieldCharges: nextCharges,
                      };
                    }
                    return u;
                  })
                );
                gameAudio.playPowerupChime();
                triggerHapticFeedback([30, 40]);
                triggerBattleMessage('🛡️ ¡BÁLSAMO REAL! El Soberano recupera +3 HP y activa Escudo Arcano.', '#10b981');
              } else if (choice === 'MANA') {
                if (king) spawnFloatingText('⚡ +2 MANÁ', king.posicion, '#38bdf8');
                const nextMana = updateManaSync((prev) => ({ ...prev, J1: Math.min(10, prev.J1 + 2) }));
                if (nextMana.J1 >= 10) {
                  syncAchievementsNow({ manaJ1: nextMana.J1 });
                }
                gameAudio.playCoinPickup();
                triggerHapticFeedback([30, 40]);
                triggerBattleMessage('⚡ ¡SOBRECARGA ARCANA! Has obtenido +2 de Maná inmediato.', '#38bdf8');
              } else if (choice === 'ATK') {
                const updatedUnits = updateUnitsSync((prev) =>
                  prev.map((u) => (u.dueño === 1 ? { ...u, daño: u.daño + 1 } : u))
                );
                updatedUnits
                  .filter((u) => u.dueño === 1)
                  .forEach((u) => {
                    spawnFloatingText('⚔️ +1 ATK', u.posicion, '#f43f5e');
                  });
                gameAudio.playSwordClash();
                triggerHapticFeedback([30, 40]);
                triggerBattleMessage('⚔️ ¡FERVOR MARCIAL! Todas tus piezas aliadas ganan +1 de Ataque.', '#f43f5e');
              }
            }}
            spellToConfirm={spellToConfirm}
            onCloseSpellToConfirm={cancelSpellCast}
            onConfirmCastSpell={confirmSpellCast}
            emergentGladiatorBark={emergentGladiatorBark}
            setEmergentGladiatorBark={setEmergentGladiatorBark}
            activeHouseTutorial={activeHouseTutorial}
            tutorialCurrentStep={tutorialCurrentStep}
            completedHouseTutorials={completedHouseTutorials}
            onFinishTutorialEarly={() => {
              const exitPos = currentVisitedHouse
                ? getHouseSafeExitPos(currentVisitedHouse)
                : null;
              if (exitPos) {
                setLastCityPlayerPos(exitPos);
              }
              if (activeHouseTutorial && !completedHouseTutorials.includes(activeHouseTutorial.houseId)) {
                const updated = [...completedHouseTutorials, activeHouseTutorial.houseId];
                setCompletedHouseTutorials(updated);
                setAchievementsInternal((prev) =>
                  prev.map((a) =>
                    a.id === 'ach_all_tutorials'
                      ? {
                          ...a,
                          progress: Math.min(12, updated.length),
                          isUnlocked: updated.length >= 12,
                        }
                      : a
                  )
                );
              }
              setActiveHouseTutorial(null);
              isTutorialBattleActiveRef.current = false;
              restoreTutorialEquippedSpells();
              setCurrentScreen('CITY_EXPLORATION');
              setGameState((prev) => ({ ...prev, status: 'START' }));
              gameAudio.playVictoryFanfare();
            }}
            hasBattleMessage={Boolean(battleMessage)}
            isOverlayBlockingHud={
              Boolean(isCombatLoadingActive) ||
              Boolean(isGameMenuOpen) ||
              Boolean(isHowToPlayOpen) ||
              Boolean(isCodexOpen) ||
              Boolean(isStatsModalOpen) ||
              Boolean(showSaveConfirmModal) ||
              Boolean(showExitConfirmModal) ||
              Boolean(showReturnTitleConfirmModal) ||
              Boolean(modalEleccionDoble) ||
              Boolean(modalEscalera) ||
              Boolean(showRetireConfirm) ||
              Boolean(showDefeatResultModal) ||
              Boolean(selectBankedCrestModal) ||
              Boolean(modalLimiteCriaturas) ||
              Boolean(spellToConfirm) ||
              Boolean(ascendedCutscene) ||
              Boolean(pendingRewardModal) ||
              Boolean(tutorialCompletionModal) ||
              Boolean(levelUpChoiceModal) ||
              Boolean(victoryAchievementModal) ||
              Boolean(showColiseumUnlockedHub) ||
              Boolean(showSecretUnlockModal) ||
              Boolean(inspectedCreature) ||
              Boolean(deckIncompleteModal) ||
              Boolean(deckFullModal) ||
              Boolean(isTieredModalOpen) ||
              Boolean(isMasterPieceModalOpen) ||
              Boolean(isAssetDownloaderOpen) ||
              Boolean(isTrophyModalOpen)
            }
          />
          </ErrorBoundary>
        )}
      </div>

      {/* DEV / TESTING FLOATING PANEL */}
      {showDevPanel && (
        <div className="fixed top-16 right-4 w-72 bg-slate-900/95 border border-cyan-500/40 rounded-xl p-3 shadow-2xl z-50 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2 font-bold text-cyan-400">
            <span>MODO DESARROLLADOR</span>
            <button onClick={() => setShowDevPanel(false)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => {
                setPlayerGold((g) => g + 500);
                gameAudio.playCoinPickup();
              }}
              className="w-full py-1 px-2 rounded bg-amber-600/80 hover:bg-amber-500 text-white font-bold"
            >
              +500 Oro
            </button>
            <button
              onClick={() => {
                updateManaSync({ J1: 10, J2: 10 });
                gameAudio.playPowerupChime();
              }}
              className="w-full py-1 px-2 rounded bg-blue-600/80 hover:bg-blue-500 text-white font-bold"
            >
              Max Maná (10)
            </button>
            <button
              onClick={() => {
                const enemyMaster = unitsRef.current.find((u) => u.dueño === 2 && u.esMaestra);
                if (enemyMaster) {
                  const nextHp = Math.max(0, enemyMaster.hpActual - 8);
                  updateUnitsSync((prev) =>
                    prev.map((u) => (u.id === enemyMaster.id ? { ...u, hpActual: nextHp } : u))
                  );
                  spawnFloatingText('-8 HP', enemyMaster.posicion, '#ef4444');
                  gameAudio.playSwordClash();
                }
              }}
              className="w-full py-1 px-2 rounded bg-rose-700 hover:bg-rose-600 text-white font-bold"
            >
              Dañar Maestra IA (-8 HP)
            </button>
            <button
              onClick={() => {
                setNivelPendiente(7);
                invocacionPendienteRef.current = true;
                setInvocacionPendiente(true);
                markInvocationZones(7);
              }}
              className="w-full py-1 px-2 rounded bg-purple-700 hover:bg-purple-600 text-white font-bold"
            >
              Invocar Titán Ascendido
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE MENÚ DE JUEGO (MODULARIZADO EN GameMenuModal.tsx) */}
      <GameMenuModal
        isOpen={isGameMenuOpen}
        onClose={() => setIsGameMenuOpen(false)}
        currentScreen={currentScreen}
        isSfxMuted={isSfxMuted}
        setIsSfxMuted={setIsSfxMuted}
        isMusicMuted={isMusicMuted}
        setIsMusicMuted={setIsMusicMuted}
        musicVolume={musicVolume}
        setMusicVolume={setMusicVolume}
        descFontSize={descFontSize}
        setDescFontSize={setDescFontSize}
        isFullscreen={isFullscreen}
        toggleAppFullscreen={toggleAppFullscreen}
        onOpenMasterPiece={handleOpenMasterPiece}
        onOpenStats={handleOpenStats}
        onOpenTrophies={handleOpenTrophies}
        onOpenTieredAchievements={handleOpenTieredAchievements}
        onOpenSaveMenu={saveProgress}
        isSaveLockedInTournament={campaignPhase === 'TOURNAMENT' && (currentScreen === 'COMBAT' || tournamentRound > 1)}
        onReturnToHub={handleReturnToHub}
        FullscreenMenuBackground={FullscreenMenuBackground}
      />

      {/* MODAL DE ESTADÍSTICAS GLOBALES (MODULARIZADO EN StatsModal.tsx) */}
      <StatsModal
        isOpen={isStatsModalOpen}
        onClose={() => {
          setIsStatsModalOpen(false);
          if (returnToMenuAfterModalRef.current) {
            returnToMenuAfterModalRef.current = false;
            setIsGameMenuOpen(true);
          }
        }}
        playerName={playerName}
        statsWon={statsWon}
        statsCampaignLosses={statsCampaignLosses}
        statsColiseumLosses={statsColiseumLosses}
        survivalHighScore={survivalHighScore}
        statsMinionsSummoned={statsMinionsSummoned}
        campaignsProgress={campaignsProgress}
        achievements={achievements}
        unlockedCampaigns={unlockedCampaigns}
        maxPlayerHp={maxPlayerHp}
        playerLevel={playerLevel}
        playerExp={playerExp}
        forgeMasteryLevel={forgeMasteryLevel}
        forgeMasteryExp={forgeMasteryExp}
        forgeTotalAttempts={forgeTotalAttempts}
        forgeTotalSuccesses={forgeTotalSuccesses}
        onOpenAchievements={() => {
          syncAchievementsNow();
          setIsStatsModalOpen(false);
          setIsTrophyModalOpen(true);
        }}
        FullscreenStatsBackground={FullscreenMenuBackground}
      />

      {/* GESTOR DE LOGROS Y SALÓN DE TROFEOS (MODULARIZADO EN AchievementsManager.tsx) */}
      <AchievementsManager
        isTrophyModalOpen={isTrophyModalOpen}
        setIsTrophyModalOpen={setIsTrophyModalOpen}
        isTieredModalOpen={isTieredModalOpen}
        setIsTieredModalOpen={setIsTieredModalOpen}
        onCloseTrophyModal={() => {
          setIsTrophyModalOpen(false);
          if (returnToMenuAfterModalRef.current) {
            returnToMenuAfterModalRef.current = false;
            setIsGameMenuOpen(true);
          }
        }}
        onCloseTieredModal={() => {
          setIsTieredModalOpen(false);
          if (returnToMenuAfterModalRef.current) {
            returnToMenuAfterModalRef.current = false;
            setIsGameMenuOpen(true);
          }
        }}
        achievements={achievements}
        onClaimTrophyReward={handleClaimTrophyReward}
        trophyCategory={trophyCategory}
        setTrophyCategory={setTrophyCategory}
        isCampaign4Unlocked={unlockedCampaigns.includes(3)}
        descFontSize={descFontSize}
        tieredAchievements={tieredAchievements}
        onClaimTierReward={handleClaimTieredReward}
      />

      {/* MODALES DE CONFIRMACIÓN (REINICIO, GUARDADO, SALIDA) (MODULARIZADOS EN ConfirmationModals.tsx) */}
      <ConfirmationModals
        showResetConfirmModal={showResetConfirmModal}
        setShowResetConfirmModal={setShowResetConfirmModal}
        onConfirmReset={() => {
          setNameInput('');
          setShowNameModal(true);
        }}
        isConfirmNewCampaignOpen={isConfirmNewCampaignOpen}
        setIsConfirmNewCampaignOpen={setIsConfirmNewCampaignOpen}
        pendingCampaignTarget={pendingCampaignTarget}
        onExecuteStartCampaign={(target) => executeStartCampaign(target)}
        showSaveConfirmModal={showSaveConfirmModal}
        setShowSaveConfirmModal={setShowSaveConfirmModal}
        onExecuteSaveGame={executeSaveGame}
        showReturnTitleConfirmModal={showReturnTitleConfirmModal}
        setShowReturnTitleConfirmModal={setShowReturnTitleConfirmModal}
        onConfirmReturnToTitle={() => {
          setShowReturnTitleConfirmModal(false);
          setIsCampaignLoadingActive(false);
          setIsCombatLoadingActive(false);
          setLoadingCampaignMeta(null);
          setCombatLoadingMeta(null);
          clearAiTimeouts();
          clearRollDiceTimeout();
          clearCombatFxTimeouts();
          clearCombatResolutionTimeouts();
          setCombatLock(false);
          setGameState((prev) => ({ ...prev, status: 'START' }));
          setCurrentScreen('TITLE');
          gameAudio.playCrispClick();
          loadSavedProgress({ targetScreen: 'TITLE' });
        }}
        showExitConfirmModal={showExitConfirmModal}
        setShowExitConfirmModal={setShowExitConfirmModal}
        onConfirmExitGame={() => {
          const navAny = navigator as any;
          if (navAny?.app?.exitApp) {
            try { navAny.app.exitApp(); return; } catch (_) {}
          }
          if (navAny?.device?.exitApp) {
            try { navAny.device.exitApp(); return; } catch (_) {}
          }
          try {
            window.close();
          } catch (_) {}
          try {
            window.parent.postMessage({ type: 'EXIT_GAME' }, '*');
          } catch (_) {}
          setShowExitConfirmModal(false);
          setCurrentScreen('TITLE');
        }}
      />
      {inspectedCreature && (
        <div
          className={`fixed inset-0 z-[150] overflow-hidden select-none ${isAndroidDevice() ? 'bg-black/80' : 'bg-black/60 backdrop-blur-[2px]'} flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn`}
          onClick={() => setInspectedCreature(null)}
        >
          {/* FONDO OFICIAL PANORÁMICO COMPLETO */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
            <FullscreenCodexBackground />
            <div className="absolute inset-0 bg-radial-vignette from-transparent via-black/25 to-black/75 pointer-events-none" />
          </div>

          {/* BARRA SUPERIOR ELEGANTE CON EL NOMBRE EN LA ESQUINA SUPERIOR IZQUIERDA Y BOTÓN VERTICAL VOLVER */}
          <div
            className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase drop-shadow">
                OBSERVACIÓN DETALLADA
              </span>
              <h2
                className="text-lg sm:text-2xl font-black font-serif tracking-wider drop-shadow uppercase"
                style={{ color: inspectedCreature.color || '#fbbf24' }}
              >
                {inspectedCreature.nombre}
              </h2>
            </div>

            {/* BOTÓN SUPERIOR DERECHO PARA SALIR (Mismo botón vertical con icono grande oficial) */}
            <button
              type="button"
              onClick={() => {
                gameAudio.playCrispClick();
                setInspectedCreature(null);
              }}
              className={`flex flex-col items-center justify-center p-2 sm:p-2.5 px-3 sm:px-4 rounded-2xl sm:rounded-3xl bg-black/85 hover:bg-black/95 text-slate-200 hover:text-white border-2 border-amber-500/70 hover:border-amber-400 font-serif font-black shadow-[0_0_25px_rgba(245,158,11,0.35)] ${isAndroidDevice() ? '' : 'backdrop-blur-md'} transition transform active:scale-95 cursor-pointer group`}
              aria-label="Volver"
            >
              <CachedImage
                cacheKey="icono_salir_main"
                candidateUrls={[
                  `${MAIN_CDN_BASE}/icono_salir.webp`,
                  `${MAIN_RAW_BASE}/icono_salir.webp`,
                  './assets/icono_salir.webp',
                ]}
                alt="Volver"
                loading="eager"
                fallbackPlaceholder={<></>}
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain filter brightness-110 contrast-110 pointer-events-none group-hover:scale-110 transition-transform"
                style={{
                  mixBlendMode: 'screen',
                }}
              />
              <span className="font-serif font-bold tracking-widest text-slate-300 group-hover:text-amber-300 transition-colors text-[9.5px] sm:text-[11px] mt-0.5">
                VOLVER
              </span>
            </button>
          </div>

          {/* CONTENEDOR CENTRAL TRANSLÚCIDO CON LA ILUSTRACIÓN Y DETALLES */}
          <div
            className="relative z-10 w-full max-w-4xl flex-1 min-h-0 flex flex-col md:flex-row items-center justify-start md:justify-center pointer-events-auto my-auto gap-4 md:gap-6 p-2 overflow-y-auto touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Vitrina Amplia de Imagen */}
            <div
              className={`w-full max-w-xs sm:max-w-sm h-64 sm:h-80 md:h-96 rounded-2xl bg-slate-950/80 border-2 overflow-hidden relative flex items-center justify-center shadow-2xl ${isAndroidDevice() ? '' : 'backdrop-blur-md'} shrink-0`}
              style={{ borderColor: inspectedCreature.color || '#fbbf24' }}
            >
              <InspectedImageRenderer
                imgUrl={inspectedCreature.imgUrl}
                candidateUrls={inspectedCreature.candidateUrls}
                alt={inspectedCreature.nombre}
                color={inspectedCreature.color}
              />
            </div>

            {/* Ficha de Detalles y Descripción (Sin iconos ni emojis en la descripción) */}
            <div className={`flex-1 w-full max-w-md bg-black/85 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl ${isAndroidDevice() ? '' : 'backdrop-blur-md'} flex flex-col justify-between gap-3 text-slate-200`}>
              <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {inspectedCreature.rango && !/^\d-\d-\d$/.test(inspectedCreature.rango.trim())
                        ? inspectedCreature.rango
                        : 'Titán Ascendido'}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-serif font-bold border"
                      style={{ borderColor: inspectedCreature.color || '#fbbf24', color: inspectedCreature.color || '#fbbf24' }}
                    >
                      {inspectedCreature.nivel && !/^\d-\d-\d$/.test(String(inspectedCreature.nivel).trim())
                        ? (typeof inspectedCreature.nivel === 'number' ? `Nivel ${inspectedCreature.nivel}` : inspectedCreature.nivel)
                        : 'Ascendido'}
                    </span>
                  </div>

                {/* Descripción limpia sin emojis ni iconos */}
                <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed pt-1">
                  {(inspectedCreature.desc || '').replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u2600-\u27BF]/gu, '').trim()}
                </p>

                {inspectedCreature.extra && (
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-amber-300 font-serif font-bold leading-snug">
                    {inspectedCreature.extra.replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u2600-\u27BF]/gu, '').trim()}
                  </div>
                )}
              </div>

              {/* Estadísticas de combate (si aplican) sin iconos pesados */}
              {(inspectedCreature.hp !== undefined || inspectedCreature.atk !== undefined || inspectedCreature.costeMana !== undefined) && (
                <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs font-serif font-bold">
                  {inspectedCreature.isSpell ? (
                    <>
                      <span className="text-cyan-400">Coste de Maná: {inspectedCreature.costeMana ?? inspectedCreature.nivel}M</span>
                      <span className="text-amber-300">Rango: {inspectedCreature.category || 'Grimorio'}</span>
                    </>
                  ) : (
                    <>
                      {inspectedCreature.hp !== undefined && (
                        <span className="text-emerald-400">Puntos de Vida: {inspectedCreature.hp} PV</span>
                      )}
                      {inspectedCreature.atk !== undefined && (
                        <span className="text-rose-400">Poder de Ataque: {inspectedCreature.atk} ATK</span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HOW TO PLAY GUIDE OVERLAY */}
      {isHowToPlayOpen && (
        <div className="fixed inset-0 bg-black/90 z-[70] overflow-y-auto touch-pan-y p-4 flex flex-col items-center justify-center [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="m-auto max-w-md w-full bg-slate-900 border border-slate-700 rounded-xl p-5 sm:p-6 text-slate-200 max-h-[90dvh] overflow-y-auto touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <h3 className="text-xl font-bold font-serif text-amber-400 mb-4 text-center">CÓMO JUGAR</h3>
            <div className="space-y-3 text-xs leading-relaxed text-slate-300 mb-6 font-sans">
              <p>
                <strong>1. Mazo Base Lv.1 y Dados de Rareza:</strong> Todos los dados iniciales comienzan en Nivel 1. Al forjar tu aventura tienes probabilidad de recibir dados Raros, Épicos o Legendarios con ranuras para engarzar orbes elementales en el Taller.
              </p>
              <p>
                <strong>2. Parejas, Escalera Táctica y Titanes Ascendidos:</strong> Una pareja de dados fija el Nivel de la criatura (Lv.1 a Lv.6) y el <strong>tercer dado restante</strong> determina su rango de Maestría. Una secuencia consecutiva (1-2-3 al 4-5-6) activa la <strong>Escalera Táctica</strong> (elige entre +3 HP y Escudo al Soberano, +2 Maná o +1 ATK aliado). ¡Y una tirada triple idéntica (1-1-1 al 6-6-6) desata a un <strong>Titán Ascendido</strong> con poderes únicos al entrar en combate (o +3 Maná si no hay espacio)!
              </p>
              <p>
                <strong>3. Reserva, Maná y Transmutación (4 Maná):</strong> Solo puedes lanzar 1 vez por turno. Invoca criaturas adyacentes a tu Soberano, guarda la ficha en tu reserva (+1 Maná y despliegue posterior) o aprovecha la tirada sin pareja ni escalera (+1 Maná). Cuando el rival te supere en número de unidades, puedes usar <strong>Transmutación Arcana (4 Maná)</strong> para invocar directamente una criatura aleatoria Lv.1–Lv.4 (70% de éxito; si falla, se pierden 2 Maná).
              </p>
              <p>
                <strong>4. Condición de Victoria:</strong> Acércate y elimina a la Maestra rival enemiga para ganar la partida.
              </p>
            </div>
            <button
              onClick={() => setIsHowToPlayOpen(false)}
              className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-bold text-xs text-white"
            >
              CERRAR GUÍA
            </button>
          </div>
        </div>
      )}

      {/* MODAL SELECTOR DE CAMPAÑAS (MODULARIZADO EN CampaignSelectorModal.tsx) */}
      <CampaignSelectorModal
        isOpen={isCampaignSelectorOpen}
        onClose={() => setIsCampaignSelectorOpen(false)}
        selectedCampaignIndex={selectedCampaignIndex}
        setSelectedCampaignIndex={setSelectedCampaignIndex}
        unlockedCampaigns={unlockedCampaigns}
        activeCampaignIndex={activeCampaignIndex}
        campaignsProgress={campaignsProgress}
        onLaunchCampaign={(idx, restart) => launchSelectedCampaign(idx, restart)}
        onShowLockedAlert={(modalData) => setLockedCampaignAlertModal(modalData)}
      />

      {/* PANTALLA DE PRECARGA 3D ANTES DE ENTRAR A COMBATE O COLISEO */}
      <CombatPreloaderScreen
        isOpen={isCombatLoadingActive}
        encounterTitle={combatLoadingMeta?.title || 'Arena de Combate'}
        encounterSubtitle={combatLoadingMeta?.subtitle}
        accentColor={combatLoadingMeta?.accent || '#f59e0b'}
        bgUrl={combatLoadingMeta?.bgUrl}
        bgCandidates={combatLoadingMeta?.bgCandidates}
        onBoardReady={() => setIsCombatBoardReady(true)}
        onCancel={() => {
          setIsCombatLoadingActive(false);
          setIsSurvivalMode(false);
          setIsGladiatorDuelMode(false);
          setGladiatorDuelRival(null);
          setCurrentScreen('CAMPAIGN_HUB');
          setGameState((prev) => ({ ...prev, status: 'START' }));
        }}
        onLoaded={() => {
          setIsCombatBoardReady(true);
          setIsCombatLoadingActive(false);
          // Si hay runas especiales en el campo, emitir el aviso táctico una vez que el preloader se haya desvanecido por completo
          if (specialRunes.length > 0) {
            setTimeout(() => {
              triggerBattleMessage(
                isSurvivalMode
                  ? `🔥 ¡COLISEO AVANZADO: EL SUELO ARDE CON ${specialRunes.length} RUNAS MÍSTICAS DE PODER!`
                  : `🔮 ¡EL TABLERO CONTIENE ${specialRunes.length} CASILLAS CON RUNAS MÍSTICAS (Fuego, Curación o Maná)!`,
                isSurvivalMode ? '#f43f5e' : activeCampaignIndex === 3 ? '#22d3ee' : '#f97316'
              );
            }, 600);
          }
        }}
      />

      {/* PANTALLA DE ESPERA / CARGA DE MODELOS 3D DESPUÉS DE SELECCIONAR CAMPAÑA */}
      <CampaignLoadingScreen
        isOpen={isCampaignLoadingActive}
        campaignNumber={loadingCampaignMeta?.num || 1}
        campaignTitle={loadingCampaignMeta?.title || 'El Camino al Torneo'}
        accentColor={loadingCampaignMeta?.accent || '#f59e0b'}
        bgUrl={loadingCampaignMeta?.bgUrl}
        isSceneReady={isCitySceneReady}
        onModelsReady={() => setIsCityModelsReady(true)}
        onCancel={() => {
          setIsCampaignLoadingActive(false);
          setCurrentScreen('CAMPAIGN_HUB');
        }}
        onLoaded={() => {
          setIsCityModelsReady(true);
          setIsCampaignLoadingActive(false);
          gameAudio.playVictoryFanfare();
          triggerBattleMessage(
            `¡Modelos 3D e iluminación cargados! Explora la Ciudadela y combate.`,
            loadingCampaignMeta?.accent || '#fbbf24'
          );
        }}
      />






      {/* MODAL SELECTOR DE DIFICULTAD Y MODIFICADORES DEL COLISEO INFINITO (MODULARIZADO EN ColiseumDifficultyModal.tsx) */}
      <ColiseumDifficultyModal
        isOpen={isColiseumDifficultyModalOpen}
        onClose={() => setIsColiseumDifficultyModalOpen(false)}
        survivalDifficulty={survivalDifficulty}
        setSurvivalDifficulty={setSurvivalDifficulty}
        onStartSurvival={(diff) => {
          setIsColiseumDifficultyModalOpen(false);
          requestAppFullscreen();
          gameAudio.playConfirmSelect();
          setIsSurvivalMode(true);
          setSurvivalWave(1);
          setSurvivalDifficulty(diff);
          enterCombat('survival_wave_1', undefined, undefined, {
            isSurvival: true,
            survivalDiff: diff,
            survivalWave: 1,
          });
          triggerBattleMessage(`¡ENTRANDO AL COLISEO EN MODO ${diff}!`, '#f43f5e');
        }}
        MAIN_RAW_BASE={MAIN_RAW_BASE}
        MAIN_CDN_BASE={MAIN_CDN_BASE}
      />

      {/* MODAL 1 & 2: BIENVENIDA, NOMBRE Y RESUMEN INICIAL DE DADOS (MODULARIZADO EN NewCampaignModal.tsx) */}
      <NewCampaignModal
        isOpen={showNameModal}
        nameInput={nameInput}
        setNameInput={setNameInput}
        onConfirmName={handleConfirmName}
        onClose={() => setShowNameModal(false)}
        assignedSummary={assignedSummary}
        secretCodeActivatedModal={secretCodeActivatedModal}
        playerDeck={playerDeck}
        onConfirmSummary={() => {
          setAssignedSummary(null);
          setSecretCodeActivatedModal(false);
          setCurrentScreen('CAMPAIGN_HUB');
          gameAudio.playConfirmSelect();
        }}
        FullscreenGameLogo={FullscreenGameLogo}
      />

      {/* MODALES SECUNDARIOS Y ALERTAS MODULARIZADAS EN SecondaryModals.tsx */}
      <SecondaryModals
        lockedCampaignAlertModal={lockedCampaignAlertModal}
        onCloseLockedCampaignAlert={() => setLockedCampaignAlertModal(null)}
        deckIncompleteModal={deckIncompleteModal}
        onCloseDeckIncomplete={() => setDeckIncompleteModal(null)}
        deckFullModal={deckFullModal}
        onCloseDeckFull={() => setDeckFullModal(false)}
        secretCodeActivatedModal={secretCodeActivatedModal}
        onCloseSecretCodeModal={() => setSecretCodeActivatedModal(false)}
        showSecretUnlockModal={showSecretUnlockModal}
        onCloseSecretUnlockModal={() => setShowSecretUnlockModal(false)}
      />

      {/* MODAL DE PERSONALIZACIÓN DE LA FICHA MAESTRA / REY SOBERANO */}
      {isMasterPieceModalOpen && (
        <MasterPieceModal
          playerName={playerName}
          playerLevel={playerLevel}
          maxPlayerHp={maxPlayerHp}
          masterAtkBonus={masterAtkBonus}
          masterCustomization={masterCustomization}
          onUpdateMasterCustomization={setMasterCustomization}
          orbBank={orbBank}
          onUpdateOrbBank={setOrbBank}
          triggerNotification={(text, color) => triggerBattleMessage(text, color)}
          onClose={() => {
            setIsMasterPieceModalOpen(false);
            setIsGameMenuOpen(true);
          }}
        />
      )}

      {/* MODAL DE DESCARGA / ALMACENAMIENTO DE ASSETS EN DISCO / CACHE STORAGE (DiskCacheModal.tsx) */}
      {isAssetDownloaderOpen && (
        <DiskCacheModal
          isOpen={isAssetDownloaderOpen}
          onClose={() => setIsAssetDownloaderOpen(false)}
        />
      )}

      {/* MODAL DE SUBIDA DE NIVEL Y ELECCIÓN DE MEJORAS DEL REY SOBERANO (LevelUpChoiceModal.tsx) */}
      {levelUpChoiceModal && (
        <LevelUpChoiceModal
          isOpen={Boolean(levelUpChoiceModal)}
          newLevel={levelUpChoiceModal.newLevel}
          pendingRemainingCount={pendingLevelUpQueue.length}
          maxPlayerHp={maxPlayerHp}
          masterAtkBonus={masterAtkBonus}
          masterStartingManaBonus={masterStartingManaBonus}
          masterShieldChargeLevel={masterShieldChargeLevel}
          onUpgradeHp={() => {
            const currentLvl = levelUpChoiceModal.newLevel;
            setMaxPlayerHp((prev) => prev + 4);
            triggerBattleMessage('❤️ ¡+4 HP Máximo permanente para tu Rey Soberano!', '#10b981');
            gameAudio.playLevelUpStinger();
            advanceLevelUpModal(currentLvl);
          }}
          onUpgradeAtk={() => {
            const currentLvl = levelUpChoiceModal.newLevel;
            setMasterAtkBonus((prev) => prev + 1);
            triggerBattleMessage('⚔️ ¡+1 de Ataque (ATK) permanente para tu Rey Soberano!', '#f43f5e');
            gameAudio.playLevelUpStinger();
            advanceLevelUpModal(currentLvl);
          }}
          onUpgradeStartingMana={() => {
            const currentLvl = levelUpChoiceModal.newLevel;
            setMasterStartingManaBonus((prev) => prev + 1);
            triggerBattleMessage('⚡ ¡+1 de Maná inicial en todas las batallas!', '#38bdf8');
            gameAudio.playLevelUpStinger();
            advanceLevelUpModal(currentLvl);
          }}
          onUpgradeShield={() => {
            const currentLvl = levelUpChoiceModal.newLevel;
            const nextShieldLevel = masterShieldChargeLevel + 1;
            setMasterShieldChargeLevel(nextShieldLevel);
            triggerBattleMessage(
              `🛡️ ¡Manto del Bastión Nv.${nextShieldLevel}! Empiezas cada combate con ${nextShieldLevel} ${nextShieldLevel === 1 ? 'carga' : 'cargas'} de Escudo Arcano.`,
              '#fbbf24'
            );
            gameAudio.playLevelUpStinger();
            advanceLevelUpModal(currentLvl);
          }}
          onClose={() => advanceLevelUpModal()}
        />
      )}

      {/* MODAL DE DESAFÍO DE DUELOS DE GLADIADORES (GladiatorDuelModal.tsx) */}
      {isGladiatorDuelModalOpen && (
        <GladiatorDuelModal
          playerGold={playerGold}
          activeCampaignIndex={activeCampaignIndex}
          unlockedCampaigns={unlockedCampaigns}
          completedCampaigns={Object.entries(campaignsProgress)
            .filter(([, p]) => Boolean(p?.completed))
            .map(([idx]) => Number(idx))}
          unlockedGladiators={defeatedTournamentContenders}
          onStartDuel={(contender, handicap) => {
            setIsGladiatorDuelModalOpen(false);
            requestAppFullscreen();
            gameAudio.playConfirmSelect();
            setIsGladiatorDuelMode(true);
            setGladiatorDuelRival(contender);
            setGladiatorDuelHandicap(handicap);
            enterCombat(`duel_${contender.id}`, undefined, contender, {
              isGladiatorDuel: true,
              duelRival: contender,
              duelHandicap: handicap,
            });
            triggerBattleMessage(`⚔️ ¡DUELO DE GLADIADORES: ${contender.name.toUpperCase()} [${handicap}]!`, '#f59e0b');
          }}
          onClose={() => setIsGladiatorDuelModalOpen(false)}
        />
      )}

      {/* COMPONENTE MODULARIZADO DE PANTALLAS DE FIN DE BATALLA Y RECOMPENSAS (BattleEndOverlays.tsx) */}
      <BattleEndOverlays
        pendingRewardModal={pendingRewardModal}
        setPendingRewardModal={setPendingRewardModal}
        activeCampaignIndex={activeCampaignIndex}
        playerLevel={playerLevel}
        setPlayerDeck={setPlayerDeck}
        setOrbBank={setOrbBank}
        setLevelUpChoiceModal={setLevelUpChoiceModal}
        onTriggerLevelUps={enqueueLevelUps}
        isLevelUpChoiceModalOpen={Boolean(levelUpChoiceModal)}
        triggerNotification={(text, color) => triggerBattleMessage(text, color)}
        victoryAchievementModal={victoryAchievementModal}
        onContinueFromVictoryAchievement={() => {
          setVictoryAchievementModal(null);
          setLastVictoryGoldReward(null);
          setJustCrownedChampion(false);
          setCurrentScreen('CITY_EXPLORATION');
          setGameState((prev) => ({ ...prev, status: 'START' }));
          gameAudio.playVictoryFanfare();
        }}
        tutorialCompletionModal={tutorialCompletionModal}
        onCloseTutorialCompletion={() => {
          gameAudio.playConfirmSelect();
          if (tutorialCompletionModal?.exitPos) {
            setLastCityPlayerPos(tutorialCompletionModal.exitPos);
          }
          setTutorialCompletionModal(null);
          setActiveHouseTutorial(null);
          isTutorialBattleActiveRef.current = false;
          restoreTutorialEquippedSpells();
          setActiveCityDialogue(null);
          setCurrentScreen('CITY_EXPLORATION');
          setGameState((prev) => ({ ...prev, status: 'START' }));
        }}
        showColiseumUnlockedHub={showColiseumUnlockedHub}
        onContinueFromColiseumUnlocked={() => {
          setShowColiseumUnlockedHub(false);
          setLastVictoryGoldReward(null);
          setCurrentScreen('CITY_EXPLORATION');
          setGameState((prev) => ({ ...prev, status: 'START' }));
          gameAudio.playConfirmSelect();
        }}
        showDefeatResultModal={showDefeatResultModal}
        onCloseDefeatResult={() => {
          setShowDefeatResultModal(false);
          setActiveHouseTutorial(null);
          isTutorialBattleActiveRef.current = false;
          restoreTutorialEquippedSpells();
          if (isGladiatorDuelMode) {
            setIsGladiatorDuelMode(false);
            setGladiatorDuelRival(null);
            setLastCityPlayerPos([0, 0, -58.0]);
            setCurrentScreen('COLISEUM_INTERIOR');
          } else if (isSurvivalMode) {
            setIsSurvivalMode(false);
            if (survivalOriginScreen === 'CAMPAIGN_HUB') {
              setCurrentScreen('CAMPAIGN_HUB');
            } else {
              setLastCityPlayerPos([0, 0, -58.0]);
              setCurrentScreen('COLISEUM_INTERIOR');
            }
          } else if (currentScreen === 'COMBAT' && campaignPhase === 'TOURNAMENT') {
            setLastCityPlayerPos([0, 0, -58.0]);
            setCurrentScreen('COLISEUM_INTERIOR');
          } else {
            if (lastChallengedNpcCoordRef.current) {
              setLastCityPlayerPos(lastChallengedNpcCoordRef.current);
            }
            setCurrentScreen('CITY_EXPLORATION');
          }
          setGameState((prev) => ({ ...prev, status: 'START' }));
        }}
        isGladiatorDuelMode={isGladiatorDuelMode}
        gladiatorDuelRival={gladiatorDuelRival}
        gladiatorDuelHandicap={gladiatorDuelHandicap}
        isSurvivalMode={isSurvivalMode}
        survivalWave={survivalWave}
        survivalDifficulty={survivalDifficulty}
        campaignPhase={campaignPhase}
        survivalOriginScreen={survivalOriginScreen}
        isVictoryOverlayOpen={gameState.status === 'VICTORY'}
        survivalHighScore={survivalHighScore}
        tournamentRound={tournamentRound}
        completedTournamentRound={
          activeTournamentContender?.phaseRound ??
          (justCrownedChampion ? 3 : Math.max(1, tournamentRound - 1))
        }
        activeTournamentContender={activeTournamentContender}
        nextTournamentContender={(() => {
          if (campaignPhase !== 'TOURNAMENT' || !activeTournamentContender || justCrownedChampion) {
            return null;
          }
          const roster = getTournamentRosterForCampaign(activeCampaignIndex);
          return roster.filter((c) => c.phaseRound === tournamentRound)[0] || null;
        })()}
        defeatedAlleyOpponentsCount={defeatedAlleyOpponents.length}
        isCampaignAlreadyCompleted={Boolean(campaignsProgress[activeCampaignIndex]?.completed)}
        tournamentCompletionsCount={campaignsProgress[activeCampaignIndex]?.completionsCount || 0}
        victoryRewardGold={lastVictoryGoldReward}
        isChampionOfCampaign={justCrownedChampion}
        onVictoryContinue={() => {
          const isCampCompleted = Boolean(campaignsProgress[activeCampaignIndex]?.completed);
          if (isSurvivalMode) {
            setGameState((prev) => ({ ...prev, status: 'START' }));
            enterCombat(`survival_wave_${survivalWave}`, undefined, undefined, {
              isSurvival: true,
              survivalDiff: survivalDifficulty,
              survivalWave: survivalWave,
            });
            triggerBattleMessage(`🔥 ¡COLISEO INFINITO: OLEADA ${survivalWave}!`, '#fbbf24');
          } else if (
            !isGladiatorDuelMode &&
            !isCampCompleted &&
            (showColiseumUnlockedHub || (defeatedAlleyOpponents.length >= 12 && tournamentRound === 1 && !activeTournamentContender))
          ) {
            setLastVictoryGoldReward(null);
            setCurrentScreen('CITY_EXPLORATION');
            setGameState((prev) => ({ ...prev, status: 'START' }));
          } else if (!isGladiatorDuelMode && campaignPhase === 'TOURNAMENT' && activeTournamentContender && !justCrownedChampion) {
            setGameState((prev) => ({ ...prev, status: 'START' }));
            startCampaignEncounter();
          } else {
            setIsGladiatorDuelMode(false);
            setGladiatorDuelRival(null);
            setLastVictoryGoldReward(null);
            setJustCrownedChampion(false);
            setCurrentScreen('CITY_EXPLORATION');
            setGameState((prev) => ({ ...prev, status: 'START' }));
          }
        }}
        onVictoryReturnToColiseumDuel={() => {
          setIsGladiatorDuelMode(false);
          setGladiatorDuelRival(null);
          setLastVictoryGoldReward(null);
          setLastCityPlayerPos((prev) => (prev && prev[2] < -10 ? prev : [0, 0, -20]));
          setCurrentScreen('COLISEUM_INTERIOR');
          setGameState((prev) => ({ ...prev, status: 'START' }));
        }}
        onVictoryReturnFromSurvival={() => {
          setIsSurvivalMode(false);
          setLastVictoryGoldReward(null);
          if (survivalOriginScreen === 'CAMPAIGN_HUB') {
            setCurrentScreen('CAMPAIGN_HUB');
          } else {
            setLastCityPlayerPos((prev) => (prev && prev[2] < -10 ? prev : [0, 0, -20]));
            setCurrentScreen('COLISEUM_INTERIOR');
          }
          setGameState((prev) => ({ ...prev, status: 'START' }));
        }}
      />

      {/* NOTIFICACIÓN GLOBAL ELEVADA: Visible en combate, Ciudad, Forja, Taller, Taberna y Tienda */}
      {battleMessage && (
        <div className="fixed top-16 sm:top-20 right-3 sm:right-6 pointer-events-none z-[210] max-w-[280px] sm:max-w-xs text-right animate-fadeIn">
          <div
            className={`px-4 py-3 rounded-2xl border-2 bg-black/95 shadow-[0_0_40px_rgba(0,0,0,0.95)] ${isAndroidDevice() ? '' : 'backdrop-blur-md'} font-serif font-black tracking-wide text-xs sm:text-sm text-left flex items-start gap-2.5`}
            style={{
              borderColor: battleMessage.color,
              boxShadow: `0 0 30px ${battleMessage.color}50`,
            }}
          >
            <span className="text-base sm:text-lg shrink-0 mt-0.5 animate-pulse">⚡</span>
            <div className="flex-1 min-w-0 leading-snug" style={{ color: battleMessage.color }}>
              {battleMessage.text}
            </div>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
