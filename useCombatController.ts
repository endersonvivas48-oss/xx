import { useCallback, useRef } from 'react';
import {
  DieData,
  Orb,
  UnitData,
  SpecialHexRune,
  HexRuneType,
  ColiseumDifficulty,
} from './types';
import { HEX_MAP, PLAYER_MASTER_START_HEX, AI_MASTER_START_HEX } from './hexGrid';
import { MasterCustomizationData } from './MasterPieceModal';
import {
  AlleyOpponent,
  TournamentContender,
  GladiatorDuelHandicap,
  GLADIATOR_DUEL_HANDICAPS,
} from './campaignData';
import { getColiseumImageCandidateUrls } from './coliseumImageMap';
import { AiTactic } from './aiPlanner';

const MAIN_CDN_BASE = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';
const MAIN_RAW_BASE = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';

export interface EnterCombatOptions {
  isSurvival?: boolean;
  survivalDiff?: ColiseumDifficulty;
  survivalWave?: number;
  isGladiatorDuel?: boolean;
  duelRival?: TournamentContender;
  duelHandicap?: GladiatorDuelHandicap;
}

export interface CombatPreparationContext {
  playerDeck: DieData[];
  maxPlayerHp: number;
  masterAtkBonus: number;
  masterStartingManaBonus: number;
  masterShieldChargeLevel: number;
  masterCustomization: MasterCustomizationData;
  activeCampaignIndex: number;
  survivalWave: number;
  survivalDifficulty: ColiseumDifficulty;
  isSurvivalMode: boolean;
  isGladiatorDuelMode: boolean;
  gladiatorDuelRival: TournamentContender | null;
  gladiatorDuelHandicap: GladiatorDuelHandicap;
  generateAiCustomDeckAndProfile: (
    alleyOpp?: AlleyOpponent,
    tournamentContender?: TournamentContender,
    duelRival?: TournamentContender | null,
    campIdx?: number,
    duelHandicapOverride?: GladiatorDuelHandicap
  ) => {
    deck: DieData[];
    orbsPool: Orb[];
    tactics: AiTactic;
    spells: string[];
    startingMana: number;
  };
}

export interface PreparedCombatSetup {
  shuffledPlayerDeck: DieData[];
  shuffledAiDeck: DieData[];
  initialUnits: UnitData[];
  specialRunes: SpecialHexRune[];
  aiStartingMana: number;
  aiTactics: AiTactic;
  aiSpells: string[];
  battleTitle: string;
  battleSubtitle: string;
  battleAccent: string;
  battleBgUrl: string;
  battleBgCandidates: string[];
  effectiveIsSurvival: boolean;
  effectiveSurvivalDiff: ColiseumDifficulty;
  effectiveSurvivalWave: number;
  effectiveIsGladiator: boolean;
  effectiveGladiatorRival: TournamentContender | null;
  effectiveGladiatorHandicap: GladiatorDuelHandicap;
}

export function prepareCombatSetup(
  opponentId: string,
  alleyOpp: AlleyOpponent | undefined,
  tournamentContender: TournamentContender | undefined,
  options: EnterCombatOptions | undefined,
  ctx: CombatPreparationContext
): PreparedCombatSetup {
  const effectiveIsSurvival =
    options?.isSurvival !== undefined
      ? Boolean(options.isSurvival)
      : opponentId.startsWith('survival_wave_');
  const effectiveSurvivalDiff = options?.survivalDiff || ctx.survivalDifficulty;
  const effectiveSurvivalWave =
    options?.survivalWave !== undefined ? options.survivalWave : ctx.survivalWave;
  const effectiveIsGladiator =
    options?.isGladiatorDuel !== undefined
      ? Boolean(options.isGladiatorDuel)
      : opponentId.startsWith('duel_');
  const effectiveGladiatorRival = effectiveIsGladiator
    ? options?.duelRival !== undefined
      ? options.duelRival
      : ctx.gladiatorDuelRival
    : null;
  const effectiveGladiatorHandicap = effectiveIsGladiator
    ? options?.duelHandicap || ctx.gladiatorDuelHandicap
    : ctx.gladiatorDuelHandicap;

  const activeDeck = ctx.playerDeck.filter((d) => d.enMazo);
  const battleDeck = activeDeck.length > 0 ? [...activeDeck] : [...ctx.playerDeck.slice(0, 24)];

  const shuffledPlayer = [...battleDeck];
  for (let i = shuffledPlayer.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledPlayer[i], shuffledPlayer[j]] = [shuffledPlayer[j], shuffledPlayer[i]];
  }

  const aiConfig = ctx.generateAiCustomDeckAndProfile(
    alleyOpp,
    tournamentContender,
    effectiveIsGladiator ? effectiveGladiatorRival : null,
    ctx.activeCampaignIndex,
    effectiveIsGladiator ? effectiveGladiatorHandicap : undefined
  );

  const shuffledAI = [...aiConfig.deck];
  for (let i = shuffledAI.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledAI[i], shuffledAI[j]] = [shuffledAI[j], shuffledAI[i]];
  }

  const initialUnits: UnitData[] = [
    {
      id: 'master_j2',
      nombre: 'REY CARMESÍ (J2)',
      nivel: 1,
      hpActual: 20,
      hpMax: 20,
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
      hpActual: 20,
      hpMax: 20,
      daño: 6,
      dueño: 1,
      posicion: PLAYER_MASTER_START_HEX,
      yaSeMovio: false,
      esMaestra: true,
      esAscendido: false,
    },
  ];

  const playerMaster = initialUnits.find((u) => u.dueño === 1 && u.esMaestra);
  if (playerMaster) {
    const attachedOrbs = ctx.masterCustomization?.attachedOrbs || [];
    const masterOrbBonusHp = attachedOrbs.reduce((acc, o) => acc + (o.bonusHp || 0), 0);
    const masterOrbBonusAtk = attachedOrbs.reduce((acc, o) => acc + (o.bonusAtk || 0), 0);
    const effectiveMasterHp = ctx.maxPlayerHp + masterOrbBonusHp;

    playerMaster.hpMax = effectiveMasterHp;
    playerMaster.hpActual = effectiveMasterHp;
    playerMaster.daño = 6 + ctx.masterAtkBonus + masterOrbBonusAtk;
    playerMaster.nombre = ctx.masterCustomization.title.toUpperCase();
    playerMaster.equippedOrbs = [...attachedOrbs];

    const hasShieldOrb = attachedOrbs.some(
      (o) => o.id === 'o9' || o.id === 'orb_c1_escudo' || o.element === 'Metal' || (o.effect && o.effect.includes('Escudo'))
    );
    const totalInitialShieldCharges = ctx.masterShieldChargeLevel + (hasShieldOrb ? 1 : 0);
    if (totalInitialShieldCharges > 0) {
      playerMaster.hasShield = true;
      playerMaster.shieldCharges = totalInitialShieldCharges;
    }
  }

  const aiMaster = initialUnits.find((u) => u.dueño === 2 && u.esMaestra);
  if (aiMaster) {
    if (effectiveIsGladiator && effectiveGladiatorRival) {
      const handicapCfg = GLADIATOR_DUEL_HANDICAPS[effectiveGladiatorHandicap];
      aiMaster.nombre = effectiveGladiatorRival.name;
      aiMaster.hpMax = effectiveGladiatorRival.masterHp + handicapCfg.extraHp;
      aiMaster.hpActual = effectiveGladiatorRival.masterHp + handicapCfg.extraHp;
      aiMaster.daño = effectiveGladiatorRival.masterAtk + handicapCfg.extraAtk;
      if (handicapCfg.passiveShield) {
        aiMaster.hasShield = true;
        aiMaster.shieldCharges = 1;
      }
    } else if (alleyOpp) {
      aiMaster.nombre = alleyOpp.masterName;
      aiMaster.hpMax = alleyOpp.masterHp;
      aiMaster.hpActual = alleyOpp.masterHp;
      aiMaster.daño = alleyOpp.masterAtk;
    } else if (tournamentContender) {
      aiMaster.nombre = tournamentContender.name;
      aiMaster.hpMax = tournamentContender.masterHp;
      aiMaster.hpActual = tournamentContender.masterHp;
      aiMaster.daño = tournamentContender.masterAtk;
    } else if (opponentId === 'challenger_2') {
      aiMaster.nombre = 'VALERIA (ESCARCHA)';
    }
  }

  const isColiseumLateStage =
    effectiveIsSurvival &&
    (effectiveSurvivalDiff === 'PESADILLA' ? effectiveSurvivalWave >= 3 : effectiveSurvivalWave >= 5);
  const shouldSpawnRunes =
    ctx.activeCampaignIndex === 1 || ctx.activeCampaignIndex === 3 || isColiseumLateStage;

  const specialRunes: SpecialHexRune[] = [];
  if (shouldSpawnRunes) {
    const candidateHexIds = Object.keys(HEX_MAP)
      .map(Number)
      .filter((id) => id >= 12 && id <= 48 && id !== PLAYER_MASTER_START_HEX && id !== AI_MASTER_START_HEX);

    for (let i = candidateHexIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidateHexIds[i], candidateHexIds[j]] = [candidateHexIds[j], candidateHexIds[i]];
    }

    const count = Math.random() < 0.5 ? 2 : 3;
    const runeTypes: HexRuneType[] = ['LAVA', 'HEAL', 'MANA'];

    for (let idx = 0; idx < count; idx++) {
      const rType = runeTypes[idx % runeTypes.length];
      const hexTarget = candidateHexIds[idx];

      if (rType === 'LAVA') {
        specialRunes.push({
          hexId: hexTarget,
          type: 'LAVA',
          title: 'Runa de Fuego (Lava)',
          desc: '+2 Daño en el siguiente ataque, pero sufre 1 de quemadura al finalizar turno.',
          color: '#ea580c',
          emissive: '#f97316',
          symbol: '🔥',
        });
      } else if (rType === 'HEAL') {
        specialRunes.push({
          hexId: hexTarget,
          type: 'HEAL',
          title: 'Runa de Curación (Fuente de Manantial)',
          desc: 'Restaura +2 HP a la unidad que termine su turno en esta casilla.',
          color: '#059669',
          emissive: '#10b981',
          symbol: '💧',
        });
      } else if (rType === 'MANA') {
        specialRunes.push({
          hexId: hexTarget,
          type: 'MANA',
          title: 'Runa de Maná Cósmico',
          desc: 'Otorga +1 de Maná instantáneo al Invocador.',
          color: '#0284c7',
          emissive: '#38bdf8',
          symbol: '⚡',
        });
      }
    }
  }

  let battleTitle = 'Combate Táctico';
  let battleSubtitle = 'Preparando tablero y modelos 3D...';
  let battleAccent = '#38bdf8';
  let battleBgCandidates: string[] = [
    ...getColiseumImageCandidateUrls('NORMAL'),
    `${MAIN_CDN_BASE}/coliseo.webp`,
    `${MAIN_RAW_BASE}/coliseo.webp`,
  ];

  if (effectiveIsSurvival) {
    const diffLabel =
      effectiveSurvivalDiff === 'PESADILLA'
        ? 'Pesadilla'
        : effectiveSurvivalDiff === 'HEROICO'
        ? 'Heroico'
        : 'Normal';
    battleTitle = `Coliseo de Campeones`;
    battleSubtitle = `Dificultad ${diffLabel} • Oleada ${effectiveSurvivalWave}`;
    battleAccent =
      effectiveSurvivalDiff === 'PESADILLA'
        ? '#f43f5e'
        : effectiveSurvivalDiff === 'HEROICO'
        ? '#fbbf24'
        : '#38bdf8';

    const diffKey =
      effectiveSurvivalDiff === 'PESADILLA'
        ? 'NIGHTMARE'
        : effectiveSurvivalDiff === 'HEROICO'
        ? 'HEROIC'
        : 'NORMAL';

    battleBgCandidates = [
      ...getColiseumImageCandidateUrls(diffKey),
      ...getColiseumImageCandidateUrls('GENERAL'),
    ];
  } else if (effectiveIsGladiator && effectiveGladiatorRival) {
    battleTitle = `Duelo: ${effectiveGladiatorRival.name}`;
    battleSubtitle = `Coliseo de Gladiadores [${effectiveGladiatorHandicap}]`;
    battleAccent = '#f59e0b';
    battleBgCandidates = [
      ...getColiseumImageCandidateUrls('HEROIC'),
      ...getColiseumImageCandidateUrls('GENERAL'),
    ];
  } else if (tournamentContender) {
    battleTitle = `${tournamentContender.name}`;
    battleSubtitle = `Gran Torneo • Ronda ${tournamentContender.phaseRound || 1}`;
    battleAccent = '#f59e0b';
    battleBgCandidates = [
      ...getColiseumImageCandidateUrls('NORMAL'),
      ...getColiseumImageCandidateUrls('GENERAL'),
    ];
  } else if (alleyOpp) {
    battleTitle = `${alleyOpp.name}`;
    battleSubtitle = `Duelo Callejero • ${alleyOpp.archetype}`;
    battleAccent = alleyOpp.avatarColor || '#38bdf8';
    battleBgCandidates = [
      `${MAIN_CDN_BASE}/campamento.webp`,
      `${MAIN_RAW_BASE}/campamento.webp`,
      `${MAIN_CDN_BASE}/coliseo.webp`,
      `${MAIN_RAW_BASE}/coliseo.webp`,
    ];
  }

  return {
    shuffledPlayerDeck: shuffledPlayer,
    shuffledAiDeck: shuffledAI,
    initialUnits,
    specialRunes,
    aiStartingMana: aiConfig.startingMana,
    aiTactics: aiConfig.tactics,
    aiSpells: aiConfig.spells,
    battleTitle,
    battleSubtitle,
    battleAccent,
    battleBgUrl: battleBgCandidates[0],
    battleBgCandidates,
    effectiveIsSurvival,
    effectiveSurvivalDiff,
    effectiveSurvivalWave,
    effectiveIsGladiator,
    effectiveGladiatorRival,
    effectiveGladiatorHandicap,
  };
}
