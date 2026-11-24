import { DailyContract } from './TavernInterior';

/**
 * Catálogo maestro completo de misiones y contratos disponibles en el reino
 * (Ganancias rebalanceadas a valores justos de 60-140 Oro y niveles de acceso requeridos)
 */
export const MASTER_CONTRACTS_POOL: DailyContract[] = [
  {
    id: 'contract_untouchable',
    title: 'Soberano Intacto',
    desc: 'Supera un combate en la Callejuela o Torneo sin que tu Rey Celeste sufra daño.',
    targetCount: 1,
    currentCount: 0,
    rewardGold: 80,
    rewardType: 'GOLD',
    rewardLabel: '+80 Oro',
    isCompleted: false,
    isClaimed: false,
    category: 'VICTORY',
    requiredPlayerLevel: 1,
    missionTypeKey: 'TANQUE',
  },
  {
    id: 'contract_minion_slayer',
    title: 'Caza de Vanguardias',
    desc: 'Elimina a 4 criaturas enemigas en combate cuerpo a cuerpo o con hechizos.',
    targetCount: 4,
    currentCount: 0,
    rewardGold: 70,
    rewardType: 'GOLD',
    rewardLabel: '+70 Oro',
    isCompleted: false,
    isClaimed: false,
    category: 'COMBAT',
    requiredPlayerLevel: 1,
    missionTypeKey: 'ASESINO',
  },
  {
    id: 'contract_arcane_might',
    title: 'Maestría del Grimorio',
    desc: 'Lanza 5 hechizos tácticos utilizando Maná Cósmico durante tus batallas.',
    targetCount: 5,
    currentCount: 0,
    rewardGold: 75,
    rewardType: 'GOLD',
    rewardLabel: '+75 Oro y Esencia',
    isCompleted: false,
    isClaimed: false,
    category: 'SPELL',
    requiredPlayerLevel: 2,
    missionTypeKey: 'MAGO',
  },
  {
    id: 'contract_titan_awakening',
    title: 'Despertar del Titán',
    desc: 'Obtén una tirada triple idéntica (1-1-1 a 6-6-6) y despierta a un Titán Ascendido.',
    targetCount: 1,
    currentCount: 0,
    rewardGold: 110,
    rewardType: 'GOLD',
    rewardLabel: '+110 Oro',
    isCompleted: false,
    isClaimed: false,
    category: 'TITAN',
    requiredPlayerLevel: 3,
    missionTypeKey: 'CAMPEON',
  },
  {
    id: 'contract_coliseum_gladiator',
    title: 'Gloria del Coliseo',
    desc: 'Sobrevive y supera 2 oleadas en el Coliseo Infinito de Gladiadores.',
    targetCount: 2,
    currentCount: 0,
    rewardGold: 100,
    rewardType: 'GOLD',
    rewardLabel: '+100 Oro',
    isCompleted: false,
    isClaimed: false,
    category: 'COMBAT',
    requiredPlayerLevel: 3,
    missionTypeKey: 'CAMPEON',
  },
  // MISIONES EXCLUSIVAS DE CAMPAÑAS 2, 3 Y 4 (Nivel escalonado y recompensa ajustada)
  {
    id: 'contract_camp2_abyss',
    title: 'Fosa de los Señores del Calabozo',
    desc: 'Vence a 3 guardianes acorazados en la Campaña 2 pisando o esquivando runas de lava.',
    targetCount: 3,
    currentCount: 0,
    rewardGold: 120,
    rewardType: 'GOLD',
    rewardLabel: '+120 Oro y Cristal',
    isCompleted: false,
    isClaimed: false,
    category: 'DUNGEON',
    campaignRequirement: 1,
    requiredPlayerLevel: 4,
    missionTypeKey: 'DUNGEON_ABYSS',
  },
  {
    id: 'contract_camp3_recruit',
    title: 'Disciplina del Recluta Ilustre',
    desc: 'Realiza 4 invocaciones de criaturas en la Campaña 3 empleando maestría didáctica.',
    targetCount: 4,
    currentCount: 0,
    rewardGold: 115,
    rewardType: 'GOLD',
    rewardLabel: '+115 Oro y Medalla',
    isCompleted: false,
    isClaimed: false,
    category: 'RECRUIT',
    campaignRequirement: 2,
    requiredPlayerLevel: 5,
    missionTypeKey: 'RECRUIT_HONOR',
  },
  {
    id: 'contract_camp4_shadow',
    title: 'Purga del Trono Sombrío',
    desc: 'Derrota a 2 estrategas de élite abisal en la Campaña 4 (Modo Maestro) para saquear forja.',
    targetCount: 2,
    currentCount: 0,
    rewardGold: 140,
    rewardType: 'GOLD',
    rewardLabel: '+140 Oro y Obsidiana',
    isCompleted: false,
    isClaimed: false,
    category: 'SHADOW',
    campaignRequirement: 3,
    requiredPlayerLevel: 6,
    missionTypeKey: 'SHADOW_PURGE',
  },
];

/**
 * Devuelve la clave de fecha en formato YYYY-MM-DD según la zona horaria local
 */
export function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calcula el tiempo restante hasta la medianoche (próximo reinicio diario)
 */
export function getTimeUntilNextDailyReset(): { hours: number; minutes: number } {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const diffMs = Math.max(0, midnight.getTime() - now.getTime());
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes };
}

/**
 * Generador pseudo-aleatorio basado en la cadena de fecha YYYY-MM-DD
 * para que todos los jugadores en el mismo día tengan la misma selección si así se desea
 */
function hashDateString(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Obtiene o rota exactamente 3 contratos diarios para el día de hoy.
 * Si `options.ignoreStorage` es true o `options.persist` es false, no lee/escribe en localStorage
 * para respetar el modelo de guardado manual unificado.
 */
export function getOrRotateDailyContracts(
  unlockedCampaigns: number[] = [0],
  _playerLevel: number = 1,
  options?: { persist?: boolean; ignoreStorage?: boolean }
): DailyContract[] {
  const shouldPersist = options?.persist !== false;
  const ignoreStorage = Boolean(options?.ignoreStorage);
  const todayKey = getTodayDateKey();

  if (!ignoreStorage && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const savedDate = localStorage.getItem('dungeon_dice_contracts_date');
    const savedData = localStorage.getItem('dungeon_dice_active_contracts');

    if (savedDate === todayKey && savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          return parsed;
        }
      } catch (_) {}
    }
  }

  // --- NUEVA ROTACIÓN DIARIA: Elegir exactamente 3 contratos para hoy ---
  const seed = hashDateString(todayKey);
  const generalMissions = MASTER_CONTRACTS_POOL.filter((c) => c.campaignRequirement === undefined);
  const campaignMissions = MASTER_CONTRACTS_POOL.filter((c) => c.campaignRequirement !== undefined);

  // Mezclador determinista simple por semilla
  const shuffleWithSeed = <T>(arr: T[], s: number): T[] => {
    const copy = [...arr];
    let curSeed = s;
    for (let i = copy.length - 1; i > 0; i--) {
      curSeed = (curSeed * 9301 + 49297) % 233280;
      const rnd = curSeed / 233280;
      const j = Math.floor(rnd * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const shuffledGeneral = shuffleWithSeed(generalMissions, seed);
  const shuffledCampaign = shuffleWithSeed(campaignMissions, seed + 42);

  // Tomamos 2 misiones generales y 1 misión de campaña (o 3 generales si no hay campaña disponible)
  const selected: DailyContract[] = [];

  // 1 y 2: Dos generales distintas
  selected.push({ ...shuffledGeneral[0], currentCount: 0, isCompleted: false, isClaimed: false });
  selected.push({ ...shuffledGeneral[1], currentCount: 0, isCompleted: false, isClaimed: false });

  // 3: Una misión especial / de campaña (priorizando preferentemente campañas desbloqueadas si existen)
  const eligibleCampaign = shuffledCampaign.find(
    (c) => c.campaignRequirement !== undefined && unlockedCampaigns.includes(c.campaignRequirement)
  ) || shuffledCampaign[0] || shuffledGeneral[2];

  selected.push({ ...eligibleCampaign, currentCount: 0, isCompleted: false, isClaimed: false });

  // Guardar en localStorage únicamente si el llamador solicita persistencia automática
  if (shouldPersist && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('dungeon_dice_contracts_date', todayKey);
      localStorage.setItem('dungeon_dice_active_contracts', JSON.stringify(selected));
    } catch (_) {}
  }

  return selected;
}

/**
 * Guarda el progreso actualizado de los contratos activos de hoy en localStorage
 */
export function saveDailyContractsProgress(contracts: DailyContract[]): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    const todayKey = getTodayDateKey();
    localStorage.setItem('dungeon_dice_contracts_date', todayKey);
    localStorage.setItem('dungeon_dice_active_contracts', JSON.stringify(contracts));
  } catch (_) {}
}
