import { DieData, Orb } from './types';
import { MasterCustomizationData } from './MasterPieceModal';
import { dexieStorage } from './dexieStorage';
import { AchievementProgression } from './types';
import { Achievement } from './TrophyModal';
import { DailyContract } from './TavernInterior';

export interface CampaignProgressData {
  status: 'INACTIVA' | 'EN_PROGRESO' | 'PAUSADA' | 'FINALIZADA';
  phase: 'ALLEY' | 'TOURNAMENT';
  fight: number;
  defeated: string[];
  round: 1 | 2 | 3;
  completed: boolean;
  completionsCount: number;
  claimedReward: boolean;
  campaignLosses: number;
  rngState?: {
    seed: number;
    rollCount: number;
    luckModifier: number;
  };
  lastSavedTimestamp?: number;
}

export interface PlayerPersistentState {
  playerName: string;
  playerGold: number;
  playerDeck: DieData[];
  orbBank: Orb[];
  unlockedSpells: string[];
  maxSpellSlots: number;
  equippedSpells: string[];
  activeCampaignIndex: number;
  unlockedCampaigns: number[];
  campaignsProgress: Record<number, CampaignProgressData>;
  campaignPhase: 'ALLEY' | 'TOURNAMENT';
  alleyCurrentFight: number;
  defeatedAlleyOpponents: string[];
  campaign1LossCount: number;
  survivalHighScore: number;
  statsWon: number;
  statsCampaignLosses: number;
  statsColiseumLosses: number;
  statsMinionsSummoned: number;
  statsTitansAwakened: number;
  playerExp: number;
  playerLevel: number;
  maxPlayerHp: number;
  masterAtkBonus: number;
  masterStartingManaBonus: number;
  masterShieldChargeLevel: number;
  tournamentRound: 1 | 2 | 3;
  defeatedTournamentContenders?: string[];
  forgeInventory: Record<string, number>;
  forgeMasteryLevel: number;
  forgeMasteryExp: number;
  forgeTotalAttempts: number;
  forgeTotalSuccesses: number;
  masterCustomization: MasterCustomizationData;
  completedHouseTutorials: string[];
  deckPresets?: { name: string; dieIds: string[] }[];
  activeDeckPresetIndex?: number | null;
  dailyContracts?: DailyContract[];
  dailyContractsDate?: string;
}

export interface SavedPlayerProgressData extends Partial<PlayerPersistentState> {
  claimedAchievements?: string[];
  tieredAchievements?: AchievementProgression[];
  statsLost?: number;
  timestamp?: number;
}

export const SAVE_STORAGE_KEY = 'dungeon_dice_save';

export function getCampaignSaveStorageKey(campaignIndex: number): string {
  return `dungeon_dice_campaign_${campaignIndex}_save`;
}

/**
 * Guarda el progreso individual de una campaña específica en su propio slot persistente
 * tanto en localStorage como en IndexedDB (Dexie).
 */
export function saveIndividualCampaignProgress(
  campaignIndex: number,
  campaignData: CampaignProgressData,
  extraContext?: {
    playerName?: string;
    playerLevel?: number;
  }
): boolean {
  try {
    const key = getCampaignSaveStorageKey(campaignIndex);
    const payload = {
      campaignIndex,
      ...campaignData,
      playerName: extraContext?.playerName || 'Viajero',
      playerLevel: extraContext?.playerLevel || 1,
      lastSavedTimestamp: Date.now(),
    };

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(payload));
      }
    } catch (_) {}

    dexieStorage.set('gameProgress', `campaign_${campaignIndex}_slot`, payload);
    return true;
  } catch (e) {
    console.error(`Error saving individual campaign ${campaignIndex}:`, e);
    return false;
  }
}

/**
 * Carga el archivo de guardado individual de una campaña específica desde localStorage
 */
export function loadIndividualCampaignProgress(campaignIndex: number): CampaignProgressData | null {
  try {
    const key = getCampaignSaveStorageKey(campaignIndex);
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as CampaignProgressData;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Guarda el progreso completo en localStorage e IndexedDB mediante Dexie,
 * sincronizando automáticamente cada campaña en su slot individual aislado.
 */
export function savePlayerProgressToStorage(
  state: PlayerPersistentState,
  achievements: Achievement[],
  tieredAchievements: AchievementProgression[]
): boolean {
  try {
    const saveData = {
      ...state,
      claimedAchievements: achievements.filter((a) => a.isClaimed).map((a) => a.id),
      tieredAchievements,
      timestamp: Date.now(),
    };

    let localSaveOk = false;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(saveData));
        localSaveOk = true;
      }
    } catch (_) {}

    dexieStorage.set('gameProgress', 'main_save', saveData);
    dexieStorage.set('inventory', 'player_deck', state.playerDeck);
    dexieStorage.set('inventory', 'player_orbs', state.orbBank);
    dexieStorage.set('inventory', 'forge_inventory', state.forgeInventory);
    dexieStorage.set('customization', 'master_piece', state.masterCustomization);
    dexieStorage.set('customization', 'tiered_achievements', tieredAchievements);

    // Sincronizar individualmente el progreso de cada campaña en su clave aislada
    if (state.campaignsProgress) {
      Object.entries(state.campaignsProgress).forEach(([idxStr, campData]) => {
        const campIdx = parseInt(idxStr, 10);
        if (!isNaN(campIdx) && campData) {
          saveIndividualCampaignProgress(campIdx, campData, {
            playerName: state.playerName,
            playerLevel: state.playerLevel,
          });
        }
      });
    }

    // Sincronizar claves auxiliares únicamente en el acto de guardado manual unificado
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('HEX_COMPLETED_HOUSE_TUTORIALS', JSON.stringify(state.completedHouseTutorials || []));
        localStorage.setItem('dungeon_dice_defeated_tourney', JSON.stringify(state.defeatedTournamentContenders || []));
        if (state.deckPresets) {
          localStorage.setItem('dungeon_dice_presets', JSON.stringify(state.deckPresets));
        }
        if (state.dailyContracts && state.dailyContractsDate) {
          localStorage.setItem('dungeon_dice_contracts_date', state.dailyContractsDate);
          localStorage.setItem('dungeon_dice_active_contracts', JSON.stringify(state.dailyContracts));
        }
      }
    } catch (_) {}

    return localSaveOk || Boolean(saveData);
  } catch (e) {
    console.error('Error saving game progress:', e);
    return false;
  }
}

/**
 * Lee de forma síncrona el archivo de guardado principal desde localStorage
 */
export function loadPlayerProgressFromStorage(): SavedPlayerProgressData | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.playerName) {
      // Migración defensiva para partidas antiguas cuyos campos solo existían en claves auxiliares
      if (parsed.completedHouseTutorials === undefined) {
        try {
          const legacyTuts = localStorage.getItem('HEX_COMPLETED_HOUSE_TUTORIALS');
          if (legacyTuts) parsed.completedHouseTutorials = JSON.parse(legacyTuts);
        } catch (_) {}
      }
      if (parsed.defeatedTournamentContenders === undefined) {
        try {
          const legacyTourney = localStorage.getItem('dungeon_dice_defeated_tourney');
          if (legacyTourney) parsed.defeatedTournamentContenders = JSON.parse(legacyTourney);
        } catch (_) {}
      }
      if (parsed.deckPresets === undefined) {
        try {
          const legacyPresets = localStorage.getItem('dungeon_dice_presets');
          if (legacyPresets) parsed.deckPresets = JSON.parse(legacyPresets);
        } catch (_) {}
      }
      if (parsed.masterCustomization === undefined) {
        try {
          const legacyCustom = localStorage.getItem('dungeon_dice_master_customization');
          if (legacyCustom) parsed.masterCustomization = JSON.parse(legacyCustom);
        } catch (_) {}
      }
      if (parsed.tieredAchievements === undefined) {
        try {
          const legacyTiered = localStorage.getItem('dungeon_dice_tiered_achievements');
          if (legacyTiered) parsed.tieredAchievements = JSON.parse(legacyTiered);
        } catch (_) {}
      }

      // Si existen guardados individuales más recientes para alguna campaña, reconciliarlos
      [0, 1, 2, 3].forEach((campIdx) => {
        const indSave = loadIndividualCampaignProgress(campIdx);
        if (indSave && parsed.campaignsProgress) {
          const currentMain = parsed.campaignsProgress[campIdx];
          const indTime = indSave.lastSavedTimestamp || 0;
          const mainTime = currentMain?.lastSavedTimestamp || parsed.timestamp || 0;
          if (indTime > mainTime) {
            parsed.campaignsProgress[campIdx] = {
              ...currentMain,
              ...indSave,
            };
          }
        }
      });
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Carga y reconcilia de forma asíncrona la partida guardada combinando localStorage
 * y el respaldo completo de IndexedDB (gameProgress/main_save, slots de campaña,
 * inventory/* y customization/*). Si localStorage fue vaciado o está desactualizado,
 * recupera íntegramente el progreso desde IndexedDB y rehidrata localStorage.
 */
export async function loadPlayerProgressFromStorageAsync(): Promise<SavedPlayerProgressData | null> {
  const localData = loadPlayerProgressFromStorage();

  let idbMainSave: SavedPlayerProgressData | null = null;
  let idbDeck: DieData[] | null = null;
  let idbOrbs: Orb[] | null = null;
  let idbForgeInventory: Record<string, number> | null = null;
  let idbMasterPiece: MasterCustomizationData | null = null;
  let idbTieredAchievements: AchievementProgression[] | null = null;
  let idbCampaignSlots: Array<CampaignProgressData | null> = [null, null, null, null];

  try {
    const [
      mainSave,
      deck,
      orbs,
      forgeInv,
      masterPiece,
      tieredAch,
      c0,
      c1,
      c2,
      c3,
    ] = await Promise.all([
      dexieStorage.get<SavedPlayerProgressData>('gameProgress', 'main_save'),
      dexieStorage.get<DieData[]>('inventory', 'player_deck'),
      dexieStorage.get<Orb[]>('inventory', 'player_orbs'),
      dexieStorage.get<Record<string, number>>('inventory', 'forge_inventory'),
      dexieStorage.get<MasterCustomizationData>('customization', 'master_piece'),
      dexieStorage.get<AchievementProgression[]>('customization', 'tiered_achievements'),
      dexieStorage.get<CampaignProgressData>('gameProgress', 'campaign_0_slot'),
      dexieStorage.get<CampaignProgressData>('gameProgress', 'campaign_1_slot'),
      dexieStorage.get<CampaignProgressData>('gameProgress', 'campaign_2_slot'),
      dexieStorage.get<CampaignProgressData>('gameProgress', 'campaign_3_slot'),
    ]);

    idbMainSave = mainSave && typeof mainSave === 'object' && mainSave.playerName ? mainSave : null;
    idbDeck = Array.isArray(deck) ? deck : null;
    idbOrbs = Array.isArray(orbs) ? orbs : null;
    idbForgeInventory = forgeInv && typeof forgeInv === 'object' ? forgeInv : null;
    idbMasterPiece = masterPiece && typeof masterPiece === 'object' ? masterPiece : null;
    idbTieredAchievements = Array.isArray(tieredAch) ? tieredAch : null;
    idbCampaignSlots = [c0, c1, c2, c3];
  } catch (_) {}

  if (!localData && !idbMainSave) {
    return null;
  }

  const localTime = localData?.timestamp || 0;
  const idbTime = idbMainSave?.timestamp || 0;
  const shouldPreferIdbMain = Boolean(idbMainSave && (!localData || idbTime > localTime));

  const baseSave = shouldPreferIdbMain
    ? { ...idbMainSave }
    : { ...localData };

  // Completar inventarios o personalización desde los almacenes dedicados de IndexedDB si faltan o si se recuperó desde IndexedDB
  if ((!Array.isArray(baseSave.playerDeck) || baseSave.playerDeck.length === 0) && idbDeck && idbDeck.length > 0) {
    baseSave.playerDeck = idbDeck;
  }
  if (!Array.isArray(baseSave.orbBank) && idbOrbs) {
    baseSave.orbBank = idbOrbs;
  }
  if ((!baseSave.forgeInventory || Object.keys(baseSave.forgeInventory).length === 0) && idbForgeInventory) {
    baseSave.forgeInventory = idbForgeInventory;
  }
  if (idbMasterPiece && (!baseSave.masterCustomization || shouldPreferIdbMain)) {
    baseSave.masterCustomization = idbMasterPiece;
  }
  if (idbTieredAchievements && idbTieredAchievements.length > 0 && (!baseSave.tieredAchievements || shouldPreferIdbMain)) {
    baseSave.tieredAchievements = idbTieredAchievements;
  }

  // Reconciliar slots individuales de campañas desde localStorage e IndexedDB eligiendo el más reciente
  if (baseSave.campaignsProgress && typeof baseSave.campaignsProgress === 'object') {
    const mergedCampaignsProgress: Record<number, CampaignProgressData> = {
      ...baseSave.campaignsProgress,
    };
    [0, 1, 2, 3].forEach((campIdx) => {
      const currentMain = mergedCampaignsProgress[campIdx];
      const localSlot = loadIndividualCampaignProgress(campIdx);
      const idbSlot = idbCampaignSlots[campIdx];

      const localSlotTime = localSlot?.lastSavedTimestamp || 0;
      const idbSlotTime = idbSlot?.lastSavedTimestamp || 0;
      const mainCampTime = currentMain?.lastSavedTimestamp || baseSave.timestamp || 0;

      const newestSlot = idbSlot && idbSlotTime >= localSlotTime ? idbSlot : localSlot;
      const newestSlotTime = Math.max(localSlotTime, idbSlotTime);

      if (newestSlot && newestSlotTime > mainCampTime) {
        mergedCampaignsProgress[campIdx] = {
          ...currentMain,
          ...newestSlot,
        };
      }
    });
    baseSave.campaignsProgress = mergedCampaignsProgress;
  }

  // Si localStorage había perdido el guardado principal, rehidratarlo de inmediato desde IndexedDB
  if (!localData && baseSave && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(baseSave));
      if (Array.isArray(baseSave.completedHouseTutorials)) {
        localStorage.setItem('HEX_COMPLETED_HOUSE_TUTORIALS', JSON.stringify(baseSave.completedHouseTutorials));
      }
      if (Array.isArray(baseSave.defeatedTournamentContenders)) {
        localStorage.setItem('dungeon_dice_defeated_tourney', JSON.stringify(baseSave.defeatedTournamentContenders));
      }
      if (baseSave.masterCustomization) {
        localStorage.setItem('dungeon_dice_master_customization', JSON.stringify(baseSave.masterCustomization));
      }
      if (Array.isArray(baseSave.tieredAchievements)) {
        localStorage.setItem('dungeon_dice_tiered_achievements', JSON.stringify(baseSave.tieredAchievements));
      }
      if (Array.isArray(baseSave.deckPresets)) {
        localStorage.setItem('dungeon_dice_presets', JSON.stringify(baseSave.deckPresets));
      }
      if (Array.isArray(baseSave.dailyContracts) && baseSave.dailyContractsDate) {
        localStorage.setItem('dungeon_dice_contracts_date', baseSave.dailyContractsDate);
        localStorage.setItem('dungeon_dice_active_contracts', JSON.stringify(baseSave.dailyContracts));
      }
    } catch (_) {}
  }

  return baseSave;
}
