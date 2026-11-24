import { UnitData } from './types';
import { calculateAttackDamagePreview, consumeUnitShieldCharge } from './tacticalCombatFormulas';

export interface CombatManaPool {
  J1: number;
  J2: number;
}

/**
 * Fases principales de un turno de combate
 */
export type CombatTurnPhase =
  | 'STANDBY'          // Inicio de turno, cálculo de maná y pasivas
  | 'ROLLING_DICE'    // Dados en movimiento/lanzamiento
  | 'SUMMON_SELECTION'// Decidiendo invocación tras dobles/triples/escalera
  | 'ACTION_PHASE'    // Movimiento, ataque o lanzamiento de hechizos
  | 'RESOLVING_COMBAT'// Animación de impacto, contraataque o muerte
  | 'TURN_TRANSITION' // Finalizando y cediendo iniciativa
  | 'MATCH_RESOLVED';  // Victoria o derrota final

export interface PureCombatState {
  turnPhase: CombatTurnPhase;
  activePlayer: 1 | 2; // 1 = Jugador (Azul), 2 = IA / Rival (Rojo)
  turnNumber: number;
  mana: CombatManaPool;
  diceRolls: [number, number, number] | [];
  diceRollOutcome: 'NONE' | 'DOUBLE' | 'TRIPLE' | 'LADDER' | 'WHIFF';
  summonLevel: number;
  summonMastery: number;
  units: UnitData[];
  cityTimeOfDay?: 0 | 1 | 2;
  winner: 1 | 2 | null;
  /**
   * MUTEX / LOCK: Banderas de control de concurrencia y bloqueo de interfaz
   */
  isBusyResolving: boolean; // Indica si hay animaciones físicas de dados, ataques o cálculos de IA en curso
  canInteract: boolean;     // Indica si el usuario tiene permiso seguro para interactuar con botones o tablero
}

export type CombatAction =
  | { type: 'START_TURN'; player: 1 | 2 }
  | { type: 'ACQUIRE_LOCK'; reason?: string }
  | { type: 'RELEASE_LOCK' }
  | { type: 'RESOLVE_DICE_ROLL'; rolls: [number, number, number] }
  | { type: 'SELECT_SUMMON'; level: number; mastery: number }
  | { type: 'RESOLVE_ATTACK'; attackerId: string; defenderId: string; bonusDamage?: number; cityTimeOfDay?: 0 | 1 | 2 }
  | { type: 'CONSUME_MANA'; player: 1 | 2; amount: number }
  | { type: 'RESTORE_MANA'; player: 1 | 2; amount: number }
  | { type: 'END_TURN' };

/**
 * Función PURA que analiza el resultado de 3 dados:
 * Detecta Triples, Dobles con Maestría o Escaleras Consecutivas.
 */
export function analyzeDiceCombination(rolls: [number, number, number]): {
  outcome: 'NONE' | 'DOUBLE' | 'TRIPLE' | 'LADDER' | 'WHIFF';
  level: number;
  mastery: number;
} {
  const [d1, d2, d3] = rolls;
  if (!d1 || !d2 || !d3) {
    return { outcome: 'NONE', level: 0, mastery: 0 };
  }

  // Triple Sagrado
  if (d1 === d2 && d2 === d3) {
    return { outcome: 'TRIPLE', level: 7, mastery: d1 };
  }

  // Pareja (Doble): la pareja define el nivel, el dado restante la maestría
  if (d1 === d2) {
    return { outcome: 'DOUBLE', level: d1, mastery: d3 };
  }
  if (d1 === d3) {
    return { outcome: 'DOUBLE', level: d1, mastery: d2 };
  }
  if (d2 === d3) {
    return { outcome: 'DOUBLE', level: d2, mastery: d1 };
  }

  // Escalera Táctica: tres dados consecutivos (1-2-3, 2-3-4, 3-4-5, 4-5-6)
  const sorted = [...rolls].sort((a, b) => a - b);
  if (sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2]) {
    return { outcome: 'LADDER', level: sorted[2], mastery: sorted[0] };
  }

  return { outcome: 'WHIFF', level: 0, mastery: 0 };
}

/**
 * Función PURA que calcula la resolución matemática de un ataque
 * unificada con calculateAttackDamagePreview (tacticalCombatFormulas.ts):
 * - Escudo en Maestra anula 100% del daño base; en criatura normal reduce 4 puntos (Math.max(0, base - 4)).
 * - Aplica orbes elementales, clima Día/Noche, runas de Lava (bonusDamageNextTurn), fuego/veneno y resurrección de Fénix.
 * - Sin contraataque automático del defensor.
 */
export function calculateCombatDamage(
  attacker: UnitData,
  defender: UnitData,
  bonusDamage = 0,
  cityTimeOfDay: 0 | 1 | 2 = 0
): {
  damageToDefender: number;
  fireResidualDmg: number;
  poisonDmg: number;
  totalDamageToDefender: number;
  shieldBrokenDefender: boolean;
  damageToAttacker: number;
  shieldBrokenAttacker: boolean;
  defenderSurvives: boolean;
  attackerSurvives: boolean;
  defenderFrozen: boolean;
  vampiricHealAmount: number;
  hasSolarLight: boolean;
  isPhoenixWillResurrect: boolean;
  remainingHp: number;
  baseAttack: number;
  shieldReduction: number;
  shieldNote: string;
} {
  const calc = calculateAttackDamagePreview(attacker, defender, cityTimeOfDay, bonusDamage);

  return {
    damageToDefender: calc.effectiveDmg,
    fireResidualDmg: calc.fireResidualDmg,
    poisonDmg: calc.poisonDmg,
    totalDamageToDefender: calc.totalEstimatedDamage,
    shieldBrokenDefender: calc.shieldBrokenDefender,
    damageToAttacker: 0,
    shieldBrokenAttacker: false,
    defenderSurvives: !calc.willFall,
    attackerSurvives: attacker.hpActual > 0,
    defenderFrozen: calc.hasFrost,
    vampiricHealAmount: calc.vampiricHealAmount,
    hasSolarLight: calc.hasSolarLight,
    isPhoenixWillResurrect: Boolean(calc.isPhoenixWillResurrect),
    remainingHp: calc.remainingHp,
    baseAttack: calc.baseAttack,
    shieldReduction: calc.shieldReduction,
    shieldNote: calc.shieldNote,
  };
}

/**
 * MÁQUINA DE ESTADOS PURA (State Machine Reducer) con Mutex/Banderas de Bloqueo
 */
export function combatStateMachine(
  state: PureCombatState,
  action: CombatAction
): PureCombatState {
  switch (action.type) {
    case 'ACQUIRE_LOCK': {
      return {
        ...state,
        isBusyResolving: true,
        canInteract: false,
      };
    }

    case 'RELEASE_LOCK': {
      return {
        ...state,
        isBusyResolving: false,
        canInteract: state.activePlayer === 1 && state.turnPhase === 'ACTION_PHASE',
      };
    }

    case 'START_TURN': {
      const nextTurnNumber = action.player === 1 ? state.turnNumber + 1 : state.turnNumber;
      return {
        ...state,
        turnPhase: 'ACTION_PHASE',
        activePlayer: action.player,
        turnNumber: nextTurnNumber,
        diceRolls: [],
        diceRollOutcome: 'NONE',
        summonLevel: 0,
        summonMastery: 0,
        isBusyResolving: action.player === 2,
        canInteract: action.player === 1,
        units: state.units.map((u) => {
          if (u.dueño === action.player) {
            return {
              ...u,
              yaMovio: false,
              yaAtaco: false,
              bonusDamageNextTurn: 0,
            };
          }
          return u;
        }),
      };
    }

    case 'RESOLVE_DICE_ROLL': {
      const { outcome, level, mastery } = analyzeDiceCombination(action.rolls);
      const nextPhase: CombatTurnPhase =
        outcome === 'DOUBLE' || outcome === 'TRIPLE' || outcome === 'LADDER'
          ? 'SUMMON_SELECTION'
          : 'ACTION_PHASE';

      return {
        ...state,
        turnPhase: nextPhase,
        diceRolls: action.rolls,
        diceRollOutcome: outcome,
        summonLevel: level,
        summonMastery: mastery,
        isBusyResolving: false,
        canInteract: state.activePlayer === 1,
      };
    }

    case 'SELECT_SUMMON': {
      return {
        ...state,
        turnPhase: 'ACTION_PHASE',
        summonLevel: action.level,
        summonMastery: action.mastery,
        isBusyResolving: false,
        canInteract: state.activePlayer === 1,
      };
    }

    case 'RESOLVE_ATTACK': {
      const attacker = state.units.find((u) => u.id === action.attackerId);
      const defender = state.units.find((u) => u.id === action.defenderId);

      if (!attacker || !defender) return state;

      const timeOfDay = action.cityTimeOfDay ?? state.cityTimeOfDay ?? 0;
      const resolution = calculateCombatDamage(attacker, defender, action.bonusDamage || 0, timeOfDay);
      const attackerAfterVampHp = Math.min(
        attacker.hpMax,
        Math.max(0, attacker.hpActual - resolution.damageToAttacker + resolution.vampiricHealAmount)
      );

      const nextUnits = state.units
        .map((u) => {
          if (u.id === defender.id) {
            if (resolution.isPhoenixWillResurrect) {
              return {
                ...u,
                hpActual: 10,
                hasResurrected: true,
                ...(resolution.shieldBrokenDefender ? consumeUnitShieldCharge(u) : {}),
                isFrozen: resolution.defenderFrozen ? true : u.isFrozen,
              };
            }
            return {
              ...u,
              hpActual: resolution.remainingHp,
              ...(resolution.shieldBrokenDefender ? consumeUnitShieldCharge(u) : {}),
              isFrozen: resolution.defenderFrozen ? true : u.isFrozen,
            };
          }
          if (u.id === attacker.id) {
            const effectiveHp =
              resolution.hasSolarLight && u.esMaestra
                ? Math.min(u.hpMax, attackerAfterVampHp + 1)
                : attackerAfterVampHp;
            return {
              ...u,
              yaSeMovio: true,
              bonusDamageNextTurn: 0,
              hpActual: effectiveHp,
              lastAttackSeq: (u.lastAttackSeq || 0) + 1,
              ...(resolution.shieldBrokenAttacker ? consumeUnitShieldCharge(u) : {}),
            };
          }
          if (resolution.hasSolarLight && u.dueño === attacker.dueño && u.esMaestra) {
            return { ...u, hpActual: Math.min(u.hpMax, u.hpActual + 1) };
          }
          return u;
        })
        .filter((u) => u.hpActual > 0 || u.esMaestra);

      // Comprobar condición de victoria (caída de pieza Maestra)
      const p1MasterAlive = nextUnits.some((u) => u.dueño === 1 && u.esMaestra);
      const p2MasterAlive = nextUnits.some((u) => u.dueño === 2 && u.esMaestra);

      let winner: 1 | 2 | null = null;
      let nextPhase: CombatTurnPhase = state.turnPhase;

      if (!p1MasterAlive) {
        winner = 2;
        nextPhase = 'MATCH_RESOLVED';
      } else if (!p2MasterAlive) {
        winner = 1;
        nextPhase = 'MATCH_RESOLVED';
      }

      return {
        ...state,
        turnPhase: nextPhase,
        units: nextUnits,
        winner,
        isBusyResolving: false,
        canInteract: winner === null && state.activePlayer === 1,
      };
    }

    case 'CONSUME_MANA': {
      const key = action.player === 1 ? 'J1' : 'J2';
      return {
        ...state,
        mana: {
          ...state.mana,
          [key]: Math.max(0, state.mana[key] - action.amount),
        },
      };
    }

    case 'RESTORE_MANA': {
      const key = action.player === 1 ? 'J1' : 'J2';
      return {
        ...state,
        mana: {
          ...state.mana,
          [key]: Math.min(10, state.mana[key] + action.amount),
        },
      };
    }

    case 'END_TURN': {
      const nextPlayer = state.activePlayer === 1 ? 2 : 1;
      return {
        ...state,
        turnPhase: 'STANDBY',
        activePlayer: nextPlayer,
        isBusyResolving: nextPlayer === 2,
        canInteract: false,
      };
    }

    default:
      return state;
  }
}
